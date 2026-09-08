/**
 * Representative sample data for the Experiment Analysis demo.
 *
 * UI prototype only — mock data shaped after the Meta Ad Studies API named in
 * docs/solutions/measurement/experiment-analysis.md. No real Marketing API
 * calls are made. Field names mirror the documented APIs:
 *   - Ad Studies list:      <BUSINESS_ID>/ad_studies?fields=id,name,type,start_time,end_time
 *   - Study cells:          <STUDY_ID>/cells → ad_study_cell{name,role,adaccount_ids,adset_ids,campaign_ids}
 *   - Study objectives:     <STUDY_ID>/objectives → ad_study_objective{id,name,type}
 *   - Objective results:    <OBJECTIVE_ID>?fields=results (lift %, confidence, p-value, incremental conv.)
 *   - Split-test winner:    <AD_STUDY_ID>?fields=split_test_winner{winner_ad_object_id,high_performer_ids,confidences}
 *   - Ad accounts (scope):  Business Management API — <BUSINESS_ID>/owned_ad_accounts / client_ad_accounts
 * `type` enums per spec: LIFT (conversion lift), SPLIT_TEST (v1 split test),
 * SPLIT_TEST_V2 (creative test w/ creative_test_config). Brand lift is not API-accessible.
 */

/** Ad Studies `type` enum (spec: LIFT, SPLIT_TEST, SPLIT_TEST_V2). */
export type StudyType = 'LIFT' | 'SPLIT_TEST' | 'SPLIT_TEST_V2';

export type StudyStatus = 'RUNNING' | 'COMPLETED' | 'SCHEDULED';

/** ad_study_cell.role — treatment vs control arm. */
export type CellRole = 'TREATMENT' | 'CONTROL';

export const STUDY_TYPE_META: Record<
  StudyType,
  {label: string; short: string; colorVar: string; hasResults: boolean}
> = {
  LIFT: {
    label: 'Conversion lift',
    short: 'Lift',
    colorVar: 'var(--cat-measurement)',
    hasResults: true,
  },
  SPLIT_TEST_V2: {
    label: 'Creative test',
    short: 'Creative',
    colorVar: 'var(--purple)',
    hasResults: true,
  },
  SPLIT_TEST: {
    label: 'Split test',
    short: 'Split',
    colorVar: 'var(--cat-signals)',
    // Spec: "Results are not available for split tests" (v1).
    hasResults: false,
  },
};

/** A study cell = one treatment/control arm at a single object level. */
export interface StudyCell {
  /** ad_study_cell id. */
  id: string;
  name: string;
  role: CellRole;
  /** treatment_percentage (share of budget / audience). */
  treatmentPercentage: number;
  /** The measured entities at one object level (spec: adaccount/adset/campaign ids or ad ids). */
  entityLevel: 'ad_account' | 'campaign' | 'adset' | 'ad';
  entityIds: string[];
}

/** Per-objective lift result (OBJECTIVE_ID?fields=results). */
export interface ObjectiveResult {
  /** ad_study_objective id. */
  id: string;
  /** ad_study_objective.name, e.g. "Purchases". */
  name: string;
  /** ad_study_objective.type, e.g. PURCHASE / OFFSITE_CONVERSION. */
  type: string;
  /** Relative lift % (treatment vs control). */
  liftPct: number;
  /** Statistical confidence % (e.g. 95). */
  confidencePct: number;
  /** p-value for the lift estimate. */
  pValue: number;
  /** Incremental conversions attributed to the treatment. */
  incrementalConversions: number;
  /** Incremental cost per conversion in cents (÷100 for display). */
  incrementalCostPerConversionCents: number;
  /** Confidence-interval bounds on the lift % (low, high). */
  ciLowPct: number;
  ciHighPct: number;
}

/** A creative-test cell result (SPLIT_TEST_V2, per-ad reporting). */
export interface CreativeCellResult {
  cellId: string;
  cellName: string;
  adId: string;
  /** Bayesian confidence this cell is the best (split_test_winner.confidences). */
  confidencePct: number;
  /** Cost per result in cents. */
  costPerResultCents: number;
  results: number;
  isWinner: boolean;
}

