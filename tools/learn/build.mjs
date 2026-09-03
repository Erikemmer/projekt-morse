/**
 * Der Learn-Generator, Ein- und Ausgabe: `content/learn/*.md` → `dist/learn/`
 * und `dist/de/lernen/`, plus `dist/sitemap.xml`.
 *
 * Läuft nach `vite build` (siehe `npm run build`) — nicht davor: Vite räumt
 * `dist/` beim Bauen aus und würde die Seiten sonst gleich wieder mitnehmen.
 *
 * Was er anfasst: ausschließlich `dist/`. Die App an der Wurzel bleibt, wie
 * Vite sie hinterlassen hat.
 *
 * Die Regeln stehen in `pages.mjs`; hier steht nur, welche Datei wohin geht.
 */

import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { parseFrontmatter, pathFor, renderPage, renderSitemap } from './pages.mjs';

// Zwei Inhaltsordner (Ruling L2): `learn` sind die redaktionellen Artikel
// (Fable), `legal` sind Impressum/Datenschutz (Ruling L2, Punkt 1) -- beide
// laufen durch denselben Generator und landen in derselben Seitenliste, damit
// die Pendant- und hreflang-Pruefung unten beide Baeume gemeinsam sieht.
const CONTENT_DIRS = ['content/learn', 'content/legal'];
const DIST = 'dist';
const STYLESHEET = 'tools/learn/learn.css';
const FONT_DIR = 'src/fonts';
const FONTS = [
  'newsreader-latin-wght-normal.woff2',
  'ibm-plex-sans-latin-400-normal.woff2',
  'ibm-plex-sans-latin-500-normal.woff2',
  'ibm-plex-sans-latin-600-normal.woff2',
];

/** Wohin die Assets kommen, auf die learn.css und alle Seiten zeigen. */
const ASSET_PATH = 'learn/assets';

/**
 * Der Token-Block der App in das Learn-Stylesheet einsetzen.
 *
 * Damit gibt es die Farben nur einmal im Repo (CLAUDE.md 2.9). Der Block wird
 * wörtlich übernommen, Kommentare inklusive — wer die Tokens im gelieferten
 * CSS liest, liest dieselbe Begründung wie in `src/styles.css`.
 *
 * Findet sich der Block oder der Marker nicht, bricht der Build ab. Ein
 * Stylesheet ohne Tokens wäre eine Seite ohne Farben, und die soll niemand
 * versehentlich ausliefern (dieselbe Haltung wie beim SW-Marker in
 * vite.config.ts).
 */
async function buildStylesheet() {
  const appCss = await readFile('src/styles.css', 'utf8');
  const start = appCss.indexOf(':root {');
  if (start === -1) throw new Error('src/styles.css: :root-Block nicht gefunden');
  const end = appCss.indexOf('\n}', start);
  if (end === -1) throw new Error('src/styles.css: Ende des :root-Blocks nicht gefunden');
  const tokens = appCss.slice(start, end + 2);
  if (!tokens.includes('--paper:') || !tokens.includes('--amber-deep:')) {
    throw new Error('src/styles.css: der :root-Block enthält die erwarteten Tokens nicht');
  }

  const template = await readFile(STYLESHEET, 'utf8');
  const marker = '/* @tokens */';
  if (!template.includes(marker)) {
    throw new Error(`${STYLESHEET}: Marker ${marker} nicht gefunden`);
  }
  return template.replace(marker, tokens);
}

async function write(relativePath, contents) {
  const target = join(DIST, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return target;
}

async function main() {
  const pages = [];
  for (const dir of CONTENT_DIRS) {
    const files = (await readdir(dir)).filter((name) => name.endsWith('.md')).sort();
    if (files.length === 0) throw new Error(`${dir}: keine Markdown-Dateien`);

    for (const file of files) {
      const source = await readFile(join(dir, file), 'utf8');
      const { meta, body } = parseFrontmatter(source, file);
      // Der Dateiname trägt Slug und Sprache; weicht er vom Frontmatter ab, ist
      // eine der beiden Angaben falsch, und beide werden gebraucht.
      const expected = `${meta.slug}.${meta.lang}.md`;
      if (file !== expected) throw new Error(`${file}: Frontmatter erwartet den Namen ${expected}`);
      pages.push({ meta, body, name: file });
    }
  }

  // Jedes Paar muss sich gegenseitig nennen — sonst zeigt hreflang ins Leere.
  const byKey = new Map(pages.map((page) => [`${page.meta.lang}:${page.meta.slug}`, page]));
  for (const page of pages) {
    const other = page.meta.lang === 'en' ? 'de' : 'en';
    const partner = byKey.get(`${other}:${page.meta.pair}`);
    if (!partner) throw new Error(`${page.name}: kein Pendant ${other}:${page.meta.pair}`);
    if (partner.meta.pair !== page.meta.slug) {
      throw new Error(`${page.name}: ${partner.name} zeigt auf ${partner.meta.pair}, nicht zurück`);
    }
  }

  const written = [];
  for (const page of pages) {
    const html = renderPage(page);
    const path = pathFor(page.meta.lang, page.meta.slug, page.meta.section);
    written.push(await write(`${path}index.html`, html));
  }

  written.push(await write('sitemap.xml', renderSitemap(pages)));
  written.push(await write(`${ASSET_PATH}/learn.css`, await buildStylesheet()));

  await mkdir(join(DIST, ASSET_PATH), { recursive: true });
  for (const font of FONTS) {
    const target = join(DIST, ASSET_PATH, font);
    await cp(join(FONT_DIR, font), target);
    written.push(target);
  }

  console.log(`learn: ${pages.length} Seiten, ${written.length} Dateien`);
  for (const path of written) console.log(`  ${path}`);
}

main().catch((error) => {
  console.error(`learn-build fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
});
