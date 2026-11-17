"""Acesso ao Supabase pela API REST (PostgREST + Storage) com a service role."""
import mimetypes
from pathlib import Path

import requests

from . import config


class Supabase:
    def __init__(self, url: str | None = None, key: str | None = None):
        self.url = (url or config.SUPABASE_URL).rstrip("/")
        key = key or config.SUPABASE_KEY
        if not self.url or not key:
            raise RuntimeError("Configure SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.")
        self.s = requests.Session()
        self.s.headers.update({"apikey": key, "Authorization": f"Bearer {key}"})

    # ---------- tabelas ----------
    def _check(self, r: requests.Response):
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase {r.request.method} {r.url.split('?')[0]} → {r.status_code}: {r.text[:500]}")
        return r.json() if r.text else None

    def select(self, table: str, **filters) -> list[dict]:
        params = {"select": "*", **{k: f"eq.{v}" for k, v in filters.items()}}
        return self._check(self.s.get(f"{self.url}/rest/v1/{table}", params=params))

    def get(self, table: str, **filters) -> dict | None:
        rows = self.select(table, **filters)
        return rows[0] if rows else None

    def insert(self, table: str, row: dict, ignore_duplicates_on: str | None = None) -> dict | None:
        headers = {"Prefer": "return=representation"}
        params = {}
        if ignore_duplicates_on:
            headers["Prefer"] += ",resolution=ignore-duplicates"
            params["on_conflict"] = ignore_duplicates_on
        rows = self._check(self.s.post(f"{self.url}/rest/v1/{table}", json=row, headers=headers, params=params))
        return rows[0] if rows else None

    def update(self, table: str, patch: dict, **filters) -> list[dict]:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        return self._check(self.s.patch(f"{self.url}/rest/v1/{table}", json=patch, params=params, headers={"Prefer": "return=representation"}))

    def rpc(self, fn: str, args: dict | None = None):
        return self._check(self.s.post(f"{self.url}/rest/v1/rpc/{fn}", json=args or {}))

    # ---------- storage ----------
    def upload(self, local: Path, dest: str, content_type: str | None = None) -> str:
        ctype = content_type or mimetypes.guess_type(local.name)[0] or "application/octet-stream"
        with open(local, "rb") as f:
            r = self.s.post(f"{self.url}/storage/v1/object/{config.BUCKET}/{dest}", data=f,
                            headers={"Content-Type": ctype, "x-upsert": "true", "Cache-Control": "max-age=31536000"})
        self._check(r)
        return f"{self.url}/storage/v1/object/public/{config.BUCKET}/{dest}"
