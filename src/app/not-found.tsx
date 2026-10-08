import Link from 'next/link';

/**
 * Shown for an address with no site, a path with no published page, a draft and an unpublished
 * page alike: the visitor is never told which. Deliberately neutral, with the shell colours rather
 * than a tenant's, because for an unknown address there is no tenant to borrow a theme from.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--shell-muted)]">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-[var(--shell-muted)]">
        There is nothing to show at this address. The page may have moved, or it may not be published yet.
      </p>
      <p>
        <Link href="/" className="underline underline-offset-4">
          Go to the home page
        </Link>
      </p>
    </main>
  );
}
