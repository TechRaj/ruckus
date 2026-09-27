-- ============================================================================
-- Schema tests: run as separate signed-in users, the way PostgREST does it.
--
--   npm run test:db
--
-- Every check here is an access rule or a business rule that the app relies
-- on and cannot enforce itself: who can see a Den, who can join, the free-tier
-- limit, that nobody can grant themselves Pro, that a caption never reaches
-- the training table. Most failures here are silent data leaks in production,
-- so each one gets its own line.
-- ============================================================================

\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- ---------------------------------------------------------------- harness --
create schema t;
grant usage on schema t to anon, authenticated;

create table t.state (k text primary key, v text);
grant all on t.state to anon, authenticated;

create function t.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL  %', label; end if;
  raise notice 'ok    %', label;
end $$;

create function t.throws(p_sql text, p_expected text, label text) returns void language plpgsql as $$
declare got text;
begin
  begin
    execute p_sql;
  exception when others then
    got := sqlerrm;
  end;
  if got is null then raise exception 'FAIL  % (expected "%", but it succeeded)', label, p_expected; end if;
  if position(p_expected in got) = 0 then raise exception 'FAIL  % (expected "%", got "%")', label, p_expected, got; end if;
  raise notice 'ok    %', label;
end $$;

create function t.id(who text) returns uuid language sql immutable as $$
  select case who
    when 'alice' then '11111111-1111-1111-1111-111111111111'
    when 'bob'   then '22222222-2222-2222-2222-222222222222'
    when 'carol' then '33333333-3333-3333-3333-333333333333'
    when 'erin'  then '55555555-5555-5555-5555-555555555555'
  end::uuid
$$;

