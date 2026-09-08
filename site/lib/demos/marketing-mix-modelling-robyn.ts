/**
 * Representative sample data for the Marketing Mix Modelling (Robyn) demo.
 *
 * UI prototype only — mock data shaped like the pieces a real MMM build stitches
 * together: the Business Management API account list, the Insights API `mmm`
 * breakdown async CSV export (spend + impressions per channel), and the outputs
 * a Robyn model produces (channel decomposition, response/saturation curves,
 * budget-allocation scenarios). No real Marketing API calls are ever issued.
 *
 * Money is held in minor units (cents) per the API convention; divide by 100
 * for display. See docs/solutions/measurement/marketing-mix-modelling-robyn.md
 * and the public MMM Insights API docs for the grounded field names.
 */

// ---------------------------------------------------------------------------
// Channels — the media groupings a Robyn model decomposes revenue across.
// Each maps to a Meta publisher_platform / platform_position slice the `mmm`
// breakdown returns, plus off-Meta channels an agency folds in cross-channel.
// ---------------------------------------------------------------------------

export type ChannelId =
  | 'meta_feed'
  | 'meta_reels'
  | 'meta_stories'
  | 'audience_network'
  | 'search'
  | 'youtube'
  | 'tv'
  | 'baseline';

export interface Channel {
  id: ChannelId;
  label: string;
  /** Whether this channel is sourced from the Meta Insights `mmm` breakdown. */
  isMeta: boolean;
  colorVar: string;
}

export const CHANNELS: Channel[] = [
  {id: 'meta_feed', label: 'Meta Feed', isMeta: true, colorVar: 'var(--brand)'},
  {
    id: 'meta_reels',
    label: 'Meta Reels',
    isMeta: true,
    colorVar: 'var(--brand-2)',
  },
  {
    id: 'meta_stories',
    label: 'Meta Stories',
    isMeta: true,
    colorVar: 'var(--purple)',
  },
  {
    id: 'audience_network',
    label: 'Audience Network',
    isMeta: true,
    colorVar: 'var(--rose)',
  },
  {id: 'search', label: 'Search', isMeta: false, colorVar: 'var(--green)'},
  {id: 'youtube', label: 'YouTube', isMeta: false, colorVar: 'var(--yellow)'},
  {id: 'tv', label: 'Linear TV', isMeta: false, colorVar: 'var(--ink-3)'},
];

/** Baseline is modelled separately (organic + non-media demand), never a media channel. */
export const BASELINE: Channel = {
  id: 'baseline',
  label: 'Baseline',
  isMeta: false,
  colorVar: 'var(--ink-3)',
};

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  meta_feed: 'Meta Feed',
  meta_reels: 'Meta Reels',
  meta_stories: 'Meta Stories',
  audience_network: 'Audience Network',
  search: 'Search',
  youtube: 'YouTube',
  tv: 'Linear TV',
  baseline: 'Baseline',
};

// ---------------------------------------------------------------------------
// Model result — one Robyn model run against an ad-account's exported data.
// Per-channel we hold the modelled spend, revenue contribution, an ROI, and a
// Hill saturation curve (alpha/gamma-shaped) so the demo can draw response
// curves and re-allocate budget deterministically.
// ---------------------------------------------------------------------------

export interface ChannelResult {
  id: ChannelId;
  /** Modelled media spend over the window, minor units (cents). */
  spendCents: number;
  /** Attributed revenue contribution, minor units (cents). */
  contributionCents: number;
  /** impressions delivered (from the mmm breakdown). */
  impressions: number;
  /** Saturation shape: response = maxResponseCents * s^n / (s^n + halfSat^n). */
  saturation: {
    /** Hill exponent (steepness of diminishing returns). */
    hill: number;
    /** Spend at which the channel reaches half its max response (cents). */
    halfSatCents: number;
    /** Asymptotic max revenue the channel can drive (cents). */
    maxResponseCents: number;
  };
}

