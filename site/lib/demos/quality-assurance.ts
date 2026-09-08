/**
 * Representative sample data for the Quality Assurance dashboard.
 *
 * UI prototype only — mock data shaped like the Marketing API nodes the QA
 * solution reads (adaccount → campaign → adset → ad) plus the Ad Rules Engine
 * (adrules_library). No real Marketing API calls are ever issued.
 *
 * Budgets and spend are held in minor units (cents) per the API convention —
 * divide by 100 for display. `effective_status` (actual delivery state) is kept
 * distinct from `status`/`configured_status` per the spec.
 * See docs/solutions/foundational/quality-assurance.md.
 */

// ---------------------------------------------------------------------------
// API-shaped campaign structure (adaccount → campaign → adset → ad)
// ---------------------------------------------------------------------------

export type BuyingType = 'AUCTION' | 'FIXED_CPM' | 'RESERVED';

export type EffectiveStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'DISAPPROVED'
  | 'PENDING_REVIEW'
  | 'CAMPAIGN_PAUSED'
  | 'ARCHIVED';

export type ConfiguredStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type Objective =
  | 'OUTCOME_SALES'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_APP_PROMOTION';

export type OptimizationGoal =
  | 'OFFSITE_CONVERSIONS'
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'LEAD_GENERATION';

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS';

export type BidStrategy =
  'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP';

/** One ad — the `ad` / `adgroup` node fields we QA. */
export interface Ad {
  id: string;
  name: string;
  effectiveStatus: EffectiveStatus;
  /** Whether a creative is attached (`creative` field present). */
  hasCreative: boolean;
}

/** One ad set — the `adset` node fields we QA. */
export interface AdSet {
  id: string;
  name: string;
  effectiveStatus: EffectiveStatus;
  optimizationGoal: OptimizationGoal;
  billingEvent: BillingEvent;
  isAutobid: boolean;
  /** bid_amount in cents; null when autobid (LOWEST_COST_WITHOUT_CAP). */
  bidAmountCents: number | null;
  /** Whether Advantage+ placements are on (empty `publisher_platforms`). */
  advantagePlacements: boolean;
  ads: Ad[];
}

/** One campaign — the `campaign` node fields we QA. */
export interface Campaign {
  id: string;
  name: string;
  objective: Objective;
  /** configured_status ≠ effective_status; both are surfaced. */
  status: ConfiguredStatus;
  effectiveStatus: EffectiveStatus;
  buyingType: BuyingType;
  bidStrategy: BidStrategy;
  /** Empty array = no special ad category declared. */
  specialAdCategories: string[];
  /** daily_budget in cents (mutually exclusive with lifetimeBudget). */
  dailyBudgetCents: number | null;
  /** lifetime_budget in cents. */
  lifetimeBudgetCents: number | null;
  /** spend_cap in cents; null = no cap set. */
  spendCapCents: number | null;
  /** Insights: spend so far today, in cents. */
  spendTodayCents: number;
  /** Insights: 7-day spend, in cents. */
  spend7dCents: number;
  adSets: AdSet[];
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  campaigns: Campaign[];
}

// ---------------------------------------------------------------------------
// Naming taxonomy — the agency's enforced campaign-name convention.
// Expected shape: OBJECTIVE_MARKET_AUDIENCE_YYYYQn (e.g. SALES_UK_PROSP_2026Q3)
// ---------------------------------------------------------------------------

export const NAMING_PATTERN =
  /^(SALES|LEADS|TRAFFIC|AWARENESS|ENGAGEMENT|APP)_[A-Z]{2}_[A-Z]{3,6}_20\d{2}Q[1-4]$/;

export const NAMING_TEMPLATE = 'OBJECTIVE_MARKET_AUDIENCE_YYYYQn';

// ---------------------------------------------------------------------------
// QA check model — a rule evaluated against a campaign, yielding a state.
// ---------------------------------------------------------------------------

export type CheckState = 'pass' | 'warn' | 'fail';

export type CheckCategory =
  'best_practice' | 'overspend' | 'naming' | 'delivery';

