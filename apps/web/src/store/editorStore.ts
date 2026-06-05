import { create } from 'zustand';
import {
  type Clip,
  type MediaItem,
  type Tool,
  type ExportSettings,
  type Caption,
  clipEffectiveDuration,
  DEFAULT_CAPTION_STYLE,
} from '@/types/editor';
import { generateId } from '@/lib/utils';

interface EditorStore {
  projectId: string;
  projectName: string;
  mediaItems: MediaItem[];
  clips: Clip[];
  captions: Caption[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  activeTool: Tool;
  selectedClipId: string | null;
  selectedCaptionId: string | null;
  noiseReductionEnabled: boolean;
  voiceIsolationEnabled: boolean;
  normalizeAudio: boolean;
  masterVolume: number;
  exportSettings: ExportSettings;
  captionsGenerating: boolean;

  setProjectId: (id: string) => void;
  setProjectName: (name: string) => void;
  addMedia: (item: Omit<MediaItem, 'id'>) => MediaItem;
  updateMedia: (id: string, updates: Partial<Omit<MediaItem, 'id'>>) => void;
  removeMedia: (id: string) => void;
  addClipFromMedia: (mediaId: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClipAtTime: (clipId: string, time: number) => void;
  selectClip: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number | ((z: number) => number)) => void;
  setActiveTool: (tool: Tool) => void;
  setNoiseReduction: (enabled: boolean) => void;
  setVoiceIsolation: (enabled: boolean) => void;
  setNormalizeAudio: (enabled: boolean) => void;
  setMasterVolume: (vol: number) => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;
  recomputeDuration: () => void;

  setMediaApiId: (localId: string, apiId: string) => void;
  setMediaDenoising: (id: string, denoising: boolean) => void;
  setMediaDenoisedUrl: (id: string, url: string) => void;
  setMediaWaveform: (id: string, peaks: number[]) => void;
  setMediaIsolating: (id: string, isolating: boolean) => void;
  setMediaIsolatedUrl: (id: string, url: string) => void;

  // Captions
  addCaption: (startTime: number, text?: string) => Caption;
  updateCaption: (id: string, updates: Partial<Omit<Caption, 'id'>>) => void;
  removeCaption: (id: string) => void;
  selectCaption: (id: string | null) => void;
  setCaptionsGenerating: (v: boolean) => void;

  reset: () => void;
}

const DEFAULT_EXPORT: ExportSettings = {
  resolution: '1080p',
  codec: 'h264',
  bitrate: 8000,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  projectId: generateId(),
  projectName: 'Untitled Project',
  mediaItems: [],
  clips: [],
  captions: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  zoom: 1,
  activeTool: 'select',
  selectedClipId: null,
  selectedCaptionId: null,
  noiseReductionEnabled: false,
  voiceIsolationEnabled: false,
  normalizeAudio: false,
  masterVolume: 1,
  exportSettings: DEFAULT_EXPORT,
  captionsGenerating: false,

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name }),

  addMedia: (item) => {
    const newItem: MediaItem = { ...item, id: generateId() };
    set((s) => ({ mediaItems: [...s.mediaItems, newItem] }));
    return newItem;
  },

  updateMedia: (id, updates) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  removeMedia: (id) =>
    set((s) => ({
      mediaItems: s.mediaItems.filter((m) => m.id !== id),
      clips: s.clips.filter((c) => c.mediaId !== id),
    })),

  addClipFromMedia: (mediaId) => {
    const state = get();
    const media = state.mediaItems.find((m) => m.id === mediaId);
    if (!media) return;

    const trackIndex = media.type === 'video' ? 0 : 1;
    const sameTrackClips = state.clips.filter((c) => c.trackIndex === trackIndex);
    const startTime = sameTrackClips.reduce((max, c) => {
      const end = c.startTime + clipEffectiveDuration(c);
      return Math.max(max, end);
    }, 0);

    const newClip: Clip = {
      id: generateId(),
      mediaId,
      type: media.type,
      name: media.name,
      startTime,
      duration: media.duration,
      trimIn: 0,
      trimOut: 0,
      speed: 1,
      trackIndex,
      volume: 1,
    };

    const newDuration = Math.max(state.duration, startTime + media.duration);
    set((s) => ({ clips: [...s.clips, newClip], duration: newDuration, selectedClipId: newClip.id }));
  },

  updateClip: (id, updates) =>
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)) })),

  removeClip: (id) =>
    set((s) => {
      const clips = s.clips.filter((c) => c.id !== id);
      const duration = clips.reduce(
        (max, c) => Math.max(max, c.startTime + clipEffectiveDuration(c)),
        0,
      );
      return { clips, duration, selectedClipId: s.selectedClipId === id ? null : s.selectedClipId };
    }),

  splitClipAtTime: (clipId, time) => {
    const state = get();
    const clip = state.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const relativeTime = time - clip.startTime;
    const effectiveDur = clipEffectiveDuration(clip);
    if (relativeTime <= 0.05 || relativeTime >= effectiveDur - 0.05) return;
    const sourceRelative = clip.trimIn + relativeTime * clip.speed;
    const firstHalf: Clip = { ...clip, id: generateId(), trimOut: clip.duration - sourceRelative };
    const secondHalf: Clip = { ...clip, id: generateId(), startTime: time, trimIn: sourceRelative };
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== clipId).concat([firstHalf, secondHalf]),
      selectedClipId: firstHalf.id,
    }));
  },

  selectClip: (id) => set({ selectedClipId: id, selectedCaptionId: null }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setZoom: (zoom) => set((s) => ({ zoom: typeof zoom === 'function' ? zoom(s.zoom) : zoom })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setNoiseReduction: (enabled) => set({ noiseReductionEnabled: enabled }),
  setVoiceIsolation: (enabled) => set({ voiceIsolationEnabled: enabled }),
  setNormalizeAudio: (enabled) => set({ normalizeAudio: enabled }),
  setMasterVolume: (vol) => set({ masterVolume: vol }),
  updateExportSettings: (settings) =>
    set((s) => ({ exportSettings: { ...s.exportSettings, ...settings } })),
  recomputeDuration: () =>
    set((s) => ({
      duration: s.clips.reduce((max, c) => Math.max(max, c.startTime + clipEffectiveDuration(c)), 0),
    })),

  // Captions
  addCaption: (startTime, text = 'New caption') => {
    const caption: Caption = {
      id: generateId(),
      text,
      startTime,
      duration: 3,
      style: { ...DEFAULT_CAPTION_STYLE },
    };
    set((s) => ({ captions: [...s.captions, caption], selectedCaptionId: caption.id }));
    return caption;
  },

  updateCaption: (id, updates) =>
    set((s) => ({
      captions: s.captions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  removeCaption: (id) =>
    set((s) => ({
      captions: s.captions.filter((c) => c.id !== id),
      selectedCaptionId: s.selectedCaptionId === id ? null : s.selectedCaptionId,
    })),

  setMediaApiId: (localId, apiId) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) =>
        m.id === localId ? { ...m, apiId, uploading: false } : m,
      ),
    })),

  setMediaDenoising: (id, denoising) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === id ? { ...m, denoising } : m)),
    })),

  setMediaDenoisedUrl: (id, url) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) =>
        m.id === id ? { ...m, denoisedUrl: url, denoising: false } : m,
      ),
    })),

  setMediaWaveform: (id, peaks) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === id ? { ...m, waveformPeaks: peaks } : m)),
    })),

  setMediaIsolating: (id, isolating) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) => (m.id === id ? { ...m, isolating } : m)),
    })),

  setMediaIsolatedUrl: (id, url) =>
    set((s) => ({
      mediaItems: s.mediaItems.map((m) =>
        m.id === id ? { ...m, isolatedUrl: url, isolating: false } : m,
      ),
    })),

  selectCaption: (id) => set({ selectedCaptionId: id, selectedClipId: null }),
  setCaptionsGenerating: (v) => set({ captionsGenerating: v }),

  reset: () =>
    set({
      projectId: generateId(),
      projectName: 'Untitled Project',
      mediaItems: [],
      clips: [],
      captions: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      zoom: 1,
      activeTool: 'select',
      selectedClipId: null,
      selectedCaptionId: null,
      noiseReductionEnabled: false,
      voiceIsolationEnabled: false,
      normalizeAudio: false,
      masterVolume: 1,
      exportSettings: DEFAULT_EXPORT,
      captionsGenerating: false,
    }),
}));
