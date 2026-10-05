# PLAN — Beseitigung aller Findings

**Stand:** 04.10.2026 · `main` = `fa579d0` (P6, P7, P8 gemergt) · Branch
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
| **4** | `→` (U+2192) fehlt in allen vier Schriftschnitten | **Fußzeile behoben** (P14, im Plex-Subset); **CTA-Pfeil „entschieden: bleibt“** (Weg C). H8 offen | **B1**, D1 |
| **5** | Morse-Muster der Alphabet-Tabelle sind für Screenreader Satzzeichen | **behoben** (P16, Option 3, Owner-Delegation D2; Quelltext byte-identisch). H3 offen; Pixeldiff nur in Tabellen 0, Fließtext-Zeilen mit Subpixel-Abweichung (P22: gemessen, Entscheidungsvorlage in FINDINGS #5) | **B2**, D2 |
| **6** | Wachsende Liste im Dreier-Gitter | Punkt 2 behoben (#110), **Punkt 1 (Echo-Check) behoben** (P15, Weg a, Owner-Delegation D3). H9 offen | **B3**, D3 |
| 7 | Start-Screen scrollt mit Tastenfeld | behoben (#98) | — |
| **8** | `✓` und `✗` fehlen in allen vier Schriftschnitten | **behoben** (P14, SVG-Paar `Mark.tsx`). H8 offen | **B1**, D1 |
| 11 | `≈` (U+2248) fehlt in allen vier Schriftschnitten — vom cmap-Check gefunden | **behoben** (P14, im Plex-Subset). H8 offen | **B1**, D1 |
| 12 | `verify:amber` lässt einen Vorschau-Server stehen | **behoben** (05.10.2026, Runde P19; davor offen, in P18 erneut bestätigt, zusammen mit #15) | — |
| 13 | Echo-Check scrollt schon bei 15 Zeichen bei 1280 × 720 (+55 px) | **behoben** (P15, mit B3) | **B3**, D3 |
| 9 | Auflösung einer falschen Antwort scrollt (849 px) | behoben (D1, 843 px) | — |
| 14 | Echo-Check hat keine „or just type“-Zeile | **offen — Entscheidungsvorlage liegt vor** (P21: Höhe gemessen, +33 px Bühne, kein Scroll; Wortlaut bei Fable; nicht gebaut) | — |
| 15 | `verify:amber` lässt weiterhin einen Vorschau-Server stehen | **offen** (Duplikat von #12) | — |
| 16 | `tools/prep/ax-pattern.mjs` läuft nach B2 nicht mehr durch | **behoben** (05.10.2026, Runde P20; davor offen) | — |
| 10 | Anschrift im Impressum läuft zusammen | behoben (03.09.) | — |

### 1.2 Befunde und Vorschläge aus den Runden P5–P8

| Kürzel | Befund / Vorschlag | Stand | Hier |
|---|---|---|---|
| S1 | P8 (hängende Modifikator-Taste) ist **nicht auf dem Gerät des Owners bestätigt** | **erledigt (G1, 04.10.)** — Owner: „funktioniert wieder“ | **G1** |
| S2 | Tastatur-Regressionen (P5, P5c, P6, P8) sind nur durch Wegwerf-Skripte belegt | **erledigt (A1, 03.10.)** | **A1** |
| S3 | Wort- und Sende-Modus nie mit der Mess-Methode geprüft (Angebot aus P6) | **erledigt (A1, 03.10.)** — kein neuer Befund | **A1** |
| S4 | Messgerät `keyLog` ist ein Provisorium | **erledigt (A2, 04.10., P13)** — ausgebaut (D10-Standard, vom Owner nicht ausdrücklich bestätigt) | **A2**, D10 |
| S5 | Settings-Höhe bei 390 × 844: 960 px — **seit P8 (Log-Knopf) ungemessen** | **gemessen (C1, 04.10., P13)**: 960 / 822 / 900 px (390×844 / 1280×720 / 1440×900); Entscheidung D4 (a) vom Owner bestätigt (P17) | **C1**, D4 |
| S6 | Sechs Konzeptfragen aus P5–P8 (Echo-Start, Alt+Buchstabe, Hash, „answer noted", Speed round) | **protokolliert (C2, P17)**: D4–D9 wie empfohlen bestätigt, kein Code | **C2**, D5–D9 |
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
| **Ergebnis (04.10.2026)** | Owner: „mittlerweile funktioniert es wieder mit der richtigen Tastenerkennung“ → **sitzt**. **Grenze:** das ist die Beobachtung, dass das Symptom weg ist — nicht der Nachweis, dass ein hängendes Alt die Ursache war (dafür liefert `verify:keyboard` den Zustand, nicht Alt-Tab selbst). **A2 ist freigegeben.** |
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
| K4 | Settings, „Copy input log" | Zwischenablage trägt die Zeile mit `[ALT]` (**entfallen mit A2, P13**; seither 25 Fälle) |
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
- **K4** (Messgerät) war enthalten und ist **mit A2 entfallen** (P13).

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
| **Stand** | **Erledigt (04.10.2026, Runde P13).** `keyLog.ts`, Capture-Listener, `copyInputLog`, Prop, State, Knopf, `.settings-log-action` und K4 entfernt; Build-Kennung, `isBrowserChord` und `keyChord.test.ts` unberührt. `grep` auf `keyLog`/`recordKey`/`formatKeyLog`/`onCopyInputLog` im Quelltext leer. **Bundle −1.333 Byte** (235.957 → 234.624; −1,33 kB). `npm test` 481 (unverändert), `verify:amber` 37 Ansichten, `verify:keyboard` **25 Fälle** (vorher 26). **Rot-Test:** `altKey` wieder in `isBrowserChord` → K1, K2, K2b, K3, K3b, K3c alle rot (6 von 6), zurückgesetzt → grün. **Grenze:** D10 hat der Owner nicht ausdrücklich bestätigt; er kann es vor dem Merge umkehren. |
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

#### Vorarbeit — Ergebnis (03.10.2026, Runde P11)

Nichts entschieden, keine Schriftdatei und kein Learn-Text verändert
(`git diff` auf `src/fonts/` und `content/learn/` leer).

**a) Fundstellen** (nur gezeichneter Text; `grep` über `src/`, `content/learn/`,
`tools/learn/`, `public/` — in `public/` keine):

| Codepoint | Gezeichnet in | Familie dort |
|---|---|---|
| `→` U+2192 | 14 Learn-Seiten (`content/learn/*.md`, CTA „Start hearing it → …“ / „Fang an zu hören → …“, je eine Zeile: 24–65); Fußzeile `src/ui/App.tsx:1705` („10 → 11 wpm“) | CTA: **Newsreader** (`.cta a`, `--font-serif`); Fußzeile: **IBM Plex Sans** |
| `✓` U+2713 | `App.tsx:1745`, `:1834`; `Learn.tsx:360`, `:392`; `Send.tsx:360`; `Words.tsx:114`, `:322`; `Settings.tsx:360` | **IBM Plex Sans** (gemessen für `.verdict-mark`, `.answer-mark`, `.theme-option-mark`) |
| `✗` U+2717 | wie ✓, dazu `Words.tsx:337` | **IBM Plex Sans** |

Nur in Kommentaren oder Tests, nicht gezeichnet: `App.tsx:1677`, `Learn.tsx:133`,
`Send.tsx:33`, `Words.tsx:39`/`:373`, `engine/tempo.ts:94`, `tools/learn/pages.mjs`
(Kopfkommentar), `pages.test.mjs` (Erwartungswerte, Testnamen).

**b) cmap** (`tools/fonts/cmap.mjs`, selbst gelesen, Format 4 und 12; an den
bekannten Zeichen aus #4/#8 gegengeprüft):

| Datei | → | ✓ | ✗ | ≈ |
|---|---|---|---|---|
| `ibm-plex-sans-latin-{400,500,600}-normal.woff2` | – | – | – | – |
| `newsreader-latin-wght-normal.woff2` | – | – | – | – |

Die Dateien in `src/fonts/` sind **byte-identisch** mit den Fontsource-Paketen
(`@fontsource/ibm-plex-sans` 400, `@fontsource-variable/newsreader`
latin-wght) geprüft für diese beiden; also Googles latin-Subset, kein eigener
Schnitt. (500/600 nicht per `cmp` verglichen.)

**Upstream** (erreichbar: npm-Registry, `raw.githubusercontent.com` für
`google/fonts`; nicht erreichbar: `github.com`-Releases, `fonts.google.com`):

| Quelle | → | ✓ | ✗ | ≈ |
|---|---|---|---|---|
| IBM Plex Sans, `@ibm/plex-sans` 1.1.0, `complete/woff2` Regular/Medium/SemiBold (895 Codepoints) | **ja** | **ja** | **nein** | ja |
| dasselbe, `split/woff2/…-Regular-Pi` (101 Codepoints) | ja | ja | nein | — |
| Newsreader variable TTF aus `google/fonts` (`ofl/newsreader`, 564 Codepoints) | **nein** | **nein** | **nein** | ja |
| Fontsource Newsreader, alle Subsets (latin, latin-ext, vietnamese) | nein | nein | nein | nein |

**Nicht belegt:** Die Newsreader-TTF aus `google/fonts` ist die von Google
verteilte Fassung; das Repo von Production Type (`productiontype/Newsreader`)
war nicht lesbar, ein Unterschied dort ist nicht ausgeschlossen. Pi-Subset und
`complete` sind nur für Regular einzeln geprüft (`complete` zusätzlich für
Medium und SemiBold).

**c) Lizenz.** Beide Dateien sind SIL OFL 1.1 im Originaltext. Die
Copyright-Zeilen nennen **keinen** Reserved Font Name (kein „with Reserved Font
Name …“; „Reserved Font Name“ steht nur in der Definition und in Klausel 3).
Klausel 3 greift damit nur, wenn ein RFN deklariert wäre — hier nicht
deklariert. Bedingungen für ein Neu-Subsetten (Modified Version): Lizenztext
und Copyright mitliefern (2), unter OFL bleiben (5), den Urhebernamen nicht zur
Werbung nutzen (4). Das heutige Subset ist selbst schon eine Modified Version.
**Nur berichtet — keine Rechtsberatung.**

**d) Fallback, gemessen** (headless Chromium, gebauter Stand, CDP
`CSS.getPlatformFontsForNode`):

- Learn-CTA (`→`, Newsreader-Kontext): **Liberation Serif** (Chromium löst
  `Georgia` darauf auf).
- App (`✓`, `✗`, `→` in der Fußzeile, Sans-Kontext): **DejaVu Sans**.

FINDINGS #4 nennt für den Pfeil „DejaVu Sans“ — für die Learn-CTA stimmt das
auf dieser Maschine nicht, dort ist es Liberation Serif; die Aussage „je System
anders“ bestätigt das. Belege: `docs/screenshots/b1-fallback-learn-cta-arrow.png`
(echte Learn-Seite) und `docs/screenshots/b1-fallback-app-marks.png`
(**Zusammenstellung**: die echten CSS-Klassen der App in die laufende Seite
gesetzt, Zeichen eingesetzt — kein Durchlauf des echten Feedback-Screens; die
Absolut-Positionierung von `.answer-mark` schiebt zwei Marken dort an den Rand).

**e) Wirkung auf D1: die Empfehlung ändert sich.** „Weg A, falls Upstream die
Zeichen hat“ trägt nicht für alle Zeichen:

| Zeichen | Gezeichnet in | Weg A möglich? |
|---|---|---|
| `✓` | IBM Plex Sans | **ja** (Plex hat es, im Pi-Subset) |
| `→` (Fußzeile) | IBM Plex Sans | **ja** |
| `→` (CTA) | Newsreader | **nein** — Newsreader hat es nicht; hieße: Pfeil aus Plex in der CTA setzen (andere Familie im selben Satz) oder Text ändern (Fables Sache) |
| `✗` | IBM Plex Sans | **nein** — in keiner der beiden Upstream-Schriften; Weg B (SVG) oder Fallback |
| `≈` (#11) | IBM Plex Sans | ja (beide Upstreams haben es) |

Die Rückfalllinie der Empfehlung („sonst B für `✓ ✗`, Fallback für `→`“) gilt
damit **nur teilweise**: `✓` und der Fußzeilen-Pfeil sind per Subset lösbar,
`✗` nicht. **Zu prüfen für Fable:** Plex um `→ ✓ ≈` erweitern (Quelle
`complete` liegt vor); `✗` als SVG — und dann `✓` ebenfalls, damit Paar und
Strichstärke zusammenpassen (Weg B für beide); CTA-Pfeil: Fallback akzeptieren
oder Pfeil in Plex. **Die Frage bleibt offen bei Fable; nichts umgesetzt.**
Der Preis (woff2-Delta je Gewicht) ist nicht gemessen, weil nichts neu erzeugt
wurde.

**cmap-Check (erledigt).** `tools/fonts/check.mjs`, `npm run verify:fonts`,
Teil von `npm run build` neben `verify:colors`. Baseline `KNOWN_GAPS`: `→ ✓ ✗`
(#4, #8) **und `≈` (#11)** — letzteres hat der Check beim ersten Lauf selbst
gefunden. Rot bei neuem fehlendem Codepoint und bei veralteter Ausnahme; beides
im Rot-Test belegt (HANDOVER P11).

#### Umsetzung (04.10.2026, Runde P14)

D1 ist entschieden (siehe „D1 — Entscheidung“); hier steht, wie die sechs
Bedingungen erfüllt sind und wo die Umsetzung vom Plan abweicht.

| # | Bedingung | Stand |
|---|---|---|
| 1 | SVG wendet §8 an, erfindet keine Gestalt | **erfüllt, mit Vorbehalt.** §8 legt Strich (1,5 px), runde Enden, 24er/20er Raster und „nur Linie, nichts gefüllt“ fest, aber **nicht die Form von Haken und Kreuz**. Gebaut ist die Standardform dieser Strichsprache (ein Polyline-Haken, ein Diagonalkreuz). Ob das die Form ist, die Fable meint, ist **seine** Frage — der Vorbehalt steht in der Übergabe. §8 sagt außerdem „Farbe: ink“; `currentColor` ist ink im Normalfall und erbt Amber/Gray nur dort, wo die Marke heute schon so gefärbt war. |
| 2 | Nie Farbe allein; `currentColor`; keine neue Farbe, kein Schatten; 37 Ansichten | **erfüllt.** `Mark` ist `aria-hidden`, der Satz daneben trägt die Auskunft (unverändert). Haken und Kreuz unterscheiden sich in der Form. Kein Farbliteral, kein Token, kein Schatten. `verify:amber`: 37 Ansichten, höchstens eine Fläche je View. |
| 3 | Schrift-Neuerzeugung: Werkzeug, Quelle, Lizenz, Größe | **erfüllt, aber anders als im Plan.** Siehe Abweichung A. Werkzeug: `fonttools` 4.66.1 (nicht Projektabhängigkeit, `pip install fonttools brotli`). Quelle: `@ibm/plex-sans` 1.1.0, `complete/woff2`. Lizenz (OFL 1.1, kein RFN) liegt unverändert in `src/fonts/LICENSE-ibm-plex-sans.txt`. Größe je Gewicht: 400: 22.588 → 22.676 B (+88), 500: 24.184 → 24.280 B (+96), 600: 24.252 → 24.412 B (+160). |
| 4 | `verify:fonts`: `KNOWN_GAPS` verliert `→`, `≈`; `→` bleibt in der Liste | **erfüllt in der Sache, nicht im Wortlaut.** Siehe Abweichung B. |
| 5 | Screenshots, sechs Themes, Pixeldiff | **teilweise.** Gemessen und angesehen: Training richtig und falsch (390 × 844, 1440 × 900), Theme-Haken in allen sieben Auswahlen (System + sechs Themes). **Nicht** einzeln gesehen: Echo-Check, Wort-Modus, Sende-Modus (dieselbe Komponente an denselben Klassen, aber nicht je ein Bild). **Kein Pixeldiff** gegen vorher gemacht. |
| 6 | H8 bleibt menschlich | **offen**, bewusst. |

**Abweichung A — nicht neu subsetten, sondern ergänzen.** Der Plan sagt „Plex
um `→ ✓ ≈` erweitern, Quelle `complete`“ und nimmt an, `complete` sei dieselbe
Zeichnung wie das heutige Subset. Gemessen ist sie es nicht: das Subset ist
Googles latin-Fassung (Plex **3.201**), `complete` ist **3.005**; von 232
Codepoints unterscheiden sich 223–225 in Umriss oder Breite. Ein Neu-Subsetten
aus `complete` hätte den gesamten Text in drei Gewichten verändert — das ist
keine „kleine Ergänzung“. Stattdessen kopiert `tools/fonts/add-glyphs.py` genau
zwei Glyphen (`→` einfach, `≈` ein Composite, dort zerlegt) in die bestehenden
Dateien; das Skript prüft selbst, dass jeder bestehende Umriss, jede Metrik und
jeder cmap-Eintrag **bitgleich** bleiben. Preis: `→`/`≈` stammen aus Plex 3.005,
der Rest aus 3.201; Hinting-Programme der beiden Glyphen sind die der älteren
Version (bei 1000 upem gleiche Rasterung, **nicht** an Windows-Rendering
geprüft, H8). `✓` kommt nicht ins Subset (Entscheidung D1).

**Abweichung B — `ACCEPTED_FALLBACK` statt `→` in `KNOWN_GAPS`.** Der Check
prüft die **Vereinigung** der vier Schnitte. Mit `→` in Plex wäre ein Eintrag
in `KNOWN_GAPS` eine „veraltete Ausnahme“ und der Check rot, obwohl die CTA
weiter aus dem Fallback kommt. Deshalb ein zweiter, benannter Mechanismus:
`ACCEPTED_FALLBACK` (Codepoint, Familie, Verzeichnis). Er ist rot, wenn die
benannte Familie (Newsreader) den Codepoint trägt, und meldet die Stelle in
jedem Lauf (heute: 14 Dateien in `content/learn/`). `KNOWN_GAPS` ist leer, der
Mechanismus bleibt.

**Belege.** `npm test` 481 · `npm run build` grün (`verify:fonts`: 62 Dateien,
110 Codepoints, 234 in der Markenfamilie; `verify:learn`: 18 Seiten) ·
`verify:amber` 37 Ansichten · `verify:keyboard` 25 Fälle (43 s). **Rot-Test
`verify:fonts`:** (1) Glyphen aus dem Subset (Dateien zurückgesetzt) → rot für
`→` und `≈`, Exit 1; (2) `ACCEPTED_FALLBACK`-Familie auf Plex gestellt (Plex hat
den Pfeil) → rot „Veraltete Ausnahme“, Exit 1. Beides zurückgenommen, wieder
grün. **Schrift am gerenderten Knoten** (CDP `getPlatformFontsForNode`, 390 ×
844): Fußzeile mit `→` und `.note` mit `≈` → „IBM Plex Sans (custom)“, kein
Systemfallback. **Bundle:** JS 234.624 → 235.144 B (+520 B, gzip 71,69 kB; die
Komponente `Mark` an zehn Stellen), Schriften +344 B zusammen, Newsreader
unverändert.

**Nicht belegt:** das Aussehen auf Windows/macOS/iOS/Android (H8); die Ansage
durch einen Screenreader (die Marken sind `aria-hidden`, der Satz trägt die
Auskunft — so war es vorher auch; nicht gehört); die Form von Haken und Kreuz
gegenüber Fables Erwartung; der Fußzeilen-Pfeil bei 1440 × 900 (dort lieferte
die Messung kein Ergebnis, der Knoten war nicht gerendert — der Pfeil kommt aus
derselben Regel wie bei 390 px, gemessen nur dort).

### B2 — Screenreader: Morse-Muster der Alphabet-Tabelle (Finding #5)

| | |
|---|---|
| **Aufwand** | S–M |
| **Entscheidung** | D2: Freigabe von Fable, weil vorgelesener Text entsteht, den Fable nicht geschrieben hat. |
| **Umsetzung** | Im Generator (`tools/learn/build.mjs`) Zellen der Form `**X** ·−` erkennen und das Muster zusätzlich als `<span class="visually-hidden">` in der vorgelesenen Form ausgeben; das sichtbare `·`/`−` bekommt `aria-hidden="true"`. Die Zuordnung `·`→„dit", `−`→„dah" **stehen schon** in `spellPattern` (`src/ui/Pattern.tsx`); sie kommt als 3-Zeilen-Mapping in den Generator (Duplikat statt spekulativer Abstraktion, CLAUDE.md §4). |
| **Offen in D2** | Sprache der deutschen Seiten (`/de/lernen/morsealphabet/`): „dit dah" ist international, aber EN-first (§2.10) gilt für UI-Strings, nicht für Learn-Seiten. |
| **Tests** | `tools/learn/`: Fixture mit einer Tabellenzeile → erwartetes HTML. `verify:learn` bekommt eine Pflicht: **jede Muster-Zelle trägt die vorgelesene Form** (Zählung gegen die 36 Zeichen). |
| **Akzeptanz** | Der Markdown-Quelltext in `content/learn/` ist **byte-identisch** (Diff leer); die 36 Zeichen tragen je eine vorgelesene Form; sichtbare Darstellung unverändert (Pixeldiff der Seite = 0); H3. |

#### Vorarbeit — Ergebnis (04.10.2026, Runde P12)

Nichts entschieden, kein App-Code, kein Learn-Text, kein Generator verändert
(`git diff` auf `src/`, `content/learn/`, `tools/learn/` leer). Messung:
`tools/prep/ax-pattern.mjs` (eine Messung, kein Check, nicht im Build).

**a) Wie die Muster heute ankommen** (headless Chromium, CDP
`Accessibility.getFullAXTree`/`getPartialAXTree`):

| Stelle | Accessibility-Tree |
|---|---|
| Learn-Tabelle, Zelle `**A** ·−` (EN und DE) | Zelle, Name `A ·−`; das Muster steht als **gewöhnlicher Text** (`StaticText " ·−"`) im Baum. Kein versteckter Text, kein `aria-*` in irgendeiner Zelle (0 Treffer). |
| App, Lernkarte/Auflösung (`Pattern.tsx`) | **Gelöst:** `.pattern-row` ist `aria-hidden`, im Baum steht `StaticText "dah dit dah"` (für K). |

Das Finding stimmt also für die **Learn-Seiten**, nicht für die App.

**Der Umfang ist größer als im Plan-Entwurf (Korrektur).** Die Umsetzung oben
spricht von Zellen der Form `**X** ·−`. Pro Alphabet-Seite (`morse-code-alphabet`
und `morsealphabet`, je 41 Zellen mit Muster) und in den Geschichts-Seiten stehen
Muster aber an **vier Arten von Stellen**:

| Art | Beispiel | Anzahl je Sprache |
|---|---|---|
| Zelle `**X** ·−` (Buchstaben, Ziffern) | `**A** ·−`, `**E** ·` | 36 |
| **Reine Code-Zelle** der Satzzeichen-Tabelle (zweite Spalte, ohne Buchstaben davor) | `Period . | ·−·−·−` | 5 |
| Muster im Fließtext in Klammern | „the letter R (·−·)“ | 1 (Alphabet-Seite) |
| SOS als fett gesetzte Folge | `**··· −−− ···**` | 1 auf der Alphabet-Seite, 1 auf der Geschichts-Seite |

Der Entwurf („Zellen der Form `**X** ·−`“) deckt nur die ersten 36 ab; die
**5 reinen Code-Zellen und die 3 Fließtext-Stellen blieben stumm**. Zusätzlich
gibt es Zeichen, die **kein** Muster sind und nicht erfasst werden dürfen:
`·` als Trennzeichen („**Dot:** 1 unit · **Dash:** 3 units“, Alphabet-Seite
Z. 48) und inline-code-Einzelzeichen („A dot is written here as `·`“). Eine
einfache Ersetzung `[·−]+` träfe sie falsch.

**Nicht belegt, nur ein echter Screenreader klärt es (H3, Mensch):**

- ob `·` (U+00B7) und `−` (U+2212) vorgelesen werden („Mittelpunkt“, „Minus“),
  gar nicht oder je nach Satzzeichen-Einstellung — der Baum zeigt, dass die
  Zeichen **dort stehen**, nicht, was gesprochen wird. Die Annahme in Finding #5
  („bei *Satzzeichen: keine* heißt die Zelle nur noch ‚A‘“) ist plausibel,
  aber **hier nicht gemessen**;
- ob `role="img"` + `aria-label` als „Grafik“ angesagt wird (Option 1);
- wie VoiceOver/NVDA/TalkBack in der Tabellen-Navigation (Zelle für Zelle)
  die Zelle ausgeben;
- wie ein deutscher Sprachausgabe-Motor „dit dah“ ausspricht.

**b) Optionen für D2** (am DOM simuliert, im Generator **nicht** gebaut; Baum-
Ergebnis je Option, Zelle `A`):

| Option | Baum (Zellenname) | Sichtbar | Preis |
|---|---|---|---|
| **1 — `aria-label`** am Muster, `role="img"` | `A dit dah`; der Text selbst entfällt aus dem Baum | unverändert | Eine „Grafik“ mitten in einer Tabellenzelle; ob und wie sie angesagt wird, ist SR-abhängig (H3). Ohne `role` wird `aria-label` auf einem `<span>` von vielen SR ignoriert. |
| **2 — sichtbarer Text „dit dah“** statt `·−` | `A dit dah` | **ändert sich** | Widerspricht „sichtbare Darstellung unverändert“ (Akzeptanz) und CONCEPT-LEARN §5 („Text mit · und −“). Nicht empfohlen. |
| **3 — Zeichen `aria-hidden`, daneben verstecktes `<span>`** | `A dit dah` (Zeichen aus dem Baum, `StaticText "dit dah"` drin) | unverändert | **Dieselbe Technik wie `Pattern.tsx`** (dort gemessen: `StaticText "dah dit dah"`). **`.visually-hidden` fehlt im Learn-Stylesheet** (`tools/learn/learn.css`: 0 Treffer, im Seiten-CSS nicht vorhanden): eine Regel (~10 Zeilen, aus `src/styles.css:1738` kopiert, nicht extrahiert) muss mit. Das Verstecken per `clip-path` lässt den Text **markier- und kopierbar** und für Suchmaschinen sichtbar — nicht gemessen, nur genannt. |

**Wirkung auf die Markdown-Quelle:** keine. Alle drei Optionen entstehen im
Generator (`tools/learn/pages.mjs`, `renderer`), `content/learn/*.md` bleibt
byte-identisch — nachzuweisen mit leerem `git diff` (bei dieser Vorarbeit
erfüllt, weil nichts angefasst wurde). **Erkennungsregel**, damit der Generator
nichts Falsches trifft: in Tabellenzellen die **ganze Zelle oder ihr
nachgestellter Rest** aus `[·−]` (deckt `**E** ·` und die 5 reinen Code-Zellen);
im Fließtext nur Folgen **ab zwei Zeichen** bzw. in Klammern — einzelne `·`
sind dort Trennzeichen. Das ist eine Kontext-Regel, kein einheitliches Muster:
Aufwand daher **S–M**, eher M als die ursprünglichen „zehn Zeilen“.

**EN-first (§2.10):** „dit dah“ ist Englisch und für die EN-Seiten und die App
konsistent (`spellPattern`). Für die DE-Seiten gilt §2.10 laut Plan nicht (Learn-
Seiten sind keine UI-Strings). Ob eine deutsche Sprachausgabe „dit dah“ sinnvoll
spricht und ob ein deutscher Leser „di dah“ erwartet, ist **nicht belegt** und
Fables Entscheidung.

**c) Wirkung auf D2: Empfehlung bestätigt für das „Ob“ und für Option 3;
Umfang korrigiert; der DE-Wortlaut bleibt offen.** Ja zu einer vorgelesenen
Form (Option 3, identisch zur App); der Umfang sind **36 + 5 + 3 Stellen je
Sprache** statt 36; `verify:learn` müsste entsprechend nicht „36“, sondern alle
Muster-Stellen zählen. Nicht belegt, bis H3 gelaufen ist, ob die heutige Lage
überhaupt hörbar fehlerhaft ist.

#### Umsetzung (04.10.2026, Runde P16)

Gebaut nach „D2 — Entscheidung“ (Option 3, „dit dah“ in EN und DE, 36 + 5 + 3
Stellen je Sprache). Berührt: `tools/learn/pages.mjs`, `tools/learn/learn.css`,
`tools/learn/verify.mjs`, `tools/learn/pages.test.mjs`. **`content/learn/`,
`src/` und alle App-Dateien unverändert** (`git diff` leer).

- **Generator** (`pages.mjs`): `markPatterns` baut den `marked`-Token-Baum um,
  **bevor** er gerendert wird — Stellen werden `html`-Token
  `<span class="morse-pattern" aria-hidden="true">…</span><span
  class="visually-hidden">dit dah</span>`. Kontextregel wie in P12: in einer
  Tabellenzelle gilt die ganze Zelle (nach dem fetten Buchstaben) aus `·`/`−`,
  im Fließtext nur Folgen **ab zwei Zeichen** (auch `··· −−− ···`); Inline-Code
  und einzelne `·` als Trennzeichen bleiben unberührt. Das Mapping
  (`spellMarks`) ist ein 1-Zeilen-Duplikat von `spellPattern` (§4).
- **Der Span umfasst das ganze Wort**, nicht nur die Zeichen: bei `(·−·)` stehen
  die Klammern im sichtbaren Span, das versteckte Span wiederholt sie
  („(dit dah dit)“); bei Zellen steht das Leerzeichen vor dem Muster im Span.
  Grund ist die Pixelmessung unten, nicht Geschmack.
- **`learn.css`:** `.visually-hidden` aus `src/styles.css:1731` kopiert
  (nicht extrahiert), +345 Byte.
- **`verify:learn`:** zählt die Stellen **aus dem Markdown-Quelltext** (eigene
  Zählung, nicht die des Generators) und gleicht je Seite mit `dist/` ab; jede
  Stelle muss ihr verstecktes Span mit der erwarteten Form tragen (eigene
  Zuordnung); nach Abzug der Stellen und des Inline-Codes darf in keiner Zelle
  ein `·`/`−` und im Fließtext keine Folge ≥ 2 mehr stehen; `.visually-hidden`
  muss im ausgelieferten CSS stehen. **88 Stellen** (2 × 44: Alphabet-Seite
  36 + 5 + R + SOS = 43, Geschichts-Seite 1).
- **Tests:** +7 (`npm test` 488): Zelle, reine Code-Zelle, Klammer und Fett im
  Fließtext, Trennzeichen/Inline-Code bleiben, Seiten ohne Muster, Zuordnung,
  und die echten Seiten mit 43 + 1 Stellen je Sprache. Ein bestehender Test
  erwartete `<strong>A</strong> ·−` und prüft jetzt die neue Form.

**Belegt:**

| Kriterium | Ergebnis |
|---|---|
| Markdown-Quelltext byte-identisch | `git diff` auf `content/` leer |
| Alle Stellen tragen die vorgelesene Form | `verify:learn`: 88 Stellen, 18 Seiten |
| Rot-Test | Generator ohne verstecktes Span → 174 Fehler, Exit 1; `·`→„dit“, `−`→„dit“ (falsches Wort) → rot; beide zurückgenommen → grün |
| Accessibility-Tree (Chromium, CDP) | **vorher:** Zellname `A ·−`, 47 StaticText mit `·`/`−`, 0 mit dit/dah. **nachher:** Zellname `A dit dah` (36 Zellen), 4 StaticText mit `·`/`−` — das sind Trennzeichen und Inline-Code (soll so sein), 43 (EN) / 44 (DE) mit dit/dah¹ |
| App-Bundle unverändert | JS `index-BM2jghgC.js` 235.318 B, CSS `index-DUx-k1as.css` 20.636 B — Hashes wie vor B2 |
| Learn-Seiten (Delta) | Alphabet-Seite +4.560 B (EN) / +4.560 B (DE), Geschichts-Seite +127 B; `learn.css` +345 B |

¹ DE zählt eine Stelle mehr: „dahinterliegender“ im Fließtext enthält „dah“ als
Zeichenfolge (auch vor B2: 1 Treffer); kein Muster.

**Nicht erfüllt: „Pixeldiff der Seite = 0“ — nur teilweise.** Vorher/nachher
mit 16 Vollseiten-Screenshots (4 Seiten × 390/1280 px × hell/dunkel,
Chromium headless; das Rendering ist deterministisch: zweimal „vorher“ ist
bitgleich). Ergebnis nach dem Umbau:

- **Alle Tabellen: 0 Pixel Differenz**, in allen 16 Bildern.
- **8 von 16 Bildern vollständig identisch** (EN-Geschichte alle vier, EN-
  Alphabet bei 1280 px, DE-Geschichte bei 390 px).
- **8 Bilder weichen ab**, ausschließlich in den **Zeilen der Fließtext-Muster**
  (`(·−·)`, SOS): 0 abweichende Pixelzeilen außerhalb dieser Absätze, gleiche
  Seitenhöhe (kein Layoutversatz), größter Kanalunterschied 60 von 255, 9–16
  Pixelzeilen je Bild. Ursache: **jedes** Element mitten in einem Textlauf
  verschiebt in Chromium die Subpixel-Positionierung des Rests der Zeile — mit
  einem nackten `<span>` ohne jedes Attribut um ein Wort reproduziert (sieben
  Markup-Varianten gegen den unveränderten Absatz; die Kontrolle ohne Span ist
  identisch). Mit einem Versteck im Fließtext ist das nicht vermeidbar.
  **Entscheidung für den Owner:** so lassen (Subpixel-Antialiasing in drei
  Zeilen je Sprache, sichtbar nicht wahrnehmbar, nicht am Gerät gesehen) oder
  die drei Fließtext-Stellen je Sprache **nicht** markieren (bleiben stumm).
  Gebaut ist das Erste.

**Nicht belegt:** H3 — was ein Screenreader aus `dit dah` macht (Aussprache
im Deutschen, Tabellen-Navigation, ob `aria-hidden` auf einem Span in einer
Zelle überall respektiert wird); Firefox und Safari (Pixelmessung nur
Chromium); ob `.visually-hidden` in `.table-wrap` (scrollbarer Kasten) bei
sehr schmalem Fenster eine Scrollbar auslöst (bei 390 px kein Überlauf
gemessen, andere Breiten nicht).

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

#### Vorarbeit — Ergebnis (04.10.2026, Runde P12)

Nichts entschieden, kein App-Code verändert. Messung:
`tools/prep/echo-height.mjs` (eine Messung, kein Check, nicht im Build; 30 s).
Seed wie `verify:keyboard`: N aktive Zeichen aus `CHARACTER_ORDER`, N−1
eingeführt, das letzte fällig → Echo-Check mit `answerPool` = N Optionen.
Gemessen in Phase `echo-answering`, headless Chromium, gebauter Stand
(`index-B0VVu-Kv.js`).

**a) Heute** (Seitenhöhe gegen Fenster; „Bühne“ = `.stage`, die schrumpft):

