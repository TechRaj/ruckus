-- ============================================================================
-- Local stand-in for the parts of Supabase the migration depends on.
-- TEST ONLY - never apply this to the real project. Supabase already has all
-- of it, and applying it there would fail or clobber the real auth schema.
--
-- Mirrors: the anon / authenticated / service_role roles, auth.users,
-- auth.uid() reading the JWT claims PostgREST sets per request, and the
-- default privileges Supabase grants on the public schema (which is why the
-- migration has to REVOKE column updates explicitly).
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(
    coalesce(current_setting('request.jwt.claim.sub', true),
             (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')),
    '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
