# FINDINGS

Nebenbefunde, die *nicht* zur jeweiligen Aufgabe gehörten und deshalb bewusst nicht
mitrepariert wurden (CLAUDE.md §5). Jeder Eintrag: was, warum es zählt, was es kosten
würde. Nichts hier ist eine Zusage.

---

## 1. `--muted` auf `--paper` erreicht 3,5:1 — zu wenig für kleinen Text

**Status: entschieden und behoben** (31.08.2026, Nutzerentscheidung nach dem
Fable-Review): `--muted` ist jetzt `#6f6455` — **5,1:1** auf `--paper`, damit
besteht auch kleiner Sekundärtext WCAG AA. Der Rest des Eintrags bleibt als
Begründung stehen.

**Gefunden:** 31.08.2026, beim Einziehen der Design-Richtung „Ruhe".

`--muted: #8a7f6d` auf `--paper: #f6f1e8` ergibt ein Kontrastverhältnis von rund
**3,5:1**. Das genügt WCAG 2.1 AA für großen Text (≥ 24 px bzw. ≥ 18,66 px fett) und
für Nicht-Text, **nicht** aber für normalen Fließtext (4,5:1 gefordert).

Zum Vergleich, gegen dasselbe Papier: `--ink` ≈ 15:1, `--accent-deep` ≈ 6,4:1,
`--accent` ≈ 4,5:1 (gerade eben bestanden).

**Vorläufiger Umgang:** Sekundärtext in `--muted` steht nicht unter 1 rem, und keine
Information hängt allein an ihm. Das ist eine Vermeidung, keine Lösung.

**Was es kosten würde:** Ein dunkleres `muted` (Richtung `#6f6455`, ≈ 5,3:1) wäre ein
Einzeiler — aber die Palette ist eine Nutzerentscheidung aus dem Mockup, und
CLAUDE.md §2.9 verbietet neue Farbwerte ohne dokumentierte Entscheidung. Gehört
deshalb dem Nutzer, nicht dem nächsten Commit.

## 2. Google Fonts ist ein Third-Party-Abruf

**Status: entschieden und behoben** (31.08.2026, mit der PWA-Entscheidung aus dem
Konzept): Newsreader und IBM Plex Sans liegen jetzt als woff2 im Repo
(`src/fonts/`, latin-Subset, SIL-OFL-Lizenzen daneben). Der Google-Fonts-Link ist
raus; es gibt keinen Fremdabruf mehr, und offline sieht die App aus wie entworfen.
Der Rest des Eintrags bleibt als Begründung stehen.

**Gefunden:** 31.08.2026, gleiche Aufgabe.

Newsreader und IBM Plex Sans kommen per `<link>` von `fonts.googleapis.com` /
`fonts.gstatic.com` (so in der Übergabe vorgegeben). Das ist keine Analytics und kein
Ad-Tech, verletzt CLAUDE.md §2.5 also nicht wörtlich — aber es ist ein Abruf bei
einem Dritten, und ohne Netz sieht die App anders aus als entworfen (die
Fallback-Stacks greifen, es bricht nichts).

**Beobachtet:** Im Entwicklungscontainer schlägt der Abruf tatsächlich fehl
(`ERR_CONNECTION_RESET`). Die Seite bleibt heil und rendert in Georgia — der Fallback
tut also, was er soll. Ein Screenshot aus dieser Umgebung zeigt aber nicht die
entworfene Typografie.

**Was es kosten würde:** Selbsthosten der beiden Familien als woff2 im Repo. Etwa
100–200 kB statische Assets, dafür offline identisch und ohne Fremdabruf. Kleine
Aufgabe, aber eine eigene.

## 3. Weitere Maße neben den Guidelines — beim Umsetzen von Review 6 gesehen

