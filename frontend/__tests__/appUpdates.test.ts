import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import api from '../src/services/api';
import {
  APP_PACKAGE,
  APP_PLAY_URL,
  UPDATE_CACHE_KEY,
  checkAppUpdate,
  installedAndroidBuild,
  openAppUpdateStore,
} from '../src/services/appUpdates';

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
const policy = {
  enabled: true,
  requireLatestAvailable: true,
  minimumVersionCode: 1,
  message: 'Please update.',
  packageName: APP_PACKAGE,
  playUrl: APP_PLAY_URL,
  updatedAt: null,
};
const response = (data: unknown) => ({ data: { data } });
const native = {
  versionCode: 26,
  versionName: '1.0.25',
  packageName: APP_PACKAGE,
  checkAvailability: jest.fn(),
  openStore: jest.fn(),
};
const setCache = (value: unknown) =>
  AsyncStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(value));
const cached = async () =>
  JSON.parse((await AsyncStorage.getItem(UPDATE_CACHE_KEY)) || '{}');
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  NativeModules.AppUpdate = native;
  native.versionCode = 26;
  (api.get as jest.Mock).mockResolvedValue(response(policy));
  native.checkAvailability.mockResolvedValue({
    available: true,
    availableVersionCode: 27,
  });
  native.openStore.mockResolvedValue(true);
});

it('requires every genuinely offered newer Play version using native installed versionCode', async () => {
  expect(installedAndroidBuild()?.versionCode).toBe(26);
  expect((await checkAppUpdate()).required).toBe(true);
  expect((await cached()).proof).toEqual({
    installedVersionCode: 26,
    availableVersionCode: 27,
  });
  expect(api.get).toHaveBeenCalledWith('/app-updates/android', {
    timeout: 5000,
  });
  native.versionCode = 27;
  expect((await checkAppUpdate()).required).toBe(false);
  expect((await cached()).proof).toBeUndefined();
  native.checkAvailability.mockResolvedValue({
    available: true,
    availableVersionCode: 28,
  });
  expect((await checkAppUpdate()).required).toBe(true);
});

it('does not gate a staged/unpublished release unavailable to this device', async () => {
  (api.get as jest.Mock).mockResolvedValue(
    response({
      ...policy,
      requireLatestAvailable: false,
      minimumVersionCode: 30,
    }),
  );
  expect((await checkAppUpdate()).required).toBe(false);
  native.checkAvailability.mockResolvedValue({
    available: true,
    availableVersionCode: 30,
  });
  expect((await checkAppUpdate()).required).toBe(true);
  native.checkAvailability.mockResolvedValue({
    available: false,
    availableVersionCode: 0,
  });
  expect((await checkAppUpdate()).required).toBe(false);
  expect((await cached()).proof).toBeUndefined();
});

it('fails open on first network/Play failure, but keeps a confirmed requirement through transient failures', async () => {
  (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
  native.checkAvailability.mockRejectedValue(new Error('Play offline'));
  expect((await checkAppUpdate()).required).toBe(false);
  await setCache({
    policy,
    proof: { installedVersionCode: 26, availableVersionCode: 27 },
  });
  expect((await checkAppUpdate()).required).toBe(true);
  native.checkAvailability.mockResolvedValue({
    available: false,
    availableVersionCode: 0,
  });
  expect((await checkAppUpdate()).required).toBe(false);
  native.checkAvailability.mockRejectedValue(new Error('Play offline'));
  expect((await checkAppUpdate()).required).toBe(false);
});

it('honors a disabled policy and ignores malformed/cross-package identity or proof', async () => {
  await setCache({
    policy,
    proof: { installedVersionCode: 26, availableVersionCode: 27 },
  });
  (api.get as jest.Mock).mockResolvedValue(
    response({ ...policy, enabled: false }),
  );
  expect((await checkAppUpdate()).required).toBe(false);
  expect((await cached()).proof).toBeUndefined();
  await AsyncStorage.clear();
  (api.get as jest.Mock).mockResolvedValue(
    response({ ...policy, packageName: 'other.app' }),
  );
  expect((await checkAppUpdate()).required).toBe(false);
  await setCache({
    policy,
    proof: { installedVersionCode: 25, availableVersionCode: 27 },
  });
  (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
  native.checkAvailability.mockRejectedValue(new Error('offline'));
  expect((await checkAppUpdate()).required).toBe(false);
  NativeModules.AppUpdate = undefined;
  expect(installedAndroidBuild()).toBeNull();
  expect((await checkAppUpdate()).required).toBe(false);
});

it('opens only the native fixed-package Play action and reports launch failure', async () => {
  await openAppUpdateStore();
  expect(native.openStore).toHaveBeenCalledWith();
  native.openStore.mockRejectedValue(new Error('No activity'));
  await expect(openAppUpdateStore()).rejects.toThrow(
    'Google Play could not be opened',
  );
});

it('bounds hung checks and coalesces launch/foreground checks while preserving confirmed requirements', async () => {
  jest.useFakeTimers();
  try {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    native.checkAvailability.mockImplementation(() => new Promise(() => {}));
    const first = checkAppUpdate();
    expect(checkAppUpdate()).toBe(first);
    await jest.advanceTimersByTimeAsync(5000);
    expect((await first).required).toBe(false);
    await setCache({
      policy,
      proof: { installedVersionCode: 26, availableVersionCode: 27 },
    });
    const confirmed = checkAppUpdate();
    await jest.advanceTimersByTimeAsync(5000);
    expect((await confirmed).required).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});
