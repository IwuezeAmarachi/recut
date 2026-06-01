'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { cn, ACCEPTED_VIDEO_TYPES, ACCEPTED_AUDIO_TYPES, MAX_FILE_SIZE, getVideoDimensions, getAudioDuration, formatFileSize } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addMedia = useEditorStore((s) => s.addMedia);
  const addClipFromMedia = useEditorStore((s) => s.addClipFromMedia);
  const reset = useEditorStore((s) => s.reset);
  const projectId = useEditorStore((s) => s.projectId);

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
      reset();

      try {
        const url = URL.createObjectURL(file);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

        let duration = 0;
        let width: number | undefined;
        let height: number | undefined;

        if (isVideo) {
          const meta = await getVideoDimensions(file);
          duration = meta.duration;
          width = meta.width;
          height = meta.height;
        } else {
          duration = await getAudioDuration(file);
        }

        const item = addMedia({
          name: file.name,
          type: isVideo ? 'video' : 'audio',
          file,
          url,
          duration,
          width,
          height,
        });

        addClipFromMedia(item.id);
        router.push(`/editor/${projectId}`);
      } catch {
        setError('Failed to read file. Please try again.');
        setLoading(false);
      }
    },
    [addMedia, addClipFromMedia, reset, router, projectId],
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
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-ink-2 border-t-transparent animate-spin" />
            <p className="text-sm text-ink-2">Loading media…</p>
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
              MP4 · MOV · AVI · MKV · WebM &nbsp;·&nbsp; up to 4 GB
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
