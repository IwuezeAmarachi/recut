import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.export import ExportRequest, ExportJobOut
from app.lib.store import export_store, project_store
from app.core.queue import get_queue
from app.services.export_service import run_export_job

router = APIRouter()


@router.post("/projects/{project_id}/exports", response_model=ExportJobOut, status_code=202)
async def create_export(project_id: str, body: ExportRequest) -> ExportJobOut:
    if project_id not in project_store:
        raise HTTPException(404, "Project not found")

    job_id = str(uuid.uuid4())
    job_data: ExportJobOut = ExportJobOut(job_id=job_id, status="queued", progress=0)
    export_store[job_id] = job_data.model_dump()

    # Enqueue to Redis RQ
    q = get_queue()
    q.enqueue(run_export_job, job_id, project_id, body.model_dump(), job_id=job_id)

    return job_data


@router.get("/exports/{job_id}", response_model=ExportJobOut)
async def get_export(job_id: str) -> ExportJobOut:
    job = export_store.get(job_id)
    if not job:
        raise HTTPException(404, "Export job not found")
    return ExportJobOut(**job)
