'use client';

import {
  Bell,
  CheckCircle2,
  Clock,
  History,
  type LucideIcon,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';
import type {AlertStatus, FatigueAlert} from '@/lib/demos/creative-fatigue';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_ACCOUNTS,
  ALERTS,
  avgTimeToAction,
  countByStatus,
  formatHours,
  groupByAccount,
  relativeTime,
  SETUP_STEPS,
  STATUS_LABEL,
  uniqueAccounts,
  WEBHOOK_STATUS,
} from '@/lib/demos/creative-fatigue';

import {
  AlertCard,
  Badge,
  Insight,
  Kpi,
  SectionHeading,
  SourceBadge,
  type Tone,
  WebhookStatusBanner,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_BM = 'https://developers.facebook.com/docs/business-management-apis/';
const DOC_RECS =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/recommendations/';
const DOC_WEBHOOK =
  'https://developers.facebook.com/docs/graph-api/webhooks/reference/ad-account/';
const DOC_SUBSCRIBE =
  'https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts';
const DOC_COPIES =
  'https://developers.facebook.com/docs/marketing-api/reference/adgroup/copies/#-creative-parameters-';
const DOC_AD =
  'https://developers.facebook.com/docs/marketing-api/reference/adgroup/';

// Mock app id used across webhook subscription calls (no real app is touched).
const APP_ID = '1288453092610987';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type View = 'inbox' | 'history' | 'setup';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'inbox', label: 'Inbox', icon: Bell},
  {id: 'history', label: 'History', icon: History},
  {id: 'setup', label: 'Setup', icon: Settings},
];

const STATUS_TONE: Record<AlertStatus, Tone> = {
  active: 'rose',
  acknowledged: 'yellow',
  resolved: 'green',
};

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// ---------------------------------------------------------------------------
// Initial-load reads
// ---------------------------------------------------------------------------

/**
 * The GET reads a real integration would issue on load: enumerate ad accounts,
 * proactively scan for CREATIVE_FATIGUE recommendations, and read the current
 * webhook field subscriptions. Mirrors the endpoints named in the spec.
 */
