# Übergabe — Stand des Grundgerüsts

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** `main` @ `ebd5b05` (2 Commits, gepusht und gegen GitHub verifiziert)
**Datum:** 2026-08-31

Dieses Dokument ist die Übergabe an die nächste Session. Es beschreibt, was gebaut
und *nachgewiesen* ist, welche Entscheidungen bereits gefallen sind, welche offen
sind, und wo die Fallgruben liegen. Die verbindlichen Regeln stehen in
[CLAUDE.md](./CLAUDE.md) — dieses Dokument ersetzt sie nicht.

---

## 1. Wo das Projekt steht

Grundgerüst: Engine, Timing und Wiedergabe stehen und sind getestet.
**Der Lernloop (hören → tippen → Feedback) ist noch nicht gebaut.** Die
Oberfläche in `src/ui/App.tsx` ist ausdrücklich eine Demo — sie beweist, dass
Engine und Player zusammenspielen, und ist kein Entwurf für den Lernloop.

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1, `encodeChar` / `decodePattern` | fertig, getestet |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL, `computeTiming(SpeedSettings) → Timing` | fertig, getestet |
| `src/engine/schedule.ts` | `buildSchedule(text, timing) → Schedule`, Text → Zeitachse | fertig, getestet |
| `src/audio/player.ts` | `MorsePlayer`: `resume()`, `play(schedule, onProgress?)`, `stop()` | fertig, im Browser rauchgetestet |
| `src/ui/App.tsx` | Demo-Oberfläche | **Wegwerf-Kandidat**, siehe §1 |
| `src/styles.css` | Design-Tokens (Farben, Abstände) für hell und dunkel | brauchbare Basis |
| `src/engine/engine.test.ts` | 16 Tests (Vitest) | grün |

`src/engine/` ist DOM-frei und läuft in Node. Der Player kennt die Engine, die
Engine kennt den Player nicht. Diese Richtung ist eine Regel aus CLAUDE.md, keine
Zufälligkeit — der Lernloop sollte sie nicht umdrehen.

## 3. Die zwei Entscheidungen, die den Rest erklären

### Timing läuft über die Audio-Uhr, nie über Timer

Jeder Ton bekommt seine Start- und Endzeit auf `AudioContext.currentTime`, die in
Samples läuft. `setInterval` (100 ms) weckt in `player.ts` nur den *Planer*, der
0,3 s Zukunft vorbereitet; verspätet sich der Planer, verschiebt das keinen
einzigen Ton, solange er im Vorlauffenster bleibt. Muster: Chris Wilson,
*A Tale of Two Clocks*.

Mit `setTimeout` pro Ton wären zweistellige Millisekunden-Abweichungen normal.
Bei einem dit von 67 ms (18 WpM) ist das die Grenze zwischen dit und dah.
**Diese Trennung nicht aufweichen**, auch nicht „nur kurz zum Testen".

Nebenwirkung fürs Feedback: Eingaben sollten gegen `AudioContext.currentTime`
gestempelt werden, nicht gegen `Date.now()` — sonst mischt man zwei Uhren und
die Reaktionszeiten werden unbrauchbar. `play()` bietet dafür bereits einen
`onProgress(elapsedSeconds)`-Rückruf, der auf `requestAnimationFrame` läuft.

### Farnsworth von Anfang an

Zeichen werden immer im endgültigen Tempo gesendet (`characterWpm`); gestreckt
werden nur die Pausen, bis das Gesamttempo (`effectiveWpm`) stimmt.
Wer Zeichen langsam lernt, lernt einen Klang, den er später umlernen muss.

Formel nach Jon Bloom, *A Standard for Morse Timing Using the Farnsworth
Technique*, ARRL QEX, April 1990:

```
unit  = 1.2 / characterWpm
t_a   = (60·characterWpm − 37.2·effectiveWpm) / (characterWpm · effectiveWpm)
Zeichenpause = 3·t_a / 19        Wortpause = 7·t_a / 19
```

Die 37.2 ist nicht magisch: das Referenzwort PARIS ist 50 Einheiten lang, davon
31 Einheiten Zeichen und 19 Einheiten Pause. 31 Einheiten bei c WpM dauern
31 · 1.2/c = 37.2/c Sekunden. Bei `effectiveWpm == characterWpm` fällt das
Ergebnis exakt auf das Standard-Timing 1/3/1/3/7 zurück — Farnsworth ist dann
ein No-op, und ein Test hält das fest.

