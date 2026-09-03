/**
 * Tests für den Beutel des Einzelzeichen-Loops (Ruling Notion-Log #103b).
 *
 * Vier Eigenschaften, alle über einen vollen Zyklus geprüft: jedes aktive
 * Zeichen kommt vor, keines mehr als zweimal, keines zweimal hintereinander
 * (auch nicht über die Zyklusgrenze), und bei fester Zufallsfolge ist das
 * Ergebnis deterministisch.
 */

import { describe, expect, it } from 'vitest';

import { drawFromBag, type Bag } from './bag';
import { GROWTH_MIN_CHARACTER_ACCURACY } from './growth';
import { emptyProgress, type Progress } from './stats';

/** Ein Zeichen mit erfundenem, aber stimmigem Datensatz (wie drill.test.ts). */
function withCharacter(
  progress: Progress,
  char: string,
  reactions: number[],
  options: { attempts?: number; hits?: number } = {},
): Progress {
  const attempts = options.attempts ?? reactions.length;
  const hits = options.hits ?? reactions.length;
  return {
    ...progress,
    characters: { ...progress.characters, [char]: { attempts, hits, recentReactions: reactions } },
  };
}

/** Macht ein Zeichen schwach: Trefferquote unter GROWTH_MIN_CHARACTER_ACCURACY. */
function weak(progress: Progress, char: string): Progress {
  return withCharacter(progress, char, [], { attempts: 10, hits: 5 });
}
// Sicherstellen, dass "schwach" wirklich unter der Schwelle liegt.
if (5 / 10 >= GROWTH_MIN_CHARACTER_ACCURACY) throw new Error('Testannahme verletzt');

/** Macht ein Zeichen langsam: sicher, aber Median über der Drill-Schwelle. */
function slow(progress: Progress, char: string): Progress {
  return withCharacter(progress, char, [2.4, 2.2, 2.6, 2.3, 2.5], { attempts: 5, hits: 5 });
}

function progressWith(chars: readonly string[]): Progress {
  return { ...emptyProgress(), activeCharacters: [...chars] };
}

/** Zufallsquelle mit fester Folge -- wiederholt den letzten Wert. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

/** Zieht `count` Zeichen am Stueck, reicht Beutel und "avoid" durch. */
function drawMany(
  pool: readonly string[],
  progress: Progress,
  random: () => number,
  count: number,
): string[] {
  const out: string[] = [];
  let bag: Bag = [];
  let avoid: string | null = null;
  for (let i = 0; i < count; i += 1) {
    const draw = drawFromBag(pool, bag, progress, { random, avoid });
    out.push(draw.char);
    bag = draw.bag;
    avoid = draw.char;
  }
  return out;
}

describe('Der Beutel', () => {
  const pool = ['A', 'B', 'C', 'D', 'E', 'F'];

  it('enthaelt in einem vollen Zyklus jedes aktive Zeichen mindestens einmal', () => {
    const progress = progressWith(pool);
    const drawn = drawMany(pool, progress, sequence([0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.05]), pool.length);
    expect(new Set(drawn)).toEqual(new Set(pool));
  });

  it('zieht kein Zeichen mehr als zweimal in einem Zyklus', () => {
    const progress = weak(slow(progressWith(pool), 'B'), 'A');
    const drawn = drawMany(pool, progress, sequence([0.4, 0.6, 0.1, 0.9, 0.3, 0.7, 0.5, 0.2]), pool.length);

    const counts = new Map<string, number>();
    for (const char of drawn) counts.set(char, (counts.get(char) ?? 0) + 1);
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('zieht kein Zeichen zweimal hintereinander -- auch nicht ueber die Zyklusgrenze', () => {
    const progress = weak(slow(progressWith(pool), 'B'), 'A');
    // Drei volle Zyklen, mit einer Zufallsfolge, die staendig an ihr Ende laeuft
    // und dann wiederholt -- der Fall, der eine Wiederholung an der Naht am
    // ehesten produzieren wuerde.
    const random = sequence([0.99, 0.01, 0.5]);
    const drawn = drawMany(pool, progress, random, pool.length * 3);

    for (let i = 1; i < drawn.length; i += 1) {
      expect(drawn[i]).not.toBe(drawn[i - 1]);
    }
  });

  it('ist bei gegebener Zufallsfolge deterministisch', () => {
    const progress = weak(progressWith(pool), 'C');
    const a = drawMany(pool, progress, sequence([0.42]), pool.length * 2);
    const b = drawMany(pool, progress, sequence([0.42]), pool.length * 2);
    expect(a).toEqual(b);
  });

  it('gibt bei einem Pool der Groesse 1 die Abfrage vor der Wiederholungsregel den Vorrang', () => {
    const progress = progressWith(['A']);
    const drawn = drawMany(['A'], progress, sequence([0, 0.5, 0.9]), 4);
    expect(drawn).toEqual(['A', 'A', 'A', 'A']);
  });

  it('schwache oder langsame Zeichen bekommen hoechstens ein Zusatzlos (Verhaeltnis <= 2,2 ueber 200 Aufgaben, 18 Zeichen)', () => {
    const eighteen = Array.from({ length: 18 }, (_, i) => String.fromCharCode(65 + i));
    let progress = progressWith(eighteen);
    // Sechs von achtzehn schwach oder langsam -- ein realistischer Ausschnitt,
    // kein Sonderfall (alle oder keins waeren beide uninteressant fuers Verhaeltnis).
    for (const char of ['A', 'B', 'C']) progress = weak(progress, char);
    for (const char of ['D', 'E', 'F']) progress = slow(progress, char);

    // Eine lange, variierte Zufallsfolge statt einer Konstante -- eine Konstante
    // wuerde denselben Fisher-Yates-Swap immer wieder anwenden und keine echte
    // Durchmischung zeigen.
    const values = Array.from({ length: 4000 }, (_, i) => (i * 0.6180339887 + 0.137) % 1);
    const drawn = drawMany(eighteen, progress, sequence(values), 200);

    const counts = new Map<string, number>();
    for (const char of eighteen) counts.set(char, 0);
    for (const char of drawn) counts.set(char, (counts.get(char) ?? 0) + 1);

    const frequencies = [...counts.values()];
    const max = Math.max(...frequencies);
    const min = Math.min(...frequencies);

    // Gemessen (Report): 17:8 = 2,13 -- vorher bis zu 7 (weightFor, siehe HANDOVER).
    expect(min).toBeGreaterThan(0);
    expect(max / min).toBeLessThanOrEqual(2.2);
  });
});
