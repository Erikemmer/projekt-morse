/**
 * Prüfskript für die Tastatur: **jeder Anschlag, der je verschluckt wurde,
 * wird hier einmal absichtlich ausgelöst.**
 *
 * Die Tastatur-Meldung „Anschläge werden teilweise nicht erkannt" hat sechs
 * Runden überlebt (P2 bis P8). Jede Runde fand einen echten Fehler, und der
 * Nutzer meldete den Ausfall danach erneut — weil jeder Fehler erst *live*
 * auffiel und die Prüfung danach als Wegwerf-Skript weggeräumt wurde. Ein
 * Check, den es nur gibt, solange jemand daran denkt, prüft am Ende nichts
 * (derselbe Grund, aus dem `tools/amber/check.mjs` existiert).
 *
 * **Gemessen wird am gerenderten Ergebnis.** Jeder Fall schickt echte
 * `keydown`-Ereignisse über das DevTools-Protokoll (so kann er Modifikator-
 * Flaggen und `repeat` setzen, was `page.keyboard` nicht kann) und liest
 * danach, was der Bildschirm zeigt: die Phase (Text der Frage, `.reveal`,
 * `.solution`), die Antwortzeile, die Taste. Nie, was der Code „sollte".
 *
 * **Der Alt-Fall.** Wer per Alt-Tab aus dem Browser heraus- und wieder
 * hineinwechselt, lässt Alt los, während die Seite den Fokus nicht hat; das
 * `keyup` kommt nie an, und jedes folgende `keydown` trägt `altKey: true`.
 * Echtes Alt-Tab kann dieses Skript nicht auslösen (es braucht einen
 * Fenstermanager). Es stellt den **Zustand** her, den Alt-Tab hinterlässt: ein
 * `keydown` mit gesetztem Alt-Flag und ohne vorheriges Alt-`keydown`.
 *
 * **Zeichentasten statt Enter/Leertaste bei den Alt-Fällen.** Auf einem
 * fokussierten Knopf aktiviert der Browser Enter und Leertaste *von selbst*.
 * Ein Test mit Enter bliebe grün, auch wenn der Handler den Anschlag
 * verschluckt — er prüfte den Browser statt die App. Ein Buchstabe hat keine
 * native Wirkung; kommt er an, dann über den Handler.
 *
 * Aufruf: `npm run verify:keyboard` (nach `npm run build`). Nicht Teil von
 * `npm run build` — es braucht Chromium und läuft vor Releases von Hand.
 * Eine Umgebungsvariable `KEYBOARD_ONLY=K1,K7` führt nur diese Fälle aus
 * (zum Eingrenzen und für den Rot-Test).
 *
 * Wie das Amber-Skript hat es zwei Dinge, die nicht im Projekt liegen:
 *
 * - **playwright-core** ist ein Werkzeug, keine Projektabhängigkeit
 *   (CLAUDE.md 3): `npm i --no-save playwright-core`.
 * - **Der Chromium-Pfad** steht in `CHROMIUM_PATH`.
 *
 * Der Vorschau-Server und der Browser-Start sind aus `tools/amber/check.mjs`
 * **dupliziert**, nicht herausgezogen: ein gemeinsames Modul berührte eine
 * fremde Datei (CLAUDE.md 5), und ein zweites Skript ist erst der zweite
 * Bedarf. Beim dritten wird verallgemeinert.
 *
 * Rückgabewert 1, sobald ein Fall rot ist oder die Seite einen Fehler wirft.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const PORT = Number(process.env.KEYBOARD_PORT ?? 4184);
const BASE_URL = `http://localhost:${PORT}`;

const STORAGE_KEY = 'projekt-morse:progress';

const ONLY = process.env.KEYBOARD_ONLY
  ? new Set(process.env.KEYBOARD_ONLY.split(',').map((id) => id.trim()))
  : null;

const LETTERS = 'KMRSUA';
const WORD_LETTERS = 'KMRSUAPTLO';

/**
 * Ein Fortschritt, wie ihn die App nach `parseProgress` erwartet. Dieselbe
 * Form wie in `tools/amber/check.mjs` (dort begründet: das Skript prüft die
 * *ausgelieferte* App gegen einen Stand, wie ihn ein Browser vorfindet).
 */
