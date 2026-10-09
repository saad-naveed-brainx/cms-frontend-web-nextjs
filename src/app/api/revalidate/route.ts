import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { siteTag } from '@/lib/site-cache';

/** The most addresses one site can have (the API allows ten); more is not a site of ours. */
const MAX_HOSTS = 20;

const sameSecret = (given: string, expected: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * The API tells the website to forget one site (CNT-08, D-032): `POST` with
 * `Authorization: Bearer <REVALIDATE_SECRET>` and `{ "hosts": ["cafe.example.com", …] }`, the site's
 * addresses. Every answer cached for those addresses is dropped at once (`expire: 0`), so the next
 * visitor sees the change. Without the secret configured there is no cache and nothing to forget
 * (404); a wrong secret is a 401, a body that is not a list of addresses a 400.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ message: 'Not found' }, { status: 404 });
  if (!sameSecret(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const hosts = (body as { hosts?: unknown } | null)?.hosts;
  if (
    !Array.isArray(hosts) ||
    hosts.length === 0 ||
    hosts.length > MAX_HOSTS ||
    !hosts.every((host) => typeof host === 'string' && host.length > 0 && host.length <= 253)
  ) {
    return Response.json({ message: 'hosts must be a list of the site’s addresses' }, { status: 400 });
  }

  const tags = [...new Set(hosts.map(siteTag))];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ forgotten: tags });
}
