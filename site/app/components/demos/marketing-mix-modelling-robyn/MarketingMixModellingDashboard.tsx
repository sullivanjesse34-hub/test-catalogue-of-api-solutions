'use client';

import {
  Activity,
  BarChart3,
  Database,
  type LucideIcon,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  blendedRoi,
  type ChannelResult,
  type ContributionRow,
  contributionRows,
  currencySymbol,
  currentScenario,
  FIT_BAND_META,
  fitBand,
  formatImpressions,
  formatMoneyCents,
  INVEST_SIGNAL_META,
  investSignal,
  marginalRoi,
  MMM_CSV_COLUMNS,
  MMM_CSV_SAMPLE,
  MODEL_RUNS,
  type ModelRun,
  optimisedScenario,
  responseCurve,
  type Scenario,
  scenarioUpliftCents,
  totalMediaSpendCents,
  totalRevenueCents,
} from '@/lib/demos/marketing-mix-modelling-robyn';

type View = 'decomposition' | 'response' | 'allocation' | 'data';

const DOC_INSIGHTS =
  'https://developers.facebook.com/docs/marketing-api/insights/marketing-mix-modeling/';
const DOC_BUSINESS =
  'https://developers.facebook.com/docs/business-management-apis/';

const BUSINESS_ID = '178520149832014';

// The initial reads that populate the dashboard: the Business Management API
// account list, then the async Insights `mmm` breakdown export for the run.
function buildLoadCalls(run: ModelRun): ApiCallInput[] {
  const reportRunId = `rr_${run.accountId}`;
  return [
    {
      method: 'GET',
      endpoint: `${BUSINESS_ID}/owned_ad_accounts`,
      summary: 'List ad accounts in the business portfolio',
      request: {fields: 'account_id,name,currency'},
      response: {
        data: MODEL_RUNS.map(r => ({
          account_id: r.accountId,
          name: r.accountName,
          currency: r.currency,
        })),
      },
      status: 'success',
      docsUrl: DOC_BUSINESS,
    },
    {
      method: 'POST',
      endpoint: `act_${run.accountId}/insights`,
      summary: `Submit async MMM breakdown export for ${run.accountName}`,
      request: {
        breakdowns: 'mmm',
        export_format: 'csv',
        level: 'adset',
        time_range: {since: run.windowStart, until: run.windowEnd},
        time_increment: 1,
      },
      response: {report_run_id: reportRunId},
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    },
    {
      method: 'GET',
      endpoint: reportRunId,
      summary: 'Poll async export status',
      request: {fields: 'async_status,async_percent_completion'},
      response: {
        async_status: 'Job Completed',
        async_percent_completion: 100,
        async_report_url: `https://graph.facebook.com/${reportRunId}/insights.csv`,
      },
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    },
  ];
}

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'decomposition', label: 'Decomposition', icon: BarChart3},
  {id: 'response', label: 'Response curves', icon: TrendingUp},
  {id: 'allocation', label: 'Budget scenario', icon: Sliders},
  {id: 'data', label: 'Model & data', icon: Database},
];

// --- small shared UI ------------------------------------------------------

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

function Pill({label, colorVar}: {label: string; colorVar: string}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color: colorVar,
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
      }}>
      {label}
    </span>
  );
}

// --- charts (inline SVG) --------------------------------------------------

