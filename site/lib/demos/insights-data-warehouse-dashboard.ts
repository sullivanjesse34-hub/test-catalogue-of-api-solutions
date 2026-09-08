/**
 * Representative sample data for the Insights Data Warehouse & Dashboard.
 *
 * UI prototype only — mock data shaped after the Meta Insights API named in
 * docs/solutions/miscellaneous/insights-data-warehouse-dashboard.md. No real
 * Marketing API calls are made. Field names mirror the documented API:
 *   - Async report run (create):  POST act_<ACCOUNT_ID>/insights?level=&fields=&breakdowns=&time_increment=&date_preset=
 *                                 → returns { report_run_id }
 *   - Poll report run status:     GET <REPORT_RUN_ID>?fields=async_status,async_percent_completion
 *                                 → async_status="Job Completed" AND async_percent_completion=100
 *   - Fetch results:             GET <REPORT_RUN_ID>/insights (cursor-paginated via paging.cursors)
 *   - Sync read (fallback):      GET act_<ACCOUNT_ID>/insights?fields=spend&breakdowns=platform
 *   - Throttle headers watched:  x-fb-ads-insights-throttle, x-ad-account-usage
 *
 * The warehouse ingestion model represents Build spec steps 1-2: scheduled
 * extraction of insights into a siloed data warehouse per ad account.
 */

export const INSIGHTS_DOC =
  'https://developers.facebook.com/docs/marketing-api/insights/';
export const ASYNC_DOC =
  'https://developers.facebook.com/docs/marketing-api/insights/best-practices#asynchronous';

/** Insights `level` parameter. */
export type InsightsLevel = 'account' | 'campaign' | 'adset' | 'ad';

/** Insights `date_preset` values used by the scheduled report runs. */
export type DatePreset =
  'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d';

/** A supported `breakdowns` dimension (only valid combinations exist here). */
export type BreakdownKey =
  | 'none'
  | 'publisher_platform'
  | 'platform_position'
  | 'device_platform'
  | 'age'
  | 'gender'
  | 'country';

export interface BreakdownOption {
  key: BreakdownKey;
  /** Human label for the picker. */
  label: string;
  /** Raw API breakdowns value ('' when key === 'none'). */
  apiValue: string;
}

export const BREAKDOWN_OPTIONS: BreakdownOption[] = [
  {key: 'none', label: 'No breakdown', apiValue: ''},
  {
    key: 'publisher_platform',
    label: 'Publisher platform',
    apiValue: 'publisher_platform',
  },
  {
    key: 'platform_position',
    label: 'Platform position',
    apiValue: 'platform_position',
  },
  {
    key: 'device_platform',
    label: 'Device platform',
    apiValue: 'device_platform',
  },
  {key: 'age', label: 'Age', apiValue: 'age'},
  {key: 'gender', label: 'Gender', apiValue: 'gender'},
  {key: 'country', label: 'Country', apiValue: 'country'},
];

export const DATE_PRESETS: Array<{
  key: DatePreset;
  label: string;
  days: number;
}> = [
  {key: 'today', label: 'Today', days: 1},
  {key: 'yesterday', label: 'Yesterday', days: 1},
  {key: 'last_7d', label: 'Last 7 days', days: 7},
  {key: 'last_14d', label: 'Last 14 days', days: 14},
  {key: 'last_30d', label: 'Last 30 days', days: 30},
  {key: 'last_90d', label: 'Last 90 days', days: 90},
];

/** One ad account (advertiser) whose insights are extracted into the warehouse. */
export interface AdAccount {
  /** Bare numeric id; prefix with `act_` in API paths. */
  id: string;
  name: string;
  businessName: string;
  currency: string;
}

export const ACCOUNTS: AdAccount[] = [
  {
    id: '1042938475610',
    name: 'Northwind Retail — Prospecting',
    businessName: 'Northwind Retail',
    currency: 'USD',
  },
  {
    id: '2298104756332',
    name: 'Lumen Skincare — DTC',
    businessName: 'Lumen Skincare',
    currency: 'USD',
  },
  {
    id: '3387021944870',
    name: 'Atlas Outdoors — Retargeting',
    businessName: 'Atlas Outdoors',
    currency: 'GBP',
  },
  {
    id: '4471880263159',
    name: 'Verdant Home — Always On',
    businessName: 'Verdant Home',
    currency: 'EUR',
  },
];