| Viewport | Zeichen | Zeilen | Taste | Seite | scrollt | Bühne |
|---|---|---|---|---|---|---|
| 390 × 844 | 15 | 5 | 106 × 64 | 844 | nein | 304 |
| 390 × 844 | **36** | **12** | 106 × 64 | **1311** | **ja, +467** | 239 |
| 1280 × 720 | 15 | 5 | 189 × 64 | 775 | **ja, +55** | 235 |
| 1280 × 720 | **36** | 12 | 189 × 64 | **1307** | **ja, +587** | 235 |
| 1440 × 900 | 15 | 5 | 189 × 64 | 900 | nein | 360 |
| 1440 × 900 | **36** | 12 | 189 × 64 | **1307** | **ja, +407** | 235 |

Die 1311 px bei 390 × 844 bestätigen die Zahl aus Finding #6. **Neu:** der
Echo-Check scrollt **schon bei 15 Zeichen** bei 1280 × 720 (+55 px); die Bühne
gibt bis 235 px nach und kann nicht weiter (FINDINGS #13). Horizontal läuft
nichts über. Zeilenumbrüche: die Optionen brechen im Dreier-Gitter nach 3 je
Zeile — 15 → 5, 36 → 12 Zeilen; kein Zeichen umgebrochen (Einzelzeichen).

**b) Die Wege, am DOM simuliert** (kein gebauter Code; Tabelle = Seite/Fenster
und Tasten):

