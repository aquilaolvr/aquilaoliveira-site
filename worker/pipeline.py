"""Fluxo do worker: Frame.io → download → thumb animada → upload → rascunho no banco.

Trabalhos (tabela jobs):
  ingest   arquivo novo do Frame.io (webhook ou polling) → cria/atualiza o projeto como rascunho
  thumb    "Gerar nova thumb" no admin → novos trechos sorteados
  suggest  "Sugerir outra" no admin → nova sugestão do Claude
"""
from __future__ import annotations

import datetime as dt
import random
import shutil
import time
from pathlib import Path

from . import config, thumbs
from .frameio import Frameio, FrameioError
from .log import StepLogger, console
from .suggest import suggest

TMP = Path(__file__).parent / ".tmp"
MAX_NOT_READY_ATTEMPTS = 12


class NotReady(Exception):
    """O arquivo ainda não tem link de download (Frame.io processando) — tentar de novo mais tarde."""


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


# ---------------------------------------------------------------- fila
def process_queue(db, max_jobs: int = 20):
    requeued = db.rpc("requeue_stale_jobs", {"p_minutes": 30})
    if requeued:
        console("fila", f"{requeued} trabalho(s) preso(s) voltaram para a fila")
    fio = Frameio(db)
    for _ in range(max_jobs):
        jobs = db.rpc("claim_job")
        if not jobs:
            return
        run_job(db, fio, jobs[0])


def run_job(db, fio: Frameio, job: dict):
    log = StepLogger(db, job.get("project_id"), job["id"])
    log("job", f"início: {job['kind']} (tentativa {job['attempts']})")
    try:
        if job["kind"] == "ingest":
            ingest(db, fio, job, log)
        elif job["kind"] == "thumb":
            regenerate_thumb(db, fio, job, log)
        elif job["kind"] == "suggest":
            regenerate_suggestion(db, fio, job, log)
        db.update("jobs", {"status": "concluido", "finished_at": now(), "error": None}, id=job["id"])
        log("job", "concluído")
    except NotReady as e:
        retry = job["attempts"] < MAX_NOT_READY_ATTEMPTS
        db.update("jobs", {"status": "pendente" if retry else "falhou", "error": str(e)}, id=job["id"])
        log("frameio", f"{e} — {'vou tentar de novo no próximo ciclo' if retry else 'desisti'}", "warn" if retry else "error")
        if not retry and log.project_id:
            db.update("projects", {"status": "falhou", "error": str(e)}, id=log.project_id)
    except Exception as e:  # qualquer erro vira status "falhou", visível no admin
        msg = f"{type(e).__name__}: {e}"
        db.update("jobs", {"status": "falhou", "finished_at": now(), "error": msg[:2000]}, id=job["id"])
        log("erro", msg, "error")
        if log.project_id:
            patch = {"error": f"[{job['kind']}] {msg}"[:2000]}
            if job["kind"] == "ingest":
                patch["status"] = "falhou"
            db.update("projects", patch, id=log.project_id)


# ---------------------------------------------------------------- etapas
def _ids(job: dict) -> tuple[str, str]:
    p = job.get("payload") or {}
    file_id = job.get("frameio_file_id") or p.get("file_id")
    account_id = p.get("account_id") or config.FRAMEIO_ACCOUNT_ID
    if not file_id or not account_id:
        raise RuntimeError("Trabalho sem file_id ou account_id do Frame.io.")
    return file_id, account_id


def _fetch_video(fio: Frameio, account_id: str, file_id: str, work: Path, log) -> tuple[dict, Path]:
    file = fio.get_file(account_id, file_id)
    log("frameio", f"arquivo: {file.get('name')} ({file.get('media_type') or 'tipo ?'}, {int(file.get('file_size') or 0) / 1e6:.0f} MB)")
    try:
        url, quality = fio.download_url(file)
    except FrameioError as e:
        raise NotReady(str(e))
    suffix = Path(file.get("name") or "video.mp4").suffix or ".mp4"
    src = work / f"source{suffix}"
    t0 = time.time()
    size = fio.download(url, src)
    log("download", f"baixado ({quality}) {size / 1e6:.0f} MB em {time.time() - t0:.0f}s")
    return file, src


def _make_and_upload_thumb(db, project_id: str, src: Path, work: Path, log, seed: int | None = None) -> dict:
    t0 = time.time()
    r = thumbs.build(src, work / "thumb", seed=seed)
    log("thumb", f"gerada em {time.time() - t0:.0f}s · duração {r.duration:.1f}s · trechos {r.points}")
    stamp = dt.datetime.now().strftime("%Y%m%d%H%M%S")
    base = f"projects/{project_id}"
    urls = {
        "clip_mp4_url": db.upload(r.mp4, f"{base}/thumb-{stamp}.mp4", "video/mp4"),
        "clip_webm_url": db.upload(r.webm, f"{base}/thumb-{stamp}.webm", "video/webm"),
        "cover_url": db.upload(r.poster, f"{base}/poster-{stamp}.jpg", "image/jpeg"),
        "duration_seconds": round(r.duration, 2),
    }
    log("upload", f"thumb MP4 {r.mp4.stat().st_size // 1024} KB, WebM {r.webm.stat().st_size // 1024} KB e fallback enviados")
    return {**urls, "_frames": r.frames}


