"use client";

import { useState } from "react";
import type { Member } from "./Crossword";
import s from "./play.module.css";

export type OpenTeam = { id: string; name: string; size: number; started: boolean };

/** Step 2 of joining: "Are you with a group?" */
export function TeamChooser({
  teams,
  busy,
  onCreate,
  onJoin,
  onSolo,
  compact,
}: {
  teams: OpenTeam[];
  busy?: boolean;
  onCreate: () => void;
  onJoin: (teamId: string) => void;
  onSolo?: () => void;
  /** Inside the waiting room: a quieter "here with friends?" block. */
  compact?: boolean;
}) {
  // In the waiting room, show waiting teams straight away.
  const [picking, setPicking] = useState(!!compact && teams.length > 0);
  return (
    <div className={compact ? s.chooserCompact : s.chooser}>
      <h3 className={s.chooserQ}>{compact ? "Here with friends?" : "Are you here with a group?"}</h3>
      <p className={s.sub}>
        {compact
          ? "Make your own team and they join it by name, or jump to the one they made."
          : "Teams of up to 4 share one crossword. Friends can join your team by name."}
      </p>
      {compact && teams.length > 0 && <p className={s.sub}><b>Waiting now:</b> tap a team to join it.</p>}
      <div className={s.chooserBtns}>
        <button className={compact ? s.btnGhost : s.btn} disabled={busy} onClick={onCreate}>Create our own team</button>
        <button className={s.btnGhost} disabled={busy || !teams.length} onClick={() => setPicking((v) => !v)}>
          Join a friend&rsquo;s team{teams.length ? ` (${teams.length})` : ""}
        </button>
        {onSolo && (
          <button className={s.btnText} disabled={busy} onClick={onSolo}>
            No, just put me on a team
          </button>
        )}
      </div>
      {picking && (
        <ul className={s.teamList}>
          {teams.map((t) => (
            <li key={t.id}>
              <button className={s.teamPick} disabled={busy} onClick={() => onJoin(t.id)}>
                <span>{t.name}</span>
                <small>{t.size}/4{t.started ? " · playing" : ""}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Waiting room: rename, see who's here, start. */
export function WaitingRoom({
  team,
  members,
  meId,
  canRename,
  busy,
  onRename,
  onStart,
}: {
  team: { name: string; is_open: boolean };
  members: Member[];
  meId: string;
  canRename: boolean;
  busy?: boolean;
  onRename: (name: string) => void;
  onStart: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  return (
    <div className={s.waiting}>
      <p className={s.kicker}>Your team</p>
      {editing ? (
        <form
          suppressHydrationWarning
          className={s.renameRow}
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            if (draft.trim() && draft.trim() !== team.name) onRename(draft.trim());
          }}
        >
          <input suppressHydrationWarning className={s.input} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={20} autoFocus />
          <button className={s.btn}>Save</button>
        </form>
      ) : (
        <h3 className={s.teamName}>
          {team.name}
          {canRename && (
            <button className={s.rename} onClick={() => setEditing(true)} aria-label="Rename team">rename</button>
          )}
        </h3>
      )}

      <ul className={s.seats}>
        {Array.from({ length: 4 }, (_, i) => {
          const m = members[i];
          return (
            <li key={i} className={m ? s.seat : s.seatEmpty} style={m ? { ["--who" as string]: m.color } : undefined}>
              {m ? <><i />{m.name}{m.id === meId ? " (you)" : ""}</> : "waiting…"}
            </li>
          );
        })}
      </ul>

      {team.is_open && (
        <p className={s.tell}>
          You&rsquo;re on an open team. The game starts as soon as one more person is seated, and people can keep joining up to four.
        </p>
      )}
      {!team.is_open && (
        <p className={s.tell}>
          <b>Tell your friends:</b> scan the code, enter a name, and pick <b>{team.name}</b> if they don&rsquo;t land here automatically.
        </p>
      )}

      <div className={s.rules}>
        <p>Take turns filling the Gatsby crossword from your tile racks. Every tile scores its letter value; finishing a word is +5, and the whole team gets +20 when the grid is solved.</p>
        <p>Bonus words below the grid pay +10 to whoever drops the last letter. Swap or pass on your turn. Fastest team to finish wins the night.</p>
      </div>

      <button className={s.btn} disabled={busy} onClick={onStart}>
        {members.length < 2 ? "Start anyway" : "Start the game"}
      </button>
      <p className={s.sub}>
        {team.is_open ? "Or start now and let others join as they arrive." : "Starts on its own when the 4th person joins. Friends can still join after you start."}
      </p>
    </div>
  );
}
