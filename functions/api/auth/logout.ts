/**
 * POST /api/auth/logout -- abmelden.
 *
 * POST und nicht GET: Abmelden veraendert Zustand. Ein GET liesse sich von
 * einem fremden Bild-Tag ausloesen.
 *
 * Antwortet immer 204, auch ohne gueltige Sitzung. "Abgemeldet" ist der
 * gewuenschte Endzustand; wer schon abgemeldet war, hat ihn erreicht.
 * Der Lernstand auf dem Geraet bleibt unberuehrt -- Abmelden ist kein Loeschen
 * (das ist DELETE /api/account).
 */

import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';
import { endSession } from '../../_lib/sessions';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = await endSession(request, env);
  return json(null, 204, headers);
};
