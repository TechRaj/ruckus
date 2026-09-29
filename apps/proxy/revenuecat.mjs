/**
 * revenuecat.mjs - who is Pro, decided by asking RevenueCat.
 *
 * The webhook used to decide from the event TYPE alone: any purchase granted
 * Pro, any EXPIRATION removed it. That broke three ways - a purchase of
 * something that isn't Pro granted it, a lapsed monthly removed Pro from
 * someone who also owned lifetime, and restoring onto another account
 * (TRANSFER) was ignored. Now an event only says "this user changed"; the
 * answer comes from RevenueCat's own record of their entitlements.
 *
 * Pure apart from fetchSubscriber(), so the decisions are unit-tested.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every Supabase user an event concerns. The app logs into RevenueCat with
 * the Supabase user id, so real users are UUIDs; anonymous RevenueCat ids
 * ($RCAnonymousID:...) and test ids are skipped. A TRANSFER names both the
 * account the purchase left and the one it went to - both need re-checking.
 */
export function usersInEvent(ev = {}) {
  const ids = [
    ev.app_user_id, ev.original_app_user_id,
    ...(ev.aliases ?? []), ...(ev.transferred_from ?? []), ...(ev.transferred_to ?? []),
  ];
  return [...new Set(ids.filter(id => typeof id === 'string' && UUID.test(id)))];
}

/**
 * Is `entitlementId` active on this subscriber at `now`?
 * No expiry date means non-expiring (lifetime). A billing grace period
 * counts as active - RevenueCat keeps the entitlement during it, and so do we.
 */
export function entitlementActive(subscriber, entitlementId, now = Date.now()) {
  const ent = subscriber?.entitlements?.[entitlementId];
  if (!ent) return false;
  if (ent.expires_date == null) return true;
  const until = Math.max(Date.parse(ent.expires_date) || 0, Date.parse(ent.grace_period_expires_date ?? '') || 0);
  return until > now;
}

/**
 * Only used when REVENUECAT_SECRET_KEY isn't set: decide from the event,
 * but at least only for events about this entitlement. Still can't handle a
 * user who owns lifetime AND a monthly that lapses - that needs the lookup.
 * Returns true / false, or null for "this event changes nothing".
 */
export function decideFromEvent(ev = {}, entitlementId) {
  const ids = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : []);
  if (!ids.includes(entitlementId)) return null;
  if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE',
       'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT'].includes(ev.type)) return true;
  if (ev.type === 'EXPIRATION') return false;
  return null;   // CANCELLATION and BILLING_ISSUE: still Pro until it actually expires
}

/** RevenueCat's record of one user. Needs the SECRET key (sk_...), server-side only. */
export async function fetchSubscriber(appUserId, secretKey, fetchImpl = fetch) {
  const r = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`revenuecat ${r.status}`);
  return (await r.json()).subscriber;
}
