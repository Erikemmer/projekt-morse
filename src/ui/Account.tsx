/**
 * Der Account-Screen. Ein Sync-Ziel, keine Voraussetzung -- und der Screen
 * sagt das als Erstes.
 *
 * Diese Komponente rechnet nichts und weiss nichts ueber Lernstaende. Sie
 * rendert drei Zustaende (abgemeldet, angemeldet, Loeschen bestaetigen) und
 * meldet Klicks an `ui/account.ts`, das mit Passkeys und Server redet. Was
 * beim Zusammenlegen zweier Staende gewinnt, steht in `engine/sync.ts`.
 *
 * **Ton (1.1 §11, CLAUDE.md 2.6).** Keine Ausrufezeichen, kein Schuldton,
 * keine Werbung. Die Statuszeile behauptet nur, was belegt ist: "Synced" steht
 * da erst, wenn ein Abgleich wirklich durchgelaufen ist, und "just now" ist als
 * Naeherung formuliert, weil es eine ist. Das Loeschen ist eine ruhige Frage,
 * kein rotes Drama -- kein Rot, keine Warndreiecke, dieselben Knoepfe wie
 * ueberall.
 *
 * **Amber-Budget.** Abgemeldet traegt "Create a passkey" das eine Amber der
 * View (1.1 §4). Angemeldet gibt es **kein** Amber: dort stehen Fakten und
 * zwei nuechterne Wege hinaus, nichts davon ist ein Angebot.
 *
 * **Barrierefreiheit.** Der Passkey-Dialog kommt vom Betriebssystem; solange er
 * laeuft, sind die Knoepfe deaktiviert und eine `aria-live`-Zeile sagt, worauf
 * gewartet wird. Fehler und Statuswechsel gehen ueber dieselbe Zeile
 * (CLAUDE.md 6).
 */

import { useEffect, useState } from 'react';

import type { Progress } from '../engine/stats';
import {
  createPasskey,
  deleteAccount,
  loadAccount,
  probeSession,
  signInWithPasskey,
  signOut,
  type AccountRecord,
} from './account';

/** Was der Screen gerade tut. `idle` ist der Normalfall. */
type Busy = 'idle' | 'passkey' | 'deleting';

