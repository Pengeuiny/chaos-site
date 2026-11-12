"use server";

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getSession, playerForToken, startRehearsal, stopSession, tokenCookie } from "@/lib/game";
import { addBot, botTick } from "@/lib/game-teams";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const MANUAL_MS = 2 * 60 * 60 * 1000;

/** Dev builds trust anyone; production needs a signed-in admin account. */
async function allowed() {
  return process.env.NODE_ENV === "development" || !!(await getCurrentAdmin());
}

export async function adminStartGame(formData: FormData) {
  if (!(await allowed())) redirect("/admin/login");
  await startRehearsal(String(formData.get("production_id") ?? ""), Date.now(), MANUAL_MS);
  redirect("/play");
}

export async function adminStopGame(formData: FormData) {
  if (!(await allowed())) redirect("/admin/login");
  await stopSession(String(formData.get("session_id") ?? ""));
  redirect("/play");
}

/** Test mode only: add a practice player to the caller's team. */
export async function adminAddBot(sessionId: string) {
  if (!(await allowed())) return { error: "Admins only." } as const;
  const session = await getSession(sessionId);
  if (!session?.is_rehearsal) return { error: "Practice players are for test games only." } as const;
  const token = (await cookies()).get(tokenCookie(sessionId))?.value;
  const me = await playerForToken(sessionId, token);
  if (!me?.team_id) return { error: "Join a team first." } as const;
  return addBot(sessionId, me.team_id);
}

/** Test mode only: let one practice player make a move. Driven by the admin's open page. */
export async function adminBotTick(sessionId: string, botId: string) {
  if (!(await allowed())) return { error: "Admins only." } as const;
  const session = await getSession(sessionId);
  if (!session?.is_rehearsal || Date.parse(session.closes_at) <= Date.now()) return { ok: true } as const;
  const { data: prod } = await createAdminClient()!.from("productions").select("slug").eq("id", session.production_id).single();
  return botTick(botId, prod?.slug ?? "");
}
