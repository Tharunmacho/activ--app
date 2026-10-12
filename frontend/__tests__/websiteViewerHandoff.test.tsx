import React from 'react';
import Renderer from 'react-test-renderer';
import { Linking } from 'react-native';
import ExploreActiv from '../src/screens/member/dashboard/ExploreActiv';
import MemberMenu from '../src/screens/member/MemberMenuScreen';
import AccountSettings from '../src/screens/member/settings/AccountSettingsScreen';
import WebsiteViewer from '../src/screens/member/website/WebsiteViewerScreen';
import api, { getAuthToken, getUserRole } from '../src/services/api';
import { clearPublicAction, takePublicAction } from '../src/services/publicNavigation';
import { WEBSITE_ORIGIN } from '../src/config/website.config';

const mockWebBack = jest.fn();
jest.mock('react-native-webview', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return { WebView: ReactLib.forwardRef((props: any, ref: any) => {
    ReactLib.useImperativeHandle(ref, () => ({ goBack: mockWebBack }));
    return <View {...props} />;
  }) };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => any) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getAuthToken: jest.fn(),
  getUserRole: jest.fn(),
}));
jest.mock('../src/services/session', () => ({
  homeForRole: jest.fn().mockResolvedValue('PaidDashboard'),
  clearSession: jest.fn(),
}));
jest.mock('../src/services/memberApi', () => ({
  getMyApplications: jest.fn().mockResolvedValue([]),
  getMyProfile: jest.fn().mockResolvedValue({ fullName: 'Test member', membershipStatus: 'active' }),
  isPaidMember: jest.fn().mockReturnValue(true),
  logoutOnServer: jest.fn(),
}));
jest.mock('../src/services/publicContent', () => ({
  getPublicEvent: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011' }),
}));
jest.mock('../src/services/websiteContent', () => ({ FALLBACK_NAV: [], FALLBACK_LEGAL: [] }));
jest.mock('../src/stores/exampleStore', () => ({ useAuthStore: () => ({ logout: jest.fn() }) }));
jest.mock('../src/screens/member/useMemberAccess', () => ({
  useMemberAccess: () => ({ profile: { fullName: 'Test member', membershipNumber: 'ACTIV-TEST' }, paid: true, loading: false }),
  useLockedCta: () => ({ label: 'Complete membership' }),
  runMembershipCta: jest.fn(),
}));

let screen: Renderer.ReactTestRenderer;
const navigation = { navigate: jest.fn(), reset: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
const press = (label: string) => screen.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress();
const browser = () => screen.root.findAll(node => !!node.props.source?.uri && typeof node.props.onShouldStartLoadWithRequest === 'function')[0];

beforeEach(() => {
  jest.clearAllMocks();
  clearPublicAction();
  (getAuthToken as jest.Mock).mockResolvedValue('native-session-fixture');
  (getUserRole as jest.Mock).mockResolvedValue('member');
});
afterEach(async () => { await Renderer.act(async () => screen?.unmount()); });

test.each(['dashboard', 'menu'])('signed-in %s Explore keeps web reads anonymous and resumes actions in native', async entry => {
  await Renderer.act(async () => {
    screen = Renderer.create(entry === 'dashboard'
      ? <ExploreActiv navigation={navigation} sections={['intro']} />
      : <MemberMenu navigation={navigation} />);
  });
  await Renderer.act(async () => press(entry === 'dashboard' ? 'Discover ACTIV. Open the About page.' : 'Explore ACTIV website'));
  const [name, params] = navigation.navigate.mock.calls[0];
  expect(name).toBe('WebsiteViewer');
  expect(params.publicAccess).toBe(true);

  await Renderer.act(async () => screen.unmount());
  await Renderer.act(async () => { screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params }} />); });
  const web = browser();
  expect(web.props.source.uri).toContain('activApp=public');
  expect(web.props.source.headers).toBeUndefined();
  expect(web.props.incognito).toBe(true);
  expect(web.props.sharedCookiesEnabled).toBe(false);
  expect(JSON.stringify(web.props.source)).not.toContain('native-session-fixture');
  expect(web.props.injectedJavaScriptBeforeContentLoaded).not.toContain('native-session-fixture');
  expect(getAuthToken).not.toHaveBeenCalled();
  expect(web.props.onShouldStartLoadWithRequest({ url: 'https://activ.org.in/news/community', isTopFrame: true })).toBe(true);

  navigation.navigate.mockClear();
  await Renderer.act(async () => {
    expect(web.props.onShouldStartLoadWithRequest({ url: 'https://activ.org.in/events/conference/book', isTopFrame: true })).toBe(false);
  });
  expect(navigation.navigate).toHaveBeenCalledWith('EventBooking', { eventId: '507f1f77bcf86cd799439011' });
  expect(navigation.navigate).not.toHaveBeenCalledWith('Login');
  expect(takePublicAction()).toBeNull();

  navigation.navigate.mockClear();
  await Renderer.act(async () => web.props.onMessage({ nativeEvent: {
    url: 'https://activ.org.in/about', data: JSON.stringify({ type: 'ACTIV_MEMBER_ACTION', path: '/donate' }),
  } }));
  expect(navigation.navigate).toHaveBeenCalledWith('MemberDonations', undefined);
});

