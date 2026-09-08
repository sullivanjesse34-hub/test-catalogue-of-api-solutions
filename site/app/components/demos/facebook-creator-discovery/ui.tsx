'use client';

import type {FollowersGenders} from '@/lib/demos/facebook-creator-discovery';

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-performance)',
  green: 'var(--green)',
  purple: 'var(--cat-creators)',
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
  const accent = accentVar ?? 'var(--cat-creators)';
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
        borderColor: 'color-mix(in srgb, var(--cat-creators) 30%, transparent)',
        background: 'color-mix(in srgb, var(--cat-creators) 7%, transparent)',
      }}>
      {children}
    </div>
  );
}

/** Avatar chip built from a creator's initials — no external image loads. */
export function Avatar({name, size = 44}: {name: string; size?: number}) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-on-brand"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background:
          'linear-gradient(135deg, var(--cat-creators), var(--cat-performance))',
      }}
      aria-hidden>
      {initials}
    </div>
  );
}

/** A labelled horizontal meter (0–max) for a single metric. */
export function Meter({
  pct,
  colorVar = 'var(--cat-creators)',
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
        }}
      />
    </div>
  );
}

/** Stacked audience gender split bar (followers_genders). */
export function GenderSplitBar({genders}: {genders: FollowersGenders}) {
  const segments: Array<{pct: number; color: string; label: string}> = [
    {pct: genders.female, color: 'var(--rose)', label: 'Female'},
    {pct: genders.male, color: 'var(--cat-performance)', label: 'Male'},
    {pct: genders.unknown, color: 'var(--ink-3)', label: 'Unknown'},
  ];
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      {segments.map(s => (
        <div
          key={s.label}
          style={{width: `${s.pct}%`, background: s.color}}
          title={`${s.label} ${s.pct}%`}
          aria-hidden
        />
      ))}
    </div>
  );
}

/**
 * Dependency-free inline-SVG radial gauge for a 0–100 score (brand safety),
 * coloured by the caller.
 */
export function ScoreRing({
  score,
  colorVar,
  size = 64,
  stroke = 6,
}: {
  score: number;
  colorVar: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (circumference * clamped) / 100;

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
          stroke={colorVar}
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
        {Math.round(clamped)}
      </span>
    </div>
  );
}
