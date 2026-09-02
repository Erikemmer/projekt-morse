# Morse Lab

Adaptiver Morse-Trainer im Browser. Kernloop: **hören → tippen → Feedback.**
Ziel ist Kopfhören — das Zeichen als Klang erkennen, nicht Punkte und Striche zählen.

Läuft vollständig lokal: kein Konto, kein Server, keine Cookies, keine Fremdabrufe.
Als PWA installierbar und offline nutzbar; die Schriften liegen im Repo.

**Live:** https://morse-lab.com — dazu unverändert https://projekt-morse.pages.dev

Gestaltung und Sprache richten sich nach
[`docs/brand/Morse_Lab_Brand_Guidelines_1.1.html`](./docs/brand/Morse_Lab_Brand_Guidelines_1.1.html)
(führend); [`docs/CI.md`](./docs/CI.md) ist die deutsche Kurzfassung.

Die **Bildmarke** liegt als Original in `docs/brand/assets/` — drei SVGs vom
Konzept-Owner, byte-identisch. Alles, was ausgeliefert wird (Favicon,
App-Icons, Lockup, Social-Bild), ist daraus abgeleitet:
`node tools/brand/derive.mjs` (mit `--check` nur prüfend). Wer die Marke ändern
will, ändert die Originale — es gibt keinen zweiten Zeichner mehr.

## Stand

Der Kern-Lernloop läuft: ein Zeichen wird gespielt, man antwortet, man bekommt sofort
die Auflösung. Welches Zeichen kommt, entscheidet sich adaptiv nach Schwäche — aus
Fehlerquote und Reaktionszeit pro Zeichen. Der Fortschritt liegt im localStorage.

Startzeichensatz K M R S U A, 20 WPM Zeichentempo bei 10 WPM Gesamttempo
(Farnsworth). Die Oberfläche ist auf Englisch.

**Sind alle 36 Zeichen aktiv, steigt das Gesamttempo** — ein WPM je Stufe, wenn
das 90-%-Fenster stimmt, mit einer Sperre von 20 Antworten dazwischen, und
höchstens bis zum Zeichentempo. Nie automatisch abwärts; zurücksetzen kann man
es in den Einstellungen. Erst der volle Zeichensatz, dann schrumpfen die
Pausen — solange noch Zeichen dazukommen, ist Kopfhören die knappe Ressource
und nicht Geschwindigkeit.

Geantwortet wird bis zwölf aktive Zeichen auf einem Dreier-Gitter; **ab
dreizehn** übernimmt ein festes Tastenfeld — sechs Spalten, A–Z, darunter 0–9,
alle 36 Positionen immer sichtbar und ortsfest. Wer immer an dieselbe Stelle
greift, baut Motorik auf, und die gemessene Reaktionszeit enthält nicht bei
jedem neuen Zeichen eine neue Suche.

Ab acht aktiven Zeichen öffnet sich **„Words & groups"**: ein ganzes Wort oder
eine Zufallsgruppe als *eine* Zeitachse, danach als Ganzes eingetippt und
Position für Position aufgelöst. Der Modus ist **offen** — keine Einheit, kein
Rundenzähler, kein Abschluss: hören, antworten, „Next word", so lange man mag.
Oben rechts steht still, wie viele Aufgaben heute gelaufen sind; verlassen wird
über das Menü. Die Antworten trainieren die Statistik jedes Zeichens mit,
lassen das Wachstumsfenster aber unberührt — über den nächsten Buchstaben
entscheidet der Einzelzeichen-Loop.

Dazu: ein Streak, der einen verpassten Tag verzeiht statt ihn zu bestrafen;
Tonhöhe und Lautstärke einstellbar (gerätespezifisch, nie im Konto); und eine
kurze „Speed round" für Zeichen, die zwar sitzen, aber zu lange brauchen.

**Ab 900 px Breite bekommt der Laptop ein eigenes Layout**, ohne das Handy
darunter anzufassen: eine offene Navigations-Schiene links statt des
Hamburger-Menüs, das Tastenfeld als flacher Streifen mit zwölf statt sechs
Spalten (am Laptop antwortet ohnehin die Tastatur), und ab 1280 px eine
Randspalte rechts mit denselben drei Tageszahlen wie die Fußzeile.

Neben der App liegt der **Learn-Bereich**: sieben redaktionelle Seiten auf
Englisch unter `/learn/` und dieselben sieben auf Deutsch unter `/de/lernen/`.
Sie sind statisch generiert (nicht in der SPA gerendert), tragen dieselben
Tokens und verlinken zurück in die App. Konzept und Vorgaben:
[`docs/CONCEPT-LEARN.md`](./docs/CONCEPT-LEARN.md).

## Loslegen

```bash
npm install
npm run dev      # Entwicklungsserver (nur die App, ohne /learn/)
npm test         # Engine- und Generator-Tests (Vitest)
npm run build    # Typprüfung + Produktionsbuild + Learn-Seiten
npm run preview  # dist/ ausliefern -- so ist auch /learn/ zu sehen
```

