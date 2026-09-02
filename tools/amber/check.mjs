/**
 * Prüfskript für das Amber-Budget aus Guidelines 1.1 §4:
 * **Amber steht nie zweimal in einer View.**
 *
 * Bis hierher wurde diese Regel in jeder Runde von Hand nachgezählt und das
 * Skript danach weggeräumt (siehe HANDOVER, „Browser-Durchläufe sind ad hoc").
 * Ein Zähler, den es nur gibt, solange jemand daran denkt, prüft am Ende
 * nichts — deshalb liegt er jetzt hier (Ruling Notion-Log #80).
 *
 * **Gezählt wird am gerenderten Ergebnis, nicht am Stylesheet.** Ob eine Regel
 * greift, hängt an Zustand, Reihenfolge und Spezifität; eine Suche über
 * `styles.css` fände Regeln, keine Ansichten. Das Skript geht deshalb jedes
 * sichtbare Element durch und fragt den Browser nach der *berechneten* Farbe.
 *
 * Als Treffer gilt ein Element, dessen **Füllung, Rahmen oder Text** `--amber`
 * oder `--amber-deep` trägt. Bewusst nicht gezählt:
 *
 * - **Der Fokusring** (`:focus-visible` ist amber-deep). Er gehört der
 *   Tastatur, nicht der Gestaltung, und steht immer nur an einer Stelle.
 * - **Verschachtelte Treffer.** Ein amber Knopf mit amber Text ist eine
 *   Amber-Fläche, nicht zwei — gezählt wird der äußerste Treffer.
 * - **Hover.** Vor jeder Zählung wird der Zeiger in die Ecke gefahren. Sonst
 *   zählte das Skript die Spur seiner eigenen Klicks mit: nach einem Klick auf
 *   den Play-Kreis steht der Zeiger darauf, und `.play:hover` ist amber. Beim
 *   ersten Lauf ergab das drei Falschmeldungen und ein falsches Positiv im
 *   Menü. Gezählt wird der ruhende Bildschirm — ein Zeiger steht ohnehin nur
 *   auf einer Stelle zugleich.
 *
 * Aufruf: `npm run verify:amber` (nach `npm run build`).
 *
 * Zwei Dinge, die nicht im Projekt liegen und deshalb konfigurierbar sind:
 *
 * - **playwright-core** ist ein Werkzeug, keine Projektabhängigkeit
 *   (CLAUDE.md 3: möglichst null neue). Es wird ad hoc installiert:
 *   `npm i --no-save playwright-core`.
 * - **Der Chromium-Pfad** steht in `CHROMIUM_PATH`. Ein fest verdrahteter Pfad
 *   war in früheren Runden genau die Fallgrube, an der ein committetes Skript
 *   scheitern würde — die Umgebung des nächsten Rechners sieht anders aus.
 *
 * Rückgabewert 1, sobald eine View mehr als ein Amber trägt oder eine
 * Ansicht nicht erreichbar war. Beides ist ein Fehlschlag: eine Regel, die
 * ungeprüft durchrutscht, ist so gut wie keine.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

/** Wo der Browser liegt. Der Container hat ihn hier; anderswo eben nicht. */
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Der Vorschau-Server, den das Skript selbst startet. */
const PORT = Number(process.env.AMBER_PORT ?? 4183);
const BASE_URL = `http://localhost:${PORT}`;

/** Der Schlüssel, unter dem die App ihren Fortschritt hält. */
const STORAGE_KEY = 'projekt-morse:progress';

const LETTERS = 'KMRSUA';
const KEYPAD_LETTERS = 'KMRSUAPTLOWIN'; // 13 -- ab hier zeigt die App das Tastenfeld

/**
 * Ein Fortschritt, wie ihn die App nach `parseProgress` erwartet.
 *
 * Bewusst hier zusammengesetzt und nicht aus der Engine importiert: das Skript
 * prüft die *ausgelieferte* App gegen einen Stand, wie ihn ein Browser
 * vorfindet. Ein gemeinsamer Baustein würde denselben Fehler auf beiden Seiten
 * machen.
 */
function progress({ characters = LETTERS, slow = [], sessions = 3 } = {}) {
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
    sessionsStarted: sessions,
    day: { date: '', attempts: 0, hits: 0, characters: [] },
    introSeen: true,
    introducedCharacters: active,
    variabilityNoticeSeen: true,
  };
}

/** Ein frischer Stand: die Einführung läuft. */
const FIRST_RUN = null;

// --- Die Ansichten ---------------------------------------------------------
//
// Je Eintrag: ein Name, der Stand im Speicher und der Weg dorthin. Der Weg ist
// bewusst über sichtbare Rollen und Beschriftungen geschrieben, nicht über
// interne Klassen -- was ein Mensch nicht anklicken kann, ist keine View.

