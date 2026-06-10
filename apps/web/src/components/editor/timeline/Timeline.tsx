'use client';
import { useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import { TimelineRuler } from './TimelineRuler';
import { VideoTrack, AudioTrack, CaptionTrack } from './TimelineTrack';
import { onTime, emitTime } from '@/lib/timeChannel';
import type { Clip, MediaItem } from '@/types/editor';

const TRACK_HEADER_W = 48;
const BASE_PX_PER_SEC = 100;

// ── Project waveform strip — amber/golden, full timeline width ────────────────
function WaveformStrip({
  clips, mediaItems, pxPerSec, totalWidth,
}: {
  clips: Clip[]; mediaItems: MediaItem[]; pxPerSec: number; totalWidth: number;
}) {
  const videoClips = clips.filter((c) => c.type === 'video');
  const hasWaveform = videoClips.some((c) => {
    const m = mediaItems.find((mi) => mi.id === c.mediaId);
    return !!m?.waveformPeaks?.length;
  });

  return (
    <div className="flex h-9 shrink-0">
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-center border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        <span className="text-[10px] font-semibold text-ink-3/50">~</span>
      </div>
      {/* Waveform canvas */}
      <div
        className="relative h-full border-b border-edge bg-[#0a0908] overflow-hidden"
        style={{ width: totalWidth }}
      >
        {hasWaveform ? (
          <svg
            className="absolute inset-0"
            width={totalWidth}
            height={36}
            style={{ display: 'block' }}
          >
            {videoClips.map((clip) => {
              const media = mediaItems.find((m) => m.id === clip.mediaId);
              if (!media?.waveformPeaks?.length) return null;
              const peaks = media.waveformPeaks;
              const clipStartX = clip.startTime * pxPerSec;
              const clipW = Math.max(1, clipEffectiveDuration(clip) * pxPerSec);
              const barW = Math.max(0.6, clipW / peaks.length);

              return peaks.map((amp, i) => {
                const bx = clipStartX + (i / peaks.length) * clipW;
                const h = Math.max(2, amp * 32);
                const by = (36 - h) / 2;
                return (
                  <rect
                    key={`${clip.id}-${i}`}
                    x={bx} y={by}
                    width={Math.max(1, barW)} height={h}
                    rx={0.3}
                    fill="rgba(251,191,36,0.7)"
                  />
                );
              });
            })}
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-amber-400/10" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rulerPlayheadRef = useRef<HTMLDivElement>(null);

  const clips = useEditorStore((s) => s.clips);
  const captions = useEditorStore((s) => s.captions);
  const mediaItems = useEditorStore((s) => s.mediaItems);
  const duration = useEditorStore((s) => s.duration);
  const zoom = useEditorStore((s) => s.zoom);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const addCaption = useEditorStore((s) => s.addCaption);

  const pxPerSec = zoom * BASE_PX_PER_SEC;
  const totalWidth = Math.max(duration * pxPerSec + 300, 900);

  const videoClips = clips.filter((c) => c.trackIndex === 0);
  const audioClips = clips.filter((c) => c.trackIndex === 1);

  const seek = useCallback(
    (time: number) => {
      const t = Math.max(0, Math.min(time, Math.max(duration, 1)));
      setPlaying(false);
      setCurrentTime(t);
      emitTime(t);
    },
    [setCurrentTime, setPlaying, duration],
  );

  // ── Smooth playhead ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onTime((t) => {
      const x = TRACK_HEADER_W + t * pxPerSec;
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
      if (rulerPlayheadRef.current) rulerPlayheadRef.current.style.transform = `translateX(${t * pxPerSec}px)`;
      const el = scrollRef.current;
      if (el) {
        const timelineX = t * pxPerSec;
        const viewLeft = el.scrollLeft;
        const viewRight = viewLeft + el.clientWidth - TRACK_HEADER_W;
        if (timelineX > viewRight - 60 || timelineX < viewLeft) {
          el.scrollLeft = Math.max(0, timelineX - 120);
        }
      }
    });
    return unsubscribe;
  }, [pxPerSec]);

  // ── Pinch/scroll zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoom((z) => Math.min(8, Math.max(0.1, z + (-e.deltaY * 0.01))));
      } else {
        el.scrollLeft += e.deltaX || e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  const handleCaptionTrackClick = (_e: React.MouseEvent, x: number) => {
    const time = x / pxPerSec;
    const exists = captions.some((c) => c.startTime <= time && c.startTime + c.duration > time);
    if (!exists) addCaption(time);
  };

  const zoomLabel = zoom >= 1 ? `${zoom.toFixed(1)}×` : `${zoom.toFixed(2)}×`;

  return (
    <div className="relative flex shrink-0 flex-col border-t border-edge bg-bg select-none" style={{ height: 220 }}>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col" style={{ minWidth: totalWidth + TRACK_HEADER_W }}>

          {/* ── Ruler ── */}
          <div className="flex h-6 shrink-0 border-b border-edge bg-[#0f0f0f]">
            <div style={{ width: TRACK_HEADER_W }} className="shrink-0 border-r border-edge bg-surface-1" />
            <div className="relative" style={{ width: totalWidth }}>
              <TimelineRuler pxPerSec={pxPerSec} duration={Math.max(duration + 10, 30)} onSeek={seek} />
              {/* Ruler playhead glow */}
              <div
                ref={rulerPlayheadRef}
                className="pointer-events-none absolute top-0 h-full"
                style={{ transform: 'translateX(0px)', width: 1, background: 'rgba(255,255,255,0.5)' }}
              />
            </div>
          </div>

          {/* ── Tracks ── */}
          <div className="relative flex flex-col">
            <VideoTrack trackIndex={0} clips={videoClips} pxPerSec={pxPerSec} totalWidth={totalWidth} onSeek={seek} />
            <AudioTrack trackIndex={1} clips={audioClips} pxPerSec={pxPerSec} totalWidth={totalWidth} onSeek={seek} />
            <CaptionTrack
              captions={captions}
              pxPerSec={pxPerSec}
              totalWidth={totalWidth}
              onTrackClick={handleCaptionTrackClick}
            />

            {/* ── Playhead — glowing line ── */}
            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-0"
              style={{ transform: `translateX(${TRACK_HEADER_W}px)` }}
            >
              {/* Diamond head */}
              <div
                className="absolute -top-px -translate-x-1/2"
                style={{
                  width: 10, height: 10,
                  background: '#fff',
                  borderRadius: 2,
                  transform: 'translateX(-50%) rotate(45deg)',
                  boxShadow: '0 0 6px rgba(255,255,255,0.6)',
                }}
              />
              {/* Glow line */}
              <div
                className="absolute top-2 bottom-0 left-0"
                style={{
                  width: 1,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 100%)',
                  boxShadow: '0 0 4px rgba(255,255,255,0.4)',
                }}
              />
            </div>
          </div>

          {/* ── Project waveform strip ── */}
          <WaveformStrip
            clips={clips}
            mediaItems={mediaItems}
            pxPerSec={pxPerSec}
            totalWidth={totalWidth}
          />
        </div>
      </div>

      {/* ── Empty state ── */}
      {clips.length === 0 && captions.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
          <p className="text-xs text-ink-3/60">
            Click a clip in the media panel to add it · Pinch or Ctrl+scroll to zoom
          </p>
        </div>
      )}

      {/* ── Zoom chip ── */}
      <div className="absolute bottom-1.5 right-3 flex items-center gap-1">
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z / 1.4))}
          className="flex h-5 w-5 items-center justify-center rounded text-ink-3 hover:text-ink-2 transition-colors"
        >
          <ZoomOut size={11} />
        </button>
        <div className="flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5">
          <span className="font-mono text-[10px] text-ink-3 tabular-nums">{zoomLabel}</span>
        </div>
        <button
          onClick={() => setZoom((z) => Math.min(8, z * 1.4))}
          className="flex h-5 w-5 items-center justify-center rounded text-ink-3 hover:text-ink-2 transition-colors"
        >
          <ZoomIn size={11} />
        </button>
      </div>
    </div>
  );
}
