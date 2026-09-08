'use client';

import type {ComponentPropsWithoutRef} from 'react';

import {
  type DiagnosticSeverity,
  HEALTH_BAND_META,
  healthBand,
} from '@/lib/demos/catalogue-health';

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-catalogue)',
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
  const accent = accentVar ?? 'var(--cat-catalogue)';
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
        borderColor:
          'color-mix(in srgb, var(--cat-catalogue) 30%, transparent)',
        background: 'color-mix(in srgb, var(--cat-catalogue) 7%, transparent)',
      }}>
      {children}
    </div>
  );
}

/** Horizontal bar showing matched vs unmatched percentage. */
export function MatchRateBar({
  matchedPct,
  colorVar,
}: {
  matchedPct: number;
  colorVar?: string;
}) {
  const clamped = Math.max(0, Math.min(100, matchedPct));
  const color =
    colorVar ??
    (clamped >= 85
      ? 'var(--green)'
      : clamped >= 60
        ? 'var(--cat-measurement)'
        : 'var(--rose)');
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          background: color,
        }}
      />
      {/* 85% target marker */}
      <div
        className="absolute inset-y-0 w-px bg-ink-3"
        style={{left: '85%'}}
        aria-hidden
      />
    </div>
  );
}

/** Severity-coloured badge for diagnostics. */
export function DiagnosticBadge({severity}: {severity: DiagnosticSeverity}) {
  const isMustFix = severity === 'MUST_FIX';
  return (
    <Badge tone={isMustFix ? 'rose' : 'yellow'}>
      {isMustFix ? 'Must fix' : 'Opportunity'}
    </Badge>
  );
}

/** Circular gauge for product completeness percentage. */
export function CompletenessRing({
  pct,
  size = 72,
  stroke = 7,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (circumference * clamped) / 100;
  const color =
    clamped >= 90
      ? 'var(--green)'
      : clamped >= 70
        ? 'var(--cat-measurement)'
        : 'var(--rose)';

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
        style={{fontSize: size * 0.22}}>
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

/** Circular gauge for health score (0-100). */
export function HealthScoreRing({
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
  const band = healthBand(clamped);
  const color = HEALTH_BAND_META[band].colorVar;

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
        {clamped}
      </span>
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
