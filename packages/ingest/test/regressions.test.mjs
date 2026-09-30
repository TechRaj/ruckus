/**
 * Regression tests for bugs that actually shipped.
 *
 *   npm test
 *
 * Every case here is something that was wrong in the repo and cost a run to
 * find. They are the cheap ones: no network, no proxy, no API keys, so they
 * run in CI and in a pre-commit hook. The expensive checks - does Instagram
 * still serve og tags, does the model still pick the right venue - live in
 * tools/harness and cost money.
 *
 * Node's built-in runner, so there is no test dependency to install.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import {
  configure, currentPatterns,
  decodeEntities, parseReelPage, shortcodeOf,
  scoreCandidate, refineWithGeocode, tierOf, explain,
  normaliseCity, geocodeCandidates, searchPlaces,
  extractPlaces, normaliseHeadline,
} from '@ruckus/ingest';

/** Build an og-tag page the way Instagram actually serves one. */
const page = desc => [
  '<meta property="og:title" content="creator on Instagram" />',
  `<meta property="og:description" content="${desc}" />`,
  '<meta property="og:image" content="https://cdn.example/x.jpg" />',
].join('\n');

describe('parsing (§5.4)', () => {
  test('decodes entities RN has no DOM for', () => {
    assert.equal(decodeEntities('&#064;handle'), '@handle');
    assert.equal(decodeEntities('&quot;hi&quot;'), '"hi"');
    assert.equal(decodeEntities('&#x2615;&#xfe0f;'), '☕️');
  });

  test('handle regex matches only after decoding', () => {
    const p = parseReelPage(page('1 likes, 2 comments - c on August 30, 2026: &quot;go to &#064;dualcitizen&quot;'));
    assert.deepEqual(p.handles, ['dualcitizen'], 'entity decode must run before the handle regex');
  });

  test('wrapper regex survives hidden likes and abbreviated counts', () => {
    for (const d of [
      '1,234 likes, 56 comments - c on August 30, 2026: &quot;hello&quot;',
      '37K likes, 1,000 comments - c on August 30, 2026: &quot;hello&quot;',
    ]) {
      assert.equal(parseReelPage(page(d)).wrapperOk, true, d.slice(0, 20));
    }
  });

  test('strips dot padding and hashtags into prose', () => {
    const p = parseReelPage(page('1 likes, 2 comments - c on August 30, 2026: &quot;Cool spot . . . . #toronto #coffee&quot;'));
    assert.equal(p.prose, 'Cool spot');
    assert.deepEqual(p.hashtags, ['toronto', 'coffee']);
  });

  test('pin emoji does not swallow the variation selector', () => {
    // [📍🏠🗺️] written literally pulls U+FE0F into the class, so every ☕️ matched
    const p = parseReelPage(page('1 likes, 2 comments - c on August 30, 2026: &quot;coffee &#x2615;&#xfe0f; here&quot;'));
    assert.ok(!/^️/.test(p.prose), 'a stray U+FE0F means the emoji class regressed');
  });

  test('accepts /p/ and /tv/ as well as /reel/', () => {
    assert.equal(shortcodeOf('https://www.instagram.com/p/DdFmYh0EdtQ/?img_index=2'), 'DdFmYh0EdtQ');
    assert.equal(shortcodeOf('https://www.instagram.com/reel/Dc9dAchMkmk/?stkn=x'), 'Dc9dAchMkmk');
    assert.equal(shortcodeOf('https://example.com/nope'), null);
  });
});

describe('remote config (§5.4)', () => {
  // these two regexes break when Instagram changes og:description, and the fix
  // has to be a server deploy rather than an App Store review
  test('a server-supplied pattern takes over', () => {
    try {
      const applied = configure({ wrapper: '^WEIRD (?<a>x) (?<b>y) (\\S+) on (.+?): \"([\\s\\S]*)\"$' });
      assert.deepEqual(applied, ['wrapper']);
      assert.match(currentPatterns().wrapper, /WEIRD/);
    } finally { configure(null); }
  });

  test('a broken pattern is ignored, not thrown', () => {
    const before = currentPatterns().wrapper;
    const applied = configure({ wrapper: '([unclosed' });
    assert.deepEqual(applied, [], 'a bad regex must not be applied');
    assert.equal(currentPatterns().wrapper, before, 'the working pattern must survive');
    // and parsing still works
    assert.equal(parseReelPage(page('1 likes, 2 comments - c on August 30, 2026: &quot;hi&quot;')).wrapperOk, true);
  });

  test('configure(null) restores the built-ins', () => {
    const original = currentPatterns().wrapper;
    configure({ wrapper: '^nonsense$' });
    configure(null);
    assert.equal(currentPatterns().wrapper, original);
  });
});