-- what PostgREST does per request: sets the JWT claims for this connection
create function t.login(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', t.id(who))::text, false);
$$;

create function t.get(key text) returns text language sql stable as $$ select v from t.state where k = key $$;
create function t.put(key text, val text) returns void language sql as $$
  insert into t.state values (key, val) on conflict (k) do update set v = excluded.v;
$$;

grant execute on all functions in schema t to anon, authenticated;

-- ------------------------------------------------------------------ users --
insert into auth.users (id, email, raw_user_meta_data) values
  (t.id('alice'), 'alice@example.com', '{"display_name":"Amelia"}'),
  (t.id('bob'),   'bob@example.com',   '{}'),
  (t.id('carol'), 'carol@example.com', '{"display_name":"Zoe"}'),
  (t.id('erin'),  'erin@example.com',  '{}');

select t.ok((select count(*) from public.profiles) = 4, 'a profile is created for every new user');
select t.ok((select display_name from public.profiles where id = t.id('alice')) = 'Amelia', 'display name comes from signup metadata');
select t.ok((select display_name from public.profiles where id = t.id('bob')) = 'bob', 'falls back to the email local part');

set role authenticated;

-- ------------------------------------------------------------- dens + invites
select t.login('alice');
do $$
declare d public.dens; c text; c2 text;
begin
  d := public.create_den('Toronto Shenanigans', 'hex-gold');
  perform t.put('den', d.id::text);
  perform t.ok(d.name = 'Toronto Shenanigans', 'alice creates a Den');
  perform t.ok((select role from public.den_members where den_id = d.id and profile_id = t.id('alice')) = 'owner',
               'the creator is its owner');

  c := public.create_invite(d.id);
  perform t.put('code', c);
  perform t.ok(c ~ '^[A-HJ-NP-Z2-9]{6}$', 'invite code is 6 chars with no 0/O/1/I');
  c2 := public.create_invite(d.id);
  perform t.ok(c2 = c, 'asking again returns the live invite instead of minting another');
end $$;

select t.login('carol');
select t.ok((select count(*) from public.dens where id = t.get('den')::uuid) = 0, 'an outsider cannot see the Den');
select t.ok((select count(*) from public.den_invites) = 0, 'an outsider cannot read invite codes');
select t.throws(format('select public.create_invite(%L)', t.get('den')), 'not_a_member', 'an outsider cannot mint an invite');
select t.throws(format('select * from public.den_stash(%L)', t.get('den')), 'not_a_member', 'an outsider cannot read the Stash');
select t.throws('select public.join_den(''ZZZZZZ'')', 'invite_invalid', 'a wrong code is rejected');

select t.login('bob');
do $$
declare d public.dens; typed text;
begin
  -- typed the way a person reads it off a screenshot
  typed := lower(substr(t.get('code'), 1, 3)) || '-' || lower(substr(t.get('code'), 4));
  d := public.join_den(typed);
  perform t.ok(d.id = t.get('den')::uuid, 'bob joins with a lower-case, dashed code');
  d := public.join_den(t.get('code'));
  perform t.ok((select count(*) from public.den_members where den_id = d.id) = 2, 'joining twice is a no-op, not an error');
  perform t.ok((select uses from public.den_invites where code = t.get('code')) = 1, 'the repeat join did not burn an invite use');
end $$;

select t.ok((select count(*) from public.profiles where id = t.id('alice')) = 1, 'Den-mates can see each other''s profiles');
select t.login('carol');
select t.ok((select count(*) from public.profiles where id = t.id('alice')) = 0, 'strangers cannot see each other''s profiles');

-- ------------------------------------------------------------------- saves
select t.login('alice');
do $$
declare n int;
begin
  select count(*) into n from public.save_places(
    t.get('den')::uuid,
    '[{"googlePlaceId":"ChIJ_dual","name":"Dual Citizen","address":"123 Queen St W, Toronto",
       "neighbourhood":"Old Toronto","city":"Toronto","kind":"venue",
       "coordinate":{"lat":43.6509,"lng":-79.3843},"score":14,"tier":"high","when":null},
      {"googlePlaceId":"ChIJ_downsview","name":"Downsview Park","kind":"region",
       "coordinate":{"lat":43.7417,"lng":-79.4789},"score":16,"tier":"high",
       "when":{"text":"September 18–20","start":"2026-09-18","end":"2026-09-20","recurring":null}}]'::jsonb,
    'https://www.instagram.com/reel/AAA/', 'instagram', 'best latte', 'model');
  perform t.ok(n = 2, 'alice saves two places from one reel');

  -- saving the same place again updates it, it does not fail or duplicate
  perform public.save_places(t.get('den')::uuid,
    '[{"googlePlaceId":"ChIJ_dual","name":"Dual Citizen","kind":"venue","coordinate":{"lat":43.6509,"lng":-79.3843}}]',
    'https://www.instagram.com/reel/AAA/');
  perform t.ok((select count(*) from public.saves where profile_id = t.id('alice') and den_id = t.get('den')::uuid) = 2,
               're-saving a place does not duplicate it');
  perform t.ok((select note from public.saves s join public.places p on p.id = s.place_id
                where p.google_place_id = 'ChIJ_dual' and s.profile_id = t.id('alice')) = 'best latte',
               're-saving without a note keeps the old note');

  -- a date the model got wrong must not fail the save
  perform public.save_places(t.get('den')::uuid,
    '[{"googlePlaceId":"ChIJ_bad_date","name":"Somewhere","kind":"event","coordinate":{"lat":43.6,"lng":-79.4},
       "when":{"text":"Feb 30","start":"2026-02-30","end":null,"recurring":null}}]');
  perform t.ok((select when_start from public.saves s join public.places p on p.id = s.place_id
                where p.google_place_id = 'ChIJ_bad_date') is null, 'an impossible date is dropped, not fatal');
  perform t.ok((select when_text from public.saves s join public.places p on p.id = s.place_id
                where p.google_place_id = 'ChIJ_bad_date') = 'Feb 30', '...but the caption''s wording is kept');
end $$;

select t.throws(format('select * from public.save_places(%L, %L)', t.get('den'),
                       '[{"name":"No id","kind":"venue"}]'),
                'place_missing_id', 'a place with no Google id is refused');

select t.login('bob');
select null from public.save_places(t.get('den')::uuid,
  '[{"googlePlaceId":"ChIJ_dual","name":"Dual Citizen","kind":"venue","coordinate":{"lat":43.6509,"lng":-79.3843}}]',
  'https://www.instagram.com/p/BBB/', 'instagram', 'patio is great', 'model');

select t.login('alice');
do $$
declare r record;
begin
  perform t.ok((select count(*) from public.den_stash(t.get('den')::uuid)) = 3, 'the Stash shows one row per place');

  select * into r from public.den_stash(t.get('den')::uuid, 43.6532, -79.3832) where google_place_id = 'ChIJ_dual';
  perform t.ok(jsonb_array_length(r.savers) = 2, 'a place saved by two people lists both savers');
  perform t.ok(cardinality(r.source_urls) = 2, '...and both reels it came from');
  perform t.ok(r.note = 'patio is great', '...and the latest note');
  perform t.ok(r.distance_m between 100 and 1000, format('distance is computed (%s m)', round(r.distance_m)));

  select * into r from public.den_stash(t.get('den')::uuid) where google_place_id = 'ChIJ_downsview';
  perform t.ok(r.when_start = '2026-09-18' and r.when_end = '2026-09-20', 'an event keeps its dates');
  perform t.ok(r.distance_m is null, 'no position given, no distance - not a fake zero');
