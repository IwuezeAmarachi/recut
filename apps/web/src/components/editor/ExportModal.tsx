'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import { X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEditorStore } from '@/store/editorStore';
import type { Resolution, Codec } from '@/types/editor';

type ExportState = 'idle' | 'processing' | 'done' | 'error';

const resolutions: { value: Resolution; label: string; desc: string; premium?: boolean }[] = [
  { value: '720p', label: '720p HD', desc: '1280 × 720' },
  { value: '1080p', label: '1080p Full HD', desc: '1920 × 1080' },
  { value: '2k', label: '2K QHD', desc: '2560 × 1440', premium: true },
];

const codecs: { value: Codec; label: string; desc: string }[] = [
  { value: 'h264', label: 'H.264 / AVC', desc: 'Best compatibility' },
  { value: 'h265', label: 'H.265 / HEVC', desc: 'Smaller file size' },
];

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const exportSettings = useEditorStore((s) => s.exportSettings);
  const updateExportSettings = useEditorStore((s) => s.updateExportSettings);
  const noiseReductionEnabled = useEditorStore((s) => s.noiseReductionEnabled);
  const duration = useEditorStore((s) => s.duration);

  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);

  const startExport = () => {
    setState('processing');
    setProgress(0);

    // Simulate export progress
    const totalMs = Math.min(duration * 400, 8000);
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setState('done');
      }
    };
    requestAnimationFrame(tick);
  };

  const handleClose = () => {
    setState('idle');
    setProgress(0);
    onClose();
  };

  const estimatedSize = (exportSettings.bitrate * duration) / 8 / 1024;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-slide-up">
          <div className="rounded-xl border border-edge bg-surface-1 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-edge px-5 py-4">
              <Dialog.Title className="text-sm font-semibold text-ink-1">Export Video</Dialog.Title>
              <Dialog.Close asChild>
                <button className="flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink-1 transition-colors">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-5 space-y-5">
              {state === 'done' ? (
                <ExportSuccess onClose={handleClose} />
              ) : state === 'processing' ? (
                <ExportProgress progress={progress} />
              ) : (
                <>
                  {/* Resolution */}
                  <div>
                    <p className="mb-2.5 text-2xs font-medium uppercase tracking-widest text-ink-3">
                      Resolution
                    </p>
                    <div className="space-y-1.5">
                      {resolutions.map((r) => (
                        <ResolutionOption
                          key={r.value}
                          {...r}
                          selected={exportSettings.resolution === r.value}
                          onSelect={() => updateExportSettings({ resolution: r.value })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Codec */}
                  <div>
                    <p className="mb-2.5 text-2xs font-medium uppercase tracking-widest text-ink-3">
                      Codec
                    </p>
                    <div className="flex gap-2">
                      {codecs.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => updateExportSettings({ codec: c.value })}
                          className={cn(
                            'flex-1 rounded-lg border p-3 text-left transition-colors',
                            exportSettings.codec === c.value
                              ? 'border-edge-strong bg-surface-2'
                              : 'border-edge bg-surface-2/50 hover:bg-surface-2',
                          )}
                        >
                          <p className="text-xs font-medium text-ink-1">{c.label}</p>
                          <p className="mt-0.5 text-2xs text-ink-3">{c.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bitrate */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-2xs font-medium uppercase tracking-widest text-ink-3">
                        Bitrate
                      </p>
                      <span className="text-xs text-ink-2">{exportSettings.bitrate.toLocaleString()} kbps</span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={50000}
                      step={500}
                      value={exportSettings.bitrate}
                      onChange={(e) => updateExportSettings({ bitrate: parseInt(e.target.value) })}
                      className="w-full accent-ink-2 cursor-pointer"
                    />
                    <div className="mt-1 flex justify-between text-2xs text-ink-3">
                      <span>1 Mbps</span>
                      <span>~{estimatedSize.toFixed(0)} MB estimated</span>
                      <span>50 Mbps</span>
                    </div>
                  </div>

                  {/* Noise reduction note */}
                  {noiseReductionEnabled && (
                    <div className="rounded-lg bg-surface-2 px-3 py-2.5 text-2xs text-ink-2">
                      AI noise reduction will be applied during export.
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={startExport}
                    disabled={duration === 0}
                  >
                    <Download size={14} strokeWidth={1.75} />
                    Export {exportSettings.resolution} / {exportSettings.codec.toUpperCase()}
                  </Button>

                  {duration === 0 && (
                    <p className="text-center text-2xs text-ink-3">Add clips to the timeline to export.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResolutionOption({
  value,
  label,
  desc,
  premium,
  selected,
  onSelect,
}: {
  value: Resolution;
  label: string;
  desc: string;
  premium?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border p-3 transition-colors',
        selected
          ? 'border-edge-strong bg-surface-2'
          : 'border-edge bg-surface-2/50 hover:bg-surface-2',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-4 w-4 rounded-full border-2 transition-colors flex items-center justify-center',
          selected ? 'border-ink-1' : 'border-edge-strong',
        )}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-ink-1" />}
        </div>
        <div className="text-left">
          <p className="text-xs font-medium text-ink-1">{label}</p>
          <p className="text-2xs text-ink-3">{desc}</p>
        </div>
      </div>
      {premium && <Badge variant="premium">PRO</Badge>}
    </button>
  );
}

function ExportProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-4 py-4 text-center">
      <p className="text-sm font-medium text-ink-1">Exporting…</p>
      <Progress.Root className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <Progress.Indicator
          className="h-full bg-ink-2 transition-transform duration-200 ease-out rounded-full"
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
      </Progress.Root>
      <p className="text-2xs text-ink-3 tabular-nums">{progress}% — applying processing pipeline</p>
    </div>
  );
}

function ExportSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <CheckCircle2 size={36} className="text-ink-2" strokeWidth={1.25} />
      <div>
        <p className="text-sm font-medium text-ink-1">Export complete</p>
        <p className="mt-1 text-xs text-ink-3">Your video is ready to download.</p>
      </div>
      <div className="flex gap-2 w-full">
        <Button variant="outline" size="md" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" size="md" className="flex-1">
          <Download size={14} /> Download
        </Button>
      </div>
    </div>
  );
}
