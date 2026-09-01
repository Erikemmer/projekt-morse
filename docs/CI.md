> **Rangfolge.** Führend ist
> [`docs/brand/Morse_Lab_Brand_Guidelines_1.1.html`](./brand/Morse_Lab_Brand_Guidelines_1.1.html)
> (Version 1.1, September 2026). Diese Datei ist die **deutsche Kurzfassung**;
> wo beide sich unterscheiden, gilt 1.1. Die Kurzfassung stammt aus der Zeit vor
> 1.1 und ist an drei Stellen überholt — sie steht hier unverändert als
> Zeitdokument, nicht als Anweisung:
>
> - **Tokens** (§2): die Namen sind auf 1.1 migriert — `accent`→`amber`,
>   `muted`→`gray`, `line`→`edge`, `line-soft`→`edge-soft`, dazu `card`. Werte
>   und Rollen siehe 1.1 §13.
> - **Logo** (§1): die Bildmarke ist nicht mehr dit-dah, sondern **der
>   Morsetaster** (1.1 §3).
> - **Klang** (§5): die Rampe liegt bei **8 ms**, nicht 5 ms (1.1 §10).
>
> **Drei Addenda von Fable haben Vorrang vor 1.1** (Notion-Log #41):
>
> **(a) Kein Live-Sync im Standard-Hörtraining.** Der „visuelle Zwilling" aus
> 1.1 §12 — Code, der im Takt des Tons aufleuchtet — wird im normalen
> Hörtraining **nicht** gebaut. Er widerspräche CLAUDE.md §2.2 (Kopfhören vor
> Dekodieren): wer mitlesen kann, zählt Elemente statt zu hören. Er kommt
> später als **opt-in-Modus „Visual practice"**, der die Barrierefreiheits-
> Zusage aus §12 einlöst, ohne den Standardweg zu beschädigen. **Jetzt nicht
> bauen.**
>
> **(b) `#92400e` bleibt.** Der Ton steht nicht im Token-Block von 1.1 §13. Er
> ist auch keine fünfte Marken-Farbe, sondern der **interne hover/active-Shade
> von Amber** — er erscheint nie als eigenständige Fläche.
>
> **(c) Der Play-Kreis bleibt während der Wiedergabe bedienbar.** 1.1 §7
> beschreibt nur die Füllung; ein Ton muss jederzeit wiederholt werden können,
> ohne auf sein Ende zu warten.

# CI — Morse Lab

Verbindliche Gestaltungsrichtlinie für alles, was unter dem Namen **Morse Lab** erscheint — App, Website, Screenshots, Store-Einträge, Kommunikation. Quelle der Wahrheit ist das Notion-Projekt (Seite „CI — Morse Lab"); diese Datei ist die Repo-Kopie. Änderungen nur über das Entscheidungslog. Stand: 01.09.2026, basiert auf der gewählten Design-Richtung „Ruhe" und den implementierten Tokens.

## 1. Marke

- **Name:** Morse Lab · **Domain:** morse-lab.com · Schreibweise immer zwei Wörter, beide groß (nie „MorseLab" oder „morselab").
- **Markenkern:** Lernen als konzentriertes Ritual. Ruhig, präzise, wissenschaftlich ehrlich, warm. Das „Lab" steht für den evidenzbasierten Anspruch: jede Behauptung hat eine Quelle, jede Metrik wird ehrlich benannt.
- **Positionierung:** Das schöne, moderne Morse-Hörtraining für Einsteiger — die unbesetzte Lücke „LCWO-Didaktik × zeitgemäße UX".
- **Logo:** Wortmarke „Morse Lab" in Newsreader (Medium 500). Bildmarke: dit-dah (·− = „A") in Accent auf Papier — existiert bereits als App-Icon und Favicon. Keine weiteren Logo-Varianten ohne Entscheidung.

## 2. Farben

Alle Farben kommen aus diesen Tokens — **keine neue Farbe ohne dokumentierte Entscheidung**, kein Farbliteral außerhalb der Token-Definition.

| Token | Wert | Rolle |
|---|---|---|
| `paper` | `#f6f1e8` | Grundfläche (warmes Papier), Hintergrund von allem |
| `ink` | `#221d16` | Text, Konturen, Morse-Formen (≈ 15:1 auf paper) |
| `accent` | `#b45309` | der EINE Akzent (Amber): Fortschritt, Hervorhebung, Richtig-Markierung, Links |
| `accent-deep` | `#92400e` | Hover/Aktiv des Akzents |
| `muted` | `#6f6455` | Sekundärtext (≈ 5,1:1, WCAG AA) |
| `line` | `#d8cfc0` | Ränder |
| `line-soft` | `#e3dac9` | Tracks, Flächenlinien |

Akzent sparsam: wenn zwei Dinge auf einem Screen amber sind, ist eines zu viel. Dark-Set: in Ruhe-Werten vorbereitet, nicht scharf geschaltet; die „Funkraum"-Signalästhetik bleibt Kandidatin für einen späteren Dark Mode.

## 3. Typografie

- **Display: Newsreader** (Serif, variabel, 400–600) — Headlines, Fragen, Buchstaben auf Karten und Antwort-Buttons. Fallback: Georgia, serif.
- **UI: IBM Plex Sans** (400–600) — alles andere. Fallback: system-ui, sans-serif.
- Beide selbst gehostet (woff2, OFL). Nie mehr als diese zwei Familien; nichts fetter als 600.
- Rhythmus (Referenzwerte aus der App): Eyebrows/Meta 12 px Kapitälchen mit 0.14–0.18 em Sperrung in muted · Fließ-/Fußtext 13–16 px Plex Sans · Fragen 26 px Newsreader 500, Zeilenhöhe 1.3 · Lernkarten-Buchstabe ~64 px Newsreader.

## 4. Form & Komponenten

- **Linien statt Flächen:** Buttons und Karten sind umrandet (1–1,5 px), nicht gefüllt. Keine Schatten, keine Verläufe, keine Karten-Stapel.
- Radius 10 px für Buttons/Felder; der Play-Button ist ein Kreis (88 px, 1,5 px ink-Rand, ink-Dreieck).
- Fortschritt ist eine 2-px-Linie (Track line-soft, Füllung accent) — nie ein dicker Balken.
- **Morse-Formen:** Punkt = 16-px-Kreis, Strich = 52×16-px-Pille (Radius 8), Lücke 14 px, in ink; Hervorhebung einzelner Elemente in accent nur mit begründeter Regel.
- Antwort-Gitter: 3 Spalten, 12 px Abstand, 60 px Höhe, Newsreader-Buchstaben. Trefferzustand nie über Farbe allein (Symbol/Form dazu).
- Ikonografie: stroke-basierte Inline-SVGs im 16/20/24er-Raster. **Keine Emojis, nirgends.**
- Weißraum ist ein Gestaltungsmittel: lieber leerer als voller. Mobile-first, eine zentrierte Spalte ~390 px.

## 5. Klang (Teil der Marke)

Der Ton IST Morse Lab: 620-Hz-Sinus, 5-ms-Rampen (kein Klick, kein Pling), Zeichen immer in voller Geschwindigkeit (20 WPM), Farnsworth-Pausen. Keine UI-Sounds, keine Erfolgs-Fanfaren — der einzige Klang der App ist Morse. Später bewusste Variabilität (500–800 Hz, HVPT) als Lernprinzip.

## 6. Sprache & Ton (Voice)

- EN-first; Deutsch folgt als eigene i18n-Entscheidung.
- Ruhig, präzise, zweite Person, kurze Sätze. Keine Ausrufezeichen-Kaskaden, kein Hype-Vokabular, kein Schuldton („Starting fresh." statt „Streak verloren!").
- Wissenschaftlich ehrlich: Näherungswerte werden als solche benannt; keine Zahl ohne Bedeutung.
- Beispiele im Ziel-Ton: „Listen closely." · „This is K." · „Not quite — that was S." · „The set grows: P joins from the next round." · „Works offline once loaded."

## 7. Don'ts

Konfetti · Verläufe · Emojis · Punkte/Badges ohne Kompetenzbezug · mitlaufende Uhren/Countdowns · Streak-Druck · mehr als ein Akzent pro Screen · gefüllte Riesen-Buttons · tap-r-Look · Dark Patterns jeder Art · Third-Party-Abrufe (Fonts/Assets bleiben im Haus).

## 8. Anwendung außerhalb der App

Website/Landingpage, Screenshots und Store-Material folgen denselben Tokens und derselben Stimme. Referenz-Screens: das Design-Canvas („Projekt Morse UI", Artefakt) und docs/screenshots/ im Repo. Für Print/Großfläche gilt: Newsreader-Headline, viel Papier, ein Amber-Element, dit-dah-Bildmarke.