end $$;

-- ------------------------------------------------------------- want to go
do $$
declare dual uuid := (select id from public.places where google_place_id = 'ChIJ_dual');
begin
  perform t.put('dual', dual::text);
  perform t.ok(public.set_want_to_go(t.get('den')::uuid, dual, true) = 1, 'alice wants to go');
end $$;
select t.login('bob');
select t.ok(public.set_want_to_go(t.get('den')::uuid, t.get('dual')::uuid, true) = 2, 'bob wants to go too');
do $$
declare w jsonb;
begin
  select wanters into w from public.den_stash(t.get('den')::uuid) where google_place_id = 'ChIJ_dual';
  perform t.ok(jsonb_array_length(w) = 2, 'two members who want to go are both listed');
  perform t.ok(w->0->>'profile_id' = t.id('alice')::text and w->0->>'display_name' = 'Amelia',
               'the earlier vote comes first, with their name');
  perform t.ok(w->1->>'profile_id' = t.id('bob')::text and w->1->>'display_name' = 'bob',
               'the later vote comes second');
  perform t.ok(w->0 ? 'avatar' and w->1 ? 'avatar', 'each wanter includes an avatar');

  select wanters into w from public.den_stash(t.get('den')::uuid) where google_place_id = 'ChIJ_downsview';
  perform t.ok(w = '[]'::jsonb, 'a place nobody wants lists nobody');
end $$;
select t.ok(public.set_want_to_go(t.get('den')::uuid, t.get('dual')::uuid, false) = 1, 'bob changes his mind');
select t.login('alice');
select t.ok((select i_want from public.den_stash(t.get('den')::uuid) where google_place_id = 'ChIJ_dual'),
            'the Stash knows alice wants to go');
select t.login('carol');
select t.throws(format('select public.set_want_to_go(%L, %L, true)', t.get('den'), t.get('dual')),
                'not_a_member', 'an outsider cannot vote');

-- -------------------------------------------------- privilege escalation
select t.login('bob');
select t.throws(format('update public.profiles set is_pro = true where id = %L', t.id('bob')),
                'permission denied', 'nobody can grant themselves Pro');
do $$ begin
  update public.profiles set display_name = 'Josh' where id = t.id('bob');
  perform t.ok((select display_name from public.profiles where id = t.id('bob')) = 'Josh', 'but you can rename yourself');
end $$;
select t.throws('update public.saves set score = 99', 'permission denied', 'scores cannot be edited, only notes');
do $$
declare n int;
begin
  update public.saves set note = 'hijacked' where profile_id = t.id('alice');
  get diagnostics n = row_count;
  perform t.ok(n = 0, 'you cannot edit someone else''s note');
  delete from public.saves where profile_id = t.id('alice');
  get diagnostics n = row_count;
  perform t.ok(n = 0, 'you cannot delete someone else''s save');
end $$;
select t.throws(format('insert into public.saves (den_id, profile_id, place_id) values (%L, %L, %L)',
                       t.get('den'), t.id('bob'), t.get('dual')),
                'row-level security', 'saves cannot be inserted around save_places()');
select t.throws('insert into public.dens (name) values (''sneaky'')', 'row-level security',
                'Dens cannot be inserted around create_den() and its limit');

-- ---------------------------------------------------- the free-tier limit
select t.login('carol');
select t.ok((public.create_den('One')).name = 'One', 'free user: first Den');
select t.ok((public.create_den('Two')).name = 'Two', 'free user: second Den');
select t.throws('select public.create_den(''Three'')', 'den_limit_reached', 'free user: third Den hits the paywall');
select t.throws(format('select public.join_den(%L)', t.get('code')), 'den_limit_reached',
                'joining counts toward the limit too');

reset role;
update public.profiles set is_pro = true where id = t.id('carol');   -- what the RevenueCat webhook does
set role authenticated;
select t.login('carol');
select t.ok((public.create_den('Three')).name = 'Three', 'Pro user: no limit');

-- ------------------------------------------------------- invite lifecycle
reset role;
update public.den_invites set expires_at = now() - interval '1 day' where code = t.get('code');
set role authenticated;

