#!/usr/bin/env bash
# Throwaway Postgres: shim -> migrations -> tests -> torn down.
#
#   npm run test:db
#
# Needs a local Postgres 14+ (brew install postgresql). Touches nothing real:
# the cluster lives in a temp dir, listens only on a unix socket there, and is
# deleted on exit whether the tests pass or not.
set -euo pipefail
cd "$(dirname "$0")/.."

TMP="$(mktemp -d)"
trap 'pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

initdb -D "$TMP/data" -A trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
createdb -h "$TMP" -U postgres ruckus_test

PSQL=(psql -h "$TMP" -U postgres -d ruckus_test -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f tests/supabase-shim.sql
for m in migrations/*.sql; do "${PSQL[@]}" -f "$m"; done
"${PSQL[@]}" -t -A -f tests/schema.test.sql 2>&1 | sed -E "s/^psql:[^ ]+ NOTICE:  //" | grep -v "^\s*$"
