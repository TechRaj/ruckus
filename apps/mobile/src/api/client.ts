/**
 * The single seam between the UI and the backend.
 *
 * Every screen calls `api.*` and nothing else. Two adapters satisfy the
 * interface in `types.ts`: the in-memory mock, and the real one over
 * @ruckus/api + @ruckus/ingest. USE_MOCKS picks — no screen changes, no
 * imports to chase.
 *
 * The real adapter needs EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * and EXPO_PUBLIC_PROXY_URL in apps/mobile/.env (see .env.example); with no
 * URL set, the mock is used. With the mock, sign in with any email and any
 * six digits.
 */
import { Api } from './types';
import { mockApi } from './mock';

export const USE_MOCKS = !process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Required lazily so the mock path never loads supabase-js or AsyncStorage. */
export const api: Api = USE_MOCKS ? mockApi : (require('./ruckus') as { ruckusApi: Api }).ruckusApi;
