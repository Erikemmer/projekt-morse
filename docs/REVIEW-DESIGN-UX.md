# Design- und UX-Review — Morse Lab

**Stand:** 06.10.2026 · Branch `claude/clever-turing-77fkyo` (`6d925a1`, Runde P23)
**Art:** Bericht mit Befunden, Optionen und Empfehlungen. Nichts umgesetzt, nichts committet.
**Entscheidungen** zu Design, Wortlaut und Produktregeln trifft der Owner mit Fable. Dieser Bericht liefert die Grundlage.

Maßstab: `CLAUDE.md` (v. a. §2, §2.9, §6), `docs/brand/Morse_Lab_Brand_Guidelines_1.1.html` (führend), `docs/CI.md` (nachrangig), `docs/CONCEPT-LEARN.md`.

Kennzeichnung: **Beleg** = Datei:Zeile oder Screenshot-Pfad. **[Geschmack]** = Urteil ohne Messung, Fable entscheidet.
Preis: **S** Stunden · **M** ein Tag · **L** mehrere Tage. **Ruling** = Fable muss entscheiden (Design, Wortlaut, Produktregel). **Delegation** = der Owner kann es ohne Fable freigeben.

---

## 0. Methode und Grenzen

- Die App lief als Produktions-Build (`vite build` plus `build:learn`) hinter `vite preview` auf Port 4391. Gesteuert wurde sie mit Playwright-Core und dem systemeigenen Google Chrome. Das Chromium unter `/opt/pw-browsers` gab es auf diesem Rechner nicht. Der Preview-Server wurde per PID beendet.
- **`npm run build` läuft auf macOS nicht durch** (FINDINGS #17). Für die Vorschau lag eine Wegwerf-Kopie des Repos im Scratchpad. In ihr war `account.ts` umbenannt, im Repo ist nichts geändert.
- Zwei Zustände wurden durchgespielt:
  - **Frisch:** leerer localStorage, echter Erstlauf mit Intro, Karten und Echo-Check.
  - **Geseedet:** zehn aktive Zeichen, Streak 6 Tage, Fenster voll. Damit sind Words, Send, Progress, Wachstumsmeldung und Sitzungsende erreichbar.
  - Richtige Antworten kamen im Wachstumslauf aus dem React-Zustand (Testhilfe), nicht aus dem Gehör. Die Ansichten selbst sind echt.
- Nicht geprüft: Firefox, Safari, echte Geräte, Screenreader (VoiceOver/NVDA), Ton über Kopfhörer. 390 px ist eine Viewport-Emulation.
- Die Engine-Fakten (Abschnitt 2) hat ein Lese-Teilagent mit Zeilenangaben geliefert. Ich habe die Kernkonstanten selbst gegengelesen: `growth.ts:35-41`, `settings.ts:76-96`, `stats.ts:34`, `learn.ts:24`, `streak.ts:38-41`, `words.ts:54`, `drill.ts:45`.
- Offen geblieben: `sync.ts`, `deviceSettings.ts` und der Sende-Feedback-Text wurden nicht vollständig gelesen.

### Die zehn wichtigsten Screenshots

Alle liegen unter `/private/tmp/claude-501/-Users-erikemmer-Downloads/16692bfa-a7f3-489b-89b4-e4f71ef857cb/scratchpad/shots/`. Die Pfade sind im Rest des Berichts relativ dazu angegeben. Gesamt: 67 Dateien, je Ansicht 390 × 844 (`m-…`) und 1440 × 900 (`d-…`).

| Nr. | Datei | Zeigt |
|---|---|---|
| 1 | `m-01-intro1.png` | Intro, Bildschirm 1 |
| 2 | `m-05-card-heard.png` | Lernkarte K nach dem Hören, Muster sichtbar |
| 3 | `m-06-echo-ready.png` | Echo-Check Runde 1 der ersten Karte: genau eine Antwort („K") |
| 4 | `d-20-practice-start.png` | Übung, Desktop: Rail, Spalte, Randspalte |
| 5 | `d-23-practice-feedback.png` | Fehlantwort-Auflösung, Desktop |
| 6 | `m-50-growth.png` | „The set grows: W joins from the next round." |
| 7 | `m-51-session-end-grow.png` | Sitzungsende |
| 8 | `d-27-progress.png` | Progress |
| 9 | `m-30-settings.png` | Settings (Theme-Wahl, amber Primärknopf) |
| 10 | `x-60-logo-sheet.png` | Logo und Favicon in 380 bis 16 px |

Weitere, die der Bericht zitiert: `m-24-menu.png`, `m-26-words.png`, `d-26-send.png`, `d-24-review-picker.png`, `m-31-about.png`, `d-41-learn-pillar.png`, `m-40-learn-hub.png`, `m-43-imprint.png`, `x-61-favicon-16-32-dpr1.png`.

---

## 1. Informationsarchitektur (Baum)

```
morse-lab.com
├─ App (eine URL, Zustand in useState, kein Router)            App.tsx:198
│  ├─ Intro (einmalig, 2 Bildschirme, "Skip intro")            Intro.tsx:28-41
│  ├─ Practice  [Standard]
│  │   ├─ Learn-Lauf (vor Runde 1, wenn Zeichen "pending" sind)  App.tsx:670-692
│  │   │    Karte (hören, dann Muster sichtbar) → "Try it" → Echo-Check 3 Runden → nächste Karte
│  │   │    [Skip] auf jeder Karte und jedem Check                Learn.tsx:83-89
│  │   ├─ Start-Screen: Play · Antwortfeld · "Day N." · "Today 83% · 5 characters"
│  │   │    + Einladung "Try a speed round?" bei langsamen Zeichen   App.tsx:1488
│  │   ├─ 20 Runden (hören → tippen → Auflösung)
│  │   ├─ Sitzungsende (Correct x of 20 · Median · Streak-Zeile · "Practise again")
│  │   └─ Speed round (10 Runden, Drill)
│  ├─ Learn the sounds  (ReviewPicker: Zeichen einzeln erneut hören)
│  ├─ Words & groups    (ab 8 Zeichen, endlos)
│  ├─ Send              (ab 8 Zeichen; getippt, optional "Use real keying")
│  ├─ Progress          (Tabelle je Zeichen)
│  ├─ Account           (Passkey, optional)
│  ├─ Settings          (Pitch, Volume, Theme ×7, Effective speed, "Add X now")
│  └─ About
├─ Statische Seiten (Generator, eigener Look)
│  ├─ /learn/ (Hub) → 6 Artikel EN, Spiegel unter /de/lernen/
│  └─ /imprint/, /privacy/
└─ Navigation: Mobil Hamburger → Vollbild-Panel (nur sichtbar, wenn keine Runde offen ist)
               Desktop ≥ 900 px: Rail links, dauerhaft · ≥ 1280 px: Randspalte rechts (3 Zeilen)
```

### A1. Wo die Seite unübersichtlich ist

**Befund 1 — Die App kennt zwei Arten von „Seite", die man nicht unterscheiden kann.**
- Von „Learn" im Menü landet man auf einer statischen Seite mit anderem Kopf (kein Rail, kein Menü, „Open the app" als grauer 13-px-Link). Beleg: `m-40-learn-hub.png`, `d-41-learn-pillar.png`.
- Der Wechsel ist ein Seitenneuladen und fühlt sich wie ein Sprung in eine andere Website an. Das ist technisch gewollt (`CONCEPT-LEARN.md` §3), aber im Menü steht „Learn" gleichrangig neben Practice und Progress.
- **Beleg:** `Menu.tsx:63-70` (Kommentar: „kein Ort dieser App, sondern ein Weg hinaus").
- **Optionen:** (a) Status quo. (b) Eintrag optisch absetzen, z. B. mit einem Pfeil nach außen oder unter einer Hairline, damit „hinausgehen" erkennbar ist. (c) Die statische Seite bekommt denselben Rail wie die App (L, bricht den statischen Ansatz).
- **Empfehlung:** (b). Es ist die kleinste Lösung für die richtige Erwartung.
- **Preis:** S. Ruling nötig (Menügestaltung).

**Befund 2 — Das Menü ist neunstufig, aber es gibt nur einen Kernloop.**
- Acht Orte plus Learn (Menü) plus zwei Rechtslinks. Practice trägt den Loop. „Learn the sounds", „Words & groups" und „Send" sind Übungsvarianten. Progress, Account, Settings, About sind Verwaltung. Beleg: `m-24-menu.png`.
- Die Reihenfolge ist logisch (`Menu.tsx:50-62`). Ein Einsteiger mit sechs Zeichen sieht trotzdem neun Einträge, drei davon gesperrt oder irrelevant.
- **Optionen:** (a) Status quo. (b) Gruppieren mit zwei Hairlines: Üben (Practice, Learn the sounds, Words, Send) · Stand (Progress) · Gerät und Konto (Account, Settings) · Lesen (Learn, About). (c) Gesperrte Einträge ausblenden, bis sie freigeschaltet sind. Guidelines 1.1 §7 sagt „hide what can't be used", die App zeigt sie aber gedimmt mit Hinweis (`App.tsx:997-999`).
- **Empfehlung:** (b). (c) widerspricht dem Leitsatz „zeigen, was kommt" in D und ist ein Produktentscheid.
- **Preis:** S. Ruling nötig (Guidelines-Auslegung von §7).

**Befund 3 — Auf dem Handy ist der Weg aus einer laufenden Sitzung geschlossen, auf dem Desktop offen.**
- Mobil verschwindet der Kopf mit Menü, sobald Runde 1 läuft. Der Kommentar nennt das Absicht: „Der Weg heraus aus einer angefangenen Runde ist, sie zu Ende zu bringen" (`App.tsx:1255-1257`). Das sind 20 Runden. Beleg: `m-21-practice-sounding.png` (kein Menü) gegenüber `d-22-practice-answering.png` (Rail sichtbar).
- Der Desktop erlaubt den Ausstieg jederzeit über die Rail. Dieselbe Sitzung hat zwei Regeln.
- Es gibt keinen Beenden-Knopf. Eine Pause per Hand (Neuladen) lässt `sessionsStarted` steigen (siehe E3).
- **Optionen:** (a) Status quo. (b) Mobil ein leiser „End session"-Text im Fuß, der die Sitzung beendet und dahin führt, wo man ist. (c) Desktop-Rail während der Runde dimmen.
- **Empfehlung:** (b). Es gibt keinen Grund, auf dem Handy eine Falle zu bauen, die der Desktop nicht hat. Das widerspricht nicht §2, denn es ist kein Druck, sondern das Gegenteil.
- **Preis:** M (Zustand und Wortlaut). Ruling nötig, weil „fokussierte Runde" eine Produktregel ist.

**Befund 4 — Der Erstlauf hat sehr viele Schritte, bevor die erste echte Runde kommt.**
- Gezählt aus dem Ablauf: Intro (2 Klicks, mit „Skip intro" 1). Danach 6 Karten, je „Try it" plus 3 Echo-Runden zu je Play, Antwort, Weiter. Das sind rund **60 Interaktionen** vor Runde 1 der Übung. Beleg: `learn.ts:24` (`ECHO_ROUNDS = 3`), `settings.ts:76-83` (6 Startzeichen), Lauf in `m-10`…`m-25-end.png`.
- Der Preis für Karte 1: Der Echo-Check bietet dort genau **eine** Antwort an („K"). Beleg: `m-06-echo-ready.png`, `learn.ts:83-91`. Ein Check mit einer Option misst nichts. Er ist eine Bestätigung im Gewand einer Frage.
- Gleichzeitig gibt es auf jeder Karte „Skip". Das markiert alle Zeichen der Warteschlange als „eingeführt", **ohne dass sie gehört wurden** (`App.tsx:751-755`). Zwei Klicks (Skip intro, Skip) führen zu einer Übung mit sechs Zeichen, die man nie gehört hat.
- **Das ist der größte Reibungspunkt des Produkts**, weil er die Ersterfahrung bestimmt. Die Mechanik ist didaktisch begründet (Koch: Zeichen einzeln einführen). Vorgabe laut Konzept ist aber, dass der Kernloop (hören → tippen → Feedback) früh erlebbar ist.
- **Optionen:**
  - (a) Status quo.
  - (b) Echo-Check bei der **ersten** Karte weglassen (kein Check mit einer Option) oder erst ab Karte 2 stellen.
  - (c) Erstlauf aufteilen: heute die ersten drei Zeichen einführen und üben, die übrigen drei in der zweiten Sitzung. Das ändert die Engine-Regel `pendingIntroductions`.
  - (d) „Skip" umdeuten: „Skip" lässt die Karte aus, aber das Zeichen bleibt „pending" und kommt in der nächsten Sitzung wieder, statt als eingeführt zu gelten.
- **Empfehlung:** (b) sofort (S, Delegation möglich, ändert nur eine Regel in `learn.ts`) und (d) als Produktregel (M, Ruling). (c) nur nach (b) und (d) neu bewerten, weil es das Tempo des Konzepts ändert.
- **Preis:** (b) S, (d) M, (c) L.

### A2. Wege zur ersten Übung und Klicks

| Ausgangslage | Weg | Klicks bis zur ersten Antwort in der Übung |
|---|---|---|
| Erstbesuch, alles durchlaufen | Intro → 6 Karten mit Echo → Runde 1 | ca. 60 |
| Erstbesuch, alles überspringen | „Skip intro" → „Skip" | 2 (und 6 ungehörte Zeichen aktiv, siehe Befund 4) |
| Rückkehrer | App öffnen → Play → Antwort | 2 |
| Rückkehrer mit neuem Zeichen | App öffnen → Karte → Echo (3×) → Runde 1 | ca. 11 pro neues Zeichen |
| Vom Menü | Practice | 1 + 2 |

Der Rückkehr-Weg ist vorbildlich (2 Klicks). Der Erstlauf ist dagegen schwer. Die Zahl ist plausibel für ein Koch-Training, steht aber nirgends als Erwartung („about 3 minutes", nur Näherungswert, siehe D).

### A3. Was um Aufmerksamkeit konkurriert

- **Übung, Mobil:** Wortmarke und Menü-Icon · Session/Round mit Hairline · Eyebrow („READY · 644 HZ") · Play · Satz · Antwortfeld (bis 12 Tasten) · Streak-Zeile · Tagesquote · Fortschrittspunkte. Der Fokus liegt auf Play. Das Feld darunter ist stark gedämpft, was richtig ist (`m-20-practice-start.png`).
- **Übung, Desktop ≥ 1280 px:** zusätzlich Rail (9 Einträge + 2 Links) und Randspalte (3 Zeilen). Beides ist leise. Die Zahlen der Randspalte („Today 79% · 6 characters", „Day 6.", „10 of 36 active") stehen als graue Newsreader-Zeilen oben rechts (`d-20-practice-start.png`). Sie sind der einzige Ort, an dem Streak und „10 of 36" zusammen sichtbar sind, und trotzdem am Rand des Blickfelds.
- **Auflösung:** Haken oder Kreuz, Aussage in Newsreader, Muster, Antwortfeld mit Markierung, „Next character", Fußzeile. Das ist gut gelöst und ruhig (`d-23-practice-feedback.png`).
- **Settings** ist die dichteste Ansicht der App: Pitch, Volume, Test-Ton, Theme (sieben Optionen in zwei Gruppen), Effective speed, Characters, „Add W now". Die Überschrift klebt am ersten Regler (`m-30-settings.png`). Siehe B-Befund 7.

---

## 2. Der Lernablauf, faktisch (Engine)

Alle Angaben mit Fundstelle. Das ist die Grundlage für D.

### 2.1 Reihenfolge und Startmenge
- `STARTING_CHARACTERS` = **K M R S U A** (6 Zeichen), `settings.ts:76-83`.
- `CHARACTER_ORDER` = Startzeichen + `PTLOWINJEF0YVG5Q9ZH38B427C1D6X` (zusammen **36**), `settings.ts:93-96`. Der Kommentar nennt die Reihe „eine Setzung, kein Standard"; Satzzeichen sind bewusst draußen.
- Keine benannten Phasen im Code. Schwellen laufen über die aktive Zeichenzahl:
  - ab **8**: Words und Send (`words.ts:54`) und Variabilität Stufe 1 (`variability.ts:29`);
  - ab **12**: Variabilität Stufe 2, Ton pro Aufgabe 520–720 Hz und Tempo ±10 % (`variability.ts:32,45`);
  - ab **13**: Tastenfeld statt Dreier-Gitter (`ui/keypad.ts:30`);
  - bei **36**: Tempo-Progression (`tempo.ts:72-75`).

### 2.2 Wann kommt ein neues Zeichen? (`growth.ts:62-78`)
Alle Bedingungen müssen zugleich gelten:
1. Es gibt noch einen Kandidaten in `CHARACTER_ORDER`.
2. Seit der letzten Einführung sind mindestens **10 Antworten** vergangen (`GROWTH_LOCKOUT_ANSWERS`).
3. Das **30er-Fenster** der letzten Antworten ist voll (`RECENT_ANSWER_WINDOW`, `stats.ts:34`) und hat **≥ 85 %** Treffer (`GROWTH_WINDOW_ACCURACY`, `growth.ts:35`).
4. **Jedes** aktive Zeichen hat ≥ 5 Versuche (`growth.ts:38`) und eine Einzel-Trefferquote **≥ 75 %** (`growth.ts:41`).

- Der Check läuft nach jeder Übungsantwort (`session.ts:262-273`). Drill, Words und Send zählen **nicht** (`session.ts:260-273`, `wordSession.ts:259-261`).
- „Streak" spielt dabei keine Rolle. Es gibt keine Richtig-in-Folge-Zählung, nur das rollierende true/false-Fenster. Der Tages-Streak (`streak.ts`) beeinflusst das Wachstum nicht.
- Manuell geht es früher: Settings → „Add W now" (`growth.ts:121-132`, `Settings.tsx:230`).
- Die Einführung geschieht dann in der **nächsten** Sitzung vor Runde 1 als Karte plus Echo-Check (`App.tsx:670-692`).

### 2.3 Rolle des Echo-Checks (`learn.ts`)
- 3 Abrufe (`learn.ts:24`). Der erste ist immer das neue Zeichen, die beiden anderen ziehen aus allem Eingeführten, das neue doppelt gewichtet (`learn.ts:216-222`).
- Treffer oder Fehler **verzweigen nichts**. Es gibt keine Wiederholung, keine Sperre (`learn.ts:183-191`).
- Er schreibt **keine Statistik**, nur `introducedCharacters` (`learn.ts:14-20`, `App.tsx:705-711`).
- Das ist didaktisch sauber (kein Druck, keine Zahl ohne Bedeutung). Im Gegenzug zeigt der Check den Nutzern nicht, was er eigentlich ist: ein Moment zum Üben ohne Folgen. Das wird nirgends gesagt (siehe D).

### 2.4 Auswahl des nächsten Zeichens
- Ein „Beutel" (`bag.ts`): erst jedes aktive Zeichen einmal gemischt, dann Zusatzlose für „schwache oder langsame" Zeichen. Kein Zeichen kommt direkt zweimal. Schwach = Trefferquote < 75 %. Langsam = ≥ 5 Messwerte, Quote ≥ 80 %, Median > 2 s (`bag.ts:41-46`, `drill.ts:36-42`).
- Das ist eine sinnvolle, rein binäre Adaption. Im UI sieht man davon nichts, außer der Einladung zur Speed round.

### 2.5 Modi
| Modus | Freischaltung | Inhalt | Zählt für |
|---|---|---|---|
| Practice | immer | 20 Runden, Einzelzeichen | Wachstum, Statistik, Tempo, Tages-Streak |
| Speed round | Einladung bei ≥ 1 langsamem Zeichen (`drill.ts:55`) | 10 Runden aus langsamen Zeichen | Statistik und Streak, **nicht** Wachstum |
| Words & groups | ab 8 Zeichen | 70 % Wort / 30 % Gruppe, endlos | Statistik (positionsweise), Streak ab 5 Aufgaben |
| Send | ab 8 Zeichen | Zeichen sehen, Code tippen oder keyen | getrennte Sende-Statistik, Streak ab 5 |
| Learn the sounds | immer | Zeichen einzeln erneut hören | nichts |

### 2.6 Streak mit Freeze (`streak.ts`)
- Ein Tag zählt, wenn eine Sitzung beendet wurde (`session.ts:331-339`) oder ab 5 Aufgaben in Words oder Send.
- Lücke 1 Tag: weiter. Lücke 2 Tage: der Freeze (falls vorhanden) wird verbraucht. Sonst „Starting fresh." und der Freeze bleibt im Vorrat (`streak.ts:140-160`).
- Der Freeze wird nach **7 geübten Tagen in Folge** verdient (`streak.ts:38`), Vorrat höchstens 1 (`:41`).
- UI zeigt nur: `Starting fresh.` · `Day N.` · `Day N — freeze ready.` · `Day N — freeze used yesterday.` (`statusLines.ts:21-26`).

### 2.7 Tempo
- Zeichentempo immer 20 wpm (`settings.ts:12`), Start-Gesamttempo 10 wpm (`settings.ts:15`), Farnsworth-Streckung in `timing.ts:46-76`.
- Das Gesamttempo steigt erst, wenn **alle 36** Zeichen aktiv sind, in Schritten von 1 wpm unter denselben 85 %/10-Antworten-Bedingungen (`tempo.ts:72-88`). Es wird nie automatisch gesenkt.
- Für Nutzer ist das praktisch unsichtbar, bis sie bei 36 Zeichen sind. Davor steht „Effective speed 10 wpm" in Settings.

### 2.8 Was die UI davon zeigt (und was nicht)

| Engine-Fakt | Sichtbar? | Wo |
|---|---|---|
| Aktive Zeichen `10 of 36` | ja, leise | Randspalte ab 1280 px (`App.tsx:1278-1280`), Progress („10 of 36 active"), Settings |
| Neues Zeichen kommt | ja, **nach** der Entscheidung | „The set grows: W joins from the next round." (`App.tsx:1429-1431`, `m-50-growth.png`) |
| **Warum** jetzt (85 % / 30 / 75 %) | **nein** | Intro: „the set grows as you get surer" (`Intro.tsx:38`) |
| **Was als Nächstes** (welches Zeichen) | nur im Moment des Wachstums; in Settings „Add W now" nennt den Kandidaten | `Settings.tsx:230` |
| Fortschritt zum nächsten Zeichen | **nein** (Fenster, Mindestversuche, Einzelquoten) | — |
| Echo-Check ist folgenlos | **nein** | — |
| Beutel und Schwäche-Fokus | nur über die Speed-round-Einladung | `App.tsx:1549-1559` |
| Streak-Regeln (7 Tage, Vorrat 1) | nur „freeze ready" / „used yesterday" | `statusLines.ts:21-26` |
| Näherungswert Reaktionszeit | ja, auf Progress und Sitzungsende | `Progress.tsx:100-113`, `App.tsx:1895-1897` |
| Tempo-Progression | erst ab 36 Zeichen | `App.tsx:1666-1669` |
| Words/Send-Freischaltung ab 8 | ja, gedimmt im Menü | `App.tsx:997-999` |

---

## 3. Review-Fragen

### A. Übersicht und Navigation
Befunde 1–4 stehen in Abschnitt 1. Zusammenfassung der Empfehlungen:

| Nr. | Vorschlag | Preis | Entscheidung |
|---|---|---|---|
| A1 | Learn im Menü als „führt hinaus" kennzeichnen | S | Ruling |
| A2 | Menü mit zwei Hairlines gruppieren | S | Ruling |
| A3 | Mobil „End session" als leise Aktion im Fuß | M | Ruling |
| A4 | Echo-Check auf Karte 1 weglassen oder auf Karte 2 beginnen | S | Delegation |
| A5 | „Skip" lässt Zeichen pending, statt sie als eingeführt zu buchen | M | Ruling |

### B. Designsprache

**Wo die Richtung „Ruhe" trägt (Beleg, kein Geschmack):**
- Die Tokens werden eingehalten. `verify:colors` meldet keine Farbliterale außerhalb des Token-Blocks (63 TS/TSX-Dateien, 1 CSS-Datei). Die Kontrast-Prüfung (24 Werte) ist grün.
- Keine Schatten, keine Verläufe (kein `box-shadow`, `linear-gradient` oder `radial-gradient` in `src/styles.css`). Nichts fetter als 600.
- **Auflösung einer Antwort** ist die stärkste Ansicht. Ein Haken oder ein Kreuz als Linien-SVG (`Mark.tsx`, 1,5 px), ein ruhiger Satz in Newsreader, das Muster als echte Pillen. Die Fehlantwort zeigt die richtige Antwort in Amber, wie in 1.1 §4 vorgesehen. Kein Alarm. Beleg: `d-23-practice-feedback.png`.
- **Amber ist diszipliniert.** Gemessen über alle Hauptansichten: Auf der Lernkarte wechselt Amber zwischen dem Play-Kreis (Ton läuft) und „Try it" (danach), sie sind nie zugleich da (Messung 250-ms-Takt, `card2.mjs`). In Practice, Words, Send, Progress, About ist im Ruhezustand kein Amber sichtbar. Das ist konsequenter als die Guidelines selbst.
- **Das Muster erscheint nur im Feedback und auf der Lernkarte** (Ausnahme dokumentiert in `Learn.tsx:229-239`). Konform mit §2.2 und Addendum (a).

**Wo es generisch wirkt [Geschmack, gestützt auf Screenshots]:**

**Befund B1 — Die Ansichten außer der Übung sehen aus wie ein Standard-Formular-Stack.**
- Progress ist eine saubere Tabelle (`d-27-progress.png`). Settings sind Label, Wert und Regler untereinander (`m-30-settings.png`). Account ist Text plus Knopf (`m-29-account.png`). About sind drei Zeilen mit Hairlines (`m-31-about.png`). Das ist sauber, aber austauschbar. Auf die Marke zeigt nichts außer der Schrift.
- **Warum:** Die Übung hat einen Gedanken (der Ton im Zentrum, alles andere gedämpft). Die Verwaltungsseiten haben keinen. Der Rhythmus der Guidelines (Eyebrow in Kapitälchen, Newsreader-Aussage, Hairline) wird dort nur teilweise genutzt: Überschriften sind Newsreader, die Zeilen darunter Plex Sans ohne Eyebrow-Struktur.
- **Optionen:**
  - (a) Status quo.
  - (b) Ein durchgängiges Seitenmuster: Eyebrow (12 px, 0,18 em) → Newsreader-Aussage → Hairline → Inhalt. Progress und Settings bekommen die Aussage („10 of 36 characters active." statt der Überschrift „Progress").
  - (c) Eine dokumentierte Ergänzung: der echte Code als Ornament, wie `CONCEPT-LEARN.md` §5 es für Trennlinien vorsieht („ML" als `−− ·−··`). Das ist laut 1.1 §8 das einzige erlaubte Ornament.
- **Empfehlung:** (b) für Progress und Settings, (c) nur als Trennornament in Learn und Session-Ende.
- **Preis:** (b) M, (c) S. Ruling nötig.

**Befund B2 — Die Wortmarke hat auf dem Handy kein Zeichen, auf dem Desktop ein winziges, im Web keines.**
- Mobil: nur „Morse Lab" in Newsreader (`m-20-practice-start.png`). Desktop-Rail: ein Taster in 24 × 16 px (`Menu.tsx:174`, `d-20-practice-start.png`). Learn-Seiten: nur Text (`d-41-learn-pillar.png`). Einzig About zeigt den Taster groß, mit 90 × 61 px (`m-31-about.png`, `About.tsx:27`).
- Das Wiedererkennen hängt also an einer Serifenschrift und dem Papierton. Es gibt kein einziges **wiederkehrendes Element**, das man benennen könnte.
- Das ist teilweise Absicht (Guidelines §2: Wortmarke Newsreader Regular). Der Mangel liegt darin, dass die Marke außerhalb des Favicons nicht gezeigt wird.
- **Optionen:** (a) Status quo. (b) Taster überall dort, wo die Wortmarke steht (Mobil-Kopf und Learn-Kopf), im Lockup-Verhältnis. (c) Zusätzlich ein „Signatur-Element": die Hairline unter dem Kopf als Taster-Basis ausformuliert.
- **Empfehlung:** (b). Es ist die billigste Wiedererkennung und folgt 1.1 §3 („primary lockup, mark left of wordmark").
- **Preis:** S. Delegation möglich (die Datei-Regel steht in 1.1 §3). Der Preis hängt an Befund C1: `logo-lockup.svg` ist heute defekt.

**Befund B3 — Weißraum und Rhythmus tragen die Übung, aber die Abstände folgen nicht der Skala.**
- 1.1 §6 nennt 4/8/12/16/24/32/48/64. `styles.css` hat nur `--space-1…3` (8/16/24). Maße wie 33 px Bühne, 88 px Play und 60 px Antwort sind „Pixel aus dem Mockup" (`styles.css`, Kommentar zum Grundriss). FINDINGS #3 erfasst das schon. Ich bestätige es als Beobachtung, nicht als Fehler.
- **Beleg für Unruhe:** Die Antwortfläche endet mit einer einzelnen Taste in der letzten Reihe (10 Zeichen → 3+3+3+1, `m-20-practice-start.png`: „O" allein). Bei 7, 8, 10, 11 Zeichen sieht das Raster ausgefranst aus. FINDINGS #6 behandelt das Wachsen des Rasters, nicht die Optik.
- **Optionen:** (a) Status quo. (b) Rest-Reihe zentrieren. (c) Ab 7 Zeichen auf vier Spalten wechseln. (d) Das Tastenfeld früher einsetzen.
- **Empfehlung:** (b) [Geschmack]. Der Aufwand ist klein und das Raster wirkt „absichtlich".
- **Preis:** S. Ruling nötig (Maße sind Fables Setzung).

**Befund B4 — Der Play-Kreis ist ein gutes Zentrum, aber die Zustände sind schwer zu erkennen.**
- Ruhe: leer mit ink-Rand. Hover: amber Rand. Tonlauf: gefüllt amber. Fokus: Ring in `--amber-deep` (siehe F2). Auf dem Start-Screen ergibt das einen doppelten Rand (ink plus amber), wenn der Fokus automatisch gesetzt ist (`m-20-practice-start.png`: Doppelring).
- Beim ersten Hinsehen liest sich der Doppelring wie ein Zustand („aktiv") und nicht wie ein Fokus. Das ist ein Zielkonflikt zwischen §6 (Fokus setzen) und 1.1 §7 (leerer Kreis).
- **Optionen:** (a) Status quo. (b) Fokusring auf Ink umstellen, wie 1.1 §7 und §12 es beschreiben. (c) Den Ring beim programmgesteuerten Fokus unterdrücken, nur bei Tastatur zeigen (`:focus-visible` tut das schon bei Mausklick; beim Seitenladen gilt Tastatur-Heuristik).
- **Empfehlung:** (b). Es ist die Guidelines-Lösung. Siehe F2.
- **Preis:** S. Ruling nötig (Farbrolle des Fokus).

**Befund B5 — Das sieben-Themes-System ist stärker als „Light-first, Dark vorbereitet".**
- Settings bietet System, Paper, Frost, Olive, Night, Phosphor, Ink (`m-30-settings.png`, `theme.ts`). Ruling #111 hat das beschlossen. `CLAUDE.md` §2.9 sagt „Light-first" und „keine weitere Farbe ohne dokumentierte Entscheidung". Es gibt eine Entscheidung, also ist es kein Verstoß.
- Es ist aber ein **Marken-Risiko:** „Paper, ink, one spark of amber" (1.1 Essenz) ist das Wiedererkennungsmerkmal. Frost, Olive und Phosphor sind andere Marken. Wer sie wählt, sieht Morse Lab nicht mehr.
- Zusätzlich weicht `--amber` mit `#B35209` von 1.1 (`#B45309`) ab. Das steht in `styles.css` und `HANDOVER.md` als Rückfrage an Fable. Der Bericht übernimmt das als offen.
- **Optionen:** (a) Status quo. (b) Nur Paper und Night zeigen, die übrigen unter „More themes". (c) Die Standard-Auswahl im Marketing nur mit Paper zeigen.
- **Empfehlung:** (c) [Geschmack]. Die Themes sind ein Zugänglichkeitsgewinn (Kontrast, Blendung), die Marke bleibt in jeder Außendarstellung Paper.
- **Preis:** S. Ruling nötig.

**Befund B6 — Der Fließtext der Learn-Seiten ist die gelungenste Typografie der Marke.**
- Spalte 680 px, 17 px Plex Sans, Überschriften in Newsreader, Links in Amber (`d-41-learn-pillar.png`). Der Eindruck ist der eines gut gesetzten Notizbuchs. Das ist die Richtung, die die App-Verwaltungsseiten (B1) nachbilden sollten.
- Einziger Mangel: Auf dem Hub stehen **sechs fette Amber-Links** in einem Viewport (`m-40-learn-hub.png`). `CONCEPT-LEARN.md` §5 verlangt „kein Amber zweimal pro Viewport-Höhe anstreben". Links in Amber sind durch 1.1 §4 gedeckt. Der Hub-Fall ist eine Liste, in der das „eine Amber" zu sechs wird.
- **Optionen:** (a) Status quo. (b) Hub-Links in Ink, Amber erst beim Hover. (c) Nur „Start here" amber.
- **Empfehlung:** (c) [Geschmack].
- **Preis:** S. Ruling nötig (§5 ist ein Soll).

**Befund B7 — Settings ist die einzige Ansicht mit Drängen.**
- „Play test tone" ist ein gefüllter amber Primärknopf in voller Breite (`m-30-settings.png`, `styles.css:439`). Das ist ein Test, keine Haupthandlung. 1.1 §7 will genau einen Primärknopf pro Ansicht („usually Start or Check"), und 1.1 §1 benennt „gefüllte Riesen-Buttons" als Don't (CI §7).
- Die Überschrift „Settings" klebt am ersten Label („Pitch"), die Abschnitte sind nicht durch Hairlines getrennt. Im Vergleich zu Progress ist das unruhig.
- **Optionen:** (a) Status quo. (b) Test-Ton als umrandeter Knopf (Button-Standard). Amber bleibt in dieser Ansicht frei. (c) Abschnitte mit Hairlines und 24 px Abstand.
- **Empfehlung:** (b) und (c).
- **Preis:** S. Ruling nötig (Rolle des Primärknopfs).

#### Referenzen für eine ruhige, eigenständige Designsprache

Alle vier sind Beobachtungen aus öffentlich bekanntem Design. Ich habe sie hier nicht neu abgerufen. Sie sind Anregungen, keine Vorlagen.

1. **iA Writer.** Einspaltig, wenig Chrom, Schrift als Marke, Fokus-Modus. *Übertragbar:* ein Fokus-Modus für die Übung, in dem die Umgebung beim Hören verschwindet (die Übung tut das mobil schon). *Nicht übertragbar:* Monospace (1.1 §5).
2. **Are.na.** Zurückhaltende Oberfläche, Inhalte tragen. *Übertragbar:* die Marke als wiederkehrendes **Raster und Hairline-System**, nicht als Dekor.
3. **Kinfolk und das Print-Magazin-Layout.** Papier, ein Akzent, viel Weißraum, Zahlen als Typografie. *Übertragbar:* Statistik als gesetzter Text („10 of 36 characters.") statt Tabelle. Das passt zu 1.1 §7 („plain tabular numbers").
4. **Things 3 (Cultured Code).** Ein Akzent, Haptik durch Abstand statt Fläche, leise Zustandsübergänge. *Übertragbar:* die Prüfung „ein Ding pro Ansicht", die Morse Lab schon hat. Zusätzlich ein Fortschrittsgefühl ohne Zähler.
5. **Das Moleskine-/Rhodia-Prinzip (Papier mit Linienraster).** Ein Raster, das man spürt, aber nicht liest. *Übertragbar:* eine einzige Basislinie als Hairline-Raster hinter der Sitzung, die dem Rhythmus der 4er-Gruppen (`ROUNDS_PER_GROUP`) folgt. Reiner Vorschlag, [Geschmack].

**Was fehlt für Wiedererkennbarkeit ohne Verläufe, Schatten, Konfetti, Emojis** (Priorität nach Wirkung):
1. Der Taster als **wiederkehrendes Zeichen** im Kopf (B2).
2. Ein **einheitliches Seitenmuster** für Verwaltungsseiten (B1).
3. **Echter Code als einziges Ornament** (`CONCEPT-LEARN.md` §5), an zwei bis drei Orten, nicht überall.
4. Ein **gesprochener Satz** pro Moment („Correct. Next up: K." aus 1.1 §11) als Stimme der Marke. Siehe D.

Neue Farben schlage ich nicht vor. Jede wäre eine dokumentierte Entscheidung (CLAUDE.md §2.9).

### C. Logo

**Was gebaut ist**
| Datei | Zweck | Beleg |
|---|---|---|
| `public/logo-key.svg` | Marke allein, viewBox `-12 -12 144 98` | `Menu.tsx:174` (24 × 16 px), `About.tsx:27` (90 × 61 px) |
| `public/logo-lockup.svg` | Marke + Wortmarke, 383 × 98 | **in keiner Seite eingebunden** (grep: nur Kommentare in `About.tsx:7`, `Menu.tsx:173`) |
| `public/logo-mark-inverse.svg` | Marke auf Ink | **ungenutzt** |
| `public/favicon.svg` | Marke auf Papier, Radius 116/512 | `index.html:12`, Generator-Seiten |
| `public/icons/*` | PNG 192, 512, maskable, apple-touch | `manifest.webmanifest`, `index.html:57` |
| `docs/brand/assets/*` | Quellen | — |

Konstruktion (1.1 §3): Basis 120 × 8, Hebel 92 × 8 um 13° gedreht, Knopf ⌀ 30 gefüllt Amber, Lager ⌀ 10 mit 3-px-Rand (`public/logo-key.svg`).

**Befund C1 — `logo-lockup.svg` ist kein gültiges XML und lädt nicht.**
- Der Kommentar in Zeile 6 enthält einen Doppelbindestrich (`morse-lab-mark.svg -- hier wird nichts nachgezeichnet`). XML verbietet das. `xmllint` meldet „Comment must not contain '--'". Als `<img>` oder `<link>` rendert der Browser nichts, nur ein kaputtes Bild-Icon (Beleg: erster Versuch von `x-60-logo-sheet.png`, nach Korrektur der Wegwerf-Kopie läuft es).
- Folge: Das primäre Lockup aus 1.1 §3 existiert als Datei, ist aber nirgends sichtbar. Ob die Datei extern verwendet wird (Slides, Store), ist unbekannt. FINDINGS #18.
- **Preis:** S (zwei Zeichen). Delegation.

**Woran die Marke nicht passt** (Messung und [Geschmack] getrennt)

*Messung* (`x-60-logo-sheet.png`, `x-61-favicon-16-32-dpr1.png`):
- **Proportion:** viewBox 144 × 98 (≈ 1,47:1) bei einer Zeichnung, deren Inhalt in der unteren Hälfte liegt. Neben der Wortmarke wirkt der Taster zu tief und zu breit. Im Lockup sitzt der Wortmarken-Grundlinie ungefähr auf Basishöhe, die Mitte des Zeichens liegt über der Zeilenmitte.
- **Favicon bei 16 und 32 px:** Strichstärken von ca. 1 px, das Lager (⌀ 10 mit 3 px Rand) löst sich auf. Die Marke ist in dieser Größe ein beiger Fleck mit einem orangen Punkt. 1.1 §3 fordert unter 24 px das **Fallback-Zeichen (Punkt + Pille)**. Die Favicon-Datei benutzt aber die Vollmarke (`public/favicon.svg`). Es gibt keine Fallback-Datei im Repo.
- **Dunkel/Hell:** Eine Inverse-Datei existiert, ist aber nicht verdrahtet. Die App zeigt in dunklen Themes (Night, Phosphor, Ink) im Rail-Kopf `logo-key.svg` mit hartem `#221D16` auf dunklem Grund (nicht geprüft, Dark-Screenshots fehlen).

*[Geschmack]:*
- **Bezug zum Morse-Code:** Der Taster ist ein Werkzeug, kein Code. Er sagt „Telegrafie", aber nicht „hören". Die Marke kommuniziert die Sende-Seite (Taste) eines Produkts, das die Hör-Seite übt.
- **Form:** Der Taster liest sich als Stift oder Reißnagel, wenn man das Konzept nicht kennt. Der Hebel mit Knopf links und Lager rechts ist eine echte Taster-Anatomie, aber ohne Kenntnis nicht lesbar.
- **Wortmarke:** Newsreader Regular ist ruhig und gut. Die Marke daneben ist **geometrisch hart** (Rechtecke, Kreis), die Wortmarke **organisch** (Serife). Es fehlt eine gemeinsame Konstruktionslogik.

**Richtungen** (Beschreibung, keine Umsetzung):

| | Richtung | Idee | Stärke | Einschränkung |
|---|---|---|---|---|
| R1 | **Taster behalten, nachschärfen** | Knopf und Lager größer relativ zur Basis, Hebel kürzer, Bildformat ca. 1,2:1, Fallback-Zeichen (Punkt + Pille) als eigene Datei für 16 px. | Geringste Entscheidungskosten, bleibt in 1.1 | Löst die Bedeutungs-Frage nicht |
| R2 | **Das Klangzeichen: Punkt und Pille als Marke** | Die Fallback-Marke wird primär: ein Punkt in Amber und ein Strich in Ink, mit korrekter Proportion 1:3 (1.1 §8: Punkt ⌀ 1u, Strich 3u × 1u). Optional ein echtes „ML" `−− ·−··` als Lockup-Ornament. | Sagt Morse sofort, skaliert bis 16 px, passt zur Regel „echter Code" | Der Taster fällt weg (Entscheidung gegen 1.1 §3), das Amber ist ein Punkt statt ein Knopf |
| R3 | **Buchstabenmarke: das „M" als Code** | Newsreader-„M" neben seinem Code `−−`, als zwei Pillen, gesetzt in Marken-Proportion. | Bezug zum Namen, trägt Wortmarke und Bildmarke zusammen | Hohe Kosten, verlangt Typografie-Feinarbeit, Lesbarkeit im Favicon begrenzt |

**Empfehlung:** R1 jetzt (Preis M), R2 als Variante prüfen lassen. R3 nur, wenn die Marke eine zweite Ausbaustufe bekommt. Alle drei brauchen ein **Ruling** (Logo ist Markenrecht, 1.1 §3).

**Einschränkungen je Richtung:**
- **Favicon 16 px:** R1 braucht eine eigene Fallback-Datei, R2 funktioniert direkt (2 Formen), R3 nur als „M" ohne Code.
- **App-Icon:** 1.1 §3 verlangt Marke mittig auf Papier mit 10 px Radius bei 44 px. R1 und R2 erfüllen das. Die maskable-Variante braucht Sicherheitszone (80 %).
- **Dunkel/Hell:** Inverse-Variante mit Papier-Balken und Amber-Knopf existiert. Sie ist anzubinden (`prefers-color-scheme`, Theme-Wechsel), derzeit offen.
- **Amber-Regel:** In jeder Variante ist die Marke eine Amber-Fläche. Auf Ansichten mit einem Amber-Primär (Settings, Account) stehen zwei Ambers. Nur eine Marke ohne Amber (Ink-only-Variante für den Kopf) löst das. Das ist eine Entscheidung, keine Umsetzung.

### D. Lernfortschritt sichtbar machen

**Was der Nutzer heute erfährt** (Beleg Abschnitt 2.8):
- **Wo er steht:** „10 of 36 active" (Randspalte, Progress, Settings), „Today 79% · 6 characters", „Day 6." und die Tabelle in Progress. Auf dem Handy erscheinen Tagesquote und Streak nur in der Fußzeile des Start-Screens (`m-20-practice-start.png`), „10 of 36" nur in Progress und Settings.
- **Was als Nächstes kommt:** nur im Wachstumsmoment („W joins") und als Kandidat in „Add W now". Der Nutzer erfährt nicht vorher, **dass** ein Zeichen bald kommt, noch **wann**.
- **Warum jetzt:** nirgends. Das Intro sagt „as you get surer" (`Intro.tsx:38`). Die Schwellen 85 %, 75 %, 5 Versuche und 30 Antworten bleiben im Code.
- **Wo Erklärung fehlt:**
  1. Beim Wachstum fehlt der Grund. „The set grows" ohne Warum liest sich wie eine Setzung der App.
  2. Auf der Lernkarte fehlt „1 of 6 new sounds" mit dem Hinweis, dass der Check folgenlos ist.
  3. Im Progress fehlt eine Zeile zum Gesamtbild („Next: W — grows once the last 30 answers are 85 % right.").
  4. Auf dem Session-Ende fehlt der Rückblick auf das Erlernte („Today: K, M, R steady; S needs more time.").
- **Wo sie versteckt ist:** Der **Näherungswert** zur Reaktionszeit steht in zwei Fußnoten auf Progress und am Ende des Sitzungsendes (`Progress.tsx:100-113`, `App.tsx:1895-1897`). Auf der Sitzungsende-Seite ist er mit „Works offline once loaded." in einen Absatz geklebt (`m-51-session-end-grow.png`). Das wirkt wie ein Versehen. Auf der Übung selbst steht er nicht, dort gibt es aber auch keine Reaktionszeit.

**Befund D1 — Die Entscheidung „neues Zeichen" ist unsichtbar bis zum Moment.**
- Das ist didaktisch gewollt (kein Zählen, kein Druck). Es macht das Wachstum aber zu einem Ereignis ohne Geschichte. Für „Lernen vor Punktzahl" fehlt der **Lern-Beleg**: Woran sieht der Nutzer, dass er etwas kann?
- **Vorschläge, die §2 einhalten:**
  - **D1a — Ein Satz Begründung beim Wachstum.** Aus „The set grows: W joins from the next round." wird: „The set grows: W joins from the next round. Your last 30 answers were mostly right." Der Zusatz ist eine Aussage über das Können, keine Zahl. Quelle: `unlock`-Absatz (`App.tsx:1429`). **Preis:** S. **Ruling nötig (Wortlaut).**
  - **D1b — Eine Zeile „Next" auf Progress,** als Aussage mit Näherungs-Kennzeichnung: „Next: W. It joins when the recent answers are steady — about 85 %, roughly, an approximation." Das macht das Warum auffindbar, ohne einen Zähler anzulegen. **Preis:** S. **Ruling nötig.**
  - **D1c — Auf der Karte ein Satz zum Check:** „The next three are practice — nothing here counts." Das sagt die Wahrheit über `learn.ts:14-20` und nimmt die Angst vor dem Check. **Preis:** S. **Ruling nötig.**
  - **D1d — Session-Ende mit einem Rückblick auf Zeichen,** nicht auf Prozent: „K and M came quickly. S took longer — it will come back." Quelle: `slowCharacters` (`drill.ts`). **Preis:** M. **Ruling nötig.**
- **Streak mit Freeze-Gnade:** Die Zeile ist gelungen (`statusLines.ts:21-26`) und im Ton richtig („Starting fresh."). Offen ist die **Regel**: „freeze ready" sagt nicht, was es ist oder wie man ihn verdient (7 Tage, Vorrat 1). **D1e:** Ein einmaliger Satz beim ersten „freeze ready": „A rest day won't break your streak." Das ist die Zusage des Konzepts (§2.8) in einem Satz. **Preis:** S. **Ruling nötig.**

**Befund D2 — „Sessions" auf Progress und „Session N" im Kopf sind keine Lernzahl.**
- `sessionsStarted` steigt bei jedem Öffnen der App (`stats.ts:405-412`, `beginSession`). Nach neun Neuladungen im Review stand dort 15 statt 9 (`m-28-progress.png`). Der Kopf zeigt „Session 10", die Progress-Seite „Sessions 15".
- Das ist eine Zahl, die steigt, ohne dass das Können steigt (§2.4), und jede Zahl auf dem Bildschirm ist eine Behauptung (§2.6). Schon `progressStorage.ts` benennt das Problem im Kommentar zur Lern-Kennung.
- **Optionen:** (a) Status quo. (b) „Sessions" aus Progress entfernen. (c) Nur **beendete** Sitzungen zählen (Zähler beim Abschluss).
- **Empfehlung:** (b), danach (c), wenn der Kopf „Session N" behalten werden soll. Das ist ein Produktentscheid.
- **Preis:** S (b), M (c). **Ruling nötig (Produktregel).**

**Befund D3 — Das Näherungs-Gebot gilt dort, wo es um Zeit geht, aber nicht dort, wo es um Prozent geht.**
- Die Reaktionszeit trägt zwei Hinweise. Die **Prozente** („79 %", „Accuracy 55 %") tragen keinen. Auf Progress heißt die Spalte „Accuracy". Sie ist die Trefferquote über **alle** Versuche je Zeichen, nicht über das 30er-Fenster, das das Wachstum entscheidet. Es sind zwei verschiedene Zahlen unter einem Wort.
- **Optionen:** (a) Status quo. (b) Spalte „Accuracy" umbenennen („Hit rate, all time") und die Fensterquote („Recent") ergänzen. (c) Eine Fußnote: „Accuracy counts every answer so far. The set grows on recent answers."
- **Empfehlung:** (c). Das beantwortet ein Rätsel, ohne eine Spalte hinzuzufügen.
- **Preis:** S. **Ruling nötig (Wortlaut).**

**Nicht empfohlen, weil §2 widerspricht:**
- **Fortschrittsbalken „x % zum nächsten Zeichen"** — das ist eine Zahl über nichts (§2.4) und ein Druckmittel (§2.8). Zusätzlich benennt 1.1 §7: „Never a thick bar, a ring, or a percentage badge."
- **Live-Anzeige „du hast 24 von 30"** — lädt zum Zählen ein (§2.2) und macht jede Antwort zu einer Prüfung.
- **Abzeichen, Level, XP** — „Punkte/Badges ohne Kompetenzbezug" steht in CI §7.
- **Wochen-Streak mit Wiederherstellen-Knopf** — das ist Streak-Erpressung (§2.8).
- **Zeichenübersicht als „Heat-Map" mit Rot/Grün** — 1.1 §4 verbietet Rot/Grün, §6 Farbe allein.
- **Mitlaufende Zeichen-Visualisierung beim Hören** — Addendum (a).

### E. Funktionen

**Der Kernloop** (hören → tippen → Feedback):
- **Practice** ist der Loop. 2 Klicks pro Runde (Play, Antwort), dann „Next character".
- **Learn-Lauf** (Karte und Echo) bereitet ihn vor, er ist Teil des Loops, nicht daneben.
- **Speed round** ist derselbe Loop mit anderer Auswahl (langsame Zeichen). Er trägt den Kern, solange er eine Einladung bleibt und kein Muss.

**Was ablenkt oder den Loop streckt:**
- **Words & groups** und **Send** gehören zu Koch/Wort-Training und sind ab 8 Zeichen sinnvoll. Sie haben **keine Erklärung**: Beim Betreten steht „Ready when you are." ohne Satz, was dieser Modus ist (`m-26-words.png`, `d-26-send.png`). Words zeigt `—` und ein Antwortfeld, Send ein Zeichen und zwei Tasten. Wer die Menü-Einträge nicht kennt, errät es.
- **Send** (Taste tippen) übt die Produktion, nicht das Hören. Es ist wertvoll, aber es ist ein **zweiter Kern** neben dem Kernloop. Die getrennte Statistik (`stats.ts:369-391`) ist der richtige Umgang.
- **Account und Passkey** sind V1-fremd, aber als offene Tür beschlossen (§2.5). Der Menüeintrag steht über Settings und wird dadurch zum 6. Eintrag. Siehe A2.
- **Theme-Wahl** (B5) ist Zubehör.

**Features, die eine Zahl heben, ohne das Können zu heben (§2.4):**
1. **„Add W now"** (Settings) hebt „10 of 36 active" ohne Können. Es ist als manuelle Abkürzung beschlossen und beschriftet („early, one at a time", `Settings.tsx:230`), also kein Verstoß. Es ist aber ein Weg, die Zahl zu erhöhen. Ich markiere es als **Grenzfall**, nicht als Fehler.
2. **Echo-Check mit einer Antwort** (Karte 1) liefert eine sichere Trefferquote 1 von 1, zählt aber nicht in der Statistik. Er hebt keine Zahl, **erzeugt aber das Gefühl eines Erfolgs ohne Leistung**. Siehe A4.
3. **„Sessions"** (D2) steigt mit Neuladen.
4. **Streak-Tag über Words oder Send ab 5 Aufgaben** (`words.ts:71`, `sendSession.ts:319-321`) zählt als geübter Tag, obwohl das Hörtraining ausblieb. Das ist als Gnade gedacht. Ich nenne es, weil „Tage" die Zahl sind, die eine Sicht auf Können vortäuscht. **Empfehlung:** so lassen, aber im Konzept bestätigen lassen.

**Was für ein rundes V1 fehlt:**
1. **Eine Sitzung beenden** (A3), besonders mobil.
2. **Ein Satz pro Modus** zu dem, was er ist (Words, Send, Speed round). **Preis:** S je Modus. Wortlaut: Fable.
3. **Eine Rückmeldung, wie lang der Erstlauf ist** („6 sounds, about 5 minutes", als Näherung). **Preis:** S. Wortlaut: Fable.
4. **Ein Ausstieg aus dem Learn-Lauf, der nichts verliert** (A5).
5. **Eine Erklärung für Hörende und Nicht-Hörende,** dass die App auditiv ist (siehe F3).
6. **Export und Löschen der Daten.** Account hat „Delete account" (`account.ts:200`). Für den lokalen Fall gibt es keinen sichtbaren Export. Das gehört zur Zusage „Persistenz verliert keine Nutzerdaten" (§4). **Preis:** M. **Ruling nötig (Produktregel).**
7. **Daten- und Zugriffsstand auf allen Seiten gleich.** Die Learn-Seiten kennen den Nutzer nicht („Open the app" ist ein grauer Link). Siehe F4 und B2.

### F. Barrierefreiheit im Design (§6)

**Was gut ist (Beleg):**
- **Kontrast:** 24 gemessene Rollen in sieben Themes sind über den Grenzen (`npm run verify:contrast`). Paper: Ink 13:1+, Gray/Paper 5,14:1, Paper/Amber 4,52:1, Fokusring 6,30:1.
- **Farbe nie allein:** Richtig/falsch hat Haken oder Kreuz als SVG und Text („Correct.", „Not quite — that was O."). Beleg: `Mark.tsx`, `d-23-practice-feedback.png`. Der Menü-Ort ist ein Punkt (Form) mit `aria-current` (`Menu.tsx:14-17`).
- **Selbstgesteuert:** Jede Hörübung wartet auf einen Klick („Ready when you are."). Es gibt keine Zeitvorgabe, keine Countdown-Uhr. Die Antwort ist nicht zeitbegrenzt. Das erfüllt „zeitgesteuerte Darbietung braucht eine selbstgesteuerte Alternative" für alle Modi: Ton, Pause, Antwort sind nutzerausgelöst. Der Ton selbst ist die einzige zeitgesteuerte Darbietung, und er lässt sich jederzeit wiederholen (Addendum (c)).
- **Reduced Motion:** Globaler Block `@media (prefers-reduced-motion: reduce)` setzt Animationen und Übergänge auf 0,01 ms (`styles.css:1743-1751`). Die einzigen Animationen sind `fade-in` (Zeile 975, 1159) und die Zustandsübergänge von 150/250 ms. Die Guidelines wollen, dass die **Amber-Synchronisierung** (Zeichen leuchten im Takt) erhalten bleibt. Die gibt es nicht (Addendum (a)). Der Block ist damit sogar strenger als 1.1 §9.
- **Fokus bei Moduswechsel:** Karte, Check und Intro setzen den Fokus (`Learn.tsx:53-55`, `Intro.tsx:53-55`). `aria-live="polite"` an Eyebrow und Satz (`Learn.tsx:63`, `App.tsx` `role="status"`).
- **Tap-Größe:** Menü-Button 44 × 44, Play 88 × 88, Antwort 106 × 64, Skip 25 × 44 (Höhe stimmt, Breite nur 25 px). Gemessen mit `hit.mjs`.

**Befunde:**

**F1 — Tap-Ziele unter 44 px:**
- Im Menü-Panel sind „Imprint" und „Privacy" nur **17 px hoch** (44 × 17 und 42 × 17, gemessen mobil). 1.1 §6 fordert 44 × 44.
- Auf den Learn-Seiten sind die Kopf-Links 20–21 px hoch („Open the app", gemessen).
- **Optionen:** (a) Status quo. (b) Padding vergrößern, bis 44 px Höhe erreicht sind. (c) Rechtslinks mit 44-px-Zeilen im Panel.
- **Empfehlung:** (b). Das ist ein Messwert gegen die eigene Richtlinie, keine Geschmacksfrage. Zwei CSS-Regeln.
- **Preis:** S. Delegation.

**F2 — Fokusring in Amber statt in Ink.**
- 1.1 §7 und §12 sagen: „focus = 2 px ink outline (no glow)", „Focus is a 2 px ink outline, never suppressed". Die App setzt `outline: 2px solid var(--amber-deep)` (`styles.css:130-133`), 6,30:1 auf Paper und damit AA-konform. Er macht aber jede fokussierte Fläche zu einer Amber-Fläche und kollidiert mit „ein Amber pro View" (B4).
- **Optionen:** (a) Status quo, begründet durch Kontrast. (b) Ink-Ring (≈ 13:1, 1.1-konform). (c) Ink-Ring, plus Amber nur für Interaktion „Ton läuft".
- **Empfehlung:** (b). Es gibt keinen technischen Grund für Amber, das Dokument sagt Ink. Möglicherweise ist es ein Rest aus der Zeit vor 1.1 (CI §4 kennt keinen Fokus). Ich empfehle Rückfrage an Fable.
- **Preis:** S. **Ruling nötig.**

**F3 — „Der Modus ist auditiv" steht nur für Screenreader.**
- Der Satz „An audio drill. You hear one character…" ist **visuell versteckt** (`App.tsx:1293-1296`, `visually-hidden`). Er erreicht Blinde, aber nicht **Gehörlose oder Schwerhörige, die die Seite sehen**. §6 verlangt: „Wer nicht hören kann, muss klar erfahren, dass ein Modus auditiv ist — und warum."
- Das Intro sagt in Bildschirm 1 „Learn Morse by ear." Das ist sichtbar, aber nur einmal und nicht beim Wiedereinstieg. Wer das Intro überspringt, erfährt es nirgends.
- Es gibt keine visuelle Alternative im Hörtraining (Addendum (a) streicht den „visuellen Zwilling" bewusst). **Send im getippten Modus** ist de facto eine visuelle Übung (Zeichen sehen, Muster tippen) und wäre ein Weg, ist aber nicht als solcher benannt.
- **Optionen:** (a) Status quo. (b) Einen sichtbaren, ruhigen Satz im About und auf dem ersten Start-Screen: „Morse Lab trains listening. If you can't hear the tone, Send lets you practise the patterns by sight." (c) „Visual practice" (opt-in-Modus) vorziehen. Das ist ausdrücklich „jetzt nicht bauen".
- **Empfehlung:** (b). Es erfüllt die Pflicht in einem Satz und baut nichts, was Addendum (a) verbietet.
- **Preis:** S. **Ruling nötig (Wortlaut und Produktregel).**

**F4 — Anker-Links und Lesespalte (Learn-Seiten):**
- Links in Amber ohne Unterstreichung (nur bei Hover). Amber auf Paper hat 5,0:1 (Text ≥ 14 px, bestanden), doch ohne Unterstreichung wird ein Link allein über Farbe erkannt. §6: „Nie Farbe allein" betrifft richtig/falsch, WCAG 1.4.1 aber auch Links im Fließtext. Die Fließtext-Links (`d-41-learn-pillar.png`) sind nur durch Farbe unterscheidbar.
- **Optionen:** (a) Status quo (CONCEPT-LEARN §5 verlangt es ausdrücklich). (b) Unterstreichung dauerhaft in dünner Linie.
- **Empfehlung:** (b) [Geschmack und WCAG-Risiko]. Das ist ein bewusster Widerspruch zu `CONCEPT-LEARN.md` §5 und braucht Fable.
- **Preis:** S. **Ruling nötig.**

**F5 — Nicht geprüft** (offen): Screenreader-Durchlauf der Echo-Phasen, Zoom 200 %, Tastatur-Reihenfolge im Menü-Panel (`verify:keyboard` im Repo prüft sie, ich habe es nicht laufen lassen, weil das Skript einen Server startet), Firefox und Safari.

---

## 4. Vorschläge, die dem Konzept widersprechen (nicht empfohlen, weil …)

| Idee | Warum nicht |
|---|---|
| Prozentbalken oder Ring „bis zum nächsten Zeichen" | §2.4 und §2.8, 1.1 §7 |
| Live-Fortschritt der Fensterquote („24 von 30") | §2.2 (Mitzählen), §2.6 (Zahl als Behauptung) |
| Konfetti, Töne, Erfolgsjingles bei neuem Zeichen | §2.8, 1.1 §10 |
| Streak-Warnung („Nur noch 2 Stunden!") | §2.8 |
| Wiederherstellen-Knopf für Streak | §2.8 |
| Punkte, Level, Ranglisten | §2.4, CI §7 |
| Rot/Grün für richtig/falsch | 1.1 §4, CLAUDE.md §6 |
| Punkt-Strich-Anzeige im Takt des Tons (visueller Zwilling) | Addendum (a), §2.2 |
| Ton langsamer abspielen, um Anfängern zu helfen | §2.3 (Farnsworth: nur die Pause strecken) |
| Zeichen-Rate pro Sekunde / Wörter-pro-Minute-Score | §2.4, nur Näherung, nicht Können |
| Neue Akzentfarbe (z. B. Blau für Information) | §2.9: braucht dokumentierte Entscheidung |
| Emojis als Zustand | §2.9, 1.1 §1 |
| Account-Pflicht für Fortschrittsansicht | §2.5 |
| Tägliches Ziel („20 Runden heute") mit Fortschritt | §2.8: Druck |
| Tastatur-Kürzel als Overlay beim Hören | §2.2, lenkt vom Hören ab |

---

## 5. Top 10, sortiert nach Wirkung pro Preis

| Rang | Vorschlag | Wirkung | Preis | Entscheidung |
|---|---|---|---|---|
| 1 | **Echo-Check bei Karte 1 weglassen** (eine Antwort ist keine Prüfung) oder ab Karte 2 stellen (A4) | Streicht 3 sinnlose Interaktionen im Erstlauf und ein „1 von 1" | S | Delegation |
| 2 | **Ein Satz Begründung beim Wachstum** (D1a) und **ein Satz zum folgenlosen Echo-Check** (D1c) | Schließt die größte Lücke in D: das Warum | S | Ruling (Wortlaut) |
| 3 | **Tap-Ziele auf 44 px:** Imprint und Privacy im Panel, Kopf-Links der Learn-Seiten (F1) | Beseitigt eine messbare Abweichung von 1.1 §6 | S | Delegation |
| 4 | **`logo-lockup.svg` reparieren** (C1), Fallback-Marke 16 px als eigene Datei | Das primäre Lockup funktioniert, das Favicon bleibt lesbar | S | Delegation (Datei), Ruling (Fallback) |
| 5 | **Sichtbarer Satz „Morse Lab trains listening" und Hinweis auf Send** (F3) | Erfüllt die §6-Pflicht für Hörgeschädigte | S | Ruling |
| 6 | **„Skip" in der Lernphase:** das Zeichen bleibt pending (A5) | Verhindert, dass Zeichen aktiv sind, die nie gehört wurden | M | Ruling |
| 7 | **Taster im Kopf:** Mobil und Learn-Seiten (B2) | Wiedererkennung mit einem Handgriff | S | Delegation |
| 8 | **Fokusring in Ink statt Amber** (F2, B4) | Löst Doppelring und Amber-Kollision, folgt 1.1 §7 | S | Ruling |
| 9 | **„Sessions" ersetzen oder nur beendete zählen** (D2) | Beseitigt eine Zahl ohne Bedeutung (§2.4, §2.6) | S bis M | Ruling |
| 10 | **Mobil: „End session"** (A3) und **ein Satz pro Modus** für Words und Send (E) | Schließt die Falle und die Erklärungslücke | M | Ruling |

Danach (nicht in den Top 10): Seitenmuster für Verwaltungsseiten (B1, M), Menü gruppieren (A2, S), Test-Ton als Umriss-Knopf (B7, S), Hub-Links in Ink (B6, S), Fortschritts-Satz „Next: W" auf Progress (D1b, S), Rückblick im Sitzungsende (D1d, M), Logo-Richtungen R1–R3 (C, M bis L), Datenexport (E, M).

---

## 6. Fremdbefunde

In `FINDINGS.md` ab #17 eingetragen (einziger erlaubter Eingriff neben diesem Bericht):

- **#17** — `npm run build` bricht auf macOS und Windows an `Account.tsx` und `account.ts` ab (Groß-/Kleinschreibung).
- **#18** — `public/logo-lockup.svg` ist ungültiges XML (Doppelbindestrich im Kommentar) und lädt als Bild nicht.
- **#19** — Zwei veraltete Kommentare nennen Schwellen, die nicht mehr gelten (`stats.ts:136` „Sperre 20", `tempo.ts:20-22` „90-%-Fenster").

---

## 7. Fragen an den Owner und Fable

1. **Erstlauf:** Ist die Länge (6 Karten, je mit Check) beabsichtigt, oder soll der Kernloop früher beginnen? (A4, A5, Befund 4)
2. **Warum-Satz:** Darf die App beim Wachstum einen Grund nennen, solange er keine Zahl enthält? (D1a)
3. **Fokusring:** Bleibt Amber-deep, oder gilt 1.1 (Ink)? (F2)
4. **Themes:** Sollen Frost, Olive und Phosphor in der Marken-Außendarstellung auftauchen? Und ist `#B35209` (statt `#B45309`) bestätigt? (B5, HANDOVER.md)
5. **Logo:** Soll das Fallback-Zeichen (Punkt + Pille) eine eigene Datei und das Favicon bei kleinen Größen werden? Soll eine Richtung R2 geprüft werden? (C)
6. **„Sessions":** Anzeige entfernen, auf beendete Sitzungen beschränken oder beibehalten? (D2)
7. **Hörbehinderung:** Reicht ein sichtbarer Satz plus Send, bis „Visual practice" kommt? (F3)
