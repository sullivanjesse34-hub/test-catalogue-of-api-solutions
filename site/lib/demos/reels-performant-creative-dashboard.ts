/**
 * Representative sample data for the Reels Performant Creative Dashboard.
 *
 * UI prototype only — mock data shaped after the Meta Marketing APIs named in
 * docs/solutions/creative/reels-performant-creative-dashboard.md. No real
 * Marketing API calls are made. Field names mirror the documented APIs:
 *   - Business Management API: <BUSINESS_ID>/owned_ad_accounts (& client_ad_accounts)
 *       — extract ad account IDs within and across businesses.
 *   - Insights API: act_<AD_ACCOUNT_ID>/insights?level=ad
 *       fields=impressions,ad_id  breakdowns=publisher_platform,platform_position
 *       filtering=[{publisher_platform ANY [instagram]},{platform_position IN [instagram_reels]}]
 *       (platform_position may be facebook_reels) — extract ad IDs using reels as a placement.
 *   - Advantage+ Creative API: creative features live in
 *       degrees_of_freedom_spec.creative_features_spec (video_auto_crop, adapt_to_placement);
 *       audio via asset_feed_spec.audios=[{type:'random'}]; applied by enroll_status OPT_IN/OPT_OUT.
 *   - Ads API: act_<AD_ACCOUNT_ID>/adcreatives + ad updates to launch/repurpose reels
 *       (object_id=<PAGE_ID>, instagram_user_id, source_instagram_media_id=<IG_MEDIA_ID>;
 *       ad set placement publisher_platforms=[instagram], instagram_positions=[reels]).
 *
 * Performant-reel definition (build spec): 9:16 aspect ratio, keep ~35% of the
 * bottom clear (safe zones), audio on, and video enabled.
 */

/** platform_position value driving the reels placement. */
export type ReelsPlacement = 'instagram_reels' | 'facebook_reels';

/** Advantage+ creative-feature enrolment state (enroll_status). */
export type EnrollStatus = 'OPT_IN' | 'OPT_OUT';

/** The four performance checks that define a "performant" reel. */
export type CheckKey = 'aspect_ratio' | 'safe_zone' | 'audio' | 'video';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export const CHECK_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--green)',
  warn: 'var(--cat-measurement)',
  fail: 'var(--rose)',
};

/** A single performant-creative check on one reel ad. */
export interface CreativeCheck {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  /** Short measured value, e.g. "9:16" or "22% bottom clear (goal 35%)". */
  detail: string;
  /** Which Advantage+ creative feature (or action) resolves a non-pass. */
  remediation?: string;
}

/**
 * The Advantage+ creative features an agency can opt into per the spec.
 * `video_auto_crop` + `adapt_to_placement` live in creative_features_spec;
 * `music` is opted in via asset_feed_spec.audios.
 */
export interface CreativeFeature {
  key: 'video_auto_crop' | 'adapt_to_placement' | 'music';
  label: string;
  /** Where the feature lives in the creative payload. */
  specPath: string;
  enrollStatus: EnrollStatus;
  description: string;
}

/** A reel ad surfaced from the Insights API reels-placement query. */
export interface ReelAd {
  /** ad_id from insights. */
  adId: string;
  name: string;
  /** platform_position the ad runs on. */
  placement: ReelsPlacement;
  /** effective_status reflects actual delivery (not the user-set status). */
  effectiveStatus: 'ACTIVE' | 'PAUSED' | 'WITH_ISSUES';
  /** impressions over the reporting window. */
  impressions: number;
  /** Whether the source media was a repurposed organic IG reel. */
  sourceInstagramMediaId?: string;
  /** Aspect ratio of the underlying video, e.g. "9:16" or "1:1". */
  aspectRatio: string;
  /** Percentage of the bottom of the frame kept clear of overlays. */
  bottomClearPct: number;
  /** Audio present & enabled on the creative. */
  audioOn: boolean;
  /** Video (vs. static/carousel) creative. */
  videoEnabled: boolean;
  features: CreativeFeature[];
}

/** An ad account discovered via the Business Management API. */
export interface AdAccount {
  /** Bare numeric ID (prefix with act_ for API paths). */
  id: string;
  name: string;
  /** owned_ad_accounts vs client_ad_accounts edge. */
  relationship: 'owned' | 'client';
  pageId: string;
  instagramUserId: string;
  ads: ReelAd[];
}

/** A business the agency manages (Business Management API root). */
export interface Business {
  id: string;
  name: string;
  accounts: AdAccount[];
}

// --- thresholds codified from the build spec ---

