/**
 * Representative sample data for the Conversions API Gateway Control Panel.
 *
 * UI prototype only — mock data shaped after the Gateway Control Plane API named
 * in docs/solutions/signals/conversions-api-gateway-control-panel.md. No real
 * calls are made. The Control Plane API is GraphQL against a Gateway instance
 * domain (not the REST Graph API): account/user mutations POST to
 * `https://{capig_domain}/hub/graphql/`, pixel mutations to
 * `https://{capig_domain}/capig/graphql/`, and a client-credentials token
 * (10-hour expiry) is minted at `POST https://{capig_domain}/clients/token`.
 * "Accounts" are called tenants (`tenantId`). Field names mirror the doc:
 *   - tenantMutations.createTenant / updateTenant / deleteTenant
 *   - tenant(tenantId) / tenantUsage(tenantId){totalActivePixels,totalEventsReceived,…}
 *   - userMutations.addUserWithRole({email,roleName}) → invitationLink,
 *     changeRoleForUser, sendInvitation
 *   - signalMutations.setupPixelSignalConfig({businessId,pixelId,accessToken,externalId}),
 *     deleteDataSource, tenantQueries.account.signalConfigs,
 *     updateSignalConfigEventsStatus / updateSignalConfigCapiPublish
 *   - per-pixel connectionStatus{lastReceived,totalEventsReceived,lastPublished,
 *     apiErrorCode,publishingEnabled}
 */

/** The Gateway instance domain a Control Plane API integration targets. */
export const CAPIG_DOMAIN = 'gw.acme-agency.capig.io';

/** GraphQL endpoints on the Gateway instance (per the integration guide). */
export const HUB_GRAPHQL_ENDPOINT = `https://${CAPIG_DOMAIN}/hub/graphql/`;
export const CAPIG_GRAPHQL_ENDPOINT = `https://${CAPIG_DOMAIN}/capig/graphql/`;
export const TOKEN_ENDPOINT = `https://${CAPIG_DOMAIN}/clients/token`;

/** Developer-doc links surfaced in the API console for each call. */
export const DOC_CONTROL_PLANE =
  'https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api';
export const DOC_ACCOUNTS = `${DOC_CONTROL_PLANE}/account-management`;
export const DOC_USERS = `${DOC_CONTROL_PLANE}/user-management`;
export const DOC_PIXELS = `${DOC_CONTROL_PLANE}/pixel-management`;

// ---------------------------------------------------------------------------
// Roles — the roleName set assignable via userMutations.addUserWithRole /
// changeRoleForUser.
// ---------------------------------------------------------------------------

export type RoleName = 'ADMIN' | 'EDITOR' | 'ANALYST';

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  ANALYST: 'Analyst',
};

export const ROLE_NAMES: RoleName[] = ['ADMIN', 'EDITOR', 'ANALYST'];

// ---------------------------------------------------------------------------
// Users — userMutations at scale (invited via addUserWithRole → invitationLink,
// re-nudged via sendInvitation, re-roled via changeRoleForUser).
// ---------------------------------------------------------------------------

export type InvitationStatus = 'active' | 'invited' | 'expired';

export interface GatewayUser {
  id: string;
  email: string;
  roleName: RoleName;
  status: InvitationStatus;
  /** addUserWithRole → invitationLink (only meaningful while not active). */
  invitationLink?: string;
}

// ---------------------------------------------------------------------------
// Pixels — tenantQueries.account.signalConfigs, each with a connectionStatus.
// ---------------------------------------------------------------------------

/** connectionStatus fields returned per signal config. */
export interface ConnectionStatus {
  /** lastReceived — ISO timestamp of the most recent event received. */
  lastReceived: string | null;
  /** totalEventsReceived over the reporting window. */
  totalEventsReceived: number;
  /** lastPublished — ISO timestamp of the most recent publish to Meta. */
  lastPublished: string | null;
  /** apiErrorCode — non-null when publishing is failing. */
  apiErrorCode: number | null;
  /** publishingEnabled — CAPI publish toggle. */
  publishingEnabled: boolean;
}

