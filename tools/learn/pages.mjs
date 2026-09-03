/**
 * Der Learn-Generator, reiner Teil: Markdown + Frontmatter → fertige Seite.
 *
 * Warum statisch und nicht in der SPA: Suchmaschinen sollen fertiges HTML
 * bekommen (CONCEPT-LEARN §3). Die App an der Wurzel bleibt davon unberührt —
 * dieser Generator läuft nach `vite build` und schreibt nur nach `dist/learn/`
 * und `dist/de/lernen/`.
 *
 * Aufteilung wie in der Engine: hier stehen **reine Funktionen** ohne Dateien
 * und ohne Prozess, damit `pages.test.mjs` sie ohne Build prüfen kann. Alles
 * mit Ein- und Ausgabe liegt in `build.mjs`.
 *
 * Der Markdown-Parser ist `marked` (devDependency, in CONCEPT-LEARN §3
 * genehmigt). Eigene Eingriffe gibt es nur an drei Stellen:
 *
 * 1. **Tabellen** ohne echte Kopfzeile bekommen kein leeres `<thead>` — die
 *    Alphabet-Tabellen sind Gitter aus selbsterklärenden Zellen („A ·−"),
 *    keine Datentabellen mit Spaltentiteln.
 * 2. **Der CTA** am Artikelende („Start hearing it → Open Morse Lab") wird zum
 *    einen gefüllten Amber-Primary der Seite (CONCEPT-LEARN §5). Im Markdown
 *    steht er als kursive Zeile mit Link auf `/`; der Wortlaut bleibt
 *    unverändert, nur die Form ist ein Knopf statt Kursivschrift.
 * 3. **Ganz kursive Absätze** sonst (der Sprachhinweis auf dem Hub) werden zur
 *    Randnotiz `.aside`.
 *
 * Kein Text wird umgeschrieben: der Generator ordnet an, er formuliert nicht.
 */

import { Marked, Renderer } from 'marked';

/** Produktionsherkunft. Steht hier, weil canonical, hreflang, OG und Sitemap
 * absolute URLs brauchen — relative sind dort wertlos. */
export const SITE = 'https://morse-lab.com';

/** Das Marken-Lockup als statisches Bild für OG (CONCEPT-LEARN §4).
 * Liegt in `public/`, wird also von Vite unverändert nach `dist/` kopiert. */
export const OG_IMAGE = '/og-morse-lab.png';

/** Wurzeln der beiden Sprachbäume (CONCEPT-LEARN §2). */
const ROOTS = { en: '/learn/', de: '/de/lernen/' };

/**
 * Wurzeln der Rechtsseiten (Ruling L2). Eigener, flacher Baum -- Impressum und
 * Datenschutz sind keine Learn-Artikel und stehen deshalb nicht unter
 * `/learn/`/`/de/lernen/`, sondern an der Wurzel bzw. unter `/de/`.
 */
const LEGAL_ROOTS = { en: '/', de: '/de/' };

/** Welche Wurzeln eine Seite benutzt -- `section: legal` im Frontmatter
 * entscheidet, alles andere bleibt beim Learn-Baum (Rückwärtskompatibilität:
 * bestehende Seiten tragen den Schlüssel nicht). */
function rootsFor(section) {
  return section === 'legal' ? LEGAL_ROOTS : ROOTS;
}

/** Was in beiden Sprachen im Rahmen steht — die Artikeltexte kommen aus dem
 * Markdown, das hier ist Navigation. Die zwei App-Links stehen wörtlich so im
 * Konzept (§5). */
const CHROME = {
  en: { app: 'Open the app', hub: 'Learn', other: 'Deutsch', locale: 'en_US' },
  de: { app: 'Zur App', hub: 'Lernen', other: 'English', locale: 'de_DE' },
};

/**
 * Die Slugs der vier Rechtsseiten je Sprache (Ruling L2) -- an einer Stelle,
 * damit die Fusszeile sie nicht als Text-Literale trägt, sondern über
 * `pathFor` denselben Weg wie jede andere Adresse im Generator geht.
 */