/** A daily insights row (time_increment=1). Money fields are in minor units (cents). */
export interface DailyRow {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** spend in minor units (cents). */
  spendMinor: number;
  impressions: number;
  clicks: number;
  /** actions[action_type=offsite_conversion.fb_pixel_purchase] value. */
  purchases: number;
  /** action_values sum for purchases, minor units. */
  purchaseValueMinor: number;
}

/** A breakdown segment total over the selected window (minor units for money). */
export interface BreakdownRow {
  /** Segment label, e.g. "facebook", "18-24", "GB". */
  segment: string;
  spendMinor: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValueMinor: number;
}

/** Warehouse ingestion status for an account's scheduled extraction. */
export type IngestionState = 'fresh' | 'running' | 'stale' | 'failed';

export interface WarehouseIngestion {
  accountId: string;
  state: IngestionState;
  /** ISO timestamp of the last completed extraction. */
  lastRunIso: string;
  /** rows written to the warehouse table on the last run. */
  rowsIngested: number;
  /** cron-style schedule label. */
  schedule: string;
  /** x-fb-ads-insights-throttle percentage observed on the last run (0-100). */
  throttlePct: number;
  /** error_message when state === 'failed' (spec: failed reports return error_code/message). */
  errorMessage?: string;
}

/** Full per-account insights dataset (as materialised in the warehouse). */
export interface AccountInsights {
  accountId: string;
  /** Daily time series over the last 90 days (per-day rows, time_increment=1). */
  daily: DailyRow[];
  /** Pre-aggregated breakdown segments, keyed by breakdown dimension. */
  breakdowns: Partial<Record<BreakdownKey, BreakdownRow[]>>;
  ingestion: WarehouseIngestion;
}