export interface ModelRun {
  accountId: string;
  accountName: string;
  currency: string;
  /** Window the exported Insights data covers. */
  windowStart: string;
  windowEnd: string;
  /** Robyn model fit quality (adjusted R², 0–1). */
  rsq: number;
  /** Normalised root mean square error (0–1, lower is better). */
  nrmse: number;
  /** Modelled baseline (non-media) revenue, minor units (cents). */
  baselineContributionCents: number;
  channels: ChannelResult[];
}

// ---------------------------------------------------------------------------
// Sample data — three portfolio accounts, each a modelled run. Numbers are
// internally consistent (contribution roughly tracks spend × diminishing ROI).
// ---------------------------------------------------------------------------

function ch(
  id: ChannelId,
  spendCents: number,
  contributionCents: number,
  impressions: number,
  hill: number,
  halfSatCents: number,
  maxResponseCents: number,
): ChannelResult {
  return {
    id,
    spendCents,
    contributionCents,
    impressions,
    saturation: {hill, halfSatCents, maxResponseCents},
  };
}

export const MODEL_RUNS: ModelRun[] = [
  {
    accountId: '4021547788',
    accountName: 'Northwind Retail',
    currency: 'USD',
    windowStart: '2026-01-05',
    windowEnd: '2026-06-28',
    rsq: 0.87,
    nrmse: 0.11,
    baselineContributionCents: 61200000,
    channels: [
      ch('meta_feed', 18400000, 71600000, 412000000, 1.6, 15200000, 96000000),
      ch('meta_reels', 9600000, 41300000, 268000000, 1.5, 8800000, 58000000),
      ch('meta_stories', 4100000, 12800000, 121000000, 1.4, 4600000, 21000000),
      ch(
        'audience_network',
        2600000,
        6100000,
        88000000,
        1.3,
        3200000,
        11000000,
      ),
      ch('search', 12200000, 44800000, 54000000, 1.7, 11000000, 62000000),
      ch('youtube', 7300000, 18900000, 196000000, 1.4, 7400000, 33000000),
      ch('tv', 15000000, 22400000, 0, 1.2, 18000000, 41000000),
    ],
  },
  {
    accountId: '7798452310',
    accountName: 'Lumen Skincare',
    currency: 'USD',
    windowStart: '2026-01-05',
    windowEnd: '2026-06-28',
    rsq: 0.91,
    nrmse: 0.08,
    baselineContributionCents: 48600000,
    channels: [
      ch('meta_feed', 22600000, 92400000, 486000000, 1.7, 17400000, 118000000),
      ch('meta_reels', 16800000, 78200000, 402000000, 1.6, 12800000, 94000000),
      ch('meta_stories', 6300000, 21600000, 168000000, 1.4, 5800000, 31000000),
      ch(
        'audience_network',
        3100000,
        7400000,
        102000000,
        1.3,
        3600000,
        12500000,
      ),
      ch('search', 9800000, 33200000, 41000000, 1.6, 9200000, 47000000),
      ch('youtube', 5200000, 14600000, 142000000, 1.4, 5600000, 26000000),
    ],
  },
  {
    accountId: '1130984472',
    accountName: 'Atlas Outdoors',
    currency: 'GBP',
    windowStart: '2026-01-05',
    windowEnd: '2026-06-28',
    rsq: 0.79,
    nrmse: 0.16,
    baselineContributionCents: 39400000,
    channels: [
      ch('meta_feed', 11200000, 38600000, 264000000, 1.5, 10600000, 54000000),
      ch('meta_reels', 6400000, 26800000, 178000000, 1.5, 6200000, 38000000),
      ch('meta_stories', 2900000, 8100000, 96000000, 1.3, 3400000, 13500000),
      ch('audience_network', 1800000, 3600000, 62000000, 1.2, 2400000, 6400000),
      ch('search', 8600000, 27400000, 33000000, 1.6, 8000000, 39000000),
      ch('youtube', 4100000, 9800000, 108000000, 1.3, 4800000, 18000000),
      ch('tv', 9500000, 12100000, 0, 1.1, 12000000, 24000000),
    ],
  },
];

