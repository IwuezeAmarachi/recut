'use client';
import { MousePointer2, Scissors, SplitSquareHorizontal, Crop, Gauge, Undo2, Redo2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEditorStore } from '@/store/editorStore';
import type { Tool } from '@/types/editor';

const tools: { id: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer2 size={15} strokeWidth={1.75} />, shortcut: 'V' },
  { id: 'cut', label: 'Cut', icon: <Scissors size={15} strokeWidth={1.75} />, shortcut: 'C' },
  { id: 'split', label: 'Split at playhead', icon: <SplitSquareHorizontal size={15} strokeWidth={1.75} />, shortcut: 'X' },
  { id: 'trim', label: 'Trim', icon: <Crop size={15} strokeWidth={1.75} />, shortcut: 'T' },
];

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const currentTime = useEditorStore((s) => s.currentTime);
  const splitClipAtTime = useEditorStore((s) => s.splitClipAtTime);

  const handleToolClick = (tool: Tool) => {
    if (tool === 'split' && selectedClipId) {
      splitClipAtTime(selectedClipId, currentTime);
    } else {
      setActiveTool(tool);
    }
  };

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-y border-edge bg-surface-1 px-3">
      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => (
          <Tooltip
            key={tool.id}
            content={
              <span className="flex items-center gap-1.5">
                {tool.label}
                <kbd className="rounded bg-surface-4 px-1 text-2xs text-ink-3">{tool.shortcut}</kbd>
              </span>
            }
            side="top"
          >
            <button
              onClick={() => handleToolClick(tool.id)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                activeTool === tool.id && tool.id !== 'split'
                  ? 'bg-ink-1 text-bg'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              )}
            >
              {tool.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      <Separator />

      {/* Speed indicator */}
      <div className="flex items-center gap-1.5 text-ink-3">
        <Gauge size={13} strokeWidth={1.75} />
        <span className="text-2xs">Speed</span>
      </div>

      <Separator />

      {/* Undo / Redo (stubs) */}
      <Tooltip content={<span>Undo <kbd className="ml-1 rounded bg-surface-4 px-1 text-2xs text-ink-3">⌘Z</kbd></span>}>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink-1 transition-colors">
          <Undo2 size={14} strokeWidth={1.75} />
        </button>
      </Tooltip>
      <Tooltip content={<span>Redo <kbd className="ml-1 rounded bg-surface-4 px-1 text-2xs text-ink-3">⌘⇧Z</kbd></span>}>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink-1 transition-colors">
          <Redo2 size={14} strokeWidth={1.75} />
        </button>
      </Tooltip>

      <div className="ml-auto flex items-center gap-2">
        <Separator />
        <span className="text-2xs text-ink-3">Zoom</span>
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-3 hover:text-ink-1 transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <span className="w-10 text-center text-2xs text-ink-2 tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(4, zoom + 0.25))}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-3 hover:text-ink-1 transition-colors"
        >
          <ZoomIn size={13} />
        </button>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-4 w-px bg-edge" />;
}
