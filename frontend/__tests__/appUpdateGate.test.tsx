import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, Text, type AppStateStatus } from 'react-native';
import AppUpdateGate from '../src/components/AppUpdateGate';
import { PrimaryButton, SecondaryButton } from '../src/ui';
import { checkAppUpdate, openAppUpdateStore } from '../src/services/appUpdates';

jest.mock('../src/services/appUpdates', () => ({
  checkAppUpdate: jest.fn(),
  openAppUpdateStore: jest.fn(),
}));
let screen: Renderer.ReactTestRenderer;
let foreground: (state: AppStateStatus) => void;
const required = {
  required: true,
  versionCode: 26,
  policy: { message: 'Install the new ACTIV release.' },
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_name, callback) => {
      foreground = callback;
      return { remove: jest.fn() };
    });
  (checkAppUpdate as jest.Mock).mockResolvedValue(required);
  (openAppUpdateStore as jest.Mock).mockResolvedValue(undefined);
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
});
const mount = async () => {
  await act(async () => {
    screen = Renderer.create(
      <AppUpdateGate>
        <Text>Private app content</Text>
      </AppUpdateGate>,
    );
  });
};
const copy = () =>
  screen.root
    .findAllByType(Text)
    .map(node => String(node.props.children || ''))
    .join(' ');
it('blocks app content without a dismiss action, opens Play and rechecks after return', async () => {
  await mount();
  expect(copy()).toContain('Update required');
  expect(copy()).not.toContain('Private app content');
  await act(async () => {
    await screen.root
      .findAllByType(PrimaryButton)
      .find(node => node.props.label === 'Update on Google Play')!
      .props.onPress();
  });
  expect(openAppUpdateStore).toHaveBeenCalledTimes(1);
  expect(copy()).not.toContain('Private app content');
  (checkAppUpdate as jest.Mock).mockResolvedValue({ required: false });
  await act(async () => {
    foreground('active');
  });
  expect(copy()).toContain('Private app content');
});
it('retains the gate after canceled/failed store launch and supports explicit retry', async () => {
  (openAppUpdateStore as jest.Mock).mockRejectedValue(
    new Error('Google Play could not be opened.'),
  );
  await mount();
  await act(async () => {
    await screen.root
      .findAllByType(PrimaryButton)
      .find(node => node.props.label === 'Update on Google Play')!
      .props.onPress();
  });
  expect(copy()).toContain('Google Play could not be opened.');
  expect(copy()).not.toContain('Private app content');
  await act(async () => {
    await screen.root.findByType(SecondaryButton).props.onPress();
  });
  expect(checkAppUpdate).toHaveBeenCalledTimes(2);
});
