/**
 * Farnsworth-Timing nach dem ARRL-Standard.
 *
 * Quelle: Jon Bloom, "A Standard for Morse Timing Using the Farnsworth Technique",
 * ARRL QEX, April 1990.
 *
 * Die Idee: Zeichen werden mit der *Zeichengeschwindigkeit* (characterWpm) gesendet --
 * also in ihrem endgueltigen, fluessigen Rhythmus -- aber die Pausen dazwischen werden
 * gestreckt, bis das Gesamttempo (effectiveWpm) herauskommt. So lernt man den Klang
 * eines Zeichens von Anfang an richtig und muss ihn spaeter nicht "beschleunigen".
 *
 * Herleitung der 37.2: Das Referenzwort PARIS ist 50 Einheiten lang, davon 31 Einheiten
 * Zeichen (Elemente plus Pausen *innerhalb* der Zeichen) und 19 Einheiten Pause
 * (4 x 3 Einheiten zwischen Zeichen + 7 Einheiten Wortpause). 31 Einheiten bei c WpM
 * dauern 31 * 1.2/c = 37.2/c Sekunden.
 *
 * Reine Rechnung, kein DOM, keine Audio-API.
 */

export interface SpeedSettings {
  /** Tempo der Zeichen selbst, in Woertern pro Minute. */
  characterWpm: number;
  /** Gesamttempo inklusive gestreckter Pausen, in WpM. Nie hoeher als characterWpm. */
  effectiveWpm: number;
}

export interface Timing {
  /** Dauer einer Einheit (dit) in Sekunden. */
  unit: number;
  dit: number;
  dah: number;
  /** Pause zwischen den Elementen *innerhalb* eines Zeichens: immer 1 Einheit. */
  intraCharacterGap: number;
  /** Pause zwischen Zeichen. Bei Farnsworth gestreckt. */
  interCharacterGap: number;
  /** Pause zwischen Woertern. Bei Farnsworth gestreckt. */
  wordGap: number;
}

/**
 * Rechnet Geschwindigkeiten in konkrete Sekunden um.
 *
 * Bei effectiveWpm === characterWpm ergibt sich exakt das Standard-Timing
 * (1/3/1/3/7 Einheiten) -- Farnsworth ist dann ein No-op.
 */
export function computeTiming(settings: SpeedSettings): Timing {
  const characterWpm = settings.characterWpm;
  if (!Number.isFinite(characterWpm) || characterWpm <= 0) {
    throw new RangeError('characterWpm muss eine positive Zahl sein');
  }
  if (!Number.isFinite(settings.effectiveWpm) || settings.effectiveWpm <= 0) {
    throw new RangeError('effectiveWpm muss eine positive Zahl sein');
  }

  // Ein Gesamttempo oberhalb der Zeichengeschwindigkeit ist physikalisch nicht
  // darstellbar (Pausen koennen nicht kuerzer als null werden), also gedeckelt.
  const effectiveWpm = Math.min(settings.effectiveWpm, characterWpm);

  const unit = 1.2 / characterWpm;

  // Gesamtes Pausenbudget eines PARIS-Wortes, in Sekunden (ARRL: t_a).
  const totalGapBudget = (60 * characterWpm - 37.2 * effectiveWpm) / (characterWpm * effectiveWpm);

  // Dieses Budget deckt 19 Einheiten Pause ab und wird im Verhaeltnis 3:7 verteilt.
  const interCharacterGap = (3 * totalGapBudget) / 19;
  const wordGap = (7 * totalGapBudget) / 19;

  return {
    unit,
    dit: unit,
    dah: 3 * unit,
    intraCharacterGap: unit,
    interCharacterGap,
    wordGap,
  };
}
