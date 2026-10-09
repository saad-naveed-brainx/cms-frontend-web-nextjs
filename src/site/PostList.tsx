import Link from 'next/link';
import { Eyebrow, Heading, Section } from '@/blocks/ui';
import type { PublicListing } from '@/lib/public-api';

/** "5 October 2026", in UTC so a post reads the same date everywhere. */
function dateOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The address of one page of the list: page 1 is the plain address, the rest `?page=n`. */
const pageHref = (path: string, page: number) => (page <= 1 ? path : `${path}?page=${page}`);

/**
 * A blog page (feature blog-page): a type's published items, newest first, each with its date and a
 * link, and links to newer and older ones. Drawn with the blocks' own type and spacing, and only the
 * site's colours.
 */
export function PostList({ listing }: { listing: PublicListing['listing'] }) {
  const { items, page, pageSize, total, title, path } = listing;
  const newer = page > 1 ? pageHref(path, page - 1) : null;
  const older = page * pageSize < total ? pageHref(path, page + 1) : null;

  return (
    <Section>
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <Heading level={1}>{title}</Heading>
        {items.length === 0 ? (
          <p className="text-[var(--site-muted)]">Nothing has been published here yet.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
            {items.map((item) => (
              <li key={item.path} className="flex flex-col gap-2 py-6">
                {item.publishedAt ? (
                  <Eyebrow>
                    <time dateTime={item.publishedAt}>{dateOf(item.publishedAt)}</time>
                  </Eyebrow>
                ) : null}
                <h2 className="font-[family-name:var(--site-font-display)] text-2xl leading-tight">
                  <Link href={item.path} className="hover:underline hover:decoration-[var(--site-accent)]">
                    {item.title}
                  </Link>
                </h2>
              </li>
            ))}
          </ol>
        )}
        {newer || older ? (
          <nav
            aria-label={`${title} pages`}
            className="flex justify-between font-[family-name:var(--site-font-utility)] text-sm"
          >
            {newer ? <Link href={newer}>← Newer</Link> : <span />}
            {older ? <Link href={older}>Older →</Link> : null}
          </nav>
        ) : null}
      </div>
    </Section>
  );
}
