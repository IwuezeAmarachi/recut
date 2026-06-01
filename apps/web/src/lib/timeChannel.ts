// High-frequency time updates via custom events to avoid React re-renders at 60fps.
// Zustand is only updated at ~10fps; the playhead and timecode move via direct DOM.

const EVENT = 'recut:time';

export function emitTime(t: number): void {
  window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: t }));
}

export function onTime(cb: (t: number) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<number>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
