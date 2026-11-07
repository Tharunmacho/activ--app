import type { RootStackParamList } from '../types';
import { parseEventLink, type EventLinkTarget } from './eventLinks';

type Destination<K extends keyof RootStackParamList> = {
  [N in K]: undefined extends RootStackParamList[N]
    ? { name: N; params?: RootStackParamList[N] }
    : { name: N; params: RootStackParamList[N] }
}[K];

export type MemberAppLinkDestination = Destination<
  'PersonalDetailsForm' | 'BusinessInformationForm' | 'DeclarationForm' | 'ApplicationStatus'
  | 'PaidProfile' | 'AccountSettings' | 'MemberDocuments' | 'MembershipPlanDetails'
  | 'MemberCertificate' | 'PaymentSuccess' | 'MembershipPlans' | 'MemberEvents'
  | 'MemberEventDetail' | 'EventBooking' | 'AssociationUpdates' | 'UpdateDetail'
>;
type PublicDestination = Destination<'PublicExplore' | 'PublicInfo' | 'PublicContent' | 'Donate'>;
export type AppLinkTarget =
  | { kind: 'event'; destination: EventLinkTarget }
  | { kind: 'public'; destination: PublicDestination }
  | { kind: 'member'; destination: MemberAppLinkDestination }
  | { kind: 'entry'; action: 'login' | 'register' | 'member-home' }
  | { kind: 'website-fallback'; url: string };

const INFO_PATHS = ['/about', '/membership', '/contact', '/privacy-policy', '/terms-and-conditions', '/refund-policy', '/cancellation-policy', '/delete-account'];
const REGION_SECTIONS = ['about', 'gallery', 'leaders', 'achievements', 'keyAchievements', 'events', 'projects', 'policyAdvocacy', 'consultingServices', 'publications', 'mediaReleases', 'mediaCoverages', 'sectorUpdates', 'newsUpdates', 'speakInMedia'];
const KEY = /^[a-z0-9_-]{1,160}$/i;
const memberPages: Record<string, MemberAppLinkDestination> = {
  '/member/forms/personal': { name: 'PersonalDetailsForm', params: { userData: {} } },
  // This form loads the saved business/student/aspirant selection itself.
  '/member/forms/business': { name: 'BusinessInformationForm', params: { userData: {} } },
  '/member/forms/financial': { name: 'DeclarationForm', params: { userData: {} } },
  '/member/forms/declaration': { name: 'DeclarationForm', params: { userData: {} } },
  '/member/application-status': { name: 'ApplicationStatus' },
  '/member/profile': { name: 'PaidProfile' },
  '/member/profile-view': { name: 'PaidProfile' },
  '/member/settings': { name: 'AccountSettings' },
  '/member/documents': { name: 'MemberDocuments' },
  '/member/plan': { name: 'MembershipPlanDetails' },
  '/member/certificate/membership': { name: 'MemberCertificate', params: { kind: 'membership' } },
  '/member/certificate/tax-exemption': { name: 'MemberCertificate', params: { kind: 'tax-exemption' } },
  // This screen reads the current account's receipt; URL data never asserts payment.
  '/member/payment-success': { name: 'PaymentSuccess', params: {} },
  '/member/events': { name: 'MemberEvents' },
  '/member/updates': { name: 'AssociationUpdates' },
};

/** Older Android versions match path prefixes, which can include a newly
 * published website subpage this app does not implement yet. Offer the website
 * explicitly instead of silently losing the selected link or relaunching it.
 */
