'use client';

import {
  BadgeCheck,
  Clock,
  Film,
  Globe,
  Heart,
  Images,
  Layers,
  type LucideIcon,
  PlugZap,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AGE_BUCKETS,
  AGE_LABEL,
  BAND_META,
  COUNTRIES,
  COUNTRY_LABEL,
  type Creator,
  CREATORS,
  DEFAULT_FILTERS,
  type DiscoveryFilters,
  filterCreators,
  FOLLOWER_BUCKETS,
  followerBucketLabel,
  type Gender,
  interactionBand,
  type Interest,
  INTEREST_LABEL,
  INTERESTS,
  MAX_INTERESTS,
  MEDIA_TYPE_LABEL,
  type MediaItem,
  ONBOARDING_META,
  RECOMMENDATION_TYPES,
  safetyBand,
} from '@/lib/demos/instagram-creator-discovery';

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
const DOC_CMP =
  'https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/creator-marketplace/';

const MEDIA_ICON: Record<string, LucideIcon> = {
  reels: Film,
  image: Images,
  carousel: Layers,
  story: Sparkles,
};

// Discovery read for the current filters (creator_marketplace_creators edge).
function buildSearchCalls(
  filters: DiscoveryFilters,
  results: Creator[],
): ApiCallInput[] {
  const request: Record<string, unknown> = {
    recommendation_type: filters.recommendationType,
    query: filters.query || undefined,
    creator_interests:
      filters.interests.length > 0 ? filters.interests : undefined,
    creator_countries:
      filters.country !== 'all' ? [filters.country] : undefined,
    creator_min_followers:
      filters.minFollowers > 0 ? filters.minFollowers : undefined,
    creator_max_followers:
      filters.maxFollowers > 0 ? filters.maxFollowers : undefined,
    creator_gender: filters.gender !== 'all' ? filters.gender : undefined,
    major_audience_gender:
      filters.audienceGender !== 'all' ? filters.audienceGender : undefined,
    major_audience_age_bucket:
      filters.audienceAge !== 'all' ? filters.audienceAge : undefined,
    major_audience_countries:
      filters.audienceCountry !== 'all' ? [filters.audienceCountry] : undefined,
    fields:
      'id,username,is_account_verified,biography,country,onboarded_status,gender,age_bucket,badges,has_brand_partnership_experience,insights.metrics(total_followers,reels_interaction_rate)',
  };

  return [
    {
      method: 'GET',
      endpoint: '{ig-user-id}/creator_marketplace_creators',
      summary: `Discover creators — ${
        RECOMMENDATION_TYPES.find(r => r.id === filters.recommendationType)
          ?.label ?? filters.recommendationType
      } (${results.length} match${results.length === 1 ? '' : 'es'})`,
      request,
      response: {
        data: results.map(c => ({
          id: c.id,
          username: c.username,
          is_account_verified: c.isVerified,
          country: c.country,
          onboarded_status: c.onboarding,
          insights: {
            total_followers: c.totalFollowers,
            reels_interaction_rate: c.reelsInteractionRate,
          },
        })),
        paging: {cursors: {after: 'QVFIUl9...'}},
      },
      status: 'success',
      docsUrl: DOC_CMP,
    },
  ];
}

type Panel = 'grid' | 'detail';

// --- live data (phase 2) ---------------------------------------------------

type DataMode = 'loading' | 'live' | 'sample' | 'connect' | 'error';

// localStorage key for the operator-supplied IG account id (not a secret).
const IG_USER_ID_KEY = 'ig-cmp-user-id';

// Small localStorage-backed store for the connected IG account id, read via
// useSyncExternalStore (SSR-safe; the app avoids setState-in-effect).
const igAccountStore = {
  listeners: new Set<() => void>(),
  get: (): string =>
    typeof localStorage === 'undefined'
      ? ''
      : (localStorage.getItem(IG_USER_ID_KEY) ?? ''),
  set: (id: string): void => {
    if (id) localStorage.setItem(IG_USER_ID_KEY, id);
    else localStorage.removeItem(IG_USER_ID_KEY);
    igAccountStore.listeners.forEach(l => {
      l();
    });
  },
  subscribe: (cb: () => void): (() => void) => {
    igAccountStore.listeners.add(cb);
    return () => {
      igAccountStore.listeners.delete(cb);
    };
  },
};