| Weg | 390 × 844 | 1280 × 720 | 1440 × 900 |
|---|---|---|---|
| **(a) Tastenfeld, nur Pool-Optionen** (Klasse `keypad`, 15 bzw. 36 Tasten) | 36 Z.: 844/844, 6 Zeilen, 50 × 46; 15 Z.: 844/844, 3 Zeilen | 720/720, 36 Z.: 3 Zeilen, 44 × 44 | 900/900, 3 Zeilen, 44 × 44 |
| **(a) ortsfest mit 36 Plätzen** (`data-active`, wie `ReviewPicker`/Training; 15 und 36 gleich hoch) | 844/844; Antwortblock 316 px, Bühne 364 | 720/720; Antworten 144, Bühne 412 | 900/900; Antworten 144, Bühne 592 |
| **(b) deckeln auf 6 Optionen** (gefragte + Ablenker) | 844/844; 2 Zeilen, 106 × 64 | 720/720 | 900/900 |

In allen simulierten Fällen **kein Scrollen**, Abstand Bühne↔Antworten ≥ 24 px,
Bühne ≥ 364 px (heute bis hinunter auf 235 px). Weg (a) löst auch den
Fall „15 Zeichen bei 1280 × 720“; (b) ebenfalls.

**Grenzen der Simulation:** (a) ist nur die Höhe; das echte Raster bräuchte die
Taste-zu-Platz-Zuordnung (`KEYPAD_LAYOUT`) und `data-active`, die Größen
(50 × 46 bzw. 44 × 44) stammen aus der bestehenden `.keypad`-Regel, nicht aus
einer Auslegung für den Echo-Check. (b) ist nur ein Ausblenden — die eigentliche
Auswahl der Ablenker gibt es nicht. Antwort-Zeit/Treffsicherheit ist **nicht
gemessen** (H9 am Telefon).