describe('scoring (§5.7)', () => {
  const parsed = { caption: 'Best latte @dualcitizen 📍 Dual Citizen, 930 King St W' };
  const names = { dualcitizen: 'Dual Citizen | Coffee Bar' };

  test('a quoted caption verifies, a made-up one is punished', () => {
    const ok = scoreCandidate({ name: 'Dual Citizen', evidence: 'Dual Citizen', kind: 'venue' }, parsed, names);
    const bad = scoreCandidate({ name: 'Fake Cafe', evidence: 'never written here', kind: 'venue' }, parsed, names);
    assert.ok(ok.codes.includes('evidence_verified'));
    assert.ok(bad.codes.includes('evidence_not_in_caption'));
    assert.ok(bad.score < ok.score);
  });

  test('a short name inside the official one is a match, not a mismatch', () => {
    // "Bow Lake" vs "Bow Lake Viewpoint", "Fuego" vs "Volcán de Fuego" all
    // scored -3 as mismatches before containment was added.
    for (const [model, google] of [
      ['Bow Lake', 'Bow Lake Viewpoint'],
      ['Fuego', 'Volcán de Fuego'],
      ['Ruta del Cares', 'La Ruta del Cares'],
    ]) {
      const pre = scoreCandidate({ name: model, evidence: model, kind: 'venue' }, { caption: model }, {});
      const post = refineWithGeocode(pre, { name: model }, [{ name: google, address: 'x', city: 'y' }], null);
      assert.ok(post.codes.includes('geocode_name_match'), `${model} vs ${google}`);
    }
  });

  test('a genuinely different name still mismatches', () => {
    const pre = scoreCandidate({ name: 'Thindi Cafe', evidence: 'Thindi Cafe', kind: 'venue' }, { caption: 'Thindi Cafe' }, {});
    const post = refineWithGeocode(pre, { name: 'Thindi Cafe' }, [{ name: 'Thai Basil', address: 'x' }], null);
    assert.ok(post.codes.includes('geocode_name_mismatch'));
  });

  test('country in the address counts as the city matching', () => {
    // checking only the structured locality flagged "Reykjavík, Iceland" as
    // not being in Iceland
    const pre = scoreCandidate({ name: 'Hallgrimskirkja', evidence: 'x', kind: 'venue' }, { caption: 'x' }, {});
    const post = refineWithGeocode(pre, { name: 'Hallgrimskirkja' },
      [{ name: 'Hallgrimskirkja', address: 'Reykjavík, Iceland', city: 'Reykjavík' }], 'Iceland');
    assert.ok(post.codes.includes('geocode_city_match'), 'country-level city must still match');
  });

  test('a coarse city disagreement is cheap, not fatal', () => {
    const pre = scoreCandidate({ name: 'Moraine Lake', evidence: 'x', kind: 'region' }, { caption: 'x' }, {});
    const post = refineWithGeocode(pre, { name: 'Moraine Lake' },
      [{ name: 'Moraine Lake', address: 'Improvement District No. 9, AB', city: '' }], 'Banff');
    assert.ok(post.codes.includes('geocode_city_weak'));
    assert.ok(!post.codes.includes('geocode_city_mismatch'), 'the -3 penalty fired on correct rows');
  });

  test('a failed geocode is punished but the candidate survives', () => {
    const pre = scoreCandidate({ name: 'Somewhere', evidence: 'x', kind: 'venue' }, { caption: 'x' }, {});
    const post = refineWithGeocode(pre, { name: 'Somewhere' }, [], null);
    assert.ok(post.codes.includes('geocode_no_match'));
    assert.equal(post.geo, null);
  });

  test('tiers are cut where the labelled run put them', () => {
    // 27 Sept: every place at 10+ had the right pin; below 8, 7 of 8 were wrong
    assert.equal(tierOf(17), 'high');
    assert.equal(tierOf(10), 'high');
    assert.equal(tierOf(9), 'medium');
    assert.equal(tierOf(7), 'medium');
    assert.equal(tierOf(6), 'low');
  });

  test('accents fold instead of vanishing', () => {
    // "Forêt" normalised to "fort", so a correct pin scored as a partial match
    for (const [model, google] of [['Cafe Foret', 'Cafe Forêt'], ['Café 23', 'Cafe23'], ['Reykjavik', 'Reykjavík']]) {
      const pre = scoreCandidate({ name: model, evidence: model, kind: 'venue' }, { caption: model }, {});
      const post = refineWithGeocode(pre, { name: model }, [{ name: google, address: 'x', city: 'y' }], null);
      assert.ok(post.codes.includes('geocode_name_match'), `${model} vs ${google}`);
    }
  });
});

