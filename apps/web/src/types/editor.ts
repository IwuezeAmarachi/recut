export type Tool = 'select' | 'cut' | 'split' | 'trim' | 'caption';

export type Resolution = '720p' | '1080p' | '2k';
export type Codec = 'h264' | 'h265';

export type CaptionPosition = 'bottom' | 'middle' | 'top';

export interface CaptionStyle {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  position: CaptionPosition;
  background: boolean;
  backgroundOpacity: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  style: CaptionStyle;
}

export interface MediaItem {
  id: string;
  apiId?: string;         // server-side media ID after upload
  name: string;
  type: 'video' | 'audio';
  file: File;
  url: string;
  denoisedUrl?: string;     // server URL of ML-denoised version
  denoising?: boolean;      // denoise job running
  waveformPeaks?: number[]; // normalised peak amplitude per bucket (0–1)
  duration: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  uploading?: boolean;    // true while the file is being sent to the server
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

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 22,
  bold: false,
  italic: false,
  position: 'bottom',
  background: true,
  backgroundOpacity: 0.65,
};
