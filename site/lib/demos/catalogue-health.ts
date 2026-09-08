'use client';

/**
 * Representative sample data for the Catalogue Health Dashboard.
 *
 * UI prototype only — mock data shaped after the Meta Marketing API endpoints
 * named in docs/solutions/catalogue/catalogue-health-dashboard.md. No real
 * Marketing API calls are made. Field names mirror the documented APIs:
 *   - Business Management API:  <BUSINESS_ID>/owned_product_catalogs (and client_product_catalogs)
 *   - Event statistics:         <CATALOG_ID>/event_stats — matched/unmatched content IDs per day (28-day window)
 *   - Diagnostics:              <CATALOG_ID>/diagnostics?types=[...] — severities, affected_entities, affected_channels
 *   - Product metadata:         <CATALOG_ID>/products?fields=retailer_id,brand,description,name,...,video_fetch_status
 */

// ---------------------------------------------------------------------------
// Event statistics (from <CATALOG_ID>/event_stats)
// ---------------------------------------------------------------------------

/** Breakdown of event types returned by event_stats. */
export type EventType = 'ViewContent' | 'AddToCart' | 'Purchase';

/** Source of events as returned by event_stats. */
export type EventSource = 'pixel' | 'app';

/** A single day's event_stats entry for one event type. */
export interface EventStatDay {
  date: string;
  eventType: EventType;
  source: EventSource;
  /** Count of content IDs that matched a catalogue item. */
  matchedContentIds: number;
  /** Count of content IDs that did NOT match any catalogue item. */
  unmatchedContentIds: number;
  /** Unique matched content IDs (deduplicated). */
  matchedUniqueContentIds: number;
  /** Unique unmatched content IDs (deduplicated). */
  unmatchedUniqueContentIds: number;
}

// ---------------------------------------------------------------------------
// Diagnostics (from <CATALOG_ID>/diagnostics)
// ---------------------------------------------------------------------------

export type DiagnosticType =
  | 'ATTRIBUTES_INVALID'
  | 'ATTRIBUTES_MISSING'
  | 'IMAGE_QUALITY'
  | 'LOW_QUALITY_TITLE_AND_DESCRIPTION'
  | 'POLICY_VIOLATION'
  | 'CHECKOUT'
  | 'EVENT_SOURCE_ISSUES'
  | 'DA_VISIBILITY_ISSUES'
  | 'SHOPS_VISIBILITY_ISSUES';

export type DiagnosticSeverity = 'MUST_FIX' | 'OPPORTUNITY';

export interface Diagnostic {
  type: DiagnosticType;
  severity: DiagnosticSeverity;
  title: string;
  affectedEntities: number;
  affectedChannels: string[];
}

export const DIAGNOSTIC_TYPE_LABELS: Record<DiagnosticType, string> = {
  ATTRIBUTES_INVALID: 'Invalid attributes',
  ATTRIBUTES_MISSING: 'Missing attributes',
  IMAGE_QUALITY: 'Image quality',
  LOW_QUALITY_TITLE_AND_DESCRIPTION: 'Low quality title/description',
  POLICY_VIOLATION: 'Policy violation',
  CHECKOUT: 'Checkout issues',
  EVENT_SOURCE_ISSUES: 'Event source issues',
  DA_VISIBILITY_ISSUES: 'DA visibility issues',
  SHOPS_VISIBILITY_ISSUES: 'Shops visibility issues',
};

// ---------------------------------------------------------------------------
// Products (from <CATALOG_ID>/products)
// ---------------------------------------------------------------------------

/** Required fields for product completeness scoring per spec. */
export const REQUIRED_PRODUCT_FIELDS = [
  'availability',
  'condition',
  'price',
  'image',
  'title',
  'link',
  'brand',
] as const;

export type RequiredField = (typeof REQUIRED_PRODUCT_FIELDS)[number];

/** Summary of product field coverage across the catalogue. */
export interface FieldCoverage {
  field: RequiredField;
  /** Number of products that have this field populated. */
  presentCount: number;
  /** Total product count. */
  totalCount: number;
}

