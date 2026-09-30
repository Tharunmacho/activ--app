// Onboarding Screen — the premium brand pager (four slides, custom vector art)
import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { homeForRole, clearSession } from '../../services/session';
import { RootStackParamList } from '../../types';
import {
  PALETTE, SPACE,
  BRAND, BrandBackdrop, BrandLogo, GradientButton, PressableScale, FloatingIllustration, FadeInUp, useReduceMotion,
  MembershipBenefits3D, EventCalendar3D, UdyamVerify3D, NetworkGrowth3D,
} from '../../ui';

/**
 * ============================================================================
 * ONBOARDING — four slides on the brand gradient
 * ============================================================================
 *
 * Visual layer only: the session restore, the slide list, Skip / Next /
 * Get Started and their targets are unchanged.
 *
 *   top ~55%  navy→blue backdrop with drifting waves into white, logo + Skip
 *             on it, each slide's own vector illustration floating in the middle
 *   bottom    white: step count, title, description; animated pager dots;
 *             Skip + gradient Next / Get Started
 *
 * Paging: the illustration and the copy move at different speeds from the
 * page (parallax) and fade across the swipe; the active dot is a pill that
 * slides with the scroll. All on the native driver; under reduce-motion the
 * parallax and scale are dropped (the page still swipes).
 */

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  art: React.ComponentType<{ size?: number }>;
}

const RAW_SLIDES: OnboardingSlide[] = [
  {
    id: 'slide-membership',
    title: 'Membership Benefits',
    description: 'Join to access multi-level memberships and commercial opportunities.',
    art: MembershipBenefits3D,
  },
  {
    id: 'slide-event',
    title: 'Event Management',
    description: 'Register for business events, workshops, and receive updates.',
    art: EventCalendar3D,
  },
  {
    id: 'slide-udyam',
    title: 'Udyam Integration',
    description: 'Highlight optional Udyam validation for MSME entrepreneurs.',
    art: UdyamVerify3D,
  },
  {
    id: 'slide-networking',
    title: 'Networking & Growth',
    description: 'Connect, collaborate, and expand your enterprise network.',
    art: NetworkGrowth3D,
  },
];

