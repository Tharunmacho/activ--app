import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, Linking } from 'react-native';
import api from '../src/services/api';
import { clearSession, homeForRole } from '../src/services/session';
import { useAuthStore } from '../src/stores/exampleStore';
import { API_BASE_URL } from '../src/config/api.config';
import { parseDeepLink } from '../src/navigation/deepLinks';
import LoginScreen from '../src/screens/auth/LoginScreen';
import SocialSignInScreen from '../src/screens/auth/SocialSignInScreen';
import * as publicNavigation from '../src/services/publicNavigation';

jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../src/services/session', () => ({
  clearSession: jest.fn().mockResolvedValue(undefined),
  homeForRole: jest.fn(), sanitizeUser: (user: any) => user,
  isAdminRole: (role: string) => role.includes('admin'),
  UNSUPPORTED_ACCOUNT_MESSAGE: 'Please use the ACTIV website.',
}));
jest.mock('../src/stores/exampleStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../src/navigation/navigationRef', () => ({ navigationRef: { isReady: () => false } }));

const providers = ['Google', 'Facebook', 'LinkedIn'];
const navigation = () => ({ reset: jest.fn(), navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() });
const text = (tree: Renderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());
let tree: Renderer.ReactTestRenderer;
let login = jest.fn();
const mount = async (screen: React.ReactElement) => {
  await act(async () => { tree = Renderer.create(screen); });
};
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers();
  login = jest.fn().mockResolvedValue(undefined);
  (useAuthStore as unknown as jest.Mock).mockReturnValue({ login });
  (api.get as jest.Mock).mockResolvedValue({ data: { data: providers.map(label => ({ key: label.toLowerCase(), label, enabled: true })) } });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.useRealTimers(); jest.restoreAllMocks();
});

test.each(['Skip sign-in', 'Explore ACTIV'])('%s opens guest browsing without creating a session', async label => {
  const clearIntent = jest.spyOn(publicNavigation, 'clearPublicAction');
  const nav = navigation();
  await mount(<LoginScreen navigation={nav as any} />);
  const button = tree.root.findAll(node => (node.props.accessibilityLabel === label || node.props.label === label) && typeof node.props.onPress === 'function')[0];
  await act(async () => button.props.onPress());
  expect(clearIntent).toHaveBeenCalledTimes(1);
  expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'PublicExplore' }] });
  expect(api.post).not.toHaveBeenCalled();
  expect(login).not.toHaveBeenCalled();
});

test.each(providers)('%s opens backend login in the system browser and parses its return', async provider => {
  await mount(<LoginScreen navigation={navigation() as any} />);
  const button = tree.root.findAll(node => node.props.accessibilityLabel === `Sign in with ${provider}` && typeof node.props.onPress === 'function')[0];
  expect(button.props.disabled).toBe(false);
  await act(async () => { await button.props.onPress(); });
  expect(Linking.openURL).toHaveBeenCalledWith(`${API_BASE_URL}/auth/oauth/${provider.toLowerCase()}/start?client=app`);
  expect(parseDeepLink(`activ://auth/social?code=single-use-code&provider=${provider.toLowerCase()}`)).toEqual({
    name: 'SocialSignIn', params: { code: 'single-use-code', provider: provider.toLowerCase(), error: '', email: '', name: '' },
  });
});

test.each(providers)('%s exchanges a callback once and opens the paid dashboard', async provider => {
  const nav = navigation();
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { token: 'session-token', role: 'member', user: { fullName: 'Test Member' }, memberDetails: { membershipStatus: 'active' } } } });
  (homeForRole as jest.Mock).mockResolvedValue('PaidDashboard');
  const props = { navigation: nav, route: { params: { code: 'single-use-code', provider: provider.toLowerCase() } } };
  await mount(<SocialSignInScreen {...props as any} />);
  await act(async () => { tree.update(<SocialSignInScreen {...props as any} />); });
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/auth/oauth/exchange', { code: 'single-use-code' });
  expect(clearSession).toHaveBeenCalled();
  expect(login).toHaveBeenCalledWith({ fullName: 'Test Member' }, 'session-token', 'member');
  await act(async () => { jest.advanceTimersByTime(950); });
  expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'PaidDashboard' }] });
});

