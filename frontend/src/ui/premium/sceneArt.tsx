import React, { memo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import { PREMIUM_GRADIENTS } from './theme';

/**
 * ============================================================================
 * SCENE ART — original vector 3D art for the member inner screens
 * ============================================================================
 *
 * Same method as illustrations.tsx (react-native-svg only, no stock PNGs):
 * brand navy/blue gradients for volume, an offset dark "thickness" layer,
 * a specular highlight, sparkles. Every piece is memoised static SVG — the
 * FloatingIllustration wrapper moves the view on the native driver.
 *
 *   Events ....... EventTicket3D          Messages ...... ChatBubbles3D
 *   Certificates . CertificateSeal3D      Payment ....... SecureCard3D
 *   Donate ....... DonateHeart3D          Help .......... SupportHeadset3D
 *   Plan ......... PremiumPlan3D          Documents ..... DocumentStack3D
 *   Bell ......... NotificationBell3D     Updates ....... Megaphone3D
 *   Platinum ..... PlatinumCrown3D        Settings ...... SettingsGear3D
 *   Receipt ...... Receipt3D              Directory ..... DirectorySearch3D
 *   Result ....... ResultOrb3D (success | failed | pending)
 *   States ....... CloudOff3D (error) · EmptyBox3D (empty)
 *
 * All drawn for a dark (gradient) background. On the light canvas, sit them
 * in an <ArtBadge> (a navy→blue disc) so the white faces still read.
 *
 * Gradient ids are prefixed per piece so two pieces on one screen never
 * resolve each other's `url(#…)`.
 */

type ArtProps = { size?: number };

function Sparkle({ x, y, r, color = '#FFFFFF', opacity = 0.9 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
  return <Path d={d} fill={color} fillOpacity={opacity} />;
}

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5) {
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

function PersonGlyph({ cx, cy, r, ring, glyph = '#2563EB' }: { cx: number; cy: number; r: number; ring: string; glyph?: string }) {
  const inner = r - Math.max(2, r * 0.14);
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={ring} />
      <Circle cx={cx} cy={cy} r={inner} fill="#FFFFFF" />
      <Circle cx={cx} cy={cy - inner * 0.22} r={inner * 0.32} fill={glyph} />
      <Path
        d={`M${cx - inner * 0.58} ${cy + inner * 0.62} C${cx - inner * 0.5} ${cy + inner * 0.12} ${cx + inner * 0.5} ${cy + inner * 0.12} ${cx + inner * 0.58} ${cy + inner * 0.62} Z`}
        fill={glyph}
      />
    </G>
  );
}

/** A soft blue glow behind a piece. */
function Glow({ id, cx = 80, cy = 84, r = 72 }: { id: string; cx?: number; cy?: number; r?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.42} />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

/* ============================================================ events */

const TICKET = 'M34 50 H126 A10 10 0 0 1 136 60 V72 A8 8 0 0 0 136 88 V100 A10 10 0 0 1 126 110 H34 A10 10 0 0 1 24 100 V88 A8 8 0 0 0 24 72 V60 A10 10 0 0 1 34 50 Z';
const TICKET_STUB = 'M34 50 H60 V110 H34 A10 10 0 0 1 24 100 V88 A8 8 0 0 0 24 72 V60 A10 10 0 0 1 34 50 Z';
const BARCODE = [0, 4, 6, 10, 13, 15, 19, 22, 24];

/** Events: an admission ticket in front of a desk calendar with the day picked. */
export const EventTicket3D = memo(function EventTicket3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="etFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8FD" />
        </SvgLinearGradient>
        <SvgLinearGradient id="etBand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="etGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="etGlow" />

      {/* calendar, behind */}
      <G transform="rotate(10 118 44)">
        <Rect x={98} y={22} width={46} height={44} rx={9} fill="#020617" fillOpacity={0.3} />
        <Rect x={95} y={18} width={46} height={44} rx={9} fill="url(#etFace)" />
        <Path d="M104 18 H132 A9 9 0 0 1 141 27 V32 H95 V27 A9 9 0 0 1 104 18 Z" fill="url(#etBand)" />
        <Rect x={104} y={12} width={5} height={11} rx={2.5} fill="#E2E8F0" />
        <Rect x={127} y={12} width={5} height={11} rx={2.5} fill="#E2E8F0" />
        <Rect x={101} y={38} width={9} height={8} rx={2} fill="#E2E8F0" />
        <Rect x={113} y={38} width={9} height={8} rx={2} fill="url(#etBand)" />
        <Rect x={125} y={38} width={9} height={8} rx={2} fill="#E2E8F0" />
        <Rect x={101} y={49} width={9} height={8} rx={2} fill="#E2E8F0" />
        <Rect x={113} y={49} width={9} height={8} rx={2} fill="#E2E8F0" />
      </G>

      {/* ticket */}
      <G transform="rotate(-10 80 80)">
        <Path d={TICKET} fill="#020617" fillOpacity={0.35} transform="translate(3 5)" />
        <Path d={TICKET} fill="url(#etFace)" />
        <Path d={TICKET_STUB} fill="url(#etBand)" />
        <Path d="M60 54 V106" stroke="#94A3B8" strokeWidth={1.6} strokeDasharray="3 4" />
        <Path d={starPath(42, 80, 9, 4)} fill="url(#etGold)" />
        <Rect x={68} y={60} width={40} height={7} rx={3.5} fill="#1E3A8A" />
        <Rect x={68} y={73} width={52} height={4} rx={2} fill="#CBD5E1" />
        <Rect x={68} y={82} width={34} height={4} rx={2} fill="#CBD5E1" />
        {BARCODE.map((x, i) => (
          <Rect key={x} x={68 + x * 2} y={92} width={i % 3 === 0 ? 3 : 1.6} height={12} fill="#1E3A8A" fillOpacity={0.75} />
        ))}
        <Ellipse cx={84} cy={55} rx={16} ry={2.5} fill="#FFFFFF" fillOpacity={0.7} />
      </G>

      <Sparkle x={24} y={32} r={7} />
      <Sparkle x={146} y={120} r={5} color="#93C5FD" />
      <Sparkle x={70} y={20} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ messages */

/** Messages: a blue bubble (typing) answered by a white one, with an online dot. */
export const ChatBubbles3D = memo(function ChatBubbles3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="cbBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="0.5" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="cbWhite" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D6E2F5" />
        </SvgLinearGradient>
        <RadialGradient id="cbDot" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#A7F3D0" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
      </Defs>
      <Glow id="cbGlow" />

      <Path d="M36 30 H106 A18 18 0 0 1 124 48 V74 A18 18 0 0 1 106 92 H56 L36 106 L40 92 A18 18 0 0 1 18 74 V48 A18 18 0 0 1 36 30 Z" fill="#020617" fillOpacity={0.3} transform="translate(3 5)" />
      <Path d="M36 30 H106 A18 18 0 0 1 124 48 V74 A18 18 0 0 1 106 92 H56 L36 106 L40 92 A18 18 0 0 1 18 74 V48 A18 18 0 0 1 36 30 Z" fill="url(#cbBlue)" />
      <Ellipse cx={52} cy={38} rx={20} ry={4} fill="#FFFFFF" fillOpacity={0.3} />
      <Circle cx={52} cy={61} r={7} fill="#FFFFFF" />
      <Circle cx={71} cy={61} r={7} fill="#FFFFFF" fillOpacity={0.8} />
      <Circle cx={90} cy={61} r={7} fill="#FFFFFF" fillOpacity={0.55} />

      <Path d="M76 88 H128 A16 16 0 0 1 144 104 V120 A16 16 0 0 1 128 136 H124 L130 148 L110 136 H76 A16 16 0 0 1 60 120 V104 A16 16 0 0 1 76 88 Z" fill="#020617" fillOpacity={0.3} transform="translate(3 5)" />
      <Path d="M76 88 H128 A16 16 0 0 1 144 104 V120 A16 16 0 0 1 128 136 H124 L130 148 L110 136 H76 A16 16 0 0 1 60 120 V104 A16 16 0 0 1 76 88 Z" fill="url(#cbWhite)" />
      <Rect x={74} y={102} width={52} height={6} rx={3} fill="#2563EB" fillOpacity={0.75} />
      <Rect x={74} y={115} width={36} height={6} rx={3} fill="#93C5FD" />

      <Circle cx={134} cy={36} r={11} fill="#FFFFFF" />
      <Circle cx={134} cy={36} r={8} fill="url(#cbDot)" />

      <Sparkle x={24} y={128} r={6} color="#93C5FD" />
      <Sparkle x={146} y={70} r={5} />
      <Sparkle x={100} y={16} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ certificates */

/** Certificates: a bordered diploma with a gold rosette seal and blue ribbons. */
export const CertificateSeal3D = memo(function CertificateSeal3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="csPage" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E6ECF6" />
        </SvgLinearGradient>
        <RadialGradient id="csGold" cx="35%" cy="30%" r="85%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.45" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
      </Defs>
      <Glow id="csGlow" />

      <G transform="rotate(-6 78 80)">
        <Rect x={30} y={26} width={98} height={112} rx={8} fill="#020617" fillOpacity={0.35} transform="translate(4 5)" />
        <Rect x={30} y={26} width={98} height={112} rx={8} fill="url(#csPage)" />
        <Rect x={37} y={33} width={84} height={98} rx={4} fill="none" stroke="#D4A72C" strokeWidth={2} />
        <Rect x={41} y={37} width={76} height={90} rx={3} fill="none" stroke="#D4A72C" strokeOpacity={0.45} strokeWidth={1} />
        <Rect x={56} y={46} width={46} height={7} rx={3.5} fill="#1E3A8A" />
        <Rect x={50} y={62} width={58} height={4} rx={2} fill="#CBD5E1" />
        <Rect x={54} y={71} width={50} height={4} rx={2} fill="#CBD5E1" />
        <Rect x={50} y={80} width={58} height={4} rx={2} fill="#CBD5E1" />
        <Path d="M50 108 C56 100 60 112 66 104 C70 99 74 108 80 104" stroke="#1E3A8A" strokeWidth={2} strokeLinecap="round" fill="none" />
        <Rect x={48} y={113} width={34} height={1.5} fill="#94A3B8" />
      </G>

      <Path d="M104 122 L96 152 L108 145 L114 154 L120 126 Z" fill="#1E3A8A" />
      <Path d="M130 122 L138 152 L126 145 L120 154 L114 126 Z" fill="#2563EB" />
      <Circle cx={119} cy={112} r={25} fill="#020617" fillOpacity={0.28} />
      <Path d={starPath(117, 109, 26, 21, 16)} fill="url(#csGold)" />
      <Circle cx={117} cy={109} r={17} fill="none" stroke="#FFFFFF" strokeOpacity={0.65} strokeDasharray="2 3" />
      <Path d={starPath(117, 109, 9, 4)} fill="#FFFFFF" />
      <Ellipse cx={108} cy={97} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-30 108 97)" />

      <Sparkle x={24} y={30} r={7} />
      <Sparkle x={148} y={40} r={5} color="#FDE68A" />
      <Sparkle x={20} y={128} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ payment */

/** Payment: a bank card, a second one behind it, and a green shield with a padlock. */
export const SecureCard3D = memo(function SecureCard3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="scCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="0.6" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#60A5FA" />
        </SvgLinearGradient>
        <SvgLinearGradient id="scBack" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#94A3B8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="scChip" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
        <SvgLinearGradient id="scShield" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#047857" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="scGlow" />

      <G transform="rotate(12 86 62)">
        <Rect x={40} y={30} width={96} height={60} rx={10} fill="url(#scBack)" />
        <Rect x={40} y={42} width={96} height={11} fill="#475569" fillOpacity={0.6} />
      </G>
      <G transform="rotate(-8 74 88)">
        <Rect x={22} y={56} width={104} height={66} rx={12} fill="#020617" fillOpacity={0.35} transform="translate(3 5)" />
        <Rect x={22} y={56} width={104} height={66} rx={12} fill="url(#scCard)" />
        <Ellipse cx={48} cy={62} rx={22} ry={3.5} fill="#FFFFFF" fillOpacity={0.3} />
        <Rect x={34} y={72} width={20} height={15} rx={3} fill="url(#scChip)" />
        <Path d="M34 79.5 H54 M44 72 V87" stroke="#B45309" strokeOpacity={0.5} strokeWidth={1} />
        {[0, 1, 2, 3].map((i) => (
          <Rect key={i} x={34 + i * 21} y={96} width={16} height={5} rx={2.5} fill="#FFFFFF" fillOpacity={0.85} />
        ))}
        <Rect x={34} y={107} width={30} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.55} />
        <Circle cx={104} cy={108} r={7} fill="#FFFFFF" fillOpacity={0.55} />
        <Circle cx={112} cy={108} r={7} fill="#FFFFFF" fillOpacity={0.35} />
      </G>

      <Path d="M122 84 L146 93 V110 C146 126 136 138 122 144 C108 138 98 126 98 110 V93 Z" fill="#020617" fillOpacity={0.3} transform="translate(3 4)" />
      <Path d="M122 84 L146 93 V110 C146 126 136 138 122 144 C108 138 98 126 98 110 V93 Z" fill="url(#scShield)" stroke="#D1FAE5" strokeWidth={2.5} />
      <Path d="M115 110 V104 A7 7 0 0 1 129 104 V110" stroke="#FFFFFF" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Rect x={111} y={109} width={22} height={17} rx={4} fill="#FFFFFF" />
      <Circle cx={122} cy={117} r={2.8} fill="#047857" />
      <Ellipse cx={110} cy={96} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-30 110 96)" />

      <Sparkle x={26} y={32} r={7} />
      <Sparkle x={150} y={60} r={5} color="#93C5FD" />
      <Sparkle x={30} y={140} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Donate: a glossy heart lifted by cupped hands, with coins rising. */
export const DonateHeart3D = memo(function DonateHeart3D({ size = 96 }: ArtProps) {
  const heart = 'M80 106 C80 106 42 84 42 58 C42 43 53 33 66 33 C73 33 77 37 80 42 C83 37 87 33 94 33 C107 33 118 43 118 58 C118 84 80 106 80 106 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="dhHeart" cx="35%" cy="30%" r="85%">
          <Stop offset="0" stopColor="#FECDD3" />
          <Stop offset="0.45" stopColor="#FB7185" />
          <Stop offset="1" stopColor="#BE123C" />
        </RadialGradient>
        <SvgLinearGradient id="dhHands" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#BFD0EA" />
        </SvgLinearGradient>
        <RadialGradient id="dhCoin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#D97706" />
        </RadialGradient>
      </Defs>
      <Glow id="dhGlow" />

      <Path d={heart} fill="#020617" fillOpacity={0.3} transform="translate(3 6)" />
      <Path d={heart} fill="url(#dhHeart)" />
      <Ellipse cx={60} cy={48} rx={10} ry={6} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-35 60 48)" />

      <Path d="M18 104 C30 108 44 116 56 124 L80 124 L104 124 C116 116 130 108 142 104 C148 102 152 110 146 116 C132 132 110 146 80 146 C50 146 28 132 14 116 C8 110 12 102 18 104 Z" fill="#020617" fillOpacity={0.28} transform="translate(2 4)" />
      <Path d="M18 104 C30 108 44 116 56 124 L80 124 L104 124 C116 116 130 108 142 104 C148 102 152 110 146 116 C132 132 110 146 80 146 C50 146 28 132 14 116 C8 110 12 102 18 104 Z" fill="url(#dhHands)" />
      <Path d="M80 124 V144" stroke="#94A3B8" strokeWidth={1.5} strokeOpacity={0.7} />
      <Path d="M36 120 C42 124 48 128 52 132 M124 120 C118 124 112 128 108 132" stroke="#94A3B8" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" fill="none" />

      <Circle cx={128} cy={40} r={10} fill="url(#dhCoin)" />
      <Circle cx={128} cy={40} r={6} fill="none" stroke="#B45309" strokeOpacity={0.5} />
      <Circle cx={34} cy={30} r={7} fill="url(#dhCoin)" />

      <Sparkle x={140} y={80} r={6} />
      <Sparkle x={20} y={70} r={5} color="#FECDD3" />
      <Sparkle x={96} y={16} r={4} opacity={0.7} />
    </Svg>
  );
});

/** A receipt with a zig-zag tear, a total bar and a paid coin. */
export const Receipt3D = memo(function Receipt3D({ size = 96 }: ArtProps) {
  const paper = 'M40 20 H120 V134 L112 128 L104 134 L96 128 L88 134 L80 128 L72 134 L64 128 L56 134 L48 128 L40 134 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="rcPaper" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E2E8F0" />
        </SvgLinearGradient>
        <RadialGradient id="rcCoin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#A7F3D0" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>
      <Glow id="rcGlow" />
      <G transform="rotate(-5 80 78)">
        <Path d={paper} fill="#020617" fillOpacity={0.33} transform="translate(4 5)" />
        <Path d={paper} fill="url(#rcPaper)" />
        <Rect x={52} y={32} width={56} height={8} rx={4} fill="#1E3A8A" />
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Rect x={52} y={52 + i * 13} width={32} height={4} rx={2} fill="#CBD5E1" />
            <Rect x={92} y={52 + i * 13} width={16} height={4} rx={2} fill="#94A3B8" />
          </G>
        ))}
        <Path d="M52 94 H108" stroke="#94A3B8" strokeDasharray="3 3" />
        <Rect x={52} y={102} width={56} height={11} rx={4} fill="#2563EB" />
      </G>
      <Circle cx={122} cy={120} r={21} fill="#020617" fillOpacity={0.28} />
      <Circle cx={120} cy={117} r={20} fill="url(#rcCoin)" stroke="#D1FAE5" strokeWidth={3} />
      <Path d="M111 117 L117 123 L129 110" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={28} y={40} r={7} />
      <Sparkle x={140} y={36} r={5} color="#93C5FD" />
    </Svg>
  );
});

