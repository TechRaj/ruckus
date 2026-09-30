-- A plan with a clock time reminds at that time of day, not at 09:00.
--
-- Date-only saves still fire at 09:00, 7, 3, and 1 days before when_start.
-- A Caper's time_text ("7 pm", "6:45 pm") is the local time for that day:
-- the three reminders are that same time, exactly that many days earlier,
-- and the plan starts then, so nothing goes out after it. A Caper with no
-- readable time keeps 09:00. On a day that has both, the Caper's time wins.
-- A Caper on a different day is its own event.

create function public.event_clock(p_text text)
returns time
language plpgsql
immutable
as $$
declare
  m text[];
  hour int;
  minute int;
begin
  if p_text is null then return null; end if;
  m := regexp_match(lower(trim(p_text)), '^([0-9]{1,2})(?::([0-9]{2}))? (am|pm)$');
  if m is null then return null; end if;
  hour := m[1]::int;
  minute := coalesce(m[2], '0')::int;
  if hour < 1 or hour > 12 or minute > 59 then return null; end if;
  if m[3] = 'am' then
    if hour = 12 then hour := 0; end if;
  elsif hour <> 12 then
    hour := hour + 12;
  end if;
  return make_time(hour, minute, 0);
end $$;


create or replace function public.places_missing_time_zone()
returns table (id uuid, lat float8, lng float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.lat, p.lng
  from places p
  where p.time_zone is null
    and p.lat is not null
    and p.lng is not null
    and (
      exists (
        select 1 from saves s
        where s.place_id = p.id
          and s.when_start is not null
          and s.when_start >= current_date - 2
      )
      or exists (
        select 1 from capers c
        where c.place_id = p.id
          and c.day >= current_date - 2
      )
    )
$$;


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


revoke all on function public.event_clock(text) from public, anon, authenticated;
grant execute on function public.event_clock(text) to service_role;
