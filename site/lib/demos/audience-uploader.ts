'use client';

/**
 * Representative sample data + helpers for the Audience Uploader demo.
 *
 * UI prototype only — mock data shaped after the Meta Audience (Custom
 * Audience) API named in docs/solutions/miscellaneous/audience-uploader.md.
 * No real Marketing API calls are made. Field names mirror the documented API:
 *   - Create custom audience:  POST act_<AD_ACCOUNT_ID>/customaudiences
 *                              ?name&subtype=CUSTOM&customer_file_source (returns id)
 *   - Add users (batches):     POST <CUSTOM_AUDIENCE_ID>/users
 *                              body: payload={schema,data}, session={session_id,
 *                              batch_seq,last_batch_flag,estimated_num_total}
 *                              response: num_received,num_invalid_entries,invalid_entry_samples
 *   - Lookalike:               POST act_<AD_ACCOUNT_ID>/customaudiences
 *                              ?subtype=LOOKALIKE&origin_audience_id&lookalike_spec
 *   - TOS check:               GET act_<AD_ACCOUNT_ID>?fields=tos_accepted
 *                              -> {tos_accepted:{custom_audience_tos:0|1}}
 *   - Hashing/normalisation:   SHA-256, lowercase hex, one key per schema entry.
 */

// ---------------------------------------------------------------------------
// Schema keys (customer file custom audience) — from the spec's key list.
// ---------------------------------------------------------------------------

/** Keys that must be SHA-256 hashed after normalisation vs. sent in the clear. */
export type SchemaKey =
  | 'EMAIL'
  | 'PHONE'
  | 'GEN'
  | 'DOBY'
  | 'DOBM'
  | 'DOBD'
  | 'LN'
  | 'FN'
  | 'FI'
  | 'CT'
  | 'ST'
  | 'ZIP'
  | 'COUNTRY'
  | 'MADID'
  | 'EXTERN_ID'
  | 'PAGEUID';

export interface SchemaKeyMeta {
  key: SchemaKey;
  label: string;
  /** SHA-256 hashed before upload (PII) vs. sent un-hashed (mobile/site IDs). */
  hashed: boolean;
  /** Short normalisation note per the spec, shown in the hashing preview. */
  normalisation: string;
  /** Relative contribution to match rate when present (heuristic, for the demo). */
  matchWeight: number;
}

/** Ordered so the strongest match keys come first in the UI. */
export const SCHEMA_KEYS: SchemaKeyMeta[] = [
  {
    key: 'EMAIL',
    label: 'Email',
    hashed: true,
    normalisation: 'Trim, lowercase, then SHA-256.',
    matchWeight: 0.9,
  },
  {
    key: 'PHONE',
    label: 'Phone',
    hashed: true,
    normalisation: 'Strip symbols, add country code, then SHA-256.',
    matchWeight: 0.85,
  },
  {
    key: 'MADID',
    label: 'Mobile advertiser ID',
    hashed: false,
    normalisation: 'Sent un-hashed, lowercase.',
    matchWeight: 0.8,
  },
  {
    key: 'EXTERN_ID',
    label: 'External ID',
    hashed: false,
    normalisation: 'Sent un-hashed (your own stable identifier).',
    matchWeight: 0.55,
  },
  {
    key: 'FN',
    label: 'First name',
    hashed: true,
    normalisation: 'Trim, lowercase, UTF-8, then SHA-256.',
    matchWeight: 0.35,
  },
  {
    key: 'LN',
    label: 'Last name',
    hashed: true,
    normalisation: 'Trim, lowercase, UTF-8, then SHA-256.',
    matchWeight: 0.35,
  },
  {
    key: 'CT',
    label: 'City',
    hashed: true,
    normalisation: 'Lowercase, remove punctuation/spaces, then SHA-256.',
    matchWeight: 0.2,
  },
  {
    key: 'ST',
    label: 'State/Province',
    hashed: true,
    normalisation: 'Lowercase 2-char code where possible, then SHA-256.',
    matchWeight: 0.15,
  },
  {
    key: 'ZIP',
    label: 'Zip/Postal code',
    hashed: true,
    normalisation: 'Lowercase, trim, then SHA-256.',
    matchWeight: 0.2,
  },
  {
    key: 'COUNTRY',
    label: 'Country',
    hashed: true,
    normalisation: 'ISO alpha-2, lowercase, then SHA-256.',
    matchWeight: 0.15,
  },
];

