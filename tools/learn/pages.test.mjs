/**
 * Tests für den Learn-Generator.
 *
 * Sie liegen bei ihrem Gegenstand und nicht in `src/engine/`, weil dieser Code
 * kein Teil der App ist — er läuft im Build. `vite.config.ts` nimmt sie
 * deshalb zusätzlich in `include` auf. Geprüft wird dieselbe Art von Sache wie
 * in der Engine: die subtilen Stellen, an denen ein Fehler still bleibt.
 *
 * Zwei Blöcke: die reinen Regeln an Miniaturbeispielen, und danach die
 * **echten 14 Dateien** aus `content/learn/` — die SEO-Pflichten aus
 * CONCEPT-LEARN §4 sind Eigenschaften der ausgelieferten Seiten, nicht einer
 * Testvorlage. Die hreflang-Gegenprobe in beide Richtungen steht damit hier,
 * nicht nur im Prüfskript.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SITE,
  otherLang,
  parseFrontmatter,
  pathFor,
  renderArticle,
  renderPage,
  renderSitemap,
  urlFor,
} from './pages.mjs';

const CONTENT_DIR = 'content/learn';

const FRONTMATTER = `---
slug: demo
lang: en
pair: vorlage
metaTitle: "Demo — Morse Lab"
metaDescription: "Eine Beschreibung."
keywords: "demo, morse"
datePublished: 2026-09-02
---

# Die Überschrift

Ein Absatz mit [Link](/learn/koch-method/).

*Start hearing it → [Open Morse Lab](/)*
`;

function pageFrom(source, name = 'demo.en.md') {
  const { meta, body } = parseFrontmatter(source, name);
  return renderPage({ meta, body, name });
}

describe('parseFrontmatter', () => {
  it('liest alle Schlüssel und entfernt die Anführungszeichen', () => {
    const { meta, body } = parseFrontmatter(FRONTMATTER);
    expect(meta).toMatchObject({
      slug: 'demo',
      lang: 'en',
      pair: 'vorlage',
      metaTitle: 'Demo — Morse Lab',
      metaDescription: 'Eine Beschreibung.',
      datePublished: '2026-09-02',
    });
    expect(body.trimStart().startsWith('# Die Überschrift')).toBe(true);
  });

  it('bricht ohne Frontmatter-Block ab', () => {
    expect(() => parseFrontmatter('# Nur Text\n')).toThrow(/kein Frontmatter/);
  });

  it('bricht bei fehlendem Pflichtfeld ab', () => {
    const ohnePair = FRONTMATTER.replace('pair: vorlage\n', '');
    expect(() => parseFrontmatter(ohnePair)).toThrow(/ohne pair/);
  });

  it('bricht bei einer unbekannten Sprache ab', () => {
    expect(() => parseFrontmatter(FRONTMATTER.replace('lang: en', 'lang: fr'))).toThrow(
      /weder en noch de/,
    );
  });

  it('bricht bei einem Datum ohne ISO-Form ab', () => {
    expect(() => parseFrontmatter(FRONTMATTER.replace('2026-09-02', '2. September'))).toThrow(
      /kein ISO-Datum/,
    );
  });
});

describe('Adressen', () => {
  it('legt den Hub auf die Wurzel des Sprachbaums', () => {
    expect(pathFor('en', 'index')).toBe('/learn/');
    expect(pathFor('de', 'index')).toBe('/de/lernen/');
  });

  it('hängt Artikel mit Schrägstrich am Ende an', () => {
    expect(pathFor('en', 'koch-method')).toBe('/learn/koch-method/');
    expect(pathFor('de', 'koch-methode')).toBe('/de/lernen/koch-methode/');
    expect(urlFor('de', 'koch-methode')).toBe(`${SITE}/de/lernen/koch-methode/`);
  });

  it('kennt genau zwei Sprachen', () => {
    expect(otherLang('en')).toBe('de');
    expect(otherLang('de')).toBe('en');
    expect(() => pathFor('fr', 'index')).toThrow(/unbekannte Sprache/);
  });
});

describe('renderArticle', () => {
  it('verlangt genau eine H1', () => {
    expect(() => renderArticle('Kein Titel.\n', 'x')).toThrow(/0 H1/);
    expect(() => renderArticle('# Eins\n\n# Zwei\n', 'x')).toThrow(/2 H1/);
  });

  it('verlangt die H1 als ersten Block', () => {
    expect(() => renderArticle('Vorwort.\n\n# Titel\n', 'x')).toThrow(/nicht der erste Block/);
  });

  it('zieht den CTA aus der letzten Kursivzeile', () => {
    const { cta, html } = renderArticle(
      '# Titel\n\nText.\n\n*Start hearing it → [Open Morse Lab](/)*\n',
      'x',
    );
    expect(cta).toBe('Start hearing it → Open Morse Lab');
    expect(html).not.toContain('Open Morse Lab');
  });

  it('lässt eine Kursivzeile ohne App-Link im Text stehen', () => {
    const { cta, html } = renderArticle('# Titel\n\n*Auch [koch](/learn/koch-method/).*\n', 'x', 'en');
    expect(cta).toBeUndefined();
    expect(html).toContain('<p class="aside">Auch <a href="/learn/koch-method/">koch</a>.</p>');
  });

  it('markiert eine Randnotiz, die in den anderen Sprachbaum führt, mit lang', () => {
    const en = renderArticle('# Titel\n\n*Auch [auf Deutsch](/de/lernen/).*\n', 'x', 'en');
    expect(en.html).toContain('<p class="aside" lang="de">');
    const de = renderArticle('# Titel\n\n*Also [in English](/learn/).*\n', 'x', 'de');
    expect(de.html).toContain('<p class="aside" lang="en">');
  });

  it('gibt einer Tabelle ohne Kopfzeile kein leeres thead', () => {
    const { html } = renderArticle('# Titel\n\n| | |\n|---|---|\n| **A** ·− | **B** −··· |\n', 'x');
    expect(html).toContain('<div class="table-wrap">');
    expect(html).not.toContain('<thead>');
    expect(html).toContain('<strong>A</strong> ·−');
  });

  it('behält eine echte Kopfzeile', () => {
    const { html } = renderArticle('# Titel\n\n| Sign | Code |\n|---|---|\n| . | ·−·−·− |\n', 'x');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>Sign</th>');
  });
});

describe('renderPage', () => {
  const html = pageFrom(FRONTMATTER);

  it('setzt lang, canonical und genau eine H1', () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/learn/demo/" />`);
    expect(html.match(/<h1>/g)).toHaveLength(1);
  });

  it('nennt hreflang für beide Sprachen und x-default in Englisch', () => {
    expect(html).toContain(`<link rel="alternate" hreflang="en" href="${SITE}/learn/demo/" />`);
    expect(html).toContain(
      `<link rel="alternate" hreflang="de" href="${SITE}/de/lernen/vorlage/" />`,
    );
    expect(html).toContain(
      `<link rel="alternate" hreflang="x-default" href="${SITE}/learn/demo/" />`,
    );
  });

  it('zeigt x-default auch von der deutschen Seite auf Englisch', () => {
    const de = pageFrom(
      FRONTMATTER.replace('lang: en', 'lang: de').replace('pair: vorlage', 'pair: template'),
      'demo.de.md',
    );
    expect(de).toContain('<html lang="de">');
    expect(de).toContain(
      `<link rel="alternate" hreflang="x-default" href="${SITE}/learn/template/" />`,
    );
    expect(de).toContain('<a class="masthead-app" href="/">Zur App</a>');
  });

  it('macht aus dem CTA den einen gefüllten Amber-Knopf', () => {
    expect(html).toContain('<p class="cta"><a href="/">Start hearing it → Open Morse Lab</a></p>');
    expect(html.match(/class="cta"/g)).toHaveLength(1);
  });

  it('trennt mit echtem Code: −− ·−·· ist ML', () => {
    const ornament = /<div class="ornament"[\s\S]*?<\/div>/.exec(html)[0];
    const shapes = [...ornament.matchAll(/<span class="ornament-letter">([\s\S]*?)<\/span>/g)].map(
      (match) =>
        [...match[1].matchAll(/data-kind="(dit|dah)"/g)]
          .map((kind) => (kind[1] === 'dah' ? '-' : '.'))
          .join(''),
    );
    expect(shapes).toEqual(['--', '.-..']);
  });

  it('führt in der Fußzeile auf das hreflang-Pendant und den Hub', () => {
    expect(html).toContain('<a href="/de/lernen/vorlage/" hreflang="de">Deutsch</a>');
    expect(html).toContain('<a href="/learn/">Learn</a>');
    expect(html).toContain('<span>© Morse Lab</span>');
  });

  it('lässt den Hub-Link auf dem Hub selbst weg', () => {
    const hub = pageFrom(
      FRONTMATTER.replace('slug: demo', 'slug: index').replace('pair: vorlage', 'pair: index'),
      'index.en.md',
    );
    expect(hub).toContain('<a href="/de/lernen/" hreflang="de">Deutsch</a>');
    expect(hub).not.toContain('>Learn</a>');
  });

  it('liefert gültiges JSON-LD vom Typ Article', () => {
    const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1];
    const data = JSON.parse(raw.replace(/\\u003c/g, '<'));
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Die Überschrift',
      description: 'Eine Beschreibung.',
      datePublished: '2026-09-02',
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: 'Morse Lab' },
    });
  });
});

describe('renderSitemap', () => {
  it('nennt die Wurzel und jede Seite mit ihren Alternativen', () => {
    const pages = [
      { meta: { slug: 'index', lang: 'en', pair: 'index', datePublished: '2026-09-02' } },
      { meta: { slug: 'index', lang: 'de', pair: 'index', datePublished: '2026-09-02' } },
    ];
    const xml = renderSitemap(pages);
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/learn/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/de/lernen/</loc>`);
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('hreflang="x-default"');
    // Keine erfundenen Kennzahlen (CLAUDE.md 2.6).
    expect(xml).not.toContain('priority');
    expect(xml).not.toContain('changefreq');
  });
});

describe('die echten Inhalte', async () => {
  const files = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith('.md')).sort();
  const pages = [];
  for (const file of files) {
    const source = await readFile(join(CONTENT_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(source, file);
    pages.push({ meta, body, name: file, html: renderPage({ meta, body, name: file }) });
  }

  it('sind 14 Seiten, sieben je Sprache', () => {
    expect(pages).toHaveLength(14);
    expect(pages.filter((page) => page.meta.lang === 'en')).toHaveLength(7);
    expect(pages.filter((page) => page.meta.lang === 'de')).toHaveLength(7);
  });

  it('bilden lauter wechselseitige Paare', () => {
    const byKey = new Map(pages.map((page) => [`${page.meta.lang}:${page.meta.slug}`, page]));
    for (const page of pages) {
      const partner = byKey.get(`${otherLang(page.meta.lang)}:${page.meta.pair}`);
      expect(partner, `Pendant von ${page.name}`).toBeDefined();
      expect(partner.meta.pair, `Rückverweis von ${partner.name}`).toBe(page.meta.slug);
    }
  });

  it.each(files)('%s erfüllt die Head-Pflichten', (file) => {
    const page = pages.find((entry) => entry.name === file);
    const canonical = urlFor(page.meta.lang, page.meta.slug);
    const pairUrl = urlFor(otherLang(page.meta.lang), page.meta.pair);

    expect(page.html).toContain(`<html lang="${page.meta.lang}">`);
    expect(page.html.match(/<h1>/g)).toHaveLength(1);
    expect(page.html).toContain(`<link rel="canonical" href="${canonical}" />`);
    expect(page.html).toContain(
      `<link rel="alternate" hreflang="${page.meta.lang}" href="${canonical}" />`,
    );
    expect(page.html).toContain(
      `<link rel="alternate" hreflang="${otherLang(page.meta.lang)}" href="${pairUrl}" />`,
    );
    expect(page.html).toContain(
      `<link rel="alternate" hreflang="x-default" href="${page.meta.lang === 'en' ? canonical : pairUrl}" />`,
    );
    expect(page.html).toContain(`<meta property="og:url" content="${canonical}" />`);
    expect(page.html).toContain('<meta property="og:type" content="article" />');
    expect(page.html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\.png" \/>/);
    expect(page.html).toContain('<p class="cta">');

    // Beschreibung im Zielband ~150-160 Zeichen (CONCEPT-LEARN §4). Die
    // Laenge des Titels prueft `verify.mjs` und *berichtet* sie: fuenf Titel
    // liegen ueber den 60 Zeichen aus §4, und Texte werden hier nicht
    // umgeschrieben -- das ist eine Frage an Fable, kein Testfehler
    // (siehe HANDOVER.md, "Zwei Konflikte im Inhalt").
    expect(page.meta.metaDescription.length, `metaDescription von ${file}`).toBeGreaterThanOrEqual(
      120,
    );
    expect(page.meta.metaDescription.length, `metaDescription von ${file}`).toBeLessThanOrEqual(200);
  });

  it('verlinkt intern nur auf Adressen, die es gibt', () => {
    const known = new Set(pages.map((page) => pathFor(page.meta.lang, page.meta.slug)));
    known.add('/');
    for (const page of pages) {
      for (const match of page.html.matchAll(/href="(\/[^"]*)"/g)) {
        const href = match[1];
        if (href.startsWith('/learn/assets/') || href.startsWith('/icons/')) continue;
        if (href === '/favicon.svg') continue;
        expect(known, `${page.name} verlinkt ${href}`).toContain(href);
      }
    }
  });

  it('führt von jedem Artikel zurück auf den Pillar und in die App', () => {
    const pillars = { en: 'how-to-learn-morse-code', de: 'morsecode-lernen' };
    for (const lang of ['en', 'de']) {
      const articles = pages.filter(
        (page) =>
          page.meta.lang === lang && page.meta.slug !== 'index' && page.meta.slug !== pillars[lang],
      );
      for (const page of articles) {
        expect(page.html, `${page.name} → Pillar`).toContain(
          `href="${pathFor(lang, pillars[lang])}"`,
        );
        expect(page.html, `${page.name} → App`).toContain('href="/"');
      }
    }
  });

  it('lässt den Hub alle sechs Artikel listen', () => {
    for (const lang of ['en', 'de']) {
      const hub = pages.find((page) => page.meta.lang === lang && page.meta.slug === 'index');
      const articles = pages.filter(
        (page) => page.meta.lang === lang && page.meta.slug !== 'index',
      );
      expect(articles).toHaveLength(6);
      for (const page of articles) {
        expect(hub.html, `Hub ${lang} → ${page.meta.slug}`).toContain(
          `href="${pathFor(lang, page.meta.slug)}"`,
        );
      }
    }
  });

  it('gibt dem fremdsprachigen Hinweis auf dem Hub ein lang-Attribut', () => {
    const en = pages.find((page) => page.meta.lang === 'en' && page.meta.slug === 'index');
    const de = pages.find((page) => page.meta.lang === 'de' && page.meta.slug === 'index');
    expect(en.html).toContain('<p class="aside" lang="de">');
    expect(de.html).toContain('<p class="aside" lang="en">');
  });

  it('nennt jede Seite in der Sitemap', () => {
    const xml = renderSitemap(pages);
    expect(xml.match(/<url>/g)).toHaveLength(15);
    for (const page of pages) {
      expect(xml).toContain(`<loc>${urlFor(page.meta.lang, page.meta.slug)}</loc>`);
    }
  });
});
