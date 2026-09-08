'use client';

import {
  BarChart3,
  CheckCircle2,
  Database,
  Layers,
  type LucideIcon,
  Play,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCall, ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  accountById,
  ACCOUNTS,
  ASYNC_DOC,
  BREAKDOWN_OPTIONS,
  type BreakdownKey,
  type BreakdownRow,
  compact,
  cpaMinor,
  ctr,
  type DailyRow,
  DATE_PRESETS,
  type DatePreset,
  INGESTION_META,
  INSIGHTS_DOC,
  insightsFor,
  type InsightsLevel,
  money,
  newReportRunId,
  type ReportRunConfig,
  reportRunRequest,
  roas,
  sumRows,
  windowRows,
} from '@/lib/demos/insights-data-warehouse-dashboard';

import {
  Badge,
  BreakdownBar,
  Insight,
  Kpi,
  ProgressBar,
  SectionHeading,
  TimeSeriesChart,
  type Tone,
} from './ui';

type View = 'warehouse' | 'account' | 'report';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'warehouse', label: 'Warehouse', icon: Database},
  {id: 'account', label: 'Account insights', icon: BarChart3},
  {id: 'report', label: 'Run report', icon: Play},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

const LEVELS: InsightsLevel[] = ['account', 'campaign', 'adset', 'ad'];

// Reads that populate the account dashboard (materialised warehouse rows).
function buildAccountLoads(accountId: string): ApiCallInput[] {
  const acct = accountById(accountId);
  const ins = insightsFor(accountId);
  const last30 = windowRows(ins.daily, 30);
  return [
    {
      method: 'GET',
      endpoint: `act_${accountId}/insights`,
      summary: `Daily insights for ${acct.name} (warehouse-backed, last 30 days)`,
      request: {
        level: 'account',
        fields: 'spend,impressions,clicks,actions,action_values',
        date_preset: 'last_30d',
        time_increment: '1',
        use_unified_attribution_setting: 'true',
      },
      response: {
        data: last30.slice(-3).map(d => ({
          date_start: d.date,
          date_stop: d.date,
          spend: (d.spendMinor / 100).toFixed(2),
          impressions: d.impressions,
          clicks: d.clicks,
        })),
        paging: {cursors: {after: 'MjMZD…'}},
        note: `${last30.length} daily rows returned (truncated)`,
      },
      status: 'success',
      docsUrl: INSIGHTS_DOC,
    },
    {
      method: 'GET',
      endpoint: `act_${accountId}/insights`,
      summary: `Publisher-platform breakdown for ${acct.name}`,
      request: {
        level: 'account',
        fields: 'spend,impressions,actions,action_values',
        breakdowns: 'publisher_platform',
        date_preset: 'last_30d',
      },
      response: {
        data: (ins.breakdowns.publisher_platform ?? []).map(b => ({
          publisher_platform: b.segment,
          spend: (b.spendMinor / 100).toFixed(2),
          impressions: b.impressions,
        })),
      },
      status: 'success',
      docsUrl: INSIGHTS_DOC,
    },
  ];
}

