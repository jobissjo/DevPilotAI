from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "devpilotai",
    broker=settings.CELERY_BROKER_URL,
    include=[
        "app.tasks.analysis"
    ]
)