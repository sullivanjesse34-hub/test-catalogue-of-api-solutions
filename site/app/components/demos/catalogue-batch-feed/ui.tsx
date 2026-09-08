'use client';

import type {ComponentPropsWithoutRef} from 'react';

import type {VideoFetchStatus} from '@/lib/demos/catalogue-batch-feed';

import {
  VIDEO_FETCH_COLOR,
  VIDEO_FETCH_LABELS,
} from '@/lib/demos/catalogue-batch-feed';

// ---------------------------------------------------------------------------
// Shared palette types
// ---------------------------------------------------------------------------

export type Tone = 'blue' | 'green' | 'purple' | 'rose' | 'yellow' | 'muted';

const TONE_COLOR: Record<Tone, string> = {
  blue: 'var(--cat-catalogue)',
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
// StatusPill — batch/feed statuses
// ---------------------------------------------------------------------------

export type PillStatus = 'processing' | 'complete' | 'error' | 'partial';

const PILL_MAP: Record<PillStatus, {label: string; color: string}> = {
  processing: {label: 'Processing', color: 'var(--cat-catalogue)'},
  complete: {label: 'Complete', color: 'var(--green)'},
  error: {label: 'Error', color: 'var(--rose)'},
  partial: {label: 'Partial', color: 'var(--cat-measurement)'},
};

export function StatusPill({status}: {status: PillStatus}) {
  const {label, color} = PILL_MAP[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}>
      <span
        className="size-1.5 rounded-full"
        style={{background: color}}
        aria-hidden
      />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VideoFetchBar — horizontal stacked bar of fetch status distribution
// ---------------------------------------------------------------------------

const FETCH_ORDER: VideoFetchStatus[] = [
  'FETCHED',
  'PARTIAL_FETCH',
  'OUTDATED',
  'NO_STATUS',
  'FETCH_FAILED',
  'NO_URLS',
];

export function VideoFetchBar({
  breakdown,
}: {
  breakdown: Record<VideoFetchStatus, number>;
}) {
  const total = FETCH_ORDER.reduce((s, k) => s + breakdown[k], 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {FETCH_ORDER.map(status => {
          const count = breakdown[status];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={status}
              style={{width: `${pct}%`, background: VIDEO_FETCH_COLOR[status]}}
              title={`${VIDEO_FETCH_LABELS[status]}: ${count.toLocaleString()}`}
              aria-hidden
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {FETCH_ORDER.map(status => {
          const count = breakdown[status];
          if (count === 0) return null;
          return (
            <span
              key={status}
              className="flex items-center gap-1 text-[10px] text-ink-2">
              <span
                className="size-1.5 rounded-full"
                style={{background: VIDEO_FETCH_COLOR[status]}}
                aria-hidden
              />
              {VIDEO_FETCH_LABELS[status]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar — generic completion bar (e.g. batch %)
// ---------------------------------------------------------------------------

export function ProgressBar({pct, colorVar}: {pct: number; colorVar?: string}) {
  const color = colorVar ?? 'var(--green)';
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{width: `${clamped}%`, background: color}}
      />
    </div>
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
        borderColor:
          'color-mix(in srgb, var(--cat-catalogue) 30%, transparent)',
        background: 'color-mix(in srgb, var(--cat-catalogue) 7%, transparent)',
      }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Form buttons
// ---------------------------------------------------------------------------

export function PrimaryButton(props: ComponentPropsWithoutRef<'button'>) {
  const {className, ...rest} = props;
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}

export function GhostButton(props: ComponentPropsWithoutRef<'button'>) {
  const {className, ...rest} = props;
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}
