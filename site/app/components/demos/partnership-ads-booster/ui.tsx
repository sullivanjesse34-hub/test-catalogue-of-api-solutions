'use client';

import {
  Clapperboard,
  Eye,
  Image as ImageIcon,
  Images,
  Play,
} from 'lucide-react';

import type {ContentType} from '@/lib/demos/partnership-ads-booster';

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

/** A coloured pill driven by an explicit CSS colour variable. */
export function StatusPill({
  colorVar,
  children,
}: {
  colorVar: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color: colorVar,
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
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

/** Horizontal bar for an engagement rate (fraction 0–1). */
export function EngagementBar({rate}: {rate: number}) {
  const pct = Math.max(0, Math.min(100, rate * 100 * 6)); // scaled: ~16% fills
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{width: `${pct}%`, background: 'var(--purple)'}}
      />
    </div>
  );
}

// --- Mock post visuals ----------------------------------------------------
// UI-only representative media: agencies would render the real creative here.
// Deterministic, token-derived gradients stand in for post imagery (no external
// assets are fetched — see the app's no-external-assets rule).

const POSTER_PAIRS: Array<[string, string]> = [
  ['var(--cat-signals)', 'var(--purple)'],
  ['var(--purple)', 'var(--rose)'],
  ['var(--green)', 'var(--cat-signals)'],
  ['var(--rose)', 'var(--cat-measurement)'],
  ['var(--brand)', 'var(--purple)'],
  ['var(--cat-measurement)', 'var(--green)'],
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function posterColors(seed: string): {from: string; to: string} {
  const [from, to] = POSTER_PAIRS[hashSeed(seed) % POSTER_PAIRS.length];
  return {from, to};
}

/** Initials avatar on a deterministic on-brand gradient. */
export function Avatar({
  name,
  seed,
  size = 32,
}: {
  name: string;
  seed: string;
  size?: number;
}) {
  const {from, to} = posterColors(seed);
  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden>
      {initials}
    </span>
  );
}

export type SceneTheme = 'outdoors' | 'workshop' | 'food' | 'abstract';

/**
 * Deterministic duotone SVG "scene" that stands in for post media — richer than
 * a flat gradient, but still fully generated (no real photos / external assets).
 * Colours come from theme tokens; a subtle vignette + film grain give it a
 * photographic feel.
 */
