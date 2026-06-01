from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    upload_dir: Path = Path("/tmp/media")
    redis_url: str = "redis://localhost:6379"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Storage (optional — falls back to local fs)
    aws_bucket: str = ""
    aws_region: str = "us-east-1"

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"


settings = Settings()
