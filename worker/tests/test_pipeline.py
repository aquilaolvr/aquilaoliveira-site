"""Teste do fluxo completo do worker com banco e Frame.io simulados (sem rede externa).

    WORKER_TEST_VIDEO=caminho/video.mp4 python -m unittest worker.tests.test_pipeline -v
Sem WORKER_TEST_VIDEO, gera um vídeo de teste com o próprio FFmpeg.
"""
import functools
import http.server
import itertools
import os
import shutil
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path

from worker import config, pipeline
from worker.frameio import Frameio, FrameioError


class FakeDB:
    """Imita o pedaço da API do Supabase que o worker usa."""

    def __init__(self):
        self.t = {"projects": [], "jobs": [], "job_logs": [], "frameio_auth": []}
        self.uploads = {}
        self.ids = itertools.count(1)

    def select(self, table, **f):
        return [r for r in self.t[table] if all(str(r.get(k)) == str(v) for k, v in f.items())]

    def get(self, table, **f):
        rows = self.select(table, **f)
        return rows[0] if rows else None

    def insert(self, table, row, ignore_duplicates_on=None):
        if ignore_duplicates_on and any(r.get(ignore_duplicates_on) == row.get(ignore_duplicates_on) for r in self.t[table]):
            return None
        row = {"id": f"p{next(self.ids)}" if table == "projects" else next(self.ids), **row}
        self.t[table].append(row)
        return row

    def update(self, table, patch, **f):
        rows = self.select(table, **f)
        for r in rows:
            r.update(patch)
        return rows

    def rpc(self, fn, args=None):
        if fn == "requeue_stale_jobs":
            return 0
        if fn == "claim_job":
            for j in self.t["jobs"]:
                if j["status"] == "pendente":
                    j["status"] = "rodando"
                    j["attempts"] += 1
                    return [j]
            return []
        if fn == "enqueue_frameio_file":
            fid = args["p_file_id"]
            if self.get("projects", frameio_file_id=fid) or any(j["kind"] == "ingest" and j.get("frameio_file_id") == fid and j["status"] != "falhou" for j in self.t["jobs"]):
                return False
            self.t["jobs"].append({"id": next(self.ids), "kind": "ingest", "status": "pendente", "attempts": 0,
                                   "frameio_file_id": fid, "project_id": None, "payload": {"account_id": args["p_account_id"]}})
            return True
        raise KeyError(fn)

    def upload(self, local, dest, content_type=None):
        self.uploads[dest] = Path(local).stat().st_size
        return f"https://storage.test/{dest}"

    def logs(self):
        return [f"{l['level']}:{l['step']}: {l['message']}" for l in self.t["job_logs"]]


