# PLAN — Beseitigung aller Findings

**Stand:** 03.10.2026 · `main` = `fa579d0` (P6, P7, P8 gemergt) · Branch
`claude/clever-turing-77fkyo` steht auf `main`.

**Zweck.** Ein Plan, der jedes offene Finding aus [`FINDINGS.md`](../FINDINGS.md)
und jeden Vorschlag aus den Runden P5–P8 einem Arbeitspaket, einer Entscheidung
oder einer menschlichen Prüfung zuordnet — damit nichts übrig bleibt, das
niemandem gehört. Das ist **keine Aufgabe im Sinne von CLAUDE.md**, sondern die
Reihenfolge, in der Aufgaben beauftragt werden. Jedes Arbeitspaket ist eine
eigene Aufgabe mit eigenem PR (CLAUDE.md §5).

## 0. Was „vollständig beseitigt" hier heißen kann

Drei der vier offenen Findings (#4, #5, #8) sind **kein Code-Fehler**, sondern
Gestaltungs- oder Inhaltsentscheidungen, die CLAUDE.md §2.9 und §3 ausdrücklich
Fable zuweisen (Schriftdateien, Learn-Texte, Form von Haken und Kreuz). #6
Punkt 1 ist eine Produktfrage, die Ruling #75 Punkt 3 bewusst offen ließ.
Dazu kommen Prüfungen, die nur ein Mensch am echten Gerät machen kann.

Deshalb gilt: **Claude setzt alles um, was entschieden ist, und bereitet alles,
was nicht entschieden ist, bis zur Entscheidungsreife vor** — Optionen,
Empfehlung, Preis, Messwerte. Nichts wird still entschieden. Ein Finding
gilt als beseitigt, wenn sein Abschlusskriterium in §6 erfüllt ist; das hängt
bei vier Findings an einer Antwort, die in Notion-Log als Ruling steht
(CLAUDE.md §2: Produktentscheidungen werden dort geklärt, nicht hier erfunden).

Ist eine Entscheidung nicht gefallen, gilt der Default der jeweiligen Zeile in
§4: **es bleibt, wie es ist**, und das Finding bleibt mit seinem Status offen
statt stillschweigend geschlossen.

## 1. Bestandsaufnahme

### 1.1 `FINDINGS.md`

| # | Thema | Status | Hier |
|---|---|---|---|
| 1 | `--muted` auf `--paper`, 3,5:1 | behoben (31.08.) | — |
| 2 | Google-Fonts-Abruf | behoben (31.08.) | — |
| 3 | Weitere Maße neben den Guidelines | entschieden und behoben (01.09., #46) | — |
| **4** | `→` (U+2192) fehlt in allen vier Schriftschnitten | **offen** | **B1**, D1 |
| **5** | Morse-Muster der Alphabet-Tabelle sind für Screenreader Satzzeichen | **offen** | **B2**, D2 |
| **6** | Wachsende Liste im Dreier-Gitter | Punkt 2 behoben (#110), **Punkt 1 (Echo-Check) offen** | **B3**, D3 |
| 7 | Start-Screen scrollt mit Tastenfeld | behoben (#98) | — |
| **8** | `✓` und `✗` fehlen in allen vier Schriftschnitten | **offen** | **B1**, D1 |
| 9 | Auflösung einer falschen Antwort scrollt (849 px) | behoben (D1, 843 px) | — |
| 10 | Anschrift im Impressum läuft zusammen | behoben (03.09.) | — |

### 1.2 Befunde und Vorschläge aus den Runden P5–P8

| Kürzel | Befund / Vorschlag | Stand | Hier |
|---|---|---|---|
| S1 | P8 (hängende Modifikator-Taste) ist **nicht auf dem Gerät des Owners bestätigt** | offen | **G1** |
| S2 | Tastatur-Regressionen (P5, P5c, P6, P8) sind nur durch Wegwerf-Skripte belegt | **erledigt (A1, 03.10.)** | **A1** |
| S3 | Wort- und Sende-Modus nie mit der Mess-Methode geprüft (Angebot aus P6) | **erledigt (A1, 03.10.)** — kein neuer Befund | **A1** |
| S4 | Messgerät `keyLog` ist ein Provisorium | offen | **A2**, D10 |
| S5 | Settings-Höhe bei 390 × 844: 960 px — **seit P8 (Log-Knopf) ungemessen** | offen | **C1**, D4 |
| S6 | Sechs Konzeptfragen aus P5–P8 (Echo-Start, Alt+Buchstabe, Hash, „answer noted", Speed round) | offen | **C2**, D5–D9 |
| S7 | Die 500 ms Nachdruck-Schutz (P5) sind eine Setzung, nicht an Menschen gemessen | offen | **H2** |

Aus `HANDOVER.md` kommen weitere offene Punkte (Learn-Meta-Texte, Passkey-Label,
Tempo-Stufe, menschliche Prüfungen). Sie sind **keine Findings** und stehen in
Anhang A, damit sie nicht verloren gehen — Stand der Zeilen vor Aufnahme prüfen.

## 2. Spielregeln

Aus CLAUDE.md, hier nur die, die diesen Plan formen:

- **Ein Arbeitspaket = eine Aufgabe = ein PR.** Kein Mitreparieren, kein
  Refactor ohne Freigabe (§5). Was unterwegs auffällt, geht nach `FINDINGS.md`.
- **Learn-Texte werden nicht umgeschrieben** (§3). B2 ändert, was ein
  Screenreader vorliest — deshalb braucht es Freigabe (D2).
- **Keine neue Farbe, kein neues Token, keine Schatten, nichts über 600** (§2.9).
- **Messen, nicht annehmen** (§7): Jede Höhe, jede Zahl in einer Übergabe ist
  nachgemessen, mit Viewport.
- **Definition of Done** (§9) je Paket: Akzeptanzkriterien einzeln bestätigt,
  `npm test` und `npm run build` grün, `npm run verify:amber` grün,
  Timing-Budget geprüft, Doku aktuell, keine unbeteiligten Dateien, Bundle-Delta
  genannt. **„Veröffentlicht" gehört nicht zu Done** — Release bleibt eine
  menschliche Entscheidung.
- **Aufwand** unten ist eine Schätzung: S = unter einer Stunde, M = ein
  Arbeitsblock, L = mehrere.

## 3. Arbeitspakete

Reihenfolge und Abhängigkeiten stehen in §5.

### G1 — Gate: P8 auf dem Gerät des Owners bestätigen

| | |
|---|---|
| **Wer** | Owner (kein Code) |
| **Warum Gate** | A2 darf erst nach der Bestätigung laufen: das Messgerät ist das Werkzeug, falls P8 *nicht* trägt. |
| **Schritte** | 1. Settings, ganz unten: Build-Kennung muss `995d7d7674e9` zeigen (sonst neu laden). 2. Einmal bewusst Alt-Tab aus dem Browser und zurück, sofort tippen — in Training, Lernkarte, Wort-Modus. |
| **Fertig, wenn** | Owner meldet „sitzt" oder „sitzt nicht". |
| **Wenn nicht** | Settings → „Copy input log" **direkt** nach dem verschluckten Anschlag, vor einem Reload. Die Zeile nennt `key`, `code` und alle Modifikator-Flaggen. Erst daraus entsteht die nächste Hypothese. Alle weiteren Pakete laufen unabhängig weiter, A2 pausiert. |
| **Grenze** | Bewiesen ist die Kette „Alt-Flag gesetzt → Anschlag verschluckt → jetzt angenommen". **Nicht** bewiesen ist, dass das hängende Alt beim Owner von Alt-Tab kam. |

### A1 — `npm run verify:keyboard`: die Tastatur als fester Browser-Check

**Ziel.** Die sieben Tastatur-Regressionen aus P5, P5c, P6 und P8 sind jede
einmal live aufgefallen. Ein fester Check macht daraus rote Tests statt
Nutzermeldungen. Schließt S2 und S3.

| | |
|---|---|
| **Aufwand** | M |
| **Dateien** | `tools/keyboard/check.mjs` (neu), `package.json` (ein Script), `HANDOVER.md`. Keine neue Abhängigkeit: `playwright-core` kommt wie bei `verify:amber` per `npm i --no-save`. |
| **Aufbau** | Nach dem Muster von `tools/amber/check.mjs`: Vorschau-Server, Chromium über `CHROMIUM_PATH`, geseedeter `localStorage`, CDP für `Input.dispatchKeyEvent`. Exit-Code ≠ 0 bei jedem roten Fall; je Fall eine Zeile mit Name und OK/FAIL. |
| **Hilfscode** | `startPreview`/`openBrowser` aus dem Amber-Skript **duplizieren**, nicht extrahieren (D11): ein Extrakt berührt eine fremde Datei (CLAUDE.md §5). Beim dritten Bedarf verallgemeinern. |
| **Nicht im Build** | `npm run build` bleibt ohne Chromium lauffähig. Der Check läuft vor Releases von Hand; das steht in `HANDOVER.md` und in der Kopfzeile des Skripts. |

**Fälle** (je ein benannter Test; „vorher" = Verhalten vor dem jeweiligen Fix):

| Fall | Anschlag / Zustand | Erwartet |
|---|---|---|
| K1 | Training, `answering`, „K" mit **gesetztem Alt-Flag** | verbucht |
| K2 | Lernkarte, Enter mit gesetztem Alt-Flag | schaltet weiter |
| K3 | Wort-Modus, Eingabe, „K" mit gesetztem Alt-Flag | angenommen |
| K4 | Settings, „Copy input log" | Zwischenablage trägt die Zeile mit `[ALT]` (entfällt mit A2) |
| K5 | Ctrl+R / Cmd+S in jedem Modus | App reagiert **nicht** (Schutz bleibt) |
| K6 | Training, Antwort während des Tons, derselbe Buchstabe 10 ms nach der Auflösung (P5 A) | Auflösung bleibt stehen |
| K7 | Training, Taste 1,3 s gehalten (P5 C) | Runde 1, 0 verbucht |
| K8 | Speed round, aktives Zeichen **außerhalb** des Pools in `answering` (P5c) | verbucht als Fehlversuch |
| K9 | Echo-Check, Zeichen in `echo-ready` (P6 A) | `echo-listening` |
| K10 | Echo-Check, Zeichen **während** des Tons (P6 B) | gepuffert, nach dem Ton verbucht |
| K11 | Echo-Check, Enter gehalten (P6 C) | genau ein Schritt |
| K12 | Sende-Modus: Leertaste, `.`/`-`, Enter in allen Phasen (S3) | laut Inventur-Tabelle in `HANDOVER.md` |

**Zusätzlich, weil Teil des Auftrags „Wort- und Sende-Modus messen" (S3):**
Jede Phase beider Modi wird einmal mit einem Anschlag je Taste der
Inventur-Tabelle durchlaufen. **Was dabei auffällt, aber nicht zur Aufgabe
gehört, geht nach `FINDINGS.md`** (Nummer 11 ff.) — nicht mitreparieren.

**Akzeptanzkriterien**

1. Der Check ist am aktuellen `main` grün.
2. **Rot-Test:** `altKey` wieder in `isBrowserChord` eingebaut → K1–K3 werden
   rot. Ebenso: `event.repeat`-Guard aus dem Training entfernt → K7 rot.
   Beides wird tatsächlich ausgeführt und im PR belegt.
3. `npm test`, `npm run build`, `verify:amber` unverändert grün.
4. Laufzeit des Checks im PR genannt (er darf nicht so lang sein, dass ihn
   niemand startet).

**Nicht-Ziel.** Echtes Alt-Tab. Es braucht einen Fenstermanager und ein zweites
Fenster; geprüft wird der **Zustand**, den es hinterlässt.

**Umgesetzt (03.10.2026).** `tools/keyboard/check.mjs`, `npm run verify:keyboard`,
**26 Fälle in 43–48 s**, am Stand `995d7d7674e9` grün. Abweichungen vom Entwurf
oben, mit Grund:

- **K2 wurde geändert:** statt Enter auf der Lernkarte prüft er einen
  Buchstaben in der Klang-Auswahl (`P` mit hängendem Alt öffnet dessen Karte).
  Grund: Enter auf einem fokussierten Knopf aktiviert der Browser **von selbst**
  — der ursprüngliche Fall wäre auch bei verschlucktem Anschlag grün geblieben
  und hätte den Browser geprüft statt die App. Der Echo-Check ist als **K2b**
  hinzugekommen (Zeichen mit hängendem Alt in `echo-answering`).
- **K3b/K3c** (Sende-Modus, beide Eingabewege) sind aus K3 herausgelöst.
- **K5** ist in drei Fälle geteilt (Training, Echo-Check, Wort-Modus).
- **K12 entfällt** zugunsten der Inventur-Fälle **T1–T2** (Training), **W1–W4**
  (Wort-Modus) und **S1–S4** (Sende-Modus) — je Phase der Tabelle in
  `HANDOVER.md` ein Anschlag je Taste.
- **K4** (Messgerät) ist enthalten und **entfällt mit A2**.

**Rot-Test belegt (Akzeptanzkriterium 2):** je ein Fix gezielt ausgebaut, gebaut
und nur die betroffenen Fälle ausgeführt — jedes Mal wurden genau die erwarteten
Fälle rot, die Kontrollfälle blieben grün:

| Ausgebaut | Rot |
|---|---|
| `altKey` zurück in `isBrowserChord` | K1, K2, K2b, K3, K3b, K3c |
| `event.repeat`-Guard im Training | K7 |
| `event.repeat`-Guard im Echo-Check | K11 |
| 500-ms-Nachdruckschutz | K6 |
| `echoKeyAction`: `echo-ready`/`echo-listening` wieder stumm | K9, K10, K11 |

K8 (Speed round, P5c) und K5 (Schutz der Strg-/Cmd-Kürzel) haben **keinen
eigenen Rot-Test**: K8 ist nur über die Bedingung `active.includes(key)` zu
brechen, K5 nur durch Entfernen des Schutzes selbst — beides wäre ein
größerer Eingriff in `App.tsx`, als eine Messung rechtfertigt.

### A2 — Messgerät ausbauen (erst nach G1 = „sitzt")

| | |
|---|---|
| **Aufwand** | S |
| **Entfernt** | `src/ui/keyLog.ts`; Capture-Listener und `copyInputLog` in `App.tsx`; Prop `onCopyInputLog`, State und Knopf in `Settings.tsx`; `.settings-log-action` in `styles.css`; Fall K4 in A1. |
| **Bleibt** | Build-Kennung (P7), `isBrowserChord` samt Test (P8), `build.ts`. |
| **Gegenentwurf** | Als dauerhafte Support-Funktion behalten (lokal, nichts wird gesendet, eine Zeile in den Settings). Preis: ein Feature ohne Ruling. **Empfehlung: ausbauen** (D10). |
| **Akzeptanz** | Keine Referenz auf `keyLog`/`recordKey`/`formatKeyLog` mehr im Repo (`grep`); Tests, Build, `verify:amber` grün; **Settings-Höhe bei 390 × 844, 1280 × 720, 1440 × 900 nachgemessen** und mit dem Stand vor P8 verglichen (gemessen bei P7: 960 px bei 390 × 844, 900 px bei 1440 × 900; bei 1280 × 720 **nie gemessen** — dort ist die erste Messung der Referenzwert); Bundle-Delta negativ und genannt. |
| **Wenn G1 = „sitzt nicht"** | A2 entfällt, das Messgerät bleibt, der Log des Owners ist der Eingang für ein neues Arbeitspaket. |

### B1 — Glyphen: `→`, `✓`, `✗` (Findings #4 und #8)

Beide Findings sind dieselbe Ursache: die vier woff2-Subsets in `src/fonts/`
tragen drei Codepoints nicht, sie kommen aus dem Fallback-Stack des Systems.
Es bricht nichts (kein Zeichen trägt eine Information allein, CLAUDE.md §6), nur
die Zeichnung wechselt je System. **Gehört Fable** (Schriftdateien, Form von
Haken und Kreuz).

| | |
|---|---|
| **Aufwand** | M (Weg A) / S (Weg B) |
| **Vorarbeit (ohne Entscheidung machbar)** | 1. **Wo kommen die Zeichen vor?** `grep` über `src/`, `content/learn/`, `tools/learn/` — vollständige Liste der Stellen mit U+2192/2713/2717. 2. **Gibt es die Zeichen in den Upstream-Schriften überhaupt?** (Newsreader, IBM Plex Sans.) Davon hängt ab, ob Weg A möglich ist — ohne dieses Ergebnis ist die Empfehlung unter D1 nur eine Vermutung. 3. Lizenz prüfen: SIL OFL, Reserved Font Names, **bevor** ein Schnitt neu erzeugt wird. 4. Fallback-Zeichnung je System als Screenshot-Beleg (heutiger Zustand). |
| **Weg A (Empfehlung, falls Upstream die Glyphen hat)** | Die Schnitte mit den drei Codepoints neu subsetten, latin + diese drei. Fable liefert oder bestätigt die Dateien. Danach `src/fonts/` und die `@font-face`-Einträge. |
| **Weg B** | `✓`/`✗` als Inline-SVG im 24er-Raster, 1,5 px Strich (1.1 §8), wie Menü-Icon und Play-Pfeil. Der Pfeil in Fables CTA-Text lässt sich so **nicht** ersetzen — er bliebe Fallback oder der Text wird geändert (Fables Sache). |
| **Weg C** | Fallback bewusst akzeptieren, Finding mit „entschieden: bleibt" schließen. |
| **Neu, als Absicherung** | `tools/theme/` bekommt (oder ein eigenes `tools/fonts/`) einen **cmap-Check**: jeder Codepoint, der in `src/` und `content/learn/` vorkommt, muss in mindestens einem Schnitt der Familie stehen — sonst rot. Ohne ihn taucht das nächste fehlende Zeichen erst nach dem Deploy auf. Läuft in `npm run build` neben `verify:colors`. Eigener PR-Commit, **nicht** Teil der Schrift-Entscheidung. |
| **Akzeptanz** | Je Codepoint ein Beleg, dass er aus der Markenfamilie kommt (cmap) bzw. Screenshot der neuen Zeichnung; `verify:learn` und `verify:amber` grün; Bundle-Delta genannt (woff2-Größe); H8. |

### B2 — Screenreader: Morse-Muster der Alphabet-Tabelle (Finding #5)

| | |
|---|---|
| **Aufwand** | S–M |
| **Entscheidung** | D2: Freigabe von Fable, weil vorgelesener Text entsteht, den Fable nicht geschrieben hat. |
| **Umsetzung** | Im Generator (`tools/learn/build.mjs`) Zellen der Form `**X** ·−` erkennen und das Muster zusätzlich als `<span class="visually-hidden">` in der vorgelesenen Form ausgeben; das sichtbare `·`/`−` bekommt `aria-hidden="true"`. Die Zuordnung `·`→„dit", `−`→„dah" **stehen schon** in `spellPattern` (`src/ui/Pattern.tsx`); sie kommt als 3-Zeilen-Mapping in den Generator (Duplikat statt spekulativer Abstraktion, CLAUDE.md §4). |
| **Offen in D2** | Sprache der deutschen Seiten (`/de/lernen/morsealphabet/`): „dit dah" ist international, aber EN-first (§2.10) gilt für UI-Strings, nicht für Learn-Seiten. |
| **Tests** | `tools/learn/`: Fixture mit einer Tabellenzeile → erwartetes HTML. `verify:learn` bekommt eine Pflicht: **jede Muster-Zelle trägt die vorgelesene Form** (Zählung gegen die 36 Zeichen). |
| **Akzeptanz** | Der Markdown-Quelltext in `content/learn/` ist **byte-identisch** (Diff leer); die 36 Zeichen tragen je eine vorgelesene Form; sichtbare Darstellung unverändert (Pixeldiff der Seite = 0); H3. |

### B3 — Echo-Check: die Liste wächst bis 36 Optionen (Finding #6, Punkt 1)

Gemessen (headless Chromium, 390 × 844): 15 eingeführte Zeichen = 15 Optionen,
36 = **36 Optionen auf einer 1311 px hohen Seite**. Ruling #75 Punkt 3 lässt
den Echo-Check ausdrücklich in Ruhe — „dort sind es bewusst wenige Optionen".
Das gilt am Anfang, nicht bei 36.

| | |
|---|---|
| **Aufwand** | S–M |
| **Entscheidung** | D3, **Produktfrage**, gehört in ein Ruling. |
| **Weg (a), Empfehlung** | Wie `ReviewPicker`: Klasse `keypad`, `data-active` je Zugehörigkeit zur Option. Dieselbe wandernde Taste verschwindet — wer im Training an feste Positionen gewöhnt ist, greift im Echo-Check nicht mehr ins Leere. |
| **Weg (b)** | Optionen deckeln (die gefragte + wenige Ablenker). Ändert `answerPool` und damit, **welche Tasten antworten** — berührt P6 (`echoKeyAction`). |
| **Weg (c)** | Lassen. Finding bleibt mit Begründung offen. |
| **Zusätzlich zu klären** | Was „aktiv" im Echo-Check heißt: die Optionen des Checks oder der ganze aktive Satz. |
| **Wechselwirkung mit P6** | Der Echo-Check beantwortet nur Tasten aus `answerPool` (Ruling #108). Bei Weg (a) bleibt das so — der Pool ändert sich nicht, nur die Darstellung. Test K9–K11 laufen unverändert. |
| **Akzeptanz** | Nachgemessen bei 390 × 844, 1280 × 720, 1440 × 900 mit 15 **und** 36 eingeführten Zeichen: kein Scrollen mehr; `verify:amber` grün; eine Ansicht „Echo-Check, 36 Zeichen" wird in `verify:amber` ergänzt, damit der Fall dauerhaft gemessen wird (ob der Echo-Check heute schon eine Ansicht ist, ist vor Beginn zu prüfen); H9. |

### C1 — Settings-Höhe (S5)

| | |
|---|---|
| **Aufwand** | S |
| **Messung zuerst** | Höhe der Settings bei 390 × 844 / 1280 × 720 / 1440 × 900 **nach A2** (der Log-Knopf aus P8 ist dann weg). Bekannt ist nur der Stand von P7: 960 px bei 390 × 844 und 900 px bei 1440 × 900; seit dem Log-Knopf (P8) und bei 1280 × 720 gibt es **keine Messung**. |
| **Entscheidung** | D4. (a) 960 akzeptieren — der Screen scrollte am Telefon schon vorher (seit P5b), die Kennung steht als Letztes. (b) Notiz unter „Characters" streichen (ca. −40 px). (c) Kennung und „Characters" in einen Block. **Empfehlung (a).** |
| **Akzeptanz** | Die gemessene Höhe steht in `HANDOVER.md`; die Entscheidung steht als Ruling dort. |

### C2 — Konzeptfragen aus P5–P8 (S6)

Fünf Fragen, bei denen der **aktuelle Code** schon eine Antwort gibt. Entscheidet
Fable anders, ist die Umsetzung je ein kleiner Eingriff; entscheidet Fable
„so lassen", ist es nur ein Ruling-Eintrag und ein Satz in `HANDOVER.md`.

| Frage | Heute | Wenn „anders" |
|---|---|---|
| D5 — Zeichen in `echo-ready` startet die Wiedergabe (P6, Ruling #105 übertragen) | ja | `echoKeyAction` gibt für `echo-ready` `null` zurück; K9 entfällt |
| D6 — Alt+Buchstabe erreicht die App (P8) | ja | Alt wird nur **verworfen, wenn es nicht „hängend" ist** — dafür bräuchte es eine Erkennung (Alt ohne vorheriges `keydown` Alt) und ist **nicht empfohlen**: sie wäre selbst eine Fehlerquelle |
| D7 — Build-Kennung ist ein Hash, kein Versionsname (P7) | Hash | Ein sprechender Name ist ein zweiter Mechanismus neben `sw.js`-Cache-Name — eigene Aufgabe, nicht Teil dieses Plans |
| D8 — „answer noted" am Ende von `listening` (P5, berührt CLAUDE.md §2.2) | nicht gebaut | Gestaltungsentscheidung; **zuerst H2** (Menschen-Messung der 500 ms) |
| D9 — Speed round: jedes aktive Zeichen ist eine Antwort (P5c); die Auflösung zeigt „you typed E" nicht als Taste, wenn E nicht im Dreier-Gitter steht | ja / nein | Optional: den Satz „Not quite — that was M." um das Getippte ergänzen — neuer UI-String, Fables Wortlaut |

### D — Abschluss

| | |
|---|---|
| **Aufwand** | S |
| **Schritte** | 1. `FINDINGS.md`: je Finding eine Status-Zeile in der Form der bestehenden Einträge („**Status: entschieden und behoben** (Datum, Ruling #…)"); der Ursprungstext bleibt stehen. 2. `HANDOVER.md`: Kopf-Abschnitt je Runde, Inventur-Tabellen nachgezogen. 3. Gesamtlauf: `npm test`, `npm run build`, `verify:amber`, `verify:contrast`, `verify:keyboard`. 4. Dieser Plan: Status-Spalte in §1 aktualisieren, Datei **nicht** löschen (sie ist der Beleg). |
| **Akzeptanz** | §6 vollständig abgehakt. |

## 4. Entscheidungsregister

Jede Zeile: **wer** entscheidet, **Empfehlung**, was **ohne Entscheidung** gilt.

| | Frage | Wer | Empfehlung | Ohne Entscheidung |
|---|---|---|---|---|
| D1 | Glyphen `→ ✓ ✗` (B1): neu subsetten, SVG, oder Fallback akzeptieren? | Fable | A, **falls** Upstream die Zeichen hat; sonst B für `✓ ✗`, Fallback für `→` | bleibt Fallback; #4, #8 offen |
| D2 | Muster für Screenreader erzeugen (B2)? EN „dit dah" — und DE? | Fable | Ja; DE ebenfalls „dit dah" | bleibt; #5 offen |
| D3 | Echo-Check-Liste bei 36 Zeichen (B3): Tastenfeld, deckeln, lassen? | Fable | (a) Tastenfeld | bleibt; #6.1 offen |
| D4 | Settings-Höhe am Telefon (C1) | Fable | (a) akzeptieren, nach A2 nachmessen | 960 px bzw. Messwert nach A2 |
| D5 | Zeichen in `echo-ready` startet Wiedergabe | Fable | bestätigen | bleibt |
| D6 | Alt+Buchstabe erreicht die App | Fable | bestätigen | bleibt |
| D7 | Hash statt Versionsname | Fable | Hash | bleibt |
| D8 | „answer noted"-Zeile (P5) | Fable | **nicht bauen**, erst H2 | nicht gebaut |
| D9 | Speed round / Auflösung ohne Taste | Fable | bestätigen; Zusatzsatz optional | bleibt |
| D10 | Messgerät ausbauen oder behalten | Owner | ausbauen (nach G1) | bleibt, bis G1 beantwortet |
| D11 | `verify:keyboard`: Hilfscode duplizieren oder aus `verify:amber` extrahieren | Owner | duplizieren | dupliziert |

Entscheidungen werden im **Notion-Log** als Ruling festgehalten und mit
Nummer in den jeweiligen Commit geschrieben (wie bisher: „Ruling Notion-Log #…").

## 5. Reihenfolge und PR-Schnitt

```
G1 (Owner)  ──────────────┐
                          ▼
A1 verify:keyboard ──► A2 Messgerät ausbauen ──► C1 Settings-Höhe messen
(unabhängig von G1)       (nur nach G1 = „sitzt")

B1 Glyphen  ──┐
B2 Screenreader ├── je erst nach der Entscheidung D1 / D2 / D3;
B3 Echo-Check ──┘   Vorarbeit (Messen, Optionen) läuft sofort

C2 (D5–D9) ── reine Entscheidungen, Umsetzung nur bei „anders"
D  Abschluss ── zuletzt
```

| PR | Inhalt | Wartet auf |
|---|---|---|
| 1 | A1 `verify:keyboard` (+ Befunde nach `FINDINGS.md`) | — |
| 2 | A2 + C1 Messung | G1, D10 |
| 3 | B1 cmap-Check (Absicherung, ohne Glyphen-Entscheidung) | — |
| 4 | B1 Glyphen | D1 |
| 5 | B2 Screenreader-Muster | D2 |
| 6 | B3 Echo-Check | D3 |
| 7 | C2, je nach Antwort | D4–D9 |
| 8 | D Abschluss | alles |

Die PRs 1, 3 und die Vorarbeit von 4–6 laufen **sofort**; sie brauchen keine
Entscheidung. Jeder PR hat eigenen Build-Hash, eigene Messwerte und einen
eigenen Absatz „Was Fable sehen muss".

## 6. Abschlusskriterien je Finding

| Finding | gilt als beseitigt, wenn |
|---|---|
| **#4** `→` | Ruling zu D1; bei Weg A: Zeichen im Subset (cmap) und Screenshot; bei Weg C: Status „entschieden: bleibt" mit Begründung in `FINDINGS.md` |
| **#5** Muster | Ruling zu D2; 36 Zeichen tragen die vorgelesene Form; Markdown-Quelltext byte-identisch; H3 bestanden |
| **#6.1** Echo-Check | Ruling zu D3; gemessen bei 15 und 36 Zeichen in drei Viewports ohne Scrollen (Weg a/b), oder Status „entschieden: bleibt" |
| **#8** `✓ ✗` | wie #4 (zusammen mit ihm in B1 entschieden) |
| S1 P8 bestätigt | G1: Owner meldet „sitzt" |
| S2 / S3 | `verify:keyboard` grün, Rot-Test belegt, Wort-/Sende-Inventur durchlaufen |
| S4 Messgerät | ausgebaut (A2) **oder** bewusst behalten (D10) |
| S5 Settings | gemessene Höhe nach A2 steht in `HANDOVER.md` |
| S6 Konzeptfragen | D5–D9 als Rulings protokolliert |
| S7 500 ms | H2 durchgeführt, Wert bestätigt oder angepasst |

## 7. Menschliche Prüfungen

Diese Prüfungen sind **von hier aus nicht möglich**. Sie stehen hier, damit ein
Finding nicht als „beseitigt" gilt, bevor sie stattgefunden haben.

| | Prüfung | Gehört zu |
|---|---|---|
| H1 | P8: Alt-Tab, sofort tippen, in drei Modi | G1 |
| H2 | Nachdruck-Schutz (500 ms): fühlt sich der Nachdruck „hat's genommen?" so an, dass 500 ms stimmen? | S7, D8 |
| H3 | **Screenreader** über die Alphabet-Tabelle (nach B2); über die 36 Tasten („— not in this round"); über Wort- und Sende-Auflösung | #5 |
| H4 | **Echtes Telefon:** Tastenfeld (50 × 52), Wort-Modus (46 px), Sende-Taste (120 px, `touch-action: none` auf iOS/Android) | Anhang A |
| H5 | **Echter Laptop:** Fenster verkleinern über 900/1280 px, Trackpad | Anhang A |
| H6 | **Hörtest:** hält ein Wort bei 10 WPM effektiv als Wort zusammen? | Anhang A |
| H7 | Lighthouse auf der Live-Seite `morse-lab.com/learn/` | Anhang A |
| H8 | `→ ✓ ✗` auf Windows, macOS, iOS, Android (nach B1) | #4, #8 |
| H9 | Echo-Check am Telefon mit vielen eingeführten Zeichen (nach B3) | #6.1 |

## Anhang A — Weitere offene Punkte aus `HANDOVER.md`

**Keine Findings**, nicht Teil der Pakete oben. Sie stehen hier, damit sie beim
nächsten Review nicht neu entdeckt werden müssen. **Der Stand der Zeilen kann
veraltet sein** (die Übergabe ist über Wochen gewachsen) — vor Aufnahme in ein
Paket jeweils gegen Code und Notion-Log prüfen.

| Quelle (Runde) | Punkt | Art |
|---|---|---|
| L1 | Fünf zu lange `metaTitle`, drei zu lange `metaDescription` der Learn-Seiten | Text (Fable) |
| L1 | Zwei fehlende Kanten vom Pillar auf Geschichte und Amateurfunk | Text (Fable) |
| L1 | Fließtext-Links in `--amber-deep` statt `--amber` (4,46 : 1 gegen 4,5 : 1) | Entscheidung |
| Themes | `--amber` `#B35209` (4,52 : 1) weicht von Guidelines 1.1 ab | Bestätigung (Fable) |
| F2 | Tempo-Stufe: Bedingungen (b), (c) gelten dort nicht (`isReadyToSpeedUp`) | Entscheidung |
| F2 | Tempo-Reset wirkt lokal, nicht im Konto | Entscheidung |
| U1 | Das Tastenfeld dimmt nicht nach Phase | Review-Punkt |
| Konten | Passkey-Label „Morse Lab" für jedes Konto; vorher Blick auf echte Hardware | Entscheidung |
| Konten | Weiterleitung `pages.dev` → `morse-lab.com` vor dem DNS-Eintrag | Entscheidung |
| Konten | Rate-Limit `/api/auth/*` „noch nicht angelegt" (Cloudflare-Rechte); D1 auf Produktion: Nachweis am laufenden System | Betrieb |
| F4 | „Tap it in" über „Next" hinweg gewählt — oder jede Aufgabe neu mit der Taste? | Design-Frage |
| mehrere | **Nicht gebaut:** Visual practice (opt-in), Variabilitäts-Stufe 3 (QRN), Satzzeichen in `CHARACTER_ORDER`, Fünfergruppen/Klartext | Konzept |
| mehrere | Menschliche Prüfungen: Wortliste (230 Einträge) durchsehen; Sitzungs-Schätzung des dits nach echten Anschlägen; Screenreader über die Schiene; PWA-Installation auf einem Telefon | Mensch |

## Änderungsprotokoll

| Datum | Änderung |
|---|---|
| 03.10.2026 | Erste Fassung (nach P8). |
| 03.10.2026 | A1 umgesetzt (`verify:keyboard`, 26 Fälle, Rot-Test belegt); S2 und S3 erledigt. |
