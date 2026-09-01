/**
 * Sitzungen: HttpOnly-Cookie aussen, Zeile in D1 innen.
 *
 * Vier Festlegungen, die zusammen den ganzen Entwurf tragen:
 *
 * 1. **Kein Token im localStorage.** Der Cookie ist `HttpOnly`, `Secure`,
 *    `SameSite=Lax`, `Path=/`. Kein Skript der Seite kann ihn lesen, also kann
 *    ihn auch kein eingeschleustes Skript ausleiten.
 * 2. **Der Cookie ist ein opaker Zufallswert, kein JWT.** 32 Byte aus
 *    `crypto.getRandomValues`. Er bedeutet nichts; alles, was er bedeutet,
 *    steht in der Zeile. Damit ist ein Logout ein `DELETE` und wirkt sofort --
 *    ein selbstbeschreibendes Token kann man nicht zurueckrufen.
 * 3. **Gespeichert wird der SHA-256 des Werts, nicht der Wert.** Wer die
 *    Datenbank liest (Backup, Support-Dump, Leck), haelt damit keine gueltige
 *    Sitzung in der Haenden. Die Kosten: ein Hash pro Anfrage.
 * 4. **Die Sitzungs-ID wechselt bei jeder Anmeldung.** Der Flow-Datensatz, der
 *    die Challenge trug, wird geloescht und ein frischer angelegt (Schutz gegen
 *    Session Fixation). Deshalb gibt es hier `promoteToUser` und kein UPDATE.
 *
 * `SameSite=Lax` und nicht `Strict`: die App ist eine Single-Page-App auf
 * derselben Herkunft, alle API-Aufrufe sind `fetch` von dieser Seite. Lax
 * deckt das ab und laesst gleichzeitig den Fall zu, dass jemand die App aus
 * einem Lesezeichen oder einem Link heraus oeffnet und sofort angemeldet ist.
 * Schreibende Aufrufe sind alle POST/PUT/DELETE, die Lax ohnehin nicht
 * fremdausloest.
 */

import type { Env } from './env';

/** Der angemeldete Zustand. Lebensdauer bewusst lang: ein Trainer ist Alltag. */
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;
/** Ein laufender WebAuthn-Flow. Der Dialog dauert Sekunden, nicht Minuten. */
const FLOW_TTL_SECONDS = 5 * 60;

const COOKIE_NAME = 'ml_session';

export type ChallengeKind = 'register' | 'login';

/** Eine Zeile aus `sessions`, so wie die Handler sie brauchen. */
export interface SessionRow {
  readonly id: string;
  readonly user_id: string | null;
  readonly challenge: string | null;
  readonly challenge_kind: string | null;
  readonly new_user_id: string | null;
  readonly expires_at: number;
}

/** Zufall in base64url -- fuer Sitzungswerte und IDs. */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function base64url(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/*
 * Der Rueckgabetyp ist `Uint8Array<ArrayBuffer>` und nicht das kuerzere
 * `Uint8Array`: SimpleWebAuthn verlangt genau diesen Typ (nicht
 * `ArrayBufferLike`, das auch SharedArrayBuffer einschliesst), und ohne die
 * Angabe faellt die Inferenz auf den weiteren Typ zurueck.
 */
export function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** UTF-8-Bytes eines Strings, im Typ, den SimpleWebAuthn erwartet (siehe oben). */
export function utf8Bytes(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(new TextEncoder().encode(text));
}

/** Der Schluessel in der Datenbank: SHA-256 des Cookie-Werts (siehe Kopf, 3.). */
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return base64url(new Uint8Array(digest));
}

function cookieHeader(value: string, maxAgeSeconds: number): Headers {
  const headers = new Headers();
  headers.append(
    'set-cookie',
    `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`,
  );
  return headers;
}

/**
 * Der Cookie-Wert aus der Anfrage.
 *
 * Von Hand geparst, weil es genau ein Cookie gibt, das uns interessiert -- und
 * die App keine anderen setzt (CLAUDE.md 2.5: keine Cookies ausser diesem
 * einen, und der ist funktional notwendig, nicht Tracking).
 */
function cookieValue(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (header === null) return null;

  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return null;
}

