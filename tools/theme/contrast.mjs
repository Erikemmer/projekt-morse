/**
 * Kontrast-Report der sechs Themes (Ruling Notion-Log #111, Punkt 9).
 *
 * "Lesbarkeit wird gemessen, nicht behauptet" -- dieses Skript berechnet den
 * WCAG-Kontrast direkt aus den Token-Werten unten, nicht aus einem Browser.
 * Die Werte hier sind eine **bewusste, dokumentierte Kopie** der sechs
 * `[data-theme]`-Bloecke in `src/styles.css`: ein Node-Skript kann kein CSS
 * parsen, ohne selbst zur Abhaengigkeit zu werden (CLAUDE.md 3), und die
 * Alternative -- ein Kontrast-Check im Browser wie `tools/amber/check.mjs`
 * -- waere fuer sieben Zahlenpaare mehr Aufwand als Nutzen. Die Kopie ist
 * hier riskant genug, dass sie einen Selbstcheck verdient: `assertMatchesCss`
 * unten liest `src/styles.css` und bricht ab, wenn ein Wert hier von der
 * Quelle abweicht -- die Kopie kann also nicht leise veralten.
 *
 * Die drei vom Auftrag verlangten Kontraste je Theme (18 Zahlen), plus eine
 * vierte, selbst ergaenzte Pruefung fuer den Fokusring (Punkt 9, letzter
 * Satz: "Pruefe ausserdem, dass der Fokusring in jedem Theme sichtbar ist"):
 * - Fliesstext auf Grund (ink/paper): >= 7:1 (AAA fuer normalen Text)
 * - Sekundaertext auf Grund (gray/paper): >= 4.5:1 (AA fuer normalen Text)
 * - Text auf der Akzentflaeche (paper/amber): >= 4.5:1 (derselbe Knopf wie
 *   ".button-primary": weisser/papierner Text auf gefuelltem Amber)
 * - Fokusring auf Grund (amber-deep/paper): >= 3:1 (WCAG 1.4.11, kein Text)
 *
 * Faellt ein Wert durch, ist die einzige erlaubte Reaktion, die Helligkeit
 * **dieses einen Tokens** im kleinsten noetigen Schritt nachzuziehen -- keine
 * neue Farbe, keine stille Korrektur (Punkt 9 des Auftrags).
 *
 * Aufruf: `node tools/theme/contrast.mjs`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const THEMES = {
  // amber: #B35209, nicht das in Guidelines 1.1 genannte #B45309 -- siehe
  // HANDOVER.md, "Was Fable an dieser Runde sehen muss", Punkt 1: #B45309
  // liegt bei Text auf der Akzentflaeche (Paper-Text auf gefuelltem Amber,
  // z. B. ".button-primary") bei 4,46:1 und verfehlt damit knapp die
  // AA-Grenze von 4,5:1 fuer Fliesstextgroesse -- ein Fund dieser Runde, kein
  // Fehler der neuen Themes. Kleinstmoegliche Korrektur nach Punkt 9 des
  // Auftrags (nur die Helligkeit von --amber, sonst nichts).
  Paper: { paper: '#F6F1E8', ink: '#221D16', amber: '#B35209', gray: '#6F6455', 'amber-deep': '#92400E' },
  Frost: { paper: '#F1F3F5', ink: '#1A2028', amber: '#0E6E6E', gray: '#5A646E', 'amber-deep': '#0A5252' },
  Olive: { paper: '#F2F1E6', ink: '#1E2118', amber: '#4C6A26', gray: '#61665A', 'amber-deep': '#3B5320' },
  Night: { paper: '#17140F', ink: '#EDE6D8', amber: '#D97706', gray: '#A79C8A', 'amber-deep': '#F59E0B' },
  Phosphor: { paper: '#0A0D0B', ink: '#DCE8DE', amber: '#4FBF74', gray: '#93A697', 'amber-deep': '#6FD68F' },
  Ink: { paper: '#10151B', ink: '#E4E9EE', amber: '#5AA9CC', gray: '#96A3AF', 'amber-deep': '#7CC1DE' },
};

const THRESHOLDS = {
  'ink/paper (Fließtext)': 7,
  'gray/paper (Sekundärtext)': 4.5,
  'paper/amber (Text auf Akzentfläche)': 4.5,
  // WCAG 1.4.11 (Non-text Contrast): der Fokusring (outline: amber-deep) muss
  // sich vom Grund abheben, den er umrandet -- kein Fliesstext, deshalb 3:1
  // statt 4.5:1.
  'amber-deep/paper (Fokusring)': 3,
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Bewacht die Kopie oben gegen die eigentliche Quelle: jeder Hex-Wert dieses
 * Skripts muss wortgleich in dem passenden `[data-theme='...']`-Block (oder,
 * für Paper, im `:root`-Block) von `src/styles.css` stehen.
 */
function assertMatchesCss() {
  const cssPath = fileURLToPath(new URL('../../src/styles.css', import.meta.url));
  const css = readFileSync(cssPath, 'utf8');
  const problems = [];

  for (const [name, tokens] of Object.entries(THEMES)) {
    const selector = name === 'Paper' ? ':root {' : `[data-theme='${name.toLowerCase()}'] {`;
    const start = css.indexOf(selector);
    if (start === -1) {
      problems.push(`${name}: Block "${selector}" nicht in styles.css gefunden`);
      continue;
    }
    const end = css.indexOf('\n}', start);
    const block = css.slice(start, end === -1 ? undefined : end).toLowerCase();
    for (const [role, hex] of Object.entries(tokens)) {
      if (!block.includes(hex.toLowerCase())) {
        problems.push(`${name}: --${role} (${hex}) steht nicht im CSS-Block`);
      }
    }
  }

  return problems;
}

function main() {
  const drift = assertMatchesCss();
  if (drift.length > 0) {
    console.log('Die Kopie hier weicht von src/styles.css ab -- Skript aktualisieren:');
    for (const problem of drift) console.log(`  - ${problem}`);
    console.log('');
  }

  const rows = [];
  let failed = false;

  for (const [name, tokens] of Object.entries(THEMES)) {
    const { paper, ink, amber, gray } = tokens;
    const amberDeep = tokens['amber-deep'];
    const values = {
      'ink/paper (Fließtext)': contrastRatio(ink, paper),
      'gray/paper (Sekundärtext)': contrastRatio(gray, paper),
      'paper/amber (Text auf Akzentfläche)': contrastRatio(paper, amber),
      'amber-deep/paper (Fokusring)': contrastRatio(amberDeep, paper),
    };
    for (const [label, ratio] of Object.entries(values)) {
      const min = THRESHOLDS[label];
      const ok = ratio >= min;
      if (!ok) failed = true;
      rows.push({ theme: name, label, ratio, min, ok });
    }
  }

  const width = Math.max(...rows.map((r) => `${r.theme} — ${r.label}`.length));
  console.log(`${'Theme — Prüfung'.padEnd(width)}  Kontrast  Grenze  `);
  console.log('-'.repeat(width + 24));
  for (const row of rows) {
    const label = `${row.theme} — ${row.label}`.padEnd(width);
    const mark = row.ok ? 'OK ' : 'FEHLT';
    console.log(`${label}  ${row.ratio.toFixed(2).padStart(6)}:1  >= ${row.min}:1  ${mark}`);
  }

  console.log('');
  if (failed) {
    console.log('Mindestens ein Wert unterschreitet seine Grenze -- siehe oben.');
    process.exitCode = 1;
    return;
  }
  console.log(`Alle ${rows.length} Werte über ihrer Grenze.`);
}

main();