function progress({ characters = LETTERS, slow = [] } = {}) {
  const active = [...characters];
  const record = (median) => ({
    attempts: 10,
    hits: 10,
    recentReactions: [median - 0.2, median - 0.1, median, median + 0.1, median + 0.2],
  });

  return {
    version: 1,
    characters: Object.fromEntries(
      active.map((char) => [char, record(slow.includes(char) ? 2.6 : 0.8)]),
    ),
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

/** Ein frischer Stand: die Einführung läuft. */
const FIRST_RUN = null;

// --- Anschläge -------------------------------------------------------------

/** Modifikator-Maske des DevTools-Protokolls. */
const MOD = { alt: 1, ctrl: 2, meta: 4 };

const SPECIAL_KEYS = {
  Enter: { code: 'Enter', vk: 13 },
  Backspace: { code: 'Backspace', vk: 8 },
  ' ': { code: 'Space', vk: 32, text: ' ' },
  '.': { code: 'Period', vk: 190, text: '.' },
  '-': { code: 'Minus', vk: 189, text: '-' },
};

function keyInfo(key) {
  if (SPECIAL_KEYS[key]) return { key, ...SPECIAL_KEYS[key] };
  if (/^[A-Za-z0-9]$/.test(key)) {
    const upper = key.toUpperCase();
    return {
      key: upper,
      code: /\d/.test(upper) ? `Digit${upper}` : `Key${upper}`,
      vk: upper.charCodeAt(0),
      text: upper,
    };
  }
  throw new Error(`Unbekannte Taste im Prüfskript: ${key}`);
}

const sessions = new WeakMap();

async function cdp(page) {
  if (!sessions.has(page)) sessions.set(page, await page.context().newCDPSession(page));
  return sessions.get(page);
}

/**
 * `keydown` einer Taste. `mods` setzt die Modifikator-Flaggen *ohne* ein
 * eigenes Alt-/Strg-`keydown` — genau der Zustand nach einem Fensterwechsel.
 * `repeat` ist der Auto-Repeat einer gehaltenen Taste.
 */
async function down(page, key, { mods = 0, repeat = false } = {}) {
  const info = keyInfo(key);
  // Mit Strg oder Cmd erzeugt eine Zeichentaste kein Zeichen (Kuerzel).
  const printable = info.text !== undefined && (mods & (MOD.ctrl | MOD.meta)) === 0;
  const session = await cdp(page);
  await session.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    modifiers: mods,
    key: info.key,
    code: info.code,
    windowsVirtualKeyCode: info.vk,
    nativeVirtualKeyCode: info.vk,
    autoRepeat: repeat,
    ...(printable ? { text: info.text } : {}),
  });
  if (printable && !repeat) {
    await session.send('Input.dispatchKeyEvent', {
      type: 'char',
      modifiers: mods,
      key: info.key,
      code: info.code,
      windowsVirtualKeyCode: info.vk,
      nativeVirtualKeyCode: info.vk,
      text: info.text,
    });
  }
}

async function up(page, key, { mods = 0 } = {}) {
  const info = keyInfo(key);
  const session = await cdp(page);
  await session.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    modifiers: mods,
    key: info.key,
    code: info.code,
    windowsVirtualKeyCode: info.vk,
    nativeVirtualKeyCode: info.vk,
  });
}

/** Ein ganzer Anschlag: runter, rauf. */
async function tap(page, key, options = {}) {
  await down(page, key, options);
  await up(page, key, options);
}

/** Eine gehaltene Taste: ein Anschlag, danach Auto-Repeat, dann loslassen. */
async function hold(page, key, { repeats = 30, everyMs = 20 } = {}) {
  await down(page, key);
  for (let index = 0; index < repeats; index += 1) {
    await page.waitForTimeout(everyMs);
    await down(page, key, { repeat: true });
  }
  await up(page, key);
}

// --- Lesen -----------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(read, { timeout = 10000, label }) {
  const started = Date.now();
  for (;;) {
    const value = await read();
    if (value) return value;
    if (Date.now() - started > timeout) {
      throw new Error(`Zeit abgelaufen (${timeout} ms): ${label}`);
    }
    await sleep(40);
  }
}

async function questionText(page) {
  const question = page.locator('.question').first();
  if ((await question.count()) === 0) return '';
  return (await question.innerText()).replace(/\s+/g, ' ').trim();
}

