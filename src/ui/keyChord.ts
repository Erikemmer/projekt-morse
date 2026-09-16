/**
 * Ob ein Anschlag ein Browser-Kuerzel ist und die App ihn deshalb in Ruhe
 * lassen muss.
 *
 * **Warum das ein eigenes Modul ist.** Diese Entscheidung stand bis hierher
 * als dieselbe Zeile in sechs Handlern -- Training, Lernkarte, Zeichenwahl,
 * Wort-Modus und zweimal im Sende-Training. Sechs Kopien einer Regel sind
 * keine Regel, sondern sechs Gelegenheiten, sie unterschiedlich falsch zu
 * haben (CLAUDE.md 4: der zweite Bedarf verallgemeinert; hier war es der
 * sechste).
 *
 * **Und warum `altKey` nicht mehr mitzaehlt.** Alle sechs Kopien lauteten
 * `metaKey || ctrlKey || altKey`. Das ist die einzige Zeile, die *jeder*
 * Modus teilt -- und sie erklaert als einzige einen Ausfall, der in *allen*
 * Modi auftritt, sich nicht reproduzieren laesst und jede modusweise
 * Reparatur ueberlebt hat (Runden P2 bis P6).
 *
 * Der Mechanismus: wer mit **Alt-Tab** aus dem Browser heraus- und wieder
 * hineinwechselt, laesst Alt los, *waehrend die Seite den Fokus nicht hat*.
 * Das `keyup` wird ihr nie zugestellt. Der Browser fuehrt Alt daraufhin
 * weiter als gedrueckt: jedes folgende `keydown` traegt `altKey: true`, bis
 * Alt einmal sauber im Fenster gedrueckt und losgelassen wird. Dasselbe gilt
 * fuer Ctrl nach Ctrl-Tab und Meta nach Cmd-Tab. Fuer den Nutzer sieht das
 * aus wie eine Tastatur, die "teilweise nicht reagiert" -- und genau so
 * wurde es gemeldet.
 *
 * Kein automatisierter Test dieser App konnte das je sehen: ein
 * Playwright-Lauf wechselt nie das Fenster.
 *
 * **Die neue Regel:** `ctrlKey` und `metaKey` schuetzen weiter, was sie
 * schuetzen sollen -- Strg+R, Cmd+S, die Kuerzel des Browsers und des
 * Betriebssystems, die eine Seite nicht kapern darf. `altKey` tut das nicht:
 * Alt+Buchstabe ist kein Kuerzel, das diese App verdraengen wuerde, und auf
 * Windows ist AltGr ohnehin Ctrl+Alt und bleibt damit gefiltert. Der Schutz
 * bleibt also, wo er einen Zweck hat, und faellt weg, wo er nur Anschlaege
 * gefressen hat.
 *
 * Nimmt bewusst nur die Flaggen, nicht das ganze Ereignis: so ist die Regel
 * ohne DOM pruefbar.
 */
export interface KeyChordFlags {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

export function isBrowserChord(event: KeyChordFlags): boolean {
  return event.ctrlKey || event.metaKey;
}
