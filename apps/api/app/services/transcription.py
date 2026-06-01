"""Whisper-based transcription via the OpenAI API."""
from openai import AsyncOpenAI
from app.core.config import settings


async def transcribe_media(file_path: str) -> list[dict]:
    """
    Transcribe audio/video using OpenAI Whisper API.
    Returns a list of {start, end, text} segments.
    """
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    return [
        {"start": float(seg.start), "end": float(seg.end), "text": seg.text.strip()}
        for seg in (response.segments or [])
        if seg.text.strip()
    ]
