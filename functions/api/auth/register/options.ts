/**
 * POST /api/auth/register/options -- einen neuen Passkey anbieten.
 *
 * **Einen Passkey anlegen *ist* das Anlegen des Kontos.** Es gibt keinen
 * Registrierungsschritt davor: keine E-Mail, kein Passwort, kein Name. Die
 * Nutzer-ID wird hier gewuerfelt und im Flow-Datensatz reserviert; die Zeile in
 * `users` entsteht erst, wenn der Browser mit einer gueltigen Signatur
 * zurueckkommt (verify.ts). Wer den Dialog abbricht, hinterlaesst nichts als
 * eine Flow-Zeile, die in fuenf Minuten verfaellt.
 *
 * `residentKey: 'required'` ist die Bedingung dafuer, dass Anmelden ohne
 * Nutzernamen funktioniert ("discoverable credential"): der Passkey traegt die
 * Nutzer-ID selbst, der Browser kann ihn also von sich aus vorschlagen. Ohne
 * das braeuchte der Login eine Kennung -- und die gibt es hier nicht.
 *
 * `userVerification: 'preferred'` statt `'required'`: ein Hardware-Schluessel
 * ohne PIN soll nicht abgewiesen werden. Was hinter dem Konto liegt, ist ein
 * Lernstand -- Verifikation ist hier Komfort, nicht Schutzbedarf. Steht als
 * Setzung in HANDOVER.md.
 */

import { generateRegistrationOptions } from '@simplewebauthn/server';

import type { Env } from '../../../_lib/env';
import { fail, json } from '../../../_lib/http';
import { relyingPartyFor } from '../../../_lib/rp';
import { startFlow, utf8Bytes } from '../../../_lib/sessions';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rp = relyingPartyFor(request);
  if (rp === null) return fail(400, 'unexpected host');

  const now = Date.now();
  const userId = crypto.randomUUID();

  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    /*
     * Der Passkey-Dialog des Betriebssystems braucht ein Label. Es gibt keinen
     * Nutzernamen, also steht dort der Produktname -- ehrlicher als eine
     * erfundene Kennung oder eine sichtbare UUID. Folge, bewusst in Kauf
     * genommen: zwei Konten auf demselben Geraet sehen in der Passkey-Liste
     * gleich aus.
     */
    userName: rp.name,
    userID: utf8Bytes(userId),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });

  const headers = await startFlow(env, 'register', options.challenge, userId, now);
  return json(options, 200, headers);
};
