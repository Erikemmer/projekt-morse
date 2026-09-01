/**
 * Das Konto von der Client-Seite: Passkeys, Sitzung, Abgleich.
 *
 * Hier steht **kein Lernwissen**. Was beim Zusammenlegen zweier Staende
 * gewinnt, entscheidet `engine/sync.ts`; dieses Modul redet mit
 * `navigator.credentials`, mit `fetch` und mit dem localStorage -- also mit
 * allem, was die Engine nicht anfassen darf (CLAUDE.md 4).
 *
 * **Die Leitplanke ueber allem: local-first.** Jede Funktion hier darf
 * fehlschlagen, ohne dass die App etwas merkt. Deshalb gibt es keinen
 * Fehlerpfad, der wirft: die Rueckgabewerte sind Ergebnisse, keine Ausnahmen.
 * Ein Push, der nicht durchgeht, ist kein Ereignis -- der naechste holt auf.
 *
 * **Passkeys ueber die nativen APIs.** Kein Browser-Paket dazu (Vorgabe): die
 * eine Umwandlung, die man dafuer braucht, ist base64url zu ArrayBuffer und
 * zurueck, und die steht unten in zwanzig Zeilen. Die neueren Helfer
 * `PublicKeyCredential.parseCreationOptionsFromJSON()` und `.toJSON()` waeren
 * kuerzer, sind aber erst in ganz frischen Browsern da -- fuer eine App, die
 * ohne Konto vollstaendig laeuft, ist das der falsche Ort fuer eine
 * Versionshuerde.
 */

import { emptySnapshot, mergeProgress, type Snapshot } from '../engine/sync';
import { parseProgress, type Progress } from '../engine/stats';
import { loadProgress, loadProgressStamp, saveProgressNow } from './progressStorage';

/**
 * Was lokal ueber das Konto bekannt ist.
 *
 * Bewusst **nicht** im Lernstand: der ist der Blob, der synchronisiert wird,
 * und Geraetezustand hat darin nichts zu suchen. Es steht hier auch bewusst
 * kein Token -- die Sitzung ist ein HttpOnly-Cookie, den kein Skript sieht.
 * `linked` sagt nur: "auf diesem Geraet wurde einmal angemeldet, es lohnt sich
 * zu fragen".
 */
export interface AccountRecord {
  readonly linked: boolean;
  /** Wann der letzte Abgleich geklappt hat, in Millisekunden. 0 = noch nie. */
  readonly lastSyncedAt: number;
}

const ACCOUNT_KEY = 'projekt-morse:account';

const SIGNED_OUT: AccountRecord = { linked: false, lastSyncedAt: 0 };

export function loadAccount(): AccountRecord {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (raw === null) return SIGNED_OUT;
    const parsed = JSON.parse(raw) as Partial<AccountRecord>;
    const lastSyncedAt =
      typeof parsed.lastSyncedAt === 'number' && Number.isFinite(parsed.lastSyncedAt)
        ? parsed.lastSyncedAt
        : 0;
    return { linked: parsed.linked === true, lastSyncedAt };
  } catch {
    return SIGNED_OUT;
  }
}

function saveAccount(record: AccountRecord): void {
  try {
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(record));
  } catch {
    // Ohne Speicher fragt die App nach dem Neuladen eben nicht mehr nach dem
    // Konto. Das ist ein Komfortverlust, kein Datenverlust.
  }
}

// --- Was nach aussen passieren kann -------------------------------------

/**
 * Das Ergebnis einer Konto-Aktion. Genau drei Faelle, weil die UI genau drei
 * unterscheiden muss: geklappt, abgebrochen (dann sagt sie nichts), oder
 * schiefgegangen (dann sagt sie *einen* ruhigen Satz).
 */
export type AccountOutcome =
  | { kind: 'ok' }
  /** Der Nutzer hat den Passkey-Dialog geschlossen. Keine Meldung. */
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/** Die Fehlerzeilen. An einem Ort, damit der Ton einheitlich bleibt (1.1 §11). */
const MESSAGES = {
  unsupported: 'Passkeys need a supported browser.',
  offline: 'No connection to the server. Your progress stays on this device.',
  rejected: 'That passkey did not work here. You can try again.',
  noAccount: 'No account found for that passkey.',
} as const;