const LEGAL_PAGES = {
  en: [
    { slug: 'imprint', label: 'Imprint' },
    { slug: 'privacy', label: 'Privacy' },
  ],
  de: [
    { slug: 'impressum', label: 'Impressum' },
    { slug: 'datenschutz', label: 'Datenschutz' },
  ],
};

/**
 * Die leise Zeile „Impressum · Datenschutz"/„Imprint · Privacy" am Fuß jeder
 * statischen Seite (Ruling L2, Punkt 4) -- sprachrichtig zur Seite, auf der
 * sie steht, unabhängig davon, ob diese Seite selbst eine Rechtsseite ist.
 */
function legalFooterLine(lang) {
  const links = LEGAL_PAGES[lang]
    .map((page) => `<a href="${pathFor(lang, page.slug, 'legal')}">${page.label}</a>`)
    .join(' · ');
  return `<p class="page-footer-legal">${links}</p>`;
}

/** Reihenfolge der Seiten in der Sitemap: Hub, Pillar, dann der Rest wie im
 * Hub aufgezählt. Sie ist keine Rangfolge für Suchmaschinen (die gibt es
 * nicht), sondern macht die Datei für Menschen lesbar. */
export const PAGE_ORDER = [
  'index',
  'how-to-learn-morse-code',
  'morse-code-alphabet',
  'history-of-morse-code',
  'morse-code-in-amateur-radio',
  'koch-method',
  'beyond-the-koch-method',
  'morsecode-lernen',
  'morsealphabet',
  'geschichte-des-morsecodes',
  'morsen-im-amateurfunk',
  'koch-methode',
  'lernforschung',
];

const REQUIRED_KEYS = ['slug', 'lang', 'pair', 'metaTitle', 'metaDescription', 'datePublished'];

/**
 * Pfad einer Seite. Der Hub liegt auf der Wurzel seines Sprachbaums.
 *
 * `section` ist optional und defaultet auf den Learn-Baum -- bestehende
 * Aufrufe (`pathFor('en', 'koch-method')`) bleiben also unverändert gültig.
 */
export function pathFor(lang, slug, section = 'learn') {
  const root = rootsFor(section)[lang];
  if (!root) throw new Error(`unbekannte Sprache: ${lang}`);
  return slug === 'index' ? root : `${root}${slug}/`;
}

/** Absolute URL, wie canonical und hreflang sie brauchen. */
export function urlFor(lang, slug, section = 'learn') {
  return `${SITE}${pathFor(lang, slug, section)}`;
}

/** Die andere Sprache. Zwei Sprachen, also ein Zeilenausdruck — wird es
 * jemals eine dritte, ist das hier die eine Stelle. */
export function otherLang(lang) {
  return lang === 'en' ? 'de' : 'en';
}

/**
 * Frontmatter und Rumpf trennen. Bewusst kein YAML-Parser: es sind sieben
 * flache Schlüssel-Wert-Zeilen, und eine Abhängigkeit dafür wäre nicht zu
 * begründen (CLAUDE.md 3). Alles Unerwartete bricht laut ab, statt still eine
 * Seite ohne Head-Tags zu bauen.
 */
export function parseFrontmatter(source, name = 'unbenannt') {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match) throw new Error(`${name}: kein Frontmatter-Block am Dateianfang`);

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const pair = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`${name}: Frontmatter-Zeile nicht lesbar: ${line}`);
    let value = pair[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    meta[pair[1]] = value;
  }

  for (const key of REQUIRED_KEYS) {
    if (!meta[key]) throw new Error(`${name}: Frontmatter ohne ${key}`);
  }
  // `section` ist optional -- ohne Angabe ist eine Seite ein Learn-Artikel
  // (Rückwärtskompatibilität mit den vierzehn bestehenden Dateien).
  if (!meta.section) meta.section = 'learn';
  if (!rootsFor(meta.section)[meta.lang]) {
    throw new Error(`${name}: lang ist weder en noch de: ${meta.lang}`);
  }
  // `keywords` speist nur <meta name="keywords">, die auf `noindex` ohnehin
  // nichts bewirkt (Punkt 7 des Rulings) -- fuer Rechtsseiten nicht Pflicht.
  if (meta.section !== 'legal' && !meta.keywords) {
    throw new Error(`${name}: Frontmatter ohne keywords`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.datePublished)) {
    throw new Error(`${name}: datePublished ist kein ISO-Datum: ${meta.datePublished}`);
  }

  return { meta, body: match[2] };
}

