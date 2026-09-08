'use client';

/**
 * Representative sample data for the AI Creative Enhancer dashboard.
 *
 * UI prototype only — mock data shaped after the Meta Marketing API
 * endpoints named in the solution spec. No real API calls are made.
 * Field names mirror the documented APIs:
 *   - Business Management API:    <BUSINESS_ID>/owned_ad_accounts, client_ad_accounts
 *   - Advantage+ Creative API:    degrees_of_freedom_spec.creative_features_spec
 *   - Ad Previews API:            <CREATIVE_ID>/previews, <AD_ID>/previews
 *   - Ads Performance Recs API:   recommendation type CREATIVE_LIMITED | CREATIVE_FATIGUE
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdStatus = 'active' | 'paused' | 'draft';

export interface AdCreative {
  id: string;
  name: string;
  adId: string;
  adName: string;
  campaignName: string;
  accountId: string;
  accountName: string;
  status: AdStatus;
  /** Placeholder colour for the mock thumbnail. */
  thumbnailPlaceholder: string;
}

export type FeatureCategory = 'ai' | 'standard';

export interface CreativeFeature {
  key: string;
  label: string;
  category: FeatureCategory;
  description: string;
  enrolled: boolean;
  eligible: boolean;
}

export type AdFormat =
  'MOBILE_FEED_STANDARD' | 'INSTAGRAM_REELS' | 'INSTAGRAM_STORY';

export interface AdPreview {
  format: AdFormat;
  featureKey: string;
  eligible: boolean;
  /** Mock preview HTML placeholder. */
  previewHtml: string;
}

export type RecommendationType = 'CREATIVE_LIMITED' | 'CREATIVE_FATIGUE';

export interface Recommendation {
  adId: string;
  type: RecommendationType;
  description: string;
}

// ---------------------------------------------------------------------------
// Feature catalogue (spec section 4)
// ---------------------------------------------------------------------------

export const FEATURE_CATALOGUE: Omit<
  CreativeFeature,
  'enrolled' | 'eligible'
>[] = [
  {
    key: 'image_background_gen',
    label: 'Image Background Generation',
    category: 'ai',
    description:
      'Generate alternative backgrounds for product images using AI.',
  },
  {
    key: 'image_expansion',
    label: 'Image Expansion',
    category: 'ai',
    description:
      'Expand image canvas beyond original boundaries to fit different placements using AI.',
  },
  {
    key: 'image_templates',
    label: 'Image Templates',
    category: 'standard',
    description: 'Apply visual templates and overlays to creative assets.',
  },
  {
    key: 'creative_stickers',
    label: 'Creative Stickers',
    category: 'ai',
    description:
      'Add AI-generated stickers and decorative elements to creatives.',
  },
  {
    key: 'translate_voiceover',
    label: 'Translate Voiceover',
    category: 'ai',
    description:
      'Translate and generate voiceovers for video creatives using AI.',
  },
  {
    key: 'text_optimizations',
    label: 'Text Optimizations',
    category: 'standard',
    description:
      'Automatically test and optimise headline and body text variations.',
  },
  {
    key: 'enhance_cta',
    label: 'Enhance CTA',
    category: 'standard',
    description:
      'Optimise call-to-action buttons for better click-through rates.',
  },
  {
    key: 'add_text_overlay',
    label: 'Add Text Overlay',
    category: 'standard',
    description:
      'Overlay text elements on creative images for additional messaging.',
  },
];

/** Look up feature metadata by key. */
export function featureMeta(key: string) {
  return FEATURE_CATALOGUE.find(f => f.key === key);
}

/** True when the feature category is AI. */
export function isAiFeature(key: string): boolean {
  return featureMeta(key)?.category === 'ai';
}

/** True when at least one enrolled feature in the list is AI-category. */
export function hasAiEnrolled(features: CreativeFeature[]): boolean {
  return features.some(f => f.enrolled && f.category === 'ai');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  MOBILE_FEED_STANDARD: 'Mobile Feed',
  INSTAGRAM_REELS: 'Instagram Reels',
  INSTAGRAM_STORY: 'Instagram Story',
};

export const STATUS_META: Record<AdStatus, {label: string; colorVar: string}> =
  {
    active: {label: 'Active', colorVar: 'var(--green)'},
    paused: {label: 'Paused', colorVar: 'var(--cat-measurement)'},
    draft: {label: 'Draft', colorVar: 'var(--ink-3)'},
  };

export const REC_META: Record<
  RecommendationType,
  {label: string; colorVar: string}
