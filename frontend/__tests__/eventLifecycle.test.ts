import { eventEndsAt, eventPhase, isPastEvent, isUpcomingEvent, eventRegistrationClosesAt, isRegistrationClosed } from '../src/utils/eventLifecycle';

test('an ongoing event remains upcoming until its exact finishing instant', () => {
  const event = { startAt: '2026-10-10T09:00:00+05:30', endAt: '2026-10-10T17:00:00+05:30' };
  const end = Date.parse(event.endAt);
  expect(eventPhase(event, end - 1)).toBe('live');
  expect(isUpcomingEvent(event, end - 1)).toBe(true);
  expect(isPastEvent(event, end)).toBe(true);
  expect(isUpcomingEvent(event, end)).toBe(false);
});
test('missing finishing time expires at midnight in India, independently of the device timezone', () => {
  const event = { startAt: '2026-10-10T09:00:00+05:30' };
  expect(eventEndsAt(event)).toBe(Date.parse('2026-10-11T00:00:00+05:30'));
  expect(isPastEvent(event, Date.parse('2026-10-10T18:29:59Z'))).toBe(false);
  expect(isPastEvent(event, Date.parse('2026-10-10T18:30:00Z'))).toBe(true);
});
test('multi-day, undated and archived records have consistent visibility', () => {
  const event = { startAt: '2026-10-10T09:00:00+05:30', days: [{ date: '2026-10-12' }] };
  expect(isPastEvent(event, Date.parse('2026-10-11T20:00:00+05:30'))).toBe(false);
  expect(isPastEvent(event, Date.parse('2026-10-13T00:00:00+05:30'))).toBe(true);
  expect(eventPhase({ startAt: null })).toBe('upcoming');
  expect(eventPhase({ startAt: 'not-a-date' })).toBe('upcoming');
  expect(isUpcomingEvent({ archivedAt: '2026-10-12' })).toBe(false);
});

test('registration remains open for three hours after start, with admin and event-end limits', () => {
  const event = { registrationEnabled: true, startAt: '2026-11-10T15:00:00+05:30', endAt: '2026-11-10T20:00:00+05:30' };
  const cutoff = Date.parse('2026-11-10T18:00:00+05:30');
  expect(eventRegistrationClosesAt(event)).toBe(cutoff);
  expect(isRegistrationClosed(event, Date.parse(event.startAt))).toBe(false);
  expect(isRegistrationClosed(event, cutoff - 1)).toBe(false);
  expect(isRegistrationClosed(event, cutoff)).toBe(true);
  expect(isRegistrationClosed({ ...event, registrationDeadline: '2026-11-10T19:00:00+05:30' }, cutoff)).toBe(false);
  expect(isRegistrationClosed({ ...event, registrationEnabled: false }, cutoff - 1)).toBe(true);
  expect(eventRegistrationClosesAt({ ...event, endAt: '2026-11-10T16:00:00+05:30' })).toBe(Date.parse('2026-11-10T16:00:00+05:30'));
  expect(eventRegistrationClosesAt({ ...event, registrationDeadline: '2026-11-11T19:00:00+05:30' })).toBe(Date.parse(event.endAt));
});
