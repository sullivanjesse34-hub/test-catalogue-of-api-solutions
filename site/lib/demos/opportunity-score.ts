/**
 * Representative sample data for the Opportunity Score Dashboard.
 *
 * UI prototype only — mock data shaped like the Performance Recommendations API
 * (opportunity_score, recommendations) and the `/opportunity_score_history`
 * endpoint (date, opportunity_score, changelog). No real Marketing API calls.
 * Money is held in minor units (cents) per the API convention; divide by 100
 * for display. See docs/solutions/foundational/opportunity-score-dashboard.md.
 */

export type RecLevel = 'campaign' | 'ad_set' | 'ad' | 'ad_account';

export type RecType =
  | 'ADVANTAGE_PLUS_AUDIENCE'
  | 'AUTOMATIC_PLACEMENTS'
  | 'CREATIVE_FATIGUE'
  | 'SCALE_GOOD_CAMPAIGN'
  | 'MUSIC'
  | 'PERFORMANT_CREATIVE_REELS_OPT_IN'
  | 'SIGNALS_GROWTH_CAPI_V2'
  | 'BACKGROUND_GENERATION';

export type ApplyMode = 'one_click' | 'ads_manager';

export interface Recommendation {
  id: string;
  type: RecType;
  level: RecLevel;
  title: string;
  body: string;
  /** opportunity_score_lift — points this adds to the account score. */
  scoreLift: number;
  /** lift_estimate — human-readable performance estimate. */
  liftEstimate: string;
  /** The campaign / ad set / ad this applies to. */
  objectName: string;
  applyMode: ApplyMode;
  /** Graph API call used to adopt the recommendation. */
  endpoint: string;
  /** type-specific extra_data payload sent with a one-click apply. */
  extraData: string;
}

export type AdObjectType = 'campaign' | 'ad_set' | 'ad';

/**
 * Per-ad-object detail inside a changelog entry — mirrors the
 * `campaign_details[]` shape returned by `/opportunity_score_history`
 * (with `get_reason=true`). Budgets are minor units (cents); recommendation
 * types are the API's lowercase tokens (see REC_TYPE_TOKEN).
 */
export interface OSCampaignDetail {
  adObjectId: string;
  adObjectType: AdObjectType;
  budgetThen?: number;
  budgetNow?: number;
  appliedRecommendationTypesThen: string[];
  appliedRecommendationTypesNow: string[];
}

/** One `changelog[]` entry: a campaign's signed contribution to the day's score move. */
export interface OSChangelogItem {
  campaignId: string;
  /** The API returns campaign_id only; a tool resolves the display name. */
  campaignName: string;
  /** score_change — signed delta attributable to this campaign. */
  scoreChange: number;
  campaignDetails: OSCampaignDetail[];
}

/**
 * One day of `/opportunity_score_history`. `changelog` is populated only when
 * `get_reason=true`, and is empty on days with no change. This is the exact
 * field set the endpoint returns — the UI derives a human summary from it and
 * never invents narrative outside these fields.
 */
export interface ScorePoint {
  date: string;
  score: number;
  changelog: OSChangelogItem[];
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  opportunityScore: number;
  /** opportunity_score 30 days ago, for the trend delta. */
  prevScore: number;
  /** account insights (last 30 days). */
  spendCents: number;
  conversions: number;
  cpaCents: number;
  roas: number;
  history: ScorePoint[];
  recommendations: Recommendation[];
}

export const REC_TYPE_LABEL: Record<RecType, string> = {
  ADVANTAGE_PLUS_AUDIENCE: 'Advantage+ audience',
  AUTOMATIC_PLACEMENTS: 'Advantage+ placements',
  CREATIVE_FATIGUE: 'Refresh fatigued creative',
  SCALE_GOOD_CAMPAIGN: 'Scale a winning campaign',
  MUSIC: 'Add music to Reels ads',
  PERFORMANT_CREATIVE_REELS_OPT_IN: 'Reels-optimized creative',
  SIGNALS_GROWTH_CAPI_V2: 'Strengthen signals with CAPI',
  BACKGROUND_GENERATION: 'Generative backgrounds',
};

export const LEVEL_LABEL: Record<RecLevel, string> = {
  campaign: 'Campaign',
  ad_set: 'Ad set',
  ad: 'Ad',
  ad_account: 'Account',
};

export type ScoreBand = 'low' | 'mid' | 'high';

export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

export const BAND_META: Record<ScoreBand, {label: string; colorVar: string}> = {
  high: {label: 'Strong', colorVar: 'var(--green)'},
  mid: {label: 'On track', colorVar: 'var(--yellow)'},
  low: {label: 'Needs attention', colorVar: 'var(--rose)'},
};

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

