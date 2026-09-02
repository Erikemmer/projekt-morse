/**
 * Tests fuer Wortliste und Auswahl (Ruling #83, Teil A).
 *
 * Zwei Sorten Test, und sie trennen sich sauber:
 *
 * 1. **Die Liste gegen ihre Kriterien** -- jede Zeile, nicht eine Stichprobe.
 *    Diese Faelle sind der Grund, warum eine spaetere Ergaenzung nicht still
 *    daneben liegen kann.
 * 2. **Die Auswahl mit fester Zufallsfolge.** Der Zufall kommt als Parameter
 *    herein, also wird hier nicht gewuerfelt: eine Ziehung, die "meistens"
 *    stimmt, ist kein Test. Wo eine Aussage von Natur aus statistisch ist
 *    (die Gewichtung nach Schwaeche in den Gruppen), steht ein deterministischer
 *    Generator dahinter und die Aussage ist ein Vergleich, keine Schwelle.
 */

import { describe, expect, it } from 'vitest';

import { CHARACTER_ORDER } from './settings';
import { emptyProgress, type CharacterRecord, type Progress } from './stats';
import {
  GROUP_MAX_LENGTH,
  GROUP_MIN_LENGTH,
  PROMPT_MAX_LENGTH,
  WORDS_MIN_BUILDABLE,
  WORDS_MIN_CHARACTERS,
  WORD_LIST,
  WORD_MAX_LENGTH,
  WORD_MIN_LENGTH,
  WORD_SHARE,
  buildableWords,
  nextPrompt,
  weakOrSlowCharacters,
  wordsUnlocked,
} from './words';

/** Zufallsquelle mit fester Folge -- wiederholt den letzten Wert, wenn sie leer ist. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

/**
 * Erzwingt fuer *eine* Aufgabe die Gruppe, ohne die Ziehung danach zu
 * verbiegen: die erste Zahl entscheidet die Muenze Wort/Gruppe, alle weiteren
 * kommen unveraendert vom Generator. Die Muenze zu klemmen, indem man jede Zahl
 * nach oben zieht, waere kein Test der Gruppen mehr -- dann kaeme aus `pickNext`
 * nur noch das Ende der Kandidatenliste.
 */
function forcedGroup(random: () => number): () => number {
  let first = true;
  return () => {
    if (!first) return random();
    first = false;
    return 1 - Number.EPSILON;
  };
}

/** Ein deterministischer Generator fuer die statistischen Faelle (LCG, Numerical Recipes). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function record(attempts: number, hits: number, reactions: number[] = []): CharacterRecord {
  return { attempts, hits, recentReactions: reactions };
}

/** Alle Zeichen aktiv, alles gemessen und sitzend -- der Stand nach dem letzten Wachstum. */
function fullProgress(patch: Partial<Progress> = {}): Progress {
  const characters: Record<string, CharacterRecord> = {};
  for (const char of CHARACTER_ORDER) characters[char] = record(10, 10, [0.5, 0.5, 0.5]);

  return {
    ...emptyProgress(),
    activeCharacters: [...CHARACTER_ORDER],
    characters,
    ...patch,
  };
}

describe('Die Wortliste gegen ihre Kriterien', () => {
  it('hat 150 bis 250 Eintraege', () => {
    expect(WORD_LIST.length).toBeGreaterThanOrEqual(150);
    expect(WORD_LIST.length).toBeLessThanOrEqual(250);
  });

  it('enthaelt in jeder Zeile nur a-z und 2 bis 5 Buchstaben', () => {
    for (const word of WORD_LIST) {
      expect(word, `"${word}" ist nicht rein a-z`).toMatch(/^[a-z]+$/);
      expect(word.length, `"${word}" ist zu kurz oder zu lang`).toBeGreaterThanOrEqual(
        WORD_MIN_LENGTH,
      );
      expect(word.length, `"${word}" ist zu kurz oder zu lang`).toBeLessThanOrEqual(
        WORD_MAX_LENGTH,
      );
    }
  });

  it('hat keine Dubletten', () => {
    expect(new Set(WORD_LIST).size).toBe(WORD_LIST.length);
  });

  it('steht nach Laenge und darin alphabetisch -- damit eine Dublette auffaellt', () => {
    for (let index = 1; index < WORD_LIST.length; index += 1) {
      const previous = WORD_LIST[index - 1];
      const current = WORD_LIST[index];
      const ordered =
        current.length > previous.length ||
        (current.length === previous.length && current > previous);
      expect(ordered, `"${previous}" vor "${current}" ist nicht die Ordnung`).toBe(true);
    }
  });

  it('deckt jeden Buchstaben des Alphabets ab -- auch die spaeten der Reihe', () => {
    const letters = new Set(WORD_LIST.join(''));
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(letters.has(letter), `kein Wort mit "${letter}"`).toBe(true);
    }
  });

  it('laesst jede Aufgabe in die Eingabegrenze passen', () => {
    expect(PROMPT_MAX_LENGTH).toBe(Math.max(WORD_MAX_LENGTH, GROUP_MAX_LENGTH));
    for (const word of WORD_LIST) expect(word.length).toBeLessThanOrEqual(PROMPT_MAX_LENGTH);
  });
});

