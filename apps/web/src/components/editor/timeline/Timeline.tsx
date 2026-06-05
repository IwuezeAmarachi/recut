'use client';
import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { TimelineRuler } from './TimelineRuler';
import { VideoTrack, AudioTrack, CaptionTrack } from './TimelineTrack';
import { onTime, emitTime } from '@/lib/timeChannel';

const TRACK_HEADER_W = 48;
const BASE_PX_PER_SEC = 100;

export function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rulerPlayheadRef = useRef<HTMLDivElement>(null);

  const clips = useEditorStore((s) => s.clips);
  const captions = useEditorStore((s) => s.captions);
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
      emitTime(t); // update playhead DOM immediately without waiting for re-render
    },
    [setCurrentTime, setPlaying, duration],
  );

  // ── Smooth playhead via custom event (no React re-render) ──────────────────
  useEffect(() => {
    const unsubscribe = onTime((t) => {
      const x = TRACK_HEADER_W + t * pxPerSec;
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${x}px)`;
      }
      if (rulerPlayheadRef.current) {
        rulerPlayheadRef.current.style.transform = `translateX(${t * pxPerSec}px)`;
      }
      // Auto-scroll to keep playhead visible
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

  // Playhead position — driven entirely by emitTime (seek + RAF), never from Zustand re-render
  const playheadX = TRACK_HEADER_W; // initial; overwritten immediately by onTime effect

  // ── Pinch / scroll — attach once, use functional zoom update to avoid stale closure
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch on trackpad (macOS sends ctrlKey=true) or Ctrl+wheel
        // Use proportional delta so pinch feels smooth
        const delta = -e.deltaY * 0.01;
        setZoom((z) => Math.min(8, Math.max(0.1, z + delta)));
      } else {
        el.scrollLeft += e.deltaX || e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]); // no zoom dep — functional update always sees current state

  const handleCaptionTrackClick = (_e: React.MouseEvent, x: number) => {
    const time = x / pxPerSec;
    const exists = captions.some(
      (c) => c.startTime <= time && c.startTime + c.duration > time,
    );
    if (!exists) addCaption(time);
  };

  return (
    <div className="relative flex h-[210px] shrink-0 flex-col border-t border-edge bg-bg select-none">
      {/* Scrollable area */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col" style={{ minWidth: totalWidth + TRACK_HEADER_W }}>

          {/* Ruler */}
          <div className="flex h-7 shrink-0 border-b border-edge bg-surface-1">
            <div style={{ width: TRACK_HEADER_W }} className="shrink-0 border-r border-edge bg-surface-1" />
            <div className="relative" style={{ width: totalWidth }}>
              <TimelineRuler pxPerSec={pxPerSec} duration={Math.max(duration + 10, 30)} onSeek={seek} />
              {/* Ruler playhead */}
              <div
                ref={rulerPlayheadRef}
                className="pointer-events-none absolute top-0 h-full w-px bg-ink-1/70"
                style={{ transform: `translateX(0px)` }}
              />
            </div>
          </div>

          {/* Tracks */}
          <div className="relative flex flex-col">
            <VideoTrack trackIndex={0} clips={videoClips} pxPerSec={pxPerSec} totalWidth={totalWidth} onSeek={seek} />
            <AudioTrack trackIndex={1} clips={audioClips} pxPerSec={pxPerSec} totalWidth={totalWidth} onSeek={seek} />
            <CaptionTrack
              captions={captions}
              pxPerSec={pxPerSec}
              totalWidth={totalWidth}
              onTrackClick={handleCaptionTrackClick}
            />

            {/* Smooth playhead line over all tracks */}
            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-0"
              style={{ transform: `translateX(${playheadX}px)` }}
            >
              {/* Triangle head */}
              <div
                className="absolute -top-0 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid #EBEBEB',
                }}
              />
              <div className="absolute top-0 bottom-0 left-0 w-px bg-ink-1/90" />
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {clips.length === 0 && captions.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-ink-3">
            Click a clip in the media panel to add it · Pinch or Ctrl+scroll to zoom
          </p>
        </div>
      )}
    </div>
  );
}