interface CmpDiscoveryResponse {
  configured: boolean;
  connected?: boolean;
  creators?: Creator[];
}
interface CmpInsightsResponse {
  configured: boolean;
  creator?: Creator;
}
interface CmpMediaResponse {
  configured: boolean;
  media?: {branded: MediaItem[]; recent: MediaItem[]};
}

/**
 * The internal build POSTs to a server route holding a Page token to pull live
 * Creator Marketplace data. A static site has nowhere to keep that token, so
 * the live path is stubbed and every caller falls through to sample data.
 */
function postCmp<T>(_body?: unknown): Promise<T> {
  return Promise.resolve({configured: false} as T);
}

function DataStatusChip({mode}: {mode: DataMode}) {
  const meta: Record<DataMode, {label: string; color: string}> = {
    loading: {label: 'Checking for live data…', color: 'var(--ink-3)'},
    live: {label: 'Live data', color: 'var(--green)'},
    sample: {label: 'Sample data', color: 'var(--ink-3)'},
    connect: {label: 'Not connected', color: 'var(--cat-measurement)'},
    error: {
      label: 'Live unavailable — showing sample',
      color: 'var(--cat-measurement)',
    },
  };
  const m = meta[mode];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <span
        className="size-2 rounded-full"
        style={{background: m.color}}
        aria-hidden
      />
      <span className="font-semibold" style={{color: m.color}}>
        {m.label}
      </span>
    </div>
  );
}

/**
 * Operator console to connect an Instagram account by user id. The id is not a
 * secret; it is sent with each request and used server-side alongside the Page
 * token. Persisted to localStorage so it survives reloads.
 */
