'use client';

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  type LucideIcon,
  Power,
  ShieldCheck,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  type Account,
  accountById,
  ACCOUNTS,
  AD_RULES,
  type AdRule,
  campaignBudgetCents,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type CheckCategory,
  type CheckResult,
  type CheckState,
  evaluateAccount,
  evaluateCampaign,
  EXECUTION_LABEL,
  formatMoneyCents,
  objectiveLabel,
  pacingRatio,
  STATE_META,
  summarize,
  summarizeByCategory,
} from '@/lib/demos/quality-assurance';

type View = 'overview' | 'checklist' | 'remediation' | 'rules';

const DOC_CAMPAIGN =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/';
const DOC_INSIGHTS =
  'https://developers.facebook.com/docs/marketing-api/insights';
const DOC_RULES =
  'https://developers.facebook.com/docs/marketing-api/ad-rules/';

const CAMPAIGN_QA_FIELDS =
  'name,objective,status,effective_status,buying_type,bid_strategy,special_ad_categories,daily_budget,lifetime_budget,spend_cap';

// The initial reads that populate the QA scan for the selected account.
function buildLoadCalls(account: Account): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `act_${account.id}/campaigns`,
      summary: `List campaigns to QA for ${account.name}`,
      request: {fields: CAMPAIGN_QA_FIELDS},
      response: {
        data: account.campaigns.map(c => ({
          id: c.id,
          name: c.name,
          objective: c.objective,
          status: c.status,
          effective_status: c.effectiveStatus,
          buying_type: c.buyingType,
          bid_strategy: c.bidStrategy,
          special_ad_categories: c.specialAdCategories,
          daily_budget: c.dailyBudgetCents,
          lifetime_budget: c.lifetimeBudgetCents,
          spend_cap: c.spendCapCents,
        })),
      },
      status: 'success',
      docsUrl: DOC_CAMPAIGN,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}/insights`,
      summary: 'Read spend for spend-vs-budget pacing checks',
      request: {
        level: 'campaign',
        fields: 'campaign_id,spend,impressions',
        date_preset: 'today',
      },
      response: {
        data: account.campaigns.map(c => ({
          campaign_id: c.id,
          spend: (c.spendTodayCents / 100).toFixed(2),
        })),
      },
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}/adrules_library`,
      summary: 'Read Ad Rules Engine rules (incl. API-only trigger rules)',
      request: {fields: 'name,evaluation_spec,execution_spec,status'},
      response: {
        data: AD_RULES.map(r => ({
          name: r.name,
          evaluation_spec: {
            evaluation_type: r.evaluationType,
            filters: r.filters.map(f => ({
              field: f.field,
              operator: f.operator,
              value: f.value,
            })),
          },
          execution_spec: {execution_type: r.executionType},
          status: r.enabled ? 'ENABLED' : 'DISABLED',
        })),
      },
      status: 'success',
      docsUrl: DOC_RULES,
    },
  ];
}

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'overview', label: 'Overview', icon: ShieldCheck},
  {id: 'checklist', label: 'Checklist', icon: ClipboardCheck},
  {id: 'remediation', label: 'Remediation', icon: Wrench},
  {id: 'rules', label: 'Ad rules', icon: Zap},
];

const STATE_ICON: Record<CheckState, LucideIcon> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

// --- small shared primitives (mirrors opportunity-score shared.tsx style) ---

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
        {note ? <p className="mt-0.5 text-[11px] text-ink-3">{note}</p> : null}
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

function StatePill({state}: {state: CheckState}) {
  const meta = STATE_META[state];
  const Icon = STATE_ICON[state];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color: meta.colorVar,
        background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
      }}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

/** Ring showing the account QA health score. */
function ScoreRing({score, size = 104}: {score: number; size?: number}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const len = (score / 100) * c;
  const colorVar =
    score >= 85
      ? 'var(--green)'
      : score >= 60
        ? 'var(--yellow)'
        : 'var(--rose)';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colorVar}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${c - len}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 - 1}
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight={800}
        fill="var(--ink)">
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.15}
        textAnchor="middle"
        fontSize={size * 0.09}
        fill="var(--ink-3)">
        QA health
      </text>
    </svg>
  );
}

// --- Overview -------------------------------------------------------------