## 4. Was nachgewiesen ist (und wie)

- **`npm test` → 16/16 grün.** Darunter die ARRL-Referenz *„PARIS dauert bei
  5 WpM genau 12 Sekunden"*. Dieser Test prüft gegen den veröffentlichten
  Standard, nicht gegen die eigene Implementierung — er würde einen Denkfehler
  in der Formel auch dann finden, wenn der Code „in sich" stimmig wäre.
  **Bitte diese Eigenschaft erhalten**, wenn Tests dazukommen.
- **`npm run build` → sauber** (`tsc --noEmit` + Vite 6.4.3). Bundle 150,00 kB
  roh / **48,66 kB gzip**.
- **Laufzeit im Browser rauchgetestet** (Headless Chromium, siehe §6): Seite
  rendert, PARIS-Muster korrekt (`.--. .- .-. .. ...`), `AudioContext` läuft
  (44,1 kHz, `state: running`), Wiedergabe startet und der Stopp-Knopf wird
  während des Abspielens aktiv, Warnung bei nicht kodierbaren Zeichen (`ü`, `ß`)
  erscheint. Angezeigte Werte bei 18/9 WpM: Dauer 4,97 s, dit 67 ms,
  Zeichenpause 10,9 Einheiten — nachgerechnet, stimmt mit der Formel.
- **Konsole ohne Fehler.** Der zunächst beobachtete 404 war die fehlende
  `favicon.ico`; behoben durch ein Inline-SVG in `index.html` (Commit `ebd5b05`).

Nicht nachgewiesen, ehrlich benannt:
- **Kein Hörtest.** Ob der Ton *klingt* wie er soll (Rampenlänge, Tonhöhe
  650 Hz, Lautstärke), hat niemand mit Ohren geprüft. Das braucht einen Menschen.
- **Kein Timing-Budget gemessen.** CLAUDE.md fordert < 1 ms Abweichung. Die
  Architektur ist darauf ausgelegt, aber eine Messung gibt es nicht. Sobald der
  Lernloop steht, wäre das ein sinnvoller Test.
- **Keine Barrierefreiheits-Prüfung.** Weder Tastatur- noch Screenreader-Durchgang.
  Für einen Audio-Trainer ist das der heikelste Punkt überhaupt (CLAUDE.md §6:
  jede zeitgesteuerte Darbietung braucht eine selbstgesteuerte Alternative).

## 5. Entscheidungen: gefallen und offen

**Gefallen — Lernpfad: adaptiv nach Schwäche.** Vom Nutzer so entschieden.
Gezogen wird aus den bereits gelernten Zeichen, gewichtet nach Fehlerrate und
Reaktionszeit. Zwei Folgen, die vorher bedacht sein sollten:

- Es braucht **Statistik pro Zeichen** (Versuche, Treffer, Reaktionszeiten), nicht
  nur einen Fortschrittszähler. Das ist der erste Fall, in dem etwas persistiert
  werden muss — CLAUDE.md verlangt additive Felder mit Default, keine neu
  erfundene Versionierung.
- Der Nutzer entschied sich damit *gegen* die einfacher erklärbare Koch-Methode.
  CLAUDE.md §2.6 (wissenschaftliche Ehrlichkeit) gilt trotzdem: wenn die UI eine
  Gewichtung anzeigt, muss sie sagen können, was die Zahl bedeutet — und dass
  Reaktionszeit ein Näherungswert für Sicherheit ist, nicht ihr Maß.

**Offen — Eingabe-Granularität.** Die Frage war gestellt, aber nicht beantwortet.
Sie prägt die Architektur des Lernloops, also bitte zuerst klären:

- *Zeichen für Zeichen:* Mitschreiben während des Hörens, sofortige Bewertung.
  Nah am echten Kopfhören und liefert Reaktionszeiten pro Zeichen — die der
  gewählte adaptive Pfad ohnehin braucht.
- *Gruppe, dann prüfen:* Fünfergruppe komplett senden, danach abtippen und mit
  Enter bestätigen. Klassisches Prüfungsformat, verrät aber weniger darüber, wo
  der Nutzer gestockt hat.

