import React, { memo } from 'react';
import { Animated, Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useLoop } from './motion';

/**
 * ============================================================================
 * ILLUSTRATIONS — original vector 3D art for the brand header
 * ============================================================================
 *
 *   <FloatingIllustration size={104}><SecureLogin3D size={104} /></FloatingIllustration>
 *
 * Every piece is drawn here in react-native-svg (no stock PNGs): brand
 * navy/blue, gradients for volume, an offset "thickness" layer and a
 * specular highlight for depth, sparkles for life. Crisp at any density,
 * no asset weight, and each is memoised (static SVG — the float animation
 * moves the view around it on the native driver).
 *
 *   Auth ........ SecureLogin3D (member sign-in) · AdminConsole3D (admin, indigo)
 *   Registration  NewMemberCard3D (step 1) · LocationMap3D (step 2)
 *   Onboarding .. MembershipBenefits3D · EventCalendar3D · UdyamVerify3D · NetworkGrowth3D
 *   Small ....... MapPin3D · AccountCard3D
 *
 * All drawn for a dark (gradient) background.
 */

type ArtProps = { size?: number };

/** Four-point concave star — the "sparkle". */
function Sparkle({ x, y, r, color = '#FFFFFF', opacity = 0.9 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
  return <Path d={d} fill={color} fillOpacity={opacity} />;
}

/** A person glyph inside a disc — used on cards, nodes and avatars. */
function PersonDisc({ cx, cy, r, ring, fill = '#FFFFFF', glyph = '#2563EB' }: {
  cx: number; cy: number; r: number; ring: string; fill?: string; glyph?: string;
}) {
  const inner = r - Math.max(2, r * 0.14);
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={ring} />
      <Circle cx={cx} cy={cy} r={inner} fill={fill} />
      <Circle cx={cx} cy={cy - inner * 0.22} r={inner * 0.32} fill={glyph} />
      <Path
        d={`M${cx - inner * 0.58} ${cy + inner * 0.62} C${cx - inner * 0.5} ${cy + inner * 0.12} ${cx + inner * 0.5} ${cy + inner * 0.12} ${cx + inner * 0.58} ${cy + inner * 0.62} Z`}
        fill={glyph}
      />
    </G>
  );
}

/* ============================================================ float wrapper */