**c) Entscheidungsvorlage D3:**

| Weg | Wirkung | Preis |
|---|---|---|
| **(a) Tastenfeld** | Kein Scrollen in drei Viewports bei 15 und 36 (simuliert). Die wandernde Taste verschwindet; feste Plätze wie im Training. | Taste schmaler: **50 × 46 px bei 390**, **44 × 44 px** am Desktop (statt 106/189 × 64) — kleinere Trefferfläche, H4/H9. Es ist eine Setzung, was „aktiv“ im Echo-Check ist (Pool oder ganzer Satz, **offen**) — bei ortsfestem Raster wären die Nicht-Pool-Tasten gedimmt und müssten für Screenreader „not in this round“ tragen (wie im Training). Engine unberührt: `answerPool`/`echoKeyAction` bleiben, K9–K11 laufen unverändert. Dazu eine neue Ansicht in `verify:amber` („Echo-Check, 36 Zeichen“; heute gibt es nur „Antwort offen“/„Auflösung“ mit **einer** Option). |
| **(b) Deckeln** | Kein Scrollen, große Tasten (106 × 64), Gitter bleibt. | **Ändert die Engine:** `answerPool` und damit, welche Tasten antworten (`echoKeyAction`, Ruling #108); Auswahl der Ablenker ist eine neue Regel mit Tests, sie berührt P6 und K9–K11. Ablenker-Wahl kann die Schwierigkeit verschieben (Fables Frage). Und: Tasten, die man kennt, würden nicht angeboten — widerspricht dem Zweck des Checks („alles bisher Eingeführte“). |
| **(c) Lassen** | Nichts. | **Scrollen bei 36 (+407 bis +587 px) in allen drei Viewports, und bereits ab 15 Zeichen bei 1280 × 720 (+55 px).** Das Finding bleibt offen. |

**d) Wirkung auf D3: Empfehlung (a) bleibt, mit zwei Einschränkungen.**
Bestätigt ist, dass (a) in der Simulation alle sechs Fälle ohne Scrollen
löst und die Engine nicht berührt. **Offen bleiben:** (1) die Größe der Tasten
(50 × 46 / 44 × 44 gegen die heutigen 64 px, nur am Telefon zu beurteilen, H4/H9);
(2) was „aktiv“ im Echo-Check heißt. (c) ist ausdrücklich nicht „kostenlos“:
der 15-Zeichen-Fall bei 1280 × 720 ist schon heute betroffen.