// --- Sitzung ------------------------------------------------------------

/** Ob gerade eine Sitzung anliegt. `undefined` heisst: nicht erreichbar. */
export async function probeSession(): Promise<boolean | undefined> {
  const pulled = await pull();
  if (pulled === 'unreachable') return undefined;
  return pulled !== 'unauthorised';
}

// --- Registrieren und Anmelden ------------------------------------------

/**
 * Einen Passkey anlegen -- und damit das Konto.
 *
 * Danach laeuft derselbe Abgleich wie beim Login. Beim frischen Konto ist der
 * entfernte Stand leer, der Merge gibt also den lokalen zurueck -- ein Pfad
 * statt zwei, und der Fall "Konto angelegt, das schon einen Stand hatte"
 * (zweiter Passkey, spaeterer Ausbau) ist damit schon richtig.
 */
export async function createPasskey(): Promise<AccountOutcome & { progress?: Progress }> {
  if (!passkeysAvailable()) return { kind: 'error', message: MESSAGES.unsupported };

  const options = await postJson('/api/auth/register/options');
  if (options === 'unreachable') return { kind: 'error', message: MESSAGES.offline };
  if (options === 'unauthorised' || options === 'rejected') {
    return { kind: 'error', message: MESSAGES.rejected };
  }

  let attestation: PublicKeyCredential | null;
  try {
    attestation = (await navigator.credentials.create({
      publicKey: creationOptions(options as CreationOptionsJSON),
    })) as PublicKeyCredential | null;
  } catch (error) {
    return fromCredentialError(error);
  }
  if (attestation === null) return { kind: 'cancelled' };

  const verified = await postJson('/api/auth/register/verify', registrationJson(attestation));
  if (verified === 'unreachable') return { kind: 'error', message: MESSAGES.offline };
  if (verified === 'rejected' || verified === 'unauthorised') {
    return { kind: 'error', message: MESSAGES.rejected };
  }

  return { kind: 'ok', progress: await syncAfterSignIn() };
}

/** Mit einem vorhandenen Passkey anmelden. */
export async function signInWithPasskey(): Promise<AccountOutcome & { progress?: Progress }> {
  if (!passkeysAvailable()) return { kind: 'error', message: MESSAGES.unsupported };

  const options = await postJson('/api/auth/login/options');
  if (options === 'unreachable') return { kind: 'error', message: MESSAGES.offline };
  if (options === 'unauthorised' || options === 'rejected') {
    return { kind: 'error', message: MESSAGES.rejected };
  }

  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: requestOptions(options as RequestOptionsJSON),
    })) as PublicKeyCredential | null;
  } catch (error) {
    return fromCredentialError(error);
  }
  if (assertion === null) return { kind: 'cancelled' };

  const verified = await postJson('/api/auth/login/verify', authenticationJson(assertion));
  if (verified === 'unreachable') return { kind: 'error', message: MESSAGES.offline };
  // Ein Passkey, den der Server nicht kennt, ist der eine Fehlerfall, den ein
  // Nutzer hier wirklich unterscheiden kann -- und der Server antwortet auf ihn
  // absichtlich wie auf jeden anderen. Also die allgemeinere Zeile.
  if (verified === 'rejected' || verified === 'unauthorised') {
    return { kind: 'error', message: MESSAGES.noAccount };
  }

  return { kind: 'ok', progress: await syncAfterSignIn() };
}

/** Abmelden. Der lokale Stand bleibt, wie er ist. */
export async function signOut(): Promise<void> {
  await postJson('/api/auth/logout');
  // Auch wenn der Aufruf nicht durchkam: lokal gilt "abgemeldet". Der Cookie
  // laeuft serverseitig ohnehin ab, und die App soll nicht behaupten, sie sei
  // noch verbunden.
  saveAccount(SIGNED_OUT);
}

/**
 * Konto und alle Daten auf dem Server loeschen.
 *
 * Gibt `false` nur zurueck, wenn der Server nicht erreichbar war -- dann ist
 * nichts geloescht, und die UI muss das sagen. Eine Sitzung, die schon weg war
 * (401), gilt als erledigt: der gewuenschte Endzustand ist erreicht.
 */
