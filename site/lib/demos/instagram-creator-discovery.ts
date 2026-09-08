/**
 * Representative sample data for the Instagram Creator Discovery demo.
 *
 * UI prototype only — mock data shaped after the Instagram Creator Marketplace
 * API named in docs/solutions/creators/instagram-creator-discovery.md. No real
 * Marketing/Graph API calls are made. Field names mirror the documented API
 * (verified against the public reference,
 * developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/creator-marketplace/):
 *
 *   GET <IG_USER_ID>/creator_marketplace_creators
 *     ?recommendation_type=&creator_countries=['US']&creator_interests=[...]
 *     &creator_min_followers=&creator_max_followers=&creator_age_bucket=
 *     &creator_gender=&major_audience_age_bucket=&major_audience_gender=
 *     &major_audience_countries=&query=&similar_to_creators=[...]
 *     &fields=id,username,is_account_verified,biography,country,onboarded_status,
 *             gender,age_bucket,badges,has_brand_partnership_experience,
 *             past_brand_partnership_partners,insights
 *
 *   Creator insights (require username; scope one creator):
 *     ?username={u}&fields=insights.metrics(creator_reach,creator_engaged_accounts)
 *       .breakdown(follow_type)
 *
 *   Media (require username; 30 most recent each):
 *     ?username={u}&fields=branded_content_media{media_type,permalink,caption,
 *       likes,comments,views,shares,tagged_brand},recent_media{...}
 *
 * Access & onboarding caveats from the spec/docs are modelled:
 *   - instagram_creator_marketplace_discovery needs ADVANCED access; standard
 *     access returns test/mock data only (this whole demo is sample data).
 *   - non-onboarded creators return only total_followers + public profile
 *     (gender/age_bucket and private insights are onboarded-only) — error
 *     subcode 10 when private fields are requested for a non-onboarded creator.
 */

// --- filters / enums (exact API values) ------------------------------------

/** recommendation_type — Meta's ranked recommendation sets. */
export type RecommendationType =
  | 'most_relevant_for_me'
  | 'high_ad_performance'
  | 'most_ads_experience'
  | 'similar_brands'
  | 'similar_audience';

export const RECOMMENDATION_TYPES: Array<{
  id: RecommendationType;
  label: string;
  blurb: string;
}> = [
  {
    id: 'most_relevant_for_me',
    label: 'Most relevant',
    blurb: 'Personalised to your brand and past collaborations.',
  },
  {
    id: 'high_ad_performance',
    label: 'High ad performance',
    blurb: 'Creators whose content drives strong ad results.',
  },
  {
    id: 'most_ads_experience',
    label: 'Most ads experience',
    blurb: 'Creators with the deepest partnership-ads history.',
  },
  {
    id: 'similar_brands',
    label: 'Similar brands',
    blurb: 'Worked with brands like yours before.',
  },
  {
    id: 'similar_audience',
    label: 'Similar audience',
    blurb: 'Audience overlaps with your customer base.',
  },
];

/** creator_interests — the 20 documented enum values (≤5 selectable). */
export type Interest =
  | 'ANIMALS_AND_PETS'
  | 'BOOKS_AND_LITERATURE'
  | 'BUSINESS_FINANCE_AND_ECONOMICS'
  | 'EDUCATION_AND_LEARNING'
  | 'BEAUTY'
  | 'FASHION'
  | 'FITNESS_AND_WORKOUTS'
  | 'FOOD_AND_DRINK'
  | 'GAMES_PUZZLES_AND_PLAY'
  | 'HISTORY_AND_PHILOSOPHY'
  | 'HOLIDAYS_AND_CELEBRATIONS'
  | 'HOME_AND_GARDEN'
  | 'MUSIC_AND_AUDIO'
  | 'PERFORMING_ARTS'
  | 'SCIENCE_AND_TECH'
  | 'SPORTS'
  | 'TV_AND_MOVIES'
  | 'TRAVEL_AND_LEISURE_ACTIVITIES'
  | 'VEHICLES_AND_TRANSPORTATION'
  | 'VISUAL_ARTS_ARCHITECTURE_AND_CRAFTS';

