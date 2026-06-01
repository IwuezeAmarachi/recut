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