export function appLinkFallback(url?: string | null): AppLinkTarget | null {
  const raw = String(url || '').trim();
  if (!raw || raw.length > 4096 || /[\u0000-\u0020\\]/.test(raw)) return null;
  const match = /^https?:\/\/activ\.org\.in(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(raw);
  if (!match) return null;
  try { if (/[\u0000-\u001f\u007f\\]/.test(decodeURIComponent(raw))) return null; } catch { return null; }
  const pathname = match[1] || '/';
  const exact = ['/', '/onboarding', '/notifications', '/login', '/register', '/donate', '/events', '/news', '/gallery', '/schemes', '/zones', '/regions', '/states',
    '/payment/membership-plans', '/payment/member-dashboard', ...INFO_PATHS, ...Object.keys(memberPages)];
  const prefixes = ['/events/', '/news/', '/gallery/', '/schemes/', '/regions/', '/states/', '/legal/', '/member/events/', '/member/updates/'];
  if (!exact.includes(pathname) && !prefixes.some(prefix => pathname.startsWith(prefix))) return null;
  return { kind: 'website-fallback', url: 'https://activ.org.in' + pathname + (match[2] || '') + (match[3] || '') };
}

/** Explicit app-supported website routes. Unknown/token/admin/gateway URLs stay
 * outside this contract; no URL may supply an arbitrary native screen name.
 */
export function parseAppLink(url?: string | null): AppLinkTarget | null {
  const raw = String(url || '').trim();
  if (!raw || raw.length > 4096 || /[\u0000-\u0020\\]/.test(raw)) return null;
  const match = /^https?:\/\/activ\.org\.in(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i.exec(raw);
  if (!match) return null;
  const query: Record<string, string> = Object.create(null);
  let path = '';
  try {
    path = decodeURIComponent(match[1] || '/');
    if (/[\u0000-\u0020\\%]/.test(path) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) return null;
    path = path.replace(/\/$/, '') || '/';
    for (const pair of (match[2] || '').split('&')) {
      if (!pair) continue;
      const [key, ...rest] = pair.split('=');
      const name = decodeURIComponent(key.replace(/\+/g, ' '));
      const value = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
      if (Object.prototype.hasOwnProperty.call(query, name) || /[\u0000-\u001f\u007f\\]/.test(value) || value.length > 500) return null;
      query[name] = value;
    }
  } catch { return null; }

  const event = parseEventLink(raw);
  if (event) return { kind: 'event', destination: event };
  if (path === '/login' || path === '/register') return { kind: 'entry', action: path === '/login' ? 'login' : 'register' };
  if (path === '/payment/member-dashboard') return { kind: 'entry', action: 'member-home' };
  if (path === '/' || path === '/onboarding' || path === '/notifications') {
    const notifications = path === '/notifications' || query.notifications === 'open';
    return { kind: 'public', destination: { name: 'PublicExplore', params: notifications
      ? { notifications: 'open', ...(/^[a-f\d]{24}$/i.test(query.notice || '') ? { noticeId: query.notice } : {}) } : undefined } };
  }
  if (path === '/donate') return { kind: 'public', destination: { name: 'Donate' } };
  if (INFO_PATHS.includes(path) || /^\/legal\/[a-z0-9_-]{1,160}$/i.test(path)) {
    const selected = path === '/contact' && query.state ? path + '?state=' + encodeURIComponent(query.state) : path;
    return { kind: 'public', destination: { name: 'PublicInfo', params: { path: selected } } };
  }
  if (['/news', '/gallery', '/zones', '/regions', '/states', '/schemes', '/schemes/central', '/schemes/state', '/schemes/states'].includes(path)
    || /^\/news\/[a-z0-9_-]{1,160}$/i.test(path)
    || /^\/gallery\/[a-z0-9_-]{1,160}(?:\/photo\/\d{1,6})?$/i.test(path)
    || /^\/schemes\/(?:states?|view)\/[a-z0-9_-]{1,160}$/i.test(path)) {
    return { kind: 'public', destination: { name: 'PublicContent', params: { path } } };
  }
  const region = /^\/(regions|states)\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (region && KEY.test(region[2]) && (!region[3] || REGION_SECTIONS.includes(region[3]))) {
    return { kind: 'public', destination: { name: 'PublicContent', params: { path } } };
  }
  if (Object.prototype.hasOwnProperty.call(memberPages, path)) return { kind: 'member', destination: memberPages[path] };
  if (path === '/payment/membership-plans') {
    if (['renew', 'upgrade'].some(key => query[key] !== undefined && !['', 'true', 'false', '1', '0'].includes(query[key]))) return null;
    return { kind: 'member', destination: { name: 'MembershipPlans', params: {
      ...(['true', '1'].includes(query.renew) ? { renew: true } : {}),
      ...(['true', '1'].includes(query.upgrade) ? { upgrade: true } : {}),
    } } };
  }
  const memberEvent = /^\/member\/events\/([^/]+)(\/book)?$/.exec(path);
  if (memberEvent && KEY.test(memberEvent[1])) {
    if (!memberEvent[2]) return { kind: 'member', destination: { name: 'MemberEventDetail', params: { id: memberEvent[1] } } };
    const booking = parseEventLink(raw.replace('/member/events/', '/events/'));
    return booking?.name === 'EventBooking' ? { kind: 'member', destination: booking } : null;
  }
  const update = /^\/member\/updates\/([^/]+)$/.exec(path);
  if (update && KEY.test(update[1])) return { kind: 'member', destination: { name: 'UpdateDetail', params: { id: update[1] } } };
  return null;
}