select t.login('bob');
select t.ok((public.join_den(t.get('code'))).id = t.get('den')::uuid,
            'an existing member re-opening an expired link still gets in');
select t.login('erin');
select t.throws(format('select public.join_den(%L)', t.get('code')), 'invite_expired', 'a new user cannot use an expired code');

reset role;
update public.den_invites set expires_at = now() + interval '1 day', max_uses = uses where code = t.get('code');
set role authenticated;
select t.login('erin');
select t.throws(format('select public.join_den(%L)', t.get('code')), 'invite_used_up', 'a used-up code is refused');

-- ------------------------------------------ training data never holds captions
select t.login('alice');
do $$
declare v uuid; o jsonb;
begin
  v := public.log_confirmation('choose',
    '[{"name":"Dual Citizen","googlePlaceId":"ChIJ_dual","score":14,"tier":"high","kind":"venue",
       "evidence":"best latte in the city","caption":"the whole caption text","reasons":["evidence_verified +3"]}]',
    '{0}', 'model');
  select offered into o from public.confirmations where id = v;
  perform t.ok(o -> 0 ->> 'name' = 'Dual Citizen', 'the confirmation is recorded');
  perform t.ok(not (o::text like '%latte%') and not (o::text like '%caption%') and not (o -> 0 ? 'reasons'),
               'caption, evidence and reasons are stripped before storage');
  perform t.put('conf', v::text);
end $$;
select t.login('carol');
select t.ok((select count(*) from public.confirmations where id = t.get('conf')::uuid) = 0,
            'nobody can read anyone else''s confirmations');

-- --------------------------------------------------------- event reminders
-- 09:00 America/Toronto. 2026-03-08 is the spring-forward; 09:00 that day is EDT.
select t.login('alice');
select null from public.save_places(t.get('den')::uuid,
  '[{"googlePlaceId":"ChIJ_market","name":"Toronto Night Market","kind":"event",
     "coordinate":{"lat":43.638,"lng":-79.419},
     "when":{"text":"March 10","start":"2026-03-10","end":null,"recurring":null}}]'::jsonb,
  null, 'manual', null, 'manual');
select null from public.save_places(t.get('den')::uuid,
  '[{"googlePlaceId":"ChIJ_prose","name":"Sometime Market","kind":"event",
     "coordinate":{"lat":43.64,"lng":-79.42},
     "when":{"text":"sometime in spring","start":null,"end":null,"recurring":null}}]'::jsonb,
  null, 'manual', null, 'manual');
select null from public.save_places(t.get('den')::uuid,
  '[{"googlePlaceId":"ChIJ_recur","name":"Monthly Market","kind":"event",
     "coordinate":{"lat":43.64,"lng":-79.42},
     "when":{"text":null,"start":null,"end":null,"recurring":"First Wednesday of each month"}}]'::jsonb,
  null, 'manual', null, 'manual');

select t.login('alice');
select public.register_push_token('ExponentPushToken[alicealicealicealice]', 'ios');
select t.login('bob');
select public.register_push_token('ExponentPushToken[bobbobbobbobbobbbbbb]', 'ios');
select t.login('erin');
select public.register_push_token('ExponentPushToken[erinerinerinerinerin]', 'android');

select t.throws('select public.register_push_token(''not-a-token'', ''ios'')',
                'bad_push_token', 'a push token has to look like an Expo token');
select t.login('carol');
select t.throws('select public.claim_event_reminders(''2026-03-03 14:00+00'')',
                'permission denied', 'a member cannot run the reminder job');
select t.throws('select public.reminder_send_context(''11111111-1111-1111-1111-111111111111'')',
                'permission denied', 'a member cannot read reminder tokens');
select t.ok((select count(*) from public.device_push_tokens) = 0,
            'a stranger sees nobody else''s push tokens');
select public.register_push_token('ExponentPushToken[carolcarolcarolcarol]', 'ios');
select t.ok((select count(*) from public.device_push_tokens) = 1
            and (select profile_id from public.device_push_tokens) = t.id('carol'),
            'registering a token stores it only on your own row');
select t.throws('insert into public.device_push_tokens (profile_id, token, platform) values ('
                || quote_literal(t.id('carol')) || ', ''ExponentPushToken[sneakysneakysneaky]'', ''ios'')',
                'permission denied', 'tokens cannot be inserted around register_push_token()');

