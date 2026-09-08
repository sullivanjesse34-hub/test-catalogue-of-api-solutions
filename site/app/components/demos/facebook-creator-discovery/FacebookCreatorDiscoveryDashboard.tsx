'use client';

import {
  BadgeCheck,
  Clock,
  Film,
  Globe,
  Heart,
  type LucideIcon,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  CONTENT_TYPE_LABEL,
  COUNTRIES,
  type Creator,
  CREATOR_CATEGORIES,
  type CreatorCategory,
  CREATORS,
  DEFAULT_FILTERS,
  type DiscoveryFilters,
  filterCreators,
  formatCount,
  interactionBand,
  RATE_BAND_META,
  safetyBand,
  type SortBy,
} from '@/lib/demos/facebook-creator-discovery';

import {
  Avatar,
  Badge,
  GenderSplitBar,
  Insight,
  Kpi,
  Meter,
  ScoreRing,
  SectionHeading,
} from './ui';

// Developer-doc link surfaced in the API console for each call.
const DOC_CREATOR_DISCOVERY =
  'https://developers.facebook.com/docs/fb-creator-discovery/';

const CONTENT_ICON: Record<string, LucideIcon> = {
  reels: Film,
  videos: Film,
  photos: Sparkles,
  story: Sparkles,
  links: Globe,
  live: Radio,
};

// Metric-filter JSON shape documented in the spec: {min, time_range, breakdown}.
function metricFilter(min: number) {
  return {min, time_range: 'L28', breakdown: 'follower'};
}

// Reads that populate the discovery grid for the current filters.
function buildSearchCalls(
  filters: DiscoveryFilters,
  results: Creator[],
): ApiCallInput[] {
  const request: Record<string, unknown> = {
    query: filters.query || undefined,
    creator_categories:
      filters.categories.length > 0 ? filters.categories.join(',') : undefined,
    creator_countries: filters.country !== 'all' ? filters.country : undefined,
    sort_by: filters.sortBy,
    fields:
      'creator_alias,creator_bio,follower_count,creator_interaction_rate,creator_reach_by_followers,views,followers_top_countries',
  };
  if (filters.minFollowers > 0) {
    request.follower_count = metricFilter(filters.minFollowers);
  }
  if (filters.minInteractionRate > 0) {
    request.interaction_rate = metricFilter(filters.minInteractionRate);
  }

  return [
    {
      method: 'GET',
      endpoint: 'creator_marketplace/creators',
      summary: `Search creators (${results.length} match${
        results.length === 1 ? '' : 'es'
      })`,
      request,
      response: {
        data: results.map(c => ({
          creator_id: c.creatorId,
          creator_alias: c.creatorAlias,
          follower_count: c.followerCount,
          creator_interaction_rate: c.interactionRate,
          creator_reach_by_followers: c.reachByFollowers,
        })),
        paging: {cursors: {after: 'QVFIUl9...'}},
      },
      status: 'success',
      docsUrl: DOC_CREATOR_DISCOVERY,
    },
  ];
}

type Panel = 'grid' | 'detail';

