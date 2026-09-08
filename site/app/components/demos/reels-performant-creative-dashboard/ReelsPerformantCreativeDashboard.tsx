'use client';

import {
  CircleCheck,
  Clapperboard,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
  Music,
  Rocket,
  TriangleAlert,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  accountForAd,
  type AdAccount,
  allReels,
  BAND_META,
  type Business,
  BUSINESSES,
  CHECK_COLOR,
  type CreativeFeature,
  formatCount,
  openIssueCount,
  placementLabel,
  type ReelAd,
  reelChecks,
  reelScore,
  SAFE_ZONE_GOAL,
  scoreBand,
} from '@/lib/demos/reels-performant-creative-dashboard';

import {
  Badge,
  Insight,
  Kpi,
  ReelPreview,
  ScoreRing,
  SectionHeading,
  type Tone,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_BUSINESS =
  'https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/catalog/';
const DOC_INSIGHTS =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/insights/';
const DOC_ADVANTAGE =
  'https://developers.facebook.com/docs/marketing-api/creative/advantage-creative/get-started/';
const DOC_REELS_ADS =
  'https://developers.facebook.com/docs/marketing-api/creative/reels-ads';

type View = 'portfolio' | 'scorecard' | 'discovery';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'portfolio', label: 'Portfolio', icon: LayoutGrid},
  {id: 'scorecard', label: 'Scorecard', icon: ListChecks},
  {id: 'discovery', label: 'Discovery', icon: Clapperboard},
];

const STATUS_TONE: Record<ReelAd['effectiveStatus'], Tone> = {
  ACTIVE: 'green',
  PAUSED: 'muted',
  WITH_ISSUES: 'rose',
};

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// The Business Management + Insights reads that seed the dashboard.
function buildLoadCalls(): ApiCallInput[] {
  const calls: ApiCallInput[] = [];
  for (const b of BUSINESSES) {
    calls.push({
      method: 'GET',
      endpoint: `${b.id}/owned_ad_accounts`,
      summary: `Ad accounts for ${b.name}`,
      request: {fields: 'account_id,name'},
      response: {
        data: b.accounts.map(a => ({
          account_id: a.id,
          name: a.name,
          relationship: a.relationship,
        })),
      },
      status: 'success',
      docsUrl: DOC_BUSINESS,
    });
  }
  for (const ad of allReels(BUSINESSES)) {
    const account = accountForAd(BUSINESSES, ad.adId);
    calls.push({
      method: 'GET',
      endpoint: `act_${account?.id ?? ''}/insights`,
      summary: `Reels-placement ads for ${account?.name ?? ad.adId}`,
      request: {
        level: 'ad',
        fields: 'impressions,ad_id',
        breakdowns: 'publisher_platform,platform_position',
        filtering: [
          {field: 'publisher_platform', operator: 'ANY', value: ['instagram']},
          {field: 'platform_position', operator: 'IN', value: [ad.placement]},
        ],
      },
      response: {
        data: [
          {
            ad_id: ad.adId,
            impressions: ad.impressions,
            platform_position: ad.placement,
          },
        ],
      },
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    });
  }
  return calls;
}

export function ReelsPerformantCreativeDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('portfolio');
  const [reels, setReels] = useState<ReelAd[]>(() => allReels(BUSINESSES));
  const [selectedId, setSelectedId] = useState<string>(
    () => allReels(BUSINESSES)[0].adId,
  );

  // Log the Business Management + Insights reads once.
  useApiLoads('reels-loads', buildLoadCalls);

  const selected = reels.find(r => r.adId === selectedId) ?? reels[0];

  // Opt into an Advantage+ creative feature — updates the in-memory creative and
  // records the Advantage+ Creative API write. Toggling features that fix a
  // check also lifts the relevant measured field so the score improves.
  const handleOptIn = useCallback(
    (ad: ReelAd, feature: CreativeFeature) => {
      const account = accountForAd(BUSINESSES, ad.adId);
      setReels(prev =>
        prev.map(r => {
          if (r.adId !== ad.adId) return r;
          const features = r.features.map(f =>
            f.key === feature.key ? {...f, enrollStatus: 'OPT_IN' as const} : f,
          );
          const next: ReelAd = {...r, features};
          if (feature.key === 'video_auto_crop') next.aspectRatio = '9:16';
          if (feature.key === 'adapt_to_placement') {
            next.bottomClearPct = Math.max(r.bottomClearPct, SAFE_ZONE_GOAL);
          }
          if (feature.key === 'music') next.audioOn = true;
          return next;
        }),
      );
      const request =
        feature.key === 'music'
          ? {ad_id: ad.adId, asset_feed_spec: {audios: [{type: 'random'}]}}
          : {
              ad_id: ad.adId,
              degrees_of_freedom_spec: {
                creative_features_spec: {
                  [feature.key]: {enroll_status: 'OPT_IN'},
                },
              },
            };
      record({
        method: 'POST',
        endpoint: `act_${account?.id ?? ''}/adcreatives`,
        summary: `Opt in ${feature.label} — ${ad.name}`,
        request,
        response: {success: true, [feature.key]: 'OPT_IN'},
        status: 'success',
        docsUrl: DOC_ADVANTAGE,
      });
    },
    [record],
  );

  // Launch a fully-performant reel — creates/updates the reels ad. Simulates the
  // async publish (pending → success).
  const handleLaunch = useCallback(
    (ad: ReelAd) => {
      const account = accountForAd(BUSINESSES, ad.adId);
      record({
        method: 'POST',
        endpoint: `act_${account?.id ?? ''}/ads`,
        summary: `Launch reel ad — ${ad.name}`,
        request: {
          name: ad.name,
          adset_id: '<REELS_ADSET_ID>',
          creative: {
            object_id: account?.pageId,
            instagram_user_id: account?.instagramUserId,
            source_instagram_media_id: ad.sourceInstagramMediaId,
          },
          status: 'ACTIVE',
        },
        response: {success: true, ad_id: ad.adId},
        status: 'success',
        docsUrl: DOC_REELS_ADS,
      });
      setReels(prev =>
        prev.map(r =>
          r.adId === ad.adId ? {...r, effectiveStatus: 'ACTIVE'} : r,
        ),
      );
    },
    [record],
  );

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
      </div>

      {view === 'portfolio' ? (
        <PortfolioView
          reels={reels}
          onSelect={id => {
            setSelectedId(id);
            setView('scorecard');
          }}
        />
      ) : null}
      {view === 'scorecard' ? (
        <ScorecardView
          reels={reels}
          selected={selected}
          onSelect={setSelectedId}
          onOptIn={handleOptIn}
          onLaunch={handleLaunch}
        />
      ) : null}
      {view === 'discovery' ? <DiscoveryView /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

function PortfolioView({
  reels,
  onSelect,
}: {
  reels: ReelAd[];
  onSelect: (id: string) => void;
}) {
  const performant = reels.filter(
    r => scoreBand(reelScore(r)) === 'performant',
  ).length;
  const avgScore = Math.round(
    reels.reduce((s, r) => s + reelScore(r), 0) / reels.length,
  );
  const impressions = reels.reduce((s, r) => s + r.impressions, 0);
  const openGaps = reels.reduce((s, r) => s + openIssueCount(r), 0);

  const ranked = [...reels].sort((a, b) => reelScore(a) - reelScore(b));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Performant reels"
          value={`${performant}/${reels.length}`}
          note="all checks pass"
          accentVar="var(--green)"
        />
        <Kpi
          label="Avg creative score"
          value={String(avgScore)}
          note="of 100"
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="Open gaps"
          value={String(openGaps)}
          note="fixable via Advantage+"
          noteTone={openGaps > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Reels impressions"
          value={formatCount(impressions)}
          note="across placements"
          accentVar="var(--purple)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Reels ads · ranked by creative score
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Reel</th>
                <th className={TH}>Placement</th>
                <th className={TH}>Delivery</th>
                <th className={TH}>Impressions</th>
                <th className={TH}>Score</th>
                <th className={TH}>Gaps</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(r => {
                const score = reelScore(r);
                const band = BAND_META[scoreBand(score)];
                const gaps = openIssueCount(r);
                return (
                  <tr
                    key={r.adId}
                    onClick={() => {
                      onSelect(r.adId);
                    }}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {r.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        ad {r.adId}
                        {r.sourceInstagramMediaId
                          ? ' · repurposed organic'
                          : ''}
                      </div>
                    </td>
                    <td className={TD}>{placementLabel(r.placement)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONE[r.effectiveStatus]}>
                        {r.effectiveStatus.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(r.impressions)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums"
                        style={{color: band.colorVar}}>
                        {score}
                        <span className="text-[10px] font-semibold">
                          {band.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {gaps === 0 ? (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink">
                          <TriangleAlert className="size-3.5 text-[color:var(--cat-measurement)]" />
                          {gaps}
                        </span>
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
        <strong className="text-ink">Definition:</strong> a performant reel is
        9:16, keeps the bottom {SAFE_ZONE_GOAL}% clear (safe zone), plays with
        audio on, and is a video creative. Select any reel to see its scorecard
        and opt into the Advantage+ features that close each gap.
      </Insight>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

function ScorecardView({
  reels,
  selected,
  onSelect,
  onOptIn,
  onLaunch,
}: {
  reels: ReelAd[];
  selected: ReelAd;
  onSelect: (id: string) => void;
  onOptIn: (ad: ReelAd, feature: CreativeFeature) => void;
  onLaunch: (ad: ReelAd) => void;
}) {
  const checks = reelChecks(selected);
  const score = reelScore(selected);
  const band = BAND_META[scoreBand(score)];
  const performant = score >= 100;

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <span className="hidden sm:inline">Reel</span>
        <select
          value={selected.adId}
          onChange={e => {
            onSelect(e.target.value);
          }}
          aria-label="Select reel ad"
          className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creative)]">
          {reels.map(r => (
            <option key={r.adId} value={r.adId}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <ReelPreview
              aspectRatio={selected.aspectRatio}
              bottomClearPct={selected.bottomClearPct}
              audioOn={selected.audioOn}
              videoEnabled={selected.videoEnabled}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
                  {selected.name}
                </h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    color: band.colorVar,
                    background: `color-mix(in srgb, ${band.colorVar} 16%, transparent)`,
                  }}>
                  {band.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs tabular-nums text-ink-3">
                ad {selected.adId} · {placementLabel(selected.placement)}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <ScoreRing score={score} size={64} stroke={6} />
                <p className="text-[13px] leading-relaxed text-ink-2">
                  The creative score is the share of performant-reel checks that
                  pass. Opt into the Advantage+ features below to close each gap
                  and raise the score.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <ul className="flex flex-col gap-2">
              {checks.map(c => {
                const color = CHECK_COLOR[c.status];
                return (
                  <li
                    key={c.key}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <span
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        color,
                        background: `color-mix(in srgb, ${color} 16%, transparent)`,
                      }}>
                      {c.status === 'pass' ? (
                        <CircleCheck className="size-3.5" />
                      ) : (
                        <TriangleAlert className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">
                          {c.label}
                        </span>
                        <span className="text-[11px] tabular-nums text-ink-3">
                          {c.detail}
                        </span>
                      </div>
                      {c.remediation ? (
                        <p className="mt-0.5 text-[12px] text-ink-2">
                          {c.remediation}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Music className="size-4 text-[color:var(--cat-creative)]" />
              <span className="text-sm font-bold text-ink">
                Advantage+ creative features
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {selected.features.map(f => {
                const on = f.enrollStatus === 'OPT_IN';
                return (
                  <li
                    key={f.key}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {f.label}
                      </span>
                      {on ? (
                        <Badge tone="green">Opted in</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onOptIn(selected, f);
                          }}
                          className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-colors hover:opacity-90">
                          Opt in
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-ink-2">
                      {f.description}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-ink-3">
                      {f.specPath}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Rocket className="size-4 text-[color:var(--green)]" />
              <span className="text-sm font-bold text-ink">Launch</span>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-2">
              {performant
                ? 'This reel passes every performant-creative check — launch it for advertising.'
                : 'Close the remaining gaps above before launching so the reel goes live performant.'}
            </p>
            <button
              type="button"
              disabled={!performant}
              onClick={() => {
                onLaunch(selected);
              }}
              className={[
                'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors',
                performant
                  ? 'bg-brand text-on-brand hover:opacity-90'
                  : 'cursor-not-allowed bg-surface-2 text-ink-3',
              ].join(' ')}>
              <Rocket className="size-4" />
              Launch reel ad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discovery (Business Management API)
// ---------------------------------------------------------------------------

function DiscoveryView() {
  const businesses = BUSINESSES;
  const totalAccounts = useMemo(
    () => businesses.reduce((s, b) => s + b.accounts.length, 0),
    [businesses],
  );
  const totalReels = allReels(businesses).length;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Account & reel discovery"
        sub="Extracted across businesses via the Business Management API, then filtered to reels-placement ads via the Insights API."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Businesses"
          value={String(businesses.length)}
          note="owned + client"
          accentVar="var(--cat-creative)"
        />
        <Kpi
          label="Ad accounts"
          value={String(totalAccounts)}
          note="with reels ads"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Reels ads"
          value={String(totalReels)}
          note="across placements"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Safe-zone goal"
          value={`${SAFE_ZONE_GOAL}%`}
          note="bottom clear"
          accentVar="var(--green)"
        />
      </div>

      <div className="flex flex-col gap-4">
        {businesses.map(b => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({business}: {business: Business}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <span className="text-sm font-bold text-ink">{business.name}</span>
          <span className="ml-2 text-[11px] tabular-nums text-ink-3">
            {business.id}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {business.accounts.map(a => (
          <AccountRow key={a.id} account={a} />
        ))}
      </div>
    </div>
  );
}

function AccountRow({account}: {account: AdAccount}) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ink">
          {account.name}
        </span>
        <span className="font-mono text-[11px] text-ink-3">
          act_{account.id}
        </span>
        <Badge tone={account.relationship === 'owned' ? 'blue' : 'purple'}>
          {account.relationship}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {account.ads.map(ad => {
          const score = reelScore(ad);
          const band = BAND_META[scoreBand(score)];
          return (
            <div
              key={ad.adId}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{color: band.colorVar}}>
                {score}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-ink">
                  {ad.name}
                </div>
                <div className="text-[10px] text-ink-3">
                  {placementLabel(ad.placement)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