export interface SignalConfig {
  /** pixelId (the connected dataset). */
  pixelId: string;
  name: string;
  businessId: string;
  /** updateSignalConfigEventsStatus — whether the pixel is receiving events. */
  receivingEnabled: boolean;
  connectionStatus: ConnectionStatus;
}

// ---------------------------------------------------------------------------
// Accounts (tenants) — tenantMutations + tenant(tenantId) / tenantUsage(tenantId).
// ---------------------------------------------------------------------------

/** tenantUsage(tenantId) roll-up fields. */
export interface TenantUsage {
  totalActivePixels: number;
  totalEventsReceived: number;
}

export type IntegrationPath = 'partial' | 'full';

export interface Tenant {
  /** tenantId. */
  id: string;
  name: string;
  businessId: string;
  /** Partial (no advertiser auth) vs Full (advertiser auth) integration. */
  integrationPath: IntegrationPath;
  usage: TenantUsage;
  users: GatewayUser[];
  signalConfigs: SignalConfig[];
}

export const INTEGRATION_PATH_LABEL: Record<IntegrationPath, string> = {
  partial: 'Partial',
  full: 'Full',
};

// ---------------------------------------------------------------------------
// Health — a per-pixel status derived only from connectionStatus fields.
// ---------------------------------------------------------------------------

export type PixelHealth = 'healthy' | 'attention' | 'error' | 'idle';

export const HEALTH_META: Record<
  PixelHealth,
  {label: string; colorVar: string}
> = {
  healthy: {label: 'Healthy', colorVar: 'var(--green)'},
  attention: {label: 'Needs attention', colorVar: 'var(--yellow)'},
  error: {label: 'Publishing error', colorVar: 'var(--rose)'},
  idle: {label: 'Idle', colorVar: 'var(--ink-3)'},
};

/**
 * Derive a pixel's health strictly from its connectionStatus:
 *   - an apiErrorCode → error
 *   - not receiving OR publishing disabled → attention
 *   - never received an event → idle
 *   - otherwise healthy
 */
export function pixelHealth(config: SignalConfig): PixelHealth {
  const cs = config.connectionStatus;
  if (cs.apiErrorCode != null) return 'error';
  if (cs.lastReceived == null) return 'idle';
  if (!config.receivingEnabled || !cs.publishingEnabled) return 'attention';
  return 'healthy';
}

/** apiErrorCode → short human message (Gateway publish error codes). */
export const API_ERROR_LABEL: Record<number, string> = {
  190: 'Access token expired',
  100: 'Invalid pixel or business ID',
  200: 'Missing permissions',
};

export function apiErrorLabel(code: number): string {
  return API_ERROR_LABEL[code] ?? `Error ${code}`;
}

// ---------------------------------------------------------------------------
// Formatting helpers.
// ---------------------------------------------------------------------------