export function FacebookCreatorDiscoveryDashboard() {
  const {record} = useApiConsole();
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);

  const results = useMemo(() => filterCreators(CREATORS, filters), [filters]);

  // A stable key so the console re-logs the search whenever filters change.
  const searchKey = JSON.stringify(filters);
  useApiLoads(searchKey, () => buildSearchCalls(filters, results));

  const selected = selectedId
    ? (CREATORS.find(c => c.creatorId === selectedId) ?? null)
    : null;
  const panel: Panel = selected ? 'detail' : 'grid';

  const handleOpenCreator = useCallback(
    (creator: Creator) => {
      setSelectedId(creator.creatorId);
      record({
        method: 'GET',
        endpoint: 'creator_marketplace/creators',
        summary: `Load creator profile — ${creator.name}`,
        request: {
          creator_id: creator.creatorId,
          fields:
            'creator_alias,creator_bio,follower_count,creator_interaction_rate,creator_reach_by_followers,views,followers_genders,followers_top_countries,followers_top_cities,past_partnerships',
        },
        response: {
          creator_id: creator.creatorId,
          creator_alias: creator.creatorAlias,
          follower_count: creator.followerCount,
          creator_interaction_rate: creator.interactionRate,
          followers_genders: creator.followersGenders,
          past_partnerships: creator.pastPartnerships.map(p => p.brand),
          // Invited-but-not-onboarded creators return a subset of fields.
          ...(creator.onboarding === 'invited'
            ? {
                error: {
                  message: 'Some fields unavailable — creator not onboarded',
                  code: 100,
                  error_subcode: 10,
                },
              }
            : {}),
        },
        status: creator.onboarding === 'invited' ? 'error' : 'success',
        docsUrl: DOC_CREATOR_DISCOVERY,
      });
    },
    [record],
  );

  const handleLoadContent = useCallback(
    (creator: Creator) => {
      record({
        method: 'GET',
        endpoint: 'creator_marketplace/content',
        summary: `Load recent content — ${creator.name}`,
        request: {
          creator_id: creator.creatorId,
          content_type: 'reels',
          sort_by: 'relevance',
          time_range: 'L28',
          fields: 'content_id,content_type,reach,views,interaction_rate',
        },
        response: {
          data: creator.content.map(item => ({
            content_id: item.contentId,
            content_type: item.contentType,
            reach: item.reach,
            views: item.views,
            interaction_rate: item.interactionRate,
          })),
        },
        status: 'success',
        docsUrl: DOC_CREATOR_DISCOVERY,
      });
    },
    [record],
  );

  const handleToggleShortlist = useCallback((creator: Creator) => {
    setShortlist(prev =>
      prev.includes(creator.creatorId)
        ? prev.filter(id => id !== creator.creatorId)
        : [...prev, creator.creatorId],
    );
  }, []);

  const handleInvite = useCallback(
    (creator: Creator) => {
      record({
        method: 'POST',
        endpoint: `${creator.creatorId}/collaboration_invites`,
        summary: `Invite to collaborate — ${creator.name}`,
        request: {
          creator_id: creator.creatorId,
          message: 'Partnership opportunity from your agency',
        },
        response: {success: true, invite_status: 'sent'},
        status: 'success',
        docsUrl: DOC_CREATOR_DISCOVERY,
      });
    },
    [record],
  );

  const totalReach = CREATORS.reduce((s, c) => s + c.views, 0);
  const avgInteraction =
    CREATORS.reduce((s, c) => s + c.interactionRate, 0) / CREATORS.length;
  const onboardedCount = CREATORS.filter(
    c => c.onboarding === 'onboarded',
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Creators discoverable"
          value={String(CREATORS.length)}
          note="in this marketplace"
          accentVar="var(--cat-creators)"
        />
        <Kpi
          label="Onboarded"
          value={`${onboardedCount}/${CREATORS.length}`}
          note="full field access"
          accentVar="var(--green)"
        />
        <Kpi
          label="Avg interaction rate"
          value={`${avgInteraction.toFixed(1)}%`}
          note="creator_interaction_rate"
          accentVar="var(--cat-performance)"
        />
        <Kpi
          label="Combined views"
          value={formatCount(totalReach)}
          note="last 28 days"
          accentVar="var(--purple)"
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={results.length}
      />

      {panel === 'grid' ? (
        <GridView
          results={results}
          shortlist={shortlist}
          onOpen={handleOpenCreator}
          onToggleShortlist={handleToggleShortlist}
        />
      ) : selected ? (
        <DetailView
          creator={selected}
          shortlisted={shortlist.includes(selected.creatorId)}
          onBack={() => {
            setSelectedId(null);
          }}
          onLoadContent={handleLoadContent}
          onToggleShortlist={handleToggleShortlist}
          onInvite={handleInvite}
        />
      ) : null}

      {shortlist.length > 0 ? (
        <Insight>
          <strong className="text-ink">Shortlist:</strong> {shortlist.length}{' '}
          creator{shortlist.length === 1 ? '' : 's'} selected. Blend these with{' '}
          Partnership Ads Booster to amplify their branded content, and export
          the list to your CRM for outreach.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters (query, categories, country, metric filters, sort_by)
// ---------------------------------------------------------------------------

function FilterBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: DiscoveryFilters;
  onChange: (f: DiscoveryFilters) => void;
  resultCount: number;
}) {
  const toggleCategory = (cat: CreatorCategory) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onChange({...filters, categories: next});
  };

  const active =
    filters.query.length > 0 ||
    filters.categories.length > 0 ||
    filters.country !== 'all' ||
    filters.minFollowers > 0 ||
    filters.minInteractionRate > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={filters.query}
            onChange={e => {
              onChange({...filters, query: e.target.value});
            }}
            placeholder="Semantic search — e.g. sustainable travel, budget skincare"
            aria-label="Search creators"
            className="w-full rounded-[10px] border-2 border-border bg-surface-2 py-2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-[color:var(--cat-creators)]"
          />
        </label>

        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <Globe className="size-4 text-ink-3" />
          <select
            value={filters.country}
            onChange={e => {
              onChange({...filters, country: e.target.value});
            }}
            aria-label="Filter by country"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creators)]">
            <option value="all">All countries</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={filters.sortBy}
            onChange={e => {
              onChange({...filters, sortBy: e.target.value as SortBy});
            }}
            aria-label="Sort creators"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creators)]">
            <option value="relevance">Relevance</option>
            <option value="followers">Followers</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CREATOR_CATEGORIES.map(cat => {
          const on = filters.categories.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                toggleCategory(cat.id);
              }}
              className={[
                'rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                on
                  ? 'bg-brand text-on-brand'
                  : 'border border-border text-ink-2 hover:bg-surface-2 hover:text-ink',
              ].join(' ')}>
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="min-w-[200px] flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            <span>Min followers</span>
            <span className="tabular-nums text-ink-2">
              {formatCount(filters.minFollowers)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2_000_000}
            step={50_000}
            value={filters.minFollowers}
            onChange={e => {
              onChange({...filters, minFollowers: Number(e.target.value)});
            }}
            aria-label="Minimum followers"
            className="w-full accent-[color:var(--cat-creators)]"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            <span>Min interaction rate</span>
            <span className="tabular-nums text-ink-2">
              {filters.minInteractionRate.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={9}
            step={0.5}
            value={filters.minInteractionRate}
            onChange={e => {
              onChange({
                ...filters,
                minInteractionRate: Number(e.target.value),
              });
            }}
            aria-label="Minimum interaction rate"
            className="w-full accent-[color:var(--cat-creators)]"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tabular-nums text-ink">
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </span>
          {active ? (
            <button
              type="button"
              onClick={() => {
                onChange(DEFAULT_FILTERS);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <X className="size-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid of creator cards
// ---------------------------------------------------------------------------

function GridView({
  results,
  shortlist,
  onOpen,
  onToggleShortlist,
}: {
  results: Creator[];
  shortlist: string[];
  onOpen: (c: Creator) => void;
  onToggleShortlist: (c: Creator) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
        <Search className="size-6 text-ink-3" />
        <p className="mt-2 text-sm font-semibold text-ink">
          No creators match these filters
        </p>
        <p className="text-[13px] text-ink-2">
          Loosen the metric filters or clear a category to widen the search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {results.map(c => (
        <CreatorCard
          key={c.creatorId}
          creator={c}
          shortlisted={shortlist.includes(c.creatorId)}
          onOpen={onOpen}
          onToggleShortlist={onToggleShortlist}
        />
      ))}
    </div>
  );
}

function CreatorCard({
  creator,
  shortlisted,
  onOpen,
  onToggleShortlist,
}: {
  creator: Creator;
  shortlisted: boolean;
  onOpen: (c: Creator) => void;
  onToggleShortlist: (c: Creator) => void;
}) {
  const band = RATE_BAND_META[interactionBand(creator.interactionRate)];
  const safety = RATE_BAND_META[safetyBand(creator.brandSafetyScore)];
  const categoryLabel =
    CREATOR_CATEGORIES.find(cat => cat.id === creator.category)?.label ??
    creator.category;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-[color:var(--cat-creators)]">
      <div className="flex items-start gap-3">
        <Avatar name={creator.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-ink">
              {creator.name}
            </h3>
            {creator.onboarding === 'onboarded' ? (
              <BadgeCheck
                className="size-4 shrink-0 text-[color:var(--cat-performance)]"
                aria-label="Onboarded"
              />
            ) : null}
          </div>
          <p className="truncate text-[12px] text-ink-3">
            {creator.creatorAlias}
          </p>
          <div className="mt-1">
            <Badge tone="purple">{categoryLabel}</Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onToggleShortlist(creator);
          }}
          aria-label={
            shortlisted ? 'Remove from shortlist' : 'Add to shortlist'
          }
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2">
          <Heart
            className="size-4"
            style={
              shortlisted
                ? {fill: 'var(--rose)', color: 'var(--rose)'}
                : undefined
            }
          />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
        {creator.creatorBio}
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Followers
          </dt>
          <dd className="text-[15px] font-bold tabular-nums text-ink">
            {formatCount(creator.followerCount)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Interaction
          </dt>
          <dd
            className="text-[15px] font-bold tabular-nums"
            style={{color: band.colorVar}}>
            {creator.interactionRate.toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Reach
          </dt>
          <dd className="text-[15px] font-bold tabular-nums text-ink">
            {creator.reachByFollowers}%
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <ShieldCheck className="size-4" style={{color: safety.colorVar}} />
        <span className="text-[12px] text-ink-2">Brand safety</span>
        <span
          className="ml-auto text-[13px] font-bold tabular-nums"
          style={{color: safety.colorVar}}>
          {creator.brandSafetyScore}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          onOpen(creator);
        }}
        className="mt-3 rounded-lg bg-brand py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90">
        View profile
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator detail (creator-ID lookup + content)
// ---------------------------------------------------------------------------

function DetailView({
  creator,
  shortlisted,
  onBack,
  onLoadContent,
  onToggleShortlist,
  onInvite,
}: {
  creator: Creator;
  shortlisted: boolean;
  onBack: () => void;
  onLoadContent: (c: Creator) => void;
  onToggleShortlist: (c: Creator) => void;
  onInvite: (c: Creator) => void;
}) {
  const [contentLoaded, setContentLoaded] = useState(false);
  const band = RATE_BAND_META[interactionBand(creator.interactionRate)];
  const safety = RATE_BAND_META[safetyBand(creator.brandSafetyScore)];
  const categoryLabel =
    CREATOR_CATEGORIES.find(cat => cat.id === creator.category)?.label ??
    creator.category;

  const showContent = () => {
    if (!contentLoaded) {
      onLoadContent(creator);
      setContentLoaded(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink">
        ← Back to results
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={creator.name} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-[-0.01em] text-ink">
                  {creator.name}
                </h2>
                {creator.onboarding === 'onboarded' ? (
                  <Badge tone="blue">Onboarded</Badge>
                ) : (
                  <Badge tone="yellow">Invited · partial fields</Badge>
                )}
                <Badge tone="purple">{categoryLabel}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] tabular-nums text-ink-3">
                {creator.creatorAlias} · creator {creator.creatorId}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                {creator.creatorBio}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <Stat
              icon={Users}
              label="Followers"
              value={formatCount(creator.followerCount)}
            />
            <Stat
              icon={Heart}
              label="Interaction"
              value={`${creator.interactionRate.toFixed(1)}%`}
              colorVar={band.colorVar}
            />
            <Stat
              icon={Globe}
              label="Reach / followers"
              value={`${creator.reachByFollowers}%`}
            />
            <Stat
              icon={Film}
              label="Views (28d)"
              value={formatCount(creator.views)}
            />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Recent content</span>
              {!contentLoaded ? (
                <button
                  type="button"
                  onClick={showContent}
                  className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                  Load content
                </button>
              ) : null}
            </div>
            {contentLoaded ? (
              <ul className="flex flex-col gap-2">
                {creator.content.map(item => {
                  const Icon = CONTENT_ICON[item.contentType] ?? Film;
                  return (
                    <li
                      key={item.contentId}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
                      <Icon className="size-4 shrink-0 text-[color:var(--cat-creators)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {item.caption}
                        </p>
                        <p className="text-[11px] text-ink-3">
                          {CONTENT_TYPE_LABEL[item.contentType]} ·{' '}
                          {formatCount(item.reach)} reach ·{' '}
                          {formatCount(item.views)} views
                        </p>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums text-ink">
                        {item.interactionRate.toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Clock className="size-4" />
                Fetch this creator&apos;s top reels from the content edge.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Brand safety</span>
              <Badge
                tone={
                  safetyBand(creator.brandSafetyScore) === 'high'
                    ? 'green'
                    : safetyBand(creator.brandSafetyScore) === 'mid'
                      ? 'purple'
                      : 'yellow'
                }>
                {RATE_BAND_META[safetyBand(creator.brandSafetyScore)].label}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <ScoreRing
                score={creator.brandSafetyScore}
                colorVar={safety.colorVar}
              />
              <p className="flex-1 text-[12px] leading-relaxed text-ink-2">
                Agency-blended score layering brand-safety checks on the native
                creator signals — per the build spec, agencies add their own
                metrics on top of the discovery API.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-sm font-bold text-ink">Audience</span>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[12px] text-ink-2">
                <span>Gender split</span>
                <span className="tabular-nums text-ink-3">
                  {creator.followersGenders.female}%F ·{' '}
                  {creator.followersGenders.male}%M
                </span>
              </div>
              <GenderSplitBar genders={creator.followersGenders} />
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-[12px] font-semibold text-ink-2">
                Top countries
              </p>
              <div className="flex flex-col gap-1.5">
                {creator.topCountries.map(place => (
                  <div key={place.name} className="flex items-center gap-2">
                    <span className="w-28 truncate text-[12px] text-ink-2">
                      {place.name}
                    </span>
                    <div className="flex-1">
                      <Meter pct={place.pct * 1.8} />
                    </div>
                    <span className="w-8 text-right text-[12px] tabular-nums text-ink-3">
                      {place.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {creator.pastPartnerships.length > 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <span className="text-sm font-bold text-ink">
                Past partnerships
              </span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {creator.pastPartnerships.map(p => (
                  <li
                    key={p.brand}
                    className="flex items-center justify-between text-[13px] text-ink-2">
                    <span className="font-medium text-ink">{p.brand}</span>
                    <span className="text-[11px] text-ink-3">
                      {p.contentCount} post{p.contentCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleShortlist(creator);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <Heart
                className="size-4"
                style={
                  shortlisted
                    ? {fill: 'var(--rose)', color: 'var(--rose)'}
                    : undefined
                }
              />
              {shortlisted ? 'Shortlisted' : 'Shortlist'}
            </button>
            <button
              type="button"
              onClick={() => {
                onInvite(creator);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90">
              <Send className="size-4" />
              Invite
            </button>
          </div>
        </div>
      </div>

      <SectionHeading
        title="Why this creator surfaced"
        sub="The discovery API ranks on the fields your filters selected — this profile matches on engagement quality and audience fit."
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  colorVar,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  colorVar?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p
        className="mt-0.5 text-lg font-bold tabular-nums text-ink"
        style={colorVar ? {color: colorVar} : undefined}>
        {value}
      </p>
    </div>
  );
}
