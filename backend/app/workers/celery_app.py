from celery import Celery

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
