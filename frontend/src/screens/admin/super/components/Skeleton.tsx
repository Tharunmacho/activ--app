import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SUPER, superStyles } from '../superTheme';

/**
 * One shared clock drives every shimmer on screen.
 *
 * A skeleton list can hold forty bars; giving each its own Animated.loop means
 * forty timers competing on the UI thread, which is exactly the stall the
 * loader exists to hide. Instead a single native-driven loop runs while at
 * least one skeleton is mounted, and every bar interpolates from it.
 */
const clock = new Animated.Value(0);
let mounted = 0;
let loop: Animated.CompositeAnimation | null = null;

const startClock = () => {
  mounted += 1;
  if (loop) return;
  loop = Animated.loop(
    Animated.timing(clock, {
      toValue: 1,
      duration: 1150,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
  );
  loop.start();
};

const stopClock = () => {
  mounted = Math.max(0, mounted - 1);
  if (mounted === 0 && loop) {
    loop.stop();
    loop = null;
    clock.setValue(0);
  }
};

interface BarProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single shimmering placeholder bar. */
export const SkeletonBar: React.FC<BarProps> = ({ width = '100%', height = 12, radius = 6, style }) => {
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    startClock();
    return stopClock;
  }, []);

  const translateX = clock.interpolate({
    inputRange: [0, 1],
    outputRange: [-(measured || 120), measured || 120],
  });

  return (
    <View
      style={[{ width: width as any, height, borderRadius: radius }, styles.bar, style]}
      onLayout={event => {
        const next = event?.nativeEvent?.layout?.width || 0;
        if (next && Math.abs(next - measured) > 1) setMeasured(next);
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/** Placeholder matching a tier card on the Hub's entry level. */
export const SkeletonTierCard: React.FC = () => (
  <View style={[superStyles.card, styles.tierCard]}>
    <SkeletonBar width={48} height={48} radius={16} />
    <View style={{ flex: 1, gap: 8 }}>
      <SkeletonBar width="45%" height={15} />
      <SkeletonBar width="70%" height={11} />
    </View>
  </View>
);

/** Placeholder matching a region card, including its stat strip. */
export const SkeletonRegionCard: React.FC = () => (
  <View style={[superStyles.card, styles.stack]}>
    <View style={styles.rowGap}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBar width="55%" height={15} />
        <SkeletonBar width="35%" height={11} />
      </View>
      <SkeletonBar width={70} height={22} radius={999} />
    </View>
    <View style={styles.statStrip}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={styles.statCell}>
          <SkeletonBar width={28} height={16} />
          <SkeletonBar width={44} height={9} />
        </View>
      ))}
    </View>
  </View>
);

/** Placeholder matching an applicant or admin row. */
export const SkeletonRow: React.FC<{ lines?: number }> = ({ lines = 2 }) => (
  <View style={[superStyles.card, styles.rowGap]}>
    <SkeletonBar width={38} height={38} radius={19} />
    <View style={{ flex: 1, gap: 8 }}>
      <SkeletonBar width="60%" height={14} />
      {lines > 1 ? <SkeletonBar width="40%" height={11} /> : null}
      {lines > 2 ? <SkeletonBar width="50%" height={11} /> : null}
    </View>
  </View>
);

/** Repeat any skeleton `count` times with the list's normal spacing. */
export const SkeletonList: React.FC<{ count?: number; children?: React.ReactNode; variant?: 'row' | 'region' | 'tier' }> = ({
  count = 4,
  variant = 'row',
}) => (
  <View style={{ gap: 10 }}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index}>
        {variant === 'region' ? <SkeletonRegionCard />
          : variant === 'tier' ? <SkeletonTierCard />
          : <SkeletonRow />}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  bar: { backgroundColor: '#EDF1F6', overflow: 'hidden' },
  tierCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stack: { gap: 14 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statStrip: {
    flexDirection: 'row', paddingTop: 12,
    borderTopWidth: 1, borderTopColor: SUPER.border,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 6 },
});

export default SkeletonBar;
