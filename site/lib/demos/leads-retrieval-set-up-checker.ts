/**
 * Representative sample data for the Leads Retrieval Set-Up Checker.
 *
 * UI prototype only — mock data shaped after the Graph / Marketing APIs named in
 * docs/solutions/leads/leads-retrieval-set-up-checker.md. No real Marketing API
 * calls are made. Field names mirror the documented endpoints:
 *   - App permissions:      GET  <APP_ID>/permissions            (leads_retrieval, pages_manage_ads, pages_read_engagement, ...)
 *   - App webhook subs:     GET  <APP_ID>/subscriptions          (object=page, fields=[leadgen], callback_url, active)
 *   - Page subscribed apps: GET  <PAGE_ID>/subscribed_apps       (subscribed_fields=[leadgen])
 *   - Test lead round-trip: POST <FORM_ID>/test_leads (field_data) → GET <FORM_ID>/test_leads → DELETE <LEAD_ID>
 *   - Bulk read:            GET  <AD_ID>/leads  /  <FORM_ID>/leads (fields=created_time,id,ad_id,form_id,field_data)
 *   - Single lead:          GET  <LEAD_ID>?fields=...,custom_disclaimer_responses
 * Bulk-read rate limit: 200 × 24 × (leads created in past 90 days) per Page / 24h.
 */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export const CHECK_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--green)',
  warn: 'var(--cat-measurement)',
  fail: 'var(--rose)',
};

/** Ordered stages of the leads-retrieval setup, mirroring the spec's steps. */
export type CheckStage =
  'permissions' | 'webhook' | 'page' | 'test_lead' | 'retrieval';

export const STAGE_META: Record<
  CheckStage,
  {label: string; order: number; docsUrl: string}
> = {
  permissions: {
    label: 'App permissions',
    order: 1,
    docsUrl:
      'https://developers.facebook.com/docs/graph-api/reference/application/permissions/',
  },
  webhook: {
    label: 'Webhook subscription',
    order: 2,
    docsUrl:
      'https://developers.facebook.com/docs/graph-api/webhooks/subscriptions-edge',
  },
  page: {
    label: 'Page install',
    order: 3,
    docsUrl:
      'https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/#Reading',
  },
  test_lead: {
    label: 'Test lead round-trip',
    order: 4,
    docsUrl:
      'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/testing-troubleshooting',
  },
  retrieval: {
    label: 'Lead retrieval',
    order: 5,
    docsUrl:
      'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving#bulk-read',
  },
};

/** Webhook delivery status — per spec: pending → success → failed. */
export type WebhookStatus = 'success' | 'pending' | 'failed';

/** One check in the setup scorecard, grounded in a documented signal. */
export interface SetupCheck {
  key: string;
  stage: CheckStage;
  label: string;
  status: CheckStatus;
  /** Short measured value, e.g. "leads_retrieval granted" or "2 forms not installed". */
  detail: string;
  /** Documented remediation, shown when status is not "pass". */
  remediation?: string;
}

/** App permission (from <APP_ID>/permissions). */
export interface AppPermission {
  permission: string;
  /** permission status — 'granted' | 'declined' | 'expired'. */
  granted: boolean;
  /** true when required for leads retrieval. */
  required: boolean;
}

/** Webhook subscription on the app (object=page, field=leadgen). */
export interface WebhookSubscription {
  object: string;
  field: string;
  callbackUrl: string;
  active: boolean;
  /** Delivery status of the most recent leadgen ping. */
  lastDeliveryStatus: WebhookStatus;
  /** error_code exposed when a delivery failed (spec: failures expose error_code). */
  errorCode?: number;
  errorMessage?: string;
}

