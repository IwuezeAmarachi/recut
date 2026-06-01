'use client';
import { Wand2, Volume2, SlidersHorizontal, Activity } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';

export function AudioPanel() {
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const setNoiseReduction = useEditorStore((s) => s.setNoiseReduction);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  return (
    <div className="space-y-2 p-4">
      {/* AI Noise Reduction — live via Web Audio API */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3">
              <Wand2 size={14} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-ink-1">AI Noise Reduction</p>
                {noiseReductionEnabled ? (
                  <span className="flex items-center gap-1 text-2xs text-ink-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-2 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <Badge variant="outline">Off</Badge>
                )}
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                {noiseReductionEnabled
                  ? 'Active: removing hum, rumble, and power-line noise in real time.'
                  : 'Removes background hum, fan noise, and room echo using audio filters.'}
              </p>
            </div>
          </div>
          <Toggle checked={noiseReductionEnabled} onChange={setNoiseReduction} />
        </div>

        {noiseReductionEnabled && (
          <div className="mt-3 space-y-1.5">
            <FilterPill label="High-pass 80 Hz" desc="Removes low-frequency rumble" />
            <FilterPill label="Notch 50 / 60 Hz" desc="Removes power-line hum" />
            <FilterPill label="Compressor" desc="Normalises dynamics" />
          </div>
        )}
      </div>

      {/* Master volume */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Volume2 size={13} className="text-ink-3" strokeWidth={1.75} />
          <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Master Volume</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={1} step={0.01} value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="flex-1 accent-ink-2 cursor-pointer"
          />
          <span className="w-8 text-right text-2xs text-ink-3 tabular-nums">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Normalize (stub) */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-ink-3" strokeWidth={1.75} />
            <p className="text-xs font-medium text-ink-1">Normalize Audio</p>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
        <p className="mt-1.5 text-2xs text-ink-3">
          Automatically levels volume across all clips.
        </p>
      </div>

      {/* Levels visualizer placeholder */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Activity size={13} className="text-ink-3" strokeWidth={1.75} />
          <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">Audio Levels</p>
        </div>
        <AudioMeter active={noiseReductionEnabled} />
      </div>
    </div>
  );
}

function FilterPill({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface-3 px-2.5 py-1.5">
      <span className="text-2xs font-medium text-ink-2">{label}</span>
      <span className="text-2xs text-ink-3">{desc}</span>
    </div>
  );
}

function AudioMeter({ active }: { active: boolean }) {
  const bars = 18;
  return (
    <div className="flex h-8 items-end gap-0.5">
      {Array.from({ length: bars }).map((_, i) => {
        const base = 20 + Math.sin(i * 0.6) * 15;
        const h = active ? base + Math.random() * 30 : base * 0.4;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-ink-3 opacity-60 transition-all duration-75"
            style={{ height: `${Math.min(100, h)}%` }}
          />
        );
      })}
    </div>
  );
}
