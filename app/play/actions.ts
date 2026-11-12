"use server";

import { cookies } from "next/headers";
import { claimPlayer, getBoard, getSession, joinSession, playerForToken, tokenCookie, type GameSession } from "@/lib/game";
import {
  autoTeam,
  createTeam,
  joinTeam,
  passTurn,
  placeTile,
  skipTurn,
  renameTeam,
  startTeam,
  swapTile,
  teamState,
} from "@/lib/game-teams";
import { createAdminClient } from "@/lib/supabase/admin";

const setToken = async (sessionId: string, token: string) =>
  // httpOnly so a refresh or a locked phone resumes the same player.
  (await cookies()).set(tokenCookie(sessionId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

/** Phone lost its cookie: pick an existing name back up. */
export async function claimGame(sessionId: string, playerId: string) {
  const res = await claimPlayer(sessionId, playerId);
  if ("error" in res) return res;
  await setToken(sessionId, res.token);
  return { ok: true } as const;
}

export async function joinGame(sessionId: string, name: string, forceNew = false) {
  const res = await joinSession(sessionId, name, forceNew);
  if ("error" in res || "exists" in res) return res;
  // Straight onto an open team; the waiting room offers "here with friends?" instead.
  const session = await getSession(sessionId);
  if (session) {
    const { data: prod } = await createAdminClient()!.from("productions").select("slug").eq("id", session.production_id).single();
    await autoTeam(sessionId, res.player.id, prod?.slug ?? "");
  }
  await setToken(sessionId, res.token);
  return { player: res.player };
}

/** Resolve the calling phone to a live session + player + production slug. */
async function who(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session || Date.parse(session.closes_at) <= Date.now()) return { error: "Time's up. The game closed at curtain." } as const;
  const token = (await cookies()).get(tokenCookie(sessionId))?.value;
  const player = await playerForToken(sessionId, token);
  if (!player) return { error: "Join with your name first." } as const;
  const { data: prod } = await createAdminClient()!
    .from("productions")
    .select("slug")
    .eq("id", session.production_id)
    .single();
  return { session: session as GameSession, player, slug: prod?.slug ?? "" } as const;
}

export async function createTeamAction(sessionId: string) {
  const w = await who(sessionId);
  return "error" in w ? w : createTeam(sessionId, w.player.id, w.slug);
}
export async function joinTeamAction(sessionId: string, teamId: string) {
  const w = await who(sessionId);
  return "error" in w ? w : joinTeam(teamId, w.player.id, w.slug);
}
export async function autoTeamAction(sessionId: string) {
  const w = await who(sessionId);
  return "error" in w ? w : autoTeam(sessionId, w.player.id, w.slug);
}
export async function renameTeamAction(sessionId: string, name: string) {
  const w = await who(sessionId);
  if ("error" in w) return w;
  if (!w.player.team_id) return { error: "You're not on a team." } as const;
  return renameTeam(w.player.team_id, name);
}
export async function startTeamAction(sessionId: string) {
  const w = await who(sessionId);
  if ("error" in w) return w;
  if (!w.player.team_id) return { error: "You're not on a team." } as const;
  return startTeam(w.player.team_id, w.slug);
}
export async function placeTileAction(sessionId: string, cell: string, letter: string) {
  const w = await who(sessionId);
  return "error" in w ? w : placeTile(w.player.id, w.slug, cell, letter);
}
export async function swapTileAction(sessionId: string, letter: string) {
  const w = await who(sessionId);
  return "error" in w ? w : swapTile(w.player.id, letter);
}
export async function passTurnAction(sessionId: string) {
  const w = await who(sessionId);
  return "error" in w ? w : passTurn(w.player.id);
}
export async function skipTurnAction(sessionId: string) {
  const w = await who(sessionId);
  return "error" in w ? w : skipTurn(w.player.id);
}
/** Board/team re-reads are public data, so no cookie check. */
export async function fetchTeam(teamId: string, slug: string) {
  return teamState(teamId, slug);
}
export async function fetchBoard(productionId: string, sessionId: string | null) {
  return getBoard(productionId, sessionId);
}
