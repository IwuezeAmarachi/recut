'use client';
import { Film, Music, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClipItem } from './ClipItem';
import { useEditorStore } from '@/store/editorStore';
import type { Clip } from '@/types/editor';

const TRACK_HEADER_W = 48;

interface TimelineTrackProps {
  label: string;
  icon: React.ReactNode;
  trackIndex: number;
  clips: Clip[];
  pxPerSec: number;
  totalWidth: number;
  onSeek: (time: number) => void;
}

export function TimelineTrack({
  label,
  icon,
  trackIndex,
  clips,
  pxPerSec,
  totalWidth,
  onSeek,
}: TimelineTrackProps) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(x / pxPerSec);
    selectClip(null);
  };

  return (
    <div className="flex h-14 shrink-0">
      {/* Track header */}
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-1 border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        <span className="text-ink-3">{icon}</span>
        <span className="text-2xs text-ink-3 font-medium">{label}</span>
      </div>

      {/* Track lane */}
      <div
        className={cn(
          'relative h-full border-b border-edge',
          trackIndex % 2 === 0 ? 'bg-bg' : 'bg-[#141414]',
        )}
        style={{ width: totalWidth }}
        onClick={handleTrackClick}
      >
        {/* Track grid lines */}
        <div className="absolute inset-0 opacity-30">
          <div className="h-px w-full bg-edge absolute top-0" />
          <div className="h-px w-full bg-edge absolute bottom-0" />
        </div>

        {/* Clips */}
        {clips.map((clip) => (
          <ClipItem
            key={clip.id}
            clip={clip}
            pxPerSec={pxPerSec}
            isSelected={selectedClipId === clip.id}
          />
        ))}
      </div>
    </div>
  );
}

export function VideoTrack(props: Omit<TimelineTrackProps, 'label' | 'icon'>) {
  return (
    <TimelineTrack
      {...props}
      label="V"
      icon={<Film size={12} strokeWidth={1.75} />}
    />
  );
}

export function AudioTrack(props: Omit<TimelineTrackProps, 'label' | 'icon'>) {
  return (
    <TimelineTrack
      {...props}
      label="A"
      icon={<Music size={12} strokeWidth={1.75} />}
    />
  );
}
