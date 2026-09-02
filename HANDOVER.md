# Übergabe — Stand nach Runde U1 (das feste Tastenfeld)

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** **Runde U1 liegt auf dem Branch
`claude/morse-handover-alignment-nbkk6o`** und wartet auf das Review von
Fable. Sie baut auf `main` nach Runde L1 auf. Sie ist der UI-Fix aus Eriks
Eigen-Test (Sitzung 36, 15 aktive Zeichen) nach **Ruling Fable,
Notion-Log #75**: das Dreier-Antwortgitter skaliert nicht.

An **Engine, Audio, Backend, Sync, Konto und dem Learn-Bereich ist nichts
angefasst** — das ist reine UI-Schicht. Berührt sind zwei Dateien, dazu eine
neue und ihr Test:

| Datei | Warum |
|---|---|
| **`src/ui/keypad.ts`** | **neu:** die Schwelle und die 36 Positionen als benannte Konstanten |
| **`src/ui/keypad.test.ts`** | **neu:** sieben Fälle darauf, inklusive Gegenprobe gegen `CHARACTER_ORDER` |
| `src/ui/App.tsx` | `Answers` rendert ab der Schwelle das Tastenfeld statt des Gitters |
| `src/styles.css` | `.keypad` — Raster, Tastenmaß, der Dimm-Zustand |

Dazu zwei Screenshots (`docs/screenshots/keypad-15-chars-390.png`,
`keypad-36-chars-390.png`), ein FINDINGS-Eintrag und diese Übergabe.