// ---------------------------------------------------------------------------
// Currency helpers (mirror the opportunity-score demo's cents convention).
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? '';
}

/** Compact money formatting from minor units (cents), e.g. $1.2M / £184k. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = currencySymbol(currency);
  if (major >= 1_000_000) return `${sym}${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(0)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

export function formatImpressions(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Channel contributions — decomposition of modelled revenue across channels
// plus the baseline. Percentages are of total (media + baseline) revenue.
// ---------------------------------------------------------------------------

export interface ContributionRow {
  id: ChannelId;
  label: string;
  colorVar: string;
  contributionCents: number;
  spendCents: number;
  /** Modelled return on ad spend (contribution / spend). Baseline has none. */
  roi: number | null;
  /** Share of total modelled revenue (media + baseline), 0–1. */
  share: number;
}

function channelMeta(id: ChannelId): Channel {
  return CHANNELS.find(c => c.id === id) ?? BASELINE;
}

/** Total modelled revenue = every channel's contribution + baseline. */
export function totalRevenueCents(run: ModelRun): number {
  return (
    run.baselineContributionCents +
    run.channels.reduce((s, c) => s + c.contributionCents, 0)
  );
}

export function totalMediaSpendCents(run: ModelRun): number {
  return run.channels.reduce((s, c) => s + c.spendCents, 0);
}

/** Blended modelled ROAS across all media (excludes baseline revenue). */
export function blendedRoi(run: ModelRun): number {
  const spend = totalMediaSpendCents(run);
  const contribution = run.channels.reduce(
    (s, c) => s + c.contributionCents,
    0,
  );
  return spend > 0 ? contribution / spend : 0;
}

/** Decomposition rows (media channels + baseline), sorted by contribution. */
export function contributionRows(run: ModelRun): ContributionRow[] {
  const total = totalRevenueCents(run);
  const media: ContributionRow[] = run.channels.map(c => {
    const meta = channelMeta(c.id);
    return {
      id: c.id,
      label: meta.label,
      colorVar: meta.colorVar,
      contributionCents: c.contributionCents,
      spendCents: c.spendCents,
      roi: c.spendCents > 0 ? c.contributionCents / c.spendCents : null,
      share: total > 0 ? c.contributionCents / total : 0,
    };
  });
  const baselineRow: ContributionRow = {
    id: 'baseline',
    label: BASELINE.label,
    colorVar: BASELINE.colorVar,
    contributionCents: run.baselineContributionCents,
    spendCents: 0,
    roi: null,
    share: total > 0 ? run.baselineContributionCents / total : 0,
  };
  return [...media, baselineRow].sort(
    (a, b) => b.contributionCents - a.contributionCents,
  );
}

// ---------------------------------------------------------------------------
// Response / saturation curves — the Hill (S-shaped) response function Robyn
// fits per channel. Sampled across a spend range for inline-SVG plotting.
// ---------------------------------------------------------------------------

/** Modelled revenue response at a given spend, via the channel's Hill curve. */
export function responseAtSpend(c: ChannelResult, spendCents: number): number {
  const {hill, halfSatCents, maxResponseCents} = c.saturation;
  const s = Math.max(0, spendCents);
  const sn = Math.pow(s, hill);
  const hn = Math.pow(halfSatCents, hill);
  return (maxResponseCents * sn) / (sn + hn);
}

/** Marginal ROI (dResponse/dSpend) at the channel's current spend. */
export function marginalRoi(c: ChannelResult): number {
  const eps = Math.max(1, c.spendCents * 0.01);
  const up = responseAtSpend(c, c.spendCents + eps);
  const down = responseAtSpend(c, Math.max(0, c.spendCents - eps));
  return (up - down) / (2 * eps);
}

export interface CurvePoint {
  spendCents: number;
  responseCents: number;
}

