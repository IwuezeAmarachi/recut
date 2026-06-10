"""
Audio noise reduction using noisereduce (spectral gating) as primary method.

noisereduce is far superior to FFmpeg filters for real-world noise because it
learns the noise profile from the audio itself — unlike arnndn/afftdn which use
fixed filter banks. It handles fans, AC, hum, AND competing voices/laughter.

Two modes:
  apply_rnnoise()        — standard: prop_decrease=0.80, non-stationary
  apply_voice_isolation() — aggressive: prop_decrease=0.95, strips background
                            speech. Tries Demucs first if installed.
"""
import asyncio
import shutil
from pathlib import Path
from app.core.config import settings


def _nr_process(input_path: str, output_path: str, prop_decrease: float) -> bool:
    """
    Synchronous noisereduce + FFmpeg fallback. Runs in a thread pool so the
    event loop is never blocked.
    """
    import numpy as np
    try:
        import noisereduce as nr
        import soundfile as sf

        data, rate = sf.read(input_path)

        nr_kwargs = dict(
            sr=rate,
            # stationary=True captures a noise profile from quiet segments (fans,
            # AC, room tone) and subtracts it cleanly — best for screen recordings
            stationary=True,
            prop_decrease=prop_decrease,
            n_std_thresh_stationary=1.2,
            freq_mask_smooth_hz=300,
            time_mask_smooth_ms=25,
        )

        if data.ndim > 1:
            # Process each channel independently, preserve stereo
            channels = [
                nr.reduce_noise(y=data[:, i].astype(np.float32), **nr_kwargs)
                for i in range(data.shape[1])
            ]
            reduced = np.stack(channels, axis=1)
        else:
            reduced = nr.reduce_noise(y=data.astype(np.float32), **nr_kwargs)

        sf.write(output_path, reduced.astype(np.float32), rate)
        return True

    except Exception:
        return False


async def apply_rnnoise(input_path: str, output_path: str) -> bool:
    """Standard noise reduction. Handles fan, HVAC, hum, mic self-noise."""
    # Run CPU-bound processing off the event loop
    ok = await asyncio.to_thread(_nr_process, input_path, output_path, 0.92)
    if ok:
        return True

    # FFmpeg fallback — always available
    chain = (
        "arnndn,arnndn,"
        "anlmdn=s=5:p=0.002:r=0.002:m=0,"
        "afftdn=nr=24:nf=-30:tn=1,"
        "adeclick=w=55:o=25:a=2,"
        "agate=threshold=0.02:ratio=2:attack=5:release=350,"
        "acompressor=threshold=0.1:ratio=3:attack=5:release=80:makeup=1.5"
    )
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", input_path,
        "-af", chain,
        "-c:a", "pcm_s16le", "-ar", "48000",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0


async def apply_voice_isolation(input_path: str, output_path: str) -> tuple[bool, str]:
    """
    Aggressive voice isolation — removes background speech, laughter, music.
    Tries Demucs first (best quality), then noisereduce at max aggression.
    """
    if await _try_demucs(input_path, output_path):
        return True, "demucs"

    ok = await asyncio.to_thread(_nr_process, input_path, output_path, 0.97)
    if ok:
        return True, "noisereduce"

    # Last resort FFmpeg
    chain = (
        "arnndn,arnndn,arnndn,"
        "anlmdn=s=25:p=0.002:r=0.003:m=0,"
        "afftdn=nr=40:nf=-35:tn=1,"
        "adeclick=w=55:o=25:a=2,"
        "agate=threshold=0.025:ratio=3:attack=5:release=400,"
        "acompressor=threshold=0.1:ratio=4:attack=5:release=80:makeup=2"
    )
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", input_path,
        "-af", chain,
        "-c:a", "pcm_s16le", "-ar", "48000",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0, "ffmpeg"


async def _try_demucs(input_path: str, output_path: str) -> bool:
    check = await asyncio.create_subprocess_exec(
        "python3", "-c", "import demucs",
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await check.communicate()
    if check.returncode != 0:
        return False

    import tempfile
    tmp = tempfile.mkdtemp()
    stem = Path(input_path).stem
    proc = await asyncio.create_subprocess_exec(
        "python3", "-m", "demucs",
        "--two-stems=vocals", "--no-split", "-n", "htdemucs",
        "-o", tmp, input_path,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()
    vocals = Path(tmp) / "htdemucs" / stem / "vocals.wav"
    if proc.returncode == 0 and vocals.exists():
        shutil.copy(str(vocals), output_path)
        shutil.rmtree(tmp, ignore_errors=True)
        return True
    shutil.rmtree(tmp, ignore_errors=True)
    return False


async def extract_audio(video_path: str, audio_path: str) -> bool:
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "48000",
        audio_path,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0


async def merge_denoised_audio(video_path: str, audio_path: str, output_path: str) -> bool:
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y",
        "-i", video_path, "-i", audio_path,
        "-c:v", "copy",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        output_path,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0