export const SCHEMA_KEY_META: Record<SchemaKey, SchemaKeyMeta> =
  Object.fromEntries(SCHEMA_KEYS.map(k => [k.key, k])) as Record<
    SchemaKey,
    SchemaKeyMeta
  >;

/** Max records per <CUSTOM_AUDIENCE_ID>/users request (spec: build step 4). */
export const BATCH_MAX_RECORDS = 10000;

/** A session auto-terminates ~90 min after the first batch (spec detail). */
export const SESSION_TTL_MINUTES = 90;

export type CustomerFileSource =
  | 'USER_PROVIDED_ONLY'
  | 'PARTNER_PROVIDED_ONLY'
  | 'BOTH_USER_AND_PARTNER_PROVIDED';

export type AudienceSubtype = 'CUSTOM' | 'LOOKALIKE';

export type AudienceStatus = 'populating' | 'ready' | 'too_small';

/** A custom (or lookalike) audience node returned by the API. */
export interface Audience {
  /** id returned by POST .../customaudiences. */
  id: string;
  name: string;
  subtype: AudienceSubtype;
  customerFileSource: CustomerFileSource;
  /** Estimated matched size (approximate_count on the audience node). */
  approximateCount: number;
  /** Rows uploaded across all batches of the session. */
  uploadedRows: number;
  /** matched / uploaded — the customer-file match rate (0-1). */
  matchRate: number;
  /** Schema (match keys) uploaded for this audience. */
  schema: SchemaKey[];
  status: AudienceStatus;
  /** subtype=LOOKALIKE only: origin_audience_id it was seeded from. */
  originAudienceId?: string;
  /** subtype=LOOKALIKE only: lookalike_spec.ratio (e.g. 0.01 = top 1%). */
  lookalikeRatio?: number;
}

export interface AdAccount {
  /** Bare numeric id; prefix with act_ in API paths. */
  id: string;
  name: string;
  /** GET act_<id>?fields=tos_accepted -> custom_audience_tos === 1. */
  tosAccepted: boolean;
  audiences: Audience[];
}

// Seed lookalikes need >=100 members before they can be created (spec detail).
export const LOOKALIKE_MIN_SEED = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function matchRatePct(a: Audience): number {
  return Math.round(a.matchRate * 100);
}

export type MatchBand = 'strong' | 'fair' | 'weak';

export function matchBand(rate: number): MatchBand {
  if (rate >= 0.7) return 'strong';
  if (rate >= 0.5) return 'fair';
  return 'weak';
}

export const MATCH_BAND_META: Record<
  MatchBand,
  {label: string; colorVar: string}
> = {
  strong: {label: 'Strong', colorVar: 'var(--green)'},
  fair: {label: 'Fair', colorVar: 'var(--cat-measurement)'},
  weak: {label: 'Weak', colorVar: 'var(--rose)'},
};

/**
 * Estimate a match rate from the schema used, per the spec's guidance that
 * multi-key uploads improve match rate. Heuristic only (no real API call):
 * combine each key's independent match probability, then cap at 96%.
 */
export function estimateMatchRate(schema: SchemaKey[]): number {
  if (schema.length === 0) return 0;
  let missProbability = 1;
  for (const key of schema) {
    missProbability *= 1 - SCHEMA_KEY_META[key].matchWeight;
  }
  return Math.min(0.96, 1 - missProbability);
}

/**
 * Deterministic mock of SHA-256 (lowercase hex) for the hashing preview so the
 * UI can show a realistic-looking digest without a crypto dependency. NOT a
 * real hash — the demo never handles real PII.
 */
export function mockSha256(input: string): string {
  const normalised = input.trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0xc9dc5118;
  for (let i = 0; i < normalised.length; i++) {
    const c = normalised.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 3) | i), 0x01000193) >>> 0;
  }
  let out = '';
  let a = h1;
  let b = h2;
  for (let i = 0; i < 8; i++) {
    a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) >>> 0;
    b = Math.imul(b ^ (b >>> 13), 0x297a2d39) >>> 0;
    out += a.toString(16).padStart(8, '0');
    out += b.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

