const fs = require('fs');
const path = require('path');
declare const __dirname: string;
import { parseAppLink } from '../src/navigation/appLinks';
import { Alert } from 'react-native';
import { flushPendingAppLink, handleDeepLink } from '../src/navigation/deepLinks';
import { navigationRef } from '../src/navigation/navigationRef';
import { getAuthToken, getUserRole } from '../src/services/api';
import { homeForRole } from '../src/services/session';
import { clearPublicAction, takePublicAction } from '../src/services/publicNavigation';

jest.mock('../src/services/api', () => ({ getAuthToken: jest.fn(), getUserRole: jest.fn() }));
jest.mock('../src/services/session', () => ({ homeForRole: jest.fn() }));
jest.mock('../src/services/paymentRecovery', () => ({ getPendingPayment: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/navigation/navigationRef', () => ({ navigationRef: {
  isReady: jest.fn(), getCurrentRoute: jest.fn(), navigate: jest.fn(), dispatch: jest.fn(),
} }));

const protectedPages = [
  ['/member/forms/personal', 'PersonalDetailsForm', { userData: {} }],
  ['/member/forms/business', 'BusinessInformationForm', { userData: {} }],
  ['/member/forms/financial', 'DeclarationForm', { userData: {} }],
  ['/member/forms/declaration', 'DeclarationForm', { userData: {} }],
  ['/member/application-status', 'ApplicationStatus'], ['/member/profile', 'PaidProfile'],
  ['/member/profile-view', 'PaidProfile'], ['/member/settings', 'AccountSettings'],
  ['/member/documents', 'MemberDocuments'], ['/member/plan', 'MembershipPlanDetails'],
  ['/member/certificate/membership', 'MemberCertificate', { kind: 'membership' }],
  ['/member/certificate/tax-exemption', 'MemberCertificate', { kind: 'tax-exemption' }],
  ['/member/payment-success?view=receipt', 'PaymentSuccess', {}],
  ['/payment/membership-plans?renew=1', 'MembershipPlans', { renew: true }],
  ['/payment/membership-plans?upgrade=true', 'MembershipPlans', { upgrade: true }],
  ['/member/events', 'MemberEvents'], ['/member/events/private-event', 'MemberEventDetail', { id: 'private-event' }],
  ['/member/events/private-event/book?ref=ACTIVB-123', 'EventBooking', { eventId: 'private-event', ref: 'ACTIVB-123' }],
  ['/member/updates', 'AssociationUpdates'], ['/member/updates/notice-123', 'UpdateDetail', { id: 'notice-123' }],
] as const;

beforeEach(async () => {
  jest.clearAllMocks(); clearPublicAction();
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({ name: 'PublicExplore' });
  (getAuthToken as jest.Mock).mockResolvedValue(null);
  (getUserRole as jest.Mock).mockResolvedValue(null);
  (homeForRole as jest.Mock).mockResolvedValue('PaidDashboard');
  await handleDeepLink('https://unrelated.example/');
});

test.each(protectedPages.map(([route, name, params]) => ({ route, name, params })))('$route remembers exactly $name for member sign-in, never URL-supplied account data', async ({ route, name, params }) => {
  const target = parseAppLink('https://activ.org.in' + route);
  expect(target).toEqual({ kind: 'member', destination: { name, ...(params ? { params } : {}) } });
  await handleDeepLink('https://activ.org.in' + route);
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('Login', undefined);
  expect(takePublicAction()).toEqual({ name, ...(params ? { params } : {}) });
  (getAuthToken as jest.Mock).mockResolvedValue('member-token');
  (getUserRole as jest.Mock).mockResolvedValue('member');
  await handleDeepLink('http://activ.org.in' + route);
  expect(navigationRef.navigate).toHaveBeenLastCalledWith(name, params);
  expect(takePublicAction()).toBeNull();
});

test.each([
  '/', '/onboarding', '/notifications', '/about', '/membership', '/contact?state=Tamil%20Nadu',
  '/privacy-policy', '/terms-and-conditions', '/refund-policy', '/cancellation-policy', '/delete-account', '/legal/privacy-policy',
  '/news', '/news/community-update', '/gallery', '/gallery/annual-meet', '/gallery/annual-meet/photo/2',
  '/zones', '/regions', '/states', '/regions/south', '/regions/south/events', '/states/tamil-nadu/leaders',
  '/schemes', '/schemes/central', '/schemes/state', '/schemes/states', '/schemes/state/tamil-nadu', '/schemes/states/karnataka', '/schemes/view/support-plan', '/donate',
])('supported public URL stays available without an account: %s', route => {
  expect(parseAppLink('https://activ.org.in' + route)?.kind).toBe('public');
});

