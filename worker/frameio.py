"""Frame.io V4 — autenticação (Adobe IMS), dados do arquivo, link de download e listagem da pasta.

Pontos marcados com CONFERIR seguem o formato publicado do Frame.io V4 / Adobe IMS, mas não
puderam ser validados contra a documentação ao escrever este código. Tudo que depende do
formato da API está concentrado aqui para ser fácil de ajustar.
"""
from __future__ import annotations

import datetime as dt
import time
from pathlib import Path

import requests

from . import config

IMS_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3"  # CONFERIR


class FrameioError(RuntimeError):
    pass


class Frameio:
    def __init__(self, db):
        self.db = db
        self._token: str | None = None
        self._exp = 0.0

    # ---------- autenticação ----------
    def token(self) -> str:
        if self._token and time.time() < self._exp - 60:
            return self._token
        if not config.FRAMEIO_CLIENT_ID or not config.FRAMEIO_CLIENT_SECRET:
            raise FrameioError("Configure FRAMEIO_CLIENT_ID e FRAMEIO_CLIENT_SECRET.")
        if config.FRAMEIO_AUTH_MODE == "s2s":
            data = {"grant_type": "client_credentials", "scope": config.FRAMEIO_SCOPES}
        else:
            row = self.db.get("frameio_auth", id=1)
            if not row or not row.get("refresh_token"):
                raise FrameioError("Frame.io ainda não autorizado: entre no admin e abra /api/frameio/oauth/start.")
            data = {"grant_type": "refresh_token", "refresh_token": row["refresh_token"]}
        data |= {"client_id": config.FRAMEIO_CLIENT_ID, "client_secret": config.FRAMEIO_CLIENT_SECRET}
        r = requests.post(IMS_TOKEN_URL, data=data, timeout=30)
        tok = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        if r.status_code >= 400 or "access_token" not in tok:
            raise FrameioError(f"Adobe IMS recusou o token ({r.status_code}): {tok.get('error_description') or tok.get('error') or r.text[:200]}")
        self._token, self._exp = tok["access_token"], time.time() + int(tok.get("expires_in", 3600))
        if config.FRAMEIO_AUTH_MODE != "s2s":
            self.db.update("frameio_auth", {
                "access_token": tok["access_token"],
                "refresh_token": tok.get("refresh_token") or data["refresh_token"],   # IMS pode girar o refresh token
                "expires_at": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=int(tok.get("expires_in", 3600)))).isoformat(),
                "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            }, id=1)
        return self._token

    def _get(self, path: str, params: dict | None = None) -> dict:
        r = requests.get(f"{config.FRAMEIO_API}{path}", params=params, timeout=60,
                         headers={"Authorization": f"Bearer {self.token()}"})
        if r.status_code == 404:
            raise FrameioError(f"Frame.io: não encontrado ({path})")
        if r.status_code >= 400:
            raise FrameioError(f"Frame.io {path} → {r.status_code}: {r.text[:300]}")
        return r.json()

    # ---------- arquivos ----------
    def get_file(self, account_id: str, file_id: str) -> dict:
        """CONFERIR: GET /accounts/{account}/files/{file}?include=media_links.<qualidade>
        Resposta esperada: {"data": {"id", "name", "parent_id", "media_type", "file_size",
                                      "media_links": {"original": {"download_url"}, ...}}}"""
        include = ",".join(f"media_links.{q}" for q in config.FRAMEIO_DOWNLOAD_PREFERENCE)
        return self._get(f"/accounts/{account_id}/files/{file_id}", {"include": include}).get("data", {})

    def get_folder(self, account_id: str, folder_id: str) -> dict:
        return self._get(f"/accounts/{account_id}/folders/{folder_id}").get("data", {})

    @staticmethod
    def download_url(file: dict) -> tuple[str, str]:
        links = file.get("media_links") or {}
        for q in config.FRAMEIO_DOWNLOAD_PREFERENCE:
            link = links.get(q) or {}
            url = link.get("download_url") or link.get("url")
            if url:
                return url, q
        raise FrameioError("O Frame.io não devolveu link de download (o arquivo ainda está processando?).")

    @staticmethod
    def download(url: str, dest: Path) -> int:
        dest.parent.mkdir(parents=True, exist_ok=True)
        limit = config.MAX_DOWNLOAD_GB * 1024 ** 3
        total = 0
        with requests.get(url, stream=True, timeout=(30, 300)) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in r.iter_content(1024 * 1024):
                    total += len(chunk)
                    if total > limit:
                        raise FrameioError(f"Arquivo maior que MAX_DOWNLOAD_GB={config.MAX_DOWNLOAD_GB} GB.")
                    f.write(chunk)
        return total

    def list_folder_files(self, account_id: str, folder_id: str) -> list[dict]:
        """CONFERIR: GET /accounts/{account}/folders/{folder}/children (paginado por links.next)."""
        items, path, params = [], f"/accounts/{account_id}/folders/{folder_id}/children", {"page_size": 100}
        while path:
            page = self._get(path, params)
            items += [i for i in page.get("data", []) if i.get("type", "file") == "file"]
            nxt = (page.get("links") or {}).get("next")
            path, params = (nxt.replace(config.FRAMEIO_API, "") if nxt else None), None
        return items
