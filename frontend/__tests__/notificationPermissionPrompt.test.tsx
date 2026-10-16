import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, AppState, Modal, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationPermissionPrompt, { NOTIFICATION_WELCOME_KEY } from '../src/components/NotificationPermissionPrompt';
import { getAuthToken } from '../src/services/api';
import { enablePushFromSettings, enableVisitorNotifications, firebaseReady } from '../src/services/pushNotifications';

jest.mock('../src/services/api', () => ({ getAuthToken: jest.fn() }));
jest.mock('../src/services/pushNotifications', () => ({ enablePushFromSettings: jest.fn(), enableVisitorNotifications: jest.fn(), firebaseReady: jest.fn() }));
jest.mock('../src/ui', () => {
  const actual = jest.requireActual('../src/ui');
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return { ...actual, GradientButton: ({ label, onPress, disabled }: any) => <Pressable accessibilityLabel={label} onPress={onPress} disabled={disabled}><Text>{label}</Text></Pressable> };
});

let tree: Renderer.ReactTestRenderer | undefined;
let appStateListener: (state: string) => void;
const visible = () => tree!.root.findByType(Modal).props.visible;
const render = async (ready = true) => { await act(async () => { tree = Renderer.create(<NotificationPermissionPrompt ready={ready} />); }); };
const button = (label: string) => {
  const match = tree!.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  if (!match) throw new Error(`Missing button ${label}; visible=${visible()}; tree=${JSON.stringify(tree!.toJSON())}`);
  return match;
};
const press = async (label: string) => { await act(async () => { button(label).props.onPress(); }); };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (getAuthToken as jest.Mock).mockReset().mockResolvedValue(null);
  (firebaseReady as jest.Mock).mockReturnValue(true);
  (enableVisitorNotifications as jest.Mock).mockReset().mockResolvedValue(undefined);
  (enablePushFromSettings as jest.Mock).mockReset().mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { appStateListener = listener as any; return { remove: jest.fn() }; });
});
afterEach(async () => { if (tree) await act(async () => { tree!.unmount(); tree = undefined; }); jest.restoreAllMocks(); });

test('waits for restored home entry and explains notifications without asking the OS', async () => {
  await render(false);
  expect(visible()).toBe(false);
  await act(async () => tree!.update(<NotificationPermissionPrompt ready />));
  expect(visible()).toBe(true);
  expect(tree!.root.findAllByType(Text).some(node => node.props.children === 'Stay updated')).toBe(true);
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
  expect(enablePushFromSettings).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(NOTIFICATION_WELCOME_KEY, expect.anything());
});

test('Later persists only the dismissal and does not appear on the next app entry', async () => {
  await render(); await press('Later');
  expect(visible()).toBe(false);
  expect(await AsyncStorage.getItem(NOTIFICATION_WELCOME_KEY)).toBe('later');
  expect(await AsyncStorage.getItem('@activ_visitor_push_enabled')).toBeNull();
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
  expect(enablePushFromSettings).not.toHaveBeenCalled();
  await act(async () => { tree!.unmount(); tree = undefined; });
  await render(); expect(visible()).toBe(false);
});

test('Allow registers a visitor only after the explicit gesture and suppresses repeated taps', async () => {
  await render();
  const allow = button('Allow notifications').props.onPress;
  await act(async () => { allow(); allow(); });
  expect(enableVisitorNotifications).toHaveBeenCalledTimes(1);
  expect(enablePushFromSettings).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(NOTIFICATION_WELCOME_KEY)).toBe('allowed');
  expect(visible()).toBe(false);
});

test('Allow reads the latest account session and registers a restored signed-in member', async () => {
  await render();
  (getAuthToken as jest.Mock).mockResolvedValue('restored-member-token');
  await press('Allow notifications');
  expect(enablePushFromSettings).toHaveBeenCalledTimes(1);
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
  expect(visible()).toBe(false);
});

test.each([
  ['@activ_push_permission_asked', 'true'],
  ['@activ_visitor_push_enabled', 'false'],
  ['@activ_visitor_push_enabled', 'true'],
  [NOTIFICATION_WELCOME_KEY, 'later'],
])('does not override an earlier permission or app choice in %s (%s)', async (key, value) => {
  await AsyncStorage.setItem(key, value);
  await render();
  expect(visible()).toBe(false);
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
  expect(enablePushFromSettings).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(key)).toBe(value);
});

test('an older Android automatic FCM token alone is not treated as a welcome choice', async () => {
  await AsyncStorage.setItem('@activ_push_token', 'automatically-created-token');
  await render(); expect(visible()).toBe(true);
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
});

test('registration failure offers recovery from the bell without a repeated permission loop', async () => {
  (enableVisitorNotifications as jest.Mock).mockRejectedValue(new Error('Offline'));
  await render(); await press('Allow notifications');
  expect(Alert.alert).toHaveBeenCalledWith('Could not enable notifications', expect.stringContaining('bell'));
  expect(visible()).toBe(false);
  await act(async () => { tree!.unmount(); tree = undefined; });
  await render(); expect(visible()).toBe(false);
  expect(enableVisitorNotifications).toHaveBeenCalledTimes(1);
});

test('hardware back acts as Later and backgrounding hides without changing consent', async () => {
  await render();
  await act(async () => appStateListener('background'));
  expect(visible()).toBe(false);
  expect(await AsyncStorage.getItem(NOTIFICATION_WELCOME_KEY)).toBeNull();
  await act(async () => appStateListener('active'));
  expect(visible()).toBe(true);
  await act(async () => tree!.root.findByType(Modal).props.onRequestClose());
  expect(await AsyncStorage.getItem(NOTIFICATION_WELCOME_KEY)).toBe('later');
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
});

test('does not prompt for a build without Firebase and stops a pending session lookup on unmount', async () => {
  (firebaseReady as jest.Mock).mockReturnValue(false);
  await render(); expect(visible()).toBe(false);
  await act(async () => { tree!.unmount(); tree = undefined; });
  (firebaseReady as jest.Mock).mockReturnValue(true);
  let resolveToken!: (token: string | null) => void;
  (getAuthToken as jest.Mock).mockReturnValue(new Promise(resolve => { resolveToken = resolve; }));
  await render(); await press('Allow notifications');
  await act(async () => { tree!.unmount(); tree = undefined; });
  await act(async () => resolveToken('member-token'));
  expect(enablePushFromSettings).not.toHaveBeenCalled();
  expect(enableVisitorNotifications).not.toHaveBeenCalled();
});
