/**
 * Klang-Variabilitaet nach dem HVPT-Prinzip (high variability phonetic
 * training): wer immer denselben 620-Hz-Ton hoert, lernt Kategorien, die im
 * Funkalltag nicht generalisieren -- ein Zeichen soll am *Rhythmus* erkannt
 * werden, nicht an einer bestimmten Aufnahme.
 *
 * Aber: erst stabil, dann variabel. Die Stufe leitet sich rein aus dem
 * Fortschritt ab (Groesse des aktiven Zeichensatzes) und ist damit dieselbe
 * Sorte Regel wie das Wachstum in growth.ts -- reine Funktion, Zufall als
 * Parameter, alle Werte benannte Konstanten.
 *
 * Zwei Invarianten, die die Stufen NIE anfassen:
 *
 * - **Das Zeichentempo bleibt immer CHARACTER_WPM (20).** Variiert wird
 *   hoechstens das Gesamttempo, also die Farnsworth-Pausen. Ein langsameres
 *   Zeichen waere ein anderer Klang -- genau das, was CLAUDE.md 2.3 verbietet.
 *   Deshalb steht in SessionSound auch kein characterWpm: was es nicht gibt,
 *   kann niemand versehentlich variieren.
 * - **Statistik und Wachstumsregel sehen von alledem nichts.** stats.ts und
 *   growth.ts kennen dieses Modul nicht; ein Versuch wird gleich verbucht,
 *   egal bei welcher Tonhoehe. Ob Tonhoehe die Fehlerrate beeinflusst, waere
 *   eine Forschungsfrage -- erst mal werden keine Zahlen vermischt.
 */

import { DEFAULT_TONE_HZ, STARTING_EFFECTIVE_WPM } from './settings';
import type { Progress } from './stats';

/** Ab so vielen aktiven Zeichen streut die Tonhoehe zwischen Sitzungen (Stufe 1). */
export const STAGE_1_MIN_ACTIVE_CHARACTERS = 8;

/** Ab so vielen aktiven Zeichen streut sie pro Abfrage, und das Tempo atmet (Stufe 2). */
export const STAGE_2_MIN_ACTIVE_CHARACTERS = 12;

/** Stufe 1: die Sitzungs-Tonhoehe kommt aus diesem Band (Hz, ganzzahlig). */
export const SESSION_TONE_HZ = Object.freeze({ min: 560, max: 680 });

/** Stufe 2: jede Abfrage zieht ihre Tonhoehe aus diesem breiteren Band. */
export const PROMPT_TONE_HZ = Object.freeze({ min: 520, max: 720 });

/** Stufe 2: das Gesamttempo variiert pro Sitzung um diesen Anteil (+/-10 %). */
export const EFFECTIVE_WPM_JITTER = 0.1;

/**
 * Stufe 3 -- Timing-Imperfektion und Stoergeraeusch (QRN) -- ist bewusst
 * NICHT gebaut, nur vorgesehen. Weder ihre Schwelle noch ihre Ausgestaltung
 * sind entschieden; das ist eine Produktentscheidung und gehoert ins
 * Notion-Log, nicht hierher erfunden (CLAUDE.md 2). Die Konstante existiert,
 * damit die Stufe einen Namen hat, sobald sie entschieden wird.
 */
export const STAGE_3_QRN_PLANNED = 3;

export type VariabilityStage = 0 | 1 | 2;

/**
 * Der Klang einer Sitzung. Einmal beim Start gezogen, danach unveraenderlich.
 *
 * Bewusst ohne characterWpm: das Zeichentempo ist keine Stellgroesse dieser
 * Mechanik (siehe Kopfkommentar).
 */
export interface SessionSound {
  readonly stage: VariabilityStage;
  /**
   * Die Tonhoehe der Sitzung in Hz, ganzzahlig. Lernkarten spielen immer
   * diese -- der Erstkontakt mit einem Zeichen bekommt keinen Prompt-Jitter,
   * ein neuer Klang braucht erst einen festen Anker.
   */
  readonly sessionToneHz: number;
  /** Das Gesamttempo der Sitzung (Farnsworth). Ab Stufe 2 leicht gestreut. */
  readonly effectiveWpm: number;
}

/** Welche Stufe der Fortschritt freigeschaltet hat. */
export function variabilityStage(progress: Progress): VariabilityStage {
  const active = progress.activeCharacters.length;
  if (active >= STAGE_2_MIN_ACTIVE_CHARACTERS) return 2;
  if (active >= STAGE_1_MIN_ACTIVE_CHARACTERS) return 1;
  return 0;
}

/**
 * Zieht den Klang einer neuen Sitzung.
 *
 * Stufe 0 wuerfelt nicht: fest der Heimton und STARTING_EFFECTIVE_WPM, exakt
 * das Verhalten von vor dieser Mechanik.
 *
 * `homeToneHz` ist die Tonhoehe aus den Geraete-Einstellungen
 * (engine/deviceSettings.ts); ohne Angabe bleibt es bei DEFAULT_TONE_HZ. Er
 * gilt **nur auf Stufe 0** -- ab Stufe 1 haben die Baender Vorrang und werden
 * von der Einstellung nicht verschoben. Ein Band, das der Nutzer mitbewegen
 * kann, waere kein Trainingsband mehr (Produktentscheidung, Notion-Log #66).
 */
export function drawSessionSound(
  progress: Progress,
  random: () => number,
  homeToneHz: number = DEFAULT_TONE_HZ,
): SessionSound {
  const stage = variabilityStage(progress);

  if (stage === 0) {
    return { stage, sessionToneHz: homeToneHz, effectiveWpm: STARTING_EFFECTIVE_WPM };
  }

  // Ab Stufe 2 kommt auch der Sitzungs-Ton aus dem breiteren Band -- er ist
  // dann nur noch der Anker fuer Lernkarten, nicht mehr der Ton jeder Abfrage.
  const band = stage === 1 ? SESSION_TONE_HZ : PROMPT_TONE_HZ;
  const sessionToneHz = drawToneHz(band, random);

  const effectiveWpm =
    stage === 1
      ? STARTING_EFFECTIVE_WPM
      : STARTING_EFFECTIVE_WPM * (1 + EFFECTIVE_WPM_JITTER * (2 * random() - 1));

  return { stage, sessionToneHz, effectiveWpm };
}

/**
 * Die Tonhoehe der naechsten Abfrage.
 *
 * Unter Stufe 2 ist das schlicht der Sitzungs-Ton. Ab Stufe 2 zieht jede
 * Abfrage neu -- eine *Wiederholung derselben Abfrage* zieht dagegen nicht
 * neu: der Aufrufer fragt einmal pro Prompt, nicht einmal pro Abspielen,
 * damit "noch mal hoeren" dasselbe Signal wiederholt.
 */
export function drawPromptTone(sound: SessionSound, random: () => number): number {
  return sound.stage < 2 ? sound.sessionToneHz : drawToneHz(PROMPT_TONE_HZ, random);
}

/** Ganzzahliges Hz aus [min, max], beide einschliesslich. */
function drawToneHz(band: { min: number; max: number }, random: () => number): number {
  const width = band.max - band.min + 1;
  return band.min + Math.min(width - 1, Math.floor(random() * width));
}
