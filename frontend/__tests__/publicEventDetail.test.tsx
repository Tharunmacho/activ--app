import React from 'react';
import Renderer from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import PublicEventDetail from '../src/screens/public/PublicEventDetailScreen';
import { getPublicEvent, getPublicEventDetail } from '../src/services/publicContent';
import { getBookableEvent, getMemberEvent } from '../src/services/memberApi';
import { clearPublicAction, takePublicAction } from '../src/services/publicNavigation';
import { getAuthToken } from '../src/services/api';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn() }, getAuthToken: jest.fn().mockResolvedValue(null), getUserRole: jest.fn().mockResolvedValue(null) }));
jest.mock('../src/services/publicContent', () => ({ getPublicEvent: jest.fn(), getPublicEventDetail: jest.fn() }));
jest.mock('../src/services/memberApi', () => ({ ...jest.requireActual('../src/services/memberApi'), getMemberEvent: jest.fn(), getBookableEvent: jest.fn() }));
jest.mock('../src/services/session', () => ({ homeForRole: jest.fn() }));

const event = { id: 'native-event', title: 'Native public event', status: 'published', startAt: '2099-01-01T10:00:00.000Z',
  registrationEnabled: true, registrationFee: 100, yourPrice: 100, showQrOnPage: false, capacity: 50,
  publicAvailability: { capacity: 50, seatsTaken: 20, seatsLeft: 30, closed: false }, agenda: [{ title: 'Welcome', startTime: '09:00' }] };
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
let screen: Renderer.ReactTestRenderer;
const button = (label: string) => screen.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const render = async () => { await Renderer.act(async () => { screen = Renderer.create(<PublicEventDetail navigation={navigation} route={{ params: { id: 'public-slug' } }} />); }); };
beforeEach(() => { jest.clearAllMocks(); clearPublicAction(); (getPublicEventDetail as jest.Mock).mockResolvedValue(event); (getPublicEvent as jest.Mock).mockResolvedValue(event); });
afterEach(async () => { await Renderer.act(async () => screen?.unmount()); });

test('guest can read native programme and availability, then sign in only when booking', async () => {
  await render();
  expect(getPublicEventDetail).toHaveBeenCalledWith('public-slug');
  expect(getMemberEvent).not.toHaveBeenCalled(); expect(getBookableEvent).not.toHaveBeenCalled();
  expect(getAuthToken).not.toHaveBeenCalled();
  expect(screen.root.findAllByType(Text).some(node => node.props.children === 'Welcome')).toBe(true);
  await Renderer.act(async () => button('All events').props.onPress());
  expect(navigation.navigate).toHaveBeenLastCalledWith('PublicExplore', { section: 'events' });
  await Renderer.act(async () => button('Book Now').props.onPress());
  expect(navigation.navigate).toHaveBeenLastCalledWith('Login');
  expect(takePublicAction()).toEqual({ name: 'EventBooking', params: { eventId: event.id } });
  expect(takePublicAction()).toBeNull();
  expect(navigation.navigate.mock.calls.some(call => call[0] === 'WebsiteViewer')).toBe(false);
});

test.each(['closed', 'full', 'deleted'])('guest cannot start booking when the event is %s', async state => {
  (getPublicEventDetail as jest.Mock).mockResolvedValue(state === 'deleted' ? null : { ...event,
    publicAvailability: { ...event.publicAvailability, closed: state === 'closed', seatsLeft: state === 'full' ? 0 : 30 } });
  await render();
  expect(button('Book Now')).toBeUndefined();
  if (state === 'full') expect(button('Fully booked').props.disabled).toBe(true);
  expect(getAuthToken).not.toHaveBeenCalled(); expect(takePublicAction()).toBeNull();
});

test('a deletion between reading and tapping Book Now is rechecked before login', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await render();
    (getPublicEvent as jest.Mock).mockResolvedValue(null);
    await Renderer.act(async () => button('Book Now').props.onPress());
    expect(navigation.navigate).not.toHaveBeenCalled(); expect(takePublicAction()).toBeNull();
    expect(alert).toHaveBeenCalledWith('Unable to continue', expect.any(String));
  } finally { alert.mockRestore(); }
});