/** Die Phase des Einzelzeichen-Loops (Training, Speed round, Echo-Check). */
async function characterPhase(page) {
  if ((await page.locator('.reveal').count()) > 0) return 'feedback';
  const question = await questionText(page);
  if (/Which character/.test(question)) return 'answering';
  if (/Listening/.test(question)) return 'listening';
  if (/Ready when/.test(question)) return 'ready';
  return `?(${question})`;
}

/** Die Phase des Wort-Loops. */
async function wordPhase(page) {
  if ((await page.locator('.solution').count()) > 0) return 'feedback';
  const question = await questionText(page);
  if (/Type what you heard/.test(question)) return 'answering';
  if (/Listening/.test(question)) return 'listening';
  if (/Ready when/.test(question)) return 'ready';
  return `?(${question})`;
}

/** Die Phase des Sende-Loops. */
async function sendPhase(page) {
  if ((await page.locator('.send-solution').count()) > 0) return 'feedback';
  const question = await questionText(page);
  if (/Listening/.test(question)) return 'listening';
  if (/Tap the pattern/.test(question)) return 'sending';
  if (/Ready when/.test(question)) return 'ready';
  return `?(${question})`;
}

const waitPhase = (read, page, wanted, timeout = 15000) =>
  waitFor(async () => (await read(page)) === wanted, {
    timeout,
    label: `Phase "${wanted}"`,
  });

/** Die Antwortzeile des Wort-Modus als Text; leer heisst "—". */
async function typedRow(page) {
  return (await page.locator('.answer-typed').first().innerText()).replace(/\s+/g, ' ').trim();
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Wege in die Modi ------------------------------------------------------

async function openMenu(page, label) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForSelector('.menu');
  await page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label })).first().click();
  await page.waitForTimeout(300);
}

/** Training: den Play-Kreis druecken und warten, bis die Frage steht. */
async function toAnswering(page) {
  await page.getByRole('button', { name: /^Play the character/ }).click();
  await waitPhase(characterPhase, page, 'answering', 20000);
}

/**
 * Erstlauf bis zum Echo-Check, noch ohne Wiedergabe: Phase `echo-ready`.
 * Karte 1 hat seit Runde P24 keinen Check (eine Option, `echoDue`); der erste
 * Check kommt nach Karte 2.
 */