test('a pending member returns to their unpaid dashboard', async () => {
  const nav = navigation();
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { token: 'session-token', role: 'member', user: {}, memberDetails: { membershipStatus: 'pending' } } } });
  (homeForRole as jest.Mock).mockResolvedValue('MemberMain');
  await mount(<SocialSignInScreen navigation={nav as any} route={{ params: { code: 'new-code', provider: 'linkedin' } } as any} />);
  expect(homeForRole).toHaveBeenCalledWith('member', { membershipStatus: 'pending' });
  await act(async () => { jest.advanceTimersByTime(950); });
  expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MemberMain' }] });
});

test.each(providers)('%s errors name the right provider', async provider => {
  await mount(<SocialSignInScreen navigation={navigation() as any} route={{ params: { error: 'configuration', provider: provider.toLowerCase() } } as any} />);
  expect(text(tree)).toContain(`${provider} rejected the sign-in configuration`);
  expect(api.post).not.toHaveBeenCalled();
});

test('missing LinkedIn permissions are explained', async () => {
  await mount(<SocialSignInScreen navigation={navigation() as any} route={{ params: { error: 'permissions', provider: 'linkedin' } } as any} />);
  expect(text(tree)).toContain('LinkedIn has not enabled the email and profile permissions');
});

test.each(['no_email', 'email_permission', 'facebook_no_email'])('Facebook %s offers consent retry and an ordinary login fallback', async error => {
  const nav = navigation();
  await mount(<SocialSignInScreen navigation={nav as any} route={{ params: { error, provider: 'facebook' } } as any} />);
  const button = (label: string) => tree.root.findAll(node => node.props.label === label && typeof node.props.onPress === 'function')[0];
  await act(async () => { await button('Try Facebook again').props.onPress(); });
  expect(Linking.openURL).toHaveBeenCalledWith(`${API_BASE_URL}/auth/oauth/facebook/start?client=app`);
  expect(api.post).not.toHaveBeenCalled();
  expect(login).not.toHaveBeenCalled();
  await act(async () => { button('Use email and password').props.onPress(); });
  expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
});

test('Facebook retry failure leaves the email login available', async () => {
  (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('browser unavailable'));
  await mount(<SocialSignInScreen navigation={navigation() as any} route={{ params: { error: 'email_permission', provider: 'facebook' } } as any} />);
  const button = tree.root.findAll(node => node.props.label === 'Try Facebook again' && typeof node.props.onPress === 'function')[0];
  await act(async () => { await button.props.onPress(); });
  expect(text(tree)).toContain('Could not open Facebook');
  expect(text(tree)).toContain('Use email and password');
  expect(login).not.toHaveBeenCalled();
});

test('a new social member opens registration with their email and name', async () => {
  const nav = navigation();
  await mount(<SocialSignInScreen navigation={nav as any} route={{ params: { error: 'no_account', provider: 'facebook', email: 'new@example.test', name: 'New Member' } } as any} />);
  const button = tree.root.findAll(node => node.props.label === 'Create an account' && typeof node.props.onPress === 'function')[0];
  await act(async () => { button.props.onPress(); });
  expect(nav.replace).toHaveBeenCalledWith('RegistrationStep1', { email: 'new@example.test', name: 'New Member' });
  expect(api.post).not.toHaveBeenCalled();
});

test('an expired or rejected exchange keeps the sign-in error screen', async () => {
  const nav = navigation();
  (api.post as jest.Mock).mockRejectedValue(new Error('That sign-in has expired. Please try again.'));
  await mount(<SocialSignInScreen navigation={nav as any} route={{ params: { code: 'old-code', provider: 'google' } } as any} />);
  expect(text(tree)).toContain('That sign-in has expired');
  expect(login).not.toHaveBeenCalled(); expect(nav.reset).not.toHaveBeenCalled();
});

test('missing provider credentials do not open an unusable browser flow', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: [{ key: 'facebook', enabled: false }] } });
  await mount(<LoginScreen navigation={navigation() as any} />);
  const button = tree.root.findAll(node => node.props.accessibilityLabel === 'Sign in with Facebook' && typeof node.props.onPress === 'function')[0];
  await act(async () => { await button.props.onPress(); });
  expect(Linking.openURL).not.toHaveBeenCalled(); expect(Alert.alert).toHaveBeenCalled();
});