/** A lead ad form under the page, with its retrievability signals. */
export interface LeadForm {
  id: string;
  name: string;
  /** <PAGE_ID>/subscribed_apps — is the checker's app installed & subscribed to leadgen. */
  pageSubscribed: boolean;
  /** One representative ad this form is attached to (for <AD_ID>/leads). */
  adId: string;
  adName: string;
  /** Whether a test-lead POST→GET→DELETE round-trip succeeded. */
  testLeadOk: boolean;
  /** Leads created in the past 90 days (drives the bulk-read rate limit). */
  leads90d: number;
  /** Leads read back via <FORM_ID>/leads in the last retrieval attempt. */
  leadsRetrieved: number;
}

/** A client (business) being checked, spanning app + page + forms. */
export interface LeadClient {
  id: string;
  name: string;
  appId: string;
  appName: string;
  pageId: string;
  pageName: string;
  permissions: AppPermission[];
  webhook: WebhookSubscription;
  forms: LeadForm[];
}

// --- thresholds codified from the spec ---

/** Bulk-read rate limit multiplier: 200 × 24 × (leads created in past 90 days). */
export const RATE_LIMIT_PER_LEAD_90D = 200 * 24;

export function bulkReadRateLimit(leads90d: number): number {
  return RATE_LIMIT_PER_LEAD_90D * leads90d;
}

/** Compact count formatting for volumes (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export const WEBHOOK_STATUS_META: Record<
  WebhookStatus,
  {label: string; status: CheckStatus}
> = {
  success: {label: 'Delivered', status: 'pass'},
  pending: {label: 'Pending', status: 'warn'},
  failed: {label: 'Failed', status: 'fail'},
};

// ---------------------------------------------------------------------------
// Setup checker — codifies the spec's end-to-end checks into a per-client
// scorecard. Each check is derived only from documented signals and carries the
// documented remediation. (Build spec, step 1.)
// ---------------------------------------------------------------------------

export function clientChecks(client: LeadClient): SetupCheck[] {
  const missingPerms = client.permissions.filter(p => p.required && !p.granted);
  const webhookMeta = WEBHOOK_STATUS_META[client.webhook.lastDeliveryStatus];
  const notInstalled = client.forms.filter(f => !f.pageSubscribed);
  const testFailures = client.forms.filter(f => !f.testLeadOk);
  const notRetrievable = client.forms.filter(
    f => f.leads90d > 0 && f.leadsRetrieved === 0,
  );

  const permStatus: CheckStatus = missingPerms.length === 0 ? 'pass' : 'fail';
  const webhookStatus: CheckStatus = client.webhook.active
    ? webhookMeta.status
    : 'fail';
  const pageStatus: CheckStatus =
    notInstalled.length === 0
      ? 'pass'
      : notInstalled.length < client.forms.length
        ? 'warn'
        : 'fail';
  const testStatus: CheckStatus = testFailures.length === 0 ? 'pass' : 'fail';
  const retrievalStatus: CheckStatus =
    notRetrievable.length === 0
      ? 'pass'
      : notRetrievable.length < client.forms.length
        ? 'warn'
        : 'fail';

  return [
    {
      key: 'permissions',
      stage: 'permissions',
      label: 'App permissions',
      status: permStatus,
      detail:
        missingPerms.length === 0
          ? 'All required permissions granted'
          : `${missingPerms.map(p => p.permission).join(', ')} not granted`,
      remediation:
        permStatus === 'pass'
          ? undefined
          : 'Request the missing permissions in App Review, then re-check GET <APP_ID>/permissions.',
    },
    {
      key: 'webhook',
      stage: 'webhook',
      label: 'Webhook subscription',
      status: webhookStatus,
      detail: client.webhook.active
        ? `object=page · field=leadgen · ${webhookMeta.label}`
        : 'No active page/leadgen subscription',
      remediation:
        webhookStatus === 'pass'
          ? undefined
          : client.webhook.errorCode != null
            ? `Delivery failing (error_code ${client.webhook.errorCode}: ${client.webhook.errorMessage}). Verify the callback endpoint returns 200 and re-subscribe object=page, field=leadgen.`
            : 'Subscribe the app to object=page, field=leadgen and confirm the callback URL is reachable.',
    },
    {
      key: 'page',
      stage: 'page',
      label: 'Page install',
      status: pageStatus,
      detail:
        notInstalled.length === 0
          ? 'App installed on the page for all forms'
          : `${notInstalled.length} of ${client.forms.length} forms without a page subscription`,
      remediation:
        pageStatus === 'pass'
          ? undefined
          : 'Install the app on the page (POST <PAGE_ID>/subscribed_apps, subscribed_fields=[leadgen]) and confirm via GET <PAGE_ID>/subscribed_apps.',
    },
    {
      key: 'test_lead',
      stage: 'test_lead',
      label: 'Test lead round-trip',
      status: testStatus,
      detail:
        testFailures.length === 0
          ? 'Round-trip passing on all forms'
          : `${testFailures.length} form${testFailures.length === 1 ? '' : 's'} failed the round-trip`,
      remediation:
        testStatus === 'pass'
          ? undefined
          : 'Only one test lead is allowed per form — DELETE <LEAD_ID> before POST <FORM_ID>/test_leads, then GET <FORM_ID>/test_leads to confirm.',
    },
    {
      key: 'retrieval',
      stage: 'retrieval',
      label: 'Lead retrieval',
      status: retrievalStatus,
      detail:
        notRetrievable.length === 0
          ? 'Leads readable via <AD_ID>/leads and <FORM_ID>/leads'
          : `${notRetrievable.length} form${notRetrievable.length === 1 ? '' : 's'} returned 0 leads despite recent volume`,
      remediation:
        retrievalStatus === 'pass'
          ? undefined
          : 'Read leads from the ad or form node (leads live on the ad and form, not the ad set). Prefer <FORM_ID>/leads and pace requests within the 200 × 24 × leads-90d limit.',
    },
  ];
}

export function openIssueCount(client: LeadClient): number {
  return clientChecks(client).filter(c => c.status !== 'pass').length;
}

export function clientReady(client: LeadClient): boolean {
  return clientChecks(client).every(c => c.status === 'pass');
}

/** Overall stage the setup is blocked at (first non-pass check), or null when ready. */
export function blockedStage(client: LeadClient): CheckStage | null {
  const first = clientChecks(client).find(c => c.status !== 'pass');
  return first ? first.stage : null;
}

