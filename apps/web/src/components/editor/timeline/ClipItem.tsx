'use client';
import { useRef, useState } from 'react';
import { cn, clamp } from '@/lib/utils';
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

  const effectiveDur = clipEffectiveDuration(clip);
  const left = clip.startTime * pxPerSec;
  const width = Math.max(4, effectiveDur * pxPerSec);

  // Drag state for moving the clip
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  // Trim handle drag state
  const trimDragRef = useRef<{
    edge: 'in' | 'out';
    startX: number;
    startTrimIn: number;
    startTrimOut: number;
  } | null>(null);

  const handleClipMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.edge) return;
    e.stopPropagation();
    selectClip(clip.id);

    dragRef.current = { startX: e.clientX, startTime: clip.startTime };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (me.clientX - dragRef.current.startX) / pxPerSec;
      updateClip(clip.id, { startTime: clamp(dragRef.current.startTime + delta, 0, 9999) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTrimMouseDown = (edge: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    trimDragRef.current = {
      edge,
      startX: e.clientX,
      startTrimIn: clip.trimIn,
      startTrimOut: clip.trimOut,
    };

    const onMove = (me: MouseEvent) => {
      if (!trimDragRef.current) return;
      const delta = (me.clientX - trimDragRef.current.startX) / pxPerSec;
      if (edge === 'in') {
        const newTrimIn = clamp(
          trimDragRef.current.startTrimIn + delta,
          0,
          clip.duration - clip.trimOut - 0.1,
        );
        const startTimeDelta = newTrimIn - clip.trimIn;
        updateClip(clip.id, {
          trimIn: newTrimIn,
          startTime: clamp(clip.startTime + startTimeDelta, 0, 9999),
        });
      } else {
        const newTrimOut = clamp(
          trimDragRef.current.startTrimOut - delta,
          0,
          clip.duration - clip.trimIn - 0.1,
        );
        updateClip(clip.id, { trimOut: newTrimOut });
      }
    };

    const onUp = () => {
      trimDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={handleClipMouseDown}
      className={cn(
        'clip-item absolute top-1 bottom-1 overflow-hidden rounded-md cursor-grab active:cursor-grabbing select-none',
        clip.type === 'video'
          ? 'bg-gradient-to-b from-surface-3 to-surface-2 border border-edge'
          : 'bg-gradient-to-b from-[#202828] to-[#1A2222] border border-[#2A3636]',
        isSelected && 'selected',
      )}
      style={{ left, width }}
    >
      {/* Trim handle — left */}
      <div
        data-edge="in"
        onMouseDown={(e) => handleTrimMouseDown('in', e)}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 flex items-center justify-center group/trim"
      >
        <div className="w-0.5 h-4 rounded-full bg-ink-3 opacity-0 group-hover/trim:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center px-3">
        {clip.type === 'audio' ? (
          <AudioWaveform width={width} />
        ) : (
          <p className="truncate text-2xs font-medium text-ink-2 pointer-events-none">{clip.name}</p>
        )}
      </div>

      {/* Trim handle — right */}
      <div
        data-edge="out"
        onMouseDown={(e) => handleTrimMouseDown('out', e)}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 flex items-center justify-center group/trim"
      >
        <div className="w-0.5 h-4 rounded-full bg-ink-3 opacity-0 group-hover/trim:opacity-100 transition-opacity" />
      </div>

      {/* Speed badge */}
      {clip.speed !== 1 && (
        <div className="absolute right-2 top-1 rounded bg-surface-4 px-1 py-px text-2xs text-ink-2">
          {clip.speed}×
        </div>
      )}
    </div>
  );
}

function AudioWaveform({ width }: { width: number }) {
  const bars = Math.max(4, Math.floor(width / 6));
  return (
    <div className="flex h-6 items-end gap-px overflow-hidden">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 20 + Math.sin(i * 0.8) * 10 + Math.cos(i * 1.3) * 6;
        return (
          <div
            key={i}
            className="w-[2px] shrink-0 rounded-sm bg-ink-3 opacity-70"
            style={{ height: `${Math.abs(h)}%` }}
          />
        );
      })}
    </div>
  );
}
