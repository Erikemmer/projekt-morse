#!/usr/bin/env python3
"""
Ergaenzt die drei IBM-Plex-Sans-Schnitte in `src/fonts/` um U+2192 (->) und
U+2248 (~=), ohne einen anderen Umriss anzufassen.

Warum nicht neu subsetten: das Subset in `src/fonts/` ist Googles latin-Subset
(Plex 3.201); `@ibm/plex-sans` 1.1.0 `complete` ist Plex 3.005 und zeichnet fast
jeden Buchstaben minimal anders. Ein Neu-Subsetten aus `complete` haette den
gesamten Text veraendert. Hier wird nur ergaenzt: zwei Glyphen werden aus
`complete` kopiert (`~=` ist dort ein Composite und wird zerlegt, damit es nicht
von Komponenten der anderen Version abhaengt), cmap, hmtx, glyf werden um sie
erweitert. Alles andere bleibt bitgleich -- das prueft das Skript selbst.

Entscheidung: docs/PLAN-FINDINGS.md, "D1 -- Entscheidung" (Owner-Delegation
04.10.2026). Lizenz: SIL OFL 1.1, kein Reserved Font Name deklariert; die Datei
bleibt eine Modified Version unter OFL, `src/fonts/LICENSE-ibm-plex-sans.txt`
liegt daneben.

Werkzeug: Python `fonttools` + `brotli` (NICHT Teil des Projekts, nur zum
Erzeugen: `pip install fonttools brotli`; erzeugt wurde mit fonttools 4.66.1).
Quelle: `npm pack @ibm/plex-sans@1.1.0`, dann `package/fonts/complete/woff2/`.

Aufruf:
  python3 tools/fonts/add-glyphs.py <ordner-mit-IBMPlexSans-{Regular,Medium,SemiBold}.woff2>

Danach `npm run verify:fonts`: der cmap-Check belegt die Zeichen im Subset.
"""

import sys
from pathlib import Path

from fontTools.pens.filterPen import DecomposingFilterPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ADD = {0x2192: "uni2192", 0x2248: "approxequal"}
SRC_NAME = {"400": "Regular", "500": "Medium", "600": "SemiBold"}
ROOT = Path(__file__).resolve().parents[2]


def add_glyphs(target: Path, source: Path) -> None:
    a = TTFont(target)
    b = TTFont(source)
    cb = b.getBestCmap()
    gs = b.getGlyphSet()
    assert a["head"].unitsPerEm == b["head"].unitsPerEm

    # Vorher festhalten, was danach unveraendert sein muss.
    before = {n: (a["glyf"][n].compile(a["glyf"]), a["hmtx"][n]) for n in a.getGlyphOrder()}
    cmap_before = dict(a.getBestCmap())

    order = list(a.getGlyphOrder())
    for cp, name in ADD.items():
        assert cp not in cmap_before, f"U+{cp:04X} steht schon im Schnitt"
        assert name not in order, f"Glyphname {name} ist belegt"
        src_name = cb[cp]
        pen = TTGlyphPen(gs)
        gs[src_name].draw(DecomposingFilterPen(pen, gs))
        a["glyf"][name] = pen.glyph()
        a["hmtx"][name] = b["hmtx"][src_name]
        order.append(name)
        for t in a["cmap"].tables:
            if t.isUnicode():
                t.cmap[cp] = name

    a.setGlyphOrder(order)
    a["maxp"].numGlyphs = len(order)
    a.save(target)

    # Nachpruefung: nichts Altes hat sich bewegt, genau die zwei Zeichen sind neu.
    c = TTFont(target)
    after_cmap = c.getBestCmap()
    assert {k: v for k, v in after_cmap.items() if k not in ADD} == cmap_before
    assert all(cp in after_cmap for cp in ADD)
    for n, (outline, metrics) in before.items():
        assert c["glyf"][n].compile(c["glyf"]) == outline, f"Umriss {n} hat sich geaendert"
        assert c["hmtx"][n] == metrics, f"Metrik {n} hat sich geaendert"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    src_dir = Path(sys.argv[1])
    for weight, name in SRC_NAME.items():
        target = ROOT / "src" / "fonts" / f"ibm-plex-sans-latin-{weight}-normal.woff2"
        add_glyphs(target, src_dir / f"IBMPlexSans-{name}.woff2")
        print(f"{target.name}: {target.stat().st_size} Byte, +U+2192 +U+2248")
    return 0


if __name__ == "__main__":
    sys.exit(main())
