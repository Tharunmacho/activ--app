import { money } from '../../../ui';

/** Shared event formatting for the member event screens (website eventFormat.ts). */

export const isPastEvent = (e: any) => {
  const end = e?.endAt || e?.startAt;
  return !!end && new Date(end).getTime() < Date.now();
};

export const eventTime = (e: any) => (e?.startAt ? new Date(e.startAt).getTime() : 0);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const dateParts = (iso?: string | null) => {
  if (!iso) return { day: '--', month: 'TBC', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: '--', month: 'TBC', time: '' };
  const h = d.getHours();
  return {
    day: String(d.getDate()),
    month: MONTHS[d.getMonth()],
    time: `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`,
  };
};

/** What THIS member pays — `yourPrice` (server-resolved), else the common fee. */
export const feeFor = (e: any) => Number(e?.yourPrice ?? e?.registrationFee ?? 0);

export const priceLabel = (e: any) => {
  const fee = feeFor(e);
  return fee > 0 ? money(fee) : 'Free';
};

/** Where an event happens — the website's eventWhere: online, venue, region, or TBA. */
export const whereOf = (e: any) => {
  if (String(e?.mode || '') === 'online') return `Online${e?.onlinePlatform ? ` · ${e.onlinePlatform}` : ''}`;
  if (e?.venue || e?.location) return String(e.venue || e.location);
  const region = [e?.district, e?.state].filter(Boolean).join(', ');
  return region || 'Venue to be announced';
};

/** The member's live seat (legacy registration or a booking), or null. */
export const myActiveRegistration = (e: any) =>
  e?.myRegistration && e.myRegistration.status !== 'cancelled' ? e.myRegistration : null;

/* ------------------------------------------------------------------ website eventFormat / eventCalendar */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "14 September 2026" (website formatDate, en-GB long). */
export const longDate = (v?: string | null) => {
  const d = parseDate(v);
  return d ? `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** "9:30 AM". */
export const clockTime = (v?: string | null) => {
  const d = parseDate(v);
  if (!d) return '';
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** Website formatWhen: "14 September 2026, 9:30 AM – 5:00 PM", multi-day prints both dates. */
export const formatWhen = (e: any): string => {
  const start = parseDate(e?.startAt);
  if (!start) return 'Date to be confirmed';
  const end = parseDate(e?.endAt);
  const startDate = longDate(e.startAt);
  if (!end) return `${startDate}, ${clockTime(e.startAt)}`;
  if (start.toDateString() !== end.toDateString()) return `${startDate} – ${longDate(e.endAt)}`;
  return `${startDate}, ${clockTime(e.startAt)} – ${clockTime(e.endAt)}`;
};

/** Website eventPhase: an undated event is upcoming; no end → 12h assumed. */
export const eventPhase = (e: any, now = Date.now()): 'upcoming' | 'live' | 'past' => {
  const start = parseDate(e?.startAt);
  if (!start) return 'upcoming';
  if (now < start.getTime()) return 'upcoming';
  const declared = parseDate(e?.endAt);
  const end = declared && declared.getTime() > start.getTime() ? declared.getTime() : start.getTime() + 12 * 3600000;
  return now <= end ? 'live' : 'past';
};

/** Website countdownLabel. */
export const countdownLabel = (iso?: string | null, now = Date.now()): string | null => {
  const start = parseDate(iso);
  if (!start) return null;
  const ms = start.getTime() - now;
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `Starts in ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Starts in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Tomorrow';
  if (days < 30) return `In ${days} days`;
  const months = Math.round(days / 30);
  return `In ${months} month${months === 1 ? '' : 's'}`;
};

/** Website formatReminders: "Reminder 24 hours before". */
export const formatReminders = (hours: any): string => {
  const parts = (Array.isArray(hours) ? hours : [])
    .map(Number)
    .filter((h) => Number.isFinite(h) && h > 0)
    .map((h) => (h % 24 === 0 ? `${h / 24} ${h / 24 === 1 ? 'day' : 'days'}` : `${h} ${h === 1 ? 'hour' : 'hours'}`));
  if (!parts.length) return '';
  if (parts.length === 1) return `Reminder ${parts[0]} before`;
  return `Reminders ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} before`;
};

/** Website eventPlace. */
export const eventPlace = (e: any) => [e?.venue || e?.location, e?.venueAddress].filter(Boolean).join(', ');

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Google Calendar template link (website googleCalendarUrl); '' for an undated or finished event. */
export const googleCalendarUrl = (e: any, pageUrl = ''): string => {
  const start = parseDate(e?.startAt);
  if (!start || eventPhase(e) === 'past') return '';
  const declared = parseDate(e?.endAt);
  const end = declared && declared.getTime() > start.getTime() ? declared : new Date(start.getTime() + 2 * 3600000);
  const q = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(e?.title || 'ACTIV event')}`,
    `dates=${stamp(start)}/${stamp(end)}`,
    `details=${encodeURIComponent([e?.description || '', pageUrl].filter(Boolean).join('\n\n'))}`,
    `location=${encodeURIComponent(eventPlace(e))}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${q}`;
};

/** Website directionsUrl: coordinates from the map link when present, else the place. */
export const directionsUrl = (e: any): string => {
  if (String(e?.mode || '') === 'online') return '';
  const raw = String(e?.venueMapUrl || '');
  let destination = '';
  for (const re of [/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|query|destination|daddr)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/]) {
    const m = re.exec(raw);
    if (m && Math.abs(Number(m[1])) <= 90 && Math.abs(Number(m[2])) <= 180) { destination = `${Number(m[1])},${Number(m[2])}`; break; }
  }
  destination = destination || eventPlace(e);
  if (!destination) return raw;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

/** Website shareLine: "Title · Sat 14 Sep, 09:30 · Venue". */
export const shareLine = (e: any): string => {
  const d = parseDate(e?.startAt);
  const when = d ? `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${clockTime(e.startAt)}` : '';
  return [e?.title || 'ACTIV event', when, eventPlace(e)].filter(Boolean).join(' · ');
};

/** The member's seat state, as the website EventRow labels it. */
export const seatState = (e: any) => {
  const reg = myActiveRegistration(e);
  const awaitingPayment = reg?.payment?.status === 'pending';
  const waitlisted = reg?.status === 'waitlist';
  const label = !reg ? '' : awaitingPayment ? 'Payment due' : waitlisted ? 'Waiting list' : 'Registered';
  const action = !reg ? (isPastEvent(e) ? 'View event' : 'View details')
    : awaitingPayment ? 'Complete payment' : reg?.source === 'booking' ? 'View ticket' : 'View seat';
  return { reg, awaitingPayment, waitlisted, label, action };
};

/**
 * Website registrationHref: a BOOKING opens its ticket (EventBooking with the
 * ref), anything else the event page.
 */
export const openEventOrTicket = (navigation: any, e: any) => {
  const id = String(e?.id || e?._id || '');
  const reg = myActiveRegistration(e);
  if (reg?.source === 'booking' && reg?.bookingRef) {
    navigation.navigate('EventBooking', { eventId: id, ref: String(reg.bookingRef) });
  } else {
    navigation.navigate('MemberEventDetail', { id });
  }
};
