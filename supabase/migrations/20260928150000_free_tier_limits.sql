-- ============================================================================
-- Free tier: 3 Dens per person, 25 places per Den. Ruckus Pro lifts both.
--
-- Dens count against the person (created or joined, as before - only the
-- number changes from 2 to 3). Places count against the Den, and it's the
-- Den OWNER's Pro that lifts that cap: decided 28 Sept. So a member who isn't
-- the owner and hits the cap gets `den_full` ("ask the owner"), not the
-- paywall - buying Pro themselves wouldn't unlock someone else's Den.
--
-- Nothing already saved is removed if a Den is over the cap; it just can't
-- grow until the owner upgrades or places are removed.
-- ============================================================================

-- 2 -> 3. Still the one number to change for the Den limit.
create or replace function public.den_limit_for(p_profile uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when coalesce((select is_pro from profiles where id = p_profile), false)
              then null else 3 end
$$;

-- The one number to change for the place limit. null means no limit.
-- Ownership moves on when an owner leaves (leave_den), so this follows it.
create function public.den_place_limit(p_den uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when coalesce((
      select p.is_pro from den_members m join profiles p on p.id = m.profile_id
      where m.den_id = p_den and m.role = 'owner' limit 1), false)
    then null else 25 end
$$;

-- What the app shows: "18 of 25 places", and whether an upgrade is yours to make.
create function public.den_capacity(p_den uuid)
returns table (places int, place_limit int, i_own_it boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  return query select
    (select count(distinct place_id)::int from saves where den_id = p_den),
    den_place_limit(p_den),
    exists (select 1 from den_members where den_id = p_den and profile_id = auth.uid() and role = 'owner');
end $$;

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

revoke execute on function public.den_place_limit(uuid) from public, anon;
revoke execute on function public.den_capacity(uuid) from public, anon;
grant  execute on function public.den_place_limit(uuid) to authenticated;
grant  execute on function public.den_capacity(uuid) to authenticated;