/** Share of the screen the gradient takes (waves included). */
const HERO_RATIO = 0.55;
const WAVE_H = 64;
const TOP_BAR = 56;
const DOT = 8;
// Wide enough that the active pill (2.5 dots wide) never touches a neighbour.
const DOT_GAP = 16;

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const flatListRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    /*
     * RESTORE A SIGNED-IN SESSION — the same routing as a fresh sign-in
     * (services/session.ts): members to the paid or unpaid dashboard by their
     * CURRENT payment state, admins to their own dashboard. The token is
     * checked with the server first (GET /auth/me); a session that is no
     * longer valid goes to the sign-in screen it belongs to, and an account
     * the app does not serve (events admin, CMS) is signed out.
     */
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@activ_auth_token');
        const role = await AsyncStorage.getItem('@activ_user_role');
        // Older builds kept the password in plain text: never leave it behind.
        await AsyncStorage.removeItem('@activ_user_password').catch(() => null);

        if (!token || !role) {
          setIsCheckingAuth(false);
          return;
        }

        try {
          await api.get(ENDPOINTS.AUTH.PROFILE);
        } catch (err: any) {
          if (err?.response?.status === 401) {
            // The API layer has already cleared it and redirected.
            return;
          }
          // Offline / server unreachable: keep the session and continue — the
          // screens show their own retry states.
        }

        const home = await homeForRole(role);
        // A deep link (social sign-in, password reset) opened another screen
        // over this one while the check ran — leave the member there.
        if (typeof navigation.isFocused === 'function' && !navigation.isFocused()) return;
        if (!home) {
          await clearSession();
          setIsCheckingAuth(false);
          return;
        }
        navigation.reset({ index: 0, routes: [{ name: home }] });
      } catch {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigation]);

  const slides = useMemo(() => {
    const seenTitles = new Set<string>();
    return RAW_SLIDES.filter((slide) => {
      if (seenTitles.has(slide.title)) {
        return false;
      }
      seenTitles.add(slide.title);
      return true;
    });
  }, []);

  const handleMomentumScrollEnd = (event: any) => {
    const scrollPosition = event?.nativeEvent?.contentOffset?.x || 0;
    const index = Math.round(scrollPosition / width);
    if (index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.replace('Login');
    }
  };

  const top = Number(insets?.top || 0);
  const bottom = Number(insets?.bottom || 0);
  const heroH = Math.round(height * HERO_RATIO);
  // The art fits the space between the top bar and the waves.
  const artSize = Math.max(150, Math.min(width * 0.7, heroH - top - TOP_BAR - WAVE_H + 24, 280));

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX],
  );

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const Art = item?.art;
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    const fade = scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' });
    const artMotion = reduceMotion ? [] : [
      { translateX: scrollX.interpolate({ inputRange: range, outputRange: [width * 0.45, 0, -width * 0.45], extrapolate: 'clamp' }) },
      { scale: scrollX.interpolate({ inputRange: range, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' }) },
    ];
    const textMotion = reduceMotion ? [] : [
      { translateX: scrollX.interpolate({ inputRange: range, outputRange: [width * 0.25, 0, -width * 0.25], extrapolate: 'clamp' }) },
    ];
    const total = slides.length;
    return (
      <View style={styles.slide}>
        <View style={[styles.hero, { height: heroH, paddingTop: top + TOP_BAR, paddingBottom: WAVE_H - 16 }]}>
          <Animated.View style={{ opacity: fade, transform: artMotion }}>
            <FloatingIllustration size={artSize} amplitude={10} delay={index * 200}>
              {Art ? <Art size={artSize} /> : null}
            </FloatingIllustration>
          </Animated.View>
        </View>
        <Animated.View style={[styles.textContainer, { opacity: fade, transform: textMotion }]}>
          <Text style={styles.count} maxFontSizeMultiplier={1.3}>
            {String(index + 1).padStart(2, '0')}
            <Text style={styles.countOf}> / {String(total).padStart(2, '0')}</Text>
          </Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.25} accessibilityRole="header">{item?.title || ''}</Text>
          <Text style={styles.description} maxFontSizeMultiplier={1.3}>{item?.description || ''}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    const step = DOT + DOT_GAP;
    const indicatorX = scrollX.interpolate({
      inputRange: [0, Math.max(1, (slides.length - 1) * width)],
      outputRange: [0, Math.max(0, (slides.length - 1) * step)],
      extrapolate: 'clamp',
    });
    return (
      <View
        style={styles.paginationContainer}
        accessibilityRole="progressbar"
        accessibilityLabel={`Slide ${currentIndex + 1} of ${slides.length}`}
      >
        <View style={styles.dotsRow}>
          {slides.map((_, index) => (
            <View key={index} style={styles.dot} />
          ))}
          <Animated.View style={[styles.activeDot, { transform: [{ translateX: indicatorX }] }]} />
        </View>
      </View>
    );
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.navyDeep} />
        <BrandBackdrop tone="member" waveColor={BRAND.navyDeep} waveHeight={0} style={StyleSheet.absoluteFill} />
        <FadeInUp scaleFrom={0.9} style={styles.loadingCenter}>
          <BrandLogo variant="disc" />
          <ActivityIndicator color={PALETTE.white} style={{ marginTop: SPACE.xl }} />
          <Text style={styles.loadingText}>Loading...</Text>
        </FadeInUp>
      </View>
    );
  }

  const last = currentIndex === slides.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.navyDeep} />
      <BrandBackdrop
        tone="member"
        waveColor={PALETTE.white}
        waveHeight={WAVE_H}
        style={[styles.backdrop, { height: heroH }]}
      />

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item: OnboardingSlide, index: number) => String(item?.id || index)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        style={styles.list}
      />

      {/* The logo sits on the gradient, above the pager. */}
      <View style={[styles.topBar, { top: top + SPACE.sm }]} pointerEvents="none">
        <BrandLogo size="sm" />
      </View>

      <View style={[styles.controls, { paddingBottom: Math.max(bottom, SPACE.lg) + SPACE.md }]}>
        {renderPagination()}

        <View style={styles.buttonContainer}>
          <PressableScale
            onPress={handleSkip}
            style={styles.skipButton}
            contentStyle={styles.skipInner}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.skipButtonText} maxFontSizeMultiplier={1.3}>Skip</Text>
          </PressableScale>

          <GradientButton
            label={last ? 'Get Started' : 'Next'}
            iconRight={last ? 'arrow-forward' : 'chevron-right'}
            onPress={handleNext}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.white },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  list: { flex: 1 },
  slide: { width, flex: 1 },
  hero: { alignItems: 'center', justifyContent: 'center' },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACE.xxl,
    paddingTop: SPACE.sm,
  },
  count: { fontSize: 13, lineHeight: 18, fontWeight: '800', letterSpacing: 1.5, color: BRAND.blue, marginBottom: SPACE.sm },
  countOf: { color: PALETTE.textFaint, fontWeight: '700' },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: PALETTE.text,
    marginBottom: SPACE.sm + 2,
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  description: {
    fontSize: 16,
    color: PALETTE.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  topBar: {
    position: 'absolute',
    left: SPACE.lg,
    right: SPACE.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controls: { paddingHorizontal: SPACE.xl, backgroundColor: PALETTE.white },
  paginationContainer: { alignItems: 'center', paddingVertical: SPACE.lg },
  dotsRow: { flexDirection: 'row', gap: DOT_GAP },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#E2E8F0' },
  activeDot: {
    position: 'absolute',
    left: -DOT * 0.75,
    top: 0,
    width: DOT * 2.5,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: BRAND.blue,
  },
  buttonContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  skipButton: { minWidth: 72 },
  skipInner: { minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE.md },
  skipButtonText: { color: BRAND.blue, fontSize: 15, fontWeight: '700' },
  nextButton: { flex: 1 },

  loadingRoot: { flex: 1, backgroundColor: BRAND.navyDeep, alignItems: 'center', justifyContent: 'center' },
  loadingCenter: { alignItems: 'center' },
  loadingText: { marginTop: SPACE.sm, fontSize: 15, color: BRAND.onBrandSoft, fontWeight: '600' },
});

export default OnboardingScreen;
