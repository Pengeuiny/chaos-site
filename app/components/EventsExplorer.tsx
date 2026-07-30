"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Calendar, { type CalEvent } from "@/app/components/Calendar";
import EventList from "@/app/components/EventList";

/**
 * Composes the calendar + the scrollable event list side by side, the list
 * matching the calendar's own rendered height exactly (which varies month to
 * month — 5 vs 6 week rows — so it's measured live rather than hardcoded).
 * `belowCalendar` renders in the same column, underneath the calendar,
 * outside the height-matched pair (e.g. the Event Tickets panel).
 */
export default function EventsExplorer({
  events,
  belowCalendar,
}: {
  events: CalEvent[];
  belowCalendar?: ReactNode;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
    <div className="split cal-split">
      <div className="cal-col">
        <div ref={calRef}>
          <Calendar events={events} selectedDate={selectedDate} onSelectDay={setSelectedDate} />
        </div>
        {belowCalendar}
      </div>
      <EventList
        events={events}
        selectedDate={selectedDate}
        onClearFilter={() => setSelectedDate(null)}
        maxHeight={isDesktop ? calHeight : null}
      />
    </div>
  );
}
