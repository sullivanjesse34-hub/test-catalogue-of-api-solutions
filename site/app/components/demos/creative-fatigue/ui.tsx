'use client';

import type {
  AlertStatus,
  FatigueSource,
  WebhookConnectionState,
} from '@/lib/demos/creative-fatigue';

import {
  SOURCE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from '@/lib/demos/creative-fatigue';

// ---------------------------------------------------------------------------
// Tone system (mirrors signals-health/ui.tsx)
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
// StatusDot — coloured dot for alert status
// ---------------------------------------------------------------------------

export function StatusDot({
  status,
  size = 8,
}: {
  status: AlertStatus;
  size?: number;
}) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{width: size, height: size, background: color}}
      aria-label={STATUS_LABEL[status]}
    />
  );
}

// ---------------------------------------------------------------------------
// SourceBadge — webhook vs recommendation indicator
// ---------------------------------------------------------------------------

export function SourceBadge({source}: {source: FatigueSource}) {
  const tone: Tone = source === 'webhook' ? 'blue' : 'purple';
  return <Badge tone={tone}>{SOURCE_LABEL[source]}</Badge>;
}

// ---------------------------------------------------------------------------
// WebhookStatusBanner — connected / disconnected indicator
// ---------------------------------------------------------------------------

export function WebhookStatusBanner({
  state,
  lastPing,
}: {
  state: WebhookConnectionState;
  lastPing?: string;
}) {
  const connected = state === 'connected';
  const color = connected ? 'var(--green)' : 'var(--rose)';
  const label = connected ? 'Connected' : 'Disconnected';
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}>
      <span
        className="inline-block size-2 rounded-full"
        style={{background: color}}
      />
      {label}
      {lastPing ? (
        <span className="font-normal text-ink-3">
          Last ping: {new Date(lastPing).toLocaleTimeString()}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertCard — fatigue alert with status, ad info, time, and action buttons
// ---------------------------------------------------------------------------

export function AlertCard({
  adName,
  campaignName,
  adsetName,
  status,
  source,
  detectedAt,
  duplicatedAdId,
  onAcknowledge,
  onDuplicate,
  onDismiss,
}: {
  adName: string;
  campaignName: string;
  adsetName: string;
  status: AlertStatus;
  source: FatigueSource;
  detectedAt: string;
  duplicatedAdId?: string;
  onAcknowledge?: () => void;
  onDuplicate?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-2.5">
        <StatusDot status={status} size={10} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-ink">{adName}</span>
            <SourceBadge source={source} />
          </div>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {campaignName} &middot; {adsetName}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-3">
            Detected {new Date(detectedAt).toLocaleString()}
          </p>
          {duplicatedAdId ? (
            <p className="mt-1 text-[11px] text-ink-2">
              Duplicated as{' '}
              <span className="font-mono text-ink">{duplicatedAdId}</span>
            </p>
          ) : null}
          {status === 'active' ? (
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={onAcknowledge}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  color: 'var(--cat-measurement)',
                  background:
                    'color-mix(in srgb, var(--cat-measurement) 12%, transparent)',
                }}>
                Acknowledge
              </button>
              <button
                type="button"
                onClick={onDuplicate}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-colors"
                style={{background: 'var(--brand)'}}>
                Duplicate &amp; Replace
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-3 transition-colors hover:text-ink">
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
