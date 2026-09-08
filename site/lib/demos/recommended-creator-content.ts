/**
 * Representative sample data for the Recommended Creator Content demo.
 *
 * UI prototype only — mock data shaped like the Partnership Ads API's
 * recommended-creator-content flow. Reads are modelled on
 * `<IG_ID>/branded_content_advertisable_medias?only_fetch_recommended_content=true`
 * (fields: id, permalink, owner_id, eligibility_errors,
 * has_permission_for_partnership_ad, recommended_campaign_objectives); the boost
 * write is modelled on `act_<AD_ACCOUNT_ID>/adcreatives` → `act_<…>/ads`.
 * No real Marketing API calls. See
 * docs/solutions/creators/recommended-creator-content.md.
 */

/**
 * `recommended_campaign_objectives` values the recommendation API returns per
 * media (ODAX outcome objectives), as documented for boost-existing-post.
 */
export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION';

export const OBJECTIVE_LABEL: Record<CampaignObjective, string> = {
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Sales',
  OUTCOME_APP_PROMOTION: 'App promotion',
};

/**
 * Documented `eligibility_errors` an advertisable media can carry. When
 * non-empty the media cannot be boosted into a partnership ad.
 */
export type EligibilityError =
  | 'NO_PARTNERSHIP_AD_PERMISSION'
  | 'MEDIA_OLDER_THAN_60_DAYS'
  | 'MISSING_PAID_PARTNERSHIP_LABEL'
  | 'MEDIA_TYPE_NOT_SUPPORTED';

export const ELIGIBILITY_ERROR_LABEL: Record<EligibilityError, string> = {
  NO_PARTNERSHIP_AD_PERMISSION:
    'Creator has not granted partnership-ad permission',
  MEDIA_OLDER_THAN_60_DAYS: 'Media is older than 60 days',
  MISSING_PAID_PARTNERSHIP_LABEL: 'Post is missing the paid-partnership label',
  MEDIA_TYPE_NOT_SUPPORTED: 'Media type is not supported for boosting',
};

export type MediaFormat = 'REELS' | 'FEED' | 'STORY';

export const MEDIA_FORMAT_LABEL: Record<MediaFormat, string> = {
  REELS: 'Reel',
  FEED: 'Feed post',
  STORY: 'Story',
};

/**
 * One recommended advertisable media — mirrors a `data[]` node from
 * `branded_content_advertisable_medias`. Organic-insight metrics are the
 * signal Meta ranks the recommendation on; they are illustrative here.
 */
export interface RecommendedMedia {
  /** `id` — the Instagram media (post) ID. */
  id: string;
  /** `permalink` — the public post URL. */
  permalink: string;
  /** `owner_id` — the creator's Instagram account ID. */
  ownerId: string;
  creatorHandle: string;
  format: MediaFormat;
  caption: string;
  postedDaysAgo: number;
  /** `has_permission_for_partnership_ad` — required true to boost. */
  hasPermissionForPartnershipAd: boolean;
  /** `eligibility_errors` — empty when the media can be boosted. */
  eligibilityErrors: EligibilityError[];
  /** `recommended_campaign_objectives` — Meta's suggested objectives. */
  recommendedCampaignObjectives: CampaignObjective[];
  /** Organic engagement signals behind the recommendation. */
  organicReach: number;
  organicEngagements: number;
  engagementRate: number;
}

export interface Advertiser {
  /** The advertiser's ad account ID (used with the `act_` prefix in calls). */
  adAccountId: string;
  name: string;
  /** `<IG_ID>` — the advertiser's Instagram account ID used for the read. */
  instagramId: string;
  /** `object_id` — the advertiser's (brand) Facebook Page ID. */
  brandPageId: string;
  currency: string;
  media: RecommendedMedia[];
}

/** True when a media passes both documented gates for boosting. */
export function isBoostable(media: RecommendedMedia): boolean {
  return (
    media.hasPermissionForPartnershipAd && media.eligibilityErrors.length === 0
  );
}

/** The recommended objective a boost should default to (first suggested). */
export function primaryObjective(
  media: RecommendedMedia,
): CampaignObjective | undefined {
  return media.recommendedCampaignObjectives[0];
}

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

