/**
 * @ruckus/api - everything the app says to Supabase.
 *
 *   import { createRuckus } from '@ruckus/api';
 *   const ruckus = createRuckus({ url, anonKey, storage: AsyncStorage });
 *
 *   await ruckus.auth.sendCode('amelia@example.com');
 *   await ruckus.auth.verifyCode('amelia@example.com', '123456');
 *   const den  = await ruckus.dens.create('Toronto Shenanigans');
 *   const code = await ruckus.dens.invite(den.id);          // "8FK2QD"
 *   await ruckus.stash.save({ denId: den.id, places });      // ResolvedPlace[] from @ruckus/ingest
 *   const rows = await ruckus.stash.list(den.id, { lat, lng });
 *
 * Screens import this and nothing else. They never name a table, never write
 * SQL, and never see a Postgres error: every failure the app is expected to
 * handle arrives as a RuckusError with a stable `code` (see ERRORS below).
 *
 * Plain JavaScript with JSDoc, like @ruckus/ingest, so it runs the same in
 * Node (for tests) and in React Native.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Errors the database raises on purpose. Anything else is a bug or an outage
 * and arrives as code 'unexpected' with the original error attached.
 */
export const ERRORS = {
  not_signed_in:      'Sign in to do that.',
  not_a_member:       "You're not in that Den.",
  den_limit_reached:  "You've hit the free Den limit.",      // -> show the Ruckus Pro paywall
  invite_invalid:     "That code doesn't match any Den.",
  invite_expired:     'That invite has expired. Ask for a new one.',
  invite_used_up:     'That invite has been used too many times. Ask for a new one.',
  place_missing_id:   "We couldn't pin that place. Try searching for it.",
  place_not_in_stash: "That place isn't in this Den's Stash.",
  take_empty:         'Write something first.',
  take_too_long:      'Keep it under 280 characters.',
  no_places:          'Pick at least one place to save.',
  too_many_places:    'That is a lot of places. Save fewer at once.',
  bad_push_token:     "That device couldn't be registered for reminders.",
  bad_platform:       "That device couldn't be registered for reminders.",
};

export class RuckusError extends Error {
  /**
   * @param {keyof ERRORS | 'unexpected'} code
   * @param {unknown} [cause]
   */
  constructor(code, cause) {
    super(ERRORS[code] ?? 'Something went wrong.');
    this.name = 'RuckusError';
    this.code = code;
    /** true when the right response is the Ruckus Pro paywall */
    this.needsUpgrade = code === 'den_limit_reached';
    if (cause) this.cause = cause;
  }
}

/** Turn a supabase-js error into a RuckusError, keeping the stable key. */
function asRuckusError(err) {
  if (err instanceof RuckusError) return err;
  const msg = String(err?.message ?? '');
  // plpgsql `raise exception 'den_limit_reached'` reaches us as that exact message
  const code = Object.keys(ERRORS).find(k => msg === k || msg.startsWith(`${k}\n`));
  return new RuckusError(code ?? 'unexpected', err);
}

/** Unwrap { data, error } and throw the error in our shape. */
async function run(promise) {
  const { data, error } = await promise;
  if (error) throw asRuckusError(error);
  return data;
}

/**
 * @param {object} cfg
 * @param {string} cfg.url       SUPABASE_URL
 * @param {string} cfg.anonKey   SUPABASE_ANON_KEY - the public one. Never the service role key.
 * @param {object} [cfg.storage] where to keep the session: AsyncStorage in React Native
 */
