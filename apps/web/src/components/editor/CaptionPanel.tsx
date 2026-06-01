'use client';
import { useState } from 'react';
import { Captions, Sparkles, Trash2, Plus, AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';
import type { CaptionPosition, CaptionStyle } from '@/types/editor';

const FONT_SIZES = [14, 18, 22, 28, 36, 48];
const POSITION_OPTIONS: { value: CaptionPosition; icon: React.ReactNode; label: string }[] = [
  { value: 'top', icon: <AlignLeft size={13} />, label: 'Top' },
  { value: 'middle', icon: <AlignCenter size={13} />, label: 'Middle' },
  { value: 'bottom', icon: <AlignRight size={13} />, label: 'Bottom' },
];

export function CaptionPanel() {
  const captions = useEditorStore((s) => s.captions);
  const selectedCaptionId = useEditorStore((s) => s.selectedCaptionId);
  const addCaption = useEditorStore((s) => s.addCaption);
  const updateCaption = useEditorStore((s) => s.updateCaption);
  const removeCaption = useEditorStore((s) => s.removeCaption);
  const selectCaption = useEditorStore((s) => s.selectCaption);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const captionsGenerating = useEditorStore((s) => s.captionsGenerating);
  const setCaptionsGenerating = useEditorStore((s) => s.setCaptionsGenerating);
  const mediaItems = useEditorStore((s) => s.mediaItems);

  const selected = captions.find((c) => c.id === selectedCaptionId);

  const handleAutoCaption = () => {
    if (!mediaItems.length) return;
    setCaptionsGenerating(true);
    // Stub: simulate auto-caption generation
    setTimeout(() => {
      const fakeLines = [
        'Welcome to this video.',
        'Today we are going to explore',
        'some really interesting content.',
        'Stay tuned for more!',
      ];
      const segDur = Math.max(2, duration / fakeLines.length);
      fakeLines.forEach((text, i) => {
        addCaption(i * segDur, text);
      });
      setCaptionsGenerating(false);
    }, 1800);
  };

  const updateStyle = (updates: Partial<CaptionStyle>) => {
    if (!selected) return;
    updateCaption(selected.id, { style: { ...selected.style, ...updates } });
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Auto-caption */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-ink-2" strokeWidth={1.75} />
            <p className="text-xs font-medium text-ink-1">Auto Captions</p>
            <Badge variant="outline">AI</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={captionsGenerating}
            disabled={!mediaItems.length || captionsGenerating}
            onClick={handleAutoCaption}
          >
            Generate
          </Button>
        </div>
        <p className="mt-1.5 text-2xs text-ink-3 leading-relaxed">
          Uses Whisper speech recognition to transcribe your video.
          {!mediaItems.length && ' Import a video first.'}
        </p>
      </div>

      {/* Add manually */}
      <button
        onClick={() => addCaption(currentTime, 'Type your text here')}
        className="flex items-center gap-2 rounded-lg border border-dashed border-edge px-3 py-2.5 text-xs text-ink-3 hover:border-edge-strong hover:text-ink-2 transition-colors"
      >
        <Plus size={13} />
        Add caption at playhead
      </button>

      {/* Caption list */}
      {captions.length > 0 && (
        <div className="rounded-lg bg-surface-2 p-2 space-y-0.5 max-h-40 overflow-y-auto">
          {captions
            .slice()
            .sort((a, b) => a.startTime - b.startTime)
            .map((cap) => (
              <CaptionRow
                key={cap.id}
                caption={cap}
                selected={selectedCaptionId === cap.id}
                onSelect={() => selectCaption(cap.id)}
                onRemove={() => removeCaption(cap.id)}
              />
            ))}
        </div>
      )}

      {/* Style editor */}
      {selected && (
        <>
          {/* Text editor */}
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 text-2xs font-medium uppercase tracking-widest text-ink-3">Text</p>
            <textarea
              value={selected.text}
              onChange={(e) => updateCaption(selected.id, { text: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-md bg-surface-3 px-2.5 py-2 text-sm text-ink-1 outline-none placeholder:text-ink-3 border border-edge focus:border-edge-strong"
              placeholder="Caption text…"
            />
          </div>

          {/* Style controls */}
          <div className="rounded-lg bg-surface-2 p-3 space-y-3">
            <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Style</p>

            {/* Font size */}
            <div>
              <p className="mb-1.5 text-2xs text-ink-3">Font size</p>
              <div className="flex gap-1 flex-wrap">
                {FONT_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStyle({ fontSize: s })}
                    className={cn(
                      'rounded px-2 py-1 text-2xs transition-colors',
                      selected.style.fontSize === s
                        ? 'bg-surface-4 text-ink-1'
                        : 'text-ink-3 hover:text-ink-2',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Bold / Italic */}
            <div className="flex items-center gap-3">
              <StyleToggle
                label="Bold"
                active={selected.style.bold}
                onToggle={() => updateStyle({ bold: !selected.style.bold })}
              />
              <StyleToggle
                label="Italic"
                active={selected.style.italic}
                onToggle={() => updateStyle({ italic: !selected.style.italic })}
              />
            </div>

            {/* Position */}
            <div>
              <p className="mb-1.5 text-2xs text-ink-3">Position</p>
              <div className="flex gap-1">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStyle({ position: opt.value })}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-2xs transition-colors',
                      selected.style.position === opt.value
                        ? 'bg-surface-4 text-ink-1'
                        : 'bg-surface-3 text-ink-3 hover:text-ink-2',
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-2">Background</p>
              <Toggle
                checked={selected.style.background}
                onChange={(v) => updateStyle({ background: v })}
              />
            </div>

            {selected.style.background && (
              <div className="flex items-center gap-3">
                <p className="text-2xs text-ink-3 w-16">Opacity</p>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selected.style.backgroundOpacity}
                  onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                  className="flex-1 accent-ink-2 cursor-pointer"
                />
                <span className="text-2xs text-ink-3 w-8 text-right">
                  {Math.round(selected.style.backgroundOpacity * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Caption duration */}
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Duration</p>
              <span className="text-2xs text-ink-2">{selected.duration.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={15}
              step={0.1}
              value={selected.duration}
              onChange={(e) => updateCaption(selected.id, { duration: parseFloat(e.target.value) })}
              className="w-full accent-ink-2 cursor-pointer"
            />
          </div>

          {/* Delete */}
          <button
            onClick={() => removeCaption(selected.id)}
            className="flex items-center gap-2 w-full rounded-lg border border-edge py-2 px-3 text-xs text-ink-3 hover:border-red-400/50 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Delete caption
          </button>
        </>
      )}

      {captions.length === 0 && !selected && (
        <div className="rounded-lg border border-dashed border-edge p-4 text-center">
          <Captions size={20} className="text-ink-3 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-xs text-ink-3">No captions yet</p>
          <p className="text-2xs text-ink-3 mt-0.5">Generate with AI or click on the CC track</p>
        </div>
      )}
    </div>
  );
}

function CaptionRow({
  caption,
  selected,
  onSelect,
  onRemove,
}: {
  caption: { id: string; text: string; startTime: number };
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        selected ? 'bg-surface-3' : 'hover:bg-surface-3',
      )}
    >
      <span className="w-8 shrink-0 text-2xs text-ink-3 tabular-nums">
        {Math.floor(caption.startTime / 60)}:{String(Math.floor(caption.startTime % 60)).padStart(2, '0')}
      </span>
      <span className="flex-1 truncate text-xs text-ink-1">{caption.text}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-400 transition-opacity"
      >
        <Trash2 size={11} />
      </button>
    </button>
  );
}

function StyleToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-surface-4 text-ink-1' : 'bg-surface-3 text-ink-3 hover:text-ink-2',
        label === 'Italic' && 'italic',
        label === 'Bold' && 'font-bold',
      )}
    >
      {label}
    </button>
  );
}
