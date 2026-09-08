'use client';

import {
  BadgeCheck,
  CircleCheck,
  Layers,
  type LucideIcon,
  Megaphone,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  Video,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_FORMAT_META,
  type AdFormat,
  type AdvertisableMedia,
  allMedias,
  boostableCount,
  type BoostJob,
  type CreativeSource,
  type Creator,
  CREATORS,
  DOC_ADS_API,
  DOC_PARTNERSHIP_ADS,
  ELIGIBILITY_META,
  formatCount,
  formatMinor,
  isBoostable,
  needsVideoWorkaround,
  PERMISSION_META,
  sponsorHandle,
} from '@/lib/demos/partnership-ads-booster';

import {
  Avatar,
  Badge,
  EngagementBar,
  Insight,
  Kpi,
  PostVisual,
  SectionHeading,
  StatusPill,
  StepDots,
  type Tone,
} from './ui';

type View = 'discover' | 'boost';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'discover', label: 'Discover & permission', icon: ShieldCheck},
  {id: 'boost', label: 'Boost queue', icon: Rocket},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';

const BOOST_STAGES: Array<{key: string; label: string}> = [
  {key: 'creating_creative', label: 'Creating adcreative'},
  {key: 'uploading_video', label: 'Uploading video'},
  {key: 'creating_ad', label: 'Creating ad'},
  {key: 'active', label: 'Active'},
];

const DEFAULT_BUDGET_MINOR = 5000; // $50.00/day

// Illustrative ad account for the Ads API paths.
const AD_ACCOUNT_ID = '1029384756';

// Reads that populate the demo for the selected creator.
function buildLoadCalls(creator: Creator): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `${creator.igId}/branded_content_advertisable_medias`,
      summary: `Fetch advertisable branded content for ${creator.handle}`,
      request: {
        fields:
          'id,caption,media_type,has_permission_for_partnership_ad,partnership_info{permission_status,permission_type},ad_eligibility,eligibility_errors',
        only_fetch_allowlisted: creator.onlyFetchAllowlisted,
        media_relationship:
          creator.permissioningMode === 'account_level' ? 'IS_TAGGED' : 'OWNED',
      },
      response: {
        data: creator.medias.map(m => ({
          id: m.id,
          media_type: m.contentType,
          has_permission_for_partnership_ad: m.hasPermissionForPartnershipAd,
          partnership_info: {
            permission_status: m.permissionStatus,
            permission_type: m.permissionType,
          },
          ad_eligibility: m.adEligibility,
          eligibility_errors: m.eligibilityErrors,
        })),
        paging: {cursors: {after: 'QVFIU...'}},
      },
      status: 'success',
      docsUrl: DOC_PARTNERSHIP_ADS,
    },
    {
      method: 'GET',
      endpoint: `${creator.igId}/partnership-ads-advertisable-content`,
      summary: `New advertisable-content edge (migrate before Dec 1, 2026) — ${creator.handle}`,
      request: {
        content_types: 'IMAGE,VIDEO,CAROUSEL,REEL',
        ad_eligibilities: 'AD_READY',
        fields:
          'ad_eligibility,partnership_info{permission_status,permission_type},organic_insights{reach,likes,comments,saves}',
        sort_by: 'organic_insights.reach',
      },
      response: {
        data: creator.medias
          .filter(m => m.adEligibility === 'AD_READY')
          .map(m => ({
            id: m.id,
            ad_eligibility: m.adEligibility,
            organic_insights: {
              reach: m.organicInsights.reach,
              likes: m.organicInsights.likes,
              comments: m.organicInsights.comments,
              saves: m.organicInsights.saves,
            },
          })),
      },
      status: 'success',
      docsUrl: DOC_PARTNERSHIP_ADS,
    },
  ];
}

export function PartnershipAdsBoosterDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('discover');
  const [selectedId, setSelectedId] = useState<string>(CREATORS[0].igId);
  const [jobs, setJobs] = useState<BoostJob[]>([]);

  const selected = CREATORS.find(c => c.igId === selectedId) ?? CREATORS[0];

  useApiLoads(selectedId, () => buildLoadCalls(selected));

  const queuedMediaIds = useMemo(
    () => new Set(jobs.map(j => j.mediaId)),
    [jobs],
  );

  const handleBoost = useCallback(
    (
      creator: Creator,
      media: AdvertisableMedia,
      adFormat: AdFormat,
      creativeSource: CreativeSource,
    ) => {
      const needsVideo = needsVideoWorkaround(media);

      // Step 1 — create the adcreative (Option 1 source media, or Option 2 ad code).
      const creativeRequest =
        creativeSource === 'source_media_id'
          ? {source_instagram_media_id: media.id}
          : {instagram_boost_post_access_token: `AD_CODE_${media.id}`};
      record({
        method: 'POST',
        endpoint: `act_${AD_ACCOUNT_ID}/adcreatives`,
        summary: `Create adcreative for ${media.caption.slice(0, 40)}…`,
        request: {
          ...creativeRequest,
          object_id: media.id,
          instagram_branded_content: {sponsor_id: media.sponsorId},
          branded_content: {ad_format: adFormat},
        },
        response: {id: `1200${media.id.slice(-6)}`},
        status: 'success',
        docsUrl: DOC_ADS_API,
      });

      // Step 2 — IG-video edge case: upload via advideos with the ad code workaround.
      if (needsVideo) {
        record({
          method: 'POST',
          endpoint: `act_${AD_ACCOUNT_ID}/advideos`,
          summary: `Upload IG video via partnership-ad workaround — ${media.id}`,
          request: {
            partnership_ad_ad_code: `AD_CODE_${media.id}`,
            is_partnership_ad: true,
          },
          response: {id: `9800${media.id.slice(-6)}`},
          status: 'success',
          docsUrl: DOC_ADS_API,
        });
      }

      // Step 3 — create the ad.
      record({
        method: 'POST',
        endpoint: `act_${AD_ACCOUNT_ID}/ads`,
        summary: `Create partnership ad — ${creator.handle}`,
        request: {
          name: `Partnership boost · ${creator.handle} · ${media.id}`,
          creative: {creative_id: `1200${media.id.slice(-6)}`},
          daily_budget: DEFAULT_BUDGET_MINOR,
          status: 'ACTIVE',
        },
        response: {id: `2300${media.id.slice(-6)}`, effective_status: 'ACTIVE'},
        status: 'success',
        docsUrl: DOC_ADS_API,
      });

      setJobs(prev => [
        {
          id: `job-${media.id}`,
          mediaId: media.id,
          creatorHandle: creator.handle,
          caption: media.caption,
          contentType: media.contentType,
          theme: creator.theme,
          adFormat,
          creativeSource,
          requiredVideoWorkaround: needsVideo,
          stage: 'active',
          dailyBudgetMinor: DEFAULT_BUDGET_MINOR,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...prev.filter(j => j.mediaId !== media.id),
      ]);
      setView('boost');
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
                {id === 'boost' && jobs.length > 0 ? (
                  <span
                    className="ml-0.5 rounded-full px-1.5 text-[11px] tabular-nums"
                    style={{
                      background: on
                        ? 'color-mix(in srgb, var(--on-brand) 22%, transparent)'
                        : 'var(--surface-2)',
                    }}>
                    {jobs.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {view === 'discover' ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Creator</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select creator"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
              {CREATORS.map(c => (
                <option key={c.igId} value={c.igId}>
                  {c.handle}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'discover' ? (
        <DiscoverView
          selected={selected}
          onSelect={setSelectedId}
          queued={queuedMediaIds}
          onBoost={handleBoost}
        />
      ) : (
        <BoostView
          jobs={jobs}
          onBack={() => {
            setView('discover');
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discover & permission
// ---------------------------------------------------------------------------

function DiscoverView({
  selected,
  onSelect,
  queued,
  onBoost,
}: {
  selected: Creator;
  onSelect: (id: string) => void;
  queued: Set<string>;
  onBoost: (
    creator: Creator,
    media: AdvertisableMedia,
    adFormat: AdFormat,
    creativeSource: CreativeSource,
  ) => void;
}) {
  const medias = allMedias(CREATORS);
  const readyCount = medias.filter(isBoostable).length;
  const blockedCount = medias.filter(
    m => !isBoostable(m) && m.eligibilityErrors.length > 0,
  ).length;
  const totalReach = medias
    .filter(isBoostable)
    .reduce((s, m) => s + m.organicInsights.reach, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Creators"
          value={String(CREATORS.length)}
          note="permissioned partners"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Ready to boost"
          value={String(readyCount)}
          note="AD_READY · permission granted"
          noteTone="up"
          accentVar="var(--green)"
        />
        <Kpi
          label="Blocked"
          value={String(blockedCount)}
          note="eligibility errors"
          noteTone={blockedCount > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Reach (ready)"
          value={formatCount(totalReach)}
          note="organic reach of ready posts"
          accentVar="var(--purple)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Creators · ranked by boostable posts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Creator</th>
                <th className={TH}>Permissioning</th>
                <th className={TH}>Followers</th>
                <th className={TH}>Advertisable</th>
                <th className={TH}>Ready</th>
              </tr>
            </thead>
            <tbody>
              {[...CREATORS]
                .sort((a, b) => boostableCount(b) - boostableCount(a))
                .map(c => {
                  const active = c.igId === selected.igId;
                  const ready = boostableCount(c);
                  return (
                    <tr
                      key={c.igId}
                      onClick={() => {
                        onSelect(c.igId);
                      }}
                      className={[
                        'cursor-pointer border-t border-border transition-colors',
                        active ? 'bg-surface-2' : 'hover:bg-surface-2',
                      ].join(' ')}>
                      <td className="px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-ink">
                          {c.displayName}
                        </div>
                        <div className="text-[11px] text-ink-3">{c.handle}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          tone={
                            c.permissioningMode === 'account_level'
                              ? 'blue'
                              : 'purple'
                          }>
                          {c.permissioningMode === 'account_level'
                            ? 'Account-level'
                            : 'Post-level'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] tabular-nums text-ink-2">
                        {formatCount(c.followers)}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] tabular-nums text-ink-2">
                        {c.medias.length}
                      </td>
                      <td className="px-3 py-2.5">
                        {ready === 0 ? (
                          <span className="text-[12px] text-ink-3">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--green)]">
                            <CircleCheck className="size-3.5" />
                            {ready}
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

      <CreatorDetail selected={selected} queued={queued} onBoost={onBoost} />

      <Insight>
        <strong className="text-ink">Permissioning:</strong>{' '}
        {selected.permissioningMode === 'account_level'
          ? `${selected.handle} uses an account-level allowlist (only_fetch_allowlisted=true, media_relationship=IS_TAGGED), so every eligible tagged post is advertisable without per-post approval.`
          : `${selected.handle} grants permission per post (media_relationship=OWNED); each post must carry has_permission_for_partnership_ad and the paid-partnership label before it can be boosted.`}
      </Insight>
    </div>
  );
}

function CreatorDetail({
  selected,
  queued,
  onBoost,
}: {
  selected: Creator;
  queued: Set<string>;
  onBoost: (
    creator: Creator,
    media: AdvertisableMedia,
    adFormat: AdFormat,
    creativeSource: CreativeSource,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title={`Advertisable content · ${selected.handle}`}
        sub="Each card gates boosting on the documented permission signals; ready posts can be boosted into a partnership ad."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {selected.medias.map(m => (
          <MediaCard
            key={m.id}
            creator={selected}
            media={m}
            queued={queued.has(m.id)}
            onBoost={onBoost}
          />
        ))}
      </div>
    </div>
  );
}

function MediaCard({
  creator,
  media,
  queued,
  onBoost,
}: {
  creator: Creator;
  media: AdvertisableMedia;
  queued: boolean;
  onBoost: (
    creator: Creator,
    media: AdvertisableMedia,
    adFormat: AdFormat,
    creativeSource: CreativeSource,
  ) => void;
}) {
  const [adFormat, setAdFormat] = useState<AdFormat>(3);
  const [creativeSource, setCreativeSource] =
    useState<CreativeSource>('source_media_id');

  const boostable = isBoostable(media);
  const elig = ELIGIBILITY_META[media.adEligibility];
  const perm = PERMISSION_META[media.permissionStatus];
  const isVideo = needsVideoWorkaround(media);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Avatar name={creator.displayName} seed={creator.igId} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">
            {creator.displayName}
          </p>
          <p className="truncate text-[11px] text-ink-3">
            {creator.handle} · {media.mediaRelationship}
          </p>
        </div>
        <div className="ml-auto">
          <StatusPill colorVar={elig.colorVar}>
            {media.adEligibility === 'AD_READY' ? (
              <BadgeCheck className="size-3" aria-hidden />
            ) : (
              <TriangleAlert className="size-3" aria-hidden />
            )}
            {elig.label}
          </StatusPill>
        </div>
      </div>

      <div className="mt-3">
        <PostVisual
          seed={media.id}
          contentType={media.contentType}
          theme={creator.theme}
          creatorHandle={creator.handle}
          sponsorHandle={sponsorHandle(media)}
          reachLabel={formatCount(media.organicInsights.reach)}
        />
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-snug text-ink">
        {media.caption}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
        {isVideo ? (
          <Video className="size-3" aria-hidden />
        ) : (
          <Layers className="size-3" aria-hidden />
        )}
        {media.contentType} · {media.postedAt}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusPill colorVar={perm.colorVar}>{perm.label}</StatusPill>
        <Badge tone="muted">{media.permissionType.replace('_', ' ')}</Badge>
        <Badge tone={media.hasPermissionForPartnershipAd ? 'green' : 'rose'}>
          {media.hasPermissionForPartnershipAd
            ? 'has_permission ✓'
            : 'has_permission ✗'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 border-y border-border py-2.5 text-center">
        <Metric
          label="Reach"
          value={formatCount(media.organicInsights.reach)}
        />
        <Metric
          label="Likes"
          value={formatCount(media.organicInsights.likes)}
        />
        <Metric
          label="Saves"
          value={formatCount(media.organicInsights.saves)}
        />
        <Metric
          label="Eng."
          value={`${(media.organicInsights.engagementRate * 100).toFixed(1)}%`}
        />
      </div>
      <div className="mt-2">
        <EngagementBar rate={media.organicInsights.engagementRate} />
      </div>

      {media.eligibilityErrors.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {media.eligibilityErrors.map(err => (
            <li
              key={err}
              className="flex gap-1.5 text-[11px] leading-snug text-ink-2">
              <TriangleAlert
                className="mt-0.5 size-3 shrink-0 text-[color:var(--rose)]"
                aria-hidden
              />
              {err}
            </li>
          ))}
        </ul>
      ) : null}

      {boostable ? (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3">
              Identity (ad_format)
            </span>
            <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
              {([1, 2, 3] as AdFormat[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setAdFormat(f);
                  }}
                  title={AD_FORMAT_META[f].description}
                  className={[
                    'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                    adFormat === f
                      ? 'bg-brand text-on-brand'
                      : 'text-ink-2 hover:text-ink',
                  ].join(' ')}>
                  {AD_FORMAT_META[f].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3">
              Creative source
            </span>
            <select
              value={creativeSource}
              onChange={e => {
                setCreativeSource(e.target.value as CreativeSource);
              }}
              aria-label="Creative source"
              className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink outline-none">
              <option value="source_media_id">source_instagram_media_id</option>
              <option value="ad_code">instagram_boost_post_access_token</option>
            </select>
          </div>

          {isVideo ? (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-2">
              <Video
                className="mt-0.5 size-3 shrink-0 text-[color:var(--cat-measurement)]"
                aria-hidden
              />
              IG video — will upload via <code>advideos</code> with{' '}
              <code>partnership_ad_ad_code</code> +{' '}
              <code>is_partnership_ad</code>.
            </p>
          ) : null}

          <button
            type="button"
            disabled={queued}
            onClick={() => {
              onBoost(creator, media, adFormat, creativeSource);
            }}
            className={[
              'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
              queued
                ? 'cursor-default border border-border text-ink-3'
                : 'bg-brand text-on-brand hover:opacity-90',
            ].join(' ')}>
            {queued ? (
              <>
                <CircleCheck className="size-4" />
                Queued
              </>
            ) : (
              <>
                <Rocket className="size-4" />
                Boost this post
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[12px] text-ink-3">
          <ShieldCheck className="size-4" />
          Not boostable until permission and eligibility clear.
        </div>
      )}
    </div>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.03em] text-ink-3">
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boost queue
// ---------------------------------------------------------------------------

function BoostView({jobs, onBack}: {jobs: BoostJob[]; onBack: () => void}) {
  const totalDaily = jobs.reduce((s, j) => s + j.dailyBudgetMinor, 0);
  const videoJobs = jobs.filter(j => j.requiredVideoWorkaround).length;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <Megaphone className="size-8 text-ink-3" />
        <p className="text-sm font-semibold text-ink">No boosts queued yet</p>
        <p className="max-w-sm text-[13px] text-ink-2">
          Head to Discover &amp; permission, pick a ready branded-content post,
          choose an identity strategy, and boost it into a partnership ad.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-1 rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-on-brand transition-colors hover:opacity-90">
          Go to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Active boosts"
          value={String(jobs.length)}
          note="partnership ads created"
          noteTone="up"
          accentVar="var(--green)"
        />
        <Kpi
          label="Daily budget"
          value={formatMinor(totalDaily)}
          note="sum across ads"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Video workarounds"
          value={String(videoJobs)}
          note="advideos uploads"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Both-identity ads"
          value={String(jobs.filter(j => j.adFormat === 3).length)}
          note="ad_format = 3"
          accentVar="var(--cat-measurement)"
        />
      </div>

      <SectionHeading
        title="Boost queue"
        sub="Each boost runs the documented sequence: create adcreative → (video upload) → create ad."
      />

      <div className="flex flex-col gap-3">
        {jobs.map(j => {
          const stageIdx = BOOST_STAGES.findIndex(s => s.key === j.stage);
          const fmt = AD_FORMAT_META[j.adFormat];
          const fmtTone: Tone =
            j.adFormat === 3 ? 'purple' : j.adFormat === 1 ? 'blue' : 'yellow';
          return (
            <div
              key={j.id}
              className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-14 shrink-0">
                    <PostVisual
                      seed={j.mediaId}
                      contentType={j.contentType}
                      theme={j.theme}
                      creatorHandle={j.creatorHandle}
                      thumb
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {j.caption}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {j.creatorHandle} · media {j.mediaId} · {j.createdAt}
                    </p>
                  </div>
                </div>
                <StatusPill colorVar="var(--green)">
                  <CircleCheck className="size-3" aria-hidden />
                  Active
                </StatusPill>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={fmtTone}>{fmt.label}</Badge>
                <Badge tone="muted">{j.creativeSource}</Badge>
                {j.requiredVideoWorkaround ? (
                  <Badge tone="purple">advideos upload</Badge>
                ) : null}
                <span className="ml-auto text-[12px] font-semibold tabular-nums text-ink-2">
                  {formatMinor(j.dailyBudgetMinor)}/day
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <StepDots
                  total={BOOST_STAGES.length}
                  active={stageIdx}
                  colorVar="var(--green)"
                />
                <span className="text-[11px] text-ink-3">
                  {BOOST_STAGES.map(s => s.label).join(' → ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