function buildLoadCalls(): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: 'BUSINESS_ID/owned_ad_accounts',
      summary: 'Enumerate ad accounts across the business',
      request: {fields: 'account_id,name', limit: 100},
      response: {
        data: AD_ACCOUNTS.map(a => ({
          account_id: a.id,
          name: a.name,
        })),
      },
      status: 'success',
      docsUrl: DOC_BM,
    },
    {
      method: 'GET',
      endpoint: `act_${AD_ACCOUNTS[0].id}/recommendations`,
      summary: 'Proactive scan for CREATIVE_FATIGUE recommendations',
      request: {recommendation_names: 'CREATIVE_FATIGUE'},
      response: {
        data: ALERTS.filter(
          a =>
            a.source === 'recommendation' && a.accountId === AD_ACCOUNTS[0].id,
        ).map(a => ({
          ad_id: a.adId,
          recommendation_name: 'CREATIVE_FATIGUE',
          ad_name: a.adName,
        })),
      },
      status: 'success',
      docsUrl: DOC_RECS,
    },
    {
      method: 'GET',
      endpoint: `${APP_ID}/subscriptions`,
      summary: 'Read active webhook field subscriptions',
      request: {object: 'ad_account'},
      response: {
        data: [
          {
            object: 'ad_account',
            fields: [{name: 'creative_fatigue'}],
            active: WEBHOOK_STATUS.state === 'connected',
            callback_url: WEBHOOK_STATUS.endpointUrl,
          },
        ],
      },
      status: 'success',
      docsUrl: DOC_WEBHOOK,
    },
  ];
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function CreativeFatigueDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('inbox');
  const [alerts, setAlerts] = useState<FatigueAlert[]>(ALERTS);

  // Log the initial reads that populate the dashboard.
  useApiLoads('creative-fatigue-load', buildLoadCalls);

  const handleAcknowledge = useCallback(
    (alert: FatigueAlert) => {
      record({
        method: 'GET',
        endpoint: alert.adId,
        summary: `Read creative to review — ${alert.adName}`,
        request: {fields: 'id,name,creative{id,name,object_story_spec}'},
        response: {
          id: alert.adId,
          name: alert.adName,
          creative: {id: `${alert.adId}-cr`},
        },
        status: 'success',
        docsUrl: DOC_AD,
      });
      setAlerts(prev =>
        prev.map(a =>
          a.id === alert.id ? {...a, status: 'acknowledged' as const} : a,
        ),
      );
    },
    [record],
  );

  const handleDuplicate = useCallback(
    (alert: FatigueAlert) => {
      const newAdId = `${alert.adId}-dup`;
      record({
        method: 'POST',
        endpoint: `${alert.adId}/copies`,
        summary: `Duplicate fatigued ad — ${alert.adName}`,
        request: {
          deep_copy: true,
          status_option: 'INHERITED_FROM_SOURCE',
          rename_options: {rename_suffix: ' - Copy'},
        },
        response: {copied_ad_id: newAdId},
        status: 'success',
        docsUrl: DOC_COPIES,
      });
      record({
        method: 'POST',
        endpoint: newAdId,
        summary: `Refresh creative on duplicate — ${alert.adName}`,
        request: {creative: {creative_id: `${newAdId}-cr`}},
        response: {success: true},
        status: 'success',
        docsUrl: DOC_AD,
      });
      setAlerts(prev =>
        prev.map(a =>
          a.id === alert.id
            ? {
                ...a,
                status: 'resolved' as const,
                resolvedAt: new Date().toISOString(),
                duplicatedAdId: newAdId,
              }
            : a,
        ),
      );
    },
    [record],
  );

  const handleDismiss = useCallback((alert: FatigueAlert) => {
    setAlerts(prev =>
      prev.map(a =>
        a.id === alert.id ? {...a, status: 'resolved' as const} : a,
      ),
    );
  }, []);

  const handleSubscribeWebhook = useCallback(
    (account: {id: string; name: string}) => {
      record({
        method: 'POST',
        endpoint: `act_${account.id}/subscribed_apps`,
        summary: `Subscribe app to ad account — ${account.name}`,
        request: {app_id: APP_ID},
        response: {success: true},
        status: 'success',
        docsUrl: DOC_SUBSCRIBE,
      });
      record({
        method: 'POST',
        endpoint: `${APP_ID}/subscriptions`,
        summary: 'Subscribe creative_fatigue field on ad_account',
        request: {
          object: 'ad_account',
          fields: 'creative_fatigue',
          callback_url: WEBHOOK_STATUS.endpointUrl,
        },
        response: {success: true},
        status: 'success',
        docsUrl: DOC_WEBHOOK,
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

        <div className="ml-auto">
          <WebhookStatusBanner
            state={WEBHOOK_STATUS.state}
            lastPing={WEBHOOK_STATUS.lastPing}
          />
        </div>
      </div>

      {view === 'inbox' ? (
        <InboxView
          alerts={alerts}
          onAcknowledge={handleAcknowledge}
          onDuplicate={handleDuplicate}
          onDismiss={handleDismiss}
        />
      ) : null}
      {view === 'history' ? <HistoryView alerts={alerts} /> : null}
      {view === 'setup' ? (
        <SetupView onSubscribe={handleSubscribeWebhook} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox — active fatigue alerts grouped by ad account
// ---------------------------------------------------------------------------

function InboxView({
  alerts,
  onAcknowledge,
  onDuplicate,
  onDismiss,
}: {
  alerts: FatigueAlert[];
  onAcknowledge: (alert: FatigueAlert) => void;
  onDuplicate: (alert: FatigueAlert) => void;
  onDismiss: (alert: FatigueAlert) => void;
}) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const counts = countByStatus(alerts);
  const tta = avgTimeToAction(alerts);
  const accountCount = uniqueAccounts(alerts).length;
  const grouped = groupByAccount(activeAlerts);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Active alerts"
          value={String(counts.active)}
          note="require action"
          noteTone={counts.active > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Avg time-to-action"
          value={tta != null ? formatHours(tta) : '--'}
          note="resolved alerts"
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="Accounts monitored"
          value={String(accountCount)}
          note={`of ${AD_ACCOUNTS.length} subscribed`}
          accentVar="var(--brand)"
        />
        <Kpi
          label="Webhook status"
          value={WEBHOOK_STATUS.state === 'connected' ? 'Live' : 'Down'}
          note={
            WEBHOOK_STATUS.state === 'connected'
              ? 'receiving events'
              : 'check endpoint'
          }
          noteTone={WEBHOOK_STATUS.state === 'connected' ? 'up' : 'down'}
          accentVar={
            WEBHOOK_STATUS.state === 'connected'
              ? 'var(--green)'
              : 'var(--rose)'
          }
        />
      </div>

      {activeAlerts.length === 0 ? (
        <Insight>
          <strong className="text-ink">All clear.</strong> No active creative
          fatigue alerts across your monitored accounts. The webhook is
          listening for new notifications.
        </Insight>
      ) : (
        Object.entries(grouped).map(([accountId, alerts]) => {
          const accountName = alerts[0].accountName;
          return (
            <div key={accountId}>
              <SectionHeading
                title={accountName}
                sub={`act_${accountId} · ${alerts.length} active alert${alerts.length === 1 ? '' : 's'}`}
              />
              <div className="flex flex-col gap-2.5">
                {alerts.map(a => (
                  <AlertCard
                    key={a.id}
                    adName={a.adName}
                    campaignName={a.campaignName}
                    adsetName={a.adsetName}
                    status={a.status}
                    source={a.source}
                    detectedAt={a.detectedAt}
                    duplicatedAdId={a.duplicatedAdId}
                    onAcknowledge={() => {
                      onAcknowledge(a);
                    }}
                    onDuplicate={() => {
                      onDuplicate(a);
                    }}
                    onDismiss={() => {
                      onDismiss(a);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {counts.acknowledged > 0 ? (
        <Insight>
          <strong className="text-ink">
            {counts.acknowledged} acknowledged
          </strong>{' '}
          alert{counts.acknowledged === 1 ? '' : 's'} pending creative
          replacement. Use Duplicate &amp; Replace to resolve them via the Ad
          Copies API.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History — resolved / dismissed alerts with timeline
// ---------------------------------------------------------------------------

function HistoryView({alerts}: {alerts: FatigueAlert[]}) {
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const nonActive = alerts.filter(a => a.status !== 'active');
  const filtered =
    filterAccount === 'all'
      ? nonActive
      : nonActive.filter(a => a.accountId === filterAccount);

  const accountIds = uniqueAccounts(nonActive);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <SectionHeading
          title="Resolution history"
          sub="Resolved and acknowledged alerts with timeline details."
        />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Account</span>
          <select
            value={filterAccount}
            onChange={e => {
              setFilterAccount(e.target.value);
            }}
            aria-label="Filter by account"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creative)]">
            <option value="all">All accounts</option>
            {accountIds.map(id => {
              const acct = AD_ACCOUNTS.find(a => a.id === id);
              return (
                <option key={id} value={id}>
                  {acct ? acct.name : `act_${id}`}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-3">
          No resolved alerts{filterAccount !== 'all' ? ' for this account' : ''}
          .
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Ad</th>
                  <th className={TH}>Account</th>
                  <th className={TH}>Source</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Detected</th>
                  <th className={TH}>Resolved</th>
                  <th className={TH}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const durationMs = a.resolvedAt
                    ? new Date(a.resolvedAt).getTime() -
                      new Date(a.detectedAt).getTime()
                    : null;
                  const durationH =
                    durationMs != null ? durationMs / (1000 * 60 * 60) : null;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-ink">
                          {a.adName}
                        </div>
                        <div className="text-[11px] text-ink-3">
                          {a.campaignName}
                        </div>
                      </td>
                      <td className={TD}>{a.accountName}</td>
                      <td className="px-3 py-2.5">
                        <SourceBadge source={a.source} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={STATUS_TONE[a.status]}>
                          {STATUS_LABEL[a.status]}
                        </Badge>
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {relativeTime(a.detectedAt)}
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {a.resolvedAt ? relativeTime(a.resolvedAt) : '--'}
                      </td>
                      <td className="px-3 py-2.5">
                        {durationH != null ? (
                          <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-ink-2">
                            <Clock className="size-3 text-ink-3" />
                            {formatHours(durationH)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-3">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TimelineSection alerts={filtered} />
    </div>
  );
}

/** Mini visual timeline for detection and resolution events. */
function TimelineSection({alerts}: {alerts: FatigueAlert[]}) {
  const resolved = alerts.filter(a => a.resolvedAt);
  if (resolved.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title="Resolution timeline"
        sub="When alerts were detected and resolved."
      />
      <div className="flex flex-col gap-2">
        {resolved.map(a => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--rose)'}}
              />
              <span
                className="h-3 w-px"
                style={{background: 'var(--border)'}}
              />
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--green)'}}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{a.adName}</p>
              <p className="text-[11px] text-ink-3">
                Detected {new Date(a.detectedAt).toLocaleDateString()} &rarr;
                Resolved{' '}
                {a.resolvedAt
                  ? new Date(a.resolvedAt).toLocaleDateString()
                  : ''}
              </p>
            </div>
            {a.duplicatedAdId ? <Badge tone="green">Duplicated</Badge> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup — webhook configuration and setup steps
// ---------------------------------------------------------------------------

function SetupView({
  onSubscribe,
}: {
  onSubscribe: (account: {id: string; name: string}) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Webhook configuration"
        sub="Status of your creative fatigue webhook subscription."
      />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {WEBHOOK_STATUS.state === 'connected' ? (
                <Wifi className="size-5" style={{color: 'var(--green)'}} />
              ) : (
                <WifiOff className="size-5" style={{color: 'var(--rose)'}} />
              )}
              <span className="text-sm font-bold text-ink">
                {WEBHOOK_STATUS.state === 'connected'
                  ? 'Webhook connected'
                  : 'Webhook disconnected'}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-ink-2">
              <div className="flex gap-2">
                <span className="w-28 shrink-0 font-semibold text-ink-3">
                  Endpoint
                </span>
                <span className="font-mono text-ink">
                  {WEBHOOK_STATUS.endpointUrl}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0 font-semibold text-ink-3">
                  State
                </span>
                <WebhookStatusBanner
                  state={WEBHOOK_STATUS.state}
                  lastPing={WEBHOOK_STATUS.lastPing}
                />
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0 font-semibold text-ink-3">
                  Last verified
                </span>
                <span>
                  {new Date(WEBHOOK_STATUS.lastPing).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0 font-semibold text-ink-3">
                  Subscribed
                </span>
                <span>
                  {WEBHOOK_STATUS.subscribedAccountsCount} ad account
                  {WEBHOOK_STATUS.subscribedAccountsCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Subscribed accounts
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {AD_ACCOUNTS.map(acct => (
              <span
                key={acct.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-ink-2">
                <CheckCircle2
                  className="size-3.5"
                  style={{color: 'var(--green)'}}
                />
                {acct.name}
                <span className="font-mono text-ink-3">act_{acct.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    onSubscribe(acct);
                  }}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors"
                  style={{
                    color: 'var(--brand)',
                    background:
                      'color-mix(in srgb, var(--brand) 12%, transparent)',
                  }}>
                  Re-subscribe
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <SectionHeading
        title="Setup steps"
        sub="Follow these steps to integrate creative fatigue notifications via the Meta Marketing API."
      />

      <div className="flex flex-col gap-3">
        {SETUP_STEPS.map(s => (
          <div
            key={s.step}
            className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-on-brand"
                style={{background: 'var(--brand)'}}>
                {s.step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-[12px] text-ink-2">{s.description}</p>
                <p className="mt-1.5 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink-3">
                  {s.apiCall}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Insight>
        <strong className="text-ink">Next step:</strong> Combine creative
        fatigue notifications with the AI Creative Enhancer to automatically
        generate replacement creatives when fatigue is detected.
      </Insight>
    </div>
  );
}
