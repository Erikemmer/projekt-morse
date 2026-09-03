/**
 * Der Settings-Screen: zwei Regler, ein Theme, ein Probeton, eine ehrliche Zeile.
 *
 * Bewusst kein Dschungel. Es gibt genau die Werte, die eine Person am eigenen
 * Gerät wirklich braucht — Tonhöhe, Lautstärke und, seit Ruling Notion-Log
 * #111, das Theme —, und keinen weiteren "weil man ihn einbauen könnte"
 * (Ruhe, 1.1 §7).
 *
 * Diese Komponente rechnet nichts: Spanne, Raster und Grenzen stehen in
 * `engine/settings.ts`, das Zusammensetzen in `engine/deviceSettings.ts`
 * (CLAUDE.md 4).
 *
 * **Amber-Budget.** Das eine Amber der View trägt "Play test tone" — das
 * Angebot. Die Regler sind ink: sie zeigen einen Zustand, sie laden nicht ein.
 * Auch der Tempo-Reset ist deshalb ein leiser Textknopf (`.quiet-action`) und
 * kein zweiter gefüllter Knopf (1.1 §4). **Der Theme-Picker markiert die
 * Auswahl in Tinte, nicht in Amber** — derselbe Grund, aus dem die
 * Navigations-Schiene ihren Ortsmarker in ink statt amber trägt (Ruling
 * Notion-Log #95/#96, Teil B.5): Amber steht hier schon an "Play test tone".
 *
 * **Kein Autoplay.** Der Ton kommt ausschliesslich auf eine Geste, nie beim
 * Schieben (CLAUDE.md 6 und die Regel des Trainings: nichts läuft von allein).
 * Ein Regler, der bei jedem Schritt piept, wäre ausserdem kein Probeton,
 * sondern Lärm.
 *
 * **Barrierefreiheit.** Beide Regler sind native `input[type=range]` mit
 * echtem Label — Tastatur, Screenreader und Touch bekommen damit das
 * Verhalten, das sie kennen, statt eines nachgebauten. `aria-valuetext` sagt
 * die Einheit dazu, die der Browser sonst verschweigt. Der Theme-Picker ist
 * ein `radiogroup` aus `radio`-Knöpfen mit `aria-checked` — dieselbe Semantik
 * wie ein natives Radio-Set, nur ohne die Browser-Optik, die 1.1 hier nicht
 * vorsieht.
 */

import {
  CHARACTER_WPM,
  STARTING_EFFECTIVE_WPM,
  TONE_HZ_RANGE,
  TONE_HZ_STEP,
  VOLUME_RANGE,
  VOLUME_STEP,
} from '../engine/settings';
import type { DeviceSettings, Theme } from '../engine/deviceSettings';

/** Anzeigenamen -- reine Beschriftung, keine Engine-Entscheidung. */
const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  paper: 'Paper',
  frost: 'Frost',
  olive: 'Olive',
  night: 'Night',
  phosphor: 'Phosphor',
  ink: 'Ink',
};

/** Gruppierung fuer die Anzeige: System zuerst, dann hell, dann dunkel. */
const LIGHT_THEMES: readonly Theme[] = ['paper', 'frost', 'olive'];
const DARK_THEMES: readonly Theme[] = ['night', 'phosphor', 'ink'];

