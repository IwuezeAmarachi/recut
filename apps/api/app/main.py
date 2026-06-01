from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import projects, media, exports
from app.websocket.manager import ws_router

# Create storage directories before StaticFiles mounts
settings.upload_dir.mkdir(parents=True, exist_ok=True)
(settings.upload_dir / "exports").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Recut API starting — upload_dir: {settings.upload_dir}")
    yield
    print("Recut API shutting down")


app = FastAPI(
    title="Recut API",
    version="0.1.0",
    description="AI video editing backend — FFmpeg + RNNoise processing pipeline",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(media.router, prefix="/projects", tags=["media"])
app.include_router(exports.router, tags=["exports"])
app.include_router(ws_router)

# Serve uploaded media and rendered exports as static files
app.mount("/media", StaticFiles(directory=str(settings.upload_dir)), name="media")
app.mount("/downloads", StaticFiles(directory=str(settings.upload_dir / "exports")), name="downloads")


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "0.1.0"}