describe('confirm-card copy (§5.8)', () => {
  test('warnings beat positives', () => {
    const e = explain(['evidence_verified', 'name_in_caption', 'geocode_no_match']);
    assert.equal(e.tone, 'warn');
    assert.match(e.text, /find this on the map/);
  });

  test('the strongest positive wins', () => {
    assert.equal(explain(['handle_resolved_matches', 'address_present']).text, 'The caption gave a street address');
    assert.equal(explain(['handle_resolved_matches']).text, 'Matched from a tagged handle');
  });

  test('a weak city disagreement is not worth telling the user', () => {
    const e = explain(['geocode_name_match', 'geocode_city_weak']);
    assert.equal(e.tone, 'good', 'a -1 signal should not dominate the card');
  });

  test('every candidate gets a line', () => {
    assert.ok(explain([]).text.length > 0);
  });
});

describe('city normalisation (§6)', () => {
  test('strips province and park wording', () => {
    assert.equal(normaliseCity('Banff National Park, Alberta'), 'Banff');
    assert.equal(normaliseCity('Normandy, France'), 'Normandy');
    assert.equal(normaliseCity('Toronto'), 'Toronto');
    assert.equal(normaliseCity(null), null);
    assert.equal(normaliseCity(''), null);
  });
});

describe('geocode stage', () => {
  /** stand in for the proxy, so this test needs no key and no network */
  async function withStubProxy(handler, fn) {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ results: handler(JSON.parse(body)) }));
      });
    });
    await new Promise(r => server.listen(0, r));
    try { return await fn(`http://127.0.0.1:${server.address().port}/geocode`); }
    finally { server.close(); }
  }

  const place = (name, id) => ({ placeId: id, name, address: `${name}, Toronto, ON`, lat: 43.6, lng: -79.3, city: 'Toronto', neighbourhood: null, types: [] });

  test('one real place emitted twice collapses to one save', async () => {
    // event reels return the venue and the event held there; both geocode to
    // the same id. 11% of rows on the 12 Sept holdout.
    const candidates = [
      { name: 'College Park', kind: 'venue', score: 9, reasons: [], codes: ['evidence_verified'], geocodeQuery: 'College Park' },
      { name: 'College Park', kind: 'event', score: 8, reasons: [], codes: ['evidence_verified'], geocodeQuery: 'College Park' },
    ];
    const out = await withStubProxy(
      () => [place('College Park', 'ChIJ_same')],
      ep => geocodeCandidates(candidates, { city: 'Toronto', sourceUrl: 'u' }, { geocodeEndpoint: ep }));

    assert.equal(out.length, 1, 'the same place_id must not produce two saves');
    assert.equal(out[0].kind, 'venue', 'the higher-scoring row wins');
    assert.deepEqual(out[0].alsoSeenAs, ['event'], 'the other reading is remembered, not discarded');
  });

  test('a venue does not become its own headline', async () => {
    // College Park came back as venue and event under the same name; the
    // merge must not hang "College Park" on College Park as what's on
    const candidates = [
      { name: 'College Park', kind: 'venue', score: 9, reasons: [], codes: [], geocodeQuery: 'College Park' },
      { name: 'College Park', kind: 'event', score: 8, reasons: [], codes: [], geocodeQuery: 'College Park' },
    ];
    const out = await withStubProxy(
      () => [place('College Park', 'ChIJ_same')],
      ep => geocodeCandidates(candidates, { city: 'Toronto' }, { geocodeEndpoint: ep }));
    assert.equal(out[0].headline, null);
  });

  test("the pop-up survives the merge into its host venue", async () => {
    // reel DduaeqXppDq: "@chanelofficial cafe pop up at @dineencoffeeco".
    // Both rows geocode to Dineen; the saved place read "Dineen Coffee Co.,
    // coffee" and Chanel - the reason to go - was gone.
    const when = { text: 'Saturday, September 26', start: '2026-09-26', end: null, recurring: null };
    const candidates = [
      { name: 'Dineen Coffee Co.', kind: 'venue', score: 12, reasons: [], codes: [], geocodeQuery: 'Dineen Coffee Co.', headline: null, when: null },
      { name: 'CHANEL cafe pop-up', kind: 'event', score: 9, reasons: [], codes: [], geocodeQuery: 'Dineen Coffee Co.', headline: null, when },
    ];
    const out = await withStubProxy(
      () => [place('Dineen Coffee Co.', 'ChIJ_dineen')],
      ep => geocodeCandidates(candidates, { city: 'Toronto' }, { geocodeEndpoint: ep }));
    assert.equal(out.length, 1);
    assert.equal(out[0].name, 'Dineen Coffee Co.', 'the pin is still the venue');
    assert.equal(out[0].headline, 'CHANEL cafe pop-up');
    assert.deepEqual(out[0].when, when);
  });

  test("a headline the model gave wins over the event row's name", async () => {
    const candidates = [
      { name: 'Dineen Coffee Co.', kind: 'venue', score: 12, reasons: [], codes: [], geocodeQuery: 'Dineen', headline: 'CHANEL cafe pop-up' },
      { name: 'Chanel event', kind: 'event', score: 9, reasons: [], codes: [], geocodeQuery: 'Dineen', headline: null },
    ];
    const out = await withStubProxy(
      () => [place('Dineen Coffee Co.', 'ChIJ_dineen')],
      ep => geocodeCandidates(candidates, {}, { geocodeEndpoint: ep }));
    assert.equal(out[0].headline, 'CHANEL cafe pop-up');
  });

  test('search returns every match, not the single best one', async () => {
    // The stub returns id_1 twice. Search must return all three places, deduped.
    const out = await withStubProxy(
      () => [place('Bloom Cafe', 'id_1'), place('Bloom Restaurant', 'id_2'), place('Bloom Bar', 'id_3'), place('Bloom Cafe', 'id_1')],
      ep => searchPlaces('Bloom', { city: 'Toronto' }, { geocodeEndpoint: ep }));
    assert.deepEqual(out.map(p => p.name), ['Bloom Cafe', 'Bloom Restaurant', 'Bloom Bar'], "all of them, in Google's order, once each");
    for (const k of ['googlePlaceId', 'name', 'coordinate', 'address', 'neighbourhood',
                     'city', 'kind', 'sourceUrl', 'score', 'tier', 'reasons', 'explanation']) {
      assert.ok(k in out[0], `a search result is missing ${k}`);
    }
  });

  test('an empty search asks nothing', async () => {
    assert.deepEqual(await searchPlaces('   ', {}, { geocodeEndpoint: 'http://127.0.0.1:1/unused' }), []);
  });

  test('distinct places are kept', async () => {
    const candidates = [
      { name: 'A', kind: 'venue', score: 9, reasons: [], codes: [], geocodeQuery: 'A' },
      { name: 'B', kind: 'venue', score: 8, reasons: [], codes: [], geocodeQuery: 'B' },
    ];
    const out = await withStubProxy(
      b => [place(b.query, `id_${b.query}`)],
      ep => geocodeCandidates(candidates, {}, { geocodeEndpoint: ep }));
    assert.equal(out.length, 2);
  });

  test('emits the ResolvedPlace contract (§9)', async () => {
    const out = await withStubProxy(
      () => [place('Dual Citizen', 'ChIJabc')],
      ep => geocodeCandidates(
        [{ name: 'Dual Citizen', kind: 'venue', score: 9, reasons: [], codes: [], geocodeQuery: 'Dual Citizen' }],
        { city: 'Toronto', sourceUrl: 'https://www.instagram.com/reel/X/' }, { geocodeEndpoint: ep }));
    const p = out[0];
    for (const k of ['googlePlaceId', 'name', 'coordinate', 'address', 'neighbourhood',
                     'city', 'kind', 'sourceUrl', 'score', 'tier', 'reasons', 'explanation']) {
      assert.ok(k in p, `ResolvedPlace is missing ${k}`);
    }
    assert.equal(p.googlePlaceId, 'ChIJabc');
    assert.deepEqual(p.coordinate, { lat: 43.6, lng: -79.3 });
  });

  test('a daily limit is reported as such, not as a failed lookup', async () => {
    // the proxy caps each user per day; the app has to be able to say "you've
    // hit today's limit" instead of showing a bad guess with no explanation
    const server = createServer((_, res) => {
      res.statusCode = 429;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'daily_limit_reached', kind: 'geocode', limit: 800 }));
    });
    await new Promise(r => server.listen(0, r));
    try {
      const out = await geocodeCandidates(
        [{ name: 'Somewhere', kind: 'venue', score: 9, reasons: [], codes: [], geocodeQuery: 'Somewhere' }],
        {}, { geocodeEndpoint: `http://127.0.0.1:${server.address().port}/geocode` });
      assert.equal(out.length, 1, 'the candidate survives');
      assert.equal(out[0].geocodeError, 'daily_limit_reached');
    } finally { server.close(); }
  });

  test('a dead geocode endpoint does not lose the candidate', async () => {
    const out = await geocodeCandidates(
      [{ name: 'Somewhere', kind: 'venue', score: 9, reasons: [], codes: [], geocodeQuery: 'Somewhere' }],
      {}, { geocodeEndpoint: 'http://127.0.0.1:1/geocode' });
    assert.equal(out.length, 1, 'dropping it would lose the name the model found');
    assert.equal(out[0].googlePlaceId, null);
    assert.equal(out[0].name, 'Somewhere');
    assert.ok(out[0].geocodeError);
  });
});

