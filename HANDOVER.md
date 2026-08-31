# Übergabe — Stand nach SW-Update-Nachweis; Deployment wartet auf Zugang

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** `main` @ `c7d7cc4` (Review 2 bestanden und gemergt: muted-Entscheidung,
Wachstumsregel, PWA). Darauf aufbauend Branch
`claude/morse-handover-alignment-nbkk6o` mit zwei weiteren Commits — zu reviewen
und dann nach `main` zu mergen:

1. `435f926` — Fußzeile „Works offline once loaded." + Beleg des SW-Update-Pfads
2. (dieser Doku-Commit)

**Produktions-URL: noch keine.** Die Hosting-Entscheidung ist Cloudflare Pages
(Notion-Log); warum das Deployment aus dieser Session nicht ging, steht in §5a —
inklusive der fertigen Einstellungen für den, der es einrichtet.

**Datum:** 2026-08-31

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md). Nebenbefunde in
[FINDINGS.md](./FINDINGS.md) — Einträge 1 und 2 sind inzwischen entschieden und
behoben, die Begründungen stehen dort.

---

## 1. Wo das Projekt steht

Der Kern-Lernloop (hören → tippen → Feedback, adaptiv nach Schwäche) läuft und ist
auf `main`. Auf dem Branch dazu neu:

- **Der Zeichensatz wächst jetzt von selbst** nach einer festen, getesteten Regel
  (§3). Start bleibt K M R S U A; als Nächstes käme P.
- **Die App ist eine PWA:** installierbar, vollständig offline nutzbar, ohne
  jeden Fremdabruf. Die Schriften liegen als woff2 im Repo.
- `--muted` besteht jetzt AA auch für kleinen Text (5,1:1 auf paper).

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1 | unverändert |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL | unverändert |
| `src/engine/schedule.ts` | Text → Zeitachse | unverändert |
| `src/engine/settings.ts` | Tempo, Tonhöhe, Start-Satz, **Kandidatenreihe** | erweitert |
| `src/engine/stats.ts` | Statistik pro Zeichen, **plus Wachstumsfelder** | erweitert |
| `src/engine/growth.ts` | **Die Wachstumsregel** | neu, getestet |
| `src/engine/selection.ts` | Gewichtung nach Schwäche | unverändert |
| `src/engine/session.ts` | Loop-Zustandsautomat; Pool = aktiver Satz | angepasst |
| `src/audio/player.ts` | Wiedergabe mit Audio-Uhr nach außen | unverändert |
| `src/ui/App.tsx` | Lernloop-Screen, plus Ankündigung neuer Zeichen | angepasst |
| `src/ui/progressStorage.ts` | localStorage rein/raus | unverändert |
| `src/fonts/` | **woff2 (latin) + SIL-OFL-Lizenzen** | neu |
| `public/sw.js` | **Service Worker** (offline) | neu |
| `public/manifest.webmanifest`, `public/icons/` | **PWA-Manifest, Icons** | neu |
| `vite.config.ts` | + Plugin: injiziert Precache-Liste in `dist/sw.js` | erweitert |
| `src/engine/*.test.ts` | **64 Tests** (16 Grundgerüst, 32 Loop, 16 Wachstum) | grün |

Richtung unverändert: `src/engine/` DOM-frei, Player kennt die Engine, die Engine
kennt niemanden, die UI rechnet nicht.

## 3. Die Entscheidungen, die den Rest erklären

### Timing über die Audio-Uhr; Reaktionszeiten auf derselben Uhr

Unverändert (siehe §3 der vorigen Übergabe, im Git-Verlauf): Töne werden auf
`AudioContext.currentTime` geplant, `setInterval` weckt nur den Planer,
Reaktionszeiten kommen aus `player.currentTime` — nie `Date.now()`. Farnsworth
nach ARRL (Bloom, QEX 4/1990); bei `effectiveWpm == characterWpm` fällt alles auf
1/3/1/3/7 zurück, ein Test hält das fest. **Nicht aufweichen.**

### Die Wachstumsregel (`engine/growth.ts`)

Ein neues Zeichen kommt dazu, wenn **alle drei** gelten:

- **(a)** rollierende Trefferquote über die letzten 30 Antworten ≥ 90 %
  — das Fenster muss *voll* sein, 9 von 10 sind kein Beleg;
- **(b)** jedes aktive Zeichen hat ≥ 5 Versuche
  — ein kaum gefragtes Zeichen rutscht nicht als „gekonnt" durch;
