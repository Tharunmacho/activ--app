import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { parseEventLink } from '../src/navigation/eventLinks';
import { flushPendingEventLink, handleDeepLink, useDeepLinks } from '../src/navigation/deepLinks';
import { navigationRef } from '../src/navigation/navigationRef';
import { getAuthToken, getUserRole } from '../src/services/api';

jest.mock('../src/services/api', () => ({ getAuthToken: jest.fn(), getUserRole: jest.fn() }));
jest.mock('../src/services/paymentRecovery', () => ({ getPendingPayment: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/services/session', () => ({ homeForRole: jest.fn() }));
jest.mock('../src/navigation/navigationRef', () => ({ navigationRef: {
  isReady: jest.fn(), getCurrentRoute: jest.fn(), navigate: jest.fn(), dispatch: jest.fn(),
} }));

const reminder = 'https://activ.org.in/events/business-opportunities-2026-11-08/book?ref=ACTIV-EVT-AbC123';
const params = { eventId: 'business-opportunities-2026-11-08', ref: 'ACTIV-EVT-AbC123' };
beforeEach(async () => {
  jest.clearAllMocks();
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({ name: 'PublicExplore' });
  (getAuthToken as jest.Mock).mockResolvedValue(null);
  (getUserRole as jest.Mock).mockResolvedValue(null);
  await handleDeepLink('https://unrelated.example/'); // discard any queued prior fixture
});

test('recognises the real reminder slug/ref without losing its case or booking context', () => {
  expect(parseEventLink(reminder)).toEqual({ name: 'EventBooking', params });
  expect(parseEventLink(reminder.replace('https:', 'http:'))).toEqual({ name: 'EventBooking', params });
  expect(parseEventLink('https://activ.org.in/events/507f1f77bcf86cd799439011/book/?utm_source=whatsapp&ref=ACTIV%2DEVT%2DAbC123#ticket')).toEqual({ name: 'EventBooking', params: { eventId: '507f1f77bcf86cd799439011', ref: 'ACTIV-EVT-AbC123' } });
  expect(parseEventLink('https://activ.org.in/events/Conference/book')).toEqual({ name: 'EventBooking', params: { eventId: 'Conference' } });
  expect(parseEventLink('https://activ.org.in/events/conference')).toEqual({ name: 'PublicEventDetail', params: { id: 'conference' } });
  expect(parseEventLink('https://activ.org.in/events?source=reminder')).toEqual({ name: 'PublicExplore', params: { section: 'events' } });
});

test.each([
  'https://evil.example/events/event/book?ref=BOOK',
  'https://activ.org.in.evil.example/events/event/book?ref=BOOK',
  'https://activ.org.in@evil.example/events/event/book?ref=BOOK',
  'https://activ.org.in:443/events/event/book?ref=BOOK',
  'https://www.activ.org.in/events/event/book?ref=BOOK',
  'https://api.activ.org.in/events/event/book?ref=BOOK',
  'https://activ.org.in/member/events/event',
  'https://activ.org.in/events-admin',
  'https://activ.org.in/events/event/book/extra?ref=BOOK',
  'https://activ.org.in/events/%2e%2e/book?ref=BOOK',
  'https://activ.org.in/events/event%2Fother/book?ref=BOOK',
  'https://activ.org.in/events/%ZZ/book?ref=BOOK',
  'https://activ.org.in/events/event/book?ref=',
  'https://activ.org.in/events/event/book?ref=BOOK&ref=OTHER',
  'https://activ.org.in/events/event/book?ref=BOOK&%72ef=OTHER',
  'https://activ.org.in/events/event/book?ref=BOOK%00',
  'https://activ.org.in/events/event/book?ref=BOOK%2Fother',
  'https://activ.org.in/events/event/book?ref=BOOK&manageToken=fixture-capability',
  'https://activ.org.in/events/event/book?ref=BOOK&manage_token=fixture-capability',
  'https://activ.org.in/events/event/book?ref=BOOK&token=fixture-capability',
  'https://activ.org.in/events/event/book?ref=BOOK&manage=1',
  'https://activ.org.in/events/event/book?ref=BOOK&edit=1',
  'https://activ.org.in/events/event?ref=BOOK',
])('rejects unrelated or ambiguous event URL: %s', url => {
  expect(parseEventLink(url)).toBeNull();
});

test.each([null, 'member', 'super_admin'])('warm booking opens the same ticket for session %s without forcing login', async role => {
  (getUserRole as jest.Mock).mockResolvedValue(role);
  (getAuthToken as jest.Mock).mockResolvedValue(role ? 'session-token' : null);
  await handleDeepLink(reminder);
  expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  expect(navigationRef.navigate).toHaveBeenCalledWith('EventBooking', params);
});

test('cold booking waits for navigator and session restoration, then opens exactly once', async () => {
  (navigationRef.isReady as jest.Mock).mockReturnValue(false);
  await handleDeepLink(reminder);
  expect(getAuthToken).not.toHaveBeenCalled();
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({ name: 'Onboarding' });
  await flushPendingEventLink();
  expect(navigationRef.navigate).not.toHaveBeenCalled();
  (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({ name: 'PaidDashboard' });
  await Promise.all([flushPendingEventLink(), flushPendingEventLink()]);
  await flushPendingEventLink();
  expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  expect(navigationRef.navigate).toHaveBeenCalledWith('EventBooking', params);
});

test('event pages use member eligibility only for an established member session', async () => {
  await handleDeepLink('https://activ.org.in/events/conference');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('PublicEventDetail', { id: 'conference' });
  (getAuthToken as jest.Mock).mockResolvedValue('member-token');
  (getUserRole as jest.Mock).mockResolvedValue('member');
  await handleDeepLink('https://activ.org.in/events/conference');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('MemberEventDetail', { id: 'conference' });
  await handleDeepLink('https://activ.org.in/events');
  expect(navigationRef.navigate).toHaveBeenLastCalledWith('MemberEvents', undefined);
});

test('a newer reminder wins while the previous event is resolving the session', async () => {
  let finish!: (token: string | null) => void;
  (getAuthToken as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const old = handleDeepLink(reminder);
  await handleDeepLink('https://activ.org.in/events/next-event/book?ref=NEXT-BOOKING');
  finish(null); await old;
  expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  expect(navigationRef.navigate).toHaveBeenCalledWith('EventBooking', { eventId: 'next-event', ref: 'NEXT-BOOKING' });
});

test('a warm link is not overwritten by the delayed initial URL and the listener is removed', async () => {
  let finish!: (url: string | null) => void;
  let receive!: (event: { url: string }) => void;
  const remove = jest.fn();
  const initial = jest.spyOn(Linking, 'getInitialURL').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const listener = jest.spyOn(Linking, 'addEventListener').mockImplementation((_event, callback) => { receive = callback; return { remove } as any; });
  const Harness = () => { useDeepLinks(); return null; };
  let tree!: Renderer.ReactTestRenderer;
  try {
    await act(async () => { tree = Renderer.create(<Harness />); });
    await act(async () => { receive({ url: reminder }); });
    await act(async () => { finish('https://activ.org.in/events/older-event'); });
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledWith('EventBooking', params);
  } finally {
    if (tree) await act(async () => tree.unmount());
    initial.mockRestore(); listener.mockRestore();
  }
  expect(remove).toHaveBeenCalledTimes(1);
});
