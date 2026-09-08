'use client';

import {
  BarChart3,
  Calendar,
  CalendarRange,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  type LucideIcon,
  SlidersHorizontal,
  Target,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  ACCOUNTS,
  type AdAccountCapability,
  type CurvePoint,
  DEFAULT_INPUT,
  durationDays,
  formatMoneyCents,
  formatPeople,
  isFail,
  type Objective,
  OBJECTIVE_LABEL,
  type PlannerInput,
  type Platform,
  PLATFORM_LABEL,
  predict,
  type Prediction,
  seedPredictions,
  STATUS_CODE,
  STATUS_LABEL,
  statusColorVar,
  toUnixSeconds,
} from '@/lib/demos/reservation-planner';

type View = 'planner' | 'predictions' | 'account';

const DOC_RESERVATION =
  'https://developers.facebook.com/docs/marketing-api/reservation';
const DOC_PREDICTION_READ =
  'https://developers.facebook.com/docs/marketing-api/reference/reach-frequency-prediction';
const DOC_CAPABILITIES =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/capabilities';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'planner', label: 'Planner', icon: SlidersHorizontal},
  {id: 'predictions', label: 'Predictions', icon: BarChart3},
  {id: 'account', label: 'Account', icon: Globe},
];

const OBJECTIVES: Objective[] = [
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_TRAFFIC',
  'OUTCOME_SALES',
];

const PLATFORMS: Platform[] = ['facebook', 'instagram', 'audience_network'];

