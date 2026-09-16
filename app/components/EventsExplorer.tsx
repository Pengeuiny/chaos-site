"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Calendar, { type CalEvent } from "@/app/components/Calendar";
import EventList from "@/app/components/EventList";
import type { Program } from "@/lib/types";

type ProgramFilter = "all" | Program;

const PROGRAM_FILTERS: { value: ProgramFilter; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "theatre", label: "Theatre" },
  { value: "choir", label: "Chorus" },
];

/**
 * Composes the calendar + the scrollable event list side by side, the list
 * matching the calendar's own rendered height exactly (which varies month to
 * month — 5 vs 6 week rows — so it's measured live rather than hardcoded).
 * A Theatre / Chorus chip row above them narrows both the calendar's dots
 * and the list to one program. `belowCalendar` renders centered underneath
 * the whole calendar+list row (e.g. the Event Tickets panel).
 */
export default function EventsExplorer({
  events,
  belowCalendar,
}: {
  events: CalEvent[];
  belowCalendar?: ReactNode;
}) {
  const [program, setProgram] = useState<ProgramFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filtered = useMemo(
    () => (program === "all" ? events : events.filter((e) => e.program === program)),
    [events, program],
  );

  // Switching programs drops any day selection so the list never sits on a
  // date that only had events in the other program.
  const selectProgram = (value: ProgramFilter) => {
    setProgram(value);
    setSelectedDate(null);
  };
  const calRef = useRef<HTMLDivElement>(null);
  const [calHeight, setCalHeight] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 681px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = calRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setCalHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div className="cal-filter" role="group" aria-label="Filter events by program">
        {PROGRAM_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`chip-filter${program === f.value ? " active" : ""}`}
            aria-pressed={program === f.value}
            onClick={() => selectProgram(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="split cal-split">
        <div className="cal-col">
          <div ref={calRef}>
            <Calendar events={filtered} selectedDate={selectedDate} onSelectDay={setSelectedDate} />
          </div>
        </div>
        <EventList
          events={filtered}
          selectedDate={selectedDate}
          onClearFilter={() => setSelectedDate(null)}
          maxHeight={isDesktop ? calHeight : null}
        />
      </div>
      {belowCalendar && <div className="below-calendar">{belowCalendar}</div>}
    </>
  );
}
