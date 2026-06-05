'use client';
import { Wand2, Volume2, SlidersHorizontal, Loader2, Mic } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';
import { api, BASE } from '@/lib/api';

export function AudioPanel() {
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const voiceIsolationEnabled = useEditorStore((s) => s.voiceIsolationEnabled);
  const normalizeAudio = useEditorStore((s) => s.normalizeAudio);
  const masterVolume = useEditorStore((s) => s.masterVolume);
  const mediaItems = useEditorStore((s) => s.mediaItems);
  const projectId = useEditorStore((s) => s.projectId);
  const setNoiseReduction = useEditorStore((s) => s.setNoiseReduction);
  const setVoiceIsolation = useEditorStore((s) => s.setVoiceIsolation);
  const setNormalizeAudio = useEditorStore((s) => s.setNormalizeAudio);
  const setMasterVolume = useEditorStore((s) => s.setMasterVolume);
  const setMediaDenoising = useEditorStore((s) => s.setMediaDenoising);
  const setMediaDenoisedUrl = useEditorStore((s) => s.setMediaDenoisedUrl);
  const setMediaIsolating = useEditorStore((s) => s.setMediaIsolating);
  const setMediaIsolatedUrl = useEditorStore((s) => s.setMediaIsolatedUrl);

  const anyDenoising = mediaItems.some((m) => m.denoising);
  const anyIsolating = mediaItems.some((m) => m.isolating);

  const handleNRToggle = async (enabled: boolean) => {
    setNoiseReduction(enabled);
    if (!enabled) return;
    for (const item of mediaItems) {
      if (!item.apiId || item.denoisedUrl || item.denoising) continue;
      setMediaDenoising(item.id, true);
      api.media.denoise(projectId, item.apiId)
        .then((res) => setMediaDenoisedUrl(item.id, `${BASE}${res.url}`))
        .catch(() => setMediaDenoising(item.id, false));
    }
  };

  const handleIsolationToggle = async (enabled: boolean) => {
    setVoiceIsolation(enabled);
    if (!enabled) return;
    for (const item of mediaItems) {
      if (!item.apiId || item.isolatedUrl || item.isolating) continue;
      setMediaIsolating(item.id, true);
      api.media.isolate(projectId, item.apiId)
        .then((res) => setMediaIsolatedUrl(item.id, `${BASE}${res.url}`))
        .catch(() => setMediaIsolating(item.id, false));
    }
  };

  return (
    <div className="space-y-2 p-4">

      {/* Voice Isolation — for background speech */}
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3">
              <Mic size={14} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-ink-1">Voice Isolation</p>
                {voiceIsolationEnabled
                  ? anyIsolating
                    ? <span className="flex items-center gap-1 text-2xs text-amber-400"><Loader2 size={10} className="animate-spin" />Processing…</span>
                    : <span className="flex items-center gap-1 text-2xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />Active</span>
                  : <Badge variant="outline">Off</Badge>}
              </div>
              <p className="mt-0.5 text-2xs text-ink-3 leading-relaxed">
                Removes background voices, phone calls, laughter. Uses AI source
                separation — slower but much more powerful than noise reduction.
              </p>
            </div>
          </div>
          <Toggle checked={voiceIsolationEnabled} onChange={handleIsolationToggle} />
        </div>
        {voiceIsolationEnabled && !anyIsolating && (
          <div className="mt-2 rounded-md bg-surface-3 px-2.5 py-1.5 text-2xs text-ink-2">
            Background voices and competing speech suppressed at export.
          </div>
        )}
      </div>

      {/* Standard Noise Reduction — for environment noise */}
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
                Removes fan, AC, hum, and room noise. Use Voice Isolation above
                for background people or conversations.
              </p>
            </div>
          </div>
          <Toggle checked={noiseReductionEnabled} onChange={handleNRToggle} />
        </div>
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

    </div>
  );
}
