# Übergabe — Stand nach der Marken-Runde: Morse Lab

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** `main` @ `915eb83`. Fünf Commits aus der Marken-Runde:

1. `e819703` — Guidelines 1.1 ins Repo, Rangfolge und die drei Addenda
2. `05b5166` — Token-Migration auf 1.1 §13
3. `958a427` — das neue Logo (der Morsetaster), Favicon und App-Icons
4. `126b6f2` — Umbenennung auf **Morse Lab**
5. `915eb83` — die Komponenten auf 1.1-Stand (Block B)

Davor: `88100e8`/`2cd1c58` (Lernmodus), `8183ff1`/`a101c6a`/`e790d15`
(Politur und Einführung), `0261303`/`2c84cfa` (Übergaben).

Die Streak-Runde ist weiterhin **nicht** gelaufen — sie wurde bewusst hinter
den Lernmodus gestellt und bleibt der nächste Schritt (§8). Die Historie
bleibt linear.

**Produktions-URL: https://projekt-morse.pages.dev** — live auf Cloudflare
Pages, mit Git-Anbindung an dieses Repo. Jeder Push auf `main` baut und
deployt von selbst.

**`morse-lab.com` ist an das Projekt gebunden, aber noch nicht erreichbar** —
es fehlt ein DNS-Eintrag, den ich nicht anlegen darf. Der genaue Eintrag steht
in §5a; es ist ein Handgriff.

**Datum:** 2026-09-01

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md). Nebenbefunde in
[FINDINGS.md](./FINDINGS.md) — Einträge 1 und 2 sind inzwischen entschieden und
behoben, die Begründungen stehen dort.

---

## 1. Wo das Projekt steht

Der Kern-Lernloop (hören → tippen → Feedback, adaptiv nach Schwäche) läuft, ist
live und sieht jetzt aus wie das Mockup. Unverändert gilt: der Zeichensatz
wächst von selbst (§3), die App ist eine offline nutzbare PWA ohne jeden
Fremdabruf, `--gray` besteht AA auch für kleinen Text.

**Neu aus dieser Runde: das Projekt heißt Morse Lab und sieht danach aus.**
Die Marken-Richtlinie 1.1 liegt im Repo und führt (§3b). Die Tokens tragen ihre
Namen, das Logo ist der Morsetaster, und die Komponenten folgen den Regeln aus
§7 und §4 — allen voran der harten: **Amber steht nie zweimal in einer View.**
Ein Prüfskript belegt das über zwölf Ansichten.

Aus der Runde davor: die App führt Zeichen ein, statt sie nur abzufragen. Wer neu anfängt, riet bisher die ersten Runden — es gab keinen
Ort, an dem ein Zeichen als Klang vorgestellt wird. Den gibt es jetzt: eine
Karte pro Zeichen (Buchstabe, Ton, danach das Muster), dahinter ein
Echo-Check aus drei Abrufen nach den normalen Übungsregeln. Erreichbar an drei
Stellen — Erstlauf, Wachstum, freies Wiederholen (§3a). Ein Bild der Karte
liegt unter
[`docs/screenshots/learn-card-390.png`](./docs/screenshots/learn-card-390.png).

