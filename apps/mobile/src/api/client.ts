/**
 * Exports `api`, the backend adapter the screens call. The real adapter needs
 * EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY and
 * EXPO_PUBLIC_PROXY_URL in apps/mobile/.env. With no Supabase URL the mock is used.
 */
import { Api } from './types';
import { mockApi } from './mock';

/**
 * EXPO_PUBLIC_FIRST_RUN=1 forces the mock even when keys are set, to walk the
 * app as a brand-new person without touching a real account. `npm run mobile:first-run`.
 */
export const FIRST_RUN = process.env.EXPO_PUBLIC_FIRST_RUN === '1';
export const USE_MOCKS = FIRST_RUN || !process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Required lazily so the mock path never loads supabase-js or AsyncStorage. */
export const api: Api = USE_MOCKS ? mockApi : (require('./ruckus') as { ruckusApi: Api }).ruckusApi;
