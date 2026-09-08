'use client';

import {Check, MapPin, Plus, Search, Sparkles, Target, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_ACCOUNT,
  AGE_CEIL,
  AGE_FLOOR,
  ALL_PLATFORMS,
  audienceDefinition,
  DEFAULT_SPEC,
  DEFINITION_META,
  deliveryEstimate,
  formatCount,
  formatMoneyCents,
  isSpecEmpty,
  OPTIMIZE_FOR_LABEL,
  OPTIMIZE_FOR_OPTIONS,
  type OptimizeFor,
  type Platform,
  PLATFORM_LABEL,
  reachBand,
  reachEstimate,
  type Sex,
  specDetailed,
  specGeos,
  TARGETING_OPTIONS,
  TARGETING_TYPE_LABEL,
  TARGETING_TYPE_TOKEN,
  type TargetingOption,
  type TargetingSpec,
  type TargetingType,
} from '@/lib/demos/targeting-reach-estimate';

// Developer-doc links surfaced in the API console for each call.
const DOC_SEARCH =
  'https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search/';
const DOC_DETAILED =
  'https://developers.facebook.com/docs/marketing-api/audiences/reference/detailed-targeting/';
const DOC_REACH =
  'https://developers.facebook.com/docs/marketing-api/audiences/guides/reach-estimate/';

const DEFAULT_MAX_SPEND_CENTS = 25_000; // $250/day sweep ceiling.

// --- shared UI atoms (local to this demo) --------------------------------

function SectionHeading({title, sub}: {title: string; sub?: string}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {sub ? <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p> : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  accentVar,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  accentVar?: string;
  icon?: React.ReactNode;
}) {
  const accent = accentVar ?? 'var(--cat-signals)';
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
          <p className="mt-0.5 text-[11px] font-medium text-ink-3">{note}</p>
        ) : null}
      </div>
    </div>
  );
}

const TYPE_ORDER: TargetingType[] = [
  'geo',
  'interest',
  'behavior',
  'demographic',
];

function typeColor(type: TargetingType): string {
  switch (type) {
    case 'geo':
      return 'var(--brand-2)';
    case 'interest':
      return 'var(--purple)';
    case 'behavior':
      return 'var(--rose)';
    case 'demographic':
      return 'var(--green)';
  }
}

// --- gauge: audience definition (narrow ↔ broad) -------------------------

function DefinitionGauge({users}: {users: number}) {
  const {position, label} = audienceDefinition(users);
  const meta = DEFINITION_META[label];
  const W = 260;
  const H = 140;
  const cx = W / 2;
  const cy = H - 12;
  const r = 104;
  const stroke = 16;

  // Semicircle from 180° (left) to 0° (right).
  const angle = Math.PI - position * Math.PI;
  const needleX = cx + Math.cos(angle) * (r - stroke / 2);
  const needleY = cy - Math.sin(angle) * (r - stroke / 2);

  const arc = (from: number, to: number): string => {
    const a0 = Math.PI - from * Math.PI;
    const a1 = Math.PI - to * Math.PI;
    const x0 = cx + Math.cos(a0) * r;
    const y0 = cy - Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy - Math.sin(a1) * r;
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[280px]"
        role="img"
        aria-label={`Audience definition: ${meta.label}`}>
        <path
          d={arc(0, 0.33)}
          fill="none"
          stroke="var(--rose)"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d={arc(0.34, 0.71)}
          fill="none"
          stroke="var(--green)"
          strokeWidth={stroke}
          opacity={0.85}
        />
        <path
          d={arc(0.72, 1)}
          fill="none"
          stroke="var(--yellow)"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.85}
        />
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="var(--ink)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="var(--ink)" />
        <text
          x={cx}
          y={cy - 34}
          textAnchor="middle"
          fontSize={26}
          fontWeight={800}
          fill="var(--ink)">
          {formatCount(users)}
        </text>
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fontSize={10}
          fill="var(--ink-3)">
          estimated reach
        </text>
      </svg>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            color: meta.colorVar,
            background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
          }}>
          {meta.label}
        </span>
      </div>
      <p className="mt-1.5 max-w-[280px] text-center text-[12px] text-ink-3">
        {meta.note}
      </p>
    </div>
  );
}

// --- daily outcomes curve (spend → reach) --------------------------------

