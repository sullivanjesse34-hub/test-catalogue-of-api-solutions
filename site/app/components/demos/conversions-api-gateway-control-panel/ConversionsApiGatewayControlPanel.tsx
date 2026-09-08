'use client';

import {
  Activity,
  Building2,
  Check,
  KeyRound,
  Link2,
  type LucideIcon,
  Mail,
  Plug,
  Power,
  RefreshCw,
  Send,
  Users,
  X,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  apiErrorLabel,
  CAPIG_DOMAIN,
  CAPIG_GRAPHQL_ENDPOINT,
  DOC_ACCOUNTS,
  DOC_CONTROL_PLANE,
  DOC_PIXELS,
  DOC_USERS,
  formatEvents,
  type GatewayUser,
  HEALTH_META,
  HUB_GRAPHQL_ENDPOINT,
  INTEGRATION_PATH_LABEL,
  type PixelHealth,
  pixelHealth,
  ROLE_LABEL,
  ROLE_NAMES,
  type RoleName,
  type SignalConfig,
  type Tenant,
  TENANTS,
  timeAgo,
  TOKEN_ENDPOINT,
} from '@/lib/demos/conversions-api-gateway-control-panel';

type Tab = 'accounts' | 'pixels' | 'users' | 'health';

const TABS: Array<{id: Tab; label: string; icon: LucideIcon}> = [
  {id: 'accounts', label: 'Accounts', icon: Building2},
  {id: 'pixels', label: 'Pixels', icon: Plug},
  {id: 'users', label: 'Users', icon: Users},
  {id: 'health', label: 'Health', icon: Activity},
];

// The initial reads that populate the panel for the selected tenant.
function buildLoadCalls(tenant: Tenant): ApiCallInput[] {
  return [
    {
      method: 'POST',
      endpoint: TOKEN_ENDPOINT,
      summary:
        'Mint a client-credentials access token (expires every 10 hours)',
      request: {grant_type: 'client_credentials', client_id: 'client_***'},
      response: {
        access_token: 'eyJ***',
        token_type: 'Bearer',
        expires_in: 36000,
      },
      status: 'success',
      docsUrl: DOC_CONTROL_PLANE,
    },
    {
      method: 'POST',
      endpoint: HUB_GRAPHQL_ENDPOINT,
      summary: `Query tenant + tenantUsage for ${tenant.name}`,
      request: {
        query:
          'query($id:ID!){ tenant(tenantId:$id){ id name integrationPath } tenantUsage(tenantId:$id){ totalActivePixels totalEventsReceived } }',
        variables: {id: tenant.id},
      },
      response: {
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            integrationPath: tenant.integrationPath,
          },
          tenantUsage: {
            totalActivePixels: tenant.usage.totalActivePixels,
            totalEventsReceived: tenant.usage.totalEventsReceived,
          },
        },
      },
      status: 'success',
      docsUrl: DOC_ACCOUNTS,
    },
    {
      method: 'POST',
      endpoint: HUB_GRAPHQL_ENDPOINT,
      summary: `List signal configs (pixels) for ${tenant.name}`,
      request: {
        query:
          'query($id:ID!){ tenantQueries(tenantId:$id){ account{ signalConfigs{ pixelId name connectionStatus{ lastReceived totalEventsReceived lastPublished apiErrorCode publishingEnabled } } } } }',
        variables: {id: tenant.id},
      },
      response: {
        data: {
          tenantQueries: {
            account: {
              signalConfigs: tenant.signalConfigs.map(c => ({
                pixelId: c.pixelId,
                name: c.name,
                connectionStatus: c.connectionStatus,
              })),
            },
          },
        },
      },
      status: 'success',
      docsUrl: DOC_PIXELS,
    },
  ];
}

function cloneTenants(): Tenant[] {
  return TENANTS.map(t => ({
    ...t,
    usage: {...t.usage},
    users: t.users.map(u => ({...u})),
    signalConfigs: t.signalConfigs.map(c => ({
      ...c,
      connectionStatus: {...c.connectionStatus},
    })),
  }));
}

