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
 * **Bekannte Luecken** (`KNOWN_GAPS`): heute fehlen U+2192, U+2713, U+2717
 * (FINDINGS #4, #8) und U+2248 (#11, beim ersten Lauf dieses Checks gefunden).
 * Sie sind dokumentiert und offen, die Entscheidung dazu (PLAN-FINDINGS D1)
 * gehoert Fable. Rot wird der Check bei
 *   1. jedem NEUEN fehlenden Codepoint, und
 *   2. einem Eintrag in `KNOWN_GAPS`, der inzwischen in einem Schnitt steht
 *      (veraltete Ausnahme) -- so leert D1 die Liste sauber: Schrift neu
 *      subsetten, Check wird rot, Eintrag streichen.
 * Ein Eintrag, der nirgends mehr im Text vorkommt, wird nur gemeldet.
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

/** Dokumentierte, offene Luecken. Quelle: FINDINGS.md, Entscheidung D1. */
const KNOWN_GAPS = new Map([
  [0x2192, 'FINDINGS #4: Pfeil (CTA der Learn-Seiten, Tempo-Stufe in der Fusszeile)'],
  [0x2713, 'FINDINGS #8: Haken (Feedback, Echo-Check, Tastenfeld, Settings)'],
  [0x2717, 'FINDINGS #8: Kreuz (Feedback, Echo-Check, Tastenfeld, Wort-Aufloesung)'],
  [0x2248, 'FINDINGS #11: Ungefaehr-Zeichen (Tempo-Schaetzung im Sende-Modus)'],
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
  const files = readdirSync(dir).filter((n) => n.endsWith('.woff2'));
  for (const name of files) for (const cp of readCmap(readFileSync(join(dir, name)))) have.add(cp);
  return { have, files };
}

const targets = scanTargets();
const used = usedCodepoints(targets);
const { have, files } = brandCodepoints();
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

console.log(`verify:fonts -- ${targets.length} Dateien, ${used.size} verschiedene Codepoints, ` +
  `${have.size} in der Marken-Familie (${files.length} Schnitte)`);
for (const cp of missing) {
  if (KNOWN_GAPS.has(cp)) console.log(`  bekannte Luecke ${hex(cp)}: ${KNOWN_GAPS.get(cp)} -- ${where(cp)}`);
}
for (const cp of KNOWN_GAPS.keys()) {
  if (!used.has(cp)) console.log(`  Hinweis: ${hex(cp)} steht in KNOWN_GAPS, kommt aber nirgends mehr im Text vor`);
}
if (problems.length > 0) {
  for (const p of problems) console.error(`  ROT ${p}`);
  process.exit(1);
}
console.log('verify:fonts gruen: nur bekannte Luecken.');
