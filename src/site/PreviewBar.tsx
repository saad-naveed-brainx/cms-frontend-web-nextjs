const STATUS: Record<string, string> = {
  draft: 'a draft',
  pending_review: 'waiting for review',
  scheduled: 'scheduled',
  published: 'published',
};

/**
 * The strip over a page opened through a preview link (feature site-preview): it says plainly that
 * this is not what visitors see. Drawn inside the site's theme, with its colours only.
 */
export function PreviewBar({ status }: { status: string }) {
  const state = STATUS[status] ?? status;
  return (
    <div
      role="status"
      className="bg-[var(--site-ink)] px-4 py-2 text-center font-[family-name:var(--site-font-utility)] text-sm text-[var(--site-paper)]"
    >
      <strong>Preview</strong>
      {' · '}
      {status === 'published'
        ? 'This page is published. You are seeing it as it was last saved.'
        : `This page is ${state}. Visitors cannot see it yet.`}
    </div>
  );
}
