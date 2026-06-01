'use client';
import { useEditorStore } from '@/store/editorStore';
import { formatDuration, clamp } from '@/lib/utils';
import { clipEffectiveDuration } from '@/types/editor';

export function PropertiesPanel() {
  const clips = useEditorStore((s) => s.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateClip = useEditorStore((s) => s.updateClip);
  const removeClip = useEditorStore((s) => s.removeClip);

  const clip = clips.find((c) => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
        <p className="text-xs text-ink-3">Select a clip on the timeline</p>
      </div>
    );
  }

  const effectiveDur = clipEffectiveDuration(clip);

  const setSpeed = (speed: number) => updateClip(clip.id, { speed: clamp(speed, 0.1, 4) });
  const setTrimIn = (v: number) => updateClip(clip.id, { trimIn: clamp(v, 0, clip.duration - clip.trimOut - 0.1) });
  const setTrimOut = (v: number) => updateClip(clip.id, { trimOut: clamp(v, 0, clip.duration - clip.trimIn - 0.1) });
  const setVolume = (v: number) => updateClip(clip.id, { volume: clamp(v, 0, 1) });

  return (
    <div className="space-y-1 p-4">
      {/* Clip info */}
      <div className="rounded-lg bg-surface-2 p-3 mb-3">
        <p className="truncate text-xs font-medium text-ink-1">{clip.name}</p>
        <div className="mt-1.5 flex gap-3 text-2xs text-ink-3">
          <span>{formatDuration(effectiveDur)}</span>
          <span className="capitalize">{clip.type}</span>
        </div>
      </div>

      {/* Speed */}
      <Section label="Speed">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={clip.speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="flex-1 accent-ink-2 cursor-pointer"
          />
          <SpeedPresets current={clip.speed} onSelect={setSpeed} />
        </div>
        <p className="mt-1 text-right text-2xs text-ink-3">{clip.speed.toFixed(2)}×</p>
      </Section>

      {/* Trim */}
      <Section label="Trim">
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            label="In"
            value={clip.trimIn.toFixed(2)}
            onChange={(v) => setTrimIn(parseFloat(v) || 0)}
            suffix="s"
          />
          <LabeledInput
            label="Out"
            value={clip.trimOut.toFixed(2)}
            onChange={(v) => setTrimOut(parseFloat(v) || 0)}
            suffix="s"
          />
        </div>
      </Section>

      {/* Volume */}
      <Section label="Volume">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clip.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-ink-2 cursor-pointer"
          />
          <span className="w-8 text-right text-2xs text-ink-3 tabular-nums">
            {Math.round(clip.volume * 100)}%
          </span>
        </div>
      </Section>

      {/* Position */}
      <Section label="Timeline position">
        <p className="text-xs text-ink-2">{formatDuration(clip.startTime)}</p>
      </Section>

      {/* Delete */}
      <div className="pt-2">
        <button
          onClick={() => removeClip(clip.id)}
          className="w-full rounded-lg border border-edge py-2 text-xs text-ink-3 hover:border-red-400/50 hover:text-red-400 transition-colors"
        >
          Remove clip
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <p className="mb-2 text-2xs font-medium uppercase tracking-widest text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function SpeedPresets({ current, onSelect }: { current: number; onSelect: (v: number) => void }) {
  const presets = [0.5, 1, 1.5, 2];
  return (
    <div className="flex gap-0.5">
      {presets.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`rounded px-1 py-0.5 text-2xs transition-colors ${
            Math.abs(current - p) < 0.01
              ? 'bg-surface-4 text-ink-1'
              : 'text-ink-3 hover:text-ink-2'
          }`}
        >
          {p}×
        </button>
      ))}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-2xs text-ink-3">{label}</p>
      <div className="flex items-center overflow-hidden rounded-md bg-surface-3 border border-edge">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-ink-1 outline-none"
        />
        {suffix && <span className="pr-2 text-2xs text-ink-3">{suffix}</span>}
      </div>
    </div>
  );
}
