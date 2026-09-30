/**
 * Super Admin — full website parity (2026-09-30). Every screen registered in
 * navigation/routes/superRoutes.tsx mounts, resolves its data and renders
 * without throwing — with a full data set, and with every call failing
 * (null-safety). Plus: the Automation delivery view (filters, a message
 * expanding in place, the inline resend confirmation), the booking Messages
 * screen, the More menu reaching every section, and the five-tab navigator.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

/* ---- navigation: focus effects run like mount effects; params per test ---- */
let mockParams: any = {};
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactLib = require('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => any) => ReactLib.useEffect(() => cb(), [cb]),
    useNavigation: () => ({
      navigate: mockNavigate, goBack: jest.fn(), reset: jest.fn(), replace: jest.fn(), setParams: jest.fn(),
      canGoBack: () => true, setOptions: jest.fn(), addListener: jest.fn(() => () => {}),
    }),
    useRoute: () => ({ key: 'k', name: 'Test', params: mockParams }),
  };
});

/* ---- the api: canned answers by URL, or everything failing ------------------ */
let mockFailAll = false;

const EVENT_ID = '6ab4ce651129156b1152db0e';
const BOOKING = {
  bookingRef: 'ACTIVB-MUNPL8RY-69C9', status: 'confirmed', noOfPersons: 2, totalAmount: 1000, memberRateApplied: true, memberSaving: 200,
  bookedBy: { name: 'Tharun V', email: 't@example.com', phone: '9092317264' },
  payment: { status: 'pending', mode: '' }, attendees: [{ name: 'Tharun V' }, { name: 'Guest' }], createdAt: '2026-09-30T06:06:42.584Z',
};
const LOG = {
  _id: 'log1', event: 'EVENT_BOOKING_CONFIRMED', channel: 'whatsapp', recipient: '9092317264', recipientName: 'Tharun V',
  status: 'failed', effectiveStatus: 'failed', failureReason: 'Recipient phone number not in allowed list', failureCode: 131030,
  bookingRef: BOOKING.bookingRef, eventId: EVENT_ID, eventTitle: 'Entrepreneurship Awareness Programme', provider: 'meta', attempts: 2,
  statusHistory: [{ status: 'accepted', at: '2026-09-30T12:31:39.066Z' }, { status: 'failed', at: '2026-09-30T12:31:45.000Z', code: 131030, title: 'Not allowed' }],
  createdAt: '2026-09-30T12:31:39.069Z',
};
const LOG2 = { ...LOG, _id: 'log2', channel: 'email', recipient: 't@example.com', status: 'sent', effectiveStatus: 'accepted', failureReason: '', failureCode: undefined, statusHistory: [] };
const COUNTS = { total: 2, accepted: 1, sent: 0, delivered: 0, read: 0, failed: 1, mock: 0 };
const CMS_EVENT = {
  id: EVENT_ID, slug: 'eap', title: 'Entrepreneurship Awareness Programme', description: 'About', startAt: '2026-10-23T03:30:00.000Z',
  endAt: '2026-10-23T11:30:00.000Z', venue: 'Annamalai University', status: 'published', category: 'Awareness', mode: 'offline',
  media: { url: '', type: 'image', alt: '', fit: 'cover', position: 'center' }, targets: [{ state: 'Tamil Nadu', district: 'Cuddalore', block: '' }],
  reachEveryone: false, showOnOnboarding: true, channel: 'members', audience: 'all', registrationEnabled: true, capacity: 500,
  registrationFee: 0, agenda: [], days: [], speakers: [], attachments: [],
};
const PLAN = { id: 'p1', key: 'basic', name: 'Beginner', description: '', price: 10000, audience: 'business', membershipType: 'annual', minYears: 0, maxYears: 5, features: ['A'], popular: false, active: true, order: 1 };

