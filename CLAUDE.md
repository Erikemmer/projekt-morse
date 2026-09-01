# CLAUDE.md — Morse Lab

Stehender Kontext für jeden Agenten in diesem Repo. Das ist **keine Aufgabe**, sondern
die Beschreibung davon, *wie* hier gearbeitet wird — nie *was* gebaut wird.

---

## 1. Was das ist

Ein adaptiver Morse-Trainer im Browser. Kernloop: **hören → tippen → Feedback.**
Ziel ist Kopfhören (das Zeichen als Klang erkennen), nicht das Abzählen von Punkten
und Strichen. Läuft vollständig lokal, ohne Konto, ohne Server.

## 2. Produktphilosophie (nicht verhandelbar)

1. **Timing ist heilig.** Morse *ist* Timing. Ein um 30 ms verrutschtes dit macht aus
   korrektem Code eine falsche Lektion. Töne werden nie von einem Timer ausgelöst,
   sondern auf der Uhr des AudioContext geplant.
2. **Kopfhören vor Dekodieren.** Kein Feature, das zum Mitzählen von Elementen einlädt.
   Deshalb auch: keine Live-Visualisierung von Punkten/Strichen während des Hörens.
3. **Farnsworth von Anfang an.** Zeichen immer in ihrem endgültigen Tempo, gestreckt
   wird nur die Pause. Wer Zeichen langsam lernt, muss sie später umlernen.
4. **Lernen vor Punktzahl.** Hebt ein Feature eine Zahl, ohne das Können zu heben,
   fliegt es raus.
5. **Lokal, ohne Konto — in V1.** Alles funktioniert offline und ohne Anmeldung.
   Keine Cookies, keine Third-Party-Analytics, kein Ad-Tech. Die Architektur bleibt
   dabei accountfähig: eine spätere Freemium-Option ist eine bewusst offene Tür,
   kein Widerspruch. Also nichts bauen, das einen Account *voraussetzt* — und nichts,
   das einen später unmöglich macht.
6. **Wissenschaftliche Ehrlichkeit.** Ist eine Metrik ein Näherungswert, wird sie in
   der UI als solcher benannt. Jede Zahl auf dem Bildschirm ist eine Behauptung.
7. **Barrierefreiheit von vorn**, nicht als Folge-Ticket. Ein Audio-Trainer braucht
   dafür besondere Sorgfalt: jede Hörübung braucht eine selbstgesteuerte Variante.
8. **Schön, aber zurückhaltend.** Kein Konfetti. Beschlossen ist ein **Streak mit
   Freeze-Gnade**: er zeigt Kontinuität und verzeiht Aussetzer, statt sie zu bestrafen
   (SDT-konform). Der Geist von „keine Streak-Erpressung" bleibt — kein Druckaufbau,
   kein Fortschritt, der als Druckmittel verloren geht.