function OutcomesCurve({
  points,
  currency,
  actionLabel,
}: {
  points: {spendCents: number; reach: number; actions: number}[];
  currency: string;
  actionLabel: string;
}) {
  const W = 560;
  const H = 200;
  const padL = 44;
  const padR = 16;
  const padTop = 16;
  const padBottom = 28;
  const n = points.length;
  const lastI = Math.max(1, n - 1);

  const maxReach = Math.max(1, ...points.map(p => p.reach));
  const maxSpend = Math.max(1, ...points.map(p => p.spendCents));

  const x = (i: number) => padL + (i * (W - padL - padR)) / lastI;
  const y = (v: number) =>
    padTop + (H - padTop - padBottom) * (1 - v / maxReach);

  const line = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.reach).toFixed(1)}`)
    .join(' ');
  const area = `${padL},${H - padBottom} ${line} ${(W - padR).toFixed(1)},${H - padBottom}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-52 w-full"
      role="img"
      aria-label="Estimated daily reach across a spend sweep">
      {[0.25, 0.5, 0.75].map(g => (
        <line
          key={g}
          x1={padL}
          x2={W - padR}
          y1={padTop + (H - padTop - padBottom) * g}
          y2={padTop + (H - padTop - padBottom) * g}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      <text x={4} y={padTop + 4} fontSize={9} fill="var(--ink-3)">
        {formatCount(maxReach)}
      </text>
      <text x={4} y={H - padBottom} fontSize={9} fill="var(--ink-3)">
        0
      </text>
      <polygon
        points={area}
        fill="color-mix(in srgb, var(--brand-2) 14%, transparent)"
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--brand-2)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(lastI)}
        cy={y(points[lastI].reach)}
        r={3.5}
        fill="var(--brand-2)"
      />
      <text x={padL} y={H - 8} fontSize={10} fill="var(--ink-3)">
        {formatMoneyCents(0, currency)}
      </text>
      <text
        x={W - padR}
        y={H - 8}
        fontSize={10}
        textAnchor="end"
        fill="var(--ink-3)">
        {formatMoneyCents(maxSpend, currency)}/day
      </text>
      <text
        x={(padL + W - padR) / 2}
        y={H - 8}
        fontSize={10}
        textAnchor="middle"
        fill="var(--ink-3)">
        daily spend → est. reach ({actionLabel})
      </text>
    </svg>
  );
}

// --- targeting search panel ----------------------------------------------

