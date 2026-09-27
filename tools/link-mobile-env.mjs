/**
 * link-mobile-env.mjs - point apps/mobile/.env at the root .env.
 *
 * Runs automatically before the app starts (prestart / preios in
 * apps/mobile/package.json). Expo only reads .env from the app's own folder,
 * so one link means one file of keys for the whole repo.
 *
 * Never overwrites a real apps/mobile/.env - if someone has their own, it
 * says so and leaves it alone. Safe to run any number of times.
 */
import { existsSync, lstatSync, readlinkSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, '.env');
const link = join(root, 'apps', 'mobile', '.env');
const rel = relative(dirname(link), target);   // ../../.env

if (!existsSync(target)) {
  console.warn('[env] no root .env yet - copy .env.example to .env and fill it in. The app will run on mock data.');
  process.exit(0);
}

let stat = null;
try { stat = lstatSync(link); } catch { /* doesn't exist */ }

if (!stat) {
  symlinkSync(rel, link);
  console.log(`[env] linked apps/mobile/.env -> ${rel}`);
} else if (stat.isSymbolicLink()) {
  if (readlinkSync(link) !== rel) console.warn(`[env] apps/mobile/.env links to ${readlinkSync(link)}, not ${rel} - leaving it`);
} else {
  console.warn('[env] apps/mobile/.env is a real file, so the app is NOT using the root .env.');
  console.warn('      Delete it to use the shared one: rm apps/mobile/.env');
}