export const INTERESTS: Array<{id: Interest; label: string}> = [
  {id: 'BEAUTY', label: 'Beauty'},
  {id: 'FASHION', label: 'Fashion'},
  {id: 'FITNESS_AND_WORKOUTS', label: 'Fitness & workouts'},
  {id: 'FOOD_AND_DRINK', label: 'Food & drink'},
  {id: 'TRAVEL_AND_LEISURE_ACTIVITIES', label: 'Travel & leisure'},
  {id: 'HOME_AND_GARDEN', label: 'Home & garden'},
  {id: 'SCIENCE_AND_TECH', label: 'Science & tech'},
  {id: 'GAMES_PUZZLES_AND_PLAY', label: 'Games & play'},
  {id: 'MUSIC_AND_AUDIO', label: 'Music & audio'},
  {id: 'SPORTS', label: 'Sports'},
  {id: 'ANIMALS_AND_PETS', label: 'Animals & pets'},
  {id: 'BOOKS_AND_LITERATURE', label: 'Books & literature'},
  {id: 'BUSINESS_FINANCE_AND_ECONOMICS', label: 'Business & finance'},
  {id: 'EDUCATION_AND_LEARNING', label: 'Education & learning'},
  {id: 'HISTORY_AND_PHILOSOPHY', label: 'History & philosophy'},
  {id: 'HOLIDAYS_AND_CELEBRATIONS', label: 'Holidays & celebrations'},
  {id: 'PERFORMING_ARTS', label: 'Performing arts'},
  {id: 'TV_AND_MOVIES', label: 'TV & movies'},
  {id: 'VEHICLES_AND_TRANSPORTATION', label: 'Vehicles & transport'},
  {
    id: 'VISUAL_ARTS_ARCHITECTURE_AND_CRAFTS',
    label: 'Visual arts & crafts',
  },
];

/** Max creator_interests selectable per the docs (error 100 beyond this). */
export const MAX_INTERESTS = 5;

export const INTEREST_LABEL: Record<Interest, string> = Object.fromEntries(
  INTERESTS.map(i => [i.id, i.label]),
) as Record<Interest, string>;

/** creator_min_followers / creator_max_followers — documented buckets. */
export const FOLLOWER_BUCKETS = [
  0, 10_000, 25_000, 50_000, 75_000, 100_000, 250_000, 1_000_000,
] as const;

/** creator_age_bucket / major_audience_age_bucket — documented enums. */
export type AgeBucket =
  | '18_to_24'
  | '25_to_34'
  | '35_to_44'
  | '45_to_54'
  | '55_to_64'
  | '65_and_above';

export const AGE_BUCKETS: Array<{id: AgeBucket; label: string}> = [
  {id: '18_to_24', label: '18–24'},
  {id: '25_to_34', label: '25–34'},
  {id: '35_to_44', label: '35–44'},
  {id: '45_to_54', label: '45–54'},
  {id: '55_to_64', label: '55–64'},
  {id: '65_and_above', label: '65+'},
];

export const AGE_LABEL: Record<AgeBucket, string> = Object.fromEntries(
  AGE_BUCKETS.map(a => [a.id, a.label]),
) as Record<AgeBucket, string>;

/** creator_gender / major_audience_gender. */
export type Gender = 'male' | 'female';

/** creator_countries — ISO codes with a display label. */
export const COUNTRIES: Array<{code: string; label: string}> = [
  {code: 'US', label: 'United States'},
  {code: 'GB', label: 'United Kingdom'},
  {code: 'CA', label: 'Canada'},
  {code: 'AU', label: 'Australia'},
  {code: 'DE', label: 'Germany'},
  {code: 'BR', label: 'Brazil'},
];

export const COUNTRY_LABEL: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.label]),
);

// --- creator model ---------------------------------------------------------

/**
 * onboarded_status — full field access only for onboarded creators. Eligible
 * professional accounts are returned regardless of onboarding, but private
 * insights / gender / age_bucket are onboarded-only.
 */
export type OnboardingStatus = 'onboarded' | 'invited' | 'not_onboarded';

export const ONBOARDING_META: Record<
  OnboardingStatus,
  {label: string; tone: 'green' | 'yellow' | 'muted'}