async function toEchoReady(page) {
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.waitForSelector('.pattern-row', { timeout: 20000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Try it' }).click({ timeout: 20000 });
  await waitPhase(characterPhase, page, 'ready');
}

/**
 * Das Zeichen des ersten Abrufs: immer das gerade eingefuehrte, und das steht
 * im Pool zuletzt (`answerPool`).
 */
async function echoOption(page) {
  const label = await page.locator('.answers .answer').last().innerText();
  return label.split('\n')[0].trim();
}

async function toWordReady(page) {
  await openMenu(page, 'Words & groups');
  await waitPhase(wordPhase, page, 'ready');
}

/** Wort-Modus: Wiedergabe starten und warten, bis die Eingabe faellig ist. */
async function toWordAnswering(page) {
  await page.getByRole('button', { name: /^Play the word/ }).click();
  await waitPhase(wordPhase, page, 'answering', 40000);
}

async function toSendReady(page) {
  await openMenu(page, 'Send');
  await page.waitForSelector('.tap-pad');
}

// --- Die Faelle ------------------------------------------------------------
//
// `id` taucht im Plan (docs/PLAN-FINDINGS.md, A1) und in HANDOVER.md auf.
// "Vorher" nennt das Verhalten vor dem jeweiligen Fix -- ein Fall, der auch
// vorher gruen waere, prueft nichts.

const CASES = [
  // ---- Der Alt-Fall (P8): ein Anschlag mit haengendem Alt zaehlt ----------
  {
    id: 'K1',
    name: 'Training, answering: „K" mit hängendem Alt wird verbucht (P8)',
    seed: progress(),
    async run(page) {
      await toAnswering(page);
      await tap(page, 'K', { mods: MOD.alt });
      await waitPhase(characterPhase, page, 'feedback', 3000);
    },
  },
  {
    id: 'K2',
    name: 'Klang-Auswahl: „P" mit hängendem Alt öffnet dessen Karte (P8)',
    seed: progress(),
    async run(page) {
      await openMenu(page, 'Learn the sounds');
      await page.waitForSelector('.keypad');
      await tap(page, 'P', { mods: MOD.alt });
      await waitFor(
        async () => (await page.locator('.learn-char').count()) > 0,
        { timeout: 3000, label: 'Karte von P geöffnet' },
      );
      expect(
        (await page.locator('.learn-char').first().innerText()).trim() === 'P',
        'Die geöffnete Karte zeigt nicht P',
      );
    },
  },
  {
    id: 'K2b',
    name: 'Echo-Check, answering: Zeichen mit hängendem Alt wird verbucht (P8)',
    seed: FIRST_RUN,
    async run(page) {
      await toEchoReady(page);
      const option = await echoOption(page);
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await waitPhase(characterPhase, page, 'answering', 20000);
      await tap(page, option, { mods: MOD.alt });
      await waitPhase(characterPhase, page, 'feedback', 3000);
    },
  },
  {
    id: 'K3',
    name: 'Wort-Modus, answering: „K" mit hängendem Alt landet in der Antwortzeile (P8)',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await toWordAnswering(page);
      await tap(page, 'K', { mods: MOD.alt });
      await waitFor(async () => /Your answer so far: K/.test(await typedRow(page)), {
        timeout: 3000,
        label: 'K in der Antwortzeile',
      });
    },
  },
  {
    id: 'K3b',
    name: 'Sende-Modus (zwei Tasten): „." mit hängendem Alt tippt ein dit (P8)',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await tap(page, '.', { mods: MOD.alt });
      await waitFor(
        async () => /dit/.test(await page.locator('.tap-typed').innerText()),
        { timeout: 3000, label: 'dit getippt' },
      );
    },
  },
  {
    id: 'K3c',
    name: 'Sende-Modus (Morsetaste): Leertaste mit hängendem Alt tastet (P8)',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await page.getByRole('button', { name: 'Use real keying' }).click();
      await page.waitForSelector('.send-key');
      await down(page, ' ', { mods: MOD.alt });
      await waitFor(
        async () => (await page.locator('.send-key').getAttribute('data-pressed')) === 'true',
        { timeout: 3000, label: 'Taste gedrückt' },
      );
      await up(page, ' ', { mods: MOD.alt });
    },
  },

  // ---- Der Schutz bleibt: Strg- und Cmd-Kuerzel gehoeren dem Browser ------
  {
    id: 'K5a',
    name: 'Training, answering: Strg+K und Cmd+K werden nicht beantwortet',
    seed: progress(),
    async run(page) {
      await toAnswering(page);
      await tap(page, 'K', { mods: MOD.ctrl });
      await tap(page, 'K', { mods: MOD.meta });
      await page.waitForTimeout(400);
      expect((await characterPhase(page)) === 'answering', 'Ein Kürzel wurde als Antwort gezählt');
    },
  },
  {
    id: 'K5b',
    name: 'Echo-Check, answering: Strg+Zeichen und Cmd+Zeichen werden nicht beantwortet',
    seed: FIRST_RUN,
    async run(page) {
      await toEchoReady(page);
      const option = await echoOption(page);
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await waitPhase(characterPhase, page, 'answering', 20000);
      await tap(page, option, { mods: MOD.ctrl });
      await tap(page, option, { mods: MOD.meta });
      await page.waitForTimeout(400);
      expect((await characterPhase(page)) === 'answering', 'Ein Kürzel wurde als Antwort gezählt');
    },
  },
  {
    id: 'K5c',
    name: 'Wort-Modus, answering: Strg+K und Cmd+K landen nicht in der Antwortzeile',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await toWordAnswering(page);
      await tap(page, 'K', { mods: MOD.ctrl });
      await tap(page, 'K', { mods: MOD.meta });
      await page.waitForTimeout(400);
      expect(!/Your answer so far/.test(await typedRow(page)), 'Ein Kürzel landete in der Antwortzeile');
    },
  },

  // ---- Training: die zeitlichen Rennen aus P5 und P5c ---------------------
  {
    id: 'K6',
    name: 'Training: Nachdruck desselben Buchstabens lässt die Auflösung stehen (P5, Befund A)',
    seed: progress(),
    async run(page) {
      await page.waitForSelector('.play');
      await tap(page, 'K'); // ready: startet die Wiedergabe
      await waitPhase(characterPhase, page, 'listening');
      await tap(page, 'K'); // listening: gepuffert, gilt nach dem Ton
      await page.waitForSelector('.reveal', { timeout: 20000 });
      await tap(page, 'K'); // das "hat's genommen?" -- darf nicht weiterschalten
      await page.waitForTimeout(250);
      expect(
        (await characterPhase(page)) === 'feedback',
        'Der Nachdruck hat die Auflösung weggeschaltet — vorher: Runde 2, Ergebnis nie gesehen',
      );
    },
  },
  {
    id: 'K7',
    name: 'Training: eine gehaltene Taste zählt nur einmal (P5, Befund C)',
    seed: progress(),
    async run(page) {
      await page.waitForSelector('.play');
      await hold(page, 'K', { repeats: 30, everyMs: 20 });
      await waitPhase(characterPhase, page, 'answering', 15000);
      await page.waitForTimeout(800);
      expect(
        (await characterPhase(page)) === 'answering' && (await page.locator('.reveal').count()) === 0,
        'Der Auto-Repeat hat eine Antwort verbucht — vorher: 8 Runden in 1,3 s',
      );
    },
  },
  {
    id: 'K8',
    name: 'Speed round: ein aktives Zeichen außerhalb des Pools ist eine falsche Antwort (P5c)',
    seed: progress({ slow: ['R'] }),
    async run(page) {
      await page.getByRole('button', { name: /speed round/i }).click();
      await toAnswering(page);
      const pool = (await page.locator('.answers .answer:not([disabled])').allInnerTexts()).map(
        (label) => label.split('\n')[0].trim(),
      );
      const outside = [...LETTERS].find((char) => !pool.includes(char));
      expect(outside !== undefined, `Kein aktives Zeichen außerhalb des Pools (${pool.join('')})`);
      await tap(page, outside);
      await waitPhase(characterPhase, page, 'feedback', 3000);
      expect(
        /Not quite/.test(await questionText(page)),
        'Die Antwort außerhalb des Pools wurde nicht als falsch verbucht',
      );
    },
  },
  {
    id: 'T1',
    name: 'Training, ready: ein Zeichen startet die Wiedergabe (Ruling #105)',
    seed: progress(),
    async run(page) {
      await page.waitForSelector('.play');
      await tap(page, 'K');
      await waitPhase(characterPhase, page, 'listening', 5000);
    },
  },
  {
    id: 'T2',
    name: 'Training, feedback: ein anderes Zeichen schaltet weiter (Ruling #105)',
    seed: progress(),
    async run(page) {
      await toAnswering(page);
      await tap(page, 'M');
      await waitPhase(characterPhase, page, 'feedback', 3000);
      await tap(page, 'S'); // anderer Buchstabe als die Antwort: kein Nachdruck
      await waitPhase(characterPhase, page, 'ready', 3000);
    },
  },

  // ---- Echo-Check: die drei Luecken aus P6 --------------------------------
  {
    id: 'K9',
    name: 'Echo-Check, echo-ready: ein Zeichen startet die Wiedergabe (P6, Befund A)',
    seed: FIRST_RUN,
    async run(page) {
      await toEchoReady(page);
      await tap(page, await echoOption(page));
      await waitPhase(characterPhase, page, 'listening', 5000);
    },
  },
  {
    id: 'K10',
    name: 'Echo-Check: ein Zeichen während des Tons wird gepuffert und gilt (P6, Befund B)',
    seed: FIRST_RUN,
    async run(page) {
      await toEchoReady(page);
      const option = await echoOption(page);
      await tap(page, option);
      await waitPhase(characterPhase, page, 'listening', 5000);
      await tap(page, option);
      await waitPhase(characterPhase, page, 'feedback', 20000);
      expect(/Correct/.test(await questionText(page)), 'Der gepufferte Anschlag wurde nicht verbucht');
    },
  },
  {
    id: 'K11',
    name: 'Echo-Check: eine gehaltene Taste zählt nur einmal (P6, Befund C)',
    seed: FIRST_RUN,
    async run(page) {
      await toEchoReady(page);
      await hold(page, await echoOption(page), { repeats: 30, everyMs: 20 });
      await waitPhase(characterPhase, page, 'answering', 15000);
      await page.waitForTimeout(800);
      expect(
        (await characterPhase(page)) === 'answering' && (await page.locator('.reveal').count()) === 0,
        'Der Auto-Repeat wurde als Antwort gepuffert und verbucht',
      );
    },
  },

  // ---- Wort-Modus: die Inventur aus HANDOVER.md (S3) ----------------------
  {
    id: 'W1',
    name: 'Wort-Modus, ready: Enter startet die Wiedergabe, ein Buchstabe tut nichts',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await tap(page, 'K');
      await page.waitForTimeout(300);
      expect((await wordPhase(page)) === 'ready', 'Ein Buchstabe in ready hat etwas ausgelöst');
      await tap(page, 'Enter');
      await waitPhase(wordPhase, page, 'listening', 5000);
    },
  },
  {
    id: 'W2',
    name: 'Wort-Modus, listening: Buchstabe tippt, Backspace löscht, Enter tut nichts',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await tap(page, 'Enter');
      await waitPhase(wordPhase, page, 'listening', 5000);
      await tap(page, 'K');
      await waitFor(async () => /Your answer so far: K/.test(await typedRow(page)), {
        timeout: 3000,
        label: 'K in der Antwortzeile',
      });
      await tap(page, 'Backspace');
      await waitFor(async () => !/Your answer so far/.test(await typedRow(page)), {
        timeout: 3000,
        label: 'K gelöscht',
      });
      await tap(page, 'Enter');
      await page.waitForTimeout(300);
      expect((await wordPhase(page)) === 'listening', 'Enter hat mitten im Ton abgebrochen');
    },
  },
  {
    id: 'W3',
    name: 'Wort-Modus, answering: Zeichen tippen, Backspace löscht, Enter schickt ab',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await toWordAnswering(page);
      await tap(page, 'K');
      await tap(page, 'M');
      await waitFor(async () => /K M/.test(await typedRow(page)), { timeout: 3000, label: 'K M' });
      await tap(page, 'Backspace');
      await waitFor(async () => !/K M/.test(await typedRow(page)), { timeout: 3000, label: 'M gelöscht' });
      await tap(page, 'Enter');
      await waitPhase(wordPhase, page, 'feedback', 3000);
    },
  },
  {
    id: 'W4',
    name: 'Wort-Modus: Enter ohne Antwort tut nichts; in feedback tut ein Buchstabe nichts, Enter schaltet weiter',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toWordReady(page);
      await toWordAnswering(page);
      // Eine leere Antwort wird nicht angenommen (engine/wordSession.ts,
      // submitWord): sie waere ein Ueberspringen, das die Statistik verduennt.
      await tap(page, 'Enter');
      await page.waitForTimeout(300);
      expect((await wordPhase(page)) === 'answering', 'Eine leere Antwort wurde abgeschickt');
      await tap(page, 'K');
      await tap(page, 'Enter');
      await waitPhase(wordPhase, page, 'feedback', 3000);
      await tap(page, 'K');
      await page.waitForTimeout(300);
      expect((await wordPhase(page)) === 'feedback', 'Ein Buchstabe hat in feedback weitergeschaltet');
      await tap(page, 'Enter');
      await waitPhase(wordPhase, page, 'ready', 3000);
    },
  },

  // ---- Sende-Modus: die Inventur aus HANDOVER.md (S3) ---------------------
  {
    id: 'S1',
    name: 'Sende-Modus (zwei Tasten): „.", „-" tippen; Leertaste und Enter tun nichts',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await tap(page, '.');
      await tap(page, '-');
      await waitFor(
        async () => /dit dah/.test(await page.locator('.tap-typed').innerText()),
        { timeout: 3000, label: 'dit dah getippt' },
      );
      await tap(page, ' ');
      await tap(page, 'Enter');
      await page.waitForTimeout(300);
      expect(
        /dit dah/.test(await page.locator('.tap-typed').innerText()) &&
          (await sendPhase(page)) === 'sending',
        'Leertaste oder Enter haben die Eingabe verändert',
      );
    },
  },
  {
    id: 'S2',
    name: 'Sende-Modus, feedback: Leertaste tut nichts, Enter schaltet weiter',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await tap(page, '.');
      await page.getByRole('button', { name: 'Done' }).click();
      await waitPhase(sendPhase, page, 'feedback', 3000);
      await tap(page, ' ');
      await page.waitForTimeout(300);
      expect((await sendPhase(page)) === 'feedback', 'Die Leertaste hat in feedback weitergeschaltet (Ruling #105)');
      await tap(page, 'Enter');
      await waitPhase(sendPhase, page, 'ready', 3000);
    },
  },
  {
    id: 'S3',
    name: 'Sende-Modus (Morsetaste): Leertaste tastet und lässt los; „." tut nichts',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await page.getByRole('button', { name: 'Use real keying' }).click();
      await page.waitForSelector('.send-key');
      await down(page, ' ');
      await waitFor(
        async () => (await page.locator('.send-key').getAttribute('data-pressed')) === 'true',
        { timeout: 3000, label: 'Taste gedrückt' },
      );
      await up(page, ' ');
      await waitFor(
        async () => (await page.locator('.send-key').getAttribute('data-pressed')) === 'false',
        { timeout: 3000, label: 'Taste losgelassen' },
      );
      await page.waitForTimeout(400);
      await tap(page, '.');
      await page.waitForTimeout(300);
      expect(
        (await page.locator('.tap-typed').count()) === 0,
        '„." hat in der Morsetaste-Betriebsart etwas getippt',
      );
    },
  },
  {
    id: 'S4',
    name: 'Sende-Modus, listening („Hear it"): jede Taste tut nichts',
    seed: progress({ characters: WORD_LETTERS }),
    async run(page) {
      await toSendReady(page);
      await page.getByRole('button', { name: 'Hear it' }).click();
      await waitPhase(sendPhase, page, 'listening', 3000);
      await tap(page, '.');
      await tap(page, '-');
      await page.waitForTimeout(200);
      expect(
        !/dit|dah/.test(await page.locator('.tap-typed').innerText()),
        'Eine Taste hat mitten in „Hear it" etwas getippt',
      );
    },
  },
];

