'use client';
import { Wand2, Volume2, SlidersHorizontal } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';

export function AudioPanel() {
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const normalizeAudio = useEditorStore((s) => s.normalizeAudio);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const setNoiseReduction = useEditorStore((s) => s.setNoiseReduction);
  const setNormalizeAudio = useEditorStore((s) => s.setNormalizeAudio);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  return (
    <div className="space-y-2 p-4">
      {/* AI Noise Reduction */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3">
              <Wand2 size={14} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-ink-1">Noise Reduction</p>
                {noiseReductionEnabled
                  ? <span className="flex items-center gap-1 text-2xs text-ink-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-2" />Live</span>
                  : <Badge variant="outline">Off</Badge>}
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                Removes hum, rumble, and power-line noise in real time.
                Broadband noise (AC, room) is removed at export via RNNoise.
              </p>
            </div>
          </div>
          <Toggle checked={noiseReductionEnabled} onChange={setNoiseReduction} />
        </div>

        {noiseReductionEnabled && (
          <div className="mt-3 space-y-1">
            <Pill label="High-pass 100 Hz" desc="Removes rumble" />
            <Pill label="Notch 50/60 Hz + harmonics" desc="Removes power-line hum" />
            <Pill label="Low-shelf −8 dB" desc="Reduces low-end mud" />
            <Pill label="Compressor" desc="Suppresses residual noise" />
          </div>
        )}
      </div>

      {/* Normalize Audio */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3">
              <SlidersHorizontal size={13} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-1">Normalize Audio</p>
              <p className="mt-0.5 text-2xs text-ink-3">Levels out loud and quiet passages.</p>
            </div>
          </div>
          <Toggle checked={normalizeAudio} onChange={setNormalizeAudio} />
        </div>
        {normalizeAudio && (
          <div className="mt-2 rounded-md bg-surface-3 px-2.5 py-1.5 text-2xs text-ink-2">
            Active: compressor is evening out volume across all clips.
          </div>
        )}
      </div>

      {/* Master volume */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="mb-2.5 flex items-center gap-2">
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

      {/* Info note about broadband NR */}
      <div className="rounded-lg border border-dashed border-edge p-3 text-center">
        <p className="text-2xs text-ink-3 leading-relaxed">
          Deep noise removal (fan, AC, room ambience) requires RNNoise processing.
          Enable Noise Reduction and it will run automatically at export.
        </p>
      </div>
    </div>
  );
}

function Pill({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface-3 px-2 py-1">
      <span className="text-2xs font-medium text-ink-2">{label}</span>
      <span className="text-2xs text-ink-3">{desc}</span>
    </div>
  );
}
