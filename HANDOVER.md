# Übergabe — Stand nach dem Kern-Lernloop

**Repository:** https://github.com/Erikemmer/projekt-morse
**Branch:** `claude/morse-handover-alignment-nbkk6o`
**Datum:** 2026-08-31

Diese Übergabe löst die vorige ab (die den Stand des Grundgerüsts beschrieb). Sie
beschreibt, was gebaut und *nachgewiesen* ist, welche Entscheidungen gefallen sind,
welche offen bleiben und wo die Fallgruben liegen. Die verbindlichen Regeln stehen in
[CLAUDE.md](./CLAUDE.md) — dieses Dokument ersetzt sie nicht. Nebenbefunde, die
bewusst *nicht* mitrepariert wurden, stehen in [FINDINGS.md](./FINDINGS.md).

---

## 1. Wo das Projekt steht

Zwei Schritte sind seit dem Grundgerüst dazugekommen:

1. **Angleichung an die Konzeptphase** — EN-first, Design-Richtung „Ruhe",
   CLAUDE.md mit dem freigegebenen Konzept versöhnt.
2. **Der Kern-Lernloop läuft** — hören → tippen → Feedback, adaptiv nach Schwäche,
   mit Statistik pro Zeichen und Persistenz im localStorage.

Die Demo-Oberfläche des Grundgerüsts ist damit weg. Was jetzt in `src/ui/App.tsx`
steht, ist der Loop selbst.

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1 | unverändert, getestet |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL | unverändert, getestet |
| `src/engine/schedule.ts` | Text → Zeitachse | unverändert, getestet |
| `src/engine/settings.ts` | Tempo, Tonhöhe, Startzeichensatz, Rundenzahl | neu |
| `src/engine/stats.ts` | Statistik pro Zeichen, Lesen alter Stände | neu, getestet |
| `src/engine/selection.ts` | Gewichtung nach Schwäche, gewichtete Ziehung | neu, getestet |
| `src/engine/session.ts` | Der Loop als reiner Zustandsautomat | neu, getestet |
| `src/audio/player.ts` | Wiedergabe; jetzt zusätzlich mit Audio-Uhr nach außen | erweitert |
| `src/ui/App.tsx` | Der Lernloop-Screen | neu |
| `src/ui/progressStorage.ts` | localStorage rein/raus, mehr nicht | neu |
| `src/styles.css` | Design-Richtung „Ruhe" als Tokens | überarbeitet |
| `src/engine/*.test.ts` | 47 Tests (16 alt, 31 neu) | grün |

Die Richtung bleibt: `src/engine/` ist DOM-frei und läuft in Node, der Player kennt
die Engine, die Engine kennt den Player nicht, die UI rechnet nicht.

## 3. Die Entscheidungen, die den Rest erklären

### Timing läuft über die Audio-Uhr, nie über Timer

Unverändert gültig und jetzt auch gemessen (§4). Jeder Ton bekommt Start- und Endzeit
auf `AudioContext.currentTime`; `setInterval` weckt nur den Planer, der 0,3 s Zukunft
vorbereitet. Muster: Chris Wilson, *A Tale of Two Clocks*. **Nicht aufweichen**, auch
nicht „nur kurz zum Testen".

Für den Loop kam eine Folge dazu: **auch die Reaktionszeiten liegen auf dieser Uhr.**
`MorsePlayer` gibt sie über `player.currentTime` heraus, und `play()` liefert im
Handle `startTime`/`endTime` der geplanten Zeitachse. Der Zustandsautomat rechnet die
Reaktion als `Antwortzeitpunkt − promptEndsAt`; beide Werte kommen aus derselben Uhr.
Mit `Date.now()` wäre das die Differenz zweier Größen, die nichts miteinander zu tun
haben.

### Farnsworth von Anfang an

Unverändert. Zeichen immer im Endtempo (`characterWpm`), gestreckt wird nur die Pause.
Formel nach Jon Bloom, *A Standard for Morse Timing Using the Farnsworth Technique*,
ARRL QEX, April 1990:

```
unit  = 1.2 / characterWpm
t_a   = (60·characterWpm − 37.2·effectiveWpm) / (characterWpm · effectiveWpm)
Zeichenpause = 3·t_a / 19        Wortpause = 7·t_a / 19
```

