'use client';

import type {
  AdFormat,
  AdStatus,
  FeatureCategory,
} from '@/lib/demos/ai-creative-enhancer';

import {AD_FORMAT_LABELS, STATUS_META} from '@/lib/demos/ai-creative-enhancer';

// ---------------------------------------------------------------------------
// Shared tones (follows signals-health pattern)
// ---------------------------------------------------------------------------

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-signals)',
  green: 'var(--green)',
  purple: 'var(--purple)',
  rose: 'var(--rose)',
  yellow: 'var(--cat-measurement)',
  muted: 'var(--ink-3)',
};

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Kpi
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SectionHeading
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Insight
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AiBadge — small "AI" indicator for AI-powered features
// ---------------------------------------------------------------------------

export function AiBadge({size = 'sm'}: {size?: 'sm' | 'md'}) {
  const px =
    size === 'md' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-px text-[9px]';
  return (
    <span
      className={`inline-flex items-center rounded font-bold uppercase ${px}`}
      style={{
        color: 'var(--cat-creative)',
        background: 'color-mix(in srgb, var(--cat-creative) 14%, transparent)',
      }}>
      AI
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusPill — active / paused / draft status indicator
// ---------------------------------------------------------------------------

export function StatusPill({status}: {status: AdStatus}) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
      style={{
        color: meta.colorVar,
        background: `color-mix(in srgb, ${meta.colorVar} 14%, transparent)`,
      }}>
      <span
        className="size-1.5 rounded-full"
        style={{background: meta.colorVar}}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FeatureToggle — opt-in / opt-out toggle with AI badge and eligibility
// ---------------------------------------------------------------------------

export function FeatureToggle({
  label,
  category,
  enrolled,
  eligible,
  onChange,
  disabled,
}: {
  label: string;
  category: FeatureCategory;
  enrolled: boolean;
  eligible: boolean;
  onChange: (enrolled: boolean) => void;
  disabled?: boolean;
}) {
  const isAi = category === 'ai';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {isAi ? <AiBadge /> : null}
        <span className="truncate text-[13px] font-semibold text-ink">
          {label}
        </span>
        {!eligible ? (
          <span className="shrink-0 text-[10px] font-medium text-ink-3">
            Not eligible
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enrolled}
        aria-label={`${enrolled ? 'Opt out of' : 'Opt in to'} ${label}`}
        disabled={disabled ?? !eligible}
        onClick={() => {
          onChange(!enrolled);
        }}
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40"
        style={{
          background: enrolled
            ? isAi
              ? 'var(--cat-creative)'
              : 'var(--brand)'
            : 'var(--surface-2)',
        }}>
        <span
          className="block size-3.5 rounded-full bg-white shadow transition-transform"
          style={{
            transform: enrolled ? 'translateX(17px)' : 'translateX(3px)',
          }}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreviewFrame — mock preview placeholder with format label
// ---------------------------------------------------------------------------

const FORMAT_ASPECT: Record<AdFormat, string> = {
  MOBILE_FEED_STANDARD: 'aspect-square',
  INSTAGRAM_REELS: 'aspect-[9/16]',
  INSTAGRAM_STORY: 'aspect-[9/16]',
};

export function PreviewFrame({
  format,
  featureLabel,
  eligible,
}: {
  format: AdFormat;
  featureLabel: string;
  eligible: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink">
          {AD_FORMAT_LABELS[format]}
        </span>
        {eligible ? (
          <Badge tone="green">Eligible</Badge>
        ) : (
          <Badge tone="muted">Not eligible</Badge>
        )}
      </div>
      <div
        className={`${FORMAT_ASPECT[format]} max-h-[260px] w-full`}
        style={{
          background: eligible
            ? 'color-mix(in srgb, var(--cat-creative) 8%, var(--surface-2))'
            : 'var(--surface-2)',
        }}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4">
          <span className="text-[11px] font-medium text-ink-3">
            Preview placeholder
          </span>
          <span className="text-[10px] text-ink-3">{featureLabel}</span>
        </div>
      </div>
    </div>
  );
}
