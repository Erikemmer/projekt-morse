/**
 * Tests fuer das Zusammenlegen zweier Lernstaende.
 *
 * Gebaut statt durchgespielt, wie bei der Wachstumsregel: jede der vier Regeln
 * (Versuche je Zeichen, jüngerer Stand, Vereinigung, Monotonie) soll einzeln
 * kippbar sein. Die drei Kanten aus der Vorgabe -- frisches Gerät + volles
 * Konto, voller lokaler Stand + leeres Konto, beide voll -- stehen als eigene
 * Blöcke am Anfang, weil sie der Grund für dieses Modul sind.
 */

import { describe, expect, it } from 'vitest';

import { STARTING_CHARACTERS } from './settings';
import {
  emptyDay,
  emptyProgress,
  type CharacterRecord,
  type Progress,
} from './stats';
import { emptySnapshot, learningRevision, mergeProgress, type Snapshot } from './sync';

function record(attempts: number, hits: number, reactions: number[] = [1]): CharacterRecord {
  return { attempts, hits, recentReactions: reactions };
}

/** Ein Stand, den man Feld für Feld verstellen kann, ohne alles zu schreiben. */
function progress(patch: Partial<Progress> = {}): Progress {
  return { ...emptyProgress(), ...patch };
}

function snapshot(patch: Partial<Progress>, updatedAt: number): Snapshot {
  return { progress: progress(patch), updatedAt };
}

/** Ein voller Stand: acht Zeichen aktiv, geübt, mit Verlauf und Tagesstand. */
function fullProgress(): Progress {
  return progress({
    characters: {
      K: record(40, 38, [0.9, 1.1]),
      M: record(35, 30),
      R: record(20, 15),
    },
    activeCharacters: [...STARTING_CHARACTERS, 'P', 'T'],
    recentAnswers: [true, true, false, true],
    answersSinceGrowth: 12,
    sessionsStarted: 9,
    day: { date: '2026-08-30', attempts: 24, hits: 21, characters: ['K', 'M'] },
    introSeen: true,
    introducedCharacters: [...STARTING_CHARACTERS, 'P', 'T'],
    variabilityNoticeSeen: true,
  });
}

describe('Kante: frisches Gerät, volles Konto', () => {
  const remote: Snapshot = { progress: fullProgress(), updatedAt: 5_000 };

  it('übernimmt den Kontostand vollständig', () => {
    expect(mergeProgress(emptySnapshot(), remote)).toEqual(remote.progress);
  });

  it('lässt den Start-Zeichensatz des frischen Geräts nicht gewinnen', () => {
    // Ein leerer Stand hat activeCharacters = Start-Satz. Käme der durch, würde
    // ein Login den gewachsenen Satz des Kontos auf sechs Zeichen zurückwerfen.
    const merged = mergeProgress(emptySnapshot(), remote);
    expect(merged.activeCharacters).toEqual([...STARTING_CHARACTERS, 'P', 'T']);
  });
});

describe('Kante: voller lokaler Stand, leeres Konto', () => {
  const local: Snapshot = { progress: fullProgress(), updatedAt: 5_000 };

  it('behält den lokalen Stand vollständig', () => {
    expect(mergeProgress(local, emptySnapshot())).toEqual(local.progress);
  });

  it('verliert keinen einzigen Versuch', () => {
    const merged = mergeProgress(local, emptySnapshot());
    const attempts = Object.values(merged.characters).reduce((sum, r) => sum + r.attempts, 0);
    expect(attempts).toBe(95);
  });
});

