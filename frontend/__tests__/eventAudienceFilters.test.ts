import { EMPTY_EVENT_FILTERS, eventDateError, eventFilterOptions, eventInPeriod, matchesEventFilters } from '../src/utils/eventFilters';
import { isStudentMembership } from '../src/utils/memberAudience';
import { onlineRegistrationLink } from '../src/utils/onlineEvent';
import { notificationDestination } from '../src/services/pushNotifications';

const programme = { title: 'MSME workshop', category: 'Training', language: 'Tamil / English', mode: 'online', onlinePlatform: 'Zoom',
  targets: [{ state: 'Tamil Nadu', district: 'Chennai' }], startAt: '2026-10-17T18:30:00Z', endAt: '2026-10-20T12:00:00Z' };
test('search combines topic, language, category, area, format and inclusive dates', () => {
  const filter = { ...EMPTY_EVENT_FILTERS, q: 'msme', category: 'Training', language: 'English', area: 'chennai', mode: 'online', from: '2026-10-19', to: '2026-10-19' };
  expect(matchesEventFilters(programme, filter)).toBe(true);
  expect(matchesEventFilters(programme, { ...filter, language: 'Hindi' })).toBe(false);
  expect(matchesEventFilters(programme, { ...filter, category: 'Expo' })).toBe(false);
  expect(matchesEventFilters(programme, { ...filter, area: 'Kerala' })).toBe(false);
  expect(matchesEventFilters(programme, { ...filter, mode: 'offline' })).toBe(false);
  expect(matchesEventFilters(programme, { ...filter, q: 'unrelated' })).toBe(false);
});
test('date overlap uses India calendar boundaries and validates real dates', () => {
  expect(eventInPeriod(programme, '', '2026-10-17')).toBe(false);
  expect(eventInPeriod(programme, '2026-10-20', '')).toBe(true);
  expect(eventInPeriod(programme, '2026-10-21', '')).toBe(false);
  expect(eventInPeriod({}, '2026-10-20', '')).toBe(false);
  expect(eventDateError('2026-02-30', '')).toBeTruthy();
  expect(eventDateError('2026-10-20', '2026-10-19')).toBeTruthy();
  expect(eventDateError('2028-02-29', '')).toBe('');
  expect(eventFilterOptions([programme, { language: 'english, Hindi' }], 'language')).toEqual(['english', 'Hindi', 'Tamil']);
});
test.each([
  [{ registrationFee: 500 }, 'paid'],
  [{ registrationFee: '250' }, 'paid'],
  [{ registrationFee: 0 }, 'free'],
  [{}, 'free'],
  [{ registrationFee: 500, yourPrice: 0 }, 'free'],
  [{ registrationFee: 0, yourPrice: 100 }, 'paid'],
  [{ registrationFee: 0, audience: 'paid' }, 'free'],
])('ticket price filters follow the viewer fee for %j', (event, price) => {
  expect(matchesEventFilters(event, { ...EMPTY_EVENT_FILTERS, price })).toBe(true);
  expect(matchesEventFilters(event, { ...EMPTY_EVENT_FILTERS, price: price === 'paid' ? 'free' : 'paid' })).toBe(false);
  expect(matchesEventFilters(event, EMPTY_EVENT_FILTERS)).toBe(true);
});
test('ticket price combines with the other event filters', () => {
  const event = { ...programme, registrationFee: 500, yourPrice: 0 };
  const filter = { ...EMPTY_EVENT_FILTERS, price: 'free', category: 'Training', q: 'MSME', mode: 'online' };
  expect(matchesEventFilters(event, filter)).toBe(true);
  expect(matchesEventFilters(event, { ...filter, category: 'Conference' })).toBe(false);
  expect(matchesEventFilters(event, { ...filter, price: 'paid' })).toBe(false);
});
test('student upgrades use server capabilities or the paid plan before profile declarations', () => {
  expect(isStudentMembership({ memberType: 'business', paidMembership: { kind: 'student' } })).toBe(true);
  expect(isStudentMembership({ memberType: 'student', capabilities: { isStudent: false } })).toBe(false);
  expect(isStudentMembership({ memberType: 'student', membershipType: 'lifetime' })).toBe(false);
});
test('online registration and meeting URLs produce different actions', () => {
  expect(onlineRegistrationLink('https://zoom.us/meeting/register/example')).toBe(true);
  expect(onlineRegistrationLink('https://meet.google.com/aaa-bbbb-ccc')).toBe(false);
  expect(onlineRegistrationLink('https://zoom.us/j/123456789')).toBe(false);
});
test('notification taps open the intended member destination', () => {
  expect(notificationDestination({ kind: 'message', conversationId: 'thread' })).toEqual({ route: 'MessageThread', params: { conversationId: 'thread' } });
  expect(notificationDestination({ kind: 'announcement', sourceId: 'notice' })).toEqual({ route: 'UpdateDetail', params: { id: 'notice' } });
  expect(notificationDestination({ eventId: 'event', bookingRef: 'REF' }).params.ref).toBe('REF');
  expect(notificationDestination({ kind: 'news', slug: 'member-story' }).params.path).toBe('/news/member-story');
});
