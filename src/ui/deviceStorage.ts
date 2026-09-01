/**
 * Die Geräte-Einstellungen im localStorage.
 *
 * Ein **eigener Eintrag**, nicht ein Feld im Lernstand — und das ist der ganze
 * Punkt: dieser Schlüssel geht nie zum Konto. `pushProgress` (ui/account.ts)
 * schickt `Progress`, und Tonhöhe und Lautstärke stehen bewusst nicht darin.
 * Wer sich auf einem zweiten Gerät anmeldet, bekommt seinen Lernstand und die
 * Lautstärke *dieses* Geräts (Produktentscheidung, Notion-Log #66;
 * engine/deviceSettings.ts erklärt, warum).
 *
 * Wie beim Fortschritt steht hier nur Lesen und Schreiben. Was ein gültiger
 * Wert ist, entscheidet `parseDeviceSettings` in der Engine.
 */

import {
  defaultDeviceSettings,
  parseDeviceSettings,
  type DeviceSettings,
} from '../engine/deviceSettings';

const STORAGE_KEY = 'projekt-morse:device';

/**
 * Lädt die Einstellungen. Jeder Fehler endet in der Voreinstellung statt in
 * einer stummen App: kein Speicher (privater Modus), kein Eintrag, kaputtes
 * JSON.
 */
export function loadDeviceSettings(): DeviceSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? defaultDeviceSettings() : parseDeviceSettings(JSON.parse(raw));
  } catch {
    return defaultDeviceSettings();
  }
}

/**
 * Schreibt die Einstellungen sofort.
 *
 * Kein Leerlauf-Schreiber wie beim Fortschritt: geschrieben wird, wenn jemand
 * einen Regler loslässt, und dabei läuft keine Übung und keine Messung
 * (CLAUDE.md 7). Wer direkt danach neu lädt, soll seine Einstellung wiederhaben.
 */
export function saveDeviceSettings(settings: DeviceSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Voller oder gesperrter Speicher darf die laufende Sitzung nicht stoeren.
  }
}