Die 37.2: PARIS ist 50 Einheiten lang, davon 31 Einheiten Zeichen und 19 Einheiten
Pause; 31 Einheiten bei c WpM dauern 31 · 1.2/c = 37.2/c Sekunden. Bei
`effectiveWpm == characterWpm` fällt alles auf 1/3/1/3/7 zurück — ein Test hält das
fest. Aktuell: 20 WPM Zeichentempo, 10 WPM Gesamttempo (`settings.ts`).

### Der Loop ist retrieval-only, und zwar in den Übergängen

Drei Regeln stecken im Zustandsautomaten, nicht in der Komponente:

- **Während des Tons ist keine Antwort möglich.** Ein Muster ist erst am Ende
  eindeutig (`.` ist der Anfang von `..` und `...`). Eine Antwort davor wäre geraten,
  und die gemessene Zeit wäre Unsinn.
- **Wiederholungen vor der Antwort zählen zum Versuch**, Nachhören nach der Auflösung
  ändert nichts mehr am Datensatz.
- **Weiter geht es nur aus dem Feedback heraus.** Eine übersprungene Runde würde die
  Statistik verdünnen, ohne dass jemand etwas geübt hätte.

### Was die Zahlen behaupten — und was nicht

`stats.ts` erfasst **Reaktionszeiten nur bei richtigen Antworten**. Die Zeit bis zu
einer falschen Antwort misst das Zögern vor einem Fehlgriff, nicht die Sicherheit beim
Erkennen; beides in einen Median zu werfen ergäbe eine Zahl, die nichts behauptet.
Gehalten werden die letzten 10 Zeiten pro Zeichen — das begrenzt den Speicher und
lässt die Gewichtung auf den aktuellen Stand reagieren.

Die Reaktionszeit bleibt trotzdem ein **Näherungswert für Sicherheit, nicht ihr Maß**:
sie enthält Motorik und die Suche auf dem Antwort-Gitter. Die Zusammenfassung am Ende
der Sitzung sagt das ausdrücklich (CLAUDE.md §2.6). Wer weitere Zahlen anzeigt, ist an
dieselbe Pflicht gebunden.

Die Gewichtung in `selection.ts` ist `1 + 4·Fehlerquote + 2·Latenzanteil`, ein noch nie
gehörtes Zeichen bekommt 4. Die Konstanten sind eine begründete Setzung, keine
Messung: Fehler wiegt schwerer als Langsamkeit, weil Langsamkeit nur ein Proxy ist.
**Diese Zahl taugt nicht als Fortschrittsanzeige** — sie ist ein Los, kein Können.

## 4. Was nachgewiesen ist (und wie)

- **`npm test` → 47/47 grün** (16 aus dem Grundgerüst, 31 neu). Darunter weiterhin die
  ARRL-Referenz *„PARIS dauert bei 5 WpM genau 12 Sekunden"*, die gegen den
  veröffentlichten Standard prüft und nicht gegen die eigene Implementierung. **Diese
  Eigenschaft bitte erhalten.** Der Zufall kommt in allen neuen Tests als Parameter
  herein; es wird nirgends gewürfelt.
- **`npm run build` → sauber** (`tsc --noEmit` + Vite 6.4.3). Bundle **156,38 kB roh /
  50,92 kB gzip** (vorher 149,98 / 48,63), CSS 3,97 kB / 1,40 kB gzip. Keine neue
  Abhängigkeit.
- **Ton-Timing gemessen** — das war in der letzten Übergabe noch offen. Methode:
  `AudioContext.prototype.createOscillator` in einer Init-Skript-Instrumentierung
  umhüllt, sodass für jeden Ton `(currentTime beim Planen, geplante Startzeit)`
  mitgeschrieben wird; dann eine volle Sitzung durchgeklickt.
  - 52 Töne, **kein einziger in der Vergangenheit geplant**; kleinster Vorlauf 91 ms,
    größter 260 ms. Der Planer ist nie hinter sein Vorlauffenster gefallen.
  - Positionierung ist damit nur noch durch die Samplerate begrenzt: bei 44,1 kHz
    **0,023 ms** — zwei Größenordnungen unter dem Budget von < 1 ms.
  - Hörbare Dauern exakt 60 ms (dit) und 180 ms (dah) bei 20 WPM. Der Oszillator läuft
    5 ms länger, weil er erst *nach* der Ausblendrampe gestoppt wird; hörbar ist er
    zu diesem Zeitpunkt bereits auf null.
