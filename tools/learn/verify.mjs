/**
 * Prüfskript für den gebauten Learn-Bereich — der Nachweis aus
 * CONCEPT-LEARN §7 („Lighthouse-SEO-Pass … oder gleichwertige Prüfung der
 * Head-Tags").
 *
 * Der Unterschied zu `pages.test.mjs`: die Tests prüfen die Regeln, dieses
 * Skript prüft die **ausgelieferten Dateien in `dist/`**. Es liest jede Seite
 * von der Platte, folgt ihren hreflang-Verweisen bis zur Datei, die dort
 * wirklich liegt, und liest deren Verweis zurück. Ein Generator, der sich
 * konsequent irrt, fällt einem Test über seine eigenen Funktionen nicht auf —
 * dieser Gegenprobe schon.
 *
 * Aufruf: `npm run verify:learn` (nach `npm run build`).
 *
 * Ausgabe: eine Zeile je Seite, danach die Gegenproben und zum Schluss die
 * **Berichte** — Dinge, die keine Fehler sind, aber jemandem gehören. Zum
 * Beispiel Titel über den 60 Zeichen aus §4: die Texte werden hier nicht
 * umgeschrieben, also nennt das Skript sie und entscheidet nicht.
 *
 * Rückgabewert 1, sobald eine Pflicht verletzt ist. Berichte allein sind kein
 * Fehlschlag.
 */

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { PAGE_ORDER, SITE, otherLang, parseFrontmatter, pathFor } from './pages.mjs';

const DIST = 'dist';
const CONTENT_DIR = 'content/learn';

const problems = [];
const notes = [];

function check(condition, message) {
  if (!condition) problems.push(message);
  return condition;
}

async function exists(path) {
  try {
    await access(join(DIST, path));
    return true;
  } catch {
    return false;
  }
}

/** Ein Attributwert aus dem Head. Bewusst mit regulären Ausdrücken: die zu
 * prüfenden Zeilen erzeugt derselbe Generator, sie haben genau eine Form. */
function tag(html, pattern) {
  const match = pattern.exec(html);
  return match ? match[1] : undefined;
}

function headTags(html) {
  return {
    lang: tag(html, /<html lang="([^"]+)">/),
    title: tag(html, /<title>([^<]*)<\/title>/),
    description: tag(html, /<meta name="description" content="([^"]*)"/),
    keywords: tag(html, /<meta name="keywords" content="([^"]*)"/),
    canonical: tag(html, /<link rel="canonical" href="([^"]+)"/),
    xDefault: tag(html, /<link rel="alternate" hreflang="x-default" href="([^"]+)"/),
    ogTitle: tag(html, /<meta property="og:title" content="([^"]*)"/),
    ogDescription: tag(html, /<meta property="og:description" content="([^"]*)"/),
    ogUrl: tag(html, /<meta property="og:url" content="([^"]+)"/),
    ogType: tag(html, /<meta property="og:type" content="([^"]+)"/),
    ogImage: tag(html, /<meta property="og:image" content="([^"]+)"/),
    ogLocale: tag(html, /<meta property="og:locale" content="([^"]+)"/),
    jsonLd: tag(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/),
    hreflang: Object.fromEntries(
      [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(
        (match) => [match[1], match[2]],
      ),
    ),
    h1: [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((match) => match[1]),
    headings: [...html.matchAll(/<h([1-6])>/g)].map((match) => Number(match[1])),
  };
}

