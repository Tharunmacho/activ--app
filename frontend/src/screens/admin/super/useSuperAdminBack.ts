import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

/**
 * One back behaviour for every Super Admin tab, on screen and on the device.
 *
 * These screens are bottom tabs with `headerShown: false`, so nothing supplies a
 * back affordance and Android's hardware/gesture back was unhandled. That made
 * back destructive in two different ways: drilled three levels into a region's
 * applications, or half-way through an admin form, the gesture skipped straight
 * past all of it and popped the whole navigator — closing the app rather than
 * closing what was actually open.
 *
 * A screen passes `onBack`, which returns:
 *
 *   `true`  — "I handled it": a level was closed, a form dismissed, a tab
 *             switched. Nothing else happens.
 *   `false` — "nothing left to close": the hook falls back to the Hub tab, and
 *             on the Hub itself it lets the system take the press, so back from
 *             the home tab still backgrounds the app the way Android expects.
 *
 * Registered through `useFocusEffect` so exactly one handler is live at a time.
 * A tab that stays mounted in the background must not keep intercepting the
 * press — that is how a back tap starts affecting a screen the user cannot see.
 *
 * The returned `goBack` is the same logic bound to the header arrow, so the
 * button and the gesture can never disagree.
 */
export const useSuperAdminBack = (
  onBack?: () => boolean,
  options: { isHome?: boolean } = {},
) => {
  const navigation = useNavigation<any>();
  const isHome = !!options.isHome;

  const goBack = useCallback((): boolean => {
    if (typeof onBack === 'function' && onBack()) return true;

    // Nothing of this screen's own was open. From a secondary tab that means
    // "go home"; from the Hub it means the app should handle it.
    if (isHome) return false;

    try {
      navigation.navigate('Hub');
      return true;
    } catch (err) {
      // Navigating can only fail if this screen is not inside the Super Admin
      // tabs. Letting the system have the press is the safe answer.
      return false;
    }
  }, [onBack, isHome, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => subscription.remove();
    }, [goBack]),
  );

  return goBack;
};

export default useSuperAdminBack;
