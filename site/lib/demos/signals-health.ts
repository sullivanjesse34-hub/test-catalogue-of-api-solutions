/**
 * Representative sample data for the Signals Health Dashboard.
 *
 * UI prototype only — mock data shaped after the Meta signals APIs named in
 * docs/solutions/signals/signals-health-dashboard.md. No real Marketing API
 * calls are made. Field names mirror the documented APIs:
 *   - Dataset Quality API (web):    dataset_quality?...fields=web{event_match_quality{composite_score}, event_coverage{percentage,goal_percentage}, match_key_feedback[]{identifier,coverage{percentage}}, dedupe_key_feedback, data_freshness{upload_frequency}, event_potential_aly_acr_increase}
 *   - Dataset Quality (offline):    fields=offline{composite,match_key,frequency,freshness} each {score, recommendation}
 *   - Ads Pixel /stats:             aggregation=event_source (server vs browser), event_processing_results, match_keys, had_pii (7-day window)
 *   - Pixel settings:               <PIXEL_ID>?fields=automatic_matching_fields,checks
 */

/** data_freshness.upload_frequency */
export type UploadFrequency = 'real_time' | 'hourly' | 'daily';

/** A single match key's coverage (match_key_feedback[].coverage.percentage). */
export interface MatchKeyCoverage {
  /** identifier, e.g. 'em' (email), 'ph' (phone), 'fn', 'ln', 'external_id'. */
  identifier: string;
  label: string;
  coveragePct: number;
}

/** Per-event web dataset quality (one entry per event_name). */
export interface WebEventQuality {
  eventName: string;
  /** event_match_quality.composite_score — EMQ, out of 10. */
  compositeScore: number;
  /** event_coverage.percentage */
  coveragePct: number;
  /** event_coverage.goal_percentage (commonly 75). */
  goalPct: number;
  /** match_key_feedback[] */
  matchKeys: MatchKeyCoverage[];
  /** dedupe_key_feedback present & healthy (server/browser events deduplicated). */
  dedupeOk: boolean;
  /** event_potential_aly_acr_increase — upside (%) if added to CAPI. */
  potentialAcrIncreasePct?: number;
  /** event_match_quality.diagnostics[].solution — remediation text, when present. */
  diagnostic?: string;
}

/** offline{composite,match_key,frequency,freshness} — each score out of 10. */
export interface OfflineQuality {
  /** composite ≥ 8.5 unlocks omnichannel ads. */
  composite: number;
  matchKeyEmailPct: number;
  matchKeyPhonePct: number;
  frequencyScore: number;
  freshnessScore: number;
  recommendation?: string;
}

/** /stats event statistics for one event (7-day window). */
export interface EventStat {
  eventName: string;
  /** event_source = server (CAPI). */
  serverCount: number;
  /** event_source = browser (Pixel). */
  browserCount: number;
  /** events received on both and deduplicated. */
  dedupedCount: number;
  /** event_processing_results: events with processing issues. */
  processingIssues: number;
  /** had_pii: events that carried customer-information parameters. */
  hadPiiCount: number;
}

/** A dataset (= pixel). dataset_id == pixel ID. */
export interface Dataset {
  /** dataset_id (= pixel ID). */
  id: string;
  name: string;
  businessName: string;
  /** data_freshness.upload_frequency */
  freshness: UploadFrequency;
  /** pixel settings: automatic_matching_fields configured. */
  automaticMatching: boolean;
  web: WebEventQuality[];
  offline?: OfflineQuality;
  stats: EventStat[];
}

// --- thresholds codified from the doc-provided goals ---

export const COVERAGE_GOAL = 75; // event_coverage.goal_percentage
export const OMNICHANNEL_GATE = 8.5; // offline composite needed to unlock omnichannel
export const EMQ_TARGET = 8; // composite_score target (Great band)

export type EmqBand = 'great' | 'good' | 'fair' | 'poor';

export function emqBand(score: number): EmqBand {
  if (score >= 8) return 'great';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  return 'poor';
}

export const EMQ_BAND_META: Record<EmqBand, {label: string; colorVar: string}> =
  {
    great: {label: 'Great', colorVar: 'var(--green)'},
    good: {label: 'Good', colorVar: 'var(--cat-signals)'},
    fair: {label: 'Fair', colorVar: 'var(--cat-measurement)'},
    poor: {label: 'Poor', colorVar: 'var(--rose)'},
  };

export type CheckStatus = 'pass' | 'warn' | 'fail';

export const CHECK_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--green)',
  warn: 'var(--cat-measurement)',
  fail: 'var(--rose)',
};