export function PostScene({
  seed,
  theme = 'abstract',
}: {
  seed: string;
  theme?: SceneTheme;
}) {
  const h = hashSeed(seed);
  const uid = `sc${(h % 1000000).toString(36)}`;
  const j = (shift: number, span: number) => (h >> shift) % span;

  let body: React.ReactNode;
  if (theme === 'outdoors') {
    body = (
      <g>
        <rect width="400" height="300" fill={`url(#sky-${uid})`} />
        <circle
          cx={280 + j(2, 60)}
          cy={64}
          r={52}
          style={{fill: 'var(--cat-measurement)'}}
          opacity={0.18}
        />
        <circle
          cx={280 + j(2, 60)}
          cy={64}
          r={30}
          style={{fill: 'var(--cat-measurement)'}}
          opacity={0.92}
        />
        <polygon
          points="0,205 80,140 150,195 220,128 300,200 400,150 400,300 0,300"
          style={{fill: 'color-mix(in srgb, var(--purple) 70%, black)'}}
          opacity={0.85}
        />
        <polygon
          points="0,247 90,186 175,236 255,176 340,232 400,206 400,300 0,300"
          style={{fill: 'color-mix(in srgb, var(--brand) 72%, black)'}}
        />
        <polygon
          points="0,286 130,251 250,279 400,256 400,300 0,300"
          style={{fill: 'color-mix(in srgb, var(--green) 60%, black)'}}
        />
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{stopColor: 'var(--cat-signals)'}} />
            <stop offset="1" style={{stopColor: 'var(--purple)'}} />
          </linearGradient>
        </defs>
      </g>
    );
  } else if (theme === 'workshop') {
    body = (
      <g>
        <rect width="400" height="300" fill={`url(#wb-${uid})`} />
        <rect width="400" height="300" fill={`url(#peg-${uid})`} />
        <g
          transform="rotate(-30 210 150)"
          style={{fill: 'color-mix(in srgb, white 82%, var(--cat-signals))'}}>
          <rect x="150" y="141" width="150" height="18" rx="9" />
          <circle cx="150" cy="150" r="21" />
          <circle
            cx="150"
            cy="150"
            r="9"
            style={{fill: 'color-mix(in srgb, var(--brand) 70%, black)'}}
          />
        </g>
        <g transform="rotate(18 120 175)">
          <rect
            x="66"
            y="150"
            width="58"
            height="24"
            rx="4"
            style={{fill: 'var(--cat-measurement)'}}
          />
          <rect
            x="118"
            y="157"
            width="96"
            height="10"
            rx="5"
            style={{
              fill: 'color-mix(in srgb, var(--cat-measurement) 55%, black)',
            }}
          />
        </g>
        <defs>
          <linearGradient id={`wb-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0"
              style={{stopColor: 'color-mix(in srgb, var(--brand) 82%, black)'}}
            />
            <stop
              offset="1"
              style={{
                stopColor: 'color-mix(in srgb, var(--purple) 58%, black)',
              }}
            />
          </linearGradient>
          <pattern
            id={`peg-${uid}`}
            width="26"
            height="26"
            patternUnits="userSpaceOnUse">
            <circle
              cx="4"
              cy="4"
              r="2"
              style={{fill: 'var(--cat-measurement)'}}
              opacity={0.22}
            />
          </pattern>
        </defs>
      </g>
    );
  } else if (theme === 'food') {
    body = (
      <g>
        <rect width="400" height="300" fill={`url(#tb-${uid})`} />
        <rect
          x="70"
          y="118"
          width="8"
          height="112"
          rx="4"
          style={{fill: 'color-mix(in srgb, white 72%, var(--purple))'}}
        />
        <rect
          x="322"
          y="118"
          width="8"
          height="112"
          rx="4"
          style={{fill: 'color-mix(in srgb, white 72%, var(--purple))'}}
        />
        <circle
          cx="200"
          cy="168"
          r="92"
          style={{fill: 'color-mix(in srgb, white 84%, var(--rose))'}}
        />
        <circle
          cx="200"
          cy="168"
          r="66"
          fill="none"
          strokeWidth="3"
          style={{stroke: 'color-mix(in srgb, var(--rose) 40%, white)'}}
          opacity={0.6}
        />
        <circle
          cx="182"
          cy="160"
          r="30"
          style={{fill: 'color-mix(in srgb, var(--green) 68%, black)'}}
        />
        <circle
          cx="220"
          cy="182"
          r="22"
          style={{fill: 'var(--cat-measurement)'}}
        />
        <circle cx="211" cy="150" r="15" style={{fill: 'var(--rose)'}} />
        <defs>
          <linearGradient id={`tb-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0"
              style={{stopColor: 'color-mix(in srgb, var(--rose) 72%, black)'}}
            />
            <stop
              offset="1"
              style={{
                stopColor:
                  'color-mix(in srgb, var(--cat-measurement) 55%, black)',
              }}
            />
          </linearGradient>
        </defs>
      </g>
    );
  } else {
    const {from, to} = posterColors(seed);
    body = (
      <g>
        <rect width="400" height="300" fill={`url(#ab-${uid})`} />
        <ellipse
          cx={90 + j(2, 120)}
          cy={90 + j(5, 80)}
          rx="120"
          ry="110"
          style={{fill: 'var(--rose)'}}
          opacity={0.32}
        />
        <ellipse
          cx={300 - j(3, 120)}
          cy={220 - j(7, 80)}
          rx="130"
          ry="120"
          style={{fill: 'var(--cat-measurement)'}}
          opacity={0.28}
        />
        <defs>
          <linearGradient id={`ab-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{stopColor: from}} />
            <stop offset="1" style={{stopColor: to}} />
          </linearGradient>
        </defs>
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden>
      {body}
      <rect width="400" height="300" fill={`url(#vig-${uid})`} />
      <rect
        width="400"
        height="300"
        filter={`url(#grain-${uid})`}
        opacity={0.1}
      />
      <defs>
        <radialGradient id={`vig-${uid}`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0.55" stopColor="black" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.34" />
        </radialGradient>
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

/** A representative branded-content post poster (mock media). */
export function PostVisual({
  seed,
  contentType,
  theme,
  creatorHandle,
  sponsorHandle,
  reachLabel,
  thumb = false,
}: {
  seed: string;
  contentType: ContentType;
  theme?: SceneTheme;
  creatorHandle: string;
  sponsorHandle?: string;
  reachLabel?: string;
  thumb?: boolean;
}) {
  const motion = contentType === 'VIDEO' || contentType === 'REEL';
  const TypeIcon =
    contentType === 'CAROUSEL' ? Images : motion ? Clapperboard : ImageIcon;
  return (
    <div
      className={[
        'relative w-full overflow-hidden',
        thumb ? 'aspect-square rounded-lg' : 'aspect-[4/3] rounded-xl',
      ].join(' ')}>
      <PostScene seed={seed} theme={theme} />
      <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        <TypeIcon className={thumb ? 'size-3' : 'size-3.5'} aria-hidden />
        {thumb ? null : contentType}
      </div>
      {reachLabel != null && !thumb ? (
        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Eye className="size-3" aria-hidden />
          {reachLabel}
        </div>
      ) : null}
      {motion ? (
        <span
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm"
          style={{width: thumb ? 26 : 50, height: thumb ? 26 : 50}}>
          <Play
            className={thumb ? 'size-3' : 'size-5'}
            fill="currentColor"
            color="white"
            aria-hidden
          />
        </span>
      ) : null}
      {thumb ? null : (
        <div
          className="absolute inset-x-0 bottom-0 p-2.5"
          style={{
            background:
              'linear-gradient(to top, color-mix(in srgb, black 58%, transparent), transparent)',
          }}>
          <p className="truncate text-[12px] font-bold text-white">
            {creatorHandle}
          </p>
          {sponsorHandle != null ? (
            <p className="truncate text-[10px] font-medium text-white/85">
              Paid partnership with {sponsorHandle}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Small step indicator for the boost lifecycle. */
export function StepDots({
  total,
  active,
  colorVar,
}: {
  total: number;
  active: number;
  colorVar: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({length: total}).map((_, i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: i <= active ? 18 : 8,
            background: i <= active ? colorVar : 'var(--border)',
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
