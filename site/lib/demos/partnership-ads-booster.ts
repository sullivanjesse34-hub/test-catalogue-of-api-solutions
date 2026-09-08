/**
 * Representative sample data for the Partnership Ads Booster demo.
 *
 * UI prototype only — mock data shaped after the APIs named in
 * docs/solutions/creators/partnership-ads-booster.md. No real Marketing API
 * calls are made. Field names mirror the documented APIs:
 *
 *   Partnership Ads API (branded content permissioning + advertisable media):
 *     - post-level signal:    <MEDIA_ID>?fields=has_permission_for_partnership_ad
 *     - account-level fetch:  <IG_ID>/branded_content_advertisable_medias
 *                             ?fields=…&only_fetch_allowlisted=true&media_relationship=OWNED|IS_TAGGED
 *     - new API (pre-Dec 2026 migration target):
 *         <BUSINESS_ID>/partnership-ads-advertisable-content
 *         ?content_types=…&ad_eligibilities=…&fields=partnership_info{permission_status,permission_type},
 *          ad_eligibility,organic_insights{…}&sort_by=…
 *     - gating fields:        ad_eligibility (AD_READY|INELIGIBLE|…),
 *                             partnership_info[].permission_status/permission_type,
 *                             eligibility_errors[]
 *   Ads API (create the ad from the media):
 *     - creative via source media:  act_<AD_ACCOUNT_ID>/adcreatives?source_instagram_media_id=<MEDIA_ID>
 *     - creative via ad code:       act_<AD_ACCOUNT_ID>/adcreatives?instagram_boost_post_access_token=<AD_CODE>
 *     - identity params:            object_id, instagram_branded_content{sponsor_id},
 *                                   facebook_branded_content{sponsor_page_id}, branded_content{ad_format}
 *     - IG-video edge case:         act_<AD_ACCOUNT_ID>/advideos?partnership_ad_ad_code=…&is_partnership_ad=true
 *     - create the ad:              act_<AD_ACCOUNT_ID>/ads
 */

// --- Documented developer-doc links (surfaced in the API console) ---------

export const DOC_PARTNERSHIP_ADS =
  'https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/partnership-ads/';
export const DOC_ADS_API =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/';

// --- Permissioning model --------------------------------------------------

/** Which permissioning route applies for a given creator relationship. */
export type PermissioningMode = 'post_level' | 'account_level';

/** media_relationship on the advertisable-media edge. */
export type MediaRelationship = 'OWNED' | 'IS_TAGGED';

/** partnership_info[].permission_status. */
export type PermissionStatus = 'GRANTED' | 'PENDING' | 'NOT_GRANTED';

/** partnership_info[].permission_type. */
export type PermissionType = 'POST_LEVEL' | 'ACCOUNT_LEVEL';

/** ad_eligibility on advertisable content. */
export type AdEligibility = 'AD_READY' | 'INELIGIBLE' | 'PENDING_REVIEW';

/** content_types filter on the advertisable-content edge. */
export type ContentType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REEL';

/** Visual theme for a creator's mock post imagery (demo-only). */
export type PostTheme = 'outdoors' | 'workshop' | 'food';

/**
 * branded_content.ad_format — identity strategy for the partnership ad.
 * 1 = creator identity only, 2 = brand identity only, 3 = both identities.
 */
export type AdFormat = 1 | 2 | 3;

export const AD_FORMAT_META: Record<
  AdFormat,
  {label: string; description: string}
> = {
  1: {
    label: 'Creator identity',
    description: 'Ad runs from the creator handle only.',
  },
  2: {
    label: 'Brand identity',
    description: 'Ad runs from the sponsor brand only.',
  },
  3: {
    label: 'Both identities',
    description: 'Ad co-attributed to creator and brand.',
  },
};

// --- Domain objects -------------------------------------------------------

/** Organic performance snapshot (organic_insights{…} on the new edge). */
export interface OrganicInsights {
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  /** Engagement rate as a fraction (0–1). */
  engagementRate: number;
}

/**
 * One advertisable branded-content media.
 * Combines the post-level signal, the new-API partnership_info/ad_eligibility,
 * and organic insights used to prioritise which posts to boost.
 */
export interface AdvertisableMedia {
  /** Instagram media ID. */
  id: string;
  /** Short human label for the demo (caption preview). */
  caption: string;
  /** content_types value. */
  contentType: ContentType;
  /** media_relationship — OWNED (brand's own tagged posts) vs IS_TAGGED. */
  mediaRelationship: MediaRelationship;
  /** Legacy post-level signal: has_permission_for_partnership_ad. */
  hasPermissionForPartnershipAd: boolean;
  /** partnership_info[].permission_status (new API). */
  permissionStatus: PermissionStatus;
  /** partnership_info[].permission_type (new API). */
  permissionType: PermissionType;
  /** ad_eligibility (new API). */
  adEligibility: AdEligibility;
  /** eligibility_errors[] — populated when not AD_READY. */
  eligibilityErrors: string[];
  /** instagram_branded_content.sponsor_id — the boosting brand's IG id. */
  sponsorId: string;
  organicInsights: OrganicInsights;
  /** Timestamp label for sort/display. */
  postedAt: string;
}

