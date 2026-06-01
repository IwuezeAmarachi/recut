import asyncio
from pathlib import Path
from app.core.config import settings


async def apply_rnnoise(input_path: str, output_path: str) -> bool:
    """
    Apply RNNoise-based audio denoising via FFmpeg's arnndn filter.
    The arnndn filter ships with FFmpeg 4.0+ and uses a bundled neural net model.
    Returns True on success.
    """
    args = [
        settings.ffmpeg_path,
        "-y",
        "-i", input_path,
        "-af", "arnndn=m=./models/rnnoise-model.rnnn",
        "-c:a", "pcm_s16le",
        output_path,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            # Fallback: try without explicit model (uses built-in default)
            fallback_args = [
                settings.ffmpeg_path, "-y",
                "-i", input_path,
                "-af", "arnndn",
                "-c:a", "pcm_s16le",
                output_path,
            ]
            proc2 = await asyncio.create_subprocess_exec(
                *fallback_args,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc2.communicate()
            return proc2.returncode == 0
        return True
    except Exception:
        return False


async def extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract audio track from video file to WAV."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "44100",
        audio_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0


async def merge_denoised_audio(video_path: str, audio_path: str, output_path: str) -> bool:
    """Merge a denoised audio file back into a video, replacing the original audio."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0