/** Keep ~35% of the bottom clear (safe zones). */
export const SAFE_ZONE_GOAL = 35;
/** The vertical aspect ratio reels require. */
export const TARGET_ASPECT = '9:16';

export const FEATURE_META: Record<
  CreativeFeature['key'],
  {label: string; specPath: string; description: string}
> = {
  video_auto_crop: {
    label: 'Video auto-crop',
    specPath: 'degrees_of_freedom_spec.creative_features_spec.video_auto_crop',
    description:
      'Automatically reframes the video to 9:16 and keeps subjects inside the safe zone.',
  },
  adapt_to_placement: {
    label: 'Adapt to placement',
    specPath:
      'degrees_of_freedom_spec.creative_features_spec.adapt_to_placement',
    description:
      'Adjusts the creative per placement so it renders correctly in the reels surface.',
  },
  music: {
    label: 'Music',
    specPath: "asset_feed_spec.audios=[{type:'random'}]",
    description:
      'Adds licensed background audio so the reel plays with sound on.',
  },
};

/** Compact count formatting for impression volumes (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function placementLabel(p: ReelsPlacement): string {
  return p === 'instagram_reels' ? 'Instagram Reels' : 'Facebook Reels';
}

// ---------------------------------------------------------------------------
// Performant-creative scoring. Each check derives only from documented fields
// and carries the Advantage+ feature (or action) that resolves it. (Build spec.)
// ---------------------------------------------------------------------------

export function reelChecks(ad: ReelAd): CreativeCheck[] {
  const aspectStatus: CheckStatus =
    ad.aspectRatio === TARGET_ASPECT ? 'pass' : 'fail';
  const safeStatus: CheckStatus =
    ad.bottomClearPct >= SAFE_ZONE_GOAL
      ? 'pass'
      : ad.bottomClearPct >= SAFE_ZONE_GOAL * 0.7
        ? 'warn'
        : 'fail';
  const audioStatus: CheckStatus = ad.audioOn ? 'pass' : 'fail';
  const videoStatus: CheckStatus = ad.videoEnabled ? 'pass' : 'fail';

  return [
    {
      key: 'aspect_ratio',
      label: 'Aspect ratio 9:16',
      status: aspectStatus,
      detail: ad.aspectRatio,
      remediation:
        aspectStatus === 'pass'
          ? undefined
          : 'Opt into video_auto_crop to reframe the video to a vertical 9:16.',
    },
    {
      key: 'safe_zone',
      label: 'Bottom safe zone',
      status: safeStatus,
      detail: `${ad.bottomClearPct}% clear (goal ${SAFE_ZONE_GOAL}%)`,
      remediation:
        safeStatus === 'pass'
          ? undefined
          : 'Opt into adapt_to_placement so overlays stay out of the bottom 35%.',
    },
    {
      key: 'audio',
      label: 'Audio on',
      status: audioStatus,
      detail: ad.audioOn ? 'enabled' : 'muted',
      remediation:
        audioStatus === 'pass'
          ? undefined
          : "Opt into music via asset_feed_spec.audios=[{type:'random'}].",
    },
    {
      key: 'video',
      label: 'Video enabled',
      status: videoStatus,
      detail: ad.videoEnabled ? 'video' : 'static',
      remediation:
        videoStatus === 'pass'
          ? undefined
          : 'Rebuild the ad as a reels video creative from a source_instagram_media_id.',
    },
  ];
}

/** Performance score 0–100: share of passing checks (warn = half credit). */
export function reelScore(ad: ReelAd): number {
  const checks = reelChecks(ad);
  const points = checks.reduce(
    (s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0),
    0,
  );
  return Math.round((points / checks.length) * 100);
}

export type ScoreBand = 'performant' | 'partial' | 'lacking';

export function scoreBand(score: number): ScoreBand {
  if (score >= 100) return 'performant';
  if (score >= 50) return 'partial';
  return 'lacking';
}

export const BAND_META: Record<ScoreBand, {label: string; colorVar: string}> = {
  performant: {label: 'Performant', colorVar: 'var(--green)'},
  partial: {label: 'Partial', colorVar: 'var(--cat-measurement)'},
  lacking: {label: 'Lacking', colorVar: 'var(--rose)'},
};

/** Count of non-passing checks on a reel (used for prioritisation). */
export function openIssueCount(ad: ReelAd): number {
  return reelChecks(ad).filter(c => c.status !== 'pass').length;
}

/** All reel ads across every account/business, flattened. */
export function allReels(businesses: Business[]): ReelAd[] {
  return businesses.flatMap(b => b.accounts.flatMap(a => a.ads));
}

