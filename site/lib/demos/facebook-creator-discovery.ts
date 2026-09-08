/**
 * Representative sample data for the Facebook Creator Discovery demo.
 *
 * UI prototype only — mock data shaped after the Facebook Creator Discovery API
 * named in docs/solutions/creators/facebook-creator-discovery.md. No real
 * Marketing/Graph API calls are made. Field names mirror the documented API:
 *   - creator_marketplace/creators?query=&creator_categories=&creator_countries=&sort_by=&fields=
 *       fields: creator_id, creator_alias, creator_bio, follower_count,
 *       creator_interaction_rate, creator_reach_by_followers, views,
 *       followers_genders, followers_top_countries, followers_top_cities,
 *       past_partnerships
 *       sort_by: followers | relevance
 *       metric filter shape: {min, max, time_range:"L28", breakdown:"follower"}
 *       (follower_count, interaction_rate, reach, views)
 *   - creator_marketplace/content?content_type=&reach=&sort_by=&time_range=
 *       content_type: reels | videos | photos | story | links | live
 *   - creator_marketplace/creators?creator_id={id}&fields=...   (creator-ID lookup)
 *
 * Onboarding caveats from the spec are modelled too:
 *   - invited-but-not-onboarded creators return a subset of fields (error subcode 10)
 *   - error subcodes: 3961010 invalid creator, 3961014 ineligible,
 *     3961021–3961025 invalid filter/range
 */

/** Documented creator_categories values (a representative subset). */
export type CreatorCategory =
  | 'beauty'
  | 'fashion'
  | 'fitness'
  | 'food'
  | 'gaming'
  | 'lifestyle'
  | 'tech'
  | 'travel';

export const CREATOR_CATEGORIES: Array<{id: CreatorCategory; label: string}> = [
  {id: 'beauty', label: 'Beauty'},
  {id: 'fashion', label: 'Fashion'},
  {id: 'fitness', label: 'Fitness'},
  {id: 'food', label: 'Food'},
  {id: 'gaming', label: 'Gaming'},
  {id: 'lifestyle', label: 'Lifestyle'},
  {id: 'tech', label: 'Tech'},
  {id: 'travel', label: 'Travel'},
];

/** creator_countries — ISO country codes with a display label. */
export const COUNTRIES: Array<{code: string; label: string}> = [
  {code: 'US', label: 'United States'},
  {code: 'GB', label: 'United Kingdom'},
  {code: 'CA', label: 'Canada'},
  {code: 'AU', label: 'Australia'},
  {code: 'DE', label: 'Germany'},
  {code: 'BR', label: 'Brazil'},
];

/** content_type values from the spec. */
export type ContentType =
  'reels' | 'videos' | 'photos' | 'story' | 'links' | 'live';

/** sort_by values from the spec. */
export type SortBy = 'relevance' | 'followers';

/** followers_genders — audience gender split (adds to ~100). */
export interface FollowersGenders {
  female: number;
  male: number;
  unknown: number;
}

/** followers_top_countries[] / followers_top_cities[] entry. */
export interface AudiencePlace {
  name: string;
  pct: number;
}

/** past_partnerships[] — a prior branded-content collaboration. */
export interface Partnership {
  brand: string;
  category: CreatorCategory;
  /** Reels/videos published in the partnership. */
  contentCount: number;
}

/**
 * Onboarding state, per the spec's partial-field availability note.
 *   onboarded          — full field set available
 *   invited            — invited but not onboarded; subset only (error subcode 10)
 */
export type OnboardingStatus = 'onboarded' | 'invited';

/** One content item from creator_marketplace/content. */
export interface ContentItem {
  contentId: string;
  contentType: ContentType;
  caption: string;
  /** reach {min,max} — we store the measured value. */
  reach: number;
  views: number;
  interactionRate: number;
  /** time_range the metrics are measured over (e.g. L28). */
  timeRange: string;
}

/** A creator node from creator_marketplace/creators. */
export interface Creator {
  /** creator_id. */
  creatorId: string;
  /** creator_alias — @handle. */
  creatorAlias: string;
  name: string;
  /** creator_bio. */
  creatorBio: string;
  category: CreatorCategory;
  /** Primary market (from followers_top_countries[0]). */
  country: string;
  /** follower_count. */
  followerCount: number;
  /** creator_interaction_rate (%, over L28). */
  interactionRate: number;
  /** creator_reach_by_followers (%, reach ÷ followers over L28). */
  reachByFollowers: number;
  /** views (L28). */
  views: number;
  /** followers_genders. */
  followersGenders: FollowersGenders;
  /** followers_top_countries. */
  topCountries: AudiencePlace[];
  /** followers_top_cities. */
  topCities: AudiencePlace[];
  /** past_partnerships. */
  pastPartnerships: Partnership[];
  onboarding: OnboardingStatus;
  /**
   * Agency-blended brand-safety score (0–100). NOT a native API field — per the
   * spec's build step 3, agencies blend their own brand-safety metrics on top of
   * the native creator signals.
   */
  brandSafetyScore: number;
  /** Representative recent content (creator_marketplace/content). */
  content: ContentItem[];
}

