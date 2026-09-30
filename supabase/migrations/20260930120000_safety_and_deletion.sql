-- ============================================================================
-- What App Review needs before Ruckus can ship.
--
-- Guideline 5.1.1(v): an app that makes accounts must let people delete them,
-- in the app. `delete_my_account()` does it in one transaction.
--
-- Guideline 1.2: an app with things people write (comments, Den names, display
-- names) must let people report it and block whoever wrote it. `report()`
-- files it for us to read; `block_user()` hides that person's comments from
-- you. Reports are read in the Supabase dashboard - no user can read them,
-- including the one who filed it.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- blocks: hide a person's comments from you
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "see who you blocked" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

revoke insert, update, delete on public.blocks from anon, authenticated;

-- Restrictive, so it is ANDed with "members read the Den's takes" rather than
-- widening it. Applies to realtime too, so a blocked person's new comment
-- doesn't arrive either.
create policy "hide comments from people you blocked" on public.takes
  as restrictive for select to authenticated
  using (not exists (
    select 1 from public.blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = takes.profile_id
  ));


-- Anyone whose words you can see: someone you share a Den with, or someone
-- who has left but whose comments or notes are still in one of your Dens.
create function public.can_see_words_of(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select shares_den_with(p_profile)
      or exists (select 1 from takes t where t.profile_id = p_profile and is_den_member(t.den_id))
      or exists (select 1 from saves s where s.profile_id = p_profile and s.note is not null and is_den_member(s.den_id))
$$;

create function public.block_user(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_profile = me then raise exception 'cannot_block_self'; end if;
  if not can_see_words_of(p_profile) then raise exception 'not_a_member'; end if;
  insert into blocks (blocker_id, blocked_id) values (me, p_profile) on conflict do nothing;
end $$;

create function public.unblock_user(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_profile;
end $$;

-- Security definer because a blocked person may no longer share a Den with
-- you, and then the profiles policy would hide their name from the list you
-- need to unblock them from.
create function public.blocked_people()
returns table (profile_id uuid, display_name text, avatar text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar
  from blocks b join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at
$$;


-- ---------------------------------------------------------------------------
-- reports: a person or a comment, for us to review
-- ---------------------------------------------------------------------------

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles(id) on delete set null,
  reported_id  uuid references public.profiles(id) on delete set null,
  den_id       uuid references public.dens(id) on delete set null,
  place_id     uuid references public.places(id) on delete set null,
  kind         text not null check (kind in ('comment', 'member')),
  body         text,          -- the comment as it read when reported, so an edit can't erase it
  reason       text check (char_length(reason) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolution   text           -- what we did: 'removed comment', 'no action', ...
);
create index reports_open_idx on public.reports (created_at) where resolved_at is null;

-- no policies: RLS on with none means no user reads or writes it directly
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- A comment when p_place is given (the reported person's comment on that
-- place in that Den), otherwise the person.
create function public.report(p_den uuid, p_profile uuid, p_place uuid default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me     uuid := auth.uid();
  v_body text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_profile = me then raise exception 'cannot_report_self'; end if;
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;

  if p_place is not null then
    select body into v_body from takes
    where den_id = p_den and place_id = p_place and profile_id = p_profile;
    if v_body is null then raise exception 'take_missing'; end if;
  elsif not exists (select 1 from den_members where den_id = p_den and profile_id = p_profile)
    and not exists (select 1 from saves where den_id = p_den and profile_id = p_profile and note is not null) then
    raise exception 'not_a_member';
  end if;

  insert into reports (reporter_id, reported_id, den_id, place_id, kind, body, reason)
  values (me, p_profile, p_den, p_place,
          case when p_place is null then 'member' else 'comment' end,
          v_body, left(nullif(trim(p_reason), ''), 500));
end $$;


-- ---------------------------------------------------------------------------
-- delete_my_account: everything that is yours, then the login itself
-- ---------------------------------------------------------------------------
--
-- Your saves go the way remove_from_stash takes them: a place a friend also
-- saved stays under their name; a place only you saved leaves the Stash with
-- its votes, comments and Capers. Then you leave every Den, so a Den you own
-- passes to its longest-standing member and a Den with nobody left is deleted.
-- Deleting the auth user cascades the profile and everything keyed to it:
-- memberships, votes, comments, push tokens, blocks. Reports and training
-- confirmations keep their rows with your id set to null.

-- The work, for any account. Not callable from the app - only by
-- delete_my_account() below, and by us in the SQL editor when moderation
-- means removing someone: `select delete_account('<profile id>');`
create function public.delete_account(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r        record;
  was_role text;
  v_dens   uuid[] := array(select den_id from den_members where profile_id = p_profile);
begin
  for r in select distinct den_id, place_id from saves where profile_id = p_profile loop
    delete from saves where den_id = r.den_id and place_id = r.place_id and profile_id = p_profile;
    if not exists (select 1 from saves where den_id = r.den_id and place_id = r.place_id) then
      delete from want_to_go where den_id = r.den_id and place_id = r.place_id;
      delete from takes      where den_id = r.den_id and place_id = r.place_id;
      delete from capers     where den_id = r.den_id and place_id = r.place_id;
    end if;
  end loop;

  -- leave_den() for someone who isn't the caller
  for r in select den_id from den_members where profile_id = p_profile loop
    delete from den_members where den_id = r.den_id and profile_id = p_profile returning role into was_role;
    if not exists (select 1 from den_members where den_id = r.den_id) then
      delete from dens where id = r.den_id;
    elsif was_role = 'owner' then
      update den_members set role = 'owner'
      where (den_id, profile_id) = (
        select den_id, profile_id from den_members
        where den_id = r.den_id order by joined_at, profile_id limit 1
      );
    end if;
  end loop;

  delete from auth.users where id = p_profile;

  -- A save that committed after the loop above had its profile_id set null by
  -- that cascade. Deleting the user locked their profile row, so nothing newer
  -- can arrive; sweep those now, the same way.
  for r in select distinct den_id, place_id from saves
           where profile_id is null and den_id = any(v_dens) loop
    delete from saves where den_id = r.den_id and place_id = r.place_id and profile_id is null;
    if not exists (select 1 from saves where den_id = r.den_id and place_id = r.place_id) then
      delete from want_to_go where den_id = r.den_id and place_id = r.place_id;
      delete from takes      where den_id = r.den_id and place_id = r.place_id;
      delete from capers     where den_id = r.den_id and place_id = r.place_id;
    end if;
  end loop;
end $$;

revoke execute on function public.delete_account(uuid) from public, anon, authenticated;

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  perform delete_account(auth.uid());
end $$;


-- ---------------------------------------------------------------------------
-- den_stash: say who wrote the note, and drop notes from people you blocked
-- ---------------------------------------------------------------------------
--
-- The note shown on a place is the newest one any saver wrote. The app needs
-- its author to put the right name on it and to report the right person;
-- savers[0] isn't that. Unchanged otherwise from 20260929160000_headline.sql.

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
  note_by         uuid,
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
    (array_agg(s.note order by s.created_at desc) filter (where s.note is not null and not bl.blocked))[1],
    (array_agg(s.profile_id order by s.created_at desc) filter (where s.note is not null and not bl.blocked))[1],
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
  cross join lateral (
    select exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = s.profile_id) as blocked
  ) bl
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


-- ---------------------------------------------------------------------------
-- execute grants: signed-in users only
-- ---------------------------------------------------------------------------

do $$
declare f text;
begin
  foreach f in array array[
    'block_user(uuid)', 'unblock_user(uuid)', 'blocked_people()', 'can_see_words_of(uuid)',
    'report(uuid,uuid,uuid,text)', 'delete_my_account()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
