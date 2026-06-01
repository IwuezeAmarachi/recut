'use client';
import { useState, useRef } from 'react';
import { Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/store/editorStore';
import { ExportModal } from './ExportModal';

export function AppHeader() {
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [exportOpen, setExportOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitName = () => {
    setProjectName(draft.trim() || 'Untitled Project');
    setEditing(false);
  };

  return (
    <>
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-edge bg-surface-1 px-4">
        {/* Left — logo */}
        <div className="flex items-center gap-2.5 w-44">
          <RecutMark />
          <span className="text-sm font-semibold tracking-tight text-ink-1">Recut</span>
        </div>

        {/* Center — project name */}
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setDraft(projectName); setEditing(false); }
              }}
              autoFocus
              className="h-7 w-52 rounded-md bg-surface-2 px-2.5 text-center text-sm text-ink-1 outline-none ring-1 ring-edge-strong"
            />
          ) : (
            <button
              onClick={() => { setDraft(projectName); setEditing(true); }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-ink-1 hover:bg-surface-2 transition-colors"
            >
              {projectName}
            </button>
          )}
          <span className="text-2xs text-ink-3">Saved</span>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 w-44 justify-end">
          <Button variant="ghost" size="sm">
            <Save size={14} strokeWidth={1.75} />
            Save
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setExportOpen(true)}
          >
            <Download size={14} strokeWidth={1.75} />
            Export
          </Button>
        </div>
      </header>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}

function RecutMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#EBEBEB" />
      <rect x="13" y="2" width="9" height="4" rx="1.5" fill="#555555" />
      <rect x="13" y="8" width="9" height="3" rx="1.5" fill="#333333" />
      <rect x="2" y="13" width="20" height="9" rx="2" fill="#282828" />
      <rect x="5" y="16" width="6" height="3" rx="1" fill="#555555" />
    </svg>
  );
}
