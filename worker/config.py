"""Configuração do worker — tudo vem de variáveis de ambiente (nada de chave no código)."""
import os


def env(name: str, default: str | None = None, required: bool = False) -> str | None:
    v = os.environ.get(name, default)
    if required and not v:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {name}")
    return v


def flag(name: str, default: bool = False) -> bool:
    return (os.environ.get(name) or str(default)).strip().lower() in ("1", "true", "yes", "sim")


SUPABASE_URL = (env("SUPABASE_URL") or env("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = env("SUPABASE_BUCKET", "media")

FRAMEIO_API = env("FRAMEIO_API_BASE", "https://api.frame.io/v4")
FRAMEIO_AUTH_MODE = env("FRAMEIO_AUTH_MODE", "oauth")
FRAMEIO_CLIENT_ID = env("FRAMEIO_CLIENT_ID")
FRAMEIO_CLIENT_SECRET = env("FRAMEIO_CLIENT_SECRET")
FRAMEIO_SCOPES = env("FRAMEIO_S2S_SCOPES", "openid,AdobeID,frame.s2s.all")
FRAMEIO_ACCOUNT_ID = env("FRAMEIO_ACCOUNT_ID")
FRAMEIO_FOLDER_ID = env("FRAMEIO_FOLDER_ID")
FRAMEIO_DOWNLOAD_PREFERENCE = [s.strip() for s in (env("FRAMEIO_DOWNLOAD_PREFERENCE", "original,high_quality,efficient") or "").split(",") if s.strip()]

POLL_SECONDS = int(env("WORKER_POLL_SECONDS", "20") or 20)
FRAMEIO_POLL = flag("FRAMEIO_POLL")
STORE_FULL_VIDEO = flag("STORE_FULL_VIDEO")
MAX_DOWNLOAD_GB = float(env("MAX_DOWNLOAD_GB", "8") or 8)

ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY")
CLAUDE_MODEL = env("CLAUDE_MODEL", "claude-opus-5-5")

# Padrão das thumbs do site: 16:9, 640×360, 25 fps, sem áudio; fallback 1400×788 JPG.
THUMB_W, THUMB_H, THUMB_FPS = 640, 360, 25
POSTER_W, POSTER_H = 1400, 788
