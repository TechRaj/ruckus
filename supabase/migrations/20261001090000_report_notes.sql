-- ============================================================================
-- Reporting a note.
--
-- A place's note (written when saving it) sits above the comments and gets
-- the same Report link, but report() only looked in `takes`, so the app
-- filed a note as a report about the person, without the words. `p_note`
-- says which one was reported: someone can have both a note and a comment on
-- the same place. Unchanged otherwise from 20260930120000_safety_and_deletion.sql.
-- ============================================================================

drop function public.report(uuid, uuid, uuid, text);

create function public.report(
  p_den uuid, p_profile uuid, p_place uuid default null, p_reason text default null, p_note boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
declare
  me     uuid := auth.uid();
  v_body text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_profile = me then raise exception 'cannot_report_self'; end if;
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;

  if p_place is not null then
    if p_note then
      select note into v_body from saves
      where den_id = p_den and place_id = p_place and profile_id = p_profile and note is not null
      order by created_at desc limit 1;
    else
      select body into v_body from takes
      where den_id = p_den and place_id = p_place and profile_id = p_profile;
    end if;
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

revoke execute on function public.report(uuid, uuid, uuid, text, boolean) from public, anon;
grant  execute on function public.report(uuid, uuid, uuid, text, boolean) to authenticated;
