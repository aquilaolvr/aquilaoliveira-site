"""Log de cada etapa: no console e na tabela job_logs (visível no admin)."""
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
_log = logging.getLogger("worker")


class StepLogger:
    def __init__(self, db=None, project_id: str | None = None, job_id: int | None = None):
        self.db, self.project_id, self.job_id = db, project_id, job_id

    def __call__(self, step: str, message: str, level: str = "info"):
        getattr(_log, "error" if level == "error" else "warning" if level == "warn" else "info")(f"[{step}] {message}")
        if self.db and self.project_id:
            try:
                self.db.insert("job_logs", {"project_id": self.project_id, "job_id": self.job_id, "step": step, "message": message[:2000], "level": level})
            except Exception as e:  # o log nunca derruba o trabalho
                _log.warning(f"[log] não consegui gravar no banco: {e}")


console = StepLogger()
