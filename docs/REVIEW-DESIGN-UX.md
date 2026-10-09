# Design- und UX-Review der gebauten Website — Bericht

*Stand: Branch `claude/clever-turing-77fkyo`, Commit `6d925a1` (Runde P23), geprüft am
06.10.2026. Bericht, keine Umsetzung: Design- und Produktentscheidungen trifft der
Owner mit Fable. Jeder Punkt endet mit Optionen, einer Empfehlung und einem Preis.*

Maßstab sind CLAUDE.md §2 (Produktphilosophie), §2.9 (Design-Richtung „Ruhe"), §6
(Barrierefreiheit), die Brand Guidelines 1.1 (führend), `docs/CI.md` (nachrangig)
und `docs/CONCEPT-LEARN.md`. Geschmacksurteile sind als solche markiert.

---

## 0. Vorgehen und Belege

**Umgebung.** `npm install`, `npm run build` (grün), `vite preview` auf Port 4199,
Chromium 1194 über `playwright-core`. Die App wurde zweimal komplett durchgespielt:
einmal als neuer Nutzer (Intro → Lernkarte → Echo-Check → Training 20 Runden →
Summary → Menü → Progress), einmal mit gesetztem Stand (9 bzw. 36 aktive Zeichen,
Tag 4 Streak, 14 wpm) für Words, Send, Progress, Settings, Account, Learn the
sounds, Tastenfeld, Night-Theme. Dazu die statischen Seiten Learn-Hub (EN/DE),
Pillar, Alphabet, Imprint, Privacy. Je Ansicht ein Screenshot bei 390 × 844 und
1440 × 900 (75 Dateien).

**Screenshot-Ordner (Scratchpad dieser Sitzung):**
`/tmp/claude-0/-home-user-projekt-morse/5da6ec8a-f95e-454d-b1ff-03f4ac1e0961/scratchpad/shots/`
Im Bericht abgekürzt als `shots/…`. Wo im Repo ein gleichwertiges Bild liegt, steht
zusätzlich `docs/screenshots/…`.

**Die zehn wichtigsten Screenshots:**

| Nr. | Datei | Zeigt |
|---|---|---|
| S1 | `shots/08-training-ready-390.png` (≈ `docs/screenshots/training-390.png`) | Start-Screen mobil, Kopfzeile, gegrautes Gitter |
| S2 | `shots/11-training-feedback-390.png` | Auflösung falsch: Kreuz, Amber-Treffer, Kopfzeile ohne Wortmarke |
| S3 | `shots/16-training-9chars-ready-1440.png` (≈ `docs/screenshots/desktop-training-1440.png`) | Laptop-Layout: Schiene, Bühne, Randspalte |
| S4 | `shots/04-learn-card-heard-390.png` | Lernkarte nach dem Ton |
| S5 | `shots/05-echo-ready-390.png` | Echo-Check mit genau einer Antwortoption |
| S6 | `shots/19-words-feedback-390.png` | Words: zwei Amber-Flächen zugleich (Finding #17) |
| S7 | `shots/28-training-36chars-answering-390.png` (≈ `docs/screenshots/keypad-36-chars-390.png`) | Tastenfeld mit 36 Tasten |
| S8 | `shots/14-menu-390.png` (≈ `docs/screenshots/menu-390.png`) | Menü-Panel mit neun Einträgen |
| S9 | `shots/22-settings-390.png` (≈ `docs/screenshots/settings-390.png`) | Settings: Formularstapel |
| S10 | `shots/31-learn-hub-1440.png` (≈ `docs/screenshots/learn-hub-1280.png`) | Learn-Hub: sechs Amber-Links plus CTA im Viewport |

Weitere herangezogen: `01-intro-1`, `07-echo-feedback`, `13-summary`, `21-progress-9chars`,
`25-about`, `26-review-picker`, `30-training-night`, `32-learn-pillar`, `38-focus-ring`
(jeweils `-390`/`-1440`).

---

## 1. Der Lernablauf, wie die Engine ihn tatsächlich steuert

Zuerst die Fakten aus `src/engine/`, danach die Frage, was die UI davon zeigt (Teil D).

**Start.** Sechs Zeichen K M R S U A (`settings.ts:76`), Zeichentempo 20 wpm, Gesamttempo
10 wpm Farnsworth (`settings.ts:12,15`). Sitzung = 20 Abfragen (`settings.ts:99`).

**Einführung (Lernmodus).** Jedes aktive, aber noch nie vorgestellte Zeichen bekommt vor
der nächsten Sitzung eine Karte: Buchstabe, Ton spielt beim Öffnen einmal von selbst,
danach erst wird das Muster sichtbar (`learn.ts:120`, `App.tsx:674–695`). Dann ein
Echo-Check aus drei Abrufen (`learn.ts:24`): der erste ist immer das neue Zeichen, die
weiteren ziehen aus allem Eingeführten, das neue doppelt gewichtet (`learn.ts:131,216`).
Antwortoptionen sind nur die bis dahin eingeführten Zeichen; bei der allerersten Karte
ist das genau eine (`learn.ts:92–97`, Screenshot S5). **Der Echo-Check schreibt keine
Statistik** (`learn.ts:14–20`); er setzt nur `introducedCharacters`. „Skip" markiert alle
anstehenden Zeichen als eingeführt (`App.tsx:750`).

**Auswahl in der Sitzung.** Gewichtet nach Schwäche: Grundgewicht 1, nie gefragt 4,
Fehlerquote bis +4, Reaktionszeit (0,6–3 s linear) bis +2 (`selection.ts:22–49`),
gezogen aus einem Beutel ohne Wiederholung (`bag.ts`), nie zweimal dasselbe
hintereinander (`selection.ts:71`).

**Wann kommt ein neues Zeichen (`growth.ts:62–77`)?** Alle vier Bedingungen zugleich:

1. seit der letzten Einführung mindestens 10 Antworten (`GROWTH_LOCKOUT_ANSWERS`, Z. 53);
2. das rollierende Fenster der letzten 30 Antworten ist voll und zu ≥ 85 % richtig
   (`GROWTH_WINDOW_ACCURACY`, Z. 35; `stats.ts:34`), also mindestens 26 von 30;
3. jedes aktive Zeichen hat ≥ 5 Versuche (Z. 38);
4. kein aktives Zeichen liegt unter 75 % (Z. 41).

Dann kommt **genau das nächste Zeichen aus `CHARACTER_ORDER`** (`settings.ts:93`):
K M R S U A, dann P T L O W I N J E F 0 Y V G 5 Q 9 Z H 3 8 B 4 2 7 C 1 D 6 X — 36
Zeichen, keine Satzzeichen. Die Prüfung läuft nach jeder Antwort (`session.ts:273`);
das neue Zeichen gilt ab der nächsten Runde und bekommt vor der *nächsten Sitzung*
seine Lernkarte. In Settings lässt sich das nächste Zeichen außerdem **ohne Prüfung**
freischalten (`growth.ts:121`, `Settings.tsx:231` „Add O now").

**Was nicht ins Wachstum zählt.** Speed round (Drill) und Words schreiben zwar die
Zeichen-Statistik, aber nicht das 30er-Fenster (`stats.ts:256–275`, `session.ts:262`).
Der Echo-Check schreibt gar nichts.

**Speed round.** Eingeladen wird ab einem Zeichen, das ≥ 5 Messwerte, ≥ 80 % Quote und
einen Median über 2 s hat (`drill.ts:36–55`); der Drill hat 10 Runden und mindestens
drei Zeichen (langsame zuerst, schnelle als Kontrast).

**Tempo.** Erst wenn alle 36 Zeichen aktiv sind, steigt das Gesamttempo um 1 wpm, sobald
das 85-%-Fenster erfüllt und die 10er-Sperre vorbei ist (`tempo.ts:72–108`). Nie
automatisch abwärts; Reset nur in Settings.

**Streak.** Ein Tag zählt als geübt, wenn eine Sitzung *beendet* wurde
(`session.ts:329–343`) oder 5 Wort- bzw. Sende-Aufgaben abgeschickt sind
(`words.ts:71`). Ein verpasster Tag verbraucht einen Freeze, der nach 7 geübten Tagen in
Folge bereitliegt; zwei verpasste Tage beenden die Reihe ohne Strafe (`streak.ts:1–41`).

**Klang-Variabilität.** Ab 8 aktiven Zeichen streut die Tonhöhe pro Sitzung (560–680 Hz),
ab 12 pro Abfrage (520–720 Hz) und das Tempo ±10 % (`variability.ts:29–45`). Words
und Send öffnen ebenfalls ab 8 aktiven Zeichen (`words.ts:54`, `App.tsx:994`).

---

## 2. Informationsarchitektur der Hauptansichten

```
Morse Lab (SPA, ein useState statt Router: App.tsx:198)
├─ Intro (einmalig, 2 Screens)                     Intro.tsx
├─ Practice (Start = Training-Screen)              App.tsx:1393 ff.
│   ├─ Lernkarte → Echo-Check (automatisch, wenn Zeichen anstehen)   Learn.tsx
│   ├─ Sitzung: ready → listening → answering → feedback (×20) → Summary
│   └─ Speed round (Einladung auf dem Start-Screen)
├─ Learn the sounds (ReviewPicker: 36 Kacheln, Reihenfolge = CHARACTER_ORDER)
├─ Words & groups (ab 8 Zeichen)                   Words.tsx
├─ Send (ab 8 Zeichen; Tap-Pad / echte Taste)      Send.tsx
├─ Progress (3 Kennzahlen + Tabelle je Zeichen)    Progress.tsx
├─ Account (Passkey)                               Account.tsx
├─ Settings (Pitch, Volume, Theme ×6, Tempo-Reset, „Add X now")   Settings.tsx
├─ Learn  → verlässt die App: /learn/ (statisch)   Menu.tsx:95
├─ About (Lockup, 3 Fakten, Link /learn/)          About.tsx
└─ Fußzeile: Imprint · Privacy (statisch)          Menu.tsx:74–83

Statisch daneben: /learn/ (6 Artikel EN) · /de/lernen/ (6 Artikel DE) · /imprint/ · /privacy/
```

Navigation: unter 900 px Hamburger → Vollbild-Panel (`Menu.tsx:221`), ab 900 px offene
Schiene links (`styles.css:1921 ff.`), ab 1280 px zusätzlich Randspalte rechts mit
drei Zeilen Tagesstand (`MarginColumn.tsx`).

---

## A. Übersicht und Navigation

### A1. Wege zur ersten Übung

**Befund.** Neuer Nutzer: Intro „Next" → „Begin" → Lernkarte (Ton spielt) → „Try it"
→ Echo-Check 3 × (Play → Antwort → Next) → nächste Karte … Sechs Karten ergeben
**62 Tipps bis „Session 1, Round 1"**; über „Skip" sind es **3** (Belege: `Intro.tsx`,
`Learn.tsx:299,429`, `learn.ts:24`, Screenshots S4, S5, `07-echo-feedback-390`).
Wiederkehrender Nutzer: **0 Tipps**, der Start-Screen *ist* die Übung (S1). Das ist
sehr gut.

**Begründung.** Die Einführung ist richtig gedacht (CLAUDE.md §2.2: Klang zuerst), aber
sechs Karten mit je drei Abrufen vor der ersten echten Runde sind lang, und die ersten
Echo-Checks sind bei einer bzw. zwei Optionen keine Unterscheidung, sondern eine
Bestätigung („war das K?", `learn.ts:87–90`, S5). Wer das durchzieht, hat 18 Abrufe
gemacht, die nirgends zählen (`learn.ts:14`), und erst dann beginnt die Statistik.

**Optionen.**
1. So lassen; der Code begründet es ehrlich.
2. Echo-Check erst ab der zweiten Karte (Pool ≥ 2), Karte 1 geht direkt zur Karte 2.
3. Erste Einführung als *eine* kurze Sitzung: zwei Karten, dann ein gemeinsamer
   Echo-Check über beide; dann zwei weitere Karten usw. (3 Blöcke statt 6).
4. Echo-Rounds von 3 auf 2 (die Vorgabe nennt „zwei bis drei", `learn.ts:23`).

**Empfehlung.** Option 2 (kleinster Eingriff, nimmt die leere Ein-Optionen-Abfrage weg)
und Option 4 prüfen. Option 3 ist das bessere Lernformat, aber eine Produktentscheidung.

**Preis.** 2 und 4: S, Fable-Ruling (Produktregel). 3: M, Fable-Ruling.

### A2. Was auf dem Start-Screen um Aufmerksamkeit konkurriert

**Befund.** Auf 390 × 844 (S1) stehen gleichzeitig: Wortmarke + Hamburger, Kopfzeile
„Session 8 · Round 1 / 20" + Linie, Eyebrow „READY · 620 HZ", Play-Kreis, Frage,
gegrautes Antwortgitter (6 bzw. 36 Tasten, `button:disabled` 45 % Opazität,
`styles.css:428`), Streak-Zeile, ggf. Drill-Einladung, Fußzeile „Today 86 % · 5
characters · 14 wpm" + fünf Punkte. Auf 1440 (S3) zusätzlich Schiene (9 Einträge + 2
Links) und Randspalte (3 Zeilen). Das sind **sieben bis neun Informationsgruppen**
auf einem Screen, dessen einzige Handlung „Play" ist.

**Begründung.** 1.1 §1 („Calm before stimulus", „prefer a second screen over a full one",
§6) und §7 („hide what can't be used"). Das gegraute Gitter ist genau der „disabled-gray
ghost row", den §7 verbietet, auch wenn das Ruhe-Mockup es so vorsieht. Die Hz-Zahl im
Eyebrow ist für Einsteiger eine Zahl ohne Handlung (CI §6 „keine Zahl ohne Bedeutung"):
auf Stufe 0 steht sie konstant bei 620, erst ab Stufe 1 trägt sie Information.
Die Randspalte wiederholt, was Fußzeile und Progress schon sagen.

**Optionen.**
1. Gitter im Zustand `ready`/`listening` **ausblenden** statt grauen; Platz bleibt
   reserviert (keine Layoutsprünge), es erscheint mit `answering`. Gegenargument im
   Code: das Gitter zeigt vorab, *was* zur Wahl steht, was im Echo-Check gewollt ist.
2. Gitter bleibt, aber ohne Opazitätsgrau: Umriss `edge-soft`, Buchstabe `gray`
   (Guidelines-konform „outlined", kein Ghost).
3. Hz im Eyebrow nur zeigen, wenn die Tonhöhe tatsächlich variiert (Stufe ≥ 1); auf
   Stufe 0 „READY".
4. Randspalte auf eine Zeile reduzieren oder ganz streichen (sie ist seit D1 eine
   Setzung, kein Mockup-Teil).

**Empfehlung.** 3 sofort (klein, ehrlich). 2 als Design-Frage an Fable; 1 nur, wenn Fable
den Vorab-Blick aufs Gitter nicht braucht. 4: Geschmacksurteil, zurückstellen.

**Preis.** 3: S, Fable-Ruling (Wortlaut/Regel). 1/2: S–M, Fable-Ruling (Mockup).
4: S, Fable-Ruling.

### A3. Die Kopfzeile verschwindet während der Sitzung — mobil ohne Ausweg

**Befund.** `headerShown` (`App.tsx:1263–1267`) blendet Wortmarke und Hamburger aus,
sobald die Sitzung läuft (ab dem ersten Play bis zur Summary). Vergleich S1 (Kopfzeile
bei y≈52, „SESSION" bei y≈110) mit S2 („SESSION" bei y≈42): die ganze Bühne springt
beim ersten Play um ≈ 60 px nach oben. Unter 900 px gibt es **20 Runden lang keinen
Weg** zu Settings (Lautstärke!), Progress oder Menü; der Nutzer muss die Sitzung
beenden oder neu laden. Am Laptop bleibt die Schiene stehen (S3), dort gilt das nicht.

**Begründung.** CLAUDE.md §6 (Fokus/Moduswechsel) und 1.1 §9 („Motion follows a user
action"): ein Layoutsprung ohne Nutzerabsicht ist das Gegenteil von Ruhe. Die Idee
dahinter (Konzentration, Mockup) ist gut; der Preis ist eine Sackgasse.

**Optionen.**
1. Kopfzeile immer zeigen; „Ruhe" entsteht durch die Leere der Bühne, nicht durch das
   Fehlen des Menüs.
2. Kopfzeile bleibt weg, aber ihr Platz bleibt reserviert (kein Sprung), und ein leiser
   „Leave session"-Textlink steht am Fuß der Bühne.
3. Nur der Hamburger bleibt (ohne Wortmarke), 24 px, rechts oben.

**Empfehlung.** Option 1 oder 3. Lautstärke ist ein Grundbedürfnis in einem Audio-Trainer;
dafür darf man nicht 20 Runden warten.

**Preis.** S, Fable-Ruling (Mockup-Entscheidung).

### A4. Menü: neun Einträge, zwei heißen „Learn"

**Befund.** `ENTRIES` (`Menu.tsx:87–97`): Practice, Learn the sounds, Words & groups,
Send, Progress, Account, Settings, **Learn** (externer Link zu `/learn/`), About (S8).
„Learn the sounds" (App-Screen) und „Learn" (verlässt die App, keine Rückkehr außer
„Open the app") stehen im selben Menü ohne Unterscheidung; der Link ist nur daran zu
erkennen, dass er nie den „aktuellen Ort" trägt. Gesperrte Einträge zeigen „from 8
characters" (gut erklärt), stehen aber als gedimmte Zeile (1.1 §7).

**Begründung.** Zwei gleich klingende Einträge mit verschiedener Natur sind eine
klassische IA-Falle. Neun Einträge sind für eine App mit *einem* Kernloop viel
(1.1 §1: „nothing pushes").

**Optionen.**
1. Umbenennen: „Learn the sounds" → „Sounds" oder „Review sounds"; „Learn" → „Articles"
   oder „Guides" mit einem leisen Austritts-Hinweis („opens the reading pages").
2. Gruppieren: *Practice* (Practice, Words & groups, Send, Speed round), *You*
   (Progress, Account, Settings), *More* (Guides, About, Imprint · Privacy); Hairline
   zwischen den Gruppen, keine Überschriften nötig.
3. Gesperrte Modi nicht listen, sondern einen Satz unter Practice: „Words & groups and
   Send open from 8 characters." (1.1 §7).

**Empfehlung.** 1 sofort, 2 danach. 3 ist 1.1-konform, aber CLAUDE.md §6 verlangt, dass
Gesperrtes erklärt wird; die heutige Lösung erfüllt das. Beides geht nicht — Ruling.

**Preis.** 1: S, Fable-Ruling (Wortlaut). 2: S, Fable-Ruling. 3: S, Fable-Ruling.

### A5. Learn-Seiten: Rückweg und Kopfzeile

**Befund.** Kopfzeile „Morse Lab · Open the app", Fuß „Deutsch · Learn · © Morse Lab ·
Imprint · Privacy", CTA „Start hearing it → Open Morse Lab" (S10, `32-learn-pillar-end`).
Der Pfeil „→" fehlt in den gehosteten Schnitten (FINDINGS #4) und fällt auf das
System-Fallback — im Screenshot sichtbar als schmalerer Pfeil in anderem Strich. Sonst
ist die IA der Learn-Seiten sauber (eine h1, Hub listet sechs, Pillar verlinkt alle).

**Optionen.** Pfeil durch Wort ersetzen („Start hearing it — Open Morse Lab") oder den
Glyphen in die Subset-Fonts aufnehmen (FINDINGS #4 nennt den Weg).

**Empfehlung.** Glyph nachrüsten (hält den Wortlaut von Fable). Preis: S, Owner-Delegation
(technisch), sofern der Wortlaut unverändert bleibt.

---

## B. Designsprache

### B1. Wo „Ruhe" trägt

**Befund (positiv, belegt).** Vier Töne konsequent als Tokens, kein Farbliteral
außerhalb (`npm run verify:colors` grün; `styles.css:72–85`). Newsreader für Frage,
Zeichen, Antwort-Buchstaben, Menü; Plex für Meta und Fließtext. Hairline-Fortschritt
2 px mit Ink-Füllung (`styles.css:173–186`, 1.1 §7 exakt). Umrissene Knöpfe, Play-Kreis
88 px, der nur beim Klingen Amber füllt (`styles.css:214–251`). Fünf Punkte statt
zwanzig (`settings.ts:101–108`). Richtig = Ink-Haken, falsch = Kreuz plus richtige
Antwort in Amber (S2) — 1.1 §4 wörtlich. Die Learn-Seiten („Ruhe editorial") sind der
reifste Teil: Lesespalte 680 px, Hairline-Tabellen, echtes ML-Ornament (S10).
Der Trainings-Screen in der Mitte einer Runde (S2) ist die stärkste Ansicht der App:
Buchstabe, Urteil, Muster — nichts sonst.

### B2. Wo es generisch wird

**Befund.**
- **Settings** (S9, `22-settings-1440`): native Range-Slider, Select „System", zwei
  Reihen Pill-Buttons, gefüllter Amber-„Play test tone" in voller Breite — ein
  Formularstapel ohne Rhythmus zwischen Sektionen (Label direkt unter dem Text der
  vorigen Sektion, z. B. „Theme" nach dem Volume-Hinweis). Der Primary ist hier das
  größte Element der Seite, obwohl er eine Nebenhandlung ist.
- **Progress** (S-Tabelle `21-progress-9chars-390`): drei Kennzahlen + Tabelle — korrekt
  nach 1.1 §7 („plain tabular numbers"), aber austauschbar; bei 36 Zeichen eine
  Tabelle mit 36 Zeilen, die Fußnoten rutschen ans Ende (geschätzt > 2 000 px).
- **Account** (`24-account-390`): zwei gestapelte Vollbreiten-Knöpfe, Standard-SaaS.
- **Intro** (`01-intro-1-390`): Headline, Absatz, Punkte, „Next" — jedes Onboarding sieht
  so aus; hier fehlt das Einzige, was Morse Lab hat: der Klang. (Geschmacksurteil: das
  Intro könnte den ersten Ton *sein*.)
- **Tastenfeld** (S7): 36 gleich große Kacheln füllen 60 % des Screens; das ist die
  Optik einer Tastatur-App, nicht eines Notizbuchs (1.1 §1 Litmus-Test).
- **Themes** (`30-training-night-390`): sechs Paletten, davon vier mit einem Akzent, der
  nicht Amber ist (Petrol, Moos, Grün, Blau; `styles.css:1817–1880`). 1.1 §4 sagt
  „Four tones, no more", §3 „knob in any color other than amber" ist ein Don't. Das ist
  per Ruling #111 so beschlossen, aber es verwässert, was Wiedererkennung ausmacht.

**Begründung.** Die Marke lebt von drei Dingen: Papier/Tinte/ein Amber, Serif-Buchstabe,
echter Code als Ornament. Settings, Progress, Account und Intro nutzen keines davon
außer den Farben.

### B3. Typografie, Weißraum, Rhythmus

**Befund.**
- Übungs-Buchstabe: Lernkarte 64 px **Light 300** (`styles.css:912–917`) — 1.1 §5
  konform; die Auflösung im Training 64 px **500** (`styles.css:311–317`) — §5 nennt für
  „Practice letter" 300. Zwei Gewichte für dasselbe Zeichen auf benachbarten Screens.
- Wortmarke 20 px (`styles.css:1120`), Frage 26/500, Eyebrow 12 px caps 0,18 em,
  Meta 13 px gray — konsistent mit CI §3.
- Abstände: Skala 4/8/…/64 weitgehend eingehalten (FINDINGS #3 behandelt die Reste).
  Settings bricht den Rhythmus (s. o.).
- Mobil 390 px: Weißraum stimmt (S1, S4). Desktop 1440: `.shell` 640 px zwischen
  240-px-Schiene und 240-px-Randspalte, dazwischen viel Luft — 1.1 §6 erlaubt 960 px
  für Dashboards; die Bühne wirkt verloren, das Gitter aber sitzt (S3). Geschmacksurteil:
  die Randspalte rechtsbündig in Serif ist die eine Stelle, an der der Desktop
  „Notizbuch" wird.
- Dunkel: `--amber-deep` ist auf dunklen Themes *heller* als `--amber`
  (`styles.css:1791`) — dokumentierte Umkehr von Addendum (b).

### B4. Amber-Budget

**Befund.**
- **Words, Ton läuft, Eingabe getippt (S6):** Play-Kreis Amber *und* „Check" Amber
  zugleich. Ursache: Tippen ist schon in `listening` erlaubt (`Words.tsx:88`), und
  `AnswerLine` zeigt den Check-Knopf bei `!empty && enabled` (`Words.tsx:273`), wobei
  `enabled = typingAllowed` auch `listening` einschließt. Der Kommentar dort behauptet
  das Gegenteil. `verify:amber` deckt den Zustand nicht ab (die Fälle „Eingabe offen"
  tippen nach dem Ton). → **FINDINGS #17**, als Bug gemeldet.
- **Learn-Hub, 1440 (S10):** sechs Amber-Links (das Ornament selbst ist Ink)
  und der gefüllte CTA in einem Viewport. CONCEPT-LEARN §5: „Kein Amber zweimal pro
  Viewport-Höhe anstreben". Links in `--amber-deep` sind dort ausdrücklich erlaubt;
  dennoch ist der Hub die amberreichste Seite des Produkts.
- **Settings:** gefüllter Primary „Play test tone" + Slider-Daumen Ink — in Ordnung;
  aber der Primary trägt eine Nebenhandlung (1.1 §7: „usually Start or Check").

**Optionen (Hub).** Links im Hub als Ink mit Unterstrich (nur im Hub, nicht in Artikeln);
oder CTA im Hub weglassen (die Kopfzeile hat „Open the app"). **Empfehlung:** CTA im
Hub behalten, Listen-Links Ink + Hairline-Unterstrich. Preis: S, Fable-Ruling (Design).

### B5. Was fehlt, damit Morse Lab wiedererkennbar ist

**Befund.** Die Markenzeichen tauchen selten auf: der Taster nur in Schiene (24 px),
About und Favicon; das Code-Ornament nur auf den Learn-Seiten; die Morse-Formen
(Punkt/Pille) nur in der Auflösung und auf der Lernkarte. Kein Screen der App ohne
Ton ist als „Morse Lab" erkennbar, wenn man die Wortmarke abdeckt (Settings, Progress,
Account, Intro, Summary).

**Vorschläge, alle innerhalb von 1.1 (keine Verläufe, Schatten, Konfetti, Emojis):**
1. **Das Ornament in die App holen:** die ML-Formen (−− ·−··) als Trenner zwischen
   Sektionen in Settings, Progress, About, Summary — echter Code, 1.1 §8-konform,
   schon im Learn-Generator vorhanden (`tools/learn/pages.mjs`, `ornament()`).
2. **Ein Buchstabe pro Screen in Newsreader Light 300**: Summary könnte das
   schwächste Zeichen des Tages groß zeigen („Still settling: R"), Progress das
   nächste anstehende. Das ist die Signatur der Lernkarte, wiederverwendet.
3. **Punkte-Sprache vereinheitlichen:** die fünf Fortschrittspunkte (6 px), die Menü-
   Punkte (Standort) und die Intro-Punkte sind drei verschiedene „Punkte". Eine
   Definition („der Punkt ist 1 u = 16 px, verkleinert 6 px, immer Ink/Edge").
4. **Zahlen als Fakten setzen:** Progress-Kennzahlen in Newsreader tabular, wie die
   Summary („2 of 20") — eine Stimme für Zahlen im ganzen Produkt.
5. **Themes auf Paper + Night reduzieren**, die vier Fremd-Akzente als späteres
   Opt-in („Workshop palettes") — *nicht empfohlen, sie zu behalten, weil* 1.1 §4/§3
   genau einen Akzent vorschreiben; braucht aber die Rücknahme von Ruling #111.

**Referenzen mit ruhiger, eigenständiger Sprache (Geschmacksurteil, aber mit benanntem
Prinzip):**
- **iA Writer** — ein Schriftbild, ein Akzent, kaum Chrome. Übertragbar: Settings und
  Progress als *Text* setzen (Sätze, Hairlines), nicht als Formular.
- **Things 3 (Cultured Code)** — Fortschritt als winzige geometrische Marke (Kreis, der
  sich füllt), nie als Balken oder Zahl. Übertragbar: der Play-Kreis ist schon diese
  Marke; die Summary könnte denselben Kreis als „Session done" zeigen statt einer
  Überschrift.
- **Lichess** — kein Gamification-Druck, Zahlen mit Fußnote, Puzzle-Streak optional.
  Übertragbar: Progress-Zeilen mit einem Satz Kontext („below 75 % — the set waits").
- **Braun / Dieter Rams** — „so wenig Design wie möglich", der eine orangefarbene Punkt.
  Übertragbar: Amber ausschließlich für den Knopf, den man drückt (Play, Check, Begin),
  nie für Text-Links in der App.
- **Teenage Engineering (OP-1-Webseiten)** — Ikonografie direkt aus dem Objekt
  abgeleitet. Übertragbar: alle Icons der App (Menü, Schließen, Löschen) aus derselben
  Strichstärke und Geometrie wie der Taster (4-px-Radien, 8-px-Balken skaliert).

**Preis.** 1, 3, 4: S–M, Fable-Ruling (Design). 2: M, Fable-Ruling. 5: S technisch,
Ruling-Rücknahme nötig.

---

## C. Logo

### C1. Was heute gebaut ist

| Datei | Inhalt | Verwendung |
|---|---|---|
| `public/logo-key.svg` | viewBox −12 −12 144 98; Basis 120 × 8, Hebel 92 × 8 um 13° gedreht, Knopf ⌀ 30 Amber, Lager ⌀ 7 Ink-Ring 3 px | Schiene 24 × 16 (`Menu.tsx:174`), About 90 × 61 (`About.tsx:27`) |
| `public/logo-lockup.svg` | Marke links, Wortmarke Newsreader 46/400 rechts, Abstand 30 | OG-Bild-Vorlage, sonst ungenutzt |
| `public/logo-mark-inverse.svg` | Balken Paper, Knopf Amber | ungenutzt in der App |
| `public/favicon.svg`, `public/icons/icon.svg` | 512 × 512, Papier, rx 116, Marke ×2,6453 | Favicon, Manifest |
| `public/icons/icon-192/512/maskable` | PNG-Ableitungen | Manifest |

Mobile Kopfzeile und Menü-Panel tragen **nur die Wortmarke**, keine Marke
(`Menu.tsx:104–140`). Der frühere Dit-dah-Notbehelf für kleine Größen ist entfernt
(`index.html:6–11`, Ruling #88), obwohl 1.1 §3 unter 24 px ausdrücklich eine
Fallback-Marke (Punkt + Pille) vorsieht. **Hier widersprechen sich Ruling #88 und
1.1 §3**; der Bericht löst das nicht, er meldet es.

### C2. Woran es nicht passt

**Befund (belegt).**
- **Lesbarkeit klein.** In der Schiene (24 × 16, S3) ist der Knopf ≈ 5 px, das Lager
  ≈ 1,2 px, der Hebel ≈ 1,3 px dick: ein amberfarbener Punkt auf einem Strich. Im
  Favicon bei 16 px (Marke ≈ 10 px breit) dasselbe, dazu rx 116 → 3,6 px Rundung, die
  im Tab nicht mehr liest. 1.1 §3 sagt selbst: Mindestgröße 24 px, darunter Fallback.
- **Proportion.** Marke 144 : 98 ≈ 1,47 breit; neben der Wortmarke (About,
  `25-about-390`) wirkt der Taster optisch schwerer als der Text, weil die Freifläche
  (12 Einheiten rundum) im SVG steckt und der Abstand dadurch ungleichmäßig wird (der
  Code-Kommentar in `About.tsx` benennt das).
- **Bezug zum Morse-Code.** Der Taster ist das *Sende*-Gerät; das Produkt ist ein
  *Hör*-Trainer. Der einzige Bezug zum Klang ist der Knopf als „Punkt". Die Form liest
  bei 13° Neigung mit Knopf links eher als Rampe oder Wippe; ohne Kontext erkennt man
  den Straight Key nur, wenn man einen kennt. (Geschmacksurteil, aber die Kleinformate
  belegen es.)
- **Verhältnis zur Wortmarke.** Das Lockup existiert als Datei, wird aber in keinem
  Screen der App verwendet; die App zeigt an drei Orten drei verschiedene Kombinationen
  (nur Wortmarke; Marke 24 px + Wortmarke; Marke 90 px + Wortmarke 32 px).

### C3. Drei Richtungen (Beschreibung, keine Umsetzung)

**R1 — Den Taster behalten, für Kleinformate ableiten.** Bei ≥ 48 px die heutige
Marke. Bei 24–47 px: Lager weglassen, Hebel und Basis auf 10 u verdicken (das verletzt
„do not thicken the bars", braucht also ein Ruling), Knopf auf ⌀ 36. Unter 24 px: die
Fallback-Marke aus 1.1 §3 (Punkt + Pille in Amber) — damit wäre Ruling #88 zurückzunehmen
oder zu präzisieren. Einschränkungen: Favicon 16 px bleibt zweiteilig (Punkt + Pille =
„A" — das ist echter Code, aber nicht „ML"); App-Icon ok; Dunkel: Balken Paper, Knopf
Amber (existiert).

**R2 — Der Knopf als Marke.** Reduktion auf das, was bei 16 px trägt: der amberfarbene
Knopf (⌀ 1 u) mit einem kurzen Ink-Hebelstück darunter (3 u × 1 u, Radius 0,5 u),
leicht geneigt — faktisch Punkt + Pille in der Geometrie des Tasters. Liest in 16 px,
in 24 px, als App-Icon; Dunkel/Hell ohne Varianten (Amber bleibt, Ink↔Paper). Bezug zum
Code: es *ist* ein Punkt und ein Strich, also „A" oder „N" je nach Reihenfolge — und das
muss die Marke benennen (1.1 §8: Code buchstabiert immer etwas). Einschränkung: der
Taster als Gegenstand geht verloren; die Marke wird abstrakter.

**R3 — Das ML-Ornament als Marke.** −− ·−·· („ML") in Ink, der letzte Punkt Amber
(„das Element, das gerade klingt", 1.1 §8). Es ist bereits das Ornament der Learn-Seiten
und der Guidelines-Fußzeile; als Wort-Bild-Marke neben „Morse Lab" stark und eindeutig
Morse. Einschränkungen: sechs Elemente lesen **nicht** bei 16 px (Favicon braucht
ohnehin R2 oder den Fallback); als App-Icon nur bei ≥ 96 px sinnvoll; Dunkel/Hell
trivial. Eignet sich für OG-Bild, Lockup, Print, Kopfzeile ab 900 px.

**Empfehlung.** R1 als konservativer Weg, wenn der Taster gesetzt bleibt (er ist in 1.1
beschlossen). Kombination R2 (klein) + R3 (groß) als eigenständigere Lösung, die den
Hör-Charakter trägt. In jedem Fall: **eine** Lockup-Regel für alle drei Orte in der App.

**Preis.** R1: M (Ableitungen, PNG-Export, Tests `tools/brand/`), Fable-Ruling. R2/R3:
L inklusive Guideline-Änderung, Fable-Ruling. Lockup-Regel allein: S, Fable-Ruling.

---

## D. Lernfortschritt sichtbar machen

### D1. Was der Nutzer heute erfährt — und wo

| Frage des Nutzers | Wo die App antwortet | Beleg |
|---|---|---|
| Wo stehe ich? | „6 of 36 active" (Progress, Randspalte, Settings); Tabelle Versuche/Quote/Median je Zeichen; „Today 86 % · 5 characters"; „Session 8" | `Progress.tsx:62`, `App.tsx:1278`, `statusLines.ts:29` |
| Was kommt als Nächstes? | Nur indirekt: Settings „Add O now" verrät das nächste Zeichen; der ReviewPicker zeigt alle 36 in Reihenfolge, Ungelerntes gegraut | `Settings.tsx:231`, `Learn.tsx:519–528`, `26-review-picker-390` |
| Warum kommt jetzt ein neues Zeichen? | Eine Zeile im Feedback: „The set grows: P joins from the next round." Kein Grund | `App.tsx:1429` |
| Warum kommt *keins*? | Nirgends. Die vier Bedingungen (85 % / 30, 5 Versuche, 75 % je Zeichen, 10er-Sperre) stehen nur im Code | `growth.ts:62–77` |
| Was ist mit dem Echo-Check? | Nirgends steht, dass er nicht zählt | `learn.ts:14` |
| Was heißt „Day 4 — freeze ready"? | Nirgends erklärt; „freeze" taucht ohne Einführung auf | `statusLines.ts:21–26` |
| Warum eine Speed round? | „R is still slow to land." — gut, aber ohne die Schwelle (2 s) | `App.tsx:1488–1492` |
| Wann wird es schneller? | Settings erklärt Farnsworth vorbildlich; *dass* das Tempo erst ab 36 Zeichen steigt, steht nirgends | `Settings.tsx:200`, `tempo.ts:72` |

**Begründung.** CLAUDE.md §2.6: jede Zahl ist eine Behauptung — „6 of 36" ohne „wie
weiter" ist eine halbe Behauptung. Gleichzeitig §2.4/§2.8: keine Zahl darf zum
Druckmittel werden. Die Lücke ist also nicht „mehr Zahlen", sondern **Erklärung in
Sätzen** an der Stelle, an der der Nutzer ohnehin liest (Progress, Summary).

### D2. Vorschläge, die §2 einhalten

1. **Progress: „Next up" und die Regel in Worten.** Oberhalb der Tabelle eine Zeile
   „Next up: O" (aus `nextCandidate`) und darunter ein Absatz im Ton von 1.1 §11:
   „The set grows when the last thirty answers are mostly right — about 85 percent —
   and every character has had a fair number of tries. No character is added while one
   is still below three in four." Kein Zähler, kein „4 more to go". Zahlen als
   Näherung benannt. **Preis S, Fable-Wortlaut.**
2. **Tabelle: „still settling" statt Prozent allein.** Zeilen unter 75 % oder unter 5
   Versuchen bekommen das vorhandene Kreuz-/Punkt-Zeichen (`Mark.tsx`) *und* ein Wort
   („settling"), nie Farbe allein (§6). Die Zahl bleibt. **Preis S, Fable-Ruling.**
3. **Summary: ein Satz Richtung.** Nach „Correct 14 of 20": „R is the one still
   settling." oder „The set is ready to grow — next up: O." Beides aus vorhandenen
   Funktionen (`isReadyToGrow`, `recordFor`). **Preis S, Fable-Wortlaut.**
4. **Echo-Check offenlegen.** Auf der ersten Echo-Karte eine Zeile: „These first checks
   don't count — they're for hearing, not scoring." **Preis S, Fable-Wortlaut.**
5. **Freeze einmal erklären.** Beim ersten „freeze ready" auf der Summary eine Zeile:
   „A freeze covers one missed day. It's ready after seven days in a row." Danach nie
   wieder (Flag additiv, wie `variabilityNoticeSeen`). **Preis S, Fable-Wortlaut.**
6. **ReviewPicker als Landkarte benennen.** Er zeigt heute schon den Weg (Reihenfolge,
   gegraut = kommt noch). Untertitel „in the order they'll arrive" oder Verlinkung von
   Progress („see the order"). **Preis S, Fable-Wortlaut.**
7. **Speed-round-Einladung mit Maß:** „R still takes about two seconds to land." — die
   Schwelle als Näherung benannt. **Preis S, Fable-Wortlaut.**
8. **Tempo-Hinweis in Settings:** ein Halbsatz „…and it starts rising once all 36
   characters are in." **Preis S, Fable-Wortlaut.**

**Nicht empfohlen, weil §2 entgegensteht:**
- Ein Fortschrittsbalken oder Prozentwert „bis zum nächsten Zeichen" — macht die
  Schwelle zum Ziel, nicht das Können (§2.4; 1.1 §7 „never a percentage badge").
- Ein Live-Zähler „26 of 30 correct" während der Sitzung — Druck pro Antwort (§2.8),
  und er lädt zum Taktieren ein.
- Punkte/dah-Elemente während des Tons einblenden, um „Fortschritt im Zeichen" zu
  zeigen — §2.2 und Addendum (a).
- Streak-Kalender mit Lücken oder „verloren"-Markierung — §2.8, CI §7 „Streak-Druck".
- Level-Namen („Novice → Operator") — Badge ohne Kompetenzbezug (CI §7).

---

## E. Funktionen

### E1. Was den Kernloop trägt

**Tragend:** Practice (der Loop selbst), Lernkarte + Echo-Check (Einstieg in den Loop),
Speed round (derselbe Loop, gezielter Pool), Words & groups (der Loop über Folgen —
hören → tippen → Feedback bleibt). Alle vier: nichts spielt von selbst, nichts zeigt
während des Tons (`App.tsx:11–24`).

**Abseits des Loops:**
- **Send.** Eine andere Fertigkeit (motorisch), eigene Statistik, bewusst getrennt
  (`stats.ts:98`). Gut gebaut, aber im Menü gleichrangig mit dem Kernloop. Für V1
  ein Nebenweg, der die Hälfte der Komplexität in `App.tsx` (Zeilen 478–647) trägt.
- **Themes ×6.** Komfort, kein Lernen; Markenfrage (B2).
- **Account/Passkey.** Architekturfähig, V1-Pflicht „ohne Konto" erfüllt (§2.5). Aber
  ein eigener Menüpunkt mit einem gefüllten Amber-Primary „Create a passkey"
  (`24-account-390`) bewirbt etwas, das für das Lernen nichts tut.

### E2. Features, die eine Zahl heben, ohne das Können zu heben (§2.4)

- **„Add O now" (Settings).** Hebt „N of 36 active" ohne Prüfung (`growth.ts:121`).
  Owner-Wunsch aus P5 — hier nur als Spannung benannt: die Zahl „9 of 36" bedeutet
  danach nicht mehr dasselbe wie bei jemandem, der sie erübt hat (§2.6). Option: die
  Funktion behalten, aber die Zahl ehrlich halten („9 of 36 active · 1 added early").
  **Preis S, Fable-Ruling.**
- **„Sessions 8" (Progress).** Zählt *begonnene* Sitzungen (`stats.ts` `beginSession`);
  ein Reload nach dem Intro zählt mit. Eine Zahl, die steigt, ohne dass etwas gekonnt
  wurde. Option: streichen oder „sessions finished". **Preis S, Fable-Ruling.**
- **„0 heard today" / „0 sent today" (Words/Send-Kopfzeile).** Zählt Aufgaben, nicht
  Richtigkeit. Harmlos, aber ebenfalls eine Zahl ohne Können. Option: nur ab 1 zeigen.
  **Preis S, Fable-Ruling.**
- **Median 0,1 s (Summary im Testlauf).** Belegt, dass der Wert ohne Kontext täuscht;
  die Fußnote steht da, aber *unter* der Zahl in kleinerer Schrift. Fein so, nur als
  Hinweis, dass die Näherung sichtbar bleiben muss.

### E3. Was für ein rundes V1 fehlt

1. **Erklärte Progression** (D2 1–3) — die größte Lücke.
2. **Verwechslungsbild.** Die Engine kennt `answer` und `char` je Versuch
   (`session.ts:56`), zeigt aber nirgends, *was mit was* verwechselt wird. Ein Satz in
   der Summary („M and O still trade places") ist Kompetenz-Information, keine
   Punktzahl. Speichert heute niemand (`CharacterRecord` hat kein Verwechslungsfeld) —
   additiv möglich. **Preis M, Fable-Ruling (Produktregel).**
3. **Sitzung verlassen/pausieren** (A3) — mobil heute unmöglich.
4. **Opt-in „Visual practice"** für Nicht-Hörende — per Addendum (a) *später*; aber ein
   Hinweis, *dass* die App auditiv ist und *was* kommt, fehlt (F3).
5. **Ein-Optionen-Echo-Check** (A1) — fühlt sich an wie ein Fehler, obwohl begründet.
6. **Learn-Seiten ↔ App:** Der Pillar-Artikel erklärt die 85-%-Regel; die App nutzt sie
   (`growth.ts:29–34`), sagt es aber nicht. Ein Link aus dem Progress-Absatz (D2 1) auf
   `/learn/beyond-the-koch-method/` schließt den Kreis. **Preis S, Owner-Delegation.**

---

## F. Barrierefreiheit im Design (CLAUDE.md §6)

### F1. Was belegt in Ordnung ist

- **Kontrast:** `tools/theme/contrast.mjs` — 24 Werte über Grenze (ink/paper 14,9:1,
  gray/paper 5,14:1, paper/amber 4,52:1, amber-deep/paper 6,3:1). Gray wird nur für
  ≥ 11 px benutzt (`styles.css` Eyebrow 12, Labels 11, Fußnoten 13).
- **Nie Farbe allein:** Haken/Kreuz (`Mark.tsx`) + Satz im Urteil; im Gitter Marke +
  versteckter Text „this was the character" (`App.tsx:1746–1807`, S2).
- **Fokus:** 2 px `amber-deep`, Offset 2 (`styles.css:130`); nach Tab liegt er auf Play
  (`38-focus-ring-390`); bei jedem Phasenwechsel wandert er gezielt
  (`App.tsx:289–316`); Menü: erster Eintrag fokussiert, Esc schließt, Rückkehr zum
  Trigger (`Menu.tsx`, `App.tsx:1002`). Überschriften mit `tabIndex -1` als Ziel.
- **Live-Regionen:** Frage `role="status"`, Lern-Eyebrow `aria-live="polite"`,
  Fortschrittslinie als `progressbar` mit Werten (`SessionHeader.tsx`).
- **Reduced motion:** globaler Block (`styles.css:1743`), gemessen: Intro-Animation
  1e-5 s. Die Amber-Füllung des Play-Kreises bleibt als Zustand erhalten (1.1 §9).
- **Selbstgesteuert:** nichts spielt ohne Geste außer der Lernkarte (dokumentierte
  Ausnahme, Play-Kreis bleibt daneben, `App.tsx:16–21`). Wiederholung jederzeit
  (Addendum c).
- **Touch:** 44-px-Minimum als Token (`--tap`), Antworttasten 64 px, Tastenfeld 46 px
  (FINDINGS #9).

### F2. Abweichungen und Lücken

1. **Fokusfarbe.** 1.1 §7/§12: „focus = 2 px **ink** outline". Gebaut ist `amber-deep`
   — damit ist der Fokusring ein zweites Amber neben dem Primary (z. B. Learn-Hub, Tab
   auf einen Link neben dem CTA). Kontrast ist ausreichend; es ist ein Guidelines-,
   kein WCAG-Befund. **Option:** Ink. **Preis S, Fable-Ruling.**
2. **Kein Hinweis für Nicht-Hörende.** CLAUDE.md §6: „Wer nicht hören kann, muss klar
   erfahren, dass ein Modus auditiv ist — und warum." Das Intro sagt „Learn Morse by
   ear" (`Intro.tsx:30`), der versteckte Absatz sagt „An audio drill" (`App.tsx:1293`)
   — beides implizit, nichts erklärt, dass es (noch) keine visuelle Variante gibt und
   warum (§2.2). **Option:** ein Satz im Intro-Screen 1 und in About: „Morse Lab is
   sound only for now. A visual practice mode is planned; until then the app needs
   hearing." **Preis S, Fable-Wortlaut.**
3. **Mobil keine Navigation während der Sitzung** (A3) — betrifft Tastatur- und
   Screenreader-Nutzer genauso; mit der Tastatur gibt es keinen Weg zum Menü.
4. **Kein Skip-Link.** Ab 900 px steht die Schiene (11 Fokusstopps) vor `main`; die
   h1 ist versteckt. Ein „Skip to practice"-Link (visually-hidden bis Fokus) fehlt.
   **Preis S, Owner-Delegation.**
5. **Gegrautes Gitter per Opazität** (A2): disabled-Tasten mit 45 % Opazität erzeugen
   Buchstaben in ≈ 2,5:1 — zulässig, weil inaktiv (WCAG 1.4.3 Ausnahme), aber visuell
   unruhig; 1.1 §7 verbietet es ohnehin.
6. **Lange Tabellen.** Progress bei 36 Zeichen: die beiden Fußnoten zur Näherung stehen
   erst nach 36 Zeilen (`Progress.tsx:102,112`). Wer die Tabelle oben liest, liest die
   Zahl ohne den Vorbehalt (§2.6). **Option:** Fußnoten *über* die Tabelle als ein Satz.
   **Preis S, Fable-Wortlaut.**
7. **Echo-Check-Antwort „K" allein** (S5): für Screenreader ein Button ohne Alternative
   — technisch bedienbar, inhaltlich eine Scheinwahl (A1).

---

## G. Priorisierte Liste — Top 10 nach Wirkung pro Preis

| # | Vorschlag | Teil | Preis | Entscheidung |
|---|---|---|---|---|
| 1 | Words: zweites Amber beim Tippen während des Tons beseitigen (Check erst ab `answering` zeigen) | B4, FINDINGS #17 | S | Owner-Delegation (Regel 1.1 §4 ist eindeutig) |
| 2 | Mobil: Kopfzeile/Hamburger während der Sitzung erreichbar halten, Layoutsprung beim ersten Play entfernen | A3, F2.3 | S | Fable-Ruling (Mockup) |
| 3 | Progress: „Next up: O" + die Wachstumsregel in zwei Sätzen, Näherung benannt | D2.1 | S | Fable-Wortlaut |
| 4 | Hz im Eyebrow nur ab Variabilitäts-Stufe 1 | A2.3 | S | Fable-Ruling |
| 5 | Summary: ein Satz Richtung („R is still settling" / „ready to grow") | D2.3 | S | Fable-Wortlaut |
| 6 | Menü: „Learn the sounds" / „Learn" eindeutig benennen, externen Link kennzeichnen | A4.1 | S | Fable-Wortlaut |
| 7 | Hinweis „sound only for now" im Intro und in About | F2.2 | S | Fable-Wortlaut |
| 8 | Echo-Check erst ab zwei Optionen (Karte 1 ohne Check) | A1.2 | S | Fable-Ruling (Produktregel) |
| 9 | Logo: Kleinformat-Regel klären (1.1 §3 Fallback vs. Ruling #88), eine Lockup-Regel für alle drei Orte | C2, C3 | M | Fable-Ruling |
| 10 | Antwortgitter im Ready-Zustand nicht als Opazitäts-Ghost (Umriss edge-soft, Buchstabe gray) oder ausblenden | A2.1/2, F2.5 | S–M | Fable-Ruling (Mockup) |

**Stand 06.10.2026:** #1 umgesetzt (P24), #2–#10 vom Owner an Claude delegiert und
umgesetzt (P25), die Folgeliste ebenfalls delegiert und umgesetzt (P27, P28) —
Logo-Richtung nur als R2 (Favicon), R3 nicht als Marke (Begründung in `HANDOVER.md`).
Weitere Vorschläge außerhalb von §G (D2.2/4/6/7/8, E2, E3.6, B3, B5.3/4, B4-Hub) ebenfalls
delegiert und umgesetzt (P31–P34).

Danach, in dieser Reihenfolge: Freeze einmal erklären (D2.5), Fußnoten über die
Progress-Tabelle (F2.6), Fokusring Ink (F2.1), Skip-Link (F2.4), „Sessions"-Zähler
streichen oder umdeuten (E2), Verwechslungsbild (E3.2), ML-Ornament in die App (B5.1),
Themes auf Paper/Night (B5.5, Ruling-Rücknahme), Settings als Text statt Formular (B2),
Logo-Richtung R2/R3 (C3, L).

---

## H. Prüfprotokoll

- `npm install`, `npm run build`: grün (inkl. `verify:colors`, `verify:fonts`,
  `verify:learn`).
- `node tools/theme/contrast.mjs`: 24/24 über Grenze.
- Vorschau: `vite preview --port 4199`, PID notiert und am Ende beendet.
- Playwright-Skript im Scratchpad (`tour.mjs`, `menu.mjs`); kein Datei-Eingriff im
  Repo außer diesem Bericht und `FINDINGS.md` #17.
- Nicht geprüft: Firefox/Safari, echte Geräte, Screenreader-Ausgabe (nur DOM/ARIA
  gelesen), Lighthouse.