describe('Kante: beide Stände voll', () => {
  const local = snapshot(
    {
      characters: { K: record(40, 38), M: record(10, 8), S: record(12, 11) },
      activeCharacters: [...STARTING_CHARACTERS, 'P'],
      recentAnswers: [true, false],
      answersSinceGrowth: 4,
      sessionsStarted: 9,
      day: { date: '2026-08-30', attempts: 10, hits: 9, characters: ['K'] },
      introSeen: true,
      introducedCharacters: [...STARTING_CHARACTERS, 'P'],
    },
    1_000,
  );

  const remote = snapshot(
    {
      characters: { K: record(20, 19), M: record(60, 55), U: record(8, 6) },
      activeCharacters: [...STARTING_CHARACTERS, 'T', 'L'],
      recentAnswers: [false, true, true],
      answersSinceGrowth: 17,
      sessionsStarted: 4,
      day: { date: '2026-09-01', attempts: 30, hits: 28, characters: ['M', 'U'] },
      introSeen: true,
      introducedCharacters: [...STARTING_CHARACTERS, 'T', 'L'],
    },
    2_000,
  );

  const merged = mergeProgress(local, remote);

  it('nimmt pro Zeichen den Datensatz mit mehr Versuchen', () => {
    expect(merged.characters.K).toEqual(record(40, 38)); // lokal: 40 > 20
    expect(merged.characters.M).toEqual(record(60, 55)); // entfernt: 60 > 10
  });

  it('behält Zeichen, die nur einer der beiden Stände kennt', () => {
    expect(merged.characters.S).toEqual(record(12, 11));
    expect(merged.characters.U).toEqual(record(8, 6));
  });

  it('nimmt Verlauf, Tag und Sperre vom jüngeren Stand -- unvermischt', () => {
    expect(merged.recentAnswers).toEqual([false, true, true]);
    expect(merged.answersSinceGrowth).toBe(17);
    expect(merged.day).toEqual({
      date: '2026-09-01',
      attempts: 30,
      hits: 28,
      characters: ['M', 'U'],
    });
  });

  it('nimmt den aktiven Zeichensatz vom jüngeren Stand', () => {
    expect(merged.activeCharacters).toEqual([...STARTING_CHARACTERS, 'T', 'L']);
  });

  it('vereinigt die eingeführten Zeichen -- niemand lernt zweimal', () => {
    expect(merged.introducedCharacters).toEqual([...STARTING_CHARACTERS, 'P', 'T', 'L']);
  });

  it('lässt den Sitzungszähler nicht sinken', () => {
    expect(merged.sessionsStarted).toBe(9);
  });
});

describe('Regel: pro Zeichen wandert der Datensatz als Ganzes', () => {
  it('mischt hits und attempts nicht über die Stände hinweg', () => {
    // Gemischt ergäbe das 38 Treffer auf 20 Versuche -- eine Quote von 190 %,
    // die niemand erlebt hat (CLAUDE.md 2.6).
    const local = snapshot({ characters: { K: record(20, 19, [0.5]) } }, 1_000);
    const remote = snapshot({ characters: { K: record(40, 38, [2.5]) } }, 2_000);

    expect(mergeProgress(local, remote).characters.K).toEqual(record(40, 38, [2.5]));
  });

  it('nimmt bei gleich viel Versuchen den lokalen Datensatz', () => {
    const local = snapshot({ characters: { K: record(20, 20, [0.5]) } }, 1_000);
    const remote = snapshot({ characters: { K: record(20, 10, [2.5]) } }, 9_000);

    expect(mergeProgress(local, remote).characters.K).toEqual(record(20, 20, [0.5]));
  });
});

describe('Regel: ein Stand ohne Versuche ist nie der jüngere', () => {
  const remote: Snapshot = { progress: fullProgress(), updatedAt: 5_000 };

  it('lässt ein frisch installiertes Gerät das Konto nicht zurückwerfen', () => {
    // Der wahrscheinlichste Ablauf überhaupt: App neu installiert, Einführung
    // durchgeklickt (schreibt introSeen -> lokaler Stand ist formal jünger),
    // dann eingeloggt. Ohne die Regel käme der aktive Satz vom leeren Gerät.
    const local: Snapshot = { progress: progress({ introSeen: true }), updatedAt: 9_999_999 };

    const merged = mergeProgress(local, remote);
    expect(merged.activeCharacters).toEqual([...STARTING_CHARACTERS, 'P', 'T']);
    expect(merged.recentAnswers).toEqual([true, true, false, true]);
    expect(merged.day.date).toBe('2026-08-30');
    expect(merged.answersSinceGrowth).toBe(12);
  });

  it('nimmt den Einmal-Merker des frischen Geräts trotzdem mit', () => {
    // Der Stand verliert seinen Zeitstempel-Vorrang, nicht seine Fakten.
    const local: Snapshot = { progress: progress({ introSeen: true }), updatedAt: 9_999_999 };
    expect(mergeProgress(local, remote).introSeen).toBe(true);
  });

  it('gilt auch umgekehrt: ein leeres Konto wirft das Gerät nicht zurück', () => {
    const local: Snapshot = { progress: fullProgress(), updatedAt: 1_000 };
    const emptyButNewer: Snapshot = { progress: progress({ introSeen: true }), updatedAt: 9_000 };

    expect(mergeProgress(local, emptyButNewer).activeCharacters).toEqual([
      ...STARTING_CHARACTERS,
      'P',
      'T',
    ]);
  });

  it('greift nicht, sobald wirklich geübt wurde -- dann zählt der Zeitstempel', () => {
    const local: Snapshot = {
      progress: progress({ characters: { K: record(1, 1) }, activeCharacters: ['K', 'M'] }),
      updatedAt: 9_000,
    };
    expect(mergeProgress(local, remote).activeCharacters).toEqual(['K', 'M']);
  });
});

