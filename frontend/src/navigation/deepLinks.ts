import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { RootStackParamList } from '../types';
import { resolvePaymentLink, type PaymentLinkTarget } from './paymentLinks';
import { eventLinkDestination } from './eventLinks';
import { parseAppLink, appLinkFallback, type AppLinkTarget, type MemberAppLinkDestination } from './appLinks';
import { getAuthToken, getUserRole } from '../services/api';
import { homeForRole } from '../services/session';
import { clearPublicAction, rememberMemberDestination } from '../services/publicNavigation';

/**
 * ============================================================================
 * DEEP LINKS — the app's `activ://` scheme
 * ============================================================================
 *
 *   activ://auth/social?code=…&provider=…      social sign-in hand-off (the
 *   activ://auth/social?error=…[&email&name]   server's /auth/oauth/:p/callback
 *                                               when started with ?client=app)
 *   activ://reset-password?token=…              member password reset
 *   activ://admin/reset-password?token=…        admin password reset
 *
 * Verified activ.org.in links open only the supported routes in appLinks.ts.
 * Gateway callbacks, reset tokens and admin pages keep their existing handling.
 *
 * Links that arrive before the navigator is ready are held and delivered from
 * `flushPendingDeepLink()`, which App.tsx calls in NavigationContainer.onReady.
 */

type Target =
  | PaymentLinkTarget
  | { name: 'SocialSignIn'; params: RootStackParamList['SocialSignIn'] }
  | { name: 'ResetPassword'; params: RootStackParamList['ResetPassword'] };

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent((value || '').replace(/\+/g, ' '));
  } catch {
    return value || '';
  }
};

/** `a=1&b=2` (query and fragment both) → a plain object. */
const readParams = (url: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const text = String(url || '');
  const q = text.indexOf('?');
  const h = text.indexOf('#');
  const parts: string[] = [];
  if (q >= 0) parts.push(text.slice(q + 1, h > q ? h : undefined));
  if (h >= 0) parts.push(text.slice(h + 1));
  parts.join('&').split('&').forEach((pair) => {
    if (!pair) return;
    const eq = pair.indexOf('=');
    const key = safeDecode(eq >= 0 ? pair.slice(0, eq) : pair);
    const value = safeDecode(eq >= 0 ? pair.slice(eq + 1) : '');
    if (key) out[key] = value;
  });
  return out;
};

