'use client';

import {Moon, Sun} from 'lucide-react';
import {useSyncExternalStore} from 'react';

type Mode = 'light' | 'dark';

// Listeners notified when the theme is toggled (matchMedia covers system changes).
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener('change', callback);
  };
}

function getSnapshot(): Mode {
  const stored = document.documentElement.dataset.theme;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getServerSnapshot(): Mode {
  return 'light';
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = mode === 'dark';

  const toggle = () => {
    const next: Mode = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage may be unavailable (private mode); the in-session toggle still works.
    }
    listeners.forEach(l => {
      l();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className="grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
