'use client';

/**
 * Representative sample data for the Creative Fatigue Notifier dashboard.
 *
 * UI prototype only — mock data shaped after the Meta Marketing API endpoints
 * named in docs/solutions/creative/creative-fatigue-notifier.md. No real API
 * calls are made. Field names mirror the documented APIs:
 *   - Business Management API:      <BUSINESS_ID>/owned_ad_accounts, client_ad_accounts
 *   - Performance Recommendations:  act_<AD_ACCOUNT_ID>/recommendations (CREATIVE_FATIGUE)
 *   - Webhook:                      creative_fatigue field on ad_account object
 *   - Ad Copies API:                POST <AD_ID>/copies (deep_copy, status_option, adset_id)
 */

/** How the fatigue signal was detected. */
export type FatigueSource = 'webhook' | 'recommendation';

/** Lifecycle status of a fatigue alert. */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/** A creative fatigue alert from either webhook or recommendation scan. */
export interface FatigueAlert {
  id: string;
  adId: string;
  adName: string;
  campaignName: string;
  adsetName: string;
  accountId: string;
  accountName: string;
  source: FatigueSource;
  status: AlertStatus;
  detectedAt: string;
  resolvedAt?: string;
  duplicatedAdId?: string;
}

/** Webhook connection state. */
export type WebhookConnectionState = 'connected' | 'disconnected';

/** Webhook configuration status for the creative fatigue subscription. */
export interface WebhookStatus {
  endpointUrl: string;
  state: WebhookConnectionState;
  lastPing: string;
  subscribedAccountsCount: number;
}

/** Basic ad info for display purposes. */
export interface Ad {
  id: string;
  name: string;
  campaignName: string;
  adsetName: string;
  status: 'active' | 'paused';
  creativeThumbnail: string;
}

/** An ad account that may contain fatigued creatives. */
export interface AdAccount {
  id: string;
  name: string;
  businessName: string;
}

// ---------------------------------------------------------------------------
// Theme colour for alert status
// ---------------------------------------------------------------------------

export const STATUS_COLOR: Record<AlertStatus, string> = {
  active: 'var(--rose)',
  acknowledged: 'var(--cat-measurement)',
  resolved: 'var(--green)',
};

export const STATUS_LABEL: Record<AlertStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

