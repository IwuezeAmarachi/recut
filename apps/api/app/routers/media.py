import uuid
import struct
import shutil
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from app.schemas.media import MediaItemOut
from app.core.config import settings
from app.lib.store import media_store, project_store
from app.services.ffmpeg_service import probe_media
from app.services.transcription import transcribe_media
from app.services.noise_reduction import apply_rnnoise, extract_audio, merge_denoised_audio

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


@router.get("/{project_id}/media/{media_id}/waveform")
async def get_waveform(
    project_id: str,
    media_id: str,
    points: int = Query(default=300, ge=50, le=2000),
) -> dict:
    bucket = media_store.get(project_id, {})
    media = bucket.get(media_id)
    if not media:
        raise HTTPException(404, "Media not found")

    src_path = settings.upload_dir / project_id / Path(media["url"]).name
    if not src_path.exists():
        raise HTTPException(404, "Media file not found on disk")

    # Extract audio as raw float32 mono at 1000 Hz — small output even for long files
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", str(src_path),
        "-vn", "-ac", "1", "-ar", "1000", "-f", "f32le", "pipe:1",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    data, _ = await proc.communicate()

    if not data or proc.returncode != 0:
        return {"peaks": [], "duration": 0.0}

    n_samples = len(data) // 4
    samples = struct.unpack(f"{n_samples}f", data)

    chunk_size = max(1, n_samples // points)
    peaks: list[float] = []
    for i in range(0, n_samples - chunk_size + 1, chunk_size):
        chunk = samples[i : i + chunk_size]
        peaks.append(max(abs(s) for s in chunk))
        if len(peaks) >= points:
            break

    max_peak = max(peaks) if peaks else 1.0
    if max_peak > 0:
        peaks = [round(p / max_peak, 4) for p in peaks]

    return {"peaks": peaks, "duration": round(n_samples / 1000, 3)}


@router.post("/{project_id}/media/{media_id}/denoise")
async def denoise_media(project_id: str, media_id: str) -> dict:
    bucket = media_store.get(project_id, {})
    media = bucket.get(media_id)
    if not media:
        raise HTTPException(404, "Media not found")

    src_path = settings.upload_dir / project_id / Path(media["url"]).name
    if not src_path.exists():
        raise HTTPException(404, "Media file not found on disk")

    dest_name = src_path.stem + "_denoised" + src_path.suffix
    dest_path = settings.upload_dir / project_id / dest_name

    # Return cached result if already denoised
    if dest_path.exists():
        return {"url": f"/media/{project_id}/{dest_name}"}

    is_video = media.get("type") == "video"
    wav_path = str(dest_path.with_suffix(".wav"))
    denoised_wav = str(dest_path.with_suffix("_clean.wav"))

    if is_video:
        ok = await extract_audio(str(src_path), wav_path)
        if not ok:
            raise HTTPException(500, "Failed to extract audio")
        ok = await apply_rnnoise(wav_path, denoised_wav)
        if not ok:
            raise HTTPException(500, "Noise reduction failed")
        ok = await merge_denoised_audio(str(src_path), denoised_wav, str(dest_path))
        if not ok:
            raise HTTPException(500, "Failed to merge denoised audio")
    else:
        ok = await apply_rnnoise(str(src_path), str(dest_path))
        if not ok:
            raise HTTPException(500, "Noise reduction failed")

    # Clean up intermediate WAVs
    for p in [wav_path, denoised_wav]:
        try:
            Path(p).unlink(missing_ok=True)
        except OSError:
            pass

    return {"url": f"/media/{project_id}/{dest_name}"}


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
