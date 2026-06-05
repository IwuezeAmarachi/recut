'use client';
import { memo, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';
import { cn, clamp, formatDuration } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import type { Clip } from '@/types/editor';

// ── Real waveform renderer ───────────────────────────────────────────────────
function Waveform({
  peaks,
  clipDuration,
  trimIn,
  trimOut,
  color,
}: {
  peaks: number[];
  clipDuration: number;
  trimIn: number;
  trimOut: number;
  color: string;
}) {
  if (!peaks.length) return null;
  const startFrac = clipDuration > 0 ? trimIn / clipDuration : 0;
  const endFrac = clipDuration > 0 ? (clipDuration - trimOut) / clipDuration : 1;
  const startIdx = Math.floor(startFrac * peaks.length);
  const endIdx = Math.ceil(endFrac * peaks.length);
  const visible = peaks.slice(startIdx, endIdx);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${visible.length} 2`}
    >
      {visible.map((amp, i) => {
        const h = Math.max(0.04, amp);
        return (
          <rect
            key={i}
            x={i}
            y={1 - h}
            width={0.7}
            height={h * 2}
            fill={color}
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

interface ClipItemProps {
  clip: Clip;
  pxPerSec: number;
  isSelected: boolean;
}

export const ClipItem = memo(function ClipItem({ clip, pxPerSec, isSelected }: ClipItemProps) {
  const selectClip = useEditorStore((s) => s.selectClip);
  const updateClip = useEditorStore((s) => s.updateClip);
  const splitClipAtTime = useEditorStore((s) => s.splitClipAtTime);
  const activeTool = useEditorStore((s) => s.activeTool);
  const mediaItem = useEditorStore((s) => s.mediaItems.find((m) => m.id === clip.mediaId));

  const [trimming, setTrimming] = useState<{ edge: 'in' | 'out'; dur: number } | null>(null);
  const [cutPreviewX, setCutPreviewX] = useState<number | null>(null);

  const effectiveDur = clipEffectiveDuration(clip);
  const left = clip.startTime * pxPerSec;
  const width = Math.max(8, effectiveDur * pxPerSec);

  const isDraggingRef = useRef(false);

  const isCutTool = activeTool === 'cut';

  // ── Cut tool — click splits the clip ───────────────────────────────────────
  const handleCutClick = (e: React.MouseEvent) => {
    if (!isCutTool) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const splitTime = clip.startTime + xFrac * effectiveDur;
    splitClipAtTime(clip.id, splitTime);
  };

  // ── Move clip (drag body) ───────────────────────────────────────────────────
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if (isCutTool) return; // cut tool uses click, not drag
    if ((e.currentTarget as HTMLElement).dataset.handle) return;
    e.preventDefault();
    e.stopPropagation();

    selectClip(clip.id);
    isDraggingRef.current = false;

    const startX = e.clientX;
    const startTime = clip.startTime;

    const onMove = (me: MouseEvent) => {
      isDraggingRef.current = true;
      const delta = (me.clientX - startX) / pxPerSec;
      updateClip(clip.id, { startTime: clamp(startTime + delta, 0, 9999) });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Prevent click propagation to the track (which would deselect)
  const handleClick = (e: React.MouseEvent) => e.stopPropagation();

  // ── Trim handles ────────────────────────────────────────────────────────────
  const handleTrimMouseDown = (edge: 'in' | 'out', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startTrimIn = clip.trimIn;
    const startTrimOut = clip.trimOut;
    const startStartTime = clip.startTime;

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - startX) / pxPerSec;

      if (edge === 'in') {
        const newTrimIn = clamp(startTrimIn + delta, 0, clip.duration - startTrimOut - 0.1);
        const timeDelta = newTrimIn - startTrimIn;
        const newDur = (clip.duration - newTrimIn - startTrimOut) / clip.speed;
        setTrimming({ edge: 'in', dur: newDur });
        updateClip(clip.id, {
          trimIn: newTrimIn,
          startTime: clamp(startStartTime + timeDelta, 0, 9999),
        });
      } else {
        const newTrimOut = clamp(startTrimOut - delta, 0, clip.duration - startTrimIn - 0.1);
        const newDur = (clip.duration - startTrimIn - newTrimOut) / clip.speed;
        setTrimming({ edge: 'out', dur: newDur });
        updateClip(clip.id, { trimOut: newTrimOut });
      }
    };

    const onUp = () => {
      setTrimming(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={handleBodyMouseDown}
      onClick={isCutTool ? handleCutClick : handleClick}
      onMouseMove={isCutTool ? (e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setCutPreviewX(e.clientX - rect.left);
      } : undefined}
      onMouseLeave={isCutTool ? () => setCutPreviewX(null) : undefined}
      className={cn(
        'clip-item absolute top-1.5 bottom-1.5 rounded-md select-none',
        isCutTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
        clip.type === 'video'
          ? 'bg-surface-3 border border-edge'
          : 'bg-[#1C2626] border border-[#2A3636]',
        isSelected && 'selected ring-1 ring-ink-1',
      )}
      style={{ left, width }}
    >
      {/* ── Left trim handle ───────────────────────────────────────────── */}
      <div
        data-handle="in"
        onMouseDown={(e) => handleTrimMouseDown('in', e)}
        className="absolute left-0 top-0 bottom-0 w-3 z-10 flex items-center justify-center cursor-ew-resize hover:bg-white/10 rounded-l-md transition-colors"
      >
        <div className="h-5 w-0.5 rounded-full bg-ink-3 group-hover:bg-ink-1" />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden">
        {mediaItem?.waveformPeaks ? (
          <Waveform
            peaks={mediaItem.waveformPeaks}
            clipDuration={clip.duration}
            trimIn={clip.trimIn}
            trimOut={clip.trimOut}
            color={clip.type === 'video' ? '#6B7280' : '#2DD4BF'}
          />
        ) : (
          <FallbackBars type={clip.type} width={width} />
        )}
        {/* Clip name pinned top-left */}
        {width > 60 && (
          <span className="absolute left-3 top-1 text-2xs font-medium text-ink-2/80 pointer-events-none leading-none truncate max-w-[calc(100%-24px)]">
            {clip.name}
          </span>
        )}
      </div>

      {/* ── Speed badge ─────────────────────────────────────────────────── */}
      {clip.speed !== 1 && width > 50 && (
        <div className="absolute right-4 top-1 rounded bg-surface-4/80 px-1 py-px text-2xs font-medium text-ink-1 backdrop-blur-sm">
          {clip.speed}×
        </div>
      )}

      {/* ── Trim duration tooltip ──────────────────────────────────────── */}
      {trimming && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-4 px-1.5 py-0.5 text-2xs text-ink-1 shadow">
          {formatDuration(trimming.dur)}
        </div>
      )}

      {/* ── Cut preview line ───────────────────────────────────────────── */}
      {isCutTool && cutPreviewX !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 flex flex-col items-center"
          style={{ left: cutPreviewX }}
        >
          <Scissors size={9} className="absolute top-1 -translate-x-1/2 text-white/80" />
          <div className="h-full w-px bg-white/80" />
        </div>
      )}

      {/* ── Right trim handle ──────────────────────────────────────────── */}
      <div
        data-handle="out"
        onMouseDown={(e) => handleTrimMouseDown('out', e)}
        className="absolute right-0 top-0 bottom-0 w-3 z-10 flex items-center justify-center cursor-ew-resize hover:bg-white/10 rounded-r-md transition-colors"
      >
        <div className="h-5 w-0.5 rounded-full bg-ink-3 group-hover:bg-ink-1" />
      </div>
    </div>
  );
});

function FallbackBars({ type, width }: { type: 'video' | 'audio'; width: number }) {
  const bars = Math.max(4, Math.floor((width - 8) / 5));
  const color = type === 'audio' ? 'bg-teal-400/40' : 'bg-ink-3/30';
  return (
    <div className="absolute inset-0 flex items-center gap-px px-3.5">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.9 + 1) * 30 + Math.cos(i * 1.7) * 15);
        return (
          <div
            key={i}
            className={`w-[2px] shrink-0 rounded-sm ${color}`}
            style={{ height: `${Math.min(80, h)}%` }}
          />
        );
      })}
    </div>
  );
}
