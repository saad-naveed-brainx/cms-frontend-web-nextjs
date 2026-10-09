/**
 * A preview link the API refused: out of date (they last 30 minutes), tampered with, or not a link
 * at all. Neutral shell colours, like the not-found page: there is no site to borrow a theme from.
 */
export function PreviewExpired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--shell-muted)]">Preview</p>
      <h1 className="text-3xl font-semibold tracking-tight">This preview link has expired</h1>
      <p className="text-[var(--shell-muted)]">
        Preview links work for 30 minutes. Open the page in the admin and press Preview again for a new one.
      </p>
    </main>
  );
}
