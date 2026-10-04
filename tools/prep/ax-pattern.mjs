/**
 * Messung für B2 (FINDINGS #5, Entscheidung D2): was liefert der
 * Accessibility-Tree für die Morse-Muster, heute und unter den drei Optionen?
 *
 * **Eine Messung, kein Check** — nicht Teil von `npm run build`. Aufruf nach
 * `npm run build`: `node tools/prep/ax-pattern.mjs` (`playwright-core` per
 * `npm i --no-save`, Chromium über `CHROMIUM_PATH`). Vorschau-Server und
 * Browser-Start sind dupliziert, nicht extrahiert (D11).
 *
 * **Grenze.** Chromiums Accessibility-Tree (CDP `Accessibility.getFullAXTree`)
 * ist das, was ein Screenreader *bekommt*, nicht das, was er *spricht*. Ob
 * `·` als „Mittelpunkt" vorgelesen, durch die Einstellung „Satzzeichen: keine"
 * geschluckt oder anders ausgesprochen wird, entscheidet der Screenreader
 * (VoiceOver, NVDA, TalkBack) — das ist H3 und von hier aus nicht messbar.
 * Gemessen wird nur, ob der Text im Baum steht und ob er sichtbar/versteckt ist.
 *
 * Die drei Optionen werden **am DOM simuliert**, nicht im Generator gebaut:
 * (1) `aria-label` je Muster-Span mit `role="img"`, (2) sichtbarer Text
 * „dit dah" statt der Zeichen, (3) Zeichen `aria-hidden` + verstecktes Span.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.PREP_PORT ?? 4186);
const BASE_URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Der Text, den der Baum unter einem Knoten (per DOM-Selektor) liefert. */
async function axTextOf(page, session, selector, index = 0) {
  const { root } = await session.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await session.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector,
  });
  const nodeId = nodeIds[index];
  const { nodes } = await session.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: false,
  });
  // Teilbaum ab dem Knoten: alle Nachfahren einsammeln.
  const { nodes: all } = await session.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: true,
  });
  const self = nodes[0];
  const byId = new Map(all.map((node) => [node.nodeId, node]));
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (node.ignored) {
      for (const id of node.childIds ?? []) walk(byId.get(id));
      return;
    }
    const role = node.role?.value;
    const name = node.name?.value;
    if (role === 'StaticText' || role === 'img') out.push(`${role}:"${name ?? ''}"`);
    for (const id of node.childIds ?? []) walk(byId.get(id));
  };
  walk(self);
  return { role: self.role?.value, name: self.name?.value ?? '', parts: out };
}

const server = await startPreview();
let browser;
try {
  const { chromium } = await import('playwright-core');
  await access(CHROMIUM_PATH);
  browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });

  for (const path of ['/learn/morse-code-alphabet/', '/de/lernen/morsealphabet/']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto(BASE_URL + path);
    const session = await context.newCDPSession(page);
    await session.send('Accessibility.enable');
    await session.send('DOM.enable');

    const cells = await page.$$eval('td', (tds) =>
      tds.map((td) => td.textContent.trim()).filter((t) => /[·−]/.test(t)),
    );
    const total = cells.length;
    const patternCells = cells.filter((t) => /^\S+\s+[·−]+$/.test(t)).length;
    const bareCells = await page.$$eval(
      'td',
      (tds) => tds.filter((td) => /^[·−]+$/.test(td.textContent.trim())).length,
    );
    const inProse = await page.$$eval(
      'p, li',
      (ps) => ps.filter((p) => /[·−]{2,}/.test(p.textContent)).length,
    );
    const hidden = await page.$$eval('td .visually-hidden, td [aria-hidden]', (n) => n.length);
    const hasClass = await page.evaluate(() =>
      [...document.styleSheets].some((s) => {
        try {
          return [...s.cssRules].some((r) => r.selectorText === '.visually-hidden');
        } catch {
          return false;
        }
      }),
    );
    console.log(`\n== ${path}`);
    console.log(`Zellen mit Muster: ${total} (Form "X ·−": ${patternCells}; reine Code-Zellen der Satzzeichen-Tabelle: ${bareCells}); Absätze/Listenpunkte mit Muster im Fließtext: ${inProse}; schon versteckter Text in Zellen: ${hidden}; .visually-hidden im Seiten-CSS: ${hasClass}`);

    // Welche Zelle ist die erste mit Muster?
    const idx = await page.$$eval('td', (tds) =>
      tds.findIndex((td) => /^\S+\s+[·−]+$/.test(td.textContent.trim())),
    );
    const before = await axTextOf(page, session, 'td', idx);
    console.log(`heute      : Zelle "${cells[0]}" -> ${before.role} name="${before.name}" teile=${before.parts.join(' ')}`);

    // Option 1: aria-label am Muster (role=img)
    await page.evaluate((i) => {
      const td = document.querySelectorAll('td')[i];
      const m = td.textContent.trim().match(/^(\S+)\s+([·−]+)$/);
      const map = { '·': 'dit', '−': 'dah' };
      const spelled = [...m[2]].map((c) => map[c]).join(' ');
      td.innerHTML = `<strong>${m[1]}</strong> <span role="img" aria-label="${spelled}">${m[2]}</span>`;
    }, idx);
    const o1 = await axTextOf(page, session, 'td', idx);
    console.log(`Option 1   : aria-label + role=img -> name="${o1.name}" teile=${o1.parts.join(' ')}`);

    // Option 2: sichtbarer Text "dit dah"
    await page.evaluate((i) => {
      const td = document.querySelectorAll('td')[i];
      td.innerHTML = '<strong>A</strong> dit dah';
    }, idx);
    const o2 = await axTextOf(page, session, 'td', idx);
    console.log(`Option 2   : sichtbarer Text -> name="${o2.name}" teile=${o2.parts.join(' ')}`);

    // Option 3: Zeichen aria-hidden + verstecktes Span
    await page.evaluate((i) => {
      const td = document.querySelectorAll('td')[i];
      td.innerHTML =
        '<strong>A</strong> <span aria-hidden="true">·−</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">dit dah</span>';
    }, idx);
    const o3 = await axTextOf(page, session, 'td', idx);
    console.log(`Option 3   : aria-hidden + verstecktes Span -> name="${o3.name}" teile=${o3.parts.join(' ')}`);
    await context.close();
  }

  // Die App: das Muster der Lernkarte
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    // Hörbar nicht nötig, aber das Muster erscheint erst nach dem ersten Anhören.
  });
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.waitForSelector('.pattern-row', { timeout: 20000 });
  const session = await context.newCDPSession(page);
  await session.send('Accessibility.enable');
  await session.send('DOM.enable');
  const { nodes } = await session.send('Accessibility.getFullAXTree');
  const spoken = nodes
    .filter((node) => node.role?.value === 'StaticText' && /dit|dah/.test(node.name?.value ?? ''))
    .map((node) => `"${node.name.value}"`);
  const row = await page.$eval('.pattern-row', (el) => el.getAttribute('aria-hidden'));
  console.log(`\n== App, Lernkarte (Pattern.tsx)\nStaticText mit dit/dah im Baum: ${spoken.join(', ')}; .pattern-row aria-hidden=${row}`);
  await context.close();
} finally {
  await browser?.close();
  server.kill();
}
