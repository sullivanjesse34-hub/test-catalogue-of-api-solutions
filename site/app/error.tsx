'use client';

export default function RouteError({reset}: {reset: () => void}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
          Something went wrong
        </h1>
        <p className="mt-2 text-[14px] text-ink-2">
          This page failed to render. Try again, or head back to the overview.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand">
          Try again
        </button>
      </div>
    </div>
  );
}
