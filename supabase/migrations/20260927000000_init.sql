-- ============================================================================
-- Ruckus: initial schema
--
-- Everything is scoped to a Den. The privacy boundary is `saves`, because that
-- is where a person gets attached to a location; `places` is cached public map
-- data and readable by anyone signed in.
--
-- Writes go through the functions at the bottom, not through table inserts.
-- Each of them enforces something RLS alone cannot: the free-tier Den limit,
-- invite expiry, the place upsert, stripping captions from training data.
-- RLS still guards every table, so a client that skips the functions gets
-- nothing it should not have.
--
-- Errors the app is expected to handle are raised with a stable message key,
-- listed in supabase/README.md. Match on the key, not on the wording.
-- ============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;


-- ---------------------------------------------------------------------------
-- profiles: one per auth user, created by trigger
-- ---------------------------------------------------------------------------

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null default '' check (char_length(display_name) <= 40),
  avatar         text,                          -- key into the raccoon set, not a URL
  is_pro         boolean not null default false,-- written by the RevenueCat webhook only
  pro_updated_at timestamptz,
  created_at     timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'display_name',
                  split_part(coalesce(new.email, ''), '@', 1), ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- dens: the friend group. Everything below hangs off one.
-- ---------------------------------------------------------------------------

create table public.dens (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 60),
  crest       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.den_members (
  den_id      uuid not null references public.dens(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (den_id, profile_id)
);
create index den_members_profile_idx on public.den_members (profile_id);

-- Six characters from an alphabet with no 0/O or 1/I, because people read
-- these aloud and type them from a screenshot. 32 symbols, so each random
-- byte maps onto it without bias. The design shows `8FK2QD`.
create table public.den_invites (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  den_id      uuid not null references public.dens(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '14 days',
  max_uses    int not null default 50 check (max_uses > 0),
  uses        int not null default 0,
  created_at  timestamptz not null default now()
);
create index den_invites_den_idx on public.den_invites (den_id);


-- ---------------------------------------------------------------------------
-- places: one row per real-world place, shared by every Den
--
-- lat/lng rather than PostGIS: a Den's Stash is tens to hundreds of rows and
-- is always filtered by Den first, so distance is computed, not indexed. Add
-- PostGIS if "near me" ever has to work across all Dens at once.
-- ---------------------------------------------------------------------------

create table public.places (
  id               uuid primary key default gen_random_uuid(),
  google_place_id  text not null unique,
  name             text not null,
  address          text,
  neighbourhood    text,
  city             text,
  kind             text not null check (kind in ('venue', 'region', 'event', 'trail', 'accommodation')),
  category         text,
  lat              double precision check (lat between -90 and 90),
  lng              double precision check (lng between -180 and 180),
  refreshed_at     timestamptz not null default now(),   -- Google limits caching of non-id fields
  created_at       timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- saves: this person put this place in this Den, from this reel
--
-- An 8-place itinerary is 8 rows sharing one source_url. The Stash shows one
-- row per place, with everyone who saved it.
-- ---------------------------------------------------------------------------

create table public.saves (
  id              uuid primary key default gen_random_uuid(),
  den_id          uuid not null references public.dens(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,
  place_id        uuid not null references public.places(id) on delete restrict,
  source_url      text,
  source_kind     text not null default 'instagram'
                    check (source_kind in ('instagram', 'tiktok', 'manual', 'paste')),
  note            text check (char_length(note) <= 280),
  score           int,
  tier            text check (tier in ('high', 'medium', 'low')),
  engine          text check (engine in ('model', 'heuristic', 'manual')),
  -- an event is a place plus a when (CLAUDE.md §9)
  when_text       text,
  when_start      date,
  when_end        date,
  when_recurring  text,
  created_at      timestamptz not null default now(),
  unique (den_id, profile_id, place_id),
  check (when_end is null or when_start is null or when_end >= when_start)
);
create index saves_den_created_idx on public.saves (den_id, created_at desc);
create index saves_place_idx on public.saves (place_id);

-- "When enough people want to go, it becomes a plan." Per place per Den,
-- not per save: wanting to go is about the spot, not about whose reel it was.
create table public.want_to_go (
  den_id      uuid not null references public.dens(id) on delete cascade,
  place_id    uuid not null references public.places(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (den_id, place_id, profile_id)
);


-- ---------------------------------------------------------------------------
-- confirmations: every confirm tap is a labelled example (§5.8)
--
-- `offered` is rebuilt from a whitelist inside log_confirmation(), so a
-- caption or an `evidence` string (which is verbatim caption text) can never
-- land here, whatever the client sends. §5.6 and §7 depend on that.
-- ---------------------------------------------------------------------------

create table public.confirmations (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete set null,
  confirm_mode  text not null check (confirm_mode in ('single', 'choose', 'multi', 'search')),
  engine        text,
  offered       jsonb not null,
  chosen        int[] not null default '{}',   -- empty = "none of these"
  created_at    timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- security definer so policies on den_members can call it without recursing
create function public.is_den_member(p_den uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from den_members where den_id = p_den and profile_id = auth.uid()
  )
$$;

create function public.shares_den_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from den_members a
    join den_members b on a.den_id = b.den_id
    where a.profile_id = auth.uid() and b.profile_id = p_other
  )
$$;

-- The one number to change when the free tier changes. Counts Dens you belong
-- to, created or joined. CLAUDE.md §3: the paywall sells "unlimited Dens", so
-- the free limit has to be low enough to reach. null means no limit.
create function public.den_limit_for(p_profile uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when coalesce((select is_pro from profiles where id = p_profile), false)
              then null else 2 end
$$;

create function public.distance_m(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable strict as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- a malformed date from the model must not fail the whole save
create function public.try_date(p text)
returns date language plpgsql immutable as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return p::date;
exception when others then
  return null;
end $$;


-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.dens          enable row level security;
alter table public.den_members   enable row level security;
alter table public.den_invites   enable row level security;
alter table public.places        enable row level security;
alter table public.saves         enable row level security;
alter table public.want_to_go    enable row level security;
alter table public.confirmations enable row level security;

create policy "see yourself and your Den-mates" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_den_with(id));
create policy "edit your own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their Dens" on public.dens
  for select to authenticated using (public.is_den_member(id));
create policy "owners rename their Dens" on public.dens
  for update to authenticated
  using (exists (select 1 from public.den_members m
                 where m.den_id = dens.id and m.profile_id = auth.uid() and m.role = 'owner'));

create policy "members see who is in the Den" on public.den_members
  for select to authenticated using (public.is_den_member(den_id));

create policy "members see the Den's invite" on public.den_invites
  for select to authenticated using (public.is_den_member(den_id));

create policy "places are public map data" on public.places
  for select to authenticated using (true);

create policy "members see the Stash" on public.saves
  for select to authenticated using (public.is_den_member(den_id));
create policy "edit your own save's note" on public.saves
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "remove your own save" on public.saves
  for delete to authenticated using (profile_id = auth.uid());

create policy "members see who wants to go" on public.want_to_go
  for select to authenticated using (public.is_den_member(den_id));

create policy "see your own confirmations" on public.confirmations
  for select to authenticated using (profile_id = auth.uid());

-- Column-level: RLS decides which ROWS you can update, not which columns.
-- Without this a user could `update profiles set is_pro = true` on their own
-- row and unlock Pro for free.
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, avatar) on public.profiles to authenticated;
revoke update on public.dens from anon, authenticated;
grant  update (name, crest) on public.dens to authenticated;
revoke update on public.saves from anon, authenticated;
grant  update (note) on public.saves to authenticated;


-- ---------------------------------------------------------------------------
-- functions the app calls  (supabase.rpc('<name>', {...}))
-- ---------------------------------------------------------------------------

create function public.create_den(p_name text, p_crest text default null)
returns public.dens language plpgsql security definer set search_path = public as $$
declare
  me  uuid := auth.uid();
  lim int;
  d   public.dens;
begin
  if me is null then raise exception 'not_signed_in'; end if;

  -- serialise this user's Den changes so two taps can't both slip under the limit
  perform 1 from profiles where id = me for update;
  lim := den_limit_for(me);
  if lim is not null and (select count(*) from den_members where profile_id = me) >= lim then
    raise exception 'den_limit_reached' using hint = 'upgrade';
  end if;

  insert into dens (name, crest, created_by) values (trim(p_name), p_crest, me) returning * into d;
  insert into den_members (den_id, profile_id, role) values (d.id, me, 'owner');
  return d;
end $$;


create function public.create_invite(p_den uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me       uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code   text;
  b        bytea;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;

  -- hand back the live invite rather than minting a new code on every tap
  select i.code into v_code
  from den_invites i
  where i.den_id = p_den and i.expires_at > now() and i.uses < i.max_uses
  order by i.created_at desc limit 1;
  if v_code is not null then return v_code; end if;

  loop
    b := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    begin
      insert into den_invites (code, den_id, created_by) values (v_code, p_den, me);
      return v_code;
    exception when unique_violation then
      -- one in a billion; draw again
    end;
  end loop;
end $$;


create function public.join_den(p_code text)
returns public.dens language plpgsql security definer set search_path = public as $$
declare
  me  uuid := auth.uid();
  inv den_invites;
  lim int;
  d   dens;
begin
  if me is null then raise exception 'not_signed_in'; end if;

  -- forgive spaces, dashes and lower case from someone typing it off a screenshot
  select * into inv from den_invites
  where code = regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g')
  for update;
  if not found then raise exception 'invite_invalid'; end if;

  select * into d from dens where id = inv.den_id;

  -- already in: succeed quietly, even on an expired code - tapping the link
  -- twice should not produce an error
  if exists (select 1 from den_members where den_id = inv.den_id and profile_id = me) then
    return d;
  end if;

  if inv.expires_at <= now()   then raise exception 'invite_expired'; end if;
  if inv.uses >= inv.max_uses  then raise exception 'invite_used_up'; end if;

  perform 1 from profiles where id = me for update;
  lim := den_limit_for(me);
  if lim is not null and (select count(*) from den_members where profile_id = me) >= lim then
    raise exception 'den_limit_reached' using hint = 'upgrade';
  end if;

  insert into den_members (den_id, profile_id) values (inv.den_id, me);
  update den_invites set uses = uses + 1 where code = inv.code;
  return d;
end $$;


create function public.leave_den(p_den uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me       uuid := auth.uid();
  was_role text;
begin
  delete from den_members where den_id = p_den and profile_id = me returning role into was_role;
  if was_role is null then raise exception 'not_a_member'; end if;

  if not exists (select 1 from den_members where den_id = p_den) then
    delete from dens where id = p_den;               -- last one out
  elsif was_role = 'owner' then
    update den_members set role = 'owner'            -- longest-standing member takes over
    where (den_id, profile_id) = (
      select den_id, profile_id from den_members
      where den_id = p_den order by joined_at, profile_id limit 1
    );
  end if;
end $$;


-- Takes the SaveIntent from the confirm screen: ResolvedPlace[] exactly as
-- @ruckus/ingest returns them (CLAUDE.md §9). Re-saving a place you already
-- saved in this Den updates it instead of failing.
create function public.save_places(
  p_den          uuid,
  p_places       jsonb,
  p_source_url   text default null,
  p_source_kind  text default 'instagram',
  p_note         text default null,
  p_engine       text default null
)
returns setof public.saves language plpgsql security definer set search_path = public as $$
declare
  me      uuid := auth.uid();
  e       jsonb;
  v_place uuid;
  s       saves;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  if jsonb_typeof(p_places) <> 'array' or jsonb_array_length(p_places) = 0 then
    raise exception 'no_places';
  end if;
  if jsonb_array_length(p_places) > 20 then raise exception 'too_many_places'; end if;

  for e in select value from jsonb_array_elements(p_places) loop
    -- without a place id there is nothing to dedupe on and nothing to pin;
    -- the app should route these through search first
    if coalesce(e->>'googlePlaceId', '') = '' then raise exception 'place_missing_id'; end if;

    insert into places (google_place_id, name, address, neighbourhood, city, kind, category, lat, lng)
    values (
      e->>'googlePlaceId',
      coalesce(nullif(e->>'name', ''), 'Unnamed place'),
      e->>'address',
      e->>'neighbourhood',
      e->>'city',
      case when e->>'kind' in ('venue', 'region', 'event', 'trail', 'accommodation')
           then e->>'kind' else 'venue' end,
      e->>'category',
      (e->'coordinate'->>'lat')::float8,
      (e->'coordinate'->>'lng')::float8
    )
    on conflict (google_place_id) do update set
      name          = excluded.name,
      address       = coalesce(excluded.address, places.address),
      neighbourhood = coalesce(excluded.neighbourhood, places.neighbourhood),
      city          = coalesce(excluded.city, places.city),
      category      = coalesce(excluded.category, places.category),
      lat           = coalesce(excluded.lat, places.lat),
      lng           = coalesce(excluded.lng, places.lng),
      refreshed_at  = now()
    returning id into v_place;

    insert into saves (den_id, profile_id, place_id, source_url, source_kind, note,
                       score, tier, engine, when_text, when_start, when_end, when_recurring)
    values (
      p_den, me, v_place, p_source_url,
      coalesce(p_source_kind, 'instagram'),
      nullif(trim(p_note), ''),
      (e->>'score')::numeric::int,
      case when e->>'tier' in ('high', 'medium', 'low') then e->>'tier' end,
      case when p_engine in ('model', 'heuristic', 'manual') then p_engine end,
      e->'when'->>'text',
      try_date(e->'when'->>'start'),
      try_date(e->'when'->>'end'),
      e->'when'->>'recurring'
    )
    on conflict (den_id, profile_id, place_id) do update set
      note           = coalesce(excluded.note, saves.note),
      when_text      = coalesce(excluded.when_text, saves.when_text),
      when_start     = coalesce(excluded.when_start, saves.when_start),
      when_end       = coalesce(excluded.when_end, saves.when_end),
      when_recurring = coalesce(excluded.when_recurring, saves.when_recurring)
    returning * into s;

    return next s;
  end loop;
end $$;


-- The Places screen: one row per place in the Den, with everyone who saved it.
-- Pass the viewer's position to get distances for the Nearby sort; the Date
-- sort uses when_start. Sorting is left to the client, which has both.
create function public.den_stash(
  p_den uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  place_id        uuid,
  google_place_id text,
  name            text,
  address         text,
  neighbourhood   text,
  city            text,
  kind            text,
  category        text,
  lat             double precision,
  lng             double precision,
  distance_m      double precision,
  first_saved_at  timestamptz,
  savers          jsonb,
  note            text,
  source_urls     text[],
  when_text       text,
  when_start      date,
  when_end        date,
  when_recurring  text,
  want_count      int,
  i_want          boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;

  return query
  select
    p.id, p.google_place_id, p.name, p.address, p.neighbourhood, p.city, p.kind, p.category,
    p.lat, p.lng,
    distance_m(p_lat, p_lng, p.lat, p.lng),
    min(s.created_at),
    coalesce(jsonb_agg(distinct jsonb_build_object(
      'profile_id', pr.id, 'display_name', pr.display_name, 'avatar', pr.avatar
    )) filter (where pr.id is not null), '[]'::jsonb),
    (array_agg(s.note order by s.created_at desc) filter (where s.note is not null))[1],
    array_remove(array_agg(distinct s.source_url), null),
    w.when_text, w.when_start, w.when_end, w.when_recurring,
    (select count(*)::int from want_to_go x where x.den_id = p_den and x.place_id = p.id),
    exists (select 1 from want_to_go x
            where x.den_id = p_den and x.place_id = p.id and x.profile_id = auth.uid())
  from saves s
  join places p on p.id = s.place_id
  left join profiles pr on pr.id = s.profile_id
  left join lateral (
    -- the most recent save that knew when this happens
    select s2.when_text, s2.when_start, s2.when_end, s2.when_recurring
    from saves s2
    where s2.den_id = p_den and s2.place_id = p.id
      and (s2.when_start is not null or s2.when_text is not null or s2.when_recurring is not null)
    order by s2.created_at desc limit 1
  ) w on true
  where s.den_id = p_den
  group by p.id, w.when_text, w.when_start, w.when_end, w.when_recurring
  order by min(s.created_at) desc;
end $$;


create function public.set_want_to_go(p_den uuid, p_place uuid, p_want boolean)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  if not exists (select 1 from saves where den_id = p_den and place_id = p_place) then
    raise exception 'place_not_in_stash';
  end if;

  if p_want then
    insert into want_to_go (den_id, place_id, profile_id) values (p_den, p_place, auth.uid())
    on conflict do nothing;
  else
    delete from want_to_go where den_id = p_den and place_id = p_place and profile_id = auth.uid();
  end if;

  return (select count(*)::int from want_to_go where den_id = p_den and place_id = p_place);
end $$;


create function public.log_confirmation(
  p_mode    text,
  p_offered jsonb,
  p_chosen  int[] default '{}',
  p_engine  text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me    uuid := auth.uid();
  clean jsonb;
  v_id  uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;

  -- rebuild from a whitelist. Anything else the client sent - a caption, an
  -- `evidence` quote, `reasons` - is dropped here, not trusted to be absent.
  select coalesce(jsonb_agg(jsonb_build_object(
           'name',          e->>'name',
           'googlePlaceId', e->>'googlePlaceId',
           'kind',          e->>'kind',
           'score',         e->'score',
           'tier',          e->>'tier'
         ) order by ord), '[]'::jsonb)
  into clean
  from jsonb_array_elements(coalesce(p_offered, '[]'::jsonb)) with ordinality as t(e, ord);

  insert into confirmations (profile_id, confirm_mode, engine, offered, chosen)
  values (me, p_mode, p_engine, clean, coalesce(p_chosen, '{}'))
  returning id into v_id;
  return v_id;
end $$;


-- ---------------------------------------------------------------------------
-- execute grants: signed-in users only
-- ---------------------------------------------------------------------------

do $$
declare f text;
begin
  foreach f in array array[
    'create_den(text,text)', 'create_invite(uuid)', 'join_den(text)', 'leave_den(uuid)',
    'save_places(uuid,jsonb,text,text,text,text)', 'den_stash(uuid,double precision,double precision)',
    'set_want_to_go(uuid,uuid,boolean)', 'log_confirmation(text,jsonb,integer[],text)',
    'is_den_member(uuid)', 'shares_den_with(uuid)', 'den_limit_for(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- realtime: a friend's save appears on your map without a refresh
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.saves, public.want_to_go;
  end if;
end $$;
