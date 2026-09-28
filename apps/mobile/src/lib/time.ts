/** Formats a date as "today", "yesterday", "3d" or "2w". */
export function ago(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/**
 * Joins the non-empty parts with a dot, for example "Little Italy · 1.2 km".
 * Empty parts are skipped, so a place with no distance has no trailing dot.
 */
export const dotted = (...parts: (string | null | undefined)[]) =>
  parts.map(p => p?.trim()).filter(Boolean).join(' · ');
