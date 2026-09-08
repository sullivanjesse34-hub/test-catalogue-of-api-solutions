'use client';

import {
  BarChart3,
  Building2,
  Check,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import {useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  ACCOUNTS,
  type AdAccount,
  REC_TYPE_TOKEN,
  type Recommendation,
} from '@/lib/demos/opportunity-score';

import {MeasurementView} from './MeasurementView';
import {OverviewView} from './OverviewView';
import {PortfolioView} from './PortfolioView';

type View = 'overview' | 'measurement' | 'portfolio';

const APPLIED_DATE = '2026-06-23';

// Developer-doc links surfaced in the API console for each call.
const DOC_RECS =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations';
const DOC_RECS_HISTORY =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations-history-api';

// The initial reads that populate the dashboard for the selected account.
function buildLoadCalls(account: AdAccount): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `act_${account.id}/recommendations`,
      summary: `Read performance recommendations for ${account.name}`,
      request: {
        fields:
          'type,recommendation_signature,object_ids,recommendation_content,opportunity_score_lift,url,recommendation_time',
      },
      response: {
        data: account.recommendations.map(r => ({
          type: r.type,
          opportunity_score_lift: r.scoreLift,
          recommendation_content: {lift_estimate: r.liftEstimate, body: r.body},
        })),
      },
      status: 'success',
      docsUrl: DOC_RECS,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}`,
      summary: 'Read ad-account opportunity score and cost context',
      request: {fields: 'opportunity_score,name,currency'},
      response: {
        opportunity_score: account.opportunityScore,
        name: account.name,
        currency: account.currency,
      },
      status: 'success',
      docsUrl: DOC_RECS,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}/opportunity_score_history`,
      summary: 'Read opportunity score history with explanations',
      request: {
        from_date: account.history[0]?.date,
        end_date: account.history[account.history.length - 1]?.date,
        get_reason: true,
      },
      response: {
        data: account.history.map(h => ({
          date: h.date,
          opportunity_score: h.score,
          changelog: h.changelog.map(ci => ({
            campaign_id: ci.campaignId,
            score_change: ci.scoreChange,
            campaign_details: ci.campaignDetails.map(d => ({
              ad_object_id: d.adObjectId,
              ad_object_type: d.adObjectType,
              budget_then: d.budgetThen,
              budget_now: d.budgetNow,
              applied_recommendation_types_then:
                d.appliedRecommendationTypesThen,
              applied_recommendation_types_now: d.appliedRecommendationTypesNow,
            })),
          })),
        })),
      },
      status: 'success',
      docsUrl: DOC_RECS_HISTORY,
    },
  ];
}

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'overview', label: 'Overview', icon: LayoutDashboard},
  {id: 'measurement', label: 'Measurement', icon: BarChart3},
  {id: 'portfolio', label: 'Portfolio', icon: Building2},
];

function cloneAccounts(): AdAccount[] {
  return ACCOUNTS.map(a => ({...a, history: [...a.history]}));
}

export function OpportunityDashboard() {
  const {record} = useApiConsole();
  const [accounts, setAccounts] = useState<AdAccount[]>(cloneAccounts);
  const [applied, setApplied] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string>(ACCOUNTS[0].id);
  const [view, setView] = useState<View>('overview');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = accounts.find(a => a.id === selectedId) ?? accounts[0];
  const perAccount = view === 'overview' || view === 'measurement';

  // Log the initial reads that populate the dashboard, re-firing per account.
  useApiLoads(selectedId, () => buildLoadCalls(selected));

  const adopt = (rec: Recommendation) => {
    // One-click applies POST the signature + type-specific extra_data;
    // deeplink recommendations are applied in Ads Manager, so we only re-read
    // the recommendation to refresh its (perishable) signature and url.
    if (rec.applyMode === 'one_click') {
      record({
        method: 'POST',
        endpoint: `act_${selected.id}/recommendations`,
        summary: `Apply “${rec.title}” on ${rec.objectName}`,
        request: {
          recommendation_signature: `sig_${rec.id}`,
          extra_data: rec.extraData,
        },
        response: {success: true},
        status: 'success',
        docsUrl: DOC_RECS,
      });
    } else {
      record({
        method: 'GET',
        endpoint: `act_${selected.id}/recommendations`,
        summary: `Fetch Ads Manager deeplink for “${rec.title}”`,
        request: {
          recommendation_names: REC_TYPE_TOKEN[rec.type],
          fields: 'recommendation_signature,url',
        },
        response: {
          data: [
            {
              recommendation_signature: `sig_${rec.id}`,
              url: 'https://adsmanager.facebook.com/…',
            },
          ],
        },
        status: 'success',
        docsUrl: DOC_RECS,
      });
    }
    // opportunity_score updates in near real-time after an apply — re-read it.
    record({
      method: 'GET',
      endpoint: `act_${selected.id}`,
      summary: 'Re-read opportunity score after apply',
      request: {fields: 'opportunity_score'},
      response: {
        opportunity_score: Math.min(
          100,
          selected.opportunityScore + rec.scoreLift,
        ),
      },
      status: 'success',
      docsUrl: DOC_RECS,
    });

    setAccounts(prev =>
      prev.map(a => {
        if (a.id !== selectedId) return a;
        const score = Math.min(100, a.opportunityScore + rec.scoreLift);
        return {
          ...a,
          opportunityScore: score,
          history: [
            ...a.history,
            {
              date: APPLIED_DATE,
              score,
              changelog: [
                {
                  campaignId: `cmp_${rec.id}`,
                  campaignName: rec.objectName,
                  scoreChange: rec.scoreLift,
                  campaignDetails: [
                    {
                      adObjectId: '0',
                      adObjectType:
                        rec.level === 'ad'
                          ? ('ad' as const)
                          : rec.level === 'ad_set'
                            ? ('ad_set' as const)
                            : ('campaign' as const),
                      appliedRecommendationTypesThen: [],
                      appliedRecommendationTypesNow: [REC_TYPE_TOKEN[rec.type]],
                    },
                  ],
                },
              ],
            },
          ],
        };
      }),
    );
    setApplied(prev => {
      const next = new Set(prev);
      next.add(rec.id);
      return next;
    });
    setToast(`Adopted “${rec.title}” · +${rec.scoreLift} score`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {TABS.map(({id, label, icon: Icon}) => {
            const on = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>

        {perAccount ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Account</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select account"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'overview' ? (
        <OverviewView account={selected} applied={applied} onAdopt={adopt} />
      ) : null}
      {view === 'measurement' ? <MeasurementView account={selected} /> : null}
      {view === 'portfolio' ? (
        <PortfolioView accounts={accounts} applied={applied} />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Check className="size-4 text-[color:var(--green)]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