/** Format a minor-unit (cents) amount for display, respecting account currency. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

/** Our RecType enum → the API's lowercase recommendation_type tokens. */
export const REC_TYPE_TOKEN: Record<RecType, string> = {
  ADVANTAGE_PLUS_AUDIENCE: 'advantage_plus_audience',
  AUTOMATIC_PLACEMENTS: 'automatic_placements',
  CREATIVE_FATIGUE: 'creative_fatigue',
  SCALE_GOOD_CAMPAIGN: 'scale_good_campaign',
  MUSIC: 'music',
  PERFORMANT_CREATIVE_REELS_OPT_IN: 'performant_creative_reels_opt_in',
  SIGNALS_GROWTH_CAPI_V2: 'signals_growth_capi_v2',
  BACKGROUND_GENERATION: 'background_generation',
};

const TOKEN_LABEL: Record<string, string> = Object.fromEntries(
  (Object.keys(REC_TYPE_TOKEN) as RecType[]).map(t => [
    REC_TYPE_TOKEN[t],
    REC_TYPE_LABEL[t],
  ]),
);

/** Humanize an API recommendation_type token (falls back to the raw token). */
export function recTokenLabel(token: string): string {
  return TOKEN_LABEL[token] ?? token;
}

// --- changelog seed helpers (keep the ACCOUNTS data readable) ---

function det(
  adObjectType: AdObjectType,
  opts: {
    adObjectId?: string;
    appliedThen?: RecType[];
    appliedNow?: RecType[];
    budgetThen?: number;
    budgetNow?: number;
  } = {},
): OSCampaignDetail {
  return {
    adObjectId: opts.adObjectId ?? '0',
    adObjectType,
    budgetThen: opts.budgetThen,
    budgetNow: opts.budgetNow,
    appliedRecommendationTypesThen: (opts.appliedThen ?? []).map(
      t => REC_TYPE_TOKEN[t],
    ),
    appliedRecommendationTypesNow: (opts.appliedNow ?? []).map(
      t => REC_TYPE_TOKEN[t],
    ),
  };
}

function chg(
  campaignId: string,
  campaignName: string,
  scoreChange: number,
  campaignDetails: OSCampaignDetail[],
): OSChangelogItem {
  return {campaignId, campaignName, scoreChange, campaignDetails};
}

function day(
  date: string,
  score: number,
  changelog: OSChangelogItem[] = [],
): ScorePoint {
  return {date, score, changelog};
}

const APPLY_ENDPOINT = (id: string) => `POST act_${id}/recommendations`;

