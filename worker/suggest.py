"""Sugestão de título e descrição pelo Claude, a partir do nome da pasta/arquivo e de 4 quadros.
O resultado vai para suggested_title / suggested_description — nunca publica nada sozinho."""
from __future__ import annotations

import base64
import json
from pathlib import Path

from . import config

SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "Título curto do projeto, até 60 caracteres"},
        "description": {"type": "string", "description": "Descrição de 1 a 2 frases, até 280 caracteres"},
    },
    "required": ["title", "description"],
    "additionalProperties": False,
}

PROMPT = """Você ajuda a cadastrar projetos no portfólio de Áquila Oliveira, diretor audiovisual de Salvador (Bahia).
Com base no nome da pasta, no nome do arquivo e nos quadros do vídeo, sugira:
- title: título curto e factual do projeto (ex.: nome do artista, evento ou marca + tipo de peça). Não invente nomes que não aparecem nos nomes ou nas imagens.
- description: 1 a 2 frases em português do Brasil, tom editorial e sóbrio, descrevendo o que se vê.
Se algo for incerto, prefira uma descrição genérica a um detalhe inventado.

Pasta: {folder}
Arquivo: {file}"""


def suggest(folder: str | None, file_name: str | None, frames: list[Path]) -> dict | None:
    """Devolve {"title", "description"} ou None se o Claude não estiver configurado."""
    if not config.ANTHROPIC_API_KEY:
        return None
    import anthropic

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    content: list[dict] = [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                     "data": base64.standard_b64encode(f.read_bytes()).decode()}}
        for f in frames if f.exists()
    ]
    content.append({"type": "text", "text": PROMPT.format(folder=folder or "—", file=file_name or "—")})

    response = client.beta.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",                        # se o modelo recusar, a API tenta outro automaticamente
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": content}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("O Claude recusou a sugestão para este vídeo.")
    text = next((b.text for b in response.content if b.type == "text"), "")
    data = json.loads(text)
    return {"title": data["title"].strip()[:120], "description": data["description"].strip()[:600]}
