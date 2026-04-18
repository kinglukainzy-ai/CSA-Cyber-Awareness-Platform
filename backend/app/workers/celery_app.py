from celery import Celery, Task
import json
import time

from app.config import settings

celery = Celery(
    "csa_platform", 
    broker=settings.celery_broker_url, 
    backend=settings.celery_result_backend
)

celery.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)


class DLQTask(Task):
    """DLQ base task — logs failures to Redis."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        try:
            from app.services.redis_service import get_redis_client
            client = get_redis_client()
            client.rpush("celery:dead_letter_queue", json.dumps({
                "task_id": task_id,
                "task_name": self.name,
                "args": str(args),
                "kwargs": str(kwargs),
                "exception": str(exc),
                "traceback": str(einfo),
                "failed_at": time.time(),
            }))
        except Exception:
            pass  # Don't let DLQ logging break the failure handler
        super().on_failure(exc, task_id, args, kwargs, einfo)


celery.Task = DLQTask
