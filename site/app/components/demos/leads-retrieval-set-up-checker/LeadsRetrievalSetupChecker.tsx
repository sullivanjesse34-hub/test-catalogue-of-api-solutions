'use client';

import {
  BadgeCheck,
  CircleCheck,
  ClipboardCheck,
  FileText,
  Gauge,
  KeyRound,
  type LucideIcon,
  RefreshCw,
  TriangleAlert,
  Webhook,
} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  blockedStage,
  bulkReadRateLimit,
  CHECK_COLOR,
  type CheckStage,
  clientChecks,
  clientReady,
  CLIENTS,
  formatCount,
  type LeadClient,
  type LeadForm,
  openIssueCount,
  type SetupCheck,
  STAGE_META,
  WEBHOOK_STATUS_META,
} from '@/lib/demos/leads-retrieval-set-up-checker';

import {
  Badge,
  Insight,
  Kpi,
  ReadinessRing,
  SectionHeading,
  StageRail,
  STATUS_TONE,
} from './ui';

const STAGE_ICON: Record<CheckStage, LucideIcon> = {
  permissions: KeyRound,
  webhook: Webhook,
  page: BadgeCheck,
  test_lead: ClipboardCheck,
  retrieval: FileText,
};

type View = 'checker' | 'forms';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'checker', label: 'Setup checks', icon: Gauge},
  {id: 'forms', label: 'Forms & leads', icon: FileText},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// Reads that run the end-to-end setup checks for the selected client.
function buildLoadCalls(client: LeadClient): ApiCallInput[] {
  const calls: ApiCallInput[] = [
    {
      method: 'GET',
      endpoint: `${client.appId}/permissions`,
      summary: `App permissions for ${client.appName}`,
      request: {},
      response: {
        data: client.permissions.map(p => ({
          permission: p.permission,
          status: p.granted ? 'granted' : 'declined',
        })),
      },
      status: 'success',
      docsUrl: STAGE_META.permissions.docsUrl,
    },
    {
      method: 'GET',
      endpoint: `${client.appId}/subscriptions`,
      summary: `Webhook subscriptions for ${client.appName}`,
      request: {object: 'page'},
      response: {
        data: [
          {
            object: client.webhook.object,
            callback_url: client.webhook.callbackUrl,
            active: client.webhook.active,
            fields: [
              {
                name: client.webhook.field,
                last_delivery_status: client.webhook.lastDeliveryStatus,
                ...(client.webhook.errorCode != null
                  ? {error_code: client.webhook.errorCode}
                  : {}),
              },
            ],
          },
        ],
      },
      status:
        client.webhook.lastDeliveryStatus === 'failed' ? 'error' : 'success',
      docsUrl: STAGE_META.webhook.docsUrl,
    },
    {
      method: 'GET',
      endpoint: `${client.pageId}/subscribed_apps`,
      summary: `Page subscribed apps for ${client.pageName}`,
      request: {},
      response: {
        data: [
          {
            id: client.appId,
            name: client.appName,
            subscribed_fields: client.forms.some(f => f.pageSubscribed)
              ? ['leadgen']
              : [],
          },
        ],
      },
      status: 'success',
      docsUrl: STAGE_META.page.docsUrl,
    },
  ];

  for (const form of client.forms) {
    calls.push({
      method: 'GET',
      endpoint: `${form.id}/leads`,
      summary: `Bulk read leads for form "${form.name}"`,
      request: {
        fields: 'created_time,id,ad_id,form_id,field_data',
      },
      response: {
        data: Array.from(
          {length: Math.min(form.leadsRetrieved, 2)},
          (_, i) => ({
            id: `${form.id}${100 + i}`,
            created_time: '2026-06-30T14:22:05+0000',
            ad_id: form.adId,
            form_id: form.id,
            field_data: [
              {name: 'email', values: ['lead@example.com']},
              {name: 'full_name', values: ['Sample Lead']},
            ],
          }),
        ),
        paging: {cursors: {after: 'QVFI...'}},
        summary: {total_count: form.leadsRetrieved},
      },
      status:
        form.leadsRetrieved === 0 && form.leads90d > 0 ? 'error' : 'success',
      docsUrl: STAGE_META.retrieval.docsUrl,
    });
  }

  return calls;
}

