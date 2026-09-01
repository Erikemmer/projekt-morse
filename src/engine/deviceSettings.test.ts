/**
 * Tests für die Geräte-Einstellungen: Tonhöhe und Lautstärke.
 *
 * Der Kern ist nicht das Speichern, sondern die Grenze: **die Einstellung
 * trägt Stufe 0, die HVPT-Bänder ab Stufe 1 nicht.** Das wird hier
 * ausdrücklich geprüft, weil es die Zeile in der UI ist, die es behauptet
 * (CLAUDE.md 2.6).
 */

import { describe, expect, it } from 'vitest';

import {
  defaultDeviceSettings,
  parseDeviceSettings,
  withToneHz,
  withVolume,
} from './deviceSettings';
import { createSession, retuneHomeTone } from './session';
import {
  DEFAULT_TONE_HZ,
  DEFAULT_VOLUME,
  TONE_HZ_RANGE,
  TONE_HZ_STEP,
  VOLUME_RANGE,
} from './settings';
import { emptyProgress } from './stats';
import { SESSION_TONE_HZ, drawSessionSound, variabilityStage } from './variability';

/** Ein Fortschritt mit so vielen aktiven Zeichen, dass Stufe 1 greift. */
function stageOneProgress() {
  return { ...emptyProgress(), activeCharacters: [...'KMRSUAPT'] };
}

describe('Geräte-Einstellungen', () => {
  it('startet bei der Voreinstellung des Trainings', () => {
    expect(defaultDeviceSettings()).toEqual({ toneHz: DEFAULT_TONE_HZ, volume: DEFAULT_VOLUME });
  });

  it('hält die Tonhöhe in der Spanne', () => {
    const settings = defaultDeviceSettings();
    expect(withToneHz(settings, 100).toneHz).toBe(TONE_HZ_RANGE.min);
    expect(withToneHz(settings, 5000).toneHz).toBe(TONE_HZ_RANGE.max);
  });

  it('schnappt die Tonhöhe aufs Raster, und die Voreinstellung liegt darauf', () => {
    expect(withToneHz(defaultDeviceSettings(), 623).toneHz).toBe(620);
    expect((DEFAULT_TONE_HZ - TONE_HZ_RANGE.min) % TONE_HZ_STEP).toBe(0);
  });

  it('lässt die Lautstärke nicht bis zur Stille fallen', () => {
    expect(withVolume(defaultDeviceSettings(), 0).volume).toBe(VOLUME_RANGE.min);
    expect(withVolume(defaultDeviceSettings(), 4).volume).toBe(VOLUME_RANGE.max);
  });

  it('hält die Lautstärke frei von Fliesskomma-Resten', () => {
    expect(withVolume(defaultDeviceSettings(), 0.30000000000000004).volume).toBe(0.3);
  });

  it('ändert die jeweils andere Einstellung nicht mit', () => {
    const loud = withVolume(defaultDeviceSettings(), 0.8);
    expect(withToneHz(loud, 700)).toEqual({ toneHz: 700, volume: 0.8 });
  });

  it('liest einen gespeicherten Eintrag verlustfrei zurück', () => {
    const settings = withVolume(withToneHz(defaultDeviceSettings(), 700), 0.5);
    expect(parseDeviceSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it('macht aus Müll die Voreinstellung, statt nichts abzuspielen', () => {
    expect(parseDeviceSettings(null)).toEqual(defaultDeviceSettings());
    expect(parseDeviceSettings({ toneHz: 'laut' })).toEqual(defaultDeviceSettings());
    expect(parseDeviceSettings({ toneHz: Number.NaN })).toEqual(defaultDeviceSettings());
  });

  it('zieht einen Wert ausserhalb der Spanne herein, statt den Eintrag zu verwerfen', () => {
    expect(parseDeviceSettings({ toneHz: 2000, volume: 9 })).toEqual({
      toneHz: TONE_HZ_RANGE.max,
      volume: VOLUME_RANGE.max,
    });
  });
});

describe('Der Heimton im Training', () => {
  it('trägt die Sitzung auf Stufe 0', () => {
    const sound = drawSessionSound(emptyProgress(), () => 0.5, 700);
    expect(sound.stage).toBe(0);
    expect(sound.sessionToneHz).toBe(700);
  });

  it('bleibt ohne Angabe bei der Voreinstellung', () => {
    expect(drawSessionSound(emptyProgress(), () => 0.5).sessionToneHz).toBe(DEFAULT_TONE_HZ);
  });

  it('verschiebt die HVPT-Bänder ab Stufe 1 nicht', () => {
    const progress = stageOneProgress();
    expect(variabilityStage(progress)).toBe(1);

    // Ganz oben und ganz unten im Zufall: der Ton bleibt im Band, egal welchen
    // Heimton das Geraet gesetzt hat.
    for (const random of [() => 0, () => 0.999999]) {
      for (const home of [TONE_HZ_RANGE.min, TONE_HZ_RANGE.max]) {
        const sound = drawSessionSound(progress, random, home);
        expect(sound.sessionToneHz).toBeGreaterThanOrEqual(SESSION_TONE_HZ.min);
        expect(sound.sessionToneHz).toBeLessThanOrEqual(SESSION_TONE_HZ.max);
      }
    }
  });

  it('kommt über createSession in die Sitzung', () => {
    const session = createSession({
      totalRounds: 5,
      progress: emptyProgress(),
      random: () => 0.5,
      today: '2026-09-01',
      homeToneHz: 540,
    });
    expect(session.sound.sessionToneHz).toBe(540);
    // Unter Stufe 2 ist die Tonhoehe der Abfrage der Sitzungs-Ton.
    expect(session.promptToneHz).toBe(540);
  });
});

describe('Heimton nachstellen', () => {
  function stageZeroSession() {
    return createSession({
      totalRounds: 5,
      progress: emptyProgress(),
      random: () => 0.5,
      today: '2026-09-01',
      homeToneHz: 620,
    });
  }

  it('zieht eine laufende Sitzung auf Stufe 0 nach -- Ton und Anzeige zugleich', () => {
    const retuned = retuneHomeTone(stageZeroSession(), 760);
    expect(retuned.sound.sessionToneHz).toBe(760);
    expect(retuned.promptToneHz).toBe(760);
  });

  it('lässt einen gezogenen Sitzungs-Ton ab Stufe 1 in Ruhe', () => {
    const session = createSession({
      totalRounds: 5,
      progress: stageOneProgress(),
      random: () => 0.5,
      today: '2026-09-01',
    });
    expect(session.sound.stage).toBe(1);
    expect(retuneHomeTone(session, 800)).toBe(session);
  });

  it('gibt bei gleichem Ton denselben Zustand zurück', () => {
    const session = stageZeroSession();
    expect(retuneHomeTone(session, 620)).toBe(session);
  });

  it('rührt den Fortschritt und den Rest der Sitzung nicht an', () => {
    const session = stageZeroSession();
    const retuned = retuneHomeTone(session, 700);
    expect(retuned.progress).toBe(session.progress);
    expect(retuned.prompt).toBe(session.prompt);
    expect(retuned.round).toBe(session.round);
    expect(retuned.sound.effectiveWpm).toBe(session.sound.effectiveWpm);
  });
});