const mockByUrl = (url: string): any => {
  if (url.includes('/notifications/logs/booking/')) {
    return { bookingRef: BOOKING.bookingRef, rows: [LOG, LOG2], summary: { email: { status: 'accepted' }, whatsapp: { status: 'failed', reason: 'Not allowed' } } };
  }
  if (url.includes('/notifications/delivery-summary')) {
    return { summaries: { [BOOKING.bookingRef]: { email: { status: 'accepted' }, whatsapp: { status: 'failed', reason: 'Not allowed' } } } };
  }
  if (url.includes('/notifications/logs')) {
    return {
      logs: [LOG, LOG2], health: { sent: 1, failed: 1, queued: 0, mock: 0, total: 2 },
      counts: { total: 2, delivery: COUNTS, byChannel: { email: { ...COUNTS, total: 1, failed: 0 }, whatsapp: { ...COUNTS, total: 1, accepted: 0 } } },
      events: [{ eventId: EVENT_ID, title: 'Entrepreneurship Awareness Programme', count: 2 }],
      pagination: { page: 1, limit: 25, total: 2, pages: 1 },
    };
  }
  if (url.includes('/notifications/delivery-status')) {
    return { email: { configured: true, host: 'smtp.example.com', user: 'u', from: 'ACTIV', regionalFrom: false, supportAddress: 's@a' }, whatsapp: { configured: false, baseUrl: 'x', webhookConfigured: false, webhookUrl: 'https://x/hook' } };
  }
  if (url.includes('/events/bookings/overview')) {
    return {
      events: [{ id: EVENT_ID, title: CMS_EVENT.title, startAt: CMS_EVENT.startAt, venue: 'Annamalai University', category: 'Awareness', status: 'published', registrationEnabled: true, price: 500, memberPrice: 400, hasMemberRate: true, totalSeats: 500, bookedSeats: 3, remainingSeats: 497, waitlistedSeats: 1, bookings: 3, paidBookings: 1, collected: 1010, pendingAmount: 500 }],
      totals: { events: 1, seats: 3, capacity: 500, bookings: 3, collected: 1010, pending: 500 },
    };
  }
  if (url.includes('/events/bookings/people')) {
    return { people: [{ email: 't@example.com', name: 'Tharun V', phone: '9092317264', isMember: true, bookings: 2, seats: 2, events: 2, cancelled: 0, paid: 1, pending: 1, lastBookedAt: '2026-09-30T06:13:03.792Z' }], total: 1 };
  }
  if (url.includes('/events/bookings/person')) return { person: { email: 't@example.com', name: 'Tharun V' }, bookings: [{ ...BOOKING, event: { id: EVENT_ID, title: CMS_EVENT.title } }] };
  if (/\/events\/[^/]+\/bookings\/export/.test(url)) return 'ref,name\n';
  if (/\/events\/[^/]+\/bookings/.test(url)) {
    return { bookings: [BOOKING], summary: { bookings: 1, paidBookings: 0, seats: 2, collected: 0, pending: 1000, pendingBookings: 1 }, pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
  }
  if (/\/events\/[^/]+\/attendees/.test(url)) {
    return { attendees: [{ key: 'a1', name: 'Tharun V', email: 't@example.com', bookingRef: BOOKING.bookingRef, paymentStatus: 'pending', status: 'confirmed', isGuest: false }], total: 1, seatsBooked: 2 };
  }
  if (url.includes('/events/categories')) {
    return { categories: [{ id: 'c1', label: 'Workshops', icon: 'book-open', mode: 'both', order: 0, managed: true, eventCount: 2 }], missingStandard: ['Medical'], standard: ['Medical'] };
  }
  if (url.includes('/events/reach')) return { members: 12, total: 12 };
  if (url.includes('/cms/events-settings')) return { categories: [{ label: 'Awareness', mode: 'both' }] };
  if (url.includes('/cms/events')) return [CMS_EVENT, { ...CMS_EVENT, id: 'e2', title: '', startAt: null, status: 'draft', targets: [], reachEveryone: true }];
  if (url.startsWith('/events')) return { events: [{ id: EVENT_ID, title: CMS_EVENT.title, startAt: CMS_EVENT.startAt, registrationFee: 500, capacity: 500 }], total: 1 };
  if (url.includes('/regions/tree')) return { states: [{ name: 'Tamil Nadu', districts: [{ name: 'Cuddalore', blocks: [{ name: 'Chidambaram' }] }] }] };
  if (url.includes('/membership/platinum/requests/')) {
    return { request: { id: 'r1', name: 'Asha', email: 'a@x.in', phone: '98', status: 'new', createdAt: '2026-09-01T00:00:00.000Z' }, member: { id: 'm1', fullName: 'Asha' } };
  }
  if (url.includes('/membership/platinum/requests')) return { requests: [{ id: 'r1', name: 'Asha', status: 'new', memberId: 'm1', createdAt: '2026-09-01T00:00:00.000Z' }], counts: { new: 1 } };
  if (url.includes('/membership/platinum/search')) return [];
  if (url.includes('/membership/platinum')) return { plan: { name: 'Platinum Lifetime', price: 200000, active: true }, members: [{ id: 'm1', fullName: 'Life Member', platinumSince: '2026-01-01T00:00:00.000Z' }] };
  if (url.includes('/membership/plans')) return { plans: [PLAN, { ...PLAN, id: 'p2', key: 'growth', name: 'Growth', minYears: 5, maxYears: null, price: 20000 }], settings: { showAllPlans: false } };
  if (url.includes('/donations/summary')) return { financialYears: ['2026-27', '2025-26'], fy: '', totalAmount: 1000, donationCount: 1, donorCount: 1, thisMonthAmount: 1000 };
  if (/\/donations\/donors\/[^/]+/.test(url)) {
    return { donor: { id: 'd1', fullName: 'K C Chellapandiyan', email: 'c@x.in', phone: '94', statementToken: 'tok' }, donations: [{ id: 'dn1', amount: 1000, status: 'paid', receiptNumber: 'R1', receiptToken: 'rt', paidAt: '2026-09-30T05:22:07.904Z', fy: '2026-27' }], byYear: [{ fy: '2026-27', amount: 1000, count: 1 }] };
  }
  if (url.includes('/donations/donors')) return { rows: [{ id: 'd1', fullName: 'K C Chellapandiyan', email: 'c@x.in', phone: '94', city: 'Dharmapuri', state: 'Tamilnadu', donationCount: 1, totalAmount: 1000, allTimeAmount: 1000, lastDonationAt: '2026-09-30T05:22:07.904Z', statementToken: 'tok' }], total: 1 };
  if (url.includes('/donations')) return { rows: [], total: 0 };
  if (url.includes('/announcements/admin')) {
    return { announcements: [{ id: 'u1', _id: 'u1', title: 'AGM on Sunday', body: 'Details', category: 'notice', status: 'published', createdAt: '2026-09-29T00:00:00.000Z', targets: [] }], total: 1 };
  }
  return {};
};

jest.mock('../src/services/api', () => {
  const respond = (url: string) => (mockFailAll
    ? Promise.reject(Object.assign(new Error('offline'), { response: undefined }))
    : Promise.resolve({ data: { success: true, message: 'Re-sent', data: mockByUrl(String(url || '')) } }));
  const inst = {
    get: jest.fn((url: string) => respond(url)),
    post: jest.fn((url: string) => respond(url)),
    put: jest.fn((url: string) => respond(url)),
    patch: jest.fn((url: string) => respond(url)),
    delete: jest.fn((url: string) => respond(url)),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return {
    __esModule: true,
    default: inst,
    STORAGE_KEYS: { AUTH_TOKEN: 't', USER_DATA: 'u', USER_ROLE: 'r' },
    getUserData: jest.fn(() => Promise.resolve({ fullName: 'Super Admin', email: 'super@activ.org.in' })),
    setUserData: jest.fn(() => Promise.resolve()),
  };
});

const nav = () => ({
  navigate: mockNavigate, goBack: jest.fn(), reset: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true,
  setOptions: jest.fn(), addListener: jest.fn(() => () => {}), getParent: () => undefined,
});

/* Debounced loads (300–400 ms) need real time to pass. */
const flush = () => new Promise<void>((r) => { setTimeout(() => r(), 0); });
const wait = (ms: number) => new Promise<void>((r) => { setTimeout(() => r(), ms); });
const settle = async () => { await flush(); await flush(); };
/** Effects (and the debounce timers they start) run when an act() scope closes — so wait in a second one. */
const drain = async () => {
  for (let i = 0; i < 2; i += 1) {
    await ReactTestRenderer.act(async () => { await wait(450); await flush(); await flush(); });
  }
};

const Super = () => require('../src/screens/admin/super/context/SuperAdminContext').SuperAdminProvider;
const S = (file: string) => () => require(`../src/screens/admin/super/${file}`).default;

const screens: [string, () => React.ComponentType<any>, any][] = [
  ['Events (tab)', S('ManageEventsScreen'), {}],
  ['Event editor · new', S('SuperEventEditorScreen'), {}],
  ['Event editor · edit', S('SuperEventEditorScreen'), { event: CMS_EVENT }],
  ['Event QR', S('SuperEventQrScreen'), { event: CMS_EVENT, justCreated: true }],
  ['Event categories', S('SuperEventCategoriesScreen'), {}],
  ['Bookings & revenue', S('SuperBookingsScreen'), {}],
  ['Event bookings', S('SuperEventBookingsScreen'), { eventId: EVENT_ID, title: CMS_EVENT.title, capacity: 500 }],
  ['Booking people', S('SuperBookingPeopleScreen'), {}],
  ['Booking detail', S('SuperBookingDetailScreen'), { eventId: EVENT_ID, booking: BOOKING, event: { title: CMS_EVENT.title, capacity: 500 } }],
  ['Booking messages', S('SuperBookingMessagesScreen'), { bookingRef: BOOKING.bookingRef, title: CMS_EVENT.title }],
  ['Donors', S('SuperDonorsScreen'), {}],
  ['Donor detail', S('SuperDonorDetailScreen'), { id: 'd1', name: 'K C Chellapandiyan' }],
  ['Membership · plans', S('SuperMembershipScreen'), { tab: 'plans' }],
  ['Membership · platinum', S('SuperMembershipScreen'), { tab: 'platinum' }],
  ['Membership · requests', S('SuperMembershipScreen'), { tab: 'requests' }],
  ['Plan editor · new', S('SuperPlanEditorScreen'), {}],
  ['Plan editor · edit', S('SuperPlanEditorScreen'), { planKey: 'basic', plan: PLAN }],
  ['Platinum grant', S('SuperPlatinumGrantScreen'), { member: { id: 'm1', fullName: 'Asha', email: 'a@x.in' }, price: 200000 }],
  ['Platinum request', S('SuperPlatinumRequestScreen'), { id: 'r1' }],
  ['Member updates', S('SuperUpdatesScreen'), {}],
  ['Update editor · new', S('SuperUpdateEditorScreen'), {}],
  ['Update editor · edit', S('SuperUpdateEditorScreen'), { announcement: { id: 'u1', title: 'AGM', body: 'x', category: 'notice', status: 'draft' } }],
  ['Notifications · automation', S('SuperNotificationsScreen'), { view: 'automation' }],
  ['Notifications · log', S('SuperNotificationsScreen'), { view: 'log' }],
  ['Notifications · setup', S('SuperNotificationsScreen'), { view: 'delivery' }],
  ['Notifications · routing', S('SuperNotificationsScreen'), { view: 'routing' }],
  ['Event attendance', S('SuperEventAttendanceScreen'), {}],
  ['More menu', S('SuperMenuScreen'), {}],
];

const texts = (tree: any): string => tree.root.findAll((n: any) => typeof n.type === 'string' && n.type === 'Text' || n.type?.displayName === 'Text')
  .map((n: any) => (Array.isArray(n.props?.children) ? n.props.children.join('') : String(n.props?.children ?? ''))).join(' | ');

const mount = async (Screen: React.ComponentType<any>, params: any) => {
  mockParams = params || {};
  const Provider = Super();
  let tree: any;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Provider><Screen navigation={nav()} route={{ params: mockParams }} /></Provider>);
    await settle();
  });
  await drain();
  return tree;
};