export function LeadsRetrievalSetupChecker() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('checker');
  const [selectedId, setSelectedId] = useState<string>(CLIENTS[0].id);

  const selected = CLIENTS.find(c => c.id === selectedId) ?? CLIENTS[0];

  useApiLoads(selectedId, () => buildLoadCalls(selected));

  // Test-lead round-trip: POST create → GET read → DELETE (one per form).
  const handleRunTestLead = useCallback(
    (_client: LeadClient, form: LeadForm) => {
      record({
        method: 'POST',
        endpoint: `${form.id}/test_leads`,
        summary: `Create test lead — "${form.name}"`,
        request: {
          field_data: [
            {name: 'email', values: ['test@agency.example']},
            {name: 'full_name', values: ['Test Lead']},
          ],
        },
        response: {id: `${form.id}999`, success: true},
        status: 'success',
        docsUrl: STAGE_META.test_lead.docsUrl,
      });
      record({
        method: 'GET',
        endpoint: `${form.id}/test_leads`,
        summary: `Read test lead — "${form.name}"`,
        request: {fields: 'id,created_time,field_data'},
        response: {
          data: [
            {
              id: `${form.id}999`,
              created_time: '2026-07-03T09:00:00+0000',
              field_data: [{name: 'email', values: ['test@agency.example']}],
            },
          ],
        },
        status: 'success',
        docsUrl: STAGE_META.test_lead.docsUrl,
      });
      record({
        method: 'DELETE',
        endpoint: `${form.id}999`,
        summary: `Delete test lead (one per form) — "${form.name}"`,
        request: {},
        response: {success: true},
        status: 'success',
        docsUrl: STAGE_META.test_lead.docsUrl,
      });
    },
    [record],
  );

  const handleReRunChecks = useCallback(
    (client: LeadClient) => {
      record({
        method: 'GET',
        endpoint: `${client.appId}/permissions`,
        summary: `Re-run setup checks — ${client.name}`,
        request: {},
        response: {
          data: client.permissions.map(p => ({
            permission: p.permission,
            status: p.granted ? 'granted' : 'declined',
          })),
        },
        status: 'success',
        docsUrl: STAGE_META.permissions.docsUrl,
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

        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Client</span>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
            }}
            aria-label="Select client"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
            {CLIENTS.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'checker' ? (
        <CheckerView
          selected={selected}
          onSelect={setSelectedId}
          onRunTestLead={handleRunTestLead}
          onReRunChecks={handleReRunChecks}
        />
      ) : (
        <FormsView client={selected} onRunTestLead={handleRunTestLead} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup checks
// ---------------------------------------------------------------------------

function CheckerView({
  selected,
  onSelect,
  onRunTestLead,
  onReRunChecks,
}: {
  selected: LeadClient;
  onSelect: (id: string) => void;
  onRunTestLead: (client: LeadClient, form: LeadForm) => void;
  onReRunChecks: (client: LeadClient) => void;
}) {
  const ready = CLIENTS.filter(clientReady).length;
  const totalOpen = CLIENTS.reduce((s, c) => s + openIssueCount(c), 0);
  const totalLeads90d = CLIENTS.reduce(
    (s, c) => s + c.forms.reduce((t, f) => t + f.leads90d, 0),
    0,
  );

  const ranked = [...CLIENTS].sort(
    (a, b) => openIssueCount(b) - openIssueCount(a),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Clients ready"
          value={`${ready}/${CLIENTS.length}`}
          note="all checks pass"
          accentVar="var(--green)"
        />
        <Kpi
          label="Open issues"
          value={String(totalOpen)}
          note="across clients"
          noteTone={totalOpen > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Leads (90d)"
          value={formatCount(totalLeads90d)}
          note="drives read rate limit"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Checks / client"
          value={String(clientChecks(selected).length)}
          note="end-to-end"
          accentVar="var(--purple)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Clients · ranked by open issues
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Client</th>
                <th className={TH}>Readiness</th>
                <th className={TH}>Blocked at</th>
                <th className={TH}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(c => {
                const checks = clientChecks(c);
                const passed = checks.filter(k => k.status === 'pass').length;
                const issues = openIssueCount(c);
                const active = c.id === selected.id;
                const blocked = blockedStage(c);
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
                        app {c.appId} · page {c.pageId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[13px] font-bold tabular-nums text-ink">
                        {passed}/{checks.length}
                      </span>
                    </td>
                    <td className={TD}>
                      {blocked ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{background: 'var(--rose)'}}
                          />
                          {STAGE_META[blocked].label}
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
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

      <ClientDetail
        client={selected}
        onRunTestLead={onRunTestLead}
        onReRunChecks={onReRunChecks}
      />
    </div>
  );
}

function ClientDetail({
  client,
  onRunTestLead,
  onReRunChecks,
}: {
  client: LeadClient;
  onRunTestLead: (client: LeadClient, form: LeadForm) => void;
  onReRunChecks: (client: LeadClient) => void;
}) {
  const checks = clientChecks(client);
  const passed = checks.filter(c => c.status === 'pass').length;
  const rail = checks
    .slice()
    .sort((a, b) => STAGE_META[a.stage].order - STAGE_META[b.stage].order)
    .map(c => ({label: STAGE_META[c.stage].label, status: c.status}));
  const failingTestLead = client.forms.find(f => !f.testLeadOk);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-4">
          <ReadinessRing
            passed={passed}
            total={checks.length}
            size={76}
            stroke={7}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
                {client.name}
              </h3>
              {clientReady(client) ? (
                <Badge tone="green">Retrieval ready</Badge>
              ) : (
                <Badge tone="rose">Setup incomplete</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-ink-3">
              {client.appName} ({client.appId}) · page {client.pageName} (
              {client.pageId})
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onReRunChecks(client);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <RefreshCw className="size-3.5" />
            Re-run checks
          </button>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <StageRail steps={rail} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {checks.map(check => (
          <CheckRow
            key={check.key}
            check={check}
            client={client}
            failingTestLead={failingTestLead}
            onRunTestLead={onRunTestLead}
          />
        ))}
      </div>

      {!clientReady(client) ? (
        <Insight>
          <strong className="text-ink">Next step:</strong>{' '}
          {checks.find(c => c.status !== 'pass')?.remediation}
        </Insight>
      ) : null}
    </div>
  );
}

function CheckRow({
  check,
  client,
  failingTestLead,
  onRunTestLead,
}: {
  check: SetupCheck;
  client: LeadClient;
  failingTestLead: LeadForm | undefined;
  onRunTestLead: (client: LeadClient, form: LeadForm) => void;
}) {
  const Icon = STAGE_ICON[check.stage];
  const color = CHECK_COLOR[check.status];
  const showTestLeadAction =
    check.stage === 'test_lead' && failingTestLead != null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
          }}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">
              {check.label}
            </span>
            <Badge tone={STATUS_TONE[check.status]}>{check.status}</Badge>
            <a
              href={STAGE_META[check.stage].docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium text-[color:var(--cat-signals)] hover:underline">
              docs
            </a>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-2">{check.detail}</p>
          {check.remediation ? (
            <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-ink-2">
              <TriangleAlert
                className="mt-0.5 size-3.5 shrink-0 text-[color:var(--cat-measurement)]"
                aria-hidden
              />
              <span>{check.remediation}</span>
            </p>
          ) : null}
          {showTestLeadAction ? (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  onRunTestLead(client, failingTestLead);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-colors hover:opacity-90">
                <ClipboardCheck className="size-3.5" />
                Run test-lead round-trip
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms & leads
// ---------------------------------------------------------------------------

function FormsView({
  client,
  onRunTestLead,
}: {
  client: LeadClient;
  onRunTestLead: (client: LeadClient, form: LeadForm) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Lead ad forms"
        sub="Leads live on the ad and form nodes — read via <AD_ID>/leads or <FORM_ID>/leads (form-level returns more). Rate limit: 200 × 24 × leads created in the past 90 days, per Page / 24h."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Form</th>
                <th className={TH}>Ad</th>
                <th className={TH}>Page install</th>
                <th className={TH}>Test lead</th>
                <th className={TH}>Leads (90d)</th>
                <th className={TH}>Retrieved</th>
                <th className={TH}>Read limit / 24h</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {client.forms.map(f => {
                const retrievable = !(f.leads90d > 0 && f.leadsRetrieved === 0);
                return (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {f.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        form {f.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[12px] text-ink-2">{f.adName}</div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        ad {f.adId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {f.pageSubscribed ? (
                        <Badge tone="green">Subscribed</Badge>
                      ) : (
                        <Badge tone="rose">Not installed</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {f.testLeadOk ? (
                        <Badge tone="green">Pass</Badge>
                      ) : (
                        <Badge tone="rose">Fail</Badge>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(f.leads90d)}
                    </td>
                    <td className="px-3 py-2.5">
                      {retrievable ? (
                        <span className="text-[12px] font-semibold tabular-nums text-ink">
                          {formatCount(f.leadsRetrieved)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--rose)]">
                          <TriangleAlert className="size-3.5" />0
                        </span>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(bulkReadRateLimit(f.leads90d))}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onRunTestLead(client, f);
                        }}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                        Test lead
                      </button>
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
            style={{background: 'var(--green)'}}
          />
          {WEBHOOK_STATUS_META.success.label} — webhook receiving leadgen pings
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{background: 'var(--rose)'}}
          />
          Blocked — resolve on the Setup checks tab
        </span>
      </div>
    </div>
  );
}
