'use client';

import {
  CircleCheck,
  Gauge,
  ListChecks,
  type LucideIcon,
  ServerCog,
  TriangleAlert,
} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  CHECK_COLOR,
  type CheckStatus,
  COVERAGE_GOAL,
  type Dataset,
  datasetChecks,
  datasetCoverage,
  datasetEmq,
  DATASETS,
  EMQ_BAND_META,
  emqBand,
  formatCount,
  type MaturityCheck,
  omnichannelEligible,
  openIssueCount,
} from '@/lib/demos/signals-health';

import {
  Badge,
  CoverageBar,
  EmqRing,
  Insight,
  Kpi,
  SectionHeading,
  SourceSplitBar,
  type Tone,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_ADSPIXELS =
  'https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/';
const DOC_DATASET_QUALITY =
  'https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api';
const DOC_OFFLINE_QUALITY =
  'https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api/offline-events';
const DOC_STATS =
  'https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/#fields';

type View = 'overview' | 'events' | 'maturity';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'overview', label: 'Overview', icon: Gauge},
  {id: 'events', label: 'Events', icon: ServerCog},
  {id: 'maturity', label: 'Maturity', icon: ListChecks},
];

const CHECK_TONE: Record<CheckStatus, Tone> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'rose',
};

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// Reads that populate the dashboard for the selected dataset (= pixel).
function buildLoadCalls(dataset: Dataset): ApiCallInput[] {
  const calls: ApiCallInput[] = [
    {
      method: 'GET',
      endpoint: `${dataset.id}/stats`,
      summary: `Event statistics for ${dataset.name} (7-day window)`,
      request: {
        aggregation: 'event_source',
        fields: 'event_processing_results,match_keys,had_pii',
      },
      response: {
        data: dataset.stats.map(e => ({
          event_name: e.eventName,
          server: e.serverCount,
          browser: e.browserCount,
          deduplicated: e.dedupedCount,
          processing_issues: e.processingIssues,
        })),
      },
      status: 'success',
      docsUrl: DOC_STATS,
    },
    {
      method: 'GET',
      endpoint: 'dataset_quality',
      summary: `Web dataset quality (EMQ) for ${dataset.name}`,
      request: {
        dataset_id: dataset.id,
        fields:
          'web{event_name,event_match_quality{composite_score},event_coverage{percentage,goal_percentage},match_key_feedback{identifier,coverage},data_freshness{upload_frequency}}',
      },
      response: {
        web: dataset.web.map(e => ({
          event_name: e.eventName,
          event_match_quality: {composite_score: e.compositeScore},
          event_coverage: {
            percentage: e.coveragePct,
            goal_percentage: e.goalPct,
          },
        })),
        data_freshness: {upload_frequency: dataset.freshness},
      },
      status: 'success',
      docsUrl: DOC_DATASET_QUALITY,
    },
  ];

  if (dataset.offline) {
    calls.push({
      method: 'GET',
      endpoint: 'dataset_quality',
      summary: `Offline dataset quality for ${dataset.name}`,
      request: {dataset_id: dataset.id, fields: 'offline'},
      response: {
        offline: {
          composite: {score: dataset.offline.composite},
          match_key: {
            coverage: {
              email: dataset.offline.matchKeyEmailPct,
              phone: dataset.offline.matchKeyPhonePct,
            },
          },
        },
      },
      status: 'success',
      docsUrl: DOC_OFFLINE_QUALITY,
    });
  }

  calls.push({
    method: 'GET',
    endpoint: dataset.id,
    summary: `Pixel settings for ${dataset.name}`,
    request: {fields: 'automatic_matching_fields,checks'},
    response: {automatic_matching_fields: dataset.automaticMatching},
    status: 'success',
    docsUrl: DOC_ADSPIXELS,
  });

  return calls;
}