> = {
  onboarded: {label: 'Onboarded', tone: 'green'},
  invited: {label: 'Invited', tone: 'yellow'},
  not_onboarded: {label: 'Not onboarded', tone: 'muted'},
};

/** A named audience share (top_countries / top_cities breakdown entry). */
export interface AudiencePlace {
  name: string;
  pct: number;
}

/** followers gender breakdown (creator_engaged_accounts .breakdown(gender)). */
export interface AudienceGenders {
  female: number;
  male: number;
}

/** creator_reach .breakdown(media_type) — reels / posts / stories. */
export interface ReachByMediaType {
  reels: number;
  posts: number;
  stories: number;
}

/** media_type of a media item (branded_content_media / recent_media). */
export type MediaType = 'reels' | 'image' | 'carousel' | 'story';

/** One media item from branded_content_media or recent_media. */
export interface MediaItem {
  /** media id. */
  mediaId: string;
  mediaType: MediaType;
  caption: string;
  likes: number;
  comments: number;
  /** views — video/reels only. */
  views?: number;
  shares: number;
  /** tagged_brand — only present on branded_content_media. */
  taggedBrand?: string;
}

/**
 * A creator node from creator_marketplace_creators, plus the insights read on
 * the same edge via fields=insights.metrics(...).
 */
export interface Creator {
  /** id. */
  id: string;
  /** username — @handle without the @. */
  username: string;
  name: string;
  /** biography. */
  biography: string;
  /** is_account_verified. */
  isVerified: boolean;
  /** country (creator_countries). */
  country: string;
  /** creator_gender / gender response field (onboarded only). */
  gender: Gender;
  /** age_bucket (onboarded only). */
  ageBucket: AgeBucket;
  /** creator_interests the creator maps to. */
  interests: Interest[];
  onboarding: OnboardingStatus;
  /** badges (native marketplace badges). */
  badges: string[];
  /** has_brand_partnership_experience. */
  hasBrandPartnershipExperience: boolean;
  /** past_brand_partnership_partners. */
  pastBrandPartnershipPartners: string[];

  // -- insights.metrics(...) --
  /** total_followers (public — the only metric for a non-onboarded creator). */
  totalFollowers: number;
  /** creator_engaged_accounts (this_month; onboarded only). */
  engagedAccounts: number;
  /** creator_reach (this_month; onboarded only). */
  reach: number;
  /** reels_interaction_rate (%, L90; onboarded only). */
  reelsInteractionRate: number;
  /** reels_hook_rate (%, L90; onboarded only). */
  reelsHookRate: number;

  // -- insights breakdowns (onboarded only) --
  /** creator_engaged_accounts .breakdown(gender). */
  audienceGenders: AudienceGenders;
  /** creator_engaged_accounts .breakdown(age). */
  audienceAges: Array<{bucket: AgeBucket; pct: number}>;
  /** creator_engaged_accounts .breakdown(top_countries). */
  audienceCountries: AudiencePlace[];
  /** creator_engaged_accounts .breakdown(top_cities). */
  audienceCities: AudiencePlace[];
  /** creator_reach .breakdown(media_type). */
  reachByMediaType: ReachByMediaType;

  // -- media (require username) --
  /** branded_content_media (30 most recent; branded/tagged). */
  brandedContentMedia: MediaItem[];
  /** recent_media (top 30 recent organic). */
  recentMedia: MediaItem[];

  // -- ranking inputs (drive recommendation_type ordering) --
  /** Modelled ad-performance signal (high_ad_performance ordering). */
  adPerformanceScore: number;
  /** Count of prior partnership-ads runs (most_ads_experience ordering). */
  adsExperienceCount: number;
  /** Modelled audience-overlap with the brand (similar_audience ordering). */
  audienceMatchScore: number;

  /**
   * Agency-blended brand-safety score (0–100). NOT a native API field — per the
   * spec's build step 3, agencies blend their own brand-safety scoring on top
   * of the native creator signals.
   */
  brandSafetyScore: number;
  /**
   * Whether the agency has scored this creator. Sample creators are scored;
   * live creators have no agency score source, so the UI shows "—".
   */
  agencyScored?: boolean;
}

// --- bands / formatting ----------------------------------------------------

export type Band = 'high' | 'mid' | 'low';

