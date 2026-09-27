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
    w.when_text, w.when_start, w.when_end, w.when_recurring,
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

revoke all on function public.den_stash(uuid, double precision, double precision) from public, anon;
grant execute on function public.den_stash(uuid, double precision, double precision) to authenticated;