/** A creator whose branded content the brand can boost. */
export interface Creator {
  /** Instagram user id (<IG_ID> in the advertisable-media path). */
  igId: string;
  handle: string;
  displayName: string;
  followers: number;
  /** Visual theme for this creator's mock post imagery. */
  theme: PostTheme;
  /** Which permissioning route the brand has with this creator. */
  permissioningMode: PermissioningMode;
  /**
   * only_fetch_allowlisted state for account-level relationships — true means
   * the brand relies on the creator's allowlist rather than per-post approval.
   */
  onlyFetchAllowlisted: boolean;
  medias: AdvertisableMedia[];
}

// --- Boosting workflow ----------------------------------------------------

/** How the adcreative is created (spec step 3, Option 1 vs 2). */
export type CreativeSource = 'source_media_id' | 'ad_code';

/** Lifecycle of a boost job created by the demo. */
export type BoostStage =
  'creating_creative' | 'uploading_video' | 'creating_ad' | 'active' | 'error';

export interface BoostJob {
  id: string;
  mediaId: string;
  creatorHandle: string;
  caption: string;
  /** content_types value — drives the queue thumbnail. */
  contentType: ContentType;
  /** Creator's visual theme — drives the queue thumbnail imagery. */
  theme: PostTheme;
  adFormat: AdFormat;
  creativeSource: CreativeSource;
  /** Video posts need the advideos workaround (spec step 3 detail). */
  requiredVideoWorkaround: boolean;
  stage: BoostStage;
  /** Daily budget in minor units (cents). */
  dailyBudgetMinor: number;
  createdAt: string;
}

// --- Thresholds / helpers -------------------------------------------------

export const ELIGIBILITY_META: Record<
  AdEligibility,
  {label: string; colorVar: string}
> = {
  AD_READY: {label: 'Ad ready', colorVar: 'var(--green)'},
  PENDING_REVIEW: {label: 'Pending review', colorVar: 'var(--cat-measurement)'},
  INELIGIBLE: {label: 'Ineligible', colorVar: 'var(--rose)'},
};

export const PERMISSION_META: Record<
  PermissionStatus,
  {label: string; colorVar: string}
> = {
  GRANTED: {label: 'Granted', colorVar: 'var(--green)'},
  PENDING: {label: 'Pending', colorVar: 'var(--cat-measurement)'},
  NOT_GRANTED: {label: 'Not granted', colorVar: 'var(--rose)'},
};

/**
 * Boost gate — a media can be boosted only when it clears the documented
 * checks (build spec step 2): post-level signal true, empty eligibility_errors,
 * and, on the new API, ad_eligibility AD_READY + permission_status GRANTED.
 */
export function isBoostable(m: AdvertisableMedia): boolean {
  return (
    m.hasPermissionForPartnershipAd &&
    m.eligibilityErrors.length === 0 &&
    m.adEligibility === 'AD_READY' &&
    m.permissionStatus === 'GRANTED'
  );
}

/** Whether a media requires the IG-video → advideos upload workaround. */
export function needsVideoWorkaround(m: AdvertisableMedia): boolean {
  return m.contentType === 'VIDEO' || m.contentType === 'REEL';
}