async function main() {
  // 1. Was der Inhalt verspricht — daraus ergibt sich, was in dist liegen muss.
  const files = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith('.md')).sort();

  const pages = [];
  for (const name of files) {
    const { meta } = parseFrontmatter(await readFile(join(CONTENT_DIR, name), 'utf8'), name);
    const path = `${pathFor(meta.lang, meta.slug)}index.html`;
    if (!(await exists(path))) {
      problems.push(`${path} fehlt in dist/ — ist "npm run build" gelaufen?`);
      continue;
    }
    const html = await readFile(join(DIST, path), 'utf8');
    pages.push({ meta, name, path, html, head: headTags(html) });
  }

  check(pages.length === 14, `14 Seiten erwartet, ${pages.length} gefunden`);

  const byUrl = new Map(pages.map((page) => [`${SITE}${pathFor(page.meta.lang, page.meta.slug)}`, page]));

  console.log('Seite                                     h1  canonical  hreflang  og  ld  Titel');
  console.log('-'.repeat(86));

  for (const page of pages) {
    const { head, meta } = page;
    const canonical = `${SITE}${pathFor(meta.lang, meta.slug)}`;
    const pairUrl = `${SITE}${pathFor(otherLang(meta.lang), meta.pair)}`;
    const enUrl = meta.lang === 'en' ? canonical : pairUrl;

    const okH1 = check(head.h1.length === 1, `${page.path}: ${head.h1.length} h1`);
    const okLang = check(head.lang === meta.lang, `${page.path}: lang="${head.lang}"`);
    const okCanonical = check(
      head.canonical === canonical,
      `${page.path}: canonical ist ${head.canonical}, erwartet ${canonical}`,
    );
    const okSelf = check(
      head.hreflang[meta.lang] === canonical,
      `${page.path}: hreflang="${meta.lang}" zeigt nicht auf sich`,
    );
    const okPair = check(
      head.hreflang[otherLang(meta.lang)] === pairUrl,
      `${page.path}: hreflang="${otherLang(meta.lang)}" ist ${head.hreflang[otherLang(meta.lang)]}, erwartet ${pairUrl}`,
    );
    const okDefault = check(
      head.xDefault === enUrl,
      `${page.path}: x-default ist ${head.xDefault}, erwartet ${enUrl} (EN-first)`,
    );

    // Gegenprobe auf der Platte: die Datei, auf die hreflang zeigt, muss
    // existieren und hierher zurückzeigen.
    const partner = byUrl.get(pairUrl);
    const okBack = check(Boolean(partner), `${page.path}: Pendant ${pairUrl} liegt nicht in dist/`);
    if (partner) {
      check(
        partner.head.hreflang[meta.lang] === canonical,
        `${page.path}: ${partner.path} verweist mit hreflang="${meta.lang}" auf ${partner.head.hreflang[meta.lang]}, nicht zurück`,
      );
      check(
        partner.head.xDefault === enUrl,
        `${page.path}: ${partner.path} nennt ein anderes x-default (${partner.head.xDefault})`,
      );
    }

    const okOg = [
      check(head.ogType === 'article', `${page.path}: og:type fehlt`),
      check(head.ogTitle === head.title, `${page.path}: og:title ≠ title`),
      check(Boolean(head.ogDescription), `${page.path}: og:description fehlt`),
      check(head.ogUrl === canonical, `${page.path}: og:url ≠ canonical`),
      check(Boolean(head.ogImage), `${page.path}: og:image fehlt`),
      check(Boolean(head.ogLocale), `${page.path}: og:locale fehlt`),
      check(
        await exists(head.ogImage.replace(SITE, '')),
        `${page.path}: og:image ${head.ogImage} liegt nicht in dist/`,
      ),
    ].every(Boolean);

    let okLd = false;
    try {
      const data = JSON.parse(head.jsonLd.replace(/\\u003c/g, '<'));
      okLd = [
        check(data['@type'] === 'Article', `${page.path}: JSON-LD ist kein Article`),
        check(data.headline === head.h1[0], `${page.path}: JSON-LD headline ≠ h1`),
        check(
          data.description === meta.metaDescription,
          `${page.path}: JSON-LD description ≠ metaDescription`,
        ),
        check(
          data.datePublished === meta.datePublished,
          `${page.path}: JSON-LD datePublished ≠ Frontmatter`,
        ),
        check(data.inLanguage === meta.lang, `${page.path}: JSON-LD inLanguage ≠ lang`),
        check(data.publisher?.name === 'Morse Lab', `${page.path}: JSON-LD publisher fehlt`),
      ].every(Boolean);
    } catch (error) {
      problems.push(`${page.path}: JSON-LD nicht lesbar (${error.message})`);
    }

    // Saubere Hierarchie: nach der h1 kommt h2, kein Sprung auf h3+.
    let previous = 1;
    for (const level of head.headings.slice(1)) {
      if (level > previous + 1) {
        problems.push(`${page.path}: Überschriftensprung von h${previous} auf h${level}`);
      }
      previous = level;
    }

    // Berichte, keine Fehler.
    if (meta.metaTitle.length > 60) {
      notes.push(`${page.name}: metaTitle ist ${meta.metaTitle.length} Zeichen (§4 nennt ≤ 60)`);
    }
    // Nur nach oben berichtet: eine kürzere Beschreibung wird angezeigt, eine
    // längere abgeschnitten. §4 nennt ~150–160 als Zielband.
    if (meta.metaDescription.length > 160) {
      notes.push(
        `${page.name}: metaDescription ist ${meta.metaDescription.length} Zeichen (§4 nennt ~150–160)`,
      );
    }

    const mark = (ok) => (ok ? 'ja ' : 'NEIN');
    console.log(
      `${page.path.padEnd(41)} ${mark(okH1 && okLang)} ${mark(okCanonical).padEnd(9)}  ` +
        `${mark(okSelf && okPair && okDefault && okBack).padEnd(8)}  ${mark(okOg)} ${mark(okLd)} ` +
        `${meta.metaTitle.length}`,
    );
  }

  // 2. Sitemap: jede genannte Adresse muss als Datei existieren, und jede
  //    Seite muss genannt sein.
  const sitemapPath = 'sitemap.xml';
  if (check(await exists(sitemapPath), 'dist/sitemap.xml fehlt')) {
    const xml = await readFile(join(DIST, sitemapPath), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    check(locs.length === 15, `sitemap: ${locs.length} <loc>, erwartet 15 (Wurzel + 14 Seiten)`);
    check(locs.includes(`${SITE}/`), 'sitemap: die Wurzel fehlt');
    for (const page of pages) {
      const url = `${SITE}${pathFor(page.meta.lang, page.meta.slug)}`;
      check(locs.includes(url), `sitemap: ${url} fehlt`);
    }
    for (const loc of locs) {
      const path = loc.replace(SITE, '').replace(/\/$/, '/index.html') || 'index.html';
      check(await exists(path), `sitemap: ${loc} zeigt auf ${path}, das nicht existiert`);
    }
    check(
      PAGE_ORDER.length === 13,
      `PAGE_ORDER hat ${PAGE_ORDER.length} Einträge, erwartet 13 (index zählt für beide Sprachen)`,
    );
  }

  // 3. Assets: Stylesheet mit eingesetztem Token-Block, und die vier Schriften.
  const cssPath = 'learn/assets/learn.css';
  if (check(await exists(cssPath), 'dist/learn/assets/learn.css fehlt')) {
    const css = await readFile(join(DIST, cssPath), 'utf8');
    check(!css.includes('/* @tokens */'), 'learn.css: der Token-Marker steht noch drin');
    check(css.includes('--paper: #F6F1E8'), 'learn.css: der Token-Block fehlt');
    // Kein Farbliteral außerhalb des Token-Blocks (CLAUDE.md 2.9). Der eine
    // erlaubte Treffer außerhalb ist theme-color im HTML, nicht hier.
    const tokenBlock = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')));
    const literals = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].filter(
      (match) => !tokenBlock.includes(match[0]),
    );
    check(
      literals.length === 0,
      `learn.css: Farbliteral außerhalb der Tokens: ${literals.map((m) => m[0]).join(', ')}`,
    );
  }
  for (const font of [
    'newsreader-latin-wght-normal.woff2',
    'ibm-plex-sans-latin-400-normal.woff2',
    'ibm-plex-sans-latin-500-normal.woff2',
    'ibm-plex-sans-latin-600-normal.woff2',
  ]) {
    check(await exists(`learn/assets/${font}`), `dist/learn/assets/${font} fehlt`);
  }

  // 4. Der Service Worker cached die Learn-Seiten NICHT vorab
  //    (CONCEPT-LEARN §3, Aufgabenpunkt 4).
  if (check(await exists('sw.js'), 'dist/sw.js fehlt')) {
    const sw = await readFile(join(DIST, 'sw.js'), 'utf8');
    const precache = /const PRECACHE = \[([^\]]*)\]/.exec(sw);
    if (check(Boolean(precache), 'sw.js: PRECACHE nicht gefunden')) {
      check(
        !precache[1].includes('/learn'),
        `sw.js: PRECACHE nennt Learn-Seiten: ${precache[1].trim()}`,
      );
    }
    const assets = /self\.__BUILD_ASSETS|const BUILD_ASSETS = (\[[^\]]*\])/.exec(sw);
    if (assets && assets[1]) {
      check(!assets[1].includes('/learn/'), 'sw.js: die Asset-Liste nennt Learn-Dateien');
    }
    check(
      sw.includes('LEARN_PREFIXES') || sw.includes('isLearnPath'),
      'sw.js: keine Ausnahme für die Learn-Pfade in der Navigationsbehandlung',
    );
  }

  console.log();
  if (notes.length > 0) {
    console.log(`Berichte (${notes.length}) — keine Fehler, aber jemandes Entscheidung:`);
    for (const note of notes) console.log(`  · ${note}`);
    console.log();
  }
  if (problems.length > 0) {
    console.log(`FEHLER (${problems.length}):`);
    for (const problem of problems) console.log(`  × ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Alle Pflichten erfüllt: ${pages.length} Seiten, Sitemap, Assets, Service Worker.`);
}

main().catch((error) => {
  console.error(`verify-learn fehlgeschlagen: ${error.stack}`);
  process.exitCode = 1;
});