function recomputeUsage(configs: SignalConfig[]): Tenant['usage'] {
  return {
    totalActivePixels: configs.filter(c => c.receivingEnabled).length,
    totalEventsReceived: configs.reduce(
      (sum, c) => sum + c.connectionStatus.totalEventsReceived,
      0,
    ),
  };
}

export function ConversionsApiGatewayControlPanel() {
  const {record} = useApiConsole();
  const [tenants, setTenants] = useState<Tenant[]>(cloneTenants);
  const [tenantId, setTenantId] = useState(TENANTS[0].id);
  const [tab, setTab] = useState<Tab>('accounts');
  const [connectOpen, setConnectOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const idCounter = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tenant = tenants.find(t => t.id === tenantId) ?? tenants[0];

  useApiLoads(tenantId, () => buildLoadCalls(tenant));

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const updateTenant = (fn: (t: Tenant) => Tenant) => {
    setTenants(prev => prev.map(t => (t.id !== tenant.id ? t : fn(t))));
  };

  // --- write actions (all mock; mutate in-memory clones) ---

  const connectPixel = (pixelId: string, name: string) => {
    const newConfig: SignalConfig = {
      pixelId,
      name,
      businessId: tenant.businessId,
      receivingEnabled: true,
      connectionStatus: {
        lastReceived: null,
        totalEventsReceived: 0,
        lastPublished: null,
        apiErrorCode: null,
        publishingEnabled: true,
      },
    };
    record({
      method: 'POST',
      endpoint: CAPIG_GRAPHQL_ENDPOINT,
      summary: `Connect pixel ${pixelId} to ${tenant.name}`,
      request: {
        query:
          'mutation($in:SetupPixelSignalConfigInput!){ signalMutations{ setupPixelSignalConfig(input:$in){ pixelId } } }',
        variables: {
          in: {
            businessId: tenant.businessId,
            pixelId,
            accessToken: 'EAA***',
            externalId: `${tenant.id}:${pixelId}`,
          },
        },
      },
      response: {
        data: {signalMutations: {setupPixelSignalConfig: {pixelId}}},
      },
      status: 'success',
      docsUrl: DOC_PIXELS,
    });
    updateTenant(t => {
      const signalConfigs = [...t.signalConfigs, newConfig];
      return {...t, signalConfigs, usage: recomputeUsage(signalConfigs)};
    });
    setConnectOpen(false);
    showToast(`Connected pixel ${pixelId}`);
  };

  const toggleReceiving = (pixelId: string) => {
    const config = tenant.signalConfigs.find(c => c.pixelId === pixelId);
    if (!config) return;
    const next = !config.receivingEnabled;
    record({
      method: 'POST',
      endpoint: CAPIG_GRAPHQL_ENDPOINT,
      summary: `${next ? 'Resume' : 'Pause'} event receiving for ${config.name}`,
      request: {
        query:
          'mutation($in:UpdateSignalConfigEventsStatusInput!){ signalMutations{ updateSignalConfigEventsStatus(input:$in){ pixelId } } }',
        variables: {in: {pixelId, receivingEnabled: next}},
      },
      response: {
        data: {signalMutations: {updateSignalConfigEventsStatus: {pixelId}}},
      },
      status: 'success',
      docsUrl: DOC_PIXELS,
    });
    updateTenant(t => {
      const signalConfigs = t.signalConfigs.map(c =>
        c.pixelId === pixelId ? {...c, receivingEnabled: next} : c,
      );
      return {...t, signalConfigs, usage: recomputeUsage(signalConfigs)};
    });
    showToast(`${next ? 'Resumed' : 'Paused'} receiving · ${config.name}`);
  };

  const togglePublish = (pixelId: string) => {
    const config = tenant.signalConfigs.find(c => c.pixelId === pixelId);
    if (!config) return;
    const next = !config.connectionStatus.publishingEnabled;
    record({
      method: 'POST',
      endpoint: CAPIG_GRAPHQL_ENDPOINT,
      summary: `${next ? 'Enable' : 'Disable'} CAPI publishing for ${config.name}`,
      request: {
        query:
          'mutation($in:UpdateSignalConfigCapiPublishInput!){ signalMutations{ updateSignalConfigCapiPublish(input:$in){ pixelId } } }',
        variables: {in: {pixelId, publishingEnabled: next}},
      },
      response: {
        data: {signalMutations: {updateSignalConfigCapiPublish: {pixelId}}},
      },
      status: 'success',
      docsUrl: DOC_PIXELS,
    });
    updateTenant(t => ({
      ...t,
      signalConfigs: t.signalConfigs.map(c =>
        c.pixelId === pixelId
          ? {
              ...c,
              connectionStatus: {
                ...c.connectionStatus,
                publishingEnabled: next,
              },
            }
          : c,
      ),
    }));
    showToast(`${next ? 'Enabled' : 'Disabled'} publishing · ${config.name}`);
  };

  const inviteUser = (email: string, roleName: RoleName) => {
    const id = `usr_new_${++idCounter.current}`;
    const invitationLink = `https://${CAPIG_DOMAIN}/invite/${id}`;
    const user: GatewayUser = {
      id,
      email,
      roleName,
      status: 'invited',
      invitationLink,
    };
    record({
      method: 'POST',
      endpoint: HUB_GRAPHQL_ENDPOINT,
      summary: `Invite ${email} as ${ROLE_LABEL[roleName]} on ${tenant.name}`,
      request: {
        query:
          'mutation($id:ID!,$in:AddUserWithRoleInput!){ userMutations(tenantId:$id){ addUserWithRole(input:$in){ invitationLink } } }',
        variables: {id: tenant.id, in: {email, roleName}},
      },
      response: {
        data: {userMutations: {addUserWithRole: {invitationLink}}},
      },
      status: 'success',
      docsUrl: DOC_USERS,
    });
    updateTenant(t => ({...t, users: [...t.users, user]}));
    setInviteOpen(false);
    showToast(`Invited ${email}`);
  };

  const changeRole = (userId: string, roleName: RoleName) => {
    const user = tenant.users.find(u => u.id === userId);
    if (!user || user.roleName === roleName) return;
    record({
      method: 'POST',
      endpoint: HUB_GRAPHQL_ENDPOINT,
      summary: `Change ${user.email} to ${ROLE_LABEL[roleName]}`,
      request: {
        query:
          'mutation($id:ID!,$in:ChangeRoleForUserInput!){ userMutations(tenantId:$id){ changeRoleForUser(input:$in){ id } } }',
        variables: {id: tenant.id, in: {userId, roleName}},
      },
      response: {data: {userMutations: {changeRoleForUser: {id: userId}}}},
      status: 'success',
      docsUrl: DOC_USERS,
    });
    updateTenant(t => ({
      ...t,
      users: t.users.map(u => (u.id === userId ? {...u, roleName} : u)),
    }));
    showToast(`${user.email} → ${ROLE_LABEL[roleName]}`);
  };

  const resendInvitation = (userId: string) => {
    const user = tenant.users.find(u => u.id === userId);
    if (!user) return;
    record({
      method: 'POST',
      endpoint: HUB_GRAPHQL_ENDPOINT,
      summary: `Resend invitation to ${user.email}`,
      request: {
        query:
          'mutation($id:ID!,$in:SendInvitationInput!){ userMutations(tenantId:$id){ sendInvitation(input:$in){ invitationLink } } }',
        variables: {id: tenant.id, in: {userId}},
      },
      response: {
        data: {
          userMutations: {
            sendInvitation: {invitationLink: user.invitationLink ?? ''},
          },
        },
      },
      status: 'success',
      docsUrl: DOC_USERS,
    });
    updateTenant(t => ({
      ...t,
      users: t.users.map(u =>
        u.id === userId ? {...u, status: 'invited'} : u,
      ),
    }));
    showToast(`Re-sent invitation to ${user.email}`);
  };

  return (
    <div>
      {/* Header: tabs + tenant selector */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {TABS.map(({id, label, icon: Icon}) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
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
            value={tenantId}
            onChange={e => {
              setTenantId(e.target.value);
              setConnectOpen(false);
              setInviteOpen(false);
            }}
            aria-label="Select account (tenant)"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Instance banner */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <KeyRound className="size-3.5 text-ink-3" />
          Gateway instance
        </span>
        <span className="font-mono text-ink-2">{CAPIG_DOMAIN}</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{background: 'var(--green)'}}
          />
          Token valid · expires in ~10h
        </span>
      </div>

      {tab === 'accounts' ? (
        <AccountsTab tenant={tenant} />
      ) : tab === 'pixels' ? (
        <PixelsTab
          tenant={tenant}
          connectOpen={connectOpen}
          onOpenConnect={() => {
            setConnectOpen(true);
          }}
          onCloseConnect={() => {
            setConnectOpen(false);
          }}
          onConnect={connectPixel}
          onToggleReceiving={toggleReceiving}
          onTogglePublish={togglePublish}
        />
      ) : tab === 'users' ? (
        <UsersTab
          tenant={tenant}
          inviteOpen={inviteOpen}
          onOpenInvite={() => {
            setInviteOpen(true);
          }}
          onCloseInvite={() => {
            setInviteOpen(false);
          }}
          onInvite={inviteUser}
          onChangeRole={changeRole}
          onResend={resendInvitation}
        />
      ) : (
        <HealthTab tenant={tenant} />
      )}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Check className="size-4" style={{color: 'var(--green)'}} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function HealthBadge({health}: {health: PixelHealth}) {
  const meta = HEALTH_META[health];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: meta.colorVar,
        background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
      }}>
      <span
        className="size-1.5 rounded-full"
        style={{background: meta.colorVar}}
      />
      {meta.label}
    </span>
  );
}

function Stat({
  label,
  value,
  accentVar,
  icon,
}: {
  label: string;
  value: string;
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
      </div>
    </div>
  );
}

function RolePill({role}: {role: RoleName}) {
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
      {ROLE_LABEL[role]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Accounts tab — tenant overview + usage
// ---------------------------------------------------------------------------

function AccountsTab({tenant}: {tenant: Tenant}) {
  const activeUsers = tenant.users.filter(u => u.status === 'active').length;
  const errored = tenant.signalConfigs.filter(
    c => pixelHealth(c) === 'error',
  ).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-[-0.01em] text-ink">
              {tenant.name}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
              <span className="font-mono">tenantId: {tenant.id}</span>
              <span>· Business {tenant.businessId}</span>
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              color: 'var(--brand-ink)',
              background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
            }}>
            {INTEGRATION_PATH_LABEL[tenant.integrationPath]} integration
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Active pixels"
          value={String(tenant.usage.totalActivePixels)}
          accentVar="var(--brand)"
        />
        <Stat
          label="Events received"
          value={formatEvents(tenant.usage.totalEventsReceived)}
          accentVar="var(--purple)"
        />
        <Stat
          label="Active users"
          value={String(activeUsers)}
          accentVar="var(--green)"
        />
        <Stat
          label="Publishing errors"
          value={String(errored)}
          accentVar={errored > 0 ? 'var(--rose)' : 'var(--green)'}
        />
      </div>

      <p className="text-[12px] text-ink-3">
        Usage is read from{' '}
        <span className="font-mono">tenantUsage({tenant.id})</span>. Switch tabs
        to manage pixels, users, and per-connection health.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pixels tab — signalConfigs + connect / receiving / publishing controls
// ---------------------------------------------------------------------------

function PixelsTab({
  tenant,
  connectOpen,
  onOpenConnect,
  onCloseConnect,
  onConnect,
  onToggleReceiving,
  onTogglePublish,
}: {
  tenant: Tenant;
  connectOpen: boolean;
  onOpenConnect: () => void;
  onCloseConnect: () => void;
  onConnect: (pixelId: string, name: string) => void;
  onToggleReceiving: (pixelId: string) => void;
  onTogglePublish: (pixelId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-3">
          Signal configs connected to this Gateway instance.
        </p>
        <button
          type="button"
          onClick={onOpenConnect}
          disabled={connectOpen}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Plug className="size-4" /> Connect pixel
        </button>
      </div>

      {connectOpen ? (
        <ConnectPixelForm onConnect={onConnect} onCancel={onCloseConnect} />
      ) : null}

      <div className="flex flex-col gap-3">
        {tenant.signalConfigs.map(config => {
          const health = pixelHealth(config);
          const cs = config.connectionStatus;
          return (
            <div
              key={config.pixelId}
              className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg"
                  style={{
                    color: 'var(--cat-signals)',
                    background:
                      'color-mix(in srgb, var(--cat-signals) 12%, transparent)',
                  }}
                  aria-hidden>
                  <Plug className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {config.name}
                    </span>
                    <HealthBadge health={health} />
                  </div>
                  <p className="mt-0.5 font-mono text-[12px] text-ink-3">
                    pixel {config.pixelId}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-2">
                    <span>
                      <span className="text-ink-3">Events: </span>
                      {formatEvents(cs.totalEventsReceived)}
                    </span>
                    <span>
                      <span className="text-ink-3">Last received: </span>
                      {timeAgo(cs.lastReceived)}
                    </span>
                    <span>
                      <span className="text-ink-3">Last published: </span>
                      {timeAgo(cs.lastPublished)}
                    </span>
                    {cs.apiErrorCode != null ? (
                      <span style={{color: 'var(--rose)'}}>
                        {apiErrorLabel(cs.apiErrorCode)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleReceiving(config.pixelId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                    <Power className="size-3.5" />
                    {config.receivingEnabled ? 'Pause' : 'Resume'} receiving
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePublish(config.pixelId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                    <Send className="size-3.5" />
                    {cs.publishingEnabled ? 'Disable' : 'Enable'} publish
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectPixelForm({
  onConnect,
  onCancel,
}: {
  onConnect: (pixelId: string, name: string) => void;
  onCancel: () => void;
}) {
  const [pixelId, setPixelId] = useState('');
  const [name, setName] = useState('');
  const idValid = /^\d{10,16}$/.test(pixelId.trim());
  const nameValid = name.trim().length > 0;
  const valid = idValid && nameValid;

  const submit = () => {
    if (valid) onConnect(pixelId.trim(), name.trim());
  };

  return (
    <div className="rounded-xl border border-border-strong bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Connect a pixel</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-[12px] text-ink-3">
        Runs{' '}
        <span className="font-mono">
          signalMutations.setupPixelSignalConfig
        </span>{' '}
        against the Gateway instance.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-ink-2">
          Pixel ID
          <input
            value={pixelId}
            onChange={e => {
              setPixelId(e.target.value);
            }}
            inputMode="numeric"
            placeholder="620114550098"
            aria-label="Pixel ID"
            className="w-52 rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 font-mono text-sm text-ink outline-none focus:border-brand-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[12px] text-ink-2">
          Display name
          <input
            value={name}
            onChange={e => {
              setName(e.target.value);
            }}
            placeholder="Storefront Web"
            aria-label="Pixel display name"
            className="min-w-40 rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-2"
          />
        </label>
      </div>
      {pixelId.length > 0 && !idValid ? (
        <p className="mt-2 text-[12px]" style={{color: 'var(--rose)'}}>
          Pixel ID should be 10–16 digits.
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Link2 className="size-4" /> Connect
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab — userMutations at scale
// ---------------------------------------------------------------------------

const USER_STATUS_META: Record<
  GatewayUser['status'],
  {label: string; colorVar: string}
> = {
  active: {label: 'Active', colorVar: 'var(--green)'},
  invited: {label: 'Invited', colorVar: 'var(--yellow)'},
  expired: {label: 'Expired', colorVar: 'var(--rose)'},
};

function UsersTab({
  tenant,
  inviteOpen,
  onOpenInvite,
  onCloseInvite,
  onInvite,
  onChangeRole,
  onResend,
}: {
  tenant: Tenant;
  inviteOpen: boolean;
  onOpenInvite: () => void;
  onCloseInvite: () => void;
  onInvite: (email: string, roleName: RoleName) => void;
  onChangeRole: (userId: string, roleName: RoleName) => void;
  onResend: (userId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-3">
          Users with access to this tenant, and their roles.
        </p>
        <button
          type="button"
          onClick={onOpenInvite}
          disabled={inviteOpen}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Mail className="size-4" /> Invite user
        </button>
      </div>

      {inviteOpen ? (
        <InviteUserForm onInvite={onInvite} onCancel={onCloseInvite} />
      ) : null}

      <div className="flex flex-col gap-2.5">
        {tenant.users.map(user => {
          const status = USER_STATUS_META[user.status];
          const pending = user.status !== 'active';
          return (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold uppercase"
                style={{
                  color: 'var(--brand-ink)',
                  background:
                    'color-mix(in srgb, var(--brand) 12%, transparent)',
                }}
                aria-hidden>
                {user.email.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {user.email}
                </p>
                <span
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{color: status.colorVar}}>
                  <span
                    className="size-1.5 rounded-full"
                    style={{background: status.colorVar}}
                  />
                  {status.label}
                </span>
              </div>
              <RolePill role={user.roleName} />
              <select
                value={user.roleName}
                onChange={e => {
                  onChangeRole(user.id, e.target.value as RoleName);
                }}
                aria-label={`Change role for ${user.email}`}
                className="rounded-lg border-2 border-border bg-surface-2 px-2 py-1 text-[12px] font-medium text-ink outline-none focus:border-brand-2">
                {ROLE_NAMES.map(r => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              {pending ? (
                <button
                  type="button"
                  onClick={() => {
                    onResend(user.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                  <RefreshCw className="size-3.5" /> Resend
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InviteUserForm({
  onInvite,
  onCancel,
}: {
  onInvite: (email: string, roleName: RoleName) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleName>('EDITOR');
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const submit = () => {
    if (emailValid) onInvite(email.trim(), role);
  };

  return (
    <div className="rounded-xl border border-border-strong bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Invite a user</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-[12px] text-ink-3">
        Runs <span className="font-mono">userMutations.addUserWithRole</span>{' '}
        and returns an invitation link.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-[12px] text-ink-2">
          Email
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
            }}
            placeholder="name@company.example"
            aria-label="User email"
            className="min-w-52 rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-ink-2">
          Role
          <select
            value={role}
            onChange={e => {
              setRole(e.target.value as RoleName);
            }}
            aria-label="Role"
            className="rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-brand-2">
            {ROLE_NAMES.map(r => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {email.length > 0 && !emailValid ? (
        <p className="mt-2 text-[12px]" style={{color: 'var(--rose)'}}>
          Enter a valid email address.
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!emailValid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Send className="size-4" /> Send invitation
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health tab — per-connection status, derived only from connectionStatus
// ---------------------------------------------------------------------------

function HealthTab({tenant}: {tenant: Tenant}) {
  const counts = useMemo(() => {
    const acc: Record<PixelHealth, number> = {
      healthy: 0,
      attention: 0,
      error: 0,
      idle: 0,
    };
    for (const c of tenant.signalConfigs) acc[pixelHealth(c)] += 1;
    return acc;
  }, [tenant.signalConfigs]);

  const order: PixelHealth[] = ['healthy', 'attention', 'error', 'idle'];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {order.map(h => (
          <Stat
            key={h}
            label={HEALTH_META[h].label}
            value={String(counts[h])}
            accentVar={HEALTH_META[h].colorVar}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Pixel</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Publishing</th>
              <th className="px-4 py-2.5 font-semibold">Last published</th>
              <th className="px-4 py-2.5 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {tenant.signalConfigs.map(config => {
              const cs = config.connectionStatus;
              return (
                <tr
                  key={config.pixelId}
                  className="border-t border-border align-middle">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{config.name}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      {config.pixelId}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <HealthBadge health={pixelHealth(config)} />
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {cs.publishingEnabled ? 'Enabled' : 'Disabled'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">
                    {timeAgo(cs.lastPublished)}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {cs.apiErrorCode != null ? (
                      <span style={{color: 'var(--rose)'}}>
                        {apiErrorLabel(cs.apiErrorCode)}
                      </span>
                    ) : !config.receivingEnabled ? (
                      'Receiving paused'
                    ) : cs.lastReceived == null ? (
                      'No events yet'
                    ) : (
                      `${formatEvents(cs.totalEventsReceived)} events`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-ink-3">
        Health is derived only from each connection&rsquo;s{' '}
        <span className="font-mono">connectionStatus</span> — it complements the
        Dataset Quality metrics from the Signals Health Dashboard.
      </p>
    </div>
  );
}
