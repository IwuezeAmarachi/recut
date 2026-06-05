'use client';
import { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { cn, formatDurationMs } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import { emitTime } from '@/lib/timeChannel';
import type { Caption } from '@/types/editor';

// ── Audio processor — lazy init on first play (requires user gesture) ──────────
class AudioProcessor {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private nrEnabled = false;
  private normalizeEnabled = false;
  private clipVolume = 1;

  init(video: HTMLVideoElement): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.source = this.ctx.createMediaElementSource(video);
      this.rebuild();
    } catch {
      this.ctx = null;
      this.source = null;
    }
  }

  setNR(enabled: boolean): void { this.nrEnabled = enabled; this.rebuild(); }
  setNormalize(enabled: boolean): void { this.normalizeEnabled = enabled; this.rebuild(); }
  setClipVolume(vol: number): void {
    this.clipVolume = vol;
    if (this.gainNode) this.gainNode.gain.value = vol;
  }

  private rebuild(): void {
    if (!this.ctx || !this.source) return;
    try { this.source.disconnect(); } catch { /* ok */ }

    let last: AudioNode = this.source;

    // Per-clip gain
    const gain = this.ctx.createGain();
    gain.gain.value = this.clipVolume;
    this.gainNode = gain;
    last.connect(gain);
    last = gain;

    if (this.nrEnabled) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;

      const ls = this.ctx.createBiquadFilter();
      ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = -4;

      const humFreqs = [50, 100, 150, 60, 120, 180];
      const notches = humFreqs.map((freq) => {
        const n = this.ctx!.createBiquadFilter();
        n.type = 'notch'; n.frequency.value = freq; n.Q.value = 30;
        return n;
      });

      const hs = this.ctx.createBiquadFilter();
      hs.type = 'highshelf'; hs.frequency.value = 8000; hs.gain.value = -3;

      last.connect(hp); hp.connect(ls);
      let node: AudioNode = ls;
      for (const n of notches) { node.connect(n); node = n; }
      node.connect(hs);
      last = hs;
    }

    if (this.normalizeEnabled) {
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 20;
      comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
      last.connect(comp); last = comp;
    }

    last.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  destroy(): void {
    try { this.source?.disconnect(); } catch { /* ok */ }
    this.ctx?.close().catch(() => { /* ok */ });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastZustandUpdate = useRef<number>(0);
  const audioInitRef = useRef(false);
  const audioProc = useRef(new AudioProcessor());

  // ── Store subscriptions ────────────────────────────────────────────────────
  const mediaItems = useEditorStore((s) => s.mediaItems);
  const clips = useEditorStore((s) => s.clips);
  const captions = useEditorStore((s) => s.captions);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const voiceIsolationEnabled = useEditorStore((s) => s.voiceIsolationEnabled);
  const normalizeAudio = useEditorStore((s) => s.normalizeAudio);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeClip = clips
    .filter((c) => c.type === 'video')
    .find((c) => c.startTime <= currentTime && c.startTime + clipEffectiveDuration(c) > currentTime)
    // Fallback to first video clip when at time 0 (edge case)
    ?? clips.find((c) => c.type === 'video');

  const activeMedia = activeClip ? mediaItems.find((m) => m.id === activeClip.mediaId) : null;

  const activeCaption = captions.find(
    (c) => c.startTime <= currentTime && c.startTime + c.duration > currentTime,
  );

  // ── Keep refs current so the RAF loop is always up-to-date ────────────────
  const activeClipRef = useRef(activeClip);
  activeClipRef.current = activeClip;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // ── Sync video src — use denoised version when NR is on and ready ──────────
  const srcRef = useRef('');
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Priority: voice isolation > noise reduction > original
    const newSrc = (voiceIsolationEnabled && activeMedia?.isolatedUrl)
      ? activeMedia.isolatedUrl
      : (noiseReductionEnabled && activeMedia?.denoisedUrl)
      ? activeMedia.denoisedUrl
      : activeMedia?.url ?? '';
    if (srcRef.current === newSrc) return;
    srcRef.current = newSrc;
    video.src = newSrc;
    if (newSrc) video.load();
  }, [activeMedia?.url, activeMedia?.denoisedUrl, activeMedia?.isolatedUrl, noiseReductionEnabled, voiceIsolationEnabled]);

  // ── Volume ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = masterVolume;
  }, [masterVolume]);

  // ── NR / normalize / clip volume ──────────────────────────────────────────
  useEffect(() => { audioProc.current.setNR(noiseReductionEnabled); }, [noiseReductionEnabled]);
  useEffect(() => { audioProc.current.setNormalize(normalizeAudio); }, [normalizeAudio]);
  useEffect(() => {
    audioProc.current.setClipVolume(activeClip?.volume ?? 1);
  }, [activeClip?.volume]);

  // Cleanup
  useEffect(() => {
    const proc = audioProc.current;
    return () => proc.destroy();
  }, []);

  // ── Seek when paused ───────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isPlaying) return;
    const clip = activeClipRef.current;
    if (!clip) return;
    const target = clip.trimIn + (currentTime - clip.startTime) * clip.speed;
    if (Math.abs(video.currentTime - target) > 0.2) video.currentTime = target;
  }, [currentTime, isPlaying]);

  // ── Play / pause — RAF loop only re-runs when isPlaying changes ────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      // Lazy AudioContext init — must be inside user gesture response
      if (!audioInitRef.current && video.src) {
        audioProc.current.init(video);
        audioInitRef.current = true;
      }

      video.play().catch(() => setPlaying(false));

      const tick = () => {
        const clip = activeClipRef.current;
        if (!video.paused && clip) {
          const t = clip.startTime + (video.currentTime - clip.trimIn) / clip.speed;

          // Direct DOM — no React re-render
          if (timecodeRef.current) timecodeRef.current.textContent = formatDurationMs(t);
          const d = durationRef.current;
          const pct = d > 0 ? (t / d) * 100 : 0;
          if (progressFillRef.current) progressFillRef.current.style.width = `${pct}%`;
          if (scrubberRef.current) scrubberRef.current.style.left = `${pct}%`;
          emitTime(t);

          // Throttled Zustand sync (~10 fps)
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
  }, [isPlaying]); // ← ONLY isPlaying. Refs handle everything else.

  const togglePlay = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    setCurrentTime(t);
    emitTime(t);
  };

  const skipBackward = () => {
    const t = Math.max(0, currentTime - 5);
    setCurrentTime(t); emitTime(t);
  };
  const skipForward = () => {
    const t = Math.min(duration, currentTime + 5);
    setCurrentTime(t); emitTime(t);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasMedia = mediaItems.length > 0;
  const muted = masterVolume === 0;

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
                  'pointer-events-none absolute left-6 right-6 flex justify-center',
                  activeCaption.style.position === 'bottom' && 'bottom-12',
                  activeCaption.style.position === 'middle' && 'top-1/2 -translate-y-1/2',
                  activeCaption.style.position === 'top' && 'top-10',
                )}
              >
                <CaptionOverlay caption={activeCaption} />
              </div>
            )}

            {/* NR indicator */}
            {noiseReductionEnabled && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-2xs text-ink-2 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-2 animate-pulse" />
                Noise filter on
              </div>
            )}
          </>
        ) : (
          <EmptyPreview />
        )}

        {/* Click-to-play overlay */}
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

      {/* Transport */}
      <div className="shrink-0 border-t border-edge bg-surface-1 px-4 py-3">
        {/* Scrubber */}
        <div
          className="relative mb-3 h-1.5 cursor-pointer rounded-full bg-surface-3 group"
          onClick={handleProgressClick}
        >
          <div className="absolute inset-0 rounded-full bg-surface-4" />
          <div
            ref={progressFillRef}
            className="absolute left-0 top-0 h-full rounded-full bg-ink-2 transition-none"
            style={{ width: `${progress}%` }}
          />
          <div
            ref={scrubberRef}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
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

          <span ref={timecodeRef} className="ml-1 font-mono text-xs text-ink-2 tabular-nums">
            {formatDurationMs(currentTime)} / {formatDurationMs(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setMasterVolume(muted ? 0.8 : 0)} className="text-ink-3 hover:text-ink-1 transition-colors">
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
      className={cn('max-w-2xl rounded-md px-5 py-2 text-center leading-snug text-white', style.bold && 'font-bold', style.italic && 'italic')}
      style={{ fontSize: style.fontSize, background: style.background ? `rgba(0,0,0,${style.backgroundOpacity})` : 'transparent' }}
    >
      {text}
    </span>
  );
}

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-edge bg-surface-1">
        <Play size={24} className="translate-x-0.5 text-ink-3" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-ink-3">No media loaded</p>
      <p className="text-xs text-ink-3 opacity-60">Import a video from the media panel</p>
    </div>
  );
}
