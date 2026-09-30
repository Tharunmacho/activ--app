import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PALETTE, Tone } from '../tokens';
import { premiumTone } from './theme';
import { prefersReducedMotion, useLoop } from './motion';

/**
 * ============================================================================
 * PREMIUM STEPPER — white, on the brand header
 * ============================================================================
 *
 *   <PremiumStepper step={2} labels={['Account', 'Location']} />
 *
 * Circles joined by a progress rail, each step's name centred under its own
 * circle and nowhere else (the old tracker printed the current step's name a
 * second time, right-aligned in its header). Done = white disc with a tick;
 * current = white disc with its number and a soft pulse; later = outlined.
 *
 * On mount the rail fills from the previous step to this one, so moving
 * forward reads as progress. Native driver (translateX inside a clipped track).
 */

const NODE = 30;

export function PremiumStepper({ step, labels, tone = 'member', style }: {
  step: number; labels: string[]; tone?: Tone; style?: StyleProp<ViewStyle>;
}) {
  const p = premiumTone(tone);
  const list = labels || [];
  const total = Math.max(1, list.length);
  const current = Math.max(1, Math.min(Number(step || 1), total));
  const target = total > 1 ? (current - 1) / (total - 1) : 1;
  const from = total > 1 ? Math.max(0, current - 2) / (total - 1) : 1;

  const [width, setWidth] = useState(0);
  const fill = useRef(new Animated.Value(prefersReducedMotion() ? target : from)).current;
  const pulse = useLoop({ duration: 1800 });

  useEffect(() => {
    const anim = Animated.timing(fill, {
      toValue: target,
      duration: prefersReducedMotion() ? 0 : 700,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fill, target]);

  const cell = width / total;
  const trackW = Math.max(0, width - cell);
  const translateX = fill.interpolate({ inputRange: [0, 1], outputRange: [-trackW, 0] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View
      style={style}
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e?.nativeEvent?.layout?.width || 0))}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${list[current - 1] || ''}`}
    >
      {width > 0 && total > 1 ? (
        <View style={[s.track, { left: cell / 2, width: trackW }]}>
          <Animated.View style={[s.trackFill, { width: trackW, transform: [{ translateX }] }]} />
        </View>
      ) : null}
      <View style={s.row}>
        {list.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <View key={`${label}-${i}`} style={s.cell}>
              <View style={s.nodeWrap}>
                {active ? (
                  <Animated.View style={[s.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                ) : null}
                <View style={[s.node, (done || active) ? s.nodeOn : s.nodeOff]}>
                  {done ? (
                    <Icon name="check" size={18} color={p.accentDark} />
                  ) : (
                    <Text style={[s.nodeText, { color: active ? p.accentDark : 'rgba(255,255,255,0.85)' }]} maxFontSizeMultiplier={1}>{n}</Text>
                  )}
                </View>
              </View>
              <Text
                style={[s.label, (done || active) && s.labelOn]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    position: 'absolute',
    top: NODE / 2 - 1.5,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  trackFill: { height: 3, borderRadius: 2, backgroundColor: PALETTE.white },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center' },
  nodeWrap: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: PALETTE.white },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeOn: {
    backgroundColor: PALETTE.white,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeOff: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  nodeText: { fontSize: 13, lineHeight: 16, fontWeight: '800' },
  label: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelOn: { color: PALETTE.white, fontWeight: '800' },
});
