import {ArrowLeft, Clock} from 'lucide-react';
import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';

import {CATEGORY_ICON} from '@/app/components/portal/icons';
import {ThemeToggle} from '@/app/components/portal/ThemeToggle';
import {getCategory, getSolution, SOLUTIONS} from '@/lib/catalogue';

export function generateStaticParams() {
  return SOLUTIONS.map(s => ({slug: s.slug}));
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{slug: string}>;
}) {
  const {slug} = await params;
  const solution = getSolution(slug);
  if (!solution) notFound();

  // The solution itself is its demo — clicking a card opens the solution.
  if (solution.demo) redirect(`/solutions/${slug}/demo`);

  const category = getCategory(solution.category);
  const Icon = CATEGORY_ICON[category.id];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink">
            <ArrowLeft className="size-4" />
            Catalogue
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-md"
            style={{
              color: category.accentVar,
              background: `color-mix(in srgb, ${category.accentVar} 14%, transparent)`,
            }}
            aria-hidden>
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium text-ink-2">
            {category.label}
          </span>
        </div>

        <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
          {solution.name}
        </h1>

        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span
            className="grid size-11 place-items-center rounded-full"
            style={{
              color: category.accentVar,
              background: `color-mix(in srgb, ${category.accentVar} 12%, transparent)`,
            }}
            aria-hidden>
            <Clock className="size-5" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">Coming soon</p>
          <p className="mt-1 max-w-md text-[14px] leading-relaxed text-ink-2">
            This solution is being built. Explore the solutions that are ready
            from the catalogue.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus)]">
            <ArrowLeft className="size-4" />
            Back to catalogue
          </Link>
        </div>
      </main>
    </div>
  );
}