function OverviewView({account}: {account: Account}) {
  const results = useMemo(() => evaluateAccount(account), [account]);
  const summary = useMemo(() => summarize(results), [results]);
  const byCategory = useMemo(() => summarizeByCategory(results), [results]);
  const overspendRisk = account.campaigns.filter(c => {
    const ratio = pacingRatio(c);
    return ratio != null && ratio >= 0.8;
  }).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Campaigns scanned"
          value={String(account.campaigns.length)}
          note={`${summary.total} checks run`}
        />
        <Kpi
          label="Passing"
          value={String(summary.pass)}
          note="checks green"
          accentVar="var(--green)"
        />
        <Kpi
          label="Warnings"
          value={String(summary.warn)}
          note="review advised"
          accentVar="var(--yellow)"
        />
        <Kpi
          label="Failures"
          value={String(summary.fail)}
          note="action needed"
          accentVar="var(--rose)"
        />
        <Kpi
          label="Overspend risk"
          value={String(overspendRisk)}
          note="campaigns >80% pacing"
          accentVar="var(--rose)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <SectionHeading title="QA scorecard" />
          <div className="flex items-center gap-5">
            <ScoreRing score={summary.score} />
            <div className="flex flex-1 flex-col gap-2.5">
              {byCategory.map(cat => {
                const passPct =
                  cat.total > 0
                    ? Math.round((cat.pass / cat.total) * 100)
                    : 100;
                const color = CATEGORY_COLOR[cat.category];
                return (
                  <div key={cat.category}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-ink-2">
                        {CATEGORY_LABEL[cat.category]}
                      </span>
                      <span className="font-bold tabular-nums" style={{color}}>
                        {cat.pass}/{cat.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{width: `${passPct}%`, background: color}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <SectionHeading
            title="Campaign structure"
            sub="Budgets & pacing (minor units ÷100)"
          />
          <div className="flex flex-col divide-y divide-border">
            {account.campaigns.map(c => {
              const ratio = pacingRatio(c);
              const worst = evaluateCampaign(c).reduce<CheckState>(
                (acc, r) =>
                  STATE_META[r.state].weight > STATE_META[acc].weight
                    ? r.state
                    : acc,
                'pass',
              );
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {c.name}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      {objectiveLabel(c.objective)} ·{' '}
                      {formatMoneyCents(
                        campaignBudgetCents(c),
                        account.currency,
                      )}{' '}
                      {c.dailyBudgetCents != null ? 'daily' : 'lifetime'} ·{' '}
                      {c.effectiveStatus}
                    </p>
                  </div>
                  {ratio != null ? (
                    <span
                      className="shrink-0 text-[11px] font-semibold tabular-nums"
                      style={{
                        color:
                          ratio >= 0.95
                            ? 'var(--rose)'
                            : ratio >= 0.8
                              ? 'var(--yellow)'
                              : 'var(--ink-3)',
                      }}>
                      {Math.round(ratio * 100)}%
                    </span>
                  ) : null}
                  <StatePill state={worst} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Checklist ------------------------------------------------------------

const STATE_FILTERS: Array<{id: CheckState | 'all'; label: string}> = [
  {id: 'all', label: 'All'},
  {id: 'fail', label: 'Failing'},
  {id: 'warn', label: 'Warnings'},
  {id: 'pass', label: 'Passing'},
];

function CheckRow({result}: {result: CheckResult}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
          style={{
            color: CATEGORY_COLOR[result.category],
            background: `color-mix(in srgb, ${CATEGORY_COLOR[result.category]} 12%, transparent)`,
          }}
          aria-hidden>
          {(() => {
            const Icon = STATE_ICON[result.state];
            return <Icon className="size-4" />;
          })()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {result.title}
            </span>
            <StatePill state={result.state} />
          </div>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {result.campaignName} ·{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">
              {result.field}
            </code>{' '}
            = {result.observed}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            {result.detail}
          </p>
          {result.state !== 'pass' ? (
            <p className="mt-1.5 text-[12px] font-medium text-ink-2">
              <span className="text-ink-3">Fix:</span> {result.remediation}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChecklistView({account}: {account: Account}) {
  const results = useMemo(() => evaluateAccount(account), [account]);
  const [stateFilter, setStateFilter] = useState<CheckState | 'all'>('all');
  const [catFilter, setCatFilter] = useState<CheckCategory | 'all'>('all');

  const filtered = results.filter(
    r =>
      (stateFilter === 'all' || r.state === stateFilter) &&
      (catFilter === 'all' || r.category === catFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {STATE_FILTERS.map(f => {
            const on = stateFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setStateFilter(f.id);
                }}
                className={[
                  'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                {f.label}
              </button>
            );
          })}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Category</span>
          <select
            value={catFilter}
            onChange={e => {
              setCatFilter(e.target.value as CheckCategory | 'all');
            }}
            aria-label="Filter by category"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_LABEL[cat]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(r => (
            <CheckRow key={r.id} result={r} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <Check className="size-6 text-[color:var(--green)]" />
          <p className="mt-2 text-sm font-semibold text-ink">
            No checks match this filter
          </p>
        </div>
      )}
    </div>
  );
}

// --- Remediation ----------------------------------------------------------

function RemediationView({
  account,
  resolved,
  onResolve,
}: {
  account: Account;
  resolved: Set<string>;
  onResolve: (result: CheckResult) => void;
}) {
  const results = useMemo(() => evaluateAccount(account), [account]);
  const open = results
    .filter(r => r.state !== 'pass' && !resolved.has(r.id))
    .sort((a, b) => STATE_META[b.state].weight - STATE_META[a.state].weight);

  if (open.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <CheckCircle2 className="size-7 text-[color:var(--green)]" />
        <p className="mt-2 text-sm font-semibold text-ink">
          No open remediation items
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          {account.name} is passing every QA check.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title="Remediation queue"
        sub="Warnings and failures, ranked by severity"
      />
      <div className="flex flex-col gap-3">
        {open.map(r => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                style={{
                  color: STATE_META[r.state].colorVar,
                  background: `color-mix(in srgb, ${STATE_META[r.state].colorVar} 14%, transparent)`,
                }}
                aria-hidden>
                {(() => {
                  const Icon = STATE_ICON[r.state];
                  return <Icon className="size-4" />;
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {r.title}
                  </span>
                  <StatePill state={r.state} />
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      color: CATEGORY_COLOR[r.category],
                      background: `color-mix(in srgb, ${CATEGORY_COLOR[r.category]} 12%, transparent)`,
                    }}>
                    {CATEGORY_LABEL[r.category]}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {r.campaignName}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  {r.remediation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onResolve(r);
                }}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90">
                <Wrench className="size-4" /> Apply fix
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Ad rules -------------------------------------------------------------

function RuleCard({rule, onToggle}: {rule: AdRule; onToggle: () => void}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{
            color: CATEGORY_COLOR[rule.covers],
            background: `color-mix(in srgb, ${CATEGORY_COLOR[rule.covers]} 12%, transparent)`,
          }}
          aria-hidden>
          <Zap className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{rule.name}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {rule.evaluationType === 'SCHEDULE'
                ? `Schedule · ${rule.scheduleType?.toLowerCase()}`
                : 'Trigger'}
            </span>
            {rule.apiOnly ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: 'var(--purple)',
                  background:
                    'color-mix(in srgb, var(--purple) 14%, transparent)',
                }}>
                API-only
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] text-ink-2">
            <span className="text-ink-3">When</span>{' '}
            {rule.filters.map(f => (
              <code
                key={f.field}
                className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">
                {f.field} {f.operator.replace(/_/g, ' ').toLowerCase()}{' '}
                {f.value}
              </code>
            ))}{' '}
            <span className="text-ink-3">→</span>{' '}
            <span className="font-semibold text-ink">
              {EXECUTION_LABEL[rule.executionType]}
            </span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[12px] text-ink-3">
              Covers {CATEGORY_LABEL[rule.covers]}
            </span>
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={rule.enabled}
              className={[
                'ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                rule.enabled
                  ? 'bg-brand text-on-brand hover:opacity-90'
                  : 'border border-border-strong text-ink hover:bg-surface-2',
              ].join(' ')}>
              <Power className="size-4" />
              {rule.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesView({
  account,
  rules,
  onToggle,
}: {
  account: Account;
  rules: AdRule[];
  onToggle: (rule: AdRule) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title="Ad Rules Engine"
        sub={`Codified QA rules for act_${account.id}. Trigger rules are API-only — not visible in Ads Manager.`}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onToggle={() => {
              onToggle(rule);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Dashboard shell ------------------------------------------------------

export function QualityAssuranceDashboard() {
  const {record} = useApiConsole();
  const [selectedId, setSelectedId] = useState<string>(ACCOUNTS[0].id);
  const [view, setView] = useState<View>('overview');
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const [rules, setRules] = useState<AdRule[]>(() =>
    AD_RULES.map(r => ({...r})),
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const account = accountById(selectedId);

  useApiLoads(selectedId, () => buildLoadCalls(account));

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const resolveItem = (result: CheckResult) => {
    record({
      method: 'POST',
      endpoint: result.campaignId,
      summary: `Apply QA fix — ${result.title} on ${result.campaignName}`,
      request: {
        [result.field.split(',')[0].trim()]: 'corrected',
        remediation: result.remediation,
      },
      response: {success: true},
      status: 'success',
      docsUrl: DOC_CAMPAIGN,
    });
    setResolved(prev => {
      const next = new Set(prev);
      next.add(result.id);
      return next;
    });
    flash(`Fix applied — ${result.title}`);
  };

  const toggleRule = (rule: AdRule) => {
    const nextEnabled = !rule.enabled;
    record({
      method: 'POST',
      endpoint: `act_${selectedId}/adrules_library`,
      summary: `${nextEnabled ? 'Enable' : 'Disable'} rule — ${rule.name}`,
      request: {
        name: rule.name,
        evaluation_spec: {
          evaluation_type: rule.evaluationType,
          filters: rule.filters,
        },
        execution_spec: {execution_type: rule.executionType},
        status: nextEnabled ? 'ENABLED' : 'DISABLED',
      },
      response: {id: `adrule_${rule.id}`, success: true},
      status: 'success',
      docsUrl: DOC_RULES,
    });
    setRules(prev =>
      prev.map(r => (r.id === rule.id ? {...r, enabled: nextEnabled} : r)),
    );
    flash(`${rule.name} ${nextEnabled ? 'enabled' : 'disabled'}`);
  };

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
          <span className="hidden sm:inline">Account</span>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
            }}
            aria-label="Select account"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
            {ACCOUNTS.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'overview' ? <OverviewView account={account} /> : null}
      {view === 'checklist' ? <ChecklistView account={account} /> : null}
      {view === 'remediation' ? (
        <RemediationView
          account={account}
          resolved={resolved}
          onResolve={resolveItem}
        />
      ) : null}
      {view === 'rules' ? (
        <RulesView account={account} rules={rules} onToggle={toggleRule} />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Check className="size-4 text-[color:var(--green)]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