// ---------------------------------------------------------------------------
// Deterministic mock generation — a 90-day daily series per account plus a few
// breakdown dimensions. Deterministic so the UI is stable across renders.
// ---------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32) so mock data is stable. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(daysAgo: number): string {
  // Fixed reference date so the demo is deterministic.
  const ref = new Date('2026-07-02T00:00:00Z');
  const d = new Date(ref.getTime() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

function buildDaily(seed: number, baseSpendMinor: number): DailyRow[] {
  const r = rng(seed);
  const rows: DailyRow[] = [];
  for (let i = 89; i >= 0; i--) {
    // Weekend dip + gentle upward trend + noise.
    const dayIdx = 89 - i;
    const dow = (dayIdx + 3) % 7;
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const trend = 1 + dayIdx * 0.004;
    const noise = 0.82 + r() * 0.36;
    const spendMinor = Math.round(baseSpendMinor * weekend * trend * noise);
    const cpm = 620 + r() * 380; // minor units per 1000 impressions
    const impressions = Math.round((spendMinor / cpm) * 1000);
    const ctr = 0.009 + r() * 0.011;
    const clicks = Math.round(impressions * ctr);
    const cvr = 0.02 + r() * 0.03;
    const purchases = Math.round(clicks * cvr);
    const aov = 4200 + r() * 3600; // minor units per purchase
    const purchaseValueMinor = Math.round(purchases * aov);
    rows.push({
      date: isoDaysAgo(i),
      spendMinor,
      impressions,
      clicks,
      purchases,
      purchaseValueMinor,
    });
  }
  return rows;
}

function splitBreakdown(
  totals: {spend: number; impr: number; clk: number; pur: number; val: number},
  weights: Array<{segment: string; w: number; roasBias: number}>,
): BreakdownRow[] {
  const sum = weights.reduce((s, x) => s + x.w, 0);
  return weights.map(x => {
    const share = x.w / sum;
    return {
      segment: x.segment,
      spendMinor: Math.round(totals.spend * share),
      impressions: Math.round(totals.impr * share),
      clicks: Math.round(totals.clk * share),
      purchases: Math.round(totals.pur * share * x.roasBias),
      purchaseValueMinor: Math.round(totals.val * share * x.roasBias),
    };
  });
}

const INGESTION_BY_ACCOUNT: Record<
  string,
  Omit<WarehouseIngestion, 'accountId' | 'rowsIngested'>
> = {
  '1042938475610': {
    state: 'fresh',
    lastRunIso: '2026-07-02T06:15:00Z',
    schedule: 'Daily · 06:00 UTC',
    throttlePct: 41,
  },
  '2298104756332': {
    state: 'fresh',
    lastRunIso: '2026-07-02T06:22:00Z',
    schedule: 'Daily · 06:00 UTC',
    throttlePct: 33,
  },
  '3387021944870': {
    state: 'stale',
    lastRunIso: '2026-06-30T06:18:00Z',
    schedule: 'Daily · 06:00 UTC',
    throttlePct: 88,
  },
  '4471880263159': {
    state: 'failed',
    lastRunIso: '2026-07-02T06:31:00Z',
    schedule: 'Daily · 06:00 UTC',
    throttlePct: 97,
    errorMessage:
      'error_code=4 (subcode 1504022): User request limit reached — account near 100% throttle. Retry with a narrower time_range or back off.',
  },
};

function buildAccountInsights(
  account: AdAccount,
  seed: number,
  baseSpendMinor: number,
): AccountInsights {
  const daily = buildDaily(seed, baseSpendMinor);
  const totals = daily.reduce(
    (t, d) => ({
      spend: t.spend + d.spendMinor,
      impr: t.impr + d.impressions,
      clk: t.clk + d.clicks,
      pur: t.pur + d.purchases,
      val: t.val + d.purchaseValueMinor,
    }),
    {spend: 0, impr: 0, clk: 0, pur: 0, val: 0},
  );

  const breakdowns: AccountInsights['breakdowns'] = {
    publisher_platform: splitBreakdown(totals, [
      {segment: 'facebook', w: 46, roasBias: 1.0},
      {segment: 'instagram', w: 38, roasBias: 1.12},
      {segment: 'audience_network', w: 9, roasBias: 0.68},
      {segment: 'messenger', w: 7, roasBias: 0.82},
    ]),
    platform_position: splitBreakdown(totals, [
      {segment: 'feed', w: 40, roasBias: 1.05},
      {segment: 'story', w: 24, roasBias: 0.95},
      {segment: 'reels', w: 26, roasBias: 1.18},
      {segment: 'right_hand_column', w: 10, roasBias: 0.6},
    ]),
    device_platform: splitBreakdown(totals, [
      {segment: 'mobile_app', w: 58, roasBias: 1.08},
      {segment: 'mobile_web', w: 27, roasBias: 0.9},
      {segment: 'desktop', w: 15, roasBias: 0.98},
    ]),
    age: splitBreakdown(totals, [
      {segment: '18-24', w: 16, roasBias: 0.78},
      {segment: '25-34', w: 31, roasBias: 1.14},
      {segment: '35-44', w: 26, roasBias: 1.1},
      {segment: '45-54', w: 16, roasBias: 0.96},
      {segment: '55-64', w: 11, roasBias: 0.85},
    ]),
    gender: splitBreakdown(totals, [
      {segment: 'female', w: 54, roasBias: 1.06},
      {segment: 'male', w: 43, roasBias: 0.94},
      {segment: 'unknown', w: 3, roasBias: 0.7},
    ]),
    country: splitBreakdown(totals, [
      {segment: 'US', w: 52, roasBias: 1.05},
      {segment: 'GB', w: 18, roasBias: 1.0},
      {segment: 'CA', w: 12, roasBias: 0.96},
      {segment: 'AU', w: 10, roasBias: 0.92},
      {segment: 'DE', w: 8, roasBias: 0.88},
    ]),
  };

  const meta = INGESTION_BY_ACCOUNT[account.id];
  const ingestion: WarehouseIngestion = {
    accountId: account.id,
    rowsIngested: daily.length,
    ...meta,
  };

  return {accountId: account.id, daily, breakdowns, ingestion};
}

export const INSIGHTS: Record<string, AccountInsights> = {
  '1042938475610': buildAccountInsights(ACCOUNTS[0], 101, 148000),
  '2298104756332': buildAccountInsights(ACCOUNTS[1], 202, 96000),
  '3387021944870': buildAccountInsights(ACCOUNTS[2], 303, 61000),
  '4471880263159': buildAccountInsights(ACCOUNTS[3], 404, 83000),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function accountById(id: string): AdAccount {
  return ACCOUNTS.find(a => a.id === id) ?? ACCOUNTS[0];
}

export function insightsFor(id: string): AccountInsights {
  return INSIGHTS[id] ?? INSIGHTS[ACCOUNTS[0].id];
}

/** Sum a metric over the last N days of a daily series. */
export function windowRows(daily: DailyRow[], days: number): DailyRow[] {
  return daily.slice(Math.max(0, daily.length - days));
}

export interface WindowTotals {
  spendMinor: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValueMinor: number;
}

export function sumRows(rows: DailyRow[]): WindowTotals {
  return rows.reduce<WindowTotals>(
    (t, d) => ({
      spendMinor: t.spendMinor + d.spendMinor,
      impressions: t.impressions + d.impressions,
      clicks: t.clicks + d.clicks,
      purchases: t.purchases + d.purchases,
      purchaseValueMinor: t.purchaseValueMinor + d.purchaseValueMinor,
    }),
    {
      spendMinor: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      purchaseValueMinor: 0,
    },
  );
}

/** ROAS = purchase value / spend (both minor units, so ratio is unit-free). */
export function roas(t: WindowTotals): number {
  return t.spendMinor === 0 ? 0 : t.purchaseValueMinor / t.spendMinor;
}

/** CTR as a percentage. */
export function ctr(t: WindowTotals): number {
  return t.impressions === 0 ? 0 : (t.clicks / t.impressions) * 100;
}

/** Cost per acquisition in minor units. */
export function cpaMinor(t: WindowTotals): number {
  return t.purchases === 0 ? 0 : t.spendMinor / t.purchases;
}

/** Format minor units as a currency string (÷100, respects account currency). */
export function money(minor: number, currency: string): string {
  const value = minor / 100;
  const abs = Math.abs(value);
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}k`;
  return `${symbol}${value.toFixed(0)}`;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

/** Compact integer formatting (1.2M, 340k). */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export const INGESTION_META: Record<
  IngestionState,
  {label: string; colorVar: string}
> = {
  fresh: {label: 'Fresh', colorVar: 'var(--green)'},
  running: {label: 'Running', colorVar: 'var(--cat-signals)'},
  stale: {label: 'Stale', colorVar: 'var(--cat-measurement)'},
  failed: {label: 'Failed', colorVar: 'var(--rose)'},
};

// ---------------------------------------------------------------------------
// Async report run model (spec step 3): POST to create → poll status → GET
// results. The simulation below drives the "Run report" flow in the UI.
// ---------------------------------------------------------------------------

export type AsyncStatus =
  | 'Job Not Started'
  | 'Job Started'
  | 'Job Running'
  | 'Job Completed'
  | 'Job Failed';

export interface ReportRunConfig {
  accountId: string;
  level: InsightsLevel;
  datePreset: DatePreset;
  breakdown: BreakdownKey;
}

export interface ReportRun extends ReportRunConfig {
  /** report_run_id returned by the async POST. */
  reportRunId: string;
  status: AsyncStatus;
  /** async_percent_completion (0-100). */
  percent: number;
  rows: number;
}

/** Generate a plausible report_run_id (mock). */
export function newReportRunId(): string {
  const n = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
  return String(n);
}

/** Build the request body for the async POST, grounded in the spec params. */
export function reportRunRequest(cfg: ReportRunConfig): Record<string, string> {
  const bd = BREAKDOWN_OPTIONS.find(o => o.key === cfg.breakdown);
  const req: Record<string, string> = {
    level: cfg.level,
    fields: 'spend,impressions,clicks,actions,action_values',
    date_preset: cfg.datePreset,
    time_increment: '1',
    use_unified_attribution_setting: 'true',
  };
  if (bd?.apiValue) req.breakdowns = bd.apiValue;
  return req;
}
