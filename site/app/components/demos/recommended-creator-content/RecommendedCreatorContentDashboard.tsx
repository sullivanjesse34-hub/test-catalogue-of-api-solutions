'use client';

import {
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  Film,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Sparkles,
  Square,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import {useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_FORMAT_LABEL,
  type AdFormat,
  type Advertiser,
  ADVERTISERS,
  blockerBreakdown,
  type CampaignObjective,
  ELIGIBILITY_ERROR_LABEL,
  formatCompact,
  isBoostable,
  MEDIA_FORMAT_LABEL,
  type MediaFormat,
  OBJECTIVE_LABEL,
  objectiveDistribution,
  portfolioTotals,
  primaryObjective,
  type RecommendedMedia,
} from '@/lib/demos/recommended-creator-content';

type View = 'discover' | 'boosted' | 'portfolio';

// Developer-doc link surfaced in the API console for every call.
const DOC_BOOST =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/ads-creation/boost-existing-post';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'discover', label: 'Discover', icon: LayoutDashboard},
  {id: 'boosted', label: 'Partnership ads', icon: Megaphone},
  {id: 'portfolio', label: 'Portfolio', icon: Building2},
];

const FORMAT_ICON: Record<MediaFormat, LucideIcon> = {
  REELS: Film,
  FEED: ImageIcon,
  STORY: Square,
};

// A boosted media, tracked in-memory after the user clicks Boost.
interface BoostedAd {
  mediaId: string;
  advertiserId: string;
  advertiserName: string;
  creatorHandle: string;
  format: MediaFormat;
  caption: string;
  objective: CampaignObjective;
  adFormat: AdFormat;
  creativeId: string;
  adId: string;
}

// ---- The initial reads that populate the demo for the selected advertiser ----
function buildLoadCalls(adv: Advertiser): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `${adv.instagramId}/branded_content_advertisable_medias`,
      summary: `Fetch recommended creator content for ${adv.name}`,
      request: {
        only_fetch_recommended_content: true,
        fields:
          'id,permalink,owner_id,eligibility_errors,has_permission_for_partnership_ad,recommended_campaign_objectives',
      },
      response: {
        data: adv.media.map(m => ({
          id: m.id,
          permalink: m.permalink,
          owner_id: m.ownerId,
          eligibility_errors: m.eligibilityErrors,
          has_permission_for_partnership_ad: m.hasPermissionForPartnershipAd,
          recommended_campaign_objectives: m.recommendedCampaignObjectives,
        })),
      },
      status: 'success',
      docsUrl: DOC_BOOST,
    },
  ];
}

function Badge({
  colorVar,
  children,
}: {
  colorVar: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color: colorVar,
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
      }}>
      {children}
    </span>
  );
}

