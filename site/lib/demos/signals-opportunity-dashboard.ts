/**
 * Representative sample data for the Signals Opportunity Dashboard.
 *
 * UI prototype only — mock data shaped after the Meta signals APIs named in
 * docs/solutions/signals/signals-opportunity-dashboard.md. No real Marketing API
 * calls are made. Field names mirror the documented API specification:
 *   - Business Management API (pixel discovery):
 *       GET <BUSINESS_ID>/adspixels?summary=total_count  → pixel ids + metadata
 *   - Ads Pixel Node:
 *       GET <PIXEL_ID>?fields=is_unavailable,data_use_setting,first_party_cookie_status,
 *           enable_automatic_matching,has_1p_pixel_event,last_fired_time,server_last_fired_time
 *   - Ads API (spend attribution):
 *       GET <PIXEL_ID>/adaccounts  → connected ad accounts
 *       GET act_<AD_ACCOUNT_ID>/adsets?fields=promoted_object  → promoted_object.pixel_id
 *       GET act_<AD_ACCOUNT_ID>/insights?level=adset&fields=spend,adset_id
 *   - Ads Pixel /stats (event volume by source, 7-day retention window):
 *       GET <PIXEL_ID>/stats?aggregation=event_source&event_source=WEB_ONLY   (browser-only)
 *       GET <PIXEL_ID>/stats?aggregation=event_source&event_source=SERVER_ONLY (CAPI-connected)
 *
 * The opportunity model (build spec step 2): combine attributed spend (Insights via
 * promoted_object.pixel_id) with CAPI-presence signals (server_last_fired_time populated,
 * has_1p_pixel_event, /stats SERVER_ONLY volume) to size the web-connected spend & events
 * that are NOT yet flowing through the Conversions API, then rank by projected AR upside.
 */

/** data_use_setting on the pixel node. */
export type DataUseSetting = 'ADVERTISER' | 'EMPTY';

/** first_party_cookie_status on the pixel node. */
export type FirstPartyCookieStatus =
  'FIRST_PARTY_COOKIE_ENABLED' | 'FIRST_PARTY_COOKIE_DISABLED' | 'EMPTY';

/**
 * A single event on a pixel, split by source from /stats.
 * The opportunity is the web-connected (browser) volume with little/no
 * server (CAPI) coverage — the events that would benefit most from CAPI.
 */
export interface PixelEvent {
  /** event_name, e.g. 'Purchase', 'Lead', 'AddToCart'. */
  eventName: string;
  /** /stats event_source=WEB_ONLY count (browser-side, 7-day window). */
  webCount: number;
  /** /stats event_source=SERVER_ONLY count (already via CAPI, 7-day window). */
  serverCount: number;
  /**
   * Share of this event's attributed spend, used to weight the projected
   * upside toward high-value events (Purchase carries more weight than
   * ViewContent). Sums to ~1 across a pixel's events.
   */
  spendShare: number;
  /**
   * Documented per-event AR/performance upside band if connected to CAPI
   * (analogous to the Dataset Quality event_potential_aly_acr_increase field).
   * Expressed as a % lift on the event's attributed AR.
   */
  potentialAcrIncreasePct: number;
}

/** An ad account connected to the pixel via <PIXEL_ID>/adaccounts. */
export interface ConnectedAccount {
  /** Bare numeric id; prefix with act_ for API paths. */
  id: string;
  name: string;
}

/** A pixel (dataset) in the business portfolio, from <BUSINESS_ID>/adspixels. */
export interface Pixel {
  /** Pixel / dataset id. */
  id: string;
  name: string;
  businessName: string;
  /** is_unavailable — excluded from opportunity sizing when true. */
  isUnavailable: boolean;
  /** data_use_setting */
  dataUseSetting: DataUseSetting;
  /** first_party_cookie_status */
  firstPartyCookieStatus: FirstPartyCookieStatus;
  /** enable_automatic_matching */
  enableAutomaticMatching: boolean;
  /** has_1p_pixel_event — pixel is actively firing 1p events. */
  has1pPixelEvent: boolean;
  /** last_fired_time (browser). ISO date. */
  lastFiredTime: string;
  /**
   * server_last_fired_time — null/undefined means the pixel has NEVER received
   * a server (CAPI) event → the strongest untapped-opportunity signal.
   */
  serverLastFiredTime?: string;
  /** Attributed spend over the trailing 30 days, in cents (account minor units). */
  attributedSpendCents: number;
  /** account_currency for the attributed spend. */
  currency: string;
  /** Connected ad accounts (<PIXEL_ID>/adaccounts). */
  connectedAccounts: ConnectedAccount[];
  events: PixelEvent[];
  /** Adopted in-session (one-click CAPI adoption) — demo state only. */
  adopted?: boolean;
}

