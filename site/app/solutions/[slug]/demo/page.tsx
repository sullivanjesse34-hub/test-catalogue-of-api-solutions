import type {ComponentType} from 'react';

import {notFound} from 'next/navigation';

import {ApiConsoleProvider} from '@/app/components/api-console/ApiConsoleProvider';
import {CAT_ICON} from '@/app/components/console/categoryMeta';
import {ConsoleShell} from '@/app/components/console/ConsoleShell';
import {AiCreativeEnhancerDashboard} from '@/app/components/demos/ai-creative-enhancer/AiCreativeEnhancerDashboard';
import {AudienceUploaderDashboard} from '@/app/components/demos/audience-uploader/AudienceUploaderDashboard';
import {CatalogueBatchFeedDashboard} from '@/app/components/demos/catalogue-batch-feed/CatalogueBatchFeedDashboard';
import {CatalogueHealthDashboard} from '@/app/components/demos/catalogue-health/CatalogueHealthDashboard';
import {ConversionsApiGatewayControlPanel} from '@/app/components/demos/conversions-api-gateway-control-panel/ConversionsApiGatewayControlPanel';
import {CreativeFatigueDashboard} from '@/app/components/demos/creative-fatigue/CreativeFatigueDashboard';
import {ExperimentAnalysisDashboard} from '@/app/components/demos/experiment-analysis/ExperimentAnalysisDashboard';
import {FacebookCreatorDiscoveryDashboard} from '@/app/components/demos/facebook-creator-discovery/FacebookCreatorDiscoveryDashboard';
import {InsightsDataWarehouseDashboard} from '@/app/components/demos/insights-data-warehouse-dashboard/InsightsDataWarehouseDashboard';
import {InstagramCreatorDiscoveryDashboard} from '@/app/components/demos/instagram-creator-discovery/InstagramCreatorDiscoveryDashboard';
import {LeadsRetrievalSetupChecker} from '@/app/components/demos/leads-retrieval-set-up-checker/LeadsRetrievalSetupChecker';
import {MarketingMixModellingDashboard} from '@/app/components/demos/marketing-mix-modelling-robyn/MarketingMixModellingDashboard';
import {OpportunityDashboard} from '@/app/components/demos/opportunity-score/OpportunityDashboard';
import {PartnershipAdsBoosterDashboard} from '@/app/components/demos/partnership-ads-booster/PartnershipAdsBoosterDashboard';
import {QualityAssuranceDashboard} from '@/app/components/demos/quality-assurance/QualityAssuranceDashboard';
import {RecommendedCreatorContentDashboard} from '@/app/components/demos/recommended-creator-content/RecommendedCreatorContentDashboard';
import {ReelsPerformantCreativeDashboard} from '@/app/components/demos/reels-performant-creative-dashboard/ReelsPerformantCreativeDashboard';
import {ReservationPlannerDashboard} from '@/app/components/demos/reservation-planner/ReservationPlannerDashboard';
import {SignalsHealthDashboard} from '@/app/components/demos/signals-health/SignalsHealthDashboard';
import {SignalsOpportunityDashboard} from '@/app/components/demos/signals-opportunity-dashboard/SignalsOpportunityDashboard';
import {TargetingReachEstimateDashboard} from '@/app/components/demos/targeting-reach-estimate/TargetingReachEstimateDashboard';
import {ValueRulesManager} from '@/app/components/demos/value-rules-engine/ValueRulesManager';
import {getCategory, getSolution} from '@/lib/catalogue';

interface DemoDef {
  Component: ComponentType;
  heading: string;
  intro: string;
}

