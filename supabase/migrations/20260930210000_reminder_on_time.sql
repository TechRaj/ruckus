-- A reminder goes out at its clock time, and only then.
--
-- The previous due check included every offset whose time had already
-- passed, so one run sent the whole backlog. A row is due only while
-- that clock time is the current minute. A check at 8:23 does not send
-- the 8:15 reminder. next_event_reminder_at is the soonest time the
-- proxy should wake for, including a reminder still inside this minute.

create or replace function public.due_event_reminders(p_now timestamptz)
returns table (
  den_id uuid, place_id uuid, recipient_id uuid, offset_days int, event_date date
)
language sql stable security definer set search_path = public as $$
  with save_dates as (
    select s.den_id, s.place_id,
           array_agg(distinct s.when_start) filter (where s.when_start is not null) as dates
    from saves s
    group by s.den_id, s.place_id
  ),
  save_events as (
    select d.den_id, d.place_id, d.dates[1] as event_date, time '09:00' as event_time
    from save_dates d
    where d.dates is not null and cardinality(d.dates) = 1
  ),
  caper_events as (
    select c.den_id, c.place_id, c.day as event_date,
           coalesce(public.event_clock(c.time_text), time '09:00') as event_time
    from capers c
  ),
  combined as (
    select * from caper_events
    union all
    select s.* from save_events s
    where not exists (
      select 1 from caper_events c
      where c.den_id = s.den_id and c.place_id = s.place_id and c.event_date = s.event_date
    )
  ),
  concrete as (
    select e.den_id, e.place_id, p.time_zone, e.event_date, e.event_time
    from combined e
    join places p on p.id = e.place_id
    where p.time_zone is not null
  ),
  due as (
    select c.den_id, c.place_id, c.event_date, offs.offset_days
    from concrete c
    cross join (values (7), (3), (1)) as offs(offset_days)
    where ((c.event_date - offs.offset_days) + c.event_time) at time zone c.time_zone <= p_now
      and ((c.event_date - offs.offset_days) + c.event_time) at time zone c.time_zone
            > p_now - interval '1 minute'
      and (c.event_date + c.event_time) at time zone c.time_zone > p_now
  )
  select d.den_id, d.place_id, m.profile_id, d.offset_days, d.event_date
  from due d
  join den_members m on m.den_id = d.den_id
  where exists (
    select 1 from device_push_tokens t
    where t.profile_id = m.profile_id and t.disabled_at is null
  )
$$;


create function public.next_event_reminder_at(p_now timestamptz)
returns timestamptz
language sql stable security definer set search_path = public as $$
  with save_dates as (
    select s.den_id, s.place_id,
           array_agg(distinct s.when_start) filter (where s.when_start is not null) as dates
    from saves s
    group by s.den_id, s.place_id
  ),
  save_events as (
    select d.den_id, d.place_id, d.dates[1] as event_date, time '09:00' as event_time
    from save_dates d
    where d.dates is not null and cardinality(d.dates) = 1
  ),
  caper_events as (
    select c.den_id, c.place_id, c.day as event_date,
           coalesce(public.event_clock(c.time_text), time '09:00') as event_time
    from capers c
  ),
  combined as (
    select * from caper_events
    union all
    select s.* from save_events s
    where not exists (
      select 1 from caper_events c
      where c.den_id = s.den_id and c.place_id = s.place_id and c.event_date = s.event_date
    )
  ),
  concrete as (
    select e.den_id, e.place_id, p.time_zone, e.event_date, e.event_time
    from combined e
    join places p on p.id = e.place_id
    where p.time_zone is not null
  ),
  fires as (
    select c.den_id, c.place_id, c.event_date, offs.offset_days,
           ((c.event_date - offs.offset_days) + c.event_time) at time zone c.time_zone as fire_at,
           (c.event_date + c.event_time) at time zone c.time_zone as start_at
    from concrete c
    cross join (values (7), (3), (1)) as offs(offset_days)
  )
  select min(f.fire_at)
  from fires f
  join den_members m on m.den_id = f.den_id
  where f.fire_at > p_now - interval '1 minute'
    and f.start_at > p_now
    and exists (
      select 1 from device_push_tokens t
      where t.profile_id = m.profile_id and t.disabled_at is null
    )
    and not exists (
      select 1 from event_reminder_sends s
      where s.den_id = f.den_id and s.place_id = f.place_id
        and s.recipient_id = m.profile_id and s.offset_days = f.offset_days
        and s.event_date = f.event_date
        and s.status in ('sent', 'sending', 'skipped')
    )
$$;


revoke all on function public.next_event_reminder_at(timestamptz) from public, anon, authenticated;
grant execute on function public.next_event_reminder_at(timestamptz) to service_role;
