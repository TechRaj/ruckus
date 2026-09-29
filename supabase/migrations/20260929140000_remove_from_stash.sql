-- ============================================================================
-- Remove from Stash.
--
-- The Stash shows one row per place, but a place can be saved by several
-- people. Removing takes away YOUR save only - a friend's save of the same
-- place stays, under their name. When the last save goes, the place leaves the
-- Stash, and so does everything hanging off it in this Den: votes, comments
-- and Capers. Otherwise they'd linger with nothing to attach to.
--
-- Returns how many people still have it saved (0 = it's gone from the Stash).
-- ============================================================================

create function public.remove_from_stash(p_den uuid, p_place uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_left int;
begin
  if not is_den_member(p_den) then raise exception 'not_a_member'; end if;

  delete from saves where den_id = p_den and place_id = p_place and profile_id = auth.uid();
  if not found then raise exception 'not_your_save'; end if;

  select count(*)::int into v_left from saves where den_id = p_den and place_id = p_place;
  if v_left = 0 then
    delete from want_to_go where den_id = p_den and place_id = p_place;
    delete from takes      where den_id = p_den and place_id = p_place;
    delete from capers     where den_id = p_den and place_id = p_place;   -- caper_going cascades
  end if;
  return v_left;
end $$;

revoke execute on function public.remove_from_stash(uuid, uuid) from public, anon;
grant  execute on function public.remove_from_stash(uuid, uuid) to authenticated;
