/**
 * Representative sample data for the Reservation Planner demo.
 *
 * UI prototype only — mock data shaped like the Reservation (reach & frequency)
 * Marketing API: the `reachfrequencypredictions` node
 * (POST create → poll status → reserve → assign to ad set). No real Marketing
 * API calls. Field names/casing follow the public docs
 * (developers.facebook.com/docs/marketing-api/reservation): target_spec,
 * start_time/end_time (Unix seconds), frequency_cap, reach, budget, impression,
 * prediction_mode, objective, curve_budget_reach, frequency_distribution_map_agg,
 * status. Money (budget) is held in minor units (cents) per the catalogue
 * convention; divide by 100 for display.
 * See docs/solutions/miscellaneous/reservation-planner.md.
 */

// ---------------------------------------------------------------------------
// Account capabilities & restrictions — rf_spec / capabilities reads.
// ---------------------------------------------------------------------------

export interface AdAccountCapability {
  id: string;
  name: string;
  currency: string;
  /** capabilities[] must include this to run reservation buying. */
  canUseReachAndFrequency: boolean;
  /** rf_spec per-country restrictions the planner honours before submitting. */
  countries: CountryRfSpec[];
}

/** One entry of the ad account's `rf_spec` (per-country reservation limits). */
export interface CountryRfSpec {
  /** ISO country code, e.g. "US". */
  code: string;
  name: string;
  /** Estimated addressable audience for the code (people). */
  audienceSize: number;
  /** rf_spec.min_reach_limits — floor reach for a valid prediction (people). */
  minReach: number;
  /** rf_spec.min_campaign_duration — days. */
  minDurationDays: number;
  /** rf_spec.max_campaign_duration — days. */
  maxDurationDays: number;
}

// ---------------------------------------------------------------------------
// Objectives & placements — target_spec inputs.
// ---------------------------------------------------------------------------

export type Objective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_SALES';

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_SALES: 'Sales',
};

/** publisher_platforms tokens used in target_spec. */
export type Platform = 'facebook' | 'instagram' | 'audience_network';

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
};

// ---------------------------------------------------------------------------
// Prediction status — the reachfrequencyprediction `status` code table.
// ---------------------------------------------------------------------------

export type PredictionStatus =
  | 'SUCCESS'
  | 'PENDING'
  | 'RESERVED'
  | 'FAIL_REACH_TOO_HIGH'
  | 'FAIL_BUDGET_TOO_LOW'
  | 'FAIL_BELOW_MIN_REACH'
  | 'FAIL_DURATION';

/** Numeric status codes per the reservation docs' status table. */
export const STATUS_CODE: Record<PredictionStatus, number> = {
  SUCCESS: 1,
  PENDING: 2,
  RESERVED: 1,
  FAIL_REACH_TOO_HIGH: 3,
  FAIL_BUDGET_TOO_LOW: 6,
  FAIL_BELOW_MIN_REACH: 16,
  FAIL_DURATION: 4,
};

export const STATUS_LABEL: Record<PredictionStatus, string> = {
  SUCCESS: 'Ready to reserve',
  PENDING: 'Predicting…',
  RESERVED: 'Reserved',
  FAIL_REACH_TOO_HIGH: 'Reach or budget too high',
  FAIL_BUDGET_TOO_LOW: 'Budget too low for reach',
  FAIL_BELOW_MIN_REACH: 'Below country minimum reach',
  FAIL_DURATION: 'Invalid campaign duration',
};

export function isFail(status: PredictionStatus): boolean {
  return status.startsWith('FAIL');
}

/** Colour token for a status pill. */
export function statusColorVar(status: PredictionStatus): string {
  if (status === 'RESERVED') return 'var(--brand)';
  if (status === 'SUCCESS') return 'var(--green)';
  if (status === 'PENDING') return 'var(--yellow)';
  return 'var(--rose)';
}

// ---------------------------------------------------------------------------
// The prediction object — reachfrequencyprediction reading fields.
// ---------------------------------------------------------------------------

/** One point on `curve_budget_reach`: budget (cents) → reach (people). */
export interface CurvePoint {
  budgetCents: number;
  reach: number;
  impression: number;
  /** Predicted average CPM (cents) at this point on the curve. */
  cpmCents: number;
}

