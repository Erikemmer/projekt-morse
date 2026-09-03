/**
 * Die Einstellungen **dieses Geräts**: Tonhöhe, Lautstärke und Theme.
 *
 * Reine Daten und reine Funktionen, kein DOM, kein localStorage — *wo* das
 * liegt, entscheidet `ui/deviceStorage.ts` (CLAUDE.md 4).
 *
 * **Warum das nicht in `Progress` steht.** Ein Lernstand gehört der Person und
 * geht mit ihr aufs nächste Gerät. Lautstärke gehört dem Gerät: was am
 * Kopfhörer am Schreibtisch richtig ist, ist im Bus falsch, und eine Tonhöhe,
 * die auf kleinen Telefonlautsprechern trägt, muss es auf Studiokopfhörern
 * nicht. Deshalb liegen diese beiden Werte in einem eigenen Eintrag und gehen
 * **nie** zum Konto — das ist keine Lücke im Sync, sondern seine Grenze
 * (Produktentscheidung, Notion-Log #66).
 *
 * **Was die Tonhöhe steuert und was nicht.** Sie ist der Heimton: das, was
 * gespielt wird, solange nichts streut — also auf Variabilitäts-Stufe 0 und
 * damit auch auf den Lernkarten, die immer den Sitzungs-Ton spielen. Ab Stufe 1
 * haben die HVPT-Bänder Vorrang (`engine/variability.ts`); die Einstellung
 * verschiebt sie **nicht**. Ein Band, das der Nutzer verschieben kann, wäre
 * kein Trainingsband mehr, sondern eine Bequemlichkeit — und die UI sagt das
 * in einer Zeile, statt es zu verschweigen (CLAUDE.md 2.6).
 *
 * **Das Theme (Ruling Notion-Log #111) steht aus demselben Grund hier und
 * nicht in `Progress`.** Wie hell ein Bildschirm sein muss, ist eine
 * Eigenschaft des Raums, in dem er steht, nicht des Menschen, der lernt —
 * dieselbe Grenze wie bei Tonhöhe und Lautstärke, nur für die Augen statt die
 * Ohren. `engine/sync.ts` begründet das an der Stelle, an der ein Konto sonst
 * zu Recht ein fehlendes Feld vermuten könnte.
 */

import {
  DEFAULT_TONE_HZ,
  DEFAULT_VOLUME,
  TONE_HZ_RANGE,
  TONE_HZ_STEP,
  VOLUME_RANGE,
  VOLUME_STEP,
} from './settings';

/**
 * `'system'` folgt dem Geraet (`prefers-color-scheme`, zwischen Paper und
 * Night) und ist die Voreinstellung -- erst eine ausdrueckliche Wahl setzt
 * eines der sechs benannten Themes. Die Rollen-Namen der Tokens bleiben
 * `--amber`/`--amber-deep` usw. auch dort, wo die Farbe es nicht mehr ist
 * (styles.css erklaert das ausfuehrlich an den sechs `[data-theme]`-Bloecken).
 */
export type Theme = 'system' | 'paper' | 'frost' | 'olive' | 'night' | 'phosphor' | 'ink';

/** Alle gueltigen Werte, in der Reihenfolge, in der Settings.tsx sie anbietet. */
export const THEMES: readonly Theme[] = Object.freeze([
  'system',
  'paper',
  'frost',
  'olive',
  'night',
  'phosphor',
  'ink',
]);

export const DEFAULT_THEME: Theme = 'system';

export interface DeviceSettings {
  /** Der Heimton in Hz, ganzzahlig und auf dem Raster von `TONE_HZ_STEP`. */
  readonly toneHz: number;
  /** Lautstärke 0..1, auf dem Raster von `VOLUME_STEP`. */
  readonly volume: number;
  /** Welches der sechs Themes gilt, oder `'system'` fürs Gerät entscheiden lassen. */
  readonly theme: Theme;
}

export function defaultDeviceSettings(): DeviceSettings {
  return { toneHz: DEFAULT_TONE_HZ, volume: DEFAULT_VOLUME, theme: DEFAULT_THEME };
}

/** Eine neue Tonhöhe, in die Spanne gezogen und aufs Raster geschnappt. */
export function withToneHz(settings: DeviceSettings, toneHz: number): DeviceSettings {
  return { ...settings, toneHz: snap(toneHz, TONE_HZ_RANGE, TONE_HZ_STEP) };
}

/** Eine neue Lautstärke, in die Spanne gezogen und aufs Raster geschnappt. */
export function withVolume(settings: DeviceSettings, volume: number): DeviceSettings {
  return { ...settings, volume: snap(volume, VOLUME_RANGE, VOLUME_STEP) };
}

/** Ein neues Theme. Keine Spanne, kein Raster — ein Wert aus `THEMES`, sonst nichts. */
export function withTheme(settings: DeviceSettings, theme: Theme): DeviceSettings {
  return { ...settings, theme };
}

/**
 * Liest die Einstellungen aus unbekannten Daten.
 *
 * Wie bei `parseProgress`: alles Unplausible fällt auf den Default zurück,
 * statt den Eintrag zu verwerfen. Eine Tonhöhe aus einer künftigen Version mit
 * weiterer Spanne wird dabei in die heutige gezogen — das ist eine hörbare
 * Änderung, aber immer noch besser als ein Ton, den dieses Gerät nicht
 * spielen soll. Das Theme ist additiv (CLAUDE.md 4): ein alter Eintrag ohne
 * das Feld bekommt `'system'`, keinen verworfenen Datensatz.
 */
export function parseDeviceSettings(raw: unknown): DeviceSettings {
  if (typeof raw !== 'object' || raw === null) return defaultDeviceSettings();

  const entry = raw as Partial<DeviceSettings>;
  const base = defaultDeviceSettings();

  return {
    toneHz: isNumber(entry.toneHz) ? snap(entry.toneHz, TONE_HZ_RANGE, TONE_HZ_STEP) : base.toneHz,
    volume: isNumber(entry.volume) ? snap(entry.volume, VOLUME_RANGE, VOLUME_STEP) : base.volume,
    theme: isTheme(entry.theme) ? entry.theme : base.theme,
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * In die Spanne ziehen und aufs Raster schnappen.
 *
 * Gerastert wird vom Minimum aus, damit der Default (620 Hz) auf dem Raster
 * liegt und ein Regler nicht zwischen zwei Werten hängenbleibt. Die
 * Fliesskomma-Rundung am Ende hält die Lautstaerke bei 0,05er-Schritten
 * lesbar -- ohne sie stuenden 0,30000000000000004 im Speicher.
 */
function snap(value: number, range: { min: number; max: number }, step: number): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const steps = Math.round((clamped - range.min) / step);
  const snapped = range.min + steps * step;
  return Math.round(snapped * 1000) / 1000;
}