export const ACCOUNTS: AdAccount[] = [
  {
    id: '4021547788',
    name: 'Northwind Retail',
    currency: 'USD',
    opportunityScore: 62,
    prevScore: 54,
    spendCents: 4820000,
    conversions: 1840,
    cpaCents: 2620,
    roas: 3.4,
    history: [
      day('2026-05-04', 51),
      day('2026-05-18', 54, [
        chg('cmp_nw_01', 'Spring Prospecting', 3, [
          det('ad_set', {
            adObjectId: '238450',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
      day('2026-06-01', 58, [
        chg('cmp_nw_02', 'Trail Gear — Feed Only', 4, [
          det('ad_set', {
            adObjectId: '238451',
            appliedNow: ['AUTOMATIC_PLACEMENTS'],
          }),
        ]),
      ]),
      day('2026-06-15', 57, [
        chg('cmp_nw_03', 'Always-On Retargeting', -1, [
          det('campaign', {
            adObjectId: '615570',
            budgetThen: 120000,
            budgetNow: 110000,
          }),
        ]),
      ]),
      day('2026-06-22', 62, [
        chg('cmp_nw_04', 'Hero Video — May', 5, [
          det('ad', {adObjectId: '991201', appliedNow: ['CREATIVE_FATIGUE']}),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'nw-1',
        type: 'ADVANTAGE_PLUS_AUDIENCE',
        level: 'ad_set',
        title: REC_TYPE_LABEL.ADVANTAGE_PLUS_AUDIENCE,
        body: "Let Meta's AI find high-intent buyers beyond your saved audience on the Spring Prospecting ad set.",
        scoreLift: 7,
        liftEstimate: '+9% est. conversions',
        objectName: 'Spring Prospecting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('4021547788'),
        extraData: '{}',
      },
      {
        id: 'nw-2',
        type: 'SCALE_GOOD_CAMPAIGN',
        level: 'campaign',
        title: REC_TYPE_LABEL.SCALE_GOOD_CAMPAIGN,
        body: 'Always-On Retargeting has beaten its cost goal for 14 days. Raise daily budget by 20% to capture more conversions.',
        scoreLift: 6,
        liftEstimate: '+12% est. purchases',
        objectName: 'Always-On Retargeting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('4021547788'),
        extraData:
          '{"campaigns":"[{\\"ad_object_id\\":\\"615570\\",\\"additional_budget\\":24000}]"}',
      },
      {
        id: 'nw-3',
        type: 'CREATIVE_FATIGUE',
        level: 'ad',
        title: REC_TYPE_LABEL.CREATIVE_FATIGUE,
        body: 'Frequency on the top hero video is climbing while CTR drops. Rotate in fresh creative to recover efficiency.',
        scoreLift: 4,
        liftEstimate: '+5% est. CTR',
        objectName: 'Hero Video — May',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('4021547788'),
        extraData: '{"object_selection":"991201"}',
      },
    ],
  },
  {
    id: '7798452310',
    name: 'Lumen Skincare',
    currency: 'USD',
    opportunityScore: 84,
    prevScore: 79,
    spendCents: 7140000,
    conversions: 3120,
    cpaCents: 2290,
    roas: 4.1,
    history: [
      day('2026-05-04', 72),
      day('2026-05-18', 75, [
        chg('cmp_lm_01', 'Glow Serum Launch', 3, [
          det('ad_set', {
            adObjectId: '771001',
            appliedNow: ['SIGNALS_GROWTH_CAPI_V2'],
          }),
        ]),
      ]),
      day('2026-06-01', 79, [
        chg('cmp_lm_02', 'UGC Reels Set', 4, [
          det('ad', {adObjectId: '771010', appliedNow: ['MUSIC']}),
        ]),
      ]),
      day('2026-06-15', 82, [
        chg('cmp_lm_03', 'Glow Serum Launch', 3, [
          det('campaign', {
            adObjectId: '609120',
            budgetThen: 160000,
            budgetNow: 200000,
            appliedNow: ['SCALE_GOOD_CAMPAIGN'],
          }),
        ]),
      ]),
      day('2026-06-22', 84, [
        chg('cmp_lm_04', 'Glow Serum Launch', 2, [
          det('campaign', {
            adObjectId: '609120',
            appliedNow: ['PERFORMANT_CREATIVE_REELS_OPT_IN'],
          }),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'lm-1',
        type: 'PERFORMANT_CREATIVE_REELS_OPT_IN',
        level: 'campaign',
        title: REC_TYPE_LABEL.PERFORMANT_CREATIVE_REELS_OPT_IN,
        body: 'Enable Reels-tuned creative variations on the Glow Serum launch campaign.',
        scoreLift: 3,
        liftEstimate: '+4% est. reach',
        objectName: 'Glow Serum Launch',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('7798452310'),
        extraData: '{}',
      },
      {
        id: 'lm-2',
        type: 'MUSIC',
        level: 'ad',
        title: REC_TYPE_LABEL.MUSIC,
        body: 'Add licensed tracks to three eligible Reels ads to lift engagement.',
        scoreLift: 2,
        liftEstimate: '+3% est. engagement',
        objectName: 'UGC Reels Set',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('7798452310'),
        extraData: '{"object_selection":"23901…,23902…"}',
      },
    ],
  },
  {
    id: '1130984472',
    name: 'Atlas Outdoors',
    currency: 'USD',
    opportunityScore: 41,
    prevScore: 39,
    spendCents: 3110000,
    conversions: 720,
    cpaCents: 4320,
    roas: 2.1,
    history: [
      day('2026-05-04', 38),
      day('2026-05-18', 36, [
        chg('cmp_at_01', 'Winter Prospecting', -2, [
          det('ad_set', {
            adObjectId: '113001',
            appliedThen: ['ADVANTAGE_PLUS_AUDIENCE'],
            appliedNow: [],
          }),
        ]),
      ]),
      day('2026-06-01', 39, [
        chg('cmp_at_02', 'Trail Gear — Feed Only', 3, [
          det('ad_set', {
            adObjectId: '113002',
            appliedNow: ['AUTOMATIC_PLACEMENTS'],
          }),
        ]),
      ]),
      day('2026-06-15', 40, [
        chg('cmp_at_03', 'Catalog — Backpacks', 1, [
          det('ad', {
            adObjectId: '113010',
            appliedNow: ['BACKGROUND_GENERATION'],
          }),
        ]),
      ]),
      day('2026-06-22', 41, [
        chg('cmp_at_04', 'Winter Prospecting', 1, [
          det('ad_set', {
            adObjectId: '113001',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'at-1',
        type: 'AUTOMATIC_PLACEMENTS',
        level: 'ad_set',
        title: REC_TYPE_LABEL.AUTOMATIC_PLACEMENTS,
        body: 'Manual placements are limiting delivery. Open to Advantage+ placements so spend flows where it performs.',
        scoreLift: 9,
        liftEstimate: '+15% est. reach efficiency',
        objectName: 'Trail Gear — Feed Only',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('1130984472'),
        extraData: '{}',
      },
      {
        id: 'at-2',
        type: 'SIGNALS_GROWTH_CAPI_V2',
        level: 'ad_account',
        title: REC_TYPE_LABEL.SIGNALS_GROWTH_CAPI_V2,
        body: 'Event match quality is low. Send server-side conversions via the Conversions API to improve optimization.',
        scoreLift: 8,
        liftEstimate: '+11% est. attributed purchases',
        objectName: 'act_1130984472',
        applyMode: 'ads_manager',
        endpoint: 'Deeplink → Events Manager (CAPI setup)',
        extraData: '—',
      },
      {
        id: 'at-3',
        type: 'ADVANTAGE_PLUS_AUDIENCE',
        level: 'ad_set',
        title: REC_TYPE_LABEL.ADVANTAGE_PLUS_AUDIENCE,
        body: 'Broaden the Winter Prospecting ad set with Advantage+ audience to escape a saturated segment.',
        scoreLift: 6,
        liftEstimate: '+8% est. conversions',
        objectName: 'Winter Prospecting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('1130984472'),
        extraData: '{}',
      },
      {
        id: 'at-4',
        type: 'BACKGROUND_GENERATION',
        level: 'ad',
        title: REC_TYPE_LABEL.BACKGROUND_GENERATION,
        body: 'Generate background variations for catalog image ads to expand low-volume creative.',
        scoreLift: 3,
        liftEstimate: '+4% est. CTR',
        objectName: 'Catalog — Backpacks',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('1130984472'),
        extraData: '{"action_type":"OPT_IN","object_selection":"24010…"}',
      },
    ],
  },
  {
    id: '5563201998',
    name: 'Verdant Home',
    currency: 'GBP',
    opportunityScore: 71,
    prevScore: 69,
    spendCents: 5290000,
    conversions: 2040,
    cpaCents: 2590,
    roas: 3.7,
    history: [
      day('2026-05-04', 64),
      day('2026-05-18', 66, [
        chg('cmp_vd_01', 'Summer Sale', 2, [
          det('campaign', {
            adObjectId: '556201',
            appliedNow: ['AUTOMATIC_PLACEMENTS'],
          }),
        ]),
      ]),
      day('2026-06-01', 69, [
        chg('cmp_vd_02', 'Wine Club Prospecting', 3, [
          det('ad_set', {
            adObjectId: '556202',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
      day('2026-06-15', 70, [
        chg('cmp_vd_03', 'Summer Sale', 1, [
          det('campaign', {
            adObjectId: '556201',
            budgetThen: 72000,
            budgetNow: 90000,
            appliedNow: ['SCALE_GOOD_CAMPAIGN'],
          }),
        ]),
      ]),
      day('2026-06-22', 71, [
        chg('cmp_vd_04', 'Retargeting Carousel', 1, [
          det('ad', {adObjectId: '556210', appliedNow: ['CREATIVE_FATIGUE']}),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'vd-1',
        type: 'SCALE_GOOD_CAMPAIGN',
        level: 'campaign',
        title: REC_TYPE_LABEL.SCALE_GOOD_CAMPAIGN,
        body: 'Summer Sale is pacing under cost cap with headroom. Increase budget 25% to scale efficiently.',
        scoreLift: 5,
        liftEstimate: '+10% est. revenue',
        objectName: 'Summer Sale',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('5563201998'),
        extraData:
          '{"campaigns":"[{\\"ad_object_id\\":\\"556201\\",\\"additional_budget\\":22500}]"}',
      },
      {
        id: 'vd-2',
        type: 'CREATIVE_FATIGUE',
        level: 'ad',
        title: REC_TYPE_LABEL.CREATIVE_FATIGUE,
        body: 'Carousel creative is fatiguing in the retargeting set. Refresh assets to hold performance.',
        scoreLift: 4,
        liftEstimate: '+6% est. CTR',
        objectName: 'Retargeting Carousel',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('5563201998'),
        extraData: '{"object_selection":"556210"}',
      },
    ],
  },
  {
    id: '9087654123',
    name: 'Cobalt Fitness',
    currency: 'USD',
    opportunityScore: 55,
    prevScore: 51,
    spendCents: 2680000,
    conversions: 990,
    cpaCents: 2710,
    roas: 2.9,
    history: [
      day('2026-05-04', 49),
      day('2026-05-18', 52, [
        chg('cmp_cb_01', 'Membership Prospecting', 3, [
          det('ad_set', {
            adObjectId: '908001',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
      day('2026-06-01', 51, [
        chg('cmp_cb_02', 'App Installs — Reels', -1, [
          det('campaign', {
            adObjectId: '908002',
            budgetThen: 90000,
            budgetNow: 80000,
          }),
        ]),
      ]),
      day('2026-06-15', 53, [
        chg('cmp_cb_03', 'Membership Prospecting', 2, [
          det('ad_set', {
            adObjectId: '908001',
            appliedNow: ['SIGNALS_GROWTH_CAPI_V2'],
          }),
        ]),
      ]),
      day('2026-06-22', 55, [
        chg('cmp_cb_04', 'App Installs — Reels', 2, [
          det('ad', {adObjectId: '908010', appliedNow: ['MUSIC']}),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'cb-1',
        type: 'ADVANTAGE_PLUS_AUDIENCE',
        level: 'ad_set',
        title: REC_TYPE_LABEL.ADVANTAGE_PLUS_AUDIENCE,
        body: 'Membership Prospecting is capped by a narrow lookalike. Switch to Advantage+ audience to grow volume.',
        scoreLift: 7,
        liftEstimate: '+9% est. sign-ups',
        objectName: 'Membership Prospecting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('9087654123'),
        extraData: '{}',
      },
      {
        id: 'cb-2',
        type: 'MUSIC',
        level: 'ad',
        title: REC_TYPE_LABEL.MUSIC,
        body: 'Add trending audio to eligible Reels ads in the App Installs set.',
        scoreLift: 2,
        liftEstimate: '+3% est. engagement',
        objectName: 'App Installs — Reels',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('9087654123'),
        extraData: '{"object_selection":"24120…"}',
      },
    ],
  },
  {
    id: '3344120876',
    name: 'Saffron & Co.',
    currency: 'EUR',
    opportunityScore: 92,
    prevScore: 90,
    spendCents: 9870000,
    conversions: 4510,
    cpaCents: 2190,
    roas: 4.6,
    history: [
      day('2026-05-04', 86),
      day('2026-05-18', 88, [
        chg('cmp_sf_01', 'Festive Gifting', 2, [
          det('campaign', {
            adObjectId: '334201',
            appliedNow: ['PERFORMANT_CREATIVE_REELS_OPT_IN'],
          }),
        ]),
      ]),
      day('2026-06-01', 90, [
        chg('cmp_sf_02', 'Evergreen Prospecting', 2, [
          det('ad_set', {
            adObjectId: '334202',
            appliedNow: ['AUTOMATIC_PLACEMENTS'],
          }),
        ]),
      ]),
      day('2026-06-15', 91, [
        chg('cmp_sf_03', 'Festive Gifting', 1, [
          det('campaign', {
            adObjectId: '334201',
            budgetThen: 180000,
            budgetNow: 210000,
            appliedNow: ['SCALE_GOOD_CAMPAIGN'],
          }),
        ]),
      ]),
      day('2026-06-22', 92, [
        chg('cmp_sf_04', 'Evergreen Prospecting', 1, [
          det('ad_set', {
            adObjectId: '334202',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'sf-1',
        type: 'PERFORMANT_CREATIVE_REELS_OPT_IN',
        level: 'campaign',
        title: REC_TYPE_LABEL.PERFORMANT_CREATIVE_REELS_OPT_IN,
        body: 'Opt the Festive Gifting campaign into Reels-optimized creative for incremental reach.',
        scoreLift: 2,
        liftEstimate: '+3% est. reach',
        objectName: 'Festive Gifting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('3344120876'),
        extraData: '{}',
      },
    ],
  },
  {
    id: '6675318204',
    name: 'Harbor & Vine',
    currency: 'USD',
    opportunityScore: 48,
    prevScore: 52,
    spendCents: 3940000,
    conversions: 1080,
    cpaCents: 3650,
    roas: 2.4,
    history: [
      day('2026-05-04', 55),
      day('2026-05-18', 53, [
        chg('cmp_hv_01', 'Q3 Brand', -2, [
          det('campaign', {
            adObjectId: '667501',
            budgetThen: 140000,
            budgetNow: 120000,
          }),
        ]),
      ]),
      day('2026-06-01', 51, [
        chg('cmp_hv_02', 'Tasting Events — Stories', -2, [
          det('ad_set', {
            adObjectId: '667502',
            appliedThen: ['AUTOMATIC_PLACEMENTS'],
            appliedNow: [],
          }),
        ]),
      ]),
      day('2026-06-15', 49, [
        chg('cmp_hv_03', 'Wine Club Prospecting', -2, [
          det('ad_set', {
            adObjectId: '667503',
            appliedThen: ['ADVANTAGE_PLUS_AUDIENCE'],
            appliedNow: [],
          }),
        ]),
      ]),
      day('2026-06-22', 48, [
        chg('cmp_hv_04', 'Q3 Brand', -1, [
          det('campaign', {
            adObjectId: '667501',
            budgetThen: 120000,
            budgetNow: 110000,
          }),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'hv-1',
        type: 'CREATIVE_FATIGUE',
        level: 'campaign',
        title: REC_TYPE_LABEL.CREATIVE_FATIGUE,
        body: 'Multiple top ads are past peak frequency. Refresh creative across the Q3 Brand campaign.',
        scoreLift: 8,
        liftEstimate: '+10% est. CTR',
        objectName: 'Q3 Brand',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('6675318204'),
        extraData: '{"object_selection":"667501"}',
      },
      {
        id: 'hv-2',
        type: 'AUTOMATIC_PLACEMENTS',
        level: 'ad_set',
        title: REC_TYPE_LABEL.AUTOMATIC_PLACEMENTS,
        body: 'Stories-only delivery is constraining reach. Open to Advantage+ placements.',
        scoreLift: 6,
        liftEstimate: '+12% est. reach efficiency',
        objectName: 'Tasting Events — Stories',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('6675318204'),
        extraData: '{}',
      },
      {
        id: 'hv-3',
        type: 'ADVANTAGE_PLUS_AUDIENCE',
        level: 'ad_set',
        title: REC_TYPE_LABEL.ADVANTAGE_PLUS_AUDIENCE,
        body: 'Broaden the Wine Club prospecting set with Advantage+ audience.',
        scoreLift: 5,
        liftEstimate: '+7% est. conversions',
        objectName: 'Wine Club Prospecting',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('6675318204'),
        extraData: '{}',
      },
    ],
  },
  {
    id: '2218907735',
    name: 'Pace Athletic',
    currency: 'GBP',
    opportunityScore: 67,
    prevScore: 63,
    spendCents: 6120000,
    conversions: 2380,
    cpaCents: 2570,
    roas: 3.5,
    history: [
      day('2026-05-04', 59),
      day('2026-05-18', 61, [
        chg('cmp_pa_01', 'Run Club Launch', 2, [
          det('campaign', {
            adObjectId: '221801',
            appliedNow: ['ADVANTAGE_PLUS_AUDIENCE'],
          }),
        ]),
      ]),
      day('2026-06-01', 63, [
        chg('cmp_pa_02', 'Run Club Launch', 2, [
          det('campaign', {
            adObjectId: '221801',
            budgetThen: 120000,
            budgetNow: 150000,
            appliedNow: ['SCALE_GOOD_CAMPAIGN'],
          }),
        ]),
      ]),
      day('2026-06-15', 65, [
        chg('cmp_pa_03', 'Marathon Prep', 2, [
          det('campaign', {
            adObjectId: '221802',
            appliedNow: ['PERFORMANT_CREATIVE_REELS_OPT_IN'],
          }),
        ]),
      ]),
      day('2026-06-22', 67, [
        chg('cmp_pa_04', 'Marathon Prep', 2, [
          det('campaign', {
            adObjectId: '221802',
            appliedNow: ['AUTOMATIC_PLACEMENTS'],
          }),
        ]),
      ]),
    ],
    recommendations: [
      {
        id: 'pa-1',
        type: 'SCALE_GOOD_CAMPAIGN',
        level: 'campaign',
        title: REC_TYPE_LABEL.SCALE_GOOD_CAMPAIGN,
        body: 'Run Club Launch is beating ROAS target with headroom. Increase budget 20%.',
        scoreLift: 6,
        liftEstimate: '+11% est. revenue',
        objectName: 'Run Club Launch',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('2218907735'),
        extraData:
          '{"campaigns":"[{\\"ad_object_id\\":\\"221801\\",\\"additional_budget\\":30000}]"}',
      },
      {
        id: 'pa-2',
        type: 'PERFORMANT_CREATIVE_REELS_OPT_IN',
        level: 'campaign',
        title: REC_TYPE_LABEL.PERFORMANT_CREATIVE_REELS_OPT_IN,
        body: 'Opt the Marathon Prep campaign into Reels-optimized creative.',
        scoreLift: 3,
        liftEstimate: '+4% est. reach',
        objectName: 'Marathon Prep',
        applyMode: 'one_click',
        endpoint: APPLY_ENDPOINT('2218907735'),
        extraData: '{}',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Readiness categories — the best-practice areas the score is built from.
// Each recommendation type maps to one category so we can roll open work up
// into a per-account readiness view.
// ---------------------------------------------------------------------------

export type Category =
  'audiences' | 'tracking' | 'creative' | 'budget' | 'placements';

export const CATEGORY_LABEL: Record<Category, string> = {
  audiences: 'Audiences',
  tracking: 'Tracking',
  creative: 'Creative',
  budget: 'Budget',
  placements: 'Placements',
};

export const CATEGORY_ORDER: Category[] = [
  'audiences',
  'tracking',
  'creative',
  'budget',
  'placements',
];

export const REC_CATEGORY: Record<RecType, Category> = {
  ADVANTAGE_PLUS_AUDIENCE: 'audiences',
  AUTOMATIC_PLACEMENTS: 'placements',
  CREATIVE_FATIGUE: 'creative',
  SCALE_GOOD_CAMPAIGN: 'budget',
  MUSIC: 'creative',
  PERFORMANT_CREATIVE_REELS_OPT_IN: 'creative',
  SIGNALS_GROWTH_CAPI_V2: 'tracking',
  BACKGROUND_GENERATION: 'creative',
};

// ---------------------------------------------------------------------------
// Score breakdown — how an account's score splits across best-practice areas.
// Derived deterministically from the score so it always sums back to it.
// ---------------------------------------------------------------------------

export interface ScoreComponent {
  label: string;
  points: number;
  max: number;
  colorVar: string;
}

const BREAKDOWN_DEF: Array<{
  label: string;
  weight: number;
  max: number;
  colorVar: string;
}> = [
  {
    label: 'Campaign settings',
    weight: 0.49,
    max: 40,
    colorVar: 'var(--meta-blue)',
  },
  {
    label: 'Targeting & delivery',
    weight: 0.32,
    max: 30,
    colorVar: 'var(--purple)',
  },
  {label: 'Creative quality', weight: 0.13, max: 20, colorVar: 'var(--rose)'},
  {label: 'Account health', weight: 0.06, max: 10, colorVar: 'var(--green)'},
];

export function scoreBreakdown(score: number): ScoreComponent[] {
  const parts = BREAKDOWN_DEF.map(d => ({
    label: d.label,
    points: Math.round(score * d.weight),
    max: d.max,
    colorVar: d.colorVar,
  }));
  // Absorb any rounding drift into the first component so the parts sum to score.
  const drift = score - parts.reduce((s, p) => s + p.points, 0);
  parts[0].points += drift;
  return parts;
}

// ---------------------------------------------------------------------------
// Score changes — the "why your score moved" view, derived ONLY from the
// `changelog` the API returns. We humanize the structured fields (campaign,
// score_change, applied/removed recommendation types, budget then→now) — we
// never invent narrative beyond what the endpoint returns.
// ---------------------------------------------------------------------------

export type ChangeTone = 'positive' | 'negative' | 'neutral';

export const CATEGORY_COLOR: Record<Category, string> = {
  audiences: 'var(--brand)',
  tracking: 'var(--purple)',
  creative: 'var(--rose)',
  budget: 'var(--green)',
  placements: 'var(--brand-2)',
};

const TOKEN_CATEGORY: Record<string, Category> = Object.fromEntries(
  (Object.keys(REC_CATEGORY) as RecType[]).map(t => [
    REC_TYPE_TOKEN[t],
    REC_CATEGORY[t],
  ]),
);

export interface ChangeItem {
  campaignName: string;
  scoreChange: number;
  /** Recommendation types newly applied (applied_now minus applied_then), humanized. */
  appliedLabels: string[];
  /** Recommendation types removed (applied_then minus applied_now), humanized. */
  removedLabels: string[];
  budgetThen?: number;
  budgetNow?: number;
  category?: Category;
  tone: ChangeTone;
}

export interface DayChange {
  date: string;
  score: number;
  /** Day's net move = sum of per-campaign score_change. */
  totalChange: number;
  items: ChangeItem[];
}

function detailSummary(detail: OSCampaignDetail | undefined): {
  applied: string[];
  removed: string[];
  budgetThen?: number;
  budgetNow?: number;
} {
  if (!detail) return {applied: [], removed: []};
  const then = detail.appliedRecommendationTypesThen;
  const now = detail.appliedRecommendationTypesNow;
  return {
    applied: now.filter(t => !then.includes(t)),
    removed: then.filter(t => !now.includes(t)),
    budgetThen: detail.budgetThen,
    budgetNow: detail.budgetNow,
  };
}

/** The history days that carry a changelog, newest first, humanized for display. */
export function deriveDayChanges(history: ScorePoint[]): DayChange[] {
  return history
    .filter(p => p.changelog.length > 0)
    .map(p => {
      const items: ChangeItem[] = p.changelog.map(ci => {
        const {applied, removed, budgetThen, budgetNow} = detailSummary(
          ci.campaignDetails[0],
        );
        const lead = applied[0] ?? removed[0];
        return {
          campaignName: ci.campaignName,
          scoreChange: ci.scoreChange,
          appliedLabels: applied.map(recTokenLabel),
          removedLabels: removed.map(recTokenLabel),
          budgetThen,
          budgetNow,
          category: lead ? TOKEN_CATEGORY[lead] : undefined,
          tone:
            ci.scoreChange > 0
              ? 'positive'
              : ci.scoreChange < 0
                ? 'negative'
                : 'neutral',
        };
      });
      const totalChange = p.changelog.reduce((s, ci) => s + ci.scoreChange, 0);
      return {date: p.date, score: p.score, totalChange, items};
    })
    .reverse();
}

/** Faithful one-line summary of a change — built only from API changelog fields. */
export function describeChangeItem(item: ChangeItem, currency: string): string {
  const parts: string[] = [];
  if (item.appliedLabels.length > 0) {
    parts.push(`Applied ${item.appliedLabels.join(', ')}`);
  }
  if (item.removedLabels.length > 0) {
    parts.push(`Removed ${item.removedLabels.join(', ')}`);
  }
  if (item.budgetThen != null && item.budgetNow != null) {
    parts.push(
      `Budget ${formatMoneyCents(item.budgetThen, currency)} → ${formatMoneyCents(item.budgetNow, currency)}`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : 'Delivery change';
}

// ---------------------------------------------------------------------------
// Correlation series — score (rising) vs cost-per-result (falling) over ~90
// days, derived from the account's current score + CPA so the two move
// inversely (the relationship the dashboard is making visible).
// ---------------------------------------------------------------------------

export interface CorrelationPoint {
  score: number;
  cpaCents: number;
}

export function correlationSeries(account: AdAccount): CorrelationPoint[] {
  const n = 13;
  const startScore = Math.max(35, account.opportunityScore - 22);
  const endScore = account.opportunityScore;
  const startCpa = Math.round(account.cpaCents * 1.5);
  const endCpa = account.cpaCents;
  return Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    const wobble = i % 2 === 0 ? 0.6 : -0.6;
    return {
      score: Math.round(startScore + (endScore - startScore) * t + wobble),
      cpaCents: Math.round(startCpa + (endCpa - startCpa) * t),
    };
  });
}

// ---------------------------------------------------------------------------
// Experiments — controlled evidence that adopting recommendations causes the
// outcome (not just correlates). Agency-level; shared across the portfolio.
// ---------------------------------------------------------------------------

export interface LiftTest {
  name: string;
  treatment: string;
  control: string;
  /** Incremental conversion lift vs control, in percent. */
  lift: number;
  confidence: number;
}

export interface CreativeTest {
  name: string;
  variants: string;
  winner: string;
  /** CPA improvement (negative = cheaper), in percent. */
  cpaImprovement: number;
  confidence: number;
}

export const LIFT_TESTS: LiftTest[] = [
  {
    name: 'AI audiences',
    treatment: 'Automated targeting on 3 campaigns',
    control: 'Manual saved audiences',
    lift: 42,
    confidence: 95,
  },
  {
    name: 'Server tracking',
    treatment: 'Server + browser events (CAPI)',
    control: 'Browser tracking only',
    lift: 28,
    confidence: 92,
  },
  {
    name: 'Reels placement',
    treatment: 'All placements incl. Reels',
    control: 'Feed + Stories only',
    lift: 31,
    confidence: 90,
  },
  {
    name: 'Budget scaling',
    treatment: '+20% daily budget on winners',
    control: 'Original budget held',
    lift: 18,
    confidence: 88,
  },
];

export const CREATIVE_TESTS: CreativeTest[] = [
  {
    name: 'Video vs static',
    variants: '2 variants (50/50)',
    winner: 'Video creative',
    cpaImprovement: -38,
    confidence: 94,
  },
  {
    name: 'UGC vs polished',
    variants: '3 variants (even)',
    winner: 'Short-form UGC',
    cpaImprovement: -22,
    confidence: 91,
  },
  {
    name: 'Headlines',
    variants: '4 variants (even)',
    winner: 'Benefit-led copy',
    cpaImprovement: -15,
    confidence: 87,
  },
];

/** Industry benchmark used as the portfolio comparison line. */
export const BENCHMARK_SCORE = 62;
