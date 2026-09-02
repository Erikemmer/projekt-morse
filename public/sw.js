/*
 * Service Worker: macht die App offline nutzbar (PWA, Konzeptentscheidung).
 *
 * Bewusst von Hand geschrieben statt ueber Workbox & Co. -- er ist klein
 * genug, um ihn ganz zu verstehen, und das Repo bleibt ohne neue
 * Abhaengigkeit. Die Luecke, die ein Plugin sonst fuellt, schliesst der
 * Build selbst: vite.config.ts traegt beim Bauen die gehashten Asset-Pfade
 * und eine Versionsnummer in die zwei Marker unten ein. Ohne diese
 * Vorab-Liste laege der erste Seitenaufbau nie im Cache, denn er passiert,
 * bevor der Worker die Seite kontrolliert -- offline bliebe dann ein
 * leeres Geruest.
 *
 * Strategie:
 * - Navigation (das HTML): Netz zuerst, Cache als Rueckfall. So kommt ein
 *   Deploy sofort an, und offline traegt der letzte bekannte Stand.
 * - /assets/ (von Vite gehasht, also unveraenderlich): Cache zuerst. Ein
 *   neuer Build referenziert neue Dateinamen, alte Eintraege veralten nie
 *   inhaltlich -- sie werden nur beim Versionswechsel aufgeraeumt.
 * - Rest gleicher Herkunft (Icons, Manifest): Cache zuerst, im Hintergrund
 *   auffrischen (stale-while-revalidate).
 * - **Der Learn-Bereich** (/learn/, /de/lernen/): stale-while-revalidate wie
 *   der Rest, aber ausdruecklich *nicht* im Vorab-Cache (CONCEPT-LEARN §3).
 *   Zwei Gruende, und der zweite ist der wichtigere: die redaktionellen Seiten
 *   sind nicht Teil der Offline-App, und ihr HTML ist **nicht die App-Shell**.
 *   Die Navigationsbehandlung legt jede Seite unter '/' ab -- eine Learn-Seite
 *   dort hiesse, dass die App offline als Artikel startet.
 *
 * Fremde Herkuenfte fasst er nicht an -- es gibt keine (CLAUDE.md 2.5).
 *
 * Alle Cache-Treffer laufen mit ignoreVary: gecacht wird ausschliesslich
 * gleiche Herkunft, und der Schluessel ist der Pfad. Ohne das verfehlt ein
 * Modul-Skript (CORS-Modus, sendet Origin) einen Eintrag, den der Install
 * ohne Origin-Header geholt hat, sobald der Server 'Vary: Origin' setzt --
 * genau so gefunden mit dem Vite-Preview-Server.
 *
 * VERSION bei Aenderungen an dieser Datei hochzaehlen: activate raeumt dann
 * alle Caches der alten Versionen weg.
 */

// Beide Marker ersetzt der Build (vite.config.ts). Unersetztes laesst den
// Worker weiter funktionieren -- nur ohne Vorab-Cache, wie im Dev-Server.
const VERSION = self.__BUILD_VERSION || 'dev';
const BUILD_ASSETS = self.__BUILD_ASSETS || [];

const CACHE = `projekt-morse-${VERSION}`;

/** Siehe Kopfkommentar: Vary ignorieren, der Pfad ist hier der Schluessel. */
const MATCH_OPTIONS = { ignoreVary: true };

/** Was schon beim Installieren hineingehoert: die Startseite, ihr Rahmen, ihre Assets.
 * Der Learn-Bereich gehoert bewusst nicht dazu (siehe Kopfkommentar). */
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', ...BUILD_ASSETS];

/** Die zwei Wurzeln des Learn-Bereichs (CONCEPT-LEARN §2). */
const LEARN_PREFIXES = ['/learn/', '/de/lernen/'];

function isLearnPath(pathname) {
  return LEARN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('projekt-morse-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
   * /api/ fasst der Worker gar nicht an. Diese Antworten haengen an einer
   * Sitzung -- eine davon im Cache waere ein fremder Lernstand, den der
   * naechste Aufruf ausliefert. Offline schlagen die Aufrufe damit fehl, und
   * genau so ist es gedacht: der Client rechnet damit und uebt weiter (der
   * Account ist ein Sync-Ziel, keine Voraussetzung).
   */
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    /*
     * Learn-Seiten sind eigene Dokumente und nicht die App-Shell -- sie
     * duerfen deshalb nicht durch networkFirstNavigation laufen, die alles
     * unter '/' ablegt. Sie nehmen denselben Weg wie die uebrigen statischen
     * Dateien: aus dem Cache, wenn es einen Eintrag gibt, sonst aus dem Netz,
     * und im Hintergrund auffrischen (CONCEPT-LEARN §3).
     */
    event.respondWith(
      isLearnPath(url.pathname) ? staleWhileRevalidate(request) : networkFirstNavigation(request),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    // Jede Navigation, die hier ankommt, ist dieselbe App-Shell (der
    // Learn-Bereich nimmt oben schon einen anderen Weg); gecacht wird sie
    // deshalb unter '/'.
    if (response.ok) cache.put('/', response.clone());
    return response;
  } catch {
    const cached = await cache.match('/', MATCH_OPTIONS);
    if (cached) return cached;
    throw new Error('offline und noch nie geladen');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, MATCH_OPTIONS);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached ?? (await refresh) ?? Response.error();
}
