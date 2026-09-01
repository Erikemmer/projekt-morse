/**
 * Wer die "Relying Party" ist -- abgeleitet aus der Anfrage, gegen eine Liste.
 *
 * WebAuthn bindet jeden Passkey an eine **RP ID** (einen Domainnamen) und
 * prueft bei jeder Anmeldung die **Origin**. Beides muss der Server erwarten,
 * sonst laesst sich eine Signatur von einer fremden Seite einschmuggeln.
 *
 * Wir nehmen sie aus der Anfrage statt aus einer Umgebungsvariablen -- dieselbe
 * Function laeuft damit unveraendert auf localhost, auf pages.dev und auf
 * morse-lab.com. **Der Host-Header allein darf das aber nicht entscheiden**:
 * ein Client bestimmt ihn frei. Deshalb die Liste unten. Was nicht draufsteht,
 * bekommt keine Optionen.
 *
 * **Eine Eigenschaft, die man kennen muss, bevor `morse-lab.com` live geht:**
 * ein Passkey gilt nur fuer die RP ID, unter der er angelegt wurde. Wer sich
 * heute auf `projekt-morse.pages.dev` einen anlegt, kann sich damit spaeter
 * auf `morse-lab.com` **nicht** anmelden -- das ist WebAuthn, kein Fehler hier.
 * Sobald die Custom Domain die kanonische ist, gehoert eine Weiterleitung von
 * pages.dev dorthin (dann entsteht das Problem nicht) oder ein Hinweis fuer die
 * Handvoll frueher Konten. Steht in HANDOVER.md.
 */

/**
 * Erlaubte Hosts. Kein Wildcard-Regex, sondern eine gelesene Liste plus die
 * eine noetige Suffix-Regel fuer die Preview-Deploys von Pages
 * (`<hash>.projekt-morse.pages.dev`).
 */
const EXACT_HOSTS: readonly string[] = ['localhost', '127.0.0.1', 'morse-lab.com', 'www.morse-lab.com'];
const HOST_SUFFIXES: readonly string[] = ['.pages.dev'];

export interface RelyingParty {
  /** Der Domainname, an den der Passkey gebunden wird. Ohne Port. */
  readonly id: string;
  /** Die vollstaendige Herkunft inklusive Schema und Port. */
  readonly origin: string;
  /** Was im Passkey-Dialog des Betriebssystems steht. */
  readonly name: string;
}

/**
 * Die Relying Party dieser Anfrage -- oder `null`, wenn der Host nicht auf der
 * Liste steht. `null` ist ein 400, nie ein stiller Rueckfall auf einen
 * Standardwert: ein geratener Erwartungswert waere genau die Luecke, die diese
 * Funktion schliessen soll.
 */
export function relyingPartyFor(request: Request): RelyingParty | null {
  const url = new URL(request.url);
  const host = url.hostname;

  const allowed =
    EXACT_HOSTS.includes(host) || HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  if (!allowed) return null;

  return { id: host, origin: url.origin, name: 'Morse Lab' };
}