export function FloatingIllustration({
  source, children, size = 112, amplitude = 7, duration = 3600, delay = 0, halo = true, style, accessibilityLabel,
}: {
  /** Pass the art as `children` (preferred). `source` accepts an image if ever needed. */
  source?: ImageSourcePropType;
  children?: React.ReactNode;
  size?: number;
  /** Rise in px. */
  amplitude?: number;
  /** One full up-and-down, ms. */
  duration?: number;
  delay?: number;
  halo?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useLoop({ duration, pingPong: true, delay });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -Math.abs(amplitude)] });
  const shadowScale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
  const shadowOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.16] });
  const box = Math.max(40, Number(size || 0));
  return (
    <View
      style={[{ width: box, height: box + 14 }, s.center, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {halo ? <View pointerEvents="none" style={[s.halo, { width: box * 0.9, height: box * 0.9, borderRadius: box, top: box * 0.05 }]} /> : null}
      {/* A radial fade, not a solid pill: a flat View reads as a dark bar on the gradient. */}
      <Animated.View
        pointerEvents="none"
        style={[s.shadow, { width: box * 0.7, top: box - 4, left: box * 0.15, opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="floatShadow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#020617" stopOpacity={0.9} />
              <Stop offset="0.55" stopColor="#020617" stopOpacity={0.35} />
              <Stop offset="1" stopColor="#020617" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={50} cy={10} rx={50} ry={10} fill="url(#floatShadow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ width: box, height: box, transform: [{ translateY }] }}>
        {source ? (
          <Image source={source} style={{ width: box, height: box }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : children}
      </Animated.View>
    </View>
  );
}

/* ============================================================ auth */

/** Member sign-in: a phone showing a sign-in card, fronted by a shield with a padlock. */
export const SecureLogin3D = memo(function SecureLogin3D({ size = 104 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="slFrame" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C7D2E3" />
        </SvgLinearGradient>
        <SvgLinearGradient id="slScreen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8FD" />
        </SvgLinearGradient>
        <RadialGradient id="slAvatar" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </RadialGradient>
        <SvgLinearGradient id="slBtn" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <RadialGradient id="slShield" cx="32%" cy="25%" r="85%">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="0.45" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </RadialGradient>
        <RadialGradient id="slGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <G transform="rotate(-8 66 80)">
        <Rect x={40} y={20} width={60} height={124} rx={14} fill="#0B1A45" fillOpacity={0.45} />
        <Rect x={36} y={16} width={60} height={124} rx={14} fill="url(#slFrame)" />
        <Rect x={40} y={22} width={52} height={112} rx={10} fill="url(#slScreen)" />
        <Rect x={58} y={25} width={16} height={4} rx={2} fill="#CBD5E1" />
        <Circle cx={66} cy={50} r={11} fill="url(#slAvatar)" />
        <Circle cx={66} cy={47} r={4} fill="#FFFFFF" />
        <Path d="M58.5 57.5 C60 51.5 72 51.5 73.5 57.5 Z" fill="#FFFFFF" />
        <Rect x={52} y={66} width={28} height={4} rx={2} fill="#94A3B8" />
        <Rect x={56} y={73} width={20} height={3} rx={1.5} fill="#CBD5E1" />
        <Rect x={46} y={84} width={40} height={12} rx={6} fill="#FFFFFF" stroke="#BFDBFE" strokeWidth={1} />
        <Circle cx={54} cy={90} r={2} fill="#1E3A8A" />
        <Circle cx={61} cy={90} r={2} fill="#1E3A8A" />
        <Circle cx={68} cy={90} r={2} fill="#1E3A8A" />
        <Circle cx={75} cy={90} r={2} fill="#1E3A8A" />
        <Rect x={46} y={102} width={40} height={12} rx={6} fill="url(#slBtn)" />
        <Path d="M52 22 H66 L40 66 V42 Z" fill="#FFFFFF" fillOpacity={0.35} />
      </G>

      <Circle cx={116} cy={100} r={36} fill="url(#slGlow)" />
      <Path d="M117 69 L141 78 V98 C141 114 130 126 117 132 C104 126 93 114 93 98 V78 Z" fill="#0B1A45" fillOpacity={0.45} />
      <Path d="M114 66 L138 75 V95 C138 111 127 123 114 129 C101 123 90 111 90 95 V75 Z" fill="url(#slShield)" />
      <Path d="M114 72 L132 79 V95 C132 107 124 117 114 122 C104 117 96 107 96 95 V79 Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} />
      <Path d="M107 96 V91 C107 82 121 82 121 91 V96" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <Rect x={103} y={95} width={22} height={17} rx={4} fill="#FFFFFF" />
      <Circle cx={114} cy={101.5} r={2.4} fill="#1E3A8A" />
      <Rect x={113} y={102.5} width={2} height={5} rx={1} fill="#1E3A8A" />
      <Ellipse cx={103} cy={80} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-25 103 80)" />

      <Sparkle x={24} y={34} r={7} />
      <Sparkle x={142} y={34} r={5} color="#93C5FD" />
      <Sparkle x={148} y={142} r={4} opacity={0.75} />
      <Sparkle x={20} y={122} r={4} color="#93C5FD" />
    </Svg>
  );
});

/** Admin sign-in: an admin console panel, a verified shield and the org's nodes (indigo). */
export const AdminConsole3D = memo(function AdminConsole3D({ size = 104 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="acShield" cx="32%" cy="25%" r="85%">
          <Stop offset="0" stopColor="#E0E7FF" />
          <Stop offset="0.45" stopColor="#6D5AE6" />
          <Stop offset="1" stopColor="#2A2178" />
        </RadialGradient>
        <SvgLinearGradient id="acNode" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C7D2FE" />
          <Stop offset="1" stopColor="#5440D4" />
        </SvgLinearGradient>
        <RadialGradient id="acGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="acPanel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.06} />
        </SvgLinearGradient>
      </Defs>

      <Circle cx={80} cy={96} r={52} fill="url(#acGlow)" />
      <Rect x={18} y={20} width={124} height={84} rx={14} fill="url(#acPanel)" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={1} />
      <Circle cx={30} cy={32} r={2.5} fill="#F87171" />
      <Circle cx={38} cy={32} r={2.5} fill="#FBBF24" />
      <Circle cx={46} cy={32} r={2.5} fill="#34D399" />
      <Rect x={28} y={66} width={8} height={24} rx={2} fill="#FFFFFF" fillOpacity={0.55} />
      <Rect x={40} y={56} width={8} height={34} rx={2} fill="#FFFFFF" fillOpacity={0.75} />
      <Rect x={52} y={72} width={8} height={18} rx={2} fill="#FFFFFF" fillOpacity={0.45} />
      <Rect x={106} y={48} width={26} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.5} />
      <Rect x={112} y={58} width={20} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.35} />
      <Rect x={116} y={68} width={16} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.3} />

      <Path d="M80 46 V64" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 4" />
      <Path d="M38 124 L58 110" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 4" />
      <Path d="M122 124 L102 110" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 4" />

      <Path d="M83 65 L109 75 V95 C109 113 98 127 83 135 C68 127 57 113 57 95 V75 Z" fill="#1B1646" fillOpacity={0.5} />
      <Path d="M80 62 L106 72 V92 C106 110 95 124 80 132 C65 124 54 110 54 92 V72 Z" fill="url(#acShield)" />
      <Path d="M80 68 L100 76 V92 C100 106 92 117 80 124 C68 117 60 106 60 92 V76 Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} />
      <Path d="M68 95 L77 104 L93 86" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={67} cy={77} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-25 67 77)" />

      <PersonDisc cx={80} cy={38} r={11} ring="url(#acNode)" glyph="#5440D4" />
      <PersonDisc cx={30} cy={130} r={12} ring="url(#acNode)" glyph="#5440D4" />
      <PersonDisc cx={130} cy={130} r={12} ring="url(#acNode)" glyph="#5440D4" />

      <Sparkle x={148} y={16} r={6} />
      <Sparkle x={10} y={90} r={4} color="#C7D2FE" />
      <Sparkle x={152} y={96} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/* ============================================================ registration */

/** Registration step 1: a new member ID card being created — avatar, details, a "+" badge. */
export const NewMemberCard3D = memo(function NewMemberCard3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="nmBack" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="nmFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DFE8FA" />
        </SvgLinearGradient>
        <SvgLinearGradient id="nmBand" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <RadialGradient id="nmAvatar" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </RadialGradient>
        <RadialGradient id="nmPlus" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
        <RadialGradient id="nmGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Circle cx={80} cy={88} r={62} fill="url(#nmGlow)" />
      <G transform="rotate(-12 80 86)">
        <Rect x={28} y={50} width={104} height={68} rx={12} fill="url(#nmBack)" fillOpacity={0.9} />
      </G>
      <G transform="rotate(5 80 88)">
        <Rect x={25} y={57} width={112} height={72} rx={12} fill="#0B1A45" fillOpacity={0.35} />
        <Rect x={22} y={52} width={112} height={72} rx={12} fill="url(#nmFace)" />
        <Path d="M34 52 H122 A12 12 0 0 1 134 64 V70 H22 V64 A12 12 0 0 1 34 52 Z" fill="url(#nmBand)" />
        <Rect x={30} y={58.5} width={24} height={5} rx={2.5} fill="#FFFFFF" fillOpacity={0.85} />
        <Circle cx={124} cy={61} r={3} fill="#FDE68A" />
        <Circle cx={46} cy={96} r={15} fill="#FFFFFF" />
        <Circle cx={46} cy={96} r={13} fill="url(#nmAvatar)" />
        <Circle cx={46} cy={92} r={4.8} fill="#FFFFFF" />
        <Path d="M37.5 104.5 C39 97.5 53 97.5 54.5 104.5 Z" fill="#FFFFFF" />
        <Rect x={68} y={84} width={50} height={6} rx={3} fill="#94A3B8" />
        <Rect x={68} y={95} width={38} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={68} y={105} width={44} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={68} y={114} width={20} height={4} rx={2} fill="#BFDBFE" />
      </G>

      <Circle cx={131} cy={53} r={17} fill="#0B1A45" fillOpacity={0.3} />
      <Circle cx={129} cy={50} r={16} fill="url(#nmPlus)" />
      <Path d="M129 42 V58 M121 50 H137" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={123} cy={43} rx={5} ry={2.6} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-25 123 43)" />

      <Sparkle x={22} y={32} r={7} />
      <Sparkle x={150} y={100} r={4} color="#93C5FD" />
      <Sparkle x={16} y={132} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Registration step 2: a folded map with a region, a dashed route and a standing pin. */
export const LocationMap3D = memo(function LocationMap3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="lmP1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F8FAFC" />
          <Stop offset="1" stopColor="#D5DEEA" />
        </SvgLinearGradient>
        <SvgLinearGradient id="lmP2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E8F0FE" />
        </SvgLinearGradient>
        <SvgLinearGradient id="lmP3" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#BAC6D8" />
        </SvgLinearGradient>
        <RadialGradient id="lmPin" cx="36%" cy="28%" r="80%">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="0.4" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </RadialGradient>
        <RadialGradient id="lmGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Circle cx={82} cy={90} r={64} fill="url(#lmGlow)" />
      {/* map thickness + three folded panels */}
      <Path d="M20 74 L60 64 L104 76 L144 66 V134 L104 144 L60 132 L20 142 Z" fill="#0B1A45" fillOpacity={0.35} transform="translate(2 5)" />
      <Path d="M18 72 L58 62 V130 L18 140 Z" fill="url(#lmP1)" />
      <Path d="M58 62 L102 74 V142 L58 130 Z" fill="url(#lmP2)" />
      <Path d="M102 74 L142 64 V132 L102 142 Z" fill="url(#lmP3)" />
      <Path d="M30 90 L50 86 M32 116 L52 110 M112 92 L134 86 M110 118 L132 112" stroke="#94A3B8" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />
      {/* the region — an abstract subcontinent silhouette */}
      <Path
        d="M66 80 C74 76 88 77 93 83 C100 85 106 91 101 98 C98 106 91 110 87 120 C85 126 81 128 78 122 C74 112 66 106 63 97 C61 89 61 84 66 80 Z"
        fill="#93C5FD"
        fillOpacity={0.8}
        stroke="#3B82F6"
        strokeWidth={1.2}
      />
      {/* route */}
      <Path d="M34 124 Q56 132 70 116 T90 100" stroke="#1D4ED8" strokeWidth={2.2} strokeDasharray="3 3.5" strokeLinecap="round" fill="none" />
      <Circle cx={34} cy={124} r={5} fill="#FFFFFF" stroke="#2563EB" strokeWidth={2.5} />
      {/* pin */}
      <Ellipse cx={92} cy={102} rx={9} ry={3} fill="#0B1A45" fillOpacity={0.3} />
      <Path d="M92 102 C92 102 74 82 74 64 A18 18 0 1 1 110 64 C110 82 92 102 92 102 Z" fill="url(#lmPin)" />
      <Path d="M102 50 C108 56 110 62 110 64 C110 80 96 96 92 102 C98 90 104 76 104 64 C104 58 103 53 102 50 Z" fill="#0B1A45" fillOpacity={0.2} />
      <Circle cx={92} cy={64} r={7.5} fill="#FFFFFF" />
      <Circle cx={92} cy={64} r={3.2} fill="#1E3A8A" />
      <Ellipse cx={84} cy={54} rx={5} ry={3} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-30 84 54)" />

      <Sparkle x={24} y={40} r={6} />
      <Sparkle x={140} y={36} r={5} color="#93C5FD" />
      <Sparkle x={150} y={148} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ onboarding */

/** Onboarding — Membership Benefits: a premium member card with chip, and a gold medal. */
export const MembershipBenefits3D = memo(function MembershipBenefits3D({ size = 240 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="mbGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="mbBack" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="1" stopColor="#3B82F6" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mbFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="0.6" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#60A5FA" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mbGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </SvgLinearGradient>
        <ClipPath id="mbClip">
          <Rect x={28} y={66} width={140} height={88} rx={16} />
        </ClipPath>
      </Defs>

      <Circle cx={100} cy={104} r={86} fill="url(#mbGlow)" />
      <G transform="rotate(-14 100 100)">
        <Rect x={34} y={60} width={124} height={78} rx={14} fill="url(#mbBack)" fillOpacity={0.85} />
      </G>
      <G transform="rotate(6 100 108)">
        <Rect x={32} y={72} width={140} height={88} rx={16} fill="#020617" fillOpacity={0.35} />
        <Rect x={28} y={66} width={140} height={88} rx={16} fill="url(#mbFace)" />
        <G clipPath="url(#mbClip)">
          <Path d="M70 66 H104 L50 154 H16 Z" fill="#FFFFFF" fillOpacity={0.12} />
          <Path d="M112 66 H124 L70 154 H58 Z" fill="#FFFFFF" fillOpacity={0.08} />
        </G>
        <Rect x={28.5} y={66.5} width={139} height={87} rx={15.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} />
        <Rect x={44} y={86} width={26} height={19} rx={4} fill="url(#mbGold)" />
        <Path d="M44 95.5 H70 M57 86 V105" stroke="#92400E" strokeOpacity={0.45} strokeWidth={1} />
        <Path d="M80 89 Q84 95.5 80 102 M86 86 Q92 95.5 86 105" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Rect x={44} y={120} width={66} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.9} />
        <Rect x={44} y={132} width={40} height={5} rx={2.5} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={148} cy={88} r={10} fill="#FFFFFF" fillOpacity={0.18} stroke="#FFFFFF" strokeOpacity={0.6} />
      </G>

      <Path d="M146 158 L138 190 L149 184 L155 194 L162 162 Z" fill="#1D4ED8" />
      <Path d="M168 158 L176 190 L165 184 L159 194 L152 162 Z" fill="#1E3A8A" />
      <Circle cx={159} cy={150} r={22} fill="#020617" fillOpacity={0.25} />
      <Circle cx={157} cy={147} r={21} fill="url(#mbGold)" stroke="#FEF3C7" strokeWidth={2} />
      <Circle cx={157} cy={147} r={15} fill="none" stroke="#B45309" strokeOpacity={0.4} strokeWidth={1.2} />
      <Path
        d="M157 138 L159.35 143.76 L165.56 144.22 L160.8 148.24 L162.29 154.28 L157 151 L151.71 154.28 L153.2 148.24 L148.44 144.22 L154.65 143.76 Z"
        fill="#FFFBEB"
      />
      <Ellipse cx={149} cy={137} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-30 149 137)" />

      <Sparkle x={40} y={40} r={8} />
      <Sparkle x={172} y={46} r={6} color="#FDE68A" />
      <Sparkle x={24} y={152} r={5} color="#93C5FD" />
      <Sparkle x={104} y={26} r={4} opacity={0.7} />
    </Svg>
  );
});

const CAL_COLS = [0, 1, 2, 3];
const CAL_ROWS = [0, 1, 2];

/** Onboarding — Event Management: a desk calendar with a picked date, a clock and a ticket. */
export const EventCalendar3D = memo(function EventCalendar3D({ size = 240 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="ecGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="ecFace" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E2E8F0" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ecBand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ecGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>

      <Circle cx={100} cy={106} r={86} fill="url(#ecGlow)" />
      <G transform="rotate(-6 98 108)">
        <Rect x={44} y={57} width={116} height={112} rx={16} fill="#020617" fillOpacity={0.35} />
        <Rect x={40} y={52} width={116} height={112} rx={16} fill="url(#ecFace)" />
        <Path d="M56 52 H140 A16 16 0 0 1 156 68 V84 H40 V68 A16 16 0 0 1 56 52 Z" fill="url(#ecBand)" />
        <Rect x={78} y={65} width={40} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.85} />
        <Rect x={64} y={42} width={9} height={20} rx={4.5} fill="#E2E8F0" stroke="#64748B" strokeOpacity={0.5} />
        <Rect x={123} y={42} width={9} height={20} rx={4.5} fill="#E2E8F0" stroke="#64748B" strokeOpacity={0.5} />
        {CAL_ROWS.map((r) => CAL_COLS.map((c) => {
          const on = r === 1 && c === 2;
          return (
            <Rect
              key={`${r}-${c}`}
              x={52 + c * 24}
              y={94 + r * 22}
              width={18}
              height={16}
              rx={4}
              fill={on ? 'url(#ecBand)' : '#E2E8F0'}
            />
          );
        }))}
        <Path d="M104.5 124 L107.5 127 L113 121" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>

      <Circle cx={46} cy={60} r={19} fill="#020617" fillOpacity={0.25} />
      <Circle cx={44} cy={57} r={18} fill="#FFFFFF" stroke="#2563EB" strokeWidth={3.5} />
      <Path d="M44 47 V57 L51 61" stroke="#1E3A8A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={44} cy={57} r={2} fill="#1E3A8A" />

      <G transform="rotate(14 150 146)">
        <Path
          d="M124 128 H176 A6 6 0 0 1 182 134 V141 A4 4 0 0 0 182 149 V156 A6 6 0 0 1 176 162 H124 A6 6 0 0 1 118 156 V149 A4 4 0 0 0 118 141 V134 A6 6 0 0 1 124 128 Z"
          fill="url(#ecGold)"
        />
        <Path d="M136 132 V158" stroke="#92400E" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="2 3" />
        <Rect x={142} y={138} width={30} height={5} rx={2.5} fill="#92400E" fillOpacity={0.55} />
        <Rect x={142} y={148} width={20} height={4} rx={2} fill="#92400E" fillOpacity={0.35} />
      </G>

      <Sparkle x={170} y={40} r={7} />
      <Sparkle x={24} y={128} r={5} color="#93C5FD" />
      <Sparkle x={100} y={24} r={4} opacity={0.7} />
    </Svg>
  );
});

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

/** Onboarding — Udyam Integration: a registration certificate, a verified seal and an industry gear. */
export const UdyamVerify3D = memo(function UdyamVerify3D({ size = 240 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="uvGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="uvGear" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="uvPage" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E3EAF5" />
        </SvgLinearGradient>
        <RadialGradient id="uvSeal" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>

      <Circle cx={100} cy={106} r={86} fill="url(#uvGlow)" />
      <G>
        {GEAR_TEETH.map((deg) => (
          <Rect key={deg} x={146} y={30} width={10} height={12} rx={2.5} fill="url(#uvGear)" transform={`rotate(${deg} 151 58)`} />
        ))}
        <Circle cx={151} cy={58} r={22} fill="url(#uvGear)" />
        <Circle cx={151} cy={58} r={8} fill="#1E3A8A" />
      </G>

      <G transform="rotate(-5 98 110)">
        <Path d="M64 49 H128 L152 73 V172 A10 10 0 0 1 142 182 H64 A10 10 0 0 1 54 172 V59 A10 10 0 0 1 64 49 Z" fill="#020617" fillOpacity={0.35} />
        <Path d="M60 44 H124 L148 68 V168 A10 10 0 0 1 138 178 H60 A10 10 0 0 1 50 168 V54 A10 10 0 0 1 60 44 Z" fill="url(#uvPage)" />
        <Path d="M124 44 V60 A8 8 0 0 0 132 68 H148 Z" fill="#CBD5E1" />
        <Rect x={66} y={62} width={46} height={8} rx={4} fill="#1E3A8A" />
        <Rect x={66} y={84} width={66} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={66} y={96} width={58} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={66} y={108} width={66} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={66} y={120} width={44} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={66} y={138} width={36} height={10} rx={5} fill="#DBEAFE" />
      </G>

      <Path d="M128 166 L122 192 L132 186 L138 194 L142 170 Z" fill="#047857" />
      <Path d="M152 166 L158 192 L148 186 L142 194 L138 170 Z" fill="#059669" />
      <Circle cx={142} cy={153} r={25} fill="#020617" fillOpacity={0.25} />
      <Circle cx={140} cy={150} r={24} fill="url(#uvSeal)" stroke="#D1FAE5" strokeWidth={3} />
      <Circle cx={140} cy={150} r={17} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeDasharray="2 3" />
      <Path d="M130 150 L137 157 L151 142" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={131} cy={137} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-30 131 137)" />

      <Sparkle x={30} y={36} r={7} />
      <Sparkle x={184} y={110} r={5} color="#93C5FD" />
      <Sparkle x={26} y={150} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Onboarding — Networking & Growth: connected members around a rising chart. */
export const NetworkGrowth3D = memo(function NetworkGrowth3D({ size = 240 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="ngGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="ngRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ngBar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#93C5FD" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ngArrow" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#A7F3D0" />
        </SvgLinearGradient>
      </Defs>

      <Circle cx={100} cy={104} r={88} fill="url(#ngGlow)" />
      <Ellipse cx={92} cy={108} rx={78} ry={34} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.5} />

      <Path d="M92 104 L38 60 M92 104 L150 58 M92 104 L42 154" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 5" />

      <Rect x={130} y={148} width={14} height={30} rx={3} fill="#020617" fillOpacity={0.25} />
      <Rect x={128} y={146} width={14} height={30} rx={3} fill="url(#ngBar)" />
      <Rect x={148} y={130} width={14} height={46} rx={3} fill="url(#ngBar)" />
      <Rect x={168} y={110} width={14} height={66} rx={3} fill="url(#ngBar)" />
      <Path d="M118 150 L140 128 L156 136 L182 100" stroke="url(#ngArrow)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M170 98 L184 97 L184 111" stroke="#A7F3D0" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <Circle cx={94} cy={108} r={33} fill="#020617" fillOpacity={0.25} />
      <PersonDisc cx={92} cy={104} r={32} ring="url(#ngRing)" />
      <Ellipse cx={80} cy={84} rx={9} ry={4} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-30 80 84)" />
      <PersonDisc cx={38} cy={60} r={17} ring="url(#ngRing)" glyph="#1D4ED8" />
      <PersonDisc cx={150} cy={58} r={16} ring="url(#ngRing)" glyph="#1D4ED8" />
      <PersonDisc cx={42} cy={154} r={15} ring="url(#ngRing)" glyph="#1D4ED8" />

      <Sparkle x={100} y={30} r={7} />
      <Sparkle x={184} y={36} r={5} color="#93C5FD" />
      <Sparkle x={14} y={108} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ small pieces */

/** A glossy location pin on its own. */
export const MapPin3D = memo(function MapPin3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="mpBody" cx="36%" cy="28%" r="78%">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="0.35" stopColor="#3B82F6" />
          <Stop offset="0.8" stopColor="#1D4ED8" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </RadialGradient>
      </Defs>
      <Path d="M60 8 C36 8 20 26 20 48 C20 76 60 108 60 108 C60 108 100 76 100 48 C100 26 84 8 60 8 Z" fill="url(#mpBody)" />
      <Path d="M76 14 C92 22 100 36 100 48 C100 76 60 108 60 108 C70 92 90 70 90 48 C90 34 85 22 76 14 Z" fill="#0B1A45" fillOpacity={0.22} />
      <Circle cx={60} cy={47} r={17} fill="#FFFFFF" />
      <Circle cx={60} cy={47} r={7} fill="#1E3A8A" />
      <Ellipse cx={42} cy={27} rx={9} ry={5} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-30 42 27)" />
    </Svg>
  );
});

/** Kept for compatibility — the new sign-up art is NewMemberCard3D. */
export const AccountCard3D = NewMemberCard3D;

const s = StyleSheet.create({
  center: { alignItems: 'center' },
  halo: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  shadow: { position: 'absolute', height: 20 },
});
