/**
 * Representative sample data for the Targeting & Reach Estimate demo.
 *
 * UI prototype only — mock data shaped like the Marketing API audience tools:
 * Targeting Search (`/search`), Detailed Targeting (`act_<id>/targetingsearch`)
 * and Reach / Delivery Estimate (`act_<id>/reachestimate`,
 * `act_<id>/delivery_estimate`). No real Marketing API calls are ever issued.
 *
 * Field names/casing follow the public docs and the solution spec:
 *   reachestimate    → users, estimate_ready, targeting_status
 *   delivery_estimate → estimate_dau, estimate_mau, daily_outcomes_curve
 *   targeting search  → key/id, name, audience_size_lower_bound/upper_bound, path
 * See docs/solutions/miscellaneous/targeting-reach-estimate.md.
 */

// ---------------------------------------------------------------------------
// Targeting search results — the audience building blocks a user picks from.
// Each maps to a targeting-spec entry (geo key, or an interest/behaviour id).
// ---------------------------------------------------------------------------

/** Targeting types this demo can search for (a subset of the API `type` enum). */
export type TargetingType = 'geo' | 'interest' | 'behavior' | 'demographic';

/**
 * A single searchable targeting option. Geo results carry a stable `key`;
 * interest/behaviour/demographic results carry a numeric `id`. We persist the
 * stable identifier (never the `name`, which can change) in the spec.
 */
export interface TargetingOption {
  /** Local, stable identifier used as a React key + spec reference. */
  ref: string;
  type: TargetingType;
  /** Geo `key` (e.g. "US") — present for geo results only. */
  key?: string;
  /** Numeric `id` — present for interest/behaviour/demographic results. */
  id?: string;
  name: string;
  /** Breadcrumb `path` the API returns (e.g. ["Interests", "Fitness"]). */
  path: string[];
  /** audience_size_lower_bound. */
  audienceSizeLowerBound: number;
  /** audience_size_upper_bound. */
  audienceSizeUpperBound: number;
  /** For geo results: the location_type (country / region / city). */
  geoType?: 'country' | 'region' | 'city';
}

export const TARGETING_TYPE_LABEL: Record<TargetingType, string> = {
  geo: 'Location',
  interest: 'Interest',
  behavior: 'Behaviour',
  demographic: 'Demographic',
};

/** Our TargetingType → the API `type` token used on the search endpoint. */
export const TARGETING_TYPE_TOKEN: Record<TargetingType, string> = {
  geo: 'adgeolocation',
  interest: 'adinterest',
  behavior: 'adTargetingCategory',
  demographic: 'adTargetingCategory',
};

