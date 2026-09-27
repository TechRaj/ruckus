-- Event reminders.
--
-- A dated event is one place in one Den whose saves agree on a single
-- when_start. Reminders go out at 09:00 in the place's IANA time zone, on
-- the calendar days 7, 3, and 1 days before that date. 09:00 is the event
-- start as well: date-only saves have no clock time, and this is the one
-- delivery hour (packages/reminders uses the same hour).
--
-- An edited date is a new event version. The idempotency key includes
-- event_date, so the new date gets its own three reminders and any unsent
-- row for the old date is marked skipped. A deleted event, a member who
-- left, an unknown zone, or more than one distinct date is not sent.
--
-- Tokens are readable only by their owner. Claiming, finishing, and
-- disabling are service-role work: the proxy runs the job, members cannot.

alter table public.places
  add column time_zone text;

alter table public.places
  add constraint places_time_zone_iana
  check (time_zone is null or time_zone ~ '^(UTC|[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)+)$');


-- One row per device. A token moves to the account that last registered it.
create table public.device_push_tokens (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android')),
  updated_at  timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (profile_id, token)
);
create unique index device_push_tokens_token_idx on public.device_push_tokens (token);

-- One alert per (event, recipient, offset, event date). No token is stored.
create table public.event_reminder_sends (
  id            uuid primary key default gen_random_uuid(),
  den_id        uuid not null references public.dens(id) on delete cascade,
  place_id      uuid not null references public.places(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  offset_days   int not null check (offset_days in (7, 3, 1)),
  event_date    date not null,
  status        text not null check (status in ('sending', 'sent', 'failed', 'skipped')),
  error         text check (
                  error is null
                  or (char_length(error) <= 300 and error !~* 'ExponentPushToken|ExpoPushToken')
                ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (den_id, place_id, recipient_id, offset_days, event_date)
);
create index event_reminder_sends_failed_idx
  on public.event_reminder_sends (status, updated_at desc)
  where status in ('failed', 'sending');


alter table public.device_push_tokens    enable row level security;
alter table public.event_reminder_sends  enable row level security;

create policy "read your own push tokens" on public.device_push_tokens
  for select to authenticated
  using (profile_id = auth.uid());

create policy "read your own reminder sends" on public.event_reminder_sends
  for select to authenticated
  using (recipient_id = auth.uid());

revoke all on public.device_push_tokens from public, anon, authenticated;
revoke all on public.event_reminder_sends from public, anon, authenticated;
grant select on public.device_push_tokens to authenticated;
grant select on public.event_reminder_sends to authenticated;


-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

create function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'bad_platform';
  end if;
  if p_token is null
     or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{16,180}\]$' then
    raise exception 'bad_push_token';
  end if;

  delete from device_push_tokens where token = p_token and profile_id <> me;
  insert into device_push_tokens (profile_id, token, platform, disabled_at)
  values (me, p_token, p_platform, null)
  on conflict (profile_id, token) do update
    set platform = excluded.platform, updated_at = now(), disabled_at = null;
end $$;


create function public.unregister_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  delete from device_push_tokens where profile_id = me and token = p_token;
end $$;


-- ---------------------------------------------------------------------------
-- who is due
-- ---------------------------------------------------------------------------

-- Places that have a concrete upcoming date and no zone yet. The job fills
-- the zone from the coordinate; a null zone is never guessed past that.
create function public.places_missing_time_zone()
returns table (id uuid, lat float8, lng float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.lat, p.lng
  from places p
  where p.time_zone is null
    and p.lat is not null
    and p.lng is not null
    and exists (
      select 1 from saves s
      where s.place_id = p.id
        and s.when_start is not null
        and s.when_start >= current_date - 2
    )
$$;


create function public.set_place_time_zone(p_place uuid, p_zone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_zone is null or p_zone !~ '^(UTC|[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)+)$' then
    raise exception 'bad_time_zone';
  end if;
  begin
    perform (timestamp '2026-01-15 09:00' at time zone p_zone);
  exception when others then
    raise exception 'bad_time_zone';
  end;
  update places set time_zone = p_zone where id = p_place;
  if not found then raise exception 'place_missing'; end if;
end $$;


-- One row per member who can see the event and has a live device.
-- More than one distinct when_start is ambiguous, so the event is skipped.
-- when_text or a recurrence without a when_start never qualifies.
create function public.due_event_reminders(p_now timestamptz)
returns table (
  den_id uuid, place_id uuid, recipient_id uuid, offset_days int, event_date date
)
language sql stable security definer set search_path = public as $$
  with events as (
    select s.den_id, s.place_id, p.time_zone,
           array_agg(distinct s.when_start) filter (where s.when_start is not null) as dates
    from saves s
    join places p on p.id = s.place_id
    where p.time_zone is not null
    group by s.den_id, s.place_id, p.time_zone
  ),
  concrete as (
    select e.den_id, e.place_id, e.time_zone, e.dates[1] as event_date
    from events e
    where e.dates is not null and cardinality(e.dates) = 1
  ),
  due as (
    select c.den_id, c.place_id, c.event_date, offs.offset_days
    from concrete c
    cross join (values (7), (3), (1)) as offs(offset_days)
    where ((c.event_date - offs.offset_days) + time '09:00') at time zone c.time_zone <= p_now
      and (c.event_date + time '09:00') at time zone c.time_zone > p_now
  )
  select d.den_id, d.place_id, m.profile_id, d.offset_days, d.event_date
  from due d
  join den_members m on m.den_id = d.den_id
  where exists (
    select 1 from device_push_tokens t
    where t.profile_id = m.profile_id and t.disabled_at is null
  )
$$;


create function public.reminder_still_due(
  p_den uuid, p_place uuid, p_recipient uuid, p_offset int, p_event date, p_now timestamptz
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.due_event_reminders(p_now) d
    where d.den_id = p_den and d.place_id = p_place and d.recipient_id = p_recipient
      and d.offset_days = p_offset and d.event_date = p_event
  )
$$;


-- Insert a sending row for each reminder that is due and not already claimed.
-- Failed rows that are still due are claimed again. Sending and sent rows
-- are not. Unsent rows that are no longer due are marked skipped.
create function public.claim_event_reminders(p_now timestamptz default now())
returns table (send_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_id uuid;
begin
  update event_reminder_sends s
     set status = 'skipped', error = 'no longer eligible', updated_at = p_now
   where s.status in ('sending', 'failed')
     and not public.reminder_still_due(
       s.den_id, s.place_id, s.recipient_id, s.offset_days, s.event_date, p_now);

  for r in select * from public.due_event_reminders(p_now) loop
    v_id := null;
    insert into event_reminder_sends (den_id, place_id, recipient_id, offset_days, event_date, status)
    values (r.den_id, r.place_id, r.recipient_id, r.offset_days, r.event_date, 'sending')
    on conflict (den_id, place_id, recipient_id, offset_days, event_date) do nothing
    returning id into v_id;

    if v_id is null then
      update event_reminder_sends e
         set status = 'sending', error = null, updated_at = p_now
       where e.den_id = r.den_id and e.place_id = r.place_id
         and e.recipient_id = r.recipient_id and e.offset_days = r.offset_days
         and e.event_date = r.event_date and e.status = 'failed'
       returning e.id into v_id;
    end if;

    if v_id is not null then
      send_id := v_id;
      return next;
    end if;
  end loop;
end $$;


-- Votes and tokens are read here, at send time, not when the row was claimed.
create function public.reminder_send_context(p_send uuid, p_now timestamptz default now())
returns table (
  eligible boolean,
  den_id uuid,
  place_id uuid,
  event_name text,
  offset_days int,
  recipient_voted boolean,
  other_voter_names text[],
  tokens text[]
)
language plpgsql security definer set search_path = public as $$
declare
  s event_reminder_sends;
begin
  select * into s from event_reminder_sends where id = p_send;
  if not found or s.status <> 'sending' then
    return;
  end if;

  eligible := public.reminder_still_due(
    s.den_id, s.place_id, s.recipient_id, s.offset_days, s.event_date, p_now);
  den_id := s.den_id;
  place_id := s.place_id;
  offset_days := s.offset_days;
  event_name := (select name from places where id = s.place_id);
  tokens := '{}';
  recipient_voted := false;
  other_voter_names := '{}';

  if not eligible then
    return next;
    return;
  end if;

  recipient_voted := exists (
    select 1 from want_to_go w
    join den_members m on m.den_id = w.den_id and m.profile_id = w.profile_id
    where w.den_id = s.den_id and w.place_id = s.place_id and w.profile_id = s.recipient_id
  );
  select coalesce(array_agg(pr.display_name order by pr.display_name), '{}')
    into other_voter_names
  from want_to_go w
  join den_members m on m.den_id = w.den_id and m.profile_id = w.profile_id
  join profiles pr on pr.id = w.profile_id
  where w.den_id = s.den_id and w.place_id = s.place_id
    and w.profile_id <> s.recipient_id
    and nullif(trim(pr.display_name), '') is not null;

  select coalesce(array_agg(t.token order by t.updated_at), '{}')
    into tokens
  from device_push_tokens t
  where t.profile_id = s.recipient_id and t.disabled_at is null;

  return next;
end $$;


create function public.finish_event_reminder(p_send uuid, p_status text, p_error text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_error text;
begin
  if p_status is null or p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'bad_reminder_status';
  end if;
  v_error := left(
    regexp_replace(
      regexp_replace(p_error, 'ExponentPushToken\[[^\]]*\]', '[token]', 'gi'),
      'ExpoPushToken\[[^\]]*\]', '[token]', 'gi'),
    300);
  if nullif(trim(v_error), '') is null then v_error := null; end if;
  update event_reminder_sends
     set status = p_status, error = v_error, updated_at = now()
   where id = p_send and status = 'sending';
end $$;


-- Drop an unsent claim that has no device, so a later registration can take it.
create function public.release_event_reminder(p_send uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from event_reminder_sends where id = p_send and status = 'sending';
end $$;


create function public.disable_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update device_push_tokens set disabled_at = now(), updated_at = now() where token = p_token;
end $$;


-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'places_missing_time_zone()',
    'set_place_time_zone(uuid,text)',
    'due_event_reminders(timestamp with time zone)',
    'reminder_still_due(uuid,uuid,uuid,integer,date,timestamp with time zone)',
    'claim_event_reminders(timestamp with time zone)',
    'reminder_send_context(uuid,timestamp with time zone)',
    'finish_event_reminder(uuid,text,text)',
    'release_event_reminder(uuid)',
    'disable_push_token(text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
