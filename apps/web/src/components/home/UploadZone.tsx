'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { cn, ACCEPTED_VIDEO_TYPES, ACCEPTED_AUDIO_TYPES, MAX_FILE_SIZE, getVideoDimensions, getAudioDuration, formatFileSize, generateWaveformFromFile } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { api } from '@/lib/api';

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const addMedia = useEditorStore((s) => s.addMedia);
  const addClipFromMedia = useEditorStore((s) => s.addClipFromMedia);
  const setMediaApiId = useEditorStore((s) => s.setMediaApiId);
  const reset = useEditorStore((s) => s.reset);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      const allAccepted = [...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_AUDIO_TYPES];
      if (!allAccepted.includes(file.type)) {
        setError('Unsupported format. Please upload MP4, MOV, AVI, MKV, WebM, or audio files.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        return;
      }

      setLoading(true);
      setUploadPct(0);
      reset();

      try {
        const url = URL.createObjectURL(file);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
        const projectId = useEditorStore.getState().projectId;

        // Add to store and navigate immediately — don't block on metadata
        const item = addMedia({
          name: file.name,
          type: isVideo ? 'video' : 'audio',
          file,
          url,
          duration: 0,
          uploading: true,
        });
        addClipFromMedia(item.id);

        // Try to register project on server — don't block if backend is offline
        api.projects.create(file.name.replace(/\.[^.]+$/, '') || 'Untitled', projectId).catch(() => {});

        router.push(`/editor/${projectId}`);

        // Local metadata — fast, always works
        const metaPromise = isVideo
          ? getVideoDimensions(file)
              .then(({ duration, width, height }) =>
                useEditorStore.getState().updateMedia(item.id, { duration, width, height }),
              )
              .catch(() => {})
          : getAudioDuration(file)
              .then((duration) => useEditorStore.getState().updateMedia(item.id, { duration }))
              .catch(() => {});

        // Client-side waveform — no backend needed
        generateWaveformFromFile(file, 400)
          .then((peaks) => { if (peaks.length) useEditorStore.getState().setMediaWaveform(item.id, peaks); })
          .catch(() => {});

        // Server upload — optional; higher-quality waveform + NR + export need it
        api.media.upload(projectId, file, (pct) => setUploadPct(pct))
          .then(async (apiMedia) => {
            setMediaApiId(item.id, apiMedia.id);
            const wf = await api.media.waveform(projectId, apiMedia.id, 400);
            useEditorStore.getState().setMediaWaveform(item.id, wf.peaks);
          })
          .catch(() => {
            useEditorStore.getState().updateMedia(item.id, { uploading: false });
          });

        await metaPromise;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to process file: ${msg}`);
        setLoading(false);
      }
    },
    [addMedia, addClipFromMedia, setMediaApiId, reset, router],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 rounded-xl border',
          'transition-all duration-200 cursor-pointer select-none',
          'h-64 px-8',
          isDragging
            ? 'border-ink-2 bg-surface-2'
            : 'border-dashed border-edge hover:border-edge-strong hover:bg-surface-1 bg-surface-1/50',
          loading && 'pointer-events-none',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_AUDIO_TYPES].join(',')}
          className="sr-only"
          onChange={handleChange}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="h-6 w-6 rounded-full border-2 border-ink-2 border-t-transparent animate-spin" />
            <p className="text-sm text-ink-2">
              {uploadPct < 100 ? `Uploading… ${uploadPct}%` : 'Processing…'}
            </p>
            <div className="h-1 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-ink-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl border transition-colors',
              isDragging ? 'border-edge-strong bg-surface-3' : 'border-edge bg-surface-2',
            )}>
              <UploadCloud size={22} className="text-ink-2" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-ink-1">
                {isDragging ? 'Drop to import' : 'Drop your video here'}
              </p>
              <p className="mt-1 text-xs text-ink-3">
                or <span className="text-ink-2 underline underline-offset-2">click to browse</span>
              </p>
            </div>
            <p className="text-2xs text-ink-3 tracking-wide">
              MP4 · MOV · AVI · MKV · WebM &nbsp;·&nbsp; up to 10 GB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-400/10 px-3 py-2.5 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