/** Searchable catalogue of targeting options (the mock "search index"). */
export const TARGETING_OPTIONS: TargetingOption[] = [
  {
    ref: 'geo-us',
    type: 'geo',
    key: 'US',
    name: 'United States',
    path: ['Countries'],
    audienceSizeLowerBound: 246_000_000,
    audienceSizeUpperBound: 290_000_000,
    geoType: 'country',
  },
  {
    ref: 'geo-gb',
    type: 'geo',
    key: 'GB',
    name: 'United Kingdom',
    path: ['Countries'],
    audienceSizeLowerBound: 52_000_000,
    audienceSizeUpperBound: 58_000_000,
    geoType: 'country',
  },
  {
    ref: 'geo-ca',
    type: 'geo',
    key: 'CA',
    name: 'Canada',
    path: ['Countries'],
    audienceSizeLowerBound: 31_000_000,
    audienceSizeUpperBound: 35_000_000,
    geoType: 'country',
  },
  {
    ref: 'geo-de',
    type: 'geo',
    key: 'DE',
    name: 'Germany',
    path: ['Countries'],
    audienceSizeLowerBound: 62_000_000,
    audienceSizeUpperBound: 68_000_000,
    geoType: 'country',
  },
  {
    ref: 'geo-nyc',
    type: 'geo',
    key: '2490299',
    name: 'New York, New York',
    path: ['United States', 'New York'],
    audienceSizeLowerBound: 12_000_000,
    audienceSizeUpperBound: 14_500_000,
    geoType: 'city',
  },
  {
    ref: 'geo-ca-region',
    type: 'geo',
    key: '3847',
    name: 'California',
    path: ['United States'],
    audienceSizeLowerBound: 27_000_000,
    audienceSizeUpperBound: 31_000_000,
    geoType: 'region',
  },
  {
    ref: 'int-fitness',
    type: 'interest',
    id: '6003107902433',
    name: 'Physical fitness',
    path: ['Interests', 'Fitness and wellness'],
    audienceSizeLowerBound: 780_000_000,
    audienceSizeUpperBound: 920_000_000,
  },
  {
    ref: 'int-running',
    type: 'interest',
    id: '6003491722817',
    name: 'Running',
    path: ['Interests', 'Sports and outdoors'],
    audienceSizeLowerBound: 210_000_000,
    audienceSizeUpperBound: 250_000_000,
  },
  {
    ref: 'int-yoga',
    type: 'interest',
    id: '6003244667493',
    name: 'Yoga',
    path: ['Interests', 'Fitness and wellness'],
    audienceSizeLowerBound: 160_000_000,
    audienceSizeUpperBound: 190_000_000,
  },
  {
    ref: 'int-skincare',
    type: 'interest',
    id: '6002971085960',
    name: 'Skin care',
    path: ['Interests', 'Beauty'],
    audienceSizeLowerBound: 320_000_000,
    audienceSizeUpperBound: 380_000_000,
  },
  {
    ref: 'int-outdoors',
    type: 'interest',
    id: '6003397425735',
    name: 'Camping',
    path: ['Interests', 'Sports and outdoors'],
    audienceSizeLowerBound: 140_000_000,
    audienceSizeUpperBound: 170_000_000,
  },
  {
    ref: 'beh-engaged-shoppers',
    type: 'behavior',
    id: '6002714895372',
    name: 'Engaged shoppers',
    path: ['Behaviours', 'Purchase behaviour'],
    audienceSizeLowerBound: 620_000_000,
    audienceSizeUpperBound: 720_000_000,
  },
  {
    ref: 'beh-mobile-3m',
    type: 'behavior',
    id: '6004382299972',
    name: 'New smartphone owners (last 3 months)',
    path: ['Behaviours', 'Mobile device user'],
    audienceSizeLowerBound: 44_000_000,
    audienceSizeUpperBound: 52_000_000,
  },
  {
    ref: 'demo-parents',
    type: 'demographic',
    id: '6023005917767',
    name: 'Parents (all)',
    path: ['Demographics', 'Parents'],
    audienceSizeLowerBound: 240_000_000,
    audienceSizeUpperBound: 290_000_000,
  },
  {
    ref: 'demo-newlywed',
    type: 'demographic',
    id: '6009292279438',
    name: 'Newlywed (1 year)',
    path: ['Demographics', 'Life events'],
    audienceSizeLowerBound: 18_000_000,
    audienceSizeUpperBound: 22_000_000,
  },
];

// ---------------------------------------------------------------------------
// Targeting spec — the audience the user assembles from selected options.
// ---------------------------------------------------------------------------

export type Sex = 'all' | 'male' | 'female';

export interface TargetingSpec {
  /** geo_locations selections (option refs of type 'geo'). */
  geoRefs: string[];
  /** flexible_spec interest/behaviour/demographic selections (option refs). */
  detailedRefs: string[];
  ageMin: number;
  ageMax: number;
  sex: Sex;
  /** publisher_platforms — where ads can deliver. */
  platforms: Platform[];
}

export type Platform =
  'facebook' | 'instagram' | 'audience_network' | 'messenger';

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
};

export const ALL_PLATFORMS: Platform[] = [
  'facebook',
  'instagram',
  'audience_network',
  'messenger',
];

/** The optimisation goal passed as `optimize_for` on the estimate call. */
export type OptimizeFor =
  'REACH' | 'IMPRESSIONS' | 'LINK_CLICKS' | 'OFFSITE_CONVERSIONS';

export const OPTIMIZE_FOR_LABEL: Record<OptimizeFor, string> = {
  REACH: 'Reach',
  IMPRESSIONS: 'Impressions',
  LINK_CLICKS: 'Link clicks',
  OFFSITE_CONVERSIONS: 'Conversions',
};

export const OPTIMIZE_FOR_OPTIONS: OptimizeFor[] = [
  'REACH',
  'IMPRESSIONS',
  'LINK_CLICKS',
  'OFFSITE_CONVERSIONS',
];

