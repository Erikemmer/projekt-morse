/**
 * Wiedergabe einer Morse-Zeitachse ueber die Web Audio API.
 *
 * Timing-Grundsatz: Toene werden *nie* von einem Timer ausgeloest. Jeder Ton
 * bekommt seine Start- und Endzeit auf der Uhr des AudioContext (`currentTime`),
 * die in Samples laeuft und von Layout, GC oder einem beschaeftigten Main-Thread
 * unberuehrt bleibt. `setInterval` weckt hier nur den *Planer*, der ein Stueck
 * Zukunft vorbereitet -- verspaetet er sich, verschiebt das keinen einzigen Ton,
 * solange er innerhalb des Vorlauffensters bleibt. (Das ist das Muster aus
 * Chris Wilsons "A Tale of Two Clocks".)
 *
 * Warum das zaehlt: Morse *ist* Timing. Ein um 30 ms verrutschtes dit macht aus
 * korrektem Code eine falsche Lektion.
 */

import type { Schedule } from '../engine/schedule';
import { DEFAULT_TONE_HZ, DEFAULT_VOLUME, TONE_RAMP_SECONDS, VOLUME_RANGE } from '../engine/settings';

export interface PlayerOptions {
  /** Tonhoehe in Hz. Default: DEFAULT_TONE_HZ aus der Engine. */
  frequency?: number;
  /** Lautstaerke, 0..1. */
  volume?: number;
  /**
   * Ein- und Ausblendzeit pro Ton in Sekunden. Ohne Rampe knackt jeder
   * Tonanfang hoerbar; 5 ms sind ueblich und veraendern das Timing nicht,
   * weil sie innerhalb der Tondauer liegen.
   */
  rampSeconds?: number;
}

export interface PlaybackHandle {
  /** Bricht die Wiedergabe ab. Mehrfacher Aufruf ist unschaedlich. */
  stop(): void;
  /** Erfuellt sich am Ende der Zeitachse -- oder bei stop(). */
  finished: Promise<void>;
  /**
   * Start des ersten Tons auf der Audio-Uhr (`AudioContext.currentTime`).
   *
   * Steht schon *vor* dem ersten Ton fest, weil die Zeitachse im Voraus geplant
   * wird. Wer Reaktionszeiten misst, braucht diese Uhr -- nicht `Date.now()`.
   */
  startTime: number;
  /** Ende des letzten Tons auf derselben Uhr. */
  endTime: number;
}

/** Wie weit im Voraus geplant wird und wie oft der Planer nachlegt (Sekunden). */
const LOOKAHEAD_SECONDS = 0.3;
const SCHEDULER_INTERVAL_MS = 100;

/** Vorlauf vor dem ersten Ton, damit auch der erste sauber geplant ist. */
const START_OFFSET_SECONDS = 0.1;

export class MorsePlayer {
  private context: AudioContext | null = null;
  private readonly frequency: number;
  private readonly rampSeconds: number;
  private current: { stop: () => void } | null = null;

  /**
   * Die Lautstaerke, 0..1 -- als einziger Wert hier veraenderlich.
   *
   * Der Player lebt so lange wie die Seite (an ihm haengt der AudioContext),
   * die Einstellung darf sich dazwischen aendern. Ein neuer Player je
   * Lautstaerke haette einen neuen Kontext -- und damit eine neue Uhr, auf der
   * keine Reaktionszeit mehr vergleichbar waere (CLAUDE.md 2.1).
   *
   * Gesetzt wird sie vor dem naechsten `play()`; ein laufender Ton behaelt
   * seine Huellkurve, weil sie auf der Audio-Uhr schon geplant ist.
   */
  private currentVolume: number;

  constructor(options: PlayerOptions = {}) {
    this.frequency = options.frequency ?? DEFAULT_TONE_HZ;
    this.currentVolume = clampVolume(options.volume ?? DEFAULT_VOLUME);
    this.rampSeconds = options.rampSeconds ?? TONE_RAMP_SECONDS;
  }

  get volume(): number {
    return this.currentVolume;
  }

  set volume(value: number) {
    this.currentVolume = clampVolume(value);
  }