// The initial reads that populate the planner for the selected account.
function buildLoadCalls(account: AdAccountCapability): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `act_${account.id}`,
      summary: `Check reservation capability for ${account.name}`,
      request: {fields: 'name,currency,capabilities'},
      response: {
        name: account.name,
        currency: account.currency,
        capabilities: account.canUseReachAndFrequency
          ? ['CAN_USE_REACH_AND_FREQUENCY']
          : [],
      },
      status: 'success',
      docsUrl: DOC_CAPABILITIES,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}`,
      summary: 'Read per-country reservation restrictions (rf_spec)',
      request: {fields: 'rf_spec'},
      response: {
        rf_spec: {
          countries: account.countries.map(c => ({
            country: c.code,
            min_reach_limits: c.minReach,
            min_campaign_duration: c.minDurationDays,
            max_campaign_duration: c.maxDurationDays,
          })),
        },
      },
      status: 'success',
      docsUrl: DOC_RESERVATION,
    },
  ];
}

function cloneAccount(a: AdAccountCapability): AdAccountCapability {
  return {...a, countries: a.countries.map(c => ({...c}))};
}

export function ReservationPlannerDashboard() {
  const {record, update} = useApiConsole();
  const [selectedId, setSelectedId] = useState<string>(ACCOUNTS[0].id);
  const [view, setView] = useState<View>('planner');
  const [input, setInput] = useState<PlannerInput>(DEFAULT_INPUT);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [savedByAccount, setSavedByAccount] = useState<
    Record<string, Prediction[]>
  >(() => Object.fromEntries(ACCOUNTS.map(a => [a.id, seedPredictions(a)])));
  const [predicting, setPredicting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const predIdRef = useRef(0);

  const account = useMemo(
    () => cloneAccount(ACCOUNTS.find(a => a.id === selectedId) ?? ACCOUNTS[0]),
    [selectedId],
  );
  const saved = savedByAccount[selectedId] ?? [];

  useApiLoads(selectedId, () => buildLoadCalls(account));

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const spec =
    account.countries.find(c => c.code === input.countryCode) ??
    account.countries[0];
  const days = durationDays(input.startDate, input.endDate);

  const runPrediction = () => {
    const id = `rfp_${account.id}_${++predIdRef.current}`;
    setPredicting(true);
    setPrediction(null);

    // POST create — the prediction job returns pending, then resolves.
    const callId = record({
      method: 'POST',
      endpoint: `act_${account.id}/reachfrequencypredictions`,
      summary: 'Create reservation (reach & frequency) prediction',
      request: {
        objective: input.objective,
        prediction_mode: 1,
        start_time: toUnixSeconds(input.startDate),
        end_time: toUnixSeconds(input.endDate),
        frequency_cap: input.frequencyCap,
        budget: input.budgetCents,
        target_spec: {
          geo_locations: {countries: [input.countryCode]},
          publisher_platforms: input.platforms,
        },
      },
      response: {id, status: STATUS_CODE.PENDING},
      status: 'pending',
      docsUrl: DOC_RESERVATION,
    });

    setTimeout(() => {
      const result = predict(account, input, id);
      update(callId, {
        status: isFail(result.status) ? 'error' : 'success',
        response: {id, status: STATUS_CODE[result.status]},
      });
      // Read the resolved prediction (curve + frequency distribution).
      record({
        method: 'GET',
        endpoint: id,
        summary: 'Read prediction curve & frequency distribution',
        request: {
          fields:
            'status,reach,impression,budget,frequency_cap,curve_budget_reach,frequency_distribution_map_agg',
        },
        response: {
          status: STATUS_CODE[result.status],
          reach: result.reach,
          impression: result.impression,
          budget: result.budgetCents,
          frequency_cap: result.frequencyCap,
          curve_budget_reach: result.curve.map(p => ({
            budget: p.budgetCents,
            reach: p.reach,
            impression: p.impression,
          })),
          frequency_distribution_map_agg: {
            [String(result.reach)]: result.frequencyDistribution,
          },
        },
        status: isFail(result.status) ? 'error' : 'success',
        docsUrl: DOC_PREDICTION_READ,
      });
      setPrediction(result);
      setPredicting(false);
      flash(
        isFail(result.status)
          ? `Prediction failed · ${STATUS_LABEL[result.status]}`
          : `Prediction ready · ${formatPeople(result.reach)} reach`,
      );
    }, 700);
  };

  const reserve = (pred: Prediction) => {
    record({
      method: 'POST',
      endpoint: `act_${account.id}/reachfrequencypredictions`,
      summary: 'Reserve prediction at the selected point',
      request: {
        action: 'reserve',
        rf_prediction_id: pred.id,
        reach: pred.reach,
        budget: pred.budgetCents,
        impression: pred.impression,
      },
      response: {success: true},
      status: 'success',
      docsUrl: DOC_RESERVATION,
    });
    const reserved: Prediction = {...pred, status: 'RESERVED'};
    setSavedByAccount(prev => ({
      ...prev,
      [selectedId]: [
        reserved,
        ...(prev[selectedId] ?? []).filter(p => p.id !== pred.id),
      ],
    }));
    if (prediction?.id === pred.id) setPrediction(reserved);
    setView('predictions');
    flash(`Reserved · ${formatPeople(pred.reach)} reach locked in`);
  };

  const assign = (pred: Prediction) => {
    const adSet = `Reserved — ${OBJECTIVE_LABEL[pred.objective]} ${pred.startDate.slice(5)}`;
    record({
      method: 'POST',
      endpoint: 'ad_set_id',
      summary: 'Assign reserved prediction to an ad set',
      request: {rf_prediction_id: pred.id, buying_type: 'RESERVED'},
      response: {success: true},
      status: 'success',
      docsUrl: DOC_RESERVATION,
    });
    setSavedByAccount(prev => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).map(p =>
        p.id === pred.id ? {...p, assignedAdSet: adSet} : p,
      ),
    }));
    flash(`Assigned to ad set · ${adSet}`);
  };

  const perAccount = view === 'planner' || view === 'predictions';

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

        {perAccount ? (
          <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
            <span className="hidden sm:inline">Account</span>
            <select
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value);
                setPrediction(null);
              }}
              aria-label="Select account"
              className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
              {ACCOUNTS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === 'planner' ? (
        <PlannerView
          account={account}
          input={input}
          setInput={setInput}
          spec={spec}
          days={days}
          prediction={prediction}
          predicting={predicting}
          onPredict={runPrediction}
          onReserve={reserve}
        />
      ) : null}
      {view === 'predictions' ? (
        <PredictionsView
          account={account}
          predictions={saved}
          onReserve={reserve}
          onAssign={assign}
        />
      ) : null}
      {view === 'account' ? <AccountView /> : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Check className="size-4 text-[color:var(--green)]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planner view.
// ---------------------------------------------------------------------------

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        <Icon className="size-3.5" />
        {label}
      </span>
      {children}
    </label>
  );
}

const INPUT_CLS =
  'rounded-[10px] border-2 border-border bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand-2';

function PlannerView({
  account,
  input,
  setInput,
  spec,
  days,
  prediction,
  predicting,
  onPredict,
  onReserve,
}: {
  account: AdAccountCapability;
  input: PlannerInput;
  setInput: React.Dispatch<React.SetStateAction<PlannerInput>>;
  spec: {
    name: string;
    minReach: number;
    minDurationDays: number;
    maxDurationDays: number;
  };
  days: number;
  prediction: Prediction | null;
  predicting: boolean;
  onPredict: () => void;
  onReserve: (p: Prediction) => void;
}) {
  const togglePlatform = (p: Platform) => {
    setInput(prev => {
      const has = prev.platforms.includes(p);
      const next = has
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p];
      return {...prev, platforms: next.length > 0 ? next : prev.platforms};
    });
  };

  const durationOk =
    days >= spec.minDurationDays && days <= spec.maxDurationDays;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-base font-bold tracking-[-0.01em] text-ink">
            Plan a reservation
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Set your buy, then predict reach & frequency before locking CPMs.
          </p>
        </div>

        <Field icon={Target} label="Objective">
          <select
            value={input.objective}
            onChange={e => {
              setInput(prev => ({
                ...prev,
                objective: e.target.value as Objective,
              }));
            }}
            className={INPUT_CLS}>
            {OBJECTIVES.map(o => (
              <option key={o} value={o}>
                {OBJECTIVE_LABEL[o]}
              </option>
            ))}
          </select>
        </Field>

        <Field icon={Globe} label="Country">
          <select
            value={input.countryCode}
            onChange={e => {
              setInput(prev => ({...prev, countryCode: e.target.value}));
            }}
            className={INPUT_CLS}>
            {account.countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field icon={Users} label="Placements">
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map(p => {
              const on = input.platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    togglePlatform(p);
                  }}
                  className={[
                    'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    on
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-border text-ink-2 hover:bg-surface-2',
                  ].join(' ')}>
                  {PLATFORM_LABEL[p]}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field icon={Calendar} label="Start">
            <input
              type="date"
              value={input.startDate}
              onChange={e => {
                setInput(prev => ({...prev, startDate: e.target.value}));
              }}
              className={INPUT_CLS}
            />
          </Field>
          <Field icon={CalendarRange} label="End">
            <input
              type="date"
              value={input.endDate}
              onChange={e => {
                setInput(prev => ({...prev, endDate: e.target.value}));
              }}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <p
          className={[
            'text-[11px] font-medium',
            durationOk ? 'text-ink-3' : 'text-[color:var(--rose)]',
          ].join(' ')}>
          {days} day flight · allowed {spec.minDurationDays}–
          {spec.maxDurationDays} days
        </p>

        <Field
          icon={BarChart3}
          label={`Frequency cap · ${input.frequencyCap}/person`}>
          <input
            type="range"
            min={1}
            max={8}
            value={input.frequencyCap}
            onChange={e => {
              setInput(prev => ({
                ...prev,
                frequencyCap: Number(e.target.value),
              }));
            }}
            className="accent-[color:var(--brand)]"
            aria-label="Frequency cap"
          />
        </Field>

        <Field
          icon={SlidersHorizontal}
          label={`Budget · ${formatMoneyCents(input.budgetCents, account.currency)}`}>
          <input
            type="range"
            min={500_000}
            max={30_000_000}
            step={500_000}
            value={input.budgetCents}
            onChange={e => {
              setInput(prev => ({
                ...prev,
                budgetCents: Number(e.target.value),
              }));
            }}
            className="accent-[color:var(--brand)]"
            aria-label="Budget"
          />
        </Field>

        <button
          type="button"
          onClick={onPredict}
          disabled={predicting}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60">
          <Target className="size-4" />
          {predicting ? 'Predicting…' : 'Predict reach & frequency'}
        </button>
      </div>

      {/* Result */}
      <div className="flex flex-col gap-4">
        {prediction == null ? (
          <EmptyResult predicting={predicting} minReach={spec.minReach} />
        ) : isFail(prediction.status) ? (
          <FailResult prediction={prediction} />
        ) : (
          <PredictionResult
            prediction={prediction}
            currency={account.currency}
            onReserve={onReserve}
          />
        )}
      </div>
    </div>
  );
}

function EmptyResult({
  predicting,
  minReach,
}: {
  predicting: boolean;
  minReach: number;
}) {
  return (
    <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <div>
        <div
          className="mx-auto mb-3 grid size-12 place-items-center rounded-full"
          style={{
            color: 'var(--brand)',
            background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
          }}>
          <Target className="size-6" />
        </div>
        <p className="text-sm font-semibold text-ink">
          {predicting ? 'Running prediction…' : 'No prediction yet'}
        </p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-2">
          {predicting
            ? 'Building the reach curve for your buy.'
            : `Adjust your buy on the left, then predict. Reservations must clear the ${formatPeople(minReach)} country minimum reach.`}
        </p>
      </div>
    </div>
  );
}

function FailResult({prediction}: {prediction: Prediction}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--rose) 40%, transparent)',
        background: 'color-mix(in srgb, var(--rose) 7%, transparent)',
      }}>
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[color:var(--rose)]" />
        <div>
          <p className="text-sm font-bold text-ink">
            {STATUS_LABEL[prediction.status]}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            The prediction returned status code {STATUS_CODE[prediction.status]}
            . Adjust budget, reach, frequency cap, or flight dates and predict
            again — the reservation buy must clear the account&apos;s
            per-country
            <code className="px-1 text-ink">rf_spec</code> limits.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prediction result — KPIs + reach curve + frequency distribution.
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  accentVar,
  icon,
}: {
  label: string;
  value: string;
  accentVar?: string;
  icon?: React.ReactNode;
}) {
  const accent = accentVar ?? 'var(--brand-2)';
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
      </div>
    </div>
  );
}

function PredictionResult({
  prediction,
  currency,
  onReserve,
}: {
  prediction: Prediction;
  currency: string;
  onReserve: (p: Prediction) => void;
}) {
  const reserved = prediction.status === 'RESERVED';
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={prediction.status} />
        <span className="text-[13px] text-ink-2">{prediction.audience}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Reach" value={formatPeople(prediction.reach)} />
        <StatPill
          label="Impressions"
          value={formatPeople(prediction.impression)}
        />
        <StatPill
          label="Budget"
          value={formatMoneyCents(prediction.budgetCents, currency)}
        />
        <StatPill
          label="Pred. CPM"
          value={formatMoneyCents(prediction.cpmCents, currency)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">
            Reach vs budget (curve_budget_reach)
          </span>
          <span className="text-[11px] text-ink-3">
            Freq. cap {prediction.frequencyCap}/person
          </span>
        </div>
        <ReachCurve curve={prediction.curve} currency={currency} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">
            Frequency distribution
          </span>
          <span className="text-[11px] text-ink-3">
            People reached ≥ N times
          </span>
        </div>
        <FrequencyBars
          distribution={prediction.frequencyDistribution}
          cap={prediction.frequencyCap}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {reserved ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--brand-ink)]">
            <CheckCircle2 className="size-4" />
            Reserved
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              onReserve(prediction);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-on-brand transition-opacity hover:opacity-90">
            <CheckCircle2 className="size-4" />
            Reserve this prediction
          </button>
        )}
      </div>
    </>
  );
}

function StatusPill({status}: {status: Prediction['status']}) {
  const color = statusColorVar(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG charts.
// ---------------------------------------------------------------------------

/** Area/line curve of reach against cumulative budget. */
function ReachCurve({
  curve,
  currency,
}: {
  curve: CurvePoint[];
  currency: string;
}) {
  const W = 560;
  const H = 200;
  const padL = 44;
  const padR = 16;
  const padTop = 16;
  const padBottom = 26;
  const n = curve.length;
  const lastI = Math.max(1, n - 1);

  const reaches = curve.map(p => p.reach);
  const rMax = Math.max(...reaches) * 1.05;
  const x = (i: number) => padL + (i * (W - padL - padR)) / lastI;
  const y = (r: number) => padTop + (H - padTop - padBottom) * (1 - r / rMax);

  const line = curve
    .map((p, i) => `${x(i).toFixed(1)},${y(p.reach).toFixed(1)}`)
    .join(' ');
  const area = `${padL},${H - padBottom} ${line} ${(W - padR).toFixed(1)},${H - padBottom}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-52 w-full"
      role="img"
      aria-label="Predicted reach as budget increases">
      {[0.25, 0.5, 0.75].map(g => (
        <line
          key={g}
          x1={padL}
          x2={W - padR}
          y1={padTop + (H - padTop - padBottom) * g}
          y2={padTop + (H - padTop - padBottom) * g}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      <text x={4} y={padTop + 4} fontSize={10} fill="var(--ink-3)">
        {formatPeople(rMax)}
      </text>
      <text x={4} y={H - padBottom} fontSize={10} fill="var(--ink-3)">
        0
      </text>

      <polygon
        points={area}
        fill="color-mix(in srgb, var(--brand-2) 14%, transparent)"
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--brand-2)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {curve.map((p, i) => (
        <circle
          key={p.budgetCents}
          cx={x(i)}
          cy={y(p.reach)}
          r={i === lastI ? 4 : 2}
          fill="var(--brand-2)"
        />
      ))}

      <text x={padL} y={H - 6} fontSize={10} fill="var(--ink-3)">
        {formatMoneyCents(curve[0]?.budgetCents ?? 0, currency)}
      </text>
      <text
        x={W - padR}
        y={H - 6}
        fontSize={10}
        textAnchor="end"
        fill="var(--ink-3)">
        {formatMoneyCents(curve[lastI]?.budgetCents ?? 0, currency)} budget
      </text>
    </svg>
  );
}