export async function deleteAccount(): Promise<boolean> {
  const result = await request('/api/account', { method: 'DELETE' });
  if (result === 'unreachable') return false;
  saveAccount(SIGNED_OUT);
  return true;
}

// --- Abgleich -----------------------------------------------------------

/**
 * Der Abgleich direkt nach dem Anmelden: ziehen, zusammenlegen, schreiben,
 * zurueckschieben.
 *
 * Gibt den zusammengelegten Stand zurueck, damit die laufende Sitzung ihn
 * uebernehmen kann. Kommt der Server nicht, bleibt der lokale Stand unberuehrt
 * -- angemeldet ist man dann trotzdem, nur noch nicht abgeglichen.
 */
async function syncAfterSignIn(): Promise<Progress> {
  const local: Snapshot = { progress: loadProgress(), updatedAt: loadProgressStamp() };

  const pulled = await pull();
  if (pulled === 'unreachable' || pulled === 'unauthorised') {
    saveAccount({ linked: true, lastSyncedAt: 0 });
    return local.progress;
  }

  const remote: Snapshot =
    pulled.blob === null
      ? emptySnapshot()
      : { progress: parseProgress(pulled.blob), updatedAt: pulled.updatedAt };

  const merged = mergeProgress(local, remote);
  saveProgressNow(merged);

  // Der zusammengelegte Stand geht sofort zurueck: sonst waere der Server der
  // einzige Ort, an dem er *nicht* steht, und das naechste Geraet wuerde
  // wieder gegen den alten mergen.
  const pushed = await push(merged);
  saveAccount({ linked: true, lastSyncedAt: pushed ? Date.now() : 0 });
  return merged;
}

/**
 * Den Stand hochschieben -- der Weg nach jedem Sitzungsende.
 *
 * "Best effort" heisst hier woertlich: kein `await` beim Aufrufer, kein
 * Ergebnis in der UI, kein Modal. Wer offline uebt, uebt offline; der naechste
 * Push holt auf.
 *
 * Nur die 401 hat eine Folge: dann ist die Sitzung abgelaufen, und die App
 * darf nicht weiter behaupten, sie sei verbunden.
 */
export async function pushProgress(progress: Progress): Promise<void> {
  const account = loadAccount();
  if (!account.linked) return;

  const result = await request('/api/progress', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blob: progress, updatedAt: loadProgressStamp() || Date.now() }),
  });

  if (result === 'unauthorised') {
    saveAccount(SIGNED_OUT);
    return;
  }
  if (result === 'unreachable' || result === 'rejected') return;

  saveAccount({ linked: true, lastSyncedAt: Date.now() });
}

async function push(progress: Progress): Promise<boolean> {
  const result = await request('/api/progress', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blob: progress, updatedAt: loadProgressStamp() || Date.now() }),
  });
  return result !== 'unreachable' && result !== 'rejected' && result !== 'unauthorised';
}

interface PulledProgress {
  blob: unknown;
  updatedAt: number;
}

async function pull(): Promise<PulledProgress | 'unreachable' | 'unauthorised'> {
  const result = await request('/api/progress', { method: 'GET' });
  if (result === 'unreachable' || result === 'unauthorised') return result;
  if (result === 'rejected' || result === null) return 'unreachable';

  const body = result as { blob?: unknown; updatedAt?: unknown };
  return {
    blob: body.blob ?? null,
    updatedAt: typeof body.updatedAt === 'number' && Number.isFinite(body.updatedAt) ? body.updatedAt : 0,
  };
}

// --- fetch, einmal umwickelt -------------------------------------------

type RequestResult = unknown | 'unreachable' | 'unauthorised' | 'rejected';

/**
 * Ein API-Aufruf, der nie wirft.
 *
 * Drei Ausgaenge, die die Aufrufer unterscheiden muessen: kein Netz
 * (`unreachable`), keine Sitzung (`unauthorised`), abgelehnt (`rejected`).
 * Alles andere ist der geparste Rumpf -- oder `null` bei 204.
 */
