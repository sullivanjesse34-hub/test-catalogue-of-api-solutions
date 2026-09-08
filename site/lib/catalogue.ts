/**
 * Catalogue data model — the 9 categories and 22 solutions.
 *
 * Solution specs live in `docs/solutions/<category>/<slug>.md` (maintained by
 * Frederick Tran). They are scaffolds today, so cards surface honest status
 * rather than fabricated descriptions. `name` values are display-normalized
 * from the index in `.claude/rules` / CLAUDE.md.
 */

export type CategoryId =
  | 'catalogue'
  | 'creative'
  | 'creators'
  | 'foundational'
  | 'leads'
  | 'measurement'
  | 'miscellaneous'
  | 'performance'
  | 'signals';

export type SolutionStatus = 'not_started' | 'in_progress' | 'ready';

export interface Category {
  id: CategoryId;
  label: string;
  /** CSS variable reference for the category accent, e.g. 'var(--cat-creative)'. */
  accentVar: string;
}

export interface Solution {
  slug: string;
  name: string;
  category: CategoryId;
  status: SolutionStatus;
  /** Short card tagline. Added per-solution as each one is built out. */
  description?: string;
  /** True when an interactive demo exists at /solutions/<slug>/demo. */
  demo?: boolean;
}

export const CATEGORIES: Category[] = [
  {id: 'catalogue', label: 'Catalogue', accentVar: 'var(--cat-catalogue)'},
  {id: 'creative', label: 'Creative', accentVar: 'var(--cat-creative)'},
  {id: 'creators', label: 'Creators', accentVar: 'var(--cat-creators)'},
  {
    id: 'foundational',
    label: 'Foundational',
    accentVar: 'var(--cat-foundational)',
  },
  {id: 'leads', label: 'Leads', accentVar: 'var(--cat-leads)'},
  {
    id: 'measurement',
    label: 'Measurement',
    accentVar: 'var(--cat-measurement)',
  },
  {
    id: 'miscellaneous',
    label: 'Miscellaneous',
    accentVar: 'var(--cat-miscellaneous)',
  },
  {
    id: 'performance',
    label: 'Performance',
    accentVar: 'var(--cat-performance)',
  },
  {id: 'signals', label: 'Signals', accentVar: 'var(--cat-signals)'},
];