export interface AdStudy {
  /** ad_study id. */
  id: string;
  name: string;
  type: StudyType;
  status: StudyStatus;
  businessId: string;
  businessName: string;
  /** ad account measured (act_ prefix stripped for display). */
  adAccountId: string;
  startTime: string;
  endTime: string;
  /** Normalised category for benchmarking (build spec, step 2). */
  benchmarkCategory: string;
  cells: StudyCell[];
  /** LIFT + creative-test objectives (empty for v1 split tests). */
  objectives: ObjectiveResult[];
  /** SPLIT_TEST_V2 per-ad results. */
  creativeResults?: CreativeCellResult[];
  spendCents: number;
}

// --- thresholds & helpers -------------------------------------------------

/** Studies at/above this confidence are treated as statistically significant. */
export const SIGNIFICANCE_THRESHOLD = 90;

export type SignificanceBand = 'significant' | 'directional' | 'inconclusive';

export function significanceBand(confidencePct: number): SignificanceBand {
  if (confidencePct >= 95) return 'significant';
  if (confidencePct >= SIGNIFICANCE_THRESHOLD) return 'directional';
  return 'inconclusive';
}

export const SIGNIFICANCE_META: Record<
  SignificanceBand,
  {label: string; colorVar: string}
> = {
  significant: {label: 'Significant', colorVar: 'var(--green)'},
  directional: {label: 'Directional', colorVar: 'var(--cat-measurement)'},
  inconclusive: {label: 'Inconclusive', colorVar: 'var(--ink-3)'},
};

