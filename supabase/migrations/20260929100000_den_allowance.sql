-- ============================================================================
-- How many Dens I'm in, out of how many I'm allowed.
--
-- So the app can show "2 of 3" without writing the free limit into its own
-- code: den_limit_for() stays the one place the number lives. den_limit is
-- null for Pro.
-- ============================================================================

create function public.my_den_allowance()
returns table (dens int, den_limit int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from den_members where profile_id = auth.uid()),
         den_limit_for(auth.uid())
$$;

revoke execute on function public.my_den_allowance() from public, anon;
grant  execute on function public.my_den_allowance() to authenticated;
