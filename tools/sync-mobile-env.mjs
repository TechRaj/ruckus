/**
 * sync-mobile-env.mjs - generate apps/mobile/.env from the root .env.
 *
 * Runs automatically before the app starts (prestart / preios in
 * apps/mobile/package.json). There is ONE .env to edit: the root one.
 *
 * Why a generated file and not a symlink: Expo SDK 57 reads .env through
 * Metro, and Metro doesn't follow symlinks - with a link the app silently got
 * no config at all and fell back to mock data. A generated file also carries
 * only the EXPO_PUBLIC_ values, so the service role key and friends are never
 * even visible to the bundler.
 *
 * Never overwrites a hand-written apps/mobile/.env: only a file this script
 * generated (or a leftover symlink) is replaced.
 */
import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'apps', 'mobile', '.env');
const MARK = '# GENERATED from the root .env by tools/sync-mobile-env.mjs - edit that file, not this one.';

if (!existsSync(join(root, '.env'))) {
  console.warn('[env] no root .env yet - copy .env.example to .env and fill it in. The app will run on mock data.');
  process.exit(0);
}

// Expo's own parser, so ${SUPABASE_URL}-style references resolve exactly as Expo would
const { parseProjectEnv } = createRequire(import.meta.url)('@expo/env');
const { env } = parseProjectEnv(root, { silent: true });
const pub = Object.entries(env).filter(([k]) => k.startsWith('EXPO_PUBLIC_')).sort(([a], [b]) => a.localeCompare(b));

let stat = null;
try { stat = lstatSync(out); } catch { /* doesn't exist */ }
if (stat?.isSymbolicLink()) unlinkSync(out);   // the old approach; Metro can't read it
else if (stat && !readFileSync(out, 'utf8').startsWith(MARK)) {
  console.warn('[env] apps/mobile/.env was written by hand, so the root .env is NOT being used.');
  console.warn('      Move its values into the root .env, then delete it: rm apps/mobile/.env');
  process.exit(0);
}

const quote = v => (/[\s#"'$]/.test(v) ? JSON.stringify(v) : v);
writeFileSync(out, [
  MARK,
  '# Only EXPO_PUBLIC_* is here: these are built into the app, readable by anyone who has it.',
  ...pub.map(([k, v]) => `${k}=${quote(v)}`),
  '',
].join('\n'));

const missing = pub.filter(([, v]) => !v).map(([k]) => k);
console.log(`[env] apps/mobile/.env <- root .env (${pub.length} public values${missing.length ? `; blank: ${missing.join(', ')}` : ''})`);
