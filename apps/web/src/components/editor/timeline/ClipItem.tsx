'use client';
import { memo, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';
import { cn, clamp, formatDuration } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { clipEffectiveDuration } from '@/types/editor';
import type { Clip } from '@/types/editor';

// ── Waveform bars — centered, CapCut style ────────────────────────────────────
function Waveform({
  peaks, clipDuration, trimIn, trimOut, isAudio,
}: {
  peaks: number[]; clipDuration: number; trimIn: number; trimOut: number; isAudio: boolean;
}) {
  if (!peaks.length) return null;
  const startFrac = clipDuration > 0 ? trimIn / clipDuration : 0;
  const endFrac = clipDuration > 0 ? (clipDuration - trimOut) / clipDuration : 1;
  const visible = peaks.slice(
    Math.floor(startFrac * peaks.length),
    Math.ceil(endFrac * peaks.length),
  );

  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${visible.length} 100`}>
      {visible.map((amp, i) => {
        const h = Math.max(4, amp * 80);
        const y = (100 - h) / 2;
        return (
          <rect
            key={i} x={i} y={y} width={1} height={h} rx={0}
            fill={isAudio ? 'rgba(48,209,88,0.7)' : 'rgba(255,255,255,0.6)'}
          />
        );
      })}
    </svg>
  );
}

export const ClipItem = memo(function ClipItem({
  clip, pxPerSec, isSelected,
}: {
  clip: Clip; pxPerSec: number; isSelected: boolean;
}) {
  const selectClip = useEditorStore((s) => s.selectClip);
  const updateClip = useEditorStore((s) => s.updateClip);
  const splitClipAtTime = useEditorStore((s) => s.splitClipAtTime);
  const activeTool = useEditorStore((s) => s.activeTool);
  const mediaItem = useEditorStore((s) => s.mediaItems.find((m) => m.id === clip.mediaId));

  const [trimming, setTrimming] = useState<{ edge: 'in' | 'out'; dur: number } | null>(null);
  const [cutPreviewX, setCutPreviewX] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const effectiveDur = clipEffectiveDuration(clip);
  const left = clip.startTime * pxPerSec;
  const width = Math.max(8, effectiveDur * pxPerSec);
  const isCutTool = activeTool === 'cut';

  const isVideo = clip.type === 'video';

  // ── Cut ──────────────────────────────────────────────────────────────────────
  const handleCutClick = (e: React.MouseEvent) => {
    if (!isCutTool) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    splitClipAtTime(clip.id, clip.startTime + xFrac * effectiveDur);
  };

  // ── Move ─────────────────────────────────────────────────────────────────────
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if (isCutTool) return;
    if ((e.currentTarget as HTMLElement).dataset.handle) return;
    e.preventDefault(); e.stopPropagation();
    selectClip(clip.id);
    isDraggingRef.current = false;
    const startX = e.clientX;
    const startTime = clip.startTime;
    const onMove = (me: MouseEvent) => {
      isDraggingRef.current = true;
      updateClip(clip.id, { startTime: clamp(startTime + (me.clientX - startX) / pxPerSec, 0, 9999) });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = (e: React.MouseEvent) => e.stopPropagation();

  // ── Trim ─────────────────────────────────────────────────────────────────────
  const handleTrimMouseDown = (edge: 'in' | 'out', e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startTrimIn = clip.trimIn;
    const startTrimOut = clip.trimOut;
    const startStartTime = clip.startTime;

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - startX) / pxPerSec;
      if (edge === 'in') {
        const newTrimIn = clamp(startTrimIn + delta, 0, clip.duration - startTrimOut - 0.1);
        setTrimming({ edge: 'in', dur: (clip.duration - newTrimIn - startTrimOut) / clip.speed });
        updateClip(clip.id, { trimIn: newTrimIn, startTime: clamp(startStartTime + (newTrimIn - startTrimIn), 0, 9999) });
      } else {
        const newTrimOut = clamp(startTrimOut - delta, 0, clip.duration - startTrimIn - 0.1);
        setTrimming({ edge: 'out', dur: (clip.duration - startTrimIn - newTrimOut) / clip.speed });
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
        'clip-item absolute top-1.5 bottom-1.5 rounded-xl select-none overflow-hidden',
        isCutTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
        isVideo ? 'border border-[#2a4a78]/80' : 'border border-[#1a4040]/80',
      )}
      style={{
        left,
        width,
        background: isVideo
          ? 'linear-gradient(180deg, #1c3a64 0%, #0e2140 50%, #0a1a33 100%)'
          : 'linear-gradient(180deg, #0e3030 0%, #082424 50%, #051818 100%)',
        boxShadow: isSelected
          ? isVideo
            ? '0 0 0 1.5px rgba(255,255,255,0.6), 0 0 10px rgba(59,130,246,0.25)'
            : '0 0 0 1.5px rgba(255,255,255,0.6), 0 0 10px rgba(48,209,88,0.2)'
          : undefined,
      }}
    >
      {/* Top shine */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/12" />

      {/* Left trim handle */}
      <div
        data-handle="in"
        onMouseDown={(e) => handleTrimMouseDown('in', e)}
        className="absolute left-0 top-0 bottom-0 w-3 z-10 flex items-center justify-center cursor-ew-resize hover:bg-white/10 rounded-l-xl transition-colors"
      >
        <div className="h-6 w-px rounded-full bg-white/25" />
      </div>

      {/* Waveform */}
      <div className="absolute inset-0 overflow-hidden">
        {mediaItem?.waveformPeaks && (
          <Waveform
            peaks={mediaItem.waveformPeaks}
            clipDuration={clip.duration}
            trimIn={clip.trimIn}
            trimOut={clip.trimOut}
            isAudio={clip.type === 'audio'}
          />
        )}
      </div>

      {/* Clip name */}
      {width > 50 && (
        <span className="absolute left-3 bottom-1.5 text-2xs font-medium text-white/55 pointer-events-none leading-none truncate max-w-[calc(100%-24px)]">
          {clip.name}
        </span>
      )}

      {/* Speed badge */}
      {clip.speed !== 1 && width > 50 && (
        <div className="absolute right-4 top-1.5 rounded-md bg-black/50 px-1 py-px text-2xs font-semibold text-white/80 backdrop-blur-sm border border-white/10">
          {clip.speed}×
        </div>
      )}

      {/* Trim tooltip */}
      {trimming && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-4 px-2 py-0.5 text-2xs text-ink-1 shadow-float border border-edge">
          {formatDuration(trimming.dur)}
        </div>
      )}

      {/* Cut preview line */}
      {isCutTool && cutPreviewX !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 flex flex-col items-center"
          style={{ left: cutPreviewX }}
        >
          <Scissors size={9} className="absolute top-1 -translate-x-1/2 text-white/90" />
          <div className="h-full w-px bg-white/90" />
        </div>
      )}

      {/* Right trim handle */}
      <div
        data-handle="out"
        onMouseDown={(e) => handleTrimMouseDown('out', e)}
        className="absolute right-0 top-0 bottom-0 w-3 z-10 flex items-center justify-center cursor-ew-resize hover:bg-white/10 rounded-r-xl transition-colors"
      >
        <div className="h-6 w-px rounded-full bg-white/25" />
      </div>
    </div>
  );
});
