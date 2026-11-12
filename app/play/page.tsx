import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { EMPTY_BOARD, getBoard, getPlayState, playerForToken, tokenCookie } from "@/lib/game";
import { openTeams, teamState } from "@/lib/game-teams";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { adminStartGame, adminStopGame } from "./admin-actions";
import LiveBoard from "./LiveBoard";
import Game from "./Game";
import DaedaCredit from "./DaedaCredit";
import { decoFonts } from "./fonts";
import s from "./play.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Lobby Game · CHS CHAOS",
  description: "Play the lobby game on your phone. Opens after each show and runs until the next curtain.",
};

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

export default async function PlayPage() {
  // eslint-disable-next-line react-hooks/purity -- request-time render (force-dynamic)
  const serverNow = Date.now();
  const state = await getPlayState(serverNow);
  const { production, live, current, next } = state;
  const board = production ? await getBoard(production.id, current?.id ?? null) : EMPTY_BOARD;

  // Look the phone up against tonight's session even after curtain, so the
  // team's final standing stays on screen.
  const token = current ? (await cookies()).get(tokenCookie(current.id))?.value : undefined;
  const me = current ? await playerForToken(current.id, token) : null;
  const team = me?.team_id && production ? await teamState(me.team_id, production.slug) : null;
  const teams = live && me && !team?.team.started_at ? await openTeams(live.id) : [];
  // Manual start/stop: any admin account in production, anyone on a dev build.
  const isAdmin = process.env.NODE_ENV === "development" || !!(await getCurrentAdmin());

  return (
    <div className={`${s.root} ${decoFonts}`}>
      <header className={s.top}>
        <Link href="/" className={s.home}>CHS CHAOS</Link>
      </header>

      <div className={s.wrap}>
        <div className={s.titleBlock}>
          <p className={s.kicker}>The Lobby Game</p>
          <h1 className={s.h1}>{production?.title ?? "Lobby Game"}</h1>
        </div>

        {isAdmin && production && (
          <div className={s.adminBar}>
            <span>Admin</span>
            {live ? (
              <form action={adminStopGame} suppressHydrationWarning>
                <input suppressHydrationWarning type="hidden" name="session_id" value={live.id} />
                <button className={s.adminBtn}>Stop the game now</button>
              </form>
            ) : (
              <form action={adminStartGame} suppressHydrationWarning>
                <input suppressHydrationWarning type="hidden" name="production_id" value={production.id} />
                <button className={s.adminBtn}>Start a test game</button>
              </form>
            )}
            <small>{live ? "Closes it for everyone this second." : "Opens /play for 2 hours or until you stop it. Results aren't kept."}</small>
          </div>
        )}

        {production && (
          <LiveBoard
            productionId={production.id}
            title={production.title}
            session={current}
            nextOpensAt={next?.opens_at ?? null}
            initial={board}
            meId={me?.id ?? null}
            myTeamId={me?.team_id ?? null}
            fixedLight
            serverNow={serverNow}
          />
        )}

        <section id="game" className={s.game}>
          {current && production && (live || me) ? (
            <>
              <h2 className={s.h2}>{current.is_rehearsal ? "Rehearsal round" : "Tonight's game"}</h2>
              <Game
                sessionId={current.id}
                slug={production.slug}
                live={!!live}
                me={me ? { id: me.id, name: me.name, team_id: me.team_id ?? null } : null}
                openTeams={teams}
                initialTeam={team}
                testMode={isAdmin && current.is_rehearsal}
                serverNow={serverNow}
              />
            </>
          ) : (
            <div className={s.idle}>
              <h2 className={s.h2}>{current ? "Tonight's game is closed" : "The game isn't open yet"}</h2>
              <p>
                The game opens after each show and runs until the next curtain.
                {next && (
                  <>
                    {" "}Next: <b>{next.title}</b>, opening {time(next.opens_at)}.
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        <DaedaCredit />
      </div>
    </div>
  );
}
