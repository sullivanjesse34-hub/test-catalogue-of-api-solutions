'use client';

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

/**
 * Horizontal server-vs-web split for a pixel's event volume (event_source).
 * The web (browser-only) portion is the untapped opportunity, so it is drawn
 * in the accent colour with the connected (server) portion in green.
 */
export function ConnectionBar({
  serverCount,
  webCount,
}: {
  serverCount: number;
  webCount: number;
}) {
  const total = serverCount + webCount;
  const serverPct = total === 0 ? 0 : (serverCount / total) * 100;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        style={{width: `${serverPct}%`, background: 'var(--green)'}}
        aria-hidden
      />
      <div
        style={{width: `${100 - serverPct}%`, background: 'var(--rose)'}}
        aria-hidden
      />
    </div>
  );
}

/**
 * Semicircular opportunity gauge for a 0..100 score, coloured by the passed
 * accent. Dependency-free inline SVG.
 */
export function OpportunityGauge({
  score,
  colorVar,
  size = 96,
  stroke = 8,
}: {
  score: number;
  colorVar: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const half = Math.PI * r; // length of the semicircle arc
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (half * clamped) / 100;
  const cy = size / 2;

  return (
    <div
      className="relative shrink-0"
      style={{width: size, height: size / 2 + stroke}}>
      <svg width={size} height={size / 2 + stroke} aria-hidden>
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={colorVar}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${half - dash}`}
          style={{
            transition: 'stroke-dasharray 450ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </svg>
      <span
        className="absolute inset-x-0 font-bold tabular-nums text-ink"
        style={{bottom: 0, fontSize: size * 0.24, textAlign: 'center'}}>
        {Math.round(clamped)}
      </span>
    </div>
  );
}

/**
 * Horizontal bar chart of projected annual uplift ($) per pixel — inline SVG,
 * no chart library. Each row is a labelled proportional bar.
 */
export function UpliftBars({
  rows,
  format,
}: {
  rows: Array<{label: string; value: number; colorVar: string}>;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-[12px] font-medium text-ink-2">
            {r.label}
          </span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
            <div
              className="h-full rounded-md"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.colorVar,
                transition: 'width 450ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-[12px] font-bold tabular-nums text-ink">
            {format(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
