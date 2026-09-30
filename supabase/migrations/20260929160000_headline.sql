-- ============================================================================
-- Headline: what is happening at a place, not just where it is.
--
-- A reel of the "@chanelofficial cafe pop up at @dineencoffeeco" saved as
-- "Dineen Coffee Co. - coffee": the pin was right and the reason to go was
-- gone. The pipeline now returns a short model-written headline ("CHANEL cafe
-- pop-up") for places where something is on. Most saves have none.
--
-- It lives on the save, next to `when`, because both describe what this reel
-- said about the place - the same cafe from another reel is just a cafe.
-- den_stash reads them from the same save so a date never pairs with another
-- reel's headline. Model-written, not a copy of the caption (CLAUDE.md §7).
-- ============================================================================

alter table public.saves
  add column headline text check (char_length(headline) <= 80);

create or replace function public.save_places(
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
  v_limit int;
  v_new   int;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  if jsonb_typeof(p_places) <> 'array' or jsonb_array_length(p_places) = 0 then
    raise exception 'no_places';
  end if;
  if jsonb_array_length(p_places) > 20 then raise exception 'too_many_places'; end if;

  -- The free tier holds 25 places per Den; the owner's Pro lifts it.
  -- Serialise saves into this Den so two phones can't both slip under the cap.
  perform 1 from dens where id = p_den for update;
  v_limit := den_place_limit(p_den);
  if v_limit is not null then
    -- only places new to this Den count: re-saving one a friend already
    -- saved costs nothing, it's the same pin
    select count(distinct e2->>'googlePlaceId') into v_new
    from jsonb_array_elements(p_places) e2
    where coalesce(e2->>'googlePlaceId', '') <> ''
      and not exists (
        select 1 from saves s2 join places pl on pl.id = s2.place_id
        where s2.den_id = p_den and pl.google_place_id = e2->>'googlePlaceId');
    if v_new > 0 and (select count(distinct place_id) from saves where den_id = p_den) + v_new > v_limit then
      -- buying Pro yourself only helps if the Den is yours
      if exists (select 1 from den_members where den_id = p_den and profile_id = me and role = 'owner') then
        raise exception 'place_limit_reached' using hint = 'upgrade';
      else
        raise exception 'den_full';
      end if;
    end if;
  end if;

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
                       score, tier, engine, when_text, when_start, when_end, when_recurring,
                       headline)
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
      e->'when'->>'recurring',
      left(nullif(trim(e->>'headline'), ''), 80)
    )
    on conflict (den_id, profile_id, place_id) do update set
      note           = coalesce(excluded.note, saves.note),
      when_text      = coalesce(excluded.when_text, saves.when_text),
      when_start     = coalesce(excluded.when_start, saves.when_start),
      when_end       = coalesce(excluded.when_end, saves.when_end),
      when_recurring = coalesce(excluded.when_recurring, saves.when_recurring),
      headline       = coalesce(excluded.headline, saves.headline)
    returning * into s;

    return next s;
  end loop;
end $$;

drop function public.den_stash(uuid, double precision, double precision);

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
  headline        text,
  want_count      int,
  i_want          boolean,
  wanters         jsonb
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
    w.when_text, w.when_start, w.when_end, w.when_recurring, w.headline,
    (select count(*)::int from want_to_go x where x.den_id = p_den and x.place_id = p.id),
    exists (select 1 from want_to_go x
            where x.den_id = p_den and x.place_id = p.id and x.profile_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'profile_id', wp.id,
               'display_name', wp.display_name,
               'avatar', wp.avatar
             ) order by x.created_at, x.profile_id)
      from want_to_go x
      join profiles wp on wp.id = x.profile_id
      where x.den_id = p_den and x.place_id = p.id
    ), '[]'::jsonb)
  from saves s
  join places p on p.id = s.place_id
  left join profiles pr on pr.id = s.profile_id
  left join lateral (
    select s2.when_text, s2.when_start, s2.when_end, s2.when_recurring, s2.headline
    from saves s2
    where s2.den_id = p_den and s2.place_id = p.id
      and (s2.when_start is not null or s2.when_text is not null or s2.when_recurring is not null
           or s2.headline is not null)
    order by s2.created_at desc limit 1
  ) w on true
  where s.den_id = p_den
  group by p.id, w.when_text, w.when_start, w.when_end, w.when_recurring, w.headline
  order by min(s.created_at) desc;
end $$;

revoke all on function public.den_stash(uuid, double precision, double precision) from public, anon;
grant execute on function public.den_stash(uuid, double precision, double precision) to authenticated;
