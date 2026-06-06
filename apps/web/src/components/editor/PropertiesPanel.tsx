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
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2">
          <span className="text-lg">✂️</span>
        </div>
        <p className="text-xs text-ink-3">Select a clip to edit</p>
      </div>
    );
  }

  const effectiveDur = clipEffectiveDuration(clip);
  const setSpeed = (speed: number) => updateClip(clip.id, { speed: clamp(speed, 0.1, 4) });
  const setTrimIn = (v: number) => updateClip(clip.id, { trimIn: clamp(v, 0, clip.duration - clip.trimOut - 0.1) });
  const setTrimOut = (v: number) => updateClip(clip.id, { trimOut: clamp(v, 0, clip.duration - clip.trimIn - 0.1) });
  const setVolume = (v: number) => updateClip(clip.id, { volume: clamp(v, 0, 2) });

  return (
    <div className="p-4 space-y-3">

      {/* Clip info chip */}
      <div className="rounded-2xl bg-surface-2 px-4 py-3">
        <p className="truncate text-xs font-semibold text-ink-1">{clip.name}</p>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-2xs text-ink-3">{formatDuration(effectiveDur)}</span>
          <span className="h-1 w-1 rounded-full bg-edge-strong" />
          <span className="text-2xs capitalize text-ink-3">{clip.type}</span>
        </div>
      </div>

      {/* Speed */}
      <Card label="Speed">
        <div className="flex items-center gap-3">
          <input
            type="range" min={0.25} max={2} step={0.05} value={clip.speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="flex-1 accent-accent cursor-pointer"
          />
          <span className="w-8 text-right text-2xs font-semibold tabular-nums text-ink-2">{clip.speed.toFixed(2)}×</span>
        </div>
        <div className="mt-2 flex gap-1">
          {[0.5, 1, 1.5, 2].map((p) => (
            <Preset key={p} label={`${p}×`} active={Math.abs(clip.speed - p) < 0.01} onClick={() => setSpeed(p)} />
          ))}
        </div>
      </Card>

      {/* Trim */}
      <Card label="Trim">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="In" value={clip.trimIn.toFixed(2)} onChange={(v) => setTrimIn(parseFloat(v) || 0)} suffix="s" />
          <NumberInput label="Out" value={clip.trimOut.toFixed(2)} onChange={(v) => setTrimOut(parseFloat(v) || 0)} suffix="s" />
        </div>
      </Card>

      {/* Volume */}
      <Card label="Volume">
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={2} step={0.01} value={clip.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: clip.volume > 1 ? '#FF9F0A' : '#0A84FF' }}
          />
          <span className={`w-10 text-right text-2xs font-semibold tabular-nums ${clip.volume > 1 ? 'text-accent-orange' : 'text-ink-2'}`}>
            {Math.round(clip.volume * 100)}%
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {[0, 50, 100, 150, 200].map((pct) => (
            <Preset
              key={pct} label={`${pct}%`}
              active={Math.round(clip.volume * 100) === pct}
              onClick={() => setVolume(pct / 100)}
              warn={pct > 100}
            />
          ))}
        </div>
        {clip.volume > 1 && (
          <p className="mt-2 text-2xs text-accent-orange/80">Boosted — may distort at high levels</p>
        )}
      </Card>

      {/* Position */}
      <Card label="Position">
        <p className="text-xs font-medium text-ink-2">{formatDuration(clip.startTime)}</p>
      </Card>

      {/* Remove */}
      <button
        onClick={() => removeClip(clip.id)}
        className="w-full rounded-2xl border border-edge py-2.5 text-xs font-medium text-ink-3 transition-colors hover:border-red-500/40 hover:text-red-400"
      >
        Remove clip
      </button>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <p className="mb-2.5 text-2xs font-semibold uppercase tracking-widest text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Preset({ label, active, onClick, warn }: { label: string; active: boolean; onClick: () => void; warn?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-1 text-2xs font-medium transition-colors ${
        active
          ? warn ? 'bg-accent-orange/20 text-accent-orange' : 'bg-accent/15 text-accent'
          : 'text-ink-3 hover:bg-surface-3 hover:text-ink-2'
      }`}
    >
      {label}
    </button>
  );
}

function NumberInput({ label, value, onChange, suffix }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-2xs text-ink-3">{label}</p>
      <div className="flex items-center overflow-hidden rounded-xl bg-surface-3 border border-edge focus-within:border-accent/40 transition-colors">
        <input
          type="number" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-ink-1 outline-none"
        />
        {suffix && <span className="pr-2.5 text-2xs text-ink-3">{suffix}</span>}
      </div>
    </div>
  );
}