export function InsightsDataWarehouseDashboard() {
  const {record, update} = useApiConsole();
  const [view, setView] = useState<View>('warehouse');
  const [selectedId, setSelectedId] = useState<string>(ACCOUNTS[0].id);

  useApiLoads(selectedId, () => buildAccountLoads(selectedId));

  const perAccount = view === 'account';

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

        {perAccount ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Account</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select ad account"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
              {ACCOUNTS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'warehouse' ? (
        <WarehouseView
          onInspect={id => {
            setSelectedId(id);
            setView('account');
          }}
          onRetry={(accountId, request, response) => {
            const id = record({
              method: 'POST',
              endpoint: `act_${accountId}/insights`,
              summary: `Re-trigger warehouse extraction — ${accountById(accountId).name}`,
              request,
              status: 'pending',
              docsUrl: ASYNC_DOC,
            });
            window.setTimeout(() => {
              update(id, {status: 'success', response});
            }, 900);
          }}
        />
      ) : null}
      {view === 'account' ? <AccountView accountId={selectedId} /> : null}
      {view === 'report' ? (
        <ReportView record={record} update={update} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Warehouse — ingestion status across accounts (Build spec steps 1-2)
// ---------------------------------------------------------------------------

function WarehouseView({
  onInspect,
  onRetry,
}: {
  onInspect: (accountId: string) => void;
  onRetry: (
    accountId: string,
    request: Record<string, string>,
    response: unknown,
  ) => void;
}) {
  const rows = ACCOUNTS.map(a => ({account: a, ins: insightsFor(a.id)}));
  const totalRows = rows.reduce((s, r) => s + r.ins.ingestion.rowsIngested, 0);
  const fresh = rows.filter(r => r.ins.ingestion.state === 'fresh').length;
  const failing = rows.filter(r => r.ins.ingestion.state === 'failed').length;
  const throttled = rows.filter(r => r.ins.ingestion.throttlePct >= 85).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Accounts ingested"
          value={`${fresh}/${ACCOUNTS.length}`}
          note="fresh today"
          accentVar="var(--green)"
        />
        <Kpi
          label="Rows in warehouse"
          value={compact(totalRows)}
          note="daily insight rows"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Failed extractions"
          value={String(failing)}
          note="need attention"
          noteTone={failing > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Near throttle"
          value={String(throttled)}
          note="≥ 85% insights throttle"
          noteTone={throttled > 0 ? 'down' : 'muted'}
          accentVar="var(--purple)"
        />
      </div>

      <SectionHeading
        title="Scheduled extraction status"
        sub="Each account's insights are extracted asynchronously and materialised into a siloed warehouse table. Throttle is read from x-fb-ads-insights-throttle."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Account</th>
                <th className={TH}>State</th>
                <th className={TH}>Last run</th>
                <th className={TH}>Rows</th>
                <th className={TH}>Throttle</th>
                <th className={TH}>Schedule</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {rows.map(({account, ins}) => {
                const ing = ins.ingestion;
                const meta = INGESTION_META[ing.state];
                const throttleTone =
                  ing.throttlePct >= 90
                    ? 'var(--rose)'
                    : ing.throttlePct >= 85
                      ? 'var(--cat-measurement)'
                      : 'var(--ink-2)';
                return (
                  <tr key={account.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {account.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {account.businessName} · act_{account.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          color: meta.colorVar,
                          background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
                        }}>
                        {ing.state === 'failed' ? (
                          <TriangleAlert className="size-3" />
                        ) : ing.state === 'fresh' ? (
                          <CheckCircle2 className="size-3" />
                        ) : null}
                        {meta.label}
                      </span>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatWhen(ing.lastRunIso)}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {compact(ing.rowsIngested)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{color: throttleTone}}>
                        {ing.throttlePct}%
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {ing.schedule}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {ing.state === 'failed' || ing.state === 'stale' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onRetry(
                              account.id,
                              reportRunRequest({
                                accountId: account.id,
                                level: 'account',
                                datePreset: 'last_7d',
                                breakdown: 'none',
                              }),
                              {
                                report_run_id: newReportRunId(),
                                async_status: 'Job Started',
                              },
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                          <RefreshCw className="size-3" />
                          Re-run
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onInspect(account.id);
                          }}
                          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rows.some(r => r.ins.ingestion.state === 'failed') ? (
        <Insight>
          <strong className="text-ink">Throttling:</strong> failed extractions
          are near 100% on <code>x-ad-account-usage</code>. Per the build spec,
          back off and narrow the <code>time_range</code>, or fetch object IDs
          first with <code>level</code>+<code>filtering</code> and batch per
          object rather than running high-cardinality account-level breakdowns.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account insights — time series + breakdowns from the warehouse
// ---------------------------------------------------------------------------

const METRICS: Array<{
  key: 'spend' | 'impressions' | 'purchases' | 'roas';
  label: string;
  colorVar: string;
  pick: (r: DailyRow) => number;
}> = [
  {
    key: 'spend',
    label: 'Spend',
    colorVar: 'var(--cat-signals)',
    pick: r => r.spendMinor,
  },
  {
    key: 'impressions',
    label: 'Impressions',
    colorVar: 'var(--purple)',
    pick: r => r.impressions,
  },
  {
    key: 'purchases',
    label: 'Purchases',
    colorVar: 'var(--green)',
    pick: r => r.purchases,
  },
  {
    key: 'roas',
    label: 'ROAS',
    colorVar: 'var(--cat-measurement)',
    pick: r => (r.spendMinor === 0 ? 0 : r.purchaseValueMinor / r.spendMinor),
  },
];

function AccountView({accountId}: {accountId: string}) {
  const account = accountById(accountId);
  const ins = insightsFor(accountId);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [metricKey, setMetricKey] =
    useState<(typeof METRICS)[number]['key']>('spend');
  const [breakdown, setBreakdown] =
    useState<BreakdownKey>('publisher_platform');

  const rows = windowRows(ins.daily, windowDays);
  const totals = sumRows(rows);
  const metric = METRICS.find(m => m.key === metricKey) ?? METRICS[0];

  const breakdownSrc = ins.breakdowns[breakdown] ?? [];
  const breakdownRows: BreakdownRow[] = [...breakdownSrc].sort(
    (a, b) => b.spendMinor - a.spendMinor,
  );
  const maxSeg = Math.max(1, ...breakdownRows.map(b => b.spendMinor));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Spend"
          value={money(totals.spendMinor, account.currency)}
          note={`${windowDays}-day window`}
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="ROAS"
          value={`${roas(totals).toFixed(2)}x`}
          note="value / spend"
          noteTone={roas(totals) >= 2 ? 'up' : 'muted'}
          accentVar="var(--green)"
        />
        <Kpi
          label="CTR"
          value={`${ctr(totals).toFixed(2)}%`}
          note={`${compact(totals.clicks)} clicks`}
          accentVar="var(--purple)"
        />
        <Kpi
          label="CPA"
          value={money(cpaMinor(totals), account.currency)}
          note={`${compact(totals.purchases)} purchases`}
          accentVar="var(--cat-measurement)"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
            {METRICS.map(m => {
              const on = m.key === metricKey;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMetricKey(m.key);
                  }}
                  className={[
                    'rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    on
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-2 hover:text-ink',
                  ].join(' ')}>
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
            {[7, 30, 90].map(d => {
              const on = d === windowDays;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setWindowDays(d);
                  }}
                  className={[
                    'rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    on
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-2 hover:text-ink',
                  ].join(' ')}>
                  {d}d
                </button>
              );
            })}
          </div>
        </div>
        <TimeSeriesChart
          rows={rows}
          value={metric.pick}
          colorVar={metric.colorVar}
          label={metric.label}
        />
        <p className="mt-2 text-[11px] text-ink-3">
          {metric.label} · per-day rows (time_increment=1) ·{' '}
          {rows[0]?.date ?? ''} → {rows[rows.length - 1]?.date ?? ''}
        </p>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading title="Breakdown analysis" />
          <label className="flex items-center gap-2 text-[13px] text-ink-2">
            <span>breakdowns</span>
            <select
              value={breakdown}
              onChange={e => {
                setBreakdown(e.target.value as BreakdownKey);
              }}
              aria-label="Select breakdown dimension"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
              {BREAKDOWN_OPTIONS.filter(o => o.key !== 'none').map(o => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Segment</th>
                  <th className={TH}>Spend share</th>
                  <th className={TH}>Spend</th>
                  <th className={TH}>Impr.</th>
                  <th className={TH}>Purch.</th>
                  <th className={TH}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map(b => {
                  const r =
                    b.spendMinor === 0
                      ? 0
                      : b.purchaseValueMinor / b.spendMinor;
                  return (
                    <tr key={b.segment} className="border-t border-border">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                        {b.segment}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-40">
                          <BreakdownBar
                            pct={(b.spendMinor / maxSeg) * 100}
                            colorVar="var(--cat-signals)"
                          />
                        </div>
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {money(b.spendMinor, account.currency)}
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {compact(b.impressions)}
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {compact(b.purchases)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[12px] font-bold tabular-nums"
                          style={{
                            color:
                              r >= 2
                                ? 'var(--green)'
                                : r >= 1
                                  ? 'var(--ink)'
                                  : 'var(--rose)',
                          }}>
                          {r.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run report — async report run: POST → poll status → GET results (spec step 3)
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'creating' | 'polling' | 'fetching' | 'done';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Ready',
  creating: 'POST — creating report run…',
  polling: 'Polling async_status…',
  fetching: 'GET — fetching results…',
  done: 'Job Completed',
};

function ReportView({
  record,
  update,
}: {
  record: (call: ApiCallInput) => string;
  update: (id: string, patch: Partial<ApiCall>) => void;
}) {
  const [accountId, setAccountId] = useState<string>(ACCOUNTS[0].id);
  const [level, setLevel] = useState<InsightsLevel>('campaign');
  const [datePreset, setDatePreset] = useState<DatePreset>('last_30d');
  const [breakdown, setBreakdown] = useState<BreakdownKey>('none');
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState<number>(0);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);

  const account = accountById(accountId);
  const running = phase !== 'idle' && phase !== 'done';

  const cfg: ReportRunConfig = useMemo(
    () => ({accountId, level, datePreset, breakdown}),
    [accountId, level, datePreset, breakdown],
  );

  const run = useCallback(() => {
    const runId = newReportRunId();
    const request = reportRunRequest(cfg);
    setReportRunId(runId);
    setPercent(0);
    setPhase('creating');
    setRowsWritten(0);

    // 1) POST — create async report run (pending → success with report_run_id).
    const createId = record({
      method: 'POST',
      endpoint: `act_${cfg.accountId}/insights`,
      summary: `Create async report run — ${account.name}`,
      request,
      status: 'pending',
      docsUrl: ASYNC_DOC,
    });

    window.setTimeout(() => {
      update(createId, {
        status: 'success',
        response: {report_run_id: runId, async_status: 'Job Started'},
      });
      setPhase('polling');

      // 2) Poll status a few times, advancing async_percent_completion.
      const pollId = record({
        method: 'GET',
        endpoint: runId,
        summary: `Poll report run status — ${runId}`,
        request: {fields: 'async_status,async_percent_completion'},
        status: 'pending',
        docsUrl: ASYNC_DOC,
      });

      let p = 0;
      const timer = window.setInterval(() => {
        p += 34;
        const capped = Math.min(100, p);
        setPercent(capped);
        if (capped >= 100) {
          window.clearInterval(timer);
          update(pollId, {
            status: 'success',
            response: {
              async_status: 'Job Completed',
              async_percent_completion: 100,
            },
          });
          setPhase('fetching');

          // 3) GET results from the completed report run.
          const rows = 40 + Math.floor(Math.random() * 260);
          const fetchId = record({
            method: 'GET',
            endpoint: `${runId}/insights`,
            summary: `Fetch results & write to warehouse — ${runId}`,
            request: {limit: '500', after: ''},
            status: 'pending',
            docsUrl: ASYNC_DOC,
          });
          window.setTimeout(() => {
            update(fetchId, {
              status: 'success',
              response: {
                data: `${rows} rows`,
                paging: {cursors: {after: 'QVFI…'}},
                warehouse: {table: `insights_${cfg.accountId}`, written: rows},
              },
            });
            setRowsWritten(rows);
            setPhase('done');
          }, 700);
        } else {
          update(pollId, {
            response: {
              async_status: 'Job Running',
              async_percent_completion: capped,
            },
          });
        }
      }, 600);
    }, 700);
  }, [account.name, cfg, record, update]);

  const request = reportRunRequest(cfg);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <SectionHeading
          title="Async report run"
          sub="Large jobs use the asynchronous flow: POST to create a report run, poll async_status until Job Completed & 100%, then GET the results."
        />

        <div className="flex flex-col gap-3">
          <Field label="Ad account">
            <select
              value={accountId}
              onChange={e => {
                setAccountId(e.target.value);
              }}
              disabled={running}
              aria-label="Ad account"
              className={SELECT_CLS}>
              {ACCOUNTS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Level">
            <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
              {LEVELS.map(l => {
                const on = l === level;
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={running}
                    onClick={() => {
                      setLevel(l);
                    }}
                    className={[
                      'flex-1 rounded-md px-2 py-1 text-[12px] font-semibold capitalize transition-colors disabled:opacity-50',
                      on
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-ink-2 hover:text-ink',
                    ].join(' ')}>
                    {l}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date preset">
              <select
                value={datePreset}
                onChange={e => {
                  setDatePreset(e.target.value as DatePreset);
                }}
                disabled={running}
                aria-label="Date preset"
                className={SELECT_CLS}>
                {DATE_PRESETS.map(d => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Breakdown">
              <select
                value={breakdown}
                onChange={e => {
                  setBreakdown(e.target.value as BreakdownKey);
                }}
                disabled={running}
                aria-label="Breakdown"
                className={SELECT_CLS}>
                {BREAKDOWN_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={running}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50">
            {running ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? 'Running…' : 'Run report'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Job status</span>
            <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
          </div>
          <ProgressBar
            pct={phase === 'done' ? 100 : percent}
            colorVar={phase === 'done' ? 'var(--green)' : 'var(--cat-signals)'}
          />
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            <dt className="text-ink-3">report_run_id</dt>
            <dd className="text-right font-semibold tabular-nums text-ink">
              {reportRunId ?? '—'}
            </dd>
            <dt className="text-ink-3">async_percent_completion</dt>
            <dd className="text-right font-semibold tabular-nums text-ink">
              {phase === 'done' ? 100 : percent}%
            </dd>
            <dt className="text-ink-3">rows written</dt>
            <dd className="text-right font-semibold tabular-nums text-ink">
              {phase === 'done' ? compact(rowsWritten) : '—'}
            </dd>
          </dl>
          {phase === 'done' ? (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-2">
              <CheckCircle2 className="size-4 text-[color:var(--green)]" />
              Results materialised into{' '}
              <code className="text-ink">insights_{accountId}</code>.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center gap-2">
            <Layers className="size-4 text-ink-3" />
            <span className="text-sm font-bold text-ink">Request preview</span>
          </div>
          <p className="mb-2 text-[11px] text-ink-3">
            POST /act_{accountId}/insights
          </p>
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-2">
            {JSON.stringify(request, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

const SELECT_CLS =
  'w-full rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)] disabled:opacity-50';

const PHASE_TONE: Record<Phase, Tone> = {
  idle: 'muted',
  creating: 'blue',
  polling: 'blue',
  fetching: 'purple',
  done: 'green',
};

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------

function formatWhen(iso: string): string {
  const ref = new Date('2026-07-02T12:00:00Z').getTime();
  const then = new Date(iso).getTime();
  const hours = Math.round((ref - then) / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
