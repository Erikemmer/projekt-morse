# Übergabe — Stand nach Runde B (Accounts: Passkeys, D1, Sync)

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** `main` @ `2b71931` — **die Gehäuse-Runde (Runde A) ist gemergt und
deployt**, Review 8 (Fable) bestanden. Darauf aufbauend Branch
`claude/morse-handover-alignment-nbkk6o` mit vier Commits — zu reviewen (Fable)
und dann nach `main` zu mergen; erst der Merge deployt sie:

1. `bc16dd3` — **Merge-Semantik in der Engine, Backend für Passkeys und Sync**
2. `f52c775` — **Account-Zeile im Menü, Account-Screen, Sync am Sitzungsende**
3. `6deea18` — **Fix: „jünger" heißt gelernt, nicht gespeichert** (Fund aus dem
   Browser-Durchlauf)
4. (dieser Doku-Commit, mit den Screenshots)

**Kontext dieser Runde:** Runde B nach Notion-Log #48–51. Leitplanke über
allem war **local-first**, und sie hält: die App ist ohne Konto und offline
exakt so vollständig wie vorher, das Konto ist ein Sync-Ziel und nie eine
Voraussetzung. Kein Feature liegt hinter einem Login. Nachgewiesen, nicht
behauptet — siehe §4.

**Ein Punkt der Aufgabenstellung ist nicht erledigt: Schritt 1, die Bildmarke
aus den Owner-Dateien.** Die drei Dateien waren in dieser Umgebung nicht
erreichbar. Details und der genaue Handgriff stehen in §3f. Nicht geraten,
nicht ersatzweise konstruiert.

**Produktions-URL: https://projekt-morse.pages.dev** — live auf Cloudflare
Pages mit Git-Anbindung. Jeder Push auf `main` baut und deployt von selbst.
**Neu und wichtig: `/api/*` funktioniert auf Produktion erst, wenn die
D1-Datenbank angelegt und gebunden ist** (§5e). Bis dahin läuft die App
vollständig, nur ohne Konten — und genau dieser Zustand ist als local-first
nachgewiesen.

**`morse-lab.com` ist an das Projekt gebunden, aber noch nicht erreichbar** —
es fehlt der eine DNS-Eintrag aus §5a. **Neu zu bedenken:** Passkeys hängen an
der Domain, unter der sie angelegt wurden (§3e).

**Datum:** 2026-09-01 (vierte Runde dieses Tages)

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md). Nebenbefunde in
[FINDINGS.md](./FINDINGS.md) — alle drei Einträge sind entschieden und behoben.

---

## 1. Wo das Projekt steht

Der Kern-Lernloop (hören → tippen → Feedback, adaptiv nach Schwäche) läuft,
ist live und sieht aus wie das Mockup. Unverändert gilt: der Zeichensatz wächst
von selbst, die App ist eine offline nutzbare PWA ohne jeden Fremdabruf,
`--gray` besteht AA auch für kleinen Text.

**Neu aus dieser Runde: die App kann ein Konto haben — und braucht keins.**

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
- **Das Menü hat jetzt fünf Einträge** (Practice · Learn the sounds · Progress ·
  Account · About). In Runde A war die Account-Zeile bewusst weggelassen, weil
  es kein Backend gab (1.1 §7).

Aus Runde A gilt weiter: das Gehäuse (Kopfzeile, Vollbild-Menü,
Progress-Screen, About-Screen). Aus den Runden davor: Klang-Variabilität in
Stufen, der Lernmodus mit Karte und Echo-Check, Marke und Tokens nach 1.1.

## 2. Was liegt wo