describe('Freischaltung', () => {
  it('oeffnet ab WORDS_MIN_CHARACTERS aktiven Zeichen', () => {
    expect(WORDS_MIN_CHARACTERS).toBe(8);
    expect(wordsUnlocked(WORDS_MIN_CHARACTERS - 1)).toBe(false);
    expect(wordsUnlocked(WORDS_MIN_CHARACTERS)).toBe(true);
    expect(wordsUnlocked(36)).toBe(true);
  });

  it('bleibt zu, solange nur der Start-Zeichensatz aktiv ist', () => {
    expect(wordsUnlocked(emptyProgress().activeCharacters.length)).toBe(false);
  });
});

describe('Baubare Woerter', () => {
  it('nimmt nur Woerter, deren Buchstaben alle aktiv sind', () => {
    const words = buildableWords([...'ATUPSMR']);
    expect(words).toContain('AT');
    expect(words).toContain('MAP');
    expect(words).not.toContain('THE');
  });

  it('liefert Grossbuchstaben -- so schreibt das Alphabet', () => {
    for (const word of buildableWords([...CHARACTER_ORDER])) {
      expect(word).toMatch(/^[A-Z]+$/);
    }
  });

  it('gibt bei vollem Satz die ganze Liste', () => {
    expect(buildableWords([...CHARACTER_ORDER]).length).toBe(WORD_LIST.length);
  });

  it('gibt bei leerem Satz nichts', () => {
    expect(buildableWords([])).toEqual([]);
  });

  it('hat bei acht aktiven Zeichen noch zu wenige fuer die Mischung', () => {
    const eight = [...CHARACTER_ORDER].slice(0, WORDS_MIN_CHARACTERS);
    expect(buildableWords(eight).length).toBeLessThan(WORDS_MIN_BUILDABLE);
  });
});

describe('Schwache und langsame Zeichen', () => {
  it('nennt ein Zeichen unter der Zeichen-Mindestquote schwach', () => {
    const progress = fullProgress({
      characters: { ...fullProgress().characters, Q: record(10, 5) },
    });
    expect(weakOrSlowCharacters(progress)).toContain('Q');
  });

  it('nennt ein langsames Zeichen langsam, obwohl die Quote stimmt', () => {
    const progress = fullProgress({
      characters: { ...fullProgress().characters, Z: record(10, 10, [2.4, 2.5, 2.6, 2.7, 2.8]) },
    });
    expect(weakOrSlowCharacters(progress)).toContain('Z');
  });

  it('nennt ein nie abgefragtes Zeichen nicht schwach, sondern gar nicht', () => {
    const progress = { ...emptyProgress(), activeCharacters: [...'KMRSUAPT'] };
    expect(weakOrSlowCharacters(progress)).toEqual([]);
  });

  it('nennt nichts, wenn alles sitzt', () => {
    expect(weakOrSlowCharacters(fullProgress())).toEqual([]);
  });

  it('sieht nur den aktiven Satz an', () => {
    const progress = fullProgress({
      activeCharacters: [...'KMRSUAPT'],
      characters: { ...fullProgress().characters, Q: record(10, 2) },
    });
    expect(weakOrSlowCharacters(progress)).not.toContain('Q');
  });
});