/** The account that owns a given reel ad. */
export function accountForAd(
  businesses: Business[],
  adId: string,
): AdAccount | undefined {
  for (const b of businesses) {
    for (const a of b.accounts) {
      if (a.ads.some(ad => ad.adId === adId)) return a;
    }
  }
  return undefined;
}

function feature(
  key: CreativeFeature['key'],
  enrollStatus: EnrollStatus,
): CreativeFeature {
  const meta = FEATURE_META[key];
  return {
    key,
    label: meta.label,
    specPath: meta.specPath,
    description: meta.description,
    enrollStatus,
  };
}

export const BUSINESSES: Business[] = [
  {
    id: '178204553120097',
    name: 'Northwind Retail Group',
    accounts: [
      {
        id: '1024785596',
        name: 'Northwind — Brand',
        relationship: 'owned',
        pageId: '90128455771230',
        instagramUserId: '17841400000000001',
        ads: [
          {
            adId: '6301122840',
            name: 'Spring Drop — Hero Reel',
            placement: 'instagram_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 1_820_000,
            sourceInstagramMediaId: '17920011122200011',
            aspectRatio: '9:16',
            bottomClearPct: 41,
            audioOn: true,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_IN'),
              feature('music', 'OPT_IN'),
            ],
          },
          {
            adId: '6301122841',
            name: 'Everyday Basics — UGC',
            placement: 'instagram_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 940_000,
            aspectRatio: '4:5',
            bottomClearPct: 24,
            audioOn: true,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_OUT'),
              feature('adapt_to_placement', 'OPT_OUT'),
              feature('music', 'OPT_IN'),
            ],
          },
          {
            adId: '6301122842',
            name: 'Clearance — Static Promo',
            placement: 'facebook_reels',
            effectiveStatus: 'WITH_ISSUES',
            impressions: 310_000,
            aspectRatio: '1:1',
            bottomClearPct: 12,
            audioOn: false,
            videoEnabled: false,
            features: [
              feature('video_auto_crop', 'OPT_OUT'),
              feature('adapt_to_placement', 'OPT_OUT'),
              feature('music', 'OPT_OUT'),
            ],
          },
        ],
      },
      {
        id: '1024785612',
        name: 'Northwind — Outlet',
        relationship: 'owned',
        pageId: '90128455771244',
        instagramUserId: '17841400000000002',
        ads: [
          {
            adId: '6302553019',
            name: 'Weekend Flash — Reel',
            placement: 'instagram_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 560_000,
            sourceInstagramMediaId: '17920011122200044',
            aspectRatio: '9:16',
            bottomClearPct: 28,
            audioOn: true,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_OUT'),
              feature('music', 'OPT_IN'),
            ],
          },
          {
            adId: '6302553020',
            name: 'Loyalty Signup — Reel',
            placement: 'instagram_reels',
            effectiveStatus: 'PAUSED',
            impressions: 88_000,
            aspectRatio: '9:16',
            bottomClearPct: 38,
            audioOn: false,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_IN'),
              feature('music', 'OPT_OUT'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: '178204553120210',
    name: 'Lumen Skincare (Client)',
    accounts: [
      {
        id: '2298471003',
        name: 'Lumen — DTC',
        relationship: 'client',
        pageId: '90128455780055',
        instagramUserId: '17841400000000010',
        ads: [
          {
            adId: '6410098771',
            name: 'Glow Serum — Tutorial Reel',
            placement: 'instagram_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 2_240_000,
            sourceInstagramMediaId: '17920099988800077',
            aspectRatio: '9:16',
            bottomClearPct: 47,
            audioOn: true,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_IN'),
              feature('music', 'OPT_IN'),
            ],
          },
          {
            adId: '6410098772',
            name: 'Bundle Offer — Reel',
            placement: 'instagram_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 1_120_000,
            aspectRatio: '9:16',
            bottomClearPct: 19,
            audioOn: true,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_OUT'),
              feature('music', 'OPT_IN'),
            ],
          },
          {
            adId: '6410098773',
            name: 'Founder Story — Repurpose',
            placement: 'facebook_reels',
            effectiveStatus: 'ACTIVE',
            impressions: 430_000,
            sourceInstagramMediaId: '17920099988800099',
            aspectRatio: '9:16',
            bottomClearPct: 33,
            audioOn: false,
            videoEnabled: true,
            features: [
              feature('video_auto_crop', 'OPT_IN'),
              feature('adapt_to_placement', 'OPT_IN'),
              feature('music', 'OPT_OUT'),
            ],
          },
        ],
      },
    ],
  },
];
