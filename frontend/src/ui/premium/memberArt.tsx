import React, { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * ============================================================================
 * MEMBER ART — original vector illustrations for the member area
 * ============================================================================
 *
 * Drawn here in react-native-svg for these screens (no stock PNGs): brand
 * navy/blue, a darker offset layer for thickness, a specular highlight and a
 * few sparkles — the same recipe as `illustrations.tsx`. Pair any of them
 * with `FloatingIllustration`.
 *
 *   Dashboards .... ApprovalJourney3D (unpaid) · MemberBadge3D (paid)
 *   Forms ......... ProfileForm3D · Storefront3D · Declaration3D · FinanceChart3D
 *   Application ... SubmittedPlane3D · StatusTracker3D
 *   Auth .......... KeyMail3D · NewPassword3D · SocialConnect3D · WelcomeDoor3D
 *   Gates ......... LockedFeature3D (carries its own disc — works on white)
 *   Website ....... WebsiteGlobe3D, and the small `SiteArt` tile glyphs
 *
 * `admin` on the auth pieces switches the palette to the admin indigo.
 */

type ArtProps = { size?: number };
type ToneArt = ArtProps & { admin?: boolean };

function Sparkle({ x, y, r, color = '#FFFFFF', opacity = 0.9 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
  return <Path d={d} fill={color} fillOpacity={opacity} />;
}

const tones = (admin?: boolean) => (admin
  ? { light: '#E0E7FF', mid: '#6D5AE6', deep: '#2A2178', shade: '#1B1646', glow: '#A5B4FC' }
  : { light: '#BFDBFE', mid: '#3B82F6', deep: '#1E3A8A', shade: '#0B1A45', glow: '#60A5FA' });

/* ============================================================ dashboards */

/** Unpaid dashboard: an application file travelling Block → District → State, one stamp done. */
export const ApprovalJourney3D = memo(function ApprovalJourney3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="ajDoc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D6E4FB" />
        </SvgLinearGradient>
        <RadialGradient id="ajNode" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#BBF7D0" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
        <RadialGradient id="ajWait" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#F59E0B" />
        </RadialGradient>
        <RadialGradient id="ajGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={82} cy={84} r={60} fill="url(#ajGlow)" />
      <G transform="rotate(-6 70 76)">
        <Rect x={34} y={26} width={76} height={100} rx={12} fill="#0B1A45" fillOpacity={0.45} />
        <Rect x={30} y={22} width={76} height={100} rx={12} fill="url(#ajDoc)" />
        <Rect x={52} y={16} width={32} height={14} rx={5} fill="#1E3A8A" />
        <Rect x={58} y={20} width={20} height={4} rx={2} fill="#93C5FD" />
        <Rect x={42} y={42} width={40} height={6} rx={3} fill="#1E3A8A" />
        <Rect x={42} y={54} width={52} height={4} rx={2} fill="#94A3B8" />
        <Rect x={42} y={63} width={46} height={4} rx={2} fill="#CBD5E1" />
        <Rect x={42} y={72} width={50} height={4} rx={2} fill="#CBD5E1" />
        <Path d="M34 24 H62 L34 70 Z" fill="#FFFFFF" fillOpacity={0.4} />
      </G>
      {/* the three tiers */}
      <Path d="M40 132 C70 118 96 144 128 120" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="4 5" fill="none" />
      <Circle cx={40} cy={132} r={11} fill="#064E3B" fillOpacity={0.4} />
      <Circle cx={39} cy={130} r={11} fill="url(#ajNode)" />
      <Path d="M34 130 L38 134 L45 126" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={84} cy={130} r={10} fill="url(#ajWait)" />
      <Rect x={82.5} y={124} width={3} height={7} rx={1.5} fill="#FFFFFF" />
      <Rect x={83} y={129.5} width={6} height={3} rx={1.5} fill="#FFFFFF" />
      <Circle cx={128} cy={120} r={10} fill="#FFFFFF" fillOpacity={0.22} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.5} />
      <Path d="M123 121 H133 M128 116 V126" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      {/* magnifier reviewing */}
      <Circle cx={118} cy={58} r={20} fill="#1E3A8A" fillOpacity={0.35} />
      <Circle cx={116} cy={56} r={18} fill="#FFFFFF" fillOpacity={0.22} stroke="#FFFFFF" strokeWidth={4} />
      <Path d="M129 69 L142 82" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx={109} cy={49} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.6} transform="rotate(-30 109 49)" />
      <Sparkle x={20} y={30} r={6} />
      <Sparkle x={146} y={24} r={5} color="#93C5FD" />
      <Sparkle x={150} y={140} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Paid dashboard: a glossy membership card fronted by a gold verified rosette. */
export const MemberBadge3D = memo(function MemberBadge3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="mbCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="0.55" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mbChip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#B45309" />
        </SvgLinearGradient>
        <RadialGradient id="mbGold" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#92400E" />
        </RadialGradient>
        <RadialGradient id="mbGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#93C5FD" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#93C5FD" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={62} fill="url(#mbGlow)" />
      <G transform="rotate(-12 76 72)">
        <Rect x={20} y={40} width={112} height={72} rx={12} fill="#0B1A45" fillOpacity={0.5} />
        <Rect x={16} y={34} width={112} height={72} rx={12} fill="url(#mbCard)" />
        <Rect x={28} y={48} width={20} height={15} rx={3} fill="url(#mbChip)" />
        <Path d="M28 55.5 H48 M38 48 V63" stroke="#92400E" strokeOpacity={0.5} strokeWidth={1} />
        <Circle cx={108} cy={56} r={10} fill="#FFFFFF" fillOpacity={0.9} />
        <Circle cx={108} cy={53} r={3.5} fill="#1E3A8A" />
        <Path d="M101.5 61 C103 56 113 56 114.5 61 Z" fill="#1E3A8A" />
        <Rect x={28} y={76} width={52} height={6} rx={3} fill="#FFFFFF" />
        <Rect x={28} y={88} width={36} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.6} />
        <Rect x={88} y={88} width={28} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.45} />
        <Path d="M18 36 H70 L30 104 H18 Z" fill="#FFFFFF" fillOpacity={0.14} />
      </G>
      {/* rosette */}
      <Path d="M104 118 L96 150 L108 142 L114 154 L118 122 Z" fill="#1D4ED8" />
      <Path d="M126 118 L134 150 L122 142 L116 154 L112 122 Z" fill="#2563EB" />
      <Circle cx={117} cy={114} r={24} fill="#78350F" fillOpacity={0.4} />
      <Circle cx={115} cy={111} r={23} fill="url(#mbGold)" />
      <Circle cx={115} cy={111} r={16} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.5} />
      <Path d="M106 111 L112.5 117.5 L125 104" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={106} cy={101} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-30 106 101)" />
      <Sparkle x={22} y={22} r={6} />
      <Sparkle x={144} y={30} r={5} color="#FDE68A" />
      <Sparkle x={24} y={136} r={4} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ forms */