export function Settings({
  settings,
  playing,
  effectiveWpm,
  onToneHz,
  onVolume,
  onTheme,
  onPreview,
  onResetSpeed,
  headingRef,
}: {
  settings: DeviceSettings;
  /** Ob gerade ein Ton läuft — dann wartet der Probeton, statt sich zu überlagern. */
  playing: boolean;
  /** Das erreichte Tempo-Niveau in WpM (engine/tempo.ts). */
  effectiveWpm: number;
  onToneHz: (hz: number) => void;
  onVolume: (volume: number) => void;
  onTheme: (theme: Theme) => void;
  onPreview: () => void;
  onResetSpeed: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const volumePercent = Math.round(settings.volume * 100);
  const raised = effectiveWpm > STARTING_EFFECTIVE_WPM;

  return (
    <section className="screen settings-screen" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
        Settings
      </h2>

      <div className="setting">
        <div className="setting-head">
          <label htmlFor="setting-pitch">Pitch</label>
          <span className="setting-value">{settings.toneHz} Hz</span>
        </div>
        <input
          id="setting-pitch"
          className="slider"
          type="range"
          min={TONE_HZ_RANGE.min}
          max={TONE_HZ_RANGE.max}
          step={TONE_HZ_STEP}
          value={settings.toneHz}
          aria-valuetext={`${settings.toneHz} hertz`}
          onChange={(event) => onToneHz(Number(event.target.value))}
        />
        {/*
          Die eine ehrliche Zeile zur Grenze der Einstellung (CLAUDE.md 2.6):
          ab Variabilitaets-Stufe 1 ziehen die HVPT-Baender die Tonhoehe, und
          diese Einstellung verschiebt sie nicht. Wortlaut aus der
          Aufgabenstellung -- nicht umformulieren.
        */}
        <p className="setting-note">
          Once the pitch starts varying, your setting sets the home tone.
        </p>
      </div>

      <div className="setting">
        <div className="setting-head">
          <label htmlFor="setting-volume">Volume</label>
          <span className="setting-value">{volumePercent}%</span>
        </div>
        <input
          id="setting-volume"
          className="slider"
          type="range"
          min={VOLUME_RANGE.min}
          max={VOLUME_RANGE.max}
          step={VOLUME_STEP}
          value={settings.volume}
          aria-valuetext={`${volumePercent} percent`}
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </div>

      <div className="account-actions">
        <button type="button" className="button-primary" disabled={playing} onClick={onPreview}>
          Play test tone
        </button>
      </div>

      {/*
        Warum diese beiden Werte nicht mitwandern. Steht hier und nicht nur im
        Code, weil jemand mit Konto sonst zu Recht einen Fehler vermutet
        (CLAUDE.md 2.6).
      */}
      <p className="account-note">
        These two stay on this device — how loud something needs to be is a property of the
        device, not of you.
      </p>

      {/*
        Das Theme (Ruling Notion-Log #111) -- ein dritter Geraete-Wert, aber
        eine eigene Zeile statt eines Zusatzes zur Notiz oben: "these two"
        muss weiterhin genau zwei meinen. System steht zuerst, weil es die
        Voreinstellung ist, dann Light und Dark als eigene, benannte Gruppen.
      */}
      <div className="setting">
        <div className="setting-head">
          <span id="theme-heading">Theme</span>
        </div>
        <ThemePicker theme={settings.theme} onTheme={onTheme} />
      </div>

      {/*
        Das Tempo (Ruling #83, Teil B). Kein Regler: es ist kein Wert, den man
        einstellt, sondern einer, den man sich erübt — er steigt über die
        Tempo-Progression und geht nie von selbst zurück. Hier steht deshalb
        der Stand, und darunter der eine Weg abwärts.

        Er steht **unter** der Geräte-Notiz und nicht zwischen den Reglern: die
        Notiz sagt „these two", und das müssen die zwei bleiben, über denen sie
        steht. Das Tempo gehört ohnehin dem Lernstand und nicht dem Gerät — es
        wandert mit dem Konto (engine/sync.ts).
      */}
      <div className="setting">
        <div className="setting-head">
          <span>Effective speed</span>
          <span className="setting-value">{effectiveWpm} wpm</span>
        </div>
        {/*
          Die zwei ehrlichen Sätze zu dieser Zahl (CLAUDE.md 2.6): das
          Zeichentempo ändert sich nie, und was hier steht, ist das Niveau —
          eine einzelne Sitzung streut ab Variabilitäts-Stufe 2 leicht darum.
        */}
        <p className="setting-note">
          Characters always play at {CHARACTER_WPM} wpm — the effective speed only stretches the
          gaps between them, and a single session varies a little around this value.
        </p>
        {raised && (
          <button type="button" className="quiet-action" onClick={onResetSpeed}>
            {`Reset to ${STARTING_EFFECTIVE_WPM} wpm`}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Der Theme-Picker: System, dann Light, dann Dark -- ein `radiogroup` aus
 * `radio`-Knöpfen (Punkt 4).
 *
 * **Ein Raster aus drei Spalten je Gruppe, keine Liste** -- sieben Zeilen zu
 * je `--tap` (44 px) hätten allein über 300 px gebraucht und den Screen bei
 * 390 × 844 deutlich zum Scrollen gebracht (gemessen, nicht angenommen,
 * CLAUDE.md 7). Light und Dark haben exakt drei Mitglieder, "System" bekommt
 * seine eigene, volle Zeile darüber -- dieselben `.answer`-Knöpfe wie das
 * Trainings-Gitter, nur mit Text statt eines einzelnen Zeichens.
 *
 * **Keine Farbmuster neben den Namen.** Sechs Akzentpunkte in einer Ansicht
 * wären sechs Akzentflächen, und das Budget erlaubt eine (1.1 §4) -- ein
 * Theme probiert man aus, man sieht es nicht an einem Punkt an.
 */
function ThemePicker({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  return (
    <div className="theme-picker" role="radiogroup" aria-labelledby="theme-heading">
      <ThemeOption id="system" current={theme === 'system'} onSelect={onTheme} full />

      <p className="theme-group-label">Light</p>
      <div className="theme-options">
        {LIGHT_THEMES.map((id) => (
          <ThemeOption key={id} id={id} current={theme === id} onSelect={onTheme} />
        ))}
      </div>

      <p className="theme-group-label">Dark</p>
      <div className="theme-options">
        {DARK_THEMES.map((id) => (
          <ThemeOption key={id} id={id} current={theme === id} onSelect={onTheme} />
        ))}
      </div>
    </div>
  );
}

/**
 * Eine Kachel des Rasters. Ausgewaehlt heisst ink statt gray, Rand statt
 * Fuellung -- dasselbe Muster wie eine richtige Antwort im Training
 * (`.answer[data-mark='correct']`, styles.css): ein ruhiger Rahmenwechsel
 * genuegt, kein zweites Amber. Das Haekchen traegt die Unterscheidung
 * zusaetzlich zur Farbe (CLAUDE.md 6: nie Farbe allein).
 */
function ThemeOption({
  id,
  current,
  onSelect,
  full = false,
}: {
  id: Theme;
  current: boolean;
  onSelect: (theme: Theme) => void;
  /** "System" steht allein in einer vollen Zeile, nicht im Dreier-Raster. */
  full?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={current}
      className="theme-option"
      data-full={full || undefined}
      onClick={() => onSelect(id)}
    >
      {THEME_LABELS[id]}
      {current && (
        <span className="theme-option-mark" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
