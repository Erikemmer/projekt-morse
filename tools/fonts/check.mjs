/**
 * cmap-Check: jeder Codepoint, der in der App oder im Learn-Bereich
 * GEZEICHNET wird, muss in mindestens einem Schnitt der Marken-Familien stehen
 * (`src/fonts/*.woff2`) -- sonst rot.
 *
 * Warum es das gibt: ein Zeichen, das in keiner Markenschrift steht, bricht
 * nichts. Der Browser holt es still aus dem Fallback-Stack, und die Zeichnung
 * wechselt je System (FINDINGS #4, #8). Ohne diesen Check taucht das naechste
 * fehlende Zeichen erst nach dem Deploy auf.
 *
 * **Stand nach D1** (PLAN-FINDINGS, "D1 -- Entscheidung", Owner-Delegation
 * 04.10.2026): U+2192 und U+2248 stehen jetzt im IBM-Plex-Subset
 * (`tools/fonts/add-glyphs.py`); U+2713/U+2717 werden nicht mehr als Text
 * gezeichnet (SVG, `src/ui/Mark.tsx`). `KNOWN_GAPS` ist damit leer, der
 * Mechanismus bleibt: eine dokumentierte, offene Luecke traegt man dort ein.
 * Rot wird der Check bei
 *   1. jedem fehlenden Codepoint, der nicht in `KNOWN_GAPS` steht, und
 *   2. einem Eintrag in `KNOWN_GAPS`, der inzwischen in einem Schnitt steht
 *      (veraltete Ausnahme).
 * Ein Eintrag, der nirgends mehr im Text vorkommt, wird nur gemeldet.
 *
 * **Akzeptierter Fallback** (`ACCEPTED_FALLBACK`): U+2192 in `content/learn/`
 * (der Pfeil der CTA-Zeile, gesetzt in Newsreader). Newsreader hat ihn nicht,
 * Fables Text bleibt byte-identisch (CLAUDE.md §3), also kommt er bewusst aus
 * dem Fallback-Stack (Weg C, FINDINGS #4). Das ist KEINE Luecke im Sinn von
 * oben -- der Pfeil steht ja in Plex --, sondern die eine Stelle, die der
 * Vereinigungs-Check nicht sehen kann. Deshalb eigener Eintrag: der Check
 * meldet die Stelle in jedem Lauf und wird rot, sobald Newsreader den
 * Codepoint doch traegt (dann ist die Ausnahme veraltet).
 *
 * **Umfang des Scans** (Text OHNE Kommentare):
 *   - `content/learn/*.md`: die ganze Datei, Frontmatter eingeschlossen.
 *   - `src/**` ohne `src/fonts/`: `.ts` und `.tsx` (ohne `*.test.*`), also
 *     JSX-Text und String-/Template-Literale; Kommentare entfernt.
 *   - `src/**` und `tools/learn/learn.css`: Stylesheets, Kommentare entfernt
 *     (faengt `content: '...'`).
 *   - `tools/learn/pages.mjs` (die Seitenvorlagen), Kommentare entfernt.
 *
 * **Was er NICHT erfasst:**
 *   - Text, der zur Laufzeit entsteht (Namen, Zahlenformate, Browser-Texte).
 *   - Escapes im Quelltext (`✓`, `&rarr;`, `&#10003;`): sie stehen dort
 *     als ASCII und werden nicht aufgeloest.
 *   - `index.html`, `public/` (Manifest, SVG-Text), `functions/`.
 *   - WELCHE Familie ein Zeichen zeichnet: geprueft wird die Vereinigung aller
 *     vier Schnitte. Ein Zeichen, das nur in IBM Plex steht, aber in Newsreader
 *     gesetzt wird, faellt unbemerkt durch.
 *   - Gewichte: ein Zeichen, das nur in einem Schnitt fehlt, gilt als vorhanden.
 *   - Dass die Zeichnung gut aussieht -- nur, dass sie aus der Familie kommt.
 *   - Die Kommentar-Erkennung ist ein kleiner Zeichenleser, kein Parser. Ein
 *     Apostroph im JSX-Text kann ihn bis Zeilenende verwirren; der Fehler geht
 *     immer Richtung "mehr gescannt" (ein Kommentar zaehlt dann als Text),
 *     nie Richtung "Text uebersehen".
 *
 * Keine Abhaengigkeit: woff2 wird mit `tools/fonts/cmap.mjs` gelesen.
 * Rueckgabewert 1 bei Rot.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCmap } from './cmap.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/** Dokumentierte, offene Luecken (in KEINEM Schnitt). Leer seit D1. */
const KNOWN_GAPS = new Map();

/**
 * Bewusst akzeptierter Fallback: Codepoint -> { family, scope, why }. `family`
 * ist die Schrift, in der die Stelle gesetzt wird und die den Codepoint NICHT
 * hat; `scope` das Verzeichnis, in dem die Ausnahme gilt.
 */
const ACCEPTED_FALLBACK = new Map([
  [0x2192, {
    family: 'newsreader',
    scope: join('content', 'learn') + '/',
    why: 'FINDINGS #4: Pfeil der CTA-Zeile (Newsreader hat ihn nicht; Text ist Fables, Weg C)',
  }],
]);

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (path === join(ROOT, 'src', 'fonts')) continue;
      walk(path, out);
    } else out.push(path);
  }
  return out;
}