Angesichts der Entscheidung für „adaptiv nach Schwäche" ist *Zeichen für Zeichen*
die naheliegende Wahl, weil das Gewichtungsmodell Reaktionszeiten pro Zeichen
braucht. Das ist eine Einschätzung, keine Vorgabe — die Frage gehört dem Nutzer.

**Weitere offene Punkte, bewusst nicht angefasst:**
- `FINDINGS.md` ist in CLAUDE.md als Ablage für Nebenbefunde vorgesehen, existiert
  aber noch nicht. Erste Datei anlegen, wenn der erste Nebenbefund auftaucht.
- Keine Persistenz, keine Einstellungen, kein Zustand über den Seiten-Reload.
- Keine Internationalisierung. UI-Strings stehen als deutsche Literale im JSX.
  Das ist für die Demo vertretbar, für den Lernloop eine Entscheidung.

## 6. Umgebung und Werkzeuge

```bash
npm install
npm run dev        # Vite-Entwicklungsserver
npm test           # Vitest, 16 Tests
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

- Node v22.22.2, npm 10.9.7. React 18, Vite 6, TypeScript 5.7 (`strict`), Vitest 3.
- **Vitest muss ≥ 3 bleiben.** Vitest 2 bringt sein eigenes Vite 5 mit; zwei
  Vite-Typenbäume kollidieren dann in `vite.config.ts` mit einem sehr langen,
  sehr unlesbaren `PluginOption`-Fehler. Der Sprung auf 3 hat nebenbei 5 gemeldete
  Vulnerabilities auf 0 gebracht.
- `defineConfig` in `vite.config.ts` kommt bewusst aus `vitest/config`, damit der
  `test`-Block typisiert ist. Vite liest dieselbe Datei und ignoriert den Block.
- **Rauchtest im Browser** (nicht committet, bewusst ad hoc):
  ```bash
  npm i --no-save playwright-core
  # Chromium liegt vorinstalliert, aber NICHT unter dem Standardpfad:
  # /opt/pw-browsers/chromium-1194/chrome-linux/chrome
  ```
  `playwright-core` steht absichtlich nicht in `package.json` — es ist ein
  lokales Werkzeug, keine Projektabhängigkeit. Wird ein Skript dafür committet,
  muss der Chromium-Pfad konfigurierbar sein, nicht hart verdrahtet.

## 7. Zwei Fallgruben aus dieser Session

**Der Container ist flüchtig — früh pushen.** Ein erster Anlauf dieses Grundgerüsts
war bereits gebaut, aber nie gepusht; der Container wurde recycelt und die Arbeit
war restlos weg (Branch byte-identisch mit `main`, kein Stash, kein Reflog).
Das Gerüst in diesem Repo ist der *zweite* Aufbau. Konsequenz für die nächste
Session: nach jedem sinnvollen Schritt committen und pushen, nicht erst am Ende.

**`create_repository` schlägt in dieser Umgebung fehl.** `POST /user/repos` gibt
`403 Resource not accessible by integration` — die GitHub-App darf existierende
Repos lesen und schreiben, aber keine neuen anlegen. Dieses Repo hat der Nutzer
selbst angelegt; danach wurde es der Session angehängt und der Push lief ohne
Token durch (Auth kommt transparent über den Proxy). Falls je ein zweites Repo
gebraucht wird: nicht nach einem Personal Access Token fragen, sondern den Nutzer
das leere Repo anlegen lassen.

## 8. Nächster Schritt

Den Kern-Lernloop bauen: **hören → tippen → Feedback**, mit adaptiver
Zeichenauswahl nach Schwäche (§5). Vorher die offene Frage zur
Eingabe-Granularität klären — sie bestimmt, wie der Loop aufgebaut wird, und
nachträglich umzubauen wäre ein Refactor, also eine eigene Aufgabe.

Bestehende Bausteine, die dabei nutzbar sind, ohne sie anzufassen:
`computeTiming` → `buildSchedule` → `MorsePlayer.play(schedule, onProgress)`.
Was der Loop zusätzlich braucht — Zeichenauswahl, Bewertung, Statistik pro
Zeichen — gehört als reine Logik nach `src/engine/`, nicht in die Komponente.
