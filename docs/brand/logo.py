"""
Baut die Marke "der Morsetaster" exakt nach Guidelines 1.1 §3.

Die Zahlen der Richtlinie stehen oben als Konstanten; alles andere wird
gerechnet, nicht geschaetzt. So bleibt nachpruefbar, dass der Hebel wirklich
13 Grad um das rechte Lager gedreht ist und der Schutzraum wirklich einem
Knopfdurchmesser entspricht.
"""
import math, os, sys

# --- Vorgaben aus 1.1 §3 -------------------------------------------------
BASE_W, BASE_H = 120.0, 8.0
LEVER_W, LEVER_H = 92.0, 8.0
BAR_R = 4.0                 # "both radius 4 (half the bar height)"
LEVER_ANGLE = 13.0          # gehoben, Drehpunkt rechtes Lager
KNOB_D = 30.0
BEARING_D = 10.0
BEARING_STROKE = 3.0
CLEAR = KNOB_D              # "Clear space: one knob diameter on all sides"

PAPER, INK, AMBER = '#F6F1E8', '#221D16', '#B45309'

# --- Aufbau --------------------------------------------------------------
BASE_X, BASE_Y = 0.0, 64.0
PIVOT = (108.0, 48.0)                      # rechtes Lager, Drehpunkt
LEVER_X = PIVOT[0] - LEVER_W               # freies Ende links
LEVER_Y = PIVOT[1] - LEVER_H / 2


def rotate(x, y, cx, cy, deg):
    """SVG-Drehung: positiver Winkel wirkt im Bildschirm im Uhrzeigersinn."""
    a = math.radians(deg)
    dx, dy = x - cx, y - cy
    return (cx + dx * math.cos(a) - dy * math.sin(a),
            cy + dx * math.sin(a) + dy * math.cos(a))


KNOB = rotate(LEVER_X, PIVOT[1], *PIVOT, LEVER_ANGLE)   # freies Hebelende

corners = [rotate(x, y, *PIVOT, LEVER_ANGLE)
           for x in (LEVER_X, PIVOT[0]) for y in (LEVER_Y, LEVER_Y + LEVER_H)]

xs = [BASE_X, BASE_X + BASE_W,
      KNOB[0] - KNOB_D / 2, KNOB[0] + KNOB_D / 2,
      PIVOT[0] - BEARING_D / 2 - BEARING_STROKE / 2,
      PIVOT[0] + BEARING_D / 2 + BEARING_STROKE / 2] + [c[0] for c in corners]
ys = [BASE_Y, BASE_Y + BASE_H,
      KNOB[1] - KNOB_D / 2, KNOB[1] + KNOB_D / 2,
      PIVOT[1] - BEARING_D / 2 - BEARING_STROKE / 2,
      PIVOT[1] + BEARING_D / 2 + BEARING_STROKE / 2] + [c[1] for c in corners]

BBOX = (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))


def mark(ink=INK, amber=AMBER):
    """Die drei Elemente: Basis, Hebel, Knopf -- plus das Lager."""
    return f"""  <rect x="{BASE_X:g}" y="{BASE_Y:g}" width="{BASE_W:g}" height="{BASE_H:g}" rx="{BAR_R:g}" fill="{ink}"/>
  <g transform="rotate({LEVER_ANGLE:g} {PIVOT[0]:g} {PIVOT[1]:g})">
    <rect x="{LEVER_X:g}" y="{LEVER_Y:g}" width="{LEVER_W:g}" height="{LEVER_H:g}" rx="{BAR_R:g}" fill="{ink}"/>
  </g>
  <circle cx="{KNOB[0]:.3f}" cy="{KNOB[1]:.3f}" r="{KNOB_D / 2:g}" fill="{amber}"/>
  <circle cx="{PIVOT[0]:g}" cy="{PIVOT[1]:g}" r="{BEARING_D / 2:g}" fill="none" stroke="{ink}" stroke-width="{BEARING_STROKE:g}"/>"""


def logo_svg():
    x, y, w, h = BBOX
    vb = (x - CLEAR, y - CLEAR, w + 2 * CLEAR, h + 2 * CLEAR)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.3f} {vb[1]:.3f} {vb[2]:.3f} {vb[3]:.3f}" role="img" aria-label="Morse Lab">
  <title>Morse Lab</title>
{mark()}
</svg>
"""


def icon_svg(size_units=None, radius=True, pad_factor=1.0):
    """Quadratisch, Marke mittig auf Papier. Eckenradius 10px bei 44px."""
    x, y, w, h = BBOX
    inner = max(w, h) + 2 * CLEAR * pad_factor
    cx, cy = x + w / 2, y + h / 2
    vb = (cx - inner / 2, cy - inner / 2, inner, inner)
    r = f' rx="{inner * 10 / 44:.3f}"' if radius else ''
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.3f} {vb[1]:.3f} {vb[2]:.3f} {vb[3]:.3f}" role="img" aria-label="Morse Lab">
  <title>Morse Lab</title>
  <rect x="{vb[0]:.3f}" y="{vb[1]:.3f}" width="{inner:.3f}" height="{inner:.3f}"{r} fill="{PAPER}"/>
{mark()}
</svg>
"""


def fallback_svg():
    """Unter 24 px: Punkt + Pille in Amber (1.1 §3 und §8, u = Punktdurchmesser)."""
    u = 8.0
    total_w = u + u + 3 * u          # Punkt, Luecke 1u, Strich 3u
    box = 64.0
    x0 = (box - total_w) / 2
    y0 = (box - u) / 2
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box:g} {box:g}" role="img" aria-label="Morse Lab">
  <title>Morse Lab</title>
  <rect width="{box:g}" height="{box:g}" rx="{box * 10 / 44:.3f}" fill="{PAPER}"/>
  <circle cx="{x0 + u / 2:g}" cy="{y0 + u / 2:g}" r="{u / 2:g}" fill="{AMBER}"/>
  <rect x="{x0 + 2 * u:g}" y="{y0:g}" width="{3 * u:g}" height="{u:g}" rx="{u / 2:g}" fill="{AMBER}"/>
</svg>
"""


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
    open(os.path.join(out, 'logo-key.svg'), 'w').write(logo_svg())
    open(os.path.join(out, 'favicon.svg'), 'w').write(fallback_svg())
    open(os.path.join(out, 'icons', 'icon.svg'), 'w').write(icon_svg())
    # Maskable: mehr Luft, damit die Marke in der sicheren Zone bleibt.
    open(os.path.join(out, 'icons', 'icon-maskable.svg'), 'w').write(
        icon_svg(radius=False, pad_factor=2.0))

    print(f'Knopf-Mittelpunkt  : ({KNOB[0]:.3f}, {KNOB[1]:.3f})')
    print(f'Hebel-Drehpunkt    : {PIVOT}  Winkel {LEVER_ANGLE}°')
    print(f'Inhalt (bbox)      : x {BBOX[0]:.3f} y {BBOX[1]:.3f} w {BBOX[2]:.3f} h {BBOX[3]:.3f}')
    print(f'Schutzraum         : {CLEAR:g} = 1 Knopfdurchmesser')
    # Gegenprobe: Hebel wirklich gehoben, Knopf ueber dem Drehpunkt?
    print(f'Knopf liegt {PIVOT[1] - KNOB[1]:.3f} ueber dem Lager (muss > 0 sein)')
    print(f'Hebellaenge gedreht: {math.dist(KNOB, PIVOT):.3f} (Soll {LEVER_W:g})')
