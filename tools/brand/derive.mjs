/**
 * Leitet die ausgelieferten Marken-Dateien aus den Owner-Originalen ab
 * (Ruling Notion-Log #88).
 *
 * **Dieses Skript zeichnet nichts.** Die Geometrie der Marke steht
 * ausschliesslich in den drei Dateien unter `docs/brand/assets/`; sie kommen
 * vom Konzept-Owner und liegen byte-identisch im Repo. Alles hier ist
 * Verpackung: ein `<title>` anfuegen, den Eckenradius fuer die maskable-Variante
 * auf null setzen, die Wortmarke danebensetzen, das Ganze in PNG rendern. Wer
 * die Marke aendern will, aendert die Originale -- nicht dieses Skript.
 *
 * Das ist der Unterschied zum geloeschten `docs/brand/logo.py`: der hat die
 * Marke *gerechnet* und war damit eine zweite Wahrheit neben den Originalen.
 * Genau daher kamen die vier Abweichungen, die Ruling #88 aufgeraeumt hat
 * (Grundplatte 2 px zu hoch, Hebel-Drehpunkt verschoben, Knopf verschoben,
 * Lagerring r=5 statt 3.5).
 *
 * Die einzige Zahl, die hier wirklich entsteht, ist die **Breite der
 * Wortmarke**: sie haengt an der Schrift, und die liegt im Repo
 * (`src/fonts/newsreader-latin-wght-normal.woff2`). Sie wird gemessen, nicht
 * geschaetzt, und das Ergebnis steht in der viewBox des Lockups.
 *
 * Aufruf: `node tools/brand/derive.mjs` (schreibt) oder mit `--check`
 * (schreibt nicht, meldet Abweichungen mit Rueckgabewert 1).
 *
 * Zwei Dinge, die nicht im Projekt liegen und deshalb konfigurierbar sind --
 * genau wie in `tools/amber/check.mjs`:
 *
 * - **playwright-core** ist ein Werkzeug, keine Projektabhaengigkeit
 *   (CLAUDE.md 3): `npm i --no-save playwright-core`.
 * - **Der Chromium-Pfad** steht in `CHROMIUM_PATH`.
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ASSETS = join(ROOT, 'docs/brand/assets');
const PUBLIC = join(ROOT, 'public');
const FONT = join(ROOT, 'src/fonts/newsreader-latin-wght-normal.woff2');

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const CHECK = process.argv.includes('--check');

/** Die Werte der Richtlinie 1.1 §3, soweit sie das Lockup betreffen. */
const MARK_WIDTH = 120; // Bildflaeche der Marke in x (0..120)
const CLEAR = 30; // Schutzraum = ein Knopfdurchmesser
const PAD = 12; // der Rand, den die Owner-viewBox schon mitbringt
const WORDMARK = 'Morse Lab';
const WORDMARK_SIZE = 46;
const WORDMARK_X = MARK_WIDTH + CLEAR; // 150
const WORDMARK_BASELINE = 62;

const PAPER = '#F6F1E8';

// --- Verpackung ------------------------------------------------------------

/** Haengt Rolle, Beschriftung und `<title>` an ein Original an. Sonst nichts. */
function labelled(svg) {
  const open = svg.indexOf('>');
  return (
    svg.slice(0, open) +
    ' role="img" aria-label="Morse Lab">\n  <title>Morse Lab</title>' +
    svg.slice(open + 1) +
    '\n'
  );
}

/**
 * Die maskable-Variante: dieselbe Zeichnung, nur ohne Eckenradius.
 *
 * Nicht umskaliert. Die Marke liegt im App-Icon bereits innerhalb der
 * Sicherheitszone: der aeusserste Punkt der Zeichnung liegt 182,7 px von der
 * Mitte, erlaubt sind 204,8 (40 % von 512). Ein zweites Mal Luft zu lassen
 * machte sie kleiner als noetig.
 */
function maskable(appicon) {
  const flat = appicon.replace('rx="116"', 'rx="0"');
  if (flat === appicon) throw new Error('Eckenradius im App-Icon nicht gefunden');
  return labelled(flat);
}

