'use client';

import {
  Activity,
  ExternalLink,
  Film,
  LayoutGrid,
  type LucideIcon,
  Music,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import {
  LEVEL_LABEL,
  type Recommendation,
  type RecType,
} from '@/lib/demos/opportunity-score';

export const REC_ICON: Record<RecType, LucideIcon> = {
  ADVANTAGE_PLUS_AUDIENCE: Users,
  AUTOMATIC_PLACEMENTS: LayoutGrid,
  CREATIVE_FATIGUE: RefreshCw,
  SCALE_GOOD_CAMPAIGN: TrendingUp,
  MUSIC: Music,
  PERFORMANT_CREATIVE_REELS_OPT_IN: Film,
  SIGNALS_GROWTH_CAPI_V2: Activity,
  BACKGROUND_GENERATION: Sparkles,
};

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--brand-ink)',
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
        borderColor: 'color-mix(in srgb, var(--brand) 25%, transparent)',
        background: 'color-mix(in srgb, var(--brand) 6%, transparent)',
      }}>
      {children}
    </div>
  );
}

export function DeltaPill({delta}: {delta: number}) {
  if (delta === 0) {
    return <span className="text-[12px] font-semibold text-ink-3">±0</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 text-[12px] font-semibold',
        up ? 'text-[color:var(--green)]' : 'text-[color:var(--rose)]',
      ].join(' ')}>
      {up ? (
        <TrendingUp className="size-3.5" />
      ) : (
        <TrendingDown className="size-3.5" />
      )}
      {up ? '+' : ''}
      {delta}
    </span>
  );
}

export function RecCard({
  rec,
  onAdopt,
}: {
  rec: Recommendation;
  onAdopt: () => void;
}) {
  const Icon = REC_ICON[rec.type];
  const oneClick = rec.applyMode === 'one_click';
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{
            color: 'var(--cat-foundational)',
            background:
              'color-mix(in srgb, var(--cat-foundational) 12%, transparent)',
          }}
          aria-hidden>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{rec.title}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {LEVEL_LABEL[rec.level]}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-3">{rec.objectName}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {rec.body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[13px] font-medium text-ink">
              {rec.liftEstimate}
            </span>
            <span className="text-[13px] font-medium text-[color:var(--green)]">
              +{rec.scoreLift} score
            </span>
            <button
              type="button"
              onClick={onAdopt}
              className={[
                'ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                oneClick
                  ? 'bg-brand text-on-brand hover:opacity-90'
                  : 'border border-border-strong text-ink hover:bg-surface-2',
              ].join(' ')}>
              {oneClick ? (
                <>
                  <Zap className="size-4" /> Apply
                </>
              ) : (
                <>
                  <ExternalLink className="size-4" /> Ads Manager
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
