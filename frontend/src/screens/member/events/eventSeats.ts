import { useEffect, useRef, useState } from 'react';
import { getBookableEvent } from '../../../services/memberApi';

/**
 * SEATS COME FROM THE BOOKING SYSTEM — never from `event.registeredCount`.
 *
 * `GET /events` and `GET /events/:id` carry `registeredCount`, which counts
 * only the legacy one-seat registrations. Every booking taken through
 * `/event-bookings` is invisible to it, so an event with two real bookings
 * printed "500 of 500 seats left". The booking system counts BOTH collections
 * (`eventbooking.service.seatsFor`) and answers on
 * `GET /event-bookings/event/:id` with `{ capacity, seatsTaken, seatsLeft }` —
 * the same call the website's EventDetailPage reads as `availability`.
 *
 *   capacity 0 / null      uncapped — no meter, no "full"
 *   seatsLeft              MAX_SAFE_INTEGER when uncapped; never print it raw
 *
 * Unknown (not fetched yet, or the call failed) is `null`, and the screens
 * HIDE the seats line for it. A wrong number is worse than no number.
 */

export type SeatInfo = {
  /** `> 0` — only capped events produce a SeatInfo. */
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
  /** The server's answer about the booking deadline. */
  closed: boolean;
};

const TTL_MS = 30_000;
const CONCURRENCY = 3;

type Entry = { at: number; info: SeatInfo | null };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<SeatInfo | null>>();

/** The booking payload → SeatInfo, or null when uncapped / unreadable. */
export const toSeatInfo = (raw: any): SeatInfo | null => {
  const capacity = Math.max(0, Math.round(Number(raw?.capacity || 0)));
  if (!raw || !Number.isFinite(capacity) || capacity <= 0) return null;
  const taken = Number(raw?.seatsTaken);
  const leftRaw = Number(raw?.seatsLeft);
  const seatsLeft = Number.isFinite(leftRaw)
    ? Math.min(capacity, Math.max(0, leftRaw))
    : Number.isFinite(taken) ? Math.max(0, capacity - taken) : NaN;
  if (!Number.isFinite(seatsLeft)) return null;
  return {
    capacity,
    seatsTaken: Number.isFinite(taken) ? Math.max(0, taken) : Math.max(0, capacity - seatsLeft),
    seatsLeft,
    closed: !!raw?.closed,
  };
};

/** Seats for one event. Cached briefly; concurrent asks share one request. Never throws. */
export const fetchEventSeats = (eventId: string, force = false): Promise<SeatInfo | null> => {
  const id = String(eventId || '');
  if (!id) return Promise.resolve(null);
  const hit = cache.get(id);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.info);
  const pending = inflight.get(id);
  if (pending) return pending;
  const p = (async () => {
    try {
      const info = toSeatInfo(await getBookableEvent(id));
      cache.set(id, { at: Date.now(), info });
      return info;
    } catch (err) {
      // Not cached: a failure should be retried on the next read, not remembered.
      return null;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, p);
  return p;
};

/** Forget one event's seats (after a booking or cancellation). */
export const invalidateEventSeats = (eventId?: string) => {
  if (eventId) cache.delete(String(eventId)); else cache.clear();
};

/** Worth asking the booking system about: capped, and taking registrations. */
export const wantsSeats = (e: any): boolean =>
  !!e && Number(e?.capacity || 0) > 0 && e?.registrationEnabled !== false;

/** Seats left from a SeatInfo — null means "do not print a seat line". */
export const seatsLeftOf = (info: SeatInfo | null | undefined): number | null =>
  info && info.capacity > 0 ? Math.max(0, Number(info.seatsLeft || 0)) : null;

/**
 * Website EventDetailPage `fillingFast`: under a quarter left (at least one),
 * and not sold out.
 */
export const isFillingFast = (info: SeatInfo | null | undefined): boolean => {
  const left = seatsLeftOf(info);
  const cap = Number(info?.capacity || 0);
  return left !== null && left > 0 && cap > 0 && left <= Math.max(1, cap * 0.25);
};

const eventKey = (e: any) => String(e?.id || e?._id || '');

/**
 * Seats for a list of events: fetched in parallel, at most CONCURRENCY at a
 * time, only for events that `pick` accepts. The first run reads the cache;
 * every later run (the list reloaded — back from a booking, pull-to-refresh)
 * re-asks the server so a seat just taken shows up.
 */
export function useEventSeats(
  events: any[],
  /** Changes once per load (pass the loaded payload itself) — the re-fetch trigger. */
  stamp: unknown,
  pick: (e: any) => boolean = wantsSeats,
): Record<string, SeatInfo | null> {
  const [seats, setSeats] = useState<Record<string, SeatInfo | null>>({});
  const runs = useRef(0);
  const ids = (events || []).filter((e) => { try { return pick(e); } catch { return false; } }).map(eventKey).filter(Boolean);
  const signature = Array.from(new Set(ids)).join('|');

  useEffect(() => {
    let alive = true;
    const force = runs.current > 0;
    runs.current += 1;
    const queue = signature ? signature.split('|') : [];
    if (!queue.length) return () => { alive = false; };

    const worker = async () => {
      while (alive && queue.length) {
        const id = queue.shift() || '';
        if (!id) continue;
        const info = await fetchEventSeats(id, force);
        if (alive) setSeats((prev) => (prev[id] === info ? prev : { ...prev, [id]: info }));
      }
    };
    Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)).catch(() => undefined);
    return () => { alive = false; };
    // `stamp` is stable between renders and changes once per load; `events`
    // itself is left out because a `[]` fallback is a new array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, stamp]);

  return seats;
}

/** Seats for one event (detail screen). `undefined` while loading, null when unknown/uncapped. */
export function useEventSeat(event: any): SeatInfo | null | undefined {
  const [info, setInfo] = useState<SeatInfo | null | undefined>(undefined);
  const id = eventKey(event);
  const want = wantsSeats(event) || Number(event?.capacity || 0) > 0;

  useEffect(() => {
    let alive = true;
    if (!id || !want) { setInfo(null); return () => { alive = false; }; }
    // Every fresh event payload (first load, pull-to-refresh, back from booking) re-asks.
    fetchEventSeats(id, true).then((v) => { if (alive) setInfo(v); }).catch(() => { if (alive) setInfo(null); });
    return () => { alive = false; };
  }, [event, id, want]);

  return info;
}