- **Eingabe-zu-Anzeige gemessen** (Event Timing API, 10 Antwortklicks): Handler-Arbeit
  im Mittel 3,7 ms, maximal 11 ms. Bis zur nächsten Darstellung im Mittel 16,8 ms,
  maximal 24 ms — das enthält die Wartezeit auf den nächsten Frame, und ein Frame sind
  bei 60 Hz schon 16,7 ms. Der teuerste Klick der ganzen Sitzung ist nicht die Antwort,
  sondern das allererste „Play" (51–85 ms): dort entsteht der AudioContext. Das
  passiert einmal pro Sitzung und liegt nicht auf dem Übungspfad.
- **Kein unbegrenztes Speicherwachstum:** nach einer vollen 20-Runden-Sitzung 9 MB
  JS-Heap. Reaktionszeiten sind je Zeichen auf 10 Werte gedeckelt.
- **Laufzeit im Browser durchgespielt** (Headless Chromium, siehe §6): volle Sitzung
  über 20 Runden, Fortschrittslinie, Wiederholung, Tastatureingabe, Zusammenfassung,
  Neustart mit erhaltenem Fortschritt. Während des Hörens war die Auflösung in keinem
  Zustand im DOM — auch nicht versteckt. Der Fortschritt überlebt den Neustart der
  Sitzung und liegt unter `projekt-morse:progress` im localStorage.
- **Zwei Fokus-Fehler durch diesen Durchlauf gefunden und behoben:** die Antworttaste
  verlor den Fokus an `<body>`, sobald sie während des Tons deaktiviert wurde, und am
  Ende der Sitzung ging er beim Austausch des Bildschirms verloren. Jetzt zieht ein
  Effekt den Fokus bei jedem Phasenwechsel nach; am Sitzungsende landet er auf der
  Überschrift „Session done", nicht auf einer Taste.

Nicht nachgewiesen, ehrlich benannt:

- **Kein Hörtest.** Ob 620 Hz, die 5-ms-Rampe und die Lautstärke *angenehm* klingen,
  hat niemand mit Ohren geprüft. Das braucht einen Menschen und ist die
  offensichtlichste nächste Prüfung.
- **Kein Screenreader-Durchgang.** Die Tastaturbedienung ist durchgespielt, ARIA-Rollen
  und Fokusführung sind gesetzt und geprüft — aber niemand hat der Seite mit NVDA,
  VoiceOver oder Orca zugehört. Für einen Audio-Trainer bleibt das der heikelste Punkt.
- **Kein Test auf echter Hardware.** Alles oben lief in einem Headless-Chromium im
  Container. Ein Telefon mit Bluetooth-Kopfhörern hat andere Latenzen.
- **Die Gewichtungskonstanten sind ungeprüft** (§3). Ob `1 + 4·Fehler + 2·Latenz` gut
  lehrt, weiß man erst mit Nutzungsdaten.

## 5. Entscheidungen: gefallen und offen

**Gefallen (Konzeptphase, über die Übergabe hereingekommen):**

- **Eingabe-Granularität: Zeichen für Zeichen.** Die offene Frage der letzten Übergabe
  ist beantwortet. Das adaptive Modell braucht Reaktionszeit pro Zeichen.
- **Retrieval-only.** Kein Mitlese- oder Berieselungsmodus.
- **EN-first**, Deutsch später als eigene i18n-Entscheidung.
- **Design-Richtung „Ruhe"** mit genau einem Akzent und einer Token-Regel (CLAUDE.md §2.9).
- **Streak mit Freeze-Gnade** ist beschlossen (CLAUDE.md §2.8) — **aber noch nicht
  gebaut.** Es gibt im Code weder Streak noch Freeze; das ist ein eigenes Stück Arbeit.
- **Accountfähig bleiben, ohne Account in V1** (CLAUDE.md §2.5).

**Offen, bewusst nicht angefasst:**

