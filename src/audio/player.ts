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

export interface PlayerOptions {
  /** Tonhoehe in Hz. 600-700 Hz gilt als angenehm fuers Ohr. */
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
}

/** Wie weit im Voraus geplant wird und wie oft der Planer nachlegt (Sekunden). */
const LOOKAHEAD_SECONDS = 0.3;
const SCHEDULER_INTERVAL_MS = 100;

/** Vorlauf vor dem ersten Ton, damit auch der erste sauber geplant ist. */
const START_OFFSET_SECONDS = 0.1;

export class MorsePlayer {
  private context: AudioContext | null = null;
  private readonly frequency: number;
  private readonly volume: number;
  private readonly rampSeconds: number;
  private current: { stop: () => void } | null = null;

  constructor(options: PlayerOptions = {}) {
    this.frequency = options.frequency ?? 650;
    this.volume = options.volume ?? 0.25;
    this.rampSeconds = options.rampSeconds ?? 0.005;
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

  /** Spielt `schedule` ab. Eine laufende Wiedergabe wird vorher abgebrochen. */
  play(schedule: Schedule, onProgress?: (elapsedSeconds: number) => void): PlaybackHandle {
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
        this.scheduleTone(context, master, toneStart, tone.duration);
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
    return { stop: abort, finished };
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
  ): void {
    // Die Rampen muessen in den Ton passen, sonst ueberlappen sie sich.
    const ramp = Math.min(this.rampSeconds, duration / 3);
    const endTime = startTime + duration;

    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = this.frequency;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(this.volume, startTime + ramp);
    envelope.gain.setValueAtTime(this.volume, endTime - ramp);
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
