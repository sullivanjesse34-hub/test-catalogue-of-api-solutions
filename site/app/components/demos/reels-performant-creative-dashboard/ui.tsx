'use client';

import {
  BAND_META,
  scoreBand,
} from '@/lib/demos/reels-performant-creative-dashboard';

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-signals)',
  green: 'var(--green)',
  purple: 'var(--purple)',
  rose: 'var(--rose)',
  yellow: 'var(--cat-measurement)',
  muted: 'var(--ink-3)',
};

export function Badge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  const color = TONE_COLOR[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}>
      {children}
    </span>
  );
}

export function Kpi({
  label,
  value,
  note,
  noteTone = 'muted',
  accentVar,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  noteTone?: 'up' | 'down' | 'muted';
  accentVar?: string;
  icon?: React.ReactNode;
}) {
  const accent = accentVar ?? 'var(--cat-creative)';
  const noteColor =
    noteTone === 'up'
      ? 'text-[color:var(--green)]'
      : noteTone === 'down'
        ? 'text-[color:var(--rose)]'
        : 'text-ink-3';
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow duration-200 hover:shadow-[0_12px_30px_-20px_rgba(20,30,50,0.4)]">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{
          color: accent,
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        }}
        aria-hidden>
        {icon ?? (
          <span
            className="size-2.5 rounded-full"
            style={{background: accent}}
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-ink">
          {value}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
          {label}
        </p>
        {note ? (
          <p className={`mt-0.5 text-[11px] font-medium ${noteColor}`}>
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SectionHeading({title, sub}: {title: string; sub?: string}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {sub ? <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p> : null}
    </div>
  );
}

export function Insight({children}: {children: React.ReactNode}) {
  return (
    <div
      className="rounded-lg border p-3 text-[13px] leading-relaxed text-ink-2"
      style={{
        borderColor: 'color-mix(in srgb, var(--cat-creative) 30%, transparent)',
        background: 'color-mix(in srgb, var(--cat-creative) 7%, transparent)',
      }}>
      {children}
    </div>
  );
}

/** Circular gauge for a performance score out of 100, coloured by band. */
export function ScoreRing({
  score,
  size = 72,
  stroke = 7,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (circumference * clamped) / 100;
  const color = BAND_META[scoreBand(clamped)].colorVar;

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{width: size, height: size}}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transition: 'stroke-dasharray 450ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums text-ink"
        style={{fontSize: size * 0.28}}>
        {clamped}
      </span>
    </div>
  );
}

/**
 * A 9:16 phone frame that renders a reel preview with a shaded bottom safe
 * zone. Purely presentational — communicates the aspect-ratio + safe-zone
 * checks visually.
 */
export function ReelPreview({
  aspectRatio,
  bottomClearPct,
  audioOn,
  videoEnabled,
  width = 96,
}: {
  aspectRatio: string;
  bottomClearPct: number;
  audioOn: boolean;
  videoEnabled: boolean;
  width?: number;
}) {
  const height = Math.round((width * 16) / 9);
  const isVertical = aspectRatio === '9:16';
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
      style={{width, height}}>
      {/* The media area — a non-9:16 ratio leaves letterbox bars visible. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded"
        style={{
          width: isVertical ? '100%' : '78%',
          height: isVertical ? '100%' : '66%',
          background: videoEnabled
            ? 'linear-gradient(160deg, color-mix(in srgb, var(--purple) 45%, transparent), color-mix(in srgb, var(--rose) 45%, transparent))'
            : 'color-mix(in srgb, var(--ink-3) 25%, transparent)',
        }}
        aria-hidden
      />
      {/* Bottom safe-zone band — green when it meets the goal, amber otherwise. */}
      <div
        className="absolute inset-x-0 bottom-0 border-t border-dashed"
        style={{
          height: `${Math.max(0, Math.min(100, bottomClearPct))}%`,
          borderColor: 'color-mix(in srgb, var(--ink) 40%, transparent)',
          background:
            bottomClearPct >= 35
              ? 'color-mix(in srgb, var(--green) 22%, transparent)'
              : 'color-mix(in srgb, var(--cat-measurement) 22%, transparent)',
        }}
        aria-hidden
      />
      <span
        className="absolute left-1 top-1 rounded px-1 text-[9px] font-semibold text-[color:var(--surface)]"
        style={{background: 'color-mix(in srgb, var(--ink) 70%, transparent)'}}>
        {aspectRatio}
      </span>
      <span className="absolute right-1 top-1 text-[10px]" aria-hidden>
        {audioOn ? '🔊' : '🔇'}
      </span>
    </div>
  );
}
