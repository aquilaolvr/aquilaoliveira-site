"""Thumb animada: 5 trechos de 1 s sorteados (fora dos 5% iniciais e finais) → clipe de 5 s,
sem áudio, em loop, MP4 (H.264) + WebM (VP9) 640×360, mais um JPG estático de fallback 1400×788.

Teste sozinho, sem banco nem Frame.io:
    python -m worker thumb-test caminho/do/video.mp4 [pasta_saida]
"""
from __future__ import annotations

import json
import random
import subprocess
from dataclasses import dataclass
from pathlib import Path

from . import config

N_POINTS = 5
SEG_SECONDS = 1.0
MARGIN = 0.05


@dataclass
class ThumbResult:
    mp4: Path
    webm: Path
    poster: Path
    frames: list[Path]       # quadros pequenos para a sugestão do Claude
    duration: float
    points: list[float]


def _run(cmd: list[str]):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"{cmd[0]} falhou ({p.returncode}): {p.stderr.strip()[-800:]}")
    return p.stdout


def probe_duration(src: Path) -> float:
    out = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                "-of", "json", str(src)])
    info = json.loads(out)
    if not any(s.get("codec_type") == "video" for s in info.get("streams", [])):
        raise RuntimeError("O arquivo não tem trilha de vídeo.")
    d = float(info.get("format", {}).get("duration") or 0)
    if d <= 0:
        raise RuntimeError("ffprobe não conseguiu ler a duração do vídeo.")
    return d


def pick_points(duration: float, n: int = N_POINTS, seg: float = SEG_SECONDS, margin: float = MARGIN,
                rng: random.Random | None = None) -> tuple[list[float], float]:
    """Sorteia n inícios de trecho dentro de [5%, 95%] da duração.

    A janela útil é dividida em n faixas iguais e cada trecho é sorteado dentro da sua
    faixa: fica aleatório, em ordem cronológica e sem trechos sobrepostos.
    Em vídeos curtos o trecho encolhe para caber (devolve o tamanho usado).
    """
    rng = rng or random.Random()
    start, end = duration * margin, duration * (1 - margin)
    window = max(0.0, end - start)
    if window <= 0:
        raise RuntimeError("Vídeo curto demais para gerar thumb.")
    seg = min(seg, window / n)
    band = window / n
    points = [round(start + i * band + rng.uniform(0, max(0.0, band - seg)), 3) for i in range(n)]
    return points, seg


def _scale(w: int, h: int) -> str:
    return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1"


def build(src: Path, out_dir: Path, seed: int | None = None) -> ThumbResult:
    out_dir.mkdir(parents=True, exist_ok=True)
    duration = probe_duration(src)
    points, seg = pick_points(duration, rng=random.Random(seed))

    # Um único ffmpeg: 5 entradas com -ss (busca rápida) e concat sem áudio.
    inputs: list[str] = []
    for p in points:
        inputs += ["-ss", f"{p:.3f}", "-t", f"{seg:.3f}", "-i", str(src)]
    chains = ";".join(f"[{i}:v]{_scale(config.THUMB_W, config.THUMB_H)},fps={config.THUMB_FPS},format=yuv420p,setpts=PTS-STARTPTS[v{i}]"
                      for i in range(len(points)))
    graph = f"{chains};{''.join(f'[v{i}]' for i in range(len(points)))}concat=n={len(points)}:v=1:a=0[out]"

    mp4, webm, poster = out_dir / "thumb.mp4", out_dir / "thumb.webm", out_dir / "poster.jpg"
    _run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-an",
          "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-profile:v", "high", "-pix_fmt", "yuv420p",
          "-movflags", "+faststart", str(mp4)])
    # WebM a partir do MP4 já montado (mesmos trechos).
    _run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38",
          "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", str(webm)])

    # Fallback estático: quadro do meio do trecho central, em 1400×788.
    mid = points[len(points) // 2] + seg / 2
    _run(["ffmpeg", "-v", "error", "-y", "-ss", f"{mid:.3f}", "-i", str(src), "-frames:v", "1",
          "-vf", _scale(config.POSTER_W, config.POSTER_H), "-q:v", "3", str(poster)])

    frames = extract_frames(src, out_dir, duration)

    return ThumbResult(mp4=mp4, webm=webm, poster=poster, frames=frames, duration=duration, points=points)


def extract_frames(src: Path, out_dir: Path, duration: float | None = None) -> list[Path]:
    """4 quadros pequenos (768 px) espalhados pelo vídeo — usados na sugestão do Claude."""
    out_dir.mkdir(parents=True, exist_ok=True)
    duration = duration or probe_duration(src)
    frames = []
    for i, frac in enumerate((0.15, 0.4, 0.65, 0.88)):
        f = out_dir / f"frame{i}.jpg"
        _run(["ffmpeg", "-v", "error", "-y", "-ss", f"{duration * frac:.3f}", "-i", str(src), "-frames:v", "1",
              "-vf", "scale=768:-2", "-q:v", "5", str(f)])
        frames.append(f)
    return frames
