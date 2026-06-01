'use client';
import { useRef, useState } from 'react';
import { cn, clamp, formatDuration } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import type { Clip } from '@/types/editor';

interface ClipItemProps {
  clip: Clip;
  pxPerSec: number;
  isSelected: boolean;
}

export function ClipItem({ clip, pxPerSec, isSelected }: ClipItemProps) {
  const selectClip = useEditorStore((s) => s.selectClip);
  const updateClip = useEditorStore((s) => s.updateClip);

  const [trimming, setTrimming] = useState<{ edge: 'in' | 'out'; dur: number } | null>(null);

  const effectiveDur = clipEffectiveDuration(clip);
  const left = clip.startTime * pxPerSec;
  const width = Math.max(8, effectiveDur * pxPerSec);

  const isDraggingRef = useRef(false);

  // ── Move clip (drag body) ───────────────────────────────────────────────────
  const handleBodyMouseDown = (e: React.MouseEvent) => {
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
      onClick={handleClick}
      className={cn(
        'clip-item absolute top-1.5 bottom-1.5 rounded-md select-none',
        'cursor-grab active:cursor-grabbing',
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
      <div className="absolute inset-0 flex items-center overflow-hidden px-3.5">
        {clip.type === 'audio' ? (
          <AudioWaveform width={width} />
        ) : (
          <p className="truncate text-2xs font-medium text-ink-2 pointer-events-none leading-none">
            {clip.name}
          </p>
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
}

function AudioWaveform({ width }: { width: number }) {
  const bars = Math.max(4, Math.floor((width - 8) / 5));
  return (
    <div className="flex h-6 items-center gap-px overflow-hidden w-full">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 30 + Math.abs(Math.sin(i * 0.9 + 1) * 40 + Math.cos(i * 1.7) * 20);
        return (
          <div
            key={i}
            className="w-[2px] shrink-0 rounded-sm bg-ink-3/70"
            style={{ height: `${Math.min(100, h)}%` }}
          />
        );
      })}
    </div>
  );
}