export function SignalsHealthDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('overview');
  const [selectedId, setSelectedId] = useState<string>(DATASETS[0].id);

  const selected = DATASETS.find(d => d.id === selectedId) ?? DATASETS[0];
  const perDataset = view === 'overview' || view === 'events';

  // Log the initial reads that populate the dashboard, re-firing per dataset.
  useApiLoads(selectedId, () => buildLoadCalls(selected));

  const handleApplyRemediation = useCallback(
    (dataset: Dataset, check: MaturityCheck) => {
      record({
        method: 'POST',
        endpoint: dataset.id,
        summary: `Apply fix — ${check.label} · ${dataset.name}`,
        request: {
          automatic_matching_fields: ['em', 'ph', 'fn', 'ln'],
          check: check.key,
        },
        response: {success: true, applied_check: check.key},
        status: 'success',
        docsUrl: DOC_ADSPIXELS,
      });
    },
    [record],
  );

  const handleRepollEmq = useCallback(
    (dataset: Dataset) => {
      record({
        method: 'GET',
        endpoint: 'dataset_quality',
        summary: `Re-poll EMQ after fix — ${dataset.name}`,
        request: {
          dataset_id: dataset.id,
          fields:
            'web{event_name,event_match_quality{composite_score},event_coverage{percentage,goal_percentage}}',
        },
        response: {
          web: dataset.web.map(e => ({
            event_name: e.eventName,
            event_match_quality: {composite_score: e.compositeScore},
          })),
        },
        status: 'success',
        docsUrl: DOC_DATASET_QUALITY,
      });
    },
    [record],
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

        {perDataset ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Dataset</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select dataset"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
              {DATASETS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'overview' ? (
        <OverviewView
          selected={selected}
          onSelect={setSelectedId}
          onApplyRemediation={handleApplyRemediation}
          onRepollEmq={handleRepollEmq}
        />
      ) : null}
      {view === 'events' ? <EventsView dataset={selected} /> : null}
      {view === 'maturity' ? (
        <MaturityView onApplyRemediation={handleApplyRemediation} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewView({
  selected,
  onSelect,
  onApplyRemediation,
  onRepollEmq,
}: {
  selected: Dataset;
  onSelect: (id: string) => void;
  onApplyRemediation: (dataset: Dataset, check: MaturityCheck) => void;
  onRepollEmq: (dataset: Dataset) => void;
}) {
  const avgEmq =
    DATASETS.reduce((s, d) => s + datasetEmq(d), 0) / DATASETS.length;
  const belowGoal = DATASETS.filter(
    d => datasetCoverage(d) < COVERAGE_GOAL,
  ).length;
  const omniReady = DATASETS.filter(omnichannelEligible).length;
  const events7d = DATASETS.reduce(
    (s, d) =>
      s + d.stats.reduce((t, e) => t + e.serverCount + e.browserCount, 0),
    0,
  );

  const ranked = [...DATASETS].sort(
    (a, b) => openIssueCount(b) - openIssueCount(a),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionHeading
          title="Selected dataset"
          sub={`${selected.name} · pick another from the portfolio below`}
        />
        <DatasetDetail
          dataset={selected}
          onApplyRemediation={onApplyRemediation}
          onRepollEmq={onRepollEmq}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Avg event match quality"
          value={avgEmq.toFixed(1)}
          note="of 10 across datasets"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Below coverage goal"
          value={String(belowGoal)}
          note={`${COVERAGE_GOAL}% goal`}
          noteTone={belowGoal > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Omnichannel ready"
          value={`${omniReady}/${DATASETS.length}`}
          note="offline ≥ 8.5"
          accentVar="var(--green)"
        />
        <Kpi
          label="Events (7d)"
          value={formatCount(events7d)}
          note="server + browser"
          accentVar="var(--purple)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Datasets · ranked by open issues
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Dataset</th>
                <th className={TH}>EMQ</th>
                <th className={TH}>Coverage</th>
                <th className={TH}>Freshness</th>
                <th className={TH}>Omnichannel</th>
                <th className={TH}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(d => {
                const emq = datasetEmq(d);
                const band = EMQ_BAND_META[emqBand(emq)];
                const coverage = datasetCoverage(d);
                const issues = openIssueCount(d);
                const active = d.id === selected.id;
                return (
                  <tr
                    key={d.id}
                    onClick={() => {
                      onSelect(d.id);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {d.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {d.businessName} · {d.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums"
                        style={{color: band.colorVar}}>
                        {emq.toFixed(1)}
                        <span className="text-[10px] font-semibold">
                          {band.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-[12px] tabular-nums text-ink-2">
                          {coverage}%
                        </span>
                        <div className="w-20">
                          <CoverageBar pct={coverage} goalPct={COVERAGE_GOAL} />
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} capitalize`}>
                      {d.freshness.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2.5">
                      {omnichannelEligible(d) ? (
                        <Badge tone="green">Ready</Badge>
                      ) : (
                        <Badge tone="muted">Not yet</Badge>
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
    </div>
  );
}

function DatasetDetail({
  dataset,
  onApplyRemediation,
  onRepollEmq,
}: {
  dataset: Dataset;
  onApplyRemediation: (dataset: Dataset, check: MaturityCheck) => void;
  onRepollEmq: (dataset: Dataset) => void;
}) {
  const emq = datasetEmq(dataset);
  const band = EMQ_BAND_META[emqBand(emq)];
  const diagnostics = dataset.web.filter(e => e.diagnostic);
  const checks = datasetChecks(dataset);
  const remediationCheck = checks.find(c => c.status !== 'pass') ?? checks[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <EmqRing score={emq} size={76} stroke={7} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
                {dataset.name}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: band.colorVar,
                  background: `color-mix(in srgb, ${band.colorVar} 16%, transparent)`,
                }}>
                {band.label} EMQ
              </span>
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-ink-3">
              {dataset.businessName} · dataset {dataset.id}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Event match quality is the average composite across this
              dataset&apos;s events. Improve coverage of hashed identifiers to
              raise it.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto border-t border-border pt-4">
          <table className="w-full min-w-[460px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>Event</th>
                <th className={TH}>EMQ</th>
                <th className={TH}>Coverage</th>
                <th className={TH}>Top match keys</th>
              </tr>
            </thead>
            <tbody>
              {dataset.web.map(e => {
                const eb = EMQ_BAND_META[emqBand(e.compositeScore)];
                return (
                  <tr key={e.eventName} className="border-t border-border">
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                      {e.eventName}
                      {e.dedupeOk ? null : (
                        <span className="ml-1.5 align-middle">
                          <Badge tone="rose">no dedupe</Badge>
                        </span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 text-[13px] font-bold tabular-nums"
                      style={{color: eb.colorVar}}>
                      {e.compositeScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-[12px] tabular-nums text-ink-2">
                          {e.coveragePct}%
                        </span>
                        <div className="w-16">
                          <CoverageBar
                            pct={e.coveragePct}
                            goalPct={e.goalPct}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {e.matchKeys.slice(0, 3).map(m => (
                          <span
                            key={m.identifier}
                            className="rounded border border-border px-1.5 py-0.5 text-[10px] tabular-nums text-ink-2">
                            {m.label} {m.coveragePct}%
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {dataset.offline ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">
                Offline dataset
              </span>
              {omnichannelEligible(dataset) ? (
                <Badge tone="green">Omnichannel ready</Badge>
              ) : (
                <Badge tone="yellow">Below 8.5 gate</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <EmqRing score={dataset.offline.composite} size={60} stroke={6} />
              <div className="flex-1 text-[12px] text-ink-2">
                <div className="flex justify-between py-0.5">
                  <span>Email coverage</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {dataset.offline.matchKeyEmailPct}%
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Phone coverage</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {dataset.offline.matchKeyPhonePct}%
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Freshness</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {dataset.offline.freshnessScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            {dataset.offline.recommendation ? (
              <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
                {dataset.offline.recommendation}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ink">Remediation</span>
            {diagnostics.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onRepollEmq(dataset);
                }}
                className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                Re-poll EMQ
              </button>
            ) : null}
          </div>
          {diagnostics.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {diagnostics.map(e => (
                <li
                  key={e.eventName}
                  className="flex gap-2 text-[12px] text-ink-2">
                  <TriangleAlert
                    className="mt-0.5 size-3.5 shrink-0 text-[color:var(--cat-measurement)]"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <span>
                      <span className="font-semibold text-ink">
                        {e.eventName}:
                      </span>{' '}
                      {e.diagnostic}
                    </span>
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyRemediation(dataset, remediationCheck);
                        }}
                        className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-colors hover:opacity-90">
                        Apply fix
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
              <CircleCheck className="size-4 text-[color:var(--green)]" />
              No diagnostics — this dataset is healthy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events (/stats)
// ---------------------------------------------------------------------------

function EventsView({dataset}: {dataset: Dataset}) {
  const totalServer = dataset.stats.reduce((s, e) => s + e.serverCount, 0);
  const totalBrowser = dataset.stats.reduce((s, e) => s + e.browserCount, 0);
  const totalIssues = dataset.stats.reduce((s, e) => s + e.processingIssues, 0);
  const total = totalServer + totalBrowser;
  const serverShare = total === 0 ? 0 : Math.round((totalServer / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Server events"
          value={formatCount(totalServer)}
          note="via CAPI"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Browser events"
          value={formatCount(totalBrowser)}
          note="via Pixel"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Server share"
          value={`${serverShare}%`}
          note="of total volume"
          noteTone={serverShare >= 50 ? 'up' : 'muted'}
        />
        <Kpi
          label="Processing issues"
          value={formatCount(totalIssues)}
          note="last 7 days"
          noteTone={totalIssues > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
      </div>

      <SectionHeading
        title="Event statistics"
        sub="From the pixel /stats edge — server vs browser, deduplication, and processing. 7-day window."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Event</th>
                <th className={TH}>Source split</th>
                <th className={TH}>Server</th>
                <th className={TH}>Browser</th>
                <th className={TH}>Deduplicated</th>
                <th className={TH}>With PII</th>
                <th className={TH}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {dataset.stats.map(e => {
                const serverOnly = e.browserCount === 0;
                const browserOnly = e.serverCount === 0;
                return (
                  <tr key={e.eventName} className="border-t border-border">
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                      {e.eventName}
                      {browserOnly ? (
                        <span className="ml-1.5 align-middle">
                          <Badge tone="rose">browser only</Badge>
                        </span>
                      ) : serverOnly ? (
                        <span className="ml-1.5 align-middle">
                          <Badge tone="blue">server only</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="w-28">
                        <SourceSplitBar
                          serverCount={e.serverCount}
                          browserCount={e.browserCount}
                        />
                      </div>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(e.serverCount)}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(e.browserCount)}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(e.dedupedCount)}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(e.hadPiiCount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {e.processingIssues === 0 ? (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      ) : (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--rose)]">
                          {formatCount(e.processingIssues)}
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

      <div className="flex flex-wrap gap-4 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{background: 'var(--cat-signals)'}}
          />
          Server (CAPI)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{background: 'var(--purple)'}}
          />
          Browser (Pixel)
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maturity (signals maturity framework / scorecard)
// ---------------------------------------------------------------------------

function MaturityView({
  onApplyRemediation,
}: {
  onApplyRemediation: (dataset: Dataset, check: MaturityCheck) => void;
}) {
  const rows = DATASETS.map(d => ({dataset: d, checks: datasetChecks(d)}));
  const checkLabels = rows[0].checks.map(c => c.label);
  const fullyMature = rows.filter(r =>
    r.checks.every(c => c.status === 'pass'),
  ).length;
  const totalOpen = rows.reduce(
    (s, r) => s + r.checks.filter(c => c.status !== 'pass').length,
    0,
  );
  const topGap = [...rows].sort(
    (a, b) =>
      b.checks.filter(c => c.status === 'fail').length -
      a.checks.filter(c => c.status === 'fail').length,
  )[0];

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Signals maturity framework"
        sub="Best-practice checks codified from the Dataset Quality goals, scored per dataset."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Fully mature"
          value={`${fullyMature}/${DATASETS.length}`}
          note="all checks pass"
          accentVar="var(--green)"
        />
        <Kpi
          label="Open gaps"
          value={String(totalOpen)}
          note="across datasets"
          accentVar="var(--rose)"
        />
        <Kpi
          label="Checks / dataset"
          value={String(checkLabels.length)}
          note="best practices"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Coverage goal"
          value={`${COVERAGE_GOAL}%`}
          note="event coverage"
          accentVar="var(--purple)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Dataset</th>
                {checkLabels.map(label => (
                  <th key={label} className={`${TH} text-center`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({dataset, checks}) => (
                <tr key={dataset.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="text-[13px] font-semibold text-ink">
                      {dataset.name}
                    </div>
                    <div className="text-[11px] text-ink-3">
                      {dataset.businessName}
                    </div>
                  </td>
                  {checks.map(c => {
                    const color = CHECK_COLOR[c.status];
                    return (
                      <td key={c.key} className="px-3 py-2.5 text-center">
                        <span
                          className="inline-flex min-w-[3.5rem] justify-center rounded px-2 py-0.5 text-[10px] font-semibold capitalize"
                          style={{
                            color,
                            background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          }}
                          title={c.detail}>
                          {c.status}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionHeading title="Top remediation actions" />
        <div className="flex flex-col gap-2">
          {rows.flatMap(({dataset, checks}) =>
            checks
              .filter(c => c.remediation)
              .map(c => (
                <div
                  key={`${dataset.id}-${c.key}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                  <Badge tone={CHECK_TONE[c.status]}>{c.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">
                      {c.remediation}
                    </p>
                    <p className="text-[11px] text-ink-3">
                      {dataset.name} · {c.detail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRemediation(dataset, c);
                    }}
                    className="shrink-0 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-colors hover:opacity-90">
                    Apply fix
                  </button>
                </div>
              )),
          )}
        </div>
      </div>

      {topGap.checks.some(c => c.status === 'fail') ? (
        <Insight>
          <strong className="text-ink">Priority:</strong> {topGap.dataset.name}{' '}
          has the most failing checks. Sending its browser-only events through
          the Conversions API and raising match-key coverage would clear most
          gaps and improve match quality.
        </Insight>
      ) : null}
    </div>
  );
}
