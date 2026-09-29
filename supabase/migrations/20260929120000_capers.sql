-- ============================================================================
-- Capers: a saved place turned into a plan - one place, one day, who's going.
--
-- The app kept these in memory until now, so a Caper vanished when the app
-- closed and friends never saw it. Shapes match the app's `Caper` type:
-- { id, denId, placeId, date, time, createdBy, going[] }.
--
-- A place can have several Capers on different days, but only one per day:
-- making a Caper again for the same place and day updates it (the time, who's
-- going) rather than adding a duplicate.
-- ============================================================================

create table public.capers (
  id          uuid primary key default gen_random_uuid(),
  den_id      uuid not null references public.dens(id) on delete cascade,
  place_id    uuid not null references public.places(id) on delete cascade,
  day         date not null,
  time_text   text check (char_length(time_text) <= 40),   -- "7 pm"; free text, as the app offers it
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (den_id, place_id, day)
);
create index capers_den_day_idx on public.capers (den_id, day);

create table public.caper_going (
  caper_id    uuid not null references public.capers(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (caper_id, profile_id)
);

alter table public.capers      enable row level security;
alter table public.caper_going enable row level security;

create policy "members see the Den's Capers" on public.capers
  for select to authenticated using (public.is_den_member(den_id));
create policy "members see who's going" on public.caper_going
  for select to authenticated
  using (exists (select 1 from public.capers c where c.id = caper_going.caper_id and public.is_den_member(c.den_id)));

-- writes only through make_caper(), which checks the place and the people
revoke insert, update, delete on public.capers, public.caper_going from anon, authenticated;


create function public.make_caper(
  p_den    uuid,
  p_place  uuid,
  p_day    date,
  p_time   text default null,
  p_going  uuid[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  if not exists (select 1 from saves where den_id = p_den and place_id = p_place) then
    raise exception 'place_not_in_stash';
  end if;
  if p_day is null then raise exception 'caper_needs_a_day'; end if;

  insert into capers (den_id, place_id, day, time_text, created_by)
  values (p_den, p_place, p_day, nullif(trim(p_time), ''), auth.uid())
  on conflict (den_id, place_id, day) do update set time_text = excluded.time_text
  returning id into v_id;

  -- who's going: only people actually in this Den, whatever the app sends
  delete from caper_going where caper_id = v_id;
  insert into caper_going (caper_id, profile_id)
  select v_id, m.profile_id
  from den_members m
  where m.den_id = p_den and m.profile_id = any(coalesce(p_going, '{}'))
  on conflict do nothing;

  return v_id;
end $$;

revoke execute on function public.make_caper(uuid, uuid, date, text, uuid[]) from public, anon;
grant  execute on function public.make_caper(uuid, uuid, date, text, uuid[]) to authenticated;


-- a friend's new plan shows up without a refresh, like saves and votes
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.capers, public.caper_going;
  end if;
end $$;