9. **Design-Richtung „Ruhe" — führend ist die Marken-Richtlinie.**
   Verbindlich ist
   [`docs/brand/Morse_Lab_Brand_Guidelines_1.1.html`](./docs/brand/Morse_Lab_Brand_Guidelines_1.1.html)
   (**1.1 führt**); [`docs/CI.md`](./docs/CI.md) ist die deutsche Kurzfassung und
   im Zweifel nachrangig.

   Farben ausschließlich über die Tokens in `src/styles.css` (`paper`, `ink`,
   `amber`, `gray`, `edge`, `edge-soft`, `card` — 1.1 §13). **Keine weitere Farbe
   ohne dokumentierte Entscheidung**, und kein Farbliteral außerhalb der
   Token-Definition. **Amber nie zweimal in einer View.** Typografie: Display
   „Newsreader" (Serif), UI „IBM Plex Sans", beide mit Fallback-Stack, nichts
   fetter als 600. Keine Verläufe, kein Konfetti, keine Emojis, keine Schatten.
   Light-first.

   **Drei Addenda von Fable haben Vorrang vor 1.1** (Notion-Log #41):

   - **(a) Kein Live-Sync im Standard-Hörtraining.** Der „visuelle Zwilling" aus
     1.1 §12 wird im normalen Hörtraining **nicht** gebaut — er widerspräche
     Punkt 2.2 oben. Er kommt später als opt-in-Modus „Visual practice".
     **Jetzt nicht bauen.**
   - **(b) `#92400e`** steht nicht im Token-Block von 1.1, bleibt aber als
     **interner hover/active-Shade von Amber** — nie als eigenständige Fläche.
   - **(c) Der Play-Kreis bleibt während der Wiedergabe bedienbar** (Replay),
     auch wenn 1.1 §7 nur die Füllung beschreibt.
10. **EN-first.** Alle UI-Strings sind Englisch. Deutsch folgt später als eigene
   i18n-Entscheidung — bis dahin nichts dafür vorbauen.

Konzept, Recherche und Entscheidungslog liegen im Notion-Projekt des Nutzers;
Änderungen an Produktentscheidungen dort klären, nicht hier erfinden.

Widerspricht eine Aufgabe diesem Abschnitt: anhalten und den Konflikt melden.
Nicht still auflösen.

## 3. Repo-Fakten

- **Stack:** Vite + React + TypeScript (`strict`). Kein Framework darüber hinaus.
- **Tests:** `npm test` (Vitest). `npm run build` typprüft und baut.
- **Layout:**
  - `src/engine/` — Alphabet, Farnsworth-Timing, Zeitachse. **DOM-frei, rein, testbar.**
  - `src/audio/` — Web-Audio-Wiedergabe. Kennt die Engine, nicht die UI.
  - `src/ui/` — React-Komponenten. Rendern Zustand, enthalten keine Logik.
- **Abhängigkeiten:** möglichst null neue. Jede neue braucht eine Begründung im PR.

## 4. Architekturregeln

- **Engine ohne DOM.** Timing, Bewertung und Adaption sind reine Funktionen und
  ohne Browser testbar. Keine Ausnahme.
- **UI ohne Fachlogik.** Komponenten rendern und melden Ereignisse.
- **Wiedergabe rechnet nicht.** Der Player spielt eine fertige Zeitachse ab; er
  entscheidet nicht, was wie lang ist.
- **Verallgemeinern beim zweiten Bedarf, nicht beim ersten.** Doppelter Code ist
  hier besser als eine spekulative Abstraktion.
- **Persistenz verliert keine Nutzerdaten.** Neue Felder additiv mit Default, nicht
  über eine neu erfundene Versionierung.

## 5. Arbeitsweise

Disziplin beim Umfang ist die wichtigste Regel hier.

- Genau die Aufgabe umsetzen. Nichts darüber hinaus.
- Fällt unterwegs ein fremdes Problem auf: nach `FINDINGS.md` schreiben, weiterarbeiten.
  Nicht mitreparieren.
- **Nie über die Aufgabe hinaus refaktorieren.** Geht es wirklich nicht anders:
  anhalten, den nötigen Umbau beschreiben, Freigabe abwarten. Ein Refactor ist
  eine eigene Aufgabe.
- Ist die Aufgabe unklar: fragen, **bevor** Code entsteht.

Rhythmus pro Aufgabe: nur die betroffenen Dateien lesen → kurzer Plan → umsetzen →
Tests und Doku → Selbstprüfung gegen die Akzeptanzkriterien, Punkt für Punkt.

## 6. Barrierefreiheit

- WCAG 2.1 AA, wo praktikabel.
- **Nie Farbe allein** für richtig/falsch — immer zusätzlich Form, Gewicht oder Symbol.
- `prefers-reduced-motion` respektieren.
- **Jede zeitgesteuerte Darbietung braucht eine selbstgesteuerte Alternative.**
- Wer nicht hören kann, muss klar erfahren, dass ein Modus auditiv ist — und warum.
- Fokus bei Moduswechsel korrekt setzen, Zustandsänderungen über `aria-live="polite"`.

## 7. Leistungsbudget

Messen, nicht annehmen.

- **Ton-Timing: Abweichung < 1 ms.** Deshalb Audio-Uhr statt Timer.
- Eingabe-zu-Anzeige während einer Übung: < 16 ms.
- Kein unbegrenztes Speicherwachstum über eine 30-Minuten-Sitzung.
- Bundle-Delta im PR nennen.

Schwere Rechnung läuft nie auf dem Eingabepfad: am Ende einer Übung, in
`requestIdleCallback` (mit `setTimeout`-Rückfall, Safari ist hier unzuverlässig)
oder in einem Worker.

## 8. Tests

- **Unit** für alles in `src/engine/` — inklusive fixture-basierter Fälle, wo die
  Logik subtil ist (Timing, Segmentierung, Schwellen).
- **Referenzwerte statt Selbstbestätigung:** wo ein Standard existiert (ARRL), wird
  gegen dessen Zahlen geprüft, nicht gegen die eigene Implementierung.
- **Regression:** bestehende Modi und Statistiken bleiben unberührt. Belegen.

## 9. Definition of Done

1. Jedes Akzeptanzkriterium erfüllt und einzeln bestätigt.
2. `npm test` und `npm run build` grün.
3. Timing-Budget geprüft.
4. Doku und Changelog aktuell.
5. Keine unbeteiligten Dateien geändert.

"Veröffentlicht" gehört nicht zu Done. Release ist eine menschliche Entscheidung.
