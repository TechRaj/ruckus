#!/usr/bin/env bash
# Apply migrations to the real project, in order, each at most once.
#
#   npm run db:push
#
# Needs SUPABASE_DB_URL in .env: Supabase dashboard -> Connect -> "Session
# pooler" URI, with your database password filled in. Tracks what has been
# applied in a small table, so running it twice is safe.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ../.env; set +a
: "${SUPABASE_DB_URL:?Add SUPABASE_DB_URL to .env (dashboard -> Connect -> Session pooler URI)}"

PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -c "create table if not exists public._ruckus_migrations (name text primary key, applied_at timestamptz default now());
                 alter table public._ruckus_migrations enable row level security;"

for m in migrations/*.sql; do
  name="$(basename "$m")"
  if [ -n "$("${PSQL[@]}" -tAc "select 1 from public._ruckus_migrations where name = '$name'")" ]; then
    echo "skip   $name (already applied)"
    continue
  fi
  echo "apply  $name"
  # one transaction per migration: it lands whole or not at all
  "${PSQL[@]}" -1 -f "$m" -c "insert into public._ruckus_migrations (name) values ('$name')"
done
echo "done"