/** Payment outcome: a glossy orb — green tick, red cross, or amber clock. */
export const ResultOrb3D = memo(function ResultOrb3D({ size = 96, kind = 'success' }: ArtProps & { kind?: 'success' | 'failed' | 'pending' }) {
  const stops = kind === 'failed'
    ? ['#FECACA', '#EF4444', '#991B1B']
    : kind === 'pending'
      ? ['#FEF3C7', '#F59E0B', '#B45309']
      : ['#A7F3D0', '#10B981', '#047857'];
  const id = `ro${kind}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" r="85%">
          <Stop offset="0" stopColor={stops[0]} />
          <Stop offset="0.5" stopColor={stops[1]} />
          <Stop offset="1" stopColor={stops[2]} />
        </RadialGradient>
      </Defs>
      <Glow id={`${id}Glow`} cx={80} cy={80} r={76} />
      <Circle cx={80} cy={80} r={58} fill="#FFFFFF" fillOpacity={0.12} />
      <Circle cx={83} cy={86} r={44} fill="#020617" fillOpacity={0.3} />
      <Circle cx={80} cy={80} r={44} fill={`url(#${id})`} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={3} />
      {kind === 'failed' ? (
        <Path d="M64 64 L96 96 M96 64 L64 96" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" />
      ) : kind === 'pending' ? (
        <>
          <Circle cx={80} cy={80} r={22} fill="none" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M80 66 V80 L90 88" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <Path d="M60 81 L74 95 L101 66" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      <Ellipse cx={62} cy={58} rx={14} ry={7} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-35 62 58)" />
      {kind === 'success' ? (
        <>
          <Rect x={24} y={34} width={8} height={4} rx={2} fill="#FDE68A" transform="rotate(30 28 36)" />
          <Rect x={128} y={40} width={8} height={4} rx={2} fill="#93C5FD" transform="rotate(-25 132 42)" />
          <Rect x={132} y={116} width={8} height={4} rx={2} fill="#FECDD3" transform="rotate(40 136 118)" />
          <Rect x={22} y={112} width={8} height={4} rx={2} fill="#A7F3D0" transform="rotate(-40 26 114)" />
        </>
      ) : null}
      <Sparkle x={138} y={24} r={7} />
      <Sparkle x={20} y={80} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ help */

/** Help: a support headset with a mic boom and a reply bubble. */
export const SupportHeadset3D = memo(function SupportHeadset3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="shBand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#94A3B8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="shCup" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="0.5" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="shBubble" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8FD" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="shGlow" />
      <Path d="M36 96 C36 56 56 36 80 36 C104 36 124 56 124 96" stroke="#020617" strokeOpacity={0.3} strokeWidth={12} fill="none" strokeLinecap="round" transform="translate(3 4)" />
      <Path d="M36 96 C36 56 56 36 80 36 C104 36 124 56 124 96" stroke="url(#shBand)" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Rect x={22} y={82} width={28} height={46} rx={13} fill="#020617" fillOpacity={0.3} transform="translate(3 4)" />
      <Rect x={22} y={82} width={28} height={46} rx={13} fill="url(#shCup)" />
      <Rect x={110} y={82} width={28} height={46} rx={13} fill="#020617" fillOpacity={0.3} transform="translate(3 4)" />
      <Rect x={110} y={82} width={28} height={46} rx={13} fill="url(#shCup)" />
      <Rect x={44} y={90} width={8} height={30} rx={4} fill="#0B1A45" fillOpacity={0.55} />
      <Rect x={108} y={90} width={8} height={30} rx={4} fill="#0B1A45" fillOpacity={0.55} />
      <Ellipse cx={30} cy={92} rx={4} ry={8} fill="#FFFFFF" fillOpacity={0.4} />
      <Path d="M122 126 C120 142 104 148 90 146" stroke="url(#shBand)" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Rect x={76} y={139} width={18} height={12} rx={6} fill="url(#shCup)" />

      <Path d="M104 12 H142 A10 10 0 0 1 152 22 V40 A10 10 0 0 1 142 50 H122 L112 58 L113 50 H104 A10 10 0 0 1 94 40 V22 A10 10 0 0 1 104 12 Z" fill="url(#shBubble)" />
      <Circle cx={112} cy={31} r={3.5} fill="#2563EB" />
      <Circle cx={123} cy={31} r={3.5} fill="#2563EB" fillOpacity={0.75} />
      <Circle cx={134} cy={31} r={3.5} fill="#2563EB" fillOpacity={0.5} />

      <Sparkle x={24} y={40} r={7} />
      <Sparkle x={80} y={110} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ plan */

/** Membership plan: a navy member card with a gold chip and star, a silver card behind. */
export const PremiumPlan3D = memo(function PremiumPlan3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="ppFront" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B1A45" />
          <Stop offset="0.55" stopColor="#1E3A8A" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ppBack" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F8FAFC" />
          <Stop offset="1" stopColor="#94A3B8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ppGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="ppGlow" />
      <G transform="rotate(12 94 60)">
        <Rect x={46} y={30} width={96} height={60} rx={12} fill="url(#ppBack)" />
        <Rect x={58} y={70} width={40} height={5} rx={2.5} fill="#64748B" fillOpacity={0.5} />
      </G>
      <G transform="rotate(-8 72 92)">
        <Rect x={18} y={60} width={108} height={68} rx={13} fill="#020617" fillOpacity={0.35} transform="translate(3 5)" />
        <Rect x={18} y={60} width={108} height={68} rx={13} fill="url(#ppFront)" />
        <Rect x={18} y={60} width={108} height={68} rx={13} fill="none" stroke="#FBBF24" strokeOpacity={0.55} strokeWidth={1.5} />
        <Ellipse cx={46} cy={66} rx={24} ry={3.5} fill="#FFFFFF" fillOpacity={0.25} />
        <Rect x={30} y={76} width={20} height={15} rx={3} fill="url(#ppGold)" />
        <Rect x={30} y={100} width={46} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.9} />
        <Rect x={30} y={111} width={30} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d={starPath(104, 102, 14, 6)} fill="url(#ppGold)" />
      </G>
      <Circle cx={38} cy={38} r={17} fill="#020617" fillOpacity={0.25} />
      <Circle cx={36} cy={35} r={16} fill="url(#ppGold)" stroke="#FEF3C7" strokeWidth={2} />
      <Path d="M27 39 L29 29 L33.5 34 L36 27 L38.5 34 L43 29 L45 39 Z" fill="#FFFFFF" />
      <Sparkle x={144} y={116} r={7} />
      <Sparkle x={140} y={22} r={5} color="#FDE68A" />
      <Sparkle x={20} y={136} r={4} opacity={0.7} />
    </Svg>
  );
});

/** Platinum: a faceted platinum gem under a gold crown. */
export const PlatinumCrown3D = memo(function PlatinumCrown3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="pcGem" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.45" stopColor="#CBD5E1" />
          <Stop offset="1" stopColor="#475569" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pcGemDark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#94A3B8" />
          <Stop offset="1" stopColor="#334155" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pcGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="pcGlow" />
      <Path d="M48 70 H112 L134 92 L80 146 L26 92 Z" fill="#020617" fillOpacity={0.35} transform="translate(3 5)" />
      <Path d="M48 70 H112 L134 92 L80 146 L26 92 Z" fill="url(#pcGem)" />
      <Path d="M26 92 H134 L80 146 Z" fill="url(#pcGemDark)" fillOpacity={0.55} />
      <Path d="M48 70 L62 92 L80 70 L98 92 L112 70 M62 92 L80 146 L98 92" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.5} fill="none" />
      <Path d="M52 74 L60 88 L40 88 Z" fill="#FFFFFF" fillOpacity={0.6} />

      <Path d="M52 60 L56 30 L70 44 L80 24 L90 44 L104 30 L108 60 Z" fill="#020617" fillOpacity={0.3} transform="translate(2 3)" />
      <Path d="M52 60 L56 30 L70 44 L80 24 L90 44 L104 30 L108 60 Z" fill="url(#pcGold)" />
      <Rect x={50} y={56} width={60} height={9} rx={3} fill="url(#pcGold)" />
      <Circle cx={56} cy={30} r={4} fill="#FEF3C7" />
      <Circle cx={80} cy={24} r={4.5} fill="#FEF3C7" />
      <Circle cx={104} cy={30} r={4} fill="#FEF3C7" />
      <Circle cx={80} cy={50} r={4} fill="#60A5FA" />

      <Sparkle x={138} y={60} r={8} />
      <Sparkle x={22} y={50} r={6} color="#E2E8F0" />
      <Sparkle x={128} y={132} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ documents */

/** Documents: a blue folder holding papers, with a verified tick. */
export const DocumentStack3D = memo(function DocumentStack3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="dsBack" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="1" stopColor="#0B1A45" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dsFront" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dsPaper" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E2E8F0" />
        </SvgLinearGradient>
        <RadialGradient id="dsTick" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#A7F3D0" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>
      <Glow id="dsGlow" />
      <Path d="M22 44 A8 8 0 0 1 30 36 H62 L72 46 H130 A8 8 0 0 1 138 54 V128 A8 8 0 0 1 130 136 H30 A8 8 0 0 1 22 128 Z" fill="url(#dsBack)" />
      <G transform="rotate(-7 70 70)">
        <Rect x={40} y={30} width={62} height={78} rx={6} fill="url(#dsPaper)" />
        <Rect x={50} y={42} width={34} height={5} rx={2.5} fill="#1E3A8A" />
        <Rect x={50} y={54} width={42} height={3.5} rx={1.75} fill="#CBD5E1" />
        <Rect x={50} y={63} width={36} height={3.5} rx={1.75} fill="#CBD5E1" />
      </G>
      <G transform="rotate(6 100 70)">
        <Rect x={70} y={34} width={58} height={74} rx={6} fill="url(#dsPaper)" />
        <Rect x={80} y={46} width={30} height={5} rx={2.5} fill="#2563EB" />
        <Rect x={80} y={58} width={38} height={3.5} rx={1.75} fill="#CBD5E1" />
        <Rect x={80} y={67} width={30} height={3.5} rx={1.75} fill="#CBD5E1" />
      </G>
      <Path d="M16 76 A8 8 0 0 1 24 68 H136 A8 8 0 0 1 144 76 L138 130 A8 8 0 0 1 130 137 H30 A8 8 0 0 1 22 130 Z" fill="#020617" fillOpacity={0.3} transform="translate(2 4)" />
      <Path d="M16 76 A8 8 0 0 1 24 68 H136 A8 8 0 0 1 144 76 L138 130 A8 8 0 0 1 130 137 H30 A8 8 0 0 1 22 130 Z" fill="url(#dsFront)" />
      <Ellipse cx={50} cy={74} rx={24} ry={3} fill="#FFFFFF" fillOpacity={0.35} />
      <Circle cx={124} cy={122} r={18} fill="url(#dsTick)" stroke="#D1FAE5" strokeWidth={3} />
      <Path d="M116 122 L122 128 L132 116" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={26} y={24} r={7} />
      <Sparkle x={148} y={32} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ bell & updates */

/** Notifications: a gold bell mid-ring with a red count dot. */
export const NotificationBell3D = memo(function NotificationBell3D({ size = 96 }: ArtProps) {
  const bell = 'M80 30 C60 30 48 46 48 66 V88 L36 106 H124 L112 88 V66 C112 46 100 30 80 30 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="nbBell" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.45" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </SvgLinearGradient>
        <RadialGradient id="nbDot" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FCA5A5" />
          <Stop offset="1" stopColor="#B91C1C" />
        </RadialGradient>
      </Defs>
      <Glow id="nbGlow" />
      <G transform="rotate(-12 80 80)">
        <Path d={bell} fill="#020617" fillOpacity={0.33} transform="translate(3 5)" />
        <Path d={bell} fill="url(#nbBell)" />
        <Rect x={32} y={102} width={96} height={12} rx={6} fill="url(#nbBell)" />
        <Circle cx={80} cy={124} r={10} fill="#B45309" />
        <Circle cx={80} cy={25} r={7} fill="url(#nbBell)" />
        <Ellipse cx={64} cy={52} rx={7} ry={14} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(20 64 52)" />
      </G>
      <Path d="M24 58 C18 70 18 84 24 96 M136 58 C142 70 142 84 136 96" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M12 50 C4 68 4 86 12 104 M148 50 C156 68 156 86 148 104" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={116} cy={34} r={15} fill="#FFFFFF" />
      <Circle cx={116} cy={34} r={12} fill="url(#nbDot)" />
      <Sparkle x={40} y={24} r={6} />
    </Svg>
  );
});

/** Association updates: a megaphone announcing, with sound arcs. */
export const Megaphone3D = memo(function Megaphone3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="mgCone" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#BFD0EA" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mgRim" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mgGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="mgGlow" />
      <G transform="rotate(-14 76 80)">
        <Path d="M40 66 L104 36 V124 L40 94 Z" fill="#020617" fillOpacity={0.33} transform="translate(3 5)" />
        <Rect x={24} y={64} width={20} height={32} rx={6} fill="url(#mgRim)" />
        <Path d="M40 66 L104 36 V124 L40 94 Z" fill="url(#mgCone)" />
        <Path d="M40 66 L104 36 V52 L40 76 Z" fill="#FFFFFF" fillOpacity={0.5} />
        <Ellipse cx={104} cy={80} rx={12} ry={44} fill="url(#mgRim)" />
        <Ellipse cx={106} cy={80} rx={6} ry={32} fill="#0B1A45" fillOpacity={0.5} />
        <Path d="M50 94 L58 124 A6 6 0 0 0 70 121 L66 100" fill="url(#mgRim)" />
      </G>
      <Path d="M126 52 C136 62 138 78 132 92" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M138 38 C154 56 156 84 144 104" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d={starPath(130, 128, 10, 4.5)} fill="url(#mgGold)" />
      <Sparkle x={26} y={30} r={7} />
      <Sparkle x={62} y={140} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ settings */

const GEAR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** Settings: a blue gear meshing a small gold one, beside an on switch. */
export const SettingsGear3D = memo(function SettingsGear3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="sgBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="0.5" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="sgGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
        <SvgLinearGradient id="sgPill" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#059669" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="sgGlow" />
      <G transform="translate(3 5)">
        <Circle cx={70} cy={70} r={34} fill="#020617" fillOpacity={0.3} />
      </G>
      {GEAR_ANGLES.map((deg) => (
        <Rect key={deg} x={62} y={26} width={16} height={18} rx={4} fill="url(#sgBlue)" transform={`rotate(${deg + 10} 70 70)`} />
      ))}
      <Circle cx={70} cy={70} r={34} fill="url(#sgBlue)" />
      <Circle cx={70} cy={70} r={14} fill="#0B1A45" />
      <Circle cx={70} cy={70} r={8} fill="#1E3A8A" />
      <Ellipse cx={56} cy={52} rx={10} ry={5} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-35 56 52)" />
      {GEAR_ANGLES.map((deg) => (
        <Rect key={`g${deg}`} x={114} y={82} width={9} height={10} rx={2.5} fill="url(#sgGold)" transform={`rotate(${deg} 118.5 104)`} />
      ))}
      <Circle cx={118.5} cy={104} r={17} fill="url(#sgGold)" />
      <Circle cx={118.5} cy={104} r={6} fill="#B45309" />

      <Rect x={26} y={120} width={60} height={28} rx={14} fill="#020617" fillOpacity={0.3} transform="translate(2 3)" />
      <Rect x={26} y={120} width={60} height={28} rx={14} fill="url(#sgPill)" />
      <Circle cx={72} cy={134} r={11} fill="#FFFFFF" />
      <Sparkle x={140} y={32} r={7} />
      <Sparkle x={22} y={30} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ directory */

/** Directory: member cards fanned out under a magnifying glass. */
export const DirectorySearch3D = memo(function DirectorySearch3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="drCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8FD" />
        </SvgLinearGradient>
        <SvgLinearGradient id="drRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="1" stopColor="#2563EB" />
        </SvgLinearGradient>
        <SvgLinearGradient id="drGlass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="drGlow" />
      <G transform="rotate(-12 60 60)">
        <Rect x={22} y={34} width={64} height={80} rx={10} fill="#020617" fillOpacity={0.3} transform="translate(3 5)" />
        <Rect x={22} y={34} width={64} height={80} rx={10} fill="url(#drCard)" />
        <PersonGlyph cx={54} cy={62} r={15} ring="url(#drRing)" glyph="#1D4ED8" />
        <Rect x={36} y={86} width={36} height={5} rx={2.5} fill="#1E3A8A" />
        <Rect x={40} y={96} width={28} height={4} rx={2} fill="#CBD5E1" />
      </G>
      <G transform="rotate(8 100 70)">
        <Rect x={72} y={30} width={64} height={80} rx={10} fill="#020617" fillOpacity={0.3} transform="translate(3 5)" />
        <Rect x={72} y={30} width={64} height={80} rx={10} fill="url(#drCard)" />
        <PersonGlyph cx={104} cy={58} r={15} ring="url(#drRing)" glyph="#1D4ED8" />
        <Rect x={86} y={82} width={36} height={5} rx={2.5} fill="#1E3A8A" />
        <Rect x={90} y={92} width={28} height={4} rx={2} fill="#CBD5E1" />
      </G>
      <Circle cx={96} cy={112} r={24} fill="#020617" fillOpacity={0.25} transform="translate(2 4)" />
      <Rect x={112} y={124} width={12} height={32} rx={6} fill="url(#drGlass)" transform="rotate(-45 118 140)" />
      <Circle cx={96} cy={112} r={24} fill="#FFFFFF" fillOpacity={0.28} stroke="url(#drGlass)" strokeWidth={7} />
      <Ellipse cx={87} cy={103} rx={8} ry={4} fill="#FFFFFF" fillOpacity={0.7} transform="rotate(-35 87 103)" />
      <Sparkle x={140} y={22} r={7} />
      <Sparkle x={18} y={130} r={5} color="#93C5FD" />
    </Svg>
  );
});

/* ============================================================ states */

/** Error state: a cloud with a red "no signal" badge. */
export const CloudOff3D = memo(function CloudOff3D({ size = 96 }: ArtProps) {
  const cloud = 'M46 112 C30 112 20 100 20 88 C20 74 32 64 45 66 C48 48 62 38 78 38 C96 38 110 50 113 66 C128 64 140 76 140 90 C140 102 130 112 116 112 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="coCloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C7D2E3" />
        </SvgLinearGradient>
        <RadialGradient id="coBadge" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FCA5A5" />
          <Stop offset="1" stopColor="#B91C1C" />
        </RadialGradient>
      </Defs>
      <Glow id="coGlow" />
      <Path d={cloud} fill="#020617" fillOpacity={0.3} transform="translate(3 5)" />
      <Path d={cloud} fill="url(#coCloud)" />
      <Ellipse cx={70} cy={54} rx={16} ry={6} fill="#FFFFFF" fillOpacity={0.8} />
      <Circle cx={116} cy={112} r={20} fill="url(#coBadge)" stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M116 102 V114" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
      <Circle cx={116} cy={122} r={3} fill="#FFFFFF" />
      <Sparkle x={30} y={36} r={6} color="#93C5FD" />
    </Svg>
  );
});

/** Empty state: an open box with a sparkle rising out of it. */
export const EmptyBox3D = memo(function EmptyBox3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="ebFront" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ebSide" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E3A8A" />
          <Stop offset="1" stopColor="#0B1A45" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ebFlap" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#BFDBFE" />
          <Stop offset="1" stopColor="#60A5FA" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="ebGlow" />
      <Path d="M30 72 L80 56 L130 72 L80 88 Z" fill="#0B1A45" />
      <Path d="M30 72 L80 88 V140 L30 124 Z" fill="url(#ebFront)" />
      <Path d="M130 72 L80 88 V140 L130 124 Z" fill="url(#ebSide)" />
      <Path d="M30 72 L14 90 L64 106 L80 88 Z" fill="url(#ebFlap)" />
      <Path d="M130 72 L146 90 L96 106 L80 88 Z" fill="url(#ebFlap)" fillOpacity={0.85} />
      <Path d="M30 72 L40 50 L80 56 Z" fill="url(#ebFlap)" fillOpacity={0.7} />
      <Path d="M130 72 L120 50 L80 56 Z" fill="url(#ebFlap)" fillOpacity={0.55} />
      <Ellipse cx={46} cy={100} rx={4} ry={10} fill="#FFFFFF" fillOpacity={0.35} transform="rotate(-20 46 100)" />
      <Sparkle x={80} y={30} r={10} />
      <Sparkle x={112} y={20} r={5} color="#93C5FD" />
      <Sparkle x={50} y={22} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ badge */

/**
 * A navy→blue disc that seats a piece of art on the light canvas (empty and
 * error states, list headers) — the art is drawn for a dark ground.
 */
export function ArtBadge({ children, size = 112, style }: { children: React.ReactNode; size?: number; style?: StyleProp<ViewStyle> }) {
  const box = Math.max(48, Number(size || 0));
  return (
    <View style={[{ width: box, height: box, borderRadius: box / 2, shadowColor: '#0B1A45', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 6, backgroundColor: '#1E3A8A' }, style]}>
      <LinearGradient
        colors={PREMIUM_GRADIENTS.memberHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: box, height: box, borderRadius: box / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}