export const CATEGORY_LABEL: Record<CheckCategory, string> = {
  best_practice: 'Best practices',
  overspend: 'Overspend risk',
  naming: 'Naming taxonomy',
  delivery: 'Delivery health',
};

export const CATEGORY_COLOR: Record<CheckCategory, string> = {
  best_practice: 'var(--brand)',
  overspend: 'var(--rose)',
  naming: 'var(--purple)',
  delivery: 'var(--green)',
};

export const CATEGORY_ORDER: CheckCategory[] = [
  'best_practice',
  'overspend',
  'naming',
  'delivery',
];

export const STATE_META: Record<
  CheckState,
  {label: string; colorVar: string; weight: number}
> = {
  pass: {label: 'Pass', colorVar: 'var(--green)', weight: 0},
  warn: {label: 'Warning', colorVar: 'var(--yellow)', weight: 1},
  fail: {label: 'Fail', colorVar: 'var(--rose)', weight: 2},
};

export interface CheckResult {
  id: string;
  category: CheckCategory;
  /** Short rule title, e.g. "Cost control set". */
  title: string;
  state: CheckState;
  /** The campaign this result belongs to. */
  campaignId: string;
  campaignName: string;
  /** The API field(s) the check reads. */
  field: string;
  /** Observed value, humanized. */
  observed: string;
  /** Why it passed/failed — grounded in the checked fields. */
  detail: string;
  /** Suggested remediation (only meaningful for warn/fail). */
  remediation: string;
}

const CURRENCY_SYMBOL: Record<string, string> = {USD: '$', GBP: '£', EUR: '€'};

