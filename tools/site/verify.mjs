/**
 * Prüft, was die **gebaute** Startseite nach außen zeigt: Head-Tags für
 * Suchmaschinen und Link-Vorschauen, `robots.txt`, `_headers`.
 *
 * Gegenstück zu `tools/learn/verify.mjs` -- das prüft die Learn-Seiten, die
 * Startseite kam dort nie vor und stand deshalb lange ohne Beschreibung und
 * ohne Vorschaubild da.
 *
 * Aufruf: `npm run verify:site` (nach `vite build`). Rückgabewert 1, sobald
 * eine Pflicht verletzt ist.
 */

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://morse-lab.com';

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

const exists = (path) =>
  access(join(DIST, path)).then(
    () => true,
    () => false,
  );

/** Attributwert aus dem Head; Leerraum (Zeilenumbrüche im Tag) ist erlaubt. */
const attr = (html, pattern) => pattern.exec(html)?.[1];

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(join(DIST, 'manifest.webmanifest'), 'utf8'));

const title = attr(html, /<title>([^<]+)<\/title>/);
const description = attr(html, /<meta\s+name="description"\s+content="([^"]+)"/);
const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
const ogTitle = attr(html, /<meta property="og:title" content="([^"]+)"/);
const ogDescription = attr(html, /<meta\s+property="og:description"\s+content="([^"]+)"/);
const ogUrl = attr(html, /<meta property="og:url" content="([^"]+)"/);
const ogImage = attr(html, /<meta property="og:image" content="([^"]+)"/);

check(Boolean(title) && title.length <= 60, `title fehlt oder ist länger als 60 Zeichen: ${title}`);
// Ein Wortlaut, eine Quelle: die Beschreibung ist die des Manifests.
check(description === manifest.description, 'description weicht vom Manifest ab');
check(canonical === `${SITE}/`, `canonical ist "${canonical}"`);
check(ogTitle === title, 'og:title ≠ title');
check(ogDescription === description, 'og:description ≠ description');
check(ogUrl === canonical, 'og:url ≠ canonical');
check(Boolean(ogImage) && ogImage.startsWith(`${SITE}/`), `og:image ist "${ogImage}"`);
if (ogImage) {
  check(await exists(ogImage.slice(SITE.length)), `og:image ${ogImage} liegt nicht in dist/`);
}

const ldSource = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
try {
  const data = JSON.parse(ldSource);
  check(data['@type'] === 'WebApplication', 'JSON-LD ist keine WebApplication');
  check(data.url === canonical, 'JSON-LD url ≠ canonical');
  check(data.description === description, 'JSON-LD description ≠ description');
} catch (error) {
  problems.push(`JSON-LD nicht lesbar (${error.message})`);
}

check(/<noscript>[\s\S]*href="\/learn\/"[\s\S]*<\/noscript>/.test(html), 'noscript-Rückfall fehlt');

// Jedes Preload muss auf eine Datei zeigen, die der Build wirklich geschrieben
// hat -- ein toter Preload kostet einen Abruf und eine Konsolenwarnung.
const preloads = [...html.matchAll(/<link\s+rel="preload"\s+href="([^"]+)"[^>]*>/g)];
check(preloads.length > 0, 'kein Schrift-Preload im Head');
for (const [tag, href] of preloads) {
  check(await exists(href), `Preload ${href} liegt nicht in dist/`);
  check(/\scrossorigin/.test(tag), `Preload ${href} ohne crossorigin`);
}

const robots = (await exists('robots.txt')) ? await readFile(join(DIST, 'robots.txt'), 'utf8') : '';
check(robots.includes(`Sitemap: ${SITE}/sitemap.xml`), 'robots.txt nennt die Sitemap nicht');
check(!/<html/i.test(robots), 'robots.txt ist HTML');

const headers = (await exists('_headers')) ? await readFile(join(DIST, '_headers'), 'utf8') : '';
check(/^\/assets\/\*\n\s+Cache-Control: .*immutable/m.test(headers), '_headers: /assets/* ohne immutable');

if (problems.length > 0) {
  console.error('Startseite: Pflichten verletzt:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Startseite: Head-Tags, robots.txt und _headers in Ordnung (${preloads.length} Preloads).`);