const VIEWS = [
  {
    name: 'Intro, Schritt 1',
    seed: FIRST_RUN,
    async reach(page) {
      await page.waitForSelector('.intro-headline');
    },
  },
  {
    name: 'Intro, Schritt 2',
    seed: FIRST_RUN,
    async reach(page) {
      await page.getByRole('button', { name: 'Next' }).click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'Lernkarte, Ton gelaufen',
    seed: FIRST_RUN,
    async reach(page) {
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.waitForSelector('.learn-char');
      await page.waitForSelector('.pattern-row', { timeout: 20000 });
    },
  },
  {
    name: 'Echo-Check, Antwort offen',
    seed: FIRST_RUN,
    async reach(page) {
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.waitForSelector('.pattern-row', { timeout: 20000 });
      await page.getByRole('button', { name: 'Try it' }).click();
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await answering(page);
    },
  },
  {
    name: 'Echo-Check, Auflösung',
    seed: FIRST_RUN,
    async reach(page) {
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.waitForSelector('.pattern-row', { timeout: 20000 });
      await page.getByRole('button', { name: 'Try it' }).click();
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await answering(page);
      await page.locator('.answer').first().click();
      await page.waitForSelector('.reveal');
    },
  },
  {
    name: 'Training, bereit',
    seed: progress(),
    async reach(page) {
      await page.waitForSelector('.play');
    },
  },
  {
    name: 'Training, Ton läuft',
    seed: progress(),
    async reach(page) {
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await page.waitForSelector('.play[data-sounding="true"]', { timeout: 10000 });
    },
  },
  {
    name: 'Training, Antwort offen',
    seed: progress(),
    async reach(page) {
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await answering(page);
    },
  },
  {
    name: 'Training, Auflösung richtig',
    seed: progress(),
    async reach(page) {
      await answerPractice(page, { correct: true });
    },
  },
  {
    name: 'Training, Auflösung falsch',
    seed: progress(),
    async reach(page) {
      await answerPractice(page, { correct: false });
    },
  },
  {
    name: 'Tastenfeld, Antwort offen (U1)',
    seed: progress({ characters: KEYPAD_LETTERS }),
    async reach(page) {
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await answering(page);
      await page.waitForSelector('.keypad');
    },
  },
  {
    name: 'Tastenfeld, Auflösung falsch (U1)',
    seed: progress({ characters: KEYPAD_LETTERS }),
    async reach(page) {
      await answerPractice(page, { correct: false });
      await page.waitForSelector('.keypad');
    },
  },
  {
    name: 'Einladung zur Speed round',
    seed: progress({ slow: ['R'] }),
    async reach(page) {
      await page.waitForSelector('.drill-invite');
    },
  },
  {
    name: 'Speed round, Antwort offen',
    seed: progress({ slow: ['R'] }),
    async reach(page) {
      await page.getByRole('button', { name: /speed round/i }).click();
      await page.getByRole('button', { name: /^Play the character/ }).click();
      await answering(page);
    },
  },
  {
    name: 'Learn the sounds',
    seed: progress(),
    async reach(page) {
      await openMenu(page, 'Learn the sounds');
      await page.waitForSelector('.answers');
    },
  },
  {
    name: 'Menü offen',
    seed: progress(),
    async reach(page) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.waitForSelector('.menu');
    },
  },
  {
    name: 'Progress',
    seed: progress(),
    async reach(page) {
      await openMenu(page, 'Progress');
    },
  },
  {
    name: 'Account',
    seed: progress(),
    async reach(page) {
      await openMenu(page, 'Account');
    },
  },
  {
    name: 'Settings',
    seed: progress(),
    async reach(page) {
      await openMenu(page, 'Settings');
    },
  },
  {
    name: 'About',
    seed: progress(),
    async reach(page) {
      await openMenu(page, 'About');
    },
  },
];

/** Wartet, bis der Ton durch ist und die Frage steht. */
async function answering(page) {
  await page.waitForFunction(
    () => document.querySelector('.question')?.textContent?.includes('Which character'),
    null,
    { timeout: 20000 },
  );
}

/**
 * Spielt eine Runde und antwortet absichtlich richtig oder falsch.
 *
 * Welches Zeichen gesendet wurde, verrät die App vor der Antwort nicht -- und
 * das ist der Sinn der Übung. Das Skript rät deshalb, liest die Auflösung und
 * versucht es neu, bis der gewünschte Ausgang eingetreten ist.
 */
async function answerPractice(page, { correct }) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.getByRole('button', { name: /^Play the character/ }).click();
    await answering(page);
    await page.locator('.answer, .key').first().click();
    await page.waitForSelector('.reveal', { timeout: 10000 });

    const hit = (await page.locator('.verdict').getAttribute('data-kind')) === 'hit';
    if (hit === correct) return;

    const next = page.getByRole('button', { name: /Next character|Finish/ });
    if ((await next.count()) === 0) break;
    await next.click();
    await page.waitForTimeout(120);
  }
  throw new Error(`Auflösung "${correct ? 'richtig' : 'falsch'}" nicht erreicht`);
}

