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
