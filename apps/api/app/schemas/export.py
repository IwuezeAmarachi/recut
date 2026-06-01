from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Literal


Resolution = Literal["720p", "1080p", "2k"]
Codec = Literal["h264", "h265"]


class ClipExport(BaseModel):
    media_id: str
    start_time: float
    duration: float
    trim_in: float = 0
    trim_out: float = 0
    speed: float = 1.0
    volume: float = 1.0
    track_index: int = 0


class ExportRequest(BaseModel):
    clips: list[ClipExport]
    resolution: Resolution = "1080p"
    codec: Codec = "h264"
    bitrate: int = 8000
    noise_reduction: bool = False

    @field_validator("bitrate")
    @classmethod
    def bitrate_range(cls, v: int) -> int:
        if not (500 <= v <= 100_000):
            raise ValueError("Bitrate must be between 500 and 100,000 kbps")
        return v


class ExportJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "error"]
    progress: int = 0
    output_url: str | None = None
    error: str | None = None
