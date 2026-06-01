from __future__ import annotations
import asyncio
import json
from app.core.config import settings


async def probe_media(path: str) -> dict:
    """Return duration, width, height for a media file via ffprobe."""
    cmd = [
        settings.ffprobe_path,
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        path,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        data = json.loads(stdout)
    except Exception:
        return {"duration": 0.0}

    duration = float(data.get("format", {}).get("duration", 0))
    width: int | None = None
    height: int | None = None

    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video":
            width = stream.get("width")
            height = stream.get("height")
            break

    return {"duration": duration, "width": width, "height": height}


async def run_ffmpeg(args: list[str]) -> tuple[int, str]:
    """Execute ffmpeg with given args. Returns (returncode, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    return proc.returncode or 0, stderr.decode()


def build_trim_args(
    input_path: str,
    output_path: str,
    trim_in: float,
    duration: float,
    speed: float,
    codec: str,
    bitrate_kbps: int,
    resolution: str,
) -> list[str]:
    """Build ffmpeg args for trimming + speed change + resolution encode."""
    res_map = {"720p": "1280:720", "1080p": "1920:1080", "2k": "2560:1440"}
    vf_scale = f"scale={res_map.get(resolution, '1920:1080')}:force_original_aspect_ratio=decrease,pad={res_map.get(resolution, '1920:1080')}:(ow-iw)/2:(oh-ih)/2"

    vf = vf_scale
    af = "anull"

    if speed != 1.0:
        vf = f"setpts={1/speed:.4f}*PTS,{vf}"
        af = f"atempo={speed:.2f}"

    codec_flag = "libx265" if codec == "h265" else "libx264"

    return [
        "-y",
        "-ss", str(trim_in),
        "-i", input_path,
        "-t", str(duration / speed),
        "-vf", vf,
        "-af", af,
        "-c:v", codec_flag,
        "-b:v", f"{bitrate_kbps}k",
        "-preset", "medium",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]