function ConnectConsole({
  mode,
  igUserId,
  onConnect,
  onDisconnect,
}: {
  mode: DataMode;
  igUserId: string;
  onConnect: (id: string) => void;
  onDisconnect: () => void;
}) {
  // Seeded from igUserId; the parent remounts this via `key` when it changes.
  const [draft, setDraft] = useState(igUserId);

  const tokenMissing = mode === 'sample';
  const connected = mode === 'live';
  const valid = /^\d{1,20}$/.test(draft.trim());

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlugZap className="size-4 text-[color:var(--cat-creators)]" />
          <span className="text-sm font-bold text-ink">
            Connect Instagram account
          </span>
        </div>
        <DataStatusChip mode={mode} />
      </div>

      {connected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-[13px] font-medium tabular-nums text-ink">
            IG account {igUserId}
          </span>
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={e => {
              e.preventDefault();
              if (valid) onConnect(draft.trim());
            }}>
            <input
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
              }}
              inputMode="numeric"
              placeholder="Instagram user ID (numeric)"
              aria-label="Instagram user ID"
              className="min-w-[220px] flex-1 rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-[color:var(--cat-creators)]"
            />
            <button
              type="submit"
              disabled={!valid}
              className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-40">
              Connect
            </button>
          </form>
          {mode === 'error' ? (
            <p className="mt-2 text-[12px] text-[color:var(--cat-measurement)]">
              Couldn&apos;t reach that account — check the ID and try again.
            </p>
          ) : tokenMissing ? (
            <p className="mt-2 text-[12px] text-ink-3">
              Enter an account to connect. Live data also needs a Page access
              token configured on the server — until then the tool shows sample
              creators.
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-ink-3">
              Enter the Instagram account&apos;s numeric user ID to pull live
              creators.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function InstagramCreatorDiscoveryDashboard() {
  const {record} = useApiConsole();
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);

  // Live data (phase 2): populated from /api/creator-marketplace when the
  // server has a Page token and an IG account is connected; otherwise the tool
  // uses sample creators. The IG account id is entered in the connect console.
  const [liveCreators, setLiveCreators] = useState<Creator[] | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>('loading');
  const [enriched, setEnriched] = useState<Record<string, Creator>>({});
  const igUserId = useSyncExternalStore(
    igAccountStore.subscribe,
    igAccountStore.get,
    () => '',
  );

  const handleConnect = useCallback((id: string) => {
    igAccountStore.set(id);
  }, []);

  const handleDisconnect = useCallback(() => {
    igAccountStore.set('');
  }, []);

  const sampleResults = useMemo(
    () => filterCreators(CREATORS, filters),
    [filters],
  );

  // Refetch whenever the filters or the connected account change.
  useEffect(() => {
    let cancelled = false;
    postCmp<CmpDiscoveryResponse>({
      resource: 'discovery',
      filters,
      igUserId: igUserId || undefined,
    })
      .then(res => {
        if (cancelled) return;
        if (!res.configured) {
          setLiveCreators(null);
          setDataMode('sample');
        } else if (!res.connected) {
          setLiveCreators(null);
          setDataMode('connect');
        } else {
          setLiveCreators(res.creators ?? []);
          setDataMode('live');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLiveCreators(null);
        setDataMode('error');
      });
    return () => {
      cancelled = true;
    };
  }, [filters, igUserId]);

  const isLive = dataMode === 'live';
  const baseResults = isLive && liveCreators ? liveCreators : sampleResults;
  const results = useMemo(
    () => baseResults.map(c => enriched[c.username] ?? c),
    [baseResults, enriched],
  );

  // Re-log the discovery read whenever filters or the data source change.
  const searchKey = JSON.stringify({filters, dataMode, n: results.length});
  useApiLoads(searchKey, () => buildSearchCalls(filters, results));

  const selected = selectedUsername
    ? (results.find(c => c.username === selectedUsername) ?? null)
    : null;
  const panel: Panel = selected ? 'detail' : 'grid';

  const handleOpenCreator = useCallback(
    (creator: Creator) => {
      setSelectedUsername(creator.username);
      const onboarded = creator.onboarding === 'onboarded';
      // Non-onboarded creators return only total_followers (subcode 10 on the
      // private metrics / gender / age_bucket).
      record({
        method: 'GET',
        endpoint: '{ig-user-id}/creator_marketplace_creators',
        summary: `Load creator insights — @${creator.username}`,
        request: {
          username: creator.username,
          fields:
            'id,username,gender,age_bucket,badges,has_brand_partnership_experience,past_brand_partnership_partners,insights.metrics(total_followers,creator_engaged_accounts,creator_reach,reels_interaction_rate,reels_hook_rate).breakdown(follow_type)',
        },
        response: onboarded
          ? {
              id: creator.id,
              username: creator.username,
              gender: creator.gender,
              age_bucket: creator.ageBucket,
              has_brand_partnership_experience:
                creator.hasBrandPartnershipExperience,
              past_brand_partnership_partners:
                creator.pastBrandPartnershipPartners,
              insights: {
                total_followers: creator.totalFollowers,
                creator_engaged_accounts: creator.engagedAccounts,
                creator_reach: creator.reach,
                reels_interaction_rate: creator.reelsInteractionRate,
                reels_hook_rate: creator.reelsHookRate,
              },
            }
          : {
              id: creator.id,
              username: creator.username,
              insights: {total_followers: creator.totalFollowers},
              error: {
                message:
                  'Private insights unavailable — creator has not onboarded to Creator Marketplace',
                code: 100,
                error_subcode: 10,
              },
            },
        status: onboarded ? 'success' : 'error',
        docsUrl: DOC_CMP,
      });

      if (isLive) {
        postCmp<CmpInsightsResponse>({
          resource: 'insights',
          username: creator.username,
          igUserId: igUserId || undefined,
        })
          .then(res => {
            if (res.configured && res.creator) {
              const live = res.creator;
              setEnriched(prev => ({...prev, [creator.username]: live}));
            }
          })
          .catch(() => {
            // Keep the base creator; the API view already noted the call.
          });
      }
    },
    [record, isLive, igUserId],
  );

  const handleLoadMedia = useCallback(
    (creator: Creator) => {
      record({
        method: 'GET',
        endpoint: '{ig-user-id}/creator_marketplace_creators',
        summary: `Load media — @${creator.username}`,
        request: {
          username: creator.username,
          fields:
            'branded_content_media{media_type,permalink,caption,likes,comments,views,shares,tagged_brand},recent_media{media_type,permalink,caption,likes,comments,views,shares}',
        },
        response: {
          branded_content_media: {
            data: creator.brandedContentMedia.map(m => ({
              id: m.mediaId,
              media_type: m.mediaType,
              likes: m.likes,
              comments: m.comments,
              views: m.views,
              shares: m.shares,
              tagged_brand: m.taggedBrand,
            })),
          },
          recent_media: {
            data: creator.recentMedia.map(m => ({
              id: m.mediaId,
              media_type: m.mediaType,
              likes: m.likes,
              comments: m.comments,
              views: m.views,
              shares: m.shares,
            })),
          },
        },
        status: 'success',
        docsUrl: DOC_CMP,
      });

      if (isLive) {
        postCmp<CmpMediaResponse>({
          resource: 'media',
          username: creator.username,
          igUserId: igUserId || undefined,
        })
          .then(res => {
            if (res.configured && res.media) {
              const media = res.media;
              setEnriched(prev => {
                const base = prev[creator.username] ?? creator;
                return {
                  ...prev,
                  [creator.username]: {
                    ...base,
                    brandedContentMedia: media.branded,
                    recentMedia: media.recent,
                  },
                };
              });
            }
          })
          .catch(() => {
            // Keep whatever media the creator already has.
          });
      }
    },
    [record, isLive, igUserId],
  );

  const handleToggleShortlist = useCallback((creator: Creator) => {
    setShortlist(prev =>
      prev.includes(creator.username)
        ? prev.filter(u => u !== creator.username)
        : [...prev, creator.username],
    );
  }, []);

  const handleInvite = useCallback(
    (creator: Creator) => {
      record({
        method: 'POST',
        endpoint: '{ig-user-id}/creator_marketplace_invites',
        summary: `Invite to collaborate — @${creator.username}`,
        request: {
          creator_username: creator.username,
          message: 'Partnership opportunity from your agency',
        },
        response: {success: true, invite_status: 'sent'},
        status: 'success',
        docsUrl: DOC_CMP,
      });
    },
    [record],
  );

  const onboardedCount = CREATORS.filter(
    c => c.onboarding === 'onboarded',
  ).length;
  const onboardedCreators = CREATORS.filter(c => c.onboarding === 'onboarded');
  const avgInteraction =
    onboardedCreators.reduce((s, c) => s + c.reelsInteractionRate, 0) /
    onboardedCreators.length;
  const totalReach = CREATORS.reduce((s, c) => s + c.reach, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Creators discoverable"
          value={String(CREATORS.length)}
          note="in this marketplace"
          accentVar="var(--cat-creators)"
          icon={<Users className="size-5" />}
        />
        <Kpi
          label="Onboarded"
          value={`${onboardedCount}/${CREATORS.length}`}
          note="full insights available"
          accentVar="var(--green)"
          icon={<BadgeCheck className="size-5" />}
        />
        <Kpi
          label="Avg reels interaction"
          value={`${avgInteraction.toFixed(1)}%`}
          note="engagement on reels"
          accentVar="var(--cat-performance)"
          icon={<Heart className="size-5" />}
        />
        <Kpi
          label="Combined reach"
          value={`${(totalReach / 1_000_000).toFixed(1)}M`}
          note="accounts reached this month"
          accentVar="var(--purple)"
          icon={<Globe className="size-5" />}
        />
      </div>

      <ConnectConsole
        key={igUserId || 'none'}
        mode={dataMode}
        igUserId={igUserId}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

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
          shortlisted={shortlist.includes(selected.username)}
          onBack={() => {
            setSelectedUsername(null);
          }}
          onLoadMedia={handleLoadMedia}
          onToggleShortlist={handleToggleShortlist}
          onInvite={handleInvite}
        />
      ) : null}

      {shortlist.length > 0 ? (
        <Insight>
          <strong className="text-ink">Shortlist:</strong> {shortlist.length}{' '}
          creator{shortlist.length === 1 ? '' : 's'} selected. Turn their
          permissioned branded content into partnership ads with Partnership Ads
          Booster, or blend in agency brand-safety scoring before outreach.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters
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
  const atInterestLimit = filters.interests.length >= MAX_INTERESTS;

  const toggleInterest = (interest: Interest) => {
    const has = filters.interests.includes(interest);
    if (!has && atInterestLimit) return;
    onChange({
      ...filters,
      interests: has
        ? filters.interests.filter(i => i !== interest)
        : [...filters.interests, interest],
    });
  };

  const active =
    filters.query.length > 0 ||
    filters.interests.length > 0 ||
    filters.country !== 'all' ||
    filters.minFollowers > 0 ||
    filters.maxFollowers > 0 ||
    filters.gender !== 'all' ||
    filters.audienceGender !== 'all' ||
    filters.audienceAge !== 'all' ||
    filters.audienceCountry !== 'all';

  const activeRec = RECOMMENDATION_TYPES.find(
    r => r.id === filters.recommendationType,
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {/* Recommendation ranking */}
      <div className="mb-4 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
          <TrendingUp className="size-3.5" />
          Ranked by
        </div>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDATION_TYPES.map(r => {
            const on = r.id === filters.recommendationType;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange({...filters, recommendationType: r.id});
                }}
                aria-pressed={on}
                className={[
                  'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : 'border border-border text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                {r.label}
              </button>
            );
          })}
        </div>
        {activeRec ? (
          <p className="mt-2 text-[12px] text-ink-2">{activeRec.blurb}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={filters.query}
            onChange={e => {
              onChange({...filters, query: e.target.value});
            }}
            placeholder="Keyword search — e.g. skincare, meal prep, indie games"
            aria-label="Search creators"
            className="w-full rounded-[10px] border-2 border-border bg-surface-2 py-2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-[color:var(--cat-creators)]"
          />
        </label>

        <Select
          label="Creator country"
          value={filters.country}
          onChange={v => {
            onChange({...filters, country: v});
          }}
          options={[
            {value: 'all', label: 'All countries'},
            ...COUNTRIES.map(c => ({value: c.code, label: c.label})),
          ]}
        />

        <Select
          label="Creator gender"
          value={filters.gender}
          onChange={v => {
            onChange({...filters, gender: v as Gender | 'all'});
          }}
          options={[
            {value: 'all', label: 'Any gender'},
            {value: 'female', label: 'Female'},
            {value: 'male', label: 'Male'},
          ]}
        />
      </div>

      {/* Interests (≤5) */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
          <span>Interests</span>
          <span className="tabular-nums">
            {filters.interests.length}/{MAX_INTERESTS}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map(interest => {
            const on = filters.interests.includes(interest.id);
            const disabled = !on && atInterestLimit;
            return (
              <button
                key={interest.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  toggleInterest(interest.id);
                }}
                className={[
                  'rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : disabled
                      ? 'cursor-not-allowed border border-border text-ink-3 opacity-50'
                      : 'border border-border text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* follower buckets + audience filters */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Select
          label="Min followers"
          value={String(filters.minFollowers)}
          onChange={v => {
            onChange({...filters, minFollowers: Number(v)});
          }}
          options={FOLLOWER_BUCKETS.map(b => ({
            value: String(b),
            label: followerBucketLabel(b),
          }))}
        />
        <Select
          label="Max followers"
          value={String(filters.maxFollowers)}
          onChange={v => {
            onChange({...filters, maxFollowers: Number(v)});
          }}
          options={[
            {value: '0', label: 'Any'},
            ...FOLLOWER_BUCKETS.filter(b => b > 0).map(b => ({
              value: String(b),
              label: followerBucketLabel(b),
            })),
          ]}
        />
        <Select
          label="Audience gender"
          value={filters.audienceGender}
          onChange={v => {
            onChange({...filters, audienceGender: v as Gender | 'all'});
          }}
          options={[
            {value: 'all', label: 'Any'},
            {value: 'female', label: 'Female'},
            {value: 'male', label: 'Male'},
          ]}
        />
        <Select
          label="Audience age"
          value={filters.audienceAge}
          onChange={v => {
            onChange({
              ...filters,
              audienceAge: v as DiscoveryFilters['audienceAge'],
            });
          }}
          options={[
            {value: 'all', label: 'Any'},
            ...AGE_BUCKETS.map(a => ({value: a.id, label: a.label})),
          ]}
        />
        <Select
          label="Audience country"
          value={filters.audienceCountry}
          onChange={v => {
            onChange({...filters, audienceCountry: v});
          }}
          options={[
            {value: 'all', label: 'Any'},
            ...COUNTRIES.map(c => ({value: c.code, label: c.label})),
          ]}
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] font-semibold tabular-nums text-ink">
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </span>
          {active ? (
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...DEFAULT_FILTERS,
                  recommendationType: filters.recommendationType,
                });
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{value: string; label: string}>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        {label}
      </span>
      <select
        value={value}
        onChange={e => {
          onChange(e.target.value);
        }}
        aria-label={label}
        className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-creators)]">
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
          Loosen the follower buckets, audience filters, or interests to widen
          the search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {results.map(c => (
        <CreatorCard
          key={c.username}
          creator={c}
          shortlisted={shortlist.includes(c.username)}
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
  const onboarded = creator.onboarding === 'onboarded';
  const scored = creator.agencyScored !== false;
  const band = BAND_META[interactionBand(creator.reelsInteractionRate)];
  const safety = BAND_META[safetyBand(creator.brandSafetyScore)];
  const safetyColor = scored ? safety.colorVar : 'var(--ink-3)';
  const onboardMeta = ONBOARDING_META[creator.onboarding];

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-[color:var(--cat-creators)]">
      <div className="flex items-start gap-3">
        <Avatar name={creator.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-ink">
              {creator.name}
            </h3>
            {creator.isVerified ? (
              <BadgeCheck
                className="size-4 shrink-0 text-[color:var(--cat-performance)]"
                aria-label="Verified"
              />
            ) : null}
          </div>
          <p className="truncate text-[12px] text-ink-3">@{creator.username}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={onboardMeta.tone}>{onboardMeta.label}</Badge>
            {creator.interests[0] ? (
              <Badge tone="purple">
                {INTEREST_LABEL[creator.interests[0]]}
              </Badge>
            ) : null}
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
        {creator.biography}
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Followers
          </dt>
          <dd className="text-[15px] font-bold tabular-nums text-ink">
            {formatFollowers(creator.totalFollowers)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Reels rate
          </dt>
          <dd
            className="text-[15px] font-bold tabular-nums"
            style={{color: onboarded ? band.colorVar : 'var(--ink-3)'}}>
            {onboarded ? `${creator.reelsInteractionRate.toFixed(1)}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3">
            Reach
          </dt>
          <dd className="text-[15px] font-bold tabular-nums text-ink">
            {onboarded ? formatFollowers(creator.reach) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <ShieldCheck className="size-4" style={{color: safetyColor}} />
        <span className="text-[12px] text-ink-2">Brand safety</span>
        <span
          className="ml-auto text-[13px] font-bold tabular-nums"
          style={{color: safetyColor}}>
          {scored ? creator.brandSafetyScore : '—'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          onOpen(creator);
        }}
        className="mt-3 rounded-lg bg-brand py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90">
        View insights
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator detail (username-scoped insights + media)
// ---------------------------------------------------------------------------

function DetailView({
  creator,
  shortlisted,
  onBack,
  onLoadMedia,
  onToggleShortlist,
  onInvite,
}: {
  creator: Creator;
  shortlisted: boolean;
  onBack: () => void;
  onLoadMedia: (c: Creator) => void;
  onToggleShortlist: (c: Creator) => void;
  onInvite: (c: Creator) => void;
}) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaTab, setMediaTab] = useState<'branded' | 'recent'>('branded');
  const onboarded = creator.onboarding === 'onboarded';
  const scored = creator.agencyScored !== false;
  const band = BAND_META[interactionBand(creator.reelsInteractionRate)];
  const safety = BAND_META[safetyBand(creator.brandSafetyScore)];
  const onboardMeta = ONBOARDING_META[creator.onboarding];

  const showMedia = () => {
    if (!mediaLoaded) {
      onLoadMedia(creator);
      setMediaLoaded(true);
    }
  };

  const mediaItems =
    mediaTab === 'branded' ? creator.brandedContentMedia : creator.recentMedia;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink">
        ← Back to results
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={creator.name} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-[-0.01em] text-ink">
                    {creator.name}
                  </h2>
                  {creator.isVerified ? (
                    <BadgeCheck
                      className="size-4 text-[color:var(--cat-performance)]"
                      aria-label="Verified"
                    />
                  ) : null}
                  <Badge tone={onboardMeta.tone}>{onboardMeta.label}</Badge>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  @{creator.username} · {COUNTRY_LABEL[creator.country]}
                  {onboarded ? ` · ${AGE_LABEL[creator.ageBucket]}` : ''}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  {creator.biography}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {creator.interests.map(i => (
                    <Badge key={i} tone="purple">
                      {INTEREST_LABEL[i]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
              <Stat
                icon={Users}
                label="Followers"
                value={formatFollowers(creator.totalFollowers)}
              />
              <Stat
                icon={Heart}
                label="Reels interaction"
                value={
                  onboarded
                    ? `${creator.reelsInteractionRate.toFixed(1)}%`
                    : '—'
                }
                colorVar={onboarded ? band.colorVar : undefined}
              />
              <Stat
                icon={Sparkles}
                label="Reels hook rate"
                value={onboarded ? `${creator.reelsHookRate}%` : '—'}
              />
              <Stat
                icon={Globe}
                label="Reach (mo)"
                value={onboarded ? formatFollowers(creator.reach) : '—'}
              />
            </div>

            {!onboarded ? (
              <div className="mt-4">
                <Insight tone="warn">
                  Only follower count is public for this creator. Detailed
                  insights — engaged accounts, reach, reels rates, and audience
                  breakdowns — become available once they join Creator
                  Marketplace.
                </Insight>
              </div>
            ) : null}
          </div>

          {onboarded ? (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeading
                title="Audience"
                sub="Who engages with this creator — gender, age, and top locations."
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-ink-2">
                    <span>Gender split</span>
                    <span className="tabular-nums text-ink-3">
                      {creator.audienceGenders.female}%F ·{' '}
                      {creator.audienceGenders.male}%M
                    </span>
                  </div>
                  <GenderSplitBar genders={creator.audienceGenders} />

                  <p className="mb-1.5 mt-4 text-[12px] font-semibold text-ink-2">
                    Age
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {creator.audienceAges.map(a => (
                      <div key={a.bucket} className="flex items-center gap-2">
                        <span className="w-12 text-[12px] tabular-nums text-ink-2">
                          {AGE_LABEL[a.bucket]}
                        </span>
                        <div className="flex-1">
                          <Meter pct={a.pct * 2} />
                        </div>
                        <span className="w-8 text-right text-[12px] tabular-nums text-ink-3">
                          {a.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-ink-2">
                    Top countries
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {creator.audienceCountries.map(place => (
                      <PlaceRow key={place.name} place={place} />
                    ))}
                  </div>
                  <p className="mb-1.5 mt-4 text-[12px] font-semibold text-ink-2">
                    Top cities
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {creator.audienceCities.map(place => (
                      <PlaceRow key={place.name} place={place} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-[12px] font-semibold text-ink-2">
                  Reach by format
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <ReachTile
                    label="Reels"
                    pct={creator.reachByMediaType.reels}
                  />
                  <ReachTile
                    label="Posts"
                    pct={creator.reachByMediaType.posts}
                  />
                  <ReachTile
                    label="Stories"
                    pct={creator.reachByMediaType.stories}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Media */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink">Media</span>
              {mediaLoaded ? (
                <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                  <TabButton
                    on={mediaTab === 'branded'}
                    onClick={() => {
                      setMediaTab('branded');
                    }}>
                    Branded content
                  </TabButton>
                  <TabButton
                    on={mediaTab === 'recent'}
                    onClick={() => {
                      setMediaTab('recent');
                    }}>
                    Recent
                  </TabButton>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={showMedia}
                  className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                  Load media
                </button>
              )}
            </div>
            {mediaLoaded ? (
              mediaItems.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {mediaItems.map(item => (
                    <MediaRow key={item.mediaId} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-3">
                  No {mediaTab === 'branded' ? 'branded content' : 'recent'}{' '}
                  media returned for this creator.
                </p>
              )
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Clock className="size-4" />
                Preview this creator&apos;s branded and recent posts.
              </p>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">
                Brand safety
                <span className="ml-1 font-normal text-ink-3">(agency)</span>
              </span>
              {scored ? (
                <Badge
                  tone={
                    safetyBand(creator.brandSafetyScore) === 'high'
                      ? 'green'
                      : safetyBand(creator.brandSafetyScore) === 'mid'
                        ? 'purple'
                        : 'yellow'
                  }>
                  {BAND_META[safetyBand(creator.brandSafetyScore)].label}
                </Badge>
              ) : (
                <Badge tone="muted">Not scored</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {scored ? (
                <ScoreRing
                  score={creator.brandSafetyScore}
                  colorVar={safety.colorVar}
                />
              ) : (
                <div
                  className="grid size-16 shrink-0 place-items-center rounded-full border border-border text-lg font-bold text-ink-3"
                  aria-hidden>
                  —
                </div>
              )}
              <p className="flex-1 text-[12px] leading-relaxed text-ink-2">
                Your agency&apos;s own brand-safety scoring, blended on top of
                the creator&apos;s native signals to help you shortlist with
                confidence.{scored ? '' : ' Not scored for live creators yet.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-sm font-bold text-ink">Native signals</span>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              <SignalRow label="Verified account" on={creator.isVerified} />
              <SignalRow
                label="Brand partnership experience"
                on={creator.hasBrandPartnershipExperience}
              />
              {creator.badges.length > 0 ? (
                <li className="flex flex-wrap items-center gap-1.5 pt-1">
                  {creator.badges.map(b => (
                    <Badge key={b} tone="blue">
                      {b}
                    </Badge>
                  ))}
                </li>
              ) : null}
            </ul>
            {creator.pastBrandPartnershipPartners.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-[12px] font-semibold text-ink-2">
                  Past partners
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {creator.pastBrandPartnershipPartners.map(p => (
                    <span
                      key={p}
                      className="rounded-md bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

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

function PlaceRow({place}: {place: {name: string; pct: number}}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 truncate text-[12px] text-ink-2">{place.name}</span>
      <div className="flex-1">
        <Meter pct={place.pct * 1.8} />
      </div>
      <span className="w-8 text-right text-[12px] tabular-nums text-ink-3">
        {place.pct}%
      </span>
    </div>
  );
}

function ReachTile({label, pct}: {label: string; pct: number}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
      <p className="text-lg font-bold tabular-nums text-ink">{pct}%</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={[
        'rounded-md px-3 py-1 text-[12px] font-semibold transition-colors',
        on ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
      ].join(' ')}>
      {children}
    </button>
  );
}

function MediaRow({item}: {item: MediaItem}) {
  const Icon = MEDIA_ICON[item.mediaType] ?? Film;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <Icon className="size-4 shrink-0 text-[color:var(--cat-creators)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">
          {item.caption}
        </p>
        <p className="text-[11px] text-ink-3">
          {MEDIA_TYPE_LABEL[item.mediaType]} · {formatFollowers(item.likes)}{' '}
          likes · {formatFollowers(item.comments)} comments
          {item.views != null
            ? ` · ${formatFollowers(item.views)} views`
            : ''}{' '}
          · {formatFollowers(item.shares)} shares
        </p>
      </div>
      {item.taggedBrand ? (
        <Badge tone="purple">{item.taggedBrand}</Badge>
      ) : null}
    </li>
  );
}

function SignalRow({label, on}: {label: string; on: boolean}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <span
        className="text-[12px] font-semibold"
        style={{color: on ? 'var(--green)' : 'var(--ink-3)'}}>
        {on ? 'Yes' : 'No'}
      </span>
    </li>
  );
}

// Local compact formatter (kept here so the component has no import cycle).
function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}
