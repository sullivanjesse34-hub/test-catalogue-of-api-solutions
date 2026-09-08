'use client';

/**
 * Representative sample data for the Catalogue Batch & Feed Optimiser.
 *
 * UI prototype only — mock data shaped after the Meta Catalogue Batch and
 * Feed APIs named in the solution spec. No real Marketing API calls are made.
 * Field names mirror the documented APIs:
 *   - Business Management API:   <BUSINESS_ID>/owned_product_catalogs, client_product_catalogs
 *   - Catalogue Batch API:       items_batch (CREATE/UPDATE/DELETE), check_batch_request_status
 *   - Feed API:                  <CATALOG_ID>/product_feeds, <FEED_ID>/uploads, <UPLOAD_SESSION_ID>/error_report
 *   - Product Video:             video[].url, video[].tag, video_fetch_status
 */

// ---------------------------------------------------------------------------
// Batch API types
// ---------------------------------------------------------------------------

export type BatchMethod = 'CREATE' | 'UPDATE' | 'DELETE';

export type BatchStatus = 'not_started' | 'in_progress' | 'finished' | 'error';

export interface BatchValidationIssue {
  /** Product retailer_id that produced the issue. */
  retailerId: string;
  message: string;
}

/**
 * Mirrors the response from check_batch_request_status: per-item
 * validation_status breakdown.
 */
export interface BatchValidation {
  successCount: number;
  warningCount: number;
  errorCount: number;
  errors: BatchValidationIssue[];
  warnings: BatchValidationIssue[];
}

/**
 * A single items_batch call. `handle` is the async handle returned by
 * the API that you poll with check_batch_request_status.
 */
export interface BatchJob {
  id: string;
  method: BatchMethod;
  handle: string;
  status: BatchStatus;
  itemCount: number;
  createdAt: string;
  validation: BatchValidation;
}

// ---------------------------------------------------------------------------
// Feed API types
// ---------------------------------------------------------------------------

export type ScheduleType = 'REPLACE' | 'UPDATE';

export type FeedType = 'PRIMARY_FEED' | 'SUPPLEMENTARY_FEED';

export type IngestionSourceType =
  | 'MANUAL_UPLOAD'
  | 'SERVER_FETCH'
  | 'GOOGLE_SHEETS'
  | 'S3'
  | 'BLOB_STORAGE'
  | 'GCS';

export type UploadStatus = 'completed' | 'in_progress' | 'error';

/** A single ProductFeedUpload node from GET <FEED_ID>/uploads. */
export interface FeedUpload {
  id: string;
  startTime: string;
  endTime?: string;
  status: UploadStatus;
  numDetectedItems: number;
  numPersistedItems: number;
  errorCount: number;
  warningCount: number;
}

/** A product feed from <CATALOG_ID>/product_feeds. */
export interface ProductFeed {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  feedType: FeedType;
  ingestionSourceType: IngestionSourceType;
  /** Delimiter used in the feed file. */
  delimiter: string;
  uploads: FeedUpload[];
}

// ---------------------------------------------------------------------------
// Product / Video types
// ---------------------------------------------------------------------------

export type VideoFetchStatus =
  | 'FETCHED'
  | 'PARTIAL_FETCH'
  | 'OUTDATED'
  | 'NO_STATUS'
  | 'FETCH_FAILED'
  | 'NO_URLS';

export const VIDEO_FETCH_LABELS: Record<VideoFetchStatus, string> = {
  FETCHED: 'Fetched',
  PARTIAL_FETCH: 'Partial',
  OUTDATED: 'Outdated',
  NO_STATUS: 'No status',
  FETCH_FAILED: 'Failed',
  NO_URLS: 'No URLs',
};

export const VIDEO_FETCH_COLOR: Record<VideoFetchStatus, string> = {
  FETCHED: 'var(--green)',
  PARTIAL_FETCH: 'var(--cat-catalogue)',
  OUTDATED: 'var(--cat-measurement)',
  NO_STATUS: 'var(--ink-3)',
  FETCH_FAILED: 'var(--rose)',
  NO_URLS: 'var(--border)',
};