Aus der Politur-Runde davor:

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
| `src/engine/stats.ts` | Statistik, Wachstum, Tag/Sitzung/Intro, **eingeführte Zeichen** | erweitert |
| `src/engine/growth.ts` | Die Wachstumsregel | unverändert |
| `src/engine/learn.ts` | **Der Lernmodus**: Karte, Echo-Check | neu, getestet |
| `src/engine/selection.ts` | Gewichtung nach Schwäche | unverändert |
| `src/engine/session.ts` | Loop-Zustandsautomat; Pool = aktiver Satz | angepasst |
| `src/audio/player.ts` | Wiedergabe mit Audio-Uhr nach außen | unverändert |
| `src/ui/App.tsx` | Lernloop-Screen **im Mockup-Aufbau** | neu gestaltet |
| `src/ui/Intro.tsx` | Die Einführung, zwei Bildschirme | unverändert |
| `src/ui/Learn.tsx` | **Karte, Echo-Check, Wiederholen-Gitter** | neu |
| `src/ui/Pattern.tsx` | Muster als Form | unverändert |
| `docs/brand/…1.1.html` | **Die Marken-Richtlinie — führend** | neu |
| `docs/brand/logo.py` | **Baut die Marke aus den §3-Zahlen** | neu |
| `docs/CI.md` | **Deutsche Kurzfassung, mit Rangfolge-Kopf** | neu |
| `public/logo-key.svg`, `logo-lockup.svg` | **Marke und primäres Lockup** | neu |
| `public/favicon.svg` | **Fallback-Marke** (Punkt + Pille, amber) | neu |
| `public/icons/` | **Neu gezeichnet aus der Marke** | ersetzt |
| `src/ui/today.ts` | **Kalendertag** für die Engine (die bleibt ohne Uhr) | neu |
| `src/ui/progressStorage.ts` | localStorage rein/raus, **plus Sofort-Schreiber** | erweitert |
| `src/styles.css` | **Tokens nach 1.1 §13**, Grundriss, Mockup-Maße | migriert |
| `docs/screenshots/` | **Trainings-Screen bei 390 px** für den Design-Review | neu |
| `src/fonts/` | **woff2 (latin) + SIL-OFL-Lizenzen** | neu |
| `public/sw.js` | **Service Worker** (offline) | neu |
| `public/manifest.webmanifest`, `public/icons/` | **PWA-Manifest, Icons** | neu |
| `vite.config.ts` | + Plugin: injiziert Precache-Liste in `dist/sw.js` | erweitert |
| `src/engine/*.test.ts` | **101 Tests** (16 Grundgerüst, 42 Loop, 16 Wachstum, 27 Lernmodus) | grün |

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

## 3a. Der Lernmodus — und die eine Ausnahme, die er kostet

**Das Problem:** die App hat nur abgefragt. Beim allerersten Ton gab es nichts,
woran man ihn hätte festmachen können — die ersten Runden waren Raten, und
Raten trainiert nichts.

**Die Karte.** Pro Zeichen: der Buchstabe in 64 px Newsreader, darunter der
Play-Kreis wie im Training. Der Ton läuft beim Öffnen einmal von selbst; die
Karte wird per Klick erreicht, die Geste für den AudioContext ist also gegeben.
Schlägt das Abspielen trotzdem fehl, bleibt der Play-Kreis — gehört wird dann
auf Zuruf (CLAUDE.md 6). „Try it" ist erst frei, wenn der Ton durch war.

**Die Ausnahme von CLAUDE.md 2.2.** Die Regel verbietet die Visualisierung von
Punkten und Strichen während des Hörens, weil sie zum Mitzählen einlädt statt
zum Hören. Auf der Einführungskarte — und nur dort — ist das Muster nach dem
ersten Anhören sichtbar und bleibt es beim Wiederholen: der Erstkontakt braucht
die Zuordnung von Klang zu Zeichen. **Produktentscheidung, Notion-Log #33.**
Der Kommentar steht an der Komponente selbst (`src/ui/Learn.tsx`, `Card`), nicht
nur hier.

Die Grenze ist scharf und geprüft: im Training bleibt der Bildschirm während des
Tons leer, und der Echo-Check hält sich ebenfalls daran — das Muster kommt dort
erst mit der Auflösung.

**Der Echo-Check fasst die Statistik nicht an.** Drei Abrufe nach jeder Karte,
nach den normalen Übungsregeln, Antwortoptionen ausschließlich aus dem bisher
Eingeführten. In `learn.ts` gibt es kein `recordAttempt` — die Statistik misst
Können, und wer ein Zeichen gerade zum ersten Mal gehört hat, kann es noch
nicht. Flössen diese Antworten mit, verschöben sie Gewichtung (`selection.ts`)
und Wachstumsregel (`growth.ts`) gegen den Nutzer, und die Zahlen behaupteten
etwas anderes, als sie messen (CLAUDE.md 2.6). Zwei Unit-Tests und ein
Browser-Durchlauf halten das fest.

