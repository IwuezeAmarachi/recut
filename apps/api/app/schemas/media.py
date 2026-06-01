from pydantic import BaseModel


class MediaItemOut(BaseModel):
    id: str
    project_id: str
    name: str
    type: str  # 'video' | 'audio'
    url: str
    duration: float
    width: int | None
    height: int | None
    size_bytes: int
