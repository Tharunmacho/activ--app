import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import ApplicantDetailScreen from '../src/screens/admin/ApplicantDetailScreen';
import PersonalDetailsFormScreen from '../src/screens/profile/PersonalDetailsFormScreen';
import { PremiumInput } from '../src/ui';
import { FormFooter, SelectField } from '../src/screens/profile/formKit';
import { profileCompletion } from '../src/screens/member/dashboard/memberRules';
import api from '../src/services/api';

let mockProfile: any;
let mockApplication: any;
jest.mock('../src/services/api', () => ({
  __esModule: true, default: {
    get: jest.fn((url: string) => Promise.resolve({ data: { data: url.includes('/applications/') ? mockApplication : mockProfile } })),
    put: jest.fn(() => Promise.resolve({ data: { data: {} } })),
  },
}));
jest.mock('../src/services/regions', () => ({
  getStates: jest.fn().mockResolvedValue(['Tamil Nadu']), getDistricts: jest.fn().mockResolvedValue(['Krishnagiri']),
  getBlocks: jest.fn().mockResolvedValue(['Hosur']), fetchRegionTree: jest.fn().mockResolvedValue([{ name: 'Tamil Nadu', districts: [{ name: 'Krishnagiri', blocks: [{ name: 'Hosur' }] }] }]),
}));
const nav: any = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
let screen: Renderer.ReactTestRenderer;
const texts = () => screen.root.findAllByType(Text).map(node => String(node.props.children || ''));
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockProfile = { fullName: 'Local Applicant', email: 'local@example.test', phoneNumber: '9123456780', state: 'Tamil Nadu', district: 'Krishnagiri', block: 'Hosur', city: 'Hosur' };
  mockApplication = { _id: 'local-app', fullName: mockProfile.fullName, data: { personalDetails: { ...mockProfile } } };
});
afterEach(async () => { if (screen) await act(async () => { screen.unmount(); }); });

it('shows missing legacy demographics explicitly in admin application details', async () => {
  await act(async () => { screen = Renderer.create(<ApplicantDetailScreen navigation={nav} route={{ params: { applicant: { id: 'local-app' } } } as any} />); });
  const copy = texts();
  expect(copy).toContain('Religion'); expect(copy).toContain('Social Category'); expect(copy).toContain('Gender');
  expect(copy.filter(text => text === 'Not provided')).toHaveLength(3);
});

it('keeps demographics visible for an aspirant and shows the submitted values', async () => {
  mockApplication = { ...mockApplication, memberType: 'aspirant', registrationType: 'aspirant',
    data: { personalDetails: { ...mockProfile, religion: 'Hindu', socialCategory: 'SC', gender: 'Male' }, businessInfo: { doingBusiness: false } } };
  await act(async () => { screen = Renderer.create(<ApplicantDetailScreen navigation={nav} route={{ params: { applicant: { id: 'local-app' } } } as any} />); });
  expect(texts()).toEqual(expect.arrayContaining(['Religion', 'Hindu', 'Social Category', 'SC', 'Gender', 'Male']));
  expect(texts()).not.toContain('Not provided');
});

it('unlocks legacy incomplete forms and refuses to skip required demographics', async () => {
  mockProfile = { ...mockProfile, isLocked: true, personalDetailsComplete: false };
  await act(async () => { screen = Renderer.create(<PersonalDetailsFormScreen navigation={nav} route={{ params: {} } as any} />); });
  const religion = screen.root.findAllByType(SelectField).find(node => node.props.label === 'Social category');
  expect(religion?.props.disabled).toBe(false);
  const name = screen.root.findAllByType(PremiumInput).find(node => node.props.label === 'Full name');
  expect(name?.props.editable).toBe(true);
  await act(async () => { await screen.root.findByType(FormFooter).props.onPrimary(); });
  expect(api.put).not.toHaveBeenCalled();
  expect(nav.navigate).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Missing details', expect.any(String));
});

it('does not count a registration name as a completed Personal Details form', () => {
  expect(profileCompletion(mockProfile, null, null, null).completed).not.toContain('Personal Details');
  expect(profileCompletion({ ...mockProfile, personalDetailsComplete: false }, null, null, null).percent).toBe(0);
  expect(profileCompletion({ ...mockProfile, personalDetailsComplete: true }, null, null, null).completed).toContain('Personal Details');
});
