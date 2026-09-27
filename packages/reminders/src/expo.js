/**
 * Expo Push Service. Tests pass their own fetch; nothing here runs unless
 * the dispatcher calls it.
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Drop tokens and cap length before an error is stored. */
export function publicPushError(message) {
  return String(message ?? 'push failed')
    .replace(/ExponentPushToken\[[^\]]*\]/gi, '[token]')
    .replace(/ExpoPushToken\[[^\]]*\]/gi, '[token]')
    .slice(0, 300);
}

/**
 * @param {{ to: string, title: string, body: string, data: object, sound?: string }[]} messages
 * @returns {Promise<{ token: string, ticket: { status: string, id?: string, message?: string, details?: { error?: string } } }[]>}
 */
export async function sendExpoPush(messages, { fetchImpl = fetch, accessToken } = {}) {
  if (!messages.length) return [];
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetchImpl(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(publicPushError(text || `expo push ${res.status}`));
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('expo push returned an unreadable response');
  }
  if (body.errors?.length) {
    throw new Error(publicPushError(body.errors.map(e => e.message).join('; ')));
  }
  const tickets = body.data ?? [];
  return messages.map((message, i) => ({
    token: message.to,
    ticket: tickets[i] ?? { status: 'error', message: 'missing ticket' },
  }));
}
