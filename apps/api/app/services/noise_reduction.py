"""
Multi-stage audio noise reduction pipeline.

Stage order (matters — each stage handles what the previous misses):
  1. arnndn   — RNNoise neural net: broadband stationary + non-stationary noise
  2. afftdn   — FFT spectral denoising: tonal/steady noise (HVAC hum, fan whine)
  3. adeclick — Click & pop removal (mouse clicks, mic handling)
  4. agate    — Noise gate: silences residual background between words
  5. acompressor — Final levelling to restore perceived loudness lost by gating

This combination routinely outperforms single-stage AI denoise
(as used in CapCut, Zoom, etc.) because each filter targets a different
noise profile, and the gate stage removes noise that neural nets leave behind.
"""
import asyncio
from app.core.config import settings

# ─────────────────────────────────────────────────────────────
# Tuning constants — tweak to taste
# ─────────────────────────────────────────────────────────────
_AFFTDN_NR = 24        # spectral NR in dB — bumped for USB condenser self-noise
_AFFTDN_NF = -30       # noise floor dBFS — -30 fits home recording with condenser mic
_GATE_THRESHOLD = 0.02  # open gate above this RMS level (linear, ~-34 dBFS)
_GATE_RATIO = 2.0       # slightly firmer gate for room noise between words
_GATE_ATTACK = 5        # ms to open gate (keep fast so speech onset isn't cut)
_GATE_RELEASE = 350     # ms to close gate (keep slow to avoid choppiness)

# Full filter chain as a single FFmpeg -af string
_DENOISE_CHAIN = (
    "arnndn,"                                           # 1. Neural NR
    f"afftdn=nr={_AFFTDN_NR}:nf={_AFFTDN_NF}:tn=1,"   # 2. Spectral NR (tn=1 tracks noise)
    "adeclick=w=55:o=25:a=2,"                           # 3. Click/pop removal
    f"agate=threshold={_GATE_THRESHOLD}"
    f":ratio={_GATE_RATIO}"
    f":attack={_GATE_ATTACK}"
    f":release={_GATE_RELEASE},"                        # 4. Noise gate
    "acompressor=threshold=0.1:ratio=3:attack=5:release=80:makeup=1.5"  # 5. Leveller
)


async def apply_rnnoise(input_path: str, output_path: str) -> bool:
    """
    Apply the full multi-stage denoise chain to a WAV file.
    Returns True on success.
    """
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y",
        "-i", input_path,
        "-af", _DENOISE_CHAIN,
        "-c:a", "pcm_s16le",
        "-ar", "48000",   # upsample to 48k — arnndn works best here
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        # Graceful fallback: arnndn only (minimal but always works)
        fallback = await asyncio.create_subprocess_exec(
            settings.ffmpeg_path,
            "-y", "-i", input_path,
            "-af", "arnndn,agate=threshold=0.02:ratio=2:attack=5:release=300",
            "-c:a", "pcm_s16le",
            output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await fallback.communicate()
        return fallback.returncode == 0

    return True


async def extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract audio track from video to WAV at 48 kHz (optimal for arnndn)."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "48000",
        audio_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0


async def merge_denoised_audio(video_path: str, audio_path: str, output_path: str) -> bool:
    """Replace original audio in a video with the denoised WAV."""
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
