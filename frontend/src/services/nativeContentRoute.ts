import { publicWebsitePath } from '../utils/publicBrowse';

export type NativeContentDestination = { name: string; params?: Record<string, any> };
/** Every published ACTIV page opens a native screen. Unknown local links stay in
 * the app and show an unavailable state rather than escaping into a browser. */
export function nativeContentRoute(value: string, title = 'ACTIV'): NativeContentDestination | null {
  const path = publicWebsitePath(value);
  if (!path) return null;
  const suffix = String(value).match(/[?#].*$/)?.[0] || '';
  const contentPath = path + suffix;
  if (path === '/' || path === '/onboarding') return { name: 'PublicExplore' };
  if (path === '/events') return { name: 'PublicExplore', params: { section: 'events' } };
  const event = /^\/events\/([^/]+)$/.exec(path);
  if (event) return { name: 'PublicEventDetail', params: { id: event[1] } };
  if (/^\/(?:about|membership|contact|privacy-policy|terms-and-conditions|refund-policy|cancellation-policy|delete-account)$/.test(path) || /^\/legal\/[^/]+$/.test(path)
    || /^\/[^/]+$/.test(path) && !['/gallery', '/news', '/schemes', '/zones', '/regions', '/states'].includes(path)) {
    return { name: 'PublicInfo', params: { path: contentPath, title } };
  }
  return { name: 'PublicContent', params: { path: contentPath, title } };
}
