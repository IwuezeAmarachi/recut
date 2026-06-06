'use client';
import { Loader2, Mic, Wand2, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { api, BASE } from '@/lib/api';

export function AudioPanel() {
  const noiseReductionEnabled  = useEditorStore((s) => s.noiseReductionEnabled);
  const voiceIsolationEnabled  = useEditorStore((s) => s.voiceIsolationEnabled);
  const normalizeAudio         = useEditorStore((s) => s.normalizeAudio);
  const masterVolume           = useEditorStore((s) => s.masterVolume);
  const mediaItems             = useEditorStore((s) => s.mediaItems);
  const projectId              = useEditorStore((s) => s.projectId);
  const setNoiseReduction      = useEditorStore((s) => s.setNoiseReduction);
  const setVoiceIsolation      = useEditorStore((s) => s.setVoiceIsolation);
  const setNormalizeAudio      = useEditorStore((s) => s.setNormalizeAudio);
  const setMasterVolume        = useEditorStore((s) => s.setMasterVolume);
  const setMediaDenoising      = useEditorStore((s) => s.setMediaDenoising);
  const setMediaDenoisedUrl    = useEditorStore((s) => s.setMediaDenoisedUrl);
  const setMediaIsolating      = useEditorStore((s) => s.setMediaIsolating);
  const setMediaIsolatedUrl    = useEditorStore((s) => s.setMediaIsolatedUrl);

  const anyDenoising  = mediaItems.some((m) => m.denoising);
  const anyIsolating  = mediaItems.some((m) => m.isolating);

  const handleNRToggle = async (enabled: boolean) => {
    setNoiseReduction(enabled);
    if (!enabled) return;
    for (const item of mediaItems) {
      if (!item.apiId || item.denoisedUrl || item.denoising) continue;
      setMediaDenoising(item.id, true);
      api.media.denoise(projectId, item.apiId)
        .then((r) => setMediaDenoisedUrl(item.id, `${BASE}${r.url}`))
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
        .then((r) => setMediaIsolatedUrl(item.id, `${BASE}${r.url}`))
        .catch(() => setMediaIsolating(item.id, false));
    }
  };

  return (
    <div className="p-4 space-y-3">

      {/* Section label */}
      <p className="px-1 text-2xs font-semibold uppercase tracking-widest text-ink-3">AI Processing</p>

      {/* Voice Isolation */}
      <SettingRow
        icon={<Mic size={14} strokeWidth={1.75} />}
        iconColor="text-accent"
        iconBg="bg-accent/10"
        title="Voice Isolation"
        subtitle="Strips background speech, laughter & phone calls"
        status={voiceIsolationEnabled ? (anyIsolating ? 'processing' : 'on') : 'off'}
        checked={voiceIsolationEnabled}
        onChange={handleIsolationToggle}
      />

      {/* Noise Reduction */}
      <SettingRow
        icon={<Wand2 size={14} strokeWidth={1.75} />}
        iconColor="text-accent-green"
        iconBg="bg-accent-green/10"
        title="Noise Reduction"
        subtitle="Fan, AC, hum, mic hiss & room tone"
        status={noiseReductionEnabled ? (anyDenoising ? 'processing' : 'on') : 'off'}
        checked={noiseReductionEnabled}
        onChange={handleNRToggle}
      />

      <div className="h-px bg-edge my-1" />
      <p className="px-1 text-2xs font-semibold uppercase tracking-widest text-ink-3">Levels</p>

      {/* Normalize */}
      <SettingRow
        icon={<SlidersHorizontal size={14} strokeWidth={1.75} />}
        iconColor="text-accent-orange"
        iconBg="bg-accent-orange/10"
        title="Normalize"
        subtitle="Levels out loud and quiet passages"
        status={normalizeAudio ? 'on' : 'off'}
        checked={normalizeAudio}
        onChange={setNormalizeAudio}
      />

      {/* Master Volume */}
      <div className="rounded-2xl bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-surface-3">
              <Volume2 size={14} className="text-ink-2" strokeWidth={1.75} />
            </div>
            <span className="text-xs font-medium text-ink-1">Master Volume</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-2">{Math.round(masterVolume * 100)}%</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-surface-3 overflow-hidden cursor-pointer">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-accent/80 to-accent"
            style={{ width: `${masterVolume * 100}%` }}
          />
          <input
            type="range" min={0} max={1} step={0.01} value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

    </div>
  );
}

type Status = 'off' | 'on' | 'processing';

function SettingRow({
  icon, iconColor, iconBg, title, subtitle, status, checked, onChange,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  status: Status;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-ink-1">{title}</p>
          <StatusDot status={status} />
        </div>
        <p className="text-2xs text-ink-3 leading-relaxed mt-0.5 truncate">{subtitle}</p>
      </div>

      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  if (status === 'off') return null;
  if (status === 'processing')
    return <span className="flex items-center gap-1 text-2xs text-accent-orange"><Loader2 size={9} className="animate-spin" />Processing</span>;
  return <span className="flex items-center gap-1 text-2xs text-accent-green"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" />Active</span>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-accent' : 'bg-surface-4'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}