const DEMOS = new Map<string, DemoDef>([
  [
    'opportunity-score-dashboard',
    {
      Component: OpportunityDashboard,
      heading: 'Opportunity Score Dashboard',
      intro:
        "Review Meta's opportunity score and performance recommendations across the portfolio, then adopt best practices in one click and watch each account's score respond.",
    },
  ],
  [
    'signals-health-dashboard',
    {
      Component: SignalsHealthDashboard,
      heading: 'Signals Health Dashboard',
      intro:
        'Monitor event match quality, CAPI coverage, and signal maturity across your portfolio — with codified best-practice checks and remediation actions from the Dataset Quality API.',
    },
  ],
  [
    'value-rules-engine',
    {
      Component: ValueRulesManager,
      heading: 'Value rules manager',
      intro:
        'Build value rule sets across ad accounts — adjust bids for high-value audience slices, reorder rules (first match wins), and duplicate a set to another account. Limits and eligibility are enforced as you go.',
    },
  ],
  [
    'catalogue-health-dashboard',
    {
      Component: CatalogueHealthDashboard,
      heading: 'Catalogue Health Dashboard',
      intro:
        'Monitor match rates, diagnostics, product completeness, and video coverage across your catalogue portfolio — with codified health checks and remediation actions.',
    },
  ],
  [
    'catalogue-batch-feed-optimiser',
    {
      Component: CatalogueBatchFeedDashboard,
      heading: 'Catalogue Batch & Feed Optimiser',
      intro:
        'Compose and submit batch operations (items_batch CREATE/UPDATE/DELETE with a live request preview), trigger and schedule feed uploads, and monitor ingestion, validation, and video coverage across your product catalogues. Toggle the API view to see every Marketing API call as you go.',
    },
  ],
  [
    'creative-fatigue-notifier',
    {
      Component: CreativeFatigueDashboard,
      heading: 'Creative Fatigue Notifier',
      intro:
        'Receive and act on creative fatigue alerts in real time via webhooks and the Performance Recommendations API — duplicate fatigued ads and refresh creatives before performance drops.',
    },
  ],
  [
    'ai-creative-enhancer',
    {
      Component: AiCreativeEnhancerDashboard,
      heading: 'AI Creative Enhancer',
      intro:
        'Control Advantage+ Creative features across your ad portfolio — toggle AI enhancements, preview results per placement, and launch with the PAUSED-first safety flow.',
    },
  ],
  [
    'reels-performant-creative-dashboard',
    {
      Component: ReelsPerformantCreativeDashboard,
      heading: 'Reels Performant Creative Dashboard',
      intro:
        'Score every reels-placement ad against the performant-creative checks (9:16, bottom safe zone, audio on, video), then opt into the Advantage+ features that close each gap.',
    },
  ],
  [
    'facebook-creator-discovery',
    {
      Component: FacebookCreatorDiscoveryDashboard,
      heading: 'Facebook Creator Discovery',
      intro:
        'A searchable marketplace that surfaces Facebook content creators by category, audience, and engagement using the Facebook Creator Discovery API, with agency brand-safety signals blended on top.',
    },
  ],
  [
    'instagram-creator-discovery',
    {
      Component: InstagramCreatorDiscoveryDashboard,
      heading: 'Instagram Creator Discovery',
      intro:
        'A marketplace that surfaces personalised Instagram creator recommendations for partnership ads via the Instagram Creator Marketplace API — rank by recommendation type, filter on interests, followers, and audience, inspect reels and reach insights, and blend in agency brand-safety scoring.',
    },
  ],
  [
    'partnership-ads-booster',
    {
      Component: PartnershipAdsBoosterDashboard,
      heading: 'Partnership Ads Booster',
      intro:
        'Discover permissioned branded-content posts, verify partnership-ad eligibility, and boost them into partnership ads through the Ads API.',
    },
  ],
  [
    'recommended-creator-content',
    {
      Component: RecommendedCreatorContentDashboard,
      heading: 'Recommended Creator Content',
      intro:
        "Browse Meta's AI-recommended creator posts and turn permissioned, eligible content into partnership ads in a few clicks.",
    },
  ],
  [
    'leads-retrieval-set-up-checker',
    {
      Component: LeadsRetrievalSetupChecker,
      heading: 'Leads Retrieval Set-Up Checker',
      intro:
        'Run end-to-end checks across app permissions, webhooks, page install, test leads, and bulk retrieval so agencies can spot and fix lead ads setup gaps fast.',
    },
  ],
  [
    'experiment-analysis',
    {
      Component: ExperimentAnalysisDashboard,
      heading: 'Experiment Analysis',
      intro:
        'Standardise, read, and benchmark lift studies and creative tests across every business using the Ad Studies API.',
    },
  ],
  [
    'marketing-mix-modelling-robyn',
    {
      Component: MarketingMixModellingDashboard,
      heading: 'Marketing Mix Modelling (Robyn)',
      intro:
        "An end-to-end MMM built on Meta's open-source Robyn library and the Insights API MMM export, decomposing sales into channel contributions and reallocating budget for maximum modelled return.",
    },
  ],
  [
    'quality-assurance',
    {
      Component: QualityAssuranceDashboard,
      heading: 'Campaign Quality Assurance',
      intro:
        'Audit campaign setups across an ad account for best practices, overspend risks, and naming taxonomies, then codify the fixes as Ad Rules Engine rules.',
    },
  ],
  [
    'audience-uploader',
    {
      Component: AudienceUploaderDashboard,
      heading: 'Audience Uploader',
      intro:
        'Upload first-party customer files to Custom Audiences at scale with client-side SHA-256 hashing and match-rate estimation via the Meta Audience API.',
    },
  ],
  [
    'insights-data-warehouse-dashboard',
    {
      Component: InsightsDataWarehouseDashboard,
      heading: 'Insights Data Warehouse & Dashboard',
      intro:
        'Centralised, benchmarkable reporting that extracts Insights API data across advertiser accounts into a siloed warehouse and runs async report jobs on demand.',
    },
  ],
  [
    'targeting-reach-estimate',
    {
      Component: TargetingReachEstimateDashboard,
      heading: 'Targeting & Reach Estimate',
      intro:
        'Search Meta’s targeting taxonomy, assemble a targeting spec, and see the estimated audience size and reach update live.',
    },
  ],
  [
    'reservation-planner',
    {
      Component: ReservationPlannerDashboard,
      heading: 'Reservation Planner',
      intro:
        'Simulate reach & frequency reservation predictions, plot the reach/budget curve, and reserve the most cost-efficient point before assigning it to an ad set.',
    },
  ],
  [
    'conversions-api-gateway-control-panel',
    {
      Component: ConversionsApiGatewayControlPanel,
      heading: 'Conversions API Gateway Control Panel',
      intro:
        "Manage every client's Conversions API Gateway instance from one panel — connect pixels, toggle event ingestion and CAPI publishing, invite users, and roll out versions via the Control Plane API.",
    },
  ],
  [
    'signals-opportunity-dashboard',
    {
      Component: SignalsOpportunityDashboard,
      heading: 'Signals Opportunity Dashboard',
      intro:
        'Surfaces the highest-value pixels whose web-connected spend and events are not yet flowing through the Conversions API, ranked by projected AR upside with one-click adoption.',
    },
  ],
]);

