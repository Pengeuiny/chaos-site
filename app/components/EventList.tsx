"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MON, parts, fmtTime, dateKey } from "@/lib/format";
import type { CalEvent } from "@/app/components/Calendar";

/** Format an already-known "YYYY-MM-DD" key without re-deriving via timezone conversion. */
function fmtDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${MON[m - 1]} ${d}, ${y}`;
}

function EventRow({ event, onBuyBlocked }: { event: CalEvent; onBuyBlocked: (title: string) => void }) {
  const router = useRouter();
  const p = parts(event.starts_at);

  return (
    <div
      className="event-row"
      onClick={() => router.push(`/shows/${event.slug}`)}
    >
      <div className="event-row-date">
        <span className="mon">{MON[p.month]}</span>
        <span className="num">{p.day}</span>
      </div>
      <div className="event-row-body">
        <div className="event-row-title">{event.title}</div>
        <div className="event-row-meta">
          {p.weekday} · {fmtTime(event.starts_at)}
          {event.label ? ` · ${event.label}` : ""}
        </div>
      </div>
      {event.ticket_url ? (
        <a
          className="event-row-buy"
          href={event.ticket_url}
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
        >
          Buy Tickets
        </a>
      ) : (
        <button
          type="button"
          className="event-row-buy disabled"
          onClick={(e) => {
            e.stopPropagation();
            onBuyBlocked(event.title);
          }}
        >
          Buy Tickets
        </button>
      )}
    </div>
  );
}

export default function EventList({
  events,
  selectedDate,
  onClearFilter,
  maxHeight,
}: {
  events: CalEvent[];
  selectedDate: string | null;
  onClearFilter: () => void;
  maxHeight?: number | null;
}) {
  const [blockedTitle, setBlockedTitle] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!selectedDate) {
      const now = new Date().toISOString();
      return events.filter((e) => e.starts_at >= now);
    }

    const dayEvents = events.filter((e) => dateKey(e.starts_at) === selectedDate);
    if (dayEvents.length === 0) return [];

    const shows = new Set(dayEvents.map((e) => e.slug));
    const laterForSameShows = events.filter(
      (e) => dateKey(e.starts_at) > selectedDate && shows.has(e.slug),
    );
    return [...dayEvents, ...laterForSameShows];
  }, [events, selectedDate]);

  return (
    <div className="event-list-col" style={maxHeight ? { height: maxHeight } : undefined}>
      {selectedDate && (
        <div className="event-list-filter">
          <span>Showing {fmtDateKey(selectedDate)}</span>
          <button type="button" onClick={onClearFilter}>
            Show all events ✕
          </button>
        </div>
      )}
      <div className="event-list">
        {visible.length === 0 ? (
          <p className="event-list-empty">No events on this date.</p>
        ) : (
          visible.map((e) => (
            <EventRow key={e.id} event={e} onBuyBlocked={setBlockedTitle} />
          ))
        )}
      </div>

      {blockedTitle && (
        <div className="ticket-modal-overlay" onClick={() => setBlockedTitle(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Not on sale yet</h4>
            <p>
              Tickets for <strong>{blockedTitle}</strong> aren&rsquo;t on sale
              yet — check back soon, or contact the board for updates.
            </p>
            <button type="button" className="btn btn-gold" onClick={() => setBlockedTitle(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