def ingest(db, fio: Frameio, job: dict, log: StepLogger):
    file_id, account_id = _ids(job)
    work = TMP / f"job-{job['id']}"
    try:
        file = fio.get_file(account_id, file_id)

        # Só a pasta configurada dispara o fluxo (o webhook vale para o workspace inteiro).
        if config.FRAMEIO_FOLDER_ID and file.get("parent_id") != config.FRAMEIO_FOLDER_ID:
            log("frameio", f"{file.get('name')} está fora da pasta configurada — ignorado")
            return
        media_type = (file.get("media_type") or "").lower()
        if media_type and not media_type.startswith("video"):
            log("frameio", f"{file.get('name')} não é vídeo ({media_type}) — ignorado")
            return

        folder_name = None
        try:
            if file.get("parent_id"):
                folder_name = fio.get_folder(account_id, file["parent_id"]).get("name")
        except FrameioError:
            pass

        # Cria o projeto uma única vez (frameio_file_id é único no banco).
        project = db.get("projects", frameio_file_id=file_id)
        if not project:
            project = db.insert("projects", {
                "status": "processando", "source": "frameio", "frameio_file_id": file_id,
                "frameio_account_id": account_id, "frameio_file_name": file.get("name"),
                "frameio_folder_name": folder_name,
            }, ignore_duplicates_on="frameio_file_id") or db.get("projects", frameio_file_id=file_id)
        elif project["status"] not in ("processando", "falhou"):
            log("frameio", "projeto já existe e está pronto — nada a fazer (evento duplicado)")
            return
        else:
            db.update("projects", {"status": "processando", "error": None}, id=project["id"])

        log.project_id = project["id"]
        db.update("jobs", {"project_id": project["id"]}, id=job["id"])
        log("frameio", f"projeto {project['id']} em processamento ({file.get('name')})")

        file, src = _fetch_video(fio, account_id, file_id, work, log)
        media = _make_and_upload_thumb(db, project["id"], src, work, log)
        frames = media.pop("_frames")

        if config.STORE_FULL_VIDEO:
            media["video_url"] = db.upload(src, f"projects/{project['id']}/video{src.suffix}")
            log("upload", "vídeo completo enviado para o Storage")

        patch = {**media, "status": "rascunho", "error": None}
        try:
            s = suggest(folder_name, file.get("name"), frames)
            if s:
                patch |= {"suggested_title": s["title"], "suggested_description": s["description"]}
                log("claude", f"sugestão: {s['title']}")
        except Exception as e:  # sugestão é opcional — não derruba o rascunho
            log("claude", f"sem sugestão: {e}", "warn")

        db.update("projects", patch, id=project["id"])
        log("rascunho", "pronto para revisão no admin")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _project_for(db, job: dict) -> dict:
    p = db.get("projects", id=job["project_id"]) if job.get("project_id") else None
    if not p or not p.get("frameio_file_id"):
        raise RuntimeError("Projeto não encontrado ou sem arquivo do Frame.io.")
    return p


def regenerate_thumb(db, fio: Frameio, job: dict, log: StepLogger):
    p = _project_for(db, job)
    work = TMP / f"job-{job['id']}"
    try:
        _, src = _fetch_video(fio, p.get("frameio_account_id") or config.FRAMEIO_ACCOUNT_ID, p["frameio_file_id"], work, log)
        media = _make_and_upload_thumb(db, p["id"], src, work, log, seed=random.randrange(1 << 30))
        media.pop("_frames")
        db.update("projects", {**media, "error": None}, id=p["id"])
        log("thumb", "nova thumb aplicada")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def regenerate_suggestion(db, fio: Frameio, job: dict, log: StepLogger):
    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY não configurada.")
    p = _project_for(db, job)
    work = TMP / f"job-{job['id']}"
    try:
        _, src = _fetch_video(fio, p.get("frameio_account_id") or config.FRAMEIO_ACCOUNT_ID, p["frameio_file_id"], work, log)
        s = suggest(p.get("frameio_folder_name"), p.get("frameio_file_name"), thumbs.extract_frames(src, work / "frames"))
        db.update("projects", {"suggested_title": s["title"], "suggested_description": s["description"]}, id=p["id"])
        log("claude", f"nova sugestão: {s['title']}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ---------------------------------------------------------------- plano B: polling
def poll_frameio(db):
    """Sem webhook: lista a pasta e enfileira arquivos que ainda não conhecemos (a função do banco evita duplicar)."""
    if not (config.FRAMEIO_ACCOUNT_ID and config.FRAMEIO_FOLDER_ID):
        console("poll", "FRAMEIO_ACCOUNT_ID e FRAMEIO_FOLDER_ID são necessários para o polling", "warn")
        return
    files = Frameio(db).list_folder_files(config.FRAMEIO_ACCOUNT_ID, config.FRAMEIO_FOLDER_ID)
    new = sum(1 for f in files if db.rpc("enqueue_frameio_file", {"p_file_id": f["id"], "p_account_id": config.FRAMEIO_ACCOUNT_ID, "p_event": "poll"}))
    console("poll", f"{len(files)} arquivo(s) na pasta · {new} novo(s) na fila")