// --- thresholds & weights codified from the doc-provided model ---

/** A pixel with server share below this is treated as an open opportunity. */
export const CAPI_SERVER_SHARE_TARGET = 0.6;

/** Assumed AR return multiple on attributed spend, used to translate the
 * spend-weighted potential lift into a projected annual AR gain. Representative
 * planning constant only — not a real Marketing API value. */
const ASSUMED_ROAS = 2.4;

export type OpportunityTier = 'high' | 'medium' | 'low' | 'connected';

export const TIER_META: Record<
  OpportunityTier,
  {label: string; colorVar: string}
> = {
  high: {label: 'High', colorVar: 'var(--rose)'},
  medium: {label: 'Medium', colorVar: 'var(--cat-measurement)'},
  low: {label: 'Low', colorVar: 'var(--purple)'},
  connected: {label: 'Connected', colorVar: 'var(--green)'},
};

/** Dollars from cents (respecting the two-decimal minor-unit convention). */
export function dollars(cents: number): number {
  return cents / 100;
}

/** Compact currency formatting for spend/AR ($1.2M, $340k, $980). */
export function formatMoney(cents: number, currency = 'USD'): string {
  const v = dollars(cents);
  const sign = currency === 'USD' ? '$' : '';
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sign}${Math.round(v / 1_000)}k`;
  return `${sign}${Math.round(v)}`;
}

/** Compact count formatting for event volumes (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Total web (browser) + server event volume for a pixel. */
export function pixelEventTotal(p: Pixel): number {
  return p.events.reduce((s, e) => s + e.webCount + e.serverCount, 0);
}

/**
 * Server (CAPI) share of a pixel's total event volume [0..1]. An adopted pixel
 * is modelled as fully connected so the UI reflects the one-click adoption.
 */
export function serverShare(p: Pixel): number {
  if (p.adopted) return 1;
  const total = pixelEventTotal(p);
  if (total === 0) return 0;
  const server = p.events.reduce((s, e) => s + e.serverCount, 0);
  return server / total;
}

/** Web-connected events NOT yet meaningfully covered by CAPI, ranked count. */
export function untappedEvents(p: Pixel): PixelEvent[] {
  return p.events.filter(e => {
    const total = e.webCount + e.serverCount;
    if (total === 0) return false;
    return e.serverCount / total < CAPI_SERVER_SHARE_TARGET;
  });
}

/**
 * Spend-weighted potential AR-lift for the pixel [0..~upside%]. Combines each
 * untapped event's documented potential lift with its spend share, so a
 * high-spend Purchase event with no CAPI coverage dominates the score.
 */
export function weightedPotentialLiftPct(p: Pixel): number {
  if (p.adopted) return 0;
  const gap = 1 - serverShare(p);
  const weighted = untappedEvents(p).reduce(
    (s, e) => s + e.spendShare * e.potentialAcrIncreasePct,
    0,
  );
  return weighted * gap;
}

/**
 * Projected annual AR upside in cents if the pixel's web events are connected
 * to CAPI. attributedSpend (30d) × 12 → annualised, × assumed ROAS → AR base,
 * × weighted potential lift %.
 */
export function projectedAnnualUpliftCents(p: Pixel): number {
  if (p.adopted) return 0;
  const annualisedSpend = p.attributedSpendCents * 12;
  const annualAr = annualisedSpend * ASSUMED_ROAS;
  return Math.round(annualAr * (weightedPotentialLiftPct(p) / 100));
}

/**
 * Opportunity score [0..100] used to rank the portfolio. Blends the projected
 * upside (log-scaled so a few whales don't flatten the rest) with the size of
 * the CAPI coverage gap. Adopted / already-connected pixels score 0.
 */
export function opportunityScore(p: Pixel): number {
  if (p.adopted || p.isUnavailable) return 0;
  const share = serverShare(p);
  if (share >= CAPI_SERVER_SHARE_TARGET) return 0;
  const uplift = projectedAnnualUpliftCents(p);
  // log-scale the dollar upside to 0..1 against a $1M/yr reference.
  const upliftNorm = Math.min(
    1,
    Math.log10(1 + dollars(uplift)) / Math.log10(1 + 1_000_000),
  );
  const gapNorm = Math.min(1, (1 - share) / CAPI_SERVER_SHARE_TARGET);
  return Math.round((upliftNorm * 0.7 + gapNorm * 0.3) * 100);
}

export function opportunityTier(p: Pixel): OpportunityTier {
  if (p.adopted || serverShare(p) >= CAPI_SERVER_SHARE_TARGET) {
    return 'connected';
  }
  const score = opportunityScore(p);
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * Concrete, spec-grounded reasons this pixel is an opportunity, derived only
 * from documented pixel-node / stats fields. Drives the recommendation copy.
 */
export function opportunityReasons(p: Pixel): string[] {
  const reasons: string[] = [];
  if (p.serverLastFiredTime == null) {
    reasons.push(
      'No server events ever received (server_last_fired_time is empty) — the pixel has no CAPI connection.',
    );
  } else if (serverShare(p) < CAPI_SERVER_SHARE_TARGET) {
    reasons.push(
      `Only ${Math.round(serverShare(p) * 100)}% of events arrive server-side — most conversions are browser-only and exposed to signal loss.`,
    );
  }
  const untapped = untappedEvents(p);
  if (untapped.length > 0) {
    const top = [...untapped].sort((a, b) => b.spendShare - a.spendShare)[0];
    reasons.push(
      `${top.eventName} is high-value but web-only — connecting it to CAPI is the largest single gain (+${top.potentialAcrIncreasePct}% AR on this event).`,
    );
  }
  if (!p.enableAutomaticMatching) {
    reasons.push(
      'Automatic Advanced Matching is off — enabling it alongside CAPI lifts match rates on the same events.',
    );
  }
  if (p.firstPartyCookieStatus === 'FIRST_PARTY_COOKIE_DISABLED') {
    reasons.push(
      'First-party cookies are disabled — enabling them improves browser-side coverage while CAPI is added.',
    );
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Portfolio sample data (business portfolio → adspixels).
// ---------------------------------------------------------------------------

export const BUSINESS_ID = '178842301994005';
export const BUSINESS_NAME = 'Meridian Media (agency portfolio)';

function ev(
  eventName: string,
  webCount: number,
  serverCount: number,
  spendShare: number,
  potentialAcrIncreasePct: number,
): PixelEvent {
  return {
    eventName,
    webCount,
    serverCount,
    spendShare,
    potentialAcrIncreasePct,
  };
}

export const PIXELS: Pixel[] = [
  {
    id: '629104457881320',
    name: 'Solstice Apparel Pixel',
    businessName: 'Solstice Apparel',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_ENABLED',
    enableAutomaticMatching: false,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    // Never fired server-side — no CAPI at all. Highest opportunity.
    serverLastFiredTime: undefined,
    attributedSpendCents: 84_500_00,
    currency: 'USD',
    connectedAccounts: [
      {id: '1029384756', name: 'Solstice — Prospecting'},
      {id: '1029384799', name: 'Solstice — Retargeting'},
    ],
    events: [
      ev('Purchase', 218_000, 0, 0.52, 14),
      ev('InitiateCheckout', 361_000, 0, 0.24, 9),
      ev('AddToCart', 640_000, 0, 0.14, 6),
      ev('ViewContent', 1_480_000, 0, 0.1, 3),
    ],
  },
  {
    id: '744920118203756',
    name: 'Harbor Financial Lead Pixel',
    businessName: 'Harbor Financial',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_DISABLED',
    enableAutomaticMatching: false,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    serverLastFiredTime: undefined,
    attributedSpendCents: 51_200_00,
    currency: 'USD',
    connectedAccounts: [{id: '2288104655', name: 'Harbor — Lead Gen'}],
    events: [
      ev('Lead', 96_000, 0, 0.58, 16),
      ev('CompleteRegistration', 42_000, 0, 0.27, 11),
      ev('ViewContent', 520_000, 0, 0.15, 3),
    ],
  },
  {
    id: '390218847556102',
    name: 'Vantage Home Pixel',
    businessName: 'Vantage Home',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_ENABLED',
    enableAutomaticMatching: true,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    // Partial CAPI — Purchase is server-side, but checkout funnel is still web-only.
    serverLastFiredTime: '2026-07-02',
    attributedSpendCents: 63_800_00,
    currency: 'USD',
    connectedAccounts: [
      {id: '3391847220', name: 'Vantage — ASC'},
      {id: '3391847266', name: 'Vantage — Catalog'},
    ],
    events: [
      ev('Purchase', 44_000, 128_000, 0.5, 8),
      ev('InitiateCheckout', 210_000, 12_000, 0.28, 10),
      ev('AddToCart', 480_000, 8_000, 0.14, 5),
      ev('ViewContent', 1_050_000, 6_000, 0.08, 2),
    ],
  },
  {
    id: '512670933418209',
    name: 'Northpeak Travel Pixel',
    businessName: 'Northpeak Travel',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_ENABLED',
    enableAutomaticMatching: true,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    serverLastFiredTime: undefined,
    attributedSpendCents: 27_400_00,
    currency: 'USD',
    connectedAccounts: [{id: '4471209388', name: 'Northpeak — Bookings'}],
    events: [
      ev('Purchase', 61_000, 0, 0.6, 12),
      ev('Search', 380_000, 0, 0.25, 5),
      ev('ViewContent', 720_000, 0, 0.15, 3),
    ],
  },
  {
    id: '885012477630914',
    name: 'Cinder Coffee Pixel',
    businessName: 'Cinder Coffee Co.',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_ENABLED',
    enableAutomaticMatching: true,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    // Small spend, partial CAPI — low-priority opportunity.
    serverLastFiredTime: '2026-07-01',
    attributedSpendCents: 6_300_00,
    currency: 'USD',
    connectedAccounts: [{id: '5590334177', name: 'Cinder — DTC'}],
    events: [
      ev('Purchase', 18_000, 21_000, 0.55, 6),
      ev('AddToCart', 74_000, 9_000, 0.3, 4),
      ev('ViewContent', 190_000, 4_000, 0.15, 2),
    ],
  },
  {
    id: '203955118874620',
    name: 'Lattice Health Pixel',
    businessName: 'Lattice Health',
    isUnavailable: false,
    dataUseSetting: 'ADVERTISER',
    firstPartyCookieStatus: 'FIRST_PARTY_COOKIE_ENABLED',
    enableAutomaticMatching: true,
    has1pPixelEvent: true,
    lastFiredTime: '2026-07-02',
    // Fully connected — appears as a "Connected" benchmark, no open opportunity.
    serverLastFiredTime: '2026-07-02',
    attributedSpendCents: 39_100_00,
    currency: 'USD',
    connectedAccounts: [{id: '6612880455', name: 'Lattice — Growth'}],
    events: [
      ev('Purchase', 22_000, 141_000, 0.5, 4),
      ev('Subscribe', 30_000, 96_000, 0.3, 3),
      ev('ViewContent', 120_000, 210_000, 0.2, 1),
    ],
  },
  {
    id: '470028193365741',
    name: 'Archive Pixel (unavailable)',
    businessName: 'Solstice Apparel',
    // is_unavailable=true → excluded from opportunity sizing per the build spec.
    isUnavailable: true,
    dataUseSetting: 'EMPTY',
    firstPartyCookieStatus: 'EMPTY',
    enableAutomaticMatching: false,
    has1pPixelEvent: false,
    lastFiredTime: '2025-11-14',
    serverLastFiredTime: undefined,
    attributedSpendCents: 0,
    currency: 'USD',
    connectedAccounts: [],
    events: [],
  },
];

/** Portfolio-level totals for the header KPIs. */
export interface PortfolioSummary {
  pixelCount: number;
  connectablePixels: number;
  openOpportunities: number;
  untappedSpendCents: number;
  projectedAnnualUpliftCents: number;
}

/** Active (available) pixels only — is_unavailable pixels are excluded. */
export function activePixels(pixels: Pixel[] = PIXELS): Pixel[] {
  return pixels.filter(p => !p.isUnavailable);
}

export function portfolioSummary(pixels: Pixel[] = PIXELS): PortfolioSummary {
  const active = activePixels(pixels);
  const open = active.filter(p => opportunityScore(p) > 0);
  return {
    pixelCount: pixels.length,
    connectablePixels: active.length,
    openOpportunities: open.length,
    untappedSpendCents: open.reduce(
      (s, p) => s + Math.round(p.attributedSpendCents * (1 - serverShare(p))),
      0,
    ),
    projectedAnnualUpliftCents: open.reduce(
      (s, p) => s + projectedAnnualUpliftCents(p),
      0,
    ),
  };
}

/** Pixels ranked by opportunity score (highest first). */
export function rankedByOpportunity(pixels: Pixel[] = PIXELS): Pixel[] {
  return [...activePixels(pixels)].sort(
    (a, b) => opportunityScore(b) - opportunityScore(a),
  );
}
