"""
Audio noise reduction pipelines.

Two modes:
  apply_rnnoise()        — standard NR: fan, HVAC, hum, room noise
  apply_voice_isolation() — voice isolation: removes background speech,
                            laughter, phone calls. Uses Demucs (Meta's
                            source-separation AI) when installed, otherwise
                            falls back to an enhanced FFmpeg chain.

Standard chain (5 stages):
  1. arnndn ×2  — two RNNoise passes; second pass catches what first misses
  2. anlmdn     — non-local means: non-stationary noise (voices, movement)
  3. afftdn     — spectral: steady tonal noise (HVAC, fan whine)
  4. adeclick   — click/pop removal
  5. agate      — noise gate: silence between words
  6. acompressor — final levelling

Voice isolation chain (Demucs not available):
  Same as above but with much higher anlmdn strength and afftdn aggression.
  Not as clean as Demucs but significantly better than standard NR for
  competing voices.
"""
import asyncio
import shutil
from pathlib import Path
from app.core.config import settings

# ─────────────────────────────────────────────────────────────
# Tuning constants
# ─────────────────────────────────────────────────────────────
_AFFTDN_NR = 24         # spectral NR in dB — tuned for USB condenser self-noise
_AFFTDN_NF = -30        # noise floor dBFS — home recording with condenser mic
_GATE_THRESHOLD = 0.02  # open gate above ~-34 dBFS
_GATE_RATIO = 2.0
_GATE_ATTACK = 5        # ms
_GATE_RELEASE = 350     # ms

# Standard NR — handles fan, HVAC, hum, USB hiss
# Double arnndn: second pass works on already-cleaned signal, catches more noise
_DENOISE_CHAIN = (
    "arnndn,"
    "arnndn,"                                              # second neural pass
    "anlmdn=s=5:p=0.002:r=0.002:m=0,"                    # non-local means (non-stationary)
    f"afftdn=nr={_AFFTDN_NR}:nf={_AFFTDN_NF}:tn=1,"
    "adeclick=w=55:o=25:a=2,"
    f"agate=threshold={_GATE_THRESHOLD}:ratio={_GATE_RATIO}"
    f":attack={_GATE_ATTACK}:release={_GATE_RELEASE},"
    "acompressor=threshold=0.1:ratio=3:attack=5:release=80:makeup=1.5"
)

# Voice isolation fallback — more aggressive anlmdn for competing speech
_ISOLATE_CHAIN = (
    "arnndn,"
    "arnndn,"
    "anlmdn=s=25:p=0.002:r=0.003:m=0,"                   # high strength for background voices
    "arnndn,"                                              # third pass after heavy cleanup
    f"afftdn=nr=40:nf=-35:tn=1,"                          # more aggressive spectral
    "adeclick=w=55:o=25:a=2,"
    "agate=threshold=0.025:ratio=3:attack=5:release=400,"
    "acompressor=threshold=0.1:ratio=4:attack=5:release=80:makeup=2"
)


async def apply_rnnoise(input_path: str, output_path: str) -> bool:
    """Standard multi-stage denoise. Best for stationary noise (fan, hum, HVAC)."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", input_path,
        "-af", _DENOISE_CHAIN,
        "-c:a", "pcm_s16le",
        "-ar", "48000",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        # Minimal fallback
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


async def apply_voice_isolation(input_path: str, output_path: str) -> tuple[bool, str]:
    """
    Isolate the foreground voice, suppressing background speech/laughter/music.
    Returns (success, method_used) where method_used is 'demucs' or 'enhanced_ffmpeg'.

    Tries Demucs first (pip install demucs). Falls back to an aggressive FFmpeg
    chain if Demucs is not installed.
    """
    # Try Demucs (Meta's source-separation model — best quality)
    ok = await _try_demucs(input_path, output_path)
    if ok:
        return True, "demucs"

    # Fallback: aggressive FFmpeg chain
    ok = await _enhanced_ffmpeg_isolate(input_path, output_path)
    return ok, "enhanced_ffmpeg"


async def _try_demucs(input_path: str, output_path: str) -> bool:
    """Run Demucs vocal separation. Returns False if not installed."""
    # Quick availability check
    check = await asyncio.create_subprocess_exec(
        "python3", "-c", "import demucs",
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await check.communicate()
    if check.returncode != 0:
        return False

    import tempfile
    tmp = tempfile.mkdtemp()
    stem = Path(input_path).stem

    proc = await asyncio.create_subprocess_exec(
        "python3", "-m", "demucs",
        "--two-stems=vocals",
        "--no-split",
        "-n", "htdemucs",
        "-o", tmp,
        input_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        shutil.rmtree(tmp, ignore_errors=True)
        return False

    vocals_path = Path(tmp) / "htdemucs" / stem / "vocals.wav"
    if not vocals_path.exists():
        shutil.rmtree(tmp, ignore_errors=True)
        return False

    shutil.copy(str(vocals_path), output_path)
    shutil.rmtree(tmp, ignore_errors=True)
    return True


async def _enhanced_ffmpeg_isolate(input_path: str, output_path: str) -> bool:
    """High-aggression FFmpeg chain for background voice suppression."""
    proc = await asyncio.create_subprocess_exec(
        settings.ffmpeg_path,
        "-y", "-i", input_path,
        "-af", _ISOLATE_CHAIN,
        "-c:a", "pcm_s16le",
        "-ar", "48000",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    return proc.returncode == 0


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
