/**
 * ============================================================================
 * THE PUBLIC WEBSITE — where "Explore ACTIV" opens pages
 * ============================================================================
 *
 * Always the LIVE website, in dev builds too. This is deliberately not
 * API_ORIGIN: in development that points at a localhost API server, which
 * serves JSON, not the website's pages.
 *
 * Paths are the website's own routes (website/src/App.tsx). Build every link
 * through `websiteUrl()` so a slug is encoded once and a stray absolute URL is
 * never re-prefixed.
 */

export const WEBSITE_ORIGIN = 'https://activ.org.in';

/** The host, for "is this link one of ours?" checks in the in-app viewer. */
export const WEBSITE_HOST = 'activ.org.in';

export const WEBSITE_PATHS = {
  home: '/',
  about: '/about',
  membership: '/membership',
  events: '/events',
  event: (slugOrId: string) => `/events/${encodeURIComponent(String(slugOrId || ''))}`,
  news: '/news',
  article: (slug: string) => `/news/${encodeURIComponent(String(slug || ''))}`,
  schemes: '/schemes',
  gallery: '/gallery',
  galleryItem: (slugOrId: string) => `/gallery/${encodeURIComponent(String(slugOrId || ''))}`,
  region: (slug: string) => `/regions/${encodeURIComponent(String(slug || ''))}`,
  state: (slug: string) => `/states/${encodeURIComponent(String(slug || ''))}`,
  contact: '/contact',
  donate: '/donate',
  privacy: '/privacy-policy',
  terms: '/terms-and-conditions',
  refund: '/refund-policy',
  cancellation: '/cancellation-policy',
};

/** A website path (or an absolute URL, left alone) → a full https URL. */
export const websiteUrl = (pathOrUrl?: string | null): string => {
  const raw = String(pathOrUrl || '').trim();
  if (!raw) return `${WEBSITE_ORIGIN}/`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${WEBSITE_ORIGIN}/${raw.replace(/^\/+/, '')}`;
};

/** True for a URL on the association's own website (any subdomain). */
export const isWebsiteUrl = (url?: string | null): boolean => {
  const raw = String(url || '').trim().toLowerCase();
  const m = /^https?:\/\/([^/?#:]+)/.exec(raw);
  if (!m) return false;
  const host = m[1] || '';
  return host === WEBSITE_HOST || host.endsWith(`.${WEBSITE_HOST}`);
};
