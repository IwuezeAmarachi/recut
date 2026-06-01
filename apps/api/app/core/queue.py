from __future__ import annotations
from redis import Redis
from rq import Queue
from app.core.config import settings

_redis: Redis | None = None
_queue: Queue | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url)
    return _redis


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue("exports", connection=get_redis())
    return _queue
