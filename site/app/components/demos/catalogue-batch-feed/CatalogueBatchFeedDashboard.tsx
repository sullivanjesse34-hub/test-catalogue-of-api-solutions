'use client';

import {
  CircleCheck,
  type LucideIcon,
  Package,
  Plus,
  Rss,
  TriangleAlert,
  Upload,
  Video,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';
import type {
  BatchComposerInput,
  BatchJob,
  BatchMethod,
  BatchStatus,
  BatchUpdateField,
  Catalogue,
  OverallHealth,
  ProductFeed,
  ScheduleType,
  UploadStatus,
  VideoFetchStatus,
} from '@/lib/demos/catalogue-batch-feed';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  BATCH_MAX_RECORDS,
  batchSuccessRate,
  buildItemsBatchRequest,
  catalogueHealth,
  cloneCatalogues,
  feedErrorRate,
  formatCount,
  HEALTH_COLOR,
  makeBatchJob,
  makeFeedUpload,
  mockBatchValidation,
  resolveFeedUpload,
  VIDEO_FETCH_COLOR,
  VIDEO_FETCH_LABELS,
  videoCoveragePct,
} from '@/lib/demos/catalogue-batch-feed';

import {
  Badge,
  GhostButton,
  Insight,
  Kpi,
  type PillStatus,
  PrimaryButton,
  ProgressBar,
  SectionHeading,
  StatusPill,
  type Tone,
  VideoFetchBar,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_PRODUCTS =
  'https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products/';
const DOC_BATCH =
  'https://developers.facebook.com/docs/marketing-api/catalog-batch/';
const DOC_FEED =
  'https://developers.facebook.com/docs/marketing-api/catalog/guides/feed-api/';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type View = 'feeds' | 'batch' | 'video';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'feeds', label: 'Feeds', icon: Rss},
  {id: 'batch', label: 'Batch Jobs', icon: Package},
  {id: 'video', label: 'Video Coverage', icon: Video},
];

// ---------------------------------------------------------------------------
// Shared table class constants
// ---------------------------------------------------------------------------

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function uploadStatusToPill(s: UploadStatus): PillStatus {
  if (s === 'completed') return 'complete';
  if (s === 'in_progress') return 'processing';
  return 'error';
}

function batchStatusToPill(s: BatchStatus): PillStatus {
  if (s === 'finished') return 'complete';
  if (s === 'in_progress' || s === 'not_started') return 'processing';
  return 'error';
}

const METHOD_TONE: Record<BatchMethod, Tone> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'rose',
};

