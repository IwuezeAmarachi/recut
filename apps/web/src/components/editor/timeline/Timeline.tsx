'use client';
import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { TimelineRuler } from './TimelineRuler';
import { VideoTrack, AudioTrack } from './TimelineTrack';

const TRACK_HEADER_W = 48;
const BASE_PX_PER_SEC = 100;

export function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const clips = useEditorStore((s) => s.clips);
  const duration = useEditorStore((s) => s.duration);
  const currentTime = useEditorStore((s) => s.currentTime);
  const zoom = useEditorStore((s) => s.zoom);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  const pxPerSec = zoom * BASE_PX_PER_SEC;
  const totalWidth = Math.max(duration * pxPerSec + 200, 800);

  const videoClips = clips.filter((c) => c.trackIndex === 0);
  const audioClips = clips.filter((c) => c.trackIndex === 1);

  const seek = useCallback(
    (time: number) => {
      setPlaying(false);
      setCurrentTime(Math.max(0, Math.min(time, duration)));
    },
    [setCurrentTime, setPlaying, duration],
  );

  const playheadLeft = currentTime * pxPerSec;

  // Auto-scroll playhead into view during playback
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth - TRACK_HEADER_W;
    if (playheadLeft > viewRight - 40 || playheadLeft < viewLeft) {
      el.scrollLeft = Math.max(0, playheadLeft - 100);
    }
  }, [playheadLeft]);

  return (
    <div className="relative flex h-[200px] shrink-0 flex-col border-t border-edge bg-bg select-none">
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-x-auto overflow-y-hidden"
      >
        <div className="flex flex-col" style={{ minWidth: totalWidth + TRACK_HEADER_W }}>
          {/* Ruler row */}
          <div className="flex h-7 shrink-0 border-b border-edge bg-surface-1">
            {/* Spacer matching track header */}
            <div style={{ width: TRACK_HEADER_W }} className="shrink-0 border-r border-edge bg-surface-1" />
            <div className="relative overflow-hidden px-0" style={{ width: totalWidth }}>
              <TimelineRuler pxPerSec={pxPerSec} duration={Math.max(duration + 10, 30)} onSeek={seek} />
              {/* Playhead marker on ruler */}
              <div
                className="playhead-line absolute top-0 w-px bg-ink-1 opacity-80"
                style={{ left: playheadLeft, height: '100%' }}
              />
            </div>
          </div>

          {/* Tracks area with playhead */}
          <div className="relative flex flex-col">
            <VideoTrack
              trackIndex={0}
              clips={videoClips}
              pxPerSec={pxPerSec}
              totalWidth={totalWidth}
              onSeek={seek}
            />
            <AudioTrack
              trackIndex={1}
              clips={audioClips}
              pxPerSec={pxPerSec}
              totalWidth={totalWidth}
              onSeek={seek}
            />

            {/* Playhead vertical line over tracks */}
            <div
              className="playhead-line pointer-events-none absolute top-0 bottom-0 z-20"
              style={{ left: TRACK_HEADER_W + playheadLeft }}
            >
              {/* Head triangle */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink-1" style={{ borderTopWidth: 6 }} />
              <div className="w-px h-full bg-ink-1 opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {clips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-ink-3">Click a clip in the media panel to add it to the timeline</p>
        </div>
      )}
    </div>
  );
}
