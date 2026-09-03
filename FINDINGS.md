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

## 5. Die Morse-Muster der Alphabet-Tabelle sind für Screenreader Satzzeichen

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

## 6. Zwei weitere Flächen tragen dieselbe wachsende Liste im Dreier-Gitter

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
2. **„Learn the sounds"** (`ReviewPicker`, dieselbe Datei) listet alle aktiven
   Zeichen. Bei 36 sind das **36 Tasten und 1223 px** — die Liste ist dort
   allerdings ein Auswahlmenü und keine Antwortfläche, es wird keine
   Reaktionszeit daran gemessen.

**Warum es zählt:** Für den Echo-Check ist es der Kern des Rulings — dieselbe
wandernde Taste, dieselbe mitgemessene Suchzeit. Der Unterschied ist, dass der
Echo-Check die Statistik nicht anfasst (`learn.ts`: „Der Echo-Check fasst die
Statistik nicht an"), die verschobene Suche also keine Zahl verfälscht. Sie
kostet nur die Übung: wer im Training an feste Positionen gewöhnt ist, greift
im Echo-Check ins Leere. Bei „Learn the sounds" geht es allein um das Scrollen.

**Vorläufiger Umgang:** unverändert gelassen. Das Ruling nennt die Echo-Checks
namentlich als unberührt, und die zweite Fläche nennt die Aufgabe überhaupt
nicht (CLAUDE.md 5: nicht mitreparieren).

**Was es kosten würde:** wenig, und genau deshalb ist es eine Entscheidung und
keine Arbeit. Beide Flächen rendern schon dieselbe `.answer`-Taste; sie
bräuchten dieselben zwei Zeilen wie `Answers` — die Klasse `keypad`, die
Positionen aus `KEYPAD_LAYOUT`, `data-active` je Zugehörigkeit. Für den
Echo-Check wäre zusätzlich zu entscheiden, was „aktiv" dort heißt: die
Optionen des Checks oder der ganze aktive Satz. **Gehört Fable, nicht dem
nächsten Commit.**

## 7. Der Start-Screen scrollt, sobald das Tastenfeld gilt — BEHOBEN (Ruling #98)

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

## 10. Die Anschrift in Impressum/Imprint läuft optisch zu einer Zeile zusammen

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