const _HEALTH_TONE: Record<OverallHealth, Tone> = {
  healthy: 'green',
  warning: 'yellow',
  critical: 'rose',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function buildLoadCalls(catalogue: Catalogue): ApiCallInput[] {
  const stats = catalogue.videoCoverage;
  return [
    {
      method: 'GET',
      endpoint: `${catalogue.id}/product_feeds`,
      summary: `List product feeds for ${catalogue.name}`,
      request: {fields: 'id,name,schedule,ingestion_source_type'},
      response: {
        data: catalogue.feeds.map(f => ({
          id: f.id,
          name: f.name,
          feed_type: f.feedType,
        })),
      },
      status: 'success',
      docsUrl: DOC_FEED,
    },
    {
      method: 'GET',
      endpoint: `${catalogue.feeds[0]?.id ?? 'FEED_ID'}/uploads`,
      summary: 'Fetch recent upload sessions',
      request: {
        fields:
          'id,start_time,end_time,status,num_detected_items,num_persisted_items,num_errors,num_warnings',
      },
      response: {data: catalogue.feeds[0]?.uploads.slice(0, 2) ?? []},
      status: 'success',
      docsUrl: DOC_FEED,
    },
    {
      method: 'GET',
      endpoint: `${catalogue.id}/products`,
      summary: 'Read video coverage across products',
      request: {fields: 'retailer_id,video_fetch_status,videos', limit: 100},
      response: {
        summary: {
          total_items: stats.totalItems,
          items_with_video: stats.itemsWithVideo,
        },
      },
      status: 'success',
      docsUrl: DOC_PRODUCTS,
    },
  ];
}

export function CatalogueBatchFeedDashboard() {
  const {record, update} = useApiConsole();
  const [view, setView] = useState<View>('feeds');
  const [catalogues, setCatalogues] = useState<Catalogue[]>(() =>
    cloneCatalogues(),
  );
  const [catalogueId, setCatalogueId] = useState(catalogues[0].id);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const catalogue = catalogues.find(c => c.id === catalogueId) ?? catalogues[0];

  const nonceRef = useRef(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Log the initial reads that populate the dashboard, re-firing per catalogue.
  useApiLoads(catalogueId, () => buildLoadCalls(catalogue));

  const patchCatalogue = useCallback(
    (catId: string, fn: (c: Catalogue) => Catalogue) => {
      setCatalogues(prev => prev.map(c => (c.id === catId ? fn(c) : c)));
    },
    [],
  );

  const handleSubmitBatch = useCallback(
    (input: BatchComposerInput) => {
      const nonce = ++nonceRef.current;
      const payload = buildItemsBatchRequest(input);
      const job = makeBatchJob(input.method, input.itemCount, nonce);

      record({
        method: 'POST',
        endpoint: `${catalogue.id}/items_batch`,
        summary: `Submit ${input.method} batch — ${input.itemCount.toLocaleString()} items`,
        request: payload,
        response: {handles: [job.handle]},
        status: 'success',
        docsUrl: DOC_BATCH,
      });
      patchCatalogue(catalogue.id, c => ({
        ...c,
        batchJobs: [job, ...c.batchJobs],
      }));

      const pollId = record({
        method: 'GET',
        endpoint: `${catalogue.id}/check_batch_request_status`,
        summary: `Poll validation for handle ${job.handle}`,
        request: {handle: job.handle},
        status: 'pending',
        docsUrl: DOC_BATCH,
      });

      const t = setTimeout(() => {
        const validation = mockBatchValidation(input.itemCount);
        patchCatalogue(catalogue.id, c => ({
          ...c,
          batchJobs: c.batchJobs.map(j =>
            j.id === job.id
              ? {...j, status: 'finished' as const, validation}
              : j,
          ),
        }));
        update(pollId, {
          status: 'success',
          response: {
            handle: job.handle,
            status: 'finished',
            validation_status: {
              success: validation.successCount,
              warnings: validation.warningCount,
              errors: validation.errorCount,
            },
          },
        });
      }, 1600);
      timersRef.current.push(t);

      setView('batch');
    },
    [catalogue.id, record, update, patchCatalogue],
  );

  const handleTriggerUpload = useCallback(
    (feed: ProductFeed) => {
      const nonce = ++nonceRef.current;
      const numItems = feed.uploads[0]?.numDetectedItems ?? 1000;
      const upload = makeFeedUpload(numItems, nonce);
      const url = `https://feeds.example.com/${feed.id}.csv`;

      record({
        method: 'POST',
        endpoint: `${feed.id}/uploads`,
        summary: `Trigger manual upload — ${feed.name}`,
        request: {url},
        response: {id: upload.id},
        status: 'success',
        docsUrl: DOC_FEED,
      });
      patchCatalogue(catalogue.id, c => ({
        ...c,
        feeds: c.feeds.map(f =>
          f.id === feed.id ? {...f, uploads: [upload, ...f.uploads]} : f,
        ),
      }));

      const pollId = record({
        method: 'GET',
        endpoint: `${feed.id}/uploads`,
        summary: `Poll upload status — ${upload.id}`,
        request: {
          fields:
            'id,status,num_detected_items,num_persisted_items,num_errors,num_warnings',
        },
        status: 'pending',
        docsUrl: DOC_FEED,
      });

      const t = setTimeout(() => {
        const resolved = resolveFeedUpload(upload);
        patchCatalogue(catalogue.id, c => ({
          ...c,
          feeds: c.feeds.map(f =>
            f.id === feed.id
              ? {
                  ...f,
                  uploads: f.uploads.map(u =>
                    u.id === upload.id ? resolved : u,
                  ),
                }
              : f,
          ),
        }));
        update(pollId, {
          status: 'success',
          response: {
            id: resolved.id,
            status: resolved.status,
            num_detected_items: resolved.numDetectedItems,
            num_persisted_items: resolved.numPersistedItems,
            num_errors: resolved.errorCount,
            num_warnings: resolved.warningCount,
          },
        });
      }, 1600);
      timersRef.current.push(t);
    },
    [catalogue.id, record, update, patchCatalogue],
  );

  const handleEditSchedule = useCallback(
    (feed: ProductFeed, scheduleType: ScheduleType, interval: string) => {
      const key = scheduleType === 'REPLACE' ? 'schedule' : 'update_schedule';
      record({
        method: 'POST',
        endpoint: `${catalogue.id}/product_feeds`,
        summary: `Update ${feed.name} schedule — ${scheduleType} · ${interval}`,
        request: {
          id: feed.id,
          [key]: {interval, url: `https://feeds.example.com/${feed.id}.csv`},
        },
        response: {success: true},
        status: 'success',
        docsUrl: DOC_FEED,
      });
      patchCatalogue(catalogue.id, c => ({
        ...c,
        feeds: c.feeds.map(f => (f.id === feed.id ? {...f, scheduleType} : f)),
      }));
    },
    [catalogue.id, record, patchCatalogue],
  );

  const handleSelectFeed = useCallback(
    (id: string | null) => {
      setSelectedFeedId(id);
      if (!id) return;
      const feed = catalogue.feeds.find(f => f.id === id);
      const latest = feed?.uploads[0];
      if (feed && latest && latest.errorCount > 0) {
        record({
          method: 'GET',
          endpoint: `${latest.id}/error_report`,
          summary: `Fetch error report — ${feed.name}`,
          request: {},
          response: {
            errors: [
              {
                summary: 'Image URL unreachable (HTTP 404)',
                severity: 'fatal',
                num_occurrences: latest.errorCount,
              },
            ],
          },
          status: 'success',
          docsUrl: DOC_FEED,
        });
      }
    },
    [catalogue, record],
  );

  const handleSelectJob = useCallback(
    (id: string | null) => {
      setSelectedJobId(id);
      if (!id) return;
      const job = catalogue.batchJobs.find(j => j.id === id);
      if (!job) return;
      record({
        method: 'GET',
        endpoint: `${catalogue.id}/check_batch_request_status`,
        summary: `Check batch status — ${job.id}`,
        request: {handle: job.handle},
        response: {
          handle: job.handle,
          status: job.status,
          validation_status: {
            success: job.validation.successCount,
            warnings: job.validation.warningCount,
            errors: job.validation.errorCount,
          },
        },
        status: 'success',
        docsUrl: DOC_BATCH,
      });
    },
    [catalogue, record],
  );

  const switchTab = (id: View) => {
    setView(id);
    setSelectedFeedId(null);
    setSelectedJobId(null);
  };

  return (
    <div>
      {/* Tabs + catalogue selector */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {TABS.map(({id, label, icon: Icon}) => {
            const on = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  switchTab(id);
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
          <span className="hidden sm:inline">Catalogue</span>
          <select
            value={catalogueId}
            onChange={e => {
              setCatalogueId(e.target.value);
              setSelectedFeedId(null);
              setSelectedJobId(null);
            }}
            aria-label="Select catalogue"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
            {catalogues.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'feeds' ? (
        <FeedsView
          catalogue={catalogue}
          selectedFeedId={selectedFeedId}
          onSelectFeed={handleSelectFeed}
          onTriggerUpload={handleTriggerUpload}
          onEditSchedule={handleEditSchedule}
        />
      ) : null}
      {view === 'batch' ? (
        <BatchView
          catalogue={catalogue}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onSubmitBatch={handleSubmitBatch}
        />
      ) : null}
      {view === 'video' ? <VideoView catalogue={catalogue} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feeds tab
// ---------------------------------------------------------------------------

function FeedsView({
  catalogue,
  selectedFeedId,
  onSelectFeed,
  onTriggerUpload,
  onEditSchedule,
}: {
  catalogue: Catalogue;
  selectedFeedId: string | null;
  onSelectFeed: (id: string | null) => void;
  onTriggerUpload: (feed: ProductFeed) => void;
  onEditSchedule: (
    feed: ProductFeed,
    scheduleType: ScheduleType,
    interval: string,
  ) => void;
}) {
  const totalFeeds = catalogue.feeds.length;
  const feedsWithErrors = catalogue.feeds.filter(
    f => feedErrorRate(f) > 0,
  ).length;
  const latestUploads = catalogue.feeds.map(f => f.uploads[0]).filter(Boolean);
  const totalItems = latestUploads.reduce((s, u) => s + u.numDetectedItems, 0);
  const totalErrors = latestUploads.reduce((s, u) => s + u.errorCount, 0);

  const selectedFeed = selectedFeedId
    ? catalogue.feeds.find(f => f.id === selectedFeedId)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Active feeds"
          value={String(totalFeeds)}
          note={catalogue.businessName}
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Feeds with errors"
          value={String(feedsWithErrors)}
          note="latest upload"
          noteTone={feedsWithErrors > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Total items"
          value={formatCount(totalItems)}
          note="across all feeds"
          accentVar="var(--brand)"
        />
        <Kpi
          label="Total errors"
          value={formatCount(totalErrors)}
          note="latest uploads"
          noteTone={totalErrors > 0 ? 'down' : 'up'}
          accentVar="var(--cat-measurement)"
        />
      </div>

      <SectionHeading
        title="Product feeds"
        sub="Feeds registered on this catalogue. Click a feed to see its upload history."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Feed</th>
                <th className={TH}>Type</th>
                <th className={TH}>Schedule</th>
                <th className={TH}>Latest status</th>
                <th className={TH}>Items</th>
                <th className={TH}>Errors</th>
                <th className={TH}>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.feeds.map(feed => {
                const latest =
                  feed.uploads.length > 0 ? feed.uploads[0] : undefined;
                const active = feed.id === selectedFeedId;
                return (
                  <tr
                    key={feed.id}
                    onClick={() => {
                      onSelectFeed(active ? null : feed.id);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {feed.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {feed.id} · delimiter:{' '}
                        {feed.delimiter === '\t' ? 'TAB' : feed.delimiter}
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge
                        tone={
                          feed.feedType === 'PRIMARY_FEED' ? 'blue' : 'muted'
                        }>
                        {feed.feedType === 'PRIMARY_FEED'
                          ? 'Primary'
                          : 'Supplementary'}
                      </Badge>
                    </td>
                    <td className={`${TD} capitalize`}>
                      {feed.scheduleType.toLowerCase()}
                    </td>
                    <td className="px-3 py-2.5">
                      {latest ? (
                        <StatusPill
                          status={uploadStatusToPill(latest.status)}
                        />
                      ) : (
                        <span className="text-[11px] text-ink-3">
                          No uploads
                        </span>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {latest ? formatCount(latest.numDetectedItems) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {latest && latest.errorCount > 0 ? (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--rose)]">
                          {formatCount(latest.errorCount)}
                        </span>
                      ) : (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {latest && latest.warningCount > 0 ? (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--cat-measurement)]">
                          {formatCount(latest.warningCount)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFeed ? (
        <FeedDetail
          feed={selectedFeed}
          onTriggerUpload={onTriggerUpload}
          onEditSchedule={onEditSchedule}
        />
      ) : null}
    </div>
  );
}

const SCHEDULE_INTERVALS = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;

function FeedDetail({
  feed,
  onTriggerUpload,
  onEditSchedule,
}: {
  feed: ProductFeed;
  onTriggerUpload: (feed: ProductFeed) => void;
  onEditSchedule: (
    feed: ProductFeed,
    scheduleType: ScheduleType,
    interval: string,
  ) => void;
}) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    feed.scheduleType,
  );
  const [scheduleInterval, setScheduleInterval] = useState<string>('DAILY');
  const latestInProgress = feed.uploads[0]?.status === 'in_progress';

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
          {feed.name}
        </h3>
        <Badge tone={feed.feedType === 'PRIMARY_FEED' ? 'blue' : 'muted'}>
          {feed.feedType === 'PRIMARY_FEED' ? 'Primary' : 'Supplementary'}
        </Badge>
        <Badge tone="muted">{feed.scheduleType}</Badge>
      </div>

      {/* Write actions: trigger an upload or update the schedule */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Manual upload
          </p>
          <PrimaryButton
            onClick={() => {
              onTriggerUpload(feed);
            }}
            disabled={latestInProgress}>
            <Upload className="size-4" />
            {latestInProgress ? 'Upload running…' : 'Trigger upload'}
          </PrimaryButton>
        </div>
        <div className="h-9 w-px bg-border" aria-hidden />
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Schedule mode
          </span>
          <select
            value={scheduleType}
            onChange={e => {
              setScheduleType(e.target.value as ScheduleType);
            }}
            aria-label="Schedule mode"
            className="rounded-lg border-2 border-border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
            <option value="REPLACE">Replace (schedule)</option>
            <option value="UPDATE">Update (update_schedule)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Interval
          </span>
          <select
            value={scheduleInterval}
            onChange={e => {
              setScheduleInterval(e.target.value);
            }}
            aria-label="Schedule interval"
            className="rounded-lg border-2 border-border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
            {SCHEDULE_INTERVALS.map(iv => (
              <option key={iv} value={iv}>
                {iv.charAt(0) + iv.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <GhostButton
          onClick={() => {
            onEditSchedule(feed, scheduleType, scheduleInterval);
          }}>
          Update schedule
        </GhostButton>
      </div>

      <SectionHeading
        title="Recent uploads"
        sub="Upload timeline from GET <FEED_ID>/uploads. Use <UPLOAD_SESSION_ID>/error_report for details."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead className="bg-surface-2">
            <tr>
              <th className={TH}>Upload ID</th>
              <th className={TH}>Started</th>
              <th className={TH}>Ended</th>
              <th className={TH}>Status</th>
              <th className={TH}>Items</th>
              <th className={TH}>Errors</th>
              <th className={TH}>Warnings</th>
              <th className={TH}>Error rate</th>
            </tr>
          </thead>
          <tbody>
            {feed.uploads.map(u => {
              const errRate =
                u.numDetectedItems > 0
                  ? Math.round((u.errorCount / u.numDetectedItems) * 100)
                  : 0;
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-[12px] font-medium tabular-nums text-ink">
                    {u.id}
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {formatDate(u.startTime)}
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {u.endTime ? formatDate(u.endTime) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={uploadStatusToPill(u.status)} />
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {formatCount(u.numDetectedItems)}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.errorCount > 0 ? (
                      <span className="text-[12px] font-semibold tabular-nums text-[color:var(--rose)]">
                        {formatCount(u.errorCount)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-3">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.warningCount > 0 ? (
                      <span className="text-[12px] font-semibold tabular-nums text-[color:var(--cat-measurement)]">
                        {formatCount(u.warningCount)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-3">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-[12px] tabular-nums text-ink-2">
                        {errRate}%
                      </span>
                      <div className="w-16">
                        <ProgressBar
                          pct={100 - errRate}
                          colorVar={
                            errRate > 10
                              ? 'var(--rose)'
                              : errRate > 2
                                ? 'var(--cat-measurement)'
                                : 'var(--green)'
                          }
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {feed.uploads.some(u => u.errorCount > 0) ? (
        <div className="mt-4">
          <Insight>
            <strong className="text-ink">Tip:</strong> Use{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono">
              GET {'<UPLOAD_SESSION_ID>'}/error_report
            </code>{' '}
            to download the full error report for any upload with warnings or
            fatal errors.
          </Insight>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch Jobs tab
// ---------------------------------------------------------------------------

function BatchView({
  catalogue,
  selectedJobId,
  onSelectJob,
  onSubmitBatch,
}: {
  catalogue: Catalogue;
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
  onSubmitBatch: (input: BatchComposerInput) => void;
}) {
  const totalJobs = catalogue.batchJobs.length;
  const totalItems = catalogue.batchJobs.reduce((s, j) => s + j.itemCount, 0);
  const errorJobs = catalogue.batchJobs.filter(
    j => j.status === 'error',
  ).length;
  const totalValidationErrors = catalogue.batchJobs.reduce(
    (s, j) => s + j.validation.errorCount,
    0,
  );

  const selectedJob = selectedJobId
    ? catalogue.batchJobs.find(j => j.id === selectedJobId)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Batch jobs"
          value={String(totalJobs)}
          note="recent operations"
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Total items"
          value={formatCount(totalItems)}
          note="across all jobs"
          accentVar="var(--brand)"
        />
        <Kpi
          label="Failed jobs"
          value={String(errorJobs)}
          note="need attention"
          noteTone={errorJobs > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Validation errors"
          value={formatCount(totalValidationErrors)}
          note="total across jobs"
          noteTone={totalValidationErrors > 0 ? 'down' : 'up'}
          accentVar="var(--cat-measurement)"
        />
      </div>

      <BatchComposer onSubmit={onSubmitBatch} />

      <SectionHeading
        title="Recent batch operations"
        sub="Items uploaded via the Catalogue Batch API (items_batch). Click a job to see validation details."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Job</th>
                <th className={TH}>Method</th>
                <th className={TH}>Handle</th>
                <th className={TH}>Items</th>
                <th className={TH}>Status</th>
                <th className={TH}>Success rate</th>
                <th className={TH}>Errors</th>
                <th className={TH}>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.batchJobs.map(job => {
                const active = job.id === selectedJobId;
                const rate = batchSuccessRate(job);
                return (
                  <tr
                    key={job.id}
                    onClick={() => {
                      onSelectJob(active ? null : job.id);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {job.id}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {formatDate(job.createdAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={METHOD_TONE[job.method]}>{job.method}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono text-ink-2">
                        {job.handle}
                      </code>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(job.itemCount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={batchStatusToPill(job.status)} />
                    </td>
                    <td className="px-3 py-2.5">
                      {job.status === 'in_progress' ||
                      job.status === 'not_started' ? (
                        <span className="text-[11px] text-ink-3">Pending</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-[12px] tabular-nums text-ink-2">
                            {rate}%
                          </span>
                          <div className="w-16">
                            <ProgressBar
                              pct={rate}
                              colorVar={
                                rate >= 95
                                  ? 'var(--green)'
                                  : rate >= 80
                                    ? 'var(--cat-measurement)'
                                    : 'var(--rose)'
                              }
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {job.validation.errorCount > 0 ? (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--rose)]">
                          {job.validation.errorCount}
                        </span>
                      ) : (
                        <CircleCheck className="size-4 text-[color:var(--green)]" />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {job.validation.warningCount > 0 ? (
                        <span className="text-[12px] font-semibold tabular-nums text-[color:var(--cat-measurement)]">
                          {job.validation.warningCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedJob ? <BatchJobDetail job={selectedJob} /> : null}

      {catalogue.batchJobs.some(j => j.itemCount > 5000) ? (
        <Insight>
          <strong className="text-ink">Limit reminder:</strong> The Catalogue
          Batch API supports up to 5,000 records per request (recommended
          &lt;3,000) with a maximum payload of 28 MB. Split large batches to
          avoid error 80014.
        </Insight>
      ) : null}
    </div>
  );
}

const UPDATE_FIELD_LABELS: Record<BatchUpdateField, string> = {
  availability: 'Availability',
  price: 'Price',
  quantity_to_sell_on_facebook: 'Inventory (quantity_to_sell_on_facebook)',
};

const UPDATE_FIELD_PLACEHOLDER: Record<BatchUpdateField, string> = {
  availability: 'in stock',
  price: '39.99 USD',
  quantity_to_sell_on_facebook: '120',
};

function BatchComposer({
  onSubmit,
}: {
  onSubmit: (input: BatchComposerInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<BatchMethod>('UPDATE');
  const [updateField, setUpdateField] =
    useState<BatchUpdateField>('availability');
  const [updateValue, setUpdateValue] = useState('in stock');
  const [itemCount, setItemCount] = useState(500);
  const [attachVideo, setAttachVideo] = useState(false);

  if (!open) {
    return (
      <div>
        <PrimaryButton
          onClick={() => {
            setOpen(true);
          }}>
          <Plus className="size-4" />
          New batch operation
        </PrimaryButton>
      </div>
    );
  }

  const clampedCount = Math.max(1, Math.min(BATCH_MAX_RECORDS, itemCount || 1));
  const overLimit = itemCount > BATCH_MAX_RECORDS;
  const input: BatchComposerInput = {
    method,
    updateField,
    updateValue,
    itemCount: clampedCount,
    attachVideo,
  };
  const preview = buildItemsBatchRequest(input);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-base font-bold tracking-[-0.01em] text-ink">
          New batch operation
        </h3>
        <Badge tone="blue">items_batch</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Form */}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              Method
            </span>
            <select
              value={method}
              onChange={e => {
                setMethod(e.target.value as BatchMethod);
              }}
              aria-label="Batch method"
              className="rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
              <option value="CREATE">CREATE — add new items</option>
              <option value="UPDATE">UPDATE — change fields</option>
              <option value="DELETE">DELETE — remove items</option>
            </select>
          </label>

          {method === 'UPDATE' ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Field
                </span>
                <select
                  value={updateField}
                  onChange={e => {
                    const f = e.target.value as BatchUpdateField;
                    setUpdateField(f);
                    setUpdateValue(UPDATE_FIELD_PLACEHOLDER[f]);
                  }}
                  aria-label="Field to update"
                  className="rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]">
                  {(Object.keys(UPDATE_FIELD_LABELS) as BatchUpdateField[]).map(
                    f => (
                      <option key={f} value={f}>
                        {UPDATE_FIELD_LABELS[f]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                  Value
                </span>
                <input
                  type="text"
                  value={updateValue}
                  onChange={e => {
                    setUpdateValue(e.target.value);
                  }}
                  placeholder={UPDATE_FIELD_PLACEHOLDER[updateField]}
                  aria-label="Field value"
                  className="rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]"
                />
              </label>
            </div>
          ) : null}

          {method === 'CREATE' ? (
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={attachVideo}
                onChange={e => {
                  setAttachVideo(e.target.checked);
                }}
              />
              Attach product video (video[].url) — enables Catalog Product Video
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              Item count
            </span>
            <input
              type="number"
              min={1}
              max={BATCH_MAX_RECORDS}
              value={itemCount}
              onChange={e => {
                setItemCount(Number(e.target.value));
              }}
              aria-label="Item count"
              className="w-40 rounded-lg border-2 border-border bg-surface-2 px-2.5 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-catalogue)]"
            />
            <span
              className={[
                'text-[11px]',
                overLimit ? 'text-[color:var(--rose)]' : 'text-ink-3',
              ].join(' ')}>
              {overLimit
                ? `Max ${BATCH_MAX_RECORDS.toLocaleString()} records per request — will be clamped.`
                : `≤ ${BATCH_MAX_RECORDS.toLocaleString()} records per request (recommended <3,000).`}
            </span>
          </label>
        </div>

        {/* Live request preview */}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Request preview — POST {'{catalog_id}'}/items_batch
          </span>
          <pre className="min-h-[160px] flex-1 overflow-auto rounded-lg border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-2">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <PrimaryButton
          onClick={() => {
            onSubmit(input);
            setOpen(false);
          }}>
          Submit batch
        </PrimaryButton>
        <GhostButton
          onClick={() => {
            setOpen(false);
          }}>
          Cancel
        </GhostButton>
      </div>
    </div>
  );
}

function BatchJobDetail({job}: {job: BatchJob}) {
  const total =
    job.validation.successCount +
    job.validation.warningCount +
    job.validation.errorCount;
  const sections: Array<{
    label: string;
    count: number;
    color: string;
  }> = [
    {
      label: 'Success',
      count: job.validation.successCount,
      color: 'var(--green)',
    },
    {
      label: 'Warnings',
      count: job.validation.warningCount,
      color: 'var(--cat-measurement)',
    },
    {label: 'Errors', count: job.validation.errorCount, color: 'var(--rose)'},
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">
          Batch {job.id}
        </h3>
        <Badge tone={METHOD_TONE[job.method]}>{job.method}</Badge>
        <StatusPill status={batchStatusToPill(job.status)} />
      </div>

      <div className="mb-4 flex items-center gap-3 text-[12px] text-ink-2">
        <span>
          Handle:{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">
            {job.handle}
          </code>
        </span>
        <span>Items: {formatCount(job.itemCount)}</span>
        <span>Created: {formatDate(job.createdAt)}</span>
      </div>

      {/* Validation breakdown bar */}
      {total > 0 ? (
        <div className="mb-5">
          <SectionHeading
            title="Validation breakdown"
            sub="Per-item validation_status from check_batch_request_status."
          />
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {sections.map(sec => {
              if (sec.count === 0) return null;
              return (
                <div
                  key={sec.label}
                  style={{
                    width: `${(sec.count / total) * 100}%`,
                    background: sec.color,
                  }}
                  title={`${sec.label}: ${sec.count}`}
                  aria-hidden
                />
              );
            })}
          </div>
          <div className="mt-2 flex gap-4">
            {sections.map(sec => (
              <span
                key={sec.label}
                className="flex items-center gap-1.5 text-[11px] text-ink-2">
                <span
                  className="size-2 rounded-full"
                  style={{background: sec.color}}
                  aria-hidden
                />
                {sec.label}: {sec.count.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Errors list */}
      {job.validation.errors.length > 0 ? (
        <div className="mb-4">
          <span className="mb-2 block text-sm font-bold text-ink">Errors</span>
          <ul className="flex flex-col gap-1.5">
            {job.validation.errors.map((err, i) => (
              <li
                key={`${err.retailerId}-${i}`}
                className="flex gap-2 text-[12px] text-ink-2">
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-[color:var(--rose)]"
                  aria-hidden
                />
                <span>
                  <code className="font-mono font-semibold text-ink">
                    {err.retailerId}
                  </code>
                  : {err.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Warnings list */}
      {job.validation.warnings.length > 0 ? (
        <div>
          <span className="mb-2 block text-sm font-bold text-ink">
            Warnings
          </span>
          <ul className="flex flex-col gap-1.5">
            {job.validation.warnings.map((warn, i) => (
              <li
                key={`${warn.retailerId}-${i}`}
                className="flex gap-2 text-[12px] text-ink-2">
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-[color:var(--cat-measurement)]"
                  aria-hidden
                />
                <span>
                  <code className="font-mono font-semibold text-ink">
                    {warn.retailerId}
                  </code>
                  : {warn.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {job.validation.errors.length === 0 &&
      job.validation.warnings.length === 0 &&
      total > 0 ? (
        <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
          <CircleCheck className="size-4 text-[color:var(--green)]" />
          All items passed validation successfully.
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video Coverage tab
// ---------------------------------------------------------------------------

function VideoView({catalogue}: {catalogue: Catalogue}) {
  const stats = catalogue.videoCoverage;
  const coveragePct = videoCoveragePct(stats);
  const fetchedPct =
    stats.itemsWithVideo === 0
      ? 0
      : Math.round(
          (stats.fetchStatusBreakdown.FETCHED / stats.itemsWithVideo) * 100,
        );
  const failedCount =
    stats.fetchStatusBreakdown.FETCH_FAILED +
    stats.fetchStatusBreakdown.OUTDATED;
  const health = catalogueHealth(catalogue);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Video coverage"
          value={`${coveragePct}%`}
          note={`${formatCount(stats.itemsWithVideo)} of ${formatCount(stats.totalItems)} items`}
          noteTone={coveragePct >= 60 ? 'up' : 'down'}
          accentVar="var(--cat-catalogue)"
        />
        <Kpi
          label="Fully fetched"
          value={`${fetchedPct}%`}
          note="of items with video"
          noteTone={fetchedPct >= 80 ? 'up' : 'muted'}
          accentVar="var(--green)"
        />
        <Kpi
          label="Failed / outdated"
          value={formatCount(failedCount)}
          note="need re-fetch or fix"
          noteTone={failedCount > 0 ? 'down' : 'up'}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Catalogue health"
          value={health.charAt(0).toUpperCase() + health.slice(1)}
          note={catalogue.businessName}
          accentVar={HEALTH_COLOR[health]}
        />
      </div>

      <SectionHeading
        title="Video fetch status distribution"
        sub="Breakdown of video_fetch_status across all products in the catalogue."
      />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <VideoFetchBar breakdown={stats.fetchStatusBreakdown} />

        <div className="mt-5 overflow-x-auto border-t border-border pt-4">
          <table className="w-full min-w-[460px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>Status</th>
                <th className={TH}>Count</th>
                <th className={TH}>Share</th>
                <th className={TH}>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {(
                Object.entries(stats.fetchStatusBreakdown) as Array<
                  [VideoFetchStatus, number]
                >
              ).map(([status, count]) => {
                const share =
                  stats.totalItems === 0
                    ? 0
                    : Math.round((count / stats.totalItems) * 100);
                return (
                  <tr key={status} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        <span
                          className="size-2 rounded-full"
                          style={{background: VIDEO_FETCH_COLOR[status]}}
                          aria-hidden
                        />
                        {VIDEO_FETCH_LABELS[status]}
                      </span>
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {count.toLocaleString()}
                    </td>
                    <td className={`${TD} tabular-nums`}>{share}%</td>
                    <td className="px-3 py-2.5">
                      <div className="w-24">
                        <ProgressBar
                          pct={share}
                          colorVar={VIDEO_FETCH_COLOR[status]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SectionHeading
        title="Sample products"
        sub="Representative products showing video field and fetch status."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Retailer ID</th>
                <th className={TH}>Title</th>
                <th className={TH}>Has video</th>
                <th className={TH}>Fetch status</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.products.map(p => (
                <tr key={p.retailerId} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <code className="text-[12px] font-mono font-medium text-ink">
                      {p.retailerId}
                    </code>
                  </td>
                  <td className={`${TD} text-ink`}>{p.title}</td>
                  <td className="px-3 py-2.5">
                    {p.hasVideo ? (
                      <Badge tone="green">Yes</Badge>
                    ) : (
                      <Badge tone="muted">No</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: VIDEO_FETCH_COLOR[p.videoFetchStatus],
                        background: `color-mix(in srgb, ${VIDEO_FETCH_COLOR[p.videoFetchStatus]} 14%, transparent)`,
                      }}>
                      {VIDEO_FETCH_LABELS[p.videoFetchStatus]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Insight>
        <strong className="text-ink">Note:</strong> The{' '}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono">
          video_fetch_status
        </code>{' '}
        field reflects whether Meta successfully downloaded the video, not
        whether a video URL was supplied. Items with{' '}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono">
          FETCH_FAILED
        </code>{' '}
        may have valid URLs that returned errors at fetch time.
      </Insight>
    </div>
  );
}