export function Account({
  headingRef,
  onProgress,
}: {
  headingRef: (element: HTMLElement | null) => void;
  /** Ein Abgleich hat einen neuen Stand ergeben -- die Sitzung uebernimmt ihn. */
  onProgress: (progress: Progress) => void;
}) {
  const [account, setAccount] = useState<AccountRecord>(loadAccount);
  const [busy, setBusy] = useState<Busy>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  /** Ob der Server beim Nachfragen erreichbar war. `false` = still offline. */
  const [reachable, setReachable] = useState(true);

  /*
   * Beim Oeffnen einmal nachfragen -- und nur hier. Die App fragt beim Start
   * bewusst *nicht*: wer kein Konto hat, soll keinen einzigen Aufruf ausloesen
   * (CLAUDE.md 2.5), und wer eins hat, merkt eine abgelaufene Sitzung genau
   * dann, wenn er auf diesen Screen schaut. Ein Ping bei jedem Start waere
   * Verkehr ohne Nutzen.
   */
  const linked = account.linked;
  useEffect(() => {
    if (!linked) return;
    let cancelled = false;
    void probeSession().then((live) => {
      if (cancelled) return;
      if (live === undefined) {
        setReachable(false);
        return;
      }
      setReachable(true);
      // Der Server sagt "keine Sitzung": dann ist die Anzeige von eben falsch.
      if (!live) setAccount(loadAccount());
    });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const run = async (
    what: Busy,
    action: () => Promise<{ kind: string; message?: string; progress?: Progress }>,
  ) => {
    setBusy(what);
    setMessage(null);
    const outcome = await action();
    setBusy('idle');

    if (outcome.kind === 'error') {
      setMessage(outcome.message ?? null);
      return;
    }
    // Ein Abbruch bekommt keine Zeile -- er war eine Entscheidung, kein Fehler.
    if (outcome.kind === 'cancelled') return;

    if (outcome.progress !== undefined) onProgress(outcome.progress);
    setAccount(loadAccount());
    setReachable(true);
  };

  return (
    <section className="screen" aria-labelledby="account-heading">
      <h2 id="account-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
        Account
      </h2>

      {account.linked ? (
        <SignedIn
          account={account}
          reachable={reachable}
          busy={busy}
          confirming={confirming}
          onConfirmDelete={() => setConfirming(true)}
          onCancelDelete={() => setConfirming(false)}
          onSignOut={async () => {
            setBusy('passkey');
            await signOut();
            setBusy('idle');
            setConfirming(false);
            setAccount(loadAccount());
          }}
          onDelete={async () => {
            setBusy('deleting');
            const done = await deleteAccount();
            setBusy('idle');
            if (!done) {
              setMessage('No connection to the server. Nothing was deleted.');
              return;
            }
            setConfirming(false);
            setAccount(loadAccount());
          }}
        />
      ) : (
        <SignedOut
          busy={busy}
          onCreate={() => void run('passkey', createPasskey)}
          onSignIn={() => void run('passkey', signInWithPasskey)}
        />
      )}

      {/*
        Eine Zeile fuer alles, was sich meldet: Warten, Fehler, Erfolg. Immer im
        Layout, damit nichts springt, und `polite`, damit sie einen laufenden
        Vorlesevorgang nicht unterbricht (CLAUDE.md 6).
      */}
      <p className="account-message" role="status" aria-live="polite">
        {busy === 'passkey' && 'Waiting for your passkey…'}
        {busy === 'deleting' && 'Deleting…'}
        {busy === 'idle' && message}
      </p>
    </section>
  );
}

function SignedOut({
  busy,
  onCreate,
  onSignIn,
}: {
  busy: Busy;
  onCreate: () => void;
  onSignIn: () => void;
}) {
  const waiting = busy !== 'idle';

  return (
    <>
      {/* Die eine Zeile, die die Vorgabe verlangt: wo die Daten bisher liegen. */}
      <p className="account-line">Your progress is stored on this device only.</p>

      <p className="account-note">
        A passkey keeps it in step across your devices. There is no email and no password — and
        Morse Lab stays fully usable without an account.
      </p>

      <div className="account-actions">
        <button type="button" className="button-primary" disabled={waiting} onClick={onCreate}>
          Create a passkey
        </button>
        <button type="button" disabled={waiting} onClick={onSignIn}>
          I already have one
        </button>
      </div>
    </>
  );
}

function SignedIn({
  account,
  reachable,
  busy,
  confirming,
  onConfirmDelete,
  onCancelDelete,
  onSignOut,
  onDelete,
}: {
  account: AccountRecord;
  reachable: boolean;
  busy: Busy;
  confirming: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  const waiting = busy !== 'idle';

  return (
    <>
      <p className="account-status">{statusLine(account, reachable)}</p>

      <p className="account-note">
        Signed in with a passkey. The server holds your passkey&apos;s public key and your practice
        data — no email, no name. Your progress also stays on this device.
      </p>

      {confirming ? (
        <div className="account-confirm">
          <p className="account-line">Delete account and data?</p>
          <p className="account-note">
            This removes your passkey and your synced progress from the server, for good. Your
            progress on this device stays and keeps working.
          </p>
          <div className="account-actions">
            <button type="button" disabled={waiting} onClick={onDelete}>
              Delete account and data
            </button>
            <button type="button" disabled={waiting} onClick={onCancelDelete}>
              Keep my account
            </button>
          </div>
        </div>
      ) : (
        <div className="account-actions">
          <button type="button" disabled={waiting} onClick={onSignOut}>
            Sign out
          </button>
          {/*
            Kein Rot, kein Warndreieck, dieselbe Umrandung wie "Sign out": die
            Klarheit steckt im Wortlaut, nicht in einer Farbe (1.1 §4, und
            CLAUDE.md 6 -- nie Farbe allein). Die Bestaetigung dahinter ist der
            Schutz, nicht der Schrecken davor.
          */}
          <button type="button" disabled={waiting} onClick={onConfirmDelete}>
            Delete account and data
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Die Statuszeile -- und nichts, was nicht belegt ist (CLAUDE.md 2.6).
 *
 * "Synced" behauptet einen gelaufenen Abgleich. Gab es noch keinen, steht das
 * da, statt eine Null zu erfinden. War der Server beim Oeffnen nicht
 * erreichbar, sagt die Zeile das ruhig -- ohne daraus einen Fehler zu machen,
 * denn offline weiterzuueben ist der vorgesehene Fall.
 *
 * Die Spanne ist absichtlich grob ("a few minutes ago"): eine Minutenangabe
 * waere eine Genauigkeit, die niemand braucht und die bei ruhendem Tab sofort
 * falsch aussieht.
 */
function statusLine(account: AccountRecord, reachable: boolean): string {
  if (!reachable) return 'Signed in · not reachable right now';
  if (account.lastSyncedAt === 0) return 'Signed in · not synced yet';

  const minutes = Math.floor((Date.now() - account.lastSyncedAt) / 60_000);
  if (minutes < 1) return 'Synced · just now';
  if (minutes < 60) return 'Synced · a few minutes ago';

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced · about ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `Synced · about ${days} day${days === 1 ? '' : 's'} ago`;
}