describe('headline (what is on at the place)', () => {
  test('normaliseHeadline keeps short lines and drops noise', () => {
    assert.equal(normaliseHeadline('  CHANEL   cafe pop-up ', 'Dineen Coffee Co.'), 'CHANEL cafe pop-up');
    assert.equal(normaliseHeadline('Dineen Coffee Co.', 'Dineen Coffee Co.'), null, 'the name is not a headline');
    assert.equal(normaliseHeadline('', 'X'), null);
    assert.equal(normaliseHeadline(null, 'X'), null);
    assert.equal(normaliseHeadline(42, 'X'), null);
    assert.equal(normaliseHeadline('x'.repeat(61), 'X'), null, 'a paragraph is a copied caption, not a headline');
    assert.equal(normaliseHeadline('After Hours: free monthly outdoor movies, live music, community activities', 'College Park'), null,
      'a sentence is not a title');
    assert.equal(normaliseHeadline('Water Lantern Festival', 'Downsview Park'), 'Water Lantern Festival');
  });

  test('extractPlaces carries the headline from the model to the candidate', async () => {
    const reply = {
      city: 'Toronto',
      places: [{
        name: 'Dineen Coffee Co.', kind: 'venue', instagram_handle: 'dineencoffeeco',
        category: 'coffee', address: '140 Yonge St', evidence: '@dineencoffeeco',
        geocode_query: 'Dineen Coffee Co. 140 Yonge St Toronto',
        headline: 'CHANEL cafe pop-up',
        when: { text: 'Saturday, September 26', start: '2026-09-26', end: null, recurring: null },
      }],
      notes: null,
    };
    const server = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ text: JSON.stringify(reply), model: 'stub' }));
      });
    });
    await new Promise(r => server.listen(0, r));
    try {
      const parsed = parseReelPage(page('12 likes, 0 comments - torontopopups on September 25, 2026: &quot;Have you been to the &#064;chanelofficial cafe pop up at &#064;dineencoffeeco yet? 📍140 Yonge St&quot;'));
      const out = await extractPlaces(parsed, {}, { endpoint: `http://127.0.0.1:${server.address().port}/extract` });
      assert.equal(out.engine, 'model');
      assert.equal(out.candidates[0].headline, 'CHANEL cafe pop-up');
      assert.equal(out.candidates[0].when.start, '2026-09-26');
    } finally { server.close(); }
  });
});