export const SOURCE_LABEL: Record<FatigueSource, string> = {
  webhook: 'Webhook',
  recommendation: 'Recommendation',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group alerts by their ad account. */
export function groupByAccount(
  alerts: FatigueAlert[],
): Record<string, FatigueAlert[]> {
  const groups: Record<string, FatigueAlert[]> = {};
  for (const alert of alerts) {
    const key = alert.accountId;
    const existing = groups[key] as FatigueAlert[] | undefined;
    if (existing) {
      existing.push(alert);
    } else {
      groups[key] = [alert];
    }
  }
  return groups;
}

/** Count alerts per status. */
export function countByStatus(
  alerts: FatigueAlert[],
): Record<AlertStatus, number> {
  const counts: Record<AlertStatus, number> = {
    active: 0,
    acknowledged: 0,
    resolved: 0,
  };
  for (const alert of alerts) {
    counts[alert.status]++;
  }
  return counts;
}

/** Count alerts by source. */
export function countBySource(
  alerts: FatigueAlert[],
): Record<FatigueSource, number> {
  const counts: Record<FatigueSource, number> = {webhook: 0, recommendation: 0};
  for (const alert of alerts) {
    counts[alert.source]++;
  }
  return counts;
}

/** Average time-to-action in hours for resolved alerts. */
export function avgTimeToAction(alerts: FatigueAlert[]): number | null {
  const resolved = alerts.filter(a => a.status === 'resolved' && a.resolvedAt);
  if (resolved.length === 0) return null;
  const totalMs = resolved.reduce((sum, a) => {
    const detected = new Date(a.detectedAt).getTime();
    const acted = new Date(a.resolvedAt ?? a.detectedAt).getTime();
    return sum + (acted - detected);
  }, 0);
  return totalMs / resolved.length / (1000 * 60 * 60);
}

/** Get unique account IDs across all alerts. */
export function uniqueAccounts(alerts: FatigueAlert[]): string[] {
  return [...new Set(alerts.map(a => a.accountId))];
}

/** Format a relative time string from an ISO date. */
export function relativeTime(isoDate: string): string {
  const now = new Date('2026-06-30T14:00:00Z').getTime();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Format hours to a readable string. */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// ---------------------------------------------------------------------------
// Sample ad accounts
// ---------------------------------------------------------------------------

export const AD_ACCOUNTS: AdAccount[] = [
  {id: '1001', name: 'Apex Digital - US', businessName: 'Apex Digital'},
  {id: '1002', name: 'Meridian Travel - EMEA', businessName: 'Meridian Travel'},
  {id: '1003', name: 'Cascade Sports - Global', businessName: 'Cascade Sports'},
  {id: '1004', name: 'Solara Beauty - NA', businessName: 'Solara Beauty'},
];

// ---------------------------------------------------------------------------
// Sample webhook status
// ---------------------------------------------------------------------------

export const WEBHOOK_STATUS: WebhookStatus = {
  endpointUrl: 'https://api.agency-platform.com/webhooks/creative-fatigue',
  state: 'connected',
  lastPing: '2026-06-30T13:48:00Z',
  subscribedAccountsCount: 4,
};

// ---------------------------------------------------------------------------
// Setup steps from the spec
// ---------------------------------------------------------------------------

export const SETUP_STEPS: Array<{
  step: number;
  title: string;
  description: string;
  apiCall: string;
}> = [
  {
    step: 1,
    title: 'Extract ad account IDs',
    description: 'Pull all owned and client ad accounts from each business.',
    apiCall: 'GET <BUSINESS_ID>/owned_ad_accounts',
  },
  {
    step: 2,
    title: 'Proactive scan (optional)',
    description:
      'Check for existing creative fatigue recommendations before webhook is live.',
    apiCall:
      'GET act_<AD_ACCOUNT_ID>/recommendations?recommendation_names=CREATIVE_FATIGUE',
  },
  {
    step: 3,
    title: 'Create HTTPS endpoint',
    description:
      'Build a server endpoint that handles GET verification handshake and POST event payloads.',
    apiCall: 'GET /webhooks/creative-fatigue?hub.verify_token=...',
  },
  {
    step: 4,
    title: 'Subscribe each ad account',
    description:
      'Register your app to receive notifications for each ad account.',
    apiCall: 'POST act_<AD_ACCOUNT_ID>/subscribed_apps?app_id=<APP_ID>',
  },
  {
    step: 5,
    title: 'Subscribe creative_fatigue field',
    description: 'Tell Meta to push creative fatigue events to your endpoint.',
    apiCall:
      'POST <APP_ID>/subscriptions?object=ad_account&fields=creative_fatigue',
  },
  {
    step: 6,
    title: 'Test via app dashboard',
    description:
      'Use the Meta App Dashboard to send a test notification and verify receipt.',
    apiCall: 'App Dashboard > Webhooks > Test',
  },
];

// ---------------------------------------------------------------------------
// Sample alerts — 10 alerts across 4 ad accounts, mixed statuses and sources
// ---------------------------------------------------------------------------

export const ALERTS: FatigueAlert[] = [
  // Apex Digital — 3 alerts
  {
    id: 'fa-001',
    adId: 'ad-23001',
    adName: 'Summer Sale - Video A',
    campaignName: 'Summer 2026 Promo',
    adsetName: 'Prospecting - Broad 25-44',
    accountId: '1001',
    accountName: 'Apex Digital - US',
    source: 'webhook',
    status: 'active',
    detectedAt: '2026-06-30T11:22:00Z',
  },
  {
    id: 'fa-002',
    adId: 'ad-23002',
    adName: 'Brand Awareness - Static B',
    campaignName: 'Brand Awareness Q2',
    adsetName: 'Retargeting - Website Visitors',
    accountId: '1001',
    accountName: 'Apex Digital - US',
    source: 'recommendation',
    status: 'active',
    detectedAt: '2026-06-30T08:15:00Z',
  },
  {
    id: 'fa-003',
    adId: 'ad-23003',
    adName: 'Clearance Banner - Carousel',
    campaignName: 'Summer 2026 Promo',
    adsetName: 'Lookalike - Purchasers 1%',
    accountId: '1001',
    accountName: 'Apex Digital - US',
    source: 'webhook',
    status: 'resolved',
    detectedAt: '2026-06-27T16:45:00Z',
    resolvedAt: '2026-06-27T19:10:00Z',
    duplicatedAdId: 'ad-23003-dup',
  },
  // Meridian Travel — 3 alerts
  {
    id: 'fa-004',
    adId: 'ad-45010',
    adName: 'Bali Getaway - Image A',
    campaignName: 'Summer Destinations',
    adsetName: 'Interest - Beach Travel',
    accountId: '1002',
    accountName: 'Meridian Travel - EMEA',
    source: 'webhook',
    status: 'acknowledged',
    detectedAt: '2026-06-29T20:30:00Z',
  },
  {
    id: 'fa-005',
    adId: 'ad-45011',
    adName: 'Europe Tour - Video C',
    campaignName: 'Summer Destinations',
    adsetName: 'Custom Audience - Newsletter',
    accountId: '1002',
    accountName: 'Meridian Travel - EMEA',
    source: 'recommendation',
    status: 'resolved',
    detectedAt: '2026-06-25T09:00:00Z',
    resolvedAt: '2026-06-25T14:30:00Z',
    duplicatedAdId: 'ad-45011-dup',
  },
  {
    id: 'fa-006',
    adId: 'ad-45012',
    adName: 'Last Minute Deals - Reel',
    campaignName: 'Flash Sales',
    adsetName: 'Broad - 18-65',
    accountId: '1002',
    accountName: 'Meridian Travel - EMEA',
    source: 'webhook',
    status: 'active',
    detectedAt: '2026-06-30T12:05:00Z',
  },
  // Cascade Sports — 2 alerts
  {
    id: 'fa-007',
    adId: 'ad-67100',
    adName: 'Running Shoes - Dynamic',
    campaignName: 'Catalog Sales - Footwear',
    adsetName: 'DPA - Add to Cart 14d',
    accountId: '1003',
    accountName: 'Cascade Sports - Global',
    source: 'recommendation',
    status: 'active',
    detectedAt: '2026-06-30T06:40:00Z',
  },
  {
    id: 'fa-008',
    adId: 'ad-67101',
    adName: 'Gym Gear - Collection Ad',
    campaignName: 'Catalog Sales - Apparel',
    adsetName: 'Retargeting - Viewers 7d',
    accountId: '1003',
    accountName: 'Cascade Sports - Global',
    source: 'webhook',
    status: 'resolved',
    detectedAt: '2026-06-22T11:00:00Z',
    resolvedAt: '2026-06-22T13:45:00Z',
    duplicatedAdId: 'ad-67101-dup',
  },
  // Solara Beauty — 2 alerts
  {
    id: 'fa-009',
    adId: 'ad-89200',
    adName: 'Serum Launch - UGC Video',
    campaignName: 'New Product Launch',
    adsetName: 'Lookalike - Top Spenders 2%',
    accountId: '1004',
    accountName: 'Solara Beauty - NA',
    source: 'webhook',
    status: 'active',
    detectedAt: '2026-06-30T09:55:00Z',
  },
  {
    id: 'fa-010',
    adId: 'ad-89201',
    adName: 'Moisturizer - Before/After',
    campaignName: 'Evergreen - Skincare',
    adsetName: 'Interest - Beauty & Cosmetics',
    accountId: '1004',
    accountName: 'Solara Beauty - NA',
    source: 'recommendation',
    status: 'acknowledged',
    detectedAt: '2026-06-29T15:20:00Z',
  },
];
