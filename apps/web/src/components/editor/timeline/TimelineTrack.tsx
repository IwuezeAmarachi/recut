'use client';
import { memo } from 'react';
import { Film, Music, Captions } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClipItem } from './ClipItem';
import { CaptionItem } from './CaptionItem';
import { useEditorStore } from '@/store/editorStore';
import type { Clip, Caption } from '@/types/editor';

const TRACK_HEADER_W = 48;

interface TrackProps {
  label: string;
  icon: React.ReactNode;
  trackIndex: number;
  clips: Clip[];
  pxPerSec: number;
  totalWidth: number;
  onSeek: (time: number) => void;
}

function TimelineTrack({ label, icon, trackIndex, clips, pxPerSec, totalWidth, onSeek }: TrackProps) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(x / pxPerSec);
    selectClip(null);
  };

  return (
    <div className="flex h-[72px] shrink-0">
      {/* Header */}
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        <span className="text-ink-3">{icon}</span>
        <span className="text-2xs font-semibold text-ink-3">{label}</span>
      </div>

      {/* Lane */}
      <div
        className={cn(
          'relative h-full border-b border-edge',
          trackIndex % 2 === 0 ? 'bg-bg' : 'bg-[#141414]',
        )}
        style={{ width: totalWidth }}
        onClick={handleLaneClick}
      >
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

// Caption track
interface CaptionTrackProps {
  captions: Caption[];
  pxPerSec: number;
  totalWidth: number;
  onTrackClick: (e: React.MouseEvent, x: number) => void;
}

export function CaptionTrack({ captions, pxPerSec, totalWidth, onTrackClick }: CaptionTrackProps) {
  const selectedCaptionId = useEditorStore((s) => s.selectedCaptionId);
  const selectCaption = useEditorStore((s) => s.selectCaption);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTrackClick(e, e.clientX - rect.left);
    selectCaption(null);
  };

  return (
    <div className="flex h-10 shrink-0">
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        <Captions size={12} className="text-ink-3" strokeWidth={1.75} />
        <span className="text-2xs font-semibold text-ink-3">CC</span>
      </div>

      <div
        className="relative h-full border-b border-edge bg-[#111116] cursor-text"
        style={{ width: totalWidth }}
        onClick={handleClick}
      >
        {captions.map((cap) => (
          <CaptionItem
            key={cap.id}
            caption={cap}
            pxPerSec={pxPerSec}
            isSelected={selectedCaptionId === cap.id}
          />
        ))}
      </div>
    </div>
  );
}

export const VideoTrack = memo(function VideoTrack(props: Omit<TrackProps, 'label' | 'icon'>) {
  return <TimelineTrack {...props} label="V" icon={<Film size={12} strokeWidth={1.75} />} />;
});

export const AudioTrack = memo(function AudioTrack(props: Omit<TrackProps, 'label' | 'icon'>) {
  return <TimelineTrack {...props} label="A" icon={<Music size={12} strokeWidth={1.75} />} />;
});
