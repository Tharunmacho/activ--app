import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Switch, TouchableOpacity } from 'react-native';
import AppUpdateSettings from '../src/screens/admin/super/AppUpdateSettings';
import { ConsoleButton, PremiumInput } from '../src/ui';
import api from '../src/services/api';

jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('../src/services/superApi', () => ({ errorText: (error: any) => error?.response?.data?.message || error?.message || 'Request failed' }));

const policy = { enabled: true, requireLatestAvailable: true, minimumVersionCode: 1, message: 'Please update ACTIV to continue.' };
const response = (value: unknown) => ({ data: { success: true, data: value } });
let screen: Renderer.ReactTestRenderer;
const mount = async () => { await act(async () => { screen = Renderer.create(<AppUpdateSettings />); }); };
const text = () => JSON.stringify(screen.toJSON());
const button = (label = 'Save update settings') => screen.root.findAllByType(ConsoleButton).find(node => node.props.label === label)!;
const field = (label: string) => screen.root.findAllByType(PremiumInput).find(node => node.props.label === label)!;
const toggle = (label: string) => screen.root.findAllByType(Switch).find(node => node.props.accessibilityLabel === label)!;
const confirmControl = () => screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Required release is available in Google Play')!;
const confirm = async () => { await act(async () => { confirmControl().props.onPress(); }); };
const fill = async (label: string, value: string) => { await act(async () => { field(label).props.onChangeText(value); }); };
const press = async (label?: string) => { await act(async () => { await button(label).props.onPress(); }); };

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockResolvedValue(response(policy));
  (api.put as jest.Mock).mockImplementation(async (_url, value) => response(value));
});
afterEach(async () => { if (screen) await act(async () => { screen.unmount(); }); });

it('loads enabled, automatic-latest, minimum-1 settings with no acknowledgement carried over', async () => {
  await mount();
  expect(api.get).toHaveBeenCalledWith('/app-updates/admin');
  expect(toggle('Require app updates').props.value).toBe(true);
  expect(toggle('Require each new Play release').props.value).toBe(true);
  expect(field('Minimum Android build number').props.value).toBe('1');
  expect(button().props.disabled).toBe(true);
  expect(confirmControl().props.accessibilityState.checked).toBe(false);
  expect(text()).toContain('Older apps without this check');
});

it('defaults a legacy missing automatic-latest setting to true', async () => {
  (api.get as jest.Mock).mockResolvedValue(response({ enabled: true, minimumVersionCode: 1, message: policy.message }));
  await mount();
  expect(toggle('Require each new Play release').props.value).toBe(true);
});

it('requires an explicit release acknowledgement and sends the exact policy payload', async () => {
  await mount();
  // The handler also guards against programmatic bypass of the disabled control.
  await press(); expect(api.put).not.toHaveBeenCalled();
  expect(text()).toContain('Confirm the required release is available in Google Play');
  await fill('Message shown to members', '  Update to see the new features.  ');
  await confirm(); expect(button().props.disabled).toBe(false);
  await press();
  expect(api.put).toHaveBeenCalledWith('/app-updates/admin', { ...policy, message: 'Update to see the new features.', productionAvailableConfirmed: true });
  expect(text()).toContain('Android update settings saved.');
  expect(confirmControl().props.accessibilityState.checked).toBe(false);
  expect(button().props.disabled).toBe(true);
});

it('invalidates acknowledgement when the minimum or automatic-latest rule changes', async () => {
  await mount(); await confirm();
  await fill('Minimum Android build number', '42');
  expect(button().props.disabled).toBe(true);
  await confirm();
  await act(async () => { toggle('Require each new Play release').props.onValueChange(false); });
  expect(button().props.disabled).toBe(true);
  await confirm(); await press();
  expect(api.put).toHaveBeenCalledWith('/app-updates/admin', { ...policy, minimumVersionCode: 42, requireLatestAvailable: false, productionAvailableConfirmed: true });
});

it.each(['', '0', '-1', '1.5', '1e3', ' 5 ', '2100000001', '9007199254740993'])('rejects invalid build number %p without writing', async value => {
  await mount(); await fill('Minimum Android build number', value); await confirm(); await press();
  expect(api.put).not.toHaveBeenCalled();
  expect(text()).toContain('Enter a valid positive Android build number');
});

it('allows disabling the gate without acknowledgement and locks inputs until the write settles', async () => {
  let finish!: (value: unknown) => void;
  (api.put as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { toggle('Require app updates').props.onValueChange(false); });
  expect(confirmControl()).toBeUndefined();
  expect(button().props.disabled).toBe(false);
  await act(async () => { void button().props.onPress(); });
  expect(button().props.disabled).toBe(true);
  expect(toggle('Require app updates').props.disabled).toBe(true);
  expect(field('Minimum Android build number').props.editable).toBe(false);
  expect(api.put).toHaveBeenCalledWith('/app-updates/admin', { ...policy, enabled: false, productionAvailableConfirmed: false });
  await act(async () => { finish(response({ ...policy, enabled: false })); });
  expect(button().props.disabled).toBe(false);
  expect(text()).toContain('Android update settings saved.');
});

it('reports failed reads and retries without exposing a save control first', async () => {
  (api.get as jest.Mock).mockRejectedValueOnce(new Error('Settings unavailable')).mockResolvedValueOnce(response(policy));
  await mount();
  expect(text()).toContain('Settings unavailable'); expect(button()).toBeUndefined();
  await press('Retry update settings');
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(toggle('Require app updates').props.value).toBe(true);
});

it('reports a failed save, preserves edited policy, and permits retry after the error', async () => {
  (api.put as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'Unable to save policy' } } }).mockResolvedValueOnce(response({ ...policy, minimumVersionCode: 55 }));
  await mount(); await fill('Minimum Android build number', '55'); await confirm(); await press();
  expect(text()).toContain('Unable to save policy');
  expect(text()).not.toContain('Android update settings saved.');
  expect(field('Minimum Android build number').props.value).toBe('55');
  expect(button().props.disabled).toBe(false);
  await press();
  expect(api.put).toHaveBeenCalledTimes(2);
  expect(text()).toContain('Android update settings saved.');
});

it('rejects a malformed policy response instead of showing editable settings', async () => {
  (api.get as jest.Mock).mockResolvedValue(response({ ...policy, minimumVersionCode: '12' }));
  await mount();
  expect(text()).toContain('Could not load Android update settings');
  expect(button()).toBeUndefined();
  expect(button('Retry update settings')).toBeDefined();
});
