/**
 * figma-export.mjs - pull every top-level frame out of the Figma file as PNG.
 *
 * The Figma design URL needs a login, so nothing can read it directly. A
 * personal access token and the REST API can, and it's free on every plan
 * (including Starter) for files you already have access to.
 *
 *   1. Figma -> your avatar -> Settings -> Security -> Personal access tokens
 *      Generate one with "File content: read" scope.
 *   2. Put it in .env:   FIGMA_TOKEN=figd_...
 *   3. npm run design
 *
 * Writes design/<Page>--<Frame>.png and design/manifest.json. Re-run whenever
 * the design moves; it overwrites, so the folder always matches the file.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const FILE_KEY = process.env.FIGMA_FILE_KEY || '71ywGTsRD2Z6wcIXkst4MX';
const OUT = new URL('../design/', import.meta.url);
const SCALE = process.env.FIGMA_SCALE || '2';

// Figma rejects very long id lists, and rendering is the slow part server-side.
const BATCH = 20;

if (!process.env.FIGMA_TOKEN) {
  console.error('FIGMA_TOKEN is unset. Generate one at:');
  console.error('  Figma -> avatar -> Settings -> Security -> Personal access tokens');
  console.error('then add FIGMA_TOKEN=figd_... to .env');
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`https://api.figma.com/v1/${path}`, {
    headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN },
  });
  if (!res.ok) {
    throw new Error(`figma ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
};

const safe = s => String(s).replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

async function main() {
  console.log(`file ${FILE_KEY}`);
  const file = await api(`files/${FILE_KEY}`);
  console.log(`"${file.name}", last modified ${file.lastModified}`);

  // A Figma document is document -> CANVAS (a page) -> nodes. Top-level FRAMEs
  // on a canvas are the screens; anything nested is a component inside one.
  const frames = [];
  for (const page of file.document.children ?? []) {
    if (page.type !== 'CANVAS') continue;
    for (const node of page.children ?? []) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        frames.push({ id: node.id, name: node.name, page: page.name });
      }
    }
  }

  if (!frames.length) {
    console.error('No top-level frames found. Are the screens nested inside a group?');
    process.exit(1);
  }
  console.log(`${frames.length} frame(s) across ${new Set(frames.map(f => f.page)).size} page(s)`);

  await mkdir(OUT, { recursive: true });

  const written = [];
  for (let i = 0; i < frames.length; i += BATCH) {
    const batch = frames.slice(i, i + BATCH);
    const ids = batch.map(f => f.id).join(',');
    const { images, err } = await api(
      `images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=${SCALE}`
    );
    if (err) throw new Error(`render failed: ${err}`);

    for (const f of batch) {
      const url = images[f.id];
      if (!url) { console.log(`  skip  ${f.name} (nothing rendered)`); continue; }
      const png = Buffer.from(await (await fetch(url)).arrayBuffer());
      const filename = `${safe(f.page)}--${safe(f.name)}.png`;
      await writeFile(new URL(filename, OUT), png);
      written.push({ ...f, file: filename, bytes: png.length });
      console.log(`  ok    ${filename}  ${(png.length / 1024).toFixed(0)}KB`);
    }
  }

  await writeFile(
    new URL('manifest.json', OUT),
    JSON.stringify({ file: file.name, key: FILE_KEY, lastModified: file.lastModified, frames: written }, null, 2)
  );
  console.log(`\n${written.length} PNG(s) -> design/`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
