/**
 * Tests für den Streak mit Freeze-Gnade (Notion-Log #29).
 *
 * Kein einziger Test stellt eine Uhr: der Kalendertag kommt überall als String
 * herein, so wie die Engine ihn bekommt. Damit sind Monatswechsel,
 * Jahreswechsel und der 29. Februar gewöhnliche Eingaben statt Sonderfälle,
 * die man nur mit gefälschter Systemzeit erreicht.
 */

import { describe, expect, it } from 'vitest';

import { advance, createSession, submitAnswer, type SessionState } from './session';
import { emptyProgress } from './stats';
import {
  FREEZE_EARNED_AFTER_DAYS,
  emptyStreak,
  mergeStreak,
  parseStreak,
  recordPracticeDay,
  streakStanding,
  type Streak,
} from './streak';

/** Übt eine Reihe aufeinanderfolgender Tage durch. */
function practiceDays(days: string[], from: Streak = emptyStreak()): Streak {
  return days.reduce((streak, day) => recordPracticeDay(streak, day), from);
}

/** Sieben Tage in Folge ab dem 1. September 2026 -- genau ein Freeze verdient. */
const FIRST_WEEK = [
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05',
  '2026-09-06',
  '2026-09-07',
];

describe('Streak: geübte Tage zählen', () => {
  it('fängt beim ersten geübten Tag bei eins an', () => {
    const streak = recordPracticeDay(emptyStreak(), '2026-09-01');
    expect(streak.days).toBe(1);
    expect(streak.lastPracticedDay).toBe('2026-09-01');
  });

  it('zählt einen zweiten Abschluss am selben Tag nicht doppelt', () => {
    const once = recordPracticeDay(emptyStreak(), '2026-09-01');
    const twice = recordPracticeDay(once, '2026-09-01');
    expect(twice.days).toBe(1);
    // Identisch, nicht nur gleich: der Aufrufer soll billig sehen, dass nichts passierte.
    expect(twice).toBe(once);
  });

  it('zählt aufeinanderfolgende Tage hoch', () => {
    expect(practiceDays(FIRST_WEEK).days).toBe(7);
  });

  it('läuft über den Monatswechsel weiter', () => {
    const streak = practiceDays(['2026-09-29', '2026-09-30', '2026-10-01']);
    expect(streak.days).toBe(3);
  });

  it('läuft über den Jahreswechsel weiter', () => {
    const streak = practiceDays(['2026-12-31', '2027-01-01']);
    expect(streak.days).toBe(2);
  });

  it('kennt den 29. Februar eines Schaltjahrs als echten Tag', () => {
    const streak = practiceDays(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(streak.days).toBe(3);
  });

  it('rührt den Eingabe-Stand nicht an', () => {
    const before = practiceDays(['2026-09-01']);
    const copy = { ...before };
    recordPracticeDay(before, '2026-09-02');
    expect(before).toEqual(copy);
  });

  it('ignoriert einen Tag vor dem zuletzt geübten -- nie zurückstufen', () => {
    const streak = practiceDays(['2026-09-01', '2026-09-02']);
    expect(recordPracticeDay(streak, '2026-08-31')).toBe(streak);
  });

  it('ignoriert einen unbrauchbaren Tag, statt den Stand zu verlieren', () => {
    const streak = practiceDays(['2026-09-01']);
    expect(recordPracticeDay(streak, '2026-02-30')).toBe(streak);
    expect(recordPracticeDay(streak, 'heute')).toBe(streak);
  });
});

describe('Streak: der Freeze', () => {
  it('liegt nach sieben geübten Tagen in Folge im Vorrat -- vorher nicht', () => {
    const six = practiceDays(FIRST_WEEK.slice(0, FREEZE_EARNED_AFTER_DAYS - 1));
    expect(six.freezeReady).toBe(false);

    const seven = practiceDays(FIRST_WEEK);
    expect(seven.freezeReady).toBe(true);
  });

  it('deckt genau einen verpassten Tag und läuft dann weiter', () => {
    // Sieben Tage, dann der 8. ausgelassen, am 9. wieder geübt.
    const streak = recordPracticeDay(practiceDays(FIRST_WEEK), '2026-09-09');

    expect(streak.days).toBe(8);
    expect(streak.freezeReady).toBe(false);
    expect(streak.freezeUsedDay).toBe('2026-09-08');
  });

  it('endet bei zwei verpassten Tagen -- auch mit Freeze im Vorrat', () => {
    const before = practiceDays(FIRST_WEEK);
    const streak = recordPracticeDay(before, '2026-09-10');

    expect(streak.days).toBe(1);
    // Der Vorrat bleibt: die Pause hat den Streak gekostet, das genügt.
    expect(streak.freezeReady).toBe(true);
  });

  it('endet nach einem verpassten Tag, wenn kein Freeze da ist', () => {
    const streak = recordPracticeDay(practiceDays(['2026-09-01', '2026-09-02']), '2026-09-04');
    expect(streak.days).toBe(1);
  });

  it('muss nach dem Verbrauch neu verdient werden -- nicht am nächsten Tag', () => {
    // Sieben Tage, Freeze verdient; 8. ausgelassen, 9. verbraucht ihn.
    let streak = recordPracticeDay(practiceDays(FIRST_WEEK), '2026-09-09');
    expect(streak.freezeReady).toBe(false);

    // Fünf weitere Tage in Folge: noch nicht genug.
    streak = practiceDays(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14'], streak);
    expect(streak.freezeReady).toBe(false);

    // Der siebte Tag nach dem Verbrauch füllt den Vorrat wieder.
    streak = practiceDays(['2026-09-15'], streak);
    expect(streak.freezeReady).toBe(true);
  });

  it('sammelt nie mehr als einen -- der Vorrat ist gedeckelt', () => {
    // Vier Wochen am Stück: der Vorrat ist voll, mehr wird nicht.
    let streak = emptyStreak();
    for (let day = 1; day <= 28; day += 1) {
      streak = recordPracticeDay(streak, `2026-09-${String(day).padStart(2, '0')}`);
    }
    expect(streak.days).toBe(28);
    expect(streak.freezeReady).toBe(true);
    expect(streak.daysTowardFreeze).toBe(0);
  });
});

describe('Streak: wie er heute dasteht', () => {
  const week = practiceDays(FIRST_WEEK);

  it('zählt am selben Tag, was schon gezählt ist', () => {
    expect(streakStanding(week, '2026-09-07').days).toBe(7);
  });

  it('hält den Streak den ganzen folgenden Tag -- noch nicht geübt ist kein Bruch', () => {
    expect(streakStanding(week, '2026-09-08').days).toBe(7);
  });

  it('hält ihn einen Tag länger, solange ein Freeze bereitliegt', () => {
    const standing = streakStanding(week, '2026-09-09');
    expect(standing.days).toBe(7);
    expect(standing.freezeReady).toBe(true);
  });

  it('meldet ihn als beendet, sobald zwei Tage fehlen und nichts mehr deckt', () => {
    expect(streakStanding(week, '2026-09-10').days).toBe(0);

    const withoutFreeze = practiceDays(['2026-09-01', '2026-09-02']);
    expect(streakStanding(withoutFreeze, '2026-09-04').days).toBe(0);
  });

  it('behauptet nach einer langen Pause keine Reihe mehr', () => {
    expect(streakStanding(week, '2026-10-20').days).toBe(0);
  });

  it('sagt nur dann "gestern", wenn der Freeze wirklich gestern griff', () => {
    const afterFreeze = recordPracticeDay(week, '2026-09-09');
    expect(streakStanding(afterFreeze, '2026-09-09').freezeUsedYesterday).toBe(true);
    // Einen Tag später ist das kein Ereignis mehr.
    expect(streakStanding(afterFreeze, '2026-09-10').freezeUsedYesterday).toBe(false);
  });

  it('hat ohne einen einzigen geübten Tag nichts zu zeigen', () => {
    const standing = streakStanding(emptyStreak(), '2026-09-01');
    expect(standing.days).toBe(0);
    expect(standing.freezeReady).toBe(false);
    expect(standing.freezeUsedYesterday).toBe(false);
  });
});

describe('Streak: Persistenz', () => {
  it('liest einen gespeicherten Stand verlustfrei zurück', () => {
    const streak = recordPracticeDay(practiceDays(FIRST_WEEK), '2026-09-09');
    expect(parseStreak(JSON.parse(JSON.stringify(streak)))).toEqual(streak);
  });

  it('macht aus einem fehlenden Feld einen leeren Streak, nicht einen kaputten', () => {
    expect(parseStreak(undefined)).toEqual(emptyStreak());
    expect(parseStreak('gestern')).toEqual(emptyStreak());
  });

  it('behauptet ohne geübten Tag keine Tageszahl', () => {
    expect(parseStreak({ days: 99 }).days).toBe(0);
  });

  it('verwirft ein unmögliches Datum, statt es weiterzurollen', () => {
    expect(parseStreak({ lastPracticedDay: '2026-02-30', days: 5 }).lastPracticedDay).toBe('');
  });

  it('hält die Invariante: voller Vorrat zählt nicht mit', () => {
    const parsed = parseStreak({
      lastPracticedDay: '2026-09-07',
      days: 7,
      freezeReady: true,
      daysTowardFreeze: 4,
    });
    expect(parsed.daysTowardFreeze).toBe(0);
  });
});

describe('Streak: Merge zweier Geräte', () => {
  it('nimmt die Felder vom Stand mit dem jüngeren geübten Tag', () => {
    const older = practiceDays(['2026-09-01', '2026-09-02']);
    const younger = practiceDays(['2026-09-05', '2026-09-06']);

    expect(mergeStreak(older, younger).lastPracticedDay).toBe('2026-09-06');
    expect(mergeStreak(younger, older).lastPracticedDay).toBe('2026-09-06');
  });

  it('stuft nicht zurück: der lange Streak des anderen Geräts zählt weiter', () => {
    // Rechner: sieben Tage am Stück, zuletzt am 07.
    const desktop = practiceDays(FIRST_WEEK);
    // Telefon: kennt nur den 08. -- fuer sich genommen ein Streak von 1.
    const phone = practiceDays(['2026-09-08']);

    const merged = mergeStreak(phone, desktop);
    expect(merged.lastPracticedDay).toBe('2026-09-08');
    expect(merged.days).toBe(8);
  });

  it('verschenkt aber nichts: ein toter Streak lebt durch den Merge nicht wieder auf', () => {
    const abandoned = practiceDays(FIRST_WEEK);
    // Einen Monat später wieder angefangen -- der alte Streak ist vorbei.
    const fresh = practiceDays(['2026-10-20']);

    const merged = mergeStreak(fresh, abandoned);
    expect(merged.lastPracticedDay).toBe('2026-10-20');
    expect(merged.days).toBe(1);
  });

  it('lässt den Freeze des anderen Geräts über den Merge gelten', () => {
    const withFreeze = practiceDays(FIRST_WEEK);
    const withoutFreeze = practiceDays(['2026-09-08']);

    const merged = mergeStreak(withoutFreeze, withFreeze);
    expect(merged.freezeReady).toBe(true);
    expect(merged.daysTowardFreeze).toBe(0);
  });

  it('nimmt bei gleichem Tag den lokalen Stand -- lokal bleibt Quelle', () => {
    const local = { ...practiceDays(['2026-09-07']), freezeUsedDay: '2026-09-06' };
    const remote = { ...practiceDays(['2026-09-07']), freezeUsedDay: '' };
    expect(mergeStreak(local, remote).freezeUsedDay).toBe('2026-09-06');
  });

  it('kommt mit einem Gerät ohne einen einzigen geübten Tag zurecht', () => {
    const full = practiceDays(FIRST_WEEK);
    expect(mergeStreak(emptyStreak(), full)).toEqual(full);
    expect(mergeStreak(full, emptyStreak())).toEqual(full);
  });

  it('ergibt in beiden Richtungen denselben Streak', () => {
    const a = practiceDays(FIRST_WEEK);
    const b = practiceDays(['2026-09-08', '2026-09-09']);
    expect(mergeStreak(a, b).days).toBe(mergeStreak(b, a).days);
  });

  it('ist idempotent -- zweimal zusammenlegen ändert nichts mehr', () => {
    const a = practiceDays(FIRST_WEEK);
    const b = practiceDays(['2026-09-08']);
    const once = mergeStreak(a, b);
    expect(mergeStreak(once, once)).toEqual(once);
  });
});

describe('Streak: der Tag fällt am Ende einer Sitzung', () => {
  /** Spielt eine ganze Sitzung durch -- Ton, Antwort, weiter. */
  function playThrough(state: SessionState): SessionState {
    let current = state;
    for (let round = 0; round < current.totalRounds; round += 1) {
      current = { ...current, phase: 'answering', promptEndsAt: 0 };
      current = submitAnswer(current, current.prompt, 1);
      current = advance(current, () => 0.5);
    }
    return current;
  }

  function session(today: string) {
    return createSession({
      totalRounds: 2,
      progress: emptyProgress(),
      random: () => 0.5,
      today,
    });
  }

  it('verbucht den Tag erst, wenn die Sitzung wirklich beendet ist', () => {
    let state = session('2026-09-01');
    expect(state.progress.streak.days).toBe(0);

    state = { ...state, phase: 'answering', promptEndsAt: 0 };
    state = submitAnswer(state, state.prompt, 1);
    // Erste Runde beantwortet -- die Sitzung laeuft noch.
    expect(state.progress.streak.days).toBe(0);

    state = playThrough({ ...state, phase: 'feedback' });
    expect(state.phase).toBe('finished');
    expect(state.progress.streak.days).toBe(1);
    expect(state.progress.streak.lastPracticedDay).toBe('2026-09-01');
  });

  it('zählt eine zweite Sitzung am selben Tag nicht als zweiten Tag', () => {
    const first = playThrough(session('2026-09-01'));
    const second = playThrough(
      createSession({
        totalRounds: 2,
        progress: first.progress,
        random: () => 0.5,
        today: '2026-09-01',
      }),
    );
    expect(second.progress.streak.days).toBe(1);
  });
});
