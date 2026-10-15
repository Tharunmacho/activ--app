import { notificationDestination } from '../src/services/pushNotifications';

test.each([
  [{ kind: 'news', slug: 'member-story' }, '/news/member-story', 'ACTIV news'],
  [{ kind: 'news' }, '/news', 'ACTIV news'],
  [{ kind: 'gallery', sourceId: 'album' }, '/gallery', 'Gallery'],
  [{ kind: 'scheme', sourceId: 'scheme' }, '/schemes', 'Government schemes'],
])('published content opens its native content screen: %j', (payload, path, title) => {
  expect(notificationDestination(payload as Record<string, string>)).toEqual({
    route: 'PublicContent', params: { path, title },
  });
});

test('content routing preserves booking, chat, announcement and payment destinations', () => {
  expect(notificationDestination({ eventId: 'event', bookingRef: 'REF' })).toEqual({
    route: 'EventBooking', params: { eventId: 'event', id: 'event', ref: 'REF' },
  });
  expect(notificationDestination({ eventId: 'event' }).route).toBe('MemberEventDetail');
  expect(notificationDestination({ kind: 'message', conversationId: 'thread' })).toEqual({
    route: 'MessageThread', params: { conversationId: 'thread' },
  });
  expect(notificationDestination({ kind: 'announcement', sourceId: 'notice' })).toEqual({
    route: 'UpdateDetail', params: { id: 'notice' },
  });
  expect(notificationDestination({ orderId: 'order' })).toEqual({ route: 'PaymentSuccess', params: { orderId: 'order' } });
  for (const payload of [undefined, null, {}, { kind: 'unknown' }]) {
    expect(notificationDestination(payload)).toEqual({ route: 'MemberNotifications' });
  }
});