/** Compact count formatting for reach/followers (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Minor-unit (cents) budget → display string, respecting the ÷100 rule. */
export function formatMinor(minor: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/**
 * Display handle for a media's boosting brand (instagram_branded_content
 * .sponsor_id) — used for the "Paid partnership with …" post label.
 */
export const SPONSOR_HANDLES: Record<string, string> = {
  '17841400000000900': '@summit.gear',
  '17841400000000901': '@forge.tools',
  '17841400000000902': '@castiron.kitchen',
};

export function sponsorHandle(m: AdvertisableMedia): string {
  return SPONSOR_HANDLES[m.sponsorId] ?? '@brand';
}

/** All medias across all creators (flattened for portfolio views). */
export function allMedias(creators: Creator[]): AdvertisableMedia[] {
  return creators.flatMap(c => c.medias);
}

/** Boostable-media count for a creator (drives the ranking). */
export function boostableCount(c: Creator): number {
  return c.medias.filter(isBoostable).length;
}

// --- Sample data ----------------------------------------------------------

export const CREATORS: Creator[] = [
  {
    igId: '17841401234567001',
    handle: '@maya.trails',
    displayName: 'Maya Trails',
    followers: 486000,
    theme: 'outdoors',
    permissioningMode: 'account_level',
    onlyFetchAllowlisted: true,
    medias: [
      {
        id: '18025500000000101',
        caption: 'Sunrise ridge hike in the new all-weather shell',
        contentType: 'REEL',
        mediaRelationship: 'IS_TAGGED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'ACCOUNT_LEVEL',
        adEligibility: 'AD_READY',
        eligibilityErrors: [],
        sponsorId: '17841400000000900',
        organicInsights: {
          reach: 512000,
          likes: 41200,
          comments: 1830,
          saves: 9600,
          engagementRate: 0.104,
        },
        postedAt: '2026-06-21',
      },
      {
        id: '18025500000000102',
        caption: 'Packing list: 3-day alpine loop',
        contentType: 'CAROUSEL',
        mediaRelationship: 'IS_TAGGED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'ACCOUNT_LEVEL',
        adEligibility: 'AD_READY',
        eligibilityErrors: [],
        sponsorId: '17841400000000900',
        organicInsights: {
          reach: 198000,
          likes: 15400,
          comments: 720,
          saves: 5200,
          engagementRate: 0.108,
        },
        postedAt: '2026-06-14',
      },
      {
        id: '18025500000000103',
        caption: 'Trailhead coffee ritual',
        contentType: 'IMAGE',
        mediaRelationship: 'IS_TAGGED',
        hasPermissionForPartnershipAd: false,
        permissionStatus: 'PENDING',
        permissionType: 'ACCOUNT_LEVEL',
        adEligibility: 'PENDING_REVIEW',
        eligibilityErrors: ['Creator has not confirmed the allowlist request.'],
        sponsorId: '17841400000000900',
        organicInsights: {
          reach: 88000,
          likes: 7100,
          comments: 260,
          saves: 1400,
          engagementRate: 0.099,
        },
        postedAt: '2026-06-09',
      },
    ],
  },
  {
    igId: '17841401234567002',
    handle: '@theo.builds',
    displayName: 'Theo Builds',
    followers: 212000,
    theme: 'workshop',
    permissioningMode: 'post_level',
    onlyFetchAllowlisted: false,
    medias: [
      {
        id: '18025500000000201',
        caption: 'Workshop tour + the cordless drill that survived a year',
        contentType: 'VIDEO',
        mediaRelationship: 'OWNED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'POST_LEVEL',
        adEligibility: 'AD_READY',
        eligibilityErrors: [],
        sponsorId: '17841400000000901',
        organicInsights: {
          reach: 244000,
          likes: 19800,
          comments: 1120,
          saves: 6300,
          engagementRate: 0.111,
        },
        postedAt: '2026-06-25',
      },
      {
        id: '18025500000000202',
        caption: 'Five joinery mistakes (I made #3 last week)',
        contentType: 'REEL',
        mediaRelationship: 'OWNED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'POST_LEVEL',
        adEligibility: 'AD_READY',
        eligibilityErrors: [],
        sponsorId: '17841400000000901',
        organicInsights: {
          reach: 176000,
          likes: 14200,
          comments: 640,
          saves: 4800,
          engagementRate: 0.11,
        },
        postedAt: '2026-06-18',
      },
      {
        id: '18025500000000203',
        caption: 'Shelf reveal (sponsored disclosure missing)',
        contentType: 'IMAGE',
        mediaRelationship: 'OWNED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'POST_LEVEL',
        adEligibility: 'INELIGIBLE',
        eligibilityErrors: [
          'Paid partnership label is not applied to this post.',
        ],
        sponsorId: '17841400000000901',
        organicInsights: {
          reach: 52000,
          likes: 4300,
          comments: 150,
          saves: 900,
          engagementRate: 0.102,
        },
        postedAt: '2026-06-11',
      },
    ],
  },
  {
    igId: '17841401234567003',
    handle: '@lina.eats',
    displayName: 'Lina Eats',
    followers: 738000,
    theme: 'food',
    permissioningMode: 'account_level',
    onlyFetchAllowlisted: true,
    medias: [
      {
        id: '18025500000000301',
        caption: 'One-pan weeknight dinner with the new skillet',
        contentType: 'REEL',
        mediaRelationship: 'IS_TAGGED',
        hasPermissionForPartnershipAd: true,
        permissionStatus: 'GRANTED',
        permissionType: 'ACCOUNT_LEVEL',
        adEligibility: 'AD_READY',
        eligibilityErrors: [],
        sponsorId: '17841400000000902',
        organicInsights: {
          reach: 902000,
          likes: 76500,
          comments: 3400,
          saves: 18900,
          engagementRate: 0.11,
        },
        postedAt: '2026-06-27',
      },
      {
        id: '18025500000000302',
        caption: 'Pantry restock haul',
        contentType: 'CAROUSEL',
        mediaRelationship: 'IS_TAGGED',
        hasPermissionForPartnershipAd: false,
        permissionStatus: 'NOT_GRANTED',
        permissionType: 'ACCOUNT_LEVEL',
        adEligibility: 'INELIGIBLE',
        eligibilityErrors: [
          'Creator revoked account-level partnership ad permission.',
        ],
        sponsorId: '17841400000000902',
        organicInsights: {
          reach: 145000,
          likes: 11200,
          comments: 430,
          saves: 3100,
          engagementRate: 0.102,
        },
        postedAt: '2026-06-20',
      },
    ],
  },
];
