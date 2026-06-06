'use client';
import { useState, useRef } from 'react';
import { Download, Pencil, Check } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { ExportModal } from './ExportModal';

export function AppHeader() {
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [exportOpen, setExportOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => { setDraft(projectName); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => { setProjectName(draft.trim() || 'Untitled Project'); setEditing(false); };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-edge bg-surface-1/80 backdrop-blur-xl px-4 z-10">
        {/* Left — logo */}
        <div className="flex items-center gap-2.5 w-40">
          <RecutMark />
          <span className="text-sm font-semibold tracking-tight text-ink-1">Recut</span>
        </div>

        {/* Center — project name */}
        <div className="flex items-center gap-1.5">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(projectName); setEditing(false); } }}
                autoFocus
                className="h-7 w-52 rounded-lg bg-surface-3 px-3 text-center text-sm font-medium text-ink-1 outline-none ring-1 ring-accent/60"
              />
              <button onClick={commit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors">
                <Check size={12} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-1 hover:bg-surface-2 transition-colors"
            >
              {projectName}
              <Pencil size={11} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Right — export */}
        <div className="flex items-center gap-2 w-40 justify-end">
          <button
            onClick={() => setExportOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            <Download size={13} strokeWidth={2} />
            Export
          </button>
        </div>
      </header>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}

function RecutMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#F5F5F7" />
      <rect x="13" y="2" width="9" height="4" rx="1.5" fill="rgba(245,245,247,0.35)" />
      <rect x="13" y="8" width="9" height="3" rx="1.5" fill="rgba(245,245,247,0.2)" />
      <rect x="2" y="13" width="20" height="9" rx="2.5" fill="#0A84FF" opacity="0.9" />
    </svg>
  );
}