**Status: entschieden und behoben** (01.09.2026, Review 7, Notion-Log #46):
Muster-Lücke 14 → 16 px (1 u), Primär-CTAs 60 → 64 px (eine Formfamilie mit
den Antworttasten), die 28er auf die Skala geschnappt (Shell-Unterkante und
Fußzeile 24, Lernkarten-Blockabstand 32 — identisch mit `.stage`, die eigene
Regel ist weg). Die **6-px-Punkte-Lücke bleibt absichtlich**: die Skala regelt
Layout, nicht Mikro-Ornamente; der Kommentar steht an der Stelle. Der Rest des
Eintrags bleibt als Begründung stehen.

**Gefunden:** 01.09.2026, beim Einziehen der Metrik-Fixes aus Review 6 (#43).
Die vier gerulten Fixes sind umgesetzt; dabei fielen benachbarte Maße auf, die
ebenfalls neben 1.1 §6/§8 liegen, aber **nicht** geregelt wurden — deshalb hier
statt still mitrepariert (CLAUDE.md §5):

- **Muster-Lücke 14 px** (`.pattern-row` gap): §8 sagt „gap within a character
  1 u" — bei u = 16 wären das 16 px. Dieselbe Sorte Abweichung wie der
  52er-Strich, nur nicht im Ruling genannt.
- **Primär-CTAs 60 px hoch** (`.button-go`, `.button-begin`, `.intro-next`):
  60 steht nicht auf der §6-Skala; die Antworttasten wurden auf 64 geregelt,
  die CTAs nicht. (`.button-next` folgt den Antworttasten, weil sein eigener
  Kommentar „dieselbe Form wie eine Antwort" verspricht und er mit dem Gitter
  in einer View steht.)
- **Diverse 28er:** `.shell` padding-bottom, `.footer` margin-top,
  `.learn-stage` gap. 28 liegt zwischen 24 und 32.
- **Punkte-Lücke 6 px** (`.dots` gap) — zwischen 4 und 8, falls die Skala auch
  für solche Kleinstmaße gelten soll.

**Was es kosten würde:** je ein Einzeiler. Es sind Design-Entscheidungen
(Fable), keine technischen — gehören ins nächste Review, nicht in diesen Commit.

## 4. `→` (U+2192) fehlt in allen vier selbstgehosteten Schriftschnitten

**Status: teils behoben, teils entschieden: bleibt** (04.10.2026, Runde P14;
Owner-Delegation von D1). Der Pfeil der **Fußzeile** („10 → 11 wpm“, Plex) steht
jetzt im IBM-Plex-Subset und kommt aus der Markenschrift. Der Pfeil der
**Learn-CTA** (Newsreader, 14 Seiten) **bleibt Fallback** (Weg C): Newsreader hat
ihn auch upstream nicht, und der Text ist Fables (CLAUDE.md §3), also
byte-identisch. `verify:fonts` führt diese Stelle als `ACCEPTED_FALLBACK` und
meldet sie in jedem Lauf. Der Ursprungstext bleibt als Begründung stehen.

**Gefunden:** 02.09.2026, beim Bauen des Learn-Bereichs.

Die CTA-Zeile aller 14 Learn-Seiten heißt „Start hearing it → Open Morse Lab"
bzw. „Fang an zu hören → Morse Lab öffnen". Der Pfeil steht in keinem der vier
woff2-Subsets in `src/fonts/` — geprüft über die cmap-Tabellen; alle anderen
Zeichen der Inhalte (inklusive `·`, `−` U+2212, `„`, Umlaute) sind drin. Der
Browser holt den Pfeil deshalb aus dem Fallback-Stack.

**Folge:** sichtbar, aber nicht aus derselben Familie — auf dem Prüfrechner
kommt er aus DejaVu Sans. Auf iOS, Android, Windows und macOS existiert das
Zeichen überall, es bricht also nichts; nur die Zeichnung passt nicht exakt
zur Wortmarke daneben.

**Was es kosten würde:** die beiden Familien mit U+2192 im Subset neu erzeugen
(latin-Subset plus dieses eine Zeichen). Das sind die Marken-Schriftdateien —
Sache des Design-Owners, kein Einzeiler unterwegs. Alternative ohne neue
Dateien: den Pfeil in der CTA durch eine Form ersetzen. Das wäre eine Änderung
an Fables Text und deshalb ausdrücklich nicht hier entschieden.

**Nachtrag 02.09.2026 (Runde F2): der Pfeil steht jetzt auch in der App.** Die
Fußzeile zeigt im Moment einer Tempo-Stufe `10 → 11 wpm` — so wörtlich in
Ruling #83, B.11 vorgegeben. Er kommt dort aus demselben Fallback wie auf den
Learn-Seiten; ein anderer Wortlaut wäre eine Abweichung von der Vorgabe und
gehört Fable, nicht diesem Commit. Die Zeile steht in `--gray` bei 13 px, der
Unterschied ist entsprechend klein.

## 5. Die Morse-Muster der Alphabet-Tabelle sind für Screenreader Satzzeichen — BEHOBEN (P16, Owner-Delegation D2)

**Gefunden:** 02.09.2026, gleiche Aufgabe.

Die Alphabet-Tabelle liefert die Muster als Text mit `·` (U+00B7) und `−`
(U+2212) — so gibt es CONCEPT-LEARN §5 vor („als Text mit · und − in ink,
Monospace unnötig"). Vorgelesen wird daraus im besten Fall „A Mittelpunkt
Minus", und bei der verbreiteten Einstellung *Satzzeichen: keine* gar nichts:
die Zelle heißt dann nur noch „A".

**Warum es hier nicht behoben wurde:** die App kennt die Lösung schon —
`spellPattern` in `src/ui/Pattern.tsx` macht daraus „dit dah" für
Screenreader. Für die Tabelle hieße das, in jede Zelle einen unsichtbaren
Zusatztext zu generieren. Das ist keine Umformulierung, aber es ist Text, den
Fable nicht geschrieben hat, in Inhalten, die laut Aufgabe unverändert
bleiben. Deshalb Bericht statt Eingriff (CLAUDE.md §5, §2.9).

**Was es kosten würde:** rund zehn Zeilen im Generator: Zellen der Form
`**X** ·−` erkennen und das Muster zusätzlich als `<span class="visually-hidden">`
in der vorgelesenen Form ausgeben. Braucht eine Freigabe von Fable, weil es
den vorgelesenen Inhalt der Seite ändert.

**Status: behoben** (04.10.2026, Runde P16, Owner-Delegation D2 — kein
Fable-Ruling). Der Umfang war größer als hier geschätzt: **44 Stellen je
Sprache** (36 Zellen, 5 reine Code-Zellen, 3 im Fließtext), nicht 36. Der
Generator markiert sie (`aria-hidden` + `.visually-hidden` „dit dah“, EN und
DE), `content/learn/` ist byte-identisch; `verify:learn` zählt 88 Stellen aus
dem Quelltext. Accessibility-Tree: Zelle `A ·−` → `A dit dah`. **Offen:** H3 (was
ein Screenreader daraus macht) und die Fließtext-Zeilen mit Subpixel-
Abweichung im Pixelvergleich (Tabellen: 0) — Einzelheiten `docs/PLAN-FINDINGS.md`, B2.

**Entscheidungsvorlage B2-Pixeldiff (Runde P22, gemessen, nichts entschieden).**
Frage: die Fließtext-Stellen (3 je Sprache: R `(·−·)` und SOS auf der Alphabet-Seite,
SOS auf der Geschichts-Seite) **so lassen** oder **nicht markieren**? Messung
`tools/prep/pattern-pixeldiff.mjs`: je vier Seiten (EN/DE, Alphabet/Geschichte) bei
390×844 und 1440×900 (8 Bilder, volle Seite, dpr 1) in drei Varianten — A wie
ausgeliefert, B Fließtext bloß/Tabellen markiert, C alles bloß (Stand vor B2).

| Vergleich | Ergebnis |
|---|---|
| **B–C** (Tabellen markiert) | **0 Pixel in allen 8 Bildern** — die 82 Tabellen-Stellen (41 je Sprache) kosten nichts |
| **A–C** (Fließtext markiert) | 4 von 8 Bildern weichen ab: EN Alphabet 390 = 63 px; DE Alphabet 390 = 147 px, 1440 = 253 px; DE Geschichte 1440 = 215 px. Je 9–16 Pixelzeilen (eine Textzeile), max. Kanalunterschied 59–60 von 255 (Kantenglättung), **Seitenhöhe in allen 8 Bildern identisch**, Anteil 0,005–0,011 % der Fläche |
| A–B | identisch zu A–C (die Abweichung stammt allein aus den Fließtext-Stellen) |

Vier der acht Bilder (EN Geschichte 390 und 1440, DE Geschichte 390, EN Alphabet 1440) sind
auch markiert pixelgleich; die Abweichung hängt von Zeilenumbruch und Schriftlauf ab, nicht
vom Inhalt. Sie ist **Subpixel-Positionierung des Rests der Zeile**, kein Umbruch, keine
Höhenänderung, keine Farbe. Die Zählung weicht von P16 („8 von 16 Bildern“) ab: P16 zählte
andere Bilder; hier gilt nur diese Messung.

| Option | Wirkung | Preis |
|---|---|---|
| **1 — So lassen** (Empfehlung des Messenden) | Wie ausgeliefert. Sichtbar: eine Kantenglättung an einer Zeile, kein Leser sieht 60/255 an Glyphenkanten. | Nichts; die Seite bleibt für Screenreader stimmig. |
| **2 — Fließtext nicht markieren** | Pixel wie vor B2 (B–C = 0). 6 Stellen (3 je Sprache) wieder bloß: im Baum `·−·`/`···` als Satzzeichen. | Genau die Stellen, an denen die Seite das Muster **erklärt** (R, SOS), sind für Screenreader wieder stumm oder „Mittelpunkt/Minus“ (§6; H3 offen). Dazu eine Sonderregel im Generator und im `verify:learn` (88 → 82 Stellen). |

Zu wiegen: ein nicht wahrnehmbarer Pixelunterschied (Option 1) gegen eine
Barrierefreiheits-Lücke (Option 2). Die Messung spricht nicht für 2. **Das ist eine
Produktentscheidung (Owner/Fable);** weder Generator noch `verify:learn` noch
`content/learn/` wurden berührt.

## 6. Zwei weitere Flächen tragen dieselbe wachsende Liste im Dreier-Gitter — Punkt 2 BEHOBEN (Ruling #110), Punkt 1 BEHOBEN (P15)

**Status Punkt 1: entschieden und behoben** (04.10.2026, Runde P15;
Owner-Delegation von D3, kein Fable-Ruling). Der Echo-Check zeigt ab 13
Optionen das ortsfeste 36-Plätze-Tastenfeld (`.keypad`, Nicht-Pool-Tasten
gedimmt, „ — not in this round“); „aktiv“ = die Optionen des Checks. Nachgemessen:
Seite = Fenster bei 390 × 844, 1280 × 720 und 1440 × 900, mit 15 **und** 36
Zeichen (vorher bis +587 px). Tasten 50 × 46 / 44 × 44 — ob das am Telefon
trägt, ist H9 und nicht geprüft. Der Ursprungstext unten bleibt stehen.

**Gefunden:** 02.09.2026, beim Umsetzen von Ruling #75 (das feste Tastenfeld im
Training).

Das Antwort-Gitter des Trainings hat ab 13 aktiven Zeichen jetzt ein festes
Tastenfeld (`src/ui/keypad.ts`). **Zwei andere Flächen benutzen dieselbe
`.answers`-Klasse und wachsen weiter mit:**

1. **Der Echo-Check des Lernmodus** (`src/ui/Learn.tsx`, `Echo`). Ruling #75
   Punkt 3 lässt ihn ausdrücklich in Ruhe — „dort sind es bewusst wenige
   Optionen". Das gilt am Anfang: `answerPool` (`src/engine/learn.ts`) bietet
   **alles bisher Eingeführte** an, und das ist irgendwann alles. Gemessen
   (headless Chromium, 390 × 844): bei 15 eingeführten Zeichen 15 Optionen, bei
   36 sind es **36 Optionen und eine 1311 px hohe Seite**.
2. ~~**„Learn the sounds"** (`ReviewPicker`, dieselbe Datei) listet alle aktiven
   Zeichen. Bei 36 sind das **36 Tasten und 1223 px** — die Liste ist dort
   allerdings ein Auswahlmenü und keine Antwortfläche, es wird keine
   Reaktionszeit daran gemessen.~~ — **behoben, Ruling Notion-Log #110.**
   „Learn the sounds" zeigt jetzt ohnehin immer alle 36 Zeichen (nicht mehr
   nur die aktiven) und musste dafür auf das Tastenfeld-Raster wechseln
   (`.keypad` statt `.answers`, sechs statt drei Spalten) — genau der Umbau,
   den dieser Fund schon 02.09. als „wenig, und genau deshalb eine
   Entscheidung" beschrieben hatte. Nachgemessen (headless Chromium):
   **844 px bei 390 × 844, 720 px bei 1280 × 720, 900 px bei 1440 × 900** —
   kein Scrollen mehr, in keiner der drei Breiten.

**Warum es zählt:** Für den Echo-Check ist es der Kern des Rulings — dieselbe
wandernde Taste, dieselbe mitgemessene Suchzeit. Der Unterschied ist, dass der
Echo-Check die Statistik nicht anfasst (`learn.ts`: „Der Echo-Check fasst die
Statistik nicht an"), die verschobene Suche also keine Zahl verfälscht. Sie
kostet nur die Übung: wer im Training an feste Positionen gewöhnt ist, greift
im Echo-Check ins Leere. Bei „Learn the sounds" geht es allein um das Scrollen.

**Vorläufiger Umgang (Punkt 1, weiterhin offen):** unverändert gelassen. Das
Ruling nennt die Echo-Checks namentlich als unberührt (CLAUDE.md 5: nicht
mitreparieren) — dabei bleibt es auch in dieser Runde, sie stand nicht im
Auftrag.

**Was es kosten würde:** wenig, wie Punkt 2 jetzt belegt (derselbe Umbau, eine
Runde später erledigt). Der Echo-Check bräuchte dieselben zwei Zeilen wie
`ReviewPicker` jetzt schon hat — die Klasse `keypad`, `data-active` je
Zugehörigkeit. Zusätzlich zu entscheiden waere, was „aktiv" dort heißt: die
Optionen des Checks oder der ganze aktive Satz. **Gehört Fable, nicht dem
nächsten Commit.**

## 7. Der Start-Screen scrollt, sobald das Tastenfeld gilt — BEHOBEN (Ruling #98)

**Status: entschieden und behoben** (Runde D1, Ruling Notion-Log #98): eine
Tastenhöhe für alle Modi (46 px), Abstand über dem Tastenfeld 32 → 24 px; kein
Zustand überschreitet 844 px bei 390 × 844. Der Ursprungstext bleibt stehen.

**Gefunden:** 02.09.2026, beim Vermessen des Wort-Screens (Runde F2). **Nicht
neu und nicht von dieser Runde** — auf `main` (66d0af4) genauso gemessen.
**Übersprungen, ohne es zu sagen:** Der Auftrag zu Runde D1 verlangte für
diesen Punkt ausdrücklich Ursache messen, nennen, beheben — oder anhalten und
melden. Keins von beidem ist in D1 passiert; der Punkt fehlte im Report, in
§3m, in §4 und hier. Das war der eine Prozessfehler der Runde, nicht dieser
Befund selbst — festgehalten in HANDOVER §3n.

**Die ursprüngliche Diagnose war falsch.** Sie lautete „ab 36 aktiven
Zeichen" — nachgemessen (Review 16, Fable) kommen bei 390 × 844 aber **exakt
890 px heraus, egal ob 15 oder 36 Zeichen aktiv sind.** Die Zeichenzahl war
nie die Ursache. Zwei Dinge sind konstant, sobald das Tastenfeld überhaupt
gilt (ab `KEYPAD_MIN_CHARACTERS = 13`):

1. **Das Tastenfeld hat immer sieben Reihen** — alle 36 Positionen stehen
   immer da (A–F, G–L, M–R, S–X, Y–Z, 0–5, 6–9; Ziffern beginnen eine eigene
   Reihe, `KEYPAD_ROW_BREAK`), unabhängig davon, wie viele davon aktiv sind.
2. **Der Start-Screen zeigt zusätzlich die App-Kopfzeile** (44 px plus 24 px
   Abstand) — anders als mitten in einer Sitzung, wo sie nicht dasteht.

890 px minus diese 68 px Kopfzeile ergibt 822 — genau die Größenordnung, in
der auch der Antwort-Zustand ohne Kopfzeile lag. Das ist die eigentliche
Rechnung hinter der Zahl, nicht die Zeichenzahl.

**Warum es hier ursprünglich nicht behoben wurde:** Die Aufgabe der Runde F2
nannte diese Fläche nicht (CLAUDE.md 5), und Ruling #94 löste zunächst nur den
Wort-Screen (46 px Tasten, *nur dort*) — der Start-Screen des Trainings blieb
bei 890 px, weiterhin ungelöst.

**Behoben in Runde D1, per Ruling #98.** Die 52/46-Trennung aus Ruling #94
war die Rechtfertigung einer Zahl, die #94 gebraucht hat, kein eigenständiges
Prinzip — sie löste nur die Hälfte des eigentlichen Problems. Jetzt: **eine
Tastenhöhe für alle Modi, 46 px**, dazu der Abstand über dem Tastenfeld
32 → 24 px. `.keypad-typing` (die CSS-Klasse hinter der alten Trennung) ist
ersatzlos entfernt.

**Nachgemessen (390 × 844, headless Chromium):**

| Zustand | vorher | nachher |
|---|---|---|
| Training, Start-Screen, 15 aktive Zeichen | 890 | **844** |
| Training, Start-Screen, 36 aktive Zeichen | 890 | **844** |
| Training, Ton läuft / Antwort offen / Auflösung | 844 | **844** (unverändert) |
| Wort-Modus, alle Zustände (bereit, Eingabe, Auflösung) | 844 | **844** (unverändert) |
| Wort-Auflösung, worst case (5 von 5 Positionen falsch, über zehn Durchläufe) | 843 (FINDINGS #9) | **844**, natürliche Inhaltskante bei **820 px** — 24 px Luft, unabhängig davon, wie viele Positionen danebenliegen |

Kein Zustand überschreitet 844 px mehr. Die zuvor grenzwertigen Fälle
(Start-Screen, Wort-Auflösung mit vielen Fehlpositionen) haben jetzt
Spielraum statt einer Zahl, die knapp unter dem Limit lag.

## 8. ✓ und ✗ fehlen ebenfalls in allen vier Schriftschnitten

**Status: entschieden und behoben** (04.10.2026, Runde P14; Owner-Delegation von
D1, Weg B). Haken und Kreuz sind kein Schriftzeichen mehr, sondern ein
SVG-Paar (`src/ui/Mark.tsx`) nach Guidelines 1.1 §8: 1,5 px Strich, runde Enden,
24er Raster, nur Linie, Farbe über `currentColor`. Beide aus **einer** Hand, weil
`✗` in keiner Upstream-Schrift steht. Der Ursprungstext bleibt als Begründung
stehen.

**Gefunden:** 02.09.2026, beim Prüfen der cmap-Tabellen für Eintrag 4
(Runde F2). **Nicht neu** — die App benutzt beide Zeichen seit dem ersten
Feedback-Screen.

Geprüft über die cmap-Tabellen der vier woff2-Dateien in `src/fonts/`:
**U+2713 (✓) und U+2717 (✗) sind in keinem der vier Schnitte.** Enthalten sind
dagegen U+2013, U+2014, U+2212 und U+00B7 — die anderen Sonderzeichen der
Oberfläche. Beide Marken kommen also aus dem Fallback-Stack des Systems: im
Feedback des Trainings, im Echo-Check, im Tastenfeld und seit dieser Runde in
der Aufloesung des Wort-Trainings.

**Warum es zählt:** Es bricht nichts — die Zeichen existieren auf allen
Zielplattformen, und keine Information hängt allein an ihnen (CLAUDE.md 6: es
steht immer ein Satz daneben). Aber die Zeichnung wechselt je nach System, und
sie steht direkt neben Newsreader und IBM Plex. Auf Windows sieht ein ✓ anders
aus als auf iOS.

**Was es kosten würde:** dieselbe Rechnung wie bei Eintrag 4 — die Schnitte mit
diesen beiden Codepoints neu subsetten (Sache des Design-Owners), oder die
Marken als kleine Inline-SVG zeichnen, wie das Menü-Icon und der Play-Pfeil es
schon tun (1.1 §8: 24er-Raster, 1,5 px Strich). Der zweite Weg braucht keine
neuen Dateien, ändert aber die Form von Haken und Kreuz — und das ist eine
Gestaltungsfrage. **Gehört Fable.**

## 9. Die Auflösung einer falschen Antwort scrollt weiter — 849 px

**Status: entschieden und behoben** (Runde D1, Ruling Notion-Log #96, Teil C.10;
Nachtrag #98): 843 px, natürliche Inhaltskante 820 px bei fünf Fehlpositionen.
Der Ursprungstext bleibt stehen.

**Gefunden:** 02.09.2026, beim Nachmessen des Wort-Screens für Ruling #94.
**Nicht neu und nicht von diesem Commit** — vorher waren es 891 px, die 46-px-
Tasten haben den Zustand um 42 px verbessert, aber nicht unter 844 gebracht.

Bei 390 × 844, mit Tastenfeld und einer Aufgabe, deren **fünf Positionen alle
daneben** liegen, ist der Wort-Screen **849 px** hoch — er scrollt um 5 px.
Jede verfehlte Position trägt eine dritte Zeile (den getippten Buchstaben
darunter), und das ist genau die Auskunft, um die es dort geht. Alle anderen
Zustände desselben Screens passen seit Ruling #94 (§4 der Übergabe): bereit,
Eingabe leer, Eingabe offen und die Auflösung einer richtigen Antwort messen
844 px.

**Warum es zählt:** In der Übergabe der Runde F3 stand für „Auflösung" 857 px —
gemessen war dort die *richtige* Antwort. Der schlechteste Fall war in keiner
Messung, und ein Maß, das den schlechtesten Fall auslässt, ist ein
Näherungswert, der nicht als solcher benannt ist (CLAUDE.md 2.6). Deshalb steht
er jetzt hier, mit Zahl.

**Warum es hier nicht behoben wurde:** Ruling #94 nennt genau zwei Änderungen,
und beide sind gemacht. Weiter zu beschneiden wäre keine Aufräumarbeit, sondern
eine Gestaltungsentscheidung (CLAUDE.md 5) — und der Auftrag sagt für diesen
Fall ausdrücklich: melden statt schneiden.

**Was es kosten würde:** je eine Zeile, aber je eine Entscheidung. Der Abstand
zwischen Bühne und Antwortzeile (32 px `gap`), der Abstand über dem Tastenfeld
(`margin-top: 32px`) oder die Zeilenhöhe der Auflösungs-Zellen — 6 px an einer
dieser drei Stellen genügen. Alle drei ändern das Bild auch dort, wo nichts
scrollt. **Das Laptop-Layout fasst die Fläche ohnehin an.**

**Behoben in Runde D1 (Ruling Notion-Log #96, Teil C.10).** Die dritte
Option: `.solution-cell` von `gap: 4px` auf `2px`, `.solution-typed` von
`line-height: 1.2` auf `1` — die lokale Lösung, Bühnen-`gap` und
Tastenfeld-Abstand unberührt. Nachgemessen bei 390 × 844, fünf
Fehlpositionen: **843 px** (vorher 849). Alle anderen Zustände desselben
Screens unverändert bei 844 px (Pixeldiff gegen den Stand vor der Runde:
0 Pixel, bis auf zufälligen Inhalt wie Ton-Hz und die gesendete Folge).
[`words-solution-wrong-5-390.png`](./docs/screenshots/words-solution-wrong-5-390.png).

**Nachtrag, selbe Runde D1 (Ruling #98):** Der Tastenfeld-Abstand, hier
bewusst unberührt gelassen, ist über die *allgemeine* Korrektur aus FINDINGS
#7 doch gefallen (32 → 24 px, für alle Zustände, nicht nur diesen). Über zehn
Durchläufe mit fünf Fehlpositionen blieb die natürliche Inhaltskante
durchgehend bei **820 px** — 24 px Luft statt der vorherigen 1 px. Kein
weiterer Handlungsbedarf.

## 10. Die Anschrift in Impressum/Imprint läuft optisch zu einer Zeile zusammen — BEHOBEN

**Status: entschieden und behoben** (03.09.2026, Nutzerentscheidung). Der
Anschriften-Block in `impressum.de.md`/`imprint.en.md` steht jetzt als
`<address>`-Block mit echten `<br>`-Umbrüchen, statt auf vier einfachen
Markdown-Zeilen ohne harten Umbruch. Begründung des Nutzers: zwei
Leerzeichen am Zeilenende sind unsichtbar und gehen beim nächsten Speichern
in einem Editor oder Formatierwerkzeug leicht verloren — `<address>` ist
außerdem das semantisch richtige Element für eine Kontaktanschrift. Im
Generator-Stylesheet (`tools/learn/learn.css`) dazu `address { font-style:
normal; }`, weil Browser `<address>` sonst von sich aus kursivieren.

Nachgemessen im gebauten `dist/de/impressum/index.html`:

```html
<address>
Erik Emmer<br>
Tegernseer Str. 2<br>
83607 Holzkirchen<br>
Deutschland
</address>
```

Vier Zeilen, wie vorgesehen. `datenschutz.de.md`/`privacy.en.md` sind
unverändert — dort steht die Anschrift als ein Satz mit Kommas, und als Satz
ist sie dort richtig. Der Rest des Eintrags bleibt als Beleg der
Ursachenanalyse stehen.

**Gefunden:** 03.09.2026, beim Sichtprüfen der vier neuen Rechtsseiten (Runde L2).

`impressum.de.md` und `imprint.en.md` schreiben die Anschrift auf vier eigene
Zeilen (Name, Straße, PLZ/Ort, Land) — einfache Zeilenumbrüche im Markdown,
ohne zwei Leerzeichen oder `<br>` am Zeilenende. Der Generator (`marked`,
Standardeinstellung, kein `breaks: true`) fasst einfache Zeilenumbrüche
innerhalb eines Absatzes zu Leerzeichen zusammen — Standardverhalten von
Markdown, kein Fehler des Generators. Ausgeliefert steht die Anschrift also
als ein durchlaufender Satz: „Erik Emmer Tegernseer Str. 2 83607 Holzkirchen
Deutschland" statt vier Zeilen. `datenschutz.de.md`/`privacy.en.md` sind davon
nicht betroffen — dort steht die Anschrift ohnehin als ein Satz mit Kommas.

**Warum es hier nicht mitgeändert wurde:** Die Texte gehören dem Konzept-Owner
(CLAUDE.md 3, Ruling L2 Punkt 5) — „kein Umformulieren, kein Kürzen, keine
eigenen Ergänzungen". Zwei Leerzeichen oder ein `<br>` am Zeilenende zu
ergänzen wäre keine Wortänderung, aber eine Entscheidung an einem Rechtstext,
die die Aufgabe nicht ausdrücklich erteilt hat — deshalb hier gemeldet statt
still mitgeändert.

**Was es kosten würde:** vier Zeilenenden mit zwei Leerzeichen (oder `<br>`)
in `impressum.de.md` und `imprint.en.md` — kein Code, nur die zwei
Markdown-Dateien. Eine Zeile Bestätigung genügt.


## 11. `≈` (U+2248) fehlt in allen vier Schriftschnitten — gefunden vom cmap-Check

**Status: entschieden und behoben** (04.10.2026, Runde P14; Owner-Delegation von
D1, Weg A). U+2248 steht im IBM-Plex-Subset (`tools/fonts/add-glyphs.py`);
`KNOWN_GAPS` in `tools/fonts/check.mjs` ist damit leer. Der Ursprungstext bleibt
als Begründung stehen.

**Gefunden:** 03.10.2026, beim ersten Lauf von `npm run verify:fonts` (Runde P11).
**Nicht neu** — vermutlich seit der Sende-Modus die Tempo-Schätzung zeigt.

`src/ui/Send.tsx:390` zeigt nach einem getasteten Versuch `≈ 14 wpm`. U+2248 steht
in keinem der vier woff2-Subsets in `src/fonts/` (cmap geprüft) und kommt deshalb
aus dem Fallback-Stack. Es **steht** in den vollen Upstream-Schriften (IBM Plex
Sans complete, Newsreader variable TTF) — es ist also nur ein Subsetting-Verlust,
keine Lücke der Familie.

**Warum es zählt:** dieselbe Klasse wie #4 und #8, kein Bruch, nur wechselnde
Zeichnung. Die Zeile ist eine Näherungsangabe (CLAUDE.md 2.6), das Zeichen trägt
die Aussage „ungefähr" — der Satz daneben („wpm") nicht allein.

**Was es kosten würde:** gehört in dieselbe Entscheidung wie #4/#8 (D1): beim
Neu-Subsetten ein Codepoint mehr. Bis dahin steht U+2248 mit Verweis auf diesen
Eintrag in `KNOWN_GAPS` von `tools/fonts/check.mjs`; der Check wird rot, sobald
ein Schnitt das Zeichen trägt, und fordert dann das Streichen des Eintrags.

## 12. `verify:amber` lässt nach dem Lauf einen Vorschau-Server stehen

**Status: behoben** (05.10.2026, Runde P19; Ursache und Nachweis siehe #15).
Davor: offen (Stand 04.10.2026, Runde P18; bewusst nicht mitrepariert — eine
fremde Datei, CLAUDE.md §5). Zuletzt bestätigt in P18, siehe #15.

**Gefunden:** 03.10.2026, beim Prüfen der Definition of Done (Runde P11).

Nach `npm run verify:amber` hört weiter ein `vite preview` zu (nach dem Lauf
gezählt: 1 Prozess; nach `verify:keyboard` 0). Es ist derselbe Fehler, den P10 im
Tastatur-Skript behoben hat: der Server wird über `npx`/`.bin` gestartet und
`server.kill()` (`tools/amber/check.mjs:733`, `:833`) trifft nur den Vermittler.
Folge: ein späterer Lauf kann sich unbemerkt an den alten Server hängen, der
noch den alten `dist/` ausliefert.

**Nicht mitrepariert:** eine fremde Datei (CLAUDE.md 5), nicht Teil dieser
Aufgabe. **Was es kosten würde:** der Start direkt über `node` wie in
`tools/keyboard/check.mjs`, wenige Zeilen.

## 13. Der Echo-Check scrollt schon bei 15 Zeichen, wenn das Fenster 1280 × 720 hat

**Gefunden:** 04.10.2026, bei der Messung für B3 (Runde P12).

Finding #6 Punkt 1 nennt den Echo-Check erst bei 36 Optionen als zu hoch. Die
Messung (`tools/prep/echo-height.mjs`) zeigt: bei **15** eingeführten Zeichen
ist die Seite bei 1280 × 720 **775 px hoch (+55 px Scrollen)**, bei 390 × 844
und 1440 × 900 passt sie (844 bzw. 900). Die Bühne (`.stage`) gibt dort schon
bis auf ihr Minimum (235 px) nach. Der Fall ist also nicht erst „bei 36“,
sondern ab etwa 13–15 Zeichen am Laptop-Fenster.

**Nicht mitrepariert:** Teil von D3 (Echo-Check-Liste), gehört Fable. Jeder
der Wege (a) und (b) löst ihn mit (in der Simulation, siehe
`docs/PLAN-FINDINGS.md`, B3).

**Status: behoben** (04.10.2026, Runde P15, mit B3). Nachgemessen: 15 Zeichen
bei 1280 × 720 jetzt 720 px Seite bei 720 px Fenster (vorher 775, +55).

## 14. Der Echo-Check hat keine „or just type“-Zeile, obwohl die Tastatur dort antwortet — BEHOBEN (P23, Owner-Delegation)

**Status: behoben (05.10.2026, Runde P23).** Der Owner hat die Entscheidung an Claude
delegiert; entschieden: **Option 1**, derselbe String wie im Training und in Words
(„or just type — the keyboard answers too“), kein neuer EN-String, drei Stellen
teilen denselben Wortlaut. Umgesetzt: eine Zeile in `Learn.tsx` unter dem Tastenfeld
(`.keypad-hint`, unter 900 px unsichtbar). Bundle JS +94 B, CSS ±0. Die Höhe (−33 px
Bühne, kein Scroll) stammt aus der P21-DOM-Simulation; am echten Bau nachgemessen
in P24: kein Scroll in allen drei Viewports bei 15 und 36 Zeichen, Zeile 21 px ab 900 px.
Davor: Entscheidungsvorlage (05.10.2026, Runde P21;
Höhe gemessen, nichts gebaut). Davor: offen (Stand P18).

**Entscheidungsvorlage (P21).** Der Wortlaut ist ein neuer EN-String (CLAUDE.md §2.10,
§5) und gehört Fable. Gemessen mit `ECHO_VARIANTS=heute,hint0,hint1,hint2 node
tools/prep/echo-height.mjs` (Zeile als DOM-Simulation hinter `.keypad`, Klasse
`.keypad-hint`, 15 und 36 Zeichen; der Echo-Check zeigt in beiden Fällen das
ortsfeste Tastenfeld mit 36 Plätzen):

| Viewport | Zeile sichtbar | Seite / Fenster | Bühne heute → mit Zeile | Abstand Bühne–Tasten |
|---|---|---|---|---|
| 390 × 844 | nein (`display: none` unter 900 px) | 844 / 844 | 310 → 310 | 24 → 24 |
| 1280 × 720 | ja, 1 Zeile, 21 px (+12 px Rand) | 720 / 720, kein Scrollen | 362 → 329 (−33) | 24 → 24 |
| 1440 × 900 | ja, 1 Zeile, 21 px (+12 px Rand) | 900 / 900, kein Scrollen | 542 → 509 (−33) | 24 → 24 |

Bei 15 und 36 Zeichen identisch. Die Höhe hängt nicht vom Wortlaut ab: alle drei
Kandidaten brechen nirgends um. Die Zeile kostet also **33 px Bühnenhöhe**, keinen
Scroll.

Optionen (keine empfohlen, keine gebaut):

1. **Wie im Training:** „or just type — the keyboard answers too“ (derselbe String,
   keine zweite Variante).
2. **Kürzer, Imperativ:** „Or type the character.“
3. **Kürzer, Aussage:** „Keyboard works too.“
4. **Keine Zeile:** Status quo; die Tastatur bleibt unbeworben. Kostet nichts.

Zu entscheiden bleibt außerdem, ob die Zeile in Words (`Words.tsx`, trägt sie schon)
und Echo denselben String teilen sollen. Umsetzung nach Entscheidung: eine Zeile in
`Learn.tsx` unter dem Tastenfeld, `.keypad-hint` existiert (nur ab 900 px sichtbar),
Bundle-Delta einige Dutzend Byte.

**Gefunden:** 04.10.2026, beim Umsetzen von B3 (Runde P15).

Das Training zeigt ab 900 px unter dem Tastenfeld „or just type — the keyboard
answers too“ (`App.tsx`, `.keypad-hint`, Ruling #96 B.6). Der Echo-Check
beantwortet Tasten aus `answerPool` ebenso (`echoKeyAction`, Ruling #108), hat
aber die Zeile nicht — auch nicht, seit er dasselbe Tastenfeld trägt.

**Nicht mitrepariert:** ein neuer UI-Wert, der in B3 nicht verlangt war
(CLAUDE.md §5); die Zeile kostet am Laptop zusätzliche Höhe, die nachzumessen
wäre. **Was es kosten würde:** eine Zeile in `Echo`, eine Messung.

## 15. `verify:amber` lässt weiterhin einen Vorschau-Server stehen (zu #12)

**Status: behoben** (05.10.2026, Runde P19; Duplikat von #12). Ursache: `startPreview`
in `tools/amber/check.mjs` startete über `npx`, `server.kill()` (im `finally`, das
es schon gab) traf nur den npx-Vermittler. Behoben wie P10 im Tastatur-Skript:
Start direkt per `node node_modules/vite/bin/vite.js`. Nachweis: grüner Lauf (Exit 0)
und künstlicher Rot-Lauf (Exit 1) hinterlassen beide keinen Prozess, Port 4183 frei.
Davor: offen (Stand 04.10.2026, Runde P18; nicht mitrepariert).

**Gefunden:** 04.10.2026, Runde P15: nach `npm run verify:amber` lief ein
`vite preview --port 4183` weiter (nur über `ps` + `kill <pid>` zu beenden).
Bestätigt #12, unverändert, nicht mitrepariert. Runde P16: wieder derselbe
Befund (PID per `ps` gefunden, per `kill <pid>` beendet). Runde P17: ein drittes Mal (PID 1706). Runde P18: ein viertes Mal (PID 4194, per `kill` beendet).

## 16. `tools/prep/ax-pattern.mjs` läuft nach B2 nicht mehr durch

**Status: behoben** (05.10.2026, Runde P20; davor offen, Stand P18). Das Skript
liest Letter und Muster jetzt aus `<strong>` und `.morse-pattern` der B2-Zelle statt
aus dem Zellentext; sonst unverändert. Nachweis: läuft durch (Exit 0), Zelle „A dit
dah“, im Baum steht nur `StaticText "dit dah"`, die Zeichen `·−` nicht.

**Gefunden:** 04.10.2026, Runde P16.

Das Messskript aus P12 erwartet in der Alphabet-Tabelle die Muster als bloßen
Text (`StaticText " ·−"`) und simuliert darauf die drei D2-Optionen. Seit B2
liefert der Generator das Muster schon mit Versteck; das Skript bricht an der
Stelle ab (`Accessibility.getPartialAXTree: Either nodeId … must be specified`).
Der Abschnitt „heute“ ist damit historisch (er beschreibt den Stand vor B2).

**Nicht mitrepariert:** es ist eine einmalige Vorarbeit, kein Check, nicht im
Build. Die Messung „nachher“ lief in P16 über ein Wegwerfskript im Scratchpad.
**Was es kosten würde:** entweder das Skript auf den neuen DOM umstellen oder
es als Beleg des Vorher-Zustands markieren/löschen.

## 17. Words: zwei Amber-Flächen zugleich, wenn während des Tons getippt wird

**Status: behoben** (06.10.2026, Runde P24, Owner-Delegation laut Review §G #1).
„Check“ erscheint erst in `answering`; Tippen und Löschen bleiben während des Tons
(Ruling #112). `verify:amber` hat den Fall jetzt (40 Ansichten); rot ohne Fix belegt.
Davor: offen (06.10.2026, Design-/UX-Review, `docs/REVIEW-DESIGN-UX.md` B4).

**Gefunden:** 06.10.2026, beim Durchspielen des Wort-Trainings per Playwright
(Screenshot `shots/19-words-feedback-390.png` im Scratchpad der Review-Sitzung).

Im Modus „Words & groups" ist Tippen schon während `listening` erlaubt
(`src/ui/Words.tsx:88`, `typingAllowed = answering || state.phase === 'listening'`).
`AnswerLine` zeigt Löschen- und **Check**-Knopf, sobald `!empty && enabled` gilt
(`Words.tsx:273`), und `enabled` ist dasselbe `typingAllowed`. Wer also während des
Tons den ersten Buchstaben tippt, sieht den gefüllten Amber-Check **neben dem gefüllten
Amber-Play-Kreis** — zwei Amber-Flächen in einer View (Guidelines 1.1 §4, CLAUDE.md
§2.9 „Amber nie zweimal in einer View"). Der Kommentar direkt über der Stelle behauptet
das Gegenteil („während des Tons ist der Play-Kreis das eine Amber").

`verify:amber` (`tools/amber/check.mjs`) deckt den Zustand nicht ab: die Fälle
„Wort-Training, Eingabe offen (F2)" tippen erst nach dem Tonende.

**Nicht mitrepariert:** Review-Auftrag ohne Code-Änderung (CLAUDE.md §5).

**Was es kosten würde:** S. Entweder den Check-Knopf nur in `answering` zeigen
(Tippen während des Tons bleibt erlaubt, der Knopf erscheint mit dem Tonende), oder
ihn während `listening` umrandet statt gefüllt setzen. Ersteres hält die Regel ohne
neue Variante. Dazu ein Fall in `verify:amber`, der während des Tons tippt.
Owner-Delegation reicht: die Regel ist eindeutig, nur der Weg ist zu wählen.

## 18. Der Play-Kreis rückt beim ersten Play um 19 px nach unten

**Status: behoben** (06.10.2026, Runde P27, Owner-Entscheidung Weg c): die Streak-Zeile
steht auf dem Start-Screen in der Fußzeile; Play-Kreis ready = listening (283 px bei
390 × 844, 304 px bei 1440 × 900). Variabilitäts-Zeile und Drill-Einladung verschieben
die Bühne weiterhin, wenn sie erscheinen (selten, bewusst nicht mitgezogen).
Davor: offen (06.10.2026, Runde P25; gefunden beim Nachmessen von Review §A3).

Bei 390 × 844 mit 6 Zeichen steht die Sitzungszeile in Ruhe und beim Spielen fest bei
y = 32 (der Sprung der Kopfzeile ist mit P25 weg), der Play-Kreis aber wandert von
y = 264 (ready) auf y = 283 (listening). **Ursache (gemessen, Runde P26):** die Streak-Zeile („Starting fresh.“, 21 px + Abstand)
steht nur auf dem Start-Screen (`onStartScreen`). Mit dem ersten Play fällt sie weg, die
Bühne (`flex: 1`, Inhalt zentriert) wächst von 499 auf 537 px, die Mitte rückt um die
Hälfte, 19 px. Unabhängig von P25 — die Zeile war vorher genauso an den Start-Screen
gebunden; dort fiel es neben dem 60-px-Sprung der Kopfzeile nicht auf.

**Nicht mitrepariert** (CLAUDE.md §5). **Wege (Design-Entscheidung):** (a) Platz der
Zeile in der Sitzung reservieren — riskant, die Tastenfeld-Auflösung steht bei 390 × 844
auf genau 844 px; (b) Bühneninhalt oben statt zentriert ausrichten; (c) Streak-Zeile
unter das Gitter in den Fuß legen, wo sie die Bühne nicht trägt. Preis S, je nach Weg
Fable-Ruling oder Owner-Delegation.