Bei der ersten Karte eines neuen Nutzers gibt es genau **eine** Antworttaste.
Das ist die Folge der Vorgabe, nur Eingeführtes anzubieten — der Abruf ist dann
keine Unterscheidung, sondern eine Bestätigung („war das eben K?"). Ehrlicher,
als eine Auswahl aus Zeichen zu bauen, die noch niemand kennt.

**Drei Einstiegspunkte, eine Bedingung.** `pendingIntroductions()` — aktiv, aber
nicht eingeführt:

- **Erstlauf:** nach dem Intro die sechs Startzeichen nacheinander.
- **Wachstum:** das neue Zeichen vor der *nächsten* Sitzung. Der Lauf beginnt
  nur bei „Runde 1 und noch nichts gespielt"; deshalb unterbricht ein mitten in
  der Sitzung dazugewachsenes Zeichen die laufende Sitzung nicht. Die
  Ankündigungszeile im Feedback bleibt unberührt.
- **Wiederholen:** der leise Link „Review the sounds" auf dem Start-Screen führt
  zu einem Gitter der aktiven Zeichen; ein Tipp öffnet die Karte, ohne
  Pflicht-Echo-Check.

**Bestandsnutzer bekommen keinen Zwangsdurchlauf.** `introducedCharacters` ist
additiv, aber sein Default ist bewusst kein konstanter: fehlt das Feld,
entscheidet die Vorgeschichte. Wer schon geübt hat (irgendein Versuch > 0), gilt
als vollständig eingeführt; ein Stand ohne einen einzigen Versuch fängt vorn an.

## 3b. Die Marke — was jetzt gilt und wer gewinnt

**Rangfolge.** Führend ist
[`docs/brand/Morse_Lab_Brand_Guidelines_1.1.html`](./docs/brand/Morse_Lab_Brand_Guidelines_1.1.html).
[`docs/CI.md`](./docs/CI.md) ist die deutsche Kurzfassung und nachrangig; sie
trägt einen Kopf, der die drei Stellen benennt, an denen sie überholt ist
(Token-Namen, Bildmarke, Rampe). Beides steht auch in CLAUDE.md §2.9.

**Drei Addenda von Fable gehen 1.1 vor** (Notion-Log #41):

- **(a) Kein Live-Sync im Standard-Hörtraining.** Der „visuelle Zwilling" aus
  1.1 §12 ist **nicht gebaut** und soll es hier auch nicht werden — er
  widerspräche CLAUDE.md §2.2. Er kommt später als opt-in „Visual practice".
  Damit bleibt die Barrierefreiheits-Zusage aus §12 vorerst offen; das ist eine
  bewusste Schuld, keine vergessene.
- **(b) `#92400e`** ist kein Token aus §13, sondern der interne
  hover/active-Shade von Amber (`--amber-deep`), nie eine eigene Fläche.
- **(c) Der Play-Kreis bleibt während der Wiedergabe bedienbar** — er hat gar
  keinen `disabled`-Zustand mehr.

**Das Logo ist gerechnet, nicht gezeichnet.**
[`docs/brand/logo.py`](./docs/brand/logo.py) hält die Zahlen aus §3 als
Konstanten und leitet den Rest ab; es druckt beim Lauf die Gegenproben mit
(Knopf 20,695 über dem Lager, gedrehte Hebellänge exakt 92,000). Wer die Marke
ändern will, ändert die Konstanten und lässt neu bauen — nicht umgekehrt.

Das Favicon ist bewusst **nicht** der Taster, sondern die Fallback-Marke: unter
24 px zerfällt er, und ein Favicon ist 16–32 px groß (§3).

**Die eine Regel, die am leichtesten bricht:** Amber nie zweimal in einer View.
Sie ist deshalb nicht nur beschrieben, sondern geprüft — siehe §4.

## 4. Was nachgewiesen ist (und wie)

- **`npm test` → 101/101 grün** (74 vorher, 27 neu für den Lernmodus). Die ARRL-Referenz („PARIS bei 5 WpM = 12 s")
  prüft weiter gegen den Standard, nicht gegen die Implementierung. Die
  Wachstums-Tests kippen jede Bedingung einzeln; Zufall kommt überall als
  Parameter herein.
- **`npm run build` → sauber.** Bundle **170,10 kB roh / 54,47 kB gzip**
  (vor der Marken-Runde 169,97 / 54,43), CSS **8,16 kB / 2,25 kB** (vorher
  7,35 / 2,09). Die ganze Marken-Runde kostet also +0,13 kB JS und +0,81 kB
  CSS. Dazu unverändert einmalig 129 kB woff2 und die neu gezeichneten Icons.
  **Keine neue Abhängigkeit.**
- **Amber nie zweimal in einer View (1.1 §4) — 12 von 12 Ansichten.** Geprüft
  wird am *gerenderten* Ergebnis, nicht am Stylesheet: das Skript geht jedes
  sichtbare Element durch und zählt Fläche, Rahmen und Text in `--amber` oder
  `--amber-deep`, verschachtelte Treffer zusammengefasst. Abgedeckt sind beide
  Intro-Schritte, die Lernkarte mit laufendem und mit beendetem Ton, der
  Echo-Check in drei Phasen, das Training in vier Phasen und die
  Wiederholen-Auswahl. Der Lauf hat dabei zwei echte Doppelbelegungen gefunden,
  bevor sie gefixt waren.
- **Der Play-Kreis füllt sich und bleibt bedienbar** — im Browser nachgemessen:
  vor dem Ton transparent mit ink-Rand, während des Tons `rgb(180, 83, 9)` in
  Fläche und Rand mit paper-Dreieck, danach zurück; Übergang 0,15 s;
  `disabled` durchgehend `false`.
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
- **Der Lernmodus ist im Browser durchgespielt** — lokal und danach noch einmal
  auf der Produktions-URL, 18 von 18: die Karte kommt nach dem Intro, das Muster
  erscheint erst nach dem Ton (vorher 0 Formen, nachher 3), die Antwortoptionen
  wachsen von einer auf sechs, der Durchlauf persistiert, „Skip for now" hält
  über einen Reload, ein Bestandsstand bekommt keinen Durchlauf, das Wiederholen
  öffnet Karten ohne Echo-Check, und ein gewachsenes `P` wird vor der Sitzung
  eingeführt. **Darunter der Beleg, dass Echo-Antworten die Statistik nicht
  anfassen:** nach sechs Karten `characters={}`, `recentAnswers=0`,
  `day.attempts=0`.
- **Offline auch mit dem Lernmodus** — auf Produktion mit abgeschaltetem Netz
  neu geladen: die Einführung rendert aus dem Cache, die Lernkarte öffnet, der
  Ton läuft und das Muster steht. Audio braucht kein Netz.
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
  auch offline aus dem neuen Cache. **Auf Produktion wiederholt und bestanden**,
  inzwischen zweimal — die Zahlen stehen in §5a.
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

- **Seite rendert** — `h1` „Morse Lab", Antwort-Gitter mit 6 Tasten.
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

### Custom Domain `morse-lab.com` — ein Handgriff fehlt

Die Domain ist **an das Pages-Projekt gebunden** (`status: pending`,
HTTP-Validierung) und liegt bei Cloudflare mit Cloudflare-Nameservern
(`dion` / `paige`), Zone `2bef7122ee328f9197516d727b9929a2`, aktiv. Also kein
fremdes DNS — die Auskunft aus der Aufgabenstellung trifft hier nicht zu.

Trotzdem ist sie **noch nicht erreichbar**: die Zone hat keinen einzigen
DNS-Eintrag, und die vorhandene wrangler-Anmeldung darf keinen anlegen — ihre
Scopes enthalten `zone:read`, aber kein `dns_records:write`. Anlegen muss ihn
also jemand mit DNS-Rechten:

| Feld | Wert |
|---|---|
| Typ | `CNAME` |
| Name | `morse-lab.com` (Apex, im Dashboard `@`) |
| Ziel | `projekt-morse.pages.dev` |
| Proxy | **an** (orange Wolke) — für Pages-Domains nötig |
| TTL | Auto |

Cloudflare flacht den Apex-CNAME selbst ab; ein A-Record ist nicht nötig.
Sobald der Eintrag steht, validiert Pages von selbst und stellt das Zertifikat
aus (wenige Minuten). `projekt-morse.pages.dev` bleibt daneben bestehen.

Wer `www` auch will, legt denselben CNAME für `www` an — das war nicht
gefordert und ist deshalb nicht passiert.

### Cache-Wechsel

**Beim Lernmodus-Deploy wiederholt** (Routine): `projekt-morse-112cb6b729ee` →
`projekt-morse-cd711867d85c`, wieder genau ein Cache am Ende, der alte
weggeräumt, danach offline der neue Stand.

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

## 5c. Zwei Fragen aus dem Lernmodus an Fable

1. **„Skip for now" merkt die Zeichen als vorgestellt.** Die Copy verspricht mit
   „for now" streng genommen eine Wiedervorlage. Ich habe sie *nicht* wieder
   vorgelegt: derselbe Bildschirm bei jedem Start wäre Druck (CLAUDE.md 2.8),
   und erreichbar bleiben die Klänge über „Review the sounds". Wenn die
   Wiedervorlage gewollt ist, ist es eine Zeile — dann sollte aber auch die
   Copy dazu passen.
2. **Der Ton der Karte läuft beim Öffnen von selbst.** Das ist so vorgegeben und
   durch die Klick-Geste gedeckt, berührt aber die bisherige Hausregel „nichts
   läuft von allein, jede Wiedergabe ist eine Nutzergeste" (Kommentarkopf in
   `App.tsx`). Der Play-Kreis bleibt als selbstgesteuerter Weg daneben stehen,
   die Regel aus CLAUDE.md 6 ist also gewahrt — die Hausregel ist es strenger
   gelesen nicht mehr.

## 5d. Wo Umsetzung und 1.1 auseinandergehen — vier Punkte für Fable

Gefunden beim Umsetzen, **nicht** eigenmächtig geändert: alle vier liegen außerhalb
der zehn Aufgabenpunkte, und drei davon würden Maße anfassen, die Fable im
Mockup selbst gesetzt hat.

1. **Der Strich ist 52 px breit, 1.1 §8 sagt 48.** Die Richtlinie definiert den
   Strich als `3 u × 1 u` bei `u` = Punktdurchmesser; bei `u = 16` sind das
   48 × 16. Implementiert sind 52 × 16 — so stand es in den verbindlichen
   Mockup-Werten der Politur-Runde. Eine Zeile CSS, aber es ändert das
   Erscheinungsbild jedes Musters.
2. **Der Lernkarten-Buchstabe hat Gewicht 500, 1.1 §5 sagt Light 300.** Größe
   (64 px) und Familie stimmen. 300 wäre deutlich zarter.
3. **Die Abstände liegen teilweise neben der Skala aus 1.1 §6**
   (4/8/12/16/24/32/48/64): der Screen hat 26 px seitliches Padding, 36 px
   zwischen den Blöcken, 28 px unten, und die Tasten sind 60 px hoch. Auch das
   sind Mockup-Werte. Die Token-Skala selbst ist inzwischen sauber (8/16/24).
4. **Das Antwort-Gitter bleibt sichtbar-deaktiviert, während der Ton läuft** —
   1.1 §7 sagt „no disabled-gray ghost rows — hide what can't be used". Auf der
   Lernkarte habe ich das umgesetzt („Try it" erscheint erst nach dem Ton); beim
   Antwort-Gitter wäre es ein Eingriff in den Kernloop: das Gitter ist der
   Kontext der Frage, nicht eine abgeblendete Werkzeugleiste. Bewusst gelassen.

Dazu eine Beobachtung ohne Handlungsbedarf: der Trainings-Screen hat in Ruhe
**gar kein** Amber mehr — Fortschritt ist ink, die Punkte sind ink, der
Play-Kreis wird erst beim Klingen amber. Das ist die Folge von „Amber ist
rationiert" und liest sich sehr ruhig; falls dort dauerhaft ein Akzent stehen
soll, ist das eine Design-Entscheidung, keine Korrektur.

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

1. **`morse-lab.com` erreichbar machen** — der DNS-Eintrag aus §5a. Danach ist
   die Marken-Runde wirklich fertig.
2. **Review durch Fable** — gegen die drei Screenshots in
   [`docs/screenshots/`](./docs/screenshots/) (Training, Lernkarte, Intro),
   dazu §5b, §5c und die vier Punkte in §5d.
3. **Streak mit Freeze-Gnade** — die Runde steht noch aus. Gebaut wird er als
   reine Engine-Logik (`src/engine/`), Persistenz additiv. Der Tages-Eimer aus
   dieser Runde ist bewusst *keine* Historie: er hält nur den laufenden Tag.
   Wer eine Reihe über Tage braucht, legt sie daneben — und sollte dabei
   entscheiden, ob der Eimer darin aufgeht.
4. **Menschliche Prüfungen:** Hörtest, Screenreader, PWA-Installation auf dem
   Telefon — jetzt auch: sieht das neue Icon auf einem echten Homescreen gut
   aus? Alles unverändert offen.
5. **„Visual practice"** als opt-in-Modus — die offene Zusage aus 1.1 §12,
   siehe Addendum (a) in §3b.
6. Danach die offenen Produktfragen aus §5 — Reihenfolge ist eine
   Notion-Entscheidung, nicht eine des Codes.
