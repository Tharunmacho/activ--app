import type { RootStackParamList } from '../types';

export type EventLinkTarget =
  | { name: 'PublicExplore'; params: { section: 'events' } }
  | { name: 'PublicEventDetail'; params: RootStackParamList['PublicEventDetail'] }
  | { name: 'EventBooking'; params: RootStackParamList['EventBooking'] };

/** Only the canonical, verified event URLs are native navigation commands.
 * IDs/slugs and booking references retain their case; the API resolves slugs.
 * A reference opens an existing ticket and never creates a booking by itself.
 */
export function parseEventLink(url?: string | null): EventLinkTarget | null {
  const raw = String(url || '').trim();
  if (!raw || /[\u0000-\u0020\\]/.test(raw)) return null;
  const match = /^https?:\/\/activ\.org\.in(\/[^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(raw);
  if (!match) return null;
  const path = match[1];
  if (/^\/events\/?$/i.test(path)) return { name: 'PublicExplore', params: { section: 'events' } };
  const event = /^\/events\/([^/]+)(\/book)?\/?$/i.exec(path);
  if (!event) return null;
  let id = '';
  let ref: string | undefined;
  try {
    id = decodeURIComponent(event[1]);
    if (!/^[a-z0-9_-]{1,160}$/i.test(id)) return null;
    for (const pair of (match[2] || '').split('&')) {
      if (!pair) continue;
      const [key, ...rest] = pair.split('=');
      const name = decodeURIComponent(key.replace(/\+/g, ' '));
      // Attendee-management capabilities belong to the website's edit flow.
      // Do not silently turn an editing link into a read-only ticket.
      if (['managetoken', 'token', 'manage', 'edit'].includes(name.toLowerCase().replace(/_/g, ''))) return null;
      if (name !== 'ref') continue;
      if (ref !== undefined) return null;
      ref = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
      if (!/^[a-z0-9_-]{1,160}$/i.test(ref)) return null;
    }
  } catch { return null; }
  if (event[2]) return { name: 'EventBooking', params: { eventId: id, ...(ref ? { ref } : {}) } };
  // A reference belongs to the /book page. Never silently discard a ticket.
  if (ref !== undefined) return null;
  return { name: 'PublicEventDetail', params: { id } };
}

/** Members keep their eligibility/pricing on event pages; guests stay public. */
export function eventLinkDestination(target: EventLinkTarget, member: boolean):
  EventLinkTarget | { name: 'MemberEvents' } | { name: 'MemberEventDetail'; params: RootStackParamList['MemberEventDetail'] } {
  if (member && target.name === 'PublicExplore') return { name: 'MemberEvents' };
  if (member && target.name === 'PublicEventDetail') return { name: 'MemberEventDetail', params: target.params };
  return target;
}