describe('Regel: lokal bleibt Quelle', () => {
  it('gewinnt bei gleichem Zeitstempel', () => {
    const local = snapshot({ recentAnswers: [true], answersSinceGrowth: 1 }, 7_000);
    const remote = snapshot({ recentAnswers: [false, false], answersSinceGrowth: 2 }, 7_000);

    const merged = mergeProgress(local, remote);
    expect(merged.recentAnswers).toEqual([true]);
    expect(merged.answersSinceGrowth).toBe(1);
  });

  it('gewinnt, wenn der lokale Stand jünger ist', () => {
    const local = snapshot({ answersSinceGrowth: 1 }, 9_000);
    const remote = snapshot({ answersSinceGrowth: 2 }, 8_999);

    expect(mergeProgress(local, remote).answersSinceGrowth).toBe(1);
  });
});

describe('Regel: Einmal-Merker fallen nicht zurück', () => {
  it('behält introSeen, auch wenn der jüngere Stand ihn nicht hat', () => {
    const local = snapshot({ introSeen: true, variabilityNoticeSeen: true }, 1_000);
    const remote = snapshot({ introSeen: false, variabilityNoticeSeen: false }, 2_000);

    const merged = mergeProgress(local, remote);
    expect(merged.introSeen).toBe(true);
    expect(merged.variabilityNoticeSeen).toBe(true);
  });

  it('übernimmt sie auch in die andere Richtung', () => {
    const local = snapshot({ introSeen: false }, 2_000);
    const remote = snapshot({ introSeen: true }, 1_000);

    expect(mergeProgress(local, remote).introSeen).toBe(true);
  });
});

describe('Der Merge ist eine reine Funktion', () => {
  it('fasst seine Eingaben nicht an', () => {
    const local: Snapshot = { progress: fullProgress(), updatedAt: 1_000 };
    const remote: Snapshot = {
      progress: progress({ characters: { K: record(99, 99) }, introducedCharacters: ['Z'] }),
      updatedAt: 2_000,
    };
    const localBefore = structuredClone(local);
    const remoteBefore = structuredClone(remote);

    const merged = mergeProgress(local, remote);
    merged.activeCharacters.push('X');
    merged.introducedCharacters.push('X');
    merged.day.characters.push('X');
    merged.recentAnswers.push(false);
    merged.characters.K.recentReactions.push(42);

    expect(local).toEqual(localBefore);
    expect(remote).toEqual(remoteBefore);
  });

  it('ist idempotent: derselbe Stand zweimal ergibt denselben Stand', () => {
    const only: Snapshot = { progress: fullProgress(), updatedAt: 3_000 };
    expect(mergeProgress(only, only)).toEqual(only.progress);
  });
});

describe('learningRevision -- was als "gelernt" zaehlt', () => {
  const base = fullProgress();

  it('ändert sich, wenn geantwortet wurde', () => {
    const answered = progress({
      ...base,
      characters: { ...base.characters, K: record(41, 39, [0.9, 1.1]) },
    });
    expect(learningRevision(answered)).not.toBe(learningRevision(base));
  });

  it('ändert sich, wenn der Zeichensatz gewachsen ist', () => {
    const grown = progress({ ...base, activeCharacters: [...base.activeCharacters, 'L'] });
    expect(learningRevision(grown)).not.toBe(learningRevision(base));
  });

  it('ändert sich, wenn ein Zeichen eingeführt wurde', () => {
    const introduced = progress({
      ...base,
      introducedCharacters: [...base.introducedCharacters, 'L'],
    });
    expect(learningRevision(introduced)).not.toBe(learningRevision(base));
  });

  it('ändert sich NICHT, wenn nur die Sitzung gezählt wurde', () => {
    // Genau das passiert bei jedem Öffnen der App (beginSession). Zählte es
    // als "gelernt", wäre jedes geöffnete Gerät automatisch das jüngere.
    const opened = progress({ ...base, sessionsStarted: base.sessionsStarted + 1 });
    expect(learningRevision(opened)).toBe(learningRevision(base));
  });

  it('ändert sich NICHT, wenn nur der Tages-Eimer umgesprungen ist', () => {
    const nextDay = progress({ ...base, day: emptyDay('2026-09-02') });
    expect(learningRevision(nextDay)).toBe(learningRevision(base));
  });

  it('ändert sich NICHT, wenn nur ein Einmal-Merker umklappt', () => {
    const seen = progress({ ...base, introSeen: true, variabilityNoticeSeen: true });
    expect(learningRevision(seen)).toBe(learningRevision(base));
  });
});

describe('emptySnapshot', () => {
  it('ist leer und älter als jeder geschriebene Stand', () => {
    const fresh = emptySnapshot();
    expect(fresh.progress).toEqual(emptyProgress());
    expect(fresh.updatedAt).toBe(0);
    expect(fresh.progress.day).toEqual(emptyDay());
  });
});
