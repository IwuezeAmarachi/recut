from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.schemas.project import ProjectCreate, ProjectPatch, ProjectOut
from app.lib.store import project_store

router = APIRouter()


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate) -> ProjectOut:
    now = datetime.now(timezone.utc)
    project_id = body.id or _new_id()
    if project_id in project_store:
        return ProjectOut(**project_store[project_id])
    project = {"id": project_id, "name": body.name, "created_at": now, "updated_at": now}
    project_store[project_id] = project
    return ProjectOut(**project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str) -> ProjectOut:
    p = project_store.get(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return ProjectOut(**p)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: ProjectPatch) -> ProjectOut:
    p = project_store.get(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    if body.name is not None:
        p["name"] = body.name.strip()[:120]
    p["updated_at"] = datetime.now(timezone.utc)
    return ProjectOut(**p)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str) -> None:
    if project_id not in project_store:
        raise HTTPException(404, "Project not found")
    del project_store[project_id]


def _new_id() -> str:
    import uuid
    return str(uuid.uuid4())
