'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import type { VideoBackgroundType } from '@/types/editor';

// ── Scene presets ─────────────────────────────────────────────────────────────
const SCENES = [
  { name: 'Void',    from: '#050505', to: '#141414', angle: 135 },
  { name: 'Slate',   from: '#0f172a', to: '#1e293b', angle: 150 },
  { name: 'Grape',   from: '#1e1b4b', to: '#4338ca', angle: 135 },
  { name: 'Ocean',   from: '#0c4a6e', to: '#082f49', angle: 135 },
  { name: 'Ember',   from: '#450a0a', to: '#7f1d1d', angle: 145 },
  { name: 'Jungle',  from: '#052e16', to: '#14532d', angle: 135 },
  { name: 'Iris',    from: '#312e81', to: '#1d4ed8', angle: 155 },
  { name: 'Storm',   from: '#111827', to: '#374151', angle: 160 },
  { name: 'Plum',    from: '#3b0764', to: '#6b21a8', angle: 135 },
  { name: 'Onyx',    from: '#09090b', to: '#1c1c1e', angle: 180 },
  { name: 'Amber',   from: '#451a03', to: '#92400e', angle: 135 },
  { name: 'Custom',  from: '',        to: '',         angle: 135 },
] as const;

type SceneName = typeof SCENES[number]['name'];