/**
 * Sample a channel's response curve from 0 to `maxSpendMultiple`× its current
 * spend, so a demo can plot the saturation shape with the "you are here" dot.
 */
export function responseCurve(
  c: ChannelResult,
  samples = 40,
  maxSpendMultiple = 2.5,
): CurvePoint[] {
  const maxSpend = Math.max(c.spendCents * maxSpendMultiple, c.spendCents + 1);
  return Array.from({length: samples + 1}, (_, i) => {
    const spendCents = (maxSpend * i) / samples;
    return {spendCents, responseCents: responseAtSpend(c, spendCents)};
  });
}

// ---------------------------------------------------------------------------
// Budget-allocation scenarios — reallocate a fixed total budget across media
// channels and read the modelled revenue back off each channel's Hill curve.
// The "optimised" mix is a marginal-ROI greedy allocator (equalise marginal
// returns), which is the shape of what Robyn's budget allocator produces.
// ---------------------------------------------------------------------------

export interface Allocation {
  id: ChannelId;
  label: string;
  colorVar: string;
  spendCents: number;
  responseCents: number;
}

export interface Scenario {
  label: string;
  totalSpendCents: number;
  totalResponseCents: number;
  allocations: Allocation[];
}

function allocationsFor(
  run: ModelRun,
  spendById: Map<ChannelId, number>,
): Allocation[] {
  return run.channels.map(c => {
    const meta = channelMeta(c.id);
    const spendCents = spendById.get(c.id) ?? 0;
    return {
      id: c.id,
      label: meta.label,
      colorVar: meta.colorVar,
      spendCents,
      responseCents: responseAtSpend(c, spendCents),
    };
  });
}

function scenarioFrom(
  label: string,
  run: ModelRun,
  spendById: Map<ChannelId, number>,
): Scenario {
  const allocations = allocationsFor(run, spendById);
  return {
    label,
    totalSpendCents: allocations.reduce((s, a) => s + a.spendCents, 0),
    totalResponseCents: allocations.reduce((s, a) => s + a.responseCents, 0),
    allocations,
  };
}

/** Current mix: each channel at its modelled spend. */
export function currentScenario(run: ModelRun): Scenario {
  const spendById = new Map<ChannelId, number>(
    run.channels.map(c => [c.id, c.spendCents]),
  );
  return scenarioFrom('Current mix', run, spendById);
}

/**
 * Optimised mix at the same total budget: greedily assign budget in small steps
 * to whichever channel currently has the highest marginal ROI. This equalises
 * marginal returns — the outcome Robyn's allocator converges on.
 */
export function optimisedScenario(run: ModelRun): Scenario {
  const total = totalMediaSpendCents(run);
  const steps = 200;
  const step = total / steps;
  const spendById = new Map<ChannelId, number>(
    run.channels.map(c => [c.id, 0]),
  );

  const marginalAt = (c: ChannelResult, spend: number): number => {
    const eps = Math.max(1, step * 0.5);
    return (responseAtSpend(c, spend + eps) - responseAtSpend(c, spend)) / eps;
  };

  for (let i = 0; i < steps; i++) {
    let bestId: ChannelId | null = null;
    let bestMarginal = -Infinity;
    for (const c of run.channels) {
      const spend = spendById.get(c.id) ?? 0;
      const m = marginalAt(c, spend);
      if (m > bestMarginal) {
        bestMarginal = m;
        bestId = c.id;
      }
    }
    if (bestId == null) break;
    spendById.set(bestId, (spendById.get(bestId) ?? 0) + step);
  }

  return scenarioFrom('Optimised mix', run, spendById);
}

/** Modelled revenue upside from moving current → optimised, minor units (cents). */
export function scenarioUpliftCents(run: ModelRun): number {
  return (
    optimisedScenario(run).totalResponseCents -
    currentScenario(run).totalResponseCents
  );
}