/** Compact event count for display (e.g. 1_240_000 → "1.2M"). */
export function formatEvents(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Relative "time ago" from an ISO timestamp, against the demo's "now". */
const NOW = new Date('2026-07-03T12:00:00Z').getTime();

export function timeAgo(iso: string | null): string {
  if (iso == null) return 'never';
  const diffMs = NOW - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Sample data — one Gateway instance, three tenants.
// ---------------------------------------------------------------------------

function usageOf(configs: SignalConfig[]): TenantUsage {
  return {
    totalActivePixels: configs.filter(c => c.receivingEnabled).length,
    totalEventsReceived: configs.reduce(
      (sum, c) => sum + c.connectionStatus.totalEventsReceived,
      0,
    ),
  };
}

function tenant(t: Omit<Tenant, 'usage'> & {usage?: TenantUsage}): Tenant {
  return {...t, usage: t.usage ?? usageOf(t.signalConfigs)};
}

export const TENANTS: Tenant[] = [
  tenant({
    id: 'tnt_northwind',
    name: 'Northwind Retail',
    businessId: '178203994001',
    integrationPath: 'full',
    users: [
      {
        id: 'usr_nw_1',
        email: 'ops@northwind.example',
        roleName: 'ADMIN',
        status: 'active',
      },
      {
        id: 'usr_nw_2',
        email: 'analyst@northwind.example',
        roleName: 'ANALYST',
        status: 'active',
      },
      {
        id: 'usr_nw_3',
        email: 'newhire@northwind.example',
        roleName: 'EDITOR',
        status: 'invited',
        invitationLink: `https://${CAPIG_DOMAIN}/invite/nw3`,
      },
    ],
    signalConfigs: [
      {
        pixelId: '620114550098',
        name: 'Northwind Web',
        businessId: '178203994001',
        receivingEnabled: true,
        connectionStatus: {
          lastReceived: '2026-07-03T11:52:00Z',
          totalEventsReceived: 4820000,
          lastPublished: '2026-07-03T11:52:00Z',
          apiErrorCode: null,
          publishingEnabled: true,
        },
      },
      {
        pixelId: '620114550122',
        name: 'Northwind App',
        businessId: '178203994001',
        receivingEnabled: true,
        connectionStatus: {
          lastReceived: '2026-07-03T09:14:00Z',
          totalEventsReceived: 1310000,
          lastPublished: null,
          apiErrorCode: 190,
          publishingEnabled: true,
        },
      },
    ],
  }),
  tenant({
    id: 'tnt_lumen',
    name: 'Lumen Skincare',
    businessId: '204778120553',
    integrationPath: 'full',
    users: [
      {
        id: 'usr_lm_1',
        email: 'growth@lumen.example',
        roleName: 'ADMIN',
        status: 'active',
      },
      {
        id: 'usr_lm_2',
        email: 'media@lumen.example',
        roleName: 'EDITOR',
        status: 'active',
      },
    ],
    signalConfigs: [
      {
        pixelId: '733920018844',
        name: 'Lumen Storefront',
        businessId: '204778120553',
        receivingEnabled: true,
        connectionStatus: {
          lastReceived: '2026-07-03T11:58:00Z',
          totalEventsReceived: 7140000,
          lastPublished: '2026-07-03T11:58:00Z',
          apiErrorCode: null,
          publishingEnabled: true,
        },
      },
      {
        pixelId: '733920018901',
        name: 'Lumen Subscriptions',
        businessId: '204778120553',
        receivingEnabled: true,
        connectionStatus: {
          lastReceived: '2026-07-03T11:40:00Z',
          totalEventsReceived: 2260000,
          lastPublished: '2026-07-03T11:40:00Z',
          apiErrorCode: null,
          publishingEnabled: false,
        },
      },
    ],
  }),
  tenant({
    id: 'tnt_atlas',
    name: 'Atlas Outdoors',
    businessId: '311650042876',
    integrationPath: 'partial',
    users: [
      {
        id: 'usr_at_1',
        email: 'marketing@atlas.example',
        roleName: 'ADMIN',
        status: 'active',
      },
      {
        id: 'usr_at_2',
        email: 'contractor@atlas.example',
        roleName: 'ANALYST',
        status: 'expired',
        invitationLink: `https://${CAPIG_DOMAIN}/invite/at2`,
      },
    ],
    signalConfigs: [
      {
        pixelId: '905331276410',
        name: 'Atlas Web',
        businessId: '311650042876',
        receivingEnabled: true,
        connectionStatus: {
          lastReceived: '2026-07-03T11:30:00Z',
          totalEventsReceived: 3110000,
          lastPublished: '2026-07-03T11:30:00Z',
          apiErrorCode: null,
          publishingEnabled: true,
        },
      },
      {
        pixelId: '905331276488',
        name: 'Atlas Wholesale',
        businessId: '311650042876',
        receivingEnabled: false,
        connectionStatus: {
          lastReceived: null,
          totalEventsReceived: 0,
          lastPublished: null,
          apiErrorCode: null,
          publishingEnabled: false,
        },
      },
    ],
  }),
];