/** Normalise then (mock) hash a value for a schema key, per the spec rules. */
export function normaliseForKey(key: SchemaKey, raw: string): string {
  const meta = SCHEMA_KEY_META[key];
  let value = raw.trim().toLowerCase();
  if (key === 'PHONE') value = value.replace(/[^0-9]/g, '');
  if (key === 'COUNTRY') value = value.slice(0, 2);
  if (key === 'CT' || key === 'ST') value = value.replace(/[^a-z0-9]/g, '');
  return meta.hashed ? mockSha256(value) : value;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

export const AD_ACCOUNTS: AdAccount[] = [
  {
    id: '1024887613',
    name: 'Northwind Retail',
    tosAccepted: true,
    audiences: [
      {
        id: '23849901746650123',
        name: 'All Purchasers · L365D',
        subtype: 'CUSTOM',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 184000,
        uploadedRows: 240000,
        matchRate: 0.77,
        schema: ['EMAIL', 'PHONE', 'FN', 'LN', 'ZIP'],
        status: 'ready',
      },
      {
        id: '23849901746650188',
        name: 'Lapsed Customers · 180-365D',
        subtype: 'CUSTOM',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 41000,
        uploadedRows: 68000,
        matchRate: 0.6,
        schema: ['EMAIL', 'ZIP'],
        status: 'ready',
      },
      {
        id: '23849901746650201',
        name: 'Purchasers Lookalike 1%',
        subtype: 'LOOKALIKE',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 2100000,
        uploadedRows: 0,
        matchRate: 0,
        schema: [],
        status: 'ready',
        originAudienceId: '23849901746650123',
        lookalikeRatio: 0.01,
      },
    ],
  },
  {
    id: '2048113977',
    name: 'Lumen Skincare',
    tosAccepted: true,
    audiences: [
      {
        id: '23851120033471502',
        name: 'Loyalty Members',
        subtype: 'CUSTOM',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 92000,
        uploadedRows: 110000,
        matchRate: 0.84,
        schema: ['EMAIL', 'PHONE', 'MADID', 'FN', 'LN'],
        status: 'ready',
      },
      {
        id: '23851120033471560',
        name: 'Newsletter Subscribers',
        subtype: 'CUSTOM',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 26000,
        uploadedRows: 58000,
        matchRate: 0.45,
        schema: ['EMAIL'],
        status: 'ready',
      },
    ],
  },
  {
    id: '3072556401',
    name: 'Atlas Outdoors',
    tosAccepted: false,
    audiences: [
      {
        id: '23861204558820914',
        name: 'In-Store Buyers (POS export)',
        subtype: 'CUSTOM',
        customerFileSource: 'USER_PROVIDED_ONLY',
        approximateCount: 5400,
        uploadedRows: 14000,
        matchRate: 0.39,
        schema: ['EMAIL', 'ZIP', 'COUNTRY'],
        status: 'ready',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Write-action builders (mock — no real Marketing API calls are made)
//
// These shape the payloads a real integration would POST and the async results
// it would poll for, so the demo can simulate the create -> add users -> status
// upload workflow against in-memory copies of the sample data.
// ---------------------------------------------------------------------------

/** Fresh deep copy of the sample accounts for local (mutable) demo state. */
export function cloneAccounts(): AdAccount[] {
  return structuredClone(AD_ACCOUNTS);
}

/** Body for POST act_<id>/customaudiences (customer-file custom audience). */
export interface CreateAudienceRequest {
  name: string;
  subtype: 'CUSTOM';
  customer_file_source: CustomerFileSource;
  description?: string;
}

export function buildCreateAudienceRequest(
  name: string,
  customerFileSource: CustomerFileSource,
): CreateAudienceRequest {
  return {
    name,
    subtype: 'CUSTOM',
    customer_file_source: customerFileSource,
  };
}

/** session object for POST <CUSTOM_AUDIENCE_ID>/users. */
export interface UsersSession {
  session_id: number;
  batch_seq: number;
  last_batch_flag: boolean;
  estimated_num_total: number;
}

/** payload object for POST <CUSTOM_AUDIENCE_ID>/users. */
export interface UsersPayload {
  schema: SchemaKey[];
  /** One representative row (hashed/normalised); a real call sends up to 10k. */
  data: string[][];
}

export interface AddUsersRequest {
  payload: UsersPayload;
  session: UsersSession;
}

/** Response from POST <CUSTOM_AUDIENCE_ID>/users. */
export interface AddUsersResponse {
  num_received: number;
  num_invalid_entries: number;
  invalid_entry_samples: string[];
}

export function makeSessionId(nonce: number): number {
  return 700000000 + nonce;
}

/**
 * Number of <CUSTOM_AUDIENCE_ID>/users batches needed for a row count, capped
 * at BATCH_MAX_RECORDS per request (spec build step 4).
 */
export function batchCount(rows: number): number {
  return Math.max(1, Math.ceil(rows / BATCH_MAX_RECORDS));
}

/**
 * Build one <CUSTOM_AUDIENCE_ID>/users batch request. `sampleRow` is the
 * plaintext preview row; it is normalised + (mock) hashed per key here so the
 * request body carries only digests, never raw PII.
 */
export function buildAddUsersRequest(
  schema: SchemaKey[],
  sampleRow: Record<SchemaKey, string>,
  sessionId: number,
  batchSeq: number,
  totalRows: number,
): AddUsersRequest {
  const hashedRow = schema.map(key => normaliseForKey(key, sampleRow[key]));
  return {
    payload: {schema, data: [hashedRow]},
    session: {
      session_id: sessionId,
      batch_seq: batchSeq,
      last_batch_flag: batchSeq >= batchCount(totalRows),
      estimated_num_total: totalRows,
    },
  };
}

/** Optimistic per-batch response — a small share of rows fail validation. */
export function mockAddUsersResponse(rowsInBatch: number): AddUsersResponse {
  const invalid = Math.round(rowsInBatch * 0.008);
  return {
    num_received: rowsInBatch - invalid,
    num_invalid_entries: invalid,
    invalid_entry_samples: invalid > 0 ? ['row 42: invalid EMAIL format'] : [],
  };
}

/** A freshly created (still populating) custom audience. */
export function makeAudience(
  name: string,
  customerFileSource: CustomerFileSource,
  schema: SchemaKey[],
  uploadedRows: number,
  nonce: number,
): Audience {
  const matchRate = estimateMatchRate(schema);
  return {
    id: `2384990174665${(2000 + nonce).toString()}`,
    name,
    subtype: 'CUSTOM',
    customerFileSource,
    approximateCount: Math.round(uploadedRows * matchRate),
    uploadedRows,
    matchRate,
    schema,
    status: 'populating',
  };
}

/** Body for POST act_<id>/customaudiences with subtype=LOOKALIKE. */
export interface CreateLookalikeRequest {
  subtype: 'LOOKALIKE';
  origin_audience_id: string;
  lookalike_spec: {type: 'similarity' | 'reach'; ratio: number};
  name: string;
}

export function buildCreateLookalikeRequest(
  seed: Audience,
  ratio: number,
): CreateLookalikeRequest {
  return {
    subtype: 'LOOKALIKE',
    origin_audience_id: seed.id,
    lookalike_spec: {type: 'similarity', ratio},
    name: `${seed.name} Lookalike ${Math.round(ratio * 100)}%`,
  };
}

/** A newly created lookalike audience seeded from an existing custom audience. */
export function makeLookalike(
  seed: Audience,
  ratio: number,
  nonce: number,
): Audience {
  return {
    id: `2384990174665${(3000 + nonce).toString()}`,
    name: `${seed.name} Lookalike ${Math.round(ratio * 100)}%`,
    subtype: 'LOOKALIKE',
    customerFileSource: seed.customerFileSource,
    approximateCount: Math.round(2_100_000 * (ratio / 0.01)),
    uploadedRows: 0,
    matchRate: 0,
    schema: [],
    status: 'ready',
    originAudienceId: seed.id,
    lookalikeRatio: ratio,
  };
}
