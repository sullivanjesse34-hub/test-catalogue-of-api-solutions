/**
 * Representative sample data for the Value Rules Engine demo.
 *
 * UI prototype only — shaped like the Value Rules API (value rule sets, rules,
 * criteria, bid adjustments). No real Marketing API calls are made.
 * See docs/solutions/performance/value-rules-engine.md.
 */

export type CriteriaType =
  | 'AGE'
  | 'GENDER'
  | 'OS_TYPE'
  | 'DEVICE_PLATFORM'
  | 'LOCATION'
  | 'PLACEMENT'
  | 'OMNI_CHANNEL';

export type AdjustSign = 'INCREASE' | 'DECREASE';

/** Bid strategies a rule set can be attached to. */
export type BidStrategy =
  'LOWEST_COST_WITHOUT_CAP' | 'COST_CAP' | 'LOWEST_COST_WITH_BID_CAP';

export interface Criterion {
  type: CriteriaType;
  values: string[];
}

export interface ValueRule {
  id: string;
  adjustSign: AdjustSign;
  /** Percent. INCREASE 1–1000, DECREASE 1–90. */
  adjustValue: number;
  criteria: Criterion[];
}

export interface ValueRuleSet {
  id: string;
  name: string;
  /** The ad set this set is attached to, or null when unattached. */
  attachedAdSet: string | null;
  bidStrategy: BidStrategy | null;
  rules: ValueRule[];
}

export interface VrAccount {
  id: string;
  name: string;
  ruleSets: ValueRuleSet[];
}

/** Documented Value Rules limits (enforce in code per the spec). */
export const LIMITS = {
  setsPerAccount: 6,
  rulesPerSet: 10,
  criteriaPerRule: 4,
};

export function adjustBounds(sign: AdjustSign): {min: number; max: number} {
  return sign === 'INCREASE' ? {min: 1, max: 1000} : {min: 1, max: 90};
}

export const CRITERIA_TYPES: CriteriaType[] = [
  'AGE',
  'GENDER',
  'OS_TYPE',
  'DEVICE_PLATFORM',
  'LOCATION',
  'PLACEMENT',
  'OMNI_CHANNEL',
];

export const CRITERIA_LABEL: Record<CriteriaType, string> = {
  AGE: 'Age',
  GENDER: 'Gender',
  OS_TYPE: 'OS',
  DEVICE_PLATFORM: 'Device',
  LOCATION: 'Location',
  PLACEMENT: 'Placement',
  OMNI_CHANNEL: 'Conversion location',
};

export const CRITERIA_VALUES: Record<CriteriaType, string[]> = {
  AGE: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  GENDER: ['Female', 'Male'],
  OS_TYPE: ['iOS', 'Android'],
  DEVICE_PLATFORM: ['Mobile', 'Desktop'],
  LOCATION: [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
  ],
  PLACEMENT: ['Feed', 'Reels', 'Stories', 'Search', 'Marketplace'],
  OMNI_CHANNEL: ['Website', 'App', 'Physical store'],
};

export const BID_STRATEGY_LABEL: Record<BidStrategy, string> = {
  LOWEST_COST_WITHOUT_CAP: 'Highest volume (auto-bid)',
  COST_CAP: 'Cost cap',
  LOWEST_COST_WITH_BID_CAP: 'Bid cap',
};

/** Value rules are eligible only on auto-bid or cost-cap strategies. */
export function isEligible(strategy: BidStrategy | null): boolean {
  return strategy === 'LOWEST_COST_WITHOUT_CAP' || strategy === 'COST_CAP';
}

/** Rule sets with any rule of >2 criteria are read-only in Ads Manager. */
export function isRuleReadOnly(rule: ValueRule): boolean {
  return rule.criteria.length > 2;
}

export function formatAdjust(rule: ValueRule): string {
  const sign = rule.adjustSign === 'INCREASE' ? '+' : '−';
  return `${sign}${rule.adjustValue}%`;
}

export const ACCOUNTS: VrAccount[] = [
  {
    id: '4021547788',
    name: 'Northwind Retail',
    ruleSets: [
      {
        id: 'nw-set-1',
        name: 'Q3 Value — High LTV',
        attachedAdSet: 'Prospecting · Broad',
        bidStrategy: 'COST_CAP',
        rules: [
          {
            id: 'nw-r1',
            adjustSign: 'INCREASE',
            adjustValue: 25,
            criteria: [{type: 'AGE', values: ['25-34', '35-44']}],
          },
          {
            id: 'nw-r2',
            adjustSign: 'INCREASE',
            adjustValue: 15,
            criteria: [{type: 'GENDER', values: ['Female']}],
          },
          {
            id: 'nw-r3',
            adjustSign: 'DECREASE',
            adjustValue: 20,
            criteria: [{type: 'DEVICE_PLATFORM', values: ['Desktop']}],
          },
        ],
      },
      {
        id: 'nw-set-2',
        name: 'Returning Customers',
        attachedAdSet: null,
        bidStrategy: null,
        rules: [
          {
            id: 'nw-r4',
            adjustSign: 'INCREASE',
            adjustValue: 30,
            criteria: [{type: 'LOCATION', values: ['United States']}],
          },
        ],
      },
    ],
  },
  {
    id: '7798452310',
    name: 'Lumen Skincare',
    ruleSets: [
      {
        id: 'lm-set-1',
        name: 'AOV Optimisation',
        attachedAdSet: 'Conversions · Web',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        rules: [
          {
            id: 'lm-r1',
            adjustSign: 'INCREASE',
            adjustValue: 40,
            criteria: [
              {type: 'AGE', values: ['35-44', '45-54']},
              {type: 'GENDER', values: ['Female']},
              {type: 'OS_TYPE', values: ['iOS']},
            ],
          },
          {
            id: 'lm-r2',
            adjustSign: 'INCREASE',
            adjustValue: 20,
            criteria: [{type: 'OMNI_CHANNEL', values: ['Website']}],
          },
        ],
      },
    ],
  },
  {
    id: '1130984472',
    name: 'Atlas Outdoors',
    ruleSets: [
      {
        id: 'at-set-1',
        name: 'Bid Cap Test',
        attachedAdSet: 'Sales · Bid Cap',
        bidStrategy: 'LOWEST_COST_WITH_BID_CAP',
        rules: [
          {
            id: 'at-r1',
            adjustSign: 'INCREASE',
            adjustValue: 15,
            criteria: [{type: 'AGE', values: ['45-54', '55-64']}],
          },
        ],
      },
    ],
  },
];