/** Compact count formatting for event volumes (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Dataset-level EMQ = average composite across its web events. */
export function datasetEmq(d: Dataset): number {
  if (d.web.length === 0) return 0;
  return d.web.reduce((s, e) => s + e.compositeScore, 0) / d.web.length;
}

export function datasetCoverage(d: Dataset): number {
  if (d.web.length === 0) return 0;
  return Math.round(
    d.web.reduce((s, e) => s + e.coveragePct, 0) / d.web.length,
  );
}

export function omnichannelEligible(d: Dataset): boolean {
  return d.offline != null && d.offline.composite >= OMNICHANNEL_GATE;
}

// ---------------------------------------------------------------------------
// Signals maturity framework — codifies the doc-provided goals into per-dataset
// checks. Each check is derived only from documented Dataset Quality / pixel
// fields and carries the documented remediation. (Build spec, step 2.)
// ---------------------------------------------------------------------------

export interface MaturityCheck {
  key: string;
  label: string;
  status: CheckStatus;
  /** Short measured value, e.g. "8.6 / 10" or "58% vs 75% goal". */
  detail: string;
  /** Documented remediation, shown when status is not "pass". */
  remediation?: string;
}

export function datasetChecks(d: Dataset): MaturityCheck[] {
  const emq = datasetEmq(d);
  const coverage = datasetCoverage(d);
  const dedupeFailures = d.web.filter(e => !e.dedupeOk).length;
  const belowGoal = d.web.filter(e => e.coveragePct < e.goalPct);

  const emqStatus: CheckStatus =
    emq >= EMQ_TARGET ? 'pass' : emq >= 6 ? 'warn' : 'fail';
  const coverageStatus: CheckStatus =
    coverage >= COVERAGE_GOAL
      ? 'pass'
      : coverage >= COVERAGE_GOAL * 0.8
        ? 'warn'
        : 'fail';
  const freshnessStatus: CheckStatus =
    d.freshness === 'real_time'
      ? 'pass'
      : d.freshness === 'hourly'
        ? 'warn'
        : 'fail';
  const dedupeStatus: CheckStatus = dedupeFailures === 0 ? 'pass' : 'fail';
  const omniStatus: CheckStatus = !d.offline
    ? 'fail'
    : d.offline.composite >= OMNICHANNEL_GATE
      ? 'pass'
      : 'warn';
  const matchingStatus: CheckStatus = d.automaticMatching ? 'pass' : 'warn';

  return [
    {
      key: 'emq',
      label: 'Event match quality',
      status: emqStatus,
      detail: `${emq.toFixed(1)} / 10 (target ${EMQ_TARGET})`,
      remediation:
        emqStatus === 'pass'
          ? undefined
          : 'Send hashed email and phone on server events to raise the composite score.',
    },
    {
      key: 'coverage',
      label: 'Event coverage',
      status: coverageStatus,
      detail: `${coverage}% vs ${COVERAGE_GOAL}% goal`,
      remediation:
        coverageStatus === 'pass'
          ? undefined
          : `${belowGoal.length} event${belowGoal.length === 1 ? '' : 's'} below the ${COVERAGE_GOAL}% coverage goal — add the missing parameters via CAPI.`,
    },
    {
      key: 'freshness',
      label: 'Data freshness',
      status: freshnessStatus,
      detail: d.freshness.replace('_', ' '),
      remediation:
        freshnessStatus === 'pass'
          ? undefined
          : 'Move uploads to real time so events arrive within the attribution window.',
    },
    {
      key: 'dedupe',
      label: 'Deduplication',
      status: dedupeStatus,
      detail:
        dedupeFailures === 0
          ? 'All events deduplicated'
          : `${dedupeFailures} event${dedupeFailures === 1 ? '' : 's'} not deduplicated`,
      remediation:
        dedupeStatus === 'pass'
          ? undefined
          : 'Send a shared event_id on browser and server events to deduplicate.',
    },
    {
      key: 'omnichannel',
      label: 'Omnichannel readiness',
      status: omniStatus,
      detail: d.offline
        ? `offline ${d.offline.composite.toFixed(1)} / 10 (gate ${OMNICHANNEL_GATE})`
        : 'no offline dataset',
      remediation:
        omniStatus === 'pass'
          ? undefined
          : d.offline
            ? 'Raise the offline composite to 8.5 to unlock omnichannel ads.'
            : 'Connect an offline event dataset to enable omnichannel ads.',
    },
    {
      key: 'matching',
      label: 'Automatic Advanced Matching',
      status: matchingStatus,
      detail: d.automaticMatching ? 'enabled' : 'disabled',
      remediation:
        matchingStatus === 'pass'
          ? undefined
          : 'Enable Automatic Advanced Matching in pixel settings.',
    },
  ];
}