/** reels_interaction_rate bands used to colour the UI. */
export function interactionBand(rate: number): Band {
  if (rate >= 4) return 'high';
  if (rate >= 2) return 'mid';
  return 'low';
}

export function safetyBand(score: number): Band {
  if (score >= 85) return 'high';
  if (score >= 70) return 'mid';
  return 'low';
}

export const BAND_META: Record<Band, {label: string; colorVar: string}> = {
  high: {label: 'High', colorVar: 'var(--green)'},
  mid: {label: 'Solid', colorVar: 'var(--cat-creators)'},
  low: {label: 'Low', colorVar: 'var(--cat-measurement)'},
};

/** Compact count formatting (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Human label for a follower bucket value. */
export function followerBucketLabel(n: number): string {
  return n === 0 ? 'Any' : formatCount(n);
}

// --- filter model ----------------------------------------------------------

export interface DiscoveryFilters {
  /** recommendation_type — the ranked set to draw from. */
  recommendationType: RecommendationType;
  /** query — free-text keyword search. */
  query: string;
  /** creator_interests (≤5). */
  interests: Interest[];
  /** creator_countries; sentinel 'all' means no country filter. */
  country: string;
  /** creator_min_followers bucket (0 = any). */
  minFollowers: number;
  /** creator_max_followers bucket (0 = any). */
  maxFollowers: number;
  /** creator_gender; sentinel 'all'. */
  gender: Gender | 'all';
  /** major_audience_gender; sentinel 'all'. */
  audienceGender: Gender | 'all';
  /** major_audience_age_bucket; sentinel 'all'. */
  audienceAge: AgeBucket | 'all';
  /** major_audience_countries; sentinel 'all'. */
  audienceCountry: string;
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  recommendationType: 'most_relevant_for_me',
  query: '',
  interests: [],
  country: 'all',
  minFollowers: 0,
  maxFollowers: 0,
  gender: 'all',
  audienceGender: 'all',
  audienceAge: 'all',
  audienceCountry: 'all',
};

/** The creator's single dominant audience country (major_audience_countries). */
export function majorAudienceCountry(c: Creator): string | undefined {
  return c.audienceCountries[0]?.name;
}

/** The creator's dominant audience age bucket (major_audience_age_bucket). */
export function majorAudienceAge(c: Creator): AgeBucket {
  return [...c.audienceAges].sort((a, b) => b.pct - a.pct)[0].bucket;
}

/** The creator's dominant audience gender (major_audience_gender). */
export function majorAudienceGender(c: Creator): Gender {
  return c.audienceGenders.female >= c.audienceGenders.male ? 'female' : 'male';
}

/**
 * recommendation_type ordering — each set ranks the same creators on a
 * different signal, mirroring how the API returns a differently-ranked list
 * per recommendation_type.
 */
export function recommendationScore(
  c: Creator,
  type: RecommendationType,
): number {
  switch (type) {
    case 'high_ad_performance':
      return c.adPerformanceScore;
    case 'most_ads_experience':
      return c.adsExperienceCount * 10 + c.pastBrandPartnershipPartners.length;
    case 'similar_brands':
      return (
        (c.hasBrandPartnershipExperience ? 100 : 0) +
        c.pastBrandPartnershipPartners.length * 5
      );
    case 'similar_audience':
      return c.audienceMatchScore;
    case 'most_relevant_for_me':
    default:
      return (
        c.reelsInteractionRate * 8 +
        c.audienceMatchScore / 2 +
        c.brandSafetyScore / 10
      );
  }
}

/**
 * Pure filter + rank over the sample creators, mirroring how the documented
 * query params narrow the result set server-side and recommendation_type
 * orders it.
 */
