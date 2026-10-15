import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, TouchableOpacity } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import SuperUpdateEditorScreen from '../src/screens/admin/super/SuperUpdateEditorScreen';
import { ConsoleButton, PremiumInput, PremiumSelect, FitImage } from '../src/ui';
import { createAnnouncement, updateAnnouncement, listMembershipPlans, uploadCmsMedia, uploadEventAttachment } from '../src/services/superApi';
import { pickEventDocument } from '../src/services/eventDocuments';

let mockParams: any = {};
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }), useRoute: () => ({ params: mockParams }),
}));
jest.mock('../src/services/superApi', () => ({
  createAnnouncement: jest.fn(), updateAnnouncement: jest.fn(), listMembershipPlans: jest.fn(),
  uploadCmsMedia: jest.fn(), uploadEventAttachment: jest.fn(), errorText: (error: any) => error?.message || 'Request failed',
}));
jest.mock('../src/services/eventDocuments', () => ({ pickEventDocument: jest.fn() }));
jest.mock('../src/screens/admin/super/superKit', () => ({
  ...jest.requireActual('../src/screens/admin/super/superKit'),
  useRegionTreeAll: () => [], useRegionNames: () => ({ states: ['Tamil Nadu'], districts: ['Chennai'], blocks: ['Central'] }),
}));

let screen: Renderer.ReactTestRenderer;
const mount = async () => { await act(async () => { screen = Renderer.create(<SuperUpdateEditorScreen />); }); };
const button = (label: string) => screen.root.findAllByType(ConsoleButton).find(node => node.props.label === label)!;
const field = (label: string) => screen.root.findAllByType(PremiumInput).find(node => node.props.label === label)!;
const fill = async (label: string, value: string) => { await act(async () => { field(label).props.onChangeText(value); }); };
const press = async (label: string) => { await act(async () => { await button(label).props.onPress(); }); };
const chooseAudience = async (label: string) => {
  await act(async () => { screen.root.findAllByType(PremiumSelect).find(node => node.props.label === 'Members')!.props.onChange(label); });
};

beforeEach(() => {
  jest.clearAllMocks(); mockParams = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (createAnnouncement as jest.Mock).mockResolvedValue({ id: 'new' });
  (updateAnnouncement as jest.Mock).mockResolvedValue({ id: 'existing' });
  (listMembershipPlans as jest.Mock).mockResolvedValue({ plans: [
    { key: 'business-growth', name: 'Business Growth', active: true, audience: 'business' },
    { key: 'aspirant', name: 'Aspirant', active: true, audience: 'aspirant' },
    { key: 'business-legacy', name: 'Legacy Business', active: false, audience: 'business' },
  ] });
  (uploadCmsMedia as jest.Mock).mockResolvedValue({ url: '/uploads/poster.jpg', type: 'image' });
  (uploadEventAttachment as jest.Mock).mockResolvedValue({ url: '/uploads/guide.pdf', name: 'Membership guide.pdf' });
});
afterEach(async () => { if (screen) await act(async () => { screen.unmount(); }); });

it('supports a text-only non-student update and sends no stale plan filters', async () => {
  mockParams = { announcement: { id: 'existing', title: 'Renewal', body: 'Dear members, thank you.', audience: 'plans', planKeys: ['business-growth'], status: 'draft' } };
  await mount();
  await chooseAudience('Paid members excluding students');
  await press('Publish update');
  expect(updateAnnouncement).toHaveBeenCalledWith('existing', expect.objectContaining({
    audience: 'paid_non_student', planKeys: [], status: 'published', bannerUrl: '', attachmentUrl: '',
  }));
  expect(mockGoBack).toHaveBeenCalled();
  expect(screen.root.findAllByType(PremiumInput).some(node => /URL/i.test(node.props.label))).toBe(false);
});

it('allows a title-only draft but rejects a title-only publication', async () => {
  await mount(); await fill('Title', 'Next membership meeting');
  await press('Publish update');
  expect(createAnnouncement).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Check your update', expect.stringContaining('Add a message'));
  await press('Save draft');
  expect(createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ title: 'Next membership meeting', status: 'draft' }));
});

it('requires a selected plan and supports active and retired plans by catalogue key', async () => {
  await mount(); await fill('Title', 'Business benefits'); await fill('Message', 'Dear members, your benefits are ready.');
  await chooseAudience('Specific membership plans');
  await press('Publish update');
  expect(createAnnouncement).not.toHaveBeenCalled();
  for (const label of ['Business Growth', 'Legacy Business']) {
    await act(async () => {
      screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityRole === 'checkbox' && node.props.accessibilityLabel === label)!.props.onPress();
    });
  }
  await press('Publish update');
  expect(createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ audience: 'plans', planKeys: ['business-growth', 'business-legacy'] }));
});

it('waits for image upload, previews the full poster and saves the uploaded media', async () => {
  let finishPick!: (value: any) => void;
  (launchImageLibrary as jest.Mock).mockReturnValue(new Promise(resolve => { finishPick = resolve; }));
  await mount(); await fill('Title', 'Membership plans');
  await act(async () => { void button('Upload image').props.onPress(); });
  expect(button('Publish update').props.disabled).toBe(true);
  await press('Publish update');
  expect(createAnnouncement).not.toHaveBeenCalled();
  await act(async () => { finishPick({ assets: [{ uri: 'file:///poster.jpg', fileName: 'poster.jpg', type: 'image/jpeg' }] }); });
  expect(uploadCmsMedia).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///poster.jpg' }));
  expect(screen.root.findAllByType(FitImage)[0].props.fit).not.toBe('cover');
  await press('Preview update');
  expect(screen.root.findAllByType(FitImage)).toHaveLength(2);
  await press('Publish update');
  expect(createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ bannerUrl: '/uploads/poster.jpg', status: 'published' }));
});

it('preserves existing files on a failed replacement and explicitly clears removed media', async () => {
  mockParams = { announcement: { id: 'existing', title: 'A guide', body: 'Please read.', bannerUrl: '/old.jpg', bannerAlt: 'Existing poster', attachmentUrl: '/old.pdf', attachmentLabel: 'Old guide', status: 'published' } };
  (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: 'file:///new.jpg' }] });
  (uploadCmsMedia as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));
  (pickEventDocument as jest.Mock).mockResolvedValue({ uri: 'file:///guide.pdf', fileName: 'guide.pdf', type: 'application/pdf' });
  await mount(); await press('Replace image');
  expect(screen.root.findAllByType(FitImage)[0].props.uri).toContain('/old.jpg');
  await press('Replace document');
  expect(field('Document name').props.value).toBe('Membership guide.pdf');
  await press('Remove image'); await press('Remove document'); await press('Save & publish');
  expect(updateAnnouncement).toHaveBeenCalledWith('existing', expect.objectContaining({ bannerUrl: '', bannerAlt: '', attachmentUrl: '', attachmentLabel: '' }));
});
