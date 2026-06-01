import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.media import MediaItemOut
from app.core.config import settings
from app.lib.store import media_store, project_store
from app.services.ffmpeg_service import probe_media
from app.services.transcription import transcribe_media

router = APIRouter()

ALLOWED_MIME = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/x-matroska", "video/webm",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac",
}


@router.post("/{project_id}/media", response_model=MediaItemOut, status_code=201)
async def upload_media(project_id: str, file: UploadFile = File(...)) -> MediaItemOut:
    if project_id not in project_store:
        raise HTTPException(404, "Project not found")

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    media_id = str(uuid.uuid4())
    dest_dir = settings.upload_dir / project_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "upload").suffix or ".mp4"
    dest = dest_dir / f"{media_id}{suffix}"

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    is_video = file.content_type.startswith("video/")
    meta = await probe_media(str(dest))

    item: MediaItemOut = MediaItemOut(
        id=media_id,
        project_id=project_id,
        name=file.filename or dest.name,
        type="video" if is_video else "audio",
        url=f"/media/{project_id}/{dest.name}",
        duration=meta["duration"],
        width=meta.get("width"),
        height=meta.get("height"),
        size_bytes=dest.stat().st_size,
    )
    media_store.setdefault(project_id, {})[media_id] = item.model_dump()
    return item


@router.get("/{project_id}/media", response_model=list[MediaItemOut])
async def list_media(project_id: str) -> list[MediaItemOut]:
    if project_id not in project_store:
        raise HTTPException(404, "Project not found")
    items = media_store.get(project_id, {})
    return [MediaItemOut(**v) for v in items.values()]


@router.delete("/{project_id}/media/{media_id}", status_code=204)
async def delete_media(project_id: str, media_id: str) -> None:
    bucket = media_store.get(project_id, {})
    if media_id not in bucket:
        raise HTTPException(404, "Media not found")
    del bucket[media_id]


@router.post("/{project_id}/media/{media_id}/transcribe")
async def transcribe(project_id: str, media_id: str) -> dict:
    bucket = media_store.get(project_id, {})
    media = bucket.get(media_id)
    if not media:
        raise HTTPException(404, "Media not found")

    file_path = str(settings.upload_dir / project_id / Path(media["url"]).name)

    try:
        segments = await transcribe_media(file_path)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Transcription failed: {exc}")

    return {"segments": segments}