/** Personal details: a profile form with an avatar, filled lines and a pencil. */
export const ProfileForm3D = memo(function ProfileForm3D({ size = 92 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="pfPanel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D6E4FB" />
        </SvgLinearGradient>
        <RadialGradient id="pfAvatar" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </RadialGradient>
        <SvgLinearGradient id="pfPen" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
        <RadialGradient id="pfGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={60} fill="url(#pfGlow)" />
      <Rect x={34} y={26} width={88} height={112} rx={14} fill="#0B1A45" fillOpacity={0.45} />
      <Rect x={30} y={22} width={88} height={112} rx={14} fill="url(#pfPanel)" />
      <Circle cx={74} cy={50} r={15} fill="url(#pfAvatar)" />
      <Circle cx={74} cy={46} r={5.5} fill="#FFFFFF" />
      <Path d="M64 60 C66 52 82 52 84 60 Z" fill="#FFFFFF" />
      {[76, 94, 112].map((y) => (
        <G key={y}>
          <Rect x={42} y={y} width={64} height={11} rx={5.5} fill="#FFFFFF" stroke="#BFDBFE" strokeWidth={1} />
          <Rect x={48} y={y + 4} width={y === 112 ? 22 : 34} height={3} rx={1.5} fill="#1E3A8A" fillOpacity={0.6} />
        </G>
      ))}
      <Path d="M34 24 H64 L34 74 Z" fill="#FFFFFF" fillOpacity={0.4} />
      <G transform="rotate(40 124 96)">
        <Rect x={117} y={58} width={14} height={62} rx={4} fill="url(#pfPen)" />
        <Rect x={117} y={58} width={14} height={10} rx={3} fill="#F87171" />
        <Path d="M117 120 L124 134 L131 120 Z" fill="#FDE68A" />
        <Path d="M121.5 129 L124 134 L126.5 129 Z" fill="#0B1A45" />
      </G>
      <Sparkle x={20} y={30} r={6} />
      <Sparkle x={146} y={36} r={5} color="#93C5FD" />
      <Sparkle x={18} y={128} r={4} color="#93C5FD" />
    </Svg>
  );
});

/** Business status: a storefront with an awning and a rising growth arrow. */
export const Storefront3D = memo(function Storefront3D({ size = 92 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="sfWall" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D6E4FB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="sfArrow" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#A7F3D0" />
        </SvgLinearGradient>
        <RadialGradient id="sfGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={76} cy={92} r={60} fill="url(#sfGlow)" />
      <Rect x={30} y={62} width={96} height={76} rx={8} fill="#0B1A45" fillOpacity={0.45} />
      <Rect x={26} y={58} width={96} height={76} rx={8} fill="url(#sfWall)" />
      {/* awning */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Path
          key={i}
          d={`M${22 + i * 17.3} 46 H${39.3 + i * 17.3} V62 C${39.3 + i * 17.3} 70 ${22 + i * 17.3} 70 ${22 + i * 17.3} 62 Z`}
          fill={i % 2 === 0 ? '#2563EB' : '#FFFFFF'}
        />
      ))}
      <Rect x={20} y={40} width={108} height={8} rx={4} fill="#1E3A8A" />
      <Rect x={36} y={84} width={30} height={50} rx={4} fill="#1E3A8A" />
      <Circle cx={60} cy={110} r={2.2} fill="#FBBF24" />
      <Rect x={76} y={84} width={36} height={26} rx={4} fill="#BFDBFE" />
      <Path d="M76 84 H96 L76 104 Z" fill="#FFFFFF" fillOpacity={0.6} />
      {/* growth arrow */}
      <Path d="M92 36 L112 20 L122 28 L144 8" stroke="#064E3B" strokeOpacity={0.4} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M90 32 L110 16 L120 24 L142 4" stroke="url(#sfArrow)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M134 2 L148 0 L146 14 Z" fill="#A7F3D0" />
      <Sparkle x={16} y={24} r={6} />
      <Sparkle x={150} y={56} r={4} color="#93C5FD" />
      <Sparkle x={144} y={140} r={5} opacity={0.7} />
    </Svg>
  );
});

/** Declaration: a scroll with a quill and a wax seal. */
export const Declaration3D = memo(function Declaration3D({ size = 92 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="dcPaper" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8FD" />
        </SvgLinearGradient>
        <RadialGradient id="dcSeal" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FCA5A5" />
          <Stop offset="1" stopColor="#B91C1C" />
        </RadialGradient>
        <SvgLinearGradient id="dcQuill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#93C5FD" />
        </SvgLinearGradient>
        <RadialGradient id="dcGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={78} cy={86} r={60} fill="url(#dcGlow)" />
      <Rect x={36} y={30} width={80} height={104} rx={8} fill="#0B1A45" fillOpacity={0.45} />
      <Rect x={32} y={26} width={80} height={104} rx={8} fill="url(#dcPaper)" />
      <Rect x={26} y={20} width={92} height={12} rx={6} fill="#1E3A8A" />
      <Rect x={26} y={124} width={92} height={12} rx={6} fill="#1E3A8A" />
      <Rect x={44} y={44} width={42} height={5} rx={2.5} fill="#1E3A8A" />
      {[56, 65, 74, 83, 92].map((y, i) => (
        <Rect key={y} x={44} y={y} width={i % 2 ? 48 : 56} height={3.5} rx={1.75} fill="#94A3B8" fillOpacity={i === 0 ? 1 : 0.7} />
      ))}
      <Path d="M44 110 C52 102 58 116 66 106 C70 101 74 110 80 106" stroke="#1E3A8A" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx={98} cy={110} r={13} fill="#7F1D1D" fillOpacity={0.4} />
      <Circle cx={96} cy={108} r={13} fill="url(#dcSeal)" />
      <Path d="M90 108 L94.5 112.5 L102 104" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <G transform="rotate(35 128 60)">
        <Path d="M128 14 C144 34 142 70 128 100 C116 70 114 34 128 14 Z" fill="url(#dcQuill)" />
        <Path d="M128 20 V104" stroke="#1E3A8A" strokeWidth={1.5} />
        <Path d="M128 100 L125 114 L131 114 Z" fill="#0B1A45" />
      </G>
      <Sparkle x={18} y={40} r={6} />
      <Sparkle x={148} y={128} r={5} color="#93C5FD" />
      <Sparkle x={16} y={132} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Financial details: a rupee coin stack beside a rising bar chart. */
export const FinanceChart3D = memo(function FinanceChart3D({ size = 92 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="fcBar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#BFDBFE" />
        </SvgLinearGradient>
        <RadialGradient id="fcCoin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.55" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
        <RadialGradient id="fcGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={88} r={60} fill="url(#fcGlow)" />
      {[[30, 90, 40], [56, 70, 60], [82, 50, 80]].map(([x, y, h]) => (
        <G key={x}>
          <Rect x={x + 4} y={y + 4} width={20} height={h} rx={5} fill="#0B1A45" fillOpacity={0.4} />
          <Rect x={x} y={y} width={20} height={h} rx={5} fill="url(#fcBar)" />
        </G>
      ))}
      <Path d="M28 84 L66 60 L90 44 L118 22" stroke="#34D399" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Circle cx={118} cy={22} r={5} fill="#34D399" />
      {[128, 118, 108].map((y, i) => (
        <G key={y}>
          <Ellipse cx={124} cy={y + 3} rx={22} ry={8} fill="#78350F" fillOpacity={0.45} />
          <Ellipse cx={122} cy={y} rx={22} ry={8} fill="url(#fcCoin)" />
          {i === 2 ? (
            <Path d="M115 104 H129 M115 108 H129 M120 104 C128 104 128 111 120 111 L128 116" stroke="#78350F" strokeWidth={1.8} strokeLinecap="round" fill="none" />
          ) : null}
        </G>
      ))}
      <Sparkle x={20} y={30} r={6} />
      <Sparkle x={150} y={60} r={5} color="#FDE68A" />
      <Sparkle x={18} y={140} r={4} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ application */

/** Submitted: a paper plane leaving a dashed trail, a green tick riding along. */
export const SubmittedPlane3D = memo(function SubmittedPlane3D({ size = 100 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="spTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DBEAFE" />
        </SvgLinearGradient>
        <SvgLinearGradient id="spUnder" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#93C5FD" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </SvgLinearGradient>
        <RadialGradient id="spTick" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#BBF7D0" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
        <RadialGradient id="spGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={88} cy={70} r={60} fill="url(#spGlow)" />
      <Path d="M18 138 C40 126 42 104 64 100 C80 97 84 88 90 82" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.5} strokeDasharray="5 6" fill="none" strokeLinecap="round" />
      <Path d="M146 20 L60 64 L92 76 Z" fill="#0B1A45" fillOpacity={0.35} transform="translate(4 6)" />
      <Path d="M146 20 L60 64 L92 76 Z" fill="url(#spTop)" />
      <Path d="M146 20 L92 76 L104 112 Z" fill="url(#spUnder)" />
      <Path d="M92 76 L104 112 L96 84 Z" fill="#1E3A8A" />
      <Path d="M146 20 L92 76" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.2} />
      <Circle cx={46} cy={46} r={19} fill="#064E3B" fillOpacity={0.35} />
      <Circle cx={44} cy={44} r={19} fill="url(#spTick)" />
      <Path d="M35 44 L41.5 50.5 L54 38" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Ellipse cx={37} cy={35} rx={5} ry={2.5} fill="#FFFFFF" fillOpacity={0.6} transform="rotate(-30 37 35)" />
      <Sparkle x={128} y={124} r={7} />
      <Sparkle x={20} y={20} r={5} color="#93C5FD" />
      <Sparkle x={150} y={70} r={4} opacity={0.7} />
      <Sparkle x={112} y={148} r={4} color="#93C5FD" />
    </Svg>
  );
});

/** Application status: a document under a progress ring, a clock hand ticking. */
export const StatusTracker3D = memo(function StatusTracker3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="stDoc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D6E4FB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="stRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A7F3D0" />
          <Stop offset="1" stopColor="#10B981" />
        </SvgLinearGradient>
        <RadialGradient id="stDial" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#DBEAFE" />
          <Stop offset="1" stopColor="#2563EB" />
        </RadialGradient>
        <RadialGradient id="stGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={78} cy={86} r={60} fill="url(#stGlow)" />
      <G transform="rotate(-8 60 80)">
        <Rect x={28} y={30} width={70} height={96} rx={10} fill="#0B1A45" fillOpacity={0.45} />
        <Rect x={24} y={26} width={70} height={96} rx={10} fill="url(#stDoc)" />
        <Rect x={34} y={40} width={34} height={5} rx={2.5} fill="#1E3A8A" />
        {[54, 64, 74, 84, 94].map((y, i) => (
          <G key={y}>
            <Circle cx={37} cy={y + 1.5} r={3} fill={i < 2 ? '#10B981' : i === 2 ? '#F59E0B' : '#CBD5E1'} />
            <Rect x={44} y={y} width={i % 2 ? 36 : 42} height={3.5} rx={1.75} fill="#94A3B8" fillOpacity={0.8} />
          </G>
        ))}
      </G>
      <Circle cx={112} cy={100} r={32} fill="#0B1A45" fillOpacity={0.4} />
      <Circle cx={110} cy={97} r={32} fill="url(#stDial)" />
      <Circle cx={110} cy={97} r={24} fill="none" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={6} />
      <Path d="M110 73 A24 24 0 1 1 86 97" fill="none" stroke="url(#stRing)" strokeWidth={6} strokeLinecap="round" />
      <Path d="M110 97 V83 M110 97 L120 103" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={110} cy={97} r={3.5} fill="#FFFFFF" />
      <Ellipse cx={98} cy={80} rx={7} ry={3.5} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-30 98 80)" />
      <Sparkle x={140} y={34} r={6} />
      <Sparkle x={16} y={140} r={5} color="#93C5FD" />
      <Sparkle x={150} y={146} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ auth */

/** Forgot password: an envelope with a key slipping out. */
export const KeyMail3D = memo(function KeyMail3D({ size = 100, admin }: ToneArt) {
  const t = tones(admin);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="kmBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={t.light} />
        </SvgLinearGradient>
        <SvgLinearGradient id="kmFlap" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.mid} />
          <Stop offset="1" stopColor={t.deep} />
        </SvgLinearGradient>
        <RadialGradient id="kmKey" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.55" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
        <RadialGradient id="kmGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={t.glow} stopOpacity={0.5} />
          <Stop offset="1" stopColor={t.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={90} r={60} fill="url(#kmGlow)" />
      <Rect x={26} y={66} width={104} height={70} rx={10} fill={t.shade} fillOpacity={0.45} />
      <Rect x={22} y={62} width={104} height={70} rx={10} fill="url(#kmBody)" />
      <G transform="rotate(-24 94 56)">
        <Circle cx={68} cy={50} r={15} fill="url(#kmKey)" />
        <Circle cx={68} cy={50} r={6} fill={t.shade} fillOpacity={0.55} />
        <Rect x={80} y={46} width={46} height={8} rx={4} fill="url(#kmKey)" />
        <Rect x={108} y={54} width={6} height={10} rx={2} fill="#B45309" />
        <Rect x={118} y={54} width={6} height={7} rx={2} fill="#B45309" />
      </G>
      <Path d="M22 72 L74 108 L126 72 V66 C126 64 124 62 122 62 H26 C24 62 22 64 22 66 Z" fill="url(#kmFlap)" />
      <Path d="M22 132 L64 100 M126 132 L84 100" stroke={t.light} strokeWidth={2} />
      <Path d="M30 64 H70 L30 92 Z" fill="#FFFFFF" fillOpacity={0.2} />
      <Sparkle x={140} y={34} r={7} />
      <Sparkle x={18} y={36} r={5} color={t.light} />
      <Sparkle x={146} y={132} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Reset password: a padlock opening over a masked password field. */
export const NewPassword3D = memo(function NewPassword3D({ size = 100, admin }: ToneArt) {
  const t = tones(admin);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="npBody" cx="32%" cy="25%" r="85%">
          <Stop offset="0" stopColor={t.light} />
          <Stop offset="0.5" stopColor={t.mid} />
          <Stop offset="1" stopColor={t.deep} />
        </RadialGradient>
        <SvgLinearGradient id="npField" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={t.light} />
        </SvgLinearGradient>
        <RadialGradient id="npGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={t.glow} stopOpacity={0.5} />
          <Stop offset="1" stopColor={t.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={80} r={62} fill="url(#npGlow)" />
      <Rect x={18} y={112} width={120} height={28} rx={14} fill={t.shade} fillOpacity={0.4} />
      <Rect x={14} y={108} width={120} height={28} rx={14} fill="url(#npField)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Circle key={i} cx={34 + i * 14} cy={122} r={4} fill={t.deep} />
      ))}
      <Rect x={118} y={114} width={3} height={16} rx={1.5} fill={t.mid} />
      <Path d="M58 58 V42 C58 22 92 22 92 42" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" fill="none" transform="rotate(-18 92 58)" />
      <Rect x={50} y={56} width={60} height={46} rx={12} fill={t.shade} fillOpacity={0.45} />
      <Rect x={46} y={52} width={60} height={46} rx={12} fill="url(#npBody)" />
      <Circle cx={76} cy={72} r={6} fill="#FFFFFF" />
      <Rect x={73.5} y={74} width={5} height={12} rx={2.5} fill="#FFFFFF" />
      <Path d="M50 56 H80 L50 84 Z" fill="#FFFFFF" fillOpacity={0.22} />
      <Sparkle x={128} y={40} r={8} />
      <Sparkle x={22} y={40} r={5} color={t.light} />
      <Sparkle x={146} y={96} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Social sign-in: the member's account linked to three provider nodes. */
export const SocialConnect3D = memo(function SocialConnect3D({ size = 100 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="scMe" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#DBEAFE" />
          <Stop offset="0.5" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </RadialGradient>
        <RadialGradient id="scGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={62} fill="url(#scGlow)" />
      <Path d="M80 84 L32 40 M80 84 L130 44 M80 84 L80 142" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="4 5" />
      {[[32, 40, '#FFFFFF'], [130, 44, '#FFFFFF'], [80, 142, '#FFFFFF']].map(([x, y, c]) => (
        <G key={`${x}-${y}`}>
          <Circle cx={Number(x) + 2} cy={Number(y) + 3} r={15} fill="#0B1A45" fillOpacity={0.4} />
          <Circle cx={Number(x)} cy={Number(y)} r={15} fill={String(c)} />
        </G>
      ))}
      <Circle cx={32} cy={40} r={6} fill="none" stroke="#EA4335" strokeWidth={3} />
      <Rect x={124} y={38} width={12} height={12} rx={2.5} fill="#0A66C2" />
      <Circle cx={80} cy={142} r={7} fill="#0866FF" />
      <Circle cx={83} cy={88} r={27} fill="#0B1A45" fillOpacity={0.4} />
      <Circle cx={80} cy={84} r={27} fill="url(#scMe)" />
      <Circle cx={80} cy={77} r={8} fill="#FFFFFF" />
      <Path d="M66 98 C68 86 92 86 94 98 Z" fill="#FFFFFF" />
      <Ellipse cx={70} cy={68} rx={7} ry={3.5} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-30 70 68)" />
      <Sparkle x={144} y={120} r={6} />
      <Sparkle x={16} y={110} r={5} color="#93C5FD" />
    </Svg>
  );
});

/** Welcome: an open door with light spilling out and a welcome mat. */
export const WelcomeDoor3D = memo(function WelcomeDoor3D({ size = 120 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="wdLight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#FBBF24" stopOpacity={0.6} />
        </SvgLinearGradient>
        <SvgLinearGradient id="wdDoor" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <RadialGradient id="wdGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FDE68A" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#FDE68A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={80} r={64} fill="url(#wdGlow)" />
      <Rect x={44} y={22} width={68} height={112} rx={6} fill="#FFFFFF" />
      <Rect x={50} y={28} width={56} height={106} rx={3} fill="url(#wdLight)" />
      <Path d="M50 28 L28 40 V142 L50 134 Z" fill="url(#wdDoor)" />
      <Circle cx={36} cy={90} r={3} fill="#FBBF24" />
      <Path d="M50 134 L106 134 L130 150 L20 150 Z" fill="#FDE68A" fillOpacity={0.35} />
      <Rect x={52} y={140} width={56} height={8} rx={4} fill="#FFFFFF" fillOpacity={0.85} />
      <Sparkle x={130} y={30} r={8} />
      <Sparkle x={140} y={100} r={5} color="#FDE68A" />
      <Sparkle x={16} y={30} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ gates */

/** A members-only feature: a padlock with a star, on its own navy disc (works on white). */
export const LockedFeature3D = memo(function LockedFeature3D({ size = 104 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="lfDisc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1C2E68" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <RadialGradient id="lfBody" cx="32%" cy="25%" r="85%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.55" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={80} r={70} fill="url(#lfDisc)" />
      <Circle cx={80} cy={80} r={58} fill="none" stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={10} />
      <Path d="M60 76 V60 C60 36 100 36 100 60 V76" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" fill="none" />
      <Rect x={50} y={76} width={64} height={52} rx={12} fill="#0B1A45" fillOpacity={0.45} />
      <Rect x={46} y={72} width={64} height={52} rx={12} fill="url(#lfBody)" />
      <Path d="M78 84 L81.8 92.2 L90.6 93 L84 99 L86 107.6 L78 103 L70 107.6 L72 99 L65.4 93 L74.2 92.2 Z" fill="#FFFFFF" />
      <Path d="M50 76 H80 L50 104 Z" fill="#FFFFFF" fillOpacity={0.25} />
      <Sparkle x={126} y={40} r={7} />
      <Sparkle x={36} y={44} r={4} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ website */

/** Explore ACTIV: a browser window over a globe with a location pin. */
export const WebsiteGlobe3D = memo(function WebsiteGlobe3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="wgGlobe" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#BAE6FD" />
          <Stop offset="0.55" stopColor="#38BDF8" />
          <Stop offset="1" stopColor="#0369A1" />
        </RadialGradient>
        <SvgLinearGradient id="wgWin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DBEAFE" />
        </SvgLinearGradient>
        <RadialGradient id="wgPin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FECACA" />
          <Stop offset="1" stopColor="#DC2626" />
        </RadialGradient>
      </Defs>
      <Rect x={26} y={24} width={100} height={70} rx={10} fill="#0B1A45" fillOpacity={0.4} />
      <Rect x={22} y={20} width={100} height={70} rx={10} fill="url(#wgWin)" />
      <Rect x={22} y={20} width={100} height={14} rx={7} fill="#1E3A8A" />
      <Circle cx={31} cy={27} r={2.5} fill="#F87171" />
      <Circle cx={39} cy={27} r={2.5} fill="#FBBF24" />
      <Circle cx={47} cy={27} r={2.5} fill="#34D399" />
      <Rect x={56} y={24} width={58} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.35} />
      <Rect x={32} y={42} width={42} height={24} rx={4} fill="#BFDBFE" />
      <Rect x={80} y={42} width={32} height={5} rx={2.5} fill="#1E3A8A" />
      <Rect x={80} y={52} width={28} height={4} rx={2} fill="#94A3B8" />
      <Rect x={80} y={60} width={24} height={4} rx={2} fill="#CBD5E1" />
      <Rect x={32} y={72} width={80} height={4} rx={2} fill="#CBD5E1" />
      <Circle cx={108} cy={112} r={34} fill="#0B1A45" fillOpacity={0.4} />
      <Circle cx={106} cy={108} r={34} fill="url(#wgGlobe)" />
      <Path d="M72 108 H140 M106 74 C92 90 92 126 106 142 C120 126 120 90 106 74" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2} fill="none" />
      <Path d="M76 92 C94 98 118 98 136 92 M76 124 C94 118 118 118 136 124" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1.5} fill="none" />
      <Path d="M112 84 C112 74 126 74 126 84 C126 92 119 98 119 104 C119 98 112 92 112 84 Z" fill="url(#wgPin)" />
      <Circle cx={119} cy={84} r={3} fill="#FFFFFF" />
      <Ellipse cx={92} cy={90} rx={8} ry={4} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-30 92 90)" />
      <Sparkle x={144} y={30} r={7} />
      <Sparkle x={20} y={120} r={5} color="#93C5FD" />
    </Svg>
  );
});

/** A faceted platinum gem — the Platinum Lifetime mark (small, for cards). */
export const DiamondGem3D = memo(function DiamondGem3D({ size = 44 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgLinearGradient id="dgTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CBD5E1" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dgBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#64748B" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M18 12 H46 L58 26 L32 56 L6 26 Z" fill="#0B1A45" fillOpacity={0.35} transform="translate(2 3)" />
      <Path d="M18 12 H46 L58 26 H6 Z" fill="url(#dgTop)" />
      <Path d="M6 26 H58 L32 56 Z" fill="url(#dgBody)" />
      <Path d="M18 12 L24 26 L32 12 L40 26 L46 12 M24 26 L32 56 L40 26" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
      <Sparkle x={52} y={10} r={4} />
    </Svg>
  );
});

/* ------------------------------------------------------------ website tiles */

export type SiteArtKind =
  | 'home' | 'about' | 'membership' | 'events' | 'news' | 'schemes' | 'gallery' | 'contact'
  | 'donate' | 'zones' | 'legal' | 'web';

/**
 * A small glyph per website page, drawn white-on-colour for the Explore tiles:
 * a solid front, a translucent back layer for depth, and a highlight.
 */
export const SiteArt = memo(function SiteArt({ kind, size = 44 }: { kind: SiteArtKind; size?: number }) {
  const W = '#FFFFFF';
  const back = { fill: W, fillOpacity: 0.35 };
  let body: React.ReactNode;
  switch (kind) {
    case 'home':
      body = (
        <>
          <Path d="M8 30 L32 10 L56 30" stroke={W} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Rect x={14} y={28} width={36} height={26} rx={4} {...back} />
          <Rect x={16} y={30} width={32} height={24} rx={3} fill={W} />
          <Rect x={27} y={38} width={10} height={16} rx={2} fill="#1E3A8A" fillOpacity={0.55} />
        </>
      );
      break;
    case 'about':
      body = (
        <>
          <Circle cx={20} cy={22} r={7} {...back} />
          <Circle cx={44} cy={22} r={7} {...back} />
          <Path d="M8 48 C9 36 31 36 32 48 Z M32 48 C33 36 55 36 56 48 Z" {...back} />
          <Circle cx={32} cy={20} r={9} fill={W} />
          <Path d="M16 54 C18 38 46 38 48 54 Z" fill={W} />
        </>
      );
      break;
    case 'membership':
      body = (
        <>
          <Rect x={10} y={18} width={46} height={32} rx={6} {...back} />
          <Rect x={6} y={14} width={46} height={32} rx={6} fill={W} />
          <Rect x={12} y={21} width={10} height={8} rx={2} fill="#F59E0B" />
          <Rect x={12} y={34} width={24} height={4} rx={2} fill="#1E3A8A" fillOpacity={0.55} />
          <Circle cx={42} cy={26} r={5} fill="#1E3A8A" fillOpacity={0.45} />
        </>
      );
      break;
    case 'events':
      body = (
        <>
          <Rect x={12} y={16} width={44} height={40} rx={7} {...back} />
          <Rect x={8} y={12} width={44} height={40} rx={7} fill={W} />
          <Rect x={8} y={12} width={44} height={11} rx={5} fill="#DC2626" fillOpacity={0.85} />
          <Rect x={16} y={7} width={4} height={10} rx={2} fill={W} />
          <Rect x={40} y={7} width={4} height={10} rx={2} fill={W} />
          <Circle cx={20} cy={33} r={3} fill="#1E3A8A" fillOpacity={0.4} />
          <Circle cx={30} cy={33} r={3} fill="#1E3A8A" fillOpacity={0.4} />
          <Circle cx={40} cy={33} r={4} fill="#2563EB" />
          <Circle cx={20} cy={43} r={3} fill="#1E3A8A" fillOpacity={0.4} />
          <Circle cx={30} cy={43} r={3} fill="#1E3A8A" fillOpacity={0.4} />
        </>
      );
      break;
    case 'news':
      body = (
        <>
          <Rect x={14} y={12} width={42} height={42} rx={6} {...back} />
          <Rect x={8} y={8} width={42} height={44} rx={6} fill={W} />
          <Rect x={14} y={14} width={30} height={6} rx={3} fill="#1E3A8A" fillOpacity={0.7} />
          <Rect x={14} y={25} width={13} height={12} rx={2} fill="#38BDF8" />
          <Rect x={31} y={25} width={13} height={3} rx={1.5} fill="#94A3B8" />
          <Rect x={31} y={31} width={13} height={3} rx={1.5} fill="#94A3B8" />
          <Rect x={14} y={41} width={30} height={3} rx={1.5} fill="#CBD5E1" />
        </>
      );
      break;
    case 'schemes':
      body = (
        <>
          <Path d="M6 22 L32 8 L58 22 Z" {...back} />
          <Path d="M8 22 L32 10 L56 22 Z" fill={W} />
          {[14, 26, 38, 50].map((x) => <Rect key={x} x={x - 3} y={24} width={6} height={22} rx={2} fill={W} />)}
          <Rect x={6} y={48} width={52} height={7} rx={3} fill={W} />
          <Circle cx={32} cy={17} r={2.5} fill="#F59E0B" />
        </>
      );
      break;
    case 'gallery':
      body = (
        <>
          <Rect x={14} y={8} width={40} height={32} rx={5} {...back} transform="rotate(8 34 24)" />
          <Rect x={8} y={18} width={42} height={34} rx={5} fill={W} />
          <Path d="M12 48 L24 34 L32 42 L38 36 L46 48 Z" fill="#10B981" />
          <Circle cx={39} cy={27} r={4} fill="#F59E0B" />
        </>
      );
      break;
    case 'contact':
      body = (
        <>
          <Path d="M16 14 H54 C57 14 58 16 58 18 V38 C58 41 56 42 54 42 H34 L22 50 V42 H16 C13 42 12 40 12 38 V18 C12 16 14 14 16 14 Z" {...back} />
          <Path d="M10 10 H48 C51 10 52 12 52 14 V34 C52 37 50 38 48 38 H28 L16 46 V38 H10 C7 38 6 36 6 34 V14 C6 12 8 10 10 10 Z" fill={W} />
          <Circle cx={19} cy={24} r={3} fill="#2563EB" />
          <Circle cx={29} cy={24} r={3} fill="#2563EB" />
          <Circle cx={39} cy={24} r={3} fill="#2563EB" />
        </>
      );
      break;
    case 'donate':
      body = (
        <>
          <Path d="M32 22 C28 12 14 12 14 24 C14 32 24 38 32 44 C40 38 50 32 50 24 C50 12 36 12 32 22 Z" fill={W} />
          <Path d="M6 48 C14 44 22 44 30 48 L44 48 C48 48 48 54 44 54 H26" stroke={W} strokeWidth={4} strokeLinecap="round" fill="none" strokeOpacity={0.7} />
          <Ellipse cx={24} cy={20} rx={4} ry={2} fill="#FECACA" transform="rotate(-30 24 20)" />
        </>
      );
      break;
    case 'zones':
      body = (
        <>
          <Path d="M8 16 L24 10 L40 16 L56 10 V48 L40 54 L24 48 L8 54 Z" {...back} />
          <Path d="M24 10 V48 M40 16 V54" stroke={W} strokeOpacity={0.6} strokeWidth={2} />
          <Path d="M32 12 C22 12 20 26 32 40 C44 26 42 12 32 12 Z" fill={W} />
          <Circle cx={32} cy={22} r={4.5} fill="#DC2626" />
        </>
      );
      break;
    case 'legal':
      body = (
        <>
          <Path d="M32 6 L54 14 V30 C54 44 44 52 32 58 C20 52 10 44 10 30 V14 Z" fill={W} />
          <Path d="M22 31 L29 38 L43 24" stroke="#2563EB" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
      break;
    default:
      body = (
        <>
          <Circle cx={32} cy={32} r={24} fill={W} />
          <Path d="M8 32 H56 M32 8 C22 18 22 46 32 56 C42 46 42 18 32 8" stroke="#2563EB" strokeWidth={2.5} fill="none" />
        </>
      );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {body}
    </Svg>
  );
});