/** HTML-Text maskieren (Attribute und Textknoten). */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Klartext aus Inline-Token — für die H1 (JSON-LD `headline`) und für den
 * CTA, dessen Beschriftung im Markdown aus Text plus Link besteht. */
function plainText(tokens) {
  return tokens
    .map((token) => {
      if (token.tokens) return plainText(token.tokens);
      return token.text ?? token.raw ?? '';
    })
    .join('');
}

/** Einen Block einrücken, damit das gelieferte HTML lesbar bleibt. */
function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? line : pad + line))
    .join('\n');
}

/** Ein Absatz, der nur aus einer Kursivspanne besteht. */
function loneEmphasis(token) {
  if (token?.type !== 'paragraph') return undefined;
  const inline = (token.tokens ?? []).filter((child) => child.type !== 'space');
  return inline.length === 1 && inline[0].type === 'em' ? inline[0] : undefined;
}

/** Enthält die Spanne einen Link auf die App-Wurzel? Dann ist es der CTA. */
function linksToApp(em) {
  return (em.tokens ?? []).some((child) => child.type === 'link' && child.href === '/');
}

/**
 * Steht diese Randnotiz in der anderen Sprache?
 *
 * Auf dem Hub ist genau das der Fall: die englische Seite sagt auf Deutsch,
 * dass es sie auch auf Deutsch gibt, und umgekehrt. Ohne `lang` liest ein
 * Screenreader diesen Satz mit der falschen Aussprache vor (CLAUDE.md 6).
 *
 * Die Regel prüft nicht die Sprache des Textes — das könnte sie nicht —,
 * sondern wohin die Notiz führt: zeigen alle ihre Links in den anderen
 * Sprachbaum, ist sie für die andere Sprache geschrieben.
 */
function asideLang(em, lang) {
  const links = (em.tokens ?? []).filter((child) => child.type === 'link');
  if (links.length === 0) return undefined;
  const otherRoot = ROOTS[otherLang(lang)];
  return links.every((link) => link.href.startsWith(otherRoot)) ? otherLang(lang) : undefined;
}

function createMarked() {
  const renderer = new Renderer();

  /*
   * Wie das Original, aber ohne `<thead>`, wenn die Kopfzeile leer ist, und in
   * einem eigenen Kasten: breite Tabellen scrollen dort, nie die Seite.
   */
  renderer.table = function table(token) {
    const hasHeader = token.header.some((cell) => cell.text.trim() !== '');
    let head = '';
    if (hasHeader) {
      const cells = token.header.map((cell) => this.tablecell(cell)).join('');
      head = `<thead>\n${this.tablerow({ text: cells })}</thead>\n`;
    }
    const rows = token.rows
      .map((row) => this.tablerow({ text: row.map((cell) => this.tablecell(cell)).join('') }))
      .join('');
    const body = rows ? `<tbody>${rows}</tbody>` : '';
    return `<div class="table-wrap">\n<table>\n${head}${body}</table>\n</div>\n`;
  };

  return new Marked({ renderer, gfm: true });
}

/**
 * Rumpf → Artikel-HTML. Liefert zusätzlich die H1 als Klartext (für JSON-LD)
 * und den CTA, falls die letzte Zeile einer ist.
 *
 * Genau eine H1 pro Seite ist Pflicht (CONCEPT-LEARN §4) — der Generator
 * prüft das hier, nicht ein Test hinterher: eine Seite mit zwei H1 soll nicht
 * entstehen können.
 */
