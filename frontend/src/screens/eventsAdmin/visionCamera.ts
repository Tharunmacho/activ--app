/**
 * react-native-vision-camera, loaded defensively.
 *
 * The library THROWS AT IMPORT when its native module is missing — a JS bundle
 * running on a binary built before the dependency was added, or a platform it
 * does not support. A top-level `import` would take the whole app down with
 * it (CLAUDE.md Rule 2.4: verify a native module exists before calling it).
 * So it is required lazily, once, inside try/catch; the scanner screen falls
 * back to manual entry when it is unavailable.
 */
let cached: any = null;
let failure = '';

export const loadVisionCamera = (): any => {
  if (cached || failure) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-vision-camera');
    const ok = mod
      && typeof mod.Camera !== 'undefined'
      && typeof mod.useCameraDevice === 'function'
      && typeof mod.useCameraPermission === 'function'
      && typeof mod.useCodeScanner === 'function';
    if (ok) cached = mod;
    else failure = 'The camera library is incomplete.';
  } catch (err: any) {
    failure = String(err?.message || err || 'Camera unavailable');
    console.warn('Native module call safely caught:', failure);
  }
  return cached;
};

export const visionCameraError = (): string => failure;
