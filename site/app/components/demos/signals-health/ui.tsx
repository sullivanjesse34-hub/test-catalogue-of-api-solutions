'use client';

import type {ComponentPropsWithoutRef} from 'react';

import {EMQ_BAND_META, emqBand} from '@/lib/demos/signals-health';

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

/** Circular gauge for an EMQ-style score out of 10, coloured by band. */
export function EmqRing({
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
  const clamped = Math.max(0, Math.min(10, score));
  const dash = (circumference * clamped) / 10;
  const color = EMQ_BAND_META[emqBand(clamped)].colorVar;

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
        style={{fontSize: size * 0.26}}>
        {clamped.toFixed(1)}
      </span>
    </div>
  );
}

/** A coverage bar with a goal marker (event_coverage.percentage vs goal). */
export function CoverageBar({
  pct,
  goalPct,
  colorVar,
}: {
  pct: number;
  goalPct?: number;
  colorVar?: string;
}) {
  const color =
    colorVar ??
    (goalPct != null && pct < goalPct ? 'var(--rose)' : 'var(--green)');
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
        }}
      />
      {goalPct != null ? (
        <div
          className="absolute inset-y-0 w-px bg-ink-3"
          style={{left: `${goalPct}%`}}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/** Horizontal server-vs-browser split for an event's volume (event_source). */
export function SourceSplitBar({
  serverCount,
  browserCount,
}: {
  serverCount: number;
  browserCount: number;
}) {
  const total = serverCount + browserCount;
  const serverPct = total === 0 ? 0 : (serverCount / total) * 100;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        style={{width: `${serverPct}%`, background: 'var(--cat-signals)'}}
        aria-hidden
      />
      <div
        style={{width: `${100 - serverPct}%`, background: 'var(--purple)'}}
        aria-hidden
      />
    </div>
  );
}

export function IconButton(props: ComponentPropsWithoutRef<'button'>) {
  const {className, ...rest} = props;
  return (
    <button
      type="button"
      className={[
        'grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}