- **(c)** kein aktives Zeichen liegt unter 75 % Trefferquote
  — der Durchschnitt darf kein einzelnes Problemzeichen verdecken.

Nach einer Einführung ist die nächste für 20 Antworten gesperrt (das neue Zeichen
soll erst ankommen). Alle Schwellen sind benannte Konstanten. Kandidaten kommen
aus `CHARACTER_ORDER` (settings.ts): beginnt mit K M R S U A, danach Koch-übliche
Folge, 26 Buchstaben + 10 Ziffern, Satzzeichen bewusst noch nicht. Die Reihe ist
eine Setzung, kein Standard — eine adaptive Auswahl darf sie ablösen, sobald
Daten da sind.

Die Prüfung läuft in `session.submitAnswer` *nach* dem Verbuchen (die Antwort
zählt mit). Der geübte Pool ist seit `cf35c5f` der aktive Satz aus dem
Fortschritt — `createSession` hat keinen `pool`-Parameter mehr, eine Quelle statt
zwei. Ein neues Zeichen steht ab der nächsten Runde in Pool und Ziehung
(ungehört = höchstes Gewicht) und wird im Feedback mit einer Zeile angekündigt.

### Persistenz wächst additiv

`Progress` hat drei neue Felder: `activeCharacters` (Default: Start-Satz),
`recentAnswers` (rollierendes Fenster, auf 30 gedeckelt), `answersSinceGrowth`.
`parseProgress` füllt alte Stände mit Defaults auf; ein kaputter aktiver Satz
fällt auf den Start-Satz zurück, ohne die Zeichen-Statistik zu verwerfen. Tests
halten beides fest. **So weitermachen** (CLAUDE.md §4): neue Felder additiv mit
Default, keine Migrationsmaschinerie.

### Der Service Worker ist von Hand geschrieben — und warum das trägt

Kein Workbox, keine neue Laufzeit-Abhängigkeit; `public/sw.js` ist klein genug,
um ihn ganz zu lesen. Strategie: Navigation Netz-zuerst (Deploy kommt sofort an,
offline trägt der letzte Stand), gehashte `/assets/` Cache-zuerst (unveränderlich),
Rest stale-while-revalidate. Zwei Dinge muss man wissen:

- **Der Build injiziert die Precache-Liste.** Ein Plugin in `vite.config.ts`
  trägt die gehashten Asset-Pfade und eine daraus abgeleitete Version in
  `dist/sw.js` ein (Marker `self.__BUILD_ASSETS` / `self.__BUILD_VERSION`).
  Ohne die Liste läge der erste Seitenaufbau nie im Cache — er passiert, bevor
  der Worker die Seite kontrolliert — und offline bliebe ein leeres Gerüst.
  Genau so im ersten Offline-Test aufgetreten.
- **Cache-Treffer laufen mit `ignoreVary`.** Der Vite-Preview-Server setzt
  `Vary: Origin`; ein Modul-Skript (CORS-Modus, sendet `Origin`) verfehlte damit
  den Eintrag, den der Install ohne den Header geholt hatte. Auch das ist im
  Test real passiert, nicht theoretisch. Gecacht wird nur gleiche Herkunft, der
  Pfad ist der Schlüssel — `Vary` zu ignorieren ist hier korrekt.

Der Worker wird nur im Produktionsbuild registriert (`main.tsx`): im Dev-Server
würde er Assets cachen, die es dort nicht gibt, und HMR durchkreuzen.

### Schriften im Repo

Newsreader (Variable, wght-Achse) und IBM Plex Sans (400/500/600) als woff2 in
`src/fonts/`, latin-Subset, SIL-OFL-Lizenzen daneben, `@font-face` in
`styles.css`. Kein Google-Fonts-Link mehr, kein Fremdabruf — FINDINGS.md §2 ist
damit erledigt. Kommt später Deutsch (i18n-Entscheidung), braucht es zusätzlich
das latin-ext-Subset.

## 4. Was nachgewiesen ist (und wie)

