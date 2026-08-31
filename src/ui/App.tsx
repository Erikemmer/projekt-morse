/**
 * Demo-Oberflaeche fuer das Grundgeruest.
 *
 * Bewusst noch kein Lernloop -- die UI zeigt hier nur, dass Engine und Player
 * zusammenspielen. Sie enthaelt keine Logik: rechnen tut die Engine, klingen
 * tut der Player.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { MorsePlayer } from '../audio/player';
import { buildSchedule } from '../engine/schedule';
import { computeTiming } from '../engine/timing';

export function App() {
  const [text, setText] = useState('PARIS');
  const [characterWpm, setCharacterWpm] = useState(18);
  const [effectiveWpm, setEffectiveWpm] = useState(9);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<MorsePlayer | null>(null);

  const timing = useMemo(
    () => computeTiming({ characterWpm, effectiveWpm }),
    [characterWpm, effectiveWpm],
  );
  const schedule = useMemo(() => buildSchedule(text, timing), [text, timing]);

  // Beim Verlassen der Seite nicht weiterpiepen.
  useEffect(() => () => playerRef.current?.stop(), []);

  const handlePlay = async () => {
    playerRef.current ??= new MorsePlayer();
    const player = playerRef.current;
    // Muss in der Klick-Geste passieren, sonst bleibt Audio stumm.
    await player.resume();
    setIsPlaying(true);
    const handle = player.play(schedule);
    await handle.finished;
    setIsPlaying(false);
  };

  const handleStop = () => {
    playerRef.current?.stop();
    setIsPlaying(false);
  };

  return (
    <main className="shell">
      <header>
        <h1>Projekt Morse</h1>
        <p className="lede">
          Foundations: engine, Farnsworth timing and playback. The learning loop comes next.
        </p>
      </header>

      <section className="panel">
        <label className="field" htmlFor="text">
          <span>Text</span>
          <input
            id="text"
            type="text"
            value={text}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <label className="field" htmlFor="characterWpm">
          <span>
            Character speed <output htmlFor="characterWpm">{characterWpm} WPM</output>
          </span>
          <input
            id="characterWpm"
            type="range"
            min={10}
            max={35}
            step={1}
            value={characterWpm}
            onChange={(event) => {
              const next = Number(event.target.value);
              setCharacterWpm(next);
              // Ein Gesamttempo oberhalb des Zeichentempos ist nicht darstellbar.
              setEffectiveWpm((current) => Math.min(current, next));
            }}
          />
        </label>

        <label className="field" htmlFor="effectiveWpm">
          <span>
            Overall speed <output htmlFor="effectiveWpm">{effectiveWpm} WPM</output>
          </span>
          <input
            id="effectiveWpm"
            type="range"
            min={5}
            max={characterWpm}
            step={1}
            value={effectiveWpm}
            onChange={(event) => setEffectiveWpm(Number(event.target.value))}
          />
        </label>

        <div className="actions">
          <button type="button" onClick={handlePlay} disabled={isPlaying || schedule.tones.length === 0}>
            Play
          </button>
          <button type="button" onClick={handleStop} disabled={!isPlaying}>
            Stop
          </button>
        </div>
      </section>

      <section className="panel" aria-live="polite">
        <p className="pattern">
          {schedule.characters.length === 0
            ? '—'
            : schedule.characters.map((character) => (
                <span className="glyph" key={`${character.char}-${character.start}`}>
                  <span className="glyph-char">{character.char}</span>
                  <span className="glyph-code">{character.pattern}</span>
                </span>
              ))}
        </p>
        <dl className="facts">
          <div>
            <dt>Duration</dt>
            <dd>{schedule.duration.toFixed(2)} s</dd>
          </div>
          <div>
            <dt>Gap between characters</dt>
            <dd>{(timing.interCharacterGap / timing.unit).toFixed(1)} units</dd>
          </div>
          <div>
            <dt>dit</dt>
            <dd>{(timing.dit * 1000).toFixed(0)} ms</dd>
          </div>
        </dl>
        {schedule.unsupported.length > 0 && (
          <p className="warning">
            Not representable in Morse, skipped: {schedule.unsupported.join(' ')}
          </p>
        )}
      </section>
    </main>
  );
}