function Kpi({
  label,
  value,
  note,
  accentVar,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  accentVar?: string;
  icon?: React.ReactNode;
}) {
  const accent = accentVar ?? 'var(--cat-creators)';
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow duration-200 hover:shadow-[0_12px_30px_-20px_rgba(20,30,50,0.4)]">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{
          color: accent,
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        }}
        aria-hidden>
        {icon ?? (
          <span
            className="size-2.5 rounded-full"
            style={{background: accent}}
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-ink">
          {value}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
          {label}
        </p>
        {note ? (
          <p className="mt-0.5 text-[11px] font-medium text-ink-3">{note}</p>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({title, sub}: {title: string; sub?: string}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {sub ? <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p> : null}
    </div>
  );
}

function Insight({children}: {children: React.ReactNode}) {
  return (
    <div
      className="rounded-lg border p-3 text-[13px] leading-relaxed text-ink-2"
      style={{
        borderColor: 'color-mix(in srgb, var(--brand) 25%, transparent)',
        background: 'color-mix(in srgb, var(--brand) 6%, transparent)',
      }}>
      {children}
    </div>
  );
}

function ObjectivePicker({
  media,
  value,
  onChange,
}: {
  media: RecommendedMedia;
  value: CampaignObjective;
  onChange: (obj: CampaignObjective) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {media.recommendedCampaignObjectives.map(obj => {
        const on = obj === value;
        return (
          <button
            key={obj}
            type="button"
            onClick={() => {
              onChange(obj);
            }}
            className={[
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              on
                ? 'border-transparent bg-brand text-on-brand'
                : 'border-border text-ink-2 hover:bg-surface-2',
            ].join(' ')}>
            {OBJECTIVE_LABEL[obj]}
          </button>
        );
      })}
    </div>
  );
}

function MediaCard({
  media,
  boosted,
  onBoost,
}: {
  media: RecommendedMedia;
  boosted: boolean;
  onBoost: (media: RecommendedMedia, objective: CampaignObjective) => void;
}) {
  const FormatIcon = FORMAT_ICON[media.format];
  const canBoost = isBoostable(media);
  const [objective, setObjective] = useState<CampaignObjective>(
    () => primaryObjective(media) ?? 'OUTCOME_ENGAGEMENT',
  );

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{
            color: 'var(--cat-creators)',
            background:
              'color-mix(in srgb, var(--cat-creators) 12%, transparent)',
          }}
          aria-hidden>
          <FormatIcon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {media.creatorHandle}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {MEDIA_FORMAT_LABEL[media.format]}
            </span>
            {canBoost ? (
              <Badge colorVar="var(--green)">
                <BadgeCheck className="size-3" /> Eligible
              </Badge>
            ) : (
              <Badge colorVar="var(--rose)">
                <TriangleAlert className="size-3" /> Blocked
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
            {media.caption}
          </p>
          <a
            href={media.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-ink hover:underline">
            <ExternalLink className="size-3" /> View post ·{' '}
            {media.postedDaysAgo}d ago
          </a>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-2.5 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">
            Reach
          </p>
          <p className="text-sm font-bold tabular-nums text-ink">
            {formatCompact(media.organicReach)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">
            Engagements
          </p>
          <p className="text-sm font-bold tabular-nums text-ink">
            {formatCompact(media.organicEngagements)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">Eng.</p>
          <p className="text-sm font-bold tabular-nums text-ink">
            {media.engagementRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex-1">
        {canBoost ? (
          <>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Recommended objective
            </p>
            <ObjectivePicker
              media={media}
              value={objective}
              onChange={setObjective}
            />
          </>
        ) : (
          <div className="rounded-lg border border-border p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Eligibility errors
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {media.eligibilityErrors.map(e => (
                <li
                  key={e}
                  className="flex items-start gap-1.5 text-[12px] text-ink-2">
                  <TriangleAlert
                    className="mt-0.5 size-3.5 shrink-0 text-[color:var(--rose)]"
                    aria-hidden
                  />
                  {ELIGIBILITY_ERROR_LABEL[e]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-ink-3">
          {media.hasPermissionForPartnershipAd
            ? 'Permission granted'
            : 'No boost permission'}
        </span>
        <button
          type="button"
          disabled={!canBoost || boosted}
          onClick={() => {
            onBoost(media, objective);
          }}
          className={[
            'ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
            boosted
              ? 'border border-border text-ink-3'
              : canBoost
                ? 'bg-brand text-on-brand hover:opacity-90'
                : 'cursor-not-allowed border border-border text-ink-3 opacity-60',
          ].join(' ')}>
          {boosted ? (
            <>
              <Check className="size-4" /> Boosted
            </>
          ) : (
            <>
              <Zap className="size-4" /> Boost
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DiscoverView({
  advertiser,
  boostedIds,
  onBoost,
}: {
  advertiser: Advertiser;
  boostedIds: Set<string>;
  onBoost: (media: RecommendedMedia, objective: CampaignObjective) => void;
}) {
  const eligible = advertiser.media.filter(isBoostable);
  const blocked = advertiser.media.length - eligible.length;
  const topReach =
    eligible.length > 0
      ? [...eligible].sort((a, b) => b.organicReach - a.organicReach)[0]
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Recommended"
          value={String(advertiser.media.length)}
          note="last 60 days"
          accentVar="var(--cat-creators)"
        />
        <Kpi
          label="Eligible to boost"
          value={String(eligible.length)}
          note="permission + no errors"
          accentVar="var(--green)"
        />
        <Kpi
          label="Blocked"
          value={String(blocked)}
          note="needs attention"
          accentVar="var(--rose)"
        />
        <Kpi
          label="Boosted"
          value={String(
            advertiser.media.filter(m => boostedIds.has(m.id)).length,
          )}
          note="this session"
          accentVar="var(--brand-2)"
        />
      </div>

      {topReach ? (
        <Insight>
          <strong className="text-ink">Top pick:</strong>{' '}
          {topReach.creatorHandle}&rsquo;s {MEDIA_FORMAT_LABEL[topReach.format]}{' '}
          reached{' '}
          <strong className="text-ink">
            {formatCompact(topReach.organicReach)}
          </strong>{' '}
          organically at a {topReach.engagementRate.toFixed(1)}% engagement rate
          — Meta recommends boosting it for{' '}
          <strong className="text-ink">
            {
              OBJECTIVE_LABEL[
                primaryObjective(topReach) ?? 'OUTCOME_ENGAGEMENT'
              ]
            }
          </strong>
          .
        </Insight>
      ) : null}

      <div>
        <SectionHeading
          title="Recommended creator content"
          sub="AI-recommended organic partnership posts, gated on permission and eligibility"
        />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {advertiser.media.map(m => (
            <MediaCard
              key={m.id}
              media={m}
              boosted={boostedIds.has(m.id)}
              onBoost={onBoost}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

function BoostedView({ads}: {ads: BoostedAd[]}) {
  if (ads.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <Megaphone className="size-6 text-ink-3" />
        <p className="mt-2 text-sm font-semibold text-ink">
          No partnership ads yet
        </p>
        <p className="mt-1 max-w-sm text-[13px] text-ink-2">
          Go to Discover and boost an eligible recommended post. Each boost
          creates an adcreative and an ad on the advertiser&rsquo;s account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Partnership ads"
          value={String(ads.length)}
          note="created this session"
          accentVar="var(--brand-2)"
        />
        <Kpi
          label="Creators"
          value={String(new Set(ads.map(a => a.creatorHandle)).size)}
          note="distinct handles"
          accentVar="var(--cat-creators)"
        />
        <Kpi
          label="Advertisers"
          value={String(new Set(ads.map(a => a.advertiserId)).size)}
          note="with live boosts"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Reels boosted"
          value={String(ads.filter(a => a.format === 'REELS').length)}
          note="of all formats"
          accentVar="var(--green)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Created partnership ads
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Creator</th>
                <th className={TH}>Advertiser</th>
                <th className={TH}>Format</th>
                <th className={TH}>Objective</th>
                <th className={TH}>Identity</th>
                <th className={TH}>Creative ID</th>
                <th className={TH}>Ad ID</th>
              </tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad.adId} className="border-t border-border">
                  <td className={`${TD} font-semibold text-ink`}>
                    {ad.creatorHandle}
                  </td>
                  <td className={TD}>{ad.advertiserName}</td>
                  <td className={TD}>{MEDIA_FORMAT_LABEL[ad.format]}</td>
                  <td className={TD}>
                    <Badge colorVar="var(--brand-ink)">
                      {OBJECTIVE_LABEL[ad.objective]}
                    </Badge>
                  </td>
                  <td className={TD}>{AD_FORMAT_LABEL[ad.adFormat]}</td>
                  <td className={`${TD} font-mono text-[11px]`}>
                    {ad.creativeId}
                  </td>
                  <td className={`${TD} font-mono text-[11px]`}>{ad.adId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PortfolioView({advertisers}: {advertisers: Advertiser[]}) {
  const totals = portfolioTotals(advertisers);
  const blockers = blockerBreakdown(advertisers);
  const objectives = objectiveDistribution(advertisers);
  const maxBlocker = Math.max(1, ...blockers.map(b => b.count));
  const maxObjective = Math.max(1, ...objectives.map(o => o.count));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Portfolio of recommended content"
        sub="Recommended creator content across every advertiser account"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Advertisers"
          value={String(totals.advertisers)}
          note="accounts"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Recommended"
          value={String(totals.recommended)}
          note="posts total"
          accentVar="var(--cat-creators)"
        />
        <Kpi
          label="Eligible"
          value={String(totals.boostable)}
          note={`${totals.recommended === 0 ? 0 : Math.round((totals.boostable / totals.recommended) * 100)}% of posts`}
          accentVar="var(--green)"
        />
        <Kpi
          label="Blocked"
          value={String(totals.blocked)}
          note="need attention"
          accentVar="var(--rose)"
        />
        <Kpi
          label="Organic reach"
          value={formatCompact(totals.reach)}
          note="across posts"
          accentVar="var(--brand-2)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">
              Eligibility blockers
            </span>
            <Badge colorVar="var(--rose)">Fix to unlock</Badge>
          </div>
          {blockers.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {blockers.map(b => (
                <div key={b.error}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-ink-2">
                      {ELIGIBILITY_ERROR_LABEL[b.error]}
                    </span>
                    <span className="font-bold tabular-nums text-ink">
                      {b.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(b.count / maxBlocker) * 100}%`,
                        background: 'var(--rose)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-2">
              No eligibility blockers — every recommended post is boostable.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">
              Recommended objectives
            </span>
            <Badge colorVar="var(--brand-ink)">Eligible posts</Badge>
          </div>
          <div className="flex flex-col gap-2.5">
            {objectives.map(o => (
              <div key={o.objective}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-ink-2">
                    {OBJECTIVE_LABEL[o.objective]}
                  </span>
                  <span className="font-bold tabular-nums text-ink">
                    {o.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(o.count / maxObjective) * 100}%`,
                      background: 'var(--cat-creators)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">Account breakdown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Advertiser</th>
                <th className={TH}>Recommended</th>
                <th className={TH}>Eligible</th>
                <th className={TH}>Blocked</th>
                <th className={TH}>Organic reach</th>
              </tr>
            </thead>
            <tbody>
              {advertisers.map(adv => {
                const eligible = adv.media.filter(isBoostable).length;
                const reach = adv.media.reduce((s, m) => s + m.organicReach, 0);
                return (
                  <tr key={adv.adAccountId} className="border-t border-border">
                    <td className={`${TD} font-semibold text-ink`}>
                      {adv.name}
                    </td>
                    <td className={TD}>{adv.media.length}</td>
                    <td
                      className={`${TD} font-semibold text-[color:var(--green)]`}>
                      {eligible}
                    </td>
                    <td
                      className={`${TD} font-semibold text-[color:var(--rose)]`}>
                      {adv.media.length - eligible}
                    </td>
                    <td className={TD}>{formatCompact(reach)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function RecommendedCreatorContentDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('discover');
  const [selectedId, setSelectedId] = useState<string>(
    ADVERTISERS[0].adAccountId,
  );
  const [boostedIds, setBoostedIds] = useState<Set<string>>(() => new Set());
  const [boostedAds, setBoostedAds] = useState<BoostedAd[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const selected =
    ADVERTISERS.find(a => a.adAccountId === selectedId) ?? ADVERTISERS[0];

  // Log the recommended-content read that populates Discover, per advertiser.
  useApiLoads(selectedId, () => buildLoadCalls(selected));

  const boost = (media: RecommendedMedia, objective: CampaignObjective) => {
    const n = ++seqRef.current;
    const creativeId = `238400000${n}`;
    const adId = `238500000${n}`;
    const adFormat: AdFormat = 3;

    // 1) Create the adcreative from the source Instagram media, carrying the
    //    branded-content identity objects (grounded in the boost docs).
    record({
      method: 'POST',
      endpoint: `act_${selected.adAccountId}/adcreatives`,
      summary: `Create partnership ad creative from ${media.creatorHandle}`,
      request: {
        object_id: selected.brandPageId,
        source_instagram_media_id: media.id,
        instagram_branded_content: {sponsor_id: media.ownerId},
        facebook_branded_content: {sponsor_page_id: selected.brandPageId},
        branded_content: {ad_format: adFormat},
      },
      response: {id: creativeId},
      status: 'success',
      docsUrl: DOC_BOOST,
    });

    // 2) Create the ad, using the recommended objective for the ad set.
    record({
      method: 'POST',
      endpoint: `act_${selected.adAccountId}/ads`,
      summary: `Create ad for “${OBJECTIVE_LABEL[objective]}” objective`,
      request: {
        name: `Partnership ad — ${media.creatorHandle}`,
        creative: {creative_id: creativeId},
        status: 'PAUSED',
      },
      response: {id: adId},
      status: 'success',
      docsUrl: DOC_BOOST,
    });

    setBoostedIds(prev => {
      const next = new Set(prev);
      next.add(media.id);
      return next;
    });
    setBoostedAds(prev => [
      {
        mediaId: media.id,
        advertiserId: selected.adAccountId,
        advertiserName: selected.name,
        creatorHandle: media.creatorHandle,
        format: media.format,
        caption: media.caption,
        objective,
        adFormat,
        creativeId,
        adId,
      },
      ...prev,
    ]);
    setToast(`Boosted ${media.creatorHandle} · ${OBJECTIVE_LABEL[objective]}`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const perAdvertiser = view === 'discover';
  const boostedCount = boostedAds.length;

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
                {id === 'boosted' && boostedCount > 0 ? (
                  <span
                    className="ml-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold"
                    style={{
                      color: on ? 'var(--on-brand)' : 'var(--brand-ink)',
                      background: on
                        ? 'color-mix(in srgb, var(--on-brand) 25%, transparent)'
                        : 'color-mix(in srgb, var(--brand) 15%, transparent)',
                    }}>
                    {boostedCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {perAdvertiser ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Advertiser</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select advertiser"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
              {ADVERTISERS.map(a => (
                <option key={a.adAccountId} value={a.adAccountId}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'discover' ? (
        <DiscoverView
          advertiser={selected}
          boostedIds={boostedIds}
          onBoost={boost}
        />
      ) : null}
      {view === 'boosted' ? <BoostedView ads={boostedAds} /> : null}
      {view === 'portfolio' ? (
        <PortfolioView advertisers={ADVERTISERS} />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Sparkles className="size-4 text-[color:var(--green)]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
