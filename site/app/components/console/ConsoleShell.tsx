'use client';

import {ChevronRight, Menu, X} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

import {CATEGORIES, getCategory, getSolution, SOLUTIONS} from '@/lib/catalogue';

import {ThemeToggle} from '../portal/ThemeToggle';

const SPECTRUM =
  'linear-gradient(90deg, var(--light-blue), var(--purple), var(--rose), var(--yellow), var(--green))';

/** Slug of the currently-open tool, from the /solutions/<slug>/demo path. */
function slugFromPath(pathname: string | null): string | undefined {
  const m = pathname?.match(/\/solutions\/([^/]+)/);
  return m?.[1];
}

export function ConsoleShell({
  children,
  activeSlug,
}: {
  children: React.ReactNode;
  activeSlug?: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const active = activeSlug ?? slugFromPath(pathname);
  const activeSolution = active ? getSolution(active) : undefined;

  const groups = CATEGORIES.map(category => ({
    category,
    solutions: SOLUTIONS.filter(s => s.category === category.id),
  }));

  const nav = (
    <nav className="flex flex-col gap-0.5">
      <NavGroupLabel>Workspace</NavGroupLabel>
      <NavItem href="/" active={!active} accentVar="var(--brand)">
        Overview
      </NavItem>
      {groups.map(({category, solutions}) => (
        <div key={category.id}>
          <NavGroupLabel>{category.label}</NavGroupLabel>
          {solutions.map(s => (
            <NavItem
              key={s.slug}
              href={`/solutions/${s.slug}/demo`}
              active={s.slug === active}
              accentVar={category.accentVar}
              onNavigate={() => {
                setNavOpen(false);
              }}>
              {s.name}
            </NavItem>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Sidebar (lg+) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <BrandHeader />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">{nav}</div>
        <div className="border-t border-border px-4 py-3 text-[11px] text-ink-3">
          Agency API Solutions · Prototype
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => {
              setNavOpen(true);
            }}
            aria-label="Open navigation"
            className="grid size-9 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface-2 lg:hidden">
            <Menu className="size-5" />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[13px]">
            <Link
              href="/"
              className="text-ink-3 transition-colors hover:text-ink">
              Overview
            </Link>
            {activeSolution ? (
              <>
                <ChevronRight className="size-3.5 text-ink-3" aria-hidden />
                <span className="text-ink-3">
                  {getCategory(activeSolution.category).label}
                </span>
                <ChevronRight className="size-3.5 text-ink-3" aria-hidden />
                <span className="font-semibold text-ink">
                  {activeSolution.name}
                </span>
              </>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile nav drawer */}
      {navOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setNavOpen(false);
            }}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <BrandHeader compact />
              <button
                type="button"
                onClick={() => {
                  setNavOpen(false);
                }}
                aria-label="Close navigation"
                className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2">
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {nav}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Meta "infinity" brand mark. */
function MetaLogo({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden>
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.157-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
    </svg>
  );
}

function BrandHeader({compact = false}: {compact?: boolean}) {
  return (
    <div className={compact ? '' : 'px-4 pb-3 pt-4'}>
      <Link href="/" className="flex items-center gap-2.5">
        <span
          className="grid size-8 place-items-center rounded-[9px] text-on-brand shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, var(--meta-blue), var(--light-blue))',
          }}
          aria-hidden>
          <MetaLogo className="size-[17px]" />
        </span>
        <span className="text-[15px] font-bold tracking-[-0.01em] text-ink">
          Agency API <span className="font-medium text-ink-2">Solutions</span>
        </span>
      </Link>
      {compact ? null : (
        <div
          className="ml-[42px] mt-2 h-[3px] w-9 rounded-full"
          style={{background: SPECTRUM}}
          aria-hidden
        />
      )}
    </div>
  );
}

function NavGroupLabel({children}: {children: React.ReactNode}) {
  return (
    <div className="mt-4 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">
      {children}
    </div>
  );
}

function NavItem({
  href,
  active,
  accentVar,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  accentVar: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'font-semibold text-brand-ink'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      ].join(' ')}
      style={
        active
          ? {background: 'color-mix(in srgb, var(--brand) 10%, transparent)'}
          : undefined
      }>
      {active ? (
        <span
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r"
          style={{background: 'var(--brand)'}}
          aria-hidden
        />
      ) : null}
      <span
        className="size-[7px] shrink-0 rounded-full"
        style={{background: accentVar}}
        aria-hidden
      />
      <span className="truncate">{children}</span>
    </Link>
  );
}