- **Der Zeichensatz wächst nicht.** K M R S U A sind fest; es gibt keine Regel, wann
  ein siebtes Zeichen dazukommt. Das ist die nächste inhaltliche Entscheidung und
  braucht ein Kriterium („ab welcher Sicherheit über welchem Zeitraum").
- **Kein Einstellungsdialog.** Tempo, Tonhöhe und Rundenzahl stehen in `settings.ts`
  und sind in der UI nicht änderbar.
- **HVPT ist vorbereitet, nicht umgesetzt.** Tonhöhe und Tempo sind benannte
  Konstanten, damit sie später bewusst streuen können — gestreut wird noch nichts.
- **Keine Zeichenfolgen, nur Einzelzeichen.** Fünfergruppen und Klartext fehlen.
- **Kein Dark Mode.** Die Rollen stehen in `styles.css`, aber ohne
  `prefers-color-scheme`-Block. Wird er scharf geschaltet, gehört eine Kontrastprüfung
  dazu (siehe FINDINGS.md §1 für die helle Variante).

## 6. Umgebung und Werkzeuge

```bash
npm install
npm run dev        # Vite-Entwicklungsserver
npm test           # Vitest, 47 Tests
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

- Node v22.22.2, npm 10.9.7. React 18, Vite 6, TypeScript 5.7 (`strict`), Vitest 3.
- **Vitest muss ≥ 3 bleiben.** Vitest 2 bringt sein eigenes Vite 5 mit; zwei
  Vite-Typenbäume kollidieren dann in `vite.config.ts` mit einem sehr langen,
  sehr unlesbaren `PluginOption`-Fehler.
- `defineConfig` in `vite.config.ts` kommt bewusst aus `vitest/config`, damit der
  `test`-Block typisiert ist. Vite liest dieselbe Datei und ignoriert den Block.
- **Browser-Durchlauf** (nicht committet, bewusst ad hoc):
  ```bash
  npm i --no-save playwright-core     # muss im Projektordner liegen, nicht in /tmp
  # Chromium ist vorinstalliert, aber NICHT unter dem Standardpfad:
  # /opt/pw-browsers/chromium-1194/chrome-linux/chrome
  # Start mit --autoplay-policy=no-user-gesture-required, sonst bleibt Audio stumm.
  ```
  `playwright-core` steht absichtlich nicht in `package.json` — lokales Werkzeug,
  keine Projektabhängigkeit. Wird je ein Skript committet, muss der Chromium-Pfad
  konfigurierbar sein, nicht hart verdrahtet.
- **Google Fonts ist in diesem Container blockiert** (`ERR_CONNECTION_RESET`). Die
  Fallback-Stacks greifen, die Seite bleibt heil — aber wer hier einen Screenshot
  macht, sieht Georgia statt Newsreader. Siehe FINDINGS.md §2.

## 7. Fallgruben

**Der Container ist flüchtig — früh pushen.** Ein erster Anlauf des Grundgerüsts war
gebaut, aber nie gepusht; der Container wurde recycelt und die Arbeit war restlos weg.
Konsequenz: nach jedem sinnvollen Schritt committen und pushen. Diese Sitzung hat sich
daran gehalten (zwei Commits, beide gepusht).

**`create_repository` schlägt in dieser Umgebung fehl.** `POST /user/repos` gibt
`403 Resource not accessible by integration`. Falls je ein zweites Repo gebraucht wird:
nicht nach einem Token fragen, sondern den Nutzer das leere Repo anlegen lassen.

**Der Fokus geht verloren, wo man ihn nicht vermutet.** Beide in §4 genannten Fehler
waren im Code unsichtbar und wären ohne den Browser-Durchlauf durchgerutscht. Wer den
Loop umbaut: `document.activeElement` nach jedem Phasenwechsel prüfen, nicht nur die
Tab-Reihenfolge ansehen.

## 8. Nächster Schritt

Aus §5 sind das die zwei naheliegenden, jeweils als *eigene* Aufgabe:

1. **Wachstum des Zeichensatzes.** Braucht ein Kriterium, und das ist eine
   Produktentscheidung — gehört nach Notion, nicht in den Code (CLAUDE.md §2).
2. **Streak mit Freeze-Gnade.** Beschlossen, aber nicht gebaut. Die Persistenz kann
   additiv erweitert werden (`parseProgress` füllt fehlende Felder mit Default auf,
   ein Test hält das fest).

Und unabhängig davon, weil es kein Code ist: **einmal mit Ohren zuhören** und **einmal
mit einem Screenreader durchgehen** (§4).

Bausteine, die dabei nutzbar sind, ohne sie anzufassen:
`computeTiming` → `buildSchedule` → `MorsePlayer.play(schedule, onProgress)` sowie der
Zustandsautomat in `session.ts`. Was neu dazukommt — Wachstumsregel, Streak — gehört
als reine Logik nach `src/engine/`, nicht in die Komponente.