> ### Ein Nebenbefund, der zum Ruling gehört — Entscheidung liegt bei Fable
>
> Punkt 3 des Rulings lässt die **Echo-Checks des Lernmodus** bei ihrem
> kleinen Gitter, „dort sind es bewusst wenige Optionen". Gemessen sind es
> das nur am Anfang: `answerPool` (engine/learn.ts) bietet **alles bisher
> Eingeführte** an. Bei 15 eingeführten Zeichen stehen dort 15 Optionen im
> Dreier-Gitter, bei 36 sind es 36 und die Seite wird **1311 px** hoch
> (Viewport 844). Dieselbe Zahl trifft „Learn the sounds"
> (`ReviewPicker`): 36 Tasten, **1223 px**.
>
> Beides ist **nicht** mitgeändert — das Ruling nennt die Echo-Checks
> ausdrücklich als unverändert, und der Rest wäre Arbeit an einer Fläche, die
> die Aufgabe nicht nennt (CLAUDE.md 5). Es steht als
> [FINDINGS #6](./FINDINGS.md) mit Maßen da. Wäre die Antwort „auch dort das
> Tastenfeld", ist es je eine Zeile: beide Flächen rendern schon dieselbe
> `.answer`-Taste.

**Was die Runde liefert:** ab **13 aktiven Zeichen** ist die Antwortfläche ein
festes Tastenfeld — sechs Spalten, A–Z alphabetisch, darunter 0–9, **alle 36
Positionen immer sichtbar und ortsfest**. Was gerade nicht abgefragt wird,
steht gedimmt und nicht bedienbar an seinem Platz. Bis einschließlich zwölf
Zeichen bleibt alles, wie es war. Zurück geht es nicht: die Entscheidung hängt
an der Zahl der aktiven Zeichen, und die nimmt nie ab — auch eine Speed round
mit drei Zeichen bleibt im Tastenfeld (§3j).

**Runde davor (L1) — auf `main`.** Der Learn-Bereich: sieben redaktionelle
Seiten auf Englisch unter `/learn/` und dieselben sieben auf Deutsch unter
`/de/lernen/` — statisch generiert, mit vollständigem Head (canonical, hreflang
wechselseitig, OG, JSON-LD Article), `sitemap.xml`, eigenem Stylesheet aus
denselben Tokens und einem Weg zurück in die App auf jeder Seite. Die zwei
Konflikte im Inhalt liegen unverändert bei Fable:

> ### Zwei Konflikte im Inhalt der Learn-Texte (aus L1) — Entscheidung liegt bei Fable
>
> Beide sind gefunden, gemessen und **nicht** still aufgelöst: die Texte werden
> laut Aufgabe nicht umgeschrieben, und beides wäre Umschreiben.
>
> 1. **Fünf `metaTitle` liegen über den 60 Zeichen aus CONCEPT-LEARN §4.**
>    `beyond-the-koch-method.en` 69, `morsealphabet.de` 64,
>    `geschichte-des-morsecodes.de` 62, `how-to-learn-morse-code.en` 62,
>    `morse-code-in-amateur-radio.en` 62. Google schneidet in der Trefferliste
>    bei etwa 600 px ab — betroffen ist jeweils das Ende, also der Zusatz
>    „| Morse Lab". Der Titel *wirkt* dadurch nicht falsch, er ist nur kürzer
>    als gedacht. Dazu drei `metaDescription` über 160 Zeichen (163, 167, 161).
>    `npm run verify:learn` listet alle acht als „Bericht", nicht als Fehler.
> 2. **Der Pillar verlinkt nicht auf alle anderen** (§2 fordert das). In beiden
>    Sprachen fehlen dieselben zwei: Geschichte und Amateurfunk. Verlinkt sind
>    Alphabet, Koch und Lernforschung. Die Gegenrichtung stimmt vollständig —
>    jede der sechs Seiten zeigt zurück auf den Pillar und in die App, und der
>    Hub listet alle sechs. Der Graph ist also zusammenhängend; es fehlen zwei
>    Kanten, keine Seite.
>
> Beides ist ein Satz Arbeit, sobald Fable die Formulierung liefert. Bis dahin
> ist es dokumentiert und nicht angerührt.

**Runde davor (F1) — gemergt.** Review 11 (Fable) ist bestanden, das
Ruling Notion-Log #69 umgesetzt; `main` trägt Streak, Settings und die Speed
round, und der Deploy daraus bringt sie live. Sie baut auf `main` nach Runde B
auf; an Backend, Sync und Konto ist **nichts** angefasst worden. Die Commits
der Runde:

1. `f4cf2ae` — **Streak mit Freeze-Gnade in der Engine** (Notion-Log #29)
2. `65c6584` — **Die eine leise Zeile** auf Start- und Abschluss-Screen
3. `9e19530` — **Settings: Tonhöhe und Lautstärke**, gerätespezifisch (Log #66)
4. `bfe1ef9` — **ICR-Drills: die Speed round** (Log #66)
5. `8615559` — **Fix aus dem Browser-Durchlauf**: die Ergebniszeile des Drills
   verschwand genau dann, wenn er geholfen hatte (§4)
6. `e49ef35` — Übergabe und Screenshots
7. `bb1e335` — Übergabe: **der Sync ist mit den neuen Feldern durchgespielt**,
   zwei Geräte gegen lokale D1 (§4)
8. **Ruling #69 umgesetzt** — `DRILL_MIN_POOL = 3`, Einladung ab einem
   langsamen Zeichen, Avoid-Repeat unverändert
9. (dieser Commit) — Übergabe: Ruling und die erledigte Infrastruktur

**Kontext der Runde F1:** drei Features nach Notion-Log #29 und #66. Alles
davon ist local-first und ohne Konto vollständig: der Streak liegt im
Lernstand, die Einstellungen liegen bewusst **daneben** und gehen nie zum
Konto, der Drill ist reine Engine-Logik.

> ### Die zwei Produktfragen der Runde — entschieden (Ruling Notion-Log #69)
>
> Beide Fragen sind beantwortet und umgesetzt; die Beschreibung bleibt stehen,
> weil sie erklärt, *warum* die Konstanten so stehen:
>
> 1. **Bei genau zwei langsamen Zeichen wechselte der Drill streng ab.** Die
>    normale Übungsregel „nie zweimal dasselbe Zeichen hintereinander"
>    (`selection.ts`) liess bei einem Zwei-Zeichen-Satz keine Wahl: es kam
>    R U R U R U … Im Durchlauf gemessen — die zehn Runden waren `RURURURURU`.
>    Wer das merkt, muss nicht mehr hinhören, und **genau das verbietet
>    CLAUDE.md 2.2.** **Entschieden:** `DRILL_MIN_POOL = 3` — der Pool wird
>    immer auf drei Zeichen aufgefüllt, langsame zuerst, dann die schnellsten
>    sicheren als Kontrast. Avoid-Repeat bleibt und hat mit drei Zeichen wieder
>    eine echte Wahl.
> 2. **Der Kontrast-Zweig war über die UI nicht erreichbar.** Die Einladung
>    erschien ab **zwei** langsamen Zeichen, der Kontrast griff bei **genau
>    einem** — dieser Fall konnte nie geklickt werden. **Entschieden:**
>    `DRILL_INVITATION_MIN_SLOW = 1`. Schon ein langsames Zeichen lädt ein; dass
>    daraus kein Ein-Zeichen-Drill wird, regelt `DRILL_MIN_POOL`.
>
> Mitgezogen, weil es sonst gebrochen wäre: der Einladungssatz stand nur im
> Plural. Ab einem Zeichen heisst es jetzt „R is still slow to land."
>
> Dazu eine Kleinigkeit aus der Aufgabenstellung: **das Amber-Budget-Skript
> existiert im Repo nicht.** Browser-Durchläufe sind hier ad hoc und werden
> nach jeder Runde weggeräumt (§5d) — der Zähler dieser Runde ist deshalb neu
> geschrieben und steht in §4 als Regel beschrieben. Wenn er bleiben soll, ist
> „ein committetes Prüfskript" eine eigene, kleine Aufgabe.

> ### Die Blockaden sind abgearbeitet — die Infrastruktur steht
>
> Runde B endete mit drei Blockaden, die kein Code lösen konnte. Alle drei
> sind geschlossen:
>
> 1. ~~**Die Bildmarke aus den Owner-Dateien**~~ **Geschlossen** (Log #61).
>    Fable hat die Owner-Renderings pixelgenau vermessen: Knopf/Basis 0,249
>    bei Soll 0,250, Balkenhöhe/Basis 0,0668 bei Soll 0,0667. Die
>    Owner-Dateien und die im Repo aus 1.1 §3 konstruierte Bildmarke sind
>    **geometrisch identisch** — ein Dateitransfer entfällt, es war nie eine
>    Abweichung, nur zwei Wege zur selben Geometrie. → §3f
> 2. ~~**D1 auf Produktion.**~~ **Erledigt.** Die Datenbank `morse-lab` (WEUR)
>    existiert im Account des Owners, Migration `0001` ist samt Journal
>    angewandt (Fable über den Cloudflare-Connector, Log #60), und
>    `wrangler.toml` trägt die echte `database_id`. → §5e
> 3. ~~**DNS und WAF.**~~ **Erledigt** (Fable per Chrome, heute):
>    `morse-lab.com` ist live (CNAME `@` → `projekt-morse.pages.dev`), und die
>    Rate-Limit-Regel `auth-rate-limit` läuft mit **4 Anfragen / 10 s / IP** auf
>    `/api/auth/`. → §5a, §5h
>
> **Damit ist nichts mehr außerhalb des Repos offen.** Was bleibt, ist der
> fachliche Nachweis auf Produktion (§5e) und die Routine-Gegenprobe des
> Cache-Wechsels nach dem nächsten Deploy (§5b) — beides steht in §7.
>
> Nichts davon ist geraten oder ersatzweise gebaut.

**Produktions-URL: https://projekt-morse.pages.dev** — live auf Cloudflare
Pages mit Git-Anbindung. Jeder Push auf `main` baut und deployt von selbst.
**`/api/*` sollte dort mit dem ersten Deploy nach diesem Commit tragen** — die
D1-Bindung kommt aus `wrangler.toml` (§5e). **Nachgewiesen ist das von hier aus
nicht:** der Egress-Proxy dieser Umgebung sperrt Cloudflare weiterhin, die
Verifikation übernimmt Fable von außen (Erwartung: `/api/progress` ohne Sitzung
antwortet **401** statt **500** — 500 hieße, die Bindung greift noch nicht).
Griffe sie nicht, liefe die App weiterhin vollständig, nur ohne Konten, und der
Account-Screen sagte ruhig, dass kein Server erreichbar ist.

**`morse-lab.com` ist an das Projekt gebunden, aber noch nicht erreichbar** —
es fehlt der eine DNS-Eintrag aus §5a. **Zwei Dinge hängen daran:** Passkeys
hängen an der Domain, unter der sie angelegt wurden (§3e), und die
Rate-Limit-Regel lässt sich nach meinem Verständnis nur auf einer eigenen Zone
anlegen, nicht auf `*.pages.dev` (§5h).

**Datum:** 2026-09-01 (Runde F1; die Angaben zu Backend, Domain und Deploy
stammen unverändert aus der Runde davor und sind hier nicht neu geprüft worden)

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md). Nebenbefunde in
[FINDINGS.md](./FINDINGS.md) — alle drei Einträge sind entschieden und behoben.

---

## 1. Wo das Projekt steht

Der Kern-Lernloop (hören → tippen → Feedback, adaptiv nach Schwäche) läuft,
ist live und sieht aus wie das Mockup. Unverändert gilt: der Zeichensatz wächst
von selbst, die App ist eine offline nutzbare PWA ohne jeden Fremdabruf,
`--gray` besteht AA auch für kleinen Text.

**Neu aus dieser Runde (U1): die Antwortfläche skaliert.**

- **Ab 13 aktiven Zeichen ein festes Tastenfeld** statt des gewachsenen
  Dreier-Gitters: sechs Spalten, A–Z alphabetisch, darunter 0–9. Die Schwelle
  steht als `KEYPAD_MIN_CHARACTERS` in `src/ui/keypad.ts`, nicht als Zahl
  irgendwo im Markup.
- **Alle 36 Positionen sind immer da und immer an derselben Stelle.** Was nicht
  abgefragt wird, ist gedimmt (`--gray`, 40 %) und nicht bedienbar — noch nicht
  eingeführte Zeichen wie auch die, die eine Speed round diesmal auslässt. Das
  ist der Zweck, nicht ein Nebeneffekt: Ortsfestigkeit baut Motorik auf und
  hält die Latenz-Messung sauber (§3j).
- **Einmal gewechselt, bleibt gewechselt.** Die Entscheidung hängt an der Zahl
  der *aktiven* Zeichen, nicht am Satz der laufenden Abfrage — die nimmt nie
  ab, also gibt es kein Zurückspringen. Ohne neues Feld im Lernstand.
- **Tastenmaß 50 × 52 px** bei 390 px Breite (Minimum `--tap`, also 44),
  Newsreader 20 px/500 statt 26 — eine Stufe kleiner, gleiche Rand-Optik.
  Feedback (✓/✗, nie Farbe allein) und die Tastatur-Eingabe am Desktop sind
  unverändert.
- **Der Lernmodus ist nicht angefasst:** die Echo-Checks behalten ihr kleines
  Gitter (Ruling Punkt 3) — mit dem gemessenen Nebenbefund im Kopf dieser
  Übergabe.

Screenshots:
[`docs/screenshots/keypad-15-chars-390.png`](./docs/screenshots/keypad-15-chars-390.png)
(15 aktive Zeichen — Eriks Fall),
[`keypad-36-chars-390.png`](./docs/screenshots/keypad-36-chars-390.png)
(alle 36).

**Aus Runde L1 gilt weiter: der Learn-Bereich.**

- **14 statische Seiten**, sieben je Sprache: Hub, Anleitung (Pillar), Alphabet,
  Geschichte, Amateurfunk, Koch-Methode, Lernforschung. URLs flach und
  wechselseitig gepaart — `/learn/…/` und `/de/lernen/…/` (CONCEPT-LEARN §2).
- **Fertiges HTML für Suchmaschinen**, nicht in der SPA gerendert: ein
  Node-Skript (`tools/learn/build.mjs`) rendert die Markdown-Dateien beim Bauen.
  Head vollständig — `canonical` auf sich, `hreflang` en/de/x-default in beide
  Richtungen, Open Graph mit dem Marken-Lockup als PNG, JSON-LD `Article`,
  genau eine `<h1>`. Dazu `sitemap.xml` mit der Wurzel und allen 14 Adressen.
- **„Ruhe editorial" aus denselben Tokens.** 680-px-Lesespalte, Newsreader für
  Überschriften, IBM Plex Sans 17 px bei 1,65 für den Fließtext,
  Hairline-Tabellen, ein gefüllter Amber-Knopf pro Seite (der CTA) und **genau
  ein** Trennornament: `−− ·−··` — echter Code, „ML" (1.1 §8). Der Farbblock
  ist nicht verdoppelt, sondern wird beim Bauen aus `src/styles.css`
  eingesetzt (§3i).
- **Der Service Worker fasst die Seiten nicht vorab an** — und, wichtiger, er
  legt sie nicht mehr als App-Shell ab. Das war eine echte Falle, siehe §3i.
- **Ein leiser Weg hinein:** der About-Screen trägt unten
  „Learn more about Morse" → `/learn/`. Kein Amber, kein Knopf.

Screenshots:
[`docs/screenshots/learn-hub-390.png`](./docs/screenshots/learn-hub-390.png),
[`learn-hub-1280.png`](./docs/screenshots/learn-hub-1280.png),
[`learn-pillar-390.png`](./docs/screenshots/learn-pillar-390.png),
[`learn-pillar-1280.png`](./docs/screenshots/learn-pillar-1280.png),
dazu die Alphabet-Seite (die Tabellen) und der deutsche Hub in beiden Breiten.

**Aus Runde F1 gilt weiter: drei Features, alle drei leise.**

- **Streak mit Freeze-Gnade.** Ein Tag zählt als geübt, sobald an ihm eine
  Sitzung beendet wurde. Ein einzelner verpasster Tag verbraucht den Freeze
  (Vorrat höchstens einer, fällt nach sieben geübten Tagen in Folge wieder an);
  zwei oder mehr beenden den Streak. Angezeigt wird **eine** graue Zeile auf
  Start- und Abschluss-Screen — „Day 6 — freeze ready.", „Day 7 — freeze used
  yesterday.", neutral „Starting fresh." Kein Konfetti, keine Animation, kein
  Schuldton.
- **Settings (Ruhe-Stil).** Tonhöhe (500–800 Hz, Default 620) und Lautstärke,
  dazu ein Probeton auf Geste — **kein Autoplay**. Beides liegt unter einem
  eigenen localStorage-Schlüssel und geht **nie zum Konto**: Lautstärke ist
  eine Eigenschaft des Geräts, nicht der Person. Die Tonhöhe trägt
  Variabilitäts-Stufe 0; ab Stufe 1 haben die HVPT-Bänder Vorrang, und die UI
  sagt das in einer Zeile.
- **ICR-Drills („Speed round").** Ein Zeichen gilt als langsam bei mindestens
  fünf Reaktions-Samples **und** Trefferquote ab 80 % **und** Median über
  2,0 s. Ab zwei solchen Zeichen lädt der Start-Screen leise ein; der Drill
  sind zehn Abfragen nur aus diesen Zeichen. **Seine Antworten verändern die
  Statistik pro Zeichen, aber nicht das Wachstumsfenster** (§3h).

Screenshots:
[`docs/screenshots/settings-390.png`](./docs/screenshots/settings-390.png),
[`docs/screenshots/speed-round-invite-390.png`](./docs/screenshots/speed-round-invite-390.png).

**Aus Runde B gilt weiter: die App kann ein Konto haben — und braucht keins.**

- **Passkeys statt Passwörtern.** Einen Passkey anzulegen *ist* das Anlegen des
  Kontos. Keine E-Mail, kein Passwort, kein Name. Anmelden geht ohne Kennung
  (discoverable credential): der Browser fragt selbst, welcher Passkey.
- **Cloudflare-nativ, kein neuer Vendor.** Pages Functions in `functions/`,
  Daten in D1, Migrations versioniert in `migrations/`.
- **Sync mit einer getesteten Merge-Regel.** Lokal bleibt die Quelle; das Konto
  ist das Ziel. Push nach jedem Sitzungsende, Pull und Merge beim Login. Die
  Regel ist reine Engine-Logik (`src/engine/sync.ts`), ohne Netz testbar.
- **Der Account-Screen im Ruhe-Ton**, mit Abmelden und — DSGVO —
  „Delete account and data". Screenshots:
  [`docs/screenshots/account-signed-out-390.png`](./docs/screenshots/account-signed-out-390.png),
  [`docs/screenshots/account-signed-in-390.png`](./docs/screenshots/account-signed-in-390.png).
- **Das Menü hat jetzt sechs Einträge** (Practice · Learn the sounds ·
  Progress · Account · **Settings** · About). In Runde A war die Account-Zeile
  bewusst weggelassen, weil es kein Backend gab (1.1 §7); Settings steht
  dahinter, weil es dem Gerät gehört und nicht dem Üben.

Aus Runde A gilt weiter: das Gehäuse (Kopfzeile, Vollbild-Menü,
Progress-Screen, About-Screen). Aus den Runden davor: Klang-Variabilität in
Stufen, der Lernmodus mit Karte und Echo-Check, Marke und Tokens nach 1.1.

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1 | unverändert |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL | unverändert |
| `src/engine/schedule.ts` | Text → Zeitachse | unverändert |
| `src/engine/settings.ts` | Tempo, Start-Satz, Kandidatenreihe, **Spannen für Ton und Lautstärke** | erweitert |
| `src/engine/stats.ts` | Statistik, Tag/Sitzung/Intro, **Streak-Feld, `RecordOptions`** | erweitert |
| `src/engine/growth.ts` | Die Wachstumsregel | unverändert |
| `src/engine/learn.ts` | Der Lernmodus: Karte, Echo-Check | unverändert |
| `src/engine/variability.ts` | Klang-Variabilität in Stufen (HVPT), **Heimton auf Stufe 0** | erweitert |
| `src/engine/selection.ts` | Gewichtung nach Schwäche | unverändert |
| `src/engine/session.ts` | Loop-Zustandsautomat, **Drill-Art, Pool, `retuneHomeTone`, Streak-Tag** | erweitert |
| `src/engine/sync.ts` | Merge zweier Lernstände; Lern-Kennung, **plus Streak** | erweitert |
| **`src/engine/streak.ts`** | **Streak mit Freeze-Gnade, Kalenderarithmetik, Merge** | **neu, getestet** |
| **`src/engine/drill.ts`** | **Langsame Zeichen, Drill-Satz, ehrlicher Vergleich** | **neu, getestet** |
| **`src/engine/deviceSettings.ts`** | **Tonhöhe und Lautstärke als reine Daten** | **neu, getestet** |
| `src/audio/player.ts` | Wiedergabe mit Audio-Uhr, **Lautstärke veränderlich** | erweitert |
| `functions/_lib/`, `functions/api/` | Env, HTTP, Passkeys, Sitzungen, Sync-API | unverändert |
| `migrations/0001_accounts.sql` | users, credentials, sessions, progress | unverändert |
| `wrangler.toml` | D1-Bindung `DB`; echte `database_id` (config-as-code) | unverändert |
| `src/ui/App.tsx` | Lernloop-Screen, View-State, Push, Streak-Zeile, Settings, Drill, **`Answers` mit Tastenfeld** | erweitert |
| **`src/ui/keypad.ts`** | **Schwelle und die 36 Positionen des Tastenfelds — reine Daten** | **neu, getestet** |
| `src/ui/Account.tsx`, `src/ui/account.ts` | Account-Screen und Passkeys | unverändert |
| **`src/ui/Settings.tsx`** | **Zwei Regler, ein Probeton, eine ehrliche Zeile** | **neu** |
| **`src/ui/deviceStorage.ts`** | **Eigener localStorage-Schlüssel, nie im Sync** | **neu** |
| `src/ui/Menu.tsx` | Kopfzeile und Menü, **jetzt mit Settings-Zeile** | erweitert |
| `src/ui/progressStorage.ts` | localStorage rein/raus, plus Lern-Zeitstempel | unverändert |
| `src/ui/Progress.tsx`, `Intro.tsx`, `Learn.tsx`, `Pattern.tsx` | — | unverändert |
| `src/styles.css` | Tokens nach 1.1 §13, Regler- und Zeilen-Rollen, `.quiet-link`, **`.keypad`** | erweitert |
| **`content/learn/*.md`** | **Die 14 Texte des Learn-Bereichs (Fable), unverändert** | **neu** |
| **`tools/learn/pages.mjs`** | **Frontmatter, Markdown, Head-Tags, Sitemap — reine Funktionen** | **neu, getestet** |
| **`tools/learn/build.mjs`** | **Ein- und Ausgabe: schreibt nach `dist/`, prüft die Paare** | **neu** |
| **`tools/learn/learn.css`** | **Stylesheet der Learn-Seiten; Tokens setzt der Build ein** | **neu** |
| **`tools/learn/verify.mjs`** | **Die SEO-Gegenprobe an den gebauten Dateien** | **neu** |
| `public/sw.js` | Service Worker, `/api/` ausgenommen, **Learn-Pfade ausgenommen** | erweitert |
| `src/ui/About.tsx` | About-Screen, **plus Link in den Learn-Bereich** | erweitert |
| `public/og-morse-lab.png` | Das Lockup als OG-Bild, 1200 × 630 (§3i) | neu |
| `docs/CONCEPT-LEARN.md` | Fables Konzept — die verbindliche Vorgabe dieser Runde | neu |
| `docs/brand/logo.py` | Konstruktions-Doku, nicht mehr Quelle (#53/54) | unverändert |
| `docs/screenshots/` | …, acht Learn-Screenshots, **zwei Tastenfeld-Screenshots** | erweitert |
| `src/**/*.test.ts`, `tools/learn/pages.test.mjs` | **278 Tests** (271 vorher, **7 neu** in dieser Runde) | grün |

Richtung unverändert: `src/engine/` DOM-frei, Player kennt die Engine, die
Engine kennt niemanden, die UI rechnet nicht. **Neu dazu: der Server rechnet
auch nicht** — er ist ein Fach, kein Modell (§3a).

## 3. Die Entscheidungen, die den Rest erklären

Was hier nicht steht, steht unverändert in der Übergabe der Runde davor
(Git-Verlauf): Audio-Uhr und Reaktionszeiten, Wachstumsregel, additive
Persistenz, der handgeschriebene Service Worker, Schriften im Repo, der
Lernmodus, die Marke, die Klang-Variabilität, das Gehäuse. **Nicht
aufweichen.**

### 3a. Der Server ist ein Fach, kein Modell

`/api/progress` speichert den Blob, den der Client schickt, und gibt ihn
zurück. Der Server liest die Felder nicht, rechnet nichts, bewertet nichts.

Das ist die wichtigste Entscheidung dieser Runde, und sie hat drei Folgen:

1. **Die Merge-Semantik ist reine Client-Logik** (`src/engine/sync.ts`) und
   damit ohne Netz, ohne Datenbank und ohne Browser testbar (CLAUDE.md 4).
2. **Ein neues Feld im Lernstand braucht keine Migration.** Die additive
   Persistenz aus den Runden davor gilt unverändert weiter.
3. **Der Server kann keine Lernentscheidung treffen** — auch nicht
   versehentlich, auch nicht später aus Bequemlichkeit.

Der Preis: der Server kann einen kaputten Blob nicht erkennen. Dagegen steht
`parseProgress` auf der Client-Seite, das schon vorher jeden unbekannten Stand
defensiv aufgefüllt hat, plus eine Größenbremse von 64 KiB (ein Konto ist kein
Dateispeicher; gemessen liegt ein Stand unter 4 KiB).

### 3b. Die Merge-Regel — und die eine Zeile, die sie rettet

Aus Notion-Log #49, in `mergeProgress(local, remote)`:

- **Pro Zeichen gewinnt der Datensatz mit mehr `attempts`** — und zwar *als
  Ganzes*, nie feldweise gemischt. `hits` aus einem und `attempts` aus einem
  anderen Stand ergäben eine Trefferquote, die niemand erlebt hat
  (CLAUDE.md 2.6).
- **`recentAnswers`, `day` und `answersSinceGrowth` kommen vom jüngeren Stand.**
  Das sind Momentaufnahmen eines Verlaufs, keine Summen — ein rollierendes
  Fenster aus zwei Geräten zusammenzuschneiden würde eine Serie behaupten, die
  es nicht gab.
- **`activeCharacters` und `introducedCharacters` sind die Vereinigung.** Was
  einmal als Klang vorgestellt wurde, wurde vorgestellt. Und **Wachstum ist
  monoton**: ein Zeichensatz, der einmal gewachsen ist, schrumpft nicht mehr.
- **Bei jedem Gleichstand gewinnt lokal** — „lokal bleibt Quelle".

**Der aktive Satz war bis Review 9 an den jüngeren Stand gebunden** (so die
Vorgabe aus #49) und ist es seit **Ruling Notion-Log #56** nicht mehr. Der Fall,
der das entschieden hat: Gerät A wächst auf zwölf Zeichen und synchronisiert,
Gerät B übt danach mit sechsen weiter und schiebt hoch — dann gewann B, und das
Wachstum von A war im Konto weg. Die Zeichen-Statistik blieb (die Versuchs-Regel
schützt sie) und `introducedCharacters` auch, niemand musste neu lernen, aber
die Wachstumsregel musste den Satz neu aufbauen. Mit der Vereinigung entfällt
der Fall; der frühere §5f.1 ist damit erledigt.

**Der Preis, bewusst bezahlt:** ein aktiver Satz lässt sich durch einen Merge
nicht mehr verkleinern. Käme je ein Weg, Zeichen wieder herauszunehmen (heute
gibt es keinen), müsste er ausdrücklich und lokal wirken — über den Merge geht
er nicht. Steht als Kommentar an der Funktion, nicht nur hier.

Die Reihenfolge der Vereinigung ist lokal zuerst, dann was nur das Konto kennt.
Eine über zwei Geräte hinweg „richtige" Einführungsreihenfolge gibt es nicht.

**Der Fund, der diese Runde am meisten wert war:** „jünger" heißt *hat später
etwas gelernt*, nicht *wurde später gespeichert*. Der Unterschied ist keine
Feinheit. Schon das Öffnen der App schreibt den Stand (`beginSession` zählt die
Sitzung, der Tages-Eimer springt auf heute). Hätte das den Zeitstempel
hochgesetzt, wäre **jedes gerade geöffnete Gerät automatisch das jüngere** und
hätte seinen alten Übungsverlauf über den eines Kontos gelegt, an dem woanders
gerade gearbeitet wurde — Datenverlust durch einen Login, im wahrscheinlichsten
Ablauf überhaupt.

Zwei Mechanismen halten das:

- **`learningRevision(progress)`** (Engine): eine Kennung, die sich ändert, wenn
  geantwortet, gewachsen oder eingeführt wurde — und *nicht*, wenn nur der
  Sitzungszähler hochgeht, der Tag umspringt oder ein Einmal-Merker umklappt.
  `progressStorage` zieht die Zeit nur nach, wenn sich die Kennung geändert hat.
- **`effectiveUpdatedAt`** (Engine): ein Stand ohne einen einzigen Versuch ist
  *nie* der jüngere. Das entscheidet die erste Kante der Vorgabe (frisches Gerät
  + volles Konto): App neu installiert, Einführung durchgeklickt, dann
  eingeloggt — ohne die Regel kämen Verlauf, Tagesstand und Wachstums-Sperre vom
  leeren Gerät.

**Nach #56 ist der Zuständigkeitsbereich des Zeitstempels kleiner:** er
entscheidet nur noch über die drei Momentaufnahmen, nicht mehr über den
Zeichensatz. Der mögliche Schaden eines falschen „jünger" ist damit kleiner
geworden — verschwunden ist er nicht, ein rollierendes Fenster vom falschen
Gerät verschiebt die Wachstumsregel. Beide Mechanismen bleiben.

Der Browser-Durchlauf hat den Fehler gefunden, bevor ihn jemand benutzt hat
(Prüfung 20 fiel durch). **Das ist der Grund, warum solche Durchläufe hier
nicht optional sind.**

Der lokale Zeitstempel liegt als eigener localStorage-Eintrag
(`projekt-morse:progress-at`, Form `{at, rev}`) *neben* dem Stand, nicht *in*
ihm: der Stand ist der Blob, der zum Server geht, und dort führt die Datenbank
ihren eigenen `updated_at`. Zwei Uhren in einem Objekt wären zwei Wahrheiten.

**Drei Felder nennt die Vorgabe nicht** — sie müssen trotzdem einen Wert haben.
Als Setzung ausgewiesen, nicht als Vorgabe, und beide folgen „Persistenz
verliert keine Nutzerdaten" (CLAUDE.md 4):

- `sessionsStarted`: das **Maximum**. Ein monoton wachsender Zähler darf durch
  einen Merge nicht sinken; die Summe wäre falsch, weil beide Stände dieselbe
  Vorgeschichte enthalten können.
- `introSeen` und `variabilityNoticeSeen`: **logisches Oder**. Wer die
  Einführung gesehen hat, hat sie gesehen.

**Ein Abgleich übernimmt den Stand, aber nicht den Zeichensatz der laufenden
Sitzung.** Dieselbe Regel wie beim Wachstum: ein neuer Satz gilt ab der
nächsten Sitzung. Sonst wüchse oder schrumpfte das Antwort-Gitter mitten in
einer Übung.

### 3c. Sitzungen: Cookie außen, Zeile in D1 innen

- **HttpOnly, Secure, SameSite=Lax, Path=/** — kein Token im localStorage, kein
  Skript der Seite sieht den Wert (im Browser nachgeprüft, §4).
- **Ein opaker Zufallswert, kein JWT.** Er bedeutet nichts; alles, was er
  bedeutet, steht in der Zeile. Damit ist ein Logout ein `DELETE` und wirkt
  sofort — ein selbstbeschreibendes Token kann man nicht zurückrufen.
- **Gespeichert wird der SHA-256 des Werts, nicht der Wert.** Wer die Datenbank
  liest (Backup, Support-Dump, Leck), hält damit keine gültige Sitzung in der
  Hand. Kosten: ein Hash pro Anfrage.
- **Die Sitzungs-ID wechselt bei jeder Anmeldung** (Session Fixation). Deshalb
  `promoteToUser` und kein UPDATE.
- **Die WebAuthn-Challenge liegt in derselben `sessions`-Tabelle** als
  Flow-Zeile (`user_id IS NULL`, Frist fünf Minuten). Die Challenge *muss*
  serverseitig liegen — sonst prüft die Signatur nicht gegen ein frisches
  Geheimnis. Sie hier zu führen statt in einer fünften Tabelle hält das Schema
  bei den vier vorgegebenen Tabellen.
- **Kein Secret in der Umgebung.** Genau eine Bindung: `DB`. Kein
  HMAC-Geheimnis, das jemand rotieren müsste; die Relying Party leitet sich aus
  der Anfrage ab (§3e).

### 3d. `@simplewebauthn/server` — die eine neue Abhängigkeit

**Genehmigt in der Aufgabenstellung, und die Begründung trägt:** die
Verifikation verbindet CBOR-Dekodierung, COSE-Schlüssel, Flag-Bits und
Zählerlogik. Handgerollt ist *jeder* Fehler darin eine stille
Authentifizierungslücke — eine, die kein Test dieses Projekts finden würde,
weil der glückliche Pfad weiter funktioniert. Das ist die Sorte Code, die man
nicht selbst schreibt.

**Nur Server, kein Bundle-Delta** (nachgewiesen: das Paket kommt im gebauten
JS nicht vor). Die Browserseite nutzt `navigator.credentials` direkt, wie
vorgegeben; die eine nötige Umwandlung (base64url ↔ ArrayBuffer) steht in
zwanzig Zeilen in `src/ui/account.ts`. Die neueren Helfer
`PublicKeyCredential.parseCreationOptionsFromJSON()` / `.toJSON()` wären kürzer,
sind aber erst in ganz frischen Browsern da — für eine App, die ohne Konto
vollständig läuft, der falsche Ort für eine Versionshürde.

Dazu **`@cloudflare/workers-types` als devDependency**: `npm run build` prüft
jetzt auch `functions/` (`tsc -p functions --noEmit`). Eigenes tsconfig, weil
DOM- und Worker-Typen sich nicht mischen dürfen — gemischt kompilierte
`localStorage` in einer Function.

### 3e. Passkeys hängen an der Domain — was das für `morse-lab.com` heißt

Ein Passkey gilt nur für die **RP ID**, unter der er angelegt wurde. Die RP ID
leitet sich hier aus der Anfrage ab, gegen eine gelesene Liste
(`functions/_lib/rp.ts`): `localhost`, `*.pages.dev`, `morse-lab.com`,
`www.morse-lab.com`. Der Host-Header allein darf das nicht entscheiden — ein
Client bestimmt ihn frei; was nicht auf der Liste steht, bekommt keine Optionen
(400, kein stiller Rückfall auf einen Standardwert).

**Die Folge, die vor dem DNS-Eintrag zu bedenken ist:** wer sich heute auf
`projekt-morse.pages.dev` einen Passkey anlegt, kann sich damit auf
`morse-lab.com` **nicht** anmelden. Das ist WebAuthn, kein Fehler hier. Sobald
die Custom Domain die kanonische ist, gehört dorthin eine Weiterleitung von
pages.dev (dann entsteht das Problem nicht) — oder ein Hinweis für die Handvoll
früher Konten. **Entscheidung offen, gehört vor den DNS-Eintrag.**

`127.0.0.1` steht bewusst *nicht* auf der Liste: eine RP ID muss ein Domainname
sein, eine IP-Adresse lehnt der Browser ab. Beim ersten Browser-Durchlauf
aufgefallen.

### 3f. Die Bildmarke — GESCHLOSSEN (Notion-Log #61)

**Der Punkt ist erledigt, und zwar ohne Dateitransfer.** Fable hat die
Owner-Renderings pixelgenau vermessen und gegen die Sollwerte aus
Guidelines 1.1 §3 gehalten:

| Verhältnis | Gemessen (Owner) | Soll (1.1 §3) |
|---|---|---|
| Knopf / Basis | 0,249 | 0,250 |
| Balkenhöhe / Basis | 0,0668 | 0,0667 |

**Ergebnis: die Owner-Dateien und die im Repo aus §3 konstruierte Bildmarke
sind geometrisch identisch.** Die Abweichung, die drei Sessions lang als
Blockade geführt wurde, war keine — es sind zwei Wege zu derselben Geometrie.
Damit entfällt der Dateitransfer, und Favicon, App-Icons und das About-Lockup
im Repo sind bereits richtig; sie werden nicht neu gerendert.

**Was das für `docs/brand/logo.py` heißt:** das Skript beschreibt die
Konstruktion, die nachweislich der Marke entspricht. Sein Kopfkommentar sagt
noch, es sei „nicht mehr die Quelle" und die Owner-Dateien fehlten im Repo —
das ist mit diesem Ruling überholt. **Bewusst nicht mitgeändert** (CLAUDE.md 5:
die Aufgabe war die Dokumentation, nicht das Skript); wer als Nächstes an der
Marke arbeitet, zieht den Kopf in einer Zeile nach.

**Optionaler Rest, kein Blocker:** die drei Original-SVGs
(`morse-lab-mark.svg`, `morse-lab-mark-inverse.svg`, `morse-lab-appicon.svg`)
irgendwann als Referenz nach `docs/brand/assets/` legen. Das wäre Archiv, nicht
Korrektur — die gerenderten Assets ändern sich dadurch nicht.

**Was aus den drei Anläufen bleibt** — nicht als Vorwurf, sondern als Regel für
die nächste Runde: diese Sessions laufen in einem flüchtigen Remote-Container,
in dem nur das Repo liegt. Ein Pfad auf dem Rechner des Owners
(`~/Downloads/…`) ist von hier aus kein gültiger Weg, Dateien hereinzugeben;
der einzige Weg ist, sie ins Repo zu legen. Geprüft war das jedes Mal, nicht
vermutet — und in keinem der drei Anläufe wurde ersatzweise etwas konstruiert.
Rückblickend war genau das richtig: die Konstruktion im Repo war die ganze Zeit
korrekt.

## 3g. Backend & Datenschutz — was gespeichert wird, und was nicht

Der ehrliche Kern dieser Runde. Wer wissen will, was ein Konto über einen Nutzer
weiß, findet hier die vollständige Antwort — und sie ist kurz.

**Was auf dem Server liegt** (das ganze Schema, `migrations/0001_accounts.sql`):

| Tabelle | Inhalt | Was das über eine Person sagt |
|---|---|---|
| `users` | eine zufällige ID, ein Anlegedatum | dass es dieses Konto gibt |
| `credentials` | der **öffentliche** Passkey-Schlüssel, seine ID, der Signaturzähler, die Transports | mit welchem Gerätetyp angemeldet wird |
| `sessions` | Hash des Sitzungswerts, Ablauf, ggf. eine laufende WebAuthn-Challenge | dass gerade eine Sitzung offen ist |
| `progress` | der Lernstand als JSON-Blob, plus `updated_at` | wie gut jemand Morse hört |

**Was ausdrücklich NICHT gespeichert wird** — und zwar nicht „noch nicht",
sondern als Entwurfsentscheidung:

- **Keine E-Mail-Adresse.** Es gibt kein Feld dafür.
- **Kein Name und kein Anzeigename.** Auch nicht optional.
- **Kein Passwort und kein Passwort-Hash.** Es gibt keine Passwörter.
- **Keine IP-Adresse, kein User-Agent, kein Login-Zeitpunkt.** Kein
  Zugriffsprotokoll.
- **Keine Analytics, keine Third-Party-Aufrufe, kein Ad-Tech**
  (CLAUDE.md 2.5, unverändert).
- **Genau ein Cookie**, und der ist funktional notwendig: die Sitzung. HttpOnly,
  Secure, SameSite=Lax. Kein Tracking-Cookie, kein Consent-Banner nötig.

**Der private Schlüssel des Passkeys verlässt das Gerät nie.** Das ist WebAuthn:
der Server hält nur den öffentlichen Teil. Ein Leck der Datenbank gibt niemandem
Zugang zu einem Konto — und wegen der gehashten Sitzungswerte (§3c) auch keine
laufende Sitzung.

**Löschen ist vollständig und liegt beim Nutzer** (Art. 17 DSGVO):
„Delete account and data" im Account-Screen entfernt Lernstand, Passkeys,
Sitzungen und das Konto — vier ausdrückliche `DELETE` in einem `batch`, nicht
über `ON DELETE CASCADE` allein: eine Löschpflicht darf nicht an einem Pragma
hängen. Im Browser-Durchlauf gegengelesen, auch auf Datenbank-Ebene: `users`,
`credentials` und `progress` stehen danach auf 0 (§4).

**Der lokale Lernstand bleibt beim Löschen erhalten.** Das Konto war ein
Sync-Ziel, nicht der Ort der Daten. Wer sein Konto löscht, übt weiter — nur
ohne Abgleich. Die Bestätigung sagt das ausdrücklich, damit niemand „Löschen"
für „meinen Fortschritt wegwerfen" liest.

**Ohne Konto verlässt nichts das Gerät.** Nachgewiesen und nicht bloß
zugesichert: die App löst ohne Konto keinen einzigen `/api/`-Aufruf aus, auch
nicht beim Start (der Account-Screen fragt erst, wenn man ihn öffnet — und nur,
wenn auf diesem Gerät je angemeldet wurde). Der About-Screen sagt jetzt genau
das, statt wie vorher „nothing is sent anywhere" zu behaupten, was mit Konten
für einen Teil der Nutzer falsch wäre (CLAUDE.md 2.6).

**Wo die Daten liegen:** Cloudflare D1. Der Standort einer D1-Datenbank ist
nicht frei wählbar; sie wird in einer Region angelegt, die Cloudflare bestimmt.
**Wenn EU-Datenresidenz zugesichert werden soll, ist das eine offene Frage vor
dem Anlegen** (§5e) — sie gehört in die Datenschutzerklärung, die es noch nicht
gibt. Nicht hier erfunden.

**Was noch fehlt, bevor echte Nutzer Konten anlegen:** eine
Datenschutzerklärung. Der Inhalt steht praktisch schon in diesem Abschnitt, aber
sie zu formulieren (und zu verlinken) ist eine Aufgabe für sich — und in
Deutschland eine mit Rechtsfolgen, also keine, die ein Agent nebenbei schreibt.

## 3h. Runde F1 — was man wissen muss, um die drei Features zu lesen

**Der Streak rechnet nie mit einer Uhr.** `src/engine/streak.ts` bekommt den
Kalendertag als `YYYY-MM-DD` herein, wie alles in dieser Engine. Der Tag fällt
in `advance()`, wenn die Sitzung auf `finished` geht — nicht in der UI, nicht
über einen Timer. Zwei Funktionen, die man auseinanderhalten muss:

- `recordPracticeDay(streak, today)` **verbucht** einen geübten Tag.
- `streakStanding(streak, today)` sagt, **wie er heute dasteht**. Der
  gespeicherte Stand beschreibt den letzten geübten Tag; was daraus geworden
  ist, hängt an den seither vergangenen Tagen. Ohne diese Umrechnung stünde
  nach einer Woche Pause noch „Day 12" auf dem Schirm — eine Zahl, die niemand
  mehr hat (CLAUDE.md 2.6).

**Der Streak-Merge hat eine eigene Uhr.** Alle anderen Momentaufnahmen kommen
vom Stand mit dem jüngeren `updatedAt`; der Streak richtet sich nach dem
jüngeren **zuletzt geübten Kalendertag**. Welcher Blob später geschrieben
wurde, sagt über Kalendertage nichts. Und er stuft nicht zurück: der ältere
Streak wird einmal auf den jüngsten geübten Tag fortgeschrieben und dann das
Maximum genommen. Lebte er da noch, zählt er weiter; war er tot, kommt 1 heraus
— **ein toter Streak lebt durch einen Merge nicht wieder auf.** Beide Kanten
sind getestet.

Zwei Setzungen, die die Vorgabe nicht nennt (beide in `streak.ts` begründet):
ein **beendeter Streak kostet den Vorrat nicht** (zwei verpasste Tage haben den
Streak gekostet, das genügt als Folge), und ein **Tag vor dem zuletzt geübten
ändert nichts** (zurückgestellte Uhr, Zeitzonensprung).

**Die Einstellungen sind die Grenze des Syncs, nicht eine Lücke darin.** Sie
liegen unter `projekt-morse:device`, nicht in `Progress` — und `pushProgress`
schickt `Progress`. Damit ist „geht nicht zum Konto" keine Regel, an die sich
jemand erinnern muss, sondern eine Eigenschaft der Datenstruktur. Im Durchlauf
gegengelesen: der Lernstand enthält weder `toneHz` noch `volume`.

Die Tonhöhe gilt auf Variabilitäts-Stufe 0 — und damit auch für die Lernkarten,
die immer den Sitzungs-Ton spielen. **Ab Stufe 1 haben die HVPT-Bänder
Vorrang**, und die Einstellung verschiebt sie *nicht*: ein Band, das der Nutzer
mitbewegen kann, wäre kein Trainingsband mehr. `retuneHomeTone()` zieht eine
laufende Stufe-0-Sitzung nach, damit das Eyebrow keine Tonhöhe behauptet, die
gar nicht gespielt wird; ab Stufe 1 tut es bewusst nichts.

**Der Drill fasst das Wachstumsfenster nicht an — und das braucht zwei
Riegel.** Der erste ist `RecordOptions.countTowardGrowth` (stats.ts):
`recentAnswers` und `answersSinceGrowth` bleiben stehen. Der zweite ist, dass
`submitAnswer` bei einem Drill `maybeGrow` gar nicht erst fragt. Der zweite ist
nicht überflüssig: ein Drill ändert auch Versuche und Trefferquote je Zeichen,
und das sind die Bedingungen (b) und (c) der Wachstumsregel — ohne den zweiten
Riegel könnte mitten in einer Therapiesitzung ein neues Zeichen dazukommen.
Über Wachstum entscheidet die normale Übung; die nächste normale Antwort holt
es nach.

Ein durchgezogener Drill zählt als **geübter Tag** (er ist eine beendete
Sitzung) und als Sitzung im Zähler. Der Streak misst Kontinuität, nicht
Pflichterfüllung — das ist eine Setzung, keine Vorgabe.

**Die Ergebniszeile vergleicht nur Vergleichbares.** Gemessen wird der Median
der *langsamen* Zeichen — die Kontrast-Zeichen (aufgefüllt bis `DRILL_MIN_POOL`) sind
schnell und zögen ihn nach unten, ohne dass jemand etwas gelernt hätte.
„down from" steht nur da, wenn es wirklich schneller wurde; ein Rückschritt
bekommt keine Zeile.

## 3i. Runde L1 — die Entscheidungen hinter dem Learn-Bereich

**Statisch, weil der Zweck es verlangt.** Der Bereich soll organischen
Suchverkehr bringen (CONCEPT-LEARN §1). Ein Crawler, der `/learn/` als
SPA-Route bekommt, sieht ein leeres `<div id="root">`; also rendert ein
Node-Skript die Markdown-Dateien beim Bauen zu fertigen Seiten. Es läuft
**nach** `vite build` und nicht davor — Vite räumt `dist/` beim Bauen aus und
hätte die Seiten sonst gleich wieder mitgenommen. Deshalb hängt
`build:learn` in `npm run build` hinten dran.

**`marked` als einzige neue Abhängigkeit** (devDependency, in §3 des Konzepts
ausdrücklich genehmigt). Ein handgerollter Markdown-Parser wäre die
fehleranfälligere Wahl gewesen — die Inhalte nutzen Tabellen, Listen, Links,
fett und kursiv. Sie landet nicht im App-Bundle: sie läuft im Build.

**Drei Eingriffe in das, was `marked` liefert** — mehr nicht, und keiner davon
ändert Text:

1. **Tabellen ohne echte Kopfzeile bekommen kein leeres `<thead>`.** Die
   Alphabet-Tabellen sind Gitter aus selbsterklärenden Zellen („A ·−"), keine
   Datentabellen mit Spaltentiteln. Die Satzzeichen-Tabelle *hat* Titel und
   behält sie.
2. **Die letzte Zeile wird zum CTA.** Im Markdown steht
   `*Start hearing it → [Open Morse Lab](/)*`; auf der Seite ist das der eine
   gefüllte Amber-Primary (1.1 §7, Konzept §5). Der Wortlaut ist unverändert,
   nur die Form ist ein Knopf statt Kursivschrift. Fehlt die Zeile in einer
   Datei, entsteht kein Knopf **und kein Ornament** — es trennte sonst ins Leere.
3. **Ein ganz kursiver Absatz sonst wird zur Randnotiz** (`.aside`). Das
   betrifft genau eine Zeile: den Sprachhinweis auf dem Hub. Und weil der immer
   in der *anderen* Sprache steht, bekommt er ein `lang`-Attribut — ohne das
   liest ein Screenreader „Diese Seiten gibt es auch auf Deutsch" mit
   englischer Aussprache vor (CLAUDE.md 6). Die Regel prüft dafür nicht den
   Text, sondern wohin die Links zeigen.

**Die Farben stehen weiter nur an einer Stelle.** `tools/learn/learn.css` hat
keinen eigenen Token-Block, sondern die Marker-Zeile `/* @tokens */`; der Build
ersetzt sie durch den `:root`-Block aus `src/styles.css`, Kommentare inklusive.
Fehlt Marker oder Block, bricht der Build ab — dieselbe Haltung wie beim
SW-Marker in `vite.config.ts`. Damit gilt CLAUDE.md 2.9 („kein Farbliteral
außerhalb der Token-Definition") auch für die Learn-Seiten, und `verify:learn`
prüft es am gelieferten CSS nach.

**Das Amber-Budget, und die eine Abweichung, die ein Ruling braucht.** Den
einen gefüllten Amber trägt der CTA am Seitenende — genau wie in der App
(`.button-begin`: `--paper` auf `--amber`). Fließtext-Links stehen dagegen in
`--amber-deep`, nicht in `--amber`. Gemessen: **`--amber` auf `--paper` ergibt
4,46:1** und liegt damit unter den 4,5:1, die WCAG AA für Text dieser Größe
verlangt; `--amber-deep` liegt bei **6,30:1**. Die App trifft diese Wahl für
Amber-Text schon (`.unlock strong`, die richtige Antwort im Feedback), und
Addendum (b) im Notion-Log #41 nennt `#92400e` genau dafür — als internen
Shade, nie als eigenständige Fläche. Als Textfarbe ist er keine Fläche.
**Trotzdem sagt Konzept §5 „Links in Amber", und das hier ist die dunklere
Stufe davon — wenn Fable das anders will, ist es eine Zeile in `learn.css`.**
Die Unterstreichung kommt wie vorgegeben erst im Hover.

**Das Ornament ist echter Code und steht genau einmal.** `−− ·−··` ist „ML",
in den Proportionen aus 1.1 §8 (Punkt ⌀ 1 u, Strich 3 u × 1 u, Lücke im
Zeichen 1 u, zwischen den Buchstaben 3 u; hier u = 6 px). Dekorativer
Fake-Code ist verboten, also steht dort wirklich ML. Es trennt den Artikel von
der Einladung am Ende — „zwischen Artikelabschnitten, wo es passt" (§5), und
zwischen jeder Überschrift wäre es Dekoration. Für Screenreader ist es
`aria-hidden`: die Buchstabenfolge erklärt nichts, was nicht schon dasteht.

**Der Service Worker: die Falle war nicht der Vorab-Cache.** Das Konzept sagt,
die Learn-Seiten sollen **nicht** vorab gecacht werden — das allein wäre ein
Nichtstun gewesen. Der eigentliche Fehler saß in `networkFirstNavigation`: die
Funktion legt **jede** erfolgreiche Navigation unter dem Schlüssel `'/'` ab,
weil bisher jede Navigation dieselbe App-Shell war. Mit dem Learn-Bereich
stimmt das nicht mehr: ein Besuch auf `/learn/` hätte den Artikel als App-Shell
gecacht, und die App wäre offline als Artikel gestartet. Die Navigation für
Learn-Pfade geht deshalb über `staleWhileRevalidate` — ausdrücklich erlaubt
(„stale-while-revalidate genügt"), mit dem Pfad als Schlüssel statt `'/'`. Die
Learn-Assets unter `/learn/assets/` laufen ohnehin dort, nicht über den
`cache-first`-Zweig für `/assets/`: sie sind nicht inhaltsgehasht.

**Die Schriften liegen zweimal in `dist/` — mit Absicht.** Vite hasht die vier
woff2-Dateien in `dist/assets/`; ein Generator außerhalb von Vite kennt diese
Namen nicht. Der Learn-Bereich bekommt deshalb dieselben vier Dateien noch
einmal unter `/learn/assets/`. Kosten: 129 kB statisch, einmal geladen und dann
im Browser-Cache. Der Preis für einen eigenen Hash-Mechanismus wäre höher als
129 kB, und ein Fremdabruf ist ausgeschlossen (CLAUDE.md 2.5).

**Das OG-Bild ist ein abgeleitetes Asset.** `og:image` braucht ein Rasterbild —
SVG rendern die Plattformen nicht. `public/og-morse-lab.png` (1200 × 630) ist
deshalb einmal erzeugt worden: die Geometrie aus `public/logo-key.svg` plus die
Wortmarke in echtem Newsreader, auf Papier, primäres Lockup nach 1.1 §3. Es ist
kein Original: **kommen die drei Owner-Dateien ins Repo (§3f), gehört es aus
ihnen neu erzeugt.**

**JSON-LD `Article` auch auf dem Hub.** Konzept §4 fordert es „pro Seite", und
der Hub ist eine redaktionelle Seite mit Text und Liste — deshalb wörtlich
umgesetzt. Erfunden wird nichts: kein `author` (es gibt keinen benannten),
kein FAQ-Schema (es gibt keine FAQ), keine `priority` und `changefreq` in der
Sitemap (Suchmaschinen ignorieren beide, und eine erfundene Zahl ist hier so
unehrlich wie überall — CLAUDE.md 2.6).

**`robots.txt` ist unverändert — nämlich nicht vorhanden.** Das Konzept sagt
„unverändert offen"; ohne Datei ist alles erlaubt, und das Anlegen einer wäre
eine Änderung. Wer die Sitemap dort eintragen will (`Sitemap:`-Zeile), kann das
tun — es ist eine eigene, kleine Entscheidung, keine Voraussetzung: die
Sitemap lässt sich in der Search Console direkt einreichen.

**Die Tests liegen bei ihrem Gegenstand.** `tools/learn/pages.test.mjs` läuft
im normalen `npm test`; `vite.config.ts` nimmt dafür `tools/**/*.test.mjs` in
`include` auf. Der Generator ist kein Teil der App — er läuft im Build —, also
gehört er nicht nach `src/engine/`; geprüft wird er trotzdem, und mit denselben
fixture-basierten Fällen wie die Engine: die letzten sieben Tests fahren die
**echten 14 Dateien** durch den Generator, nicht eine Testvorlage.

## 3j. Runde U1 — warum das Tastenfeld so aussieht

**Das Problem, gemessen und nicht vermutet.** Bis zwölf Zeichen füllt das
Dreier-Gitter vier ruhige Reihen. Ab dreizehn beginnt die fünfte,
unvollständige — und schlimmer: bei jedem Wachstumsschritt wandern alle Tasten
hinter dem neuen Zeichen an eine andere Stelle. Damit wandert die Suchzeit, und
die steckt in der gemessenen Reaktionszeit (`stats.ts`, Punkt 2: die Zahl ist
ein Näherungswert und enthält „die Suche auf dem Antwort-Gitter"). Eriks
Eigen-Test bei Sitzung 36 mit 15 Zeichen hat genau das gezeigt. Ruling
Notion-Log #75.

**Ortsfest ist die Antwort — und sie kostet eine dokumentierte Abweichung.**
Guidelines 1.1 §7 sagt „hide what can't be used". Das Antwort-Gitter hatte
dafür schon eine Ausnahme (Review-6-Ruling, Notion-Log #43: die Tasten sind
der Kontext der Frage, man muss sehen, *woraus* man wählt). Das Tastenfeld
erweitert sie: es zeigt auch die 21 Zeichen, die bei 15 aktiven noch nicht
dran sind. Der Gegenwert ist genau der Zweck — wer immer an dieselbe Stelle
greift, baut Motorik auf, und die Latenz-Messung misst nicht bei jedem
Wachstumsschritt eine neue Suche mit. Ruling #75 nennt das ausdrücklich.

**Die Schwelle hängt an den aktiven Zeichen, nicht am Pool der Abfrage.** Eine
Speed round zieht aus drei bis fünf Zeichen (`DRILL_MIN_POOL`). Hinge das
Layout am Pool, fiele sie aufs Dreier-Gitter zurück — und die Positionen wären
kein Versprechen mehr. `usesKeypad` bekommt deshalb
`progress.activeCharacters.length`. Weil dieser Satz nur wächst (`growth.ts`
hängt an, nimmt nie weg), ist die Entscheidung damit von sich aus monoton:
**kein neues Feld im Lernstand, keine Versionierung, kein Zurückspringen.** Ein
Test hält die Monotonie fest, damit nicht später jemand die Poolgröße einsetzt.

**Alphabetisch, nicht in Einführungsreihenfolge.** `CHARACTER_ORDER` ist die
Reihe, in der Zeichen dazukommen (Koch-nah). Als Tastenfeld wäre sie eine
zweite Sache zum Lernen. Das Alphabet kennt jeder auswendig; wer eine Taste
sucht, soll sie ableiten können. Ein Test prüft, dass die 36 Positionen genau
`CHARACTER_ORDER` abdecken — kommt dort je ein Satzzeichen dazu, fällt der
Test und nicht ein Nutzer auf eine Taste, die es nicht gibt.

**Die Ziffern stehen unter den Buchstaben, nicht hinter Z.** Y und Z lassen
vier Plätze ihrer Reihe frei; `0` beginnt eine neue (`grid-column: 1`, gesteuert
über `KEYPAD_ROW_BREAK`). Sieben Reihen à 52 px passen bei 390 × 844 **ohne
Scrollen** (gemessen: Seitenhöhe exakt 844 px, §4).

**Eine Abweichung, die Fable sehen muss: das Tastenfeld dimmt nicht nach
Phase.** Im Dreier-Gitter war die Abblendung von `button:disabled` das Zeichen
„jetzt nicht". Im Tastenfeld ist Dimmen die Aussage „gehört nicht zu dieser
Runde" — zwei Bedeutungen auf einer Eigenschaft wären eine zu viel, und die
gedimmten Positionen wären während des Tons kaum noch zu sehen (0,45 × 0,4).
Also nimmt `.keypad .answer:disabled` die Phasen-Abblendung zurück. Dass
gerade nicht getippt werden kann, sagen die Augenbraue („Listening…"), die
Frage und der gefüllte Play-Kreis; **bedienbar ist die Taste trotzdem nicht** —
das Attribut `disabled` steht, nicht nur die Optik. Sollte Fable die
Phasen-Abblendung dort haben wollen, ist es eine Zeile.

**Nicht gebaut, obwohl naheliegend:** keine Tastatur-Anzeige auf den Tasten,
kein Sortieren nach Schwäche, keine Animation beim Wechsel der Fläche, kein
Zurückschalten über eine Einstellung. Und der visuelle Zwilling aus 1.1 §12
bleibt, was Addendum (a) sagt: nicht jetzt.

## 4. Was nachgewiesen ist (und wie)

**Aus Runde U1 (das Tastenfeld):**

- **`npm test` → 278/278 grün** (271 vorher, **7 neu** in
  `src/ui/keypad.test.ts`): 36 Positionen in der richtigen Ordnung, jede genau
  einmal, **Deckungsgleichheit mit `CHARACTER_ORDER`** (Mengenvergleich, keine
  Selbstbestätigung), der Umbruch auf die Ziffern liegt nicht ohnehin am
  Reihenanfang, die Schwelle bei 12/13 und die Monotonie über 0…36.
  **Regression:** die 271 Fälle davor sind unverändert grün — an der Engine ist
  keine Zeile angefasst.
- **`npm run build` → sauber.** Bundle-Delta: JS **195,78 kB roh / 61,85 kB
  gzip** (vorher 195,45 / 61,67 — Delta **+0,33 / +0,18**), CSS **12,49 / 2,99**
  (vorher 12,12 / 2,90 — Delta **+0,37 / +0,09**). Zusammen **+0,27 kB gzip**.
  Keine neue Abhängigkeit.
- **Browser-Durchlauf gegen `dist/`** (headless Chromium, 390 × 844,
  `--autoplay-policy=no-user-gesture-required`, Lernstand vorab in
  localStorage gesetzt):

  1. **Die Schwelle greift genau dort:** bei 12 aktiven Zeichen steht
     `.answers` und kein `.keypad`, bei 13 umgekehrt.
  2. **Bei 15 aktiven Zeichen:** 36 Tasten, davon **15 bedienbar und 21
     gedimmt**. Bei 36 aktiven: 36 Tasten, **0 gedimmt**.
  3. **Maße gemessen, nicht gerechnet:** Taste **50,3 × 52,0 px**
     (`--tap` = 44 als `min-height` darunter), Schrift **Newsreader 20 px,
     Gewicht 500**. **Kein horizontales Scrollen**, und die Seite ist **exakt
     844 px** hoch — das Tastenfeld passt auf ein 390er-Telefon, ohne zu
     scrollen.
  4. **Die Ziffernreihe beginnt links:** `0` liegt auf x = 24 (Spalte 1) in der
     Reihe unter Y und Z, nicht neben ihnen.
  5. **Feedback unverändert:** nach einem Fehlgriff trägt die richtige Taste
     `✓` und Amber, die getippte `✗` in Grau; der Screenreader liest an
     derselben Taste „— this was the character" bzw. „— your answer, not the
     character". Nie Farbe allein (CLAUDE.md 6).
  6. **Tastatur am Desktop unverändert:** `a` beantwortet, solange A im Satz
     ist; `b` (bei 15 Zeichen nicht im Satz) löst nichts aus.
  7. **Speed round mit drei langsamen Zeichen:** das Tastenfeld bleibt,
     bedienbar sind genau die drei Positionen des Drill-Satzes.
  8. **Der Echo-Check des Lernmodus** rendert weiter `.answers` und **kein**
     `.keypad` — Ruling Punkt 3 gehalten.
  9. **Keine Konsolenfehler** in keinem der Durchläufe.
- **Amber-Budget geprüft** (alle sichtbaren Flächen, deren Rahmen, Text oder
  Füllung `--amber` oder `--amber-deep` trägt): im Antwort-Zustand **keins**,
  im Feedback nach einem Fehlgriff **genau eine Fläche** (die richtige Taste),
  im Feedback nach einer richtigen Antwort **keins**. Amber steht also nie
  zweimal in dieser View (1.1 §4).
- **Timing-Budget: unberührt.** Es ist keine Zeile an Engine, Zeitachse oder
  Player geändert; die Tonplanung läuft unverändert über die Audio-Uhr. Neu ist
  je Render ein `Set` über den Pool (höchstens 36 Einträge) und 36 Tasten im
  DOM statt so vieler, wie der Satz gerade groß ist — bei 15 aktiven Zeichen
  also 21 Knoten mehr. Beides ist konstant und liegt außerhalb des
  Eingabepfads; über eine Sitzung wächst nichts.

**Aus Runde L1 (Learn-Bereich):**

- **`npm test` → 271/271 grün** (221 vorher, **50 neu**). Die neuen liegen in
  `tools/learn/pages.test.mjs`: Frontmatter (auch die fünf Abbruchfälle),
  Adressen, genau eine H1 als H1-Regel, CTA-Erkennung, Tabelle ohne leeres
  `thead`, der Kopf einer Seite Zeile für Zeile — und zum Schluss **sieben
  Fälle gegen die echten 14 Dateien**, keine Testvorlage: Paarigkeit,
  Head-Pflichten je Datei, interne Links nur auf existierende Adressen,
  Rückweg zum Pillar, Hub-Vollständigkeit, Sitemap.
- **`npm run build` → sauber**, inklusive der 14 Seiten. Bundle-Delta der App
  ist klein, weil an ihr fast nichts geändert wurde: JS **195,45 kB roh /
  61,61 kB gzip** (vorher 195,32 / 61,57 — Delta **+0,13 / +0,04**), CSS
  **12,12 / 2,92** (vorher 11,96 / 2,88 — Delta **+0,17 / +0,05**). `marked`
  läuft im Build und landet in keinem Bundle.
- **Der Learn-Bereich selbst:** 14 Seiten zusammen **112 kB HTML** (Hub 4,9 kB
  / 1,6 kB gzip; Pillar 8,4 / 3,2; Alphabet 9,5 / 2,7), `learn.css` **9,5 kB /
  4,0 kB gzip**, dazu die vier woff2 mit **132 kB**. Sitemap 6,3 kB.
- **`npm run verify:learn` → „Alle Pflichten erfüllt: 14 Seiten, Sitemap,
  Assets, Service Worker."** Das Skript liest die **gebauten** Dateien und
  prüft je Seite: genau eine `<h1>`, `lang`, `canonical` auf sich selbst,
  `hreflang` für beide Sprachen plus `x-default`, Open Graph vollständig
  (inklusive: das OG-Bild liegt wirklich in `dist/`), JSON-LD parsebar und
  Feld für Feld gegen das Frontmatter, keine Überschriftensprünge. Dazu die
  Sitemap (15 `<loc>`, jede zeigt auf eine existierende Datei), das Stylesheet
  (Token-Block eingesetzt, **kein Farbliteral außerhalb**) und der Service
  Worker. Die acht Berichte sind die Titel- und Beschreibungslängen aus dem
  Kopf dieser Übergabe — Fehler sind es nicht.
- **hreflang-Gegenprobe in beide Richtungen, auf der Platte.** Für jede der 14
  Seiten folgt `verify.mjs` dem `hreflang`-Verweis bis zu der Datei, die dort
  wirklich liegt, und liest deren Verweis zurück — plus die Bedingung, dass
  beide dasselbe `x-default` nennen (immer die englische Fassung, EN-first).
  Ein Generator, der sich konsequent irrt, fällt einem Test über seine eigenen
  Funktionen nicht auf; dieser Probe schon. 14 von 14 stimmen in beide
  Richtungen.
- **Browser-Durchlauf, alle 14 Seiten** (headless Chromium gegen `dist/`,
  390 px): Status 200, **genau eine `<h1>`**, **genau eine gefüllte
  Amber-Fläche** (der CTA — das Amber-Budget aus 1.1 §4 hält auf jeder Seite),
  **kein horizontales Scrollen**, beide Schriftfamilien wirklich geladen
  (`document.fonts.check`), **keine Konsolenfehler und kein fehlgeschlagener
  Abruf**. Bei 1280 px ist die Lesespalte **exakt 680 px** (1.1 §6), die
  Fließtext-Linkfarbe `rgb(146, 64, 14)` = `--amber-deep`.
- **Der Service Worker, verhaltensweise geprüft** — das ist der Nachweis, der
  zählt, nicht der Blick in die Datei:

  1. Der Worker kontrolliert die App; der Vorab-Cache enthält `/`, Manifest,
     Icon und die gehashten Assets — **keine Learn-Adresse**.
  2. Unter `'/'` liegt die App-Shell (enthält `id="root"`).
  3. **Nach einem Besuch auf `/learn/`**: unter `'/'` liegt weiterhin die
     App-Shell, **nicht** der Artikel; die Learn-Seite liegt unter ihrem
     eigenen Schlüssel `/learn/` (stale-while-revalidate), dazu `learn.css` und
     die zwei tatsächlich benutzten Schriftschnitte. Das ist genau die Falle
     aus §3i, und sie ist zu.
  4. **Offline** liefert die Wurzel weiter die App (Status 200, `#root`
     gerendert).
- **Der Weg aus der App hinein:** About-Screen, „Learn more about Morse" →
  `/learn/`, Zielfläche gemessen **142 × 44 px** (die 44 aus 1.1 §6 — ein `<a>`
  ist `inline`, dort greift `min-height` nicht; mit `inline-flex` schon).
  Farbe `--gray`, keine gefüllte Amber-Fläche in dieser View. Screenshot:
  [`docs/screenshots/about-learn-link-390.png`](./docs/screenshots/about-learn-link-390.png).
- **Kontraste gerechnet, nicht geschätzt** (WCAG-Formel, sRGB): `--ink` auf
  `--paper` **14,87:1**, `--gray` **5,14:1**, `--amber-deep` **6,30:1**,
  `--amber` **4,46:1** (deshalb steht Fließtext-Amber auf der dunkleren Stufe,
  §3i), `--paper` auf `--amber` **4,46:1** für die CTA-Beschriftung — dieselbe
  Kombination wie die Primär-Knöpfe der App.
- **Glyphenabdeckung der Inhalte geprüft:** alle Zeichen der 14 Dateien liegen
  in den vier woff2-Subsets — **außer `→`** (U+2192) in der CTA-Zeile. Details
  und Folgen: FINDINGS §4.
- **Screenshots** (Hub und Pillar in 390 und 1280 px, wie in §7 des Konzepts
  gefordert; dazu die Alphabet-Seite mit den Tabellen und der deutsche Hub):
  `learn-hub-390/1280`, `learn-pillar-390/1280`, `learn-alphabet-390/1280`,
  `learn-hub-de-390/1280` in [`docs/screenshots/`](./docs/screenshots/).

**Was nicht nachgewiesen ist:** **Lighthouse ist in dieser Umgebung nicht
gelaufen.** CONCEPT-LEARN §7 lässt dafür ausdrücklich die „gleichwertige
Prüfung der Head-Tags" zu — das ist `verify:learn` plus der Browser-Durchlauf
oben. Ein Lighthouse-Lauf auf der Live-Seite bleibt eine sinnvolle Gegenprobe
nach dem Deploy. Ebenfalls offen und menschlich: **Screenreader über die
Alphabet-Tabelle** (siehe FINDINGS §5) und die Darstellung der OG-Karte, wenn
jemand einen Link teilt.

**Aus Runde F1:**

- **`npm test` → 221/221 grün** (146 vorher, **75 neu**): 37 für den Streak,
  17 für die Einstellungen und den Heimton, 21 für den Drill. Kein einziger
  davon stellt eine Uhr — Monatswechsel, Jahreswechsel und der 29. Februar sind
  gewöhnliche Eingaben. Beim Drill sind die beiden Zusagen der Runde einzeln
  geprüft: das Wachstumsfenster bleibt stehen, **und** der Zeichensatz wächst
  nicht, obwohl die Regel in dem präparierten Stand sonst gegriffen hätte
  (Gegenprobe: die normale Sitzung tut beides weiterhin).
- **`npm run build` → sauber.** Bundle **195,07 kB roh / 61,57 kB gzip**
  (vorher 187,04 / 59,06 — Delta **+8,03 / +2,51**), CSS **11,96 / 2,86**
  (vorher 11,40 / 2,74 — Delta **+0,56 / +0,12**). Keine neue Abhängigkeit.
- **Browser-Durchlauf: 44 von 44 Prüfungen** (headless Chromium gegen den
  Dev-Server, 390 px, präparierte Stände im Init-Script). Abgedeckt:

  - **Streak:** „Day 6 — freeze ready." bei einem Stand von gestern; „Day 7 —
    freeze used yesterday." nach verbrauchtem Freeze; nach zehn Tagen Pause
    **„Starting fresh."** statt einer alten Zahl. Danach eine **ganze echte
    Sitzung** (20 Runden, echte Töne, echte Antworten): die Zeile steht auf
    „Day 7", und im localStorage steht der heutige Tag.
  - **Timing-Budget unberührt:** 53 Töne geplant, **keiner in der
    Vergangenheit**, kleinster Vorlauf 0,080 s. Player und Engine-Timing sind
    nicht angefasst; die Lautstärke ist der einzige veränderliche Wert und
    liegt in der Hüllkurve, nicht im Raster.
  - **Settings:** Menü mit sechs Einträgen in der richtigen Reihenfolge, Fokus
    landet auf der Überschrift, Regler 500–800 Hz mit Default 620, die ehrliche
    Zeile steht wörtlich da. **Kein Autoplay** (nach dem Schieben beider Regler:
    null Töne). Der Probeton spielt **instrumentiert nachgemessen** 760 Hz bei
    Lautstärke 0,5. Danach ins Training zurück: Eyebrow **„Ready · 760 Hz"**,
    und der gespielte Ton ist auch 760 Hz.
  - **Die Sync-Grenze, negativ geprüft:** `projekt-morse:device` trägt die
    Werte, und der Lernstand enthält weder `toneHz` noch `volume`.
  - **Speed round:** Einladung „U and R are still slow to land." (langsamstes
    zuerst), Kopfzeile „Speed round · Round 1 / 10", Antwort-Gitter nur aus
    U und R, **kein Menü mitten im Drill**, Fokus liegt nach dem Start auf dem
    Play-Kreis. Nach zehn Runden: „Speed round done", **keine zwei
    verschiedenen Zahlen namens „Median"**, Ergebniszeile im erlaubten Format.
    Gegengelesen im localStorage: `recentAnswers` (30 Einträge) und
    `answersSinceGrowth` (12) **unverändert**, Zeichensatz unverändert, die
    Statistik von R und U dagegen um je zehn Versuche gewachsen, und der Tag
    ist verbucht.
  - **Amber-Budget je View ≤ 1**, am gerenderten Ergebnis gezählt: Start-Screen
    0 (mit und ohne Einladung), Abschluss-Screen 1 (`button-primary`), Menü 1
    (der aktuelle Punkt), Settings 1 (der Probeton-Knopf), Drill-Abschluss 1.
    **Gezählt wird pro Element**, wenn Fläche, Rahmen **oder** eigene
    Textfarbe `--amber` bzw. `--amber-deep` trägt; der Fokusring bleibt draussen
    (er ist ein Zustand, keine Fläche, und WCAG verlangt ihn). Der Zeiger muss
    dabei geparkt sein — die Hover-Fallgrube aus §7 hat auch in dieser Runde
    einmal zugeschlagen und eine Menü-Zählung auf 2 gebracht.
  - **Kein unbehandelter Skriptfehler** auf keinem der Wege.
- **Der Sync mit den neuen Feldern, im Browser durchgespielt — 12 von 12.**
  Zwei „Geräte" als zwei Browser-Kontexte gegen `wrangler pages dev` mit
  lokaler D1, der Passkey des ersten in den zweiten kopiert (genau das, was ein
  synchronisierter Passkey tut).

  - **Der Server trägt den Streak — ohne dass eine Server-Zeile davon weiss.**
    Das ist §3a in der Praxis: der Server ist ein Fach, ein neues Feld im
    Lernstand braucht dort keine Zeile. Gegengelesen über `GET /api/progress`.
  - **Und er trägt die Einstellungen nicht.** Gerät A hatte 760 Hz und 50 %
    gesetzt; im Blob auf dem Server kommen weder `toneHz` noch `volume` vor.
  - **Der Merge stuft nicht zurück, end-to-end:** Gerät A hat sieben Tage
    (zuletzt gestern) und einen Freeze im Vorrat, Gerät B ist frisch aufgesetzt
    und hat heute geübt — für sich genommen ein Streak von 1. Nach dem Login
    auf B steht **Day 8 — freeze ready.** auf dem Start-Screen, und der
    zusammengelegte Stand geht sofort zum Server zurück.
  - **Ein Stand von vor dieser Runde** (ohne `streak`-Feld) lädt weiter, zeigt
    neutral „Starting fresh." statt einer erfundenen Reihe und behält seine
    Statistik.
- **Ein Fehler, den erst der Durchlauf gezeigt hat — und der Fix:** die
  Ergebniszeile des Drills verschwand **genau dann, wenn der Drill geholfen
  hatte.** Sie fragte am Ende neu, welche Zeichen langsam sind — und wenn die
  Übung gewirkt hatte, war die Antwort „keine", also gab es nichts zu
  berichten. Die gedrillten Zeichen und ihr Vorher-Median werden jetzt **beim
  Start** festgehalten (`DrillTarget` in App.tsx). Vitest hätte das nicht
  gefunden: die Zeile entsteht in der UI, und ihr Fehler war eine Frage der
  Reihenfolge, nicht der Rechnung.

**Nicht nachgewiesen, ehrlich benannt (F1):**

- **Nichts davon ist auf Produktion geprüft** — die Umgebung kommt dort nicht
  hin (§5e), und diese Runde hat den Deploy nicht angefasst.
- **Der Drill ist nicht über zwei Geräte geprüft** — es gibt daran auch nichts
  Geräteübergreifendes: er schreibt nur die Statistik pro Zeichen, und für die
  gilt die Merge-Regel aus Runde B unverändert.
- **Kein Hörtest mit Menschen.** Ob 500 Hz auf einem Telefonlautsprecher noch
  trägt und ob 5 % Lautstärke leise genug sind, weiss hier niemand.

**Aus Runde B (unverändert gültig):**

- **`npm test` → 146/146 grün** (114 vorher, **32 neu** für den Sync). Darunter
  die drei Kanten aus der Vorgabe (frisches Gerät + volles Konto, voller lokaler
  Stand + leeres Konto, beide voll), der Nachweis, dass pro Zeichen der
  Datensatz *als Ganzes* wandert, dass die Funktion ihre Eingaben nicht anfasst
  und idempotent ist, sechs Tests für die Grenze „gelernt vs. gespeichert" und
  **drei für die Monotonie des Zeichensatzes** (#56): der größere Satz bleibt
  auch gegen den jüngeren Stand, kein aktives Zeichen geht von einer der beiden
  Seiten verloren, und das Ergebnis ist in beiden Argument-Reihenfolgen dieselbe
  Menge.
- **`npm run build` → sauber**, und er prüft jetzt zwei Projekte (`src/` und
  `functions/`). Bundle **187,04 kB roh / 59,06 kB gzip** (vorher 176,26 /
  56,23 — Delta **+10,78 / +2,83**), CSS **11,40 / 2,74** (vorher 10,90 / 2,67).
  `@simplewebauthn/server` ist **nachweislich nicht im Bundle**.
- **Der ganze Konto-Weg ist im Browser durchgespielt — 49 von 49 Prüfungen**,
  nach dem #56-Fix und nach den 5xx-Fixes je noch einmal vollständig wiederholt.
  Headless Chromium gegen `wrangler pages dev` mit lokaler D1 (vor dem Lauf
  zurückgesetzt), Passkeys aus dem virtuellen Authenticator (CDP
  `WebAuthn.enable` + `addVirtualAuthenticator`, ctap2/internal/resident).
  Abgedeckt:

  - **Local-first, negativ geprüft:** ohne Konto löst die App **keinen einzigen**
    `/api/`-Aufruf aus (mitgezählt, nicht vermutet).
  - **Menü:** fünf Einträge, Account an vierter Stelle; Fokus landet auf der
    Account-Überschrift.
  - **Abgemeldet:** die Zeile zum Ist-Zustand, beide CTAs, **genau ein Amber**
    in der View (am gerenderten Ergebnis gezählt).
  - **Passkey anlegen:** der Authenticator hält genau einen Resident-Passkey für
    `localhost`; der Server hat danach den lokalen Stand (acht aktive Zeichen,
    K mit 40 Versuchen); die Statuszeile sagt „Synced · just now".
  - **Sitzung:** HttpOnly + Secure + SameSite=Lax im Browser abgelesen,
    `document.cookie` enthält sie **nicht**. Lokal steht nur `{linked,
    lastSyncedAt}` — kein Token.
  - **Angemeldet: kein Amber** in der View (gezählt, inklusive Rahmenfarben —
    siehe die Screenshot-Fallgrube in §6).
  - **Abmelden:** `/api/progress` antwortet 401, der lokale Stand ist unberührt.
    **Wieder anmelden** mit demselben Passkey stellt die Sitzung her.
  - **Eine ganze echte Sitzung** (20 Runden, echte Töne, echte Antworten), dann
    **Push am Sitzungsende**: `updated_at` wächst, und der hochgeschobene Stand
    ist byte-genau der lokale (100 Versuche hier, 100 dort).
  - **Merge auf einem zweiten „Gerät"** (zweiter Browser-Kontext, der Passkey
    des ersten hineinkopiert — genau das, was ein synchronisierter Passkey tut).
    Der Stand des zweiten Geräts hat **Z** aktiv, das Konto **P** und **T** —
    damit ist die Vereinigung in beide Richtungen prüfbar und nicht nur in einer.
    Ergebnis: aktiver Satz `KMRSUAZPT` (die volle Vereinigung, ohne Dubletten,
    lokale Reihenfolge zuerst); pro Zeichen der Datensatz mit mehr Versuchen
    (M = 60 lokal schlägt 40 im Konto; K = 40 aus dem Konto); ein nur lokal
    bekanntes Z bleibt; `introducedCharacters` ist die Vereinigung; der
    Sitzungszähler sinkt nicht; Einmal-Merker fallen nicht zurück — und der
    zusammengelegte Stand geht sofort zum Server zurück.
  - **Der Zeitstempel-Fund, als Prüfung festgehalten:** das bloße Öffnen der App
    setzt den Lern-Zeitstempel nicht hoch (gemessen: 60 Minuten alt geblieben).
  - **`/api/*` blockiert (der local-first-Beweis):** die App startet
    vollständig, die Einführung läuft, der Lernmodus läuft, eine echte Runde
    mit Ton läuft durch, der Fortschritt wird gespeichert und überlebt einen
    Reload, der Progress-Screen funktioniert. „Create a passkey" gibt **eine
    ruhige Zeile** („No connection to the server. Your progress stays on this
    device.") statt eines Modals — ohne Ausrufezeichen und ohne Schuldton. Kein
    unbehandelter Skriptfehler auf dem ganzen Weg.
  - **Der klemmende Server (5xx) — genau der Zustand von Produktion, solange
    die D1-Bindung fehlt:** „Create a passkey" sagt „The server is not
    available right now. Your progress stays on this device." und **nicht**
    „dein Passkey hat nicht funktioniert". Und beim Löschen meldet ein 500
    keinen Erfolg: die Zeile heißt „The server did not confirm this. Nothing was
    deleted.", der lokale Konto-Merker bleibt stehen, die Sitzung ist noch
    gültig (also ist das Konto wirklich noch da), und die Bestätigung bleibt
    offen, damit ein zweiter Versuch ein Klick ist.
  - **Löschen (DSGVO):** die Bestätigung sagt ausdrücklich, dass der lokale
    Stand bleibt; **kein Amber und kein Rot** in der Bestätigung; danach 401,
    der lokale Lernstand ist vollständig erhalten, und mit dem gelöschten
    Passkey ist **keine Anmeldung mehr möglich** („No account found for that
    passkey.", im Ruhe-Ton). **Auf Datenbank-Ebene gegengelesen: `users`,
    `credentials` und `progress` stehen danach auf 0.**
- **Nebenbefund, sofort behoben, weil er mit Sync ein echter Fehler geworden
  wäre:** der Service Worker cachte `/api/*` per stale-while-revalidate. Eine
  sitzungsgebundene Antwort im Cache wäre ein fremder Lernstand für den nächsten
  Aufruf. `/api/` ist jetzt ausgenommen — zwei Riegel, denn jede API-Antwort
  trägt zusätzlich `Cache-Control: no-store`. (Kein FINDINGS-Eintrag: das
  Problem entsteht *durch* diese Runde, es war keins vorher.)
- **Timing-Budget: unberührt.** Weder Player noch Engine-Timing sind angefasst.
  Auf dem Eingabepfad einer Übung ist nichts dazugekommen — der Push liegt am
  *Ende* einer Sitzung, wenn kein Ton mehr läuft und keine Reaktionszeit mehr
  gemessen wird, und `pushProgress` kehrt ohne Konto sofort um. Das eine neue
  Stück Rechnung auf dem Schreibpfad (`learningRevision`, eine Summe über eine
  Handvoll Zeichen) läuft im Leerlauf-Schreiber, nicht bei der Eingabe.
- **Screenshots** (390 px): `account-signed-out-390.png`,
  `account-signed-in-390.png`. Beim Ziehen ist die Fallgrube aus §7 wieder
  zugeschlagen — der Zeiger stand nach dem Klick genau auf „Sign out", das dann
  im Hover-Amber stand. Maus wegbewegen, dann erst Bild; zusätzlich prüft jetzt
  eine Prüfung, dass die eingeloggte View **kein** Amber trägt.

**Aus den Runden davor (unverändert gültig):** ARRL-Referenz („PARIS bei 5 WpM
= 12 s") prüft gegen den Standard statt gegen die Implementierung; Amber nie
zweimal in einer View über zwölf Ansichten am gerenderten Ergebnis gezählt; das
Gehäuse mit 27 von 27 Prüfungen; Klang-Variabilität mit instrumentierten
Oszillatoren; Wachstum, Lernmodus und Einführung im Browser durchgespielt;
Offline-Betrieb und der SW-Update-Pfad auf Produktion belegt; Timing-Budget
gemessen (52 Töne, keiner in der Vergangenheit geplant, Quantisierung 0,023 ms
bei 44,1 kHz, Budget < 1 ms).

**Nicht nachgewiesen, ehrlich benannt:**

- **Passkeys auf echter Hardware sind nicht getestet.** Der virtuelle
  Authenticator ist ein sehr guter Stellvertreter für das Protokoll, aber er ist
  kein Touch ID, kein Windows Hello und kein YubiKey. Insbesondere ungetestet:
  wie der Dialog aussieht, wenn `userName` überall „Morse Lab" heißt (§5f), und
  ob ein Cloud-Passkey mit konstantem Signaturzähler durchläuft (spezifiziert
  ist es; der Code nimmt den Wert, wie er kommt).
- **Auf Produktion ist von dieser Runde nichts geprüft.** Alles oben ist lokal
  gegen `wrangler pages dev` belegt. Die D1 steht dort inzwischen (§5e), aber
  der Nachweis am laufenden System steht aus — er ist an Fable übergeben.
- **Kein Hörtest, kein Screenreader-Durchgang, keine echte Hardware, keine
  PWA-Installation auf einem Telefon.** Unverändert offen und weiterhin die
  wichtigsten menschlichen Prüfungen.
- **Die Wachstums-Schwellen sind eine Setzung** (90/5/75/20/30). Ob sie gut
  *lehren*, zeigen erst Nutzungsdaten.
- **Kein Lasttest, keine Missbrauchsbremse.** `/api/auth/*` ist ungedrosselt.
  Cloudflare bringt Grundschutz mit, aber ein Rate-Limit ist keine Zeile, die
  hier still dazukäme — siehe §5f.

## 5. Deployment und Betrieb

### 5a. Cloudflare Pages (unverändert)

**Produktions-URL: https://projekt-morse.pages.dev**, Projekt
`projekt-morse`, Git-Anbindung an `Erikemmer/projekt-morse`.
Production-Branch `main`, Build `npm run build`, Output `dist`, keine
Umgebungsvariablen, Preview-Deployments für alle Branches.

**Custom Domain `morse-lab.com` — live.** Fable hat den fehlenden DNS-Eintrag
per Chrome angelegt (heute); die Domain validiert und liefert aus. Zone
`2bef7122ee328f9197516d727b9929a2`, Cloudflare-Nameserver. Der Eintrag:

| Feld | Wert |
|---|---|
| Typ | `CNAME` |
| Name | `morse-lab.com` (Apex, im Dashboard `@`) |
| Ziel | `projekt-morse.pages.dev` |
| Proxy | an (orange Wolke) — für Pages-Domains nötig |
| TTL | Auto |

Cloudflare flacht den Apex-CNAME selbst ab; ein A-Record war nicht nötig.
`projekt-morse.pages.dev` bleibt daneben erreichbar. **Für Passkeys ist ab
jetzt die Domain maßgeblich, unter der ein Schlüssel angelegt wurde** — was das
für einen späteren Wechsel heißt, steht unverändert in §3e.

### 5b. Der SW-Update-Pfad (unverändert belegt)

Auf Produktion zweimal durchgespielt: ein normaler Reload zeigt sofort den
neuen Stand (Navigation ist Netz-zuerst), der neue Worker installiert, `activate`
räumt den alten Cache weg, am Ende existiert genau einer. Ein Deploy, der nur
Dokumentation ändert, erzeugt **keinen** Cache-Wechsel — die Version leitet sich
aus den gehashten Asset-Dateinamen ab. Das ist richtig so.

**Neu in dieser Runde:** `sw.js` hat sich geändert (die `/api/`-Ausnahme). Der
Cache-Name hängt an den Assets, nicht am Worker-Inhalt — der Cache wechselt hier
also über die geänderten Assets, und der neue Worker installiert wie immer. Es
gibt keine `/api/`-Einträge aus der Vergangenheit, die aufzuräumen wären: vor
dieser Runde gab es keine API.

### 5c. Lokal entwickeln — mit Backend

```bash
npm install
npm run dev          # Vite, ohne Functions und ohne Service Worker
npm test             # Vitest, 146 Tests
npm run build        # tsc (src) && tsc (functions) && vite build

# Mit Backend, lokal:
npx wrangler d1 migrations apply morse-lab --local
npm run build && npx wrangler pages dev --port 8788 --ip 127.0.0.1
# -> http://localhost:8788   (NICHT 127.0.0.1: siehe §3e)
```

Lokal legt Wrangler die Datenbank unter `.wrangler/state/` an; `database_id`
spielt dabei keine Rolle, eine Cloudflare-Anmeldung auch nicht. **`--local` ist
hier kein Detail, sondern die Sicherung:** ohne das Flag ginge die Migration
gegen die Produktions-D1, und die ist schon migriert (§5e). `.wrangler/` ist
ignoriert.

### 5d. Umgebung und Werkzeuge

- Node v22.22.2, npm 10.9.7. React 18, Vite 6, TypeScript 5.7 (`strict`),
  Vitest 3 (**muss ≥ 3 bleiben**, sonst kollidieren zwei Vite-Typenbäume),
  wrangler 4.
- `defineConfig` kommt aus `vitest/config`; dieselbe Datei enthält das
  Precache-Plugin — wer `sw.js` anfasst, liest beide Kopfkommentare.
- **Browser-Durchläufe** (nicht committet, bewusst ad hoc): `npm i --no-save
  playwright-core`, Chromium unter
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Start mit
  `--autoplay-policy=no-user-gesture-required`. **Achtung:** jedes weitere
  `npm install` räumt `--no-save`-Pakete wieder weg. Skripte müssen im
  Projektordner liegen (Modulauflösung), nicht in `/tmp`.

### 5e. D1 auf Produktion — angelegt und verdrahtet, Nachweis offen

**Die Datenbank existiert.** Fable hat sie über den Cloudflare-Connector
angelegt (Notion-Log #60): Name `morse-lab`, Region **WEUR**,
`migrations/0001_accounts.sql` ist dort samt Migrations-Journal angewandt.
`wrangler.toml` trägt seit dem Nachtrags-Commit die echte
`database_id = "1df14984-0c7a-41a0-b839-c4855a05a82c"`.

**Nachgeprüft, nicht übernommen:** derselbe Connector war in dieser Session
verfügbar, und ein Abruf über die eingetragene ID liefert genau diese Datenbank
— `name: morse-lab`, `running_in_region: WEUR`, `version: production`,
**`num_tables: 5`**. Fünf ist die erwartete Zahl: die vier Tabellen der
Migration (`users`, `credentials`, `sessions`, `progress`) plus das Journal
`d1_migrations`. Die ID im Repo zeigt also auf die richtige, migrierte
Datenbank. (Ein `SELECT` auf `sqlite_master`, der die Namen einzeln bestätigt
hätte, hat die Umgebung abgelehnt — die Tabellenzahl ist das Beste, was von
hier aus belegbar ist.)

> **Keine `wrangler d1 migrations apply --remote` mehr gegen diese Datenbank.**
> Ein zweiter Lauf scheitert an bereits existierenden Tabellen. Der Stand ist
> vollständig; die nächste Migration heißt `0002_*`.

**Die Bindung `DB` kommt aus dieser Datei.** Pages liest `wrangler.toml` beim
Git-Build (config-as-code); ein Eintrag unter *Settings → Functions → D1
database bindings* ist dafür nicht nötig. Wirksam wird sie mit dem **ersten
Deploy nach dem Merge dieses Commits nach `main`** — Bindungen greifen nie
rückwirkend für schon gebaute Deploys.

**Was noch aussteht, und warum nicht hier:** der Nachweis am laufenden System.
Der Egress-Proxy dieser Umgebung sperrt `api.cloudflare.com` und
`dash.cloudflare.com` weiterhin vollständig (`connect_rejected`,
Organisations-Policy), und auch die Produktions-URL ist von hier nicht
abrufbar. **Die Verifikation übernimmt Fable von außen.** Das kleinste
belastbare Signal:

```
GET https://projekt-morse.pages.dev/api/progress   (ohne Sitzungs-Cookie)
  401  -> Bindung greift, die Function redet mit D1
  500  -> `env.DB` ist undefiniert, die Bindung greift noch nicht
```

**Der vollständige Durchlauf danach** (war für Runde B vorgesehen und ist
offen): Register → eine Sitzung spielen → Push → Login in einem zweiten
Browser-Kontext → Merge, dann Löschen inklusive Gegenlesen. Das Skript des
lokalen Durchlaufs (§4) lässt sich dafür wiederverwenden — nur `BASE` auf die
Produktions-URL zeigen und die vorbereiteten Stände beibehalten. **Ein echter
Passkey auf Produktion legt ein echtes Konto an**; es gehört am Ende des Laufs
über „Delete account and data" wieder weg, und der Durchlauf tut das schon.
**Vorher §3e lesen:** Passkeys hängen an der Domain, unter der sie angelegt
wurden — ein Konto von `projekt-morse.pages.dev` ist unter `morse-lab.com`
später nicht wiederzufinden.

**Falls die Bindung wider Erwarten nicht greift** (500 statt 401), ist der
Rückfallweg der alte, im Dashboard: **Workers & Pages → `projekt-morse` →
Settings → Functions → D1 database bindings** → *Add binding*: Variable name
**`DB`**, Database `morse-lab` — **für Production UND Preview je einmal** —,
danach einen neuen Deploy auslösen. Ein API-Token für den CLI-Weg bräuchte
**Account → D1 → Edit** (und für die Bindung **Account → Cloudflare Pages →
Edit**).

**Solange der Nachweis aussteht, ist der Zustand nicht kaputt** — aber er ist
nicht derselbe wie „offline". Ohne Bindung ist `env.DB` undefiniert, die
Function läuft auf einen Fehler und Pages antwortet **500**. Genau dafür
unterscheidet der Client seit Runde B 5xx von einer Ablehnung: „Create a
passkey" sagt dann „The server is not available right now. Your progress stays
on this device." statt fälschlich den Passkey zu beschuldigen, und ein
Löschversuch meldet keinen Erfolg. Beides ist im Browser nachgewiesen (§4).
Geübt wird unterdessen normal weiter.

### 5f. Die drei Punkte aus Review 9 — zwei geregelt, einer offen

1. ~~**Der aktive Zeichensatz kommt vom jüngeren Stand und das kann Wachstum
   kosten.**~~ **Geregelt und umgesetzt** (Ruling Notion-Log #56): der aktive
   Satz ist jetzt die Vereinigung beider Stände, Wachstum ist monoton. Der Fall
   entfällt. Begründung, Preis und Tests in §3b.
2. ~~**`/api/auth/*` ist ungedrosselt.**~~ **Geregelt** (Ruling #56): 10
   Anfragen pro Minute und IP auf `/api/auth/*`. **Noch nicht angelegt** — es
   fehlen die Cloudflare-Rechte; die exakten Schritte stehen in §5h.
3. **Im Passkey-Dialog heißt jedes Konto „Morse Lab" — bleibt offen.** Es gibt
   keinen Nutzernamen, und einen zu erfinden wäre schlimmer. Folge: zwei Konten
   auf demselben Gerät sind in der Passkey-Liste des Betriebssystems nicht
   unterscheidbar. Für V1 in Kauf genommen. Wenn das störend ist, wäre das
   Minimum ein Zeitstempel im Label („Morse Lab · Sept 2026") — sichtbar, aber
   immerhin kein personenbezogenes Datum. **Vor der Entscheidung gehört ein
   Blick auf echte Hardware** (§4, „nicht nachgewiesen"): wie der Systemdialog
   das Konto benennt, sieht man im virtuellen Authenticator nicht.

Weiterhin gilt, unabhängig vom Rate-Limit: **es gibt kein globales Aufräumen
abgelaufener Flow-Zeilen.** Sie verfallen nach fünf Minuten und werden beim
nächsten Zugriff derselben Sitzung weggeräumt; ein Vollscan auf dem Anfragepfad
wäre schlimmer. Wenn das Aufräumen gewollt ist, ist ein Cron Trigger der
richtige Ort — nicht der Request-Pfad.

### 5h. Die Rate-Limit-Regel (Ruling #56) — angelegt

**Steht seit heute** (Fable per Chrome, Zone `morse-lab.com`):

| Feld | Wert |
|---|---|
| Name | `auth-rate-limit` |
| Pfad | `/api/auth/` (starts with) |
| Charakteristik | IP |
| Schwelle | **4 Anfragen / 10 Sekunden** |
| Aktion | Block |

**Der Vorbehalt aus der letzten Übergabe hat sich erledigt:** Rate-Limiting ist
tatsächlich ein Zonen-Feature, und mit `morse-lab.com` in der eigenen Zone
(§5a) ließ sich die Regel anlegen. Auf `*.pages.dev` allein wäre sie es nicht
gewesen — die Reihenfolge DNS-zuerst war also richtig.

**Zur Schwelle 4/10 s** (das Ruling nannte 10/Minute, angelegt ist die
schärfere und zugleich mildere Variante): ein vollständiger Anmelde- oder
Registriervorgang sind genau **zwei** Anfragen (`options` + `verify`). 4 pro
10 Sekunden lassen also zwei Versuche in schneller Folge — für eine Person
reichlich, für ein Skript nichts. Über eine Minute gerechnet erlaubt das mehr
als das Ruling, in einem Burst deutlich weniger; für Credential-Stuffing zählt
der Burst. **Der Fall, der davon zu Unrecht getroffen werden kann:** viele
Nutzer hinter einer IP (Schule, Büro, Mobilfunk-NAT). Wenn das je auffällt, ist
die Charakteristik das Stellrad, nicht die Zahl — mit einer bezahlten Stufe
ließe sich statt der IP ein Client-Merkmal nehmen. Für V1 ist die IP richtig,
weil es keinen Nutzernamen gibt, an dem man drosseln könnte.

**Was die Regel nicht löst:** abgelaufene Flow-Zeilen werden nur beim nächsten
Zugriff derselben Sitzung weggeräumt, nicht global (§5f). Ein Rate-Limit bremst
das Auffüllen, es räumt nicht auf. Wenn das gewollt ist, ist ein **Cron Trigger**
der richtige Ort — ein `DELETE FROM sessions WHERE expires_at <= now`, einmal
pro Stunde. Bewusst nicht gebaut: das ist ein eigener Worker und damit eine
eigene Aufgabe.

### 5i. Ältere offene Punkte (unverändert)

**Gefallen und umgesetzt:** Zeichen-für-Zeichen, retrieval-only, EN-first,
Design „Ruhe", Wachstumsregel, PWA mit selbst gehosteten Schriften, das
Gehäuse, Accounts, seit Runde F1 der Streak mit Freeze-Gnade, die
Einstellungen und die Speed round — **und seit L1 der Learn-Bereich.**

**Offen, bewusst nicht angefasst:** nur Einzelzeichen
(keine Fünfergruppen, kein Klartext); kein Dark Mode (Rollen stehen, kein
`prefers-color-scheme`-Block); Satzzeichen fehlen in `CHARACTER_ORDER`;
Variabilitäts-Stufe 3 (QRN) nicht gebaut; „Visual practice" als opt-in-Modus
(die offene Zusage aus 1.1 §12, siehe Addendum (a) in CLAUDE.md §2.9).

Die drei Abweichungen vom Mockup und die zwei Lernmodus-Fragen aus den
Vorrunden stehen unverändert in der Übergabe der Runde davor (Git-Verlauf) und
warten weiter auf ein Urteil.

### 5j. Der Learn-Bereich im Deploy (neu in L1)

**Es ist nichts zu konfigurieren.** Cloudflare Pages baut mit `npm run build`
und liefert `dist/` aus — der Generator hängt in diesem Skript, also entstehen
die Seiten beim Deploy von selbst. Pages liefert für `/learn/` das
`index.html` des Verzeichnisses; es braucht kein `_redirects` und keine
Function. Die Functions in `functions/api/` sind unberührt.

Nach dem ersten Deploy, in dieser Reihenfolge:

1. **Die Adressen stichprobenweise abrufen** — `/learn/`, `/de/lernen/`, je ein
   Artikel, `/sitemap.xml`, `/learn/assets/learn.css`, `/og-morse-lab.png`.
   Lokal gegen `dist/` sind alle sechs 200 (§4).
2. **`sitemap.xml` in der Search Console einreichen** (und in Bing Webmaster
   Tools, falls gewünscht). Das ist der Schritt, der den Bereich überhaupt
   findbar macht — ohne ihn liegt er nur da. Es gibt keine `robots.txt`, also
   auch keine `Sitemap:`-Zeile; siehe §3i.
3. **Den Cache-Wechsel des Service Workers nachsehen** wie nach jedem Deploy
   mit geänderten Assets (§5a): genau ein Cache am Ende, der neue.
4. **Lighthouse einmal auf `morse-lab.com/learn/how-to-learn-morse-code/`** —
   die Gegenprobe, die in dieser Umgebung nicht möglich war (§4).
5. **Eine OG-Karte teilen** und ansehen (Slack, Signal oder der
   Facebook-Sharing-Debugger). Das Bild liegt als PNG 1200 × 630 bereit; ob es
   gut *aussieht*, ist eine Design-Frage und gehört Fable.

**Der Bereich ist nicht Teil der Offline-App.** Wer offline `/learn/` aufruft,
ohne die Seite vorher besucht zu haben, bekommt die Netzwerkfehlerseite des
Browsers. Das ist so entschieden (CONCEPT-LEARN §3) und kein Fehler: die App
ist offline, die Artikel sind eine Website.

## 6. Fallgruben

- **Der Container ist flüchtig — früh pushen.** Beide Sessions dieser Runde:
  jeder Commit sofort gepusht.
- **„Lokale Session" heißt hier nicht lokal.** Beide Sessions dieser Runde
  liefen im Remote-Container, auch die als lokal beschriebene. Vor jeder Aufgabe,
  die einen Pfad auf dem Rechner des Owners nennt: **erst nachsehen, dann
  planen** (`ls`, `mount`). Zweimal an derselben Aufgabe verloren (§3f).
- **`~/Downloads/` gibt es hier nicht.** Wer Owner-Dateien braucht, braucht sie
  im Repo oder gar nicht (§3f). Im konkreten Fall hat sich die Frage erledigt:
  die Vermessung zeigte, dass die Konstruktion im Repo bereits korrekt war
  (Log #61) — die Regel bleibt trotzdem gültig.
- **Cloudflare ist vom Egress-Proxy gesperrt** — `api.cloudflare.com` und
  `dash.cloudflare.com` antworten mit `connect_rejected`. Alles, was über die
  Cloudflare-API läuft (D1 anlegen, WAF-Regeln, DNS), ist von hier aus
  unmöglich, **auch mit Zugangsdaten**. In der Runde, die Pages eingerichtet
  hat, war das noch anders — die Sperre ist eine Eigenschaft der Umgebung, nicht
  des Projekts. Erst `curl` gegen die API, dann planen.
- **Für WebAuthn lokal `localhost` benutzen, nicht `127.0.0.1`** — eine RP ID
  muss ein Domainname sein (§3e).
- **`addInitScript` läuft bei *jeder* Navigation, auch beim Reload.** Wer damit
  einen Stand präpariert, braucht eine Einmal-Sperre — sonst testet er seinen
  eigenen Seed statt der App. Zweimal zugeschlagen (Variabilitäts-Runde und
  diese).
- **Ein `evaluate` nach dem Laden verliert das Rennen gegen den
  Leerlauf-Schreiber der App.** Präparierte Stände gehören ins Init-Script,
  nicht hinter das `goto`.
- **Screenshots: die Maus wegbewegen.** Nach einem Klick steht der Zeiger auf
  dem Knopf, der danach an dieser Stelle liegt — der trägt dann Hover-Amber und
  sieht wie eine Design-Verletzung aus. Und beim Menü erst das Einblenden
  abwarten (250 ms).
- **Fokus geht verloren, wo man ihn nicht vermutet** — nach jedem Umbau des
  Loops `document.activeElement` je Phase prüfen.
- **Service Worker + Vary-Header:** wer die Cache-Strategie ändert, behält
  `ignoreVary` bei oder weiß genau, warum nicht. Und **`/api/` bleibt
  ausgenommen.**
- **Ein Test, der offline prüfen will, muss die Seite *nach* der
  Worker-Übernahme neu laden** und vorher auf `controllerchange` warten.
- **Die lokale D1 nicht unter dem laufenden `wrangler pages dev` wegräumen.**
  Wer `.wrangler/state/v3/d1` löscht, während der Dev-Server läuft, bekommt
  danach auf jedem `/api/`-Aufruf einen 500 — der Server hält die gelöschte
  Datei noch. **Erst stoppen, dann löschen, migrieren, neu starten.** Kostete
  einen Durchlauf; nebenbei war es die ehrlichste Vorschau auf den Zustand von
  Produktion ohne D1-Bindung.
- **`create_repository` schlägt in dieser Umgebung fehl** (403). Zweites Repo:
  den Nutzer anlegen lassen.
- **Vite räumt `dist/` aus.** Wer einen Generator vor `vite build` laufen
  lässt, sieht sein Ergebnis nie. `build:learn` hängt deshalb hinten (§3i) —
  und `npm run build:learn` allein setzt einen vorangegangenen Vite-Build
  voraus.
- **`min-height` greift nicht auf einem `inline`-Element.** Der Link im
  About-Screen war damit 33 px hoch statt 44 — sichtbar wurde das erst beim
  Messen der Zielfläche, nicht im Screenshot (§4). Bei jedem `<a>`, der eine
  Zielgröße einhalten soll: `inline-flex` oder `inline-block`.
- **Die Navigationsstrategie des Service Workers cacht unter `'/'`, nicht
  unter dem Pfad.** Das war richtig, solange jede Seite die App-Shell war. Wer
  ein zweites Dokument an derselben Herkunft ausliefert, muss diesen Zweig
  anfassen — sonst startet die App offline als dieses Dokument (§3i). Und
  geprüft wird das im Browser, nicht durch Lesen: erst nach einem echten
  Besuch der neuen Adresse zeigt der Cache, was er hält.
- **`document.fonts.check` will die volle Deskriptor-Angabe** —
  `check('500 34px Newsreader')`, nicht `check('Newsreader')`. Ohne Gewicht und
  Größe antwortet es unbrauchbar.
- **Der Zeichensatz der Schriften ist kein Selbstverständnis.** Vor jedem neuen
  Textkorpus die cmap gegen die Zeichen prüfen (hier fiel `→` auf, FINDINGS §4).
  Ein fehlendes Zeichen bricht nichts — es sieht nur aus einer anderen Schrift
  aus, und das merkt man auf einem Screenshot kaum.

## 7. Nächster Schritt

**Diese Runde (U1) wartet auf Fables Review** — über das Repo; die beiden
Screenshots und die Messungen stehen in §4, die Begründungen in §3j. Zwei
Dinge brauchen dabei ein Urteil, keines blockiert etwas:

1. **Der Nebenbefund im Kopf dieser Übergabe** (auch
   [FINDINGS #6](./FINDINGS.md)): Echo-Check und „Learn the sounds" tragen
   dieselbe wachsende Liste im Dreier-Gitter — bei 36 Zeichen 1311 px bzw.
   1223 px hohe Seiten. Ruling #75 lässt die Echo-Checks ausdrücklich in Ruhe;
   ob das auch bei 36 eingeführten Zeichen so bleiben soll, ist eine
   Produktfrage.
2. **Das Tastenfeld dimmt nicht nach Phase** (§3j, letzter Absatz). Bewusst so,
   begründet — aber eine Abweichung vom Verhalten des Dreier-Gitters, und
   deshalb ein Punkt für das Review.

**Menschliche Prüfung, die von hier aus nicht geht:** das Tastenfeld auf einem
echten Telefon — trifft der Finger bei 50 × 52 px sicher, und stört das
Dimmen der 21 unbenutzten Positionen beim Üben? Dazu ein Screenreader-Durchlauf
über die 36 Tasten: die gedimmten melden sich als „— not in this round", und ob
das an dieser Stelle hilfreich oder Lärm ist, entscheidet ein Mensch mit
Screenreader, nicht diese Übergabe.

**Aus der Runde davor (L1) offen** — über das Repo und danach live auf
`morse-lab.com/learn/`. Drei Dinge brauchen ein Urteil, keines davon blockiert
den Deploy:

1. **Die fünf zu langen `metaTitle` und drei zu langen `metaDescription`**
   (Kopf dieser Übergabe, Konflikt 1). Texte werden hier nicht umgeschrieben;
   sobald Fable kürzere Fassungen liefert, ist es je eine Zeile Frontmatter.
2. **Die zwei fehlenden Kanten vom Pillar** auf Geschichte und Amateurfunk
   (Konflikt 2). Auch das ist ein Satz Text, nicht Code.
3. **Fließtext-Links in `--amber-deep` statt `--amber`** — begründet in §3i
   (4,46:1 gegen 4,5:1 gefordert). Will Fable das reine Amber trotzdem, ist es
   eine Zeile in `tools/learn/learn.css`; dann steht in FINDINGS eine
   Kontrast-Abweichung mehr.

**Danach, in dieser Reihenfolge:** der Deploy und die fünf Handgriffe aus §5j
(Adressen abrufen, Sitemap einreichen, Cache-Wechsel, Lighthouse, OG-Karte
ansehen).

**Der Stand aus der Runde davor, zum Nachlesen:**

**Die beiden Produktfragen der Runde F1 sind entschieden** (Ruling
Notion-Log #69) und umgesetzt: der Drill-Pool wird immer auf mindestens drei
Zeichen aufgefüllt (`DRILL_MIN_POOL`, langsame plus die schnellsten sicheren
als Kontrast), und schon **ein** langsames Zeichen lädt ein
(`DRILL_INVITATION_MIN_SLOW = 1`). Avoid-Repeat bleibt. Damit ist auch der
Zwei-Zeichen-Drill keine strenge Alternation mehr, und der Kontrast-Zweig ist
über die UI erreichbar. → §3h

**Die Infrastruktur ist seit heute vollständig.** DNS und WAF waren die letzten
zwei Handgriffe außerhalb des Repos; Fable hat beide per Chrome erledigt:

- **`morse-lab.com` ist live** — CNAME `@` → `projekt-morse.pages.dev`. Die
  Domain validiert, das Zertifikat steht. Damit ist auch die Vorbedingung aus
  §3e erfüllt: Passkeys hängen an der Domain, unter der sie angelegt wurden.
- **Die Rate-Limit-Regel steht** — `auth-rate-limit`, 4 Anfragen pro 10
  Sekunden pro IP auf `/api/auth/`. Der Vorbehalt aus §5h hat sich damit
  erledigt: auf der eigenen Zone ist die Regel anlegbar.

**Routine, kein offener Punkt:** beim nächsten Deploy einmal den Cache-Wechsel
nachsehen (genau ein Cache am Ende, der neue — §5a). Das ist die übliche
Gegenprobe nach einem Deploy mit geänderten Assets, keine Blockade.

1. **Den Deploy nachsehen** (§5e) — der Merge von F1 hat sie live gebracht. Danach das
   kleine Signal prüfen: `/api/progress` ohne Sitzung muss **401** antworten,
   nicht 500. Und erst dann den Konto-Weg auf Produktion nachweisen
   (Register → Sitzung → Push → Login im zweiten Kontext → Merge → Löschen).
   **Von dieser Umgebung aus nicht machbar** (Cloudflare und die Produktions-URL
   sind gesperrt); übernommen hat es Fable.
2. ~~**Die Rate-Limit-Regel anlegen**~~ **erledigt** (siehe oben, §5h).
3. ~~**`morse-lab.com` erreichbar machen**~~ **erledigt** (siehe oben, §5a).
4. ~~**Streak mit Freeze-Gnade**~~ **erledigt in Runde F1** (§3h), zusammen
   mit Settings und den ICR-Drills. Der Tages-Eimer ist dabei geblieben, was er
   war: kein Verlauf. Der Streak führt fünf Zahlen mit, keine Liste — nichts
   wächst unbegrenzt (CLAUDE.md 7).
5. **Menschliche Prüfungen:** Hörtest — **jetzt auch an den Rändern der neuen
   Tonhöhen-Spanne (500 und 800 Hz) und bei 5 % Lautstärke** —, Screenreader
   (die zwei neuen Regler und die Streak-Zeile), PWA-Installation auf dem
   Telefon — **und ein Passkey auf echter Hardware**, mit einem Blick
   darauf, wie der Systemdialog das Konto benennt (§5f.3). Das ist die
   Vorbedingung für die letzte offene Design-Entscheidung dieser Runde.
6. **Vor echten Nutzern: eine Datenschutzerklärung** (§3g). Der Inhalt steht
   dort praktisch fertig; formulieren und verlinken ist eine eigene Aufgabe mit
   Rechtsfolgen.
8. Danach die offenen Produktfragen aus §5i — Reihenfolge ist eine
   Notion-Entscheidung, nicht eine des Codes.
