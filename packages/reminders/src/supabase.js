/**
 * Service-role client for the reminder job. The app never uses this — the
 * service role key bypasses row level security, so it stays on the proxy.
 */

async function rpc(url, serviceKey, fn, args, fetchImpl) {
  const res = await fetchImpl(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args ?? {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rpc ${fn} failed (${res.status})`);
  if (!text) return null;
  return JSON.parse(text);
}

export function createSupabaseReminderDb({ url, serviceKey, fetchImpl = fetch }) {
  const base = url.replace(/\/$/, '');
  const call = (fn, args) => rpc(base, serviceKey, fn, args, fetchImpl);

  return {
    async placesMissingTimeZone() {
      const rows = await call('places_missing_time_zone') ?? [];
      return rows.map(row => ({ id: row.id, lat: row.lat, lng: row.lng }));
    },
    setPlaceTimeZone(id, zone) {
      return call('set_place_time_zone', { p_place: id, p_zone: zone });
    },
    async claim(now) {
      const rows = await call('claim_event_reminders', { p_now: now.toISOString() }) ?? [];
      return rows.map(row => ({ sendId: row.send_id }));
    },
    async context(sendId, now) {
      const rows = await call('reminder_send_context', { p_send: sendId, p_now: now.toISOString() }) ?? [];
      const row = rows[0];
      if (!row) return null;
      return {
        eligible: row.eligible,
        denId: row.den_id,
        placeId: row.place_id,
        eventName: row.event_name,
        offsetDays: row.offset_days,
        recipientVoted: row.recipient_voted,
        otherVoterNames: row.other_voter_names ?? [],
        tokens: row.eligible ? (row.tokens ?? []) : [],
      };
    },
    finish(sendId, status, error) {
      return call('finish_event_reminder', { p_send: sendId, p_status: status, p_error: error });
    },
    release(sendId) {
      return call('release_event_reminder', { p_send: sendId });
    },
    disableToken(token) {
      return call('disable_push_token', { p_token: token });
    },
  };
}