describe('Die naechste Aufgabe', () => {
  it('ist bei derselben Zufallsfolge dieselbe', () => {
    const progress = fullProgress();
    const first = nextPrompt(progress, { random: sequence([0.5, 0.31, 0.9]) });
    const second = nextPrompt(progress, { random: sequence([0.5, 0.31, 0.9]) });
    expect(first).toBe(second);
  });

  it('gibt nur Gruppen, solange zu wenige Woerter baubar sind', () => {
    const progress = {
      ...emptyProgress(),
      activeCharacters: [...CHARACTER_ORDER].slice(0, WORDS_MIN_CHARACTERS),
    };
    expect(buildableWords(progress.activeCharacters).length).toBeLessThan(WORDS_MIN_BUILDABLE);

    // Die Muenze sagt "Wort" (0.5 < WORD_SHARE), es gibt aber keine -- also eine
    // Gruppe, und mit dieser Folge eine, die man hinschreiben kann.
    expect(nextPrompt(progress, { random: sequence([0.5, 0, 0, 0, 0]) })).toBe('KMK');
  });

  it('gibt bei vollem Satz und derselben Folge ein Wort', () => {
    expect(nextPrompt(fullProgress(), { random: sequence([0.5, 0, 0, 0, 0]) })).toBe('AN');
  });

  it('gibt eine Gruppe, wenn die Muenze auf Gruppe faellt', () => {
    expect(WORD_SHARE).toBe(0.7);
    expect(nextPrompt(fullProgress(), { random: sequence([0.8, 0, 0, 0, 0]) })).toBe('KMK');
  });

  it('wiederholt die vorige Aufgabe nicht, wenn es Alternativen gibt', () => {
    const progress = fullProgress();
    const options = { random: sequence([0.5, 0, 0, 0, 0]), avoid: 'AN' };
    expect(nextPrompt(progress, options)).not.toBe('AN');
  });

  it('bevorzugt Woerter mit einem schwachen Zeichen', () => {
    const progress = fullProgress({
      characters: { ...fullProgress().characters, Z: record(10, 4) },
    });
    // Dieselbe Folge, die ohne schwaches Zeichen "AN" ergibt.
    const prompt = nextPrompt(progress, { random: sequence([0.5, 0, 0, 0, 0]) });
    expect(prompt).toContain('Z');
  });

  it('faellt auf gleichverteilt zurueck, wenn nichts schwach ist ("sonst zufaellig")', () => {
    const progress = fullProgress();
    expect(weakOrSlowCharacters(progress)).toEqual([]);
    expect(nextPrompt(progress, { random: sequence([0.5, 0.999]) })).toBe(
      buildableWords(progress.activeCharacters).at(-1),
    );
  });
});

describe('Gruppen', () => {
  const group = (random: () => number, progress = fullProgress()) =>
    nextPrompt(progress, { random });

  it('sind 3 bis 5 Zeichen lang -- und die Laenge haengt an der ersten Zahl', () => {
    expect(group(sequence([0.8, 0, 0, 0, 0, 0, 0])).length).toBe(GROUP_MIN_LENGTH);
    expect(group(sequence([0.8, 0.5, 0, 0, 0, 0, 0])).length).toBe(4);
    expect(group(sequence([0.8, 0.999, 0, 0, 0, 0, 0])).length).toBe(GROUP_MAX_LENGTH);
  });

  it('bestehen nur aus aktiven Zeichen -- Ziffern eingeschlossen', () => {
    const active = [...'KMRSUAPTLOWINJEF0Y'];
    const progress = { ...emptyProgress(), activeCharacters: active };
    const random = lcg(7);

    let sawDigit = false;
    for (let round = 0; round < 200; round += 1) {
      const prompt = nextPrompt(progress, { random: forcedGroup(random) });
      for (const char of prompt) {
        expect(active).toContain(char);
        if (/[0-9]/.test(char)) sawDigit = true;
      }
    }
    expect(sawDigit).toBe(true);
  });

  it('wiederholen kein Zeichen direkt hintereinander', () => {
    const random = lcg(11);
    for (let round = 0; round < 200; round += 1) {
      const prompt = nextPrompt(fullProgress(), { random: forcedGroup(random) });
      for (let index = 1; index < prompt.length; index += 1) {
        expect(prompt[index], `"${prompt}" wiederholt ein Zeichen`).not.toBe(prompt[index - 1]);
      }
    }
  });

  it('holen ein schwaches Zeichen deutlich oefter herein als ein sitzendes', () => {
    const progress = fullProgress({
      characters: { ...fullProgress().characters, Q: record(10, 0) },
    });
    const random = lcg(23);

    let weak = 0;
    let solid = 0;
    for (let round = 0; round < 400; round += 1) {
      const prompt = nextPrompt(progress, { random: forcedGroup(random) });
      if (prompt.includes('Q')) weak += 1;
      if (prompt.includes('K')) solid += 1;
    }
    expect(weak).toBeGreaterThan(solid);
  });
});
