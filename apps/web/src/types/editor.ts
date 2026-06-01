export type Tool = 'select' | 'cut' | 'split' | 'trim';

export type Resolution = '720p' | '1080p' | '2k';
export type Codec = 'h264' | 'h265';

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio';
  file: File;
  url: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface Clip {
  id: string;
  mediaId: string;
  type: 'video' | 'audio';
  name: string;
  startTime: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  speed: number;
  trackIndex: number;
  volume: number;
}

export interface ExportSettings {
  resolution: Resolution;
  codec: Codec;
  bitrate: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function clipEffectiveDuration(clip: Clip): number {
  return (clip.duration - clip.trimIn - clip.trimOut) / clip.speed;
}
