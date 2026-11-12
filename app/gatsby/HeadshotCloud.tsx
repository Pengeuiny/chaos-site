"use client";

import { useRef, useState } from "react";
import s from "./gatsby.module.css";

export type CloudPerson = { name: string; roles: string[]; lead: boolean };

const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");

/** Photo if /gatsby/headshots/<slug>.webp exists, else a gold monogram (drop a file in to upgrade). */
function Face({ name, big }: { name: string; big?: boolean }) {
  const [ok, setOk] = useState(true);
  return (
    <span className={`${s.face} ${big ? s.faceBig : ""}`}>
      <span className={s.mono}>{initials(name)}</span>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/gatsby/headshots/${slug(name)}.webp`} alt="" loading="lazy" onError={() => setOk(false)} />
      )}
    </span>
  );
}

/**
 * Champagne-bubble cloud: every company member floats on their own slow
 * orbit and rises in on load. Tap one for name and roles (native <dialog>).
 */
export default function HeadshotCloud({ people }: { people: CloudPerson[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [pick, setPick] = useState<CloudPerson | null>(null);

  return (
    <>
      <ul className={s.cloud}>
        {people.map((p, i) => (
          <li
            key={p.name}
            className={`${s.bubble} ${p.lead ? s.bubbleLead : ""}`}
            style={
              {
                "--dur": `${6 + ((i * 7) % 5)}s`,
                "--delay": `${(i % 9) * 0.12}s`,
                "--dx": `${((i * 13) % 9) - 4}px`,
                "--dy": `${((i * 11) % 7) + 4}px`,
              } as React.CSSProperties
            }
          >
            <button
              type="button"
              className={s.bubbleBtn}
              aria-label={`${p.name}, ${p.roles.join(", ")}`}
              onClick={() => {
                setPick(p);
                dlg.current?.showModal();
              }}
            >
              <Face name={p.name} />
              <span className={s.bubbleName}>{p.name.split(" ")[0]}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dlg}
        className={s.dialog}
        onClick={(e) => e.target === dlg.current && dlg.current?.close()}
      >
        {pick && (
          <div className={s.card}>
            <Face name={pick.name} big />
            <h3 className={s.cardName}>{pick.name}</h3>
            <p className={s.cardRoles}>{pick.roles.join(" · ")}</p>
            <button className={s.close} onClick={() => dlg.current?.close()}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