test('an expired native session asks for login and saves the protected destination once', async () => {
  (getAuthToken as jest.Mock).mockResolvedValue(null);
  (getUserRole as jest.Mock).mockResolvedValue(null);
  await Renderer.act(async () => {
    screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params: { path: '/about', publicAccess: true } }} />);
  });
  await Renderer.act(async () => browser().props.onMessage({ nativeEvent: {
    url: 'https://activ.org.in/about', data: JSON.stringify({ type: 'ACTIV_MEMBER_ACTION', path: '/membership/join' }),
  } }));
  expect(navigation.navigate).toHaveBeenCalledWith('Login');
  expect(takePublicAction()).toEqual({ name: 'MembershipPlans' });
  expect(takePublicAction()).toBeNull();
});

test('external page messages cannot trigger native account actions', async () => {
  await Renderer.act(async () => {
    screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params: { path: '/news', publicAccess: true } }} />);
  });
  await Renderer.act(async () => browser().props.onMessage({ nativeEvent: {
    url: 'https://other.example/news', data: JSON.stringify({ type: 'ACTIV_MEMBER_ACTION', path: '/login' }),
  } }));
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(getAuthToken).not.toHaveBeenCalled();
});

test('public pages follow internal links, hand contact links to the phone and return through history', async () => {
  const external = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  try {
    await Renderer.act(async () => { screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params: { path: '/membership#advantages', title: 'Membership', publicAccess: true } }} />); });
    expect(browser().props.source.uri).toBe(WEBSITE_ORIGIN + '/membership?activApp=public#advantages');
    for (const path of ['/about', '/membership#advantages', '/schemes/central', '/schemes/state/tamil-nadu', '/regions/south', '/states/tamil-nadu#contact', '/contact']) {
      expect(browser().props.onShouldStartLoadWithRequest({ url: WEBSITE_ORIGIN + path, isTopFrame: true })).toBe(true);
    }
    await Renderer.act(async () => browser().props.onNavigationStateChange({ url: WEBSITE_ORIGIN + '/schemes/central', title: 'Central schemes', canGoBack: true }));
    await Renderer.act(async () => press('Previous page'));
    expect(mockWebBack).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
    for (const url of ['mailto:info@activ.org.in', 'tel:+910000000000', 'https://government.example/scheme']) {
      await Renderer.act(async () => expect(browser().props.onShouldStartLoadWithRequest({ url, isTopFrame: true })).toBe(false));
      expect(external).toHaveBeenLastCalledWith(url);
    }
    await Renderer.act(async () => browser().props.onNavigationStateChange({ url: WEBSITE_ORIGIN + '/membership', canGoBack: false }));
    await Renderer.act(async () => press('Close'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(getAuthToken).not.toHaveBeenCalled();
  } finally { external.mockRestore(); }
});

test('opening another public page clears the previous failure, title and browser history', async () => {
  await Renderer.act(async () => { screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params: { path: '/schemes', title: 'Schemes', publicAccess: true } }} />); });
  await Renderer.act(async () => browser().props.onNavigationStateChange({ url: WEBSITE_ORIGIN + '/schemes/central', title: 'Central schemes', canGoBack: true }));
  await Renderer.act(async () => browser().props.onError());
  expect(browser()).toBeUndefined();
  await Renderer.act(async () => { screen.update(<WebsiteViewer navigation={navigation} route={{ params: { path: '/contact#contact', title: 'Contact us', publicAccess: true } }} />); });
  expect(browser().props.source.uri).toBe(WEBSITE_ORIGIN + '/contact?activApp=public#contact');
  expect(screen.root.findAll(node => node.props.children === 'Contact us').length).toBeGreaterThan(0);
  await Renderer.act(async () => press('Close'));
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockWebBack).not.toHaveBeenCalled();
});

test('account settings opens the existing anonymous deletion form without submitting a request', async () => {
  await Renderer.act(async () => { screen = Renderer.create(<AccountSettings navigation={navigation} />); });
  await Renderer.act(async () => press('Delete account. Request account and data deletion'));
  expect(navigation.navigate).toHaveBeenCalledWith('WebsiteViewer', {
    path: '/delete-account', title: 'Delete account', publicAccess: true,
  });
  const params = navigation.navigate.mock.calls[0][1];
  await Renderer.act(async () => screen.unmount());
  await Renderer.act(async () => { screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params }} />); });
  expect(browser().props.source).toEqual({ uri: WEBSITE_ORIGIN + '/delete-account?activApp=public' });
  expect(browser().props.incognito).toBe(true);
  expect(browser().props.onShouldStartLoadWithRequest({ url: 'https://activ.org.in/delete-account', isTopFrame: true })).toBe(true);
  expect(getAuthToken).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});