// --- Ablauf ----------------------------------------------------------------

async function startPreview() {
  await access('dist').catch(() => {
    throw new Error('dist/ fehlt — bitte zuerst `npm run build`.');
  });

  // Direkt mit node statt ueber `npx`: `server.kill()` trifft sonst nur den
  // npx-Prozess, der Server dahinter lebt weiter -- er bliebe nach jedem Lauf
  // stehen, und der naechste Lauf haenge sich unbemerkt an ihn.
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return server;
    } catch {
      // noch nicht oben
    }
    await sleep(250);
  }

  server.kill();
  throw new Error(`Vorschau-Server auf ${BASE_URL} kam nicht hoch.`);
}

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

  return chromium.launch({
    executablePath: CHROMIUM_PATH,
    // Ohne diese Erlaubnis bleibt jeder Ton stumm, und die Phasen hinter
    // einer Wiedergabe waeren nicht erreichbar.
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
}

async function runCase(browser, testCase) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  if (testCase.seed !== FIRST_RUN) {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, JSON.stringify(testCase.seed)],
    );
  }

  try {
    await page.goto(BASE_URL);
    await testCase.run(page);
    if (pageErrors.length > 0) throw new Error(`Seitenfehler: ${pageErrors[0]}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const cases = ONLY === null ? CASES : CASES.filter((testCase) => ONLY.has(testCase.id));
  if (ONLY !== null) {
    const unknown = [...ONLY].filter((id) => !CASES.some((testCase) => testCase.id === id));
    // Ein Tippfehler im Filter liesse einen Fall still verschwinden.
    if (unknown.length > 0) throw new Error(`KEYBOARD_ONLY nennt unbekannte Fälle: ${unknown.join(', ')}`);
  }

  const started = Date.now();
  const server = await startPreview();
  const browser = await openBrowser();
  const failures = [];

  try {
    for (const testCase of cases) {
      try {
        await runCase(browser, testCase);
        console.log(`OK    ${testCase.id.padEnd(4)} ${testCase.name}`);
      } catch (error) {
        failures.push({ testCase, error });
        console.log(`FAIL  ${testCase.id.padEnd(4)} ${testCase.name}`);
        console.log(`      ${String(error.message ?? error).split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log('');
  if (failures.length > 0) {
    console.log(`${failures.length} von ${cases.length} Fällen rot (${seconds} s).`);
    process.exit(1);
  }
  console.log(`Alle ${cases.length} Tastatur-Fälle grün (${seconds} s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
