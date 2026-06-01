'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { cn, formatDurationMs } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import { emitTime } from '@/lib/timeChannel';
import type { Caption } from '@/types/editor';

// ── Audio processing chain for real-time noise reduction ──────────────────────
class AudioProcessor {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  connect(video: HTMLVideoElement): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.source) {
      try { this.source = this.ctx.createMediaElementSource(video); }
      catch { return; }
    }
    try { this.source.disconnect(); } catch { /* ok */ }
    this.source.connect(this.ctx.destination);
  }

  enableNR(enabled: boolean): void {
    if (!this.ctx || !this.source) return;
    try { this.source.disconnect(); } catch { /* ok */ }

    if (!enabled) {
      this.source.connect(this.ctx.destination);
      return;
    }

    // High-pass: remove rumble below 80 Hz
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 80;
    hp.Q.value = 0.7;

    // Notch 50 Hz + 60 Hz: remove power-line hum
    const n50 = this.ctx.createBiquadFilter();
    n50.type = 'notch';
    n50.frequency.value = 50;
    n50.Q.value = 15;

    const n60 = this.ctx.createBiquadFilter();
    n60.type = 'notch';
    n60.frequency.value = 60;
    n60.Q.value = 15;

    // Peaking: gently de-emphasise harsh 3–5 kHz range
    const peak = this.ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 4000;
    peak.Q.value = 0.8;
    peak.gain.value = -5;

    // Dynamics compressor: even out volume
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -28;
    comp.knee.value = 35;
    comp.ratio.value = 10;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;

    this.source.connect(hp);
    hp.connect(n50);
    n50.connect(n60);
    n60.connect(peak);
    peak.connect(comp);
    comp.connect(this.ctx.destination);
  }

  destroy(): void {
    try { this.source?.disconnect(); } catch { /* ok */ }
    this.ctx?.close();
  }
}

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastZustandUpdate = useRef<number>(0);
  const audioProc = useRef<AudioProcessor>(new AudioProcessor());

  const [audioReady, setAudioReady] = useState(false);

  const mediaItems = useEditorStore((s) => s.mediaItems);
  const clips = useEditorStore((s) => s.clips);
  const captions = useEditorStore((s) => s.captions);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  const activeClip = clips
    .filter((c) => c.type === 'video')
    .find((c) => c.startTime <= currentTime && c.startTime + clipEffectiveDuration(c) > currentTime);

  const activeMedia = activeClip ? mediaItems.find((m) => m.id === activeClip.mediaId) : null;

  // Current caption
  const activeCaption = captions.find(
    (c) => c.startTime <= currentTime && c.startTime + c.duration > currentTime,
  );

  // Sync video src
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const newSrc = activeMedia?.url ?? '';
    if (video.getAttribute('data-src') !== newSrc) {
      video.setAttribute('data-src', newSrc);
      video.src = newSrc;
      video.load();
      if (newSrc) {
        audioProc.current.connect(video);
        setAudioReady(true);
      }
    }
  }, [activeMedia?.url]);

  // Volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = masterVolume;
  }, [masterVolume]);

  // Noise reduction toggle
  useEffect(() => {
    if (audioReady) audioProc.current.enableNR(noiseReductionEnabled);
  }, [noiseReductionEnabled, audioReady]);

  // Cleanup on unmount
  useEffect(() => {
    const proc = audioProc.current;
    return () => proc.destroy();
  }, []);

  // Seek when currentTime changes externally (scrubber click, not RAF)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || isPlaying) return;
    const targetSource = activeClip.trimIn + (currentTime - activeClip.startTime) * activeClip.speed;
    if (Math.abs(video.currentTime - targetSource) > 0.2) {
      video.currentTime = targetSource;
    }
  }, [currentTime, activeClip, isPlaying]);

  // Play / pause — smooth RAF loop with direct DOM updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setPlaying(false));

      const tick = () => {
        if (!video.paused && activeClip) {
          const sourceTime = video.currentTime;
          const t = activeClip.startTime + (sourceTime - activeClip.trimIn) / activeClip.speed;

          // Direct DOM: timecode and progress bar — zero React overhead
          if (timecodeRef.current) timecodeRef.current.textContent = formatDurationMs(t);
          const pct = duration > 0 ? (t / duration) * 100 : 0;
          if (progressFillRef.current) progressFillRef.current.style.width = `${pct}%`;
          if (scrubberRef.current) scrubberRef.current.style.left = `${pct}%`;

          // Broadcast to timeline playhead — also direct DOM, no React
          emitTime(t);

          // Update Zustand at ~10 fps so other UI stays in sync
          const now = performance.now();
          if (now - lastZustandUpdate.current > 100) {
            setCurrentTime(t);
            lastZustandUpdate.current = now;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      video.pause();
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, activeClip, duration, setPlaying, setCurrentTime]);

  const togglePlay = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    setCurrentTime(t);
    emitTime(t);
  };

  const skipBackward = () => { setCurrentTime(Math.max(0, currentTime - 5)); emitTime(Math.max(0, currentTime - 5)); };
  const skipForward = () => { setCurrentTime(Math.min(duration, currentTime + 5)); emitTime(Math.min(duration, currentTime + 5)); };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasMedia = mediaItems.length > 0;
  const muted = masterVolume === 0;
  const toggleMute = () => setMasterVolume(muted ? 0.8 : 0);

  return (
    <div className="flex flex-1 flex-col bg-bg">
      {/* Video area */}
      <div className="relative flex flex-1 items-center justify-center bg-[#0A0A0A] overflow-hidden">
        {hasMedia ? (
          <>
            <video
              ref={videoRef}
              className="max-h-full max-w-full"
              style={{
                aspectRatio:
                  activeMedia?.width && activeMedia?.height
                    ? `${activeMedia.width}/${activeMedia.height}`
                    : '16/9',
              }}
              onEnded={() => setPlaying(false)}
              playsInline
            />

            {/* Caption overlay */}
            {activeCaption && (
              <div
                className={cn(
                  'pointer-events-none absolute left-4 right-4 flex justify-center',
                  activeCaption.style.position === 'bottom' && 'bottom-10',
                  activeCaption.style.position === 'middle' && 'top-1/2 -translate-y-1/2',
                  activeCaption.style.position === 'top' && 'top-10',
                )}
              >
                <CaptionOverlay caption={activeCaption} />
              </div>
            )}

            {/* Noise reduction badge */}
            {noiseReductionEnabled && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-surface-3/80 px-2 py-1 text-2xs text-ink-2 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-2 animate-pulse" />
                Noise reduction on
              </div>
            )}
          </>
        ) : (
          <EmptyPreview />
        )}

        {/* Click overlay to play/pause */}
        {hasMedia && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-150"
            tabIndex={-1}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              {isPlaying
                ? <Pause size={22} className="text-white" />
                : <Play size={22} className="text-white translate-x-0.5" />}
            </div>
          </button>
        )}
      </div>

      {/* Transport controls */}
      <div className="shrink-0 border-t border-edge bg-surface-1 px-4 py-3">
        {/* Scrubber */}
        <div
          className="relative mb-3 h-1.5 cursor-pointer rounded-full bg-surface-3 group"
          onClick={handleProgressClick}
        >
          {/* Buffered look */}
          <div className="absolute inset-0 rounded-full bg-surface-4" />
          {/* Played fill — updated via ref, not React */}
          <div
            ref={progressFillRef}
            className="absolute left-0 top-0 h-full rounded-full bg-ink-2 transition-none"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber head */}
          <div
            ref={scrubberRef}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-ink-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={skipBackward} disabled={!hasMedia} className="text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-30">
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
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="translate-x-0.5" />}
          </button>

          <button onClick={skipForward} disabled={!hasMedia} className="text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-30">
            <SkipForward size={16} strokeWidth={1.75} />
          </button>

          {/* Timecode — updated via ref during playback */}
          <span ref={timecodeRef} className="ml-1 font-mono text-xs text-ink-2 tabular-nums">
            {formatDurationMs(currentTime)} / {formatDurationMs(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleMute} className="text-ink-3 hover:text-ink-1 transition-colors">
              {muted ? <VolumeX size={15} strokeWidth={1.75} /> : <Volume2 size={15} strokeWidth={1.75} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.01} value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-20 accent-ink-2 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptionOverlay({ caption }: { caption: Caption }) {
  const { style, text } = caption;
  return (
    <span
      className={cn(
        'max-w-xl rounded-md px-4 py-1.5 text-center leading-snug text-white',
        style.bold && 'font-bold',
        style.italic && 'italic',
      )}
      style={{
        fontSize: style.fontSize,
        background: style.background ? `rgba(0,0,0,${style.backgroundOpacity})` : 'transparent',
      }}
    >
      {text}
    </span>
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