// --- thresholds / bands ----------------------------------------------------

/** Interaction-rate bands used to colour the discovery UI. */
export type RateBand = 'high' | 'mid' | 'low';

export function interactionBand(rate: number): RateBand {
  if (rate >= 4) return 'high';
  if (rate >= 2) return 'mid';
  return 'low';
}

export const RATE_BAND_META: Record<
  RateBand,
  {label: string; colorVar: string}
> = {
  high: {label: 'High', colorVar: 'var(--green)'},
  mid: {label: 'Solid', colorVar: 'var(--cat-creators)'},
  low: {label: 'Low', colorVar: 'var(--cat-measurement)'},
};

/** Brand-safety score band. */
export function safetyBand(score: number): RateBand {
  if (score >= 85) return 'high';
  if (score >= 70) return 'mid';
  return 'low';
}

/** Compact count formatting (1.2M, 340k). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

// --- filter model ----------------------------------------------------------

export interface DiscoveryFilters {
  /** query — recommended semantic search. */
  query: string;
  categories: CreatorCategory[];
  /** creator_countries; the sentinel `'all'` means no country filter. */
  country: string;
  /** follower_count metric filter {min}. */
  minFollowers: number;
  /** interaction_rate metric filter {min}. */
  minInteractionRate: number;
  sortBy: SortBy;
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  query: '',
  categories: [],
  country: 'all',
  minFollowers: 0,
  minInteractionRate: 0,
  sortBy: 'relevance',
};

/**
 * Pure filter + sort over the sample creators, mirroring how the documented
 * query params (query, creator_categories, creator_countries, metric filters,
 * sort_by) would narrow the result set server-side.
 */