/** Bar chart: people reached ≥ N times, for N = 1..10 (capped by frequency cap). */
function FrequencyBars({
  distribution,
  cap,
}: {
  distribution: number[];
  cap: number;
}) {
  const shown = distribution.slice(0, Math.max(1, Math.min(10, cap)));
  const max = Math.max(...shown, 1);
  return (
    <div className="flex flex-col gap-2">
      {shown.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-ink-2">
            ≥ {i + 1}×
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(v / max) * 100}%`,
                background: 'var(--brand)',
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink">
            {formatPeople(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Predictions view — saved / reserved predictions.
// ---------------------------------------------------------------------------

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 align-middle text-[12px] text-ink-2';

function PredictionsView({
  account,
  predictions,
  onReserve,
  onAssign,
}: {
  account: AdAccountCapability;
  predictions: Prediction[];
  onReserve: (p: Prediction) => void;
  onAssign: (p: Prediction) => void;
}) {
  if (predictions.length === 0) {
    return (
      <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-[13px] text-ink-2">
          No predictions yet — build one in the Planner tab.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-bold text-ink">
          Predictions for {account.name}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="bg-surface-2">
            <tr>
              <th className={TH}>Audience</th>
              <th className={TH}>Flight</th>
              <th className={TH}>Reach</th>
              <th className={TH}>Budget</th>
              <th className={TH}>CPM</th>
              <th className={TH}>Status</th>
              <th className={TH}>Ad set</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td className={`${TD} text-ink`}>{p.audience}</td>
                <td className={TD}>
                  {p.startDate.slice(5)} → {p.endDate.slice(5)}
                </td>
                <td className={`${TD} font-semibold text-ink`}>
                  {formatPeople(p.reach)}
                </td>
                <td className={TD}>
                  {formatMoneyCents(p.budgetCents, account.currency)}
                </td>
                <td className={TD}>
                  {formatMoneyCents(p.cpmCents, account.currency)}
                </td>
                <td className={TD}>
                  <StatusPill status={p.status} />
                </td>
                <td className={TD}>
                  {p.assignedAdSet ? (
                    <span className="text-ink">{p.assignedAdSet}</span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  {p.status === 'RESERVED' ? (
                    p.assignedAdSet ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--green)]">
                        <Check className="size-3.5" />
                        Assigned
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onAssign(p);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:bg-surface-2">
                        <ExternalLink className="size-3.5" />
                        Assign ad set
                      </button>
                    )
                  ) : p.status === 'SUCCESS' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onReserve(p);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1 text-[12px] font-semibold text-on-brand transition-opacity hover:opacity-90">
                      <CheckCircle2 className="size-3.5" />
                      Reserve
                    </button>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account view — capabilities & rf_spec restrictions.
// ---------------------------------------------------------------------------

function AccountView() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-ink-2">
        Reservation buying requires the{' '}
        <code className="rounded bg-surface-2 px-1 text-ink">
          CAN_USE_REACH_AND_FREQUENCY
        </code>{' '}
        capability. Each account&apos;s per-country{' '}
        <code className="rounded bg-surface-2 px-1 text-ink">rf_spec</code>{' '}
        limits are honoured before a prediction is submitted.
      </p>
      {ACCOUNTS.map(account => (
        <div
          key={account.id}
          className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">{account.name}</span>
            <span className="text-[11px] text-ink-3">
              act_{account.id} · {account.currency}
            </span>
            {account.canUseReachAndFrequency ? (
              <span
                className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: 'var(--green)',
                  background:
                    'color-mix(in srgb, var(--green) 15%, transparent)',
                }}>
                <Check className="size-3" />
                Reservation enabled
              </span>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Country</th>
                  <th className={TH}>Audience</th>
                  <th className={TH}>Min reach</th>
                  <th className={TH}>Duration (days)</th>
                </tr>
              </thead>
              <tbody>
                {account.countries.map(c => (
                  <tr key={c.code} className="border-t border-border">
                    <td className={`${TD} font-semibold text-ink`}>
                      {c.name} ({c.code})
                    </td>
                    <td className={TD}>{formatPeople(c.audienceSize)}</td>
                    <td className={TD}>{formatPeople(c.minReach)}</td>
                    <td className={TD}>
                      {c.minDurationDays}–{c.maxDurationDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
