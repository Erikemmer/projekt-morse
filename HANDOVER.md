# Übergabe — Stand nach Runde F1 (Streak, Settings, Speed round)

**Repository:** https://github.com/Erikemmer/projekt-morse
**Stand:** **Runde F1 liegt auf `claude/morse-handover-alignment-nbkk6o`** und
wartet auf das Review (Fable). Sie baut auf `main` nach Runde B auf; an Backend,
Sync und Konto ist **nichts** angefasst worden. Die Commits der Runde:

1. `f4cf2ae` — **Streak mit Freeze-Gnade in der Engine** (Notion-Log #29)
2. `65c6584` — **Die eine leise Zeile** auf Start- und Abschluss-Screen
3. `9e19530` — **Settings: Tonhöhe und Lautstärke**, gerätespezifisch (Log #66)
4. `bfe1ef9` — **ICR-Drills: die Speed round** (Log #66)
5. `8615559` — **Fix aus dem Browser-Durchlauf**: die Ergebniszeile des Drills
   verschwand genau dann, wenn er geholfen hatte (§4)
6. `e49ef35` — Übergabe und Screenshots
7. (dieser Commit) — Übergabe: **der Sync ist mit den neuen Feldern
   durchgespielt**, zwei Geräte gegen lokale D1 (§4)

**Kontext dieser Runde:** drei Features nach Notion-Log #29 und #66. Alles
davon ist local-first und ohne Konto vollständig: der Streak liegt im
Lernstand, die Einstellungen liegen bewusst **daneben** und gehen nie zum
Konto, der Drill ist reine Engine-Logik.

> ### Zwei Produktfragen, die diese Runde aufgeworfen hat — für Fable
>
> Beides ist **umgesetzt wie spezifiziert** und nicht still verändert worden.
> Beides braucht trotzdem eine Entscheidung, bevor die Runde nach `main` geht:
>
> 1. **Bei genau zwei langsamen Zeichen wechselt der Drill streng ab.** Die
>    normale Übungsregel „nie zweimal dasselbe Zeichen hintereinander"
>    (`selection.ts`) lässt bei einem Zwei-Zeichen-Satz keine Wahl: es kommt
>    R U R U R U … Im Durchlauf gemessen — die zehn Runden waren `RURURURURU`.
>    Wer das merkt, muss nicht mehr hinhören, und **genau das verbietet
>    CLAUDE.md 2.2.** Der kleinste Fix wäre, den Kontrast-Zusatz nicht erst bei
>    *einem*, sondern bei *unter drei* langsamen Zeichen zu ziehen (eine
>    Konstante in `drill.ts`). Das ist eine Produktentscheidung, deshalb steht
>    sie hier und nicht im Code.
> 2. **Der Kontrast-Zweig ist über die UI heute nicht erreichbar.** Die
>    Einladung erscheint ab **zwei** langsamen Zeichen, der Kontrast greift bei
>    **genau einem** — dieser Fall kann also nie geklickt werden. Der Code kann
>    beides (und ist für beides getestet); es fehlt der Weg dorthin. Entweder
>    lädt die Einladung schon ab einem langsamen Zeichen ein, oder die Speed
>    round bekommt einen festen Platz (Menü oder Progress-Screen). So oder so:
>    eine Entscheidung, kein Bug.
>
> Dazu eine Kleinigkeit aus der Aufgabenstellung: **das Amber-Budget-Skript
> existiert im Repo nicht.** Browser-Durchläufe sind hier ad hoc und werden
> nach jeder Runde weggeräumt (§5d) — der Zähler dieser Runde ist deshalb neu
> geschrieben und steht in §4 als Regel beschrieben. Wenn er bleiben soll, ist
> „ein committetes Prüfskript" eine eigene, kleine Aufgabe.

> ### Was noch offen ist — zwei Handgriffe, beide außerhalb des Repos
>
> Runde B endete mit drei Blockaden, die kein Code lösen konnte. Zwei sind
> inzwischen geschlossen:
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
>
> Offen bleiben zwei Handgriffe, die beide **nicht im Repo** liegen:
>
> - **Der DNS-Eintrag für `morse-lab.com`** — ein CNAME. → §5a
> - **Die WAF-Rate-Limit-Regel** (Ruling #56) — die exakten Dashboard-Schritte
>   stehen dokumentiert. → §5h
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

**Neu aus dieser Runde (F1): drei Features, alle drei leise.**

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
| `src/ui/App.tsx` | Lernloop-Screen, View-State, Push, **Streak-Zeile, Settings, Drill** | erweitert |
| `src/ui/Account.tsx`, `src/ui/account.ts` | Account-Screen und Passkeys | unverändert |
| **`src/ui/Settings.tsx`** | **Zwei Regler, ein Probeton, eine ehrliche Zeile** | **neu** |
| **`src/ui/deviceStorage.ts`** | **Eigener localStorage-Schlüssel, nie im Sync** | **neu** |
| `src/ui/Menu.tsx` | Kopfzeile und Menü, **jetzt mit Settings-Zeile** | erweitert |
| `src/ui/progressStorage.ts` | localStorage rein/raus, plus Lern-Zeitstempel | unverändert |
| `src/ui/About.tsx` | About-Screen | unverändert |
| `src/ui/Progress.tsx`, `Intro.tsx`, `Learn.tsx`, `Pattern.tsx` | — | unverändert |
| `src/styles.css` | Tokens nach 1.1 §13, **plus Regler- und Zeilen-Rollen** | erweitert |
| `public/sw.js` | Service Worker, `/api/` ausgenommen | unverändert |
| `docs/brand/logo.py` | Konstruktions-Doku, nicht mehr Quelle (#53/54) | unverändert |
| `docs/screenshots/` | …, **Settings, Speed-round-Einladung** | erweitert |
| `src/engine/*.test.ts` | **221 Tests** (146 vorher, **75 neu** in dieser Runde) | grün |

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
der *langsamen* Zeichen — die Kontrast-Zeichen (bei nur einem langsamen) sind
schnell und zögen ihn nach unten, ohne dass jemand etwas gelernt hätte.
„down from" steht nur da, wenn es wirklich schneller wurde; ein Rückschritt
bekommt keine Zeile.

## 4. Was nachgewiesen ist (und wie)

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

### 5h. Die Rate-Limit-Regel (Ruling #56) — noch nicht angelegt

**Beschlossen:** 10 Anfragen pro Minute und IP auf `/api/auth/*`, Aktion
*Block*. **Nicht angelegt**, aus denselben zwei Gründen wie §5e (keine
Anmeldung, Cloudflare per Egress-Proxy gesperrt).

> **Ein Vorbehalt, den ich nicht prüfen konnte.** Nach meinem Verständnis sind
> Rate-Limiting-Regeln ein **Zonen**-Feature: sie hängen an einer Domain im
> eigenen Cloudflare-Konto. `projekt-morse.pages.dev` liegt in Cloudflares
> eigener Zone, nicht in der des Owners — dort ließe sich die Regel dann
> **nicht** anlegen, und sie greift erst, wenn `morse-lab.com` über die Zone
> läuft (§5a). Ich konnte das **nicht belegen**: `developers.cloudflare.com` ist
> vom Egress-Proxy gesperrt. Wer die Regel anlegt, sieht in einem Blick, ob im
> Zonen-Wähler eine Zone für die Pages-Domain auftaucht — bitte diesen Absatz
> danach korrigieren, in die eine oder andere Richtung.

**Schritte im Dashboard** (Zone `morse-lab.com`):

1. dash.cloudflare.com → Zone **`morse-lab.com`** wählen.
2. **Security → WAF → Reiter „Rate limiting rules"** → *Create rule*.
3. **Rule name:** `api-auth-10-per-minute`
4. **If incoming requests match:** *Custom filter expression*
   - Field **URI Path** · Operator **starts with** · Value **`/api/auth/`**
   - (als Ausdruck: `starts_with(http.request.uri.path, "/api/auth/")`)
5. **With the same characteristics:** **IP** (IP-Adresse)
6. **When rate exceeds:** Requests **10** · Period **1 minute**
7. **Then take action:** **Block** · Mitigation timeout **1 minute**
8. *Deploy*.

**Zur Zahl 10:** ein vollständiger Anmelde- oder Registriervorgang sind genau
**zwei** Anfragen (`options` + `verify`). 10 pro Minute lassen also fünf
Versuche — für eine Person reichlich, für ein Skript nichts. **Der Fall, der
davon zu Unrecht getroffen werden kann:** viele Nutzer hinter einer IP (Schule,
Büro, Mobilfunk-NAT). Wenn das je auffällt, ist die Charakteristik das
Stellrad, nicht die Zahl — mit einer bezahlten Stufe ließe sich statt der IP
ein JA3/Client-Merkmal nehmen. Für V1 ist die IP richtig, weil es keinen
Nutzernamen gibt, an dem man drosseln könnte.

**Was die Regel nicht löst:** abgelaufene Flow-Zeilen werden nur beim nächsten
Zugriff derselben Sitzung weggeräumt, nicht global (§5f). Ein Rate-Limit bremst
das Auffüllen, es räumt nicht auf. Wenn das gewollt ist, ist ein **Cron Trigger**
der richtige Ort — ein `DELETE FROM sessions WHERE expires_at <= now`, einmal
pro Stunde. Bewusst nicht gebaut: das ist ein eigener Worker und damit eine
eigene Aufgabe.

### 5i. Ältere offene Punkte (unverändert)

**Gefallen und umgesetzt:** Zeichen-für-Zeichen, retrieval-only, EN-first,
Design „Ruhe", Wachstumsregel, PWA mit selbst gehosteten Schriften, das
Gehäuse, Accounts — **und seit Runde F1 der Streak mit Freeze-Gnade, die
Einstellungen und die Speed round.**

**Offen, bewusst nicht angefasst:** nur Einzelzeichen
(keine Fünfergruppen, kein Klartext); kein Dark Mode (Rollen stehen, kein
`prefers-color-scheme`-Block); Satzzeichen fehlen in `CHARACTER_ORDER`;
Variabilitäts-Stufe 3 (QRN) nicht gebaut; „Visual practice" als opt-in-Modus
(die offene Zusage aus 1.1 §12, siehe Addendum (a) in CLAUDE.md §2.9).

Die drei Abweichungen vom Mockup und die zwei Lernmodus-Fragen aus den
Vorrunden stehen unverändert in der Übergabe der Runde davor (Git-Verlauf) und
warten weiter auf ein Urteil.

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

## 7. Nächster Schritt

**Zuerst die zwei Produktfragen dieser Runde** (ganz oben): der streng
abwechselnde Zwei-Zeichen-Drill und der über die UI unerreichbare
Kontrast-Zweig. Beides sind Entscheidungen für Fable, beides ändert eine
Konstante oder einen Einstiegspunkt — kein Umbau.

**Die übrigen offenen Punkte brauchen Cloudflare-Zugang**, den diese Umgebung
nicht hat. Sie stehen deshalb oben.

1. **Den Deploy nachsehen** (§5e). Der Merge ist erfolgt, die D1-Bindung liegt
   in `wrangler.toml` und kommt mit dem Deploy aus `main`. Danach das kleine
   Signal prüfen — `/api/progress` ohne
   Sitzung muss **401** antworten, nicht 500 —, und erst dann den Konto-Weg auf
   Produktion nachweisen (Register → Sitzung → Push → Login im zweiten Kontext
   → Merge → Löschen). **Von dieser Umgebung aus nicht machbar** (Cloudflare
   und die Produktions-URL sind gesperrt); übernommen hat es Fable.
2. **Die Rate-Limit-Regel anlegen** (§5h), 10/Minute/IP auf `/api/auth/*`.
   Gleiche Voraussetzung. **Bitte dabei den Vorbehalt in §5h klären** — ob die
   Regel für `*.pages.dev` überhaupt anlegbar ist, konnte ich nicht belegen
   (Cloudflare-Doku ist hier gesperrt).
3. **`morse-lab.com` erreichbar machen** — der DNS-Eintrag aus §5a, **nachdem**
   §3e entschieden ist (Passkeys hängen an der Domain). Danach greift auch die
   Rate-Limit-Regel, falls der Vorbehalt aus §5h zutrifft.
4. ~~**Streak mit Freeze-Gnade**~~ **erledigt in dieser Runde** (§3h), zusammen
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
