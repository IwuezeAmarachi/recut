'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/editor/AppHeader';
import { MediaPanel } from '@/components/editor/MediaPanel';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { RightPanel } from '@/components/editor/RightPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { Timeline } from '@/components/editor/timeline/Timeline';
import { useEditorStore } from '@/store/editorStore';

export default function EditorPage() {
  const params = useParams();
  const setProjectId = useEditorStore((s) => s.setProjectId);

  useEffect(() => {
    if (typeof params.id === 'string') setProjectId(params.id);
  }, [params.id, setProjectId]);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const { setActiveTool, setPlaying, isPlaying, selectedClipId, currentTime, splitClipAtTime, removeClip } =
        useEditorStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!isPlaying);
          break;
        case 'v': case 'V':
          setActiveTool('select');
          break;
        case 'c': case 'C':
          setActiveTool('cut');
          break;
        case 'x': case 'X':
          if (selectedClipId) splitClipAtTime(selectedClipId, currentTime);
          break;
        case 't': case 'T':
          setActiveTool('trim');
          break;
        case 'Backspace': case 'Delete':
          if (selectedClipId) removeClip(selectedClipId);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink-1">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <MediaPanel />

        <div className="flex flex-1 flex-col overflow-hidden">
          <VideoPreview />
        </div>

        <RightPanel />
      </div>

      <Toolbar />
      <Timeline />
    </div>
  );
}
