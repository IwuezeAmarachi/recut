'use client';
import { useRef, useState, useEffect } from 'react';
import { MousePointer2, Scissors, SplitSquareHorizontal, Crop, Gauge, Undo2, Redo2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEditorStore } from '@/store/editorStore';
import type { Tool } from '@/types/editor';

const tools: { id: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'select',  label: 'Select',           icon: <MousePointer2 size={15} strokeWidth={1.75} />,      shortcut: 'V' },
  { id: 'cut',     label: 'Cut',              icon: <Scissors size={15} strokeWidth={1.75} />,            shortcut: 'C' },
  { id: 'split',   label: 'Split at playhead',icon: <SplitSquareHorizontal size={15} strokeWidth={1.75}/>,shortcut: 'X' },
  { id: 'trim',    label: 'Trim',             icon: <Crop size={15} strokeWidth={1.75} />,                shortcut: 'T' },
];

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function Toolbar() {
  const activeTool      = useEditorStore((s) => s.activeTool);
  const setActiveTool   = useEditorStore((s) => s.setActiveTool);
  const zoom            = useEditorStore((s) => s.zoom);
  const setZoom         = useEditorStore((s) => s.setZoom);
  const selectedClipId  = useEditorStore((s) => s.selectedClipId);
  const currentTime     = useEditorStore((s) => s.currentTime);
  const splitClipAtTime = useEditorStore((s) => s.splitClipAtTime);
  const clips           = useEditorStore((s) => s.clips);
  const updateClip      = useEditorStore((s) => s.updateClip);

  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const currentSpeed = selectedClip?.speed ?? 1;

  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);

  const handleToolClick = (tool: Tool) => {
    if (tool === 'split' && selectedClipId) splitClipAtTime(selectedClipId, currentTime);
    else setActiveTool(tool);
  };

  const handleSpeedSelect = (speed: number) => {
    if (selectedClipId) updateClip(selectedClipId, { speed });
    setSpeedOpen(false);
  };

  useEffect(() => {
    if (!speedOpen) return;
    const handler = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) setSpeedOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [speedOpen]);

  return (
    <div className="relative flex h-12 shrink-0 items-center border-t border-edge bg-surface-1 px-4">

      {/* Left — undo/redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip content={<span>Undo <Kbd>⌘Z</Kbd></span>}>
          <IconBtn><Undo2 size={14} strokeWidth={1.75} /></IconBtn>
        </Tooltip>
        <Tooltip content={<span>Redo <Kbd>⌘⇧Z</Kbd></span>}>
          <IconBtn><Redo2 size={14} strokeWidth={1.75} /></IconBtn>
        </Tooltip>
      </div>

      {/* Center — tool pill */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-2xl bg-surface-2 px-1.5 py-1 shadow-pill">
        {tools.map((tool) => (
          <Tooltip key={tool.id} content={<span>{tool.label} <Kbd>{tool.shortcut}</Kbd></span>} side="top">
            <button
              onClick={() => handleToolClick(tool.id)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150',
                activeTool === tool.id && tool.id !== 'split'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1',
              )}
            >
              {tool.icon}
            </button>
          </Tooltip>
        ))}

        <div className="mx-1 h-4 w-px bg-edge-strong" />

        {/* Speed */}
        <div ref={speedRef} className="relative">
          <Tooltip content="Speed" side="top">
            <button
              onClick={() => setSpeedOpen((o) => !o)}
              disabled={!selectedClipId}
              className={cn(
                'flex h-8 items-center gap-1 rounded-xl px-2.5 text-2xs font-medium transition-all',
                selectedClipId ? 'text-ink-2 hover:bg-surface-3 hover:text-ink-1' : 'opacity-30 cursor-not-allowed',
                currentSpeed !== 1 && 'text-accent-orange',
              )}
            >
              <Gauge size={13} strokeWidth={1.75} />
              <span className="tabular-nums">{currentSpeed}×</span>
            </button>
          </Tooltip>

          {speedOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 animate-slide-up rounded-2xl bg-surface-2 p-1.5 shadow-float min-w-[100px]">
              {SPEED_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedSelect(s)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-surface-3',
                    s === currentSpeed ? 'text-accent font-semibold' : 'text-ink-2',
                  )}
                >
                  <span>{s}×</span>
                  {s === 1 && <span className="text-2xs text-ink-3">Normal</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — zoom */}
      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip content="Zoom out"><IconBtn onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}><ZoomOut size={13} /></IconBtn></Tooltip>
        <span className="w-10 text-center text-2xs text-ink-2 tabular-nums font-medium">{Math.round(zoom * 100)}%</span>
        <Tooltip content="Zoom in"><IconBtn onClick={() => setZoom(Math.min(8, zoom + 0.25))}><ZoomIn size={13} /></IconBtn></Tooltip>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink-1 transition-colors"
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded bg-surface-4 px-1 text-2xs text-ink-3">{children}</kbd>;
}