// ---------------------------------------------------------------------------
// Insights `mmm` breakdown sample rows — a small slice of the async CSV export
// the Insights API returns (level=adset, breakdowns=mmm). Column names/casing
// mirror the public MMM Insights API docs.
// ---------------------------------------------------------------------------

export interface MmmCsvRow {
  account_id: string;
  campaign_id: string;
  adset_id: string;
  date_start: string;
  date_stop: string;
  impressions: number;
  /** Estimated spend, minor units are NOT used in the CSV — this is major units. */
  spend: number;
  country: string;
  publisher_platform: string;
  platform_position: string;
  creative_media_type: string;
}

export const MMM_CSV_SAMPLE: MmmCsvRow[] = [
  {
    account_id: '4021547788',
    campaign_id: '238450',
    adset_id: '990112',
    date_start: '2026-06-01',
    date_stop: '2026-06-01',
    impressions: 1420000,
    spend: 6240.55,
    country: 'US',
    publisher_platform: 'facebook',
    platform_position: 'feed',
    creative_media_type: 'video',
  },
  {
    account_id: '4021547788',
    campaign_id: '238451',
    adset_id: '990118',
    date_start: '2026-06-01',
    date_stop: '2026-06-01',
    impressions: 980000,
    spend: 3110.2,
    country: 'US',
    publisher_platform: 'instagram',
    platform_position: 'reels',
    creative_media_type: 'video',
  },
  {
    account_id: '4021547788',
    campaign_id: '238452',
    adset_id: '990124',
    date_start: '2026-06-01',
    date_stop: '2026-06-01',
    impressions: 610000,
    spend: 1480.9,
    country: 'CA',
    publisher_platform: 'instagram',
    platform_position: 'story',
    creative_media_type: 'image',
  },
  {
    account_id: '4021547788',
    campaign_id: '238453',
    adset_id: '990130',
    date_start: '2026-06-01',
    date_stop: '2026-06-01',
    impressions: 340000,
    spend: 720.15,
    country: 'US',
    publisher_platform: 'audience_network',
    platform_position: 'classic',
    creative_media_type: 'image',
  },
];

/** The CSV column order the export delivers (public MMM Insights API docs). */
export const MMM_CSV_COLUMNS: Array<keyof MmmCsvRow> = [
  'account_id',
  'campaign_id',
  'adset_id',
  'date_start',
  'date_stop',
  'impressions',
  'spend',
  'country',
  'publisher_platform',
  'platform_position',
  'creative_media_type',
];

// ---------------------------------------------------------------------------
// Model quality flags — small derived diagnostics for the model-fit view.
// ---------------------------------------------------------------------------

export type FitBand = 'strong' | 'fair' | 'weak';

export function fitBand(rsq: number): FitBand {
  if (rsq >= 0.85) return 'strong';
  if (rsq >= 0.75) return 'fair';
  return 'weak';
}

export const FIT_BAND_META: Record<FitBand, {label: string; colorVar: string}> =
  {
    strong: {label: 'Strong fit', colorVar: 'var(--green)'},
    fair: {label: 'Fair fit', colorVar: 'var(--yellow)'},
    weak: {label: 'Weak fit', colorVar: 'var(--rose)'},
  };

/**
 * Whether a channel is over-invested (marginal ROI below the blended average)
 * or under-invested (above) — the signal that drives reallocation advice.
 */
export type InvestSignal = 'scale' | 'hold' | 'trim';

export function investSignal(run: ModelRun, c: ChannelResult): InvestSignal {
  const blended = blendedRoi(run);
  const marginal = marginalRoi(c);
  if (marginal >= blended * 1.15) return 'scale';
  if (marginal <= blended * 0.85) return 'trim';
  return 'hold';
}

export const INVEST_SIGNAL_META: Record<
  InvestSignal,
  {label: string; colorVar: string}
> = {
  scale: {label: 'Scale', colorVar: 'var(--green)'},
  hold: {label: 'Hold', colorVar: 'var(--ink-3)'},
  trim: {label: 'Trim', colorVar: 'var(--rose)'},
};
