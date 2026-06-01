from pydantic import BaseModel, field_validator
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Project name cannot be empty")
        return v[:120]


class ProjectPatch(BaseModel):
    name: str | None = None


class ProjectOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
