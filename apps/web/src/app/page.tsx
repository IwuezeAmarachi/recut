'use client';
import { UploadZone } from '@/components/home/UploadZone';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-edge px-6">
        <div className="flex items-center gap-2.5">
          <RecutMark />
          <span className="text-sm font-semibold tracking-tight text-ink-1">Recut</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <RecutMark size={40} />
          </div>
          <h1
            className="text-3xl font-semibold tracking-tight text-ink-1"
            style={{ fontVariationSettings: "'opsz' 32" }}
          >
            AI video editing, simplified.
          </h1>
          <p className="mt-2.5 text-sm text-ink-3">
            Trim, cut, denoise and export at 1080p or 2K — no complexity.
          </p>
        </div>

        <UploadZone />

        <div className="mt-8 flex items-center gap-6 text-2xs text-ink-3">
          <FeaturePill label="AI Noise Reduction" />
          <FeaturePill label="1080p & 2K Export" />
          <FeaturePill label="H.264 / H.265" />
        </div>
      </main>
    </div>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1 w-1 rounded-full bg-ink-3" />
      <span>{label}</span>
    </div>
  );
}

function RecutMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#EBEBEB" />
      <rect x="13" y="2" width="9" height="4" rx="1.5" fill="#555555" />
      <rect x="13" y="8" width="9" height="3" rx="1.5" fill="#333333" />
      <rect x="2" y="13" width="20" height="9" rx="2" fill="#282828" />
      <rect x="5" y="16" width="6" height="3" rx="1" fill="#555555" />
    </svg>
  );
}