export function filterCreators(
  creators: Creator[],
  f: DiscoveryFilters,
): Creator[] {
  const q = f.query.trim().toLowerCase();
  const filtered = creators.filter(c => {
    if (
      f.interests.length > 0 &&
      !f.interests.some(i => c.interests.includes(i))
    ) {
      return false;
    }
    if (f.country !== 'all' && c.country !== f.country) return false;
    if (f.minFollowers > 0 && c.totalFollowers < f.minFollowers) return false;
    if (f.maxFollowers > 0 && c.totalFollowers > f.maxFollowers) return false;
    if (f.gender !== 'all' && c.gender !== f.gender) return false;
    if (
      f.audienceGender !== 'all' &&
      majorAudienceGender(c) !== f.audienceGender
    )
      return false;
    if (f.audienceAge !== 'all' && majorAudienceAge(c) !== f.audienceAge) {
      return false;
    }
    if (
      f.audienceCountry !== 'all' &&
      majorAudienceCountry(c) !== COUNTRY_LABEL[f.audienceCountry]
    ) {
      return false;
    }
    if (q.length > 0) {
      const hay = `${c.name} ${c.username} ${c.biography} ${c.interests
        .map(i => INTEREST_LABEL[i])
        .join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort(
    (a, b) =>
      recommendationScore(b, f.recommendationType) -
      recommendationScore(a, f.recommendationType),
  );
}

// --- sample creators -------------------------------------------------------

function media(
  mediaId: string,
  mediaType: MediaType,
  caption: string,
  likes: number,
  comments: number,
  shares: number,
  views?: number,
  taggedBrand?: string,
): MediaItem {
  return {
    mediaId,
    mediaType,
    caption,
    likes,
    comments,
    shares,
    views,
    taggedBrand,
  };
}

export const CREATORS: Creator[] = [
  {
    id: '17841400000000101',
    username: 'maya.wanders',
    name: 'Maya Ellison',
    biography:
      'Slow travel + carry-on packing. Reels from off-grid stays around the world.',
    isVerified: true,
    country: 'US',
    gender: 'female',
    ageBucket: '25_to_34',
    interests: ['TRAVEL_AND_LEISURE_ACTIVITIES', 'FASHION'],
    onboarding: 'onboarded',
    badges: ['Rising star', 'Consistent poster'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Wander Luggage', 'Peak Outfitters'],
    totalFollowers: 842_000,
    engagedAccounts: 512_000,
    reach: 3_900_000,
    reelsInteractionRate: 5.4,
    reelsHookRate: 41,
    audienceGenders: {female: 64, male: 36},
    audienceAges: [
      {bucket: '18_to_24', pct: 28},
      {bucket: '25_to_34', pct: 44},
      {bucket: '35_to_44', pct: 18},
      {bucket: '45_to_54', pct: 10},
    ],
    audienceCountries: [
      {name: 'United States', pct: 48},
      {name: 'Canada', pct: 14},
      {name: 'United Kingdom', pct: 9},
    ],
    audienceCities: [
      {name: 'Los Angeles', pct: 11},
      {name: 'New York', pct: 8},
      {name: 'Chicago', pct: 5},
    ],
    reachByMediaType: {reels: 74, posts: 19, stories: 7},
    brandedContentMedia: [
      media(
        'm_101a',
        'reels',
        '48 hours in a cabin with no signal',
        118_000,
        3_400,
        9_800,
        2_040_000,
        'Wander Luggage',
      ),
      media(
        'm_101b',
        'reels',
        'The only 3 bags I travel with',
        64_000,
        1_900,
        5_200,
        910_000,
        'Peak Outfitters',
      ),
    ],
    recentMedia: [
      media(
        'm_101c',
        'reels',
        'Sunrise over the fjord',
        88_000,
        2_100,
        6_400,
        1_180_000,
      ),
      media(
        'm_101d',
        'carousel',
        'Packing list: 7 days, one bag',
        41_000,
        1_200,
        2_700,
      ),
    ],
    adPerformanceScore: 88,
    adsExperienceCount: 6,
    audienceMatchScore: 82,
    brandSafetyScore: 92,
  },
  {
    id: '17841400000000102',
    username: 'ceciliacooks',
    name: 'Cecilia Ramos',
    biography: 'One-pan weeknight dinners. Reels that fit in your lunch break.',
    isVerified: true,
    country: 'US',
    gender: 'female',
    ageBucket: '25_to_34',
    interests: ['FOOD_AND_DRINK', 'HOME_AND_GARDEN'],
    onboarding: 'onboarded',
    badges: ['Top creator', 'High saves'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Copper Pan Co.'],
    totalFollowers: 512_000,
    engagedAccounts: 401_000,
    reach: 3_300_000,
    reelsInteractionRate: 6.8,
    reelsHookRate: 47,
    audienceGenders: {female: 72, male: 28},
    audienceAges: [
      {bucket: '18_to_24', pct: 22},
      {bucket: '25_to_34', pct: 41},
      {bucket: '35_to_44', pct: 24},
      {bucket: '45_to_54', pct: 13},
    ],
    audienceCountries: [
      {name: 'United States', pct: 55},
      {name: 'Canada', pct: 12},
      {name: 'Australia', pct: 7},
    ],
    audienceCities: [
      {name: 'Austin', pct: 9},
      {name: 'Toronto', pct: 6},
      {name: 'Phoenix', pct: 4},
    ],
    reachByMediaType: {reels: 81, posts: 14, stories: 5},
    brandedContentMedia: [
      media(
        'm_102a',
        'reels',
        '15-minute garlic butter noodles',
        96_000,
        2_800,
        12_000,
        1_600_000,
        'Copper Pan Co.',
      ),
    ],
    recentMedia: [
      media(
        'm_102b',
        'reels',
        'Sheet-pan dinner, zero cleanup',
        72_000,
        2_100,
        8_900,
        1_050_000,
      ),
      media(
        'm_102c',
        'image',
        'What is in my fridge this week',
        28_000,
        900,
        1_400,
      ),
    ],
    adPerformanceScore: 84,
    adsExperienceCount: 4,
    audienceMatchScore: 90,
    brandSafetyScore: 95,
  },
  {
    id: '17841400000000103',
    username: 'thelabbench',
    name: 'Devon Park',
    biography: 'Consumer tech reviews without the hype. Weekly deep dives.',
    isVerified: true,
    country: 'US',
    gender: 'male',
    ageBucket: '25_to_34',
    interests: ['SCIENCE_AND_TECH', 'GAMES_PUZZLES_AND_PLAY'],
    onboarding: 'onboarded',
    badges: ['Top creator'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Nimbus Audio', 'Volt Chargers', 'Hexa'],
    totalFollowers: 1_360_000,
    engagedAccounts: 690_000,
    reach: 7_800_000,
    reelsInteractionRate: 3.1,
    reelsHookRate: 38,
    audienceGenders: {female: 29, male: 71},
    audienceAges: [
      {bucket: '18_to_24', pct: 31},
      {bucket: '25_to_34', pct: 46},
      {bucket: '35_to_44', pct: 16},
      {bucket: '45_to_54', pct: 7},
    ],
    audienceCountries: [
      {name: 'United States', pct: 41},
      {name: 'Germany', pct: 12},
      {name: 'United Kingdom', pct: 10},
    ],
    audienceCities: [
      {name: 'San Francisco', pct: 9},
      {name: 'Berlin', pct: 6},
      {name: 'London', pct: 5},
    ],
    reachByMediaType: {reels: 62, posts: 30, stories: 8},
    brandedContentMedia: [
      media(
        'm_103a',
        'reels',
        'Is the new foldable worth it?',
        140_000,
        5_200,
        18_000,
        3_400_000,
        'Nimbus Audio',
      ),
      media(
        'm_103b',
        'reels',
        'I tested 12 budget earbuds',
        98_000,
        3_900,
        11_000,
        2_200_000,
        'Volt Chargers',
      ),
    ],
    recentMedia: [
      media(
        'm_103c',
        'reels',
        'One setting that saves your battery',
        76_000,
        2_400,
        9_100,
        1_100_000,
      ),
    ],
    adPerformanceScore: 79,
    adsExperienceCount: 9,
    audienceMatchScore: 61,
    brandSafetyScore: 88,
  },
  {
    id: '17841400000000104',
    username: 'lift.with.jae',
    name: 'Jae Morgan',
    biography: 'Strength coaching for beginners. Form-check reels + programs.',
    isVerified: false,
    country: 'GB',
    gender: 'female',
    ageBucket: '25_to_34',
    interests: ['FITNESS_AND_WORKOUTS', 'SPORTS'],
    onboarding: 'onboarded',
    badges: ['Rising star'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Prime Whey', 'Grip Athletic'],
    totalFollowers: 388_000,
    engagedAccounts: 268_000,
    reach: 2_050_000,
    reelsInteractionRate: 4.6,
    reelsHookRate: 44,
    audienceGenders: {female: 46, male: 54},
    audienceAges: [
      {bucket: '18_to_24', pct: 34},
      {bucket: '25_to_34', pct: 43},
      {bucket: '35_to_44', pct: 16},
      {bucket: '45_to_54', pct: 7},
    ],
    audienceCountries: [
      {name: 'United Kingdom', pct: 47},
      {name: 'United States', pct: 18},
      {name: 'Australia', pct: 9},
    ],
    audienceCities: [
      {name: 'London', pct: 12},
      {name: 'Manchester', pct: 7},
      {name: 'Dublin', pct: 4},
    ],
    reachByMediaType: {reels: 78, posts: 16, stories: 6},
    brandedContentMedia: [
      media(
        'm_104a',
        'reels',
        '3 fixes for your deadlift',
        41_000,
        1_600,
        3_800,
        820_000,
        'Prime Whey',
      ),
    ],
    recentMedia: [
      media(
        'm_104b',
        'reels',
        'Beginner push day, 30 minutes',
        33_000,
        1_100,
        2_900,
        600_000,
      ),
    ],
    adPerformanceScore: 72,
    adsExperienceCount: 3,
    audienceMatchScore: 68,
    brandSafetyScore: 81,
  },
  {
    id: '17841400000000105',
    username: 'nadia.glow',
    name: 'Nadia Fontaine',
    biography: 'Sensitive-skin skincare routines. Honest reviews, no filters.',
    isVerified: false,
    country: 'CA',
    gender: 'female',
    ageBucket: '18_to_24',
    interests: ['BEAUTY', 'FASHION'],
    onboarding: 'invited',
    badges: [],
    hasBrandPartnershipExperience: false,
    pastBrandPartnershipPartners: [],
    totalFollowers: 268_000,
    engagedAccounts: 212_000,
    reach: 1_900_000,
    reelsInteractionRate: 7.9,
    reelsHookRate: 52,
    audienceGenders: {female: 84, male: 16},
    audienceAges: [
      {bucket: '18_to_24', pct: 41},
      {bucket: '25_to_34', pct: 38},
      {bucket: '35_to_44', pct: 14},
      {bucket: '45_to_54', pct: 7},
    ],
    audienceCountries: [
      {name: 'Canada', pct: 39},
      {name: 'United States', pct: 33},
      {name: 'United Kingdom', pct: 8},
    ],
    audienceCities: [
      {name: 'Montreal', pct: 10},
      {name: 'Toronto', pct: 9},
      {name: 'Seattle', pct: 5},
    ],
    reachByMediaType: {reels: 86, posts: 10, stories: 4},
    brandedContentMedia: [],
    recentMedia: [
      media(
        'm_105a',
        'reels',
        'My 4-step barrier-repair routine',
        44_000,
        1_800,
        5_100,
        480_000,
      ),
    ],
    adPerformanceScore: 66,
    adsExperienceCount: 0,
    audienceMatchScore: 74,
    brandSafetyScore: 77,
  },
  {
    id: '17841400000000106',
    username: 'harper.home',
    name: 'Harper Lynn',
    biography: 'Small-space styling + budget interiors. Weekly makeovers.',
    isVerified: false,
    country: 'AU',
    gender: 'female',
    ageBucket: '35_to_44',
    interests: ['HOME_AND_GARDEN', 'VISUAL_ARTS_ARCHITECTURE_AND_CRAFTS'],
    onboarding: 'onboarded',
    badges: ['High saves'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Loft & Co.'],
    totalFollowers: 176_000,
    engagedAccounts: 141_000,
    reach: 1_150_000,
    reelsInteractionRate: 5.9,
    reelsHookRate: 45,
    audienceGenders: {female: 76, male: 24},
    audienceAges: [
      {bucket: '25_to_34', pct: 39},
      {bucket: '35_to_44', pct: 33},
      {bucket: '45_to_54', pct: 18},
      {bucket: '18_to_24', pct: 10},
    ],
    audienceCountries: [
      {name: 'Australia', pct: 52},
      {name: 'United States', pct: 16},
      {name: 'United Kingdom', pct: 9},
    ],
    audienceCities: [
      {name: 'Sydney', pct: 14},
      {name: 'Melbourne', pct: 11},
      {name: 'Brisbane', pct: 6},
    ],
    reachByMediaType: {reels: 69, posts: 25, stories: 6},
    brandedContentMedia: [
      media(
        'm_106a',
        'reels',
        'Rental kitchen glow-up under $200',
        29_000,
        980,
        4_100,
        620_000,
        'Loft & Co.',
      ),
    ],
    recentMedia: [
      media(
        'm_106b',
        'carousel',
        'Before + after: tiny studio',
        22_000,
        720,
        1_900,
      ),
    ],
    adPerformanceScore: 74,
    adsExperienceCount: 2,
    audienceMatchScore: 71,
    brandSafetyScore: 90,
  },
  {
    id: '17841400000000107',
    username: 'pixelrun',
    name: 'Theo Nakamura',
    biography: 'Cozy + indie games. Streams, highlight reels, and reviews.',
    isVerified: true,
    country: 'US',
    gender: 'male',
    ageBucket: '25_to_34',
    interests: ['GAMES_PUZZLES_AND_PLAY', 'SCIENCE_AND_TECH'],
    onboarding: 'onboarded',
    badges: ['Top creator', 'Consistent poster'],
    hasBrandPartnershipExperience: true,
    pastBrandPartnershipPartners: ['Hexa Controllers', 'Nimbus Audio'],
    totalFollowers: 2_240_000,
    engagedAccounts: 980_000,
    reach: 12_500_000,
    reelsInteractionRate: 2.7,
    reelsHookRate: 34,
    audienceGenders: {female: 36, male: 64},
    audienceAges: [
      {bucket: '18_to_24', pct: 38},
      {bucket: '25_to_34', pct: 42},
      {bucket: '35_to_44', pct: 14},
      {bucket: '45_to_54', pct: 6},
    ],
    audienceCountries: [
      {name: 'United States', pct: 38},
      {name: 'Brazil', pct: 15},
      {name: 'Germany', pct: 9},
    ],
    audienceCities: [
      {name: 'Los Angeles', pct: 7},
      {name: 'São Paulo', pct: 6},
      {name: 'New York', pct: 5},
    ],
    reachByMediaType: {reels: 58, posts: 22, stories: 20},
    brandedContentMedia: [
      media(
        'm_107a',
        'reels',
        'Top 5 cozy games this month',
        120_000,
        6_400,
        22_000,
        1_900_000,
        'Hexa Controllers',
      ),
    ],
    recentMedia: [
      media(
        'm_107b',
        'reels',
        'Blind run of a new roguelike',
        96_000,
        4_800,
        15_000,
        2_600_000,
      ),
    ],
    adPerformanceScore: 70,
    adsExperienceCount: 7,
    audienceMatchScore: 55,
    brandSafetyScore: 69,
  },
  {
    id: '17841400000000108',
    username: 'fitfuel.co',
    name: 'Marcus Bell',
    biography: 'High-protein meal prep for busy weeks. Macros made simple.',
    isVerified: false,
    country: 'GB',
    gender: 'male',
    ageBucket: '25_to_34',
    interests: ['FOOD_AND_DRINK', 'FITNESS_AND_WORKOUTS'],
    onboarding: 'not_onboarded',
    badges: [],
    hasBrandPartnershipExperience: false,
    pastBrandPartnershipPartners: [],
    totalFollowers: 94_000,
    engagedAccounts: 0,
    reach: 0,
    reelsInteractionRate: 0,
    reelsHookRate: 0,
    audienceGenders: {female: 0, male: 0},
    audienceAges: [],
    audienceCountries: [],
    audienceCities: [],
    reachByMediaType: {reels: 0, posts: 0, stories: 0},
    brandedContentMedia: [],
    recentMedia: [],
    adPerformanceScore: 40,
    adsExperienceCount: 0,
    audienceMatchScore: 58,
    brandSafetyScore: 84,
  },
];

/** Look up a creator by username (username-scoped discovery + insights). */
export function getCreator(username: string): Creator | undefined {
  return CREATORS.find(c => c.username === username);
}

/** Human label for a media_type. */
export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  reels: 'Reels',
  image: 'Image',
  carousel: 'Carousel',
  story: 'Story',
};
