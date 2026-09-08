'use client';

import {
  CircleCheck,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShieldAlert,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  type Catalogue,
  catalogueChecks,
  catalogueMatchRate,
  CATALOGUES,
  CHECK_COLOR,
  dailyMatchTrend,
  type Diagnostic,
  DIAGNOSTIC_TYPE_LABELS,
  diagnosticCount,
  type DiagnosticType,
  formatCount,
  formatPct,
  HEALTH_BAND_META,
  healthBand,
  healthScore,
  mustFixCount,
  openIssueCount,
  opportunityCount,
  productCompleteness,
  videoCoverage,
} from '@/lib/demos/catalogue-health';

import {
  Badge,
  CompletenessRing,
  DiagnosticBadge,
  HealthScoreRing,
  Insight,
  Kpi,
  MatchRateBar,
  SectionHeading,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_PRODUCTS =
  'https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products/';
const DOC_CATALOG =
  'https://developers.facebook.com/docs/marketing-api/catalog/overview';

// Product fields read for completeness + video coverage scoring (per spec).
const PRODUCT_FIELDS =
  'retailer_id,brand,description,name,availability,condition,price,image_url,url,video_fetch_status,errors';

// The initial reads that populate the dashboard for a catalogue: event_stats
// (match rate), diagnostics (typed/severity issues), and products (completeness
// + video coverage). Mirrors docs/solutions/catalogue/catalogue-health-dashboard.md.
function buildLoadCalls(catalogue: Catalogue): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `${catalogue.id}/event_stats`,
      summary: `Read match-rate event stats — ${catalogue.name}`,
      request: {
        breakdowns: ['device_type'],
        date_preset: 'LAST_28_DAYS',
      },
      response: {
        data: {
          match_rate: catalogueMatchRate(catalogue),
          days: catalogue.eventStats.length,
        },
      },
      status: 'success',
      docsUrl: DOC_CATALOG,
    },
    {
      method: 'GET',
      endpoint: `${catalogue.id}/diagnostics`,
      summary: `Read catalogue diagnostics — ${catalogue.name}`,
      request: {severities: ['MUST_FIX', 'OPPORTUNITY']},
      response: {
        data: catalogue.diagnostics.map(d => ({
          type: d.type,
          severity: d.severity,
          affected_entities: d.affectedEntities,
          affected_channels: d.affectedChannels,
        })),
      },
      status: 'success',
      docsUrl: DOC_CATALOG,
    },
    {
      method: 'GET',
      endpoint: `${catalogue.id}/products`,
      summary: 'Read product metadata for completeness + video coverage',
      request: {fields: PRODUCT_FIELDS, limit: 100},
      response: {
        summary: {
          total_products: catalogue.products.totalProducts,
          complete_products: catalogue.products.completeProducts,
          with_video: catalogue.products.withVideo,
        },
      },
      status: 'success',
      docsUrl: DOC_PRODUCTS,
    },
  ];
}

type View = 'overview' | 'diagnostics' | 'products';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'overview', label: 'Overview', icon: LayoutDashboard},
  {id: 'diagnostics', label: 'Diagnostics', icon: ShieldAlert},
  {id: 'products', label: 'Products', icon: Package},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