async function openMenu(page, label) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForSelector('.menu');
  await page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label })).first().click();
  await page.waitForTimeout(300);
}

// --- Die Zählung -----------------------------------------------------------

/**
 * Zählt die Amber-Flächen der gerade sichtbaren Seite.
 *
 * Läuft im Browser, weil nur er die berechneten Farben kennt. Die beiden
 * Amber-Werte kommen aus den Tokens auf `:root` -- sie stehen nicht doppelt im
 * Skript, sonst liefe eine Farbänderung an dieser Prüfung vorbei.
 */
function countAmber(page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.append(probe);

    const resolve = (token) => {
      probe.style.color = styles.getPropertyValue(token).trim();
      return getComputedStyle(probe).color;
    };
    const amber = new Set([resolve('--amber'), resolve('--amber-deep')]);
    probe.remove();

    const isAmber = (value) => amber.has(value);
    const visible = (element) => {
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (Number(style.opacity) === 0) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };

    const hits = [];
    for (const element of document.body.querySelectorAll('*')) {
      if (!visible(element)) continue;
      const style = getComputedStyle(element);

      // Fuellung, Text, Rahmen -- der Fokusring (outline) bleibt draussen.
      const where = [];
      if (isAmber(style.backgroundColor)) where.push('Fläche');
      if (isAmber(style.color)) where.push('Text');
      if (
        [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor]
          .some(isAmber) &&
        [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
          .some((width) => parseFloat(width) > 0)
      ) {
        where.push('Rahmen');
      }
      if (where.length === 0) continue;

      // Verschachtelte Treffer sind eine Flaeche, nicht zwei.
      if (hits.some((hit) => hit.element.contains(element))) continue;
      hits.push({ element, where });
    }

    return hits.map((hit) => ({
      selector:
        hit.element.tagName.toLowerCase() +
        (hit.element.className && typeof hit.element.className === 'string'
          ? `.${hit.element.className.trim().split(/\s+/).join('.')}`
          : ''),
      where: hit.where.join('+'),
      text: (hit.element.textContent ?? '').trim().slice(0, 28),
    }));
  });
}

// --- Ablauf ----------------------------------------------------------------

async function startPreview() {
  await access('dist').catch(() => {
    throw new Error('dist/ fehlt — bitte zuerst `npm run build`.');
  });

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return server;
    } catch {
      // noch nicht oben
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
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
    // Ohne diese Erlaubnis bleibt jeder Ton stumm, und die Ansichten hinter
    // einem abgespielten Zeichen waeren nicht erreichbar.
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
}

async function main() {
  const server = await startPreview();
  const browser = await openBrowser();
  const failures = [];
  const rows = [];

  try {
    for (const view of VIEWS) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', (error) => consoleErrors.push(String(error)));

      if (view.seed !== null) {
        await page.addInitScript(
          ([key, value]) => window.localStorage.setItem(key, value),
          [STORAGE_KEY, JSON.stringify(view.seed)],
        );
      }

      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await view.reach(page);

        // Den Zeiger aus dem Bild nehmen, bevor gezaehlt wird (siehe Kopf).
        await page.mouse.move(0, 0);
        await page.waitForTimeout(150);

        const hits = await countAmber(page);
        rows.push({ name: view.name, hits });
        if (hits.length > 1) {
          failures.push(
            `${view.name}: ${hits.length} Amber-Flächen — ` +
              hits.map((hit) => `${hit.selector} (${hit.where})`).join(', '),
          );
        }
        if (consoleErrors.length > 0) {
          failures.push(`${view.name}: Fehler auf der Seite — ${consoleErrors[0]}`);
        }
      } catch (error) {
        rows.push({ name: view.name, hits: null });
        failures.push(`${view.name}: nicht erreichbar — ${error.message.split('\n')[0]}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  const width = Math.max(...rows.map((row) => row.name.length));
  console.log(`${'Ansicht'.padEnd(width)}  Amber  Wo`);
  console.log('-'.repeat(width + 30));
  for (const row of rows) {
    const count = row.hits === null ? ' — ' : String(row.hits.length).padStart(2);
    const where =
      row.hits === null
        ? 'nicht erreichbar'
        : row.hits.map((hit) => `${hit.selector} (${hit.where})`).join(', ') || '—';
    console.log(`${row.name.padEnd(width)}  ${count}     ${where}`);
  }

  console.log('');
  if (failures.length > 0) {
    console.log('Verletzt (1.1 §4: Amber nie zweimal in einer View):');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Amber-Budget gehalten: ${rows.length} Ansichten, höchstens eine Fläche je View.`);
}

await main();
