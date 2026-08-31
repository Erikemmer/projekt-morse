# Projekt Morse

Adaptiver Morse-Trainer im Browser. Kernloop: **hören → tippen → Feedback.**
Ziel ist Kopfhören — das Zeichen als Klang erkennen, nicht Punkte und Striche zählen.

Läuft vollständig lokal: kein Konto, kein Server, keine Cookies.

## Stand

Grundgerüst. Die Engine und die Wiedergabe stehen und sind getestet; der Lernloop
selbst ist noch nicht gebaut. Die mitgelieferte Oberfläche ist eine Demo, die zeigt,
dass Engine und Player zusammenspielen.

## Loslegen

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Engine-Tests (Vitest)
npm run build    # Typprüfung + Produktionsbuild
```

## Aufbau

| Pfad | Rolle |
|---|---|
| `src/engine/alphabet.ts` | Morse-Alphabet nach ITU-R M.1677-1, plus Kodieren/Dekodieren |
| `src/engine/timing.ts` | Farnsworth-Timing nach dem ARRL-Standard |
| `src/engine/schedule.ts` | Text → Zeitachse aus Tönen (reine Datenstruktur) |
| `src/audio/player.ts` | Wiedergabe über die Web Audio API |
| `src/ui/` | React-Oberfläche |

`src/engine/` ist DOM-frei und ohne Browser testbar. Der Player kennt die Engine,
die Engine kennt den Player nicht.

## Zwei Entscheidungen, die den Rest erklären

**Timing läuft über die Audio-Uhr, nicht über Timer.** Jeder Ton bekommt seine Start-
und Endzeit auf `AudioContext.currentTime`, die in Samples läuft. `setInterval` weckt
nur den Planer, der ein Stück Zukunft vorbereitet (0,3 s Vorlauf); verspätet er sich,
verschiebt das keinen einzigen Ton. Mit `setTimeout` pro Ton wären zweistellige
Millisekunden-Abweichungen normal — und Morse *ist* Timing.

**Farnsworth von Anfang an.** Zeichen werden immer im endgültigen Tempo gesendet
(`characterWpm`); gestreckt werden nur die Pausen, bis das Gesamttempo
(`effectiveWpm`) stimmt. Wer Zeichen langsam lernt, lernt einen Klang, den er später
umlernen muss.

Formel und Herleitung: Jon Bloom, *A Standard for Morse Timing Using the Farnsworth
Technique*, ARRL QEX, April 1990. Der Test `PARIS dauert bei 5 WpM genau 12 Sekunden`
prüft gegen diese Referenz, nicht gegen die eigene Implementierung.

## Mitarbeit

Die verbindlichen Regeln stehen in [CLAUDE.md](./CLAUDE.md) — Timing-Grundsatz,
Architekturgrenzen, Barrierefreiheit, Leistungsbudget.