- **`npm test` → 64/64 grün.** Die ARRL-Referenz („PARIS bei 5 WpM = 12 s")
  prüft weiter gegen den Standard, nicht gegen die Implementierung. Die
  Wachstums-Tests kippen jede Bedingung einzeln; Zufall kommt überall als
  Parameter herein.
- **`npm run build` → sauber.** Bundle **158,04 kB roh / 51,50 kB gzip**
  (Loop-Stand: 156,39 / 50,93), CSS 4,79 kB / 1,59 kB. Dazu einmalig 129 kB
  woff2 (vier Dateien, gehasht, dauerhaft cachebar) und 14 kB Icons. Neue
  devDependency: `@types/node` (nur Typen, fürs Precache-Plugin).
- **Wachstum im Browser durchgespielt:** Stand präpariert, dem genau eine
  richtige Antwort fehlt → Ankündigung erscheint („The set grows: P joins from
  the next round."), Gitter wächst auf 7, `activeCharacters` enthält P,
  Sperre auf 0, alles überlebt den Reload.
- **Offline im Browser durchgespielt** (Headless Chromium gegen `vite preview`):
  Worker kontrolliert die Seite; offline neu geladen rendert die App
  vollständig, Schriften kommen aus dem Cache, eine komplette Runde läuft
  offline durch (Audio braucht kein Netz), der Fortschritt wird gespeichert.
- **Timing-Budget:** unverändert gültig gemessen am Loop-Stand (52 Töne, keiner
  in der Vergangenheit geplant, Quantisierung 0,023 ms bei 44,1 kHz, Budget
  < 1 ms). Diese Session hat am Player nichts geändert.

Nicht nachgewiesen, ehrlich benannt:

- ~~Der SW-Update-Pfad ist nicht durchgespielt~~ **Inzwischen belegt** (`435f926`),
  mit zwei echten Builds nacheinander vom selben Origin (Headless Chromium):
  Deploy 1 füllt `projekt-morse-08c43d9481d3`; nach dem Dateitausch zeigt ein
  normaler Reload sofort den neuen Stand (Navigation ist Netz-zuerst), der neue
  Worker installiert als `…-72f8a009ac93`, `activate` räumt den alten Cache weg
  — am Ende existiert genau einer, der neue — und der neue Stand kommt danach
  auch offline aus dem neuen Cache. Auf der Produktions-URL einmal wiederholen,
  sobald es eine gibt.
- **Kein Hörtest, kein Screenreader-Durchgang, keine echte Hardware** — alles
  unverändert offen und weiterhin die wichtigsten menschlichen Prüfungen.
  Fürs Installieren als PWA gilt dasselbe: auf einem echten Telefon testen.
- **Die Wachstums-Schwellen sind eine Setzung** (90/5/75/20/30). Ob sie gut
  *lehren*, zeigen erst Nutzungsdaten.

## 5a. Deployment: entschieden, aber aus dieser Session nicht ausführbar

**Entschieden (Notion-Log): Cloudflare Pages**, Projektname `projekt-morse`,
bevorzugt mit Git-Anbindung, damit jeder Push auf `main` automatisch deployt.

**Warum es hier nicht ging** — dreifach geprüft, nicht umgangen (der Nutzer hat
ausdrücklich „nichts dafür hacken" verfügt, und CLAUDE.md verlangt Melden statt
still Lösen):

1. Die **Egress-Policy dieser Umgebung lehnt jeden Cloudflare-Host ab**
   (CONNECT 403 vom Proxy): `api.cloudflare.com`, `sparrow.cloudflare.com`,
   `*.pages.dev`, sogar `developers.cloudflare.com`. Damit fallen wrangler
   *und* Direct Upload aus — und auch das Verifizieren einer Produktions-URL.
2. **Kein Token, keine wrangler-Auth** in der Umgebung.
3. Der Nutzer hat inzwischen ein **Cloudflare-Plugin** installiert
   (Connectoren `cloudflare-api`, `-bindings`, `-builds`, `-docs`,
   `-observability`, „verbindet sich in Sitzung"). Diese Session lief da
   schon; die MCP-Server hängen sich nur beim Sitzungsstart an. In dieser
   Session sind sie nachweislich nicht verfügbar (ToolSearch/ListPlugins leer).
   MCP-Verkehr läuft über den Anthropic-MCP-Proxy an der Egress-Policy vorbei —
   **eine frische Session mit dem Plugin sollte deployen können.**

**Für den, der es einrichtet** (Dashboard-Git-Anbindung, der bevorzugte Weg —
oder die nächste Session per MCP):

- Repo: `Erikemmer/projekt-morse`, Production-Branch: `main`
- Build command: `npm run build` · Output directory: `dist`
- Keine Umgebungsvariablen nötig. Framework-Preset „None" oder „Vite" — beides
  ok, entscheidend sind Command und Output.
- Danach: Produktions-URL hier in der Übergabe eintragen und den
  SW-Update-Pfad einmal auf Produktion wiederholen (§4).

## 5. Entscheidungen: gefallen und offen

**Gefallen und umgesetzt:** Zeichen-für-Zeichen, retrieval-only, EN-first,
Design „Ruhe" (inkl. `--muted`-Korrektur), Wachstumsregel wie oben, PWA mit
selbst gehosteten Schriften.

**Beschlossen, aber nicht gebaut:** **Streak mit Freeze-Gnade** (CLAUDE.md §2.8).
Die Persistenz ist dafür vorbereitet (additive Felder mit Defaults).

**Offen, bewusst nicht angefasst:**

- Kein Einstellungsdialog (Tempo, Tonhöhe, Rundenzahl fest in `settings.ts`).
- HVPT vorbereitet, nicht umgesetzt (Konstanten benannt, nichts streut).
- Nur Einzelzeichen; Fünfergruppen und Klartext fehlen.
- Kein Dark Mode (Rollen stehen, kein `prefers-color-scheme`-Block; beim
  Scharfschalten Kontrast prüfen).
- Satzzeichen fehlen in `CHARACTER_ORDER` — bewusst, Entscheidung bei Bedarf.

## 6. Umgebung und Werkzeuge

```bash
npm install
npm run dev        # Vite-Entwicklungsserver (ohne Service Worker)
npm test           # Vitest, 64 Tests
npm run build      # tsc --noEmit && vite build (injiziert SW-Precache)
npm run preview    # dist ausliefern -- hier laesst sich die PWA testen
```

- Node v22.22.2, npm 10.9.7. React 18, Vite 6, TypeScript 5.7 (`strict`),
  Vitest 3 (**muss ≥ 3 bleiben**, sonst kollidieren zwei Vite-Typenbäume).
- `defineConfig` kommt aus `vitest/config`; dieselbe Datei enthält jetzt auch
  das Precache-Plugin — wer `sw.js` anfasst, liest beide Kopfkommentare.
- **Browser-Durchläufe** (nicht committet, bewusst ad hoc): `npm i --no-save
  playwright-core`, Chromium unter
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Start mit
  `--autoplay-policy=no-user-gesture-required`. **Achtung:** jedes weitere
  `npm install` räumt `--no-save`-Pakete wieder weg — vor jedem Durchlauf neu
  installieren. Skripte müssen im Projektordner liegen (Modulauflösung), nicht
  in /tmp.
- Google Fonts ist in dieser Container-Umgebung ohnehin blockiert — seit dem
  Selbsthosten egal, davor der Grund, warum Screenshots Georgia zeigten.

## 7. Fallgruben

- **Der Container ist flüchtig — früh pushen.** Diese Session: vier Commits,
  jeder sofort gepusht.
- **`create_repository` schlägt in dieser Umgebung fehl** (403). Zweites Repo:
  den Nutzer anlegen lassen.
- **Fokus geht verloren, wo man ihn nicht vermutet** — nach jedem Umbau des
  Loops `document.activeElement` je Phase prüfen (zwei solcher Fehler waren im
  Code unsichtbar und fielen nur im Browser-Durchlauf auf).
- **Service Worker + Vary-Header** (§3): wer die Cache-Strategie ändert, behält
  `ignoreVary` bei oder weiß genau, warum nicht.
- **Ein Test, der offline prüfen will, muss die Seite *nach* der
  Worker-Übernahme neu laden** und vorher auf `controllerchange` warten — sonst
  testet er den Netzwerk-Pfad und merkt es nicht.

## 8. Nächster Schritt

1. **Deployment auf Cloudflare Pages** — aus einer frischen Session mit dem
   Cloudflare-Plugin (per MCP) oder vom Nutzer im Dashboard; Einstellungen in
   §5a. Danach Produktions-URL hier eintragen.
2. **Review dieses Branches** (Fable) und Merge nach `main`.
3. **Menschliche Prüfungen:** Hörtest, Screenreader, PWA-Installation auf dem
   Telefon (braucht die Produktions-URL), SW-Update-Pfad einmal auf Produktion.
4. **Streak mit Freeze-Gnade** — beschlossen, gebaut wird er als reine
   Engine-Logik (`src/engine/`), Persistenz additiv.
5. Danach die offenen Produktfragen aus §5 — Reihenfolge ist eine
   Notion-Entscheidung, nicht eine des Codes.