/** Stacked horizontal bar: modelled revenue decomposition across channels. */
function DecompositionBar({rows}: {rows: ContributionRow[]}) {
  const total = rows.reduce((s, r) => s + r.contributionCents, 0);
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-lg bg-surface-2">
      {rows.map(r => {
        const pct = total > 0 ? (r.contributionCents / total) * 100 : 0;
        return (
          <div
            key={r.id}
            className="h-full"
            style={{width: `${pct}%`, background: r.colorVar}}
            title={`${r.label} · ${pct.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

/** Per-channel response (saturation) curve with the current-spend marker. */
function ResponseCurveChart({
  channel,
  colorVar,
  currency,
}: {
  channel: ChannelResult;
  colorVar: string;
  currency: string;
}) {
  const W = 300;
  const H = 150;
  const padL = 8;
  const padR = 8;
  const padTop = 12;
  const padBottom = 18;

  const pts = responseCurve(channel);
  const maxSpend = pts[pts.length - 1]?.spendCents ?? 1;
  const maxResp = Math.max(...pts.map(p => p.responseCents), 1);

  const x = (s: number) => padL + (s / maxSpend) * (W - padL - padR);
  const y = (r: number) =>
    padTop + (H - padTop - padBottom) * (1 - r / maxResp);

  const line = pts
    .map(p => `${x(p.spendCents).toFixed(1)},${y(p.responseCents).toFixed(1)}`)
    .join(' ');
  const area = `${padL},${H - padBottom} ${line} ${(W - padR).toFixed(1)},${H - padBottom}`;

  const curSpend = channel.spendCents;
  const curResp = pts.reduce((closest, p) =>
    Math.abs(p.spendCents - curSpend) < Math.abs(closest.spendCents - curSpend)
      ? p
      : closest,
  ).responseCents;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-32 w-full"
      role="img"
      aria-label="Modelled revenue response versus spend">
      <line
        x1={padL}
        x2={W - padR}
        y1={H - padBottom}
        y2={H - padBottom}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <polygon
        points={area}
        fill={`color-mix(in srgb, ${colorVar} 12%, transparent)`}
      />
      <polyline
        points={line}
        fill="none"
        stroke={colorVar}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={x(curSpend)}
        x2={x(curSpend)}
        y1={padTop}
        y2={H - padBottom}
        stroke="var(--ink-3)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle cx={x(curSpend)} cy={y(curResp)} r={3.5} fill={colorVar} />
      <text x={padL} y={H - 4} fontSize={9} fill="var(--ink-3)">
        {formatMoneyCents(0, currency)}
      </text>
      <text
        x={W - padR}
        y={H - 4}
        fontSize={9}
        textAnchor="end"
        fill="var(--ink-3)">
        {formatMoneyCents(maxSpend, currency)} spend
      </text>
    </svg>
  );
}

/** Grouped current-vs-optimised spend bars per channel. */
function ScenarioBars({
  current,
  optimised,
  currency,
}: {
  current: Scenario;
  optimised: Scenario;
  currency: string;
}) {
  const maxSpend = Math.max(
    ...current.allocations.map(a => a.spendCents),
    ...optimised.allocations.map(a => a.spendCents),
    1,
  );
  return (
    <div className="flex flex-col gap-3">
      {current.allocations.map((cur, i) => {
        const opt = optimised.allocations[i];
        const delta = opt.spendCents - cur.spendCents;
        return (
          <div key={cur.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-2">
                {cur.label}
              </span>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{
                  color:
                    delta > 0
                      ? 'var(--green)'
                      : delta < 0
                        ? 'var(--rose)'
                        : 'var(--ink-3)',
                }}>
                {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
                {formatMoneyCents(Math.abs(delta), currency)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cur.spendCents / maxSpend) * 100}%`,
                    background: 'var(--ink-3)',
                  }}
                />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(opt.spendCents / maxSpend) * 100}%`,
                    background: cur.colorVar,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-4 rounded-full"
            style={{background: 'var(--ink-3)'}}
          />
          Current spend
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-4 rounded-full"
            style={{background: 'var(--brand)'}}
          />
          Optimised spend
        </span>
      </div>
    </div>
  );
}

// --- views ----------------------------------------------------------------

function DecompositionView({run}: {run: ModelRun}) {
  const rows = useMemo(() => contributionRows(run), [run]);
  const total = totalRevenueCents(run);
  const mediaSpend = totalMediaSpendCents(run);
  const roi = blendedRoi(run);
  const maxContribution = Math.max(...rows.map(r => r.contributionCents), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Modelled revenue"
          value={formatMoneyCents(total, run.currency)}
          note="media + baseline"
          accentVar="var(--brand)"
        />
        <Kpi
          label="Media spend"
          value={formatMoneyCents(mediaSpend, run.currency)}
          note="all channels"
        />
        <Kpi
          label="Blended ROAS"
          value={`${roi.toFixed(1)}×`}
          note="modelled, media only"
          accentVar="var(--green)"
        />
        <Kpi
          label="Baseline share"
          value={`${Math.round((run.baselineContributionCents / total) * 100)}%`}
          note="non-media demand"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <SectionHeading
          title="Revenue decomposition"
          sub={`How ${run.accountName}'s modelled revenue splits across channels`}
        />
        <DecompositionBar rows={rows} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
                  Channel
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
                  Spend
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
                  Contribution
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
                  ROAS
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-[12px] text-ink">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{background: r.colorVar}}
                      />
                      <span className="font-medium">{r.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-ink-2">
                    {r.spendCents > 0
                      ? formatMoneyCents(r.spendCents, run.currency)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] font-semibold tabular-nums text-ink">
                    {formatMoneyCents(r.contributionCents, run.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-ink-2">
                    {r.roi != null ? `${r.roi.toFixed(1)}×` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(r.contributionCents / maxContribution) * 100}%`,
                            background: r.colorVar,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-ink-3">
                        {(r.share * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResponseView({run}: {run: ModelRun}) {
  const roi = blendedRoi(run);
  const rows = contributionRows(run);
  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-lg border p-3 text-[13px] leading-relaxed text-ink-2"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand) 25%, transparent)',
          background: 'color-mix(in srgb, var(--brand) 6%, transparent)',
        }}>
        <strong className="text-ink">Diminishing returns.</strong> Each curve is
        a fitted Hill response function. The dashed line marks current spend; a
        channel whose marker sits on the flattening part of the curve is
        saturated, and one still on the steep part has room to scale.
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {run.channels.map(c => {
          const meta = rows.find(r => r.id === c.id);
          const colorVar = meta?.colorVar ?? 'var(--brand)';
          const signal = investSignal(run, c);
          const sig = INVEST_SIGNAL_META[signal];
          const mRoi = marginalRoi(c);
          return (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                  <span
                    className="size-2.5 rounded-full"
                    style={{background: colorVar}}
                  />
                  {meta?.label}
                </span>
                <Pill label={sig.label} colorVar={sig.colorVar} />
              </div>
              <ResponseCurveChart
                channel={c}
                colorVar={colorVar}
                currency={run.currency}
              />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
                <span>
                  Marginal ROAS{' '}
                  <strong className="text-ink">{mRoi.toFixed(2)}×</strong>
                </span>
                <span>
                  Blended <span className="text-ink-3">{roi.toFixed(2)}×</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllocationView({run}: {run: ModelRun}) {
  const {record} = useApiConsole();
  const [applied, setApplied] = useState(false);

  const current = useMemo(() => currentScenario(run), [run]);
  const optimised = useMemo(() => optimisedScenario(run), [run]);
  const uplift = scenarioUpliftCents(run);
  const upliftPct =
    current.totalResponseCents > 0
      ? (uplift / current.totalResponseCents) * 100
      : 0;

  const applyPlan = () => {
    record({
      method: 'POST',
      endpoint: `act_${run.accountId}/insights`,
      summary: 'Re-export MMM data to re-fit after reallocating budget',
      request: {
        breakdowns: 'mmm',
        export_format: 'csv',
        level: 'adset',
        time_range: {since: run.windowStart, until: run.windowEnd},
      },
      response: {report_run_id: `rr_${run.accountId}_replan`},
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    });
    setApplied(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Budget (fixed)"
          value={formatMoneyCents(current.totalSpendCents, run.currency)}
          note="reallocated, not increased"
        />
        <Kpi
          label="Current response"
          value={formatMoneyCents(current.totalResponseCents, run.currency)}
          note="modelled revenue"
        />
        <Kpi
          label="Optimised response"
          value={formatMoneyCents(optimised.totalResponseCents, run.currency)}
          note="same budget"
          accentVar="var(--brand)"
        />
        <Kpi
          label="Modelled uplift"
          value={`+${formatMoneyCents(uplift, run.currency)}`}
          note={`+${upliftPct.toFixed(1)}% vs current`}
          accentVar="var(--green)"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionHeading
            title="Budget reallocation"
            sub="Shift the same total budget to equalise marginal returns"
          />
          <button
            type="button"
            onClick={applyPlan}
            disabled={applied}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
              applied
                ? 'border border-border text-ink-3'
                : 'bg-brand text-on-brand hover:opacity-90',
            ].join(' ')}>
            <Activity className="size-4" />
            {applied ? 'Plan exported' : 'Apply plan & re-export'}
          </button>
        </div>
        <ScenarioBars
          current={current}
          optimised={optimised}
          currency={run.currency}
        />
      </div>
    </div>
  );
}

function DataView({run}: {run: ModelRun}) {
  const band = fitBand(run.rsq);
  const bandMeta = FIT_BAND_META[band];
  const sym = currencySymbol(run.currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Model fit (R²)"
          value={run.rsq.toFixed(2)}
          note={bandMeta.label}
          accentVar={bandMeta.colorVar}
        />
        <Kpi
          label="NRMSE"
          value={run.nrmse.toFixed(2)}
          note="lower is better"
        />
        <Kpi
          label="Window"
          value={`${run.windowStart.slice(5)} → ${run.windowEnd.slice(5)}`}
          note="Insights export range"
        />
        <Kpi
          label="Channels modelled"
          value={String(run.channels.length)}
          note="incl. cross-channel"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Insights <code className="text-[color:var(--brand-ink)]">mmm</code>{' '}
            breakdown — CSV export sample
          </span>
          <Pill
            label="level=adset · export_format=csv"
            colorVar="var(--purple)"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[11px]">
            <thead className="bg-surface-2">
              <tr>
                {MMM_CSV_COLUMNS.map(col => (
                  <th
                    key={col}
                    className="px-2.5 py-2 text-left font-semibold uppercase tracking-[0.02em] text-ink-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MMM_CSV_SAMPLE.map(r => (
                <tr key={r.adset_id} className="border-t border-border">
                  {MMM_CSV_COLUMNS.map(col => {
                    const v = r[col];
                    const display =
                      col === 'spend'
                        ? `${sym}${(v as number).toLocaleString()}`
                        : col === 'impressions'
                          ? formatImpressions(v as number)
                          : String(v);
                    return (
                      <td
                        key={col}
                        className="whitespace-nowrap px-2.5 py-2 tabular-nums text-ink-2">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-ink-3">
          Delivered as an async CSV export only — <code>breakdowns=mmm</code>{' '}
          can&apos;t combine with other breakdowns and supports{' '}
          <code>impressions</code> + estimated <code>spend</code>. Robyn ingests
          this to fit the response model.
        </p>
      </div>
    </div>
  );
}

// --- shell ----------------------------------------------------------------

export function MarketingMixModellingDashboard() {
  const [selectedId, setSelectedId] = useState<string>(MODEL_RUNS[0].accountId);
  const [view, setView] = useState<View>('decomposition');

  const run = MODEL_RUNS.find(r => r.accountId === selectedId) ?? MODEL_RUNS[0];

  useApiLoads(selectedId, () => buildLoadCalls(run));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-[10px] border border-border bg-surface p-1">
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
          <span className="hidden sm:inline">Account</span>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
            }}
            aria-label="Select account"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
            {MODEL_RUNS.map(r => (
              <option key={r.accountId} value={r.accountId}>
                {r.accountName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'decomposition' ? <DecompositionView run={run} /> : null}
      {view === 'response' ? <ResponseView run={run} /> : null}
      {view === 'allocation' ? <AllocationView run={run} /> : null}
      {view === 'data' ? <DataView run={run} /> : null}
    </div>
  );
}
