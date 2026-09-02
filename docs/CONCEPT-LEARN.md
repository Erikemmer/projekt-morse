# Learn-Bereich für morse-lab.com — Konzept, SEO, Styling

*Von Fable (Konzept- & Design-Owner), 02.09.2026. Verbindlich für die Implementierung; die Texte liegen fertig unter `content/learn/` und werden NICHT umgeschrieben — Tippfehlerkorrekturen ausgenommen.*

## 1. Zweck & Einordnung

Ein redaktioneller Bereich unter morse-lab.com, der (a) organischen Suchverkehr auf die App lenkt („how to learn morse code", „morsecode lernen", „morse code alphabet" …), (b) den evidenzbasierten Anspruch der Marke belegt und (c) Einsteigern echte Orientierung gibt. Er ist Teil des Produkts, nicht Marketing-Beiwerk: dieselben Tokens, dieselbe Stimme, keine Übertreibungen.

## 2. Informationsarchitektur & URLs

Englisch ist Primärsprache (EN-first, Log #7), Deutsch vollwertige Zweitsprache. Saubere, flache URLs:

| Seite | EN | DE |
|---|---|---|
| Hub | `/learn/` | `/de/lernen/` |
| Anleitung (Pillar) | `/learn/how-to-learn-morse-code/` | `/de/lernen/morsecode-lernen/` |
| Alphabet (Referenz) | `/learn/morse-code-alphabet/` | `/de/lernen/morsealphabet/` |
| Geschichte | `/learn/history-of-morse-code/` | `/de/lernen/geschichte-des-morsecodes/` |
| Amateurfunk | `/learn/morse-code-in-amateur-radio/` | `/de/lernen/morsen-im-amateurfunk/` |
| Koch-Methode | `/learn/koch-method/` | `/de/lernen/koch-methode/` |
| Moderne Lernforschung | `/learn/beyond-the-koch-method/` | `/de/lernen/lernforschung/` |

Interne Verlinkung: Der Pillar verlinkt auf alle anderen; jede Seite verlinkt zurück auf den Pillar und auf die App (`/`). Der Hub listet alle sechs. Die App bekommt im About-Screen einen leisen Link „Learn more about Morse" → `/learn/`.

## 3. Technik (Implementierungs-Vorgaben)

- **Statisch generiert, nicht SPA-gerendert.** Suchmaschinen bekommen fertiges HTML. Kleiner Build-Schritt (Node) rendert die Markdown-Dateien aus `content/learn/` zu statischen Seiten nach `dist/learn/…` und `dist/de/lernen/…`. Als Markdown-Parser ist `marked` (devDependency) GENEHMIGT — Begründung: handgerollter Markdown-Parser wäre die fehleranfälligere Wahl. Alternativ eigener minimaler Renderer, wenn die Session das sauberer findet; die Inhalte nutzen nur Überschriften, Absätze, Listen, Tabellen, Links, fett/kursiv.
- Die PWA bleibt unangetastet an der Wurzel; der Service Worker cached die Learn-Seiten NICHT vorab (normale Netz-Auslieferung, stale-while-revalidate genügt).
- Frontmatter jeder Datei liefert: `slug`, `lang`, `pair` (Slug der anderen Sprache), `metaTitle`, `metaDescription`, `keywords`, `datePublished`. Der Generator baut daraus Head-Tags.

## 4. SEO-Pflichten (pro Seite)

- `<title>` = metaTitle (≤60 Zeichen), `<meta name="description">` = metaDescription (~150–160 Zeichen) — stehen fertig im Frontmatter.
- `rel="canonical"` auf sich selbst; `hreflang`-Paare `en`/`de` + `x-default` (EN) wechselseitig.
- Open Graph (og:title, og:description, og:image → das Marken-Lockup als statisches Bild), `lang`-Attribut korrekt je Seite.
- JSON-LD `Article` (headline, description, datePublished, inLanguage, publisher „Morse Lab"); für die Alphabet-Seite zusätzlich nichts Erfundenes — kein FAQ-Schema ohne echte FAQ.
- `sitemap.xml` mit allen Learn-URLs + Wurzel; `robots.txt` unverändert offen.
- Genau EINE `<h1>` pro Seite (der Artikeltitel), saubere h2/h3-Hierarchie — die Markdown-Struktur gibt das vor.

## 5. Styling („Ruhe editorial", CI/Guidelines 1.1 gelten voll)

- Paper-Grund, Lesespalte **max. 680 px** (Guidelines §6), Body 16–17 px IBM Plex Sans, line-height 1.65. Headlines Newsreader (h1 ~34 px/500, h2 ~24 px/500). Fonts selbst gehostet (liegen im Repo).
- Ein Akzent: Links in Amber mit Unterstreichung erst bei Hover; keine Kästen mit Schatten, Tabellen mit Hairlines (edge-Töne), Radius 10 wo nötig.
- Kopfzeile: Wortmarke „Morse Lab" (Link zur Wurzel) links, rechts ein leiser Text-Link „Open the app" / „Zur App". Fußzeile: Sprachwechsel-Link (auf das hreflang-Pendant), © Morse Lab, Link zum Hub.
- Trennornament zwischen Artikelabschnitten, wo es passt: echte Morse-Formen (Punkt/Pille wie in der App), und sie buchstabieren echten Code — `−− ·−·· ` („ML"), Guidelines §8: dekorativer Fake-Code ist verboten.
- Morse-Muster in Artikeln (Alphabet-Tabelle) als Text mit `·` und `−` in ink, Monospace unnötig — Plex Sans trägt das.
- Kein Amber zweimal pro Viewport-Höhe anstreben; CTA am Artikelende („Start hearing it → Open Morse Lab") ist der eine gefüllte Amber-Primary der Seite.
- Dark Mode: nicht nötig (Light-first wie die App).

## 6. Stimme

CI §6 gilt wörtlich: ruhig, präzise, ehrlich, zweite Person sparsam, keine Ausrufezeichen-Kaskaden, Näherungen als solche benannt. Die Artikel behaupten nichts, was unsere Recherche nicht deckt — insbesondere der Koch-Artikel benennt offen, was Sekundärüberlieferung ist. Das ist Markenkern, nicht Schwäche.

## 7. Abnahme

Review durch Fable über das Repo: Screenshots (Hub + Pillar, 390 px und 1280 px), Lighthouse-SEO-Pass als Nachweis (oder gleichwertige Prüfung der Head-Tags), Sitemap-Check, hreflang-Gegenprobe in beide Richtungen.
