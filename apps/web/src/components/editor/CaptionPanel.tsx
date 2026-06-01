'use client';
import { useState, useRef } from 'react';
import { Captions, Sparkles, Trash2, Plus, AlignCenter, AlignLeft, AlignRight, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';
import type { CaptionPosition, CaptionStyle } from '@/types/editor';

const FONT_SIZES = [14, 18, 22, 28, 36];
const POSITION_OPTIONS: { value: CaptionPosition; icon: React.ReactNode; label: string }[] = [
  { value: 'top', icon: <AlignLeft size={12} />, label: 'Top' },
  { value: 'middle', icon: <AlignCenter size={12} />, label: 'Mid' },
  { value: 'bottom', icon: <AlignRight size={12} />, label: 'Bottom' },
];

export function CaptionPanel() {
  const captions = useEditorStore((s) => s.captions);
  const selectedCaptionId = useEditorStore((s) => s.selectedCaptionId);
  const addCaption = useEditorStore((s) => s.addCaption);
  const updateCaption = useEditorStore((s) => s.updateCaption);
  const removeCaption = useEditorStore((s) => s.removeCaption);
  const selectCaption = useEditorStore((s) => s.selectCaption);
  const currentTime = useEditorStore((s) => s.currentTime);
  const captionsGenerating = useEditorStore((s) => s.captionsGenerating);
  const setCaptionsGenerating = useEditorStore((s) => s.setCaptionsGenerating);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const mediaItems = useEditorStore((s) => s.mediaItems);

  const selected = captions.find((c) => c.id === selectedCaptionId);
  const [listenMode, setListenMode] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── Live speech recognition ───────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const rec = new SpeechRecognition() as SpeechRecognition;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let currentId: string | null = null;
    let segmentStart = currentTime;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      if (!transcript) return;

      const store = useEditorStore.getState();
      const t = store.currentTime;

      if (result.isFinal) {
        // Finalise current caption
        if (currentId) {
          store.updateCaption(currentId, { text: transcript, duration: Math.max(1, t - segmentStart) });
          currentId = null;
        } else {
          store.addCaption(segmentStart, transcript);
        }
        segmentStart = t;
      } else {
        // Live preview caption
        if (!currentId) {
          const cap = store.addCaption(segmentStart, transcript);
          currentId = cap.id;
        } else {
          store.updateCaption(currentId, { text: transcript });
        }
      }
    };

    rec.onerror = () => {
      setListenMode(false);
      setPlaying(false);
    };

    rec.onend = () => {
      setListenMode(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListenMode(true);
    setPlaying(true); // Start playing video so speech recognition follows along
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListenMode(false);
    setPlaying(false);
  };

  const updateStyle = (updates: Partial<CaptionStyle>) => {
    if (!selected) return;
    updateCaption(selected.id, { style: { ...selected.style, ...updates } });
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Live speech-to-text */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <div className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
              listenMode ? 'bg-ink-2' : 'bg-surface-3',
            )}>
              {listenMode
                ? <Mic size={13} className="text-bg" strokeWidth={1.75} />
                : <Mic size={13} className="text-ink-2" strokeWidth={1.75} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-ink-1">Auto Captions</p>
                {listenMode && (
                  <span className="flex items-center gap-1 text-2xs text-ink-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-2" />
                    Listening…
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                {listenMode
                  ? 'Video is playing — speak or play audio. Captions are being captured in real time.'
                  : 'Listens to your video as it plays and creates timestamped captions automatically.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {listenMode ? (
            <Button variant="outline" size="sm" className="flex-1" onClick={stopListening}>
              <MicOff size={12} /> Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!mediaItems.length}
              onClick={startListening}
            >
              <Mic size={12} /> Start listening
            </Button>
          )}
        </div>

        {!mediaItems.length && (
          <p className="mt-2 text-2xs text-ink-3">Import a video first.</p>
        )}
      </div>

      {/* Add manually */}
      <button
        onClick={() => addCaption(currentTime, 'New caption')}
        className="flex items-center gap-2 rounded-lg border border-dashed border-edge px-3 py-2.5 text-xs text-ink-3 hover:border-edge-strong hover:text-ink-2 transition-colors"
      >
        <Plus size={13} />
        Add caption at playhead ({Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')})
      </button>

      {/* Caption list */}
      {captions.length > 0 && (
        <div className="rounded-lg bg-surface-2 p-2 space-y-0.5 max-h-36 overflow-y-auto">
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
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 text-2xs font-medium uppercase tracking-widest text-ink-3">Text</p>
            <textarea
              value={selected.text}
              onChange={(e) => updateCaption(selected.id, { text: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-md bg-surface-3 px-2.5 py-2 text-sm text-ink-1 outline-none border border-edge focus:border-edge-strong placeholder:text-ink-3"
              placeholder="Caption text…"
            />
          </div>

          <div className="rounded-lg bg-surface-2 p-3 space-y-3">
            <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Style</p>

            {/* Font size */}
            <div>
              <p className="mb-1.5 text-2xs text-ink-3">Size</p>
              <div className="flex gap-1">
                {FONT_SIZES.map((s) => (
                  <button key={s} onClick={() => updateStyle({ fontSize: s })}
                    className={cn('flex-1 rounded px-1.5 py-1 text-2xs transition-colors',
                      selected.style.fontSize === s ? 'bg-surface-4 text-ink-1' : 'bg-surface-3 text-ink-3 hover:text-ink-2')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Bold / Italic */}
            <div className="flex gap-1">
              <button onClick={() => updateStyle({ bold: !selected.style.bold })}
                className={cn('flex-1 rounded-md py-1.5 text-xs font-bold transition-colors',
                  selected.style.bold ? 'bg-surface-4 text-ink-1' : 'bg-surface-3 text-ink-3 hover:text-ink-2')}>
                Bold
              </button>
              <button onClick={() => updateStyle({ italic: !selected.style.italic })}
                className={cn('flex-1 rounded-md py-1.5 text-xs italic transition-colors',
                  selected.style.italic ? 'bg-surface-4 text-ink-1' : 'bg-surface-3 text-ink-3 hover:text-ink-2')}>
                Italic
              </button>
            </div>

            {/* Position */}
            <div>
              <p className="mb-1.5 text-2xs text-ink-3">Position</p>
              <div className="flex gap-1">
                {POSITION_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => updateStyle({ position: opt.value })}
                    className={cn('flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-2xs transition-colors',
                      selected.style.position === opt.value ? 'bg-surface-4 text-ink-1' : 'bg-surface-3 text-ink-3 hover:text-ink-2')}>
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-2">Background</p>
              <Toggle checked={selected.style.background} onChange={(v) => updateStyle({ background: v })} />
            </div>
            {selected.style.background && (
              <div className="flex items-center gap-2">
                <p className="w-14 text-2xs text-ink-3">Opacity</p>
                <input type="range" min={0.1} max={1} step={0.05} value={selected.style.backgroundOpacity}
                  onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                  className="flex-1 accent-ink-2 cursor-pointer" />
                <span className="w-8 text-right text-2xs text-ink-3">{Math.round(selected.style.backgroundOpacity * 100)}%</span>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="mb-2 flex justify-between">
              <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Duration</p>
              <span className="text-2xs text-ink-2">{selected.duration.toFixed(1)}s</span>
            </div>
            <input type="range" min={0.5} max={15} step={0.1} value={selected.duration}
              onChange={(e) => updateCaption(selected.id, { duration: parseFloat(e.target.value) })}
              className="w-full accent-ink-2 cursor-pointer" />
          </div>

          <button onClick={() => removeCaption(selected.id)}
            className="flex w-full items-center gap-2 rounded-lg border border-edge px-3 py-2 text-xs text-ink-3 hover:border-red-400/50 hover:text-red-400 transition-colors">
            <Trash2 size={12} /> Delete caption
          </button>
        </>
      )}

      {captions.length === 0 && (
        <div className="rounded-lg border border-dashed border-edge p-4 text-center">
          <Captions size={20} className="mx-auto mb-2 text-ink-3" strokeWidth={1.5} />
          <p className="text-xs text-ink-3">No captions yet</p>
          <p className="text-2xs text-ink-3 mt-0.5">Click "Start listening" to auto-generate, or click on the CC track</p>
        </div>
      )}
    </div>
  );
}

function CaptionRow({ caption, selected, onSelect, onRemove }: {
  caption: { id: string; text: string; startTime: number };
  selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  return (
    <button onClick={onSelect}
      className={cn('group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        selected ? 'bg-surface-3' : 'hover:bg-surface-3')}>
      <span className="w-8 shrink-0 text-2xs text-ink-3 tabular-nums">
        {Math.floor(caption.startTime / 60)}:{String(Math.floor(caption.startTime % 60)).padStart(2, '0')}
      </span>
      <span className="flex-1 truncate text-xs text-ink-1">{caption.text}</span>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-400 transition-opacity">
        <Trash2 size={11} />
      </button>
    </button>
  );
}
