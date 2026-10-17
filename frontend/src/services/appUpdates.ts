import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import api from './api';

export const APP_PACKAGE = 'in.activ.membership';
export const APP_PLAY_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;
export const UPDATE_CACHE_KEY = '@activ_android_update_policy_v1';
export interface AppUpdatePolicy {
  enabled: boolean;
  requireLatestAvailable: boolean;
  minimumVersionCode: number;
  message: string;
  packageName: string;
  playUrl: string;
  updatedAt: string | null;
}
interface AvailabilityProof {
  installedVersionCode: number;
  availableVersionCode: number;
}
interface CachedPolicy {
  policy: AppUpdatePolicy;
  proof?: AvailabilityProof;
}
export interface AppUpdateDecision {
  required: boolean;
  policy?: AppUpdatePolicy;
  versionCode?: number;
}

const positiveCode = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= 2100000000;
export function parseUpdatePolicy(value: unknown): AppUpdatePolicy | null {
  const row = value as Partial<AppUpdatePolicy> | null;
  if (
    !row ||
    typeof row.enabled !== 'boolean' ||
    typeof row.requireLatestAvailable !== 'boolean' ||
    !positiveCode(row.minimumVersionCode) ||
    row.packageName !== APP_PACKAGE ||
    row.playUrl !== APP_PLAY_URL ||
    typeof row.message !== 'string' ||
    row.message.length > 500
  )
    return null;
  return {
    enabled: row.enabled,
    requireLatestAvailable: row.requireLatestAvailable,
    minimumVersionCode: row.minimumVersionCode,
    message: row.message.trim() || 'Please update ACTIV to continue.',
    packageName: APP_PACKAGE,
    playUrl: APP_PLAY_URL,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}
export function installedAndroidBuild(): {
  versionCode: number;
  versionName: string;
} | null {
  try {
    const native = NativeModules.AppUpdate;
    if (
      Platform.OS !== 'android' ||
      native?.packageName !== APP_PACKAGE ||
      !positiveCode(native?.versionCode)
    )
      return null;
    return {
      versionCode: native.versionCode,
      versionName: String(native.versionName || ''),
    };
  } catch {
    return null;
  }
}
const deadline = async <T>(operation: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Update check timed out')),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
function proofApplies(
  policy: AppUpdatePolicy,
  proof: AvailabilityProof | undefined,
  versionCode: number,
) {
  if (
    !policy.enabled ||
    proof?.installedVersionCode !== versionCode ||
    !positiveCode(proof?.availableVersionCode) ||
    proof.availableVersionCode <= versionCode
  )
    return false;
  return (
    policy.requireLatestAvailable ||
    (versionCode < policy.minimumVersionCode &&
      proof.availableVersionCode >= policy.minimumVersionCode)
  );
}
async function performCheck(): Promise<AppUpdateDecision> {
  const build = installedAndroidBuild();
  if (!build) return { required: false };
  const native = NativeModules.AppUpdate;
  // All three reads are bounded and independent. A first-time network/Play
  // failure never creates an update requirement from a guessed build number.
  const [cachedResult, policyResult, playResult] = await Promise.allSettled([
    deadline(AsyncStorage.getItem(UPDATE_CACHE_KEY), 2000),
    deadline(
      api
        .get('/app-updates/android', { timeout: 5000 })
        .then(response =>
          parseUpdatePolicy(response.data?.data ?? response.data),
        ),
      5000,
    ),
    deadline(
      Promise.resolve().then(() => {
        if (typeof native?.checkAvailability !== 'function')
          throw new Error('Play check unavailable');
        return native.checkAvailability() as Promise<{
          available: boolean;
          availableVersionCode: number;
        }>;
      }),
      5000,
    ),
  ]);
  let cached: CachedPolicy | null = null;
  if (cachedResult.status === 'fulfilled' && cachedResult.value) {
    try {
      const raw = JSON.parse(cachedResult.value);
      const policy = parseUpdatePolicy(raw?.policy);
      if (policy) cached = { policy, proof: raw.proof };
    } catch {
      /* A corrupt cache is not an update requirement. */
    }
  }
  const policy =
    policyResult.status === 'fulfilled' && policyResult.value
      ? policyResult.value
      : cached?.policy;
  if (!policy) return { required: false, versionCode: build.versionCode };
  let proof = cached?.proof;
  if (playResult.status === 'fulfilled') {
    const play = playResult.value;
    if (play?.available === false)
      proof =
        undefined; // A withdrawn/unavailable rollout clears stale confirmation.
    else if (
      play?.available === true &&
      positiveCode(play.availableVersionCode)
    ) {
      proof =
        play.availableVersionCode > build.versionCode
          ? {
              installedVersionCode: build.versionCode,
              availableVersionCode: play.availableVersionCode,
            }
          : undefined;
    }
  }
  if (!policy.enabled || proof?.installedVersionCode !== build.versionCode)
    proof = undefined;
  const required = proofApplies(policy, proof, build.versionCode);
  // Store policy and proof together; an unrelated available release must never
  // establish a requirement for a different installed build or package.
  await deadline(
    AsyncStorage.setItem(
      UPDATE_CACHE_KEY,
      JSON.stringify({ policy, ...(proof ? { proof } : {}) }),
    ),
    2000,
  ).catch(() => {});
  return { required, policy, versionCode: build.versionCode };
}
let inFlight: Promise<AppUpdateDecision> | null = null;
export function checkAppUpdate(): Promise<AppUpdateDecision> {
  if (!inFlight)
    inFlight = performCheck()
      .catch(() => ({ required: false }))
      .finally(() => {
        inFlight = null;
      });
  return inFlight;
}
export async function openAppUpdateStore(): Promise<void> {
  try {
    if (
      !installedAndroidBuild() ||
      typeof NativeModules.AppUpdate?.openStore !== 'function'
    )
      throw new Error();
    await NativeModules.AppUpdate.openStore();
  } catch {
    throw new Error('Google Play could not be opened. Please try again.');
  }
}
