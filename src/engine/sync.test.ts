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
  type SendCharacterRecord,
} from './stats';
import { emptySnapshot, learningRevision, mergeProgress, type Snapshot } from './sync';

function record(attempts: number, hits: number, reactions: number[] = [1]): CharacterRecord {
  return { attempts, hits, recentReactions: reactions };
}

function sendRecord(
  attempts: number,
  correct: number,
  lastDahDitRatio: number | null = 3,
  lastGapRatio: number | null = 1,
): SendCharacterRecord {
  return { attempts, correct, lastDahDitRatio, lastGapRatio };
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
    day: { date: '2026-08-30', attempts: 24, hits: 21, characters: ['K', 'M'], words: 3, sent: 2 },
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
      day: { date: '2026-08-30', attempts: 10, hits: 9, characters: ['K'], words: 1, sent: 4 },
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
      day: { date: '2026-09-01', attempts: 30, hits: 28, characters: ['M', 'U'], words: 6, sent: 9 },
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
      // Die Wort- und Sende-Aufgaben des Tages wandern mit dem Eimer, nicht
      // summiert (Ruling #87 bzw. #90): vom juengeren Stand, nicht addiert.
      words: 6,
      sent: 9,
    });
  });

  it('vereinigt die aktiven Zeichen -- lokale Reihenfolge zuerst', () => {
    // Lokal: Start-Satz + P. Entfernt: Start-Satz + T + L. Keiner verliert
    // etwas (Ruling #56).
    expect(merged.activeCharacters).toEqual([...STARTING_CHARACTERS, 'P', 'T', 'L']);
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

describe('Regel: die Sende-Statistik merged wie die Hoer-Statistik, aber getrennt (#90, F.17)', () => {
  it('nimmt pro Zeichen den Sende-Datensatz mit mehr Versuchen -- als Ganzes', () => {
    const local = snapshot({ sendCharacters: { R: sendRecord(5, 4, 2.0, 0.5) } }, 1_000);
    const remote = snapshot({ sendCharacters: { R: sendRecord(9, 8, 3.1, 1.0) } }, 2_000);

    // Nicht vermischt: "correct" vom einen, "attempts" vom anderen waere eine
    // Quote, die niemand erlebt hat.
    expect(mergeProgress(local, remote).sendCharacters.R).toEqual(sendRecord(9, 8, 3.1, 1.0));
  });

  it('behaelt Zeichen, die nur einer der beiden Staende gesendet hat', () => {
    const local = snapshot({ sendCharacters: { R: sendRecord(5, 4) } }, 1_000);
    const remote = snapshot({ sendCharacters: { S: sendRecord(3, 3) } }, 2_000);

    const merged = mergeProgress(local, remote);
    expect(merged.sendCharacters.R).toEqual(sendRecord(5, 4));
    expect(merged.sendCharacters.S).toEqual(sendRecord(3, 3));
  });

  it('nimmt bei Gleichstand den lokalen Datensatz', () => {
    const local = snapshot({ sendCharacters: { R: sendRecord(5, 5) } }, 1_000);
    const remote = snapshot({ sendCharacters: { R: sendRecord(5, 1) } }, 9_000);

    expect(mergeProgress(local, remote).sendCharacters.R).toEqual(sendRecord(5, 5));
  });

  it('laesst die Hoer-Statistik voellig unberuehrt vom Gewinner der Sende-Statistik', () => {
    // Der Gegenbeleg zu F.17: mehr Sende-Versuche auf der einen Seite duerfen
    // nicht den Hoer-Datensatz mitziehen -- beide Statistiken wandern fuer
    // sich, jede nach ihrer eigenen "mehr Versuche"-Regel.
    const local = snapshot(
      { characters: { R: record(50, 48) }, sendCharacters: { R: sendRecord(2, 1) } },
      1_000,
    );
    const remote = snapshot(
      { characters: { R: record(10, 9) }, sendCharacters: { R: sendRecord(9, 8) } },
      2_000,
    );

    const merged = mergeProgress(local, remote);
    expect(merged.characters.R).toEqual(record(50, 48)); // Hoeren: lokal gewinnt
    expect(merged.sendCharacters.R).toEqual(sendRecord(9, 8)); // Senden: remote gewinnt
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
    // Geprüft am Verlauf, nicht am Zeichensatz: der ist seit #56 die
    // Vereinigung und hängt nicht mehr am Zeitstempel.
    const local: Snapshot = {
      progress: progress({
        characters: { K: record(1, 1) },
        recentAnswers: [true],
        answersSinceGrowth: 1,
      }),
      updatedAt: 9_000,
    };

    const merged = mergeProgress(local, remote);
    expect(merged.recentAnswers).toEqual([true]);
    expect(merged.answersSinceGrowth).toBe(1);
  });
});

describe('Regel: Wachstum ist monoton -- der aktive Satz schrumpft nie (#56)', () => {
  it('behält den größeren Satz, auch wenn der jüngere Stand kleiner ist', () => {
    // Der Fall, der vor #56 Arbeit kostete: Gerät A wächst auf zwölf Zeichen
    // und synchronisiert, Gerät B übt danach mit sechsen weiter und schiebt
    // hoch. Vorher gewann B. Jetzt gewinnt niemand -- beide behalten alles.
    const grown = [...STARTING_CHARACTERS, 'P', 'T', 'L', 'W', 'I', 'N'];
    const local: Snapshot = {
      progress: progress({ characters: { K: record(80, 74) }, activeCharacters: grown }),
      updatedAt: 1_000,
    };
    const remote: Snapshot = {
      progress: progress({
        characters: { M: record(90, 80) },
        activeCharacters: [...STARTING_CHARACTERS],
      }),
      updatedAt: 9_000,
    };

    expect(mergeProgress(local, remote).activeCharacters).toEqual(grown);
  });

  it('verliert kein aktives Zeichen, egal von welcher Seite es kommt', () => {
    const local: Snapshot = {
      progress: progress({
        characters: { K: record(5, 5) },
        activeCharacters: [...STARTING_CHARACTERS, 'P'],
      }),
      updatedAt: 5_000,
    };
    const remote: Snapshot = {
      progress: progress({
        characters: { M: record(5, 5) },
        activeCharacters: [...STARTING_CHARACTERS, 'L'],
      }),
      updatedAt: 5_000,
    };

    const merged = mergeProgress(local, remote);
    for (const char of [...STARTING_CHARACTERS, 'P', 'L']) {
      expect(merged.activeCharacters).toContain(char);
    }
    // Und nichts erfunden: genau die Vereinigung, ohne Dubletten.
    expect(merged.activeCharacters).toHaveLength(STARTING_CHARACTERS.length + 2);
    expect(new Set(merged.activeCharacters).size).toBe(merged.activeCharacters.length);
  });

  it('ist in beiden Argument-Reihenfolgen dieselbe Menge', () => {
    const a: Snapshot = {
      progress: progress({ activeCharacters: [...STARTING_CHARACTERS, 'P'] }),
      updatedAt: 1_000,
    };
    const b: Snapshot = {
      progress: progress({ activeCharacters: [...STARTING_CHARACTERS, 'L'] }),
      updatedAt: 2_000,
    };

    const forward = mergeProgress(a, b).activeCharacters;
    const backward = mergeProgress(b, a).activeCharacters;
    expect([...forward].sort()).toEqual([...backward].sort());
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

/*
 * Das Tempo-Niveau im Merge (Ruling #83, Teil B).
 *
 * Zwei verschiedene Regeln fuer zwei verschiedene Bedeutungen: das erreichte
 * Niveau ist Wachstum (Maximum, wie der aktive Satz), der Sperr-Zaehler ist
 * eine Momentaufnahme (juengerer Stand, wie `answersSinceGrowth`).
 */
describe('Tempo-Niveau', () => {
  it('nimmt das Maximum -- ein Merge macht kein Gerät langsamer', () => {
    const merged = mergeProgress(
      { progress: { ...fullProgress(), effectiveWpm: 12 }, updatedAt: 200 },
      { progress: { ...fullProgress(), effectiveWpm: 17 }, updatedAt: 100 },
    );
    expect(merged.effectiveWpm).toBe(17);
  });

  it('nimmt das Maximum auch, wenn der jüngere Stand tiefer steht', () => {
    const merged = mergeProgress(
      { progress: { ...fullProgress(), effectiveWpm: 10 }, updatedAt: 900 },
      { progress: { ...fullProgress(), effectiveWpm: 15 }, updatedAt: 100 },
    );
    expect(merged.effectiveWpm).toBe(15);
  });

  it('nimmt den Sperr-Zähler vom jüngeren Stand', () => {
    const merged = mergeProgress(
      { progress: { ...fullProgress(), answersSinceSpeedUp: 3 }, updatedAt: 100 },
      { progress: { ...fullProgress(), answersSinceSpeedUp: 18 }, updatedAt: 900 },
    );
    expect(merged.answersSinceSpeedUp).toBe(18);
  });

  it('lässt ein frisches Gerät das Niveau des Kontos übernehmen', () => {
    const merged = mergeProgress(emptySnapshot(), {
      progress: { ...fullProgress(), effectiveWpm: 14 },
      updatedAt: 500,
    });
    expect(merged.effectiveWpm).toBe(14);
  });

  it('ändert die Lern-Kennung nicht -- ein Tempo ist kein Lernfortschritt', () => {
    const base = fullProgress();
    expect(learningRevision({ ...base, effectiveWpm: 19 })).toBe(learningRevision(base));
  });
});
