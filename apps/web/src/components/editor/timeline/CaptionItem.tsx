'use client';
import { useRef } from 'react';
import { cn, clamp } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import type { Caption } from '@/types/editor';

interface CaptionItemProps {
  caption: Caption;
  pxPerSec: number;
  isSelected: boolean;
}

export function CaptionItem({ caption, pxPerSec, isSelected }: CaptionItemProps) {
  const selectCaption = useEditorStore((s) => s.selectCaption);
  const updateCaption = useEditorStore((s) => s.updateCaption);

  const left = caption.startTime * pxPerSec;
  const width = Math.max(40, caption.duration * pxPerSec);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectCaption(caption.id);

    const startX = e.clientX;
    const startTime = caption.startTime;

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - startX) / pxPerSec;
      updateCaption(caption.id, { startTime: clamp(startTime + delta, 0, 9999) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = (e: React.MouseEvent) => e.stopPropagation();

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startDur = caption.duration;

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - startX) / pxPerSec;
      updateCaption(caption.id, { duration: Math.max(0.5, startDur + delta) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        'absolute top-1.5 bottom-1.5 cursor-grab active:cursor-grabbing select-none',
        'rounded-md border text-2xs font-medium overflow-hidden',
        'bg-[#1E1C28] border-[#2E2A3E] text-[#A09ABF]',
        isSelected && 'ring-1 ring-ink-1',
      )}
      style={{ left, width }}
    >
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <span className="truncate pointer-events-none">{caption.text}</span>
      </div>
      {/* Resize right edge */}
      <div
        onMouseDown={handleResizeMouseDown}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
      />
    </div>
  );
}
