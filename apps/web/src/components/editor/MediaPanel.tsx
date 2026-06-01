'use client';
import { useRef, useState } from 'react';
import { Plus, Film, Music, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { cn, ACCEPTED_VIDEO_TYPES, ACCEPTED_AUDIO_TYPES, getVideoDimensions, getAudioDuration, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEditorStore } from '@/store/editorStore';
import { api } from '@/lib/api';
import type { MediaItem } from '@/types/editor';

export function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaItems = useEditorStore((s) => s.mediaItems);
  const projectId = useEditorStore((s) => s.projectId);
  const addMedia = useEditorStore((s) => s.addMedia);
  const updateMedia = useEditorStore((s) => s.updateMedia);
  const setMediaApiId = useEditorStore((s) => s.setMediaApiId);
  const setMediaWaveform = useEditorStore((s) => s.setMediaWaveform);
  const removeMedia = useEditorStore((s) => s.removeMedia);
  const addClipFromMedia = useEditorStore((s) => s.addClipFromMedia);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
      const isAudio = ACCEPTED_AUDIO_TYPES.includes(file.type);
      if (!isVideo && !isAudio) continue;

      const url = URL.createObjectURL(file);

      // Add immediately so the card appears right away — metadata loads async
      const item = addMedia({
        name: file.name,
        type: isVideo ? 'video' : 'audio',
        file,
        url,
        duration: 0,
        uploading: true,
      });

      // Resolve metadata without blocking the UI
      const metaPromise = isVideo
        ? getVideoDimensions(file).then(({ duration, width, height }) => {
            updateMedia(item.id, { duration, width, height });
          })
        : getAudioDuration(file).then((duration) => {
            updateMedia(item.id, { duration });
          });

      metaPromise.catch(() => URL.revokeObjectURL(url));

      // Upload to server, then fetch waveform in background
      api.media.upload(projectId, file)
        .then(async (apiMedia) => {
          setMediaApiId(item.id, apiMedia.id);
          const wf = await api.media.waveform(projectId, apiMedia.id, 400);
          setMediaWaveform(item.id, wf.peaks);
        })
        .catch(() => { /* upload/waveform failed silently */ });
    }
  };

  const videos = mediaItems.filter((m) => m.type === 'video');
  const audios = mediaItems.filter((m) => m.type === 'audio');

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-edge bg-surface-1">
      <div className="flex h-10 items-center justify-between border-b border-edge px-3">
        <span className="text-xs font-medium text-ink-2">Media</span>
        <Tooltip content="Import media">
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} className="h-6 w-6 p-0">
            <Plus size={14} strokeWidth={2} />
          </Button>
        </Tooltip>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_AUDIO_TYPES].join(',')}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {mediaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-surface-2">
              <Film size={18} className="text-ink-3" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-2">No media yet</p>
              <p className="mt-0.5 text-2xs text-ink-3">Import video or audio files</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Plus size={12} /> Import
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {videos.length > 0 && (
              <MediaSection
                title="Video"
                icon={<Film size={12} />}
                items={videos}
                onAdd={addClipFromMedia}
                onRemove={removeMedia}
              />
            )}
            {audios.length > 0 && (
              <MediaSection
                title="Audio"
                icon={<Music size={12} />}
                items={audios}
                onAdd={addClipFromMedia}
                onRemove={removeMedia}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function MediaSection({
  title,
  icon,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-1 py-1 text-2xs font-medium uppercase tracking-widest text-ink-3 hover:text-ink-2 transition-colors"
      >
        <ChevronDown
          size={10}
          className={cn('transition-transform', !open && '-rotate-90')}
        />
        {icon}
        {title}
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onAdd={onAdd} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  onAdd,
  onRemove,
}: {
  item: MediaItem;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface-2 transition-colors cursor-pointer"
      onClick={() => onAdd(item.id)}
    >
      {/* Thumbnail / icon */}
      <div className="relative h-10 w-[60px] shrink-0 overflow-hidden rounded-md bg-surface-3">
        {item.type === 'video' ? (
          <video
            src={item.url}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music size={16} className="text-ink-3" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink-1">{item.name}</p>
        <p className="text-2xs text-ink-3 mt-0.5">{formatDuration(item.duration)}</p>
      </div>

      {/* Upload spinner / remove button */}
      {item.uploading ? (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center">
          <Loader2 size={12} className="animate-spin text-ink-3" />
        </div>
      ) : hover ? (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-surface-3 text-ink-3 hover:text-red-400 transition-colors"
        >
          <Trash2 size={10} />
        </button>
      ) : null}
    </div>
  );
}
