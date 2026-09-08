'use client';

import {
  CircleAlert,
  CircleCheck,
  KeyRound,
  type LucideIcon,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  type AdAccount,
  type Audience,
  BATCH_MAX_RECORDS,
  batchCount,
  buildAddUsersRequest,
  buildCreateAudienceRequest,
  buildCreateLookalikeRequest,
  cloneAccounts,
  type CustomerFileSource,
  estimateMatchRate,
  formatCount,
  LOOKALIKE_MIN_SEED,
  makeAudience,
  makeLookalike,
  makeSessionId,
  MATCH_BAND_META,
  matchBand,
  matchRatePct,
  mockAddUsersResponse,
  normaliseForKey,
  SCHEMA_KEY_META,
  SCHEMA_KEYS,
  type SchemaKey,
} from '@/lib/demos/audience-uploader';

import {
  Badge,
  Insight,
  Kpi,
  MatchRing,
  ProgressBar,
  SectionHeading,
} from './ui';

const DOC_CUSTOM_AUDIENCES =
  'https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/';
const DOC_TOS =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/reference/custom-audience-terms-of-service';

type View = 'audiences' | 'upload';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'audiences', label: 'Audiences', icon: Users},
  {id: 'upload', label: 'Upload wizard', icon: Upload},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

// Default schema for the wizard — the strongest multi-key combination.
const DEFAULT_SCHEMA: SchemaKey[] = ['EMAIL', 'PHONE', 'FN', 'LN', 'ZIP'];

// Ad account selected on first render.
const AD_INITIAL_ID = '1024887613';

// A representative plaintext row shown (then hashed) in the wizard preview.
const SAMPLE_ROW: Record<SchemaKey, string> = {
  EMAIL: 'Jordan.Lee@Example.com ',
  PHONE: '+1 (415) 555-0142',
  GEN: 'f',
  DOBY: '1990',
  DOBM: '04',
  DOBD: '17',
  LN: 'Lee',
  FN: 'Jordan',
  FI: 'J',
  CT: 'San Francisco',
  ST: 'CA',
  ZIP: '94107',
  COUNTRY: 'US',
  MADID: 'a=7f3c9a12-4b8e-4c1a-9f2d-1234567890ab',
  EXTERN_ID: 'crm_88213',
  PAGEUID: '',
};