export interface Prediction {
  id: string;
  status: PredictionStatus;
  objective: Objective;
  /** target_spec summary (audience label). */
  audience: string;
  countryCode: string;
  platforms: Platform[];
  /** start_time / end_time as ISO dates (API uses Unix seconds). */
  startDate: string;
  endDate: string;
  /** frequency_cap — max impressions per person over the flight. */
  frequencyCap: number;
  /** budget in minor units (cents). */
  budgetCents: number;
  /** reach — people at the reserved / selected point. */
  reach: number;
  /** impression — total impressions at the reserved point. */
  impression: number;
  /** Predicted blended CPM at the selected point (cents). */
  cpmCents: number;
  /** curve_budget_reach — how reach grows with budget (holding target fixed). */
  curve: CurvePoint[];
  /**
   * frequency_distribution_map_agg — for the max point, people reached ≥ N times
   * for N = 1..10. Index 0 = reached ≥ 1 time … index 9 = reached ≥ 10 times.
   */
  frequencyDistribution: number[];
  /** Ad set the reserved prediction is assigned to (rf_prediction_id), if any. */
  assignedAdSet?: string;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

/** Format a minor-unit (cents) amount for display, respecting account currency. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

/** Compact people count, e.g. 1_240_000 → "1.24M". */
export function formatPeople(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

/** Whole-day span between two ISO dates (inclusive of both endpoints). */
export function durationDays(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(0, Math.round(ms / 86_400_000)) + 1;
}

/** ISO date → Unix seconds (the format the create call actually sends). */
export function toUnixSeconds(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

// ---------------------------------------------------------------------------
// Prediction engine (deterministic mock).
//
// Produces a curve_budget_reach and frequency distribution from the planner
// inputs, and derives a status by validating against rf_spec — mirroring what a
// real POST /reachfrequencypredictions + poll would return, without any network.
// ---------------------------------------------------------------------------

export interface PlannerInput {
  objective: Objective;
  countryCode: string;
  platforms: Platform[];
  startDate: string;
  endDate: string;
  frequencyCap: number;
  budgetCents: number;
}

/** Reach a given budget buys against a country's audience (saturating curve). */
function reachForBudget(
  budgetCents: number,
  spec: CountryRfSpec,
  frequencyCap: number,
): number {
  // Diminishing returns: reach approaches the addressable audience as budget
  // grows. A tighter frequency cap spreads spend over more people.
  const baseCpmCents = 620; // ~$6.20 blended CPM for a reservation buy
  const impressions = (budgetCents / baseCpmCents) * 1000;
  const rawReach = impressions / Math.max(1, frequencyCap);
  const ceiling = spec.audienceSize * 0.92;
  return Math.round(ceiling * (1 - Math.exp(-rawReach / ceiling)));
}

function cpmForPoint(budgetCents: number, impression: number): number {
  if (impression <= 0) return 0;
  return Math.round((budgetCents / impression) * 1000);
}

/** Build a 12-point curve_budget_reach up to the planned budget. */
function buildCurve(input: PlannerInput, spec: CountryRfSpec): CurvePoint[] {
  const n = 12;
  return Array.from({length: n}, (_, i) => {
    const budgetCents = Math.round((input.budgetCents * (i + 1)) / n);
    const reach = reachForBudget(budgetCents, spec, input.frequencyCap);
    const impression = reach * input.frequencyCap;
    return {
      budgetCents,
      reach,
      impression,
      cpmCents: cpmForPoint(budgetCents, impression),
    };
  });
}

/**
 * frequency_distribution_map_agg for the top curve point: people reached ≥ N
 * times (N = 1..10). Modelled as a geometric decay around the frequency cap.
 */
function buildFrequencyDistribution(
  reach: number,
  frequencyCap: number,
): number[] {
  return Array.from({length: 10}, (_, i) => {
    const times = i + 1;
    if (times > frequencyCap) return 0;
    // Fraction of the audience reached at least `times` times.
    const frac = Math.pow(1 - times / (frequencyCap + 1.5), 1.6);
    return Math.max(0, Math.round(reach * frac));
  });
}

function validate(
  input: PlannerInput,
  spec: CountryRfSpec,
  topReach: number,
): PredictionStatus {
  const days = durationDays(input.startDate, input.endDate);
  if (days < spec.minDurationDays || days > spec.maxDurationDays) {
    return 'FAIL_DURATION';
  }
  if (topReach < spec.minReach) return 'FAIL_BELOW_MIN_REACH';
  // Below ~$3.50 blended CPM the requested reach can't be filled.
  const topImpression = topReach * input.frequencyCap;
  if (cpmForPoint(input.budgetCents, topImpression) < 350) {
    return 'FAIL_BUDGET_TOO_LOW';
  }
  if (topReach > spec.audienceSize * 0.9) return 'FAIL_REACH_TOO_HIGH';
  return 'SUCCESS';
}

/**
 * Run the mock prediction engine for a planner input against an account.
 * Returns a fully-shaped Prediction (SUCCESS with a curve, or a FAIL status).
 */
export function predict(
  account: AdAccountCapability,
  input: PlannerInput,
  id: string,
): Prediction {
  const spec =
    account.countries.find(c => c.code === input.countryCode) ??
    account.countries[0];
  const curve = buildCurve(input, spec);
  const top = curve[curve.length - 1];
  const status = validate(input, spec, top.reach);
  const audience = `${spec.name} · ${OBJECTIVE_LABEL[input.objective]}`;

  return {
    id,
    status,
    objective: input.objective,
    audience,
    countryCode: input.countryCode,
    platforms: input.platforms,
    startDate: input.startDate,
    endDate: input.endDate,
    frequencyCap: input.frequencyCap,
    budgetCents: input.budgetCents,
    reach: isFail(status) ? 0 : top.reach,
    impression: isFail(status) ? 0 : top.impression,
    cpmCents: isFail(status) ? 0 : top.cpmCents,
    curve: isFail(status) ? [] : curve,
    frequencyDistribution: isFail(status)
      ? []
      : buildFrequencyDistribution(top.reach, input.frequencyCap),
  };
}

// ---------------------------------------------------------------------------
// Sample accounts & saved predictions.
// ---------------------------------------------------------------------------

export const ACCOUNTS: AdAccountCapability[] = [
  {
    id: '4021547788',
    name: 'Northwind Retail',
    currency: 'USD',
    canUseReachAndFrequency: true,
    countries: [
      {
        code: 'US',
        name: 'United States',
        audienceSize: 24_800_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
      {
        code: 'CA',
        name: 'Canada',
        audienceSize: 4_600_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
    ],
  },
  {
    id: '7798452310',
    name: 'Lumen Skincare',
    currency: 'GBP',
    canUseReachAndFrequency: true,
    countries: [
      {
        code: 'GB',
        name: 'United Kingdom',
        audienceSize: 9_200_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
      {
        code: 'IE',
        name: 'Ireland',
        audienceSize: 1_400_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
    ],
  },
  {
    id: '3344120876',
    name: 'Saffron & Co.',
    currency: 'EUR',
    canUseReachAndFrequency: true,
    countries: [
      {
        code: 'DE',
        name: 'Germany',
        audienceSize: 12_100_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
      {
        code: 'FR',
        name: 'France',
        audienceSize: 10_400_000,
        minReach: 200_000,
        minDurationDays: 1,
        maxDurationDays: 90,
      },
    ],
  },
];

export const DEFAULT_INPUT: PlannerInput = {
  objective: 'OUTCOME_AWARENESS',
  countryCode: 'US',
  platforms: ['facebook', 'instagram'],
  startDate: '2026-08-01',
  endDate: '2026-08-14',
  frequencyCap: 2,
  budgetCents: 5_000_000,
};

/** A pre-seeded prediction so the Predictions tab isn't empty on load. */
export function seedPredictions(account: AdAccountCapability): Prediction[] {
  const spec = account.countries[0];
  const seed = predict(
    account,
    {
      objective: 'OUTCOME_AWARENESS',
      countryCode: spec.code,
      platforms: ['facebook', 'instagram'],
      startDate: '2026-07-14',
      endDate: '2026-07-28',
      frequencyCap: 3,
      budgetCents: 6_500_000,
    },
    `rfp_${account.id}_seed`,
  );
  return [{...seed, status: 'RESERVED', assignedAdSet: 'Reserved — Q3 Brand'}];
}