function perm(
  permission: string,
  granted: boolean,
  required: boolean,
): AppPermission {
  return {permission, granted, required};
}

export const CLIENTS: LeadClient[] = [
  {
    id: 'biz_204471',
    name: 'Meridian Auto Group',
    appId: '769140023881206',
    appName: 'Meridian Lead Sync',
    pageId: '102845771339028',
    pageName: 'Meridian Auto Group',
    permissions: [
      perm('leads_retrieval', true, true),
      perm('pages_manage_ads', true, true),
      perm('pages_read_engagement', true, true),
      perm('pages_show_list', true, true),
      perm('ads_management', true, false),
    ],
    webhook: {
      object: 'page',
      field: 'leadgen',
      callbackUrl: 'https://crm.meridianauto.com/webhooks/leadgen',
      active: true,
      lastDeliveryStatus: 'success',
    },
    forms: [
      {
        id: '1180023458871',
        name: 'Test Drive Request',
        pageSubscribed: true,
        adId: '23851002994410287',
        adName: 'Spring Test Drive — Sedan',
        testLeadOk: true,
        leads90d: 1420,
        leadsRetrieved: 1420,
      },
      {
        id: '1180023458990',
        name: 'Trade-In Valuation',
        pageSubscribed: true,
        adId: '23851002994410512',
        adName: 'Trade-In Offer — SUV',
        testLeadOk: true,
        leads90d: 860,
        leadsRetrieved: 860,
      },
    ],
  },
  {
    id: 'biz_318902',
    name: 'Horizon Home Loans',
    appId: '512087334902118',
    appName: 'Horizon Lead Bridge',
    pageId: '210094488771203',
    pageName: 'Horizon Home Loans',
    permissions: [
      perm('leads_retrieval', true, true),
      perm('pages_manage_ads', true, true),
      perm('pages_read_engagement', true, true),
      perm('pages_show_list', true, true),
    ],
    webhook: {
      object: 'page',
      field: 'leadgen',
      callbackUrl: 'https://api.horizonloans.io/meta/leadgen',
      active: true,
      lastDeliveryStatus: 'pending',
    },
    forms: [
      {
        id: '1244550983120',
        name: 'Rate Quote — Refinance',
        pageSubscribed: true,
        adId: '23852117740330091',
        adName: 'Refi in 2026 — Lower Payments',
        testLeadOk: true,
        leads90d: 2310,
        leadsRetrieved: 2310,
      },
      {
        id: '1244550983255',
        name: 'First-Time Buyer Guide',
        pageSubscribed: false,
        adId: '23852117740330214',
        adName: 'First Home — Free Guide',
        testLeadOk: true,
        leads90d: 540,
        leadsRetrieved: 540,
      },
    ],
  },
  {
    id: 'biz_440157',
    name: 'Solace Dental Studios',
    appId: '884320119004573',
    appName: 'Solace Intake Connector',
    pageId: '338710025589471',
    pageName: 'Solace Dental Studios',
    permissions: [
      perm('leads_retrieval', false, true),
      perm('pages_manage_ads', true, true),
      perm('pages_read_engagement', true, true),
      perm('pages_show_list', true, true),
    ],
    webhook: {
      object: 'page',
      field: 'leadgen',
      callbackUrl: 'https://intake.solacedental.com/hooks/meta',
      active: true,
      lastDeliveryStatus: 'failed',
      errorCode: 2200,
      errorMessage: 'callback verification failed (non-200 response)',
    },
    forms: [
      {
        id: '1391002774830',
        name: 'New Patient — Cleaning Offer',
        pageSubscribed: false,
        adId: '23853440021190455',
        adName: 'New Patient Special — $59 Cleaning',
        testLeadOk: false,
        leads90d: 680,
        leadsRetrieved: 0,
      },
      {
        id: '1391002774961',
        name: 'Invisalign Consultation',
        pageSubscribed: false,
        adId: '23853440021190612',
        adName: 'Straighten Your Smile — Free Consult',
        testLeadOk: false,
        leads90d: 240,
        leadsRetrieved: 0,
      },
    ],
  },
  {
    id: 'biz_501633',
    name: 'Northwind Insurance',
    appId: '640228190337744',
    appName: 'Northwind Lead Router',
    pageId: '419883100472066',
    pageName: 'Northwind Insurance',
    permissions: [
      perm('leads_retrieval', true, true),
      perm('pages_manage_ads', true, true),
      perm('pages_read_engagement', true, true),
      perm('pages_show_list', true, true),
    ],
    webhook: {
      object: 'page',
      field: 'leadgen',
      callbackUrl: 'https://leads.northwind-ins.com/webhook',
      active: true,
      lastDeliveryStatus: 'success',
    },
    forms: [
      {
        id: '1502771003948',
        name: 'Auto Insurance Quote',
        pageSubscribed: true,
        adId: '23854990117720338',
        adName: 'Save on Auto — Instant Quote',
        testLeadOk: true,
        leads90d: 3120,
        leadsRetrieved: 3120,
      },
      {
        id: '1502771004077',
        name: 'Home Insurance Quote',
        pageSubscribed: true,
        adId: '23854990117720491',
        adName: 'Protect Your Home — Free Quote',
        testLeadOk: true,
        leads90d: 1780,
        leadsRetrieved: 0,
      },
    ],
  },
];
