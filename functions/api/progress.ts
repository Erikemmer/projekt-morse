/**
 * Die ganze Sync-API: GET und PUT auf /api/progress.
 *
 * Zwei Verben, ein Pfad, kein drittes. Der Server ist hier **kein Modell,
 * sondern ein Fach**: er speichert den Blob, den der Client schickt, und gibt
 * ihn zurueck. Er liest die Felder nicht, rechnet nichts und entscheidet
 * nichts. Die Merge-Semantik ist reine Client-Logik (`src/engine/sync.ts`) --
 * damit ist sie ohne Netz und ohne Datenbank testbar (CLAUDE.md 4), und ein
 * neues Feld im Lernstand braucht hier keine Zeile.
 *
 * **401 ist die Sitzungsauskunft.** Es gibt bewusst kein `/api/session`: die UI
 * fragt GET /api/progress und liest an 200 gegen 401 ab, ob sie angemeldet ist.
 * Ein Endpunkt weniger, der eine Sitzung pruefen kann.
 */

import type { Env } from '../_lib/env';
import { fail, json, readJson } from '../_lib/http';
import { readUserId } from '../_lib/sessions';

/**
 * Ein Lernstand sind ein paar Dutzend Zahlen; gemessen liegt er unter 4 KiB.
 * 64 KiB ist Luft fuer Jahre -- und die Grenze, ab der ein Konto anfinge, ein
 * Dateispeicher zu sein.
 */
const MAX_BODY_BYTES = 64 * 1024;

interface ProgressRow {
  blob: string;
  updated_at: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await readUserId(request, env, Date.now());
  if (userId === null) return fail(401, 'no session');

  const row = await env.DB.prepare('SELECT blob, updated_at FROM progress WHERE user_id = ?')
    .bind(userId)
    .first<ProgressRow>();

  /*
   * Ein Konto ohne Stand ist der Normalfall direkt nach dem Anlegen. Es
   * antwortet mit `null` und `updatedAt: 0` statt mit 404: "es gibt dich, du
   * hast nur noch nichts gespeichert" ist eine andere Aussage als "gibt's
   * nicht", und der Merge kennt 0 schon als "aelter als alles" (sync.ts).
   */
  if (row === null) return json({ blob: null, updatedAt: 0 });

  // Der Blob geht als geparstes JSON hinaus, nicht als String im String. Was
  // hier nicht parsen wuerde, koennte nur der eigene PUT geschrieben haben --
  // dann ist `null` die ehrliche Antwort, kein 500.
  let blob: unknown = null;
  try {
    blob = JSON.parse(row.blob);
  } catch {
    blob = null;
  }

  return json({ blob, updatedAt: row.updated_at });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const now = Date.now();
  const userId = await readUserId(request, env, now);
  if (userId === null) return fail(401, 'no session');

  const body = await readJson(request, MAX_BODY_BYTES);
  if (typeof body !== 'object' || body === null) return fail(400, 'malformed body');

  const { blob, updatedAt } = body as { blob?: unknown; updatedAt?: unknown };
  if (typeof blob !== 'object' || blob === null) return fail(400, 'missing blob');

  /*
   * `updatedAt` kommt vom Client, weil der Merge auf der Uhr des Geraets
   * vergleicht (Vorgabe). Eine kaputte oder in der Zukunft stehende Uhr wuerde
   * den Stand aber dauerhaft festnageln -- jeder andere Stand waere fuer immer
   * "aelter". Deshalb: unplausible Werte werden durch die Serverzeit ersetzt,
   * nicht abgewiesen. 60 Sekunden Toleranz decken normalen Uhrenversatz ab.
   */
  const claimed = typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : 0;
  const stamp = claimed > 0 && claimed <= now + 60_000 ? Math.floor(claimed) : now;

  await env.DB.prepare(
    `INSERT INTO progress (user_id, blob, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at`,
  )
    .bind(userId, JSON.stringify(blob), stamp)
    .run();

  // Der gespeicherte Zeitstempel geht zurueck: der Client merkt sich *den*,
  // nicht seinen eigenen -- sonst waeren die beiden Uhren auseinander, sobald
  // die Korrektur oben gegriffen hat.
  return json({ updatedAt: stamp });
};