function SearchPanel({
  spec,
  onToggle,
}: {
  spec: TargetingSpec;
  onToggle: (option: TargetingOption) => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TargetingType | 'all'>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TARGETING_OPTIONS.filter(o => {
      if (type !== 'all' && o.type !== type) return false;
      if (q.length === 0) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.path.some(p => p.toLowerCase().includes(q))
      );
    });
  }, [query, type]);

  const selectedRefs = new Set([...spec.geoRefs, ...spec.detailedRefs]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <SectionHeading
        title="Targeting search"
        sub="Search geos, interests, behaviours and demographics"
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
          }}
          placeholder="Search targeting…"
          aria-label="Search targeting"
          className="w-full rounded-[10px] border-2 border-border bg-surface-2 py-2 pl-9 pr-3 text-[13px] text-ink outline-none focus:border-brand-2"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <FilterChip
          active={type === 'all'}
          onClick={() => {
            setType('all');
          }}>
          All
        </FilterChip>
        {TYPE_ORDER.map(t => (
          <FilterChip
            key={t}
            active={type === t}
            onClick={() => {
              setType(t);
            }}>
            {TARGETING_TYPE_LABEL[t]}
          </FilterChip>
        ))}
      </div>

      <ul className="mt-3 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
        {results.map(o => {
          const on = selectedRefs.has(o.ref);
          const color = typeColor(o.type);
          return (
            <li key={o.ref}>
              <button
                type="button"
                onClick={() => {
                  onToggle(o);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-md"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                  }}
                  aria-hidden>
                  {o.type === 'geo' ? (
                    <MapPin className="size-4" />
                  ) : (
                    <Target className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {o.name}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {o.path.join(' › ')} ·{' '}
                    {formatCount(o.audienceSizeLowerBound)}–
                    {formatCount(o.audienceSizeUpperBound)}
                  </span>
                </span>
                <span
                  className={[
                    'grid size-6 shrink-0 place-items-center rounded-full',
                    on ? 'text-on-brand' : 'text-ink-3',
                  ].join(' ')}
                  style={on ? {background: 'var(--brand)'} : undefined}
                  aria-hidden>
                  {on ? (
                    <Check className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {results.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[13px] text-ink-3">
            No targeting matches “{query}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
        active
          ? 'bg-brand text-on-brand'
          : 'border border-border text-ink-2 hover:bg-surface-2',
      ].join(' ')}>
      {children}
    </button>
  );
}

// --- selected-spec chips --------------------------------------------------

function SpecChips({
  options,
  onRemove,
}: {
  options: TargetingOption[];
  onRemove: (option: TargetingOption) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-[12px] text-ink-3">None selected — add from search.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const color = typeColor(o.type);
        return (
          <span
            key={o.ref}
            className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-ink"
            style={{
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
            }}>
            {o.name}
            <button
              type="button"
              onClick={() => {
                onRemove(o);
              }}
              aria-label={`Remove ${o.name}`}
              className="grid size-4 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
              <X className="size-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

// --- root -----------------------------------------------------------------

export function TargetingReachEstimateDashboard() {
  const {record} = useApiConsole();
  const [spec, setSpec] = useState<TargetingSpec>(DEFAULT_SPEC);
  const [optimizeFor, setOptimizeFor] = useState<OptimizeFor>('REACH');

  const geos = specGeos(spec);
  const detailed = specDetailed(spec);
  const estimate = reachEstimate(spec);
  const delivery = deliveryEstimate(spec, optimizeFor, DEFAULT_MAX_SPEND_CENTS);
  const band = reachBand(estimate.users);
  const empty = isSpecEmpty(spec);

  // Initial reads: a targeting search plus the reach estimate for the default
  // spec. Re-fires whenever the spec's selection or optimisation goal changes.
  const loadKey = `${spec.geoRefs.join(',')}|${spec.detailedRefs.join(',')}|${spec.ageMin}-${spec.ageMax}|${spec.sex}|${spec.platforms.join(',')}|${optimizeFor}`;
  useApiLoads(loadKey, () =>
    buildLoadCalls(spec, optimizeFor, delivery, estimate),
  );

  const toggleOption = (option: TargetingOption) => {
    const isGeo = option.type === 'geo';
    const listRefs = isGeo ? spec.geoRefs : spec.detailedRefs;
    const willAdd = !listRefs.includes(option.ref);

    // A one-off targeting search records the lookup the picker performed.
    record({
      method: 'GET',
      endpoint: isGeo ? '/search' : `act_${AD_ACCOUNT.id}/targetingsearch`,
      summary: `${willAdd ? 'Add' : 'Remove'} ${TARGETING_TYPE_LABEL[option.type]}: ${option.name}`,
      request: isGeo
        ? {
            type: TARGETING_TYPE_TOKEN[option.type],
            q: option.name,
            location_types: ['country', 'region', 'city'],
          }
        : {q: option.name, limit: 30},
      response: {
        data: [
          isGeo
            ? {
                key: option.key,
                name: option.name,
                type: option.geoType,
                audience_size_lower_bound: option.audienceSizeLowerBound,
                audience_size_upper_bound: option.audienceSizeUpperBound,
              }
            : {
                id: option.id,
                name: option.name,
                path: option.path,
                audience_size_lower_bound: option.audienceSizeLowerBound,
                audience_size_upper_bound: option.audienceSizeUpperBound,
              },
        ],
      },
      status: 'success',
      docsUrl: isGeo ? DOC_SEARCH : DOC_DETAILED,
    });

    setSpec(prev => {
      if (isGeo) {
        const next = willAdd
          ? [...prev.geoRefs, option.ref]
          : prev.geoRefs.filter(r => r !== option.ref);
        return {...prev, geoRefs: next};
      }
      const next = willAdd
        ? [...prev.detailedRefs, option.ref]
        : prev.detailedRefs.filter(r => r !== option.ref);
      return {...prev, detailedRefs: next};
    });
  };

  const togglePlatform = (platform: Platform) => {
    setSpec(prev => {
      const on = prev.platforms.includes(platform);
      // Keep at least one platform selected.
      if (on && prev.platforms.length === 1) return prev;
      const platforms = on
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform];
      return {...prev, platforms};
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Left: builder */}
        <div className="flex flex-col gap-4">
          <SearchPanel spec={spec} onToggle={toggleOption} />

          <div className="rounded-2xl border border-border bg-surface p-4">
            <SectionHeading title="Audience spec" />
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Locations
                </p>
                <SpecChips options={geos} onRemove={toggleOption} />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Detailed targeting
                </p>
                <SpecChips options={detailed} onRemove={toggleOption} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-[12px] text-ink-2">
                  Age min
                  <select
                    value={spec.ageMin}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setSpec(prev => ({
                        ...prev,
                        ageMin: Math.min(v, prev.ageMax),
                      }));
                    }}
                    aria-label="Minimum age"
                    className="rounded-lg border-2 border-border bg-surface-2 px-2 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
                    {ageRange().map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-ink-2">
                  Age max
                  <select
                    value={spec.ageMax}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setSpec(prev => ({
                        ...prev,
                        ageMax: Math.max(v, prev.ageMin),
                      }));
                    }}
                    aria-label="Maximum age"
                    className="rounded-lg border-2 border-border bg-surface-2 px-2 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
                    {ageRange().map(a => (
                      <option key={a} value={a === AGE_CEIL ? AGE_CEIL : a}>
                        {a === AGE_CEIL ? `${AGE_CEIL}+` : a}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Gender
                </p>
                <div className="flex gap-1.5">
                  {(['all', 'female', 'male'] as Sex[]).map(s => (
                    <FilterChip
                      key={s}
                      active={spec.sex === s}
                      onClick={() => {
                        setSpec(prev => ({...prev, sex: s}));
                      }}>
                      {s === 'all' ? 'All' : s === 'female' ? 'Women' : 'Men'}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Placements
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PLATFORMS.map(p => (
                    <FilterChip
                      key={p}
                      active={spec.platforms.includes(p)}
                      onClick={() => {
                        togglePlatform(p);
                      }}>
                      {PLATFORM_LABEL[p]}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: estimate dashboard */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Est. reach (MAU)"
              value={formatCount(estimate.users)}
              note={
                estimate.users < 0
                  ? 'targeting_status: too small'
                  : `${formatCount(band.lower)}–${formatCount(band.upper)} range`
              }
              accentVar="var(--brand)"
            />
            <Kpi
              label="Est. daily (DAU)"
              value={formatCount(delivery.estimateDau)}
              note="delivery_estimate"
              accentVar="var(--purple)"
            />
            <Kpi
              label="Locations"
              value={String(geos.length)}
              note={`${detailed.length} detailed`}
            />
            <Kpi
              label="Age · gender"
              value={`${spec.ageMin}–${spec.ageMax === AGE_CEIL ? `${AGE_CEIL}+` : spec.ageMax}`}
              note={
                spec.sex === 'all'
                  ? 'All genders'
                  : spec.sex === 'female'
                    ? 'Women'
                    : 'Men'
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <SectionHeading title="Audience definition" />
              {empty ? (
                <EmptyState />
              ) : (
                <DefinitionGauge users={estimate.users} />
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <SectionHeading
                title="Daily results estimate"
                sub="daily_outcomes_curve across a spend sweep"
              />
              <label className="mb-2 flex items-center gap-2 text-[12px] text-ink-2">
                Optimise for
                <select
                  value={optimizeFor}
                  onChange={e => {
                    setOptimizeFor(e.target.value as OptimizeFor);
                  }}
                  aria-label="Optimisation goal"
                  className="rounded-lg border-2 border-border bg-surface-2 px-2 py-1 text-[12px] font-medium text-ink outline-none focus:border-brand-2">
                  {OPTIMIZE_FOR_OPTIONS.map(o => (
                    <option key={o} value={o}>
                      {OPTIMIZE_FOR_LABEL[o]}
                    </option>
                  ))}
                </select>
              </label>
              {empty ? (
                <EmptyState />
              ) : (
                <OutcomesCurve
                  points={delivery.dailyOutcomesCurve}
                  currency={AD_ACCOUNT.currency}
                  actionLabel={OPTIMIZE_FOR_LABEL[optimizeFor].toLowerCase()}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <SectionHeading
              title="Estimate at max spend"
              sub={`${formatMoneyCents(DEFAULT_MAX_SPEND_CENTS, AD_ACCOUNT.currency)}/day · optimising for ${OPTIMIZE_FOR_LABEL[optimizeFor].toLowerCase()}`}
            />
            {empty ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kpi
                  label="Daily reach"
                  value={formatCount(
                    delivery.dailyOutcomesCurve[
                      delivery.dailyOutcomesCurve.length - 1
                    ].reach,
                  )}
                  note="at max spend"
                />
                <Kpi
                  label={`Daily ${OPTIMIZE_FOR_LABEL[optimizeFor].toLowerCase()}`}
                  value={formatCount(
                    delivery.dailyOutcomesCurve[
                      delivery.dailyOutcomesCurve.length - 1
                    ].actions,
                  )}
                  note="estimated"
                />
                <Kpi
                  label="Estimate ready"
                  value={estimate.estimateReady ? 'Yes' : 'No'}
                  note={
                    estimate.estimateReady
                      ? 'estimate_ready: true'
                      : 'estimate_ready: false'
                  }
                  accentVar={
                    estimate.estimateReady ? 'var(--green)' : 'var(--rose)'
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <Sparkles className="size-6 text-ink-3" />
      <p className="mt-2 text-sm font-semibold text-ink">Build an audience</p>
      <p className="mt-1 text-[13px] text-ink-2">
        Add locations or detailed targeting to see a reach estimate.
      </p>
    </div>
  );
}

function ageRange(): number[] {
  const out: number[] = [];
  for (let a = AGE_FLOOR; a <= AGE_CEIL; a++) out.push(a);
  return out;
}

// Initial-load reads: a detailed-targeting suggestion pull + a reach estimate
// + a delivery estimate for the current spec, grounded in the solution spec.
function buildLoadCalls(
  spec: TargetingSpec,
  optimizeFor: OptimizeFor,
  delivery: ReturnType<typeof deliveryEstimate>,
  estimate: ReturnType<typeof reachEstimate>,
): ApiCallInput[] {
  const geos = specGeos(spec);
  const detailed = specDetailed(spec);
  const targetingSpec = {
    geo_locations: {
      countries: geos.filter(g => g.geoType === 'country').map(g => g.key),
      regions: geos
        .filter(g => g.geoType === 'region')
        .map(g => ({key: g.key})),
      cities: geos.filter(g => g.geoType === 'city').map(g => ({key: g.key})),
    },
    age_min: spec.ageMin,
    age_max: spec.ageMax,
    genders: spec.sex === 'all' ? undefined : spec.sex === 'male' ? [1] : [2],
    flexible_spec: [
      {
        interests: detailed
          .filter(d => d.type === 'interest')
          .map(d => ({id: d.id, name: d.name})),
        behaviors: detailed
          .filter(d => d.type === 'behavior')
          .map(d => ({id: d.id, name: d.name})),
      },
    ],
    publisher_platforms: spec.platforms,
  };

  return [
    {
      method: 'GET',
      endpoint: `act_${AD_ACCOUNT.id}/targetingsuggestions`,
      summary: 'Fetch related detailed-targeting suggestions',
      request: {
        targeting_list: detailed
          .filter(d => d.type === 'interest' || d.type === 'behavior')
          .map(d => ({
            type: d.type === 'interest' ? 'interests' : 'behaviors',
            id: d.id,
          })),
        limit: 30,
      },
      response: {
        data: TARGETING_OPTIONS.filter(
          o => o.type === 'interest' && !spec.detailedRefs.includes(o.ref),
        )
          .slice(0, 3)
          .map(o => ({
            id: o.id,
            name: o.name,
            path: o.path,
            audience_size_lower_bound: o.audienceSizeLowerBound,
            audience_size_upper_bound: o.audienceSizeUpperBound,
          })),
      },
      status: 'success',
      docsUrl: DOC_DETAILED,
    },
    {
      method: 'GET',
      endpoint: `act_${AD_ACCOUNT.id}/reachestimate`,
      summary: 'Estimate reach for the targeting spec',
      request: {targeting_spec: targetingSpec, optimize_for: optimizeFor},
      response: {
        data: {
          users: estimate.users,
          estimate_ready: estimate.estimateReady,
          targeting_status: estimate.targetingStatus,
        },
      },
      status: 'success',
      docsUrl: DOC_REACH,
    },
    {
      method: 'GET',
      endpoint: `act_${AD_ACCOUNT.id}/delivery_estimate`,
      summary: 'Estimate DAU/MAU and the daily outcomes curve',
      request: {
        targeting_spec: targetingSpec,
        optimize_for: optimizeFor,
        optimization_goal: optimizeFor,
      },
      response: {
        data: [
          {
            estimate_dau: delivery.estimateDau,
            estimate_mau: delivery.estimateMau,
            estimate_ready: delivery.estimateReady,
            daily_outcomes_curve: delivery.dailyOutcomesCurve.map(p => ({
              spend: p.spendCents,
              reach: p.reach,
              actions: p.actions,
            })),
          },
        ],
      },
      status: 'success',
      docsUrl: DOC_REACH,
    },
  ];
}
