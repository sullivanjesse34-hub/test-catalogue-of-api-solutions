'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {ApiCall, ApiCallInput} from '@/lib/api-console/types';

import {ApiConsoleDrawer} from './ApiConsoleDrawer';

interface ApiConsoleValue {
  calls: ApiCall[];
  /** Append a call; returns its id (use with `update` for async resolution). */
  record: (call: ApiCallInput) => string;
  /** Patch an existing call, e.g. pending → success once a job resolves. */
  update: (id: string, patch: Partial<ApiCall>) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ApiConsoleContext = createContext<ApiConsoleValue | null>(null);

export function useApiConsole(): ApiConsoleValue {
  const ctx = useContext(ApiConsoleContext);
  if (!ctx) {
    throw new Error('useApiConsole must be used within an ApiConsoleProvider');
  }
  return ctx;
}

export function ApiConsoleProvider({children}: {children: React.ReactNode}) {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [open, setOpen] = useState(false);
  const seqRef = useRef(0);

  const record = useCallback((call: ApiCallInput): string => {
    const seq = ++seqRef.current;
    const id = `console-${seq}`;
    setCalls(prev => [...prev, {...call, id, seq}]);
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<ApiCall>) => {
    setCalls(prev =>
      prev.map(c => (c.id === id ? {...c, ...patch, id: c.id, seq: c.seq} : c)),
    );
  }, []);

  const clear = useCallback(() => {
    setCalls([]);
  }, []);

  // While the panel is open, push page content left on wide screens so the demo
  // stays fully visible and clickable (the panel is non-modal — no backdrop).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      document.body.style.transition = 'padding-right 300ms ease';
      document.body.style.paddingRight = open && mq.matches ? '400px' : '';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.body.style.paddingRight = '';
    };
  }, [open]);

  const value = useMemo(
    () => ({calls, record, update, clear, open, setOpen}),
    [calls, record, update, clear, open],
  );

  return (
    <ApiConsoleContext.Provider value={value}>
      {children}
      <ApiConsoleDrawer />
    </ApiConsoleContext.Provider>
  );
}

/**
 * Record a demo's initial-load reads once per `key`. Re-fires when `key`
 * changes (e.g. the user switches catalogue/account), but is guarded against
 * StrictMode double-mounts and re-renders so it never storms the console.
 *
 * `factory` is read lazily inside the effect, so callers can inline it without
 * needing to memoise.
 */
export function useApiLoads(key: string, factory: () => ApiCallInput[]): void {
  const {record} = useApiConsole();
  const seenRef = useRef<Set<string>>(new Set());
  const factoryRef = useRef(factory);

  // Keep the latest factory without reading/writing the ref during render.
  useEffect(() => {
    factoryRef.current = factory;
  });

  useEffect(() => {
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);
    for (const call of factoryRef.current()) {
      record(call);
    }
  }, [key, record]);
}