/**
 * Entfernt Kommentare. mode 'js' = // und Blockkommentare, 'css' = nur
 * Blockkommentare. Zeilenumbrueche bleiben erhalten (Zeilennummern).
 */
function stripComments(src, mode) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\' && n !== undefined) { out += n; i += 2; continue; }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, '');
      i = stop;
      continue;
    }
    if (mode === 'js' && c === '/' && n === '/' && src[i - 1] !== ':') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (mode === 'js' && (c === '"' || c === "'" || c === '`')) quote = c;
    if (mode === 'css' && (c === '"' || c === "'")) quote = c;
    out += c;
    i += 1;
  }
  return out;
}

function scanTargets() {
  const targets = [];
  const learn = join(ROOT, 'content', 'learn');
  for (const name of readdirSync(learn)) {
    if (name.endsWith('.md')) targets.push({ file: join(learn, name), mode: 'raw' });
  }
  for (const file of walk(join(ROOT, 'src'))) {
    if (/\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file)) targets.push({ file, mode: 'js' });
    else if (file.endsWith('.css')) targets.push({ file, mode: 'css' });
  }
  targets.push({ file: join(ROOT, 'tools', 'learn', 'pages.mjs'), mode: 'js' });
  targets.push({ file: join(ROOT, 'tools', 'learn', 'learn.css'), mode: 'css' });
  return targets;
}

/** @returns {Map<number, {file: string, line: number}[]>} Codepoint -> erste Fundstellen */
function usedCodepoints(targets) {
  const used = new Map();
  for (const { file, mode } of targets) {
    const raw = readFileSync(file, 'utf8');
    const text = mode === 'raw' ? raw : stripComments(raw, mode);
    let line = 1;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp === 0x0a) { line += 1; continue; }
      if (cp < 0x20 || cp === 0x7f) continue;
      if (!used.has(cp)) used.set(cp, []);
      const spots = used.get(cp);
      if (spots.length < 3) spots.push({ file: relative(ROOT, file), line });
    }
  }
  return used;
}

function brandCodepoints() {
  const dir = join(ROOT, 'src', 'fonts');
  const have = new Set();
  const byFamily = { newsreader: new Set(), plex: new Set() };
  const files = readdirSync(dir).filter((n) => n.endsWith('.woff2'));
  for (const name of files) {
    const family = name.startsWith('newsreader') ? 'newsreader' : 'plex';
    for (const cp of readCmap(readFileSync(join(dir, name)))) {
      have.add(cp);
      byFamily[family].add(cp);
    }
  }
  return { have, files, byFamily };
}

const targets = scanTargets();
const used = usedCodepoints(targets);
const { have, files, byFamily } = brandCodepoints();
const where = (cp) => used.get(cp).map((s) => `${s.file}:${s.line}`).join(', ');

const problems = [];
const missing = [...used.keys()].filter((cp) => !have.has(cp)).sort((a, b) => a - b);
for (const cp of missing) {
  if (!KNOWN_GAPS.has(cp)) {
    problems.push(`NEU fehlend: ${hex(cp)} ${JSON.stringify(String.fromCodePoint(cp))} in keinem Schnitt -- ${where(cp)}`);
  }
}
for (const [cp, why] of KNOWN_GAPS) {
  if (have.has(cp)) {
    problems.push(`Veraltete Ausnahme: ${hex(cp)} steht inzwischen in einem Schnitt -- Eintrag aus KNOWN_GAPS streichen (${why})`);
  }
}

for (const [cp, rule] of ACCEPTED_FALLBACK) {
  if (byFamily[rule.family].has(cp)) {
    problems.push(`Veraltete Ausnahme: ${hex(cp)} steht inzwischen in ${rule.family} -- Eintrag aus ACCEPTED_FALLBACK streichen (${rule.why})`);
  }
}

console.log(`verify:fonts -- ${targets.length} Dateien, ${used.size} verschiedene Codepoints, ` +
  `${have.size} in der Marken-Familie (${files.length} Schnitte)`);
for (const cp of missing) {
  if (KNOWN_GAPS.has(cp)) console.log(`  bekannte Luecke ${hex(cp)}: ${KNOWN_GAPS.get(cp)} -- ${where(cp)}`);
}
for (const [cp, rule] of ACCEPTED_FALLBACK) {
  const spots = targets.filter((t) => relative(ROOT, t.file).startsWith(rule.scope)
    && readFileSync(t.file, 'utf8').includes(String.fromCodePoint(cp)));
  console.log(`  akzeptierter Fallback ${hex(cp)}: ${rule.why} -- ${spots.length} Dateien in ${rule.scope}`);
  if (spots.length === 0) console.log(`  Hinweis: ${hex(cp)} steht in ACCEPTED_FALLBACK, kommt in ${rule.scope} aber nicht mehr vor`);
}
for (const cp of KNOWN_GAPS.keys()) {
  if (!used.has(cp)) console.log(`  Hinweis: ${hex(cp)} steht in KNOWN_GAPS, kommt aber nirgends mehr im Text vor`);
}
if (problems.length > 0) {
  for (const p of problems) console.error(`  ROT ${p}`);
  process.exit(1);
}
console.log('verify:fonts gruen.');