async function request(path: string, init: RequestInit): Promise<RequestResult> {
  let response: Response;
  try {
    // `same-origin` ist der Standard; er steht hier, weil er hier die Sache
    // ist: ohne Cookie ist jeder dieser Aufrufe eine 401.
    response = await fetch(path, { ...init, credentials: 'same-origin' });
  } catch {
    return 'unreachable';
  }

  if (response.status === 401) return 'unauthorised';
  if (response.status === 204) return null;
  if (!response.ok) return 'rejected';

  try {
    return await response.json();
  } catch {
    return 'rejected';
  }
}

function postJson(path: string, body?: unknown): Promise<RequestResult> {
  return request(path, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// --- Passkeys: Umwandlung und Fehler -----------------------------------

function passkeysAvailable(): boolean {
  return (
    typeof window.PublicKeyCredential === 'function' &&
    typeof navigator.credentials?.create === 'function'
  );
}

/**
 * Ein Fehlschlag von `navigator.credentials`.
 *
 * `NotAllowedError` und `AbortError` heissen fast immer "der Nutzer hat den
 * Dialog geschlossen" (oder er ist verfallen). Das ist keine Stoerung und
 * bekommt keine Zeile -- eine Fehlermeldung nach einem Abbruch waere ein
 * Vorwurf (1.1 §11).
 */
function fromCredentialError(error: unknown): AccountOutcome {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'AbortError') return { kind: 'cancelled' };
  if (name === 'NotSupportedError' || name === 'SecurityError') {
    return { kind: 'error', message: MESSAGES.unsupported };
  }
  return { kind: 'error', message: MESSAGES.rejected };
}

function toBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/*
 * Der Rueckgabetyp ist ausgeschrieben `Uint8Array<ArrayBuffer>`: die
 * WebAuthn-Typen der DOM-Bibliothek verlangen einen Puffer, der *nicht*
 * geteilt sein kann (`BufferSource`), und das kuerzere `Uint8Array` schliesst
 * SharedArrayBuffer mit ein.
 */
function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/*
 * Die JSON-Form, in der der Server die Optionen schickt (WebAuthn Level 3
 * nennt sie so). Nur die Felder, die hier umgewandelt werden -- der Rest
 * wandert unveraendert durch.
 */
interface CreationOptionsJSON {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: { id: string; type: string; transports?: string[] }[];
}

interface RequestOptionsJSON {
  challenge: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
}

function creationOptions(json: CreationOptionsJSON): PublicKeyCredentialCreationOptions {
  return {
    ...(json as unknown as PublicKeyCredentialCreationOptions),
    challenge: fromBase64url(json.challenge),
    user: { ...json.user, id: fromBase64url(json.user.id) },
    excludeCredentials: (json.excludeCredentials ?? []).map((credential) => ({
      ...credential,
      id: fromBase64url(credential.id),
      type: 'public-key' as const,
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    })),
  };
}

function requestOptions(json: RequestOptionsJSON): PublicKeyCredentialRequestOptions {
  return {
    ...(json as unknown as PublicKeyCredentialRequestOptions),
    challenge: fromBase64url(json.challenge),
    allowCredentials: (json.allowCredentials ?? []).map((credential) => ({
      ...credential,
      id: fromBase64url(credential.id),
      type: 'public-key' as const,
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    })),
  };
}

/** Die Antwort des Authenticators in der Form, die der Server erwartet. */
function registrationJson(credential: PublicKeyCredential): unknown {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      attestationObject: toBase64url(response.attestationObject),
      // getTransports() gibt es nicht ueberall; ohne sie bleibt die Spalte leer,
      // und der Login funktioniert trotzdem (sie ist nur ein Hinweis fuer den
      // Browser, wo er suchen soll).
      transports:
        typeof response.getTransports === 'function' ? response.getTransports() : undefined,
    },
  };
}

function authenticationJson(credential: PublicKeyCredential): unknown {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    response: {
      clientDataJSON: toBase64url(response.clientDataJSON),
      authenticatorData: toBase64url(response.authenticatorData),
      signature: toBase64url(response.signature),
      userHandle: response.userHandle === null ? undefined : toBase64url(response.userHandle),
    },
  };
}