export function renderArticle(body, name = 'unbenannt', lang = 'en') {
  const marked = createMarked();
  const tokens = marked.lexer(body);
  const blocks = tokens.filter((token) => token.type !== 'space');

  const headings = blocks.filter((token) => token.type === 'heading' && token.depth === 1);
  if (headings.length !== 1) {
    throw new Error(`${name}: ${headings.length} H1 gefunden, genau eine erwartet`);
  }
  if (blocks[0] !== headings[0]) {
    throw new Error(`${name}: die H1 ist nicht der erste Block`);
  }

  let cta;
  const last = blocks[blocks.length - 1];
  const lastEm = loneEmphasis(last);
  if (lastEm && linksToApp(lastEm)) {
    cta = plainText(lastEm.tokens);
    blocks.pop();
  }

  const html = blocks
    .map((token) => {
      const em = loneEmphasis(token);
      if (em) {
        // Randnotiz: dieselben Inline-Token, nur ohne die Kursivschrift als
        // einzigen Träger der Nebenrolle (siehe .aside in learn.css).
        const foreign = asideLang(em, lang);
        const inner = marked
          .parser([{ type: 'paragraph', tokens: em.tokens, raw: em.raw }])
          .replace(/^<p>/, '')
          .replace(/<\/p>\n?$/, '');
        return `<p class="aside"${foreign ? ` lang="${foreign}"` : ''}>${inner}</p>\n`;
      }
      return marked.parser([token]);
    })
    .join('');

  return { html, title: plainText(headings[0].tokens), cta };
}

