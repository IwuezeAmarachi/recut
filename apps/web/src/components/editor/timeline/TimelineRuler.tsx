'use client';
import { formatDuration } from '@/lib/utils';

interface TimelineRulerProps {
  pxPerSec: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function TimelineRuler({ pxPerSec, duration, onSeek }: TimelineRulerProps) {
  const totalWidth = Math.max(duration * pxPerSec + 200, 800);

  const tickInterval = pxPerSec >= 150 ? 0.5 : pxPerSec >= 80 ? 1 : pxPerSec >= 40 ? 2 : pxPerSec >= 20 ? 5 : 10;
  const labelEvery = pxPerSec >= 80 ? 5 : 10;

  const ticks: { time: number; isLabel: boolean }[] = [];
  const tickCount = Math.ceil(totalWidth / (tickInterval * pxPerSec)) + 1;
  for (let i = 0; i < tickCount; i++) {
    const time = i * tickInterval;
    const isLabel = Math.round(time / labelEvery) === time / labelEvery;
    ticks.push({ time, isLabel });
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / pxPerSec);
  };

  return (
    <div
      className="relative h-6 shrink-0 cursor-pointer select-none"
      style={{ width: totalWidth }}
      onClick={handleClick}
    >
      {ticks.map(({ time, isLabel }) => {
        const x = time * pxPerSec;
        return (
          <div key={time} className="absolute top-0 flex flex-col items-start" style={{ left: x }}>
            {/* Tick mark — dot for minor, line for major */}
            {isLabel ? (
              <div className="w-px bg-edge-strong" style={{ height: 8, marginTop: 0 }} />
            ) : (
              <div
                className="rounded-full bg-edge-strong"
                style={{ width: 1, height: 3, marginTop: 4 }}
              />
            )}
            {isLabel && (
              <span
                className="mt-0.5 whitespace-nowrap font-mono text-2xs tabular-nums"
                style={{ transform: 'translateX(-50%)', color: 'rgba(235,235,245,0.35)' }}
              >
                {formatDuration(time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
