from __future__ import annotations
"""
Export pipeline — called as an RQ background job.

Flow for each export job:
1. For each clip, run ffmpeg to produce a trimmed/speed-adjusted segment
2. If noise_reduction=True, extract audio → arnndn → merge back
3. Concatenate all segments via ffmpeg concat demuxer
4. Move final file to output path / upload to S3
5. Update export_store with status and output_url
"""
import asyncio
import tempfile
import uuid
from pathlib import Path

from app.core.config import settings
from app.lib.store import export_store, media_store
from app.services.ffmpeg_service import run_ffmpeg, build_trim_args
from app.services.noise_reduction import apply_rnnoise, extract_audio, merge_denoised_audio


def run_export_job(job_id: str, project_id: str, export_request: dict) -> None:
    """Entry point for RQ worker. Runs the async pipeline synchronously."""
    asyncio.run(_export_pipeline(job_id, project_id, export_request))


async def _export_pipeline(job_id: str, project_id: str, req: dict) -> None:
    def update(status: str, progress: int, output_url: str | None = None, error: str | None = None):
        export_store[job_id].update(
            {"status": status, "progress": progress, "output_url": output_url, "error": error}
        )

    update("processing", 5)

    clips = req.get("clips", [])
    resolution = req.get("resolution", "1080p")
    codec = req.get("codec", "h264")
    bitrate = req.get("bitrate", 8000)
    noise_reduction = req.get("noise_reduction", False)

    if not clips:
        update("error", 0, error="No clips provided")
        return

    project_media = media_store.get(project_id, {})

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        segment_paths: list[str] = []

        for i, clip in enumerate(clips):
            media_id = clip["media_id"]
            media = project_media.get(media_id)
            if not media:
                continue

            input_path = str(settings.upload_dir / project_id / Path(media["url"]).name)
            segment_out = str(tmp / f"seg_{i:04d}.mp4")

            ffmpeg_args = build_trim_args(
                input_path=input_path,
                output_path=segment_out,
                trim_in=clip.get("trim_in", 0),
                duration=clip["duration"] - clip.get("trim_in", 0) - clip.get("trim_out", 0),
                speed=clip.get("speed", 1.0),
                codec=codec,
                bitrate_kbps=bitrate,
                resolution=resolution,
            )
            rc, err = await run_ffmpeg(ffmpeg_args)
            if rc != 0:
                update("error", 0, error=f"Segment {i} failed: {err[:200]}")
                return

            if noise_reduction:
                wav_path = str(tmp / f"seg_{i:04d}_audio.wav")
                denoised_wav = str(tmp / f"seg_{i:04d}_denoised.wav")
                merged = str(tmp / f"seg_{i:04d}_merged.mp4")

                await extract_audio(segment_out, wav_path)
                ok = await apply_rnnoise(wav_path, denoised_wav)
                if ok:
                    await merge_denoised_audio(segment_out, denoised_wav, merged)
                    segment_out = merged

            segment_paths.append(segment_out)
            progress = int(5 + (i + 1) / len(clips) * 80)
            update("processing", progress)

        if not segment_paths:
            update("error", 0, error="No segments produced")
            return

        # Concatenate
        concat_list = tmp / "concat.txt"
        concat_list.write_text("\n".join(f"file '{p}'" for p in segment_paths))

        output_name = f"export_{job_id[:8]}.mp4"
        output_path = settings.upload_dir / "exports" / output_name
        output_path.parent.mkdir(parents=True, exist_ok=True)

        rc, err = await run_ffmpeg([
            "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(output_path),
        ])

        if rc != 0:
            update("error", 85, error=f"Concat failed: {err[:200]}")
            return

        update("done", 100, output_url=f"/downloads/{output_name}")
