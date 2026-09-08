'use client';

import {ArrowLeft, ArrowRight, ArrowUpRight, Search} from 'lucide-react';
import Link from 'next/link';
import {useMemo, useState} from 'react';

import {
  CATEGORIES,
  type Category,
  type CategoryId,
  getCategory,
  type Solution,
  SOLUTIONS,
  STATUS_META,
} from '@/lib/catalogue';

import {CAT_BLURB, CAT_ICON} from './categoryMeta';

function tint(accentVar: string, pct: number): string {
  return `color-mix(in srgb, ${accentVar} ${pct}%, transparent)`;
}

function solutionsIn(id: CategoryId): Solution[] {
  return SOLUTIONS.filter(s => s.category === id);
}

export function Overview() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CategoryId | null>(null);

  const q = query.trim().toLowerCase();
  const searching = q !== '';

  const results = useMemo(
    () =>
      searching ? SOLUTIONS.filter(s => s.name.toLowerCase().includes(q)) : [],
    [q, searching],
  );

  const activeCategory = selected ? getCategory(selected) : null;

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end gap-x-3 gap-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
            Overview
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Your agency&apos;s suite of tools built on the Meta Marketing API —{' '}
            {CATEGORIES.length} categories, {SOLUTIONS.length} tools.
          </p>
        </div>
        <label className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
            }}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="w-full rounded-[10px] border-2 border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand-2"
          />
        </label>
      </div>

      {searching ? (
        <SearchResults query={query} results={results} />
      ) : activeCategory ? (
        <CategoryDetail
          category={activeCategory}
          onBack={() => {
            setSelected(null);
          }}
        />
      ) : (
        <CategoryHub onSelect={setSelected} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category hub (landing)
// ---------------------------------------------------------------------------

function CategoryHub({onSelect}: {onSelect: (id: CategoryId) => void}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map(category => {
        const Icon = CAT_ICON[category.id];
        const count = solutionsIn(category.id).length;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              onSelect(category.id);
            }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_36px_-20px_rgba(20,30,50,0.4)]">
            <div className="flex items-center justify-between">
              <span
                className="grid size-11 place-items-center rounded-xl"
                style={{
                  color: category.accentVar,
                  background: tint(category.accentVar, 14),
                }}
                aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-ink-2">
                {count} tools
              </span>
            </div>
            <h3 className="mt-3.5 text-base font-extrabold tracking-[-0.01em] text-ink">
              {category.label}
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              {CAT_BLURB[category.id]}
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-ink">
              Browse
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category detail (drill-in)
// ---------------------------------------------------------------------------

function CategoryDetail({
  category,
  onBack,
}: {
  category: Category;
  onBack: () => void;
}) {
  const Icon = CAT_ICON[category.id];
  const tools = solutionsIn(category.id);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="size-4" />
        All categories
      </button>

      <div className="mb-5 flex items-center gap-3">
        <span
          className="grid size-11 place-items-center rounded-xl"
          style={{
            color: category.accentVar,
            background: tint(category.accentVar, 14),
          }}
          aria-hidden>
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-ink">
            {category.label}
          </h2>
          <p className="text-[12.5px] text-ink-3">
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'} ·{' '}
            {CAT_BLURB[category.id]}
          </p>
        </div>
      </div>

      <ToolGrid tools={tools} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

function SearchResults({query, results}: {query: string; results: Solution[]}) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-14 text-center text-[13px] text-ink-2">
        No tools match “{query}”.
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-2">
        {results.length} {results.length === 1 ? 'result' : 'results'} for “
        {query}”
      </p>
      <ToolGrid tools={results} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: tool card grid
// ---------------------------------------------------------------------------

function ToolGrid({tools}: {tools: Solution[]}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map(s => (
        <ToolCard key={s.slug} solution={s} />
      ))}
    </div>
  );
}

function ToolCard({solution: s}: {solution: Solution}) {
  const cat = getCategory(s.category);
  const Icon = CAT_ICON[s.category];
  const status = STATUS_META[s.status];
  const statusVar =
    s.status === 'ready'
      ? 'var(--green)'
      : s.status === 'in_progress'
        ? 'var(--cat-measurement)'
        : 'var(--ink-3)';
  const href = s.demo ? `/solutions/${s.slug}/demo` : `/solutions/${s.slug}`;

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_36px_-20px_rgba(20,30,50,0.4)]">
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{background: cat.accentVar}}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <span
          className="grid size-10 place-items-center rounded-xl"
          style={{color: cat.accentVar, background: tint(cat.accentVar, 14)}}
          aria-hidden>
          <Icon className="size-5" />
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{color: statusVar, background: tint(statusVar, 14)}}>
          <span
            className="size-1.5 rounded-full"
            style={{background: statusVar}}
            aria-hidden
          />
          {status.label}
        </span>
      </div>
      <div className="mt-3 text-[14px] font-bold text-ink">{s.name}</div>
      {s.description ? (
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">
          {s.description}
        </p>
      ) : null}
      <div className="mt-3 flex items-center border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
          <span
            className="size-[7px] rounded-full"
            style={{background: cat.accentVar}}
            aria-hidden
          />
          {cat.label}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-brand-ink">
          Open
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