/** Format a minor-unit (cents) amount for display, respecting account currency. */
export function formatMoneyCents(cents: number, currency: string): string {
  const major = cents / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(major).toLocaleString()}`;
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  OUTCOME_SALES: 'Sales',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_APP_PROMOTION: 'App promotion',
};

export function objectiveLabel(objective: Objective): string {
  return OBJECTIVE_LABEL[objective];
}

export function campaignBudgetCents(c: Campaign): number {
  return c.dailyBudgetCents ?? c.lifetimeBudgetCents ?? 0;
}

/** daily_ratio_spent — share of the day's budget already spent (0..1+). */
export function dailyRatioSpent(c: Campaign): number {
  if (c.dailyBudgetCents == null || c.dailyBudgetCents === 0) return 0;
  return c.spendTodayCents / c.dailyBudgetCents;
}

/**
 * Spend-vs-budget pacing ratio for either budget type (0..1+):
 * daily campaigns pace today's spend against daily_budget; lifetime campaigns
 * pace spend-to-date (7d) against lifetime_budget. Returns null when the
 * campaign has neither a usable daily nor lifetime budget (pacing N/A).
 */
export function pacingRatio(c: Campaign): number | null {
  if (c.dailyBudgetCents != null && c.dailyBudgetCents !== 0) {
    return c.spendTodayCents / c.dailyBudgetCents;
  }
  if (c.lifetimeBudgetCents != null && c.lifetimeBudgetCents !== 0) {
    return c.spend7dCents / c.lifetimeBudgetCents;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check evaluation — codified best practices (the spec's "programmatic rule
// sets"). Each check reads real API fields and returns a state + remediation.
// ---------------------------------------------------------------------------

function bestPracticeChecks(c: Campaign): CheckResult[] {
  const results: CheckResult[] = [];
  const base = {campaignId: c.id, campaignName: c.name};

  // Cost control: AUCTION campaigns should carry a spend cap or a capped bid.
  const capped =
    c.spendCapCents != null || c.bidStrategy !== 'LOWEST_COST_WITHOUT_CAP';
  results.push({
    ...base,
    id: `${c.id}-cost-control`,
    category: 'best_practice',
    title: 'Cost control in place',
    field: 'bid_strategy, spend_cap',
    state: c.buyingType === 'AUCTION' && !capped ? 'warn' : 'pass',
    observed:
      c.spendCapCents != null
        ? 'spend_cap set'
        : c.bidStrategy.replace(/_/g, ' ').toLowerCase(),
    detail:
      c.buyingType === 'AUCTION' && !capped
        ? 'Auction campaign runs lowest-cost with no spend cap — spend is unbounded.'
        : 'A bid strategy or spend cap constrains delivery cost.',
    remediation:
      'Set a spend_cap or switch bid_strategy to COST_CAP / LOWEST_COST_WITH_BID_CAP.',
  });

  // Special ad category: leads/sales targeting sensitive verticals must declare one.
  const declared = c.specialAdCategories.length > 0;
  results.push({
    ...base,
    id: `${c.id}-special-cat`,
    category: 'best_practice',
    title: 'Special ad category reviewed',
    field: 'special_ad_categories',
    state: declared ? 'pass' : 'warn',
    observed: declared ? c.specialAdCategories.join(', ') : 'NONE',
    detail: declared
      ? 'A special ad category is declared, applying the required targeting limits.'
      : 'No special ad category declared — confirm the campaign is not in a regulated vertical.',
    remediation:
      'If advertising credit, employment, housing, or social issues, set special_ad_categories.',
  });

  // Conversion optimisation: sales/leads campaigns should optimise for conversions.
  const wantsConversions =
    c.objective === 'OUTCOME_SALES' || c.objective === 'OUTCOME_LEADS';
  const optimisesConversions = c.adSets.some(
    a =>
      a.optimizationGoal === 'OFFSITE_CONVERSIONS' ||
      a.optimizationGoal === 'LEAD_GENERATION',
  );
  if (wantsConversions) {
    results.push({
      ...base,
      id: `${c.id}-opt-goal`,
      category: 'best_practice',
      title: 'Optimised for conversions',
      field: 'optimization_goal',
      state: optimisesConversions ? 'pass' : 'fail',
      observed: c.adSets[0]?.optimizationGoal ?? '—',
      detail: optimisesConversions
        ? 'At least one ad set optimises for conversions, matching the objective.'
        : 'A sales/leads objective is optimising for clicks or reach, not conversions.',
      remediation:
        'Set optimization_goal to OFFSITE_CONVERSIONS (or LEAD_GENERATION for leads).',
    });
  }

  // Advantage+ placements — recommended for efficient delivery.
  const anyManual = c.adSets.some(a => !a.advantagePlacements);
  results.push({
    ...base,
    id: `${c.id}-placements`,
    category: 'best_practice',
    title: 'Advantage+ placements on',
    field: 'targeting.publisher_platforms',
    state: anyManual ? 'warn' : 'pass',
    observed: anyManual ? 'manual placements' : 'Advantage+ placements',
    detail: anyManual
      ? 'One or more ad sets restrict placements manually, limiting delivery.'
      : 'All ad sets use Advantage+ placements for efficient delivery.',
    remediation:
      'Clear manual publisher_platforms to enable Advantage+ placements.',
  });

  return results;
}

function overspendChecks(c: Campaign): CheckResult[] {
  const base = {campaignId: c.id, campaignName: c.name};
  const results: CheckResult[] = [];

  // spend_cap present on any budgeted campaign.
  results.push({
    ...base,
    id: `${c.id}-spend-cap`,
    category: 'overspend',
    title: 'Spend cap configured',
    field: 'spend_cap',
    state: c.spendCapCents != null ? 'pass' : 'warn',
    observed: c.spendCapCents != null ? 'set' : 'none',
    detail:
      c.spendCapCents != null
        ? 'A lifetime spend_cap bounds total spend on this campaign.'
        : 'No spend_cap — a runaway ad set could overspend the account.',
    remediation: 'Set a spend_cap that reflects the campaign budget ceiling.',
  });

  // Pacing: spend vs budget. Daily-budget campaigns pace today's spend against
  // daily_budget; lifetime-budget campaigns pace spend-to-date against
  // lifetime_budget (so they can't silently read as 0% / healthy).
  const ratio = pacingRatio(c);
  if (ratio != null) {
    const isLifetime = c.dailyBudgetCents == null;
    const state: CheckState =
      ratio >= 0.95 ? 'fail' : ratio >= 0.8 ? 'warn' : 'pass';
    results.push({
      ...base,
      id: `${c.id}-pacing`,
      category: 'overspend',
      title: isLifetime ? 'Lifetime pacing healthy' : 'Daily pacing healthy',
      field: isLifetime
        ? 'insights.spend vs lifetime_budget'
        : 'insights.spend vs daily_budget',
      state,
      observed: `${Math.round(ratio * 100)}% of ${
        isLifetime ? 'lifetime' : 'daily'
      } budget`,
      detail: isLifetime
        ? state === 'fail'
          ? 'Campaign has nearly exhausted its lifetime budget — at risk of ending early.'
          : state === 'warn'
            ? 'Spend-to-date is pacing high against the lifetime budget.'
            : 'Spend-to-date is well within the lifetime budget.'
        : state === 'fail'
          ? 'Campaign has nearly exhausted its daily budget — at risk of front-loading spend.'
          : state === 'warn'
            ? 'Daily spend is pacing high against budget.'
            : 'Daily spend is well within budget.',
      remediation: isLifetime
        ? 'Add a trigger rule to PAUSE at spent/lifetime_budget > 0.95, or raise lifetime_budget.'
        : 'Add a trigger rule to PAUSE at daily_ratio_spent > 0.95, or raise daily_budget.',
    });
  }

  return results;
}

function namingCheck(c: Campaign): CheckResult {
  const base = {campaignId: c.id, campaignName: c.name};
  const ok = NAMING_PATTERN.test(c.name);
  return {
    ...base,
    id: `${c.id}-naming`,
    category: 'naming',
    title: 'Follows naming taxonomy',
    field: 'name',
    state: ok ? 'pass' : 'fail',
    observed: c.name,
    detail: ok
      ? `Name matches the ${NAMING_TEMPLATE} taxonomy.`
      : `Name does not match the required ${NAMING_TEMPLATE} taxonomy.`,
    remediation: `Rename to ${NAMING_TEMPLATE}, e.g. SALES_UK_PROSP_2026Q3.`,
  };
}

function deliveryChecks(c: Campaign): CheckResult[] {
  const base = {campaignId: c.id, campaignName: c.name};
  const results: CheckResult[] = [];

  // effective_status vs configured_status — the actual delivery signal.
  const blocked =
    c.effectiveStatus === 'DISAPPROVED' ||
    c.effectiveStatus === 'PENDING_REVIEW';
  const mismatch = c.status === 'ACTIVE' && c.effectiveStatus !== 'ACTIVE';
  results.push({
    ...base,
    id: `${c.id}-eff-status`,
    category: 'delivery',
    title: 'Delivering as configured',
    field: 'effective_status vs status',
    state: blocked ? 'fail' : mismatch ? 'warn' : 'pass',
    observed: `${c.effectiveStatus} (configured ${c.status})`,
    detail: blocked
      ? 'Campaign is disapproved or in review — it is not delivering despite being set active.'
      : mismatch
        ? 'Configured active but effective_status differs — delivery is constrained.'
        : 'effective_status matches the configured status.',
    remediation: blocked
      ? 'Resolve the policy issue, then re-check effective_status.'
      : 'Investigate why delivery is constrained (budget, schedule, or review).',
  });

  // Ads missing creative — a common launch defect.
  const adsMissingCreative = c.adSets
    .flatMap(a => a.ads)
    .filter(ad => !ad.hasCreative).length;
  results.push({
    ...base,
    id: `${c.id}-creative`,
    category: 'delivery',
    title: 'All ads have creative',
    field: 'ad.creative',
    state: adsMissingCreative > 0 ? 'fail' : 'pass',
    observed:
      adsMissingCreative > 0
        ? `${adsMissingCreative} ad(s) missing creative`
        : 'all ads have creative',
    detail:
      adsMissingCreative > 0
        ? 'One or more ads have no creative attached and cannot deliver.'
        : 'Every ad has a creative attached.',
    remediation: 'Attach a creative to each ad before activating.',
  });

  return results;
}

/** All QA checks for a single campaign, across every category. */
export function evaluateCampaign(c: Campaign): CheckResult[] {
  return [
    ...bestPracticeChecks(c),
    ...overspendChecks(c),
    namingCheck(c),
    ...deliveryChecks(c),
  ];
}

/** All QA checks across every campaign in an account. */
export function evaluateAccount(account: Account): CheckResult[] {
  return account.campaigns.flatMap(evaluateCampaign);
}

export interface ScoreSummary {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  /** 0–100 health score: 100 = all pass, penalised by warns/fails. */
  score: number;
}

/** Roll a set of check results up into pass/warn/fail counts + a health score. */
export function summarize(results: CheckResult[]): ScoreSummary {
  const pass = results.filter(r => r.state === 'pass').length;
  const warn = results.filter(r => r.state === 'warn').length;
  const fail = results.filter(r => r.state === 'fail').length;
  const total = results.length;
  const penalty = warn * STATE_META.warn.weight + fail * STATE_META.fail.weight;
  const maxPenalty = total * STATE_META.fail.weight;
  const score =
    total === 0 ? 100 : Math.round((1 - penalty / maxPenalty) * 100);
  return {total, pass, warn, fail, score};
}

export interface CategorySummary {
  category: CheckCategory;
  pass: number;
  warn: number;
  fail: number;
  total: number;
}

/** Per-category pass/warn/fail rollup for a set of results. */
export function summarizeByCategory(results: CheckResult[]): CategorySummary[] {
  return CATEGORY_ORDER.map(category => {
    const inCat = results.filter(r => r.category === category);
    return {
      category,
      pass: inCat.filter(r => r.state === 'pass').length,
      warn: inCat.filter(r => r.state === 'warn').length,
      fail: inCat.filter(r => r.state === 'fail').length,
      total: inCat.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Ad Rules Engine — API-only trigger/schedule rules that codify these checks
// (POST act_<id>/adrules_library). Surfaced in-UI because trigger-based rules
// are not visible/editable in Ads Manager.
// ---------------------------------------------------------------------------

export type EvaluationType = 'TRIGGER' | 'SCHEDULE';

export type ExecutionType =
  | 'NOTIFICATION'
  | 'PAUSE'
  | 'UNPAUSE'
  | 'CHANGE_BUDGET'
  | 'CHANGE_BID'
  | 'REBALANCE_BUDGET'
  | 'PING_ENDPOINT';

export type FilterOperator =
  'GREATER_THAN' | 'LESS_THAN' | 'IN_RANGE' | 'IN' | 'CONTAIN';

export interface RuleFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface AdRule {
  id: string;
  name: string;
  evaluationType: EvaluationType;
  /** schedule_spec.schedule_type when evaluationType is SCHEDULE. */
  scheduleType?: 'DAILY' | 'HOURLY' | 'SEMI_HOURLY' | 'CUSTOM';
  filters: RuleFilter[];
  executionType: ExecutionType;
  /** The QA concern this rule enforces. */
  covers: CheckCategory;
  enabled: boolean;
  /** Whether this rule is API-only (invisible in Ads Manager). */
  apiOnly: boolean;
}

export const EXECUTION_LABEL: Record<ExecutionType, string> = {
  NOTIFICATION: 'Notify',
  PAUSE: 'Pause',
  UNPAUSE: 'Unpause',
  CHANGE_BUDGET: 'Change budget',
  CHANGE_BID: 'Change bid',
  REBALANCE_BUDGET: 'Rebalance budget',
  PING_ENDPOINT: 'Ping endpoint',
};

export const AD_RULES: AdRule[] = [
  {
    id: 'rule-overspend-pause',
    name: 'Pause on daily overspend',
    evaluationType: 'TRIGGER',
    filters: [
      {field: 'daily_ratio_spent', operator: 'GREATER_THAN', value: '0.95'},
    ],
    executionType: 'PAUSE',
    covers: 'overspend',
    enabled: true,
    apiOnly: true,
  },
  {
    id: 'rule-disapproved-notify',
    name: 'Notify on disapproval / review',
    evaluationType: 'TRIGGER',
    filters: [
      {
        field: 'effective_status',
        operator: 'IN',
        value: '[DISAPPROVED, PENDING_REVIEW]',
      },
    ],
    executionType: 'NOTIFICATION',
    covers: 'delivery',
    enabled: true,
    apiOnly: true,
  },
  {
    id: 'rule-budget-change-notify',
    name: 'Notify on budget change',
    evaluationType: 'TRIGGER',
    filters: [{field: 'daily_budget', operator: 'GREATER_THAN', value: '0'}],
    executionType: 'NOTIFICATION',
    covers: 'overspend',
    enabled: true,
    apiOnly: true,
  },
  {
    id: 'rule-daily-cost-audit',
    name: 'Daily cost-per-result audit',
    evaluationType: 'SCHEDULE',
    scheduleType: 'DAILY',
    filters: [
      {field: 'cost_per_result', operator: 'GREATER_THAN', value: '5000'},
    ],
    executionType: 'NOTIFICATION',
    covers: 'best_practice',
    enabled: false,
    apiOnly: false,
  },
];

// ---------------------------------------------------------------------------
// Sample accounts
// ---------------------------------------------------------------------------

function ad(id: string, name: string, hasCreative = true): Ad {
  return {id, name, effectiveStatus: 'ACTIVE', hasCreative};
}

export const ACCOUNTS: Account[] = [
  {
    id: '4021547788',
    name: 'Northwind Retail',
    currency: 'USD',
    campaigns: [
      {
        id: '615500',
        name: 'SALES_US_PROSP_2026Q3',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'AUCTION',
        bidStrategy: 'COST_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 120000,
        lifetimeBudgetCents: null,
        spendCapCents: 5000000,
        spendTodayCents: 78000,
        spend7dCents: 720000,
        adSets: [
          {
            id: '238450',
            name: 'Prospecting — Advantage+',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'OFFSITE_CONVERSIONS',
            billingEvent: 'IMPRESSIONS',
            isAutobid: false,
            bidAmountCents: 1800,
            advantagePlacements: true,
            ads: [
              ad('991201', 'Hero Video — May'),
              ad('991202', 'Carousel — Bestsellers'),
            ],
          },
        ],
      },
      {
        id: '615570',
        name: 'always-on retargeting',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'AUCTION',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 60000,
        lifetimeBudgetCents: null,
        spendCapCents: null,
        spendTodayCents: 58000,
        spend7dCents: 402000,
        adSets: [
          {
            id: '238460',
            name: 'Retargeting — Feed only',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'LINK_CLICKS',
            billingEvent: 'LINK_CLICKS',
            isAutobid: true,
            bidAmountCents: null,
            advantagePlacements: false,
            ads: [ad('991210', 'Dynamic — Catalogue')],
          },
        ],
      },
    ],
  },
  {
    id: '7798452310',
    name: 'Lumen Skincare',
    currency: 'USD',
    campaigns: [
      {
        id: '609120',
        name: 'SALES_US_LOOKAL_2026Q3',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'AUCTION',
        bidStrategy: 'LOWEST_COST_WITH_BID_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 200000,
        lifetimeBudgetCents: null,
        spendCapCents: 8000000,
        spendTodayCents: 96000,
        spend7dCents: 1280000,
        adSets: [
          {
            id: '771001',
            name: 'Lookalike 1% — Advantage+',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'OFFSITE_CONVERSIONS',
            billingEvent: 'IMPRESSIONS',
            isAutobid: false,
            bidAmountCents: 2100,
            advantagePlacements: true,
            ads: [
              ad('771010', 'UGC Reel — Glow'),
              ad('771011', 'Static — Serum'),
            ],
          },
        ],
      },
      {
        id: '609140',
        name: 'LEADS_US_NEWSLTR_2026Q3',
        objective: 'OUTCOME_LEADS',
        status: 'ACTIVE',
        effectiveStatus: 'PENDING_REVIEW',
        buyingType: 'AUCTION',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 40000,
        lifetimeBudgetCents: null,
        spendCapCents: null,
        spendTodayCents: 0,
        spend7dCents: 0,
        adSets: [
          {
            id: '771020',
            name: 'Newsletter sign-ups',
            effectiveStatus: 'PENDING_REVIEW',
            optimizationGoal: 'LEAD_GENERATION',
            billingEvent: 'IMPRESSIONS',
            isAutobid: true,
            bidAmountCents: null,
            advantagePlacements: true,
            ads: [ad('771030', 'Lead form — Skincare tips')],
          },
        ],
      },
    ],
  },
  {
    id: '1130984472',
    name: 'Atlas Outdoors',
    currency: 'USD',
    campaigns: [
      {
        id: '113020',
        name: 'Winter Prospecting Q3',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effectiveStatus: 'DISAPPROVED',
        buyingType: 'AUCTION',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 90000,
        lifetimeBudgetCents: null,
        spendCapCents: null,
        spendTodayCents: 87000,
        spend7dCents: 540000,
        adSets: [
          {
            id: '113001',
            name: 'Cold prospecting',
            effectiveStatus: 'DISAPPROVED',
            optimizationGoal: 'LINK_CLICKS',
            billingEvent: 'LINK_CLICKS',
            isAutobid: true,
            bidAmountCents: null,
            advantagePlacements: false,
            ads: [
              ad('113010', 'Backpack promo', false),
              ad('113011', 'Tent promo'),
            ],
          },
        ],
      },
      {
        id: '113040',
        name: 'AWARENESS_US_BRAND_2026Q3',
        objective: 'OUTCOME_AWARENESS',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'RESERVED',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        specialAdCategories: [],
        dailyBudgetCents: null,
        lifetimeBudgetCents: 3000000,
        spendCapCents: 3000000,
        spendTodayCents: 41000,
        spend7dCents: 2550000,
        adSets: [
          {
            id: '113050',
            name: 'Reach — All placements',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'REACH',
            billingEvent: 'IMPRESSIONS',
            isAutobid: true,
            bidAmountCents: null,
            advantagePlacements: true,
            ads: [ad('113060', 'Brand film 30s')],
          },
        ],
      },
    ],
  },
  {
    id: '5563201998',
    name: 'Verdant Home',
    currency: 'GBP',
    campaigns: [
      {
        id: '556201',
        name: 'SALES_GB_PROSP_2026Q3',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'AUCTION',
        bidStrategy: 'COST_CAP',
        specialAdCategories: [],
        dailyBudgetCents: 72000,
        lifetimeBudgetCents: null,
        spendCapCents: 4000000,
        spendTodayCents: 51000,
        spend7dCents: 470000,
        adSets: [
          {
            id: '556202',
            name: 'Prospecting — Advantage+',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'OFFSITE_CONVERSIONS',
            billingEvent: 'IMPRESSIONS',
            isAutobid: false,
            bidAmountCents: 1600,
            advantagePlacements: true,
            ads: [
              ad('556210', 'Sofa — Summer'),
              ad('556211', 'Rug — Carousel'),
            ],
          },
        ],
      },
      {
        id: '556230',
        name: 'CREDIT_GB_FINANCE_2026Q3',
        objective: 'OUTCOME_LEADS',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        buyingType: 'AUCTION',
        bidStrategy: 'LOWEST_COST_WITH_BID_CAP',
        specialAdCategories: ['CREDIT'],
        dailyBudgetCents: 50000,
        lifetimeBudgetCents: null,
        spendCapCents: 2500000,
        spendTodayCents: 47500,
        spend7dCents: 330000,
        adSets: [
          {
            id: '556240',
            name: 'Finance leads — Advantage+',
            effectiveStatus: 'ACTIVE',
            optimizationGoal: 'LEAD_GENERATION',
            billingEvent: 'IMPRESSIONS',
            isAutobid: true,
            bidAmountCents: null,
            advantagePlacements: true,
            ads: [ad('556250', 'Finance lead form')],
          },
        ],
      },
    ],
  },
];

export function accountById(id: string): Account {
  return ACCOUNTS.find(a => a.id === id) ?? ACCOUNTS[0];
}
