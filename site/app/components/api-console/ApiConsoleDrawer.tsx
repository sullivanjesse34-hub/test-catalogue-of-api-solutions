'use client';

import {ChevronRight, Code2, Trash2, X} from 'lucide-react';
import {useState} from 'react';

import type {ApiCall, ApiCallStatus, HttpMethod} from '@/lib/api-console/types';

import {useApiConsole} from './ApiConsoleProvider';

// GET reads, POST writes, DELETE removes, PUT replaces — colored via theme tokens.
const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: 'var(--cat-catalogue)',
  POST: 'var(--green)',
  DELETE: 'var(--rose)',
  PUT: 'var(--cat-measurement)',
};

const STATUS_COLOR: Record<ApiCallStatus, string> = {
  pending: 'var(--cat-measurement)',
  success: 'var(--green)',
  error: 'var(--rose)',
};

const STATUS_LABEL: Record<ApiCallStatus, string> = {
  pending: 'Pending',
  success: '200 OK',
  error: 'Error',
};

function MethodChip({method}: {method: HttpMethod}) {
  const color = METHOD_COLOR[method];
  return (
    <span
      className="inline-flex min-w-[46px] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.02em]"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}>
      {method}
    </span>
  );
}

function JsonBlock({label, value}: {label: string; value: unknown}) {
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        {label}
      </p>
      <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-surface-2 p-2 text-[11px] leading-relaxed text-ink-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function CallRow({call}: {call: ApiCall}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = call.request !== undefined || call.response !== undefined;
  const statusColor = STATUS_COLOR[call.status];

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => {
          if (hasDetail) setExpanded(e => !e);
        }}
        className={[
          'flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors',
          hasDetail ? 'hover:bg-surface-2' : 'cursor-default',
        ].join(' ')}
        aria-expanded={hasDetail ? expanded : undefined}>
        {hasDetail ? (
          <ChevronRight
            className={[
              'mt-0.5 size-3.5 shrink-0 text-ink-3 transition-transform',
              expanded ? 'rotate-90' : '',
            ].join(' ')}
            aria-hidden
          />
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}
        <MethodChip method={call.method} />
        <span className="min-w-0 flex-1">
          <span className="block break-all font-mono text-[12px] text-ink">
            {call.endpoint}
          </span>
          {call.summary ? (
            <span className="mt-0.5 block text-[11px] text-ink-2">
              {call.summary}
            </span>
          ) : null}
        </span>
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold"
          style={{color: statusColor}}>
          <span
            className={[
              'size-1.5 rounded-full',
              call.status === 'pending' ? 'animate-pulse' : '',
            ].join(' ')}
            style={{background: statusColor}}
            aria-hidden
          />
          {STATUS_LABEL[call.status]}
        </span>
      </button>
      {expanded ? (
        <div className="px-3 pb-3 pl-[52px]">
          {call.request !== undefined ? (
            <JsonBlock label="Request" value={call.request} />
          ) : null}
          {call.response !== undefined ? (
            <JsonBlock label="Response" value={call.response} />
          ) : null}
          {call.docsUrl ? (
            <a
              href={call.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-block text-[11px] font-medium text-[color:var(--cat-catalogue)] hover:underline">
              API reference ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function ApiConsoleDrawer() {
  const {calls, clear, open, setOpen} = useApiConsole();
  const ordered = [...calls].sort((a, b) => b.seq - a.seq);

  return (
    <>
      {/* Toggle pill — hidden while the (non-modal) panel is open */}
      {open ? null : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="fixed right-4 top-20 z-40 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-ink shadow-sm transition-colors hover:bg-surface-2"
          aria-label="Open API calls panel">
          <Code2 className="size-4 text-[color:var(--cat-catalogue)]" />
          API calls
          {calls.length > 0 ? (
            <span className="inline-flex min-w-[18px] justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
              {calls.length}
            </span>
          ) : null}
        </button>
      )}

      {/* Drawer — non-modal (no backdrop) so the demo stays clickable while open */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-[400px] max-w-[90vw] flex-col border-l border-border bg-surface shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-hidden={!open}>
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Code2 className="size-4 text-[color:var(--cat-catalogue)]" />
          <h2 className="text-sm font-bold text-ink">API calls</h2>
          <span className="text-[11px] text-ink-3">({calls.length})</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={clear}
              disabled={calls.length === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              aria-label="Clear API calls">
              <Trash2 className="size-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
              className="grid size-7 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close API calls panel">
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {ordered.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">
              No API calls captured yet.
              <br />
              Interact with the demo to see the Meta Marketing API calls it
              would make.
            </p>
          ) : (
            <ul>
              {ordered.map(call => (
                <CallRow key={call.id} call={call} />
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border px-4 py-2.5 text-[11px] leading-snug text-ink-3">
          Demo — sample data. No real Marketing API calls are made.
        </footer>
      </aside>
    </>
  );
}