/** Compact number for display (12_400 → "12.4k"). */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Format a minor-unit (cents) amount for display, respecting currency. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

function media(m: RecommendedMedia): RecommendedMedia {
  return m;
}

export const ADVERTISERS: Advertiser[] = [
  {
    adAccountId: '4021547788',
    name: 'Lumen Skincare',
    instagramId: '17841400012345',
    brandPageId: '102938475610',
    currency: 'USD',
    media: [
      media({
        id: '18009988776655',
        permalink: 'https://www.instagram.com/p/Cx1LumGlow/',
        ownerId: '17841409876001',
        creatorHandle: '@maya.skincoach',
        format: 'REELS',
        caption: 'My 3-step morning routine with the new Glow Serum ✨',
        postedDaysAgo: 6,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: ['OUTCOME_ENGAGEMENT', 'OUTCOME_SALES'],
        organicReach: 184000,
        organicEngagements: 21400,
        engagementRate: 11.6,
      }),
      media({
        id: '18009988776656',
        permalink: 'https://www.instagram.com/p/Cx2Serum/',
        ownerId: '17841409876002',
        creatorHandle: '@derm.with.dana',
        format: 'FEED',
        caption: 'Dermatologist reacts: is the hype real? (paid partnership)',
        postedDaysAgo: 12,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: [
          'OUTCOME_TRAFFIC',
          'OUTCOME_ENGAGEMENT',
        ],
        organicReach: 96500,
        organicEngagements: 8300,
        engagementRate: 8.6,
      }),
      media({
        id: '18009988776657',
        permalink: 'https://www.instagram.com/p/Cx3Night/',
        ownerId: '17841409876003',
        creatorHandle: '@nightcare.co',
        format: 'REELS',
        caption: 'Unboxing + first impressions of the night cream',
        postedDaysAgo: 4,
        hasPermissionForPartnershipAd: false,
        eligibilityErrors: ['NO_PARTNERSHIP_AD_PERMISSION'],
        recommendedCampaignObjectives: ['OUTCOME_ENGAGEMENT'],
        organicReach: 63200,
        organicEngagements: 5100,
        engagementRate: 8.1,
      }),
      media({
        id: '18009988776658',
        permalink: 'https://www.instagram.com/p/Cx4Glow/',
        ownerId: '17841409876001',
        creatorHandle: '@maya.skincoach',
        format: 'STORY',
        caption: 'Quick GRWM using the Glow Serum before an event',
        postedDaysAgo: 71,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: ['MEDIA_OLDER_THAN_60_DAYS'],
        recommendedCampaignObjectives: ['OUTCOME_TRAFFIC'],
        organicReach: 44100,
        organicEngagements: 3900,
        engagementRate: 8.8,
      }),
    ],
  },
  {
    adAccountId: '7798452310',
    name: 'Northwind Outdoors',
    instagramId: '17841400054321',
    brandPageId: '102938475622',
    currency: 'USD',
    media: [
      media({
        id: '18009911223344',
        permalink: 'https://www.instagram.com/p/Cy1Trail/',
        ownerId: '17841409876010',
        creatorHandle: '@trailrunner.sam',
        format: 'REELS',
        caption: 'Tested the new trail pack on a 40k ultra — full review',
        postedDaysAgo: 9,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: ['OUTCOME_SALES', 'OUTCOME_TRAFFIC'],
        organicReach: 210300,
        organicEngagements: 27600,
        engagementRate: 13.1,
      }),
      media({
        id: '18009911223345',
        permalink: 'https://www.instagram.com/p/Cy2Camp/',
        ownerId: '17841409876011',
        creatorHandle: '@camp.with.kira',
        format: 'FEED',
        caption: '5 pieces of kit that survived a week in the backcountry',
        postedDaysAgo: 21,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: [
          'OUTCOME_ENGAGEMENT',
          'OUTCOME_TRAFFIC',
        ],
        organicReach: 88700,
        organicEngagements: 7200,
        engagementRate: 8.1,
      }),
      media({
        id: '18009911223346',
        permalink: 'https://www.instagram.com/p/Cy3Fire/',
        ownerId: '17841409876012',
        creatorHandle: '@offgrid.diaries',
        format: 'REELS',
        caption: 'POV: setting up camp at 2,000m',
        postedDaysAgo: 15,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: ['MISSING_PAID_PARTNERSHIP_LABEL'],
        recommendedCampaignObjectives: ['OUTCOME_ENGAGEMENT'],
        organicReach: 71400,
        organicEngagements: 6600,
        engagementRate: 9.2,
      }),
    ],
  },
  {
    adAccountId: '1130984472',
    name: 'Saffron Kitchen',
    instagramId: '17841400099887',
    brandPageId: '102938475633',
    currency: 'GBP',
    media: [
      media({
        id: '18009900112233',
        permalink: 'https://www.instagram.com/p/Cz1Curry/',
        ownerId: '17841409876020',
        creatorHandle: '@spice.and.slice',
        format: 'REELS',
        caption: '15-minute weeknight curry using the new spice kit',
        postedDaysAgo: 3,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: ['OUTCOME_ENGAGEMENT', 'OUTCOME_SALES'],
        organicReach: 132500,
        organicEngagements: 18900,
        engagementRate: 14.3,
      }),
      media({
        id: '18009900112234',
        permalink: 'https://www.instagram.com/p/Cz2Meal/',
        ownerId: '17841409876021',
        creatorHandle: '@batchcook.ben',
        format: 'FEED',
        caption: 'Sunday meal prep, sponsored edition',
        postedDaysAgo: 27,
        hasPermissionForPartnershipAd: true,
        eligibilityErrors: [],
        recommendedCampaignObjectives: ['OUTCOME_TRAFFIC'],
        organicReach: 54800,
        organicEngagements: 4100,
        engagementRate: 7.5,
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Boost identity — the `branded_content` ad_format the adcreatives POST takes.
// ---------------------------------------------------------------------------

/** `branded_content.ad_format` — how the sponsor/creator identities are shown. */
export type AdFormat = 1 | 2 | 3;

export const AD_FORMAT_LABEL: Record<AdFormat, string> = {
  1: 'Dual identity',
  2: 'First identity only',
  3: 'Auto-optimise identity',
};

export const AD_FORMAT_ORDER: AdFormat[] = [1, 2, 3];

// ---------------------------------------------------------------------------
// Portfolio rollups — read-only aggregates across advertisers.
// ---------------------------------------------------------------------------

export interface PortfolioTotals {
  advertisers: number;
  recommended: number;
  boostable: number;
  blocked: number;
  reach: number;
}

export function portfolioTotals(advertisers: Advertiser[]): PortfolioTotals {
  let recommended = 0;
  let boostable = 0;
  let blocked = 0;
  let reach = 0;
  for (const adv of advertisers) {
    for (const m of adv.media) {
      recommended += 1;
      reach += m.organicReach;
      if (isBoostable(m)) boostable += 1;
      else blocked += 1;
    }
  }
  return {
    advertisers: advertisers.length,
    recommended,
    boostable,
    blocked,
    reach,
  };
}

/** Count of each documented eligibility error across the portfolio. */
export function blockerBreakdown(
  advertisers: Advertiser[],
): Array<{error: EligibilityError; count: number}> {
  const counts = new Map<EligibilityError, number>();
  for (const adv of advertisers) {
    for (const m of adv.media) {
      for (const e of m.eligibilityErrors) {
        counts.set(e, (counts.get(e) ?? 0) + 1);
      }
    }
  }
  return (Object.keys(ELIGIBILITY_ERROR_LABEL) as EligibilityError[])
    .map(error => ({error, count: counts.get(error) ?? 0}))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Distribution of recommended objectives across all boostable media. */
export function objectiveDistribution(
  advertisers: Advertiser[],
): Array<{objective: CampaignObjective; count: number}> {
  const counts = new Map<CampaignObjective, number>();
  for (const adv of advertisers) {
    for (const m of adv.media) {
      if (!isBoostable(m)) continue;
      const obj = primaryObjective(m);
      if (obj) counts.set(obj, (counts.get(obj) ?? 0) + 1);
    }
  }
  return (Object.keys(OBJECTIVE_LABEL) as CampaignObjective[])
    .map(objective => ({objective, count: counts.get(objective) ?? 0}))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count);
}