test('keeps public selected state/photo/notice and limits membership flags to explicit booleans', () => {
  expect(parseAppLink('https://activ.org.in/contact?state=Tamil%20Nadu')).toEqual({ kind: 'public', destination: { name: 'PublicInfo', params: { path: '/contact?state=Tamil%20Nadu' } } });
  expect(parseAppLink('https://activ.org.in/gallery/meet/photo/2')).toEqual({ kind: 'public', destination: { name: 'PublicContent', params: { path: '/gallery/meet/photo/2' } } });
  expect(parseAppLink('https://activ.org.in/?notifications=open&notice=507f1f77bcf86cd799439011')).toMatchObject({ kind: 'public', destination: { params: { notifications: 'open', noticeId: '507f1f77bcf86cd799439011' } } });
  expect(parseAppLink('https://activ.org.in/payment/membership-plans?renew=false&upgrade=0')).toMatchObject({ destination: { params: {} } });
  expect(parseAppLink('https://activ.org.in/payment/membership-plans?renew=maybe')).toBeNull();
  expect(parseAppLink('https://activ.org.in/member/forms/personal?userData=other-account&memberId=other&route=SuperAdminDashboard')).toMatchObject({ destination: { name: 'PersonalDetailsForm', params: { userData: {} } } });
  expect(parseAppLink('https://activ.org.in/member/payment-success?orderId=another-account&payment_status=Credit&amount=1')).toMatchObject({ destination: { name: 'PaymentSuccess', params: {} } });
});

const excluded = [
  '/payment-success?orderId=ord_123', '/donate/thank-you?orderId=gift', '/auth/social?code=one-use',
  '/payment/gateway', '/payment/confirmation', '/payment/mock', '/checkin/signed-pass',
  '/reset-password?token=secret', '/admin/reset-password?token=secret', '/admin/login',
  '/block-admin/approvals', '/district-admin/approvals', '/state-admin/approvals', '/super-admin/membership-registrations',
  '/events-admin/events', '/cms/events', '/uploads/ticket.pdf', '/api/v1/members',
  '/donate/receipt/private-token', '/member/certificate/unknown', '/member/forms/student',
  '/member/delete', '/business/unknown', '/unrecognised', '/states/tamil-nadu/unknown-section',
];
test.each(excluded)('does not claim unsupported/admin/token/callback routes: %s', route => {
  expect(parseAppLink('https://activ.org.in' + route)).toBeNull();
});

test.each([
  'https://www.activ.org.in/login', 'https://api.activ.org.in/login', 'https://activ.org.in.evil.test/login',
  'https://activ.org.in@evil.test/login', 'https://activ.org.in:443/login', 'https://evil.test/login',
  'https://activ.org.in/member/forms/%2e%2e/personal', 'https://activ.org.in/news/a%2Fb',
  'https://activ.org.in/member//forms/personal', 'https://activ.org.in/login?next=%00',
  'https://activ.org.in/payment/membership-plans?renew=0&renew=1',
])('rejects forged or ambiguous web navigation: %s', url => expect(parseAppLink(url)).toBeNull());

test('login/register/dashboard links keep existing signed-in home and do not start another application', async () => {
  await handleDeepLink('https://activ.org.in/register');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('RegistrationStep1', undefined);
  (getAuthToken as jest.Mock).mockResolvedValue('member-token');
  (getUserRole as jest.Mock).mockResolvedValue('member');
  for (const route of ['/login', '/register', '/payment/member-dashboard']) {
    await handleDeepLink('https://activ.org.in' + route);
    expect(navigationRef.navigate).toHaveBeenLastCalledWith('PaidDashboard', undefined);
  }
});

test('a newer public selection clears the older protected sign-in continuation', async () => {
  await handleDeepLink('https://activ.org.in/member/application-status');
  await handleDeepLink('https://activ.org.in/news/community-update');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('PublicContent', { path: '/news/community-update' });
  expect(takePublicAction()).toBeNull();
});

