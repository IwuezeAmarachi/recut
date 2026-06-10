'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';

// ── Scene presets — vivid AND dark so creators have real choice ───────────────
const VIVID_SCENES = [
  { name: 'Candy',   from: '#f953c6', to: '#b91d73', angle: 135 },
  { name: 'Sunset',  from: '#f7971e', to: '#ffd200', angle: 135 },
  { name: 'Electric',from: '#4776e6', to: '#8e54e9', angle: 135 },
  { name: 'Aurora',  from: '#00c6ff', to: '#0072ff', angle: 135 },
  { name: 'Fire',    from: '#f12711', to: '#f5af19', angle: 135 },
  { name: 'Neon',    from: '#a8ff78', to: '#78ffd6', angle: 135 },
  { name: 'Berry',   from: '#ee0979', to: '#ff6a00', angle: 135 },
  { name: 'Sky',     from: '#56ccf2', to: '#2f80ed', angle: 135 },
  { name: 'Spring',  from: '#96fbc4', to: '#f9f586', angle: 135 },
  { name: 'Rose',    from: '#f6d365', to: '#fda085', angle: 135 },
] as const;

const DARK_SCENES = [
  { name: 'Void',    from: '#050505', to: '#141414', angle: 135 },
  { name: 'Slate',   from: '#0f172a', to: '#1e293b', angle: 150 },
  { name: 'Grape',   from: '#1e1b4b', to: '#4338ca', angle: 135 },
  { name: 'Ocean',   from: '#0c4a6e', to: '#082f49', angle: 135 },
  { name: 'Ember',   from: '#450a0a', to: '#7f1d1d', angle: 145 },
  { name: 'Jungle',  from: '#052e16', to: '#14532d', angle: 135 },
  { name: 'Storm',   from: '#111827', to: '#374151', angle: 160 },
  { name: 'Plum',    from: '#3b0764', to: '#6b21a8', angle: 135 },
  { name: 'Onyx',    from: '#09090b', to: '#1c1c1e', angle: 180 },
  { name: 'Amber',   from: '#451a03', to: '#92400e', angle: 135 },
] as const;

type AnyScene = typeof VIVID_SCENES[number] | typeof DARK_SCENES[number];

const SOLID_COLORS = [
  '#ffffff', '#f8fafc', '#fef9c3', '#fef3c7',
  '#fce7f3', '#ede9fe', '#dbeafe', '#dcfce7',
  '#000000', '#18181b', '#1e293b', '#1e1b4b',
  '#7c3aed', '#2563eb', '#db2777', '#dc2626',
  '#16a34a', '#d97706', '#0891b2', '#9333ea',
];