reset role;
update public.places set time_zone = 'America/Toronto' where google_place_id = 'ChIJ_market';
insert into public.den_members (den_id, profile_id) values (t.get('den')::uuid, t.id('erin'));

select t.ok((select count(*) from public.claim_event_reminders('2026-03-03 13:59+00')) = 0,
            'a minute before 09:00 local, the 7-day reminder is not due');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-03 14:00+00')) = 3,
            'at 09:00 America/Toronto the 7-day reminder is claimed once per member with a device');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-03 14:00+00')) = 0,
            'running the job again claims nothing');
select t.ok((select count(*) from public.event_reminder_sends where offset_days <> 7) = 0,
            'the 3-day and 1-day reminders wait for their own morning');
select t.ok((select count(*) from public.places p
             join public.saves s on s.place_id = p.id
             where p.google_place_id in ('ChIJ_prose', 'ChIJ_recur')
               and p.time_zone is not null) = 0,
            'a caption or a recurrence without a resolved date is not an event we schedule');

do $$
declare
  bob_send uuid;
  ctx record;
begin
  select id into bob_send from public.event_reminder_sends
    where recipient_id = t.id('bob') and offset_days = 7;
  select * into ctx from public.reminder_send_context(bob_send, '2026-03-03 14:00+00');
  perform t.ok(ctx.eligible and not ctx.recipient_voted and ctx.other_voter_names = '{}',
               'with nobody interested, the send has no invented names');
  perform t.ok(ctx.tokens = array['ExponentPushToken[bobbobbobbobbobbbbbb]'],
               'the send context carries the recipient''s current device');
  perform t.ok(ctx.event_name = 'Toronto Night Market', 'the alert names the place, not the reel');
end $$;

select t.login('alice');
select null where public.set_want_to_go(t.get('den')::uuid,
  (select id from public.places where google_place_id = 'ChIJ_market'), true) > 0;

reset role;
do $$
declare ctx record;
begin
  select * into ctx from public.reminder_send_context(
    (select id from public.event_reminder_sends where recipient_id = t.id('bob') and offset_days = 7),
    '2026-03-03 14:00+00');
  perform t.ok(ctx.other_voter_names = array['Amelia'] and not ctx.recipient_voted,
               'a vote cast after the claim is what the send would say');
  select * into ctx from public.reminder_send_context(
    (select id from public.event_reminder_sends where recipient_id = t.id('alice') and offset_days = 7),
    '2026-03-03 14:00+00');
  perform t.ok(ctx.recipient_voted and ctx.other_voter_names = '{}',
               'the person who voted is not asked to join');
end $$;

-- erin leaves. her unsent reminder is cancelled; she cannot keep it.
delete from public.den_members where profile_id = t.id('erin') and den_id = t.get('den')::uuid;
select null from public.claim_event_reminders('2026-03-03 14:00+00');
select t.ok((select status from public.event_reminder_sends where recipient_id = t.id('erin')) = 'skipped',
            'leaving the Den cancels an unsent reminder');

-- 3 days before is still EST (14:00 UTC). 1 day before is EDT (13:00 UTC).
select t.ok((select count(*) from public.claim_event_reminders('2026-03-07 13:59+00')) = 0,
            'the 3-day reminder waits until 09:00 EST');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-07 14:00+00')) = 2,
            'the 3-day reminder is claimed for the members who are still in the Den');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-09 12:59+00')) = 0,
            'the day after the clocks change, 09:00 is 13:00 UTC');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-09 13:00+00')) = 2,
            'the 1-day reminder fires at 09:00 EDT');

select public.finish_event_reminder(
  (select id from public.event_reminder_sends where recipient_id = t.id('alice') and offset_days = 7),
  'failed', 'DeviceNotRegistered ExponentPushToken[alicealicealicealice]');
select t.ok((select error from public.event_reminder_sends
             where recipient_id = t.id('alice') and offset_days = 7) = 'DeviceNotRegistered [token]',
            'a failed send is auditable and does not keep the token');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-09 13:00+00')) = 1,
            'a failed send can be retried; a sent or sending one cannot');

-- The date moves. Old unsent rows are skipped; the new date gets its own set.
update public.saves set when_start = '2026-03-20'
 where place_id = (select id from public.places where google_place_id = 'ChIJ_market');
select null from public.claim_event_reminders('2026-03-13 13:00+00');
select t.ok((select count(*) from public.event_reminder_sends
             where event_date = '2026-03-10' and status = 'sending') = 0,
            'an edited date cancels unsent reminders for the old date');
