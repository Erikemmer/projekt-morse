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
