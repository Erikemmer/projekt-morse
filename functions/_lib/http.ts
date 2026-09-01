/**
 * Antworten und Eingabepruefung -- die immer gleichen zwei Zeilen an einem Ort.
 *
 * **Jede Antwort dieser API traegt `Cache-Control: no-store`.** Sie haengen an
 * einer Sitzung; ein Zwischenspeicher, der eine davon ausliefert, liefert
 * fremde Lerndaten aus. Der Service Worker laesst `/api/` deshalb zusaetzlich
 * ganz in Ruhe (public/sw.js) -- zwei Riegel, weil einer davon irgendwann
 * jemand anfasst.
 */

/** JSON mit no-store. `null` als Rumpf heisst 204. */
export function json(body: unknown, status = 200, extraHeaders?: Headers): Response {
  const headers = new Headers(extraHeaders);
  headers.set('cache-control', 'no-store');

  if (body === null) return new Response(null, { status: 204, headers });

  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Ein Fehler in derselben Form wie alles andere.
 *
 * Der Text ist fuer Entwickler, nicht fuer die UI: welche Zeile ein Nutzer
 * sieht, entscheidet der Client (src/ui/account.ts) -- er kennt den Ton
 * (1.1 §11) und die Sprache (EN-first). Bewusst kein Detail darueber, *warum*
 * eine Anmeldung scheiterte: das waere ein Orakel fuer Fremde.
 */
export function fail(status: number, reason: string): Response {
  return json({ error: reason }, status);
}

/**
 * Liest einen JSON-Rumpf, ohne bei Muell zu werfen.
 *
 * Eine kaputte Anfrage ist ein 400, kein 500. Die Groessenbremse ist Absicht:
 * ein Lernstand sind ein paar Dutzend Zahlen, und ein Konto ist kein
 * Dateispeicher.
 */
export async function readJson(request: Request, maxBytes: number): Promise<unknown | undefined> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return undefined;

  const text = await request.text();
  // Auch ohne (oder mit gelogenem) content-length: hier steht die echte Groesse.
  if (new TextEncoder().encode(text).length > maxBytes) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