export function filterCreators(
  creators: Creator[],
  f: DiscoveryFilters,
): Creator[] {
  const q = f.query.trim().toLowerCase();
  const filtered = creators.filter(c => {
    if (f.categories.length > 0 && !f.categories.includes(c.category)) {
      return false;
    }
    if (f.country !== 'all' && c.country !== f.country) return false;
    if (c.followerCount < f.minFollowers) return false;
    if (c.interactionRate < f.minInteractionRate) return false;
    if (q.length > 0) {
      const hay =
        `${c.name} ${c.creatorAlias} ${c.creatorBio} ${c.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) =>
    f.sortBy === 'followers'
      ? b.followerCount - a.followerCount
      : relevanceScore(b) - relevanceScore(a),
  );
}

/**
 * relevance sort_by — a blend of engagement quality and brand safety. The real
 * API's relevance is server-computed; this is a representative stand-in.
 */
export function relevanceScore(c: Creator): number {
  return c.interactionRate * 10 + c.reachByFollowers + c.brandSafetyScore / 10;
}

function content(
  contentId: string,
  contentType: ContentType,
  caption: string,
  reach: number,
  views: number,
  interactionRate: number,
): ContentItem {
  return {
    contentId,
    contentType,
    caption,
    reach,
    views,
    interactionRate,
    timeRange: 'L28',
  };
}

export const CREATORS: Creator[] = [
  {
    creatorId: '178320045',
    creatorAlias: '@mayaonthemove',
    name: 'Maya Ellison',
    creatorBio:
      'Slow travel + carry-on packing. Long-form reels from off-grid stays.',
    category: 'travel',
    country: 'US',
    followerCount: 842000,
    interactionRate: 5.4,
    reachByFollowers: 61,
    views: 4_100_000,
    followersGenders: {female: 63, male: 34, unknown: 3},
    topCountries: [
      {name: 'United States', pct: 48},
      {name: 'Canada', pct: 14},
      {name: 'United Kingdom', pct: 9},
    ],
    topCities: [
      {name: 'Los Angeles', pct: 11},
      {name: 'New York', pct: 8},
      {name: 'Chicago', pct: 5},
    ],
    pastPartnerships: [
      {brand: 'Wander Luggage', category: 'travel', contentCount: 6},
      {brand: 'Peak Outfitters', category: 'lifestyle', contentCount: 3},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 92,
    content: [
      content(
        'c_8801',
        'reels',
        '48 hours in a cabin with no signal',
        1_180_000,
        2_040_000,
        6.1,
      ),
      content(
        'c_8802',
        'reels',
        'The only 3 bags I travel with',
        640_000,
        910_000,
        5.2,
      ),
      content(
        'c_8803',
        'photos',
        'Sunrise over the fjord',
        210_000,
        260_000,
        4.4,
      ),
    ],
  },
  {
    creatorId: '204518870',
    creatorAlias: '@thelabbench',
    name: 'Devon Park',
    creatorBio:
      'Consumer tech reviews without the hype. Weekly deep-dive videos.',
    category: 'tech',
    country: 'US',
    followerCount: 1_360_000,
    interactionRate: 3.1,
    reachByFollowers: 54,
    views: 7_800_000,
    followersGenders: {female: 28, male: 69, unknown: 3},
    topCountries: [
      {name: 'United States', pct: 41},
      {name: 'Germany', pct: 12},
      {name: 'United Kingdom', pct: 10},
    ],
    topCities: [
      {name: 'San Francisco', pct: 9},
      {name: 'Berlin', pct: 6},
      {name: 'London', pct: 5},
    ],
    pastPartnerships: [
      {brand: 'Nimbus Audio', category: 'tech', contentCount: 4},
      {brand: 'Volt Chargers', category: 'tech', contentCount: 7},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 88,
    content: [
      content(
        'c_8901',
        'videos',
        'Is the new foldable worth it?',
        2_100_000,
        3_400_000,
        3.6,
      ),
      content(
        'c_8902',
        'videos',
        'I tested 12 budget earbuds',
        1_450_000,
        2_200_000,
        3.0,
      ),
      content(
        'c_8903',
        'reels',
        'One setting that saves your battery',
        890_000,
        1_100_000,
        4.2,
      ),
    ],
  },
  {
    creatorId: '291044612',
    creatorAlias: '@ceciliacooks',
    name: 'Cecilia Ramos',
    creatorBio:
      'One-pan weeknight dinners. Reels that fit in your lunch break.',
    category: 'food',
    country: 'US',
    followerCount: 512000,
    interactionRate: 6.8,
    reachByFollowers: 72,
    views: 3_300_000,
    followersGenders: {female: 71, male: 26, unknown: 3},
    topCountries: [
      {name: 'United States', pct: 55},
      {name: 'Canada', pct: 12},
      {name: 'Australia', pct: 7},
    ],
    topCities: [
      {name: 'Austin', pct: 9},
      {name: 'Toronto', pct: 6},
      {name: 'Phoenix', pct: 4},
    ],
    pastPartnerships: [
      {brand: 'Copper Pan Co.', category: 'food', contentCount: 5},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 95,
    content: [
      content(
        'c_9001',
        'reels',
        '15-minute garlic butter noodles',
        980_000,
        1_600_000,
        7.4,
      ),
      content(
        'c_9002',
        'reels',
        'Sheet-pan dinner, zero cleanup',
        720_000,
        1_050_000,
        6.9,
      ),
      content(
        'c_9003',
        'story',
        'What is in my fridge this week',
        180_000,
        190_000,
        5.1,
      ),
    ],
  },
  {
    creatorId: '337721098',
    creatorAlias: '@lift.with.jae',
    name: 'Jae Morgan',
    creatorBio: 'Strength coaching for beginners. Form-check reels + programs.',
    category: 'fitness',
    country: 'GB',
    followerCount: 388000,
    interactionRate: 4.6,
    reachByFollowers: 58,
    views: 2_050_000,
    followersGenders: {female: 44, male: 53, unknown: 3},
    topCountries: [
      {name: 'United Kingdom', pct: 47},
      {name: 'United States', pct: 18},
      {name: 'Australia', pct: 9},
    ],
    topCities: [
      {name: 'London', pct: 12},
      {name: 'Manchester', pct: 7},
      {name: 'Dublin', pct: 4},
    ],
    pastPartnerships: [
      {brand: 'Prime Whey', category: 'fitness', contentCount: 8},
      {brand: 'Grip Athletic', category: 'fitness', contentCount: 2},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 81,
    content: [
      content(
        'c_9101',
        'reels',
        '3 fixes for your deadlift',
        560_000,
        820_000,
        5.0,
      ),
      content(
        'c_9102',
        'reels',
        'Beginner push day, 30 minutes',
        410_000,
        600_000,
        4.3,
      ),
    ],
  },
  {
    creatorId: '405613377',
    creatorAlias: '@nadia.glow',
    name: 'Nadia Fontaine',
    creatorBio: 'Sensitive-skin skincare routines. Honest reviews, no filters.',
    category: 'beauty',
    country: 'CA',
    followerCount: 268000,
    interactionRate: 7.9,
    reachByFollowers: 76,
    views: 1_900_000,
    followersGenders: {female: 82, male: 15, unknown: 3},
    topCountries: [
      {name: 'Canada', pct: 39},
      {name: 'United States', pct: 33},
      {name: 'United Kingdom', pct: 8},
    ],
    topCities: [
      {name: 'Montreal', pct: 10},
      {name: 'Toronto', pct: 9},
      {name: 'Seattle', pct: 5},
    ],
    pastPartnerships: [
      {brand: 'Dewpoint Skin', category: 'beauty', contentCount: 4},
    ],
    onboarding: 'invited',
    brandSafetyScore: 74,
    content: [
      content(
        'c_9201',
        'reels',
        'My 4-step barrier-repair routine',
        320_000,
        480_000,
        8.2,
      ),
    ],
  },
  {
    creatorId: '448820156',
    creatorAlias: '@pixelrun',
    name: 'Theo Nakamura',
    creatorBio: 'Cozy + indie games. Live streams and highlight reels.',
    category: 'gaming',
    country: 'US',
    followerCount: 2_240_000,
    interactionRate: 2.7,
    reachByFollowers: 49,
    views: 12_500_000,
    followersGenders: {female: 35, male: 62, unknown: 3},
    topCountries: [
      {name: 'United States', pct: 38},
      {name: 'Brazil', pct: 15},
      {name: 'Germany', pct: 9},
    ],
    topCities: [
      {name: 'Los Angeles', pct: 7},
      {name: 'São Paulo', pct: 6},
      {name: 'New York', pct: 5},
    ],
    pastPartnerships: [
      {brand: 'Hexa Controllers', category: 'gaming', contentCount: 9},
      {brand: 'Nimbus Audio', category: 'tech', contentCount: 3},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 69,
    content: [
      content(
        'c_9301',
        'live',
        'Blind run of a new roguelike',
        1_800_000,
        2_600_000,
        2.9,
      ),
      content(
        'c_9302',
        'reels',
        'Top 5 cozy games this month',
        1_200_000,
        1_900_000,
        3.4,
      ),
      content(
        'c_9303',
        'videos',
        'Full review: the year is indie',
        900_000,
        1_400_000,
        2.1,
      ),
    ],
  },
  {
    creatorId: '512207784',
    creatorAlias: '@harperhome',
    name: 'Harper Lynn',
    creatorBio: 'Small-space styling + budget interiors. Weekly makeovers.',
    category: 'lifestyle',
    country: 'AU',
    followerCount: 176000,
    interactionRate: 5.9,
    reachByFollowers: 68,
    views: 1_150_000,
    followersGenders: {female: 74, male: 23, unknown: 3},
    topCountries: [
      {name: 'Australia', pct: 52},
      {name: 'United States', pct: 16},
      {name: 'United Kingdom', pct: 9},
    ],
    topCities: [
      {name: 'Sydney', pct: 14},
      {name: 'Melbourne', pct: 11},
      {name: 'Brisbane', pct: 6},
    ],
    pastPartnerships: [
      {brand: 'Loft & Co.', category: 'lifestyle', contentCount: 6},
    ],
    onboarding: 'onboarded',
    brandSafetyScore: 90,
    content: [
      content(
        'c_9401',
        'reels',
        'Rental kitchen glow-up under $200',
        430_000,
        620_000,
        6.5,
      ),
      content(
        'c_9402',
        'photos',
        'Before + after: tiny studio',
        190_000,
        220_000,
        5.3,
      ),
    ],
  },
  {
    creatorId: '578114290',
    creatorAlias: '@fitfuel.co',
    name: 'Marcus Bell',
    creatorBio: 'High-protein meal prep for busy weeks. Macros made simple.',
    category: 'food',
    country: 'GB',
    followerCount: 94000,
    interactionRate: 8.4,
    reachByFollowers: 81,
    views: 720000,
    followersGenders: {female: 49, male: 48, unknown: 3},
    topCountries: [
      {name: 'United Kingdom', pct: 58},
      {name: 'United States', pct: 14},
      {name: 'Canada', pct: 6},
    ],
    topCities: [
      {name: 'London', pct: 15},
      {name: 'Leeds', pct: 6},
      {name: 'Bristol', pct: 5},
    ],
    pastPartnerships: [],
    onboarding: 'invited',
    brandSafetyScore: 86,
    content: [
      content(
        'c_9501',
        'reels',
        'Meal prep: 5 lunches, one shop',
        210_000,
        340_000,
        9.1,
      ),
    ],
  },
];

/** Look up a creator by creator_id (creator-ID-based discovery). */
export function getCreator(creatorId: string): Creator | undefined {
  return CREATORS.find(c => c.creatorId === creatorId);
}

/** Human label for a content_type. */
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  reels: 'Reels',
  videos: 'Videos',
  photos: 'Photos',
  story: 'Story',
  links: 'Links',
  live: 'Live',
};