/** Der Kopf einer Seite: alle Pflichten aus CONCEPT-LEARN §4 an einem Ort. */
export function renderHead({ meta, title, canonical, pairUrl, enUrl }) {
  const chrome = CHROME[meta.lang];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: meta.metaDescription,
    datePublished: meta.datePublished,
    inLanguage: meta.lang,
    url: canonical,
    image: `${SITE}${OG_IMAGE}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    publisher: { '@type': 'Organization', name: 'Morse Lab', url: `${SITE}/` },
  };

  return [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(meta.metaTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.metaDescription)}" />`,
    // `keywords` ist auf Rechtsseiten nicht Pflicht (Punkt 7 des Rulings zu
    // L2) -- ohne Wert steht hier nichts, statt `content="undefined"`.
    meta.keywords ? `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />` : '',
    // `robots` ist neu (Ruling L2, Punkt 2): nur gesetzt, wenn das Frontmatter
    // es verlangt -- eine private Wohnanschrift soll nicht indexiert werden,
    // die Verweise darin aber gueltig bleiben ("noindex, follow").
    meta.robots ? `<meta name="robots" content="${escapeHtml(meta.robots)}" />` : '',
    `<link rel="canonical" href="${canonical}" />`,
    // hreflang wechselseitig: jede Seite nennt sich selbst und ihr Pendant,
    // x-default ist die englische Fassung (EN-first, CONCEPT-LEARN §4).
    `<link rel="alternate" hreflang="${meta.lang}" href="${canonical}" />`,
    `<link rel="alternate" hreflang="${otherLang(meta.lang)}" href="${pairUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
    '<meta property="og:type" content="article" />',
    '<meta property="og:site_name" content="Morse Lab" />',
    `<meta property="og:title" content="${escapeHtml(meta.metaTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.metaDescription)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:locale" content="${chrome.locale}" />`,
    `<meta property="og:image" content="${SITE}${OG_IMAGE}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Morse Lab" />',
    '<meta name="theme-color" content="#f6f1e8" />',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
    '<link rel="stylesheet" href="/learn/assets/learn.css" />',
    `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .map((line) => `    ${line}`)
    .join('\n');
}

/**
 * Das Trennornament: `−− ·−··` — echter Code, „ML" (1.1 §8). Dekorativ für
 * Screenreader, weil die Buchstabenfolge nichts erklärt, was nicht schon
 * dasteht; die Gliederung tragen die Überschriften.
 */
function ornament() {
  const letters = ['--', '.-..'];
  const shapes = letters
    .map(
      (letter) =>
        `<span class="ornament-letter">${[...letter]
          .map((element) => `<i data-kind="${element === '-' ? 'dah' : 'dit'}"></i>`)
          .join('')}</span>`,
    )
    .join('\n  ');
  return `<div class="ornament" aria-hidden="true">\n  ${shapes}\n</div>`;
}

/** Eine vollständige Seite. */
export function renderPage({ meta, body, name = 'unbenannt' }) {
  const { html, title, cta } = renderArticle(body, name, meta.lang);
  const chrome = CHROME[meta.lang];
  const canonical = urlFor(meta.lang, meta.slug, meta.section);
  const pairUrl = urlFor(otherLang(meta.lang), meta.pair, meta.section);
  const enUrl = meta.lang === 'en' ? canonical : pairUrl;

  const footerRow = indent(
    [
      `<a href="${pathFor(otherLang(meta.lang), meta.pair, meta.section)}" hreflang="${otherLang(meta.lang)}">${chrome.other}</a>`,
      // Auf dem Hub selbst wäre der Hub-Link ein Link auf sich; auf einer
      // Rechtsseite gibt es keinen Learn-Hub-Bezug (eigener, flacher Baum).
      meta.slug === 'index' || meta.section === 'legal'
        ? ''
        : `<a href="${pathFor(meta.lang, 'index', meta.section)}">${chrome.hub}</a>`,
      '<span>© Morse Lab</span>',
    ]
      .filter(Boolean)
      .join('\n'),
    10,
  );

  // Die leise Zeile zu Impressum/Datenschutz -- auf jeder statischen Seite,
  // sprachrichtig (Ruling L2, Punkt 4). Eine eigene Zeile, kein Anhaengsel an
  // die erste: die dortige `span:last-child`-Regel schiebt das Copyright an
  // den rechten Rand, ein viertes Element wuerde das durcheinanderbringen.
  const legalFooter = indent(legalFooterLine(meta.lang), 10);

  // Der CTA hängt am Inhalt: fehlt die Zeile im Markdown, steht hier nichts —
  // und dann auch kein Ornament, das sonst ins Leere trennte.
  const ctaHtml = cta
    ? `\n${indent(`${ornament()}\n<p class="cta"><a href="/">${escapeHtml(cta)}</a></p>`, 10)}`
    : '';

  return `<!doctype html>
<html lang="${meta.lang}">
  <head>
${renderHead({ meta, title, canonical, pairUrl, enUrl })}
  </head>
  <body>
    <div class="page">
      <header class="masthead">
        <a class="wordmark" href="/">Morse Lab</a>
        <a class="masthead-app" href="/">${chrome.app}</a>
      </header>
      <main>
        <article class="article">
${indent(html.trimEnd(), 10)}${ctaHtml}
        </article>
      </main>
      <footer class="page-footer">
        <div class="page-footer-row">
${footerRow}
        </div>
${legalFooter}
      </footer>
    </div>
  </body>
</html>
`;
}

/**
 * sitemap.xml: alle Learn-URLs plus die Wurzel (CONCEPT-LEARN §4). Ohne
 * `priority` und `changefreq` — beide werden von Suchmaschinen ignoriert, und
 * eine erfundene Zahl ist hier so unehrlich wie überall sonst (CLAUDE.md 2.6).
 */
export function renderSitemap(pages) {
  // Rechtsseiten stehen bewusst nicht in der Sitemap (Ruling L2, Punkt 2):
  // eine private Wohnanschrift muss kein Adress-Sammler einlesen.
  const listed = pages.filter((page) => page.meta.section !== 'legal');
  const byOrder = [...listed].sort(
    (a, b) => PAGE_ORDER.indexOf(a.meta.slug) - PAGE_ORDER.indexOf(b.meta.slug),
  );
  const entries = [
    `  <url>\n    <loc>${SITE}/</loc>\n  </url>`,
    ...byOrder.map((page) => {
      const loc = urlFor(page.meta.lang, page.meta.slug, page.meta.section);
      const pair = urlFor(otherLang(page.meta.lang), page.meta.pair, page.meta.section);
      const enUrl = page.meta.lang === 'en' ? loc : pair;
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${page.meta.datePublished}</lastmod>`,
        `    <xhtml:link rel="alternate" hreflang="${page.meta.lang}" href="${loc}" />`,
        `    <xhtml:link rel="alternate" hreflang="${otherLang(page.meta.lang)}" href="${pair}" />`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
        '  </url>',
      ].join('\n');
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}
