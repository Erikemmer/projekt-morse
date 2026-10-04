/**
 * Messung für C1 (Plan-Schritt 4, Entscheidung D4): wie hoch ist der
 * Settings-Screen in 390 × 844, 1280 × 720 und 1440 × 900?
 *
 * **Eine Messung, kein Check.** Sie prüft nichts und gehört nicht in
 * `npm run build`. Sie ist eingecheckt, damit die Zahlen in
 * `docs/PLAN-FINDINGS.md` wiederholbar sind. Aufruf (nach `npm run build`):
 * `node tools/prep/settings-height.mjs` — `playwright-core` per
 * `npm i --no-save`, Chromium über `CHROMIUM_PATH`.
 *
 * Für den Vorher/Nachher-Vergleich zeigt `PREP_DIST` auf ein anderes
 * Build-Verzeichnis (Standard `dist`): den Stand vor dem Ausbau bauen, nach
 * `PREP_DIST=...` kopieren, dann den neuen Stand bauen und beide messen.
 *
 * Seed: 20 aktive, alle eingeführte Zeichen (`CHARACTER_ORDER`), kein
 * Lernlauf. Vorschau-Server und Browser-Start sind **dupliziert**, nicht
 * extrahiert (D11) — das ist jetzt der fünfte Ort.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.PREP_PORT ?? 4186);
const DIST = process.env.PREP_DIST ?? 'dist';
const BASE_URL = `http://localhost:${PORT}`;
const STORAGE_KEY = 'projekt-morse:progress';
const ORDER = 'KMRSUAPTLOWINJEF0YVG5Q9ZH38B427C1D6X';
const COUNT = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
];

function progress() {
  const active = [...ORDER].slice(0, COUNT);
  const record = () => ({
    attempts: 10,
    hits: 10,
    recentReactions: [0.6, 0.7, 0.8, 0.9, 1.0],
  });
  return {
    version: 1,
    characters: Object.fromEntries(active.map((char) => [char, record()])),
    activeCharacters: active,
    recentAnswers: [],
    answersSinceGrowth: 0,
    sessionsStarted: 3,
    day: { date: '', attempts: 0, hits: 0, characters: [] },
    introSeen: true,
    introducedCharacters: active,
    variabilityNoticeSeen: true,
  };
}

async function startPreview() {
  await access(DIST).catch(() => {
    throw new Error(`${DIST}/ fehlt — bitte zuerst \`npm run build\`.`);
  });
  // Ein übrig gebliebener Server auf dem Port würde statt des gewünschten Builds antworten.
  if (await fetch(BASE_URL).then((r) => r.ok, () => false)) {
    throw new Error(`Auf ${BASE_URL} läuft schon ein Server — bitte beenden.`);
  }
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(BASE_URL)).ok) return server;
    } catch {
      // noch nicht oben
    }
    await sleep(250);
  }
  server.kill();
  throw new Error(`Vorschau-Server auf ${BASE_URL} kam nicht hoch.`);
}

async function openBrowser() {
  const { chromium } = await import('playwright-core');
  await access(CHROMIUM_PATH);
  return chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
}

async function measureOne(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(progress())],
  );
  await page.goto(BASE_URL);
  await page.waitForSelector('.stage', { timeout: 20000 });
  // Ab 900 px steht die Navigation fest da (kein Menü-Knopf), darunter hinter „Menu“.
  const menu = page.getByRole('button', { name: 'Menu' });
  await page.waitForTimeout(1500);
  if (await menu.isVisible()) {
    await menu.click();
    await page.waitForSelector('.menu');
  }
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.waitForSelector('.settings-build');
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      pageH: Math.max(doc.scrollHeight, document.body.scrollHeight),
      viewH: innerHeight,
      hasLogButton: document.querySelector('.settings-log-action') !== null,
      horizontalOverflow: doc.scrollWidth > innerWidth,
    };
  });
  await context.close();
  return { ...result, scrolls: result.pageH > result.viewH, over: result.pageH - result.viewH };
}

const server = await startPreview();
let browser;
try {
  browser = await openBrowser();
  console.log(`Settings-Höhe (${COUNT} aktive Zeichen), Build: ${DIST}`);
  for (const viewport of VIEWPORTS) {
    const r = await measureOne(browser, viewport);
    console.log(
      `${viewport.name}: Seite ${r.pageH} px, Fenster ${r.viewH} px, ` +
        `${r.scrolls ? `scrollt (+${r.over} px)` : 'scrollt nicht'}, ` +
        `Log-Knopf ${r.hasLogButton ? 'ja' : 'nein'}, horizontaler Überlauf ${r.horizontalOverflow ? 'ja' : 'nein'}`,
    );
  }
} finally {
  await browser?.close();
  server.kill();
}
