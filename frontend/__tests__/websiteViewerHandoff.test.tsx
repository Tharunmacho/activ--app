import React from 'react';
import Renderer from 'react-test-renderer';
import { Linking } from 'react-native';
import WebsiteViewer from '../src/screens/member/website/WebsiteViewerScreen';
import { nativeContentRoute } from '../src/services/nativeContentRoute';
import { openWebsitePage } from '../src/services/websiteNavigation';
import { getAuthToken, getUserRole } from '../src/services/api';
import { clearPublicAction, takePublicAction } from '../src/services/publicNavigation';
import { readPublicCms, submitPublicCms } from '../src/services/publicContent';

jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, getAuthToken: jest.fn(), getUserRole: jest.fn() }));
jest.mock('../src/services/session', () => ({ homeForRole: jest.fn().mockResolvedValue('PaidDashboard') }));
jest.mock('../src/services/publicContent', () => ({
  readPublicCms: jest.fn().mockResolvedValue([]), submitPublicCms: jest.fn(), getPublicEvent: jest.fn().mockResolvedValue({ id: 'event-123' }),
}));
let screen: Renderer.ReactTestRenderer;
const navigation = { navigate: jest.fn(), push: jest.fn(), reset: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
beforeEach(() => { jest.clearAllMocks(); clearPublicAction(); (getAuthToken as jest.Mock).mockResolvedValue('fixture-token'); (getUserRole as jest.Mock).mockResolvedValue('member'); });
afterEach(async () => { await Renderer.act(async () => screen?.unmount()); });

test.each(['/gallery', '/gallery/album/photo/2', '/news', '/news/story', '/zones', '/regions/south', '/states/tamil-nadu', '/states/tamil-nadu/events', '/schemes', '/schemes/state/tamil-nadu', '/schemes/view/example'])('CMS content %s resolves to a native content screen', path => {
  expect(nativeContentRoute(path, 'Content')).toEqual({ name: 'PublicContent', params: { path, title: 'Content' } });
  openWebsitePage(navigation, 'https://activ.org.in' + path, 'Content');
  expect(navigation.push).toHaveBeenCalledWith('PublicContent', { path, title: 'Content' });
  expect(getAuthToken).not.toHaveBeenCalled();
});
test.each(['/about', '/membership', '/contact', '/privacy-policy', '/legal/privacy-policy', '/delete-account'])('information %s resolves to native content', path => {
  expect(nativeContentRoute(path, 'Information')).toEqual({ name: 'PublicInfo', params: { path, title: 'Information' } });
});
test('existing saved WebsiteViewer links show native content without loading an ACTIV website', async () => {
  await Renderer.act(async () => { screen = Renderer.create(<WebsiteViewer navigation={navigation} route={{ params: { path: '/news', title: 'News' } }} />); });
  expect(readPublicCms).toHaveBeenCalledWith('/cms/news', expect.anything(), undefined);
  expect(screen.root.findAll(node => !!node.props.source?.uri && /activ\.org\.in/.test(node.props.source.uri))).toHaveLength(0);
  expect(getAuthToken).not.toHaveBeenCalled();
  expect(submitPublicCms).not.toHaveBeenCalled();
});
test('contact links and official portals open their own services; internal source links stay native', async () => {
  const external = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  try {
    for (const href of ['tel:+919999999999', 'mailto:events@activ.org.in', 'https://government.example/scheme']) {
      openWebsitePage(navigation, href, 'Contact');
      expect(external).toHaveBeenLastCalledWith(href);
    }
    openWebsitePage(navigation, 'https://activ.org.in/news/story', 'Story');
    expect(navigation.push).toHaveBeenLastCalledWith('PublicContent', { path: '/news/story', title: 'Story' });
    for (const href of ['javascript:alert(1)', '//evil.example/path', '/bad%00path']) openWebsitePage(navigation, href);
    expect(external).toHaveBeenCalledTimes(3);
  } finally { external.mockRestore(); }
});
test('membership and booking actions continue native authentication and resume once', async () => {
  await Renderer.act(async () => openWebsitePage(navigation, '/events/event-123/book', 'Book'));
  expect(navigation.navigate).toHaveBeenCalledWith('EventBooking', { eventId: 'event-123' });
  expect(navigation.push).not.toHaveBeenCalled();
  (getAuthToken as jest.Mock).mockResolvedValue(null); (getUserRole as jest.Mock).mockResolvedValue(null);
  await Renderer.act(async () => openWebsitePage(navigation, '/membership/join', 'Join'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Login');
  expect(takePublicAction()).toEqual({ name: 'MembershipPlans' }); expect(takePublicAction()).toBeNull();
});