/** Press the first node carrying this accessibility label and an onPress. */
const press = async (tree: any, label: string | RegExp) => {
  const hit = tree.root.findAll((n: any) => {
    const l = n.props?.accessibilityLabel;
    return typeof n.props?.onPress === 'function' && (typeof label === 'string' ? l === label : label.test(String(l || '')));
  })[0];
  if (!hit) return false;
  await ReactTestRenderer.act(async () => { hit.props.onPress(); await flush(); await flush(); });
  return true;
};

jest.setTimeout(60000);

describe.each([false, true])('super admin parity screens (api failing: %s)', (failing) => {
  beforeAll(() => { mockFailAll = failing; });
  test.each(screens)('%s renders', async (_name, load, params) => {
    const tree = await mount(load(), params);
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });
});

describe('super admin parity interactions', () => {
  beforeAll(() => { mockFailAll = false; });
  beforeEach(() => { mockNavigate.mockClear(); });

  test('every registered super route has a component', () => {
    const { superScreens } = require('../src/navigation/routes/superRoutes');
    const names: string[] = [];
    const Stack = { Screen: (p: any) => { names.push(p.name); return null; } };
    const el = superScreens(Stack);
    React.Children.forEach(el.props.children, (c: any) => { names.push(c.props.name); expect(c.props.component).toBeTruthy(); });
    for (const n of ['SuperBookings', 'SuperEventBookings', 'SuperBookingDetail', 'SuperBookingMessages', 'SuperDonors', 'SuperDonorDetail',
      'SuperMembership', 'SuperPlanEditor', 'SuperPlatinumGrant', 'SuperPlatinumRequest', 'SuperEventEditor', 'SuperEventQr',
      'SuperEventCategories', 'SuperUpdates', 'SuperUpdateEditor', 'SuperNotifications', 'SuperBookingPeople', 'SuperEventAttendance']) {
      expect(names).toContain(n);
    }
  });

  test('automation view: counts, a failed message expands in place, resend asks first', async () => {
    const tree = await mount(S('SuperNotificationsScreen')(), { view: 'automation' });
    const all = texts(tree);
    expect(all).toContain('Email');
    expect(all).toContain('WhatsApp');
    expect(all).toContain('Booking confirmation');
    expect(all).toContain('Recipient phone number not in allowed list');
    // Expand the failed WhatsApp message: its timeline and provider appear.
    expect(await press(tree, /^Booking confirmation to Tharun V, WhatsApp, Failed$/)).toBe(true);
    const opened = texts(tree);
    expect(opened).toContain('TIMELINE');
    expect(opened).toContain('Meta WhatsApp Cloud API');
    // Resend is confirmed inline: the first press only asks.
    expect(await press(tree, /^Send this WhatsApp message again/)).toBe(true);
    expect(tree.root.findAll((n: any) => n.props?.accessibilityLabel === 'Confirm resend').length).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });

  test('automation view sends its filters to /notifications/logs?group=automation', async () => {
    const api = require('../src/services/api').default;
    api.get.mockClear();
    const tree = await mount(S('SuperNotificationsScreen')(), { view: 'automation' });
    const call = api.get.mock.calls.find((c: any[]) => String(c[0]) === '/notifications/logs');
    expect(call?.[1]?.params?.group).toBe('automation');
    expect(call?.[1]?.params?.limit).toBe(25);
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });

  test('booking messages screen shows both channels and each message', async () => {
    const tree = await mount(S('SuperBookingMessagesScreen')(), { bookingRef: BOOKING.bookingRef, title: CMS_EVENT.title });
    const all = texts(tree);
    expect(all).toContain('Messages for this booking');
    expect(all).toContain('Booking confirmation');
    expect(all).toContain('WhatsApp');
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });

  test('event bookings show the Messages chips and open the booking messages', async () => {
    const tree = await mount(S('SuperEventBookingsScreen')(), { eventId: EVENT_ID, title: CMS_EVENT.title, capacity: 500 });
    expect(await press(tree, /^Messages: /)).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('SuperBookingMessages', expect.objectContaining({ bookingRef: BOOKING.bookingRef }));
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });

  test('the More menu reaches every section', async () => {
    const tree = await mount(S('SuperMenuScreen')(), {});
    const labels = tree.root.findAll((n: any) => typeof n.props?.onPress === 'function' && n.props?.accessibilityLabel)
      .map((n: any) => String(n.props.accessibilityLabel));
    for (const l of ['Membership plans', 'Platinum', 'Bookings & revenue', 'Donations', 'Events', 'Event categories', 'Event attendance', 'Member updates', 'Message delivery', 'Notifications']) {
      expect(labels.some((x: string) => x.startsWith(`${l},`))).toBe(true);
    }
    expect(await press(tree, /^Bookings & revenue,/)).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('SuperBookings', undefined);
    expect(await press(tree, /^Message delivery,/)).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('SuperNotifications', { view: 'automation' });
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });

  test('the Super Admin tabs mount with five tabs including Events', async () => {
    const { NavigationContainer } = require('@react-navigation/native');
    const Tabs = require('../src/navigation/SuperAdminBottomTabs').default;
    let tree: any;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<NavigationContainer><Tabs navigation={nav()} /></NavigationContainer>);
      await settle();
    });
    await drain();
    const all = texts(tree);
    for (const t of ['Hub', 'Admins', 'Events', 'Settings', 'More']) expect(all).toContain(t);
    await ReactTestRenderer.act(async () => { tree.unmount(); });
  });
});