Der Learn-Bereich ist statisches HTML und entsteht erst im Build. Wer nur an ihm
arbeitet: `npm run build:learn` (setzt einen Vite-Build voraus, weil er nach
`dist/` schreibt) und `npm run verify:learn` für die SEO-Gegenprobe.

`npm run verify:amber` prüft die Regel „Amber steht nie zweimal in einer View"
(Guidelines 1.1 §4) am gerenderten Bild: das Skript fährt achtundzwanzig
Ansichten in einem Browser an und zählt die Flächen. Es setzt einen Build
voraus und braucht zwei Dinge aus der Umgebung, nicht aus dem Projekt:
`playwright-core` (`npm i --no-save playwright-core` — ein Werkzeug, keine
Abhängigkeit) und den Pfad zu Chromium in `CHROMIUM_PATH`.

## Aufbau

| Pfad | Rolle |
|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1, plus Kodieren/Dekodieren |
| `src/engine/timing.ts` | Farnsworth-Timing nach dem ARRL-Standard |
| `src/engine/schedule.ts` | Text → Zeitachse aus Tönen (reine Datenstruktur) |
| `src/engine/settings.ts` | Tempo, Tonhöhe, Startzeichensatz — als benannte Konstanten |
| `src/engine/stats.ts` | Statistik pro Zeichen, plus das Lesen alter Stände |
| `src/engine/streak.ts` | Der Streak mit Freeze-Gnade — Kalendertage, keine Uhr |
| `src/engine/drill.ts` | Langsame Zeichen und der Satz einer „Speed round" |
| `src/engine/words.ts` | Wortliste und die Auswahl von Wörtern und Gruppen |
| `src/engine/wordSession.ts` | Der Wort-Loop als reiner Zustandsautomat — offen, ohne Ende |
| `src/engine/tempo.ts` | Die Tempo-Progression: wann die Pausen kürzer werden |
| `src/engine/deviceSettings.ts` | Tonhöhe und Lautstärke dieses Geräts |
| `src/engine/selection.ts` | Gewichtung nach Schwäche und die Ziehung daraus |
| `src/engine/session.ts` | Der Loop als reiner Zustandsautomat |
| `src/audio/player.ts` | Wiedergabe über die Web Audio API |
| `src/ui/keypad.ts` | Schwelle und Positionen des festen Tastenfelds |
| `src/ui/` | React-Oberfläche |
| `content/learn/` | Die Texte des Learn-Bereichs (Markdown mit Frontmatter) |
| `tools/learn/` | Der statische Generator, sein Stylesheet und die Prüfung |

`src/engine/` ist DOM-frei und ohne Browser testbar. Der Player kennt die Engine,
die Engine kennt den Player nicht.

## Zwei Entscheidungen, die den Rest erklären

**Timing läuft über die Audio-Uhr, nicht über Timer.** Jeder Ton bekommt seine Start-
und Endzeit auf `AudioContext.currentTime`, die in Samples läuft. `setInterval` weckt
nur den Planer, der ein Stück Zukunft vorbereitet (0,3 s Vorlauf); verspätet er sich,
verschiebt das keinen einzigen Ton. Mit `setTimeout` pro Ton wären zweistellige
Millisekunden-Abweichungen normal — und Morse *ist* Timing.

**Retrieval statt Berieselung.** Auf jeden Ton folgt eine aktive Antwort und erst
danach die Auflösung. Es gibt keinen Mitlesemodus, und während des Tons steht nichts
auf dem Schirm — wer Punkte und Striche mitlesen kann, zählt Elemente, statt zu hören.
Nach der Antwort wird das Muster gezeigt; da erklärt es, statt zu stützen.

**Farnsworth von Anfang an.** Zeichen werden immer im endgültigen Tempo gesendet
(`characterWpm`); gestreckt werden nur die Pausen, bis das Gesamttempo
(`effectiveWpm`) stimmt. Wer Zeichen langsam lernt, lernt einen Klang, den er später
umlernen muss.

Formel und Herleitung: Jon Bloom, *A Standard for Morse Timing Using the Farnsworth
Technique*, ARRL QEX, April 1990. Der Test `PARIS dauert bei 5 WpM genau 12 Sekunden`
prüft gegen diese Referenz, nicht gegen die eigene Implementierung.

**Der Learn-Bereich ist keine SPA-Route.** Suchmaschinen sollen fertiges HTML
bekommen, nicht ein leeres `<div id="root">`. Also rendert ein Node-Skript die
Markdown-Dateien beim Bauen zu statischen Seiten, und der Service Worker fasst
sie nicht vorab an: die App ist offline, die Artikel sind eine Website.

## Mitarbeit

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md) — Timing-Grundsatz,
Architekturgrenzen, Barrierefreiheit, Leistungsbudget.
