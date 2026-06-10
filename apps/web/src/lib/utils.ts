import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDurationMs(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00.0';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getVideoDimensions(
  file: File,
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      URL.revokeObjectURL(url);
    };
    video.onerror = reject;
    video.src = url;
  });
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = reject;
    audio.src = url;
  });
}

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
export const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB

/** Generate waveform peaks client-side from any audio/video file — no backend needed. */
export async function generateWaveformFromFile(file: File, points = 400): Promise<number[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // AudioContext.decodeAudioData works on both audio files and video containers
    // (extracts the audio track automatically in Chrome/Safari/Firefox)
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    const channelData = audioBuffer.getChannelData(0);
    const chunkSize = Math.max(1, Math.floor(channelData.length / points));
    const peaks: number[] = [];

    for (let i = 0; i < points; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, channelData.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    const maxPeak = Math.max(...peaks, 0.001);
    return peaks.map((p) => Math.round((p / maxPeak) * 10000) / 10000);
  } catch {
    return [];
  }
}