select t.ok((select count(*) from public.event_reminder_sends
             where event_date = '2026-03-20' and offset_days = 7 and status = 'sending') = 2,
            'an edited date schedules a new 7-day reminder');
select t.ok((select count(*) from public.claim_event_reminders('2026-03-13 13:00+00')) = 0,
            'the new date is not claimed twice');

-- A second save that disagrees about the date makes the event ambiguous.
select t.login('bob');
select null from public.save_places(t.get('den')::uuid,
  '[{"googlePlaceId":"ChIJ_market","name":"Toronto Night Market","kind":"event",
     "coordinate":{"lat":43.638,"lng":-79.419},
     "when":{"text":"March 22","start":"2026-03-22","end":null,"recurring":null}}]'::jsonb,
  null, 'manual', null, 'manual');
reset role;
select t.ok((select count(*) from public.claim_event_reminders('2026-03-15 13:00+00')) = 0,
            'two different dates on one event are not guessed between');

-- Deleted event: nothing further is sent, and the unsent claim is skipped.
delete from public.saves where place_id = (select id from public.places where google_place_id = 'ChIJ_market');
select null from public.claim_event_reminders('2026-03-15 13:00+00');
select t.ok((select count(*) from public.event_reminder_sends
             where place_id = (select id from public.places where google_place_id = 'ChIJ_market')
               and status = 'sending') = 0,
            'deleting the event cancels unsent reminders');

-- Unknown zone: a future dated place with coordinates and no zone is listed, then stored.
select t.login('alice');
select null from public.save_places(t.get('den')::uuid,
  format('[{"googlePlaceId":"ChIJ_future","name":"Future Market","kind":"event",
     "coordinate":{"lat":43.65,"lng":-79.38},
     "when":{"text":null,"start":"%s","end":null,"recurring":null}}]', current_date + 14)::jsonb,
  null, 'manual', null, 'manual');
reset role;
select t.ok(exists (select 1 from public.places_missing_time_zone() m
                    join public.places p on p.id = m.id
                    where p.google_place_id = 'ChIJ_future'),
            'a dated place with no time zone is reported, not guessed');
select t.ok((select count(*) from public.due_event_reminders(now()) d
             join public.places p on p.id = d.place_id
             where p.google_place_id = 'ChIJ_future') = 0,
            'without a time zone, no reminder is due');
select public.set_place_time_zone(
  (select id from public.places where google_place_id = 'ChIJ_future'), 'America/Toronto');
select t.throws('select public.set_place_time_zone('
                || quote_literal((select id from public.places where google_place_id = 'ChIJ_future'))
                || ', ''Not/AZone'')',
                'bad_time_zone', 'a time zone postgres does not know is refused');
set role authenticated;
select t.login('carol');
select t.throws('select public.set_place_time_zone('
                || quote_literal((select id from public.places where google_place_id = 'ChIJ_future'))
                || ', ''America/Toronto'')',
                'permission denied', 'a stranger cannot set a place time zone');
select t.ok((select count(*) from public.event_reminder_sends) = 0,
            'a stranger sees no reminder history');

select t.login('alice');
select t.ok((select count(*) from public.event_reminder_sends) > 0, 'you can read your own reminder history');
select t.ok((select count(*) from public.event_reminder_sends where recipient_id <> t.id('alice')) = 0,
            'you cannot read anyone else''s reminder history');
select public.unregister_push_token('ExponentPushToken[alicealicealicealice]');
select t.ok((select count(*) from public.device_push_tokens) = 0, 'signing out removes your token');

-- ---------------------------------------------------------- leaving a Den
select t.login('alice');
select public.leave_den(t.get('den')::uuid);
select t.login('bob');
select t.ok((select role from public.den_members where den_id = t.get('den')::uuid and profile_id = t.id('bob')) = 'owner',
            'when the owner leaves, the longest-standing member takes over');
select public.leave_den(t.get('den')::uuid);
reset role;
select t.ok((select count(*) from public.dens where id = t.get('den')::uuid) = 0, 'the last one out deletes the Den');
select t.ok((select count(*) from public.places where google_place_id = 'ChIJ_dual') = 1,
            '...but the shared place survives for every other Den');

-- ------------------------------------------------------------- signed out
set role anon;
select t.throws('select public.create_den(''x'')', 'permission denied', 'signed-out users cannot call anything');
select t.ok((select count(*) from public.places) = 0, 'signed-out users cannot read places');
reset role;

\echo
\echo 'all schema tests passed'