| Pfad | Rolle | Zustand |
|---|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1 | unverändert |
| `src/engine/timing.ts` | Farnsworth-Timing nach ARRL | unverändert |
| `src/engine/schedule.ts` | Text → Zeitachse | unverändert |
| `src/engine/settings.ts` | Tempo, Tonhöhe, Start-Satz, Kandidatenreihe | unverändert |
| `src/engine/stats.ts` | Statistik, Tag/Sitzung/Intro, eingeführte Zeichen | unverändert |
| `src/engine/growth.ts` | Die Wachstumsregel | unverändert |
| `src/engine/learn.ts` | Der Lernmodus: Karte, Echo-Check | unverändert |
| `src/engine/variability.ts` | Klang-Variabilität in Stufen (HVPT) | unverändert |
| `src/engine/selection.ts` | Gewichtung nach Schwäche | unverändert |
| `src/engine/session.ts` | Loop-Zustandsautomat | unverändert |
| **`src/engine/sync.ts`** | **Merge zweier Lernstände; Lern-Kennung** | **neu, getestet** |
| `src/audio/player.ts` | Wiedergabe mit Audio-Uhr nach außen | unverändert |
| **`functions/_lib/`** | **Env, HTTP, Relying Party, Sitzungen** | **neu** |
| **`functions/api/auth/`** | **Register/Login (Options + Verify), Logout** | **neu** |
| **`functions/api/progress.ts`** | **GET/PUT — die ganze Sync-API** | **neu** |
| **`functions/api/account.ts`** | **DELETE — Konto und Daten löschen** | **neu** |
| **`functions/tsconfig.json`** | **Worker-Typen, getrennt von den DOM-Typen** | **neu** |
| **`migrations/0001_accounts.sql`** | **users, credentials, sessions, progress** | **neu** |
| **`wrangler.toml`** | **D1-Bindung `DB`; `database_id` ist ein Platzhalter** | **neu** |
| `src/ui/App.tsx` | Lernloop-Screen, View-State, **Push am Sitzungsende** | erweitert |
| **`src/ui/Account.tsx`** | **Der Account-Screen, drei Zustände** | **neu** |
| **`src/ui/account.ts`** | **Passkeys, Sitzung, Abgleich — rechnet nichts** | **neu** |
| `src/ui/Menu.tsx` | Kopfzeile und Menü, **jetzt mit Account-Zeile** | erweitert |
| `src/ui/progressStorage.ts` | localStorage rein/raus, **plus Lern-Zeitstempel** | erweitert |
| `src/ui/About.tsx` | About-Screen, **Datenschutz-Zeile korrigiert** | angepasst |
| `src/ui/Progress.tsx`, `Intro.tsx`, `Learn.tsx`, `Pattern.tsx` | — | unverändert |
| `src/styles.css` | Tokens nach 1.1 §13, **plus Account-Rollen** | erweitert |
| `public/sw.js` | Service Worker, **`/api/` ausgenommen** | angepasst |
| `docs/brand/logo.py` | **Konstruktions-Doku, nicht mehr Quelle** (#53/54) | angepasst |
| `docs/screenshots/` | Intro, Lernkarte, Training, Menü, Progress, **Account ×2** | erweitert |
| `src/engine/*.test.ts` | **143 Tests** (114 vorher, 29 neu für den Sync) | grün |

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

### 3f. Die Bildmarke — Schritt 1 ist NICHT erledigt

**Was gefordert war** (Notion-Log #53/54): die drei Owner-Dateien aus
`~/Downloads/assets/` (`morse-lab-mark.svg`, `morse-lab-mark-inverse.svg`,
`morse-lab-appicon.svg`) unverändert nach `docs/brand/assets/` übernehmen und
Favicon, App-Icons (192/512/maskable/apple-touch) und das About-Lockup aus
**diesen** Dateien ableiten statt aus der `logo.py`-Konstruktion.

**Warum es nicht passiert ist:** der Ordner existiert in dieser Umgebung nicht.
Diese Session läuft in einem flüchtigen Remote-Container, in dem nur das Repo
liegt — `~/Downloads/` gibt es dort nicht, und das ganze Dateisystem wurde nach
den drei Dateinamen durchsucht, ohne Treffer.

**Was stattdessen getan wurde:** nichts geraten und nichts ersatzweise
konstruiert. `docs/brand/logo.py` sagt jetzt in der ersten Zeile, dass es nicht
mehr die Quelle der Bildmarke ist, wer es ist, und dass die Dateien noch
fehlen. Favicon und Icons stehen unverändert auf dem alten Stand; der
Punkt+Pille-Fallback für < 24 px ist ohnehin unberührt.

**Was fehlt, wenn die Dateien da sind** — eine kleine, klar umrissene Aufgabe:

1. Die drei SVGs unverändert nach `docs/brand/assets/` legen (kanonische
   Originale, nicht anfassen).
2. `public/logo-key.svg` (About-Lockup) und die Icons unter `public/icons/`
   daraus rendern — Chromium wie gehabt, `icon-192`, `icon-512`,
   `icon-maskable-512`, `apple-touch-icon`.
3. **Maskable mit Safe-Zone prüfen:** der sichtbare Inhalt muss innerhalb des
   inneren Kreises von 80 % Kantenlänge liegen, sonst beschneidet Android.
4. Das Favicon bleibt der Punkt+Pille-Fallback (unter 24 px zerfällt der
   Taster, 1.1 §3) — das ist eine bestehende Entscheidung, keine offene Frage.

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

## 4. Was nachgewiesen ist (und wie)

**Aus dieser Runde:**

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
- **Der ganze Konto-Weg ist im Browser durchgespielt — 43 von 43 Prüfungen**,
  nach dem #56-Fix noch einmal vollständig wiederholt.
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
- **Auf Produktion ist von dieser Runde nichts geprüft** — es gibt dort noch
  keine D1 (§5e). Alles oben ist lokal gegen `wrangler pages dev` belegt.
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

**Custom Domain `morse-lab.com` — ein Handgriff fehlt.** Die Domain ist an das
Pages-Projekt gebunden (`status: pending`, HTTP-Validierung), liegt bei
Cloudflare mit Cloudflare-Nameservern, Zone
`2bef7122ee328f9197516d727b9929a2`, aktiv. Die Zone hat keinen einzigen
DNS-Eintrag, und die frühere wrangler-Anmeldung durfte keinen anlegen
(`zone:read`, kein `dns_records:write`):

| Feld | Wert |
|---|---|
| Typ | `CNAME` |
| Name | `morse-lab.com` (Apex, im Dashboard `@`) |
| Ziel | `projekt-morse.pages.dev` |
| Proxy | **an** (orange Wolke) — für Pages-Domains nötig |
| TTL | Auto |

Cloudflare flacht den Apex-CNAME selbst ab; ein A-Record ist nicht nötig.
**Vor diesem Schritt bitte §3e lesen** (Passkeys und Domainwechsel).

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
npm test             # Vitest, 143 Tests
npm run build        # tsc (src) && tsc (functions) && vite build

# Mit Backend, lokal:
npx wrangler d1 migrations apply morse-lab --local
npm run build && npx wrangler pages dev --port 8788 --ip 127.0.0.1
# -> http://localhost:8788   (NICHT 127.0.0.1: siehe §3e)
```

Lokal legt Wrangler die Datenbank unter `.wrangler/state/` an; `database_id`
spielt dabei keine Rolle, eine Cloudflare-Anmeldung auch nicht. `.wrangler/` ist
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

### 5e. D1 auf Produktion — der eine offene Handgriff

**`/api/*` funktioniert auf Produktion noch nicht.** Es fehlt die Datenbank und
ihre Bindung. `wrangler.toml` trägt sichtbar einen Platzhalter statt einer
`database_id` — Absicht, kein vergessener Wert: diese Session hatte **keine
Cloudflare-Anmeldung** (`wrangler whoami`: nicht authentifiziert), und ein
geratener Wert wäre schlimmer als ein sichtbarer Platzhalter. Dokumentiert statt
gehackt, wie in diesem Projekt üblich.

```bash
npx wrangler login                      # oder CLOUDFLARE_API_TOKEN
npx wrangler d1 create morse-lab        # gibt die echte database_id aus
#   -> in wrangler.toml eintragen, committen
npx wrangler d1 migrations apply morse-lab --remote
```

Danach im Pages-Projekt `projekt-morse` die D1-Bindung **`DB`** auf die
Datenbank `morse-lab` setzen (Settings → Functions → D1 database bindings),
für **Production und Preview**. Bei Git-Anbindung liest Pages `wrangler.toml`
nicht für die Bindung — das Dashboard entscheidet.

**Solange das aussteht, ist der Zustand nicht kaputt, sondern der nachgewiesene
local-first-Fall:** die App läuft vollständig, der Account-Screen sagt ruhig,
dass kein Server erreichbar ist.

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

### 5g. Ältere offene Punkte (unverändert)

**Gefallen und umgesetzt:** Zeichen-für-Zeichen, retrieval-only, EN-first,
Design „Ruhe", Wachstumsregel, PWA mit selbst gehosteten Schriften, das
Gehäuse, Accounts.

**Beschlossen, aber nicht gebaut:** **Streak mit Freeze-Gnade**
(CLAUDE.md §2.8). Die Persistenz ist dafür vorbereitet.

**Offen, bewusst nicht angefasst:** kein Einstellungsdialog; nur Einzelzeichen
(keine Fünfergruppen, kein Klartext); kein Dark Mode (Rollen stehen, kein
`prefers-color-scheme`-Block); Satzzeichen fehlen in `CHARACTER_ORDER`;
Variabilitäts-Stufe 3 (QRN) nicht gebaut; „Visual practice" als opt-in-Modus
(die offene Zusage aus 1.1 §12, siehe Addendum (a) in CLAUDE.md §2.9).

Die drei Abweichungen vom Mockup und die zwei Lernmodus-Fragen aus den
Vorrunden stehen unverändert in der Übergabe der Runde davor (Git-Verlauf) und
warten weiter auf ein Urteil.

## 6. Fallgruben

- **Der Container ist flüchtig — früh pushen.** Diese Session: vier Commits,
  jeder sofort gepusht.
- **`~/Downloads/` gibt es hier nicht.** Wer Owner-Dateien braucht, braucht sie
  im Repo oder gar nicht (§3f).
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
- **`create_repository` schlägt in dieser Umgebung fehl** (403). Zweites Repo:
  den Nutzer anlegen lassen.

## 7. Nächster Schritt

1. **Review durch Fable und Merge nach `main`** — die vier Commits dieser Runde.
   Zum Review gehören: die Merge-Setzungen aus §3b (`sessionsStarted` als
   Maximum, die Merker als Oder), die drei Punkte aus §5f — allen voran der
   schrumpfende Zeichensatz —, die Copy des Account-Screens und die beiden
   Screenshots.
2. **D1 anlegen und binden** (§5e). Erst danach ist Runde B auf Produktion
   wirklich fertig, und erst danach lässt sich der Konto-Weg dort prüfen.
3. **Schritt 1 nachholen: die Bildmarke aus den Owner-Dateien** (§3f). Braucht
   nur die drei Dateien im Repo.
4. **`morse-lab.com` erreichbar machen** — der DNS-Eintrag aus §5a, **nachdem**
   §3e entschieden ist (Passkeys und Domainwechsel).
5. **Streak mit Freeze-Gnade** — die Runde steht noch aus. Reine Engine-Logik,
   Persistenz additiv. Der Tages-Eimer ist bewusst *keine* Historie.
6. **Menschliche Prüfungen:** Hörtest, Screenreader, PWA-Installation auf dem
   Telefon — **und jetzt neu: ein Passkey auf echter Hardware**, mit einem Blick
   darauf, wie der Systemdialog das Konto benennt (§5f.2).
7. Danach die offenen Produktfragen aus §5g — Reihenfolge ist eine
   Notion-Entscheidung, nicht eine des Codes.
