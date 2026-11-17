"""Linha de comando do worker.

  python -m worker run            # loop: processa a fila (e, se FRAMEIO_POLL=true, procura arquivos novos)
  python -m worker once           # processa o que estiver na fila e sai (usado no GitHub Actions)
  python -m worker poll-frameio   # plano B sem webhook: enfileira arquivos novos da pasta
  python -m worker thumb-test VIDEO [SAIDA]   # testa só a thumb, sem banco nem Frame.io
"""
import sys
import time
from pathlib import Path

from . import config
from .log import console


def cli():
    args = sys.argv[1:]
    cmd = args[0] if args else "run"
    if cmd == "thumb-test":
        if len(args) < 2:
            sys.exit("uso: python -m worker thumb-test VIDEO [SAIDA]")
        from .thumbs import build
        out = Path(args[2] if len(args) > 2 else "worker/.tmp/thumb-test")
        r = build(Path(args[1]), out)
        console("thumb", f"duração {r.duration:.1f}s · trechos em {r.points}")
        for f in (r.mp4, r.webm, r.poster):
            console("thumb", f"{f}  ({f.stat().st_size / 1024:.0f} KB)")
        return

    from .db import Supabase
    from .pipeline import poll_frameio, process_queue
    db = Supabase()
    if cmd == "once":
        if config.FRAMEIO_POLL:
            poll_frameio(db)
        process_queue(db)
    elif cmd == "poll-frameio":
        poll_frameio(db)
    elif cmd == "run":
        console("worker", f"rodando — verificando a fila a cada {config.POLL_SECONDS}s")
        while True:
            try:
                if config.FRAMEIO_POLL:
                    poll_frameio(db)
                process_queue(db)
            except Exception as e:  # o loop nunca morre
                console("worker", f"erro no ciclo: {e}", "error")
            time.sleep(config.POLL_SECONDS)
    else:
        sys.exit(__doc__)
