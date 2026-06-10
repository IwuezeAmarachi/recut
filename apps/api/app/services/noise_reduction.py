"""
Audio processing using FFmpeg arnndn (RNNoise neural network) as primary method.

arnndn is a recurrent neural network trained specifically for speech enhancement.
It CANNOT remove the speaker's voice because it was trained to separate speech
from noise — it only removes what is statistically not speech.

noisereduce (spectral gating) is used only as a last resort because it works on
frequency bands and cannot distinguish voice from same-frequency noise.
"""
import asyncio
import shutil
from pathlib import Path
from app.core.config import settings


async def _ffmpeg_filter(input_path: str, output_path: str, af_chain: str) -> bool:
    """Run an FFmpeg audio filter chain. Returns True on success."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", input_path,
        "-af", af_chain,
        "-c:a", "pcm_s16le", "-ar", "48000",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0


def _nr_fallback(input_path: str, output_path: str, prop_decrease: float) -> bool:
    """
    noisereduce spectral gating — last resort only.
    Keep prop_decrease ≤ 0.5 to avoid stripping voice frequencies.
    """
    import numpy as np
    try:
        import noisereduce as nr
        import soundfile as sf

        data, rate = sf.read(input_path)
        kwargs = dict(
            sr=rate,
            stationary=False,      # adapt over time — don't build profile from first 0.5s
            prop_decrease=prop_decrease,
            n_std_thresh_stationary=1.5,
            freq_mask_smooth_hz=500,
            time_mask_smooth_ms=50,
        )
        if data.ndim > 1:
            channels = [
                nr.reduce_noise(y=data[:, i].astype(np.float32), **kwargs)
                for i in range(data.shape[1])
            ]
            reduced = np.stack(channels, axis=1)
        else:
            reduced = nr.reduce_noise(y=data.astype(np.float32), **kwargs)

        sf.write(output_path, reduced.astype(np.float32), rate)
        return True
    except Exception:
        return False


async def apply_rnnoise(input_path: str, output_path: str) -> bool:
    """
    Standard noise reduction — fan, HVAC, hum, mic hiss, room tone.

    Uses arnndn (RNNoise NN) as primary: trained to preserve speech while
    removing background noise. Voice is never stripped.
    afftdn adds gentle FFT denoising on residual noise.
    highpass removes sub-80Hz rumble (desk vibration, handling noise).
    """
    chain = "arnndn,afftdn=nr=10:nf=-25:tn=1,highpass=f=80"
    if await _ffmpeg_filter(input_path, output_path, chain):
        return True

    # Last resort: very light spectral gating (0.5 = remove 50% of noise floor)
    return await asyncio.to_thread(_nr_fallback, input_path, output_path, 0.50)


async def apply_voice_isolation(input_path: str, output_path: str) -> tuple[bool, str]:
    """
    Voice isolation — removes background speech, laughter, music.
    Tries Demucs first (best quality, true source separation).
    Falls back to double-pass arnndn + afftdn (strong but speech-safe).
    """
    if await _try_demucs(input_path, output_path):
        return True, "demucs"

    # Double-pass arnndn for stronger isolation + afftdn cleanup
    chain = "arnndn,arnndn,afftdn=nr=20:nf=-30:tn=1,highpass=f=100"
    if await _ffmpeg_filter(input_path, output_path, chain):
        return True, "ffmpeg"

    # Last resort: moderate spectral gating
    ok = await asyncio.to_thread(_nr_fallback, input_path, output_path, 0.65)
    return ok, "noisereduce"


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