export const DEFAULT_SPEC: TargetingSpec = {
  geoRefs: ['geo-us'],
  detailedRefs: ['int-fitness', 'int-running'],
  ageMin: 18,
  ageMax: 45,
  sex: 'all',
  platforms: ['facebook', 'instagram'],
};

export const AGE_FLOOR = 13;
export const AGE_CEIL = 65;

/** Mock ad account the estimate calls are scoped to. */
export const AD_ACCOUNT = {
  id: '4021547788',
  name: 'Northwind Retail',
  currency: 'USD',
};

// ---------------------------------------------------------------------------
// Reach / delivery estimate — derived deterministically from the spec so the
// numbers move sensibly as the user narrows or broadens the audience.
// ---------------------------------------------------------------------------

/** The reachestimate response shape (users + readiness sentinels). */
export interface ReachEstimate {
  /** users — the estimated monthly-active reach for the spec. */
  users: number;
  /** estimate_ready — false while the estimate is still populating. */
  estimateReady: boolean;
  /**
   * targeting_status — a new lookalike returns -1 until populated; otherwise
   * a status string. Kept as the API returns it so the UI can explain -1.
   */
  targetingStatus: string;
}

/** One point on the delivery `daily_outcomes_curve` (spend → reach/actions). */
export interface OutcomePoint {
  /** spend for the day, in the account's minor units (cents). */
  spendCents: number;
  /** estimated daily reach at this spend. */
  reach: number;
  /** estimated daily actions (impressions / clicks / conversions) at this spend. */
  actions: number;
}

/** The delivery_estimate response shape (DAU/MAU + the outcomes curve). */
export interface DeliveryEstimate {
  /** estimate_dau — estimated daily-active audience for the spec. */
  estimateDau: number;
  /** estimate_mau — estimated monthly-active audience for the spec. */
  estimateMau: number;
  estimateReady: boolean;
  /** daily_outcomes_curve — reach/actions across a spend sweep. */
  dailyOutcomesCurve: OutcomePoint[];
}

function optionByRef(ref: string): TargetingOption | undefined {
  return TARGETING_OPTIONS.find(o => o.ref === ref);
}

/** Selected geo options for a spec. */
export function specGeos(spec: TargetingSpec): TargetingOption[] {
  return spec.geoRefs.map(optionByRef).filter((o): o is TargetingOption => !!o);
}

/** Selected detailed-targeting options (interest/behaviour/demographic). */
export function specDetailed(spec: TargetingSpec): TargetingOption[] {
  return spec.detailedRefs
    .map(optionByRef)
    .filter((o): o is TargetingOption => !!o);
}

/** Midpoint of an option's audience-size bounds. */
function optionMid(o: TargetingOption): number {
  return (o.audienceSizeLowerBound + o.audienceSizeUpperBound) / 2;
}

/** Share of the platform population reachable given age/sex/platform filters. */
function narrowingFactor(spec: TargetingSpec): number {
  const ageSpan = Math.max(1, spec.ageMax - spec.ageMin);
  const ageShare = Math.min(1, ageSpan / (AGE_CEIL - AGE_FLOOR));
  const sexShare = spec.sex === 'all' ? 1 : 0.5;
  const platformShare = Math.min(
    1,
    0.55 + 0.15 * Math.max(0, spec.platforms.length - 1),
  );
  return ageShare * sexShare * platformShare;
}

/**
 * The estimated reachable audience (users) for a spec. Geo caps the pool;
 * detailed targeting intersects it (each added interest narrows further);
 * age/sex/platform apply the narrowing factor. Deterministic — no randomness.
 */
export function estimateUsers(spec: TargetingSpec): number {
  const geos = specGeos(spec);
  const detailed = specDetailed(spec);
  // Geo pool: sum of selected countries/regions (roughly additive).
  const geoPool =
    geos.length > 0 ? geos.reduce((s, o) => s + optionMid(o), 0) : 300_000_000; // worldwide fallback when no geo picked
  // Detailed targeting intersects the geo pool. First interest sets the share
  // (as a fraction of a large global interest base); extra interests broaden a
  // little (OR within flexible_spec) but with diminishing returns.
  let detailedShare = 1;
  if (detailed.length > 0) {
    const GLOBAL_BASE = 2_600_000_000;
    const base = optionMid(detailed[0]) / GLOBAL_BASE;
    const extra = detailed
      .slice(1)
      .reduce((s, o) => s + (optionMid(o) / GLOBAL_BASE) * 0.4, 0);
    detailedShare = Math.min(0.95, base + extra);
  }
  const raw = geoPool * detailedShare * narrowingFactor(spec);
  return Math.max(1000, Math.round(raw));
}

