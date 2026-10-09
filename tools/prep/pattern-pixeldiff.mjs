/**
 * Messung für B2-Pixeldiff (FINDINGS #5, Runde P22): was kostet die Markierung
 * der Morse-Muster (`aria-hidden` + `.visually-hidden`) im Bild -- und was
 * brächte es, die Fließtext-Stellen nicht zu markieren?
 *
 * **Eine Messung, kein Check** -- nicht Teil von `npm run build`. Aufruf nach
 * `npm run build`: `node tools/prep/pattern-pixeldiff.mjs` (`playwright-core`
 * per `npm i --no-save`, Chromium über `CHROMIUM_PATH`). Ändert `dist/` nicht.
 *
 * Drei Varianten derselben vier Seiten (EN/DE, Alphabet/Geschichte), Server und
 * Browser-Start dupliziert, nicht extrahiert (D11):
 *   A  wie ausgeliefert (alle 44 Stellen je Sprache markiert)
 *   B  Fließtext-Stellen (3 je Sprache) bloß, Tabellen markiert
 *   C  alle bloß -- der Stand vor B2
 * Verglichen wird Pixel für Pixel (Canvas im Browser, volle Seite, dpr 1) bei
 * 390×844 und 1440×900. Erwartung: B–C = 0 (Tabellen kosten nichts).
 */
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES = [
  ['EN alphabet', 'learn/morse-code-alphabet'],
  ['EN history', 'learn/history-of-morse-code'],
  ['DE alphabet', 'de/lernen/morsealphabet'],
  ['DE history', 'de/lernen/geschichte-des-morsecodes'],
];
const VIEWPORTS = [[390, 844], [1440, 900]];
const MIME = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', woff2: 'font/woff2' };
const MARKED = /<span class="morse-pattern"[^>]*>([^<]*)<\/span><span class="visually-hidden">[^<]*<\/span>/g;

async function variant(root, keep) {
  const dir = await mkdtemp(join(tmpdir(), 'pixeldiff-'));
  await cp(root, dir, { recursive: true });
  let bare = 0;
  for (const [, path] of PAGES) {
    const file = join(dir, path, 'index.html');
    const html = await readFile(file, 'utf8');
    const out = html.replace(MARKED, (all, shown, at) => {
      const before = html.slice(0, at);
      const inCell = before.lastIndexOf('<td') > before.lastIndexOf('</td') || before.lastIndexOf('<th') > before.lastIndexOf('</th');
      if (keep(inCell)) return all;
      bare += 1;
      return shown;
    });
    await writeFile(file, out);
  }
  return { dir, bare };
}

function serve(dir) {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(dir, path));
      res.writeHead(200, { 'content-type': MIME[path.split('.').pop()] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const variants = {
  A: await variant('dist', () => true),
  B: await variant('dist', (inCell) => inCell),
  C: await variant('dist', () => false),
};
const servers = {};
for (const [name, v] of Object.entries(variants)) servers[name] = await serve(v.dir);
const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
try {
  const shots = {};
  for (const [name, server] of Object.entries(servers)) {
    for (const [width, height] of VIEWPORTS) {
      for (const [label, path] of PAGES) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await page.goto(`http://localhost:${server.address().port}/${path}/`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        shots[`${name}|${label}|${width}`] = (await page.screenshot({ fullPage: true })).toString('base64');
        await context.close();
      }
    }
  }
  const page = await browser.newPage();
  console.log(`bloß gemacht: B ${variants.B.bare}, C ${variants.C.bare} Stellen (4 Seiten)\n`);
  for (const [x, y] of [['A', 'C'], ['B', 'C'], ['A', 'B']]) {
    for (const [width] of VIEWPORTS) {
      for (const [label] of PAGES) {
        const key = `|${label}|${width}`;
        const r = await page.evaluate(async ([a, b]) => {
          const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
          const [ia, ib] = await Promise.all([load(a), load(b)]);
          const W = Math.max(ia.width, ib.width), H = Math.max(ia.height, ib.height);
          const px = (i) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#f0f'; g.fillRect(0, 0, W, H); g.drawImage(i, 0, 0); return g.getImageData(0, 0, W, H).data; };
          const da = px(ia), db = px(ib);
          let n = 0, max = 0, lo = 1e9, hi = -1; const rows = new Set();
          for (let p = 0; p < W * H; p += 1) {
            const o = p * 4;
            const d = Math.max(Math.abs(da[o] - db[o]), Math.abs(da[o + 1] - db[o + 1]), Math.abs(da[o + 2] - db[o + 2]));
            if (d > 0) { n += 1; max = Math.max(max, d); const row = (p / W) | 0; rows.add(row); lo = Math.min(lo, row); hi = Math.max(hi, row); }
          }
          return { n, max, rows: rows.size, lo, hi, hA: ia.height, hB: ib.height, total: W * H };
        }, [shots[x + key], shots[y + key]]);
        console.log(`${x}–${y}  ${label.padEnd(11)} ${String(width).padStart(4)}  Pixel ${String(r.n).padStart(5)}  max ${String(r.max).padStart(2)}/255  Zeilen ${String(r.rows).padStart(2)}  y ${r.n ? `${r.lo}..${r.hi}` : '-'}  Höhe ${r.hA}/${r.hB}  (${((r.n / r.total) * 100).toFixed(4)} %)`);
      }
    }
  }
} finally {
  await browser.close();
  for (const s of Object.values(servers)) s.close();
  for (const v of Object.values(variants)) await rm(v.dir, { recursive: true, force: true });
}
