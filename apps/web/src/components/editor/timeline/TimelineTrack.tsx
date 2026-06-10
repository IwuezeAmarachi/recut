'use client';
import { memo } from 'react';
import { Film, Music, Captions } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClipItem } from './ClipItem';
import { CaptionItem } from './CaptionItem';
import { useEditorStore } from '@/store/editorStore';
import type { Clip, Caption } from '@/types/editor';

const TRACK_HEADER_W = 48;

// Track accent colors per type
const TRACK_ACCENTS = {
  video:   { border: '#3b82f6', icon: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
  audio:   { border: '#22c55e', icon: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
  caption: { border: '#a855f7', icon: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10' },
};

interface TrackProps {
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  iconClass: string;
  trackIndex: number;
  clips: Clip[];
  pxPerSec: number;
  totalWidth: number;
  onSeek: (time: number) => void;
}

function TimelineTrack({ label, icon, accentColor, iconClass, trackIndex, clips, pxPerSec, totalWidth, onSeek }: TrackProps) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / pxPerSec);
    selectClip(null);
  };

  return (
    <div className="flex h-[68px] shrink-0">
      {/* Header */}
      <div
        className="relative flex shrink-0 flex-col items-center justify-center gap-1 border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span className={iconClass}>{icon}</span>
        <span className="text-[10px] font-semibold text-ink-3 leading-none">{label}</span>
      </div>

      {/* Lane */}
      <div
        className={cn(
          'relative h-full border-b border-edge cursor-crosshair',
          trackIndex % 2 === 0 ? 'bg-[#0f0f0f]' : 'bg-[#0c0c0c]',
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

// ── Caption track ─────────────────────────────────────────────────────────────
interface CaptionTrackProps {
  captions: Caption[];
  pxPerSec: number;
  totalWidth: number;
  onTrackClick: (e: React.MouseEvent, x: number) => void;
}

export function CaptionTrack({ captions, pxPerSec, totalWidth, onTrackClick }: CaptionTrackProps) {
  const selectedCaptionId = useEditorStore((s) => s.selectedCaptionId);
  const selectCaption = useEditorStore((s) => s.selectCaption);
  const accent = TRACK_ACCENTS.caption;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTrackClick(e, e.clientX - rect.left);
    selectCaption(null);
  };

  return (
    <div className="flex h-9 shrink-0">
      <div
        className="relative flex shrink-0 flex-col items-center justify-center gap-1 border-r border-edge bg-surface-1"
        style={{ width: TRACK_HEADER_W }}
      >
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: TRACK_ACCENTS.caption.border }}
        />
        <Captions size={11} className={accent.icon} strokeWidth={1.75} />
        <span className="text-[10px] font-semibold text-ink-3 leading-none">CC</span>
      </div>

      <div
        className="relative h-full border-b border-edge bg-[#0a0a0e] cursor-text"
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

export const VideoTrack = memo(function VideoTrack(props: Omit<TrackProps, 'label' | 'icon' | 'accentColor' | 'iconClass'>) {
  const accent = TRACK_ACCENTS.video;
  return (
    <TimelineTrack
      {...props}
      label="VID"
      icon={<Film size={11} strokeWidth={1.75} />}
      accentColor={accent.border}
      iconClass={accent.icon}
    />
  );
});

export const AudioTrack = memo(function AudioTrack(props: Omit<TrackProps, 'label' | 'icon' | 'accentColor' | 'iconClass'>) {
  const accent = TRACK_ACCENTS.audio;
  return (
    <TimelineTrack
      {...props}
      label="AUD"
      icon={<Music size={11} strokeWidth={1.75} />}
      accentColor={accent.border}
      iconClass={accent.icon}
    />
  );
});
