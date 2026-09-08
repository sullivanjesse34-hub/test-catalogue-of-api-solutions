'use client';

import {
  ArrowUpRight,
  CircleCheck,
  Layers,
  type LucideIcon,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  activePixels,
  BUSINESS_ID,
  BUSINESS_NAME,
  CAPI_SERVER_SHARE_TARGET,
  formatCount,
  formatMoney,
  opportunityReasons,
  opportunityScore,
  opportunityTier,
  type Pixel,
  pixelEventTotal,
  PIXELS,
  portfolioSummary,
  projectedAnnualUpliftCents,
  rankedByOpportunity,
  serverShare,
  TIER_META,
  untappedEvents,
  weightedPotentialLiftPct,
} from '@/lib/demos/signals-opportunity-dashboard';

import {
  Badge,
  ConnectionBar,
  Insight,
  Kpi,
  OpportunityGauge,
  SectionHeading,
  type Tone,
  UpliftBars,
} from './ui';

const DOC_ADSPIXELS =
  'https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/';
const DOC_PIXEL_NODE =
  'https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/#fields';
const DOC_ADACCOUNT =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/';
const DOC_INSIGHTS =
  'https://developers.facebook.com/docs/marketing-api/insights/marketing-mix-modeling/';

type View = 'opportunities' | 'detail';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'opportunities', label: 'Opportunities', icon: TrendingUp},
  {id: 'detail', label: 'Pixel detail', icon: Layers},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

const TIER_TONE: Record<string, Tone> = {
  high: 'rose',
  medium: 'yellow',
  low: 'purple',
  connected: 'green',
};

// Reads that discover pixels + size the opportunity across the portfolio.
function buildPortfolioLoad(): ApiCallInput[] {
  const active = activePixels();
  return [
    {
      method: 'GET',
      endpoint: `${BUSINESS_ID}/adspixels`,
      summary: `Discover pixels in ${BUSINESS_NAME}`,
      request: {
        fields:
          'id,name,is_unavailable,data_use_setting,first_party_cookie_status,enable_automatic_matching,has_1p_pixel_event,last_fired_time,server_last_fired_time',
        summary: 'total_count',
      },
      response: {
        data: PIXELS.map(p => ({
          id: p.id,
          name: p.name,
          is_unavailable: p.isUnavailable,
          server_last_fired_time: p.serverLastFiredTime ?? null,
          has_1p_pixel_event: p.has1pPixelEvent,
        })),
        summary: {total_count: PIXELS.length},
      },
      status: 'success',
      docsUrl: DOC_ADSPIXELS,
    },
    ...active.map((p): ApiCallInput => ({
      method: 'GET',
      endpoint: `${p.id}/stats`,
      summary: `Event volume by source for ${p.name} (7-day window)`,
      request: {
        aggregation: 'event_source',
        event_source: 'WEB_ONLY,SERVER_ONLY',
      },
      response: {
        data: p.events.map(e => ({
          event_name: e.eventName,
          web_only: e.webCount,
          server_only: e.serverCount,
        })),
      },
      status: 'success',
      docsUrl: DOC_PIXEL_NODE,
    })),
    {
      method: 'GET',
      endpoint: 'act_<AD_ACCOUNT_ID>/insights',
      summary:
        'Attributed spend by ad set (attributed to pixel via promoted_object)',
      request: {
        level: 'adset',
        fields: 'spend,adset_id',
        date_preset: 'last_30d',
      },
      response: {
        data: active.map(p => ({
          pixel_id: p.id,
          spend: (p.attributedSpendCents / 100).toFixed(2),
        })),
      },
      status: 'success',
      docsUrl: DOC_INSIGHTS,
    },
  ];
}

// Reads for a single selected pixel's detail view.
function buildPixelLoad(p: Pixel): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: p.id,
      summary: `Pixel node fields for ${p.name}`,
      request: {
        fields:
          'is_unavailable,data_use_setting,first_party_cookie_status,enable_automatic_matching,has_1p_pixel_event,last_fired_time,server_last_fired_time',
      },
      response: {
        is_unavailable: p.isUnavailable,
        data_use_setting: p.dataUseSetting,
        first_party_cookie_status: p.firstPartyCookieStatus,
        enable_automatic_matching: p.enableAutomaticMatching,
        has_1p_pixel_event: p.has1pPixelEvent,
        last_fired_time: p.lastFiredTime,
        server_last_fired_time: p.serverLastFiredTime ?? null,
      },
      status: 'success',
      docsUrl: DOC_PIXEL_NODE,
    },
    {
      method: 'GET',
      endpoint: `${p.id}/adaccounts`,
      summary: `Ad accounts connected to ${p.name}`,
      request: {fields: 'id,name'},
      response: {
        data: p.connectedAccounts.map(a => ({id: `act_${a.id}`, name: a.name})),
      },
      status: 'success',
      docsUrl: DOC_ADACCOUNT,
    },
  ];
}

