'use client';
import { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { cn, formatDurationMs } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  const mediaItems = useEditorStore((s) => s.mediaItems);
  const clips = useEditorStore((s) => s.clips);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  const activeClip = clips
    .filter((c) => c.type === 'video')
    .find((c) => c.startTime <= currentTime && c.startTime + clipEffectiveDuration(c) > currentTime);

  const activeMedia = activeClip
    ? mediaItems.find((m) => m.id === activeClip.mediaId)
    : null;

  // Sync video src
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const newSrc = activeMedia?.url ?? '';
    if (video.src !== newSrc) {
      video.src = newSrc;
      video.load();
    }
  }, [activeMedia?.url]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = masterVolume;
  }, [masterVolume]);

  // Seek video when currentTime changes externally (not from RAF)
  const lastSyncedTime = useRef<number>(-1);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;
    const sourceTime = activeClip.trimIn + (currentTime - activeClip.startTime) * activeClip.speed;
    if (Math.abs(video.currentTime - sourceTime) > 0.15) {
      video.currentTime = sourceTime;
      lastSyncedTime.current = sourceTime;
    }
  }, [currentTime, activeClip]);

  // Play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => setPlaying(false));
      const tick = () => {
        if (!video.paused && activeClip) {
          const sourceTime = video.currentTime;
          const timelineTime = activeClip.startTime + (sourceTime - activeClip.trimIn) / activeClip.speed;
          setCurrentTime(timelineTime);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      video.pause();
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, activeClip, setPlaying, setCurrentTime]);

  const togglePlay = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setCurrentTime(ratio * duration);
  };

  const skipBackward = () => setCurrentTime(Math.max(0, currentTime - 5));
  const skipForward = () => setCurrentTime(Math.min(duration, currentTime + 5));

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasMedia = mediaItems.length > 0;

  // Toggle mute
  const muted = masterVolume === 0;
  const toggleMute = () => setMasterVolume(muted ? 0.8 : 0);

  return (
    <div className="flex flex-1 flex-col bg-bg">
      {/* Video area */}
      <div className="relative flex flex-1 items-center justify-center bg-[#0A0A0A]">
        {hasMedia ? (
          <video
            ref={videoRef}
            className="max-h-full max-w-full"
            style={{ aspectRatio: activeMedia?.width && activeMedia?.height ? `${activeMedia.width}/${activeMedia.height}` : '16/9' }}
            onEnded={() => setPlaying(false)}
            playsInline
          />
        ) : (
          <EmptyPreview />
        )}

        {/* Click to play/pause overlay */}
        {hasMedia && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              {isPlaying ? (
                <Pause size={22} className="text-white" />
              ) : (
                <Play size={22} className="text-white translate-x-0.5" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-edge bg-surface-1 px-4 py-3">
        {/* Progress bar */}
        <div
          className="relative mb-3 h-1 cursor-pointer rounded-full bg-surface-3"
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-ink-2 transition-none"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-ink-1 shadow"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Buttons + timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={skipBackward}
            disabled={!hasMedia}
            className="text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-30"
          >
            <SkipBack size={16} strokeWidth={1.75} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!hasMedia}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              'bg-ink-1 text-bg hover:bg-white disabled:opacity-30 disabled:pointer-events-none',
            )}
          >
            {isPlaying ? (
              <Pause size={14} />
            ) : (
              <Play size={14} className="translate-x-0.5" />
            )}
          </button>

          <button
            onClick={skipForward}
            disabled={!hasMedia}
            className="text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-30"
          >
            <SkipForward size={16} strokeWidth={1.75} />
          </button>

          {/* Timecode */}
          <span className="ml-1 font-mono text-xs text-ink-2 tabular-nums">
            {formatDurationMs(currentTime)} / {formatDurationMs(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleMute} className="text-ink-3 hover:text-ink-1 transition-colors">
              {muted ? <VolumeX size={15} strokeWidth={1.75} /> : <Volume2 size={15} strokeWidth={1.75} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-20 accent-ink-2 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-16 w-16 rounded-xl border border-edge bg-surface-1 flex items-center justify-center">
        <Play size={24} className="text-ink-3 translate-x-0.5" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-ink-3">No media loaded</p>
      <p className="text-xs text-ink-3 opacity-60">Import a video from the media panel</p>
    </div>
  );
}