/** Aggregate product stats for a catalogue. */
export interface ProductStats {
  totalProducts: number;
  /** Products with all required fields populated. */
  completeProducts: number;
  /** Products with video array or video_fetch_status populated. */
  withVideo: number;
  fieldCoverage: FieldCoverage[];
}

// ---------------------------------------------------------------------------
// Catalogue — top-level entity
// ---------------------------------------------------------------------------

export interface Catalogue {
  id: string;
  name: string;
  businessName: string;
  /** 28-day event stats (aggregated for simplicity — one row per day). */
  eventStats: EventStatDay[];
  diagnostics: Diagnostic[];
  products: ProductStats;
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

/** Match rate = matched / (matched + unmatched) across all event stats. */
export function catalogueMatchRate(c: Catalogue): number {
  const matched = c.eventStats.reduce((s, e) => s + e.matchedContentIds, 0);
  const unmatched = c.eventStats.reduce((s, e) => s + e.unmatchedContentIds, 0);
  const total = matched + unmatched;
  return total === 0 ? 0 : matched / total;
}

/** Product completeness = completeProducts / totalProducts. */
export function productCompleteness(c: Catalogue): number {
  if (c.products.totalProducts === 0) return 0;
  return c.products.completeProducts / c.products.totalProducts;
}

/** Video coverage = withVideo / totalProducts. */
export function videoCoverage(c: Catalogue): number {
  if (c.products.totalProducts === 0) return 0;
  return c.products.withVideo / c.products.totalProducts;
}

/** Total diagnostics count. */
export function diagnosticCount(c: Catalogue): number {
  return c.diagnostics.length;
}

/** Must-fix diagnostics count. */
export function mustFixCount(c: Catalogue): number {
  return c.diagnostics.filter(d => d.severity === 'MUST_FIX').length;
}

/** Opportunity diagnostics count. */
export function opportunityCount(c: Catalogue): number {
  return c.diagnostics.filter(d => d.severity === 'OPPORTUNITY').length;
}

/** Compact count formatting (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Health score — composite 0-100 (higher = better)
// ---------------------------------------------------------------------------

export function healthScore(c: Catalogue): number {
  const matchRateScore = catalogueMatchRate(c) * 40;
  const completenessScore = productCompleteness(c) * 25;
  const videoScore = videoCoverage(c) * 10;
  const mustFix = mustFixCount(c);
  const diagnosticPenalty = Math.min(25, mustFix * 5);
  return Math.round(
    matchRateScore + completenessScore + videoScore + (25 - diagnosticPenalty),
  );
}

export type HealthBand = 'excellent' | 'good' | 'fair' | 'poor';

export function healthBand(score: number): HealthBand {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  return 'poor';
}

export const HEALTH_BAND_META: Record<
  HealthBand,
  {label: string; colorVar: string}
> = {
  excellent: {label: 'Excellent', colorVar: 'var(--green)'},
  good: {label: 'Good', colorVar: 'var(--cat-catalogue)'},
  fair: {label: 'Fair', colorVar: 'var(--cat-measurement)'},
  poor: {label: 'Poor', colorVar: 'var(--rose)'},
};

// ---------------------------------------------------------------------------
// Health rule checks (maturity-style framework)
// ---------------------------------------------------------------------------

export type CheckStatus = 'pass' | 'warn' | 'fail';

export const CHECK_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--green)',
  warn: 'var(--cat-measurement)',
  fail: 'var(--rose)',
};

export interface HealthCheck {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  remediation?: string;
}

export function catalogueChecks(c: Catalogue): HealthCheck[] {
  const matchRate = catalogueMatchRate(c);
  const completeness = productCompleteness(c);
  const vidCoverage = videoCoverage(c);
  const mustFixes = mustFixCount(c);
  const totalDiag = diagnosticCount(c);

  const matchStatus: CheckStatus =
    matchRate >= 0.85 ? 'pass' : matchRate >= 0.6 ? 'warn' : 'fail';
  const completenessStatus: CheckStatus =
    completeness >= 0.9 ? 'pass' : completeness >= 0.7 ? 'warn' : 'fail';
  const videoStatus: CheckStatus =
    vidCoverage >= 0.5 ? 'pass' : vidCoverage >= 0.2 ? 'warn' : 'fail';
  const mustFixStatus: CheckStatus =
    mustFixes === 0 ? 'pass' : mustFixes <= 2 ? 'warn' : 'fail';
  const diagnosticStatus: CheckStatus =
    totalDiag === 0 ? 'pass' : totalDiag <= 3 ? 'warn' : 'fail';

  return [
    {
      key: 'match_rate',
      label: 'Match rate',
      status: matchStatus,
      detail: `${(matchRate * 100).toFixed(1)}% (target 85%)`,
      remediation:
        matchStatus === 'pass'
          ? undefined
          : 'Ensure product content IDs in your event source match catalogue item IDs exactly.',
    },
    {
      key: 'completeness',
      label: 'Product completeness',
      status: completenessStatus,
      detail: `${(completeness * 100).toFixed(1)}% of products have all required fields`,
      remediation:
        completenessStatus === 'pass'
          ? undefined
          : 'Populate missing required fields (availability, condition, price, image, title, link, brand) in your product feed.',
    },
    {
      key: 'video_coverage',
      label: 'Video coverage',
      status: videoStatus,
      detail: `${(vidCoverage * 100).toFixed(1)}% of products have video`,
      remediation:
        videoStatus === 'pass'
          ? undefined
          : 'Add product videos to increase engagement. Populate the video array or video_fetch_status field in your feed.',
    },
    {
      key: 'must_fix',
      label: 'Must-fix diagnostics',
      status: mustFixStatus,
      detail:
        mustFixes === 0
          ? 'No must-fix issues'
          : `${mustFixes} must-fix issue${mustFixes === 1 ? '' : 's'}`,
      remediation:
        mustFixStatus === 'pass'
          ? undefined
          : 'Resolve must-fix diagnostics to prevent catalogue items from being hidden or rejected.',
    },
    {
      key: 'diagnostics_total',
      label: 'Total diagnostics',
      status: diagnosticStatus,
      detail:
        totalDiag === 0
          ? 'Clean'
          : `${totalDiag} diagnostic${totalDiag === 1 ? '' : 's'}`,
      remediation:
        diagnosticStatus === 'pass'
          ? undefined
          : 'Review and address all diagnostics to improve catalogue quality and ad delivery.',
    },
  ];
}

/** Count of non-passing checks across a catalogue. */
export function openIssueCount(c: Catalogue): number {
  return catalogueChecks(c).filter(ch => ch.status !== 'pass').length;
}

// ---------------------------------------------------------------------------
// 28-day trend helpers
// ---------------------------------------------------------------------------

/** Generate an array of ISO date strings for the last N days. */
function last28Dates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Aggregate matched/unmatched per day across all event types/sources. */
export function dailyMatchTrend(
  c: Catalogue,
): Array<{date: string; matched: number; unmatched: number}> {
  const byDate = new Map<string, {matched: number; unmatched: number}>();
  for (const e of c.eventStats) {
    const entry = byDate.get(e.date) ?? {matched: 0, unmatched: 0};
    entry.matched += e.matchedContentIds;
    entry.unmatched += e.unmatchedContentIds;
    byDate.set(e.date, entry);
  }
  return last28Dates().map(date => {
    const entry = byDate.get(date) ?? {matched: 0, unmatched: 0};
    return {date, matched: entry.matched, unmatched: entry.unmatched};
  });
}

// ---------------------------------------------------------------------------
// Sample data generation helpers
// ---------------------------------------------------------------------------

function generateEventStats(
  baseMatched: number,
  baseUnmatched: number,
  variance: number,
): EventStatDay[] {
  const dates = last28Dates();
  const stats: EventStatDay[] = [];
  const types: EventType[] = ['ViewContent', 'AddToCart', 'Purchase'];
  const sources: EventSource[] = ['pixel', 'app'];
  const typeWeights: Record<EventType, number> = {
    ViewContent: 1.0,
    AddToCart: 0.4,
    Purchase: 0.15,
  };

  for (const date of dates) {
    for (const eventType of types) {
      for (const source of sources) {
        const weight = typeWeights[eventType];
        const sourceWeight = source === 'pixel' ? 0.7 : 0.3;
        const jitter = 1 + Math.sin(dates.indexOf(date) * 0.5) * variance;
        const m = Math.round(baseMatched * weight * sourceWeight * jitter);
        const u = Math.round(baseUnmatched * weight * sourceWeight * jitter);
        stats.push({
          date,
          eventType,
          source,
          matchedContentIds: m,
          unmatchedContentIds: u,
          matchedUniqueContentIds: Math.round(m * 0.82),
          unmatchedUniqueContentIds: Math.round(u * 0.75),
        });
      }
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Sample catalogues (4-5 with varied health profiles)
// ---------------------------------------------------------------------------

export const CATALOGUES: Catalogue[] = [
  {
    id: '9201847560',
    name: 'Northwind Product Feed',
    businessName: 'Northwind Retail',
    eventStats: generateEventStats(4200, 380, 0.08),
    diagnostics: [
      {
        type: 'ATTRIBUTES_MISSING',
        severity: 'OPPORTUNITY',
        title: '12 products missing brand attribute',
        affectedEntities: 12,
        affectedChannels: ['DA', 'Shops'],
      },
    ],
    products: {
      totalProducts: 2450,
      completeProducts: 2310,
      withVideo: 1480,
      fieldCoverage: [
        {field: 'availability', presentCount: 2450, totalCount: 2450},
        {field: 'condition', presentCount: 2448, totalCount: 2450},
        {field: 'price', presentCount: 2450, totalCount: 2450},
        {field: 'image', presentCount: 2450, totalCount: 2450},
        {field: 'title', presentCount: 2450, totalCount: 2450},
        {field: 'link', presentCount: 2450, totalCount: 2450},
        {field: 'brand', presentCount: 2438, totalCount: 2450},
      ],
    },
  },
  {
    id: '5571903842',
    name: 'Lumen Beauty Catalogue',
    businessName: 'Lumen Skincare',
    eventStats: generateEventStats(5600, 210, 0.05),
    diagnostics: [],
    products: {
      totalProducts: 840,
      completeProducts: 830,
      withVideo: 620,
      fieldCoverage: [
        {field: 'availability', presentCount: 840, totalCount: 840},
        {field: 'condition', presentCount: 840, totalCount: 840},
        {field: 'price', presentCount: 840, totalCount: 840},
        {field: 'image', presentCount: 840, totalCount: 840},
        {field: 'title', presentCount: 840, totalCount: 840},
        {field: 'link', presentCount: 838, totalCount: 840},
        {field: 'brand', presentCount: 830, totalCount: 840},
      ],
    },
  },
  {
    id: '1248007731',
    name: 'Atlas Gear Catalogue',
    businessName: 'Atlas Outdoors',
    eventStats: generateEventStats(1800, 1400, 0.15),
    diagnostics: [
      {
        type: 'IMAGE_QUALITY',
        severity: 'MUST_FIX',
        title: '83 products have images below minimum resolution',
        affectedEntities: 83,
        affectedChannels: ['DA', 'Shops'],
      },
      {
        type: 'ATTRIBUTES_MISSING',
        severity: 'MUST_FIX',
        title: '210 products missing required price field',
        affectedEntities: 210,
        affectedChannels: ['DA', 'Shops', 'Marketplace'],
      },
      {
        type: 'LOW_QUALITY_TITLE_AND_DESCRIPTION',
        severity: 'MUST_FIX',
        title: '156 products have titles under 10 characters',
        affectedEntities: 156,
        affectedChannels: ['DA'],
      },
      {
        type: 'EVENT_SOURCE_ISSUES',
        severity: 'MUST_FIX',
        title: 'Pixel event source has high unmatched content ID rate',
        affectedEntities: 1,
        affectedChannels: ['DA'],
      },
      {
        type: 'POLICY_VIOLATION',
        severity: 'OPPORTUNITY',
        title: '4 products flagged for restricted content review',
        affectedEntities: 4,
        affectedChannels: ['Shops'],
      },
      {
        type: 'DA_VISIBILITY_ISSUES',
        severity: 'OPPORTUNITY',
        title:
          '38 products not eligible for dynamic ads due to missing attributes',
        affectedEntities: 38,
        affectedChannels: ['DA'],
      },
    ],
    products: {
      totalProducts: 3120,
      completeProducts: 1870,
      withVideo: 310,
      fieldCoverage: [
        {field: 'availability', presentCount: 3100, totalCount: 3120},
        {field: 'condition', presentCount: 2980, totalCount: 3120},
        {field: 'price', presentCount: 2910, totalCount: 3120},
        {field: 'image', presentCount: 3040, totalCount: 3120},
        {field: 'title', presentCount: 3120, totalCount: 3120},
        {field: 'link', presentCount: 3120, totalCount: 3120},
        {field: 'brand', presentCount: 2640, totalCount: 3120},
      ],
    },
  },
  {
    id: '8830561124',
    name: 'Verdant Living Catalogue',
    businessName: 'Verdant Home',
    eventStats: generateEventStats(3200, 800, 0.1),
    diagnostics: [
      {
        type: 'ATTRIBUTES_INVALID',
        severity: 'MUST_FIX',
        title: '28 products have invalid availability values',
        affectedEntities: 28,
        affectedChannels: ['DA', 'Shops'],
      },
      {
        type: 'CHECKOUT',
        severity: 'OPPORTUNITY',
        title: '15 products have checkout flow issues on Shops',
        affectedEntities: 15,
        affectedChannels: ['Shops'],
      },
      {
        type: 'SHOPS_VISIBILITY_ISSUES',
        severity: 'OPPORTUNITY',
        title: '22 products not visible on Shops due to missing shipping info',
        affectedEntities: 22,
        affectedChannels: ['Shops'],
      },
    ],
    products: {
      totalProducts: 1560,
      completeProducts: 1290,
      withVideo: 420,
      fieldCoverage: [
        {field: 'availability', presentCount: 1532, totalCount: 1560},
        {field: 'condition', presentCount: 1560, totalCount: 1560},
        {field: 'price', presentCount: 1555, totalCount: 1560},
        {field: 'image', presentCount: 1560, totalCount: 1560},
        {field: 'title', presentCount: 1560, totalCount: 1560},
        {field: 'link', presentCount: 1560, totalCount: 1560},
        {field: 'brand', presentCount: 1410, totalCount: 1560},
      ],
    },
  },
  {
    id: '4407612290',
    name: 'Cobalt Sports Catalogue',
    businessName: 'Cobalt Fitness',
    eventStats: generateEventStats(2600, 2200, 0.12),
    diagnostics: [
      {
        type: 'EVENT_SOURCE_ISSUES',
        severity: 'MUST_FIX',
        title:
          'App event source not sending content IDs — 0% match rate from app',
        affectedEntities: 1,
        affectedChannels: ['DA'],
      },
      {
        type: 'ATTRIBUTES_MISSING',
        severity: 'MUST_FIX',
        title: '340 products missing image field',
        affectedEntities: 340,
        affectedChannels: ['DA', 'Shops'],
      },
      {
        type: 'ATTRIBUTES_INVALID',
        severity: 'MUST_FIX',
        title: '95 products have invalid price format',
        affectedEntities: 95,
        affectedChannels: ['DA', 'Shops', 'Marketplace'],
      },
      {
        type: 'IMAGE_QUALITY',
        severity: 'OPPORTUNITY',
        title: '120 products have images with excessive text overlay',
        affectedEntities: 120,
        affectedChannels: ['DA'],
      },
      {
        type: 'LOW_QUALITY_TITLE_AND_DESCRIPTION',
        severity: 'OPPORTUNITY',
        title: '88 products have duplicate or generic titles',
        affectedEntities: 88,
        affectedChannels: ['DA', 'Shops'],
      },
    ],
    products: {
      totalProducts: 1890,
      completeProducts: 980,
      withVideo: 140,
      fieldCoverage: [
        {field: 'availability', presentCount: 1890, totalCount: 1890},
        {field: 'condition', presentCount: 1750, totalCount: 1890},
        {field: 'price', presentCount: 1795, totalCount: 1890},
        {field: 'image', presentCount: 1550, totalCount: 1890},
        {field: 'title', presentCount: 1890, totalCount: 1890},
        {field: 'link', presentCount: 1890, totalCount: 1890},
        {field: 'brand', presentCount: 1420, totalCount: 1890},
      ],
    },
  },
];
