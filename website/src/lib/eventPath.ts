/**
 * An event's public address: `/events/nlc-business-opportunities-2026-09-27`.
 *
 * The readable slug when the server has given the event one, the id otherwise.
 * The server accepts either on every event endpoint, so old id links keep
 * working; this is what every NEW link is built from, so a link a person shares
 * reads as the event rather than as 24 hex characters.
 */
export const eventPath = (event?: { id?: string; slug?: string } | null): string =>
    `/events/${encodeURIComponent(eventKey(event))}`;

/** What goes in an event URL: the readable slug, the id when there is none. */
export const eventKey = (event?: { id?: string; slug?: string } | null): string =>
    String(event?.slug || event?.id || '');

/**
 * The same event inside the member area: `/member/events/<slug>[/book]`.
 * Member links were built from the id and read as 24 hex characters while the
 * public site's read as the event; both now use the slug.
 */
export const memberEventPath = (event?: { id?: string; slug?: string } | null, suffix = ''): string =>
    `/member/events/${encodeURIComponent(eventKey(event))}${suffix}`;

/**
 * A gallery item's public address: `/gallery/activ-inked-mou-with-gem`.
 * The slug when the server has given it one, the id otherwise; the server
 * accepts either, so old links keep working.
 */
export const galleryPath = (item?: { _id?: string; id?: string; slug?: string } | null): string =>
    `/gallery/${encodeURIComponent(item?.slug || item?._id || item?.id || '')}`;