/** Count of non-passing checks across a dataset (used for prioritisation). */
export function openIssueCount(d: Dataset): number {
  return datasetChecks(d).filter(c => c.status !== 'pass').length;
}

function k(
  identifier: string,
  label: string,
  coveragePct: number,
): MatchKeyCoverage {
  return {identifier, label, coveragePct};
}

export const DATASETS: Dataset[] = [
  {
    id: '3920184756',
    name: 'Northwind Web Pixel',
    businessName: 'Northwind Retail',
    freshness: 'real_time',
    automaticMatching: true,
    web: [
      {
        eventName: 'Purchase',
        compositeScore: 8.6,
        coveragePct: 92,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 96),
          k('ph', 'Phone', 71),
          k('fn', 'First name', 88),
          k('external_id', 'External ID', 64),
        ],
      },
      {
        eventName: 'AddToCart',
        compositeScore: 7.2,
        coveragePct: 80,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 70),
          k('ph', 'Phone', 40),
          k('fbp', 'Browser ID (fbp)', 99),
        ],
      },
      {
        eventName: 'ViewContent',
        compositeScore: 6.1,
        coveragePct: 68,
        goalPct: COVERAGE_GOAL,
        dedupeOk: false,
        diagnostic:
          'Send a deduplication key (event_id) on both browser and server events to avoid double-counting.',
        matchKeys: [
          k('fbp', 'Browser ID (fbp)', 98),
          k('client_ip_address', 'IP address', 95),
        ],
      },
    ],
    offline: {
      composite: 8.8,
      matchKeyEmailPct: 91,
      matchKeyPhonePct: 73,
      frequencyScore: 9.0,
      freshnessScore: 8.4,
    },
    stats: [
      {
        eventName: 'Purchase',
        serverCount: 184000,
        browserCount: 162000,
        dedupedCount: 151000,
        processingIssues: 320,
        hadPiiCount: 181000,
      },
      {
        eventName: 'AddToCart',
        serverCount: 412000,
        browserCount: 398000,
        dedupedCount: 360000,
        processingIssues: 540,
        hadPiiCount: 300000,
      },
      {
        eventName: 'ViewContent',
        serverCount: 980000,
        browserCount: 1240000,
        dedupedCount: 410000,
        processingIssues: 8200,
        hadPiiCount: 510000,
      },
    ],
  },
  {
    id: '5571903842',
    name: 'Lumen Storefront',
    businessName: 'Lumen Skincare',
    freshness: 'real_time',
    automaticMatching: true,
    web: [
      {
        eventName: 'Purchase',
        compositeScore: 9.1,
        coveragePct: 95,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 98),
          k('ph', 'Phone', 84),
          k('fn', 'First name', 92),
          k('ln', 'Last name', 90),
          k('external_id', 'External ID', 80),
        ],
      },
      {
        eventName: 'InitiateCheckout',
        compositeScore: 8.3,
        coveragePct: 86,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 88),
          k('ph', 'Phone', 60),
          k('fbp', 'Browser ID (fbp)', 99),
        ],
      },
    ],
    offline: {
      composite: 9.2,
      matchKeyEmailPct: 95,
      matchKeyPhonePct: 82,
      frequencyScore: 9.3,
      freshnessScore: 9.0,
    },
    stats: [
      {
        eventName: 'Purchase',
        serverCount: 268000,
        browserCount: 240000,
        dedupedCount: 232000,
        processingIssues: 110,
        hadPiiCount: 266000,
      },
      {
        eventName: 'InitiateCheckout',
        serverCount: 520000,
        browserCount: 505000,
        dedupedCount: 470000,
        processingIssues: 260,
        hadPiiCount: 410000,
      },
    ],
  },
  {
    id: '1248007731',
    name: 'Atlas Outdoors Pixel',
    businessName: 'Atlas Outdoors',
    freshness: 'hourly',
    automaticMatching: false,
    web: [
      {
        eventName: 'Purchase',
        compositeScore: 5.4,
        coveragePct: 58,
        goalPct: COVERAGE_GOAL,
        dedupeOk: false,
        potentialAcrIncreasePct: 11,
        diagnostic:
          'Add hashed email and phone to server events, and enable Automatic Advanced Matching to raise match coverage.',
        matchKeys: [
          k('em', 'Email', 44),
          k('ph', 'Phone', 18),
          k('fbp', 'Browser ID (fbp)', 90),
        ],
      },
      {
        eventName: 'AddToCart',
        compositeScore: 4.2,
        coveragePct: 49,
        goalPct: COVERAGE_GOAL,
        dedupeOk: false,
        diagnostic:
          'Browser-only event. Send via the Conversions API with a shared event_id to deduplicate and improve match quality.',
        matchKeys: [
          k('fbp', 'Browser ID (fbp)', 88),
          k('client_ip_address', 'IP address', 92),
        ],
      },
      {
        eventName: 'Lead',
        compositeScore: 3.1,
        coveragePct: 38,
        goalPct: COVERAGE_GOAL,
        dedupeOk: false,
        potentialAcrIncreasePct: 9,
        diagnostic:
          'Lead is not yet sent server-side. Adding it to CAPI is the largest available match-quality gain.',
        matchKeys: [k('client_ip_address', 'IP address', 80)],
      },
    ],
    offline: {
      composite: 6.7,
      matchKeyEmailPct: 52,
      matchKeyPhonePct: 30,
      frequencyScore: 6.0,
      freshnessScore: 5.5,
      recommendation:
        'Upload offline events at least daily and include hashed phone to lift composite above the 8.5 omnichannel threshold.',
    },
    stats: [
      {
        eventName: 'Purchase',
        serverCount: 28000,
        browserCount: 96000,
        dedupedCount: 12000,
        processingIssues: 4100,
        hadPiiCount: 41000,
      },
      {
        eventName: 'AddToCart',
        serverCount: 0,
        browserCount: 210000,
        dedupedCount: 0,
        processingIssues: 9800,
        hadPiiCount: 22000,
      },
      {
        eventName: 'Lead',
        serverCount: 0,
        browserCount: 34000,
        dedupedCount: 0,
        processingIssues: 1200,
        hadPiiCount: 5000,
      },
    ],
  },
  {
    id: '8830561124',
    name: 'Verdant Home Pixel',
    businessName: 'Verdant Home',
    freshness: 'hourly',
    automaticMatching: true,
    web: [
      {
        eventName: 'Purchase',
        compositeScore: 7.6,
        coveragePct: 83,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 86),
          k('ph', 'Phone', 55),
          k('fn', 'First name', 80),
          k('external_id', 'External ID', 58),
        ],
      },
      {
        eventName: 'Subscribe',
        compositeScore: 6.8,
        coveragePct: 72,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        diagnostic:
          'Coverage is just below the 75% goal — confirm email is sent on every Subscribe event.',
        matchKeys: [k('em', 'Email', 74), k('fbp', 'Browser ID (fbp)', 97)],
      },
    ],
    offline: {
      composite: 7.9,
      matchKeyEmailPct: 80,
      matchKeyPhonePct: 61,
      frequencyScore: 7.5,
      freshnessScore: 7.0,
      recommendation:
        'Increase upload frequency to real time to lift composite above 8.5 and unlock omnichannel ads.',
    },
    stats: [
      {
        eventName: 'Purchase',
        serverCount: 142000,
        browserCount: 138000,
        dedupedCount: 121000,
        processingIssues: 600,
        hadPiiCount: 139000,
      },
      {
        eventName: 'Subscribe',
        serverCount: 64000,
        browserCount: 70000,
        dedupedCount: 58000,
        processingIssues: 410,
        hadPiiCount: 60000,
      },
    ],
  },
  {
    id: '4407612290',
    name: 'Cobalt App Dataset',
    businessName: 'Cobalt Fitness',
    freshness: 'daily',
    automaticMatching: false,
    web: [
      {
        eventName: 'Purchase',
        compositeScore: 6.3,
        coveragePct: 70,
        goalPct: COVERAGE_GOAL,
        dedupeOk: true,
        matchKeys: [
          k('em', 'Email', 72),
          k('ph', 'Phone', 48),
          k('external_id', 'External ID', 66),
        ],
      },
      {
        eventName: 'StartTrial',
        compositeScore: 5.0,
        coveragePct: 55,
        goalPct: COVERAGE_GOAL,
        dedupeOk: false,
        potentialAcrIncreasePct: 7,
        diagnostic:
          'Send StartTrial server-side with hashed email to raise match quality and coverage.',
        matchKeys: [k('em', 'Email', 50), k('fbp', 'Browser ID (fbp)', 95)],
      },
    ],
    stats: [
      {
        eventName: 'Purchase',
        serverCount: 88000,
        browserCount: 84000,
        dedupedCount: 76000,
        processingIssues: 720,
        hadPiiCount: 85000,
      },
      {
        eventName: 'StartTrial',
        serverCount: 21000,
        browserCount: 60000,
        dedupedCount: 14000,
        processingIssues: 3300,
        hadPiiCount: 19000,
      },
    ],
  },
];
