import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking, Modal, Share, Text } from 'react-native';
import PublicNotificationsCard from '../src/components/PublicNotificationsCard';
import PublicNotificationsScreen from '../src/screens/public/PublicNotificationsScreen';
import { getAuthToken } from '../src/services/api';
import { getPublicNotice, getPublicNotices, recordVisitorOpen, visitorPushEnabled } from '../src/services/visitorNotifications';
import { disableVisitorNotifications, firebaseReady, pushPermission, syncPushRegistration } from '../src/services/pushNotifications';

jest.mock('../src/services/api', () => ({ getAuthToken: jest.fn() }));
jest.mock('../src/services/visitorNotifications', () => ({ getPublicNotice: jest.fn(), getPublicNotices: jest.fn(), recordVisitorOpen: jest.fn(), visitorPushEnabled: jest.fn() }));
jest.mock('../src/services/pushNotifications', () => ({ disableVisitorNotifications: jest.fn(), firebaseReady: jest.fn(), pushPermission: jest.fn(), syncPushRegistration: jest.fn() }));

const event = { id: '607f1f77bcf86cd799439011', sourceId: '707f1f77bcf86cd799439011', kind: 'event', title: 'Community programme', summary: 'Meet the community', body: 'Full programme information', createdAt: '2026-10-17T04:00:00Z', imageUrl: '' };
const announcement = { ...event, id: '607f1f77bcf86cd799439012', kind: 'announcement', title: 'Association update' };
const navigation = { navigate: jest.fn(), replace: jest.fn() }, onClose = jest.fn();
const mock = (value: any) => value as jest.Mock;
let screen: Renderer.ReactTestRenderer | undefined;
const button = (label: string) => screen!.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const text = () => screen!.root.findAllByType(Text).map(node => node.props.children).join(' ');
const render = async (visible = true, noticeId?: string) => { await act(async () => { screen = Renderer.create(<PublicNotificationsCard visible={visible} noticeId={noticeId} onClose={onClose} navigation={navigation} />); }); };
beforeEach(() => {
  jest.clearAllMocks();
  mock(getAuthToken).mockResolvedValue(null);
  mock(getPublicNotices).mockResolvedValue([event, announcement]);
  mock(getPublicNotice).mockImplementation(async id => id === announcement.id ? announcement : event);
  mock(recordVisitorOpen).mockResolvedValue(undefined);
  mock(visitorPushEnabled).mockResolvedValue(false);
  mock(pushPermission).mockResolvedValue('disabled');
  mock(firebaseReady).mockReturnValue(true);
  mock(syncPushRegistration).mockResolvedValue('enabled');
  mock(disableVisitorNotifications).mockResolvedValue(undefined);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; jest.restoreAllMocks(); });

test('hidden and opened bell never request permission or mark notices read', async () => {
  await render(false);
  expect(screen!.toJSON()).toBeNull();
  expect(getPublicNotices).not.toHaveBeenCalled();
  await act(async () => screen!.update(<PublicNotificationsCard visible onClose={onClose} navigation={navigation} />));
  expect(screen!.root.findByType(Modal).props.visible).toBe(true);
  expect(text()).toContain(event.title);
  expect(syncPushRegistration).not.toHaveBeenCalled();
  expect(recordVisitorOpen).not.toHaveBeenCalled();
  expect(text()).not.toContain('Become a member');
});

test('a row opens inside the card, records an intentional open, and preserves event navigation', async () => {
  await render();
  await act(async () => button(event.title).props.onPress());
  expect(text()).toContain(event.body);
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(recordVisitorOpen).toHaveBeenCalledWith(event.id, 'in_app');
  await act(async () => button('Back to notifications').props.onPress());
  expect(button(announcement.title)).toBeDefined();
  await act(async () => button(event.title).props.onPress());
  await act(async () => button('View event').props.onPress());
  expect(onClose).toHaveBeenCalled();
  expect(navigation.navigate).toHaveBeenCalledWith('PublicEventDetail', { id: event.sourceId });
});

test('an existing push link opens its detail without also counting an in-app open', async () => {
  await render(true, announcement.id);
  expect(text()).toContain(announcement.body);
  expect(recordVisitorOpen).not.toHaveBeenCalled();
  expect(button('Back to notifications')).toBeDefined();
});

test('public update detail shares a canonical notice link without device or session data', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await render(true, announcement.id);
  expect(share).not.toHaveBeenCalled();
  await act(async () => button('Share ' + announcement.title).props.onPress());
  const payload = JSON.stringify(share.mock.calls[0][0]);
  expect(payload).toContain('https://activ.org.in/notifications?notice=' + announcement.id);
  expect(payload).not.toMatch(/visitor|secret|token|localhost|activApp/);
  expect(recordVisitorOpen).not.toHaveBeenCalled();
});

test('explicit Enable requests native permission once; denial does not open phone settings automatically', async () => {
  mock(syncPushRegistration).mockResolvedValue('disabled');
  await render();
  const press = button('Enable notifications').props.onPress;
  await act(async () => { press(); press(); });
  expect(syncPushRegistration).toHaveBeenCalledTimes(1);
  expect(syncPushRegistration).toHaveBeenCalledWith(true);
  expect(Linking.openSettings).not.toHaveBeenCalled();
  expect(button('Open phone notification settings')).toBeDefined();
  await act(async () => button('Open phone notification settings').props.onPress());
  expect(Linking.openSettings).toHaveBeenCalledTimes(1);
});

test('enabled visitor notifications can be turned off from the same card', async () => {
  mock(visitorPushEnabled).mockResolvedValue(true); mock(pushPermission).mockResolvedValue('enabled');
  await render();
  await act(async () => button('Turn off notifications').props.onPress());
  expect(disableVisitorNotifications).toHaveBeenCalledTimes(1);
  expect(syncPushRegistration).not.toHaveBeenCalled();
});

test('closing during session lookup cancels a not-yet-started permission request', async () => {
  await render();
  let finish!: (value: null) => void;
  mock(getAuthToken).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => button('Enable notifications').props.onPress());
  await act(async () => button('Close notifications').props.onPress());
  await act(async () => finish(null));
  expect(syncPushRegistration).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('signed-in session uses its existing inbox and does not attribute visitor opens', async () => {
  mock(getAuthToken).mockResolvedValue('member-session');
  await render();
  await act(async () => button(event.title).props.onPress());
  expect(recordVisitorOpen).not.toHaveBeenCalled();
  await act(async () => button('Manage notifications').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('MemberNotifications');
  expect(syncPushRegistration).not.toHaveBeenCalled();
});

test('failed loading offers retry and closing blocks late detail/read side effects', async () => {
  mock(getPublicNotices).mockRejectedValueOnce(Error('offline'));
  await render();
  expect(button('Try again')).toBeDefined();
  await act(async () => button('Try again').props.onPress());
  let finish!: (value: any) => void;
  mock(getPublicNotice).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => button(event.title).props.onPress());
  await act(async () => screen!.root.findByType(Modal).props.onRequestClose());
  await act(async () => finish(event));
  expect(recordVisitorOpen).not.toHaveBeenCalled();
});

test('legacy notification route redirects to the public home card', async () => {
  await act(async () => { screen = Renderer.create(<PublicNotificationsScreen navigation={navigation} route={{ params: { id: event.id } }} />); });
  expect(navigation.replace).toHaveBeenCalledWith('PublicExplore', { notifications: 'open', noticeId: event.id });
  expect(screen!.toJSON()).toBeNull();
});
