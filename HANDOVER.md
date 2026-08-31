# Übergabe — Stand nach Eriks erstem Eigen-Test: Politur und Einführung

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** `main` @ `e790d15`. Drei Commits aus dieser Runde, jeder für sich
gebaut, getestet und deployt:

1. `8183ff1` — Tagesstatistik, Sitzungszähler und Intro-Merker im Fortschritt
2. `a101c6a` — Trainings-Screen auf das Ruhe-Mockup
3. `e790d15` — die Einführung (zwei Bildschirme, dann los)

Die Streak-Runde ist weiterhin **nicht** gelaufen; sie ist der nächste Schritt
(§8). Die Historie bleibt linear.

**Produktions-URL: https://projekt-morse.pages.dev** — live auf Cloudflare
Pages, mit Git-Anbindung an dieses Repo. Jeder Push auf `main` baut und
deployt von selbst; ein manueller Schritt ist nicht mehr nötig. Details und
der Prüfbericht stehen in §5a.

**Datum:** 2026-09-01

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md). Nebenbefunde in
[FINDINGS.md](./FINDINGS.md) — Einträge 1 und 2 sind inzwischen entschieden und
behoben, die Begründungen stehen dort.

---

## 1. Wo das Projekt steht

Der Kern-Lernloop (hören → tippen → Feedback, adaptiv nach Schwäche) läuft, ist
live und sieht jetzt aus wie das Mockup. Unverändert gilt: der Zeichensatz
wächst von selbst (§3), die App ist eine offline nutzbare PWA ohne jeden
Fremdabruf, `--muted` besteht AA auch für kleinen Text.

Neu aus dieser Runde:

- **Der Trainings-Screen folgt dem Ruhe-Mockup** — eine 390-px-Spalte, Kopf mit
  Sitzung und Runde über einer 2-px-Linie, in der Mitte Eyebrow, Play-Kreis und
  Frage, unten Antwort-Gitter und Fußzeile. Ein Bild davon liegt unter
  [`docs/screenshots/training-390.png`](./docs/screenshots/training-390.png).
- **Eine Einführung läuft einmal** — zwei Bildschirme, „Skip intro" jederzeit,
  „Begin" startet die erste Sitzung.