> = {
  CREATIVE_LIMITED: {
    label: 'Creative Limited',
    colorVar: 'var(--cat-measurement)',
  },
  CREATIVE_FATIGUE: {label: 'Creative Fatigue', colorVar: 'var(--rose)'},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function features(
  specs: Array<[key: string, enrolled: boolean, eligible: boolean]>,
): CreativeFeature[] {
  return specs.map(([key, enrolled, eligible]) => {
    const meta = featureMeta(key);
    if (!meta) throw new Error(`Unknown feature key: ${key}`);
    return {...meta, enrolled, eligible};
  });
}

function previews(featureKey: string, eligible: boolean): AdPreview[] {
  const formats: AdFormat[] = [
    'MOBILE_FEED_STANDARD',
    'INSTAGRAM_REELS',
    'INSTAGRAM_STORY',
  ];
  return formats.map(format => ({
    format,
    featureKey,
    eligible,
    previewHtml: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f0f0f0;color:#666;font-family:sans-serif;font-size:13px">${AD_FORMAT_LABELS[format]} &middot; ${featureKey}</div>`,
  }));
}

// ---------------------------------------------------------------------------
// Sample data — 8 ads across 4 accounts
// ---------------------------------------------------------------------------

export const ACCOUNTS = [
  {id: 'act_10001', name: 'Prism Agency'},
  {id: 'act_10002', name: 'Zenith Media'},
  {id: 'act_10003', name: 'Ember Studios'},
  {id: 'act_10004', name: 'Wavelength Digital'},
];

export const ADS: AdCreative[] = [
  {
    id: 'cr_5001',
    name: 'Summer Collection Hero',
    adId: 'ad_6001',
    adName: 'Summer Sale — Hero Video',
    campaignName: 'Summer 2025 Promo',
    accountId: 'act_10001',
    accountName: 'Prism Agency',
    status: 'active',
    thumbnailPlaceholder: 'var(--cat-creative)',
  },
  {
    id: 'cr_5002',
    name: 'Product Carousel A',
    adId: 'ad_6002',
    adName: 'Carousel — Bestsellers',
    campaignName: 'Summer 2025 Promo',
    accountId: 'act_10001',
    accountName: 'Prism Agency',
    status: 'paused',
    thumbnailPlaceholder: 'var(--brand)',
  },
  {
    id: 'cr_5003',
    name: 'Brand Awareness Video',
    adId: 'ad_6003',
    adName: 'Brand Story — 30s',
    campaignName: 'Brand Awareness Q3',
    accountId: 'act_10002',
    accountName: 'Zenith Media',
    status: 'active',
    thumbnailPlaceholder: 'var(--purple)',
  },
  {
    id: 'cr_5004',
    name: 'Retargeting Static',
    adId: 'ad_6004',
    adName: 'Retarget — Homepage Visitors',
    campaignName: 'Retargeting Always-On',
    accountId: 'act_10002',
    accountName: 'Zenith Media',
    status: 'active',
    thumbnailPlaceholder: 'var(--cat-signals)',
  },
  {
    id: 'cr_5005',
    name: 'App Install Reels',
    adId: 'ad_6005',
    adName: 'App Install — Reels',
    campaignName: 'App Growth',
    accountId: 'act_10003',
    accountName: 'Ember Studios',
    status: 'draft',
    thumbnailPlaceholder: 'var(--rose)',
  },
  {
    id: 'cr_5006',
    name: 'Holiday Teaser',
    adId: 'ad_6006',
    adName: 'Holiday Teaser — Static',
    campaignName: 'Holiday 2025',
    accountId: 'act_10003',
    accountName: 'Ember Studios',
    status: 'paused',
    thumbnailPlaceholder: 'var(--cat-measurement)',
  },
  {
    id: 'cr_5007',
    name: 'Lead Gen Form Ad',
    adId: 'ad_6007',
    adName: 'Lead Gen — Webinar Signup',
    campaignName: 'Lead Gen Webinar',
    accountId: 'act_10004',
    accountName: 'Wavelength Digital',
    status: 'active',
    thumbnailPlaceholder: 'var(--green)',
  },
  {
    id: 'cr_5008',
    name: 'DPA Catalog Feed',
    adId: 'ad_6008',
    adName: 'DPA — Full Catalog',
    campaignName: 'Dynamic Catalog',
    accountId: 'act_10004',
    accountName: 'Wavelength Digital',
    status: 'active',
    thumbnailPlaceholder: 'var(--cat-creative)',
  },
];

/** Per-ad feature enrollment states — varied to show different scenarios. */
export const AD_FEATURES: Record<string, CreativeFeature[]> = {
  ad_6001: features([
    ['image_background_gen', true, true],
    ['image_expansion', true, true],
    ['image_templates', false, true],
    ['creative_stickers', false, true],
    ['translate_voiceover', false, false],
    ['text_optimizations', true, true],
    ['enhance_cta', true, true],
    ['add_text_overlay', false, true],
  ]),
  ad_6002: features([
    ['image_background_gen', false, true],
    ['image_expansion', false, true],
    ['image_templates', false, true],
    ['creative_stickers', false, false],
    ['translate_voiceover', false, false],
    ['text_optimizations', true, true],
    ['enhance_cta', false, true],
    ['add_text_overlay', true, true],
  ]),
  ad_6003: features([
    ['image_background_gen', true, true],
    ['image_expansion', true, true],
    ['image_templates', true, true],
    ['creative_stickers', true, true],
    ['translate_voiceover', true, true],
    ['text_optimizations', true, true],
    ['enhance_cta', true, true],
    ['add_text_overlay', true, true],
  ]),
  ad_6004: features([
    ['image_background_gen', false, true],
    ['image_expansion', false, true],
    ['image_templates', false, false],
    ['creative_stickers', false, false],
    ['translate_voiceover', false, false],
    ['text_optimizations', false, true],
    ['enhance_cta', false, true],
    ['add_text_overlay', false, true],
  ]),
  ad_6005: features([
    ['image_background_gen', false, true],
    ['image_expansion', false, true],
    ['image_templates', false, true],
    ['creative_stickers', false, true],
    ['translate_voiceover', false, true],
    ['text_optimizations', false, true],
    ['enhance_cta', false, true],
    ['add_text_overlay', false, true],
  ]),
  ad_6006: features([
    ['image_background_gen', true, true],
    ['image_expansion', false, true],
    ['image_templates', false, false],
    ['creative_stickers', false, true],
    ['translate_voiceover', false, false],
    ['text_optimizations', true, true],
    ['enhance_cta', true, true],
    ['add_text_overlay', false, true],
  ]),
  ad_6007: features([
    ['image_background_gen', false, false],
    ['image_expansion', false, false],
    ['image_templates', false, false],
    ['creative_stickers', false, false],
    ['translate_voiceover', false, false],
    ['text_optimizations', true, true],
    ['enhance_cta', true, true],
    ['add_text_overlay', true, true],
  ]),
  ad_6008: features([
    ['image_background_gen', true, true],
    ['image_expansion', true, true],
    ['image_templates', true, true],
    ['creative_stickers', false, true],
    ['translate_voiceover', false, false],
    ['text_optimizations', true, true],
    ['enhance_cta', true, true],
    ['add_text_overlay', true, true],
  ]),
};

/** Per-ad mock previews — one set per enrolled feature. */
export const AD_PREVIEWS: Record<string, AdPreview[]> = Object.fromEntries(
  Object.entries(AD_FEATURES).map(([adId, feats]) => [
    adId,
    feats.flatMap(f => previews(f.key, f.eligible)),
  ]),
);

/** Performance recommendations from the Ads Performance Recommendations API. */
export const RECOMMENDATIONS: Recommendation[] = [
  {
    adId: 'ad_6002',
    type: 'CREATIVE_LIMITED',
    description:
      'This ad has limited creative diversity. Enable more Advantage+ Creative features to improve delivery.',
  },
  {
    adId: 'ad_6004',
    type: 'CREATIVE_FATIGUE',
    description:
      'Creative fatigue detected. Audience engagement is declining — refresh or enhance the creative.',
  },
  {
    adId: 'ad_6006',
    type: 'CREATIVE_LIMITED',
    description:
      'Creative variety is limited. Consider enabling additional AI features to expand creative options.',
  },
  {
    adId: 'ad_6007',
    type: 'CREATIVE_FATIGUE',
    description:
      'Creative performance has plateaued. Try enabling image enhancements to re-engage the audience.',
  },
];

/** Look up recommendations for an ad. */
export function adRecommendations(adId: string): Recommendation[] {
  return RECOMMENDATIONS.filter(r => r.adId === adId);
}

/** Count of enrolled features for an ad. */
export function enrolledCount(adId: string): number {
  return (AD_FEATURES[adId] ?? []).filter(f => f.enrolled).length;
}

/** Count of enrolled AI features for an ad. */
export function enrolledAiCount(adId: string): number {
  return (AD_FEATURES[adId] ?? []).filter(
    f => f.enrolled && f.category === 'ai',
  ).length;
}

/** Total feature count (always 8). */
export const TOTAL_FEATURES = FEATURE_CATALOGUE.length;