// Reads that populate the dashboard for the selected ad account.
function buildLoadCalls(account: AdAccount): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `act_${account.id}`,
      summary: `Check Custom Audience terms for ${account.name}`,
      request: {fields: 'tos_accepted'},
      response: {
        tos_accepted: {custom_audience_tos: account.tosAccepted ? 1 : 0},
      },
      status: 'success',
      docsUrl: DOC_TOS,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}/customaudiences`,
      summary: `List custom audiences for ${account.name}`,
      request: {
        fields:
          'name,subtype,customer_file_source,approximate_count,operation_status',
      },
      response: {
        data: account.audiences.map(a => ({
          id: a.id,
          name: a.name,
          subtype: a.subtype,
          customer_file_source: a.customerFileSource,
          approximate_count: a.approximateCount,
        })),
      },
      status: 'success',
      docsUrl: DOC_CUSTOM_AUDIENCES,
    },
  ];
}

export function AudienceUploaderDashboard() {
  const {record, update} = useApiConsole();
  const [view, setView] = useState<View>('audiences');
  const [accounts, setAccounts] = useState<AdAccount[]>(cloneAccounts);
  const [selectedId, setSelectedId] = useState<string>(AD_INITIAL_ID);

  const selected = accounts.find(a => a.id === selectedId) ?? accounts[0];

  useApiLoads(selectedId, () => buildLoadCalls(selected));

  const handleCreateLookalike = useCallback(
    (account: AdAccount, seed: Audience, ratio: number) => {
      record({
        method: 'POST',
        endpoint: `act_${account.id}/customaudiences`,
        summary: `Create ${Math.round(ratio * 100)}% lookalike from ${seed.name}`,
        request: buildCreateLookalikeRequest(seed, ratio),
        response: {id: `pending_lookalike_${seed.id}`},
        status: 'success',
        docsUrl: DOC_CUSTOM_AUDIENCES,
      });
      setAccounts(prev =>
        prev.map(a =>
          a.id === account.id
            ? {
                ...a,
                audiences: [
                  ...a.audiences,
                  makeLookalike(seed, ratio, a.audiences.length),
                ],
              }
            : a,
        ),
      );
    },
    [record],
  );

  const handleUpload = useCallback(
    (
      account: AdAccount,
      name: string,
      source: CustomerFileSource,
      schema: SchemaKey[],
      rows: number,
    ) => {
      const nonce = account.audiences.length;
      const sessionId = makeSessionId(nonce);
      const batches = batchCount(rows);

      // 1. Create the custom audience (returns an id).
      const createId = record({
        method: 'POST',
        endpoint: `act_${account.id}/customaudiences`,
        summary: `Create custom audience "${name}"`,
        request: buildCreateAudienceRequest(name, source),
        response: {id: 'pending…'},
        status: 'pending',
        docsUrl: DOC_CUSTOM_AUDIENCES,
      });

      const created = makeAudience(name, source, schema, rows, nonce);
      setAccounts(prev =>
        prev.map(a =>
          a.id === account.id
            ? {...a, audiences: [...a.audiences, created]}
            : a,
        ),
      );

      window.setTimeout(() => {
        update(createId, {status: 'success', response: {id: created.id}});

        // 2. Add users in batches over one session_id.
        for (let seq = 1; seq <= batches; seq++) {
          const rowsInBatch =
            seq < batches
              ? BATCH_MAX_RECORDS
              : rows - (batches - 1) * BATCH_MAX_RECORDS;
          const res = mockAddUsersResponse(rowsInBatch);
          record({
            method: 'POST',
            endpoint: `${created.id}/users`,
            summary: `Add users — batch ${seq} of ${batches}`,
            request: buildAddUsersRequest(
              schema,
              SAMPLE_ROW,
              sessionId,
              seq,
              rows,
            ),
            response: res,
            status: 'success',
            docsUrl: DOC_CUSTOM_AUDIENCES,
          });
        }

        // 3. Read back the populated audience size + match.
        record({
          method: 'GET',
          endpoint: created.id,
          summary: `Read audience size for "${name}"`,
          request: {fields: 'approximate_count,operation_status'},
          response: {
            approximate_count: created.approximateCount,
            operation_status: {code: 200, description: 'Normal'},
          },
          status: 'success',
          docsUrl: DOC_CUSTOM_AUDIENCES,
        });

        setAccounts(prev =>
          prev.map(a =>
            a.id === account.id
              ? {
                  ...a,
                  audiences: a.audiences.map(x =>
                    x.id === created.id ? {...x, status: 'ready'} : x,
                  ),
                }
              : a,
          ),
        );
      }, 900);

      setView('audiences');
    },
    [record, update],
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

        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <span className="hidden sm:inline">Ad account</span>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
            }}
            aria-label="Select ad account"
            className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-signals)]">
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'audiences' ? (
        <AudiencesView
          account={selected}
          onCreateLookalike={handleCreateLookalike}
          onStartUpload={() => {
            setView('upload');
          }}
        />
      ) : (
        <UploadWizard account={selected} onUpload={handleUpload} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audiences view
// ---------------------------------------------------------------------------

function AudiencesView({
  account,
  onCreateLookalike,
  onStartUpload,
}: {
  account: AdAccount;
  onCreateLookalike: (
    account: AdAccount,
    seed: Audience,
    ratio: number,
  ) => void;
  onStartUpload: () => void;
}) {
  const customAudiences = account.audiences.filter(a => a.subtype === 'CUSTOM');
  const totalMatched = customAudiences.reduce(
    (s, a) => s + a.approximateCount,
    0,
  );
  const totalUploaded = customAudiences.reduce((s, a) => s + a.uploadedRows, 0);
  const avgMatch =
    customAudiences.length === 0
      ? 0
      : customAudiences.reduce((s, a) => s + a.matchRate, 0) /
        customAudiences.length;
  const lookalikes = account.audiences.filter(a => a.subtype === 'LOOKALIKE');
  const weakest = [...customAudiences].sort(
    (a, b) => a.matchRate - b.matchRate,
  )[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Custom audiences"
          value={String(customAudiences.length)}
          note={`${lookalikes.length} lookalikes`}
          accentVar="var(--cat-signals)"
        />
        <Kpi
          label="Matched reach"
          value={formatCount(totalMatched)}
          note={`of ${formatCount(totalUploaded)} uploaded`}
          accentVar="var(--purple)"
        />
        <Kpi
          label="Avg match rate"
          value={`${Math.round(avgMatch * 100)}%`}
          note="matched / uploaded"
          noteTone={avgMatch >= 0.6 ? 'up' : 'down'}
          accentVar="var(--green)"
        />
        <Kpi
          label="Custom Audience TOS"
          value={account.tosAccepted ? 'Accepted' : 'Required'}
          note={`act_${account.id}`}
          noteTone={account.tosAccepted ? 'up' : 'down'}
          accentVar={account.tosAccepted ? 'var(--green)' : 'var(--rose)'}
        />
      </div>

      {account.tosAccepted ? null : (
        <div
          className="flex items-start gap-2 rounded-lg border p-3 text-[13px] text-ink-2"
          style={{
            borderColor: 'color-mix(in srgb, var(--rose) 35%, transparent)',
            background: 'color-mix(in srgb, var(--rose) 8%, transparent)',
          }}>
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-[color:var(--rose)]"
            aria-hidden
          />
          <span>
            <strong className="text-ink">
              Custom Audience terms not accepted.
            </strong>{' '}
            The API rejects creating or editing customer-file audiences until a
            real (non-system) user accepts the terms for{' '}
            <span className="tabular-nums">act_{account.id}</span>. Check via{' '}
            <span className="tabular-nums">
              GET act_{account.id}?fields=tos_accepted
            </span>
            .
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <SectionHeading title="Audiences" />
        <button
          type="button"
          onClick={onStartUpload}
          disabled={!account.tosAccepted}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          <Upload className="size-4" />
          Upload customer file
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Audience</th>
                <th className={TH}>Type</th>
                <th className={TH}>Match rate</th>
                <th className={TH}>Matched size</th>
                <th className={TH}>Match keys</th>
                <th className={TH}>Lookalike</th>
              </tr>
            </thead>
            <tbody>
              {account.audiences.map(a => {
                const band = MATCH_BAND_META[matchBand(a.matchRate)];
                const isCustom = a.subtype === 'CUSTOM';
                const canSeed =
                  isCustom && a.approximateCount >= LOOKALIKE_MIN_SEED;
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        {a.name}
                        {a.status === 'populating' ? (
                          <Badge tone="yellow">populating</Badge>
                        ) : null}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {a.id}
                      </div>
                    </td>
                    <td className={TD}>
                      {isCustom ? (
                        <Badge tone="blue">Custom</Badge>
                      ) : (
                        <Badge tone="purple">Lookalike</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isCustom ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-9 text-[13px] font-bold tabular-nums"
                            style={{color: band.colorVar}}>
                            {matchRatePct(a)}%
                          </span>
                          <div className="w-20">
                            <ProgressBar
                              pct={matchRatePct(a)}
                              colorVar={band.colorVar}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-ink-3">—</span>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {formatCount(a.approximateCount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {isCustom ? (
                        <div className="flex flex-wrap gap-1">
                          {a.schema.map(k => (
                            <span
                              key={k}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
                              {SCHEMA_KEY_META[k].label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-3">
                          seed {a.originAudienceId}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {canSeed ? (
                        <button
                          type="button"
                          onClick={() => {
                            onCreateLookalike(account, a, 0.01);
                          }}
                          className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                          Create 1%
                        </button>
                      ) : isCustom ? (
                        <span
                          className="text-[11px] text-ink-3"
                          title={`Seed needs ≥ ${LOOKALIKE_MIN_SEED} members`}>
                          too small
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {customAudiences.length > 0 && weakest.matchRate < 0.6 ? (
        <Insight>
          <strong className="text-ink">Lift match rate:</strong>{' '}
          <span className="font-semibold">{weakest.name}</span> matches only{' '}
          {matchRatePct(weakest)}% — it uploads{' '}
          {weakest.schema.map(k => SCHEMA_KEY_META[k].label).join(' + ')}.
          Adding hashed phone and name keys to the customer file typically
          raises the match rate, since multi-key uploads match more people.
        </Insight>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload wizard
// ---------------------------------------------------------------------------

function UploadWizard({
  account,
  onUpload,
}: {
  account: AdAccount;
  onUpload: (
    account: AdAccount,
    name: string,
    source: CustomerFileSource,
    schema: SchemaKey[],
    rows: number,
  ) => void;
}) {
  const [name, setName] = useState('High-Value Customers · L90D');
  const [source, setSource] =
    useState<CustomerFileSource>('USER_PROVIDED_ONLY');
  const [schema, setSchema] = useState<SchemaKey[]>(DEFAULT_SCHEMA);
  const [rows, setRows] = useState(24000);

  const toggleKey = useCallback((key: SchemaKey) => {
    setSchema(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }, []);

  const orderedSchema = useMemo(
    () => SCHEMA_KEYS.filter(m => schema.includes(m.key)).map(m => m.key),
    [schema],
  );
  const estimate = estimateMatchRate(orderedSchema);
  const band = MATCH_BAND_META[matchBand(estimate)];
  const batches = batchCount(rows);
  const estMatched = Math.round(rows * estimate);
  const canSubmit =
    account.tosAccepted &&
    orderedSchema.length > 0 &&
    rows > 0 &&
    name.trim().length > 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeading
            title="1 · Custom audience"
            sub="Create the audience node, then add hashed users to it."
          />
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-2">
              Audience name
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                }}
                className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-normal text-ink outline-none focus:border-[color:var(--cat-signals)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-2">
              customer_file_source
              <select
                value={source}
                onChange={e => {
                  setSource(e.target.value as CustomerFileSource);
                }}
                className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-normal text-ink outline-none focus:border-[color:var(--cat-signals)]">
                <option value="USER_PROVIDED_ONLY">USER_PROVIDED_ONLY</option>
                <option value="PARTNER_PROVIDED_ONLY">
                  PARTNER_PROVIDED_ONLY
                </option>
                <option value="BOTH_USER_AND_PARTNER_PROVIDED">
                  BOTH_USER_AND_PARTNER_PROVIDED
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-2">
              Rows in customer file
              <input
                type="number"
                min={1}
                value={rows}
                onChange={e => {
                  setRows(Math.max(0, Number(e.target.value)));
                }}
                className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-normal tabular-nums text-ink outline-none focus:border-[color:var(--cat-signals)]"
              />
              <span className="text-[11px] font-normal text-ink-3">
                {formatCount(rows)} rows → {batches} batch
                {batches === 1 ? '' : 'es'} of ≤{' '}
                {formatCount(BATCH_MAX_RECORDS)} over one session_id.
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeading
            title="2 · Match keys (schema)"
            sub="Pick the identifiers in your file. More keys → higher match rate."
          />
          <div className="flex flex-col gap-1.5">
            {SCHEMA_KEYS.map(m => {
              const on = schema.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    toggleKey(m.key);
                  }}
                  className={[
                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                    on
                      ? 'border-[color:var(--cat-signals)] bg-surface-2'
                      : 'border-border hover:bg-surface-2',
                  ].join(' ')}>
                  <span
                    className={[
                      'grid size-4 shrink-0 place-items-center rounded border',
                      on
                        ? 'border-[color:var(--cat-signals)] bg-[color:var(--cat-signals)]'
                        : 'border-border',
                    ].join(' ')}>
                    {on ? (
                      <CircleCheck className="size-3 text-on-brand" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {m.label}
                      <span className="text-[10px] font-medium text-ink-3">
                        {m.key}
                      </span>
                      {m.hashed ? (
                        <Badge tone="green">SHA-256</Badge>
                      ) : (
                        <Badge tone="muted">un-hashed</Badge>
                      )}
                    </span>
                    <span className="text-[11px] text-ink-3">
                      {m.normalisation}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeading
            title="3 · Hashing preview"
            sub="Normalise → SHA-256 on the client. Only digests leave the machine — raw PII never does."
          />
          <div className="flex flex-col gap-1.5">
            {orderedSchema.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                Select at least one match key to preview the hashed row.
              </p>
            ) : (
              orderedSchema.map(k => {
                const meta = SCHEMA_KEY_META[k];
                const raw = SAMPLE_ROW[k] || '(empty)';
                const hashed = normaliseForKey(k, SAMPLE_ROW[k]);
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[11px]">
                    <span className="w-24 shrink-0 font-semibold text-ink">
                      {meta.label}
                    </span>
                    <span className="w-32 shrink-0 truncate text-ink-2">
                      {raw}
                    </span>
                    <KeyRound
                      className="size-3 shrink-0 text-ink-3"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono tabular-nums text-ink-3">
                      {meta.hashed ? hashed : `${hashed} (sent as-is)`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <MatchRing rate={estimate} size={84} stroke={8} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                Estimated match rate
              </p>
              <p className="text-lg font-bold" style={{color: band.colorVar}}>
                {band.label}
              </p>
              <p className="mt-1 text-[12px] text-ink-2">
                ≈ {formatCount(estMatched)} of {formatCount(rows)} rows matched
                with {orderedSchema.length} key
                {orderedSchema.length === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            Estimate only — a real match rate is returned by the API after the
            session completes. Multi-key uploads match more people.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-[color:var(--green)]" />
            <span className="text-sm font-bold text-ink">Session plan</span>
          </div>
          <dl className="flex flex-col gap-1 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Endpoint</dt>
              <dd className="font-mono text-ink">&lt;AUDIENCE_ID&gt;/users</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Batches</dt>
              <dd className="tabular-nums font-semibold text-ink">{batches}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">batch_seq</dt>
              <dd className="tabular-nums text-ink">1 … {batches}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">last_batch_flag</dt>
              <dd className="text-ink">true on batch {batches}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Session TTL</dt>
              <dd className="text-ink">~90 min</dd>
            </div>
          </dl>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            onUpload(account, name.trim(), source, orderedSchema, rows);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          <Upload className="size-4" />
          Create &amp; upload audience
        </button>
        {account.tosAccepted ? null : (
          <p className="text-center text-[11px] text-[color:var(--rose)]">
            Accept Custom Audience terms for this account first.
          </p>
        )}
      </div>
    </div>
  );
}
