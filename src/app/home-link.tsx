'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The addresses of a site's front page (D-037): `/`, and `/home`, where the same page is kept. */
const FRONT_PAGE = ['/', '/home'];

/**
 * The not-found page's way back to the site's front page, left out on the front page itself: a site
 * whose front page is missing or not published would send the visitor to the same "Page not found".
 * A not-found page is given no props, so the address is read here, as Next.js's guide says to.
 */
export function HomeLink() {
  const pathname = usePathname();
  if (FRONT_PAGE.includes(pathname)) return null;
  return (
    <p>
      <Link href="/" className="underline underline-offset-4">
        Go to the home page
      </Link>
    </p>
  );
}