export function SignalsOpportunityDashboard() {
  const {record, update, setOpen} = useApiConsole();
  const [view, setView] = useState<View>('opportunities');
  const [pixels, setPixels] = useState<Pixel[]>(PIXELS);
  const [selectedId, setSelectedId] = useState<string>(
    () => rankedByOpportunity(PIXELS)[0].id,
  );

  const selected =
    pixels.find(p => p.id === selectedId) ?? activePixels(pixels)[0];

  useApiLoads('portfolio', buildPortfolioLoad);
  useApiLoads(
    `pixel:${selectedId}`,
    useCallback(() => buildPixelLoad(selected), [selected]),
  );

  // One-click CAPI adoption: subscribe the pixel's ad accounts and mark the
  // pixel connected in-session. Mutates an in-memory copy (build spec: UI-only).
  const handleAdopt = useCallback(
    (pixel: Pixel) => {
      const postId = record({
        method: 'POST',
        endpoint: `act_${pixel.connectedAccounts[0]?.id ?? '<AD_ACCOUNT_ID>'}/subscribed_apps`,
        summary: `Connect ${pixel.name} to the Conversions API`,
        request: {
          pixel_id: pixel.id,
          enable_automatic_matching: true,
          events: untappedEvents(pixel).map(e => e.eventName),
        },
        status: 'pending',
        docsUrl: DOC_ADACCOUNT,
      });
      setPixels(prev =>
        prev.map(p =>
          p.id === pixel.id
            ? {...p, adopted: true, serverLastFiredTime: '2026-07-03'}
            : p,
        ),
      );
      setOpen(true);
      window.setTimeout(() => {
        update(postId, {
          status: 'success',
          response: {success: true, server_last_fired_time: '2026-07-03'},
        });
        record({
          method: 'GET',
          endpoint: `${pixel.id}/stats`,
          summary: `Confirm server events flowing for ${pixel.name}`,
          request: {aggregation: 'event_source', event_source: 'SERVER_ONLY'},
          response: {
            data: untappedEvents(pixel).map(e => ({
              event_name: e.eventName,
              server_only: e.webCount,
            })),
          },
          status: 'success',
          docsUrl: DOC_PIXEL_NODE,
        });
      }, 500);
    },
    [record, update, setOpen],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setView('detail');
  }, []);

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

        {view === 'detail' ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Pixel</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              aria-label="Select pixel"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
              {activePixels(pixels).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'opportunities' ? (
        <OpportunitiesView
          pixels={pixels}
          onSelect={handleSelect}
          onAdopt={handleAdopt}
        />
      ) : (
        <DetailView pixel={selected} onAdopt={handleAdopt} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opportunities — portfolio ranking + projected upside
// ---------------------------------------------------------------------------

function OpportunitiesView({
  pixels,
  onSelect,
  onAdopt,
}: {
  pixels: Pixel[];
  onSelect: (id: string) => void;
  onAdopt: (pixel: Pixel) => void;
}) {
  const summary = useMemo(() => portfolioSummary(pixels), [pixels]);
  const ranked = useMemo(() => rankedByOpportunity(pixels), [pixels]);
  const open = ranked.filter(p => opportunityScore(p) > 0);
  const top = open[0];

  const barRows = open.slice(0, 5).map(p => ({
    label: p.businessName,
    value: projectedAnnualUpliftCents(p),
    colorVar: TIER_META[opportunityTier(p)].colorVar,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Open opportunities"
          value={String(summary.openOpportunities)}
          note={`of ${summary.connectablePixels} connectable pixels`}
          noteTone={summary.openOpportunities > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Projected annual AR upside"
          value={formatMoney(summary.projectedAnnualUpliftCents)}
          note="if connected to CAPI"
          noteTone="up"
          accentVar="var(--green)"
        />
        <Kpi
          label="Untapped web spend"
          value={formatMoney(summary.untappedSpendCents)}
          note="30d, not CAPI-connected"
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="CAPI coverage target"
          value={`${Math.round(CAPI_SERVER_SHARE_TARGET * 100)}%`}
          note="server share of events"
          accentVar="var(--purple)"
        />
      </div>

      {barRows.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeading
            title="Projected annual AR upside by advertiser"
            sub="Spend-weighted potential lift on attributed AR if each pixel's web events flow through CAPI."
          />
          <UpliftBars rows={barRows} format={v => formatMoney(v)} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Pixels · ranked by opportunity
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Advertiser / pixel</th>
                <th className={TH}>Opportunity</th>
                <th className={TH}>CAPI coverage</th>
                <th className={TH}>Attributed spend</th>
                <th className={TH}>Projected upside</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {ranked.map(p => {
                const tier = opportunityTier(p);
                const score = opportunityScore(p);
                const share = serverShare(p);
                const connected = tier === 'connected';
                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                    }}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {p.businessName}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {p.name} · {p.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge tone={TIER_TONE[tier]}>
                          {TIER_META[tier].label}
                        </Badge>
                        {!connected ? (
                          <span className="text-[12px] font-bold tabular-nums text-ink-2">
                            {score}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-[12px] tabular-nums text-ink-2">
                          {Math.round(share * 100)}%
                        </span>
                        <div className="w-24">
                          <ConnectionBar
                            serverCount={p.events.reduce(
                              (s, e) => s + e.serverCount,
                              0,
                            )}
                            webCount={p.events.reduce(
                              (s, e) => s + e.webCount,
                              0,
                            )}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatMoney(p.attributedSpendCents, p.currency)}
                      <span className="text-ink-3"> /30d</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {connected ? (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      ) : (
                        <span className="text-[13px] font-bold tabular-nums text-[color:var(--green)]">
                          +{formatMoney(projectedAnnualUpliftCents(p))}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {connected ? (
                        <Badge tone="green">Connected</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onAdopt(p);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition-opacity hover:opacity-90">
                          <Zap className="size-3" />
                          Connect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open.length > 0 ? (
        <Insight>
          <strong className="text-ink">Top priority:</strong> {top.businessName}{' '}
          has the largest untapped signal opportunity —{' '}
          <strong className="text-ink">
            +{formatMoney(projectedAnnualUpliftCents(top))}
          </strong>{' '}
          projected annual AR from connecting its web events to the Conversions
          API. {opportunityReasons(top)[0]}
        </Insight>
      ) : (
        <Insight>
          <CircleCheck className="mr-1 inline size-4 align-text-bottom text-[color:var(--green)]" />
          Every connectable pixel in this portfolio is now flowing events
          through the Conversions API.
        </Insight>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pixel detail — the opportunity breakdown + one-click adoption
// ---------------------------------------------------------------------------

function DetailView({
  pixel,
  onAdopt,
}: {
  pixel: Pixel;
  onAdopt: (pixel: Pixel) => void;
}) {
  const tier = opportunityTier(pixel);
  const score = opportunityScore(pixel);
  const share = serverShare(pixel);
  const untapped = untappedEvents(pixel);
  const reasons = opportunityReasons(pixel);
  const connected = tier === 'connected';
  const totalEvents = pixelEventTotal(pixel);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <OpportunityGauge
              score={connected ? 0 : score}
              colorVar={TIER_META[tier].colorVar}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
                  {pixel.businessName}
                </h3>
                <Badge tone={TIER_TONE[tier]}>
                  {TIER_META[tier].label} opportunity
                </Badge>
              </div>
              <p className="mt-0.5 text-xs tabular-nums text-ink-3">
                {pixel.name} · pixel {pixel.id}
              </p>
              {connected ? (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
                  <CircleCheck className="size-4 text-[color:var(--green)]" />
                  This pixel is connected to the Conversions API — no open
                  opportunity.
                </p>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  Connecting this pixel&apos;s web events to CAPI is projected
                  to add{' '}
                  <strong className="text-[color:var(--green)]">
                    +{formatMoney(projectedAnnualUpliftCents(pixel))}
                  </strong>{' '}
                  in annual attributed revenue (+
                  {weightedPotentialLiftPct(pixel).toFixed(1)}% on attributed
                  AR).
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <Metric
              label="CAPI coverage"
              value={`${Math.round(share * 100)}%`}
              tone={share >= CAPI_SERVER_SHARE_TARGET ? 'up' : 'down'}
            />
            <Metric
              label="Attributed spend"
              value={formatMoney(pixel.attributedSpendCents, pixel.currency)}
            />
            <Metric label="Events (7d)" value={formatCount(totalEvents)} />
          </div>

          <div className="mt-5 overflow-x-auto border-t border-border pt-4">
            <table className="w-full min-w-[460px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Event</th>
                  <th className={TH}>Source split</th>
                  <th className={TH}>Web-only</th>
                  <th className={TH}>Server</th>
                  <th className={TH}>Upside</th>
                </tr>
              </thead>
              <tbody>
                {pixel.events.map(e => {
                  const eventUntapped = untapped.some(
                    u => u.eventName === e.eventName,
                  );
                  const serverForRow = pixel.adopted
                    ? e.webCount + e.serverCount
                    : e.serverCount;
                  const webForRow = pixel.adopted ? 0 : e.webCount;
                  return (
                    <tr key={e.eventName} className="border-t border-border">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                        {e.eventName}
                        {eventUntapped && !pixel.adopted ? (
                          <span className="ml-1.5 align-middle">
                            <Badge tone="rose">web only</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-28">
                          <ConnectionBar
                            serverCount={serverForRow}
                            webCount={webForRow}
                          />
                        </div>
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {formatCount(webForRow)}
                      </td>
                      <td className={`${TD} tabular-nums`}>
                        {formatCount(serverForRow)}
                      </td>
                      <td className="px-3 py-2.5">
                        {eventUntapped && !pixel.adopted ? (
                          <span className="text-[12px] font-bold tabular-nums text-[color:var(--green)]">
                            +{e.potentialAcrIncreasePct}%
                          </span>
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

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="size-4 text-[color:var(--cat-signals)]" />
              <span className="text-sm font-bold text-ink">
                Why it&apos;s an opportunity
              </span>
            </div>
            {reasons.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {reasons.map(r => (
                  <li key={r} className="flex gap-2 text-[12px] text-ink-2">
                    <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-[color:var(--cat-signals)]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <CircleCheck className="size-4 text-[color:var(--green)]" />
                Fully connected — nothing to action.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-sm font-bold text-ink">
              Pixel node signals
            </span>
            <dl className="mt-2 flex flex-col gap-1.5 text-[12px]">
              <Field
                label="server_last_fired_time"
                value={pixel.serverLastFiredTime ?? 'never'}
                bad={pixel.serverLastFiredTime == null}
              />
              <Field
                label="enable_automatic_matching"
                value={pixel.enableAutomaticMatching ? 'true' : 'false'}
                bad={!pixel.enableAutomaticMatching}
              />
              <Field
                label="first_party_cookie_status"
                value={pixel.firstPartyCookieStatus
                  .replace('FIRST_PARTY_COOKIE_', '')
                  .toLowerCase()}
                bad={
                  pixel.firstPartyCookieStatus === 'FIRST_PARTY_COOKIE_DISABLED'
                }
              />
              <Field
                label="has_1p_pixel_event"
                value={pixel.has1pPixelEvent ? 'true' : 'false'}
                bad={!pixel.has1pPixelEvent}
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-sm font-bold text-ink">
              Connected ad accounts
            </span>
            <ul className="mt-2 flex flex-col gap-1.5">
              {pixel.connectedAccounts.map(a => (
                <li
                  key={a.id}
                  className="flex items-center justify-between text-[12px] text-ink-2">
                  <span>{a.name}</span>
                  <span className="tabular-nums text-ink-3">act_{a.id}</span>
                </li>
              ))}
            </ul>
            {connected ? (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-semibold text-[color:var(--green)]">
                <CircleCheck className="size-4" />
                Connected to the Conversions API
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onAdopt(pixel);
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90">
                <Zap className="size-4" />
                Connect to Conversions API
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'muted';
}) {
  const color =
    tone === 'up'
      ? 'text-[color:var(--green)]'
      : tone === 'down'
        ? 'text-[color:var(--rose)]'
        : 'text-ink';
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="font-mono text-[11px] text-ink-3">{label}</dt>
      <dd
        className="font-semibold tabular-nums"
        style={{color: bad ? 'var(--rose)' : 'var(--green)'}}>
        {value}
      </dd>
    </div>
  );
}