export interface ProductItem {
  retailerId: string;
  title: string;
  hasVideo: boolean;
  videoFetchStatus: VideoFetchStatus;
}

// ---------------------------------------------------------------------------
// Catalogue aggregate type
// ---------------------------------------------------------------------------

export interface VideoCoverageStats {
  totalItems: number;
  itemsWithVideo: number;
  fetchStatusBreakdown: Record<VideoFetchStatus, number>;
}

export interface Catalogue {
  id: string;
  name: string;
  businessName: string;
  feeds: ProductFeed[];
  batchJobs: BatchJob[];
  products: ProductItem[];
  videoCoverage: VideoCoverageStats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function feedErrorRate(feed: ProductFeed): number {
  if (feed.uploads.length === 0) return 0;
  const latest = feed.uploads[0];
  if (latest.numDetectedItems === 0) return 0;
  return Math.round((latest.errorCount / latest.numDetectedItems) * 100);
}

export function batchSuccessRate(job: BatchJob): number {
  const total =
    job.validation.successCount +
    job.validation.warningCount +
    job.validation.errorCount;
  if (total === 0) return 0;
  return Math.round((job.validation.successCount / total) * 100);
}

export function videoCoveragePct(stats: VideoCoverageStats): number {
  if (stats.totalItems === 0) return 0;
  return Math.round((stats.itemsWithVideo / stats.totalItems) * 100);
}

export type OverallHealth = 'healthy' | 'warning' | 'critical';

export function catalogueHealth(cat: Catalogue): OverallHealth {
  const hasErrorFeed = cat.feeds.some(f => feedErrorRate(f) > 10);
  const hasErrorBatch = cat.batchJobs.some(j => j.status === 'error');
  if (hasErrorFeed || hasErrorBatch) return 'critical';
  const hasWarningFeed = cat.feeds.some(f => feedErrorRate(f) > 2);
  const hasWarningBatch = cat.batchJobs.some(
    j => j.validation.warningCount > 0,
  );
  if (hasWarningFeed || hasWarningBatch) return 'warning';
  return 'healthy';
}

export const HEALTH_COLOR: Record<OverallHealth, string> = {
  healthy: 'var(--green)',
  warning: 'var(--cat-measurement)',
  critical: 'var(--rose)',
};

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

function upload(
  id: string,
  startTime: string,
  status: UploadStatus,
  numDetected: number,
  errorCount: number,
  warningCount: number,
  endTime?: string,
): FeedUpload {
  return {
    id,
    startTime,
    endTime,
    status,
    numDetectedItems: numDetected,
    numPersistedItems: numDetected - errorCount,
    errorCount,
    warningCount,
  };
}

function product(
  retailerId: string,
  title: string,
  hasVideo: boolean,
  videoFetchStatus: VideoFetchStatus,
): ProductItem {
  return {retailerId, title, hasVideo, videoFetchStatus};
}

export const CATALOGUES: Catalogue[] = [
  // ---- 1. Summit Electronics — healthy catalogue ----
  {
    id: 'cat_901234',
    name: 'Summit Electronics Store',
    businessName: 'Summit Electronics',
    feeds: [
      {
        id: 'feed_1001',
        name: 'Primary Product Feed',
        scheduleType: 'REPLACE',
        feedType: 'PRIMARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: ',',
        uploads: [
          upload(
            'upl_2001',
            '2026-06-30T02:00:00Z',
            'completed',
            8420,
            3,
            12,
            '2026-06-30T02:04:18Z',
          ),
          upload(
            'upl_2002',
            '2026-06-29T02:00:00Z',
            'completed',
            8415,
            1,
            8,
            '2026-06-29T02:03:55Z',
          ),
          upload(
            'upl_2003',
            '2026-06-28T02:00:00Z',
            'completed',
            8400,
            0,
            5,
            '2026-06-28T02:04:02Z',
          ),
        ],
      },
      {
        id: 'feed_1002',
        name: 'Pricing Supplement',
        scheduleType: 'UPDATE',
        feedType: 'SUPPLEMENTARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: '\t',
        uploads: [
          upload(
            'upl_2004',
            '2026-06-30T06:00:00Z',
            'completed',
            8420,
            0,
            2,
            '2026-06-30T06:01:10Z',
          ),
        ],
      },
    ],
    batchJobs: [
      {
        id: 'bj_3001',
        method: 'UPDATE',
        handle: 'AczwaOd1RzM',
        status: 'finished',
        itemCount: 2400,
        createdAt: '2026-06-29T18:30:00Z',
        validation: {
          successCount: 2398,
          warningCount: 2,
          errorCount: 0,
          errors: [],
          warnings: [
            {
              retailerId: 'SE-4821',
              message:
                'Image URL returns HTTP 301 redirect; consider updating to final URL.',
            },
            {
              retailerId: 'SE-7013',
              message: 'description exceeds 5000 characters; truncated.',
            },
          ],
        },
      },
      {
        id: 'bj_3002',
        method: 'CREATE',
        handle: 'BfxR8kLmN2a',
        status: 'finished',
        itemCount: 150,
        createdAt: '2026-06-28T11:00:00Z',
        validation: {
          successCount: 150,
          warningCount: 0,
          errorCount: 0,
          errors: [],
          warnings: [],
        },
      },
    ],
    products: [
      product('SE-1001', '4K OLED TV 65"', true, 'FETCHED'),
      product(
        'SE-1002',
        'Wireless Noise-Cancelling Headphones',
        true,
        'FETCHED',
      ),
      product('SE-1003', 'Smart Home Hub', false, 'NO_URLS'),
      product('SE-1004', 'USB-C Docking Station', true, 'FETCHED'),
      product('SE-1005', 'Portable Bluetooth Speaker', true, 'PARTIAL_FETCH'),
      product('SE-1006', 'Laptop Stand Adjustable', false, 'NO_URLS'),
      product('SE-1007', 'Gaming Mouse RGB', true, 'FETCHED'),
      product('SE-1008', 'Mechanical Keyboard', true, 'FETCHED'),
    ],
    videoCoverage: {
      totalItems: 8420,
      itemsWithVideo: 6230,
      fetchStatusBreakdown: {
        FETCHED: 5800,
        PARTIAL_FETCH: 280,
        OUTDATED: 100,
        NO_STATUS: 50,
        FETCH_FAILED: 0,
        NO_URLS: 2190,
      },
    },
  },

  // ---- 2. Bloom Cosmetics — feed errors ----
  {
    id: 'cat_902345',
    name: 'Bloom Cosmetics Catalogue',
    businessName: 'Bloom Cosmetics',
    feeds: [
      {
        id: 'feed_1003',
        name: 'Full Product Feed',
        scheduleType: 'REPLACE',
        feedType: 'PRIMARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: ',',
        uploads: [
          upload('upl_2005', '2026-06-30T03:00:00Z', 'error', 12300, 1845, 620),
          upload(
            'upl_2006',
            '2026-06-29T03:00:00Z',
            'completed',
            12280,
            310,
            140,
            '2026-06-29T03:08:22Z',
          ),
          upload(
            'upl_2007',
            '2026-06-28T03:00:00Z',
            'completed',
            12250,
            95,
            60,
            '2026-06-28T03:07:50Z',
          ),
        ],
      },
      {
        id: 'feed_1004',
        name: 'Inventory Update Feed',
        scheduleType: 'UPDATE',
        feedType: 'SUPPLEMENTARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: ',',
        uploads: [
          upload(
            'upl_2008',
            '2026-06-30T08:00:00Z',
            'completed',
            12300,
            22,
            45,
            '2026-06-30T08:02:30Z',
          ),
        ],
      },
    ],
    batchJobs: [
      {
        id: 'bj_3003',
        method: 'UPDATE',
        handle: 'CgkPl9QwT4b',
        status: 'finished',
        itemCount: 500,
        createdAt: '2026-06-29T14:00:00Z',
        validation: {
          successCount: 488,
          warningCount: 8,
          errorCount: 4,
          errors: [
            {retailerId: 'BC-2201', message: 'Missing required field: price.'},
            {retailerId: 'BC-2202', message: 'Invalid currency code: USDD.'},
            {
              retailerId: 'BC-3310',
              message: 'Image URL unreachable (HTTP 404).',
            },
            {
              retailerId: 'BC-3311',
              message: 'Image URL unreachable (HTTP 404).',
            },
          ],
          warnings: [
            {
              retailerId: 'BC-1105',
              message: 'brand field is empty; recommended for matching.',
            },
            {
              retailerId: 'BC-1108',
              message: 'brand field is empty; recommended for matching.',
            },
            {
              retailerId: 'BC-1442',
              message: 'google_product_category not set; may affect delivery.',
            },
            {
              retailerId: 'BC-2050',
              message: 'description exceeds 5000 characters; truncated.',
            },
            {
              retailerId: 'BC-2055',
              message: 'description exceeds 5000 characters; truncated.',
            },
            {
              retailerId: 'BC-2060',
              message: 'description exceeds 5000 characters; truncated.',
            },
            {
              retailerId: 'BC-2065',
              message: 'description exceeds 5000 characters; truncated.',
            },
            {
              retailerId: 'BC-2070',
              message: 'description exceeds 5000 characters; truncated.',
            },
          ],
        },
      },
    ],
    products: [
      product('BC-1001', 'Hydrating Face Serum 30ml', true, 'FETCHED'),
      product('BC-1002', 'Matte Lipstick Collection', true, 'FETCH_FAILED'),
      product('BC-1003', 'SPF 50 Daily Moisturiser', false, 'NO_URLS'),
      product('BC-1004', 'Vitamin C Eye Cream', true, 'OUTDATED'),
      product('BC-1005', 'Foundation Brush Set', true, 'FETCHED'),
      product('BC-1006', 'Organic Shampoo Bar', false, 'NO_URLS'),
      product('BC-1007', 'Retinol Night Cream', true, 'PARTIAL_FETCH'),
      product('BC-1008', 'Tinted Lip Balm', true, 'FETCHED'),
    ],
    videoCoverage: {
      totalItems: 12300,
      itemsWithVideo: 5400,
      fetchStatusBreakdown: {
        FETCHED: 3200,
        PARTIAL_FETCH: 620,
        OUTDATED: 880,
        NO_STATUS: 200,
        FETCH_FAILED: 500,
        NO_URLS: 6900,
      },
    },
  },

  // ---- 3. Riverstone Furniture — batch issues ----
  {
    id: 'cat_903456',
    name: 'Riverstone Furniture Catalogue',
    businessName: 'Riverstone Furniture',
    feeds: [
      {
        id: 'feed_1005',
        name: 'Master Product Feed',
        scheduleType: 'REPLACE',
        feedType: 'PRIMARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: '\t',
        uploads: [
          upload(
            'upl_2009',
            '2026-06-30T01:00:00Z',
            'completed',
            3200,
            18,
            42,
            '2026-06-30T01:03:44Z',
          ),
          upload(
            'upl_2010',
            '2026-06-29T01:00:00Z',
            'completed',
            3195,
            10,
            30,
            '2026-06-29T01:03:20Z',
          ),
        ],
      },
    ],
    batchJobs: [
      {
        id: 'bj_3004',
        method: 'CREATE',
        handle: 'DhnYm3RxU5c',
        status: 'error',
        itemCount: 4800,
        createdAt: '2026-06-29T20:00:00Z',
        validation: {
          successCount: 2100,
          warningCount: 340,
          errorCount: 2360,
          errors: [
            {
              retailerId: 'RF-5001',
              message:
                'Payload exceeds 28 MB limit. Split into smaller batches (recommended <3000 items).',
            },
            {
              retailerId: 'RF-5002',
              message: 'Missing required field: availability.',
            },
            {
              retailerId: 'RF-5003',
              message:
                'Invalid item_type: FURNITURE_ITEM (must be PRODUCT_ITEM).',
            },
            {retailerId: 'RF-5120', message: 'Missing required field: price.'},
            {
              retailerId: 'RF-5200',
              message: 'Duplicate retailer_id in same request.',
            },
          ],
          warnings: [
            {
              retailerId: 'RF-4001',
              message: 'Image dimensions below 500x500 recommended minimum.',
            },
            {
              retailerId: 'RF-4002',
              message: 'Image dimensions below 500x500 recommended minimum.',
            },
            {
              retailerId: 'RF-4050',
              message: 'color field is empty; recommended for furniture items.',
            },
          ],
        },
      },
      {
        id: 'bj_3005',
        method: 'DELETE',
        handle: 'EioZn4SyV6d',
        status: 'finished',
        itemCount: 80,
        createdAt: '2026-06-28T09:00:00Z',
        validation: {
          successCount: 80,
          warningCount: 0,
          errorCount: 0,
          errors: [],
          warnings: [],
        },
      },
      {
        id: 'bj_3006',
        method: 'UPDATE',
        handle: 'FjpAo5TzW7e',
        status: 'in_progress',
        itemCount: 1200,
        createdAt: '2026-06-30T10:00:00Z',
        validation: {
          successCount: 0,
          warningCount: 0,
          errorCount: 0,
          errors: [],
          warnings: [],
        },
      },
    ],
    products: [
      product('RF-1001', 'Oak Dining Table 6-Seater', true, 'FETCHED'),
      product('RF-1002', 'Velvet Sofa 3-Seater', true, 'FETCHED'),
      product('RF-1003', 'Bedside Table Walnut', false, 'NO_URLS'),
      product('RF-1004', 'Ergonomic Office Chair', true, 'OUTDATED'),
      product('RF-1005', 'Bookshelf Modular 5-Tier', true, 'NO_STATUS'),
      product('RF-1006', 'Kids Bunk Bed Pine', true, 'FETCH_FAILED'),
      product('RF-1007', 'Garden Lounge Set', true, 'PARTIAL_FETCH'),
      product('RF-1008', 'Standing Desk Electric', true, 'FETCHED'),
    ],
    videoCoverage: {
      totalItems: 3200,
      itemsWithVideo: 1920,
      fetchStatusBreakdown: {
        FETCHED: 1100,
        PARTIAL_FETCH: 310,
        OUTDATED: 240,
        NO_STATUS: 120,
        FETCH_FAILED: 150,
        NO_URLS: 1280,
      },
    },
  },

  // ---- 4. Crestview Apparel — mixed state ----
  {
    id: 'cat_904567',
    name: 'Crestview Apparel Catalogue',
    businessName: 'Crestview Apparel',
    feeds: [
      {
        id: 'feed_1006',
        name: 'Daily Product Sync',
        scheduleType: 'REPLACE',
        feedType: 'PRIMARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: ',',
        uploads: [
          upload(
            'upl_2011',
            '2026-06-30T04:00:00Z',
            'in_progress',
            22000,
            0,
            0,
          ),
          upload(
            'upl_2012',
            '2026-06-29T04:00:00Z',
            'completed',
            21800,
            55,
            180,
            '2026-06-29T04:12:30Z',
          ),
          upload(
            'upl_2013',
            '2026-06-28T04:00:00Z',
            'completed',
            21750,
            40,
            120,
            '2026-06-28T04:11:55Z',
          ),
        ],
      },
      {
        id: 'feed_1007',
        name: 'Video Enrichment Feed',
        scheduleType: 'UPDATE',
        feedType: 'SUPPLEMENTARY_FEED',
        ingestionSourceType: 'SERVER_FETCH',
        delimiter: ',',
        uploads: [
          upload(
            'upl_2014',
            '2026-06-29T12:00:00Z',
            'completed',
            5600,
            110,
            40,
            '2026-06-29T12:06:15Z',
          ),
        ],
      },
    ],
    batchJobs: [
      {
        id: 'bj_3007',
        method: 'UPDATE',
        handle: 'GkqBp6UaX8f',
        status: 'finished',
        itemCount: 2800,
        createdAt: '2026-06-29T16:00:00Z',
        validation: {
          successCount: 2760,
          warningCount: 35,
          errorCount: 5,
          errors: [
            {
              retailerId: 'CA-8801',
              message: 'Video URL returns HTTP 403 Forbidden.',
            },
            {
              retailerId: 'CA-8802',
              message: 'Video URL returns HTTP 403 Forbidden.',
            },
            {
              retailerId: 'CA-9100',
              message: 'Invalid size value: XXXL (not in allowed set).',
            },
            {
              retailerId: 'CA-9101',
              message: 'Missing required field: availability.',
            },
            {
              retailerId: 'CA-9102',
              message: 'Image URL unreachable (HTTP 500).',
            },
          ],
          warnings: [
            {
              retailerId: 'CA-7001',
              message: 'sale_price_effective_date is in the past.',
            },
            {
              retailerId: 'CA-7002',
              message: 'sale_price_effective_date is in the past.',
            },
            {
              retailerId: 'CA-7050',
              message: 'google_product_category not set; may affect delivery.',
            },
          ],
        },
      },
      {
        id: 'bj_3008',
        method: 'CREATE',
        handle: 'HlrCq7VbY9g',
        status: 'finished',
        itemCount: 420,
        createdAt: '2026-06-28T08:00:00Z',
        validation: {
          successCount: 420,
          warningCount: 0,
          errorCount: 0,
          errors: [],
          warnings: [],
        },
      },
    ],
    products: [
      product('CA-1001', 'Slim Fit Chinos Beige', true, 'FETCHED'),
      product('CA-1002', 'Wool Blend Overcoat Navy', true, 'FETCHED'),
      product('CA-1003', 'Cotton T-Shirt Pack (3)', false, 'NO_URLS'),
      product('CA-1004', 'Leather Belt Brown', false, 'NO_URLS'),
      product('CA-1005', 'Running Shoes Lightweight', true, 'PARTIAL_FETCH'),
      product('CA-1006', 'Denim Jacket Vintage Wash', true, 'FETCHED'),
      product('CA-1007', 'Silk Scarf Patterned', true, 'OUTDATED'),
      product('CA-1008', 'Canvas Tote Bag', true, 'NO_STATUS'),
    ],
    videoCoverage: {
      totalItems: 22000,
      itemsWithVideo: 14300,
      fetchStatusBreakdown: {
        FETCHED: 10500,
        PARTIAL_FETCH: 1800,
        OUTDATED: 1200,
        NO_STATUS: 400,
        FETCH_FAILED: 400,
        NO_URLS: 7700,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Write-action builders (mock — no real Marketing API calls are made)
//
// These shape the payloads a real integration would POST and the async results
// it would poll for, so the demo can simulate composing and submitting a batch
// operation or triggering a feed upload against in-memory copies of the data.
// ---------------------------------------------------------------------------

/** Fresh deep copy of the sample catalogues for local (mutable) demo state. */
export function cloneCatalogues(): Catalogue[] {
  return structuredClone(CATALOGUES);
}

export type BatchUpdateField =
  'availability' | 'price' | 'quantity_to_sell_on_facebook';

export interface BatchComposerInput {
  method: BatchMethod;
  /** Field to set (UPDATE only). */
  updateField: BatchUpdateField;
  updateValue: string;
  itemCount: number;
  /** Attach a product video (video[].url) — CREATE only. */
  attachVideo: boolean;
}

/** Max records per items_batch request per the Catalogue Batch API. */
export const BATCH_MAX_RECORDS = 5000;

const SAMPLE_RETAILER_ID = 'SKU-10432';

function coerceValue(field: BatchUpdateField, value: string): unknown {
  if (field === 'quantity_to_sell_on_facebook') {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

export interface ItemsBatchRequest {
  item_type: 'PRODUCT_ITEM';
  allow_upsert: boolean;
  requests: Array<{method: BatchMethod; data: Record<string, unknown>}>;
}

/**
 * Build the items_batch payload that a compose action would POST. `requests`
 * carries one representative entry; a real call sends one per item (up to
 * BATCH_MAX_RECORDS).
 */
export function buildItemsBatchRequest(
  input: BatchComposerInput,
): ItemsBatchRequest {
  let data: Record<string, unknown>;
  if (input.method === 'DELETE') {
    data = {id: SAMPLE_RETAILER_ID};
  } else if (input.method === 'UPDATE') {
    data = {
      id: SAMPLE_RETAILER_ID,
      [input.updateField]: coerceValue(input.updateField, input.updateValue),
    };
  } else {
    data = {
      id: SAMPLE_RETAILER_ID,
      title: 'New Product Title',
      description: 'Product description',
      availability: 'in stock',
      condition: 'new',
      price: '49.99 USD',
      link: 'https://www.example.com/products/sku-10432',
      image_link: 'https://cdn.example.com/img/sku-10432.jpg',
      brand: 'Example Brand',
      ...(input.attachVideo
        ? {video: [{url: 'https://cdn.example.com/video/sku-10432.mp4'}]}
        : {}),
    };
  }
  return {
    item_type: 'PRODUCT_ITEM',
    allow_upsert: true,
    requests: [{method: input.method, data}],
  };
}

export function makeBatchHandle(nonce: number): string {
  return `Batch_${(100000 + nonce).toString(36).toUpperCase()}xQ`;
}

/** A newly submitted (in-progress) batch job. Resolve later with mockBatchValidation. */
export function makeBatchJob(
  method: BatchMethod,
  itemCount: number,
  nonce: number,
): BatchJob {
  return {
    id: `bj_new_${nonce}`,
    method,
    handle: makeBatchHandle(nonce),
    status: 'in_progress',
    itemCount,
    createdAt: new Date().toISOString(),
    validation: {
      successCount: 0,
      warningCount: 0,
      errorCount: 0,
      errors: [],
      warnings: [],
    },
  };
}

/** Optimistic validation result for a resolved compose action. */
export function mockBatchValidation(itemCount: number): BatchValidation {
  const warningCount = itemCount >= 100 ? 2 : itemCount >= 10 ? 1 : 0;
  const successCount = Math.max(0, itemCount - warningCount);
  const warnings: BatchValidationIssue[] = [];
  if (warningCount >= 1) {
    warnings.push({
      retailerId: 'SKU-10440',
      message: 'brand field is empty; recommended for matching.',
    });
  }
  if (warningCount >= 2) {
    warnings.push({
      retailerId: 'SKU-10455',
      message: 'image dimensions below 500x500 recommended minimum.',
    });
  }
  return {successCount, warningCount, errorCount: 0, errors: [], warnings};
}

/** A newly triggered (in-progress) feed upload. */
export function makeFeedUpload(numItems: number, nonce: number): FeedUpload {
  return {
    id: `upl_new_${nonce}`,
    startTime: new Date().toISOString(),
    status: 'in_progress',
    numDetectedItems: numItems,
    numPersistedItems: 0,
    errorCount: 0,
    warningCount: 0,
  };
}

/** Resolve a triggered upload to completed with representative counts. */
export function resolveFeedUpload(upload: FeedUpload): FeedUpload {
  const warningCount = Math.round(upload.numDetectedItems * 0.001);
  return {
    ...upload,
    status: 'completed',
    endTime: new Date().toISOString(),
    numPersistedItems: upload.numDetectedItems,
    errorCount: 0,
    warningCount,
  };
}