test('custom OAuth handoff preserves the exact protected continuation', async () => {
  await handleDeepLink('https://activ.org.in/member/forms/business');
  await handleDeepLink('activ://auth/social?code=single-use&provider=google');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('SocialSignIn', expect.objectContaining({ code: 'single-use' }));
  expect(takePublicAction()).toEqual({ name: 'BusinessInformationForm', params: { userData: {} } });
});

test('different IDs on the visible detail route create a fresh screen rather than reuse stale request state', async () => {
  (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({ name: 'PublicContent', params: { path: '/news/earlier-story' } });
  await handleDeepLink('https://activ.org.in/news/latest-story');
  expect(navigationRef.dispatch).toHaveBeenCalledWith({ type: 'PUSH', payload: { name: 'PublicContent', params: { path: '/news/latest-story' } } });
  expect(navigationRef.navigate).not.toHaveBeenCalled();
});

test('a claimed website subpage without native support offers an explicit non-looping website view', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    const url = 'https://activ.org.in/member/events/conference/register';
    await handleDeepLink(url);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    const actions = alert.mock.calls[0][2]!;
    actions.find(action => action.text === 'Open website')?.onPress?.();
    expect(navigationRef.navigate).toHaveBeenCalledWith('WebsiteViewer', { url, title: 'ACTIV website', appLinkFallback: true });
    expect(takePublicAction()).toBeNull();
  } finally { alert.mockRestore(); }
});

test('an old website fallback prompt cannot override a newer app link', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await handleDeepLink('https://activ.org.in/states/tamil-nadu/section-scholarships');
    const open = alert.mock.calls[0][2]!.find(action => action.text === 'Open website')!.onPress!;
    await handleDeepLink('https://activ.org.in/news/latest-story');
    open();
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledWith('PublicContent', { path: '/news/latest-story' });
  } finally { alert.mockRestore(); }
});

test('management links retain the complete capability in website fallback instead of dropping edit access', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    const url = 'https://activ.org.in/events/conference/book?ref=ACTIVB-123&manageToken=fixture-capability';
    expect(parseAppLink(url)).toBeNull();
    await handleDeepLink(url);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    alert.mock.calls[0][2]!.find(action => action.text === 'Open website')!.onPress!();
    expect(navigationRef.navigate).toHaveBeenCalledWith('WebsiteViewer', { url, title: 'ACTIV website', appLinkFallback: true });
  } finally { alert.mockRestore(); }
});

test('slow dashboard resolution cannot replace a more recent selected member page', async () => {
  (getAuthToken as jest.Mock).mockResolvedValue('member-token');
  (getUserRole as jest.Mock).mockResolvedValue('member');
  let finish!: (home: string) => void;
  (homeForRole as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const earlier = handleDeepLink('https://activ.org.in/payment/member-dashboard');
  await Promise.resolve(); await Promise.resolve();
  await handleDeepLink('https://activ.org.in/member/application-status');
  finish('PaidDashboard'); await earlier; await flushPendingAppLink();
  expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  expect(navigationRef.navigate).toHaveBeenCalledWith('ApplicationStatus', undefined);
});

test('Android claims the same apex schemes and excludes sensitive URL namespaces', () => {
  const manifest = fs.readFileSync(path.join(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
  const verified = manifest.match(/<intent-filter android:autoVerify="true">([\s\S]*?)<\/intent-filter>/)![1];
  expect([...verified.matchAll(/android:host="([^"]+)"/g)].map(match => match[1])).toEqual(['activ.org.in']);
  expect([...verified.matchAll(/android:scheme="([^"]+)"/g)].map(match => match[1]).sort()).toEqual(['http', 'https']);
  const exact = [...verified.matchAll(/android:path="([^"]+)"/g)].map(match => match[1]);
  const prefixes = [...verified.matchAll(/android:pathPrefix="([^"]+)"/g)].map(match => match[1]);
  for (const route of excluded.filter(item => !item.startsWith('/states/') && !item.startsWith('/member/certificate/'))) {
    const pathname = route.split('?')[0];
    expect(exact.includes(pathname) || prefixes.some(prefix => pathname.startsWith(prefix))).toBe(false);
  }
  for (const [route] of protectedPages) {
    const pathname = route.split('?')[0];
    expect(exact.includes(pathname) || prefixes.some(prefix => pathname.startsWith(prefix))).toBe(true);
  }
});
