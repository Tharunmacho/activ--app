/**
 * Smoke tests for the premium member screens (dashboards, menu, application
 * forms, application status, recovery / social sign-in, the website viewer):
 * each one mounts, resolves its data and renders without throwing — with a
 * full data set, and with every call failing (null-safety).
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

/* ---- navigation: focus effects run like mount effects ---------------------- */
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactLib = require('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => any) => ReactLib.useEffect(() => cb(), [cb]),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn(), canGoBack: () => true }),
  };
});

/* ---- the api: canned answers by URL, or everything failing ------------------ */
let mockFailAll = false;
let mockPaid = false;
const MOCK_PROFILE = {
  fullName: 'Tharun Kumar', email: 'm@example.com', phoneNumber: '9876543210', state: 'Tamil Nadu', district: 'Chennai',
  block: 'Guindy', city: 'Chennai', membershipStatus: 'active', membershipNumber: 'ACTIV-2026-001',
  membershipType: 'annual', membershipActivatedAt: '2026-01-10T00:00:00.000Z', renewal: { canRenew: false },
};
const MOCK_APPLICATION = {
  _id: '6ab00d7f8b1d16637b4c7a1b', status: 'Pending-District', createdAt: '2026-09-01T00:00:00.000Z',
  block: 'Guindy', district: 'Chennai', state: 'Tamil Nadu', registrationType: 'business',
  tierReviews: { block: { status: 'approved', at: '2026-09-02T00:00:00.000Z', by: 'Block Admin' } },
};
const mockByUrl = (url: string): any => {
  if (url.includes('/members/my-profile')) return { ...MOCK_PROFILE, membershipStatus: mockPaid ? 'active' : 'pending' };
  if (url.includes('/applications/my-applications')) return [MOCK_APPLICATION];
  if (url.includes('/members/recent-activity')) return { activities: [{ id: 'a1', description: 'Profile updated', at: '2026-09-20T00:00:00.000Z', type: 'profile' }] };
  if (url.includes('/cms/site')) return { header: { navLinks: [{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }, { label: 'Login', href: '/login' }] } };
  if (url.includes('/cms/legal/links')) return [{ label: 'Privacy Policy', href: '/privacy-policy' }];
  if (url.includes('/cms/regions/map')) return { regions: [{ slug: 'south', label: 'South', states: [{ name: 'Kerala', slug: 'kerala' }] }] };
  if (url.includes('/cms/news')) return [{ slug: 'n1', title: 'News one', status: 'published', publishedAt: '2026-09-18T00:00:00.000Z', image: { url: '/uploads/a.jpg' } }, { slug: 'draft', title: 'Draft', status: 'draft' }];
  if (url.includes('/cms/gallery')) return [{ _id: 'g1', slug: 'g1', title: 'Photo', media: { url: '/uploads/b.jpg', type: 'image' } }];
  if (url.includes('/cms/events')) return [{ id: 'e1', slug: 'e1', title: 'Meet', status: 'published', startAt: '2099-01-01T10:00:00.000Z', mode: 'online' }];
  if (url.includes('/events')) return { events: [{ id: 'm1', title: 'Members meet', startAt: '2099-02-01T10:00:00.000Z', venue: 'Hall', district: 'Chennai' }] };
  if (url.includes('/announcements')) return { announcements: [{ id: 'u1', title: 'Update', pinned: true }] };
  if (url.includes('/cms/contact-info')) return { email: 'info@activ.org.in', phone: '+91 82201 12188', workingHours: ['Mon–Fri 10–6'] };
  return {};
};
jest.mock('../src/services/api', () => {
  const respond = (url: string) => (mockFailAll
    ? Promise.reject(Object.assign(new Error('offline'), { response: undefined }))
    : Promise.resolve({ data: { success: true, data: mockByUrl(String(url || '')) } }));
  const inst = {
    get: jest.fn((url: string) => respond(url)),
    post: jest.fn((url: string) => respond(url)),
    put: jest.fn((url: string) => respond(url)),
    delete: jest.fn((url: string) => respond(url)),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: inst, STORAGE_KEYS: { AUTH_TOKEN: 't', USER_DATA: 'u', USER_ROLE: 'r' } };
});

const nav = () => ({
  navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn(), replace: jest.fn(), canGoBack: () => true,
  setOptions: jest.fn(), addListener: jest.fn(() => () => {}),
});

const screens: [string, () => React.ComponentType<any>, any][] = [
  ['Unpaid dashboard', () => require('../src/screens/member/dashboard/DashboardScreen').default, {}],
  ['Paid dashboard', () => require('../src/screens/member/paidDashboard/PaidDashboardScreen').default, {}],
  ['Member menu', () => require('../src/screens/member/MemberMenuScreen').default, {}],
  ['Personal details', () => require('../src/screens/profile/PersonalDetailsFormScreen').default, { params: {} }],
  ['Business information', () => require('../src/screens/profile/BusinessInformationFormScreen').default, { params: {} }],
  ['Declaration', () => require('../src/screens/profile/DeclarationFormScreen').default, { params: {} }],
  ['Financial', () => require('../src/screens/profile/FinancialComplianceFormScreen').default, { params: {} }],
  ['Application submitted', () => require('../src/screens/application/ApplicationSubmittedScreen').default, {}],
  ['Application status', () => require('../src/screens/application/ApplicationStatusScreen').default, {}],
  ['Forgot password', () => require('../src/screens/auth/ForgotPasswordScreen').default, { params: { portal: 'admin' } }],
  ['Reset password', () => require('../src/screens/auth/ResetPasswordScreen').default, { params: {} }],
  ['Social sign-in (no account)', () => require('../src/screens/auth/SocialSignInScreen').default, { params: { error: 'no_account', provider: 'google', email: 'a@b.c' } }],
  ['Social sign-in (error)', () => require('../src/screens/auth/SocialSignInScreen').default, { params: { error: 'cancelled' } }],
  ['Welcome', () => require('../src/screens/auth/WelcomeScreen').default, {}],
  ['Website viewer', () => require('../src/screens/member/website/WebsiteViewerScreen').default, { params: { path: '/news', title: 'News' } }],
];

const flush = () => new Promise<void>((r) => { setTimeout(() => r(), 0); });

describe.each([false, true])('premium member screens (api failing: %s)', (failing) => {
  beforeAll(() => { mockFailAll = failing; });
  test.each(screens)('%s renders', async (name, load, route) => {
    mockPaid = name === 'Paid dashboard';
    const Screen = load();
    let tree: any;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<Screen navigation={nav()} route={route} />);
      await flush();
      await flush();
    });
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });
});

test('Member locked card renders', async () => {
  const MemberLocked = require('../src/screens/member/MemberLocked').default;
  let tree: any;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <MemberLocked feature="Directory" onActivate={jest.fn()} benefits={[{ icon: 'chat', title: 'Message', detail: 'Reach members', open: true }]} />,
    );
  });
  expect(tree.toJSON()).toBeTruthy();
});

test('website content keeps only published news and public pages', async () => {
  mockFailAll = false;
  const svc = require('../src/services/websiteContent');
  svc.invalidateWebsiteContent();
  const news = await svc.getLatestNews(3, true);
  expect(news.map((n: any) => n.title)).toEqual(['News one']);
  const nav = await svc.getSiteNav(true);
  expect(nav.map((l: any) => l.path)).toEqual(['/', '/about']);
  const zones = await svc.getZones(true);
  expect(zones[0].states[0].slug).toBe('kerala');
});