export function generateStaticParams() {
  return Array.from(DEMOS.keys(), slug => ({slug}));
}

export default async function SolutionDemoPage({
  params,
}: {
  params: Promise<{slug: string}>;
}) {
  const {slug} = await params;
  const demo = DEMOS.get(slug);
  const solution = getSolution(slug);
  if (!demo || !solution) notFound();

  const {Component} = demo;
  const category = getCategory(solution.category);
  const Icon = CAT_ICON[solution.category];

  return (
    <ConsoleShell activeSlug={slug}>
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl"
            style={{
              color: category.accentVar,
              background: `color-mix(in srgb, ${category.accentVar} 14%, transparent)`,
            }}
            aria-hidden>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-balance text-2xl font-extrabold tracking-[-0.02em]">
                {demo.heading}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                <span
                  className="size-[7px] rounded-full"
                  style={{background: category.accentVar}}
                  aria-hidden
                />
                {category.label}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-pretty text-[13px] leading-relaxed text-ink-2">
              {demo.intro}
            </p>
          </div>
          <span className="ml-auto shrink-0 self-start rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-ink-3">
            Sample data
          </span>
        </div>
        <ApiConsoleProvider>
          <Component />
        </ApiConsoleProvider>
      </div>
    </ConsoleShell>
  );
}
