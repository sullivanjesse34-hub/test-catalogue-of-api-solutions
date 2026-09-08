'use client';

import {
  CircleCheck,
  Eye,
  Layers,
  type LucideIcon,
  Rocket,
  Settings2,
  Sparkles,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import {useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';
import type {
  AdCreative,
  AdFormat,
  AdStatus,
  CreativeFeature,
} from '@/lib/demos/ai-creative-enhancer';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_FEATURES,
  adRecommendations,
  ADS,
  FEATURE_CATALOGUE,
  hasAiEnrolled,
  REC_META,
  STATUS_META,
  TOTAL_FEATURES,
} from '@/lib/demos/ai-creative-enhancer';

import {
  AiBadge,
  Badge,
  FeatureToggle,
  Insight,
  Kpi,
  PreviewFrame,
  SectionHeading,
  StatusPill,
  type Tone,
} from './ui';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type View = 'ads' | 'features' | 'preview';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'ads', label: 'Ads', icon: Layers},
  {id: 'features', label: 'Features', icon: Settings2},
  {id: 'preview', label: 'Preview', icon: Eye},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

const REC_TONE: Record<string, Tone> = {
  CREATIVE_LIMITED: 'yellow',
  CREATIVE_FATIGUE: 'rose',
};

// Developer-doc links surfaced in the API console for each call.
const DOC_ADVANTAGE_CREATIVE =
  'https://developers.facebook.com/docs/marketing-api/creative/advantage-creative/get-started/';
const DOC_ADS =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/';
const DOC_RECS =
  'https://developers.facebook.com/docs/marketing-api/overview/performance-recommendations';

// ---------------------------------------------------------------------------
// Dashboard root
// ---------------------------------------------------------------------------

// Build the initial reads that populate the dashboard for the selected ad:
// its Advantage+ Creative feature config and any performance recommendations.
function buildLoadCalls(
  ad: AdCreative,
  features: CreativeFeature[],
): ApiCallInput[] {
  const recs = adRecommendations(ad.adId);
  return [
    {
      method: 'GET',
      endpoint: `${ad.adId}/adcreatives`,
      summary: `Read Advantage+ Creative config for ${ad.adName}`,
      request: {
        fields:
          'id,name,degrees_of_freedom_spec{creative_features_spec},effective_status',
      },
      response: {
        data: [
          {
            id: ad.id,
            name: ad.name,
            degrees_of_freedom_spec: {
              creative_features_spec: Object.fromEntries(
                features
                  .filter(f => f.enrolled)
                  .map(f => [
                    f.key,
                    {enroll_status: 'OPT_IN', eligible: f.eligible},
                  ]),
              ),
            },
          },
        ],
      },
      status: 'success',
      docsUrl: DOC_ADVANTAGE_CREATIVE,
    },
    {
      method: 'GET',
      endpoint: `${ad.accountId}/recommendations`,
      summary: 'Read creative performance recommendations',
      request: {
        recommendation_names: 'CREATIVE_LIMITED,CREATIVE_FATIGUE',
        filtering: `[{"field":"ad.id","operator":"EQUAL","value":"${ad.adId}"}]`,
      },
      response: {
        data: recs.map(r => ({ad_id: r.adId, recommendation_name: r.type})),
      },
      status: 'success',
      docsUrl: DOC_RECS,
    },
    {
      method: 'GET',
      endpoint: `${ad.adId}/previews`,
      summary: `Read placement eligibility for ${ad.adName}`,
      request: {
        ad_format: 'MOBILE_FEED_STANDARD',
        creative_feature: 'image_background_gen',
      },
      response: {
        data: [
          {transformation_spec: {image_background_gen: [{status: 'eligible'}]}},
        ],
      },
      status: 'success',
      docsUrl: DOC_ADVANTAGE_CREATIVE,
    },
  ];
}

