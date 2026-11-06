import React from 'react';
import { Alert } from 'react-native';
import Renderer from 'react-test-renderer';
import { ConsoleButton, PremiumInput } from '../src/ui';
import api from '../src/services/api';
import ManageAdmins from '../src/screens/admin/super/ManageAdminsScreen';

jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return { useFocusEffect: (callback: () => any) => ReactLib.useEffect(callback, [callback]) };
});
jest.mock('../src/screens/admin/super/useSuperAdminBack', () => ({ useSuperAdminBack: () => jest.fn() }));
jest.mock('../src/screens/admin/shared/TierMenu', () => ({ MenuButton: () => null }));
jest.mock('../src/hooks/useRegionCascade', () => ({
  useRegionCascade: () => ({ state: '', district: '', block: '', states: [], districts: [], blocks: [],
    setState: jest.fn(), setDistrict: jest.fn(), setBlock: jest.fn(), error: '' }),
}));
jest.mock('../src/services/regions', () => ({ getGeography: jest.fn(async () => ({ states: [] })), invalidateRegionCache: jest.fn() }));
jest.mock('../src/services/superApi', () => ({
  listStaffAccounts: jest.fn(async () => []), updateStaffAccount: jest.fn(), errorText: (error: any) => error.message,
}));
jest.mock('../src/services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), post: jest.fn() } }));

let screen: Renderer.ReactTestRenderer;
const put = api.put as jest.Mock;
const field = (label: string) => screen.root.findAllByType(PremiumInput).find(node => node.props.label === label)!;
const press = async (label: string) => {
  const button = screen.root.findAllByType(ConsoleButton).find(node => node.props.label === label)!;
  await Renderer.act(async () => { await button.props.onPress(); });
};

beforeEach(async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  put.mockReset().mockResolvedValue({ data: { data: {} } });
  (api.get as jest.Mock).mockReset().mockImplementation(async (url: string) => ({ data: { data:
    url.endsWith('/regions') ? {} : {
      admins: [{ id: 'kerala-admin', fullName: 'Kerala State Admin', email: 'kerala-old@example.test',
        notificationEmail: 'member@activ.org.in', phoneNumber: '', role: 'state_admin', state: 'Kerala',
        district: '', block: '', active: true }],
      counts: { all: 1, state_admin: 1 }, total: 1, pagination: { page: 1, pages: 1 },
    },
  } }));
  await Renderer.act(async () => { screen = Renderer.create(<ManageAdmins route={{ params: {} }} />); });
  await press('Edit');
});

afterEach(async () => {
  await Renderer.act(async () => screen?.unmount());
  jest.restoreAllMocks();
});

test('shows the stored destination and does not resend an unchanged override when the login email changes', async () => {
  expect(field('Notification email (optional)').props.value).toBe('member@activ.org.in');
  await Renderer.act(async () => field('Email Address').props.onChangeText('kerala-new@example.test'));
  await press('Save changes');
  expect(put).toHaveBeenCalledWith('/admin/super/admins/kerala-admin', expect.objectContaining({ email: 'kerala-new@example.test' }));
  expect(put.mock.calls[0][1]).not.toHaveProperty('notificationEmail');
});

test('saves an explicitly edited notification address independently from the login email', async () => {
  await Renderer.act(async () => field('Notification email (optional)').props.onChangeText(' Office@Example.Test '));
  await press('Save changes');
  expect(put.mock.calls[0][1]).toMatchObject({ email: 'kerala-old@example.test', notificationEmail: 'office@example.test' });
});

test('sends an explicit empty value when switching notifications back to the account email', async () => {
  await Renderer.act(async () => field('Notification email (optional)').props.onChangeText(''));
  await press('Save changes');
  expect(put.mock.calls[0][1]).toMatchObject({ notificationEmail: '' });
});

test('prevents saving a malformed notification address', async () => {
  await Renderer.act(async () => field('Notification email (optional)').props.onChangeText('not-an-email'));
  await press('Save changes');
  expect(put).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Invalid email', expect.any(String));
});