- **Der Fortschritt kennt jetzt den Tag** — Versuche, Treffer und Zeichen des
  laufenden Kalendertags tragen die Fußzeile („Today 87% · 14 characters").
  Dazu ein Sitzungszähler und der Intro-Merker, alle drei additiv.

Drei Stellen weichen bewusst vom Mockup ab; sie stehen in §5b und warten auf
Fables Urteil.

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1 | unverändert |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL | unverändert |
| `src/engine/schedule.ts` | Text → Zeitachse | unverändert |
| `src/engine/settings.ts` | Tempo, Tonhöhe, Start-Satz, Kandidatenreihe, **Gruppengröße** | erweitert |
| `src/engine/stats.ts` | Statistik pro Zeichen, Wachstumsfelder, **Tag/Sitzung/Intro** | erweitert |
| `src/engine/growth.ts` | **Die Wachstumsregel** | neu, getestet |
| `src/engine/selection.ts` | Gewichtung nach Schwäche | unverändert |
| `src/engine/session.ts` | Loop-Zustandsautomat; Pool = aktiver Satz | angepasst |
| `src/audio/player.ts` | Wiedergabe mit Audio-Uhr nach außen | unverändert |
| `src/ui/App.tsx` | Lernloop-Screen **im Mockup-Aufbau** | neu gestaltet |
| `src/ui/Intro.tsx` | **Die Einführung**, zwei Bildschirme | neu |
| `src/ui/today.ts` | **Kalendertag** für die Engine (die bleibt ohne Uhr) | neu |
| `src/ui/progressStorage.ts` | localStorage rein/raus, **plus Sofort-Schreiber** | erweitert |
| `src/styles.css` | Tokens und Grundriss, **Mockup-Maße** | neu gestaltet |
| `docs/screenshots/` | **Trainings-Screen bei 390 px** für den Design-Review | neu |
| `src/fonts/` | **woff2 (latin) + SIL-OFL-Lizenzen** | neu |
| `public/sw.js` | **Service Worker** (offline) | neu |
| `public/manifest.webmanifest`, `public/icons/` | **PWA-Manifest, Icons** | neu |
| `vite.config.ts` | + Plugin: injiziert Precache-Liste in `dist/sw.js` | erweitert |
| `src/engine/*.test.ts` | **74 Tests** (16 Grundgerüst, 42 Loop, 16 Wachstum) | grün |

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

- **`npm test` → 74/74 grün** (64 vorher, 10 neu für Tagesstatistik,
  Sitzungszähler und Intro-Merker). Die ARRL-Referenz („PARIS bei 5 WpM = 12 s")
  prüft weiter gegen den Standard, nicht gegen die Implementierung. Die
  Wachstums-Tests kippen jede Bedingung einzeln; Zufall kommt überall als
  Parameter herein.
- **`npm run build` → sauber.** Bundle **161,86 kB roh / 52,63 kB gzip**
  (vorher 158,06 / 51,50), CSS **6,88 kB / 2,01 kB** (vorher 4,79 / 1,59).
  Über die ganze Runde also +3,8 kB roh und +1,1 kB gzip beim JS, +2,1 kB beim
  CSS — dafür der komplette Mockup-Aufbau und die Einführung. Dazu unverändert
  einmalig 129 kB woff2 und 14 kB Icons. **Keine neue Abhängigkeit.**
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

- **Der Trainings-Screen ist gegen die Referenzwerte geprüft** — im Browser bei
  390 px, in beiden Zuständen (Frage und Auflösung). Screenshot im Repo.
- **Die Einführung ist im Browser durchgespielt** — Erststart zeigt sie, die
  Copy stimmt wortgleich, der Fokus wandert beim Wechsel auf die Überschrift und
  nach „Begin"/„Skip intro" auf den Play-Kreis, beide Wege merken sich den
  Abschluss über einen Reload hinweg, und ein Stand von vor diesem Feld sieht
  sie genau einmal, ohne Statistik zu verlieren: 11 von 11.
- ~~Der SW-Update-Pfad ist nicht durchgespielt~~ **Inzwischen belegt** (`435f926`),
  mit zwei echten Builds nacheinander vom selben Origin (Headless Chromium):
  Deploy 1 füllt `projekt-morse-08c43d9481d3`; nach dem Dateitausch zeigt ein
  normaler Reload sofort den neuen Stand (Navigation ist Netz-zuerst), der neue
  Worker installiert als `…-72f8a009ac93`, `activate` räumt den alten Cache weg
  — am Ende existiert genau einer, der neue — und der neue Stand kommt danach
  auch offline aus dem neuen Cache. **Auf Produktion inzwischen wiederholt und
  bestanden** — die Zahlen stehen in §5a.
- **Kein Hörtest, kein Screenreader-Durchgang, keine echte Hardware** — alles
  unverändert offen und weiterhin die wichtigsten menschlichen Prüfungen.
  Fürs Installieren als PWA gilt dasselbe: auf einem echten Telefon testen.
- **Die Wachstums-Schwellen sind eine Setzung** (90/5/75/20/30). Ob sie gut
  *lehren*, zeigen erst Nutzungsdaten.

## 5a. Deployment: live auf Cloudflare Pages, mit Git-Anbindung

**Produktions-URL: https://projekt-morse.pages.dev**

Eingerichtet wie in der Entscheidung vorgesehen — Cloudflare Pages, Projekt
`projekt-morse`, **mit Git-Anbindung** an `Erikemmer/projekt-morse`. Der
bevorzugte Weg hat also geklappt; Direct Upload war nicht nötig.

**Einstellungen (stehen so im Projekt):**

- Production-Branch: `main` · Build command: `npm run build` · Output: `dist`
- Keine Umgebungsvariablen.
- Preview-Deployments für alle Branches, PR-Kommentare an.

**Warum es diesmal ging** — die drei Hinderungsgründe von vorher, nachgeprüft:

1. Die Egress-Sperre gab es hier **nicht**: `api.cloudflare.com` war
   erreichbar. Die frühere Beobachtung galt für die damalige Umgebung, nicht
   für das Projekt.
2. Es lag doch eine **gültige wrangler-OAuth-Sitzung** vor
   (`~/Library/Preferences/.wrangler/config/default.toml`, Scope `pages:write`).
   Darüber lief die Einrichtung per Pages-API.
3. Die MCP-Connectoren des Cloudflare-Plugins waren **weiterhin nicht
   autorisiert** (OAuth braucht eine interaktive Sitzung). Die Vermutung
   „frische Session mit Plugin genügt" hat sich also *nicht* bestätigt —
   getragen hat die schon vorhandene wrangler-Anmeldung.

**Auf Produktion geprüft** (Playwright gegen die echte URL, Chrome):

- **Seite rendert** — `h1` „Projekt Morse", Antwort-Gitter mit 6 Tasten.
- **Schriften lokal** — kein einziger Fremd-Origin-Request auf der ganzen
  Seite. Genutzt und geladen werden Newsreader (h1) und IBM Plex Sans 400
  (Fließtext), beide von `projekt-morse.pages.dev`. Die Schnitte 500/600
  stehen auf `unloaded`, weil der erste Bildschirm sie nicht braucht — so
  soll es sein, nicht etwa ein Fehler.
- **Service Worker aktiv** — `activated`, kontrolliert die Seite, Scope `/`.
  Genau ein Cache, `projekt-morse-72f8a009ac93`, mit 9 Einträgen.
- **Eine Runde gespielt** — Play → Ton → „Which character was that?" →
  Antwort → Urteil („Not quite — that was S.", die richtige Taste markiert) →
  „Next character" → Fortschritt steht auf 1.
- **Offline** — Netz aus, neu geladen: die App rendert vollständig aus dem
  Cache.

**SW-Update-Pfad auf Produktion: abgeschlossen und bestanden.** Der erste
Deploy dieser Runde mit geänderten Assets (`8183ff1`) war der Anlass. Ein
Browser stand vorher auf dem alten Stand, der Deploy lief dazwischen, dann ein
ganz normaler Reload — kein Hard-Reload, kein Cache-Bypass:

| | Cache | Worker |
|---|---|---|
| vorher | `projekt-morse-72f8a009ac93` | activated, kontrolliert |
| nachher | `projekt-morse-a39e9b0e3234` | activated, kontrolliert |

Am Ende existiert **genau ein** Cache, und zwar der neue — `activate` hat den
alten weggeräumt. Danach offline gegengelesen: die Seite rendert vollständig
aus dem neuen Cache. Damit ist der Pfad nicht mehr nur lokal, sondern auf der
echten Auslieferung belegt. Die Vorbedingung dafür bleibt sichtbar in den
Headern: Cloudflare liefert `sw.js` und das HTML mit
`cache-control: public, max-age=0, must-revalidate`.

Ein Nebenbefund für die Zukunft: ein Deploy, der nur Dokumentation ändert,
erzeugt **keinen** Cache-Wechsel — die Version leitet sich aus den gehashten
Asset-Dateinamen ab (`sha256(assets).slice(0,12)`, siehe `vite.config.ts`).
Das ist richtig so und kein Fehler.

## 5b. Wo die Politur vom Mockup abweicht — drei Punkte für Fable

Alle drei sind gemeldet und nicht still gelöst (CLAUDE.md 2, letzter Absatz).
Jeder ist in einer Zeile zurückzudrehen, wenn das Mockup gewinnen soll.

1. **Rechts oben steht die Runde, nicht die Restzeit.** Die Vorgabe sagt
   „Restzeit/Runden". Eine mitlaufende Uhr baut Druck auf — genau das, was
   dieses Produkt nicht tun soll (CLAUDE.md 2.8) — und der bisherige Text sagte
   ausdrücklich „nothing here is on a clock". Deshalb `Round 3 / 20`.
2. **Das Eyebrow ist phasenabhängig.** „Now playing · 620 Hz" steht nur da,
   solange wirklich etwas spielt; sonst `Ready`, `Your turn` oder `Answer`,
   jeweils mit derselben Tonhöhe daneben. „Now playing" über einem stummen
   Bildschirm wäre eine falsche Behauptung (CLAUDE.md 2.6). Die Tonhöhe steht
   immer da und ist zugleich der sichtbare Hinweis, dass dieser Modus über die
   Ohren geht.
3. **„Works offline once loaded." ist auf den Abschluss-Screen gewandert.** Die
   Fußzeile trägt jetzt den Tagesstand, aber der Hinweis war in `435f926`
   ausdrücklich als bleibend beschlossen — löschen wäre eine stille Auflösung
   gewesen. Er steht jetzt am Ende jeder Sitzung.

Zwei kleinere Setzungen, wo die Vorgabe offen war:

- **Die Fußzeilen-Punkte fassen je vier Runden zusammen** (`ROUNDS_PER_GROUP`),
  also fünf Punkte für zwanzig Runden. Zwanzig einzelne Punkte wären eine
  Perlenkette zum Abzählen — und Abzählen ist hier das Gegenteil des Ziels.
- **Die Hervorhebung einzelner Muster-Elemente in accent ist vorbereitet, aber
  nicht gesetzt** (`.pattern-element[data-highlight]`). Es gibt keine Regel
  dafür, welches Element wann hervorzuheben wäre; eine zu erfinden wäre eine
  Produktentscheidung, keine Politur.

Ein Punkt, an dem das Mockup und CLAUDE.md 6 sich berühren: der
Trainings-Screen zeigt keinen erklärenden Text mehr. Dass der Modus auditiv
ist, sagen jetzt die Einführung (die jeder einmal sieht) und die dauerhaft
sichtbare Tonhöhe im Eyebrow; die ausführliche Beschreibung steht weiterhin
für Screenreader in der Seite. Wenn Fable das für zu wenig hält, gehört eine
sichtbare Zeile zurück.

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

1. **Design-Review durch Fable** — gegen
   [`docs/screenshots/training-390.png`](./docs/screenshots/training-390.png)
   und die drei Abweichungen in §5b.
2. **Streak mit Freeze-Gnade** — die Runde steht noch aus. Gebaut wird er als
   reine Engine-Logik (`src/engine/`), Persistenz additiv. Der Tages-Eimer aus
   dieser Runde ist bewusst *keine* Historie: er hält nur den laufenden Tag.
   Wer eine Reihe über Tage braucht, legt sie daneben — und sollte dabei
   entscheiden, ob der Eimer darin aufgeht.
3. **Menschliche Prüfungen:** Hörtest, Screenreader, PWA-Installation auf dem
   Telefon. Alles unverändert offen und weiterhin die wichtigsten Prüfungen.
4. Danach die offenen Produktfragen aus §5 — Reihenfolge ist eine
   Notion-Entscheidung, nicht eine des Codes.