export function createRuckus({ url, anonKey, storage } = {}) {
  if (!url || !anonKey) throw new Error('createRuckus needs { url, anonKey }');
  if (anonKey.startsWith('sb_secret_') || /service_role/.test(decodeRole(anonKey))) {
    // the service role key bypasses every rule in the schema; in an app
    // binary it is readable by anyone who downloads the app
    throw new Error('createRuckus was given the SERVICE ROLE key. Use the anon key.');
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: Boolean(storage),
      autoRefreshToken: true,
      detectSessionInUrl: false,    // no browser URL to read in React Native
    },
  });

  const rpc = (fn, args) => run(supabase.rpc(fn, args));

  /* ---------------------------------------------------------------- auth -- */

  const auth = {
    /**
     * Email a 6-digit code. Email codes instead of Sign in with Apple, which
     * needs the paid Apple Developer Program to configure.
     */
    async sendCode(email, { displayName } = {}) {
      await run(supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, data: displayName ? { display_name: displayName } : undefined },
      }));
    },

    /** Returns the signed-in user id. Pass it to RevenueCat's Purchases.logIn(). */
    async verifyCode(email, token) {
      const data = await run(supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), token: String(token).trim(), type: 'email',
      }));
      return data.user.id;
    },

    async signOut() { await run(supabase.auth.signOut()); },

    /** @returns {Promise<string|null>} current user id, or null if signed out */
    async userId() {
      const { data } = await supabase.auth.getSession();
      return data.session?.user.id ?? null;
    },

    /** Fires on sign-in and sign-out. Returns an unsubscribe function. */
    onChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    },
  };

  /* ------------------------------------------------------------- profile -- */

  const profile = {
    async me() {
      const id = await auth.userId();
      if (!id) throw new RuckusError('not_signed_in');
      return run(supabase.from('profiles').select('*').eq('id', id).single());
    },

    /** Only display_name and avatar are editable. is_pro comes from RevenueCat. */
    async update({ displayName, avatar }) {
      const id = await auth.userId();
      if (!id) throw new RuckusError('not_signed_in');
      const patch = {};
      if (displayName !== undefined) patch.display_name = displayName;
      if (avatar !== undefined) patch.avatar = avatar;
      return run(supabase.from('profiles').update(patch).eq('id', id).select().single());
    },
  };

  /* ---------------------------------------------------------------- dens -- */

  const dens = {
    /** Throws RuckusError with needsUpgrade=true when the free limit is hit. */
    create: (name, crest) => rpc('create_den', { p_name: name, p_crest: crest ?? null }),

    /** The Den's live 6-character code; the same code comes back until it expires. */
    invite: denId => rpc('create_invite', { p_den: denId }),

    /** Forgives lower case, spaces and dashes. Joining a Den you're in is fine. */
    join: code => rpc('join_den', { p_code: code }),

    leave: denId => rpc('leave_den', { p_den: denId }),

    /** Every Den you're in, newest first, with member counts and your role. */
    async mine() {
      const id = await auth.userId();
      if (!id) throw new RuckusError('not_signed_in');
      const rows = await run(supabase
        .from('den_members')
        .select('role, joined_at, dens(id, name, crest, created_at, den_members(count))')
        .eq('profile_id', id)
        .order('joined_at', { ascending: false }));
      return rows.map(r => ({
        ...r.dens,
        role: r.role,
        joinedAt: r.joined_at,
        memberCount: r.dens?.den_members?.[0]?.count ?? 1,
      }));
    },

    /** Everyone in a Den, for the People screen. */
    async members(denId) {
      const rows = await run(supabase
        .from('den_members')
        .select('role, joined_at, profiles(id, display_name, avatar)')
        .eq('den_id', denId)
        .order('joined_at'));
      return rows.map(r => ({ ...r.profiles, role: r.role, joinedAt: r.joined_at }));
    },
  };

  /* --------------------------------------------------------------- stash -- */

  const stash = {
    /**
     * The Places screen. One row per place, with everyone who saved it.
     * Pass the viewer's position for Nearby; sort by `whenStart` for Date.
     */
    async list(denId, { lat, lng } = {}) {
      // Takes live in their own table and are attached here rather than inside
      // den_stash(), so the two can change independently. Both reads are
      // guarded by the same membership rule, and they run in parallel.
      const [rows, takeRows] = await Promise.all([
        rpc('den_stash', { p_den: denId, p_lat: lat ?? null, p_lng: lng ?? null }),
        run(supabase.from('takes')
          .select('place_id, profile_id, body, created_at')
          .eq('den_id', denId)
          .order('created_at')),
      ]);
      const takesByPlace = new Map();
      for (const t of takeRows) {
        const list = takesByPlace.get(t.place_id) ?? [];
        list.push({ userId: t.profile_id, text: t.body, at: t.created_at });
        takesByPlace.set(t.place_id, list);
      }
      return rows.map(r => ({ ...toStashRow(r), takes: takesByPlace.get(r.place_id) ?? [] }));
    },

    /**
     * Save what the user picked on the confirm screen - a SaveIntent from
     * CLAUDE.md §9. `places` are ResolvedPlace objects exactly as
     * @ruckus/ingest returns them; pass only the ones the user ticked.
     */
    save({ denId, places, note, engine, sourceUrl, sourceKind = 'instagram' }) {
      if (!places?.length) throw new RuckusError('no_places');
      return rpc('save_places', {
        p_den: denId,
        p_places: places,
        p_source_url: sourceUrl ?? places[0]?.sourceUrl ?? null,
        p_source_kind: sourceKind,
        p_note: note ?? null,
        p_engine: engine ?? null,
      });
    },

    /** Toggle "want to go". Returns how many people in the Den want to go. */
    setWant: (denId, placeId, want) =>
      rpc('set_want_to_go', { p_den: denId, p_place: placeId, p_want: want }),

    /** Only your own saves can be removed. */
    async remove(saveId) {
      await run(supabase.from('saves').delete().eq('id', saveId));
    },

    /**
     * Call `cb` whenever anyone in the Den saves, removes, votes on or comments on a place,
     * so a friend's pin appears without a pull-to-refresh. Re-fetch with
     * list() inside the callback; the event only says *that* something changed.
     * Returns an unsubscribe function.
     */
    onChange(denId, cb) {
      const channel = supabase
        .channel(`den:${denId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saves', filter: `den_id=eq.${denId}` }, () => cb())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'want_to_go', filter: `den_id=eq.${denId}` }, () => cb())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'takes', filter: `den_id=eq.${denId}` }, () => cb())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    },
  };

  /* --------------------------------------------------------------- takes -- */

  const takes = {
    /**
     * Your one line about a place in the Den. Setting it again replaces it -
     * there's one take per person per place, so there are no take ids.
     * Arrives on every row from stash.list() as `takes: [{ userId, text, at }]`.
     */
    set: (denId, placeId, text) => rpc('set_take', { p_den: denId, p_place: placeId, p_body: text }),

    /** Remove yours. Fine to call when you have none. */
    remove: (denId, placeId) => rpc('delete_take', { p_den: denId, p_place: placeId }),
  };

  /* ------------------------------------------------------- confirmations -- */

  const confirmations = {
    /**
     * Log what the confirm screen offered and what the user picked (§5.8).
     * `chosen` holds indexes into `offered`; an empty array means "none of
     * these", which is the most useful signal in the app. Captions and
     * evidence are stripped by the database whatever is passed here.
     */
    log: ({ mode, offered, chosen = [], engine }) =>
      rpc('log_confirmation', { p_mode: mode, p_offered: offered, p_chosen: chosen, p_engine: engine ?? null }),
  };

  /* ------------------------------------------------------- notifications -- */

  const notifications = {
    /**
     * Remember this device for event reminders. A token belongs to the
     * signed-in user; registering it again moves it off any previous account.
     */
    registerPushToken: (token, platform) =>
      rpc('register_push_token', { p_token: token, p_platform: platform }),

    /** Drop one device. Call this before sign-out, while the session still exists. */
    unregisterPushToken: token =>
      rpc('unregister_push_token', { p_token: token }),
  };

  return { supabase, auth, profile, dens, stash, takes, confirmations, notifications };
}

/** snake_case row from den_stash() -> the camelCase shape screens use */
function toStashRow(r) {
  return {
    placeId: r.place_id,
    googlePlaceId: r.google_place_id,
    name: r.name,
    address: r.address,
    neighbourhood: r.neighbourhood,
    city: r.city,
    kind: r.kind,
    category: r.category,
    coordinate: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    distanceM: r.distance_m,
    firstSavedAt: r.first_saved_at,
    savers: (r.savers ?? []).map(s => ({ id: s.profile_id, displayName: s.display_name, avatar: s.avatar })),
    note: r.note,
    sourceUrls: r.source_urls ?? [],
    when: r.when_text || r.when_start || r.when_recurring
      ? { text: r.when_text, start: r.when_start, end: r.when_end, recurring: r.when_recurring }
      : null,
    wantCount: r.want_count,
    iWant: r.i_want,
    wanters: (r.wanters ?? []).map(w => ({ id: w.profile_id, displayName: w.display_name, avatar: w.avatar })),
  };
}

/** Read the `role` claim out of a Supabase key without verifying it. */
function decodeRole(key) {
  try {
    const payload = key.split('.')[1];
    const json = typeof atob === 'function'
      ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(payload, 'base64url').toString();
    return JSON.parse(json).role ?? '';
  } catch {
    return '';  // new-style sb_publishable_ keys are not JWTs; nothing to check
  }
}
