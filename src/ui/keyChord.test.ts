/**
 * Tests fuer die eine Regel, die alle Tastatur-Handler teilen.
 *
 * Der Fall, der hier zaehlt, ist der letzte: ein haengengebliebenes `altKey`
 * nach Alt-Tab darf einen Anschlag nicht mehr verschlucken. Er ist der Grund,
 * aus dem es dieses Modul gibt.
 */

import { describe, expect, it } from 'vitest';

import { isBrowserChord } from './keyChord';

/** Ein Anschlag ohne jede Modifikator-Taste. */
const plain = { ctrlKey: false, metaKey: false };

describe('isBrowserChord', () => {
  it('laesst einen blanken Anschlag durch', () => {
    expect(isBrowserChord(plain)).toBe(false);
  });

  it('schuetzt Strg-Kuerzel (Strg+R, Strg+S)', () => {
    expect(isBrowserChord({ ...plain, ctrlKey: true })).toBe(true);
  });

  it('schuetzt Cmd-Kuerzel', () => {
    expect(isBrowserChord({ ...plain, metaKey: true })).toBe(true);
  });

  it('laesst einen Anschlag mit haengendem Alt durch (Alt-Tab-Fall)', () => {
    // Nach Alt-Tab meldet der Browser altKey weiter als gedrueckt, weil ihm
    // das keyup nie zugestellt wurde. Genau das hat Anschlaege gefressen --
    // in jedem Modus, unreproduzierbar, ueber sechs Runden hinweg.
    expect(isBrowserChord({ ...plain, altKey: true } as never)).toBe(false);
  });

  it('filtert AltGr weiter, weil es auf Windows Ctrl+Alt ist', () => {
    expect(isBrowserChord({ ctrlKey: true, metaKey: false })).toBe(true);
  });
});