export function AiCreativeEnhancerDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('ads');
  const [selectedAdId, setSelectedAdId] = useState<string>(ADS[0].adId);

  // Per-ad mutable feature state (deep copy from sample data)
  const [featureState, setFeatureState] = useState<
    Record<string, CreativeFeature[]>
  >(() =>
    Object.fromEntries(
      Object.entries(AD_FEATURES).map(([id, feats]) => [
        id,
        feats.map(f => ({...f})),
      ]),
    ),
  );

  // Snapshot for undo
  const [snapshot, setSnapshot] = useState<Record<
    string,
    CreativeFeature[]
  > | null>(null);

  // Per-ad status overrides (for the "launch" action)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AdStatus>
  >({});

  const selectedAd = ADS.find(a => a.adId === selectedAdId) ?? ADS[0];
  const selectedFeatures = featureState[selectedAdId] ?? [];

  // Log the initial reads that populate the dashboard, re-firing per ad.
  useApiLoads(selectedAdId, () => buildLoadCalls(selectedAd, selectedFeatures));

  function handleFeatureToggle(
    adId: string,
    featureKey: string,
    enrolled: boolean,
  ) {
    if (!snapshot) {
      setSnapshot(
        Object.fromEntries(
          Object.entries(featureState).map(([id, feats]) => [
            id,
            feats.map(f => ({...f})),
          ]),
        ),
      );
    }
    const ad = ADS.find(a => a.adId === adId) ?? ADS[0];
    const nextFeatures = (featureState[adId] ?? []).map(f =>
      f.key === featureKey ? {...f, enrolled} : f,
    );
    const feature = nextFeatures.find(f => f.key === featureKey);
    const anyAiOn = hasAiEnrolled(nextFeatures);
    // AI-generated features must be reviewed before serving, so opting one in
    // forces the ad to PAUSED per the Advantage+ Creative spec.
    record({
      method: 'POST',
      endpoint: `${ad.accountId}/adcreatives`,
      summary: `${enrolled ? 'Opt in' : 'Opt out'} ${feature?.label ?? featureKey} — ${ad.adName}`,
      request: {
        degrees_of_freedom_spec: {
          creative_features_spec: {
            [featureKey]: {
              enroll_status: enrolled ? 'OPT_IN' : 'OPT_OUT',
            },
          },
        },
        ...(anyAiOn ? {status: 'PAUSED'} : {}),
      },
      response: {id: ad.id, effective_status: anyAiOn ? 'PAUSED' : ad.status},
      status: 'success',
      docsUrl: DOC_ADVANTAGE_CREATIVE,
    });
    setFeatureState(prev => ({
      ...prev,
      [adId]: (prev[adId] ?? []).map(f =>
        f.key === featureKey ? {...f, enrolled} : f,
      ),
    }));
  }

  function handleUndo() {
    if (snapshot) {
      setFeatureState(snapshot);
      setSnapshot(null);
    }
  }

  function handleLaunch(adId: string) {
    const ad = ADS.find(a => a.adId === adId) ?? ADS[0];
    // PAUSED-first safety flow: the ad was held at PAUSED for creative review;
    // launching flips it live only after the user has approved the previews.
    record({
      method: 'POST',
      endpoint: ad.adId,
      summary: `Launch — set ${ad.adName} to ACTIVE`,
      request: {status: 'ACTIVE'},
      response: {id: ad.adId, effective_status: 'ACTIVE', success: true},
      status: 'success',
      docsUrl: DOC_ADS,
    });
    setStatusOverrides(prev => ({...prev, [adId]: 'active'}));
    setSnapshot(null);
  }

  function adStatus(ad: AdCreative): AdStatus {
    const override = statusOverrides[ad.adId] as AdStatus | undefined;
    if (override) return override;
    const feats = featureState[ad.adId] ?? [];
    if (hasAiEnrolled(feats) && ad.status === 'active') {
      return 'paused';
    }
    return ad.status;
  }

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

        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Ad</span>
          <select
            value={selectedAdId}
            onChange={e => {
              setSelectedAdId(e.target.value);
            }}
            aria-label="Select ad"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creative)]">
            {ADS.map(a => (
              <option key={a.adId} value={a.adId}>
                {a.adName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'ads' ? (
        <AdsView
          featureState={featureState}
          adStatus={adStatus}
          selectedAdId={selectedAdId}
          onSelect={id => {
            setSelectedAdId(id);
            setView('features');
          }}
        />
      ) : null}
      {view === 'features' ? (
        <FeaturesView
          ad={selectedAd}
          features={selectedFeatures}
          effectiveStatus={adStatus(selectedAd)}
          hasChanges={snapshot !== null}
          onToggle={(key, enrolled) => {
            handleFeatureToggle(selectedAdId, key, enrolled);
          }}
          onUndo={handleUndo}
        />
      ) : null}
      {view === 'preview' ? (
        <PreviewView
          ad={selectedAd}
          features={selectedFeatures}
          effectiveStatus={adStatus(selectedAd)}
          onLaunch={() => {
            handleLaunch(selectedAdId);
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ads View
// ---------------------------------------------------------------------------

function AdsView({
  featureState,
  adStatus,
  selectedAdId,
  onSelect,
}: {
  featureState: Record<string, CreativeFeature[]>;
  adStatus: (ad: AdCreative) => AdStatus;
  selectedAdId: string;
  onSelect: (adId: string) => void;
}) {
  const totalAds = ADS.length;
  const adsWithAi = ADS.filter(a =>
    (featureState[a.adId] ?? []).some(f => f.enrolled && f.category === 'ai'),
  ).length;
  const adsWithRecs = new Set(
    ADS.filter(a => adRecommendations(a.adId).length > 0).map(a => a.adId),
  ).size;
  const totalEnrolled = ADS.reduce(
    (s, a) => s + (featureState[a.adId] ?? []).filter(f => f.enrolled).length,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total ads"
          value={String(totalAds)}
          note="across all accounts"
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="AI features active"
          value={String(adsWithAi)}
          note={`of ${totalAds} ads`}
          accentVar="var(--purple)"
        />
        <Kpi
          label="Recommendations"
          value={String(adsWithRecs)}
          note="ads need attention"
          noteTone={adsWithRecs > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Features enrolled"
          value={String(totalEnrolled)}
          note={`of ${totalAds * TOTAL_FEATURES} possible`}
          accentVar="var(--green)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Ads · Advantage+ Creative enrollment
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Ad</th>
                <th className={TH}>Account</th>
                <th className={TH}>Status</th>
                <th className={TH}>Enrolled</th>
                <th className={TH}>AI features</th>
                <th className={TH}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {ADS.map(ad => {
                const recs = adRecommendations(ad.adId);
                const feats = featureState[ad.adId] ?? [];
                const enrolled = feats.filter(f => f.enrolled).length;
                const aiCount = feats.filter(
                  f => f.enrolled && f.category === 'ai',
                ).length;
                const active = ad.adId === selectedAdId;
                const status = adStatus(ad);

                return (
                  <tr
                    key={ad.adId}
                    onClick={() => {
                      onSelect(ad.adId);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {ad.adName}
                      </div>
                      <div className="text-[11px] text-ink-3">
                        {ad.campaignName}
                      </div>
                    </td>
                    <td className={TD}>{ad.accountName}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">
                        {enrolled}
                      </span>
                      <span className="text-[11px] text-ink-3">
                        /{TOTAL_FEATURES}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {aiCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <AiBadge />
                          <span className="text-[11px] tabular-nums text-ink-2">
                            {aiCount}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">None</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {recs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {recs.map(r => (
                            <Badge
                              key={r.type}
                              tone={REC_TONE[r.type] ?? 'muted'}>
                              {REC_META[r.type].label}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Insight>
        <strong className="text-ink">Tip:</strong> Click any ad row to jump to
        the Features tab and manage its Advantage+ Creative enrollment. Ads
        flagged with Creative Limited or Creative Fatigue are prime candidates
        for enabling additional features.
      </Insight>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Features View
// ---------------------------------------------------------------------------

function FeaturesView({
  ad,
  features,
  effectiveStatus,
  hasChanges,
  onToggle,
  onUndo,
}: {
  ad: AdCreative;
  features: CreativeFeature[];
  effectiveStatus: AdStatus;
  hasChanges: boolean;
  onToggle: (key: string, enrolled: boolean) => void;
  onUndo: () => void;
}) {
  const aiFeatures = features.filter(f => f.category === 'ai');
  const stdFeatures = features.filter(f => f.category === 'standard');
  const enrolledNow = features.filter(f => f.enrolled).length;
  const aiEnrolledNow = aiFeatures.filter(f => f.enrolled).length;
  const anyAiOn = hasAiEnrolled(features);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{ad.adName}</h2>
          <p className="text-[13px] text-ink-2">
            {ad.campaignName} &middot; {ad.accountName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={effectiveStatus} />
          {hasChanges ? (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <Undo2 className="size-3.5" />
              Undo
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Features enrolled"
          value={`${enrolledNow}/${TOTAL_FEATURES}`}
          note="for this ad"
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="AI features"
          value={String(aiEnrolledNow)}
          note={`of ${aiFeatures.length} available`}
          accentVar="var(--purple)"
        />
        <Kpi
          label="Eligible"
          value={String(features.filter(f => f.eligible).length)}
          note={`of ${TOTAL_FEATURES} features`}
          accentVar="var(--green)"
        />
        <Kpi
          label="Status"
          value={
            effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)
          }
          note={anyAiOn ? 'paused for AI review' : 'no AI features'}
          noteTone={anyAiOn ? 'down' : 'up'}
          accentVar={STATUS_META[effectiveStatus].colorVar}
        />
      </div>

      {anyAiOn ? (
        <div
          className="flex items-start gap-2 rounded-lg border p-3 text-[13px] leading-relaxed text-ink-2"
          style={{
            borderColor:
              'color-mix(in srgb, var(--cat-measurement) 40%, transparent)',
            background:
              'color-mix(in srgb, var(--cat-measurement) 8%, transparent)',
          }}>
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-[color:var(--cat-measurement)]"
            aria-hidden
          />
          <span>
            <strong className="text-ink">AI features enabled.</strong> Per the
            spec, any ad with AI-generated creative must be set to PAUSED for
            review before it can go live. Use the Preview tab to review and
            launch.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <SectionHeading
            title="AI features"
            sub="Powered by generative AI — requires PAUSED status for review."
          />
          <div className="flex flex-col gap-2">
            {aiFeatures.map(f => (
              <FeatureToggle
                key={f.key}
                label={f.label}
                category={f.category}
                enrolled={f.enrolled}
                eligible={f.eligible}
                onChange={val => {
                  onToggle(f.key, val);
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionHeading
            title="Standard features"
            sub="Non-AI Advantage+ Creative optimisations."
          />
          <div className="flex flex-col gap-2">
            {stdFeatures.map(f => (
              <FeatureToggle
                key={f.key}
                label={f.label}
                category={f.category}
                enrolled={f.enrolled}
                eligible={f.eligible}
                onChange={val => {
                  onToggle(f.key, val);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">Feature details</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Feature</th>
                <th className={TH}>Category</th>
                <th className={TH}>Status</th>
                <th className={TH}>Eligible</th>
                <th className={TH}>Description</th>
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.key} className="border-t border-border">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                    {f.label}
                  </td>
                  <td className="px-3 py-2.5">
                    {f.category === 'ai' ? (
                      <AiBadge size="md" />
                    ) : (
                      <Badge tone="blue">Standard</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {f.enrolled ? (
                      <Badge tone="green">Opted in</Badge>
                    ) : (
                      <Badge tone="muted">Opted out</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {f.eligible ? (
                      <CircleCheck className="size-4 text-[color:var(--green)]" />
                    ) : (
                      <span className="text-[11px] text-ink-3">No</span>
                    )}
                  </td>
                  <td className={`${TD} max-w-[260px]`}>
                    <span className="line-clamp-2">{f.description}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview View
// ---------------------------------------------------------------------------

const PREVIEW_FORMATS: AdFormat[] = [
  'MOBILE_FEED_STANDARD',
  'INSTAGRAM_REELS',
  'INSTAGRAM_STORY',
];

function PreviewView({
  ad,
  features,
  effectiveStatus,
  onLaunch,
}: {
  ad: AdCreative;
  features: CreativeFeature[];
  effectiveStatus: AdStatus;
  onLaunch: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const enrolledFeatures = features.filter(f => f.enrolled);
  const eligibleEnrolled = enrolledFeatures.filter(f => f.eligible);
  const anyAiOn = hasAiEnrolled(features);
  const isLive = effectiveStatus === 'active';

  const [previewFeature, setPreviewFeature] = useState<string>(
    enrolledFeatures[0]?.key ?? FEATURE_CATALOGUE[0].key,
  );

  const currentFeature = features.find(f => f.key === previewFeature);
  const currentMeta = FEATURE_CATALOGUE.find(f => f.key === previewFeature);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{ad.adName}</h2>
          <p className="text-[13px] text-ink-2">
            {ad.campaignName} &middot; {ad.accountName}
          </p>
        </div>
        <StatusPill status={effectiveStatus} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Enrolled features"
          value={String(enrolledFeatures.length)}
          note={`${eligibleEnrolled.length} eligible`}
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="Placements"
          value={String(PREVIEW_FORMATS.length)}
          note="preview formats"
          accentVar="var(--purple)"
        />
        <Kpi
          label="AI features"
          value={anyAiOn ? 'Yes' : 'No'}
          note={anyAiOn ? 'review required' : 'no review needed'}
          noteTone={anyAiOn ? 'down' : 'up'}
          accentVar="var(--cat-measurement)"
        />
        <Kpi
          label="Status"
          value={isLive ? 'Live' : 'Not live'}
          note={isLive ? 'ad is active' : 'set to active to launch'}
          noteTone={isLive ? 'up' : 'muted'}
          accentVar={isLive ? 'var(--green)' : 'var(--ink-3)'}
        />
      </div>

      {enrolledFeatures.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-ink-2">
            Preview feature:
          </span>
          {enrolledFeatures.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setPreviewFeature(f.key);
              }}
              className={[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                previewFeature === f.key
                  ? 'bg-brand text-on-brand'
                  : 'border border-border text-ink-2 hover:bg-surface-2',
              ].join(' ')}>
              {f.category === 'ai' ? <Sparkles className="size-3" /> : null}
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {enrolledFeatures.length === 0 ? (
        <Insight>
          <strong className="text-ink">No features enrolled.</strong> Go to the
          Features tab and opt in to at least one Advantage+ Creative feature to
          see previews here.
        </Insight>
      ) : (
        <>
          <SectionHeading
            title="Placement previews"
            sub={`Previewing ${currentMeta?.label ?? previewFeature} across placements. Eligibility is determined by transformation_spec status.`}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREVIEW_FORMATS.map(format => (
              <PreviewFrame
                key={format}
                format={format}
                featureLabel={currentMeta?.label ?? previewFeature}
                eligible={currentFeature?.eligible ?? false}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Launch creative</h3>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {isLive
              ? 'This ad is currently active and serving.'
              : 'Set this ad to ACTIVE after reviewing previews.'}
          </p>
        </div>

        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--green)]">
            <CircleCheck className="size-4" />
            Live
          </span>
        ) : confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-2">
              {anyAiOn ? 'AI creative reviewed?' : 'Confirm launch?'}
            </span>
            <button
              type="button"
              onClick={() => {
                onLaunch();
                setConfirming(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white transition-colors"
              style={{background: 'var(--green)'}}>
              <Rocket className="size-3.5" />
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
            }}
            disabled={enrolledFeatures.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
            style={{background: 'var(--brand)'}}>
            <Rocket className="size-3.5" />
            Launch
          </button>
        )}
      </div>
    </div>
  );
}
