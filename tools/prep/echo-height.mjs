/**
 * Messung für B3 (FINDINGS #6 Punkt 1, Entscheidung D3): wie hoch ist der
 * Echo-Check bei 15 und bei 36 Optionen, und was kosten die Wege (a)/(b)?
 *
 * **Eine Messung, kein Check.** Sie prüft nichts und gehört nicht in
 * `npm run build`. Sie ist eingecheckt, damit die Zahlen in
 * `docs/PLAN-FINDINGS.md` wiederholbar sind. Aufruf (nach `npm run build`):
 * `node tools/prep/echo-height.mjs` — `playwright-core` per
 * `npm i --no-save`, Chromium über `CHROMIUM_PATH`.
 *
 * Aufbau wie `tools/keyboard/check.mjs`: Vorschau-Server, geseedeter
 * localStorage, Lesen am gerenderten Ergebnis. Vorschau-Server und
 * Browser-Start sind **dupliziert**, nicht extrahiert (D11).
 *
 * Seed: N aktive Zeichen aus `CHARACTER_ORDER`, davon N−1 eingeführt — das
 * letzte ist fällig, die App startet den Lernlauf; `answerPool` ist dann
 * bekannt + aktuelles Zeichen = N Optionen.
 *
 * **Die Wege (a) und (b) sind hier Simulationen am DOM**, kein gebauter Code:
 * (a) setzt `.answers` die Klasse `keypad` (wie `ReviewPicker`) und zeigt nur
 * die Optionen des Pools, (a36) dasselbe, aber ortsfest mit immer 36 Plätzen
 * (wie das echte `ReviewPicker`/Trainings-Tastenfeld: Nicht-Dazugehöriges
 * gedimmt), (b) blendet alle Optionen bis auf `CAP` aus. Sie zeigen die Höhe, nicht das Verhalten.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.PREP_PORT ?? 4185);
const BASE_URL = `http://localhost:${PORT}`;
const STORAGE_KEY = 'projekt-morse:progress';
const ORDER = 'KMRSUAPTLOWINJEF0YVG5Q9ZH38B427C1D6X';
const CAP = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
];

function progress(count) {
  const active = [...ORDER].slice(0, count);
  const introduced = active.slice(0, -1);
  const record = () => ({
    attempts: 10,
    hits: 10,
    recentReactions: [0.6, 0.7, 0.8, 0.9, 1.0],
  });
  return {
    version: 1,
    characters: Object.fromEntries(introduced.map((char) => [char, record()])),
    activeCharacters: active,
    recentAnswers: [],
    answersSinceGrowth: 0,
    sessionsStarted: 3,
    day: { date: '', attempts: 0, hits: 0, characters: [] },
    introSeen: true,
    introducedCharacters: introduced,
    variabilityNoticeSeen: true,
  };
}

async function startPreview() {
  await access('dist').catch(() => {
    throw new Error('dist/ fehlt — bitte zuerst `npm run build`.');
  });
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
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

/** Misst die gerade gezeigte Ansicht. */
const MEASURE = (cap) => () => {
  const answers = document.querySelector('.answers, .keypad');
  const buttons = [...answers.querySelectorAll('.answer')].filter(
    (el) => getComputedStyle(el).display !== 'none',
  );
  const tops = new Set(buttons.map((el) => Math.round(el.getBoundingClientRect().top + scrollY)));
  const first = buttons[0].getBoundingClientRect();
  const doc = document.documentElement;
  return {
    options: buttons.length,
    rows: tops.size,
    buttonW: Math.round(first.width),
    buttonH: Math.round(first.height),
    pageH: Math.max(doc.scrollHeight, document.body.scrollHeight),
    viewH: innerHeight,
    // Passt es wirklich, oder ist nur die Seite so hoch wie das Fenster, weil
    // die Bühne schrumpft? Dann ist `stageH` klein oder Bühne und Antworten
    // überlappen (`gap` < 0).
    stageH: Math.round(document.querySelector('.stage').getBoundingClientRect().height),
    gap: Math.round(
      answers.getBoundingClientRect().top - document.querySelector('.stage').getBoundingClientRect().bottom,
    ),
    answersH: Math.round(answers.getBoundingClientRect().height),
    answersBottom: Math.round(answers.getBoundingClientRect().bottom + scrollY),
    horizontalOverflow: doc.scrollWidth > innerWidth,
  };
};

async function measureOne(browser, viewport, count, variant) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(progress(count))],
  );
  await page.goto(BASE_URL);
  await page.waitForSelector('.learn-char', { timeout: 20000 });
  await page.waitForSelector('.pattern-row', { timeout: 20000 });
  await page.getByRole('button', { name: 'Try it' }).click();
  await page.getByRole('button', { name: /^Play the character/ }).click();
  await page.waitForFunction(
    () => /Which character/.test(document.querySelector('.question')?.textContent ?? ''),
    null,
    { timeout: 30000 },
  );
  if (variant === 'a') {
    await page.evaluate(() => document.querySelector('.answers').classList.add('keypad'));
  } else if (variant === 'a36') {
    // Ortsfest wie `ReviewPicker`: immer alle 36 Plätze, nicht dazugehörige
    // gedimmt. Hier nur die Höhe: fehlende Plätze werden als Klone ergänzt.
    await page.evaluate(() => {
      const answers = document.querySelector('.answers');
      answers.classList.add('keypad');
      const first = answers.querySelector('.answer');
      while (answers.querySelectorAll('.answer').length < 36) {
        const clone = first.cloneNode(true);
        clone.dataset.active = 'false';
        answers.appendChild(clone);
      }
    });
  } else if (variant === 'b') {
    await page.evaluate((cap) => {
      [...document.querySelectorAll('.answers .answer')].forEach((el, i) => {
        if (i >= cap) el.style.display = 'none';
      });
    }, CAP);
  }
  await page.waitForTimeout(150);
  const result = await page.evaluate(MEASURE(CAP));
  await context.close();
  return result;
}

const server = await startPreview();
let browser;
try {
  browser = await openBrowser();
  const header = ['Viewport', 'Zeichen', 'Variante', 'Optionen', 'Zeilen', 'Taste', 'Seite', 'Fenster', 'scrollt', 'Rand unten', 'Bühne', 'Abstand', 'Antworten'];
  console.log(header.join(' | '));
  for (const viewport of VIEWPORTS) {
    for (const count of [15, 36]) {
      // Seit B3 (Runde P15) ist Weg (a) gebaut: 'heute' misst den echten Stand.
      // Die Simulationen 'a'/'a36'/'b' (P12) brauchen `.answers` und laufen nur
      // noch gegen einen Stand vor B3: `ECHO_VARIANTS=heute,a,a36,b`.
      for (const variant of (process.env.ECHO_VARIANTS ?? 'heute').split(',')) {
        const m = await measureOne(browser, viewport, count, variant);
        console.log(
          [
            viewport.name,
            count,
            variant,
            m.options,
            m.rows,
            `${m.buttonW}x${m.buttonH}`,
            m.pageH,
            m.viewH,
            m.pageH > m.viewH ? `ja (+${m.pageH - m.viewH})` : 'nein',
            m.answersBottom,
            m.stageH,
            m.gap,
            m.answersH,
          ].join(' | ') + (m.horizontalOverflow ? '  [HORIZONTAL]' : ''),
        );
      }
    }
  }
} finally {
  await browser?.close();
  server.kill();
}
