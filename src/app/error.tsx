'use client';

/**
 * Shown when a page cannot be drawn because something behind it failed (the API is down or sent
 * something unusable). Says so plainly, never a stack trace. A site that does not exist is a 404,
 * not this.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--shell-muted)]">Error</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page can’t load right now</h1>
      <p className="text-[var(--shell-muted)]">Something went wrong on our side. Try again in a moment.</p>
      <p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-[var(--shell-line)] bg-[var(--shell-panel)] px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </p>
    </main>
  );
}