#### Umsetzung (04.10.2026, Runde P15)

Gebaut ist Weg (a) ortsfest, wie in „D3 — Entscheidung“ unten festgelegt.
`Echo` in `src/ui/Learn.tsx` rendert ab 13 Optionen (`usesKeypad(pool.length)`,
dieselbe Schwelle wie das Training) `.keypad` über `KEYPAD_LAYOUT` mit
`data-active`, `data-row-start` und „ — not in this round“; darunter bleibt das
Dreier-Gitter. Engine, `answerPool`, `echoKeyAction`, `keypad.ts` und
`styles.css` sind **unverändert**.

Gemessen mit `tools/prep/echo-height.mjs` (gebauter Stand, headless Chromium,
Seite / Fenster; vorher = `0b216d7`, `index-DI9tmRbS.js`):

| Viewport | Zeichen | vorher | nachher | Taste nachher | Bühne vorher → nachher | Abstand |
|---|---|---|---|---|---|---|
| 390 × 844 | 15 | 844 / 844 | 844 / 844, 7 Zeilen | 50 × 46 | 304 → 310 | 24 |
| 390 × 844 | 36 | **1311** / 844 (+467) | 844 / 844 | 50 × 46 | 239 → 310 | 24 |
| 1280 × 720 | 15 | **775** / 720 (+55, #13) | 720 / 720, 4 Zeilen | 44 × 44 | 235 → 362 | 24 |
| 1280 × 720 | 36 | **1307** / 720 (+587) | 720 / 720 | 44 × 44 | 235 → 362 | 24 |
| 1440 × 900 | 15 | 900 / 900 | 900 / 900 | 44 × 44 | 360 → 542 | 24 |
| 1440 × 900 | 36 | **1307** / 900 (+407) | 900 / 900 | 44 × 44 | 235 → 542 | 24 |

Kein Scrollen in allen sechs Fällen, 15 und 36 Zeichen **gleich hoch** (das ist
der Zweck der Ortsfestigkeit). Kein Überlauf nach rechts. Die Simulation aus P12
war bei 390 × 844 etwas optimistischer (Antworten 316 px, Bühne 364); der echte
Aufbau hat die Ziffernreihe separat (7 statt 6 Zeilen): Antworten 370 px, Bühne
310 px — immer noch über dem Minimum von 235 px.

`verify:amber`: **39 Ansichten** (neu: „Echo-Check, 36 Zeichen, Antwort offen
(B3)“ und „… Auflösung falsch (B3)“, 0 bzw. 1 Amber — die richtige Antwort).
Bisher gab es nur „Antwort offen“/„Auflösung“ mit einer Option. Dafür bekam
`progress()` den Parameter `introduced`. `verify:keyboard` **25 Fälle** grün,
`npm test` **481**. Das Messskript misst jetzt `.answers, .keypad`; die
P12-Simulationen laufen nur noch mit `ECHO_VARIANTS=heute,a,a36,b` gegen einen
Stand vor B3.

**Nicht belegt:** Bedienbarkeit der 44–50-px-Tasten am Telefon, Antwortzeit und
Treffsicherheit (**H9**, menschlich); Screenreader über die gedimmten Tasten im
Echo-Check (H3); Verhalten beim Wechsel Gitter → Tastenfeld mitten im Lauf nur
aus dem Code gelesen (der Pool wächst nur), nicht im Browser gesehen.

### C1 — Settings-Höhe (S5)

| | |
|---|---|
| **Aufwand** | S |
| **Messung zuerst** | Höhe der Settings bei 390 × 844 / 1280 × 720 / 1440 × 900 **nach A2** (der Log-Knopf aus P8 ist dann weg). Bekannt ist nur der Stand von P7: 960 px bei 390 × 844 und 900 px bei 1440 × 900; seit dem Log-Knopf (P8) und bei 1280 × 720 gibt es **keine Messung**. |
| **Entscheidung** | D4. (a) 960 akzeptieren — der Screen scrollte am Telefon schon vorher (seit P5b), die Kennung steht als Letztes. (b) Notiz unter „Characters" streichen (ca. −40 px). (c) Kennung und „Characters" in einen Block. **Empfehlung (a).** |
| **Messung (04.10.2026, P13)** | Dokumenthöhe, 20 aktive Zeichen, `tools/prep/settings-height.mjs`. **Vor dem Ausbau** (P12-Stand): 1031 px bei 390 × 844 (scrollt, +187), 893 px bei 1280 × 720 (scrollt, +173), 900 px bei 1440 × 900 (scrollt nicht). **Nach dem Ausbau:** **960 px** bei 390 × 844 (scrollt, +116), **822 px** bei 1280 × 720 (scrollt, +102; neuer Referenzwert), **900 px** bei 1440 × 900 (scrollt nicht, Seite = Fenster). Der Log-Knopf kostete 71 px bei 390 und 1280; bei 1440 × 900 füllt die Seite das Fenster ohnehin. 960 / 900 entsprechen den Werten aus P7. **Keine Entscheidung getroffen.** |
| **Stand** | Messung **erledigt**; D4 (a) „akzeptieren“ vom Owner bestätigt (P17, kein Fable-Ruling; Notion-Log steht aus). |
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

**Stand (04.10.2026, P17):** Der Owner hat D4–D9 wie empfohlen bestätigt (D4 a, D5/D6/D9 bestätigt, D7 Hash, D8 nicht bauen). Code geprüft: er entspricht in allen Punkten der Spalte „Heute“ (`echoKeyAction` → `'play'` in `echo-ready`; `keyChord.ts` ohne `altKey`; Kennung = Hash; keine „answer noted“-Zeile; Speed-round-Auflösung unverändert). **Es gibt nichts umzusetzen; PR 7 ist ein reiner Protokoll-Eintrag.** Die Bestätigung ist eine Owner-Aussage, kein Fable-Ruling; den Notion-Log-Eintrag macht der Owner. D9-Zusatzsatz („you typed …“) nicht gebaut: neuer UI-String, Fables Wortlaut. D8 wartet weiter auf H2.

### D — Abschluss

| | |
|---|---|
| **Aufwand** | S |
| **Schritte** | 1. `FINDINGS.md`: je Finding eine Status-Zeile in der Form der bestehenden Einträge („**Status: entschieden und behoben** (Datum, Ruling #…)"); der Ursprungstext bleibt stehen. 2. `HANDOVER.md`: Kopf-Abschnitt je Runde, Inventur-Tabellen nachgezogen. 3. Gesamtlauf: `npm test`, `npm run build`, `verify:amber`, `verify:contrast`, `verify:keyboard`. 4. Dieser Plan: Status-Spalte in §1 aktualisieren, Datei **nicht** löschen (sie ist der Beleg). |
| **Stand** | **Erledigt (04.10.2026, Runde P18).** Schritte 1–4 ausgeführt (Status-Zeilen in `FINDINGS.md` für #7, #9, #12, #14, #15, #16 ergänzt; Rest stand schon; Inventur-Zeile Echo-Check nachgezogen; §1 aktualisiert; Gesamtlauf grün, Bundle-Delta unten). |
| **Akzeptanz** | §6 vollständig abgehakt — **nicht möglich**: vier Findings und S7 hängen an menschlichen Prüfungen bzw. Rulings (siehe „Stand P18“ in §6). Abgehakt ist, was von hier aus abhakbar ist; der Rest ist benannt. |

## 4. Entscheidungsregister

Jede Zeile: **wer** entscheidet, **Empfehlung**, was **ohne Entscheidung** gilt.

| | Frage | Wer | Empfehlung | Ohne Entscheidung |
|---|---|---|---|---|
| D1 | Glyphen `→ ✓ ✗ ≈` (B1) | Fable → **vom Owner am 04.10. an Claude delegiert** („Entscheide du“) | — | **Entschieden, siehe „D1 — Entscheidung“ unten.** Umsetzung PR 4. |
| D2 | Muster für Screenreader erzeugen (B2)? EN „dit dah" — und DE? | Fable → **vom Owner am 04.10. an Claude delegiert** („entscheide du") | Ja, Option 3 (versteckter Text wie `Pattern.tsx`); Umfang 36 + 5 + 3 Stellen je Sprache. **Nach P12:** „Ja" bestätigt, DE-Wortlaut **offen** | **Entschieden (Option 3, „dit dah" EN und DE), siehe „D2 — Entscheidung".** Umsetzung PR 5 (P16). |
| D3 | Echo-Check-Liste bei 36 Zeichen (B3): Tastenfeld, deckeln, lassen? | Fable → **vom Owner am 04.10. an Claude delegiert** („entscheide du“) | (a) Tastenfeld | **Entschieden (a), siehe „D3 — Entscheidung“.** Umsetzung PR 6 (P15). |
| D4 | Settings-Höhe am Telefon (C1) | Fable | (a) akzeptieren, nach A2 nachmessen | **Owner hat (a) bestätigt (P17); Notion-Log steht aus.** Nachgemessen (P13): 960 px bei 390 × 844, 822 px bei 1280 × 720, 900 px bei 1440 × 900**; scrollt an den ersten beiden |
| D5 | Zeichen in `echo-ready` startet Wiedergabe | Fable | bestätigen | bleibt — Owner bestätigt (P17), Notion-Log steht aus |
| D6 | Alt+Buchstabe erreicht die App | Fable | bestätigen | bleibt — Owner bestätigt (P17), Notion-Log steht aus |
| D7 | Hash statt Versionsname | Fable | Hash | bleibt — Owner bestätigt (P17), Notion-Log steht aus |
| D8 | „answer noted"-Zeile (P5) | Fable | **nicht bauen**, erst H2 | nicht gebaut — Owner bestätigt (P17), Notion-Log steht aus; wartet auf H2 |
| D9 | Speed round / Auflösung ohne Taste | Fable | bestätigen; Zusatzsatz optional | bleibt — Owner bestätigt (P17), Notion-Log steht aus |
| D10 | Messgerät ausbauen oder behalten | Owner | ausbauen (nach G1) | **G1 = „sitzt“ (04.10.) → ausbauen gilt als Standard; A2 ist die nächste Umsetzung.** Der Owner hat D10 nicht ausdrücklich beantwortet und kann es vor dem Merge von A2 umkehren. |
| D11 | `verify:keyboard`: Hilfscode duplizieren oder aus `verify:amber` extrahieren | Owner | duplizieren | dupliziert |

Entscheidungen werden im **Notion-Log** als Ruling festgehalten und mit
Nummer in den jeweiligen Commit geschrieben (wie bisher: „Ruling Notion-Log #…").

### D3 — Entscheidung (Owner-Delegation, 04.10.2026)

Der Owner hat D3 mit „entscheide du“ an Claude delegiert. Das ersetzt kein
Fable-Ruling (CLAUDE.md §2.9, §3): **protokolliert als „Owner-Delegation
04.10.2026“, der Eintrag ins Notion-Log ist Sache des Owners.** Umkehrbar:
PR 6 ist ein eigener PR.

**Entscheidung: Weg (a), ortsfest.** Tastenfeld mit 36 Plätzen wie im
Training und im `ReviewPicker` (`.keypad`, `data-active`), keine wandernde
Taste.

- **„Aktiv“ im Echo-Check = die Optionen des Checks (`answerPool`).** Nicht-Pool-
  Tasten sind gedimmt, nicht bedienbar und tragen für Screenreader „ — not in
  this round“, wie im Training.
- **Schwelle:** dieselbe wie im Training (`usesKeypad`, ab 13), gemessen an
  den Optionen des Checks. Darunter bleibt das Dreier-Gitter — Ruling #75
  Punkt 3 („dort sind es bewusst wenige Optionen“) gilt am Anfang weiter.
- **Engine unberührt:** `answerPool`, `echoKeyAction`; K9–K11 laufen
  unverändert. Weg (b) ist nicht gewählt.
- **Tastengröße:** die bestehende `.keypad`-Regel (50 × 46 / 44 × 44). Ob das
  am Telefon trägt, ist **H9** und bleibt eine menschliche Prüfung.

**Warum (a):** (1) Es ist der Weg, den das Produkt für dasselbe Problem schon
gegangen ist (#75 Training, #110 `ReviewPicker`) — ein Tastenfeld, ein
Muster. (2) Er ändert nicht, **welche Tasten antworten**; (b) hätte die
Engine, K9–K11 und eine neue Ablenker-Regel berührt und angebotene Zeichen
weggelassen, die man kennt — das widerspricht dem Zweck des Checks („alles
bisher Eingeführte“). (3) Die Ortsfestigkeit gilt für die Übung: wer im
Training an feste Plätze gewöhnt ist, greift im Echo-Check nicht mehr ins
Leere. (4) (c) ließe #13 stehen. Preis: kleinere Tasten (H9).

### D2 — Entscheidung (Owner-Delegation, 04.10.2026)

Der Owner hat D2 mit „entscheide du“ an Claude delegiert. Das ersetzt kein
Fable-Ruling (CLAUDE.md §2.9, §3 — der Learn-Bereich gehört Fable):
**protokolliert als „Owner-Delegation 04.10.2026“, der Eintrag ins Notion-Log
ist Sache des Owners.** Umkehrbar: PR 5 ist ein eigener PR, und der Text
entsteht im Generator, nicht in Fables Quelle.

**Entscheidung: Option 3** (Zeichen `aria-hidden`, daneben ein verstecktes Span,
dieselbe Technik wie `Pattern.tsx`), **„dit dah“ in EN und DE**, Umfang
**36 + 5 + 3 Stellen je Sprache**.

- Der **DE-Wortlaut ist eine Setzung, kein Beleg**: „dit dah“ ist konsistent mit
  `spellPattern` und der App; ob eine deutsche Sprachausgabe es sinnvoll spricht
  oder ein deutscher Leser „di dah“ erwartet, ist **nicht belegt** (H3).
- Es entsteht vorgelesener Text, den Fable nicht geschrieben hat — deshalb
  Generator statt Quelle, `content/learn/` byte-identisch.

**Warum Option 3:** (1) Dieselbe Technik, die in der App gemessen funktioniert
(`StaticText "dah dit dah"`). (2) Option 2 (sichtbarer Text) ändert die
Darstellung und widerspricht CONCEPT-LEARN §5; Option 1 (`role="img"` in einer
Tabellenzelle) hängt davon ab, wie der Screenreader eine „Grafik“ in einer Zelle
ansagt. (3) Das „Lassen“ (Default) ließe ein Hörtraining für Menschen ohne Sicht
auf einer Seite stumm, die genau dieses Muster erklärt (CLAUDE.md §6).
**Preis:** Die versteckte Form ist markier- und kopierbar; die Fließtext-Stellen
verschieben das Subpixel-Rendering ihrer Zeile (siehe B2, „Umsetzung“).

### D1 — Entscheidung (Owner-Delegation, 04.10.2026)

Der Owner hat D1 mit „Entscheide du“ an Claude übergeben. CLAUDE.md §2.9 und §3
ordnen Schriftdateien und die Form von Haken und Kreuz dem Design-Owner (Fable)
zu; die Delegation ändert das nicht still. Deshalb gilt:

- Die Entscheidung steht hier als **„Owner-Delegation 04.10.2026“**, nicht als
  Fable-Ruling. **Den Eintrag ins Notion-Log macht der Owner.**
- Sie ist **umkehrbar**: PR 4 ist ein eigener PR, und die Zeichnung beurteilt
  der Owner am Gerät (H8), bevor er mergt.

**Grundlage:** die Messungen aus P11 (B1, „Vorarbeit — Ergebnis“). Entscheidend
sind drei Befunde: Plex hat `→ ✓ ≈`, aber **kein `✗`**; Newsreader hat keins der
vier; die Lizenz (OFL 1.1, **kein** Reserved Font Name deklariert) erlaubt ein
Neu-Subsetten mit mitgelieferter Lizenz und Copyright.

| Zeichen | Entscheidung | Warum |
|---|---|---|
| `→` in der **Fußzeile** (`App.tsx`, Plex), `≈` (`Send.tsx`, Plex) | **Weg A:** Plex-Subset um `→` und `≈` erweitern (Quelle `@ibm/plex-sans` `complete/woff2`, beide Zeichen dort vorhanden) | Plex hat sie, die Lizenz trägt es, der Eingriff ist klein und ändert keine Form, die jemand entworfen hätte |
| `✓` und `✗` (Fundstellen: B1, „Vorarbeit — Ergebnis“, a) | **Weg B als Paar:** beide als Inline-SVG im Raster und Strich von Guidelines 1.1 §8 (24er Raster, 1,5 px Strich) — wie Menü-Icon und Play-Pfeil | `✗` gibt es in **keiner** Upstream-Schrift. `✓` allein aus Plex machte ein Paar aus zwei Quellen mit zwei Strichstärken. Ein Paar muss aus **einer** Hand kommen, und die einzige, die auf allen Systemen gleich zeichnet, ist das SVG. `✓` wird deshalb **nicht** ins Subset aufgenommen |
| `→` in der **Learn-CTA** (Newsreader, 14 Seiten) | **Weg C:** Fallback bewusst akzeptiert; Finding „entschieden: bleibt“ für diese Stelle | Newsreader hat den Pfeil nicht. Ein Plex-Pfeil in einem Newsreader-Satz mischte zwei Familien in einer Zeile, und der Text ist Fables (CLAUDE.md §3) — er bleibt **byte-identisch** |

**Bedingungen für PR 4** (jede ist Akzeptanzkriterium):

1. **Die SVG-Zeichen erfinden keine neue Gestalt**, sondern wenden §8 an. Vor dem
   Zeichnen §8 aus `docs/brand/Morse_Lab_Brand_Guidelines_1.1.html` lesen; ist dort
   nicht eindeutig geregelt, wie Haken und Kreuz aussehen, **anhalten und fragen**.
2. **Nie Farbe allein** (CLAUDE.md §6): die Marken bleiben `aria-hidden`, der Satz
   daneben trägt die Auskunft — wie heute. Farbe nur über `currentColor`,
   **keine neue Farbe, kein Token, kein Schatten**, `verify:amber` bleibt bei
   37 Ansichten grün (in der Auflösung einer falschen Antwort trägt das **richtige** Zeichen ein Amber, `data-tone="amber"`; die Marke darin erbt es über `currentColor`).
3. **Schrift-Neuerzeugung:** Werkzeug und Quelle nennen, Lizenztext und Copyright
   neben die Dateien legen, **woff2-Größe je Gewicht vorher/nachher**
   (Bundle-Delta nennen, CLAUDE.md §7). Ist das Werkzeug (z. B. `fonttools`)
   nicht verfügbar oder nur als Projektabhängigkeit zu haben: **anhalten und
   beschreiben** (CLAUDE.md §3), nicht installieren und committen.
4. **`verify:fonts`:** `KNOWN_GAPS` verliert `→` (Fußzeile) und `≈` nur, wenn der
   Check das Zeichen im Subset findet; **`→` bleibt in der Liste** (CTA, mit dem
   Verweis auf diese Entscheidung), `✓ ✗` entfallen, weil sie nicht mehr als
   Text gezeichnet werden. Der Check zeigt damit selbst, ob die Umsetzung stimmt.
5. **Vorher/Nachher** als Screenshots der Feedback-Zustände in Training,
   Echo-Check, Wort-Modus, Sende-Modus und Settings (Theme-Haken) — in allen
   sechs Themes mindestens je ein Beispiel, weil die Marken `currentColor` erben.
   Kein Pixelrutsch außerhalb der Marken (Pixeldiff).
6. **H8** (Windows, macOS, iOS, Android) bleibt eine **menschliche** Prüfung und
   ist der Grund, warum der Owner vor dem Merge schaut.


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
| 2 | A2 + C1 Messung | **erledigt 04.10. (P13)**, Commit auf dem Branch, noch kein PR; D4 offen |
| 3 | B1 Vorarbeit + cmap-Check (Absicherung, ohne Glyphen-Entscheidung) — **erledigt 03.10. (P11)**, Commit auf dem Branch, noch kein PR | — |
| 4 | B1 Glyphen (Umsetzung) — **erledigt 04.10. (P14)**, Commit auf dem Branch, noch kein PR | H8 (Owner am Gerät) vor dem Merge |
| 5 | B2 Screenreader-Muster — **erledigt 04.10. (P16)**, Commit auf dem Branch, noch kein PR (Vorarbeit P12) | H3 (Screenreader) vor dem Merge; Entscheidung zu den Fließtext-Stellen (Pixeldiff, B2) |
| 6 | B3 Echo-Check — **erledigt 04.10. (P15)**, Commit auf dem Branch, noch kein PR | H9 (Owner am Telefon) vor dem Merge |
| 7 | C2 — **erledigt 04.10. (P17)**, nur Protokoll, kein Code; Commit auf dem Branch, noch kein PR | — (Fable-Rulings zu D4–D9 stehen für den Notion-Log noch aus) |
| 8 | D Abschluss — **erledigt 04.10. (P18)**, Commit auf dem Branch, noch kein PR | Offenes siehe §6 („Stand P18“) und §7 |

Die PRs 1, 3 und die Vorarbeit von 4–6 laufen **sofort**; sie brauchen keine
Entscheidung. Jeder PR hat eigenen Build-Hash, eigene Messwerte und einen
eigenen Absatz „Was Fable sehen muss".

## 6. Abschlusskriterien je Finding

| Finding | gilt als beseitigt, wenn |
|---|---|
| **#4** `→` | Ruling zu D1; bei Weg A: Zeichen im Subset (cmap) und Screenshot; bei Weg C: Status „entschieden: bleibt" mit Begründung in `FINDINGS.md` |
| **#5** Muster | Ruling zu D2 (P16: Owner-Delegation); alle Muster-Stellen (88) tragen die vorgelesene Form; Markdown-Quelltext byte-identisch — **erfüllt (P16)**; Pixeldiff 0 nur für Tabellen; H3 offen |
| **#6.1** Echo-Check | Ruling zu D3 (P15: Owner-Delegation); gemessen bei 15 und 36 Zeichen in drei Viewports ohne Scrollen — **erfüllt (P15)**; H9 offen |
| **#8** `✓ ✗` | wie #4 (zusammen mit ihm in B1 entschieden) |
| S1 P8 bestätigt | G1: Owner meldet „sitzt" |
| S2 / S3 | `verify:keyboard` grün, Rot-Test belegt, Wort-/Sende-Inventur durchlaufen |
| S4 Messgerät | ausgebaut (A2, P13) |
| S5 Settings | gemessene Höhe nach A2 steht in `HANDOVER.md` (P13: 960 / 822 / 900 px) |
| S6 Konzeptfragen | D5–D9 als Rulings protokolliert — **erfüllt (P17, Owner-Bestätigung; Notion-Log steht aus)** |
| S7 500 ms | H2 durchgeführt, Wert bestätigt oder angepasst |

### Stand P18 (04.10.2026) — Punkt für Punkt

Gesamtlauf am Stand dieser Runde: `npm test` 488 · `npm run build` grün (18
Seiten, 88 Muster-Stellen, `verify:fonts`, `verify:colors`) · `verify:amber` 39
Ansichten · `verify:contrast` 24 Werte · `verify:keyboard` 25 Fälle (46 s).
**Bundle gegen `main` (`fa579d0`):** JS 235.957 → 235.318 B (**−639 B**; gzip
71,69 kB), CSS 20.690 → 20.636 B (−54 B), Plex 400/500/600 je +88/+96/+160 B,
Newsreader unverändert.

| Finding | Stand | Abgehakt? |
|---|---|---|
| **#4** `→` | Fußzeile im Plex-Subset (cmap, `verify:fonts`); CTA „bleibt“ mit Begründung in `FINDINGS.md` (Weg C). Ruling = Owner-Delegation D1, **Notion-Log steht aus**. H8 offen | **ja, mit Vorbehalt** (Kriterium „Weg A/C“ erfüllt; Rulings-Eintrag und H8 offen) |
| **#5** Muster | 88 Stellen, Quelltext byte-identisch, Tabellen-Pixeldiff 0. Fließtext-Zeilen: Subpixel-Abweichung, **Entscheidung B2 offen**. H3 offen | **teilweise** |
| **#6.1** Echo-Check | gemessen ohne Scrollen (6 Fälle). Owner-Delegation D3, Notion-Log steht aus. **H9 offen** | **teilweise** |
| **#8** `✓ ✗` | SVG-Paar. H8 offen, Notion-Log steht aus | **ja, mit Vorbehalt** |
| S1, S2/S3, S4 | G1 (04.10.), A1, A2 | **ja** |
| S5 Settings | 960 / 822 / 900 px nachgemessen; D4 (a) vom Owner bestätigt | **ja** (Notion-Log steht aus) |
| S6 D5–D9 | vom Owner bestätigt, kein Code | **ja, mit Vorbehalt** (Owner-Aussage, kein Fable-Ruling; Notion-Log steht aus) |
| S7 500 ms | H2 nicht durchgeführt | **nein** |

**Offen und benannt:**

- **H2** (S7, D8): Nachdruck-Schutz an Menschen messen.
- **H3** (#5, B3): Screenreader über Alphabet-Tabelle, „dit dah“ (EN/DE), gedimmte Tasten.
- **H8** (#4, #8): `→`, `✓`/`✗` auf Windows, macOS, iOS, Android; Form von Haken und Kreuz gegenüber Fables Erwartung.
- **H9** (#6.1): Echo-Check am Telefon, 44–50-px-Tasten.
- **B2-Pixeldiff:** so lassen oder die drei Fließtext-Stellen je Sprache nicht markieren — Owner/Fable. **P22 gemessen** (FINDINGS #5): Tabellen 0 Pixel, Fließtext 4 von 8 Bilder ≤ 253 px / max 60 von 255, Höhe identisch; Messung spricht für „so lassen“, Entscheidung offen.
- **Notion-Log:** Owner-Delegationen D1–D3 und die Bestätigungen D4–D9 sind Owner-Aussagen und müssen vom Owner als Rulings eingetragen werden (CLAUDE.md §2).
- **Offene Findings ohne Zuständigkeit im Plan:** #12/#15 (stehender Vorschau-Server), #14 (Hinweiszeile im Echo-Check), #16 (`ax-pattern.mjs`).

Ein Finding gilt nach §0 erst als beseitigt, wenn sein Abschlusskriterium erfüllt
ist; für #5 und #6.1 hängt das an H3/H9 und einer Entscheidung, für #4/#8 an H8.
Nichts davon ist hier umgesetzt oder still entschieden worden.

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
| 03.10.2026 | Runde P11: B1-Vorarbeit (Fundstellen, cmap, Upstream, Lizenz, Fallback) eingetragen — Empfehlung D1 geändert; cmap-Check `verify:fonts` umgesetzt; neue Findings #11 (`≈`) und #12 (`verify:amber` lässt Server stehen). |
| 04.10.2026 | Runde P12: B2- und B3-Vorarbeit eingetragen (Accessibility-Tree, Umfang der Muster-Stellen korrigiert; Echo-Check-Höhen in drei Viewports, Wege (a)/(b) simuliert) — D2 und D3 entscheidungsreif; neues Finding #13; Messskripte `tools/prep/`. |
| 04.10.2026 | G1 = „sitzt“ (S1 erledigt), A2 freigegeben (D10 Standard: ausbauen). **D1 vom Owner an Claude delegiert und entschieden:** `→` (Fußzeile) und `≈` per Plex-Subset (Weg A), `✓ ✗` als SVG-Paar nach 1.1 §8 (Weg B), CTA-Pfeil bleibt Fallback (Weg C). D2 und D3 bleiben offen (Default: bleibt; Empfehlungen aus P12 unverändert). |
| 04.10.2026 | Runde P13: A2 umgesetzt (Messgerät ausgebaut, K4 entfernt, `verify:keyboard` 25 Fälle, Bundle −1,33 kB, Rot-Test altKey belegt); C1 gemessen (960 / 822 / 900 px, vorher 1031 / 893 / 900); S4 erledigt, S5 gemessen, D4 bleibt offen; Messskript `tools/prep/settings-height.mjs`. |
| 04.10.2026 | Runde P14: **B1 umgesetzt** (PR 4, noch kein PR angelegt): `→`/`≈` ins Plex-Subset ergänzt (nicht neu subsettet — Abweichung A), `✓ ✗` als SVG-Paar `Mark.tsx`, `verify:fonts` mit `ACCEPTED_FALLBACK` (Abweichung B); #4 (Fußzeile), #8, #11 behoben, #4 (CTA) „bleibt“. H8 offen. |
| 04.10.2026 | Runde P15: **D3 vom Owner an Claude delegiert und entschieden** (Weg a, ortsfest; „aktiv“ = Optionen des Checks; Schwelle wie Training). **B3 umgesetzt** (PR 6, noch kein PR angelegt): `Echo` rendert ab 13 Optionen das 36-Plätze-Tastenfeld; Engine, `styles.css` unverändert; sechs Fälle (15/36 Zeichen × 3 Viewports) ohne Scrollen, #13 mit behoben; `verify:amber` 39 Ansichten (+2), `verify:keyboard` 25, `npm test` 481; Bundle JS +174 Byte. H9 offen. D4–D9 vom Owner wie empfohlen bestätigt (D4 a, D7 Hash, D8 nicht bauen); D2 für B2 vorentschieden (Option 3, „dit dah“ EN und DE). |
| 04.10.2026 | Runde P16: **D2 vom Owner an Claude delegiert und entschieden** (Option 3, „dit dah“ EN und DE, 36 + 5 + 3 Stellen je Sprache; DE-Wortlaut eine Setzung). **B2 umgesetzt** (PR 5, noch kein PR angelegt): Generator markiert 88 Muster-Stellen (`aria-hidden` + `.visually-hidden`), `verify:learn` zählt sie aus dem Quelltext, `npm test` 488, Rot-Test belegt; Quelltext byte-identisch, App-Bundle unverändert. Pixeldiff: Tabellen 0, Fließtext-Zeilen mit Subpixel-Abweichung (Entscheidung offen). #5 behoben; H3 offen; neues Finding #16. |
| 04.10.2026 | Runde P17: **C2 abgeschlossen (PR 7), ohne Code.** D4–D9 wie empfohlen bestätigt; Code gegen jede Zeile geprüft, entspricht der Empfehlung. `npm test` 488, `npm run build` grün, `verify:amber` 39, `verify:keyboard` 25; Bundle unverändert (JS 235.318 B, CSS 20.636 B). Offen: Notion-Log der D4–D9-Rulings (Owner), H2 für D8. |
| 04.10.2026 | Runde P18: **D Abschluss (PR 8).** `FINDINGS.md`: Status-Zeilen für #7, #9, #12, #14, #15, #16; §1 und §4 nachgezogen (D4–D9 Owner-bestätigt, #14–#16 aufgenommen); Inventur-Zeile Echo-Check in `HANDOVER.md`. Gesamtlauf grün; Bundle gegen `main` JS −639 B. §6 abgehakt, soweit von hier möglich; offen: H2, H3, H8, H9, B2-Pixeldiff, Notion-Log. |
| 05.10.2026 | Runde P19: **#12/#15 behoben.** `tools/amber/check.mjs` startet `vite preview` direkt per `node` statt über `npx`; Server endet in jedem Ausgang (grün und künstlich rot geprüft). Keine Ansicht geändert (39), Exit-Codes gleich. Befund: `tools/keyboard/check.mjs` hat den Fehler nicht (startet schon direkt per `node`). Kein Bundle-Delta (Skript in tools/). |
| 05.10.2026 | Runde P20: **#16 behoben.** `tools/prep/ax-pattern.mjs` an den B2-DOM angepasst (Letter und Muster aus `<strong>`/`.morse-pattern`, Zählung über `.morse-pattern`); sonst unverändert. Läuft durch, Zelle „A dit dah“, Zeichen nicht im Baum. Kein Bundle-Delta (Skript in tools/). |
| 05.10.2026 | Runde P21: **#14 Entscheidungsvorlage.** Zeile „or just type“ im Echo-Check als DOM-Simulation gemessen (390×844, 1280×720, 1440×900; 15 und 36 Zeichen): unter 900 px unsichtbar, darüber 1 Zeile = 21 px + 12 px Rand, Bühne −33 px, kein Scroll, unabhängig vom Wortlaut. Vier Optionen für Fable (Training-String, zwei kürzere, keine Zeile). Nichts gebaut. `tools/prep/echo-height.mjs` um Variante `hint0–2` erweitert. Kein Bundle-Delta. |
| 05.10.2026 | Runde P22: **B2-Pixeldiff vermessen, Entscheidungsvorlage** (FINDINGS #5): 4 Seiten × EN/DE × 390/1440, drei Varianten (markiert / Fließtext bloß / alles bloß). Tabellen 0 Pixel; Fließtext 4 von 8 Bildern 63–253 px, max 60/255, Seitenhöhe identisch. Nichts umgesetzt, nichts entschieden. Messskript `tools/prep/pattern-pixeldiff.mjs`. Kein Bundle-Delta. |
| 05.10.2026 | Runde P23: **#14 vom Owner an Claude delegiert und entschieden** (Option 1, Training-String, geteilt mit Words). Umgesetzt: eine Zeile `.keypad-hint` im Echo-Check (`Learn.tsx`). `npm test` 488, `npm run build` grün, `verify:amber` 39, `verify:keyboard` 25; Bundle JS +94 B (235.318 → 235.412), CSS ±0. #14 behoben. Offen: B2-Pixeldiff, H2, H3, H8, H9, Notion-Log. |