export function CatalogueHealthDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('overview');
  const [selectedId, setSelectedId] = useState<string>(CATALOGUES[0].id);

  const selected = CATALOGUES.find(c => c.id === selectedId) ?? CATALOGUES[0];

  // Log the initial reads that populate the dashboard, re-firing per catalogue.
  useApiLoads(selectedId, () => buildLoadCalls(selected));

  // Selecting a catalogue drills into its typed diagnostics.
  const handleSelectCatalogue = useCallback(
    (id: string) => {
      setSelectedId(id);
      const next = CATALOGUES.find(c => c.id === id);
      if (!next) return;
      record({
        method: 'GET',
        endpoint: `${next.id}/diagnostics`,
        summary: `Drill into diagnostics — ${next.name}`,
        request: {
          fields: 'type,severity,affected_entities,affected_channels',
          severities: ['MUST_FIX', 'OPPORTUNITY'],
        },
        response: {
          data: next.diagnostics.map(d => ({
            type: d.type,
            severity: d.severity,
            affected_entities: d.affectedEntities,
          })),
        },
        status: 'success',
        docsUrl: DOC_CATALOG,
      });
    },
    [record],
  );

  // Apply a remediation write for a single diagnostic (Catalogue API update).
  const handleRemediate = useCallback(
    (diagnostic: Diagnostic) => {
      record({
        method: 'POST',
        endpoint: `${selected.id}/items_batch`,
        summary: `Apply fix — ${DIAGNOSTIC_TYPE_LABELS[diagnostic.type]}`,
        request: {
          item_type: 'PRODUCT_ITEM',
          requests: [
            {
              method: 'UPDATE',
              retailer_id: `<${diagnostic.affectedEntities} affected items>`,
              data: {diagnostic_type: diagnostic.type},
            },
          ],
        },
        response: {
          handles: [`Ac=${diagnostic.type}`],
          resolved_entities: diagnostic.affectedEntities,
        },
        status: 'success',
        docsUrl: DOC_CATALOG,
      });
    },
    [selected.id, record],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {TABS.map(({id, label, icon: Icon}) => {
            const on = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>

        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Catalogue</span>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
            }}
            aria-label="Select catalogue"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
            {CATALOGUES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'overview' ? (
        <OverviewView selected={selected} onSelect={handleSelectCatalogue} />
      ) : null}
      {view === 'diagnostics' ? (
        <DiagnosticsView selected={selected} onRemediate={handleRemediate} />
      ) : null}
      {view === 'products' ? <ProductsView selected={selected} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewView({
  selected,
  onSelect,
}: {
  selected: Catalogue;
  onSelect: (id: string) => void;
}) {
  const avgMatchRate =
    CATALOGUES.reduce((s, c) => s + catalogueMatchRate(c), 0) /
    CATALOGUES.length;
  const totalDiagnostics = CATALOGUES.reduce(
    (s, c) => s + diagnosticCount(c),
    0,
  );
  const totalProducts = CATALOGUES.reduce(
    (s, c) => s + c.products.totalProducts,
    0,
  );
  const avgVideoCoverage =
    CATALOGUES.reduce((s, c) => s + videoCoverage(c), 0) / CATALOGUES.length;

  const ranked = [...CATALOGUES].sort(
    (a, b) => healthScore(b) - healthScore(a),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Avg match rate"
          value={formatPct(avgMatchRate)}
          note="across catalogues"
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Total diagnostics"
          value={String(totalDiagnostics)}
          note="all catalogues"
          noteTone={totalDiagnostics > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Total products"
          value={formatCount(totalProducts)}
          note="across catalogues"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Avg video coverage"
          value={formatPct(avgVideoCoverage)}
          note="products with video"
          accentVar="var(--green)"
        />
      </div>

      {/* Catalogue table ranked by health score */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Catalogues · ranked by health score
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Catalogue</th>
                <th className={TH}>Health</th>
                <th className={TH}>Match rate</th>
                <th className={TH}>Completeness</th>
                <th className={TH}>Video</th>
                <th className={TH}>Diagnostics</th>
                <th className={TH}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(c => {
                const score = healthScore(c);
                const band = HEALTH_BAND_META[healthBand(score)];
                const matchRate = catalogueMatchRate(c);
                const completeness = productCompleteness(c);
                const vidCov = videoCoverage(c);
                const issues = openIssueCount(c);
                const active = c.id === selected.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {c.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {c.businessName} · {c.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums"
                        style={{color: band.colorVar}}>
                        {score}
                        <span className="text-[10px] font-semibold">
                          {band.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-10 text-[12px] tabular-nums text-ink-2">
                          {(matchRate * 100).toFixed(0)}%
                        </span>
                        <div className="w-20">
                          <MatchRateBar matchedPct={matchRate * 100} />
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {(completeness * 100).toFixed(0)}%
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {(vidCov * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5">
                      {diagnosticCount(c) === 0 ? (
                        <Badge tone="green">Clean</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          {mustFixCount(c) > 0 ? (
                            <Badge tone="rose">
                              {mustFixCount(c)} must fix
                            </Badge>
                          ) : null}
                          {opportunityCount(c) > 0 ? (
                            <Badge tone="yellow">
                              {opportunityCount(c)} opp
                            </Badge>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {issues === 0 ? (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink">
                          <TriangleAlert className="size-3.5 text-[color:var(--cat-measurement)]" />
                          {issues}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected catalogue detail */}
      <CatalogueDetail catalogue={selected} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalogue detail card (match rate trend + top diagnostics)
// ---------------------------------------------------------------------------

function CatalogueDetail({catalogue}: {catalogue: Catalogue}) {
  const score = healthScore(catalogue);
  const band = HEALTH_BAND_META[healthBand(score)];
  const trend = dailyMatchTrend(catalogue);
  const maxVolume = Math.max(...trend.map(d => d.matched + d.unmatched), 1);
  const topDiagnostics = catalogue.diagnostics.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Match rate trend (28-day SVG sparkline) */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <HealthScoreRing score={score} size={76} stroke={7} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
                {catalogue.name}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: band.colorVar,
                  background: `color-mix(in srgb, ${band.colorVar} 16%, transparent)`,
                }}>
                {band.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-ink-3">
              {catalogue.businessName} · catalogue {catalogue.id}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Match rate trend over the last 28 days. Bars show matched (green)
              vs unmatched (red) content ID volume per day.
            </p>
          </div>
        </div>

        {/* 28-day bar chart */}
        <div className="mt-4 border-t border-border pt-4">
          <svg
            viewBox={`0 0 ${trend.length * 14} 80`}
            className="w-full"
            aria-label="28-day match rate trend">
            {trend.map((d, i) => {
              const total = d.matched + d.unmatched;
              const barH = total === 0 ? 0 : (total / maxVolume) * 70;
              const matchedH = total === 0 ? 0 : (d.matched / total) * barH;
              const unmatchedH = barH - matchedH;
              const x = i * 14 + 2;
              return (
                <g key={d.date}>
                  {/* Unmatched (top portion) */}
                  <rect
                    x={x}
                    y={80 - barH}
                    width={10}
                    height={unmatchedH}
                    rx={1}
                    fill="var(--rose)"
                    opacity={0.5}
                  />
                  {/* Matched (bottom portion) */}
                  <rect
                    x={x}
                    y={80 - matchedH}
                    width={10}
                    height={matchedH}
                    rx={1}
                    fill="var(--green)"
                    opacity={0.7}
                  />
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-ink-3">
            <span>{trend[0]?.date}</span>
            <span>{trend[trend.length - 1]?.date}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--green)'}}
              />
              Matched
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--rose)'}}
              />
              Unmatched
            </span>
          </div>
        </div>
      </div>

      {/* Top diagnostics */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="text-sm font-bold text-ink">Top diagnostics</span>
          {topDiagnostics.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {topDiagnostics.map((d, i) => (
                <li
                  key={`${d.type}-${i}`}
                  className="flex items-start gap-2 text-[12px] text-ink-2">
                  <TriangleAlert
                    className="mt-0.5 size-3.5 shrink-0"
                    style={{
                      color:
                        d.severity === 'MUST_FIX'
                          ? 'var(--rose)'
                          : 'var(--cat-measurement)',
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-ink">{d.title}</span>
                    <span className="ml-1.5 align-middle">
                      <DiagnosticBadge severity={d.severity} />
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      {d.affectedEntities} affected ·{' '}
                      {d.affectedChannels.join(', ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
              <CircleCheck className="size-4 text-[color:var(--green)]" />
              No diagnostics — this catalogue is healthy.
            </p>
          )}
        </div>

        {/* Health checks summary */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="text-sm font-bold text-ink">Health checks</span>
          <div className="mt-2 flex flex-col gap-1.5">
            {catalogueChecks(catalogue).map(ch => {
              const color = CHECK_COLOR[ch.status];
              return (
                <div
                  key={ch.key}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px]"
                  style={{
                    background: `color-mix(in srgb, ${color} 8%, transparent)`,
                  }}>
                  <span className="font-medium text-ink">{ch.label}</span>
                  <span
                    className="font-semibold tabular-nums capitalize"
                    style={{color}}>
                    {ch.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagnostics tab
// ---------------------------------------------------------------------------

function DiagnosticsView({
  selected,
  onRemediate,
}: {
  selected: Catalogue;
  onRemediate: (diagnostic: Diagnostic) => void;
}) {
  const allDiagnostics = selected.diagnostics;
  const mustFixes = allDiagnostics.filter(d => d.severity === 'MUST_FIX');
  const opportunities = allDiagnostics.filter(
    d => d.severity === 'OPPORTUNITY',
  );

  // Group by type
  const byType = new Map<DiagnosticType, typeof allDiagnostics>();
  for (const d of allDiagnostics) {
    const list = byType.get(d.type) ?? [];
    list.push(d);
    byType.set(d.type, list);
  }

  // Cross-catalogue summary
  const allMustFix = CATALOGUES.reduce((s, c) => s + mustFixCount(c), 0);
  const allOpportunity = CATALOGUES.reduce(
    (s, c) => s + opportunityCount(c),
    0,
  );
  const allTotal = CATALOGUES.reduce((s, c) => s + diagnosticCount(c), 0);
  const cleanCatalogues = CATALOGUES.filter(
    c => diagnosticCount(c) === 0,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Must-fix issues"
          value={String(allMustFix)}
          note="across all catalogues"
          noteTone={allMustFix > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Opportunities"
          value={String(allOpportunity)}
          note="across all catalogues"
          accentVar="var(--cat-measurement)"
        />
        <Kpi
          label="Total diagnostics"
          value={String(allTotal)}
          note="all types"
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Clean catalogues"
          value={`${cleanCatalogues}/${CATALOGUES.length}`}
          note="no diagnostics"
          accentVar="var(--green)"
        />
      </div>

      <SectionHeading
        title={`Diagnostics for ${selected.name}`}
        sub="Grouped by diagnostic type and severity. From the Catalogue diagnostics API."
      />

      {allDiagnostics.length === 0 ? (
        <Insight>
          <strong className="text-ink">All clear.</strong> This catalogue has no
          diagnostics. All items pass quality checks across all diagnostic
          types.
        </Insight>
      ) : (
        <>
          {/* Must-fix section */}
          {mustFixes.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-2 px-4 py-2.5">
                <span className="text-[13px] font-bold text-ink">Must fix</span>
                <span className="ml-2 text-[11px] text-ink-3">
                  {mustFixes.length} issue{mustFixes.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className={TH}>Type</th>
                      <th className={TH}>Description</th>
                      <th className={TH}>Affected</th>
                      <th className={TH}>Channels</th>
                      <th className={TH}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mustFixes.map((d, i) => (
                      <tr
                        key={`mf-${d.type}-${i}`}
                        className="border-t border-border">
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] font-semibold text-ink">
                            {DIAGNOSTIC_TYPE_LABELS[d.type]}
                          </span>
                        </td>
                        <td className={TD}>{d.title}</td>
                        <td className={`${TD} tabular-nums`}>
                          {formatCount(d.affectedEntities)}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap gap-1">
                            {d.affectedChannels.map(ch => (
                              <Badge key={ch} tone="muted">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              onRemediate(d);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:bg-brand hover:text-on-brand">
                            <Wrench className="size-3.5" />
                            Apply fix
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Opportunity section */}
          {opportunities.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-2 px-4 py-2.5">
                <span className="text-[13px] font-bold text-ink">
                  Opportunities
                </span>
                <span className="ml-2 text-[11px] text-ink-3">
                  {opportunities.length} suggestion
                  {opportunities.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className={TH}>Type</th>
                      <th className={TH}>Description</th>
                      <th className={TH}>Affected</th>
                      <th className={TH}>Channels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((d, i) => (
                      <tr
                        key={`op-${d.type}-${i}`}
                        className="border-t border-border">
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] font-semibold text-ink">
                            {DIAGNOSTIC_TYPE_LABELS[d.type]}
                          </span>
                        </td>
                        <td className={TD}>{d.title}</td>
                        <td className={`${TD} tabular-nums`}>
                          {formatCount(d.affectedEntities)}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap gap-1">
                            {d.affectedChannels.map(ch => (
                              <Badge key={ch} tone="muted">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Grouped by type summary */}
          <SectionHeading title="By diagnostic type" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[...byType.entries()].map(([type, items]) => {
              const mf = items.filter(d => d.severity === 'MUST_FIX').length;
              return (
                <div
                  key={type}
                  className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-[11px] font-semibold text-ink-3">
                    {DIAGNOSTIC_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {items.length}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {mf > 0 ? <Badge tone="rose">{mf} must fix</Badge> : null}
                    {items.length - mf > 0 ? (
                      <Badge tone="yellow">{items.length - mf} opp</Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Cross-catalogue remediation insight */}
      {allMustFix > 0 ? (
        <Insight>
          <strong className="text-ink">Priority:</strong> There are {allMustFix}{' '}
          must-fix diagnostic{allMustFix === 1 ? '' : 's'} across all
          catalogues. Resolving these will prevent items from being hidden from
          ads and Shops surfaces.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Products tab
// ---------------------------------------------------------------------------

function ProductsView({selected}: {selected: Catalogue}) {
  const completeness = productCompleteness(selected);
  const vidCov = videoCoverage(selected);
  const totalProducts = selected.products.totalProducts;
  const completeProducts = selected.products.completeProducts;
  const withVideo = selected.products.withVideo;

  // Cross-catalogue totals
  const allProducts = CATALOGUES.reduce(
    (s, c) => s + c.products.totalProducts,
    0,
  );
  const allComplete = CATALOGUES.reduce(
    (s, c) => s + c.products.completeProducts,
    0,
  );
  const allWithVideo = CATALOGUES.reduce((s, c) => s + c.products.withVideo, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total products"
          value={formatCount(allProducts)}
          note="across catalogues"
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Fully complete"
          value={formatCount(allComplete)}
          note={`${((allComplete / allProducts) * 100).toFixed(0)}% of total`}
          noteTone={allComplete / allProducts >= 0.9 ? 'up' : 'down'}
          accentVar="var(--green)"
        />
        <Kpi
          label="With video"
          value={formatCount(allWithVideo)}
          note={`${((allWithVideo / allProducts) * 100).toFixed(0)}% coverage`}
          accentVar="var(--purple)"
        />
        <Kpi
          label="Incomplete"
          value={formatCount(allProducts - allComplete)}
          note="missing required fields"
          noteTone={allProducts - allComplete > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
      </div>

      <SectionHeading
        title={`Product scorecard · ${selected.name}`}
        sub="Completeness and video coverage for the selected catalogue."
      />

      {/* Completeness + video summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <CompletenessRing pct={completeness * 100} size={80} stroke={7} />
            <div>
              <h3 className="text-lg font-bold text-ink">
                Product completeness
              </h3>
              <p className="text-[13px] text-ink-2">
                {formatCount(completeProducts)} of {formatCount(totalProducts)}{' '}
                products have all 7 required fields populated.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <CompletenessRing pct={vidCov * 100} size={80} stroke={7} />
            <div>
              <h3 className="text-lg font-bold text-ink">Video coverage</h3>
              <p className="text-[13px] text-ink-2">
                {formatCount(withVideo)} of {formatCount(totalProducts)}{' '}
                products have video content (video array or video_fetch_status).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Required field coverage breakdown */}
      <SectionHeading
        title="Required field coverage"
        sub="Per-field breakdown of how many products have each required attribute populated."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Field</th>
                <th className={TH}>Present</th>
                <th className={TH}>Missing</th>
                <th className={TH}>Coverage</th>
                <th className={TH} style={{width: '30%'}}>
                  Bar
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.products.fieldCoverage.map(fc => {
                const pct =
                  fc.totalCount === 0
                    ? 0
                    : (fc.presentCount / fc.totalCount) * 100;
                const missing = fc.totalCount - fc.presentCount;
                const barColor =
                  pct >= 98
                    ? 'var(--green)'
                    : pct >= 90
                      ? 'var(--cat-measurement)'
                      : 'var(--rose)';
                return (
                  <tr key={fc.field} className="border-t border-border">
                    <td className="px-3 py-2.5 text-[13px] font-semibold capitalize text-ink">
                      {fc.field}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(fc.presentCount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {missing === 0 ? (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      ) : (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--rose)]">
                          {formatCount(missing)}
                        </span>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums font-semibold`}>
                      {pct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-catalogue completeness table */}
      <SectionHeading
        title="Completeness across catalogues"
        sub="Compare product completeness and video coverage side by side."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Catalogue</th>
                <th className={TH}>Products</th>
                <th className={TH}>Complete</th>
                <th className={TH}>Completeness</th>
                <th className={TH}>With video</th>
                <th className={TH}>Video %</th>
              </tr>
            </thead>
            <tbody>
              {CATALOGUES.map(c => {
                const comp = productCompleteness(c);
                const vid = videoCoverage(c);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-ink-3">
                        {c.businessName}
                      </div>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(c.products.totalProducts)}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(c.products.completeProducts)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{
                          color:
                            comp >= 0.9
                              ? 'var(--green)'
                              : comp >= 0.7
                                ? 'var(--cat-measurement)'
                                : 'var(--rose)',
                        }}>
                        {(comp * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(c.products.withVideo)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{
                          color:
                            vid >= 0.5
                              ? 'var(--green)'
                              : vid >= 0.2
                                ? 'var(--cat-measurement)'
                                : 'var(--rose)',
                        }}>
                        {(vid * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lowest-coverage field insight */}
      {(() => {
        if (selected.products.fieldCoverage.length === 0) return null;
        const sorted = [...selected.products.fieldCoverage].sort(
          (a, b) =>
            a.presentCount / a.totalCount - b.presentCount / b.totalCount,
        );
        const lowest = sorted[0];
        const lowestPct =
          lowest.totalCount > 0
            ? (lowest.presentCount / lowest.totalCount) * 100
            : 100;
        return lowestPct < 100 ? (
          <Insight>
            <strong className="text-ink">Action item:</strong> The{' '}
            <strong>{lowest.field}</strong> field has the lowest coverage at{' '}
            {lowestPct.toFixed(1)}% ({lowest.totalCount - lowest.presentCount}{' '}
            products missing). Populating this field will improve product
            completeness and ad eligibility.
          </Insight>
        ) : null;
      })()}
    </div>
  );
}
