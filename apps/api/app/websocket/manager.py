import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.lib.store import export_store

ws_router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, job_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[job_id] = ws

    def disconnect(self, job_id: str) -> None:
        self._connections.pop(job_id, None)

    async def broadcast_job(self, job_id: str) -> None:
        ws = self._connections.get(job_id)
        if not ws:
            return
        job = export_store.get(job_id)
        if job:
            try:
                await ws.send_json(job)
            except Exception:
                self.disconnect(job_id)


manager = ConnectionManager()


@ws_router.websocket("/ws/exports/{job_id}")
async def export_progress(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)
    try:
        while True:
            job = export_store.get(job_id)
            if job:
                await websocket.send_json(job)
                if job.get("status") in ("done", "error"):
                    break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(job_id)
