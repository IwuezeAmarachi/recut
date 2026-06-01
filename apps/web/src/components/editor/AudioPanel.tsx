'use client';
import { Wand2, Volume2, SlidersHorizontal } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';

export function AudioPanel() {
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const setNoiseReduction = useEditorStore((s) => s.setNoiseReduction);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);

  return (
    <div className="space-y-1 p-4">
      {/* AI Noise Reduction */}
      <div className="rounded-lg bg-surface-2 p-3 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3">
              <Wand2 size={14} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-ink-1">AI Noise Reduction</p>
                <Badge variant="outline">Beta</Badge>
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                Removes background hum, fan noise, and room echo using RNNoise.
              </p>
            </div>
          </div>
          <Toggle checked={noiseReductionEnabled} onChange={setNoiseReduction} />
        </div>

        {noiseReductionEnabled && (
          <div className="mt-3 rounded-md bg-surface-3 px-3 py-2 text-2xs text-ink-3">
            Will be applied at export time via the processing pipeline.
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
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="flex-1 accent-ink-2 cursor-pointer"
          />
          <span className="w-8 text-right text-2xs text-ink-3 tabular-nums">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Audio normalization */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-ink-3" strokeWidth={1.75} />
            <p className="text-xs font-medium text-ink-1">Normalize Audio</p>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
        <p className="mt-2 text-2xs text-ink-3 leading-relaxed">
          Automatically levels volume across all clips.
        </p>
      </div>

      {/* Enhancement note */}
      <div className="mt-4 rounded-lg border border-dashed border-edge p-3 text-center">
        <p className="text-2xs text-ink-3">
          Voice clarity enhancement and advanced audio processing coming in the next release.
        </p>
      </div>
    </div>
  );
}