  /**
   * Der aktuelle Stand der Audio-Uhr in Sekunden.
   *
   * Vor `resume()` gibt es noch keinen Kontext und damit keine Uhr -- dann 0.
   * Zeitstempel fuer Reaktionszeiten kommen von hier, damit Ton und Messung
   * dieselbe Zeitbasis haben.
   */
  get currentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  /**
   * Legt den AudioContext an bzw. weckt ihn auf.
   *
   * Muss aus einer echten Nutzergeste heraus laufen -- Browser starten Audio
   * sonst nicht. Deshalb ruft die UI das beim Klick auf "Abspielen" auf.
   */
  async resume(): Promise<void> {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }

  /**
   * Spielt `schedule` ab. `frequencyHz` ueberschreibt die Tonhoehe fuer diese
   * eine Wiedergabe -- die Klang-Variabilitaet (engine/variability.ts) zieht
   * pro Sitzung bzw. pro Abfrage, und der Player soll dafuer nicht jedes Mal
   * neu gebaut werden (der AudioContext haengt an ihm).
   */
  play(
    schedule: Schedule,
    onProgress?: (elapsedSeconds: number) => void,
    frequencyHz?: number,
  ): PlaybackHandle {
    this.stop();

    const context = this.context;
    if (context === null) {
      throw new Error('resume() muss vor play() aufgerufen werden (Browser-Autoplay-Regel)');
    }

    const startTime = context.currentTime + START_OFFSET_SECONDS;
    let nextIndex = 0;
    let stopped = false;
    let resolveFinished: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    const master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);

    const scheduleWindow = () => {
      const horizon = context.currentTime + LOOKAHEAD_SECONDS;
      while (nextIndex < schedule.tones.length) {
        const tone = schedule.tones[nextIndex];
        const toneStart = startTime + tone.start;
        if (toneStart > horizon) break;
        this.scheduleTone(context, master, toneStart, tone.duration, frequencyHz ?? this.frequency);
        nextIndex += 1;
      }
    };

    const timer = setInterval(() => {
      if (stopped) return;
      scheduleWindow();
      if (nextIndex >= schedule.tones.length && context.currentTime >= startTime + schedule.duration) {
        finish();
      }
    }, SCHEDULER_INTERVAL_MS);

    // Das erste Fenster sofort, nicht erst beim naechsten Tick.
    scheduleWindow();

    let progressFrame = 0;
    if (onProgress) {
      const tick = () => {
        if (stopped) return;
        onProgress(Math.max(0, context.currentTime - startTime));
        progressFrame = requestAnimationFrame(tick);
      };
      progressFrame = requestAnimationFrame(tick);
    }

    const finish = () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      if (progressFrame) cancelAnimationFrame(progressFrame);
      master.disconnect();
      this.current = null;
      resolveFinished();
    };

    const abort = () => {
      if (stopped) return;
      // Kurz ausblenden statt hart trennen -- sonst knackt es beim Abbrechen.
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + this.rampSeconds);
      finish();
    };

    this.current = { stop: abort };
    return { stop: abort, finished, startTime, endTime: startTime + schedule.duration };
  }

  /** Bricht eine laufende Wiedergabe ab. */
  stop(): void {
    this.current?.stop();
    this.current = null;
  }

  /** Ein einzelner Ton: eigener Oszillator, Huellkurve auf der Audio-Uhr. */
  private scheduleTone(
    context: AudioContext,
    destination: GainNode,
    startTime: number,
    duration: number,
    frequencyHz: number,
  ): void {
    // Die Rampen muessen in den Ton passen, sonst ueberlappen sie sich.
    const ramp = Math.min(this.rampSeconds, duration / 3);
    const endTime = startTime + duration;

    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencyHz;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(this.currentVolume, startTime + ramp);
    envelope.gain.setValueAtTime(this.currentVolume, endTime - ramp);
    envelope.gain.linearRampToValueAtTime(0, endTime);

    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(endTime + ramp);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
}

/**
 * Lautstaerke in die zulaessige Spanne ziehen.
 *
 * Die Grenzen stehen in der Engine (settings.ts), nicht hier: der Player ist
 * die Wiedergabe, nicht die Quelle der Kennwerte.
 */
function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(VOLUME_RANGE.max, Math.max(VOLUME_RANGE.min, value));
}