/** Money in minor units — divide by 100 for display (see conventions). */
export function formatMoney(cents: number, currency = 'USD'): string {
  const value = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatLift(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/** The single headline objective of a lift study (highest confidence). */
export function primaryObjective(study: AdStudy): ObjectiveResult | undefined {
  if (study.objectives.length === 0) return undefined;
  return [...study.objectives].sort(
    (a, b) => b.confidencePct - a.confidencePct,
  )[0];
}

/** Study-level headline lift = primary objective lift (0 when no results). */
export function studyLift(study: AdStudy): number {
  return primaryObjective(study)?.liftPct ?? 0;
}

export function studyConfidence(study: AdStudy): number {
  return primaryObjective(study)?.confidencePct ?? 0;
}

export function isSignificant(study: AdStudy): boolean {
  return studyConfidence(study) >= SIGNIFICANCE_THRESHOLD;
}

/**
 * Benchmark = mean lift across completed, significant studies sharing a
 * category (build spec, step 2 — aggregate like-for-like tests). Returns null
 * when no comparable completed studies exist.
 */
export interface Benchmark {
  category: string;
  studyCount: number;
  meanLiftPct: number;
  bestLiftPct: number;
  medianConfidencePct: number;
}

export function benchmarksByCategory(studies: AdStudy[]): Benchmark[] {
  const groups = new Map<string, AdStudy[]>();
  for (const s of studies) {
    if (s.status !== 'COMPLETED') continue;
    if (!STUDY_TYPE_META[s.type].hasResults) continue;
    const list = groups.get(s.benchmarkCategory) ?? [];
    list.push(s);
    groups.set(s.benchmarkCategory, list);
  }

  const out: Benchmark[] = [];
  for (const [category, list] of groups) {
    const lifts = list.map(studyLift);
    const confidences = list.map(studyConfidence).sort((a, b) => a - b);
    const mid = Math.floor(confidences.length / 2);
    const median =
      confidences.length % 2 === 0
        ? (confidences[mid - 1] + confidences[mid]) / 2
        : confidences[mid];
    out.push({
      category,
      studyCount: list.length,
      meanLiftPct: lifts.reduce((s, l) => s + l, 0) / lifts.length,
      bestLiftPct: Math.max(...lifts),
      medianConfidencePct: median,
    });
  }
  return out.sort((a, b) => b.meanLiftPct - a.meanLiftPct);
}

/** Total incremental conversions across all objectives in a study. */
export function studyIncrementalConversions(study: AdStudy): number {
  return study.objectives.reduce((s, o) => s + o.incrementalConversions, 0);
}

// --- sample studies -------------------------------------------------------

export const AD_STUDIES: AdStudy[] = [
  {
    id: '1207743390021',
    name: 'Q2 Purchase Conversion Lift — Northwind',
    type: 'LIFT',
    status: 'COMPLETED',
    businessId: '748291056',
    businessName: 'Northwind Retail',
    adAccountId: '1029384756',
    startTime: '2026-04-01',
    endTime: '2026-04-28',
    benchmarkCategory: 'Retail · Conversion lift',
    spendCents: 4820000,
    cells: [
      {
        id: 'cell_1207_t',
        name: 'Exposed',
        role: 'TREATMENT',
        treatmentPercentage: 85,
        entityLevel: 'campaign',
        entityIds: ['23851009', '23851044'],
      },
      {
        id: 'cell_1207_c',
        name: 'Holdout',
        role: 'CONTROL',
        treatmentPercentage: 15,
        entityLevel: 'campaign',
        entityIds: [],
      },
    ],
    objectives: [
      {
        id: 'obj_1207_purch',
        name: 'Purchases',
        type: 'PURCHASE',
        liftPct: 18.4,
        confidencePct: 97,
        pValue: 0.012,
        incrementalConversions: 6420,
        incrementalCostPerConversionCents: 751,
        ciLowPct: 11.2,
        ciHighPct: 25.6,
      },
      {
        id: 'obj_1207_atc',
        name: 'Adds to cart',
        type: 'ADD_TO_CART',
        liftPct: 12.1,
        confidencePct: 93,
        pValue: 0.041,
        incrementalConversions: 15800,
        incrementalCostPerConversionCents: 305,
        ciLowPct: 4.0,
        ciHighPct: 20.2,
      },
    ],
  },
  {
    id: '1207743391188',
    name: 'Spring Skincare Conversion Lift — Lumen',
    type: 'LIFT',
    status: 'COMPLETED',
    businessId: '748291057',
    businessName: 'Lumen Skincare',
    adAccountId: '5571903842',
    startTime: '2026-03-10',
    endTime: '2026-04-07',
    benchmarkCategory: 'DTC · Conversion lift',
    spendCents: 2610000,
    cells: [
      {
        id: 'cell_1188_t',
        name: 'Exposed',
        role: 'TREATMENT',
        treatmentPercentage: 90,
        entityLevel: 'campaign',
        entityIds: ['23860777'],
      },
      {
        id: 'cell_1188_c',
        name: 'Holdout',
        role: 'CONTROL',
        treatmentPercentage: 10,
        entityLevel: 'campaign',
        entityIds: [],
      },
    ],
    objectives: [
      {
        id: 'obj_1188_purch',
        name: 'Purchases',
        type: 'PURCHASE',
        liftPct: 24.7,
        confidencePct: 96,
        pValue: 0.018,
        incrementalConversions: 3110,
        incrementalCostPerConversionCents: 840,
        ciLowPct: 15.9,
        ciHighPct: 33.5,
      },
    ],
  },
  {
    id: '1207743392455',
    name: 'Holiday Prospecting Lift — Atlas Outdoors',
    type: 'LIFT',
    status: 'COMPLETED',
    businessId: '748291058',
    businessName: 'Atlas Outdoors',
    adAccountId: '1248007731',
    startTime: '2026-02-15',
    endTime: '2026-03-14',
    benchmarkCategory: 'Retail · Conversion lift',
    spendCents: 3350000,
    cells: [
      {
        id: 'cell_2455_t',
        name: 'Exposed',
        role: 'TREATMENT',
        treatmentPercentage: 80,
        entityLevel: 'campaign',
        entityIds: ['23840012', '23840099'],
      },
      {
        id: 'cell_2455_c',
        name: 'Holdout',
        role: 'CONTROL',
        treatmentPercentage: 20,
        entityLevel: 'campaign',
        entityIds: [],
      },
    ],
    objectives: [
      {
        id: 'obj_2455_purch',
        name: 'Purchases',
        type: 'PURCHASE',
        liftPct: 6.2,
        confidencePct: 82,
        pValue: 0.14,
        incrementalConversions: 1240,
        incrementalCostPerConversionCents: 2701,
        ciLowPct: -2.1,
        ciHighPct: 14.5,
      },
    ],
  },
  {
    id: '1207743393712',
    name: 'Summer Creative Test — Lumen Serum Launch',
    type: 'SPLIT_TEST_V2',
    status: 'COMPLETED',
    businessId: '748291057',
    businessName: 'Lumen Skincare',
    adAccountId: '5571903842',
    startTime: '2026-05-05',
    endTime: '2026-05-19',
    benchmarkCategory: 'DTC · Creative test',
    spendCents: 980000,
    cells: [
      {
        id: 'cell_3712_a',
        name: 'Group A — UGC video',
        role: 'TREATMENT',
        treatmentPercentage: 34,
        entityLevel: 'ad',
        entityIds: ['6891122334'],
      },
      {
        id: 'cell_3712_b',
        name: 'Group B — Studio still',
        role: 'TREATMENT',
        treatmentPercentage: 33,
        entityLevel: 'ad',
        entityIds: ['6891122377'],
      },
      {
        id: 'cell_3712_c',
        name: 'Group C — Founder story',
        role: 'TREATMENT',
        treatmentPercentage: 33,
        entityLevel: 'ad',
        entityIds: ['6891122399'],
      },
    ],
    objectives: [],
    creativeResults: [
      {
        cellId: 'cell_3712_a',
        cellName: 'Group A — UGC video',
        adId: '6891122334',
        confidencePct: 91,
        costPerResultCents: 612,
        results: 4820,
        isWinner: true,
      },
      {
        cellId: 'cell_3712_b',
        cellName: 'Group B — Studio still',
        adId: '6891122377',
        confidencePct: 6,
        costPerResultCents: 884,
        results: 3110,
        isWinner: false,
      },
      {
        cellId: 'cell_3712_c',
        cellName: 'Group C — Founder story',
        adId: '6891122399',
        confidencePct: 3,
        costPerResultCents: 1024,
        results: 2740,
        isWinner: false,
      },
    ],
  },
  {
    id: '1207743394901',
    name: 'Always-On Purchase Lift — Northwind (live)',
    type: 'LIFT',
    status: 'RUNNING',
    businessId: '748291056',
    businessName: 'Northwind Retail',
    adAccountId: '1029384756',
    startTime: '2026-06-15',
    endTime: '2026-07-13',
    benchmarkCategory: 'Retail · Conversion lift',
    spendCents: 1910000,
    cells: [
      {
        id: 'cell_4901_t',
        name: 'Exposed',
        role: 'TREATMENT',
        treatmentPercentage: 85,
        entityLevel: 'campaign',
        entityIds: ['23870511'],
      },
      {
        id: 'cell_4901_c',
        name: 'Holdout',
        role: 'CONTROL',
        treatmentPercentage: 15,
        entityLevel: 'campaign',
        entityIds: [],
      },
    ],
    objectives: [
      {
        id: 'obj_4901_purch',
        name: 'Purchases (interim)',
        type: 'PURCHASE',
        liftPct: 14.9,
        confidencePct: 71,
        pValue: 0.22,
        incrementalConversions: 2010,
        incrementalCostPerConversionCents: 950,
        ciLowPct: -1.4,
        ciHighPct: 31.2,
      },
    ],
  },
  {
    id: '1207743395338',
    name: 'Legacy Bid Strategy Split Test — Verdant',
    type: 'SPLIT_TEST',
    status: 'COMPLETED',
    businessId: '748291059',
    businessName: 'Verdant Home',
    adAccountId: '8830561124',
    startTime: '2026-01-08',
    endTime: '2026-01-22',
    benchmarkCategory: 'Home · Split test',
    spendCents: 740000,
    cells: [
      {
        id: 'cell_5338_a',
        name: 'Lowest cost',
        role: 'TREATMENT',
        treatmentPercentage: 50,
        entityLevel: 'adset',
        entityIds: ['23830100'],
      },
      {
        id: 'cell_5338_b',
        name: 'Cost cap',
        role: 'TREATMENT',
        treatmentPercentage: 50,
        entityLevel: 'adset',
        entityIds: ['23830101'],
      },
    ],
    objectives: [],
  },
  {
    id: '1207743396770',
    name: 'Q3 Prospecting Lift — Atlas Outdoors (draft)',
    type: 'LIFT',
    status: 'SCHEDULED',
    businessId: '748291058',
    businessName: 'Atlas Outdoors',
    adAccountId: '1248007731',
    startTime: '2026-07-20',
    endTime: '2026-08-17',
    benchmarkCategory: 'Retail · Conversion lift',
    spendCents: 0,
    cells: [
      {
        id: 'cell_6770_t',
        name: 'Exposed',
        role: 'TREATMENT',
        treatmentPercentage: 80,
        entityLevel: 'campaign',
        entityIds: [],
      },
      {
        id: 'cell_6770_c',
        name: 'Holdout',
        role: 'CONTROL',
        treatmentPercentage: 20,
        entityLevel: 'campaign',
        entityIds: [],
      },
    ],
    objectives: [],
  },
];
