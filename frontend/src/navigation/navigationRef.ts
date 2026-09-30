import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types';

/**
 * The root navigator, reachable from outside React components — so the HTTP
 * layer can send someone back to the right sign-in screen when their session
 * has expired, instead of leaving them on a screen whose every request fails.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Replace the whole stack with one screen (no back to the dead session). */
export const resetTo = (name: keyof RootStackParamList) => {
  try {
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: name as any }] });
    }
  } catch (err) {
    console.warn('Navigation reset safely caught:', err);
  }
};
