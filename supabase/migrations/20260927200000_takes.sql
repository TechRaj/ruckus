-- ============================================================================
-- Takes: one friend's line about a place in the Stash.
--
-- One per person per place per Den - adding again replaces yours, which is
-- what the app's comment stack expects (it has no take ids). Deliberately does
-- not touch den_stash(): @ruckus/api reads takes alongside it and attaches them
-- to each row, so this migration is independent of any den_stash change.
--
-- Takes are the Den's own writing, not Instagram content, so §5.6's
-- no-retention rule doesn't apply - but they are still only visible inside the
-- Den, like everything else attached to a person.
-- ============================================================================

create table public.takes (
  den_id      uuid not null references public.dens(id) on delete cascade,
  place_id    uuid not null references public.places(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 280),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (den_id, place_id, profile_id)
);
create index takes_den_idx on public.takes (den_id, created_at);

alter table public.takes enable row level security;

create policy "members read the Den's takes" on public.takes
  for select to authenticated using (public.is_den_member(den_id));

-- writes only through the functions below, which check the place is actually
-- in this Den's Stash - RLS alone can't express that
revoke insert, update, delete on public.takes from anon, authenticated;


create function public.set_take(p_den uuid, p_place uuid, p_body text)
returns public.takes language plpgsql security definer set search_path = public as $$
declare
  body text := trim(coalesce(p_body, ''));
  t    takes;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  if not exists (select 1 from saves where den_id = p_den and place_id = p_place) then
    raise exception 'place_not_in_stash';
  end if;
  if body = '' then raise exception 'take_empty'; end if;
  if char_length(body) > 280 then raise exception 'take_too_long'; end if;

  insert into takes (den_id, place_id, profile_id, body)
  values (p_den, p_place, auth.uid(), body)
  on conflict (den_id, place_id, profile_id) do update
    set body = excluded.body, updated_at = now()   -- created_at keeps its place in the stack
  returning * into t;
  return t;
end $$;


-- Removing a take you don't have is not an error: tapping delete twice, or on
-- a stale screen, should just leave you with no take.
create function public.delete_take(p_den uuid, p_place uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;
  delete from takes where den_id = p_den and place_id = p_place and profile_id = auth.uid();
end $$;


revoke execute on function public.set_take(uuid, uuid, text) from public, anon;
revoke execute on function public.delete_take(uuid, uuid) from public, anon;
grant  execute on function public.set_take(uuid, uuid, text) to authenticated;
grant  execute on function public.delete_take(uuid, uuid) to authenticated;


-- a friend's take appears without a refresh, same as saves and votes
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.takes;
  end if;
end $$;
