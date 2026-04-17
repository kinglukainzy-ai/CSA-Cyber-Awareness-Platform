from celery import Celery

from app.config import settings

celery = Celery("csa_platform", broker=settings.celery_broker_url, backend=settings.celery_result_backend)