export const SOLUTIONS: Solution[] = [
  // Catalogue
  {
    slug: 'catalogue-batch-feed-optimiser',
    name: 'Catalogue Batch Feed Optimiser',
    category: 'catalogue',
    status: 'ready',
    description:
      'Compose and submit batch operations, trigger and schedule feed uploads, and monitor ingestion, validation, and video coverage across product catalogues.',
    demo: true,
  },
  {
    slug: 'catalogue-health-dashboard',
    name: 'Catalogue Health Dashboard',
    category: 'catalogue',
    status: 'ready',
    description:
      'Monitor match rates, diagnostics, product completeness, and video coverage across your catalogue portfolio.',
    demo: true,
  },
  // Creative
  {
    slug: 'ai-creative-enhancer',
    name: 'AI Creative Enhancer',
    category: 'creative',
    status: 'ready',
    description:
      'Control Advantage+ Creative features across ads — toggle AI enhancements, preview per placement, and launch safely.',
    demo: true,
  },
  {
    slug: 'creative-fatigue-notifier',
    name: 'Creative Fatigue Notifier',
    category: 'creative',
    status: 'ready',
    description:
      'Receive and act on creative fatigue alerts in real time via webhooks and the Performance Recommendations API.',
    demo: true,
  },
  {
    slug: 'reels-performant-creative-dashboard',
    name: 'Reels Performant Creative Dashboard',
    category: 'creative',
    status: 'ready',
    description:
      'Audit reels ads across your businesses, score them on the four performant-creative criteria, and opt into Advantage+ video auto-crop, placement adaptation, and music to launch performant reels.',
    demo: true,
  },
  // Creators
  {
    slug: 'facebook-creator-discovery',
    name: 'Facebook Creator Discovery',
    category: 'creators',
    status: 'ready',
    description:
      'Discover Facebook creators with semantic search and metric filters, inspect audience and engagement signals, layer in brand-safety scoring, and shortlist talent for branded-content deals.',
    demo: true,
  },
  {
    slug: 'instagram-creator-discovery',
    name: 'Instagram Creator Discovery',
    category: 'creators',
    status: 'ready',
    description:
      'Retrieve personalised Instagram creator recommendations for partnership ads — rank by recommendation type, filter on interests, followers, and audience, inspect reels and reach insights, and layer in agency brand-safety scoring.',
    demo: true,
  },
  {
    slug: 'partnership-ads-booster',
    name: 'Partnership Ads Booster',
    category: 'creators',
    status: 'ready',
    description:
      'Automate the partnership-ads boosting workflow — check post- and account-level permissions, then turn eligible creator branded content into partnership ads.',
    demo: true,
  },
  {
    slug: 'recommended-creator-content',
    name: 'Recommended Creator Content',
    category: 'creators',
    status: 'ready',
    description:
      "Surface Meta's AI-recommended creator posts, gate on partnership-ad permission and eligibility, then compose a partnership ad with the recommended objective — all from one self-serve view.",
    demo: true,
  },
  // Foundational
  {
    slug: 'opportunity-score-dashboard',
    name: 'Opportunity Score Dashboard',
    category: 'foundational',
    status: 'ready',
    description:
      "Surfaces Meta's Opportunity Score and performance recommendations, with one-click adoption of suggested best practices.",
    demo: true,
  },
  {
    slug: 'quality-assurance',
    name: 'Quality Assurance',
    category: 'foundational',
    status: 'ready',
    description:
      'Scan every campaign for best-practice, overspend, naming, and delivery issues, then enforce the fixes automatically with scheduled Ad Rules Engine rules.',
    demo: true,
  },
  // Leads
  {
    slug: 'leads-retrieval-set-up-checker',
    name: 'Leads Retrieval Set-Up Checker',
    category: 'leads',
    status: 'ready',
    description:
      'A per-client scorecard that verifies the full lead ads workflow — permissions, leadgen webhooks, page install, test-lead round-trip, and bulk lead retrieval — with grounded remediation.',
    demo: true,
  },
  // Measurement
  {
    slug: 'experiment-analysis',
    name: 'Experiment Analysis',
    category: 'measurement',
    status: 'ready',
    description:
      'Read and standardise conversion-lift studies, creative tests, and split tests across businesses via the Ad Studies API — with significance, confidence intervals, and cross-test benchmarks.',
    demo: true,
  },
  {
    slug: 'marketing-mix-modelling-robyn',
    name: 'Marketing Mix Modelling (Robyn)',
    category: 'measurement',
    status: 'ready',
    description:
      "Model channel contribution, ROI, and saturation from Insights API MMM exports, then reallocate budget with Robyn's allocator to lift modelled sales at the same spend.",
    demo: true,
  },
  // Miscellaneous
  {
    slug: 'audience-uploader',
    name: 'Audience Uploader',
    category: 'miscellaneous',
    status: 'ready',
    description:
      'Create customer-file Custom Audiences, upload hashed user data in batched sessions with a SHA-256 preview, track match rates, and seed lookalikes.',
    demo: true,
  },
  {
    slug: 'insights-data-warehouse-dashboard',
    name: 'Insights Data Warehouse Dashboard',
    category: 'miscellaneous',
    status: 'ready',
    description:
      'Schedule asynchronous Insights API extraction into a siloed data warehouse, monitor ingestion and throttling per account, then explore time-series and breakdown analytics with on-demand report runs.',
    demo: true,
  },
  {
    slug: 'reservation-planner',
    name: 'Reservation Planner',
    category: 'miscellaneous',
    status: 'ready',
    description:
      'Generate reach & frequency reservation predictions at scale, compare reach/budget curves and frequency distribution, then reserve and assign the most cost-efficient prediction to a reserved campaign.',
    demo: true,
  },
  {
    slug: 'targeting-reach-estimate',
    name: 'Targeting & Reach Estimate',
    category: 'miscellaneous',
    status: 'ready',
    description:
      'Build a targeting spec with the Targeting Search and Detailed Targeting APIs, then estimate audience size, DAU/MAU, and reach-vs-budget from the Reach Estimate API.',
    demo: true,
  },
  // Performance
  {
    slug: 'value-rules-engine',
    name: 'Value Rules Engine',
    category: 'performance',
    status: 'ready',
    description:
      "Deploy, duplicate, and edit Value Rules across ad accounts at scale — steering bids toward each client's most valuable customers.",
    demo: true,
  },
  // Signals
  {
    slug: 'conversions-api-gateway-control-panel',
    name: 'Conversions API Gateway Control Panel',
    category: 'signals',
    status: 'ready',
    description:
      'Operate CAPI Gateway instances across all clients at scale — connect pixels, monitor server-side event throughput and connection health, manage users and roles, and deploy updates from one Control Plane.',
    demo: true,
  },
  {
    slug: 'signals-health-dashboard',
    name: 'Signals Health Dashboard',
    category: 'signals',
    status: 'ready',
    description:
      'Monitor event match quality, CAPI coverage, and signal maturity across datasets — with codified best-practice checks and remediation actions.',
    demo: true,
  },
  {
    slug: 'signals-opportunity-dashboard',
    name: 'Signals Opportunity Dashboard',
    category: 'signals',
    status: 'ready',
    description:
      'Finds untapped Conversions API opportunities across a portfolio — ranks pixels by projected AR upside from connecting high-spend web events, with one-click adoption.',
    demo: true,
  },
];

export const STATUS_META: Record<SolutionStatus, {label: string}> = {
  not_started: {label: 'Spec pending'},
  in_progress: {label: 'In progress'},
  ready: {label: 'Ready'},
};

export function getCategory(id: CategoryId): Category {
  const found = CATEGORIES.find(c => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find(s => s.slug === slug);
}