export function BackgroundPanel() {
  const bg = useEditorStore((s) => s.videoBackground);
  const setBg = useEditorStore((s) => s.setVideoBackground);

  const [activeMode, setActiveMode] = useState<VideoBackgroundType>(bg.type === 'none' ? 'gradient' : bg.type);
  const [activeScene, setActiveScene] = useState<SceneName>('Slate');

  const isEnabled = bg.type !== 'none';

  const toggle = () => {
    if (isEnabled) {
      setBg({ type: 'none' });
    } else {
      applyMode(activeMode);
    }
  };

  const applyMode = (mode: VideoBackgroundType) => {
    setActiveMode(mode);
    if (mode === 'gradient') {
      const scene = SCENES.find((s) => s.name === activeScene) ?? SCENES[1];
      if (scene.name === 'Custom') {
        setBg({ type: 'gradient' });
      } else {
        setBg({ type: 'gradient', gradientFrom: scene.from, gradientTo: scene.to, gradientAngle: scene.angle });
      }
    } else {
      setBg({ type: mode });
    }
  };

  const pickScene = (scene: typeof SCENES[number]) => {
    setActiveScene(scene.name as SceneName);
    if (scene.name !== 'Custom') {
      setBg({ type: 'gradient', gradientFrom: scene.from, gradientTo: scene.to, gradientAngle: scene.angle });
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">

      {/* ── Enable toggle ── */}
      <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-ink-1">Video Background</p>
          <p className="mt-0.5 text-2xs text-ink-3">Frame your recording in a scene</p>
        </div>
        <button
          role="switch"
          aria-checked={isEnabled}
          onClick={toggle}
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
            onClick={() => applyMode(mode)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-2xs font-semibold capitalize transition-colors duration-150',
              activeMode === mode
                ? 'bg-surface-4 text-ink-1 shadow-sm'
                : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── Gradient: scene picker ── */}
      {activeMode === 'gradient' && (
        <div className="space-y-2">
          <p className="px-1 text-2xs font-semibold uppercase tracking-widest text-ink-3">Scenes</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SCENES.map((scene) => {
              const isSelected = activeScene === scene.name && isEnabled && bg.type === 'gradient';
              const isCustom = scene.name === 'Custom';

              return (
                <button
                  key={scene.name}
                  onClick={() => pickScene(scene)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl transition-all duration-150',
                    isSelected
                      ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg'
                      : 'ring-1 ring-white/5 hover:ring-white/20',
                  )}
                  style={{ aspectRatio: '3/2' }}
                >
                  {/* Preview */}
                  <div
                    className="absolute inset-0"
                    style={
                      isCustom
                        ? { background: `linear-gradient(135deg, ${bg.gradientFrom || '#1a1a2e'} 0%, ${bg.gradientTo || '#302b63'} 100%)` }
                        : { background: `linear-gradient(${scene.angle}deg, ${scene.from}, ${scene.to})` }
                    }
                  />
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                  {/* Name */}
                  <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1 pt-3 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-2xs font-medium text-white/90 leading-none">{scene.name}</p>
                  </div>
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom gradient colors (shown when Custom is selected) */}
          {activeScene === 'Custom' && (
            <div className="rounded-xl bg-surface-2 p-3 space-y-2">
              <p className="text-2xs font-medium text-ink-3">Custom Gradient</p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <div
                    className="h-7 w-7 rounded-lg border border-edge-strong flex-shrink-0"
                    style={{ background: bg.gradientFrom }}
                  />
                  <div className="flex-1">
                    <p className="text-2xs text-ink-3">From</p>
                    <input
                      type="color" value={bg.gradientFrom}
                      onChange={(e) => setBg({ gradientFrom: e.target.value, type: 'gradient' })}
                      className="h-0 w-0 opacity-0 absolute"
                    />
                  </div>
                </label>
                <div className="h-px w-4 bg-edge-strong" />
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <div
                    className="h-7 w-7 rounded-lg border border-edge-strong flex-shrink-0"
                    style={{ background: bg.gradientTo }}
                  />
                  <div className="flex-1">
                    <p className="text-2xs text-ink-3">To</p>
                    <input
                      type="color" value={bg.gradientTo}
                      onChange={(e) => setBg({ gradientTo: e.target.value, type: 'gradient' })}
                      className="h-0 w-0 opacity-0 absolute"
                    />
                  </div>
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs text-ink-3">Angle</p>
                  <span className="text-2xs text-ink-2 tabular-nums">{bg.gradientAngle}°</span>
                </div>
                <input
                  type="range" min={0} max={360} step={5} value={bg.gradientAngle}
                  onChange={(e) => setBg({ gradientAngle: parseInt(e.target.value) })}
                  className="w-full cursor-pointer"
                  style={{ accentColor: '#0A84FF' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Solid: color picker ── */}
      {activeMode === 'solid' && (
        <div className="rounded-xl bg-surface-2 p-3 space-y-3">
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-3">Color</p>
          <div className="flex flex-wrap gap-2">
            {['#000000','#0f172a','#1e1b4b','#0c4a6e','#052e16','#450a0a','#3b0764','#111827'].map((c) => (
              <button
                key={c}
                onClick={() => setBg({ type: 'solid', color: c })}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 transition-all',
                  bg.type === 'solid' && bg.color === c
                    ? 'border-accent scale-110'
                    : 'border-transparent hover:border-white/20',
                )}
                style={{ background: c }}
              />
            ))}
            <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-edge bg-surface-3 text-2xs text-ink-3 hover:border-edge-strong hover:text-ink-2 transition-colors">
              +
              <input
                type="color" value={bg.color}
                onChange={(e) => setBg({ type: 'solid', color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Frame controls (always shown when enabled) ── */}
      {isEnabled && (
        <div className="rounded-2xl bg-surface-2 px-4 py-3 space-y-4">
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-3">Frame</p>

          {/* Padding */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-2">Padding</p>
              <span className="text-2xs text-ink-2 tabular-nums">{bg.padding}%</span>
            </div>
            <div className="relative h-1.5 cursor-pointer rounded-full bg-surface-3">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent/70"
                style={{ width: `${(bg.padding / 15) * 100}%` }}
              />
              <input
                type="range" min={0} max={15} step={0.5} value={bg.padding}
                onChange={(e) => setBg({ padding: parseFloat(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Corner radius */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-2">Corner Radius</p>
              <span className="text-2xs text-ink-2 tabular-nums">{bg.cornerRadius}px</span>
            </div>
            <div className="relative h-1.5 cursor-pointer rounded-full bg-surface-3">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent/70"
                style={{ width: `${(bg.cornerRadius / 24) * 100}%` }}
              />
              <input
                type="range" min={0} max={24} step={1} value={bg.cornerRadius}
                onChange={(e) => setBg({ cornerRadius: parseInt(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Corner preview */}
            <div className="mt-3 flex items-center gap-2">
              {[0, 4, 8, 16, 24].map((r) => (
                <button
                  key={r}
                  onClick={() => setBg({ cornerRadius: r })}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center border transition-colors',
                    bg.cornerRadius === r ? 'border-accent' : 'border-edge hover:border-edge-strong',
                  )}
                  style={{ borderRadius: r }}
                >
                  <div
                    className="h-3 w-3 bg-ink-3"
                    style={{ borderRadius: r * 0.5 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