class FakeFrameio(Frameio):
    files: dict = {}

    def token(self):
        return "token"

    def get_file(self, account_id, file_id):
        if file_id not in self.files:
            raise FrameioError("Frame.io: não encontrado")
        return self.files[file_id]

    def get_folder(self, account_id, folder_id):
        return {"name": "Portfólio — novos"}


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = Path(tempfile.mkdtemp())
        video = os.environ.get("WORKER_TEST_VIDEO")
        if video:
            shutil.copy(video, cls.dir / "clip.mp4")
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=25:duration=30",
                            "-f", "lavfi", "-i", "sine=duration=30", "-shortest", "-c:v", "libx264", "-c:a", "aac",
                            str(cls.dir / "clip.mp4")], check=True)
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(cls.dir))
        handler.log_message = lambda *a: None
        cls.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.srv.server_address[1]}/clip.mp4"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        shutil.rmtree(cls.dir, ignore_errors=True)

    def setUp(self):
        config.FRAMEIO_FOLDER_ID = "pasta-ok"
        config.FRAMEIO_ACCOUNT_ID = "acc"
        config.ANTHROPIC_API_KEY = None
        FakeFrameio.files = {
            "f-ok": {"id": "f-ok", "name": "Clipe Olodum v3.mp4", "parent_id": "pasta-ok", "media_type": "video/mp4",
                     "file_size": 1, "media_links": {"original": {"download_url": self.url}}},
            "f-fora": {"id": "f-fora", "name": "outra.mp4", "parent_id": "outra-pasta", "media_type": "video/mp4",
                       "media_links": {"original": {"download_url": self.url}}},
            "f-quebrado": {"id": "f-quebrado", "name": "quebrado.mp4", "parent_id": "pasta-ok", "media_type": "video/mp4",
                           "media_links": {"original": {"download_url": self.url.replace("clip.mp4", "nao-existe.mp4")}}},
            "f-processando": {"id": "f-processando", "name": "subindo.mp4", "parent_id": "pasta-ok", "media_type": "video/mp4",
                              "media_links": {}},
        }
        pipeline.Frameio = FakeFrameio
        self.db = FakeDB()

    def test_rascunho_completo_e_sem_duplicar(self):
        self.assertTrue(self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-ok", "p_account_id": "acc", "p_event": "file.ready"}))
        self.assertFalse(self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-ok", "p_account_id": "acc", "p_event": "file.ready"}))
        pipeline.process_queue(self.db)
        [p] = self.db.t["projects"]
        self.assertEqual(p["status"], "rascunho", self.db.logs())
        self.assertTrue(p["clip_mp4_url"].endswith(".mp4") and p["clip_webm_url"].endswith(".webm") and p["cover_url"].endswith(".jpg"))
        self.assertEqual(p["frameio_folder_name"], "Portfólio — novos")
        self.assertGreater(p["duration_seconds"], 0)
        self.assertEqual(len(self.db.uploads), 3)
        steps = {l["step"] for l in self.db.t["job_logs"]}
        self.assertTrue({"frameio", "download", "thumb", "upload", "rascunho"} <= steps, steps)
        # evento repetido depois de pronto: não cria nada novo
        self.assertFalse(self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-ok", "p_account_id": "acc", "p_event": "file.ready"}))
        # gerar nova thumb: troca as URLs
        old = p["clip_mp4_url"]
        self.db.t["jobs"].append({"id": 999, "kind": "thumb", "status": "pendente", "attempts": 0, "project_id": p["id"],
                                  "frameio_file_id": "f-ok", "payload": {"account_id": "acc"}})
        import time; time.sleep(1.1)  # o nome do arquivo leva o horário em segundos
        pipeline.process_queue(self.db)
        self.assertNotEqual(self.db.get("projects", id=p["id"])["clip_mp4_url"], old)
        self.assertEqual(self.db.get("jobs", id=999)["status"], "concluido")

    def test_fora_da_pasta_e_ignorado(self):
        self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-fora", "p_account_id": "acc", "p_event": "file.ready"})
        pipeline.process_queue(self.db)
        self.assertEqual(self.db.t["projects"], [])
        self.assertEqual(self.db.t["jobs"][0]["status"], "concluido")

    def test_erro_vira_falhou_visivel(self):
        self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-quebrado", "p_account_id": "acc", "p_event": "file.ready"})
        pipeline.process_queue(self.db)
        [p] = self.db.t["projects"]
        self.assertEqual(p["status"], "falhou")
        self.assertIn("404", p["error"])
        self.assertEqual(self.db.t["jobs"][0]["status"], "falhou")
        self.assertTrue(any(l.startswith("error:erro") for l in self.db.logs()))

    def test_arquivo_ainda_processando_volta_para_fila(self):
        self.db.rpc("enqueue_frameio_file", {"p_file_id": "f-processando", "p_account_id": "acc", "p_event": "file.ready"})
        pipeline.process_queue(self.db, max_jobs=1)
        self.assertEqual(self.db.t["jobs"][0]["status"], "pendente")
        self.assertEqual(self.db.t["projects"][0]["status"], "processando")


if __name__ == "__main__":
    unittest.main()
