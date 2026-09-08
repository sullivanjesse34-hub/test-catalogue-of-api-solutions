'use client';

import type {CheckStatus} from '@/lib/demos/leads-retrieval-set-up-checker';

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-signals)',
  green: 'var(--green)',
  purple: 'var(--purple)',
  rose: 'var(--rose)',
  yellow: 'var(--cat-measurement)',
  muted: 'var(--ink-3)',
};

export const STATUS_TONE: Record<CheckStatus, Tone> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'rose',
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

const CHECK_STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--green)',
  warn: 'var(--cat-measurement)',
  fail: 'var(--rose)',
};

/**
 * A horizontal step-progress rail for the ordered setup stages. Each dot is
 * coloured by its check status; the connector fills up to the last passing step.
 */
export function StageRail({
  steps,
}: {
  steps: Array<{label: string; status: CheckStatus}>;
}) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const color = CHECK_STATUS_COLOR[step.status];
        const last = i === steps.length - 1;
        return (
          <div
            key={step.label}
            className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className="grid size-6 place-items-center rounded-full text-[11px] font-bold"
                style={{
                  color: '#fff',
                  background: color,
                }}>
                {step.status === 'pass' ? '✓' : i + 1}
              </span>
              <span className="whitespace-nowrap text-[10px] font-medium text-ink-3">
                {step.label}
              </span>
            </div>
            {last ? null : (
              <div
                className="mx-1 mb-4 h-0.5 flex-1 rounded-full"
                style={{
                  background:
                    step.status === 'pass' ? 'var(--green)' : 'var(--border)',
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A compact circular readiness gauge: passed / total checks. */
export function ReadinessRing({
  passed,
  total,
  size = 72,
  stroke = 7,
}: {
  passed: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = total === 0 ? 0 : passed / total;
  const dash = circumference * ratio;
  const color =
    ratio >= 1
      ? 'var(--green)'
      : ratio >= 0.6
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
        style={{fontSize: size * 0.24}}>
        {passed}/{total}
      </span>
    </div>
  );
}
