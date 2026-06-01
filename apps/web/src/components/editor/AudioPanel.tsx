'use client';
import { Wand2, Volume2, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';
import { api, BASE } from '@/lib/api';

export function AudioPanel() {
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const normalizeAudio = useEditorStore((s) => s.normalizeAudio);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const mediaItems = useEditorStore((s) => s.mediaItems);
  const projectId = useEditorStore((s) => s.projectId);
  const setNoiseReduction = useEditorStore((s) => s.setNoiseReduction);
  const setNormalizeAudio = useEditorStore((s) => s.setNormalizeAudio);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);
  const setMediaDenoising = useEditorStore((s) => s.setMediaDenoising);
  const setMediaDenoisedUrl = useEditorStore((s) => s.setMediaDenoisedUrl);

  const anyDenoising = mediaItems.some((m) => m.denoising);

  const handleNRToggle = async (enabled: boolean) => {
    setNoiseReduction(enabled);
    if (!enabled) return;

    // Kick off ML denoising for every uploaded media item not yet processed
    for (const item of mediaItems) {
      if (!item.apiId || item.denoisedUrl || item.denoising) continue;
      setMediaDenoising(item.id, true);
      api.media.denoise(projectId, item.apiId)
        .then((res) => setMediaDenoisedUrl(item.id, `${BASE}${res.url}`))
        .catch(() => setMediaDenoising(item.id, false));
    }
  };

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
                  ? anyDenoising
                    ? <span className="flex items-center gap-1 text-2xs text-amber-400"><Loader2 size={10} className="animate-spin" />Processing…</span>
                    : <span className="flex items-center gap-1 text-2xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />Active</span>
                  : <Badge variant="outline">Off</Badge>}
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                Filters hum and rumble while you preview. Background noise
                (fan, AC, room) is removed more deeply at export.
              </p>
            </div>
          </div>
          <Toggle checked={noiseReductionEnabled} onChange={handleNRToggle} />
        </div>

        {noiseReductionEnabled && (
          <div className="mt-3 space-y-1">
            <Pill label="Rumble cut" desc="Removes handling & HVAC sub-bass" />
            <Pill label="Hum removal" desc="50/60 Hz power-line & harmonics" />
            <Pill label="Low-end tame" desc="Reduces muddiness below 200 Hz" />
            <Pill label="Sibilance tame" desc="Softens harsh high-end air" />
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
          Preview uses real-time filters. A deeper AI pass runs automatically
          at export for fan, AC, and room noise.
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
