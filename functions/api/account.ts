/**
 * DELETE /api/account -- das Konto und alles daran loeschen.
 *
 * Das ist die Auskunfts- und Loeschpflicht aus Art. 17 DSGVO, und sie ist hier
 * billig zu erfuellen, weil so wenig gespeichert wird: eine Zeile in `users`,
 * die Passkeys, die Sitzungen, der Lernstand. Mehr gibt es nicht -- kein
 * Zugriffsprotokoll, keine IP, keine E-Mail (siehe migrations/0001).
 *
 * **Geloescht wird ausdruecklich, nicht ueber `ON DELETE CASCADE` allein.** Die
 * Fremdschluessel sind deklariert, aber ob D1 sie erzwingt, haengt an
 * Einstellungen, die niemand in dieser Datei sieht. Eine Loeschpflicht darf
 * nicht an einem Pragma haengen; vier explizite DELETEs in einem `batch` sind
 * ein Satz, den man lesen kann.
 *
 * **Der lokale Lernstand bleibt.** Das Konto war ein Sync-Ziel, nicht der Ort
 * der Daten (Local-first). Wer sein Konto loescht, uebt weiter -- nur ohne
 * Abgleich. Die UI sagt das im Bestaetigungsschritt ausdruecklich, damit
 * niemand "Loeschen" fuer "meinen Fortschritt wegwerfen" liest.
 */

import type { Env } from '../_lib/env';
import { fail, json } from '../_lib/http';
import { deleteAllSessionsStatement, endSession, readUserId } from '../_lib/sessions';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await readUserId(request, env, Date.now());
  if (userId === null) return fail(401, 'no session');

  await env.DB.batch([
    env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM credentials WHERE user_id = ?').bind(userId),
    deleteAllSessionsStatement(env, userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);

  // Die eigene Sitzung ist im batch schon weg; das hier raeumt nur noch den
  // Cookie im Browser ab, damit kein totes Cookie zurueckbleibt.
  const headers = await endSession(request, env);
  return json(null, 204, headers);
};