/** Whether a spec is "empty" (nothing selected) — nothing to estimate. */
export function isSpecEmpty(spec: TargetingSpec): boolean {
  return spec.geoRefs.length === 0 && spec.detailedRefs.length === 0;
}

/** Build the reachestimate response for a spec. */
export function reachEstimate(spec: TargetingSpec): ReachEstimate {
  const users = estimateUsers(spec);
  // A very narrow audience is flagged as not-ready (the API's -1 sentinel),
  // mirroring a fresh/under-populated targeting set.
  const ready = users >= 20_000;
  return {
    users: ready ? users : -1,
    estimateReady: ready,
    targetingStatus: ready ? 'READY' : 'AUDIENCE_TOO_SMALL',
  };
}

/**
 * Build the delivery_estimate response for a spec, at a given max daily spend.
 * DAU is a fraction of MAU (users); the outcomes curve sweeps spend from a
 * small floor up to `maxSpendCents`, with reach saturating as spend rises.
 */
export function deliveryEstimate(
  spec: TargetingSpec,
  optimizeFor: OptimizeFor,
  maxSpendCents: number,
): DeliveryEstimate {
  const mau = estimateUsers(spec);
  const dau = Math.round(mau * 0.14);
  const ready = mau >= 20_000;

  // Actions-per-reach multiplier by optimisation goal (impressions >> clicks).
  const actionMultiplier: Record<OptimizeFor, number> = {
    REACH: 1,
    IMPRESSIONS: 3.2,
    LINK_CLICKS: 0.11,
    OFFSITE_CONVERSIONS: 0.028,
  };

  const n = 11;
  const dailyOutcomesCurve: OutcomePoint[] = Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    const spendCents = Math.round(maxSpendCents * t);
    // Reach saturates: diminishing returns as spend climbs toward the DAU cap.
    const saturation = 1 - Math.exp(-2.4 * t);
    const reach = Math.round(dau * 0.92 * saturation);
    const actions = Math.round(reach * actionMultiplier[optimizeFor]);
    return {spendCents, reach, actions};
  });

  return {
    estimateDau: ready ? dau : -1,
    estimateMau: ready ? mau : -1,
    estimateReady: ready,
    dailyOutcomesCurve,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers.
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

/** Format a minor-unit (cents) amount for display. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

/** Compact people-count formatting (e.g. 1.2M, 340K). */
export function formatCount(n: number): string {
  if (n < 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

/** A rounded lower/upper band around an estimate, for the "potential reach" range. */
export function reachBand(users: number): {lower: number; upper: number} {
  if (users < 0) return {lower: -1, upper: -1};
  return {
    lower: Math.round(users * 0.85),
    upper: Math.round(users * 1.15),
  };
}

/**
 * Where the audience sits on the too-narrow ↔ too-broad spectrum (0–1), used
 * to position the definition gauge needle. Meta's own guidance favours a broad
 * "potential audience" — very small is risky, very large is defined but generic.
 */
export type Definition = 'narrow' | 'balanced' | 'broad';

export function audienceDefinition(users: number): {
  position: number;
  label: Definition;
} {
  if (users < 0) return {position: 0.04, label: 'narrow'};
  // Log scale between 10K (narrow) and 200M (broad).
  const min = Math.log10(10_000);
  const max = Math.log10(200_000_000);
  const pos = Math.min(1, Math.max(0, (Math.log10(users) - min) / (max - min)));
  const label: Definition =
    pos < 0.33 ? 'narrow' : pos > 0.72 ? 'broad' : 'balanced';
  return {position: pos, label};
}

export const DEFINITION_META: Record<
  Definition,
  {label: string; colorVar: string; note: string}
> = {
  narrow: {
    label: 'Specific',
    colorVar: 'var(--rose)',
    note: 'Audience may be too small — delivery can be constrained.',
  },
  balanced: {
    label: 'Balanced',
    colorVar: 'var(--green)',
    note: 'A healthy audience size for efficient delivery.',
  },
  broad: {
    label: 'Broad',
    colorVar: 'var(--yellow)',
    note: 'Wide reach — good for prospecting, pair with strong creative.',
  },
};