/** The path of an activ:// or https:// URL, without query/fragment, no slashes at the ends. */
const readPath = (url: string): string => {
  const text = String(url || '');
  const noQuery = text.split(/[?#]/)[0] || '';
  const afterScheme = noQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const withoutHost = /^https?:\/\//i.test(noQuery) ? afterScheme.replace(/^[^/]*/, '') : afterScheme;
  return withoutHost.replace(/^\/+|\/+$/g, '').toLowerCase();
};

export const parseDeepLink = (url?: string | null): Target | null => {
  const text = String(url || '').trim();
  if (!text) return null;
  const path = readPath(text);
  const params = readParams(text);

  if (path === 'auth/social') {
    return {
      name: 'SocialSignIn',
      params: {
        code: params.code || '',
        error: params.error || '',
        provider: params.provider || '',
        email: params.email || '',
        name: params.name || '',
      },
    };
  }
  if (path === 'reset-password' || path === 'admin/reset-password') {
    return {
      name: 'ResetPassword',
      params: { token: params.token || '', portal: path.startsWith('admin') ? 'admin' : 'member' },
    };
  }
  return null;
};

let pending: Target | null = null;

const deliver = (target: Target | null) => {
  if (!target) return;
  try {
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate(target.name, target.params);
      pending = null;
    } else {
      pending = target;
    }
  } catch (err) {
    console.warn('Deep link safely caught:', err);
  }
};

/** Deliver a link that arrived before the navigator was ready. */
export const flushPendingDeepLink = () => {
  if (pending) deliver(pending);
};

let linkGeneration = 0;
let pendingApp: AppLinkTarget | null = null;

/** Session restoration chooses the landing screen before an event link opens.
 * Re-check the queued link after async storage reads so a newer tap wins.
 */
export const flushPendingAppLink = async () => {
  if (!pendingApp || !navigationRef.isReady() || navigationRef.getCurrentRoute()?.name === 'Onboarding') return;
  const target = pendingApp;
  const generation = linkGeneration;
  const current = () => pendingApp === target && generation === linkGeneration && navigationRef.isReady()
    && navigationRef.getCurrentRoute()?.name !== 'Onboarding';
  try {
    const [token, role] = await Promise.all([getAuthToken(), getUserRole()]);
    if (!current()) return;
    if (target.kind === 'website-fallback') {
      clearPublicAction(); pendingApp = null;
      Alert.alert('Open this page on the website', 'This link is not supported by this app version. You can continue on the ACTIV website.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open website', onPress: () => {
          if (generation !== linkGeneration || !navigationRef.isReady()) return;
          navigationRef.navigate('WebsiteViewer', { url: target.url, title: 'ACTIV website', appLinkFallback: true });
        } },
      ]);
      return;
    }
    const member = !!token && role === 'member';
    let destination: { name: keyof RootStackParamList; params?: any };
    let resume: MemberAppLinkDestination | undefined;
    if (target.kind === 'event') destination = eventLinkDestination(target.destination, member);
    else if (target.kind === 'public') destination = target.destination;
    else if (target.kind === 'member') {
      destination = member ? target.destination : { name: 'Login' };
      if (!member) resume = target.destination;
    } else {
      const canOpenHome = !!token && !!role && (target.action !== 'member-home' || member);
      const home = canOpenHome ? await homeForRole(role!) : null;
      destination = home ? { name: home } : { name: target.action === 'register' ? 'RegistrationStep1' : 'Login' };
    }
    if (!current()) return;
    // A newly selected app page replaces any older sign-in continuation.
    // Custom activ:// OAuth callbacks never enter this branch, preserving it.
    clearPublicAction();
    if (resume) rememberMemberDestination(resume);
    pendingApp = null;
    const shown = navigationRef.getCurrentRoute();
    if (shown?.name === destination.name && JSON.stringify(shown.params) !== JSON.stringify(destination.params)) {
      // Different detail IDs get a fresh screen, so an old in-flight request
      // cannot paint the newly selected page with the previous item's data.
      navigationRef.dispatch(StackActions.push(destination.name, destination.params));
    } else (navigationRef as any).navigate(destination.name, destination.params);
  } catch (err) {
    console.warn('App link safely caught:', err);
  }
};

/** Kept for event callers; all supported website links share the same queue. */
export const flushPendingEventLink = flushPendingAppLink;

/** Resolve account-scoped payment returns before delivering them to navigation. */
export const handleDeepLink = async (url?: string | null) => {
  if (!url) return;
  const generation = ++linkGeneration;
  pendingApp = parseAppLink(url) || appLinkFallback(url);
  if (pendingApp) {
    pending = null;
    await flushPendingAppLink();
    return;
  }
  const target = parseDeepLink(url) || await resolvePaymentLink(url);
  if (generation === linkGeneration) deliver(target);
};

/** Listen for links while the app runs, and read the one that launched it. */
export const useDeepLinks = () => {
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let receivedWhileRunning = false;
    try {
      if (typeof Linking?.getInitialURL === 'function') {
        Linking.getInitialURL()
          .then(url => { if (!receivedWhileRunning) return handleDeepLink(url); })
          .catch((err) => console.warn('Initial URL safely caught:', err));
      }
      if (typeof Linking?.addEventListener === 'function') {
        sub = Linking.addEventListener('url', (event) => {
          receivedWhileRunning = true;
          void handleDeepLink(event?.url).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('Deep link setup safely caught:', err);
    }
    return () => {
      try {
        sub?.remove();
      } catch {
        /* nothing to clean up */
      }
    };
  }, []);
};
