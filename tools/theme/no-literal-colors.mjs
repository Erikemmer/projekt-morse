/**
 * Waechter gegen Farbliterale ausserhalb der Token-Bloecke (Ruling
 * Notion-Log #111, Punkt 11).
 *
 * Genau diese Regel -- **jede Farbe kommt aus den Tokens, kein Bauteil kennt
 * eine eigene** -- ist der ganze Grund, warum Runde T1 sechs Paletten liefern
 * konnte, ohne ein einziges Bauteil anzufassen. Bisher stand die Regel nur in
 * Kommentaren (CLAUDE.md 2.9) und hing an Disziplin; ab jetzt bewacht sie
 * sich selbst.
 *
 * **Zwei Bereiche, zwei Massstaebe:**
 * - `src/styles.css`: Farbliterale sind nur **innerhalb** der Token-Bloecke
 *   erlaubt (`:root`, die `prefers-color-scheme`-Medienabfrage und die sechs
 *   `[data-theme='...']`-Bloecke). Ueberall sonst im Stylesheet ist ein
 *   Literal ein Fund.
 * - Jede `.ts`/`.tsx`-Datei unter `src/`: **kein** Farbliteral, an keiner
 *   Stelle. Diese Dateien kennen nur Klassennamen und CSS-Variablen, nie eine
 *   eigene Hex-Zahl.
 *
 * **Kommentare zaehlen nicht als Fund.** Rulings heissen hier "#103c",
 * "#105", "#110" -- vierstellige Zahlen mit einer hexadezimalen Ziffer sind
 * syntaktisch von einer viergliedrigen Kurzform-Hexfarbe (`#RGBA`) nicht zu
 * unterscheiden. Das Skript entfernt deshalb zuerst jeden Kommentar
 * (`/​* ... *​/` in CSS, `//` und `/​* ... *​/` in TS/TSX) und sucht erst danach
 * -- eine Ruling-Nummer in einem Kommentar loest damit nie einen
 * Falschalarm aus.
 *
 * Ein Treffer ist ein Hex-Code (`#abc`, `#aabbcc`, `#aabbccdd`) oder ein
 * `rgb(`/`rgba(`/`hsl(`/`hsla(`-Aufruf.
 *
 * Aufruf: `npm run verify:colors`.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/g;

/** Blendet Kommentar-Inhalt aus, ohne Zeilen/Spalten zu verschieben. */
function blank(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, blank);
}

/**
 * Kommentare **und** String-/Template-Literale ausblenden.
 *
 * Farbliterale stehen in dieser Codebasis nie in einem String -- Farbe kommt
 * ausschliesslich ueber CSS-Klassen und -Variablen. Ruling-Nummern wie
 * "Ruling #109" dagegen stehen haeufig in Testtitelnamen (`it('... #103a
 * ...', ...)`), also in echten String-Literalen, nicht nur in Kommentaren --
 * ohne diesen Schritt waeren sie falsche Treffer (vierstellige Rulingnummern
 * sehen wie kurze Hexfarben aus).
 *
 * Grob genug fuer diese Codebasis: kein Kommentarzeichen und keine Farbe
 * steht in einem Template-Ausdruck (`${...}`), und Escapes in diesen
 * Beschreibungstexten sind selten. Ein vollstaendiger JS-Tokenizer waere hier
 * mehr Werkzeug, als die Aufgabe braucht (CLAUDE.md 3).
 */
function stripJsComments(code) {
  const noBlocks = code.replace(/\/\*[\s\S]*?\*\//g, blank);
  const noLines = noBlocks.replace(/\/\/[^\n]*/g, blank);
  const noTemplates = noLines.replace(/`(?:\\.|[^`\\])*`/g, blank);
  const noDoubleQuoted = noTemplates.replace(/"(?:\\.|[^"\\])*"/g, blank);
  return noDoubleQuoted.replace(/'(?:\\.|[^'\\])*'/g, blank);
}

/**
 * Findet die Spanne eines Blocks, dessen Selektor `selectorPattern` matcht --
 * vom Selektor bis zur **passenden** schliessenden Klammer, mit Tiefenzaehlung
 * (nicht nur bis zum naechsten `}`, falls doch einmal etwas Verschachteltes
 * hineingeriete).
 */
function findBlockSpans(css, selectorPattern) {
  const spans = [];
  const re = new RegExp(selectorPattern, 'g');
  let match;
  while ((match = re.exec(css)) !== null) {
    const openBrace = css.indexOf('{', match.index);
    if (openBrace === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    spans.push([match.index, end + 1]);
    re.lastIndex = end + 1;
  }
  return spans;
}

/** Blendet alle Token-Bloecke aus -- der Rest von styles.css muss frei von Literalen sein. */
function maskTokenBlocks(css) {
  const spans = [
    ...findBlockSpans(css, ':root\\s*(?::not\\([^)]*\\))?\\s*\\{'),
    ...findBlockSpans(css, "\\[data-theme='[a-z]+'\\]\\s*\\{"),
  ].sort((a, b) => a[0] - b[0]);

  let masked = css;
  for (const [start, end] of spans) {
    masked = masked.slice(0, start) + blank(masked.slice(start, end)) + masked.slice(end);
  }
  return masked;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

async function collectFiles(dir, extensions) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

async function checkCssFile(path) {
  const raw = await readFile(path, 'utf8');
  const withoutComments = stripCssComments(raw);
  const searchable = maskTokenBlocks(withoutComments);

  const hits = [];
  for (const match of searchable.matchAll(COLOR_PATTERN)) {
    hits.push({ text: match[0], line: lineOf(raw, match.index) });
  }
  return hits;
}

async function checkSourceFile(path) {
  const raw = await readFile(path, 'utf8');
  const searchable = stripJsComments(raw);

  const hits = [];
  for (const match of searchable.matchAll(COLOR_PATTERN)) {
    hits.push({ text: match[0], line: lineOf(raw, match.index) });
  }
  return hits;
}

async function main() {
  const problems = [];

  const cssFiles = await collectFiles(SRC, ['.css']);
  for (const file of cssFiles) {
    const hits = await checkCssFile(file);
    for (const hit of hits) {
      problems.push(`${relative(ROOT, file)}:${hit.line}: ${hit.text}`);
    }
  }

  const sourceFiles = await collectFiles(SRC, ['.ts', '.tsx']);
  for (const file of sourceFiles) {
    const hits = await checkSourceFile(file);
    for (const hit of hits) {
      problems.push(`${relative(ROOT, file)}:${hit.line}: ${hit.text}`);
    }
  }

  if (problems.length > 0) {
    console.log('Farbliterale außerhalb der Token-Definition (CLAUDE.md 2.9):');
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Keine Farbliterale außerhalb der Tokens: ${cssFiles.length} CSS-Datei(en), ` +
      `${sourceFiles.length} TS/TSX-Datei(en) geprüft.`,
  );
}

await main();