export function BackgroundPanel() {
  const bg = useEditorStore((s) => s.videoBackground);
  const setBg = useEditorStore((s) => s.setVideoBackground);

  const [tab, setTab] = useState<'gradient' | 'solid'>('gradient');

  const isEnabled = bg.type !== 'none';

  const toggle = () => {
    if (isEnabled) {
      setBg({ type: 'none' });
    } else {
      if (tab === 'solid') {
        setBg({ type: 'solid' });
      } else {
        setBg({ type: 'gradient' });
      }
    }
  };

  const pickScene = (scene: AnyScene) => {
    setBg({ type: 'gradient', gradientFrom: scene.from, gradientTo: scene.to, gradientAngle: scene.angle });
  };

  const isSceneActive = (scene: AnyScene) =>
    isEnabled &&
    bg.type === 'gradient' &&
    bg.gradientFrom === scene.from &&
    bg.gradientTo === scene.to;

  return (
    <div className="flex flex-col gap-3 p-4">

      {/* ── Toggle ── */}
      <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-ink-1">Video Background</p>
          <p className="mt-0.5 text-2xs text-ink-3">Frame your recording in a scene</p>
        </div>
        <button
          role="switch" aria-checked={isEnabled} onClick={toggle}
          className={cn(
            'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
            isEnabled ? 'bg-accent' : 'bg-surface-4',
          )}
        >
          <span className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
            isEnabled ? 'translate-x-5' : 'translate-x-1',
          )} />
        </button>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {(['gradient', 'solid'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setTab(mode);
              if (isEnabled) setBg({ type: mode });
            }}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-2xs font-semibold capitalize transition-colors duration-150',
              tab === mode ? 'bg-surface-4 text-ink-1 shadow-sm' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── GRADIENT mode ── */}
      {tab === 'gradient' && (
        <div className="space-y-3">

          {/* Vivid section */}
          <div>
            <p className="mb-1.5 px-0.5 text-2xs font-semibold uppercase tracking-widest text-ink-3">Vivid</p>
            <div className="grid grid-cols-5 gap-1.5">
              {VIVID_SCENES.map((scene) => (
                <SceneCard
                  key={scene.name}
                  scene={scene}
                  active={isSceneActive(scene)}
                  onClick={() => pickScene(scene)}
                />
              ))}
            </div>
          </div>

          {/* Dark section */}
          <div>
            <p className="mb-1.5 px-0.5 text-2xs font-semibold uppercase tracking-widest text-ink-3">Dark</p>
            <div className="grid grid-cols-5 gap-1.5">
              {DARK_SCENES.map((scene) => (
                <SceneCard
                  key={scene.name}
                  scene={scene}
                  active={isSceneActive(scene)}
                  onClick={() => pickScene(scene)}
                />
              ))}
            </div>
          </div>

          {/* Custom gradient — always visible */}
          <div className="rounded-xl bg-surface-2 p-3 space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-3">Custom</p>
            <div className="flex items-center gap-2">
              {/* From color */}
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg bg-surface-3 px-2.5 py-2 border border-edge hover:border-edge-strong transition-colors">
                <div className="h-5 w-5 shrink-0 rounded-md border border-edge-strong" style={{ background: bg.gradientFrom }} />
                <span className="flex-1 text-2xs text-ink-3">From</span>
                <input
                  type="color" value={bg.gradientFrom}
                  onChange={(e) => setBg({ type: 'gradient', gradientFrom: e.target.value })}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0 opacity-0 absolute"
                />
              </label>
              <span className="text-ink-3 text-xs">→</span>
              {/* To color */}
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg bg-surface-3 px-2.5 py-2 border border-edge hover:border-edge-strong transition-colors">
                <div className="h-5 w-5 shrink-0 rounded-md border border-edge-strong" style={{ background: bg.gradientTo }} />
                <span className="flex-1 text-2xs text-ink-3">To</span>
                <input
                  type="color" value={bg.gradientTo}
                  onChange={(e) => setBg({ type: 'gradient', gradientTo: e.target.value })}
                  className="h-5 w-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0 opacity-0 absolute"
                />
              </label>
            </div>
            {/* Preview strip */}
            <div
              className="h-6 w-full rounded-lg border border-edge"
              style={{ background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` }}
            />
            {/* Angle */}
            <div className="flex items-center gap-3">
              <span className="text-2xs text-ink-3 w-10">Angle</span>
              <input
                type="range" min={0} max={360} step={5} value={bg.gradientAngle}
                onChange={(e) => setBg({ gradientAngle: parseInt(e.target.value), type: 'gradient' })}
                className="flex-1 cursor-pointer"
                style={{ accentColor: '#0A84FF' }}
              />
              <span className="text-2xs text-ink-2 tabular-nums w-8 text-right">{bg.gradientAngle}°</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLID mode ── */}
      {tab === 'solid' && (
        <div className="rounded-xl bg-surface-2 p-3 space-y-3">
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-3">Color</p>
          <div className="grid grid-cols-5 gap-2">
            {SOLID_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setBg({ type: 'solid', color: c })}
                className={cn(
                  'h-9 w-full rounded-lg border-2 transition-all hover:scale-105',
                  bg.type === 'solid' && bg.color === c
                    ? 'border-accent scale-110 shadow-md'
                    : 'border-transparent hover:border-white/20',
                  c === '#ffffff' || c === '#f8fafc' ? 'ring-1 ring-edge' : '',
                )}
                style={{ background: c }}
              />
            ))}
            {/* Custom color picker */}
            <label className="relative flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-edge bg-surface-3 text-xs text-ink-3 hover:border-edge-strong transition-colors">
              +
              <input
                type="color" value={bg.type === 'solid' ? bg.color : '#000000'}
                onChange={(e) => setBg({ type: 'solid', color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          {/* Active color preview */}
          {bg.type === 'solid' && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-3 px-3 py-2">
              <div className="h-5 w-5 rounded-md border border-edge-strong" style={{ background: bg.color }} />
              <span className="font-mono text-2xs text-ink-2 uppercase">{bg.color}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Frame controls ── */}
      {isEnabled && (
        <div className="rounded-2xl bg-surface-2 px-4 py-3 space-y-4">
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-3">Frame</p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-2">Padding</p>
              <span className="text-2xs text-ink-2 tabular-nums">{bg.padding}%</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-3">
              <div className="absolute left-0 top-0 h-full rounded-full bg-accent/70" style={{ width: `${(bg.padding / 15) * 100}%` }} />
              <input type="range" min={0} max={15} step={0.5} value={bg.padding}
                onChange={(e) => setBg({ padding: parseFloat(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-2">Corner Radius</p>
              <span className="text-2xs text-ink-2 tabular-nums">{bg.cornerRadius}px</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-3">
              <div className="absolute left-0 top-0 h-full rounded-full bg-accent/70" style={{ width: `${(bg.cornerRadius / 24) * 100}%` }} />
              <input type="range" min={0} max={24} step={1} value={bg.cornerRadius}
                onChange={(e) => setBg({ cornerRadius: parseInt(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {[0, 6, 12, 18, 24].map((r) => (
                <button key={r} onClick={() => setBg({ cornerRadius: r })}
                  className={cn(
                    'flex h-6 flex-1 items-center justify-center border transition-colors text-2xs',
                    bg.cornerRadius === r ? 'border-accent text-accent' : 'border-edge text-ink-3 hover:border-edge-strong',
                  )}
                  style={{ borderRadius: Math.max(3, r * 0.5) }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneCard({
  scene, active, onClick,
}: {
  scene: AnyScene; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={scene.name}
      className={cn(
        'group relative overflow-hidden rounded-xl transition-all duration-150',
        active ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg' : 'ring-1 ring-white/5 hover:ring-white/25',
      )}
      style={{ aspectRatio: '1/1' }}
    >
      <div className="absolute inset-0" style={{ background: `linear-gradient(${scene.angle}deg, ${scene.from}, ${scene.to})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <p className="absolute bottom-0 inset-x-0 pb-1 text-center text-[9px] font-medium text-white/90 leading-none">
        {scene.name}
      </p>
      {active && (
        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent shadow-sm">
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M1 2.5L2.5 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
