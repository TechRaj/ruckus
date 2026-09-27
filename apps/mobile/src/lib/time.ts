/**
 * Relative dates the way a feed shows them: "today", "yesterday", "3d", "2w".
 * A bare count on the right of a row is data slop; this is the one formatter.
 */
export function ago(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}