/**
 * Legt einen Flow-Datensatz an: die Challenge, die wir gerade ausgeben.
 *
 * Gibt den `Set-Cookie`-Header mit zurueck; der Handler haengt ihn an seine
 * Antwort. Ein bereits vorhandener Cookie wird dabei ueberschrieben -- wer
 * mitten in einer Sitzung "Create a passkey" drueckt, verliert sie also. Das
 * ist richtig: der Flow endet ohnehin in einer neuen Sitzung.
 */
export async function startFlow(
  env: Env,
  kind: ChallengeKind,
  challenge: string,
  newUserId: string | null,
  now: number,
): Promise<Headers> {
  const token = randomToken();
  const id = await hashToken(token);

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, challenge, challenge_kind, new_user_id, created_at, expires_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
  )
    .bind(id, challenge, kind, newUserId, now, now + FLOW_TTL_SECONDS * 1000)
    .run();

  return cookieHeader(token, FLOW_TTL_SECONDS);
}

/**
 * Der laufende Flow -- oder `null`.
 *
 * Abgelaufene Zeilen zaehlen als nicht vorhanden **und** werden gleich
 * weggeraeumt: so braucht diese Tabelle keinen Cron. Aufgeraeumt wird immer
 * nur die eigene Zeile; ein globales Aufraeumen auf dem Anfragepfad waere ein
 * Vollscan bei jedem Login.
 */
export async function readFlow(
  request: Request,
  env: Env,
  kind: ChallengeKind,
  now: number,
): Promise<SessionRow | null> {
  const row = await readRow(request, env);
  if (row === null) return null;

  if (row.expires_at <= now || row.user_id !== null || row.challenge_kind !== kind) {
    if (row.expires_at <= now) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(row.id).run();
    return null;
  }
  return row;
}

/** Die angemeldete Nutzer-ID -- oder `null`, wenn keine gueltige Sitzung anliegt. */
export async function readUserId(request: Request, env: Env, now: number): Promise<string | null> {
  const row = await readRow(request, env);
  if (row === null) return null;

  if (row.expires_at <= now) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(row.id).run();
    return null;
  }
  return row.user_id;
}

async function readRow(request: Request, env: Env): Promise<SessionRow | null> {
  const token = cookieValue(request);
  if (token === null || token === '') return null;

  const id = await hashToken(token);
  return await env.DB.prepare(
    `SELECT id, user_id, challenge, challenge_kind, new_user_id, expires_at
     FROM sessions WHERE id = ?`,
  )
    .bind(id)
    .first<SessionRow>();
}

/**
 * Aus dem Flow wird eine angemeldete Sitzung: alte Zeile weg, frische ID.
 *
 * Die ID wechselt bewusst (Kopf, 4.). Beide Schritte in einem `batch`, damit
 * kein Zustand entsteht, in dem die Challenge noch gilt und die Sitzung schon.
 */
export async function promoteToUser(
  env: Env,
  flowId: string,
  userId: string,
  now: number,
): Promise<Headers> {
  const token = randomToken();
  const id = await hashToken(token);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(flowId),
    env.DB
      .prepare(
        `INSERT INTO sessions (id, user_id, challenge, challenge_kind, new_user_id, created_at, expires_at)
         VALUES (?, ?, NULL, NULL, NULL, ?, ?)`,
      )
      .bind(id, userId, now, now + SESSION_TTL_SECONDS * 1000),
  ]);

  return cookieHeader(token, SESSION_TTL_SECONDS);
}

/**
 * Beendet die Sitzung dieser Anfrage: Zeile weg, Cookie sofort abgelaufen.
 *
 * Beide Teile sind noetig. Nur die Zeile zu loeschen liesse einen totes Cookie
 * im Browser (harmlos, aber unsauber); nur den Cookie zu loeschen liesse eine
 * gueltige Sitzung in der Datenbank stehen (nicht harmlos).
 */
export async function endSession(request: Request, env: Env): Promise<Headers> {
  const token = cookieValue(request);
  if (token !== null && token !== '') {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await hashToken(token)).run();
  }
  return cookieHeader('', 0);
}

/** Alle Sitzungen eines Kontos -- fuer das Loeschen des Kontos. */
export function deleteAllSessionsStatement(env: Env, userId: string) {
  return env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId);
}
