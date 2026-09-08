'use client';

import type {DailyRow} from '@/lib/demos/insights-data-warehouse-dashboard';

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
  const accent = accentVar ?? 'var(--cat-signals)';
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
        borderColor: 'color-mix(in srgb, var(--cat-signals) 30%, transparent)',
        background: 'color-mix(in srgb, var(--cat-signals) 7%, transparent)',
      }}>
      {children}
    </div>
  );
}

/** A dependency-free inline SVG line chart of a daily metric. */
export function TimeSeriesChart({
  rows,
  value,
  colorVar = 'var(--cat-signals)',
  height = 160,
  label,
}: {
  rows: DailyRow[];
  value: (r: DailyRow) => number;
  colorVar?: string;
  height?: number;
  label?: string;
}) {
  const w = 720;
  const h = height;
  const padX = 6;
  const padY = 12;
  const values = rows.map(value);
  const max = Math.max(1, ...values);
  const n = rows.length;

  const x = (i: number) =>
    n <= 1 ? padX : padX + (i / (n - 1)) * (w - padX * 2);
  const y = (v: number) => padY + (1 - v / max) * (h - padY * 2);

  const linePts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${padX},${h - padY} ${linePts} ${w - padX},${h - padY}`;
  const gradId = `ts-grad-${label ?? 'metric'}`.replace(/\s+/g, '-');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ? `${label} time series` : 'time series'}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorVar} stopOpacity="0.28" />
          <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line
          key={f}
          x1={padX}
          x2={w - padX}
          y1={padY + f * (h - padY * 2)}
          y2={padY + f * (h - padY * 2)}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline
        points={linePts}
        fill="none"
        stroke={colorVar}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A horizontal breakdown bar (segment share of the max). */
export function BreakdownBar({
  pct,
  colorVar = 'var(--cat-signals)',
}: {
  pct: number;
  colorVar?: string;
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: colorVar,
        }}
      />
    </div>
  );
}

/** Thin progress bar used for async report completion. */
export function ProgressBar({
  pct,
  colorVar = 'var(--cat-signals)',
}: {
  pct: number;
  colorVar?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: colorVar,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}