/** Die vier Formen der Marke, ohne ihren `<svg>`-Rahmen. */
function markBody(mark) {
  return mark.slice(mark.indexOf('>') + 1, mark.lastIndexOf('</svg>')).replace(/\s+$/, '');
}

/**
 * Das primaere Lockup (1.1 §3): Marke links, Wortmarke rechts, dazwischen ein
 * Knopfdurchmesser.
 *
 * Der Text bleibt Text und wird nicht in Pfade gewandelt -- die Schrift liegt
 * im Repo, und so bleibt die Wortmarke durchsuchbar und vorlesbar. Wo
 * Newsreader fehlt, greift der Fallback-Stack.
 */
function lockup(mark, textWidth) {
  const width = PAD + MARK_WIDTH + CLEAR + textWidth + PAD;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${PAD} -${PAD} ${width.toFixed(2)} 98" role="img" aria-label="Morse Lab">
  <title>Morse Lab</title>
  <!--
    Primaeres Lockup (1.1 §3): Marke links, Wortmarke rechts, Abstand ein
    Knopfdurchmesser (${CLEAR}). Die Marke ist unveraendert die aus
    docs/brand/assets/morse-lab-mark.svg -- hier wird nichts nachgezeichnet
    (Ruling #88). Die Wortmarke steht in Newsreader Regular, ohne Sperrung und
    ohne Versalien; sie ist als Text ausgezeichnet, nicht in Pfade gewandelt.
    Die Breite der viewBox folgt der gemessenen Textbreite von
    ${textWidth.toFixed(2)} px (tools/brand/derive.mjs).
    Mindestgroesse fuer dieses Lockup: 140 px Breite.
  -->${markBody(mark)}
  <text x="${WORDMARK_X}" y="${WORDMARK_BASELINE}"
        font-family="Newsreader, Georgia, serif" font-size="${WORDMARK_SIZE}"
        font-weight="400" letter-spacing="0" fill="#221D16">${WORDMARK}</text>
</svg>
`;
}

// --- Browser ---------------------------------------------------------------

async function openBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    throw new Error(
      'playwright-core fehlt. Es ist ein Werkzeug, keine Projektabhängigkeit:\n' +
        '  npm i --no-save playwright-core',
    );
  }

  await access(CHROMIUM_PATH).catch(() => {
    throw new Error(
      `Chromium nicht gefunden: ${CHROMIUM_PATH}\n` +
        '  Pfad über CHROMIUM_PATH setzen (die Umgebung entscheidet, nicht dieses Skript).',
    );
  });

  return chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });
}

/** Die Repo-Schrift als `@font-face`, damit die Seite genau sie benutzt. */
async function fontFace() {
  const woff2 = await readFile(FONT);
  return `@font-face {
    font-family: 'Newsreader';
    font-weight: 200 800;
    src: url(data:font/woff2;base64,${woff2.toString('base64')}) format('woff2-variations');
  }`;
}

/**
 * Misst die Wortmarke mit der Schrift aus dem Repo.
 *
 * Gemessen wird an einem echten SVG-`<text>` mit `getComputedTextLength()` --
 * also an derselben Auszeichnung, die spaeter im Lockup steht, nicht an einer
 * Canvas-Naeherung.
 */
async function measureWordmark(page, css) {
  await page.setContent(`<style>${css}</style><svg><text id="probe"
      font-family="Newsreader, Georgia, serif" font-size="${WORDMARK_SIZE}"
      style="font-variation-settings: 'wght' 400" font-weight="400"
      letter-spacing="0">${WORDMARK}</text></svg>`);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.getElementById('probe').getComputedTextLength());
}

/**
 * Rendert ein SVG in ein PNG fester Groesse.
 *
 * **Ohne eigenen Hintergrund** (`omitBackground`): die Flaeche des Icons ist
 * das Papier-Rechteck *im* SVG, und das hat einen Eckenradius. Faerbte die
 * Seite dahinter, waeren die runden Ecken wieder quadratisch gefuellt -- das
 * PNG zeigte dann nicht mehr, was in der Owner-Datei steht. Die maskable-
 * Variante ist davon unberuehrt, ihr Rechteck geht ohnehin bis in die Ecken.
 */
async function render(page, css, svg, width, height) {
  await page.setViewportSize({ width: Math.round(width), height: Math.round(height) });
  await page.setContent(
    `<style>${css} html,body{margin:0;padding:0;background:transparent}
     svg{display:block;width:${width}px;height:${height}px}</style>${svg}`,
  );
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: true });
}

/**
 * Das Social-Bild (1200 × 630): Papier, das Lockup zentriert, 520 px breit.
 *
 * SVG rendern die Plattformen nicht, deshalb ueberhaupt ein PNG.
 */
async function renderOg(page, css, lockupSvg) {
  const [, , , vbWidth, vbHeight] = lockupSvg
    .match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/)
    .map(Number);
  const width = 520;
  const height = (width * vbHeight) / vbWidth;

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(
    `<style>${css} html,body{margin:0;padding:0}
     body{width:1200px;height:630px;background:${PAPER};
          display:flex;align-items:center;justify-content:center}
     svg{display:block;width:${width}px;height:${height}px}</style>${lockupSvg}`,
  );
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot();
}

// --- Ablauf ----------------------------------------------------------------

const written = [];
const differs = [];

async function emit(path, content) {
  const target = join(PUBLIC, path);
  const current = await readFile(target).catch(() => null);
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');

  if (current !== null && current.equals(next)) return;
  if (CHECK) {
    differs.push(path);
    return;
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, next);
  written.push(path);
}

async function main() {
  const mark = await readFile(join(ASSETS, 'morse-lab-mark.svg'), 'utf8');
  const inverse = await readFile(join(ASSETS, 'morse-lab-mark-inverse.svg'), 'utf8');
  const appicon = await readFile(join(ASSETS, 'morse-lab-appicon.svg'), 'utf8');

  const browser = await openBrowser();
  const page = await browser.newPage();
  const css = await fontFace();

  try {
    const textWidth = await measureWordmark(page, css);
    console.log(`Wortmarke "${WORDMARK}", Newsreader 400 @ ${WORDMARK_SIZE} px: ` +
      `${textWidth.toFixed(2)} px gemessen`);
    console.log(`viewBox-Breite = ${PAD} + ${MARK_WIDTH} + ${CLEAR} + ` +
      `${textWidth.toFixed(2)} + ${PAD} = ` +
      `${(PAD + MARK_WIDTH + CLEAR + textWidth + PAD).toFixed(2)}`);

    const lockupSvg = lockup(mark, textWidth);
    const iconSvg = labelled(appicon);
    const maskableSvg = maskable(appicon);

    await emit('logo-key.svg', labelled(mark));
    await emit('logo-mark-inverse.svg', labelled(inverse));
    await emit('logo-lockup.svg', lockupSvg);
    await emit('favicon.svg', iconSvg);
    await emit('icons/icon.svg', iconSvg);
    await emit('icons/icon-maskable.svg', maskableSvg);

    await emit('icons/icon-192.png', await render(page, css, appicon, 192, 192));
    await emit('icons/icon-512.png', await render(page, css, appicon, 512, 512));
    await emit('icons/apple-touch-icon.png', await render(page, css, appicon, 180, 180));
    await emit(
      'icons/icon-maskable-512.png',
      await render(page, css, appicon.replace('rx="116"', 'rx="0"'), 512, 512),
    );
    await emit('og-morse-lab.png', await renderOg(page, css, lockupSvg));
  } finally {
    await browser.close();
  }

  if (CHECK) {
    if (differs.length > 0) {
      console.log('\nNicht aus den Originalen abgeleitet:');
      for (const path of differs) console.log(`  - public/${path}`);
      process.exitCode = 1;
      return;
    }
    console.log('\nAlle Ableitungen stimmen mit den Originalen überein.');
    return;
  }

  console.log(written.length === 0 ? '\nNichts zu tun.' : `\nGeschrieben: ${written.length}`);
  for (const path of written) console.log(`  - public/${path}`);
}

await main();
