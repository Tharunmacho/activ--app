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
import { Tone } from '../tokens';

/**
 * ============================================================================
 * BUSINESS ART — original vector 3D illustrations for the business area
 * ============================================================================
 *
 * Drawn here in react-native-svg for these screens (no stock PNGs), in the
 * same language as illustrations.tsx: navy/blue gradients for volume, an
 * offset dark "thickness" layer, a specular highlight, sparkles. All drawn
 * for a dark (gradient) ground — on a light page put them in a medallion
 * (ArtEmptyState does).
 *
 *   ShopFront3D ..... business dashboard / a company's page
 *   Briefcase3D ...... my companies · the company form
 *   ProductCrate3D ... catalogue · add / edit product
 *   StockColumns3D ... stock centre
 *   MarketGlobe3D .... discover
 *   TrustShield3D .... trust list
 *   GrowthChart3D .... analytics
 *   ControlPanel3D ... business settings
 *   VaultLock3D ...... members-only (locked) states
 *   SearchLens3D ..... no results
 *   Unplugged3D ...... could not load
 *
 * Gradient ids are prefixed per piece so two on one screen never clash.
 */

/**
 * `tone="business"` repaints the brand blues in the business violet
 * (#4C1D95 → #8B5CF6, the website's Business Account card). Gold, green and
 * the other semantic accents are left as drawn. Default stays the blue.
 */
type ArtProps = { size?: number; tone?: Tone };

const BUSINESS_VIOLET: Record<string, string> = {
  '#0B1A45': '#1C0B40',
  '#1C2E68': '#35126E',
  '#1E3A8A': '#4C1D95',
  '#1E40AF': '#5B21B6',
  '#1D4ED8': '#6D28D9',
  '#2563EB': '#7C3AED',
  '#3B82F6': '#8B5CF6',
  '#60A5FA': '#A78BFA',
  '#93C5FD': '#C4B5FD',
  '#BFDBFE': '#DDD6FE',
  '#DBEAFE': '#EDE9FE',
  '#D6E4FB': '#E6DEFB',
  '#C7D7F5': '#D9CDF5',
  '#DCE8FD': '#EBE4FD'
};

/** Maps one of the art's brand blues to its tone (member = unchanged). */
const artTint = (tone: Tone = 'member') => (hex: string) =>
  tone === 'business' ? (BUSINESS_VIOLET[hex] || hex) : hex;

function Sparkle({ x, y, r, color = '#FFFFFF', opacity = 0.9 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
  return <Path d={d} fill={color} fillOpacity={opacity} />;
}

/** A five-point star as a path. */
function starPath(cx: number, cy: number, outer: number, inner: number) {
  let d = '';
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

/** A toothed gear outline. */
function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number) {
  let d = '';
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    const pts = [
      [a - step * 0.3, inner],
      [a - step * 0.17, outer],
      [a + step * 0.17, outer],
      [a + step * 0.3, inner],
    ];
    pts.forEach(([ang, r], j) => {
      const x = cx + r * Math.cos(ang);
      const y = cy + r * Math.sin(ang);
      d += `${i === 0 && j === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
    });
  }
  return `${d}Z`;
}

function Glow({ id, cx, cy, r, color = '#60A5FA', opacity = 0.5 }: { id: string; cx: number; cy: number; r: number; color?: string; opacity?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

/* ============================================================ storefront */

/** A shop front: lit sign, striped awning, stocked window, door, a gold star coin. */
export const ShopFront3D = memo(function ShopFront3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  const stripes = Array.from({ length: 8 }).map((_, i) => {
    const x = 22 + i * 14;
    return <Path key={i} d={`M${x} 52 H${x + 14} V62 A7 7 0 0 1 ${x} 62 Z`} fill={i % 2 === 0 ? c('#2563EB') : '#FFFFFF'} />;
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="sfFace" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#D6E4FB')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="sfSign" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c('#1E3A8A')} />
          <Stop offset="1" stopColor={c('#2563EB')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="sfDoor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c('#1D4ED8')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="sfWin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c('#DBEAFE')} />
          <Stop offset="1" stopColor={c('#93C5FD')} />
        </SvgLinearGradient>
        <RadialGradient id="sfCoin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="0.55" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
      </Defs>
      <Glow id="sfGlow" cx={80} cy={92} r={64} color={c('#60A5FA')} />

      {/* thickness + side */}
      <Rect x={30} y={58} width={104} height={80} rx={8} fill={c('#0B1A45')} fillOpacity={0.4} />
      <Path d="M130 54 L140 49 V127 L130 132 Z" fill={c('#93C5FD')} fillOpacity={0.55} />
      <Rect x={26} y={54} width={104} height={78} rx={8} fill="url(#sfFace)" />

      {/* window with stock */}
      <Rect x={36} y={78} width={44} height={34} rx={5} fill="url(#sfWin)" />
      <Rect x={41} y={96} width={12} height={12} rx={2} fill={c('#2563EB')} />
      <Rect x={55} y={100} width={9} height={8} rx={2} fill="#F59E0B" />
      <Rect x={66} y={92} width={10} height={16} rx={2} fill={c('#1E3A8A')} />
      <Rect x={39} y={108} width={38} height={2.5} rx={1.2} fill="#FFFFFF" fillOpacity={0.9} />
      <Path d="M40 80 H56 L40 100 Z" fill="#FFFFFF" fillOpacity={0.45} />

      {/* door */}
      <Rect x={88} y={80} width={30} height={52} rx={5} fill="url(#sfDoor)" />
      <Rect x={92} y={85} width={22} height={18} rx={3} fill={c('#60A5FA')} fillOpacity={0.55} />
      <Circle cx={112} cy={110} r={2.4} fill="#FDE68A" />

      {/* sign + awning */}
      <Rect x={20} y={32} width={116} height={20} rx={7} fill="url(#sfSign)" />
      <Rect x={44} y={39} width={52} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.9} />
      <Circle cx={108} cy={42} r={3} fill="#FDE68A" />
      {stripes}
      <Path d="M22 52 H134" stroke={c('#0B1A45')} strokeOpacity={0.15} strokeWidth={1} />
      <Rect x={18} y={130} width={120} height={7} rx={3.5} fill={c('#1E3A8A')} fillOpacity={0.75} />

      {/* star coin */}
      <Circle cx={134} cy={30} r={16} fill={c('#0B1A45')} fillOpacity={0.3} />
      <Circle cx={132} cy={27} r={15} fill="url(#sfCoin)" />
      <Path d={starPath(132, 27.5, 8, 3.6)} fill="#FFFFFF" />
      <Ellipse cx={126} cy={20} rx={5} ry={2.4} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-25 126 20)" />

      <Sparkle x={16} y={24} r={6} />
      <Sparkle x={150} y={70} r={4} color={c('#93C5FD')} />
      <Sparkle x={12} y={100} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ briefcase */

/** A briefcase in front of a second company card — "your companies". */
export const Briefcase3D = memo(function Briefcase3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="bcCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#C7D7F5')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="bcBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c('#3B82F6')} />
          <Stop offset="0.55" stopColor={c('#1E40AF')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="bcGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
        <RadialGradient id="bcBadge" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
      </Defs>
      <Glow id="bcGlow" cx={80} cy={92} r={62} color={c('#60A5FA')} />

      <G transform="rotate(-12 80 60)">
        <Rect x={40} y={26} width={84} height={56} rx={9} fill="url(#bcCard)" />
        <Rect x={48} y={36} width={22} height={22} rx={5} fill={c('#2563EB')} />
        <Rect x={53} y={43} width={4} height={10} rx={1} fill="#FFFFFF" />
        <Rect x={60} y={40} width={5} height={13} rx={1} fill="#FFFFFF" />
        <Rect x={76} y={38} width={38} height={5} rx={2.5} fill="#94A3B8" />
        <Rect x={76} y={48} width={28} height={4} rx={2} fill="#CBD5E1" />
      </G>

      <Path d="M63 66 V56 Q63 49 70 49 H90 Q97 49 97 56 V66" stroke={c('#0B1A45')} strokeOpacity={0.5} strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M63 64 V55 Q63 48 70 48 H90 Q97 48 97 55 V64" stroke={c('#1C2E68')} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Rect x={29} y={67} width={106} height={70} rx={13} fill={c('#0B1A45')} fillOpacity={0.45} />
      <Rect x={26} y={63} width={106} height={70} rx={13} fill="url(#bcBody)" />
      <Path d="M26 88 H132" stroke={c('#0B1A45')} strokeOpacity={0.35} strokeWidth={2} />
      <Rect x={44} y={63} width={6} height={70} fill="#FFFFFF" fillOpacity={0.12} />
      <Rect x={108} y={63} width={6} height={70} fill="#FFFFFF" fillOpacity={0.12} />
      <Rect x={69} y={81} width={20} height={15} rx={4} fill="url(#bcGold)" />
      <Rect x={77} y={86} width={4} height={6} rx={1.5} fill="#78350F" fillOpacity={0.6} />
      <Path d="M36 68 H72 L36 92 Z" fill="#FFFFFF" fillOpacity={0.18} />

      <Circle cx={129} cy={63} r={15} fill={c('#0B1A45')} fillOpacity={0.3} />
      <Circle cx={127} cy={60} r={14} fill="url(#bcBadge)" />
      <Path d="M127 53 V67 M120 60 H134" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />

      <Sparkle x={20} y={40} r={6} />
      <Sparkle x={148} y={112} r={4} color={c('#93C5FD')} />
      <Sparkle x={14} y={126} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ product crate */

/** An isometric parcel with tape and a hanging price tag. */
export const ProductCrate3D = memo(function ProductCrate3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="pcTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#DBEAFE')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="pcLeft" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c('#93C5FD')} />
          <Stop offset="1" stopColor={c('#3B82F6')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="pcRight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c('#2563EB')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="pcTag" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#F59E0B" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="pcGlow" cx={80} cy={90} r={62} color={c('#60A5FA')} />

      <Ellipse cx={80} cy={136} rx={46} ry={8} fill={c('#0B1A45')} fillOpacity={0.35} />
      <Path d="M80 44 L126 66 L80 88 L34 66 Z" fill="url(#pcTop)" />
      <Path d="M34 66 L80 88 L80 136 L34 114 Z" fill="url(#pcLeft)" />
      <Path d="M126 66 L80 88 L80 136 L126 114 Z" fill="url(#pcRight)" />
      <Path d="M57 55 L103 77 L96 80.5 L50 58.5 Z" fill="#F59E0B" fillOpacity={0.85} />
      <Path d="M103 77 L96 80.5 L96 128.5 L103 125 Z" fill="#B45309" fillOpacity={0.85} />
      <Path d="M80 88 L80 136" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
      <Path d="M40 72 L60 82 L60 90 L40 80 Z" fill="#FFFFFF" fillOpacity={0.35} />

      {/* price tag */}
      <Path d="M126 70 C132 60 134 52 132 44" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.4} fill="none" />
      <G transform="rotate(18 136 44)">
        <Path d="M124 30 H146 A4 4 0 0 1 150 34 V54 A4 4 0 0 1 146 58 H124 L116 44 Z" fill={c('#0B1A45')} fillOpacity={0.3} transform="translate(2 3)" />
        <Path d="M124 30 H146 A4 4 0 0 1 150 34 V54 A4 4 0 0 1 146 58 H124 L116 44 Z" fill="url(#pcTag)" />
        <Circle cx={124} cy={44} r={3} fill="#FFFFFF" />
        <Rect x={131} y={38} width={13} height={3} rx={1.5} fill="#78350F" fillOpacity={0.7} />
        <Rect x={131} y={45} width={9} height={3} rx={1.5} fill="#78350F" fillOpacity={0.5} />
      </G>

      <Sparkle x={24} y={36} r={6} />
      <Sparkle x={20} y={104} r={4} color={c('#93C5FD')} />
      <Sparkle x={148} y={96} r={4} opacity={0.75} />
    </Svg>
  );
});

/* ============================================================ stock */

/** Three 3D columns rising, a crate on the tallest, a green up-trend. */
export const StockColumns3D = memo(function StockColumns3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  const col = (x: number, h: number, k: number) => {
    const base = 128;
    const top = base - h;
    return (
      <G key={k}>
        <Path d={`M${x + 22} ${top} L${x + 30} ${top - 5} V${base - 5} L${x + 22} ${base} Z`} fill={c('#1C2E68')} />
        <Rect x={x} y={top} width={22} height={h} fill={`url(#scFront${k})`} />
        <Path d={`M${x} ${top} L${x + 8} ${top - 5} H${x + 30} L${x + 22} ${top} Z`} fill={c('#BFDBFE')} />
      </G>
    );
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        {[0, 1, 2].map((k) => (
          <SvgLinearGradient key={k} id={`scFront${k}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={k === 2 ? c('#60A5FA') : c('#3B82F6')} />
            <Stop offset="1" stopColor={c('#1E3A8A')} />
          </SvgLinearGradient>
        ))}
        <SvgLinearGradient id="scBox" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="scGlow" cx={80} cy={92} r={62} color={c('#60A5FA')} />
      <Ellipse cx={82} cy={132} rx={56} ry={9} fill={c('#0B1A45')} fillOpacity={0.35} />
      <Rect x={24} y={126} width={112} height={6} rx={3} fill="#FFFFFF" fillOpacity={0.25} />
      {col(30, 38, 0)}
      {col(64, 60, 1)}
      {col(98, 84, 2)}
      <Rect x={101} y={30} width={18} height={14} rx={2} fill="url(#scBox)" />
      <Path d="M101 34 H119" stroke="#78350F" strokeOpacity={0.4} strokeWidth={1.5} />
      <Path d="M24 104 L56 84 L78 92 L120 58" stroke="#34D399" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M110 56 L122 56 L120 68" stroke="#34D399" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={22} y={40} r={6} />
      <Sparkle x={146} y={34} r={4} color={c('#93C5FD')} />
      <Sparkle x={148} y={112} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ discover */

/** A glossy globe with shop pins, an orbit and a magnifier in front. */
export const MarketGlobe3D = memo(function MarketGlobe3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  const pin = (x: number, y: number, c: string, k: number) => (
    <G key={k}>
      <Path d={`M${x} ${y - 10} C${x - 6} ${y - 10} ${x - 9} ${y - 6} ${x - 9} ${y - 2} C${x - 9} ${y + 4} ${x} ${y + 10} ${x} ${y + 10} C${x} ${y + 10} ${x + 9} ${y + 4} ${x + 9} ${y - 2} C${x + 9} ${y - 6} ${x + 6} ${y - 10} ${x} ${y - 10} Z`} fill={c} />
      <Circle cx={x} cy={y - 2} r={3.2} fill="#FFFFFF" />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="mgSphere" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor={c('#BFDBFE')} />
          <Stop offset="0.45" stopColor={c('#3B82F6')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </RadialGradient>
        <RadialGradient id="mgLens" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="1" stopColor={c('#DBEAFE')} stopOpacity={0.55} />
        </RadialGradient>
      </Defs>
      <Glow id="mgGlow" cx={74} cy={76} r={64} color={c('#60A5FA')} />
      <Ellipse cx={74} cy={74} rx={66} ry={18} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 5" fill="none" transform="rotate(-18 74 74)" />
      <Circle cx={77} cy={79} r={44} fill={c('#0B1A45')} fillOpacity={0.35} />
      <Circle cx={74} cy={74} r={44} fill="url(#mgSphere)" />
      <Ellipse cx={74} cy={74} rx={20} ry={44} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.4} fill="none" />
      <Ellipse cx={74} cy={74} rx={44} ry={14} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.4} fill="none" />
      <Path d="M30 74 H118" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.4} />
      <Path d="M52 50 C60 44 70 48 66 58 C62 66 50 62 52 50 Z" fill="#34D399" fillOpacity={0.75} />
      <Path d="M84 84 C94 80 102 88 96 98 C90 104 80 96 84 84 Z" fill="#34D399" fillOpacity={0.7} />
      <Ellipse cx={56} cy={50} rx={10} ry={5} fill="#FFFFFF" fillOpacity={0.4} transform="rotate(-30 56 50)" />
      {pin(58, 44, '#F59E0B', 0)}
      {pin(96, 62, '#FFFFFF', 1)}
      {pin(76, 96, '#F59E0B', 2)}

      <Path d="M120 118 L140 138" stroke={c('#0B1A45')} strokeOpacity={0.4} strokeWidth={12} strokeLinecap="round" />
      <Path d="M118 116 L138 136" stroke={c('#1C2E68')} strokeWidth={10} strokeLinecap="round" />
      <Circle cx={108} cy={106} r={19} fill="url(#mgLens)" stroke="#FFFFFF" strokeWidth={5} />
      <Path d="M98 100 A12 12 0 0 1 106 94" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />

      <Sparkle x={140} y={26} r={6} />
      <Sparkle x={16} y={120} r={4} color={c('#93C5FD')} />
      <Sparkle x={150} y={78} r={4} opacity={0.75} />
    </Svg>
  );
});

/* ============================================================ trust */

/** A shield carrying a gold star, a ribbon beneath, small stars in orbit. */
export const TrustShield3D = memo(function TrustShield3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="tsShield" cx="32%" cy="25%" r="85%">
          <Stop offset="0" stopColor={c('#BFDBFE')} />
          <Stop offset="0.45" stopColor={c('#3B82F6')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </RadialGradient>
        <RadialGradient id="tsStar" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
        <SvgLinearGradient id="tsRibbon" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#059669" />
          <Stop offset="1" stopColor="#34D399" />
        </SvgLinearGradient>
      </Defs>
      <Glow id="tsGlow" cx={80} cy={80} r={64} color={c('#60A5FA')} />
      <Path d="M84 22 L126 38 V74 C126 104 108 126 84 138 C60 126 42 104 42 74 V38 Z" fill={c('#0B1A45')} fillOpacity={0.45} />
      <Path d="M80 18 L122 34 V70 C122 100 104 122 80 134 C56 122 38 100 38 70 V34 Z" fill="url(#tsShield)" />
      <Path d="M80 27 L113 40 V70 C113 94 99 112 80 123 C61 112 47 94 47 70 V40 Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} />
      <Path d={starPath(82, 76, 25, 11)} fill={c('#0B1A45')} fillOpacity={0.3} />
      <Path d={starPath(80, 73, 25, 11)} fill="url(#tsStar)" />
      <Ellipse cx={60} cy={44} rx={9} ry={4} fill="#FFFFFF" fillOpacity={0.5} transform="rotate(-25 60 44)" />

      <Path d="M30 118 L42 110 H118 L130 118 L118 126 H42 Z" fill={c('#0B1A45')} fillOpacity={0.3} transform="translate(0 3)" />
      <Path d="M30 116 L42 108 H118 L130 116 L118 124 H42 Z" fill="url(#tsRibbon)" />
      <Rect x={58} y={113} width={44} height={4} rx={2} fill="#FFFFFF" fillOpacity={0.85} />

      <Path d={starPath(24, 50, 7, 3)} fill="#FDE68A" />
      <Path d={starPath(138, 58, 6, 2.6)} fill="#FDE68A" />
      <Path d={starPath(134, 138, 5, 2.2)} fill="#FDE68A" fillOpacity={0.85} />
      <Sparkle x={140} y={22} r={5} />
      <Sparkle x={18} y={96} r={4} color={c('#93C5FD')} />
    </Svg>
  );
});

/* ============================================================ analytics */

/** A glass chart panel: bars, a rising line with points, a donut in front. */
export const GrowthChart3D = memo(function GrowthChart3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="gcPanel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.26} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.08} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gcBar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#93C5FD')} />
        </SvgLinearGradient>
        <RadialGradient id="gcDisc" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#DBEAFE')} />
        </RadialGradient>
      </Defs>
      <Glow id="gcGlow" cx={80} cy={84} r={64} color={c('#60A5FA')} />
      <Rect x={16} y={24} width={120} height={88} rx={14} fill="url(#gcPanel)" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={1} />
      <Circle cx={28} cy={36} r={2.5} fill="#F87171" />
      <Circle cx={36} cy={36} r={2.5} fill="#FBBF24" />
      <Circle cx={44} cy={36} r={2.5} fill="#34D399" />
      <Rect x={28} y={78} width={12} height={24} rx={3} fill="url(#gcBar)" fillOpacity={0.7} />
      <Rect x={46} y={66} width={12} height={36} rx={3} fill="url(#gcBar)" fillOpacity={0.8} />
      <Rect x={64} y={72} width={12} height={30} rx={3} fill="url(#gcBar)" fillOpacity={0.75} />
      <Rect x={82} y={56} width={12} height={46} rx={3} fill="url(#gcBar)" />
      <Path d="M30 64 L52 52 L70 58 L90 40 L118 30" stroke="#FDE68A" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {[[30, 64], [52, 52], [70, 58], [90, 40], [118, 30]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.6} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={2} />
      ))}

      <Circle cx={119} cy={115} r={27} fill={c('#0B1A45')} fillOpacity={0.4} />
      <Circle cx={116} cy={112} r={27} fill="url(#gcDisc)" />
      <Circle cx={116} cy={112} r={17} stroke={c('#DBEAFE')} strokeWidth={10} fill="none" />
      <Circle cx={116} cy={112} r={17} stroke={c('#2563EB')} strokeWidth={10} fill="none" strokeDasharray="70 107" transform="rotate(-90 116 112)" />
      <Circle cx={116} cy={112} r={17} stroke="#F59E0B" strokeWidth={10} fill="none" strokeDasharray="22 107" strokeDashoffset={-72} transform="rotate(-90 116 112)" />
      <Ellipse cx={104} cy={96} rx={7} ry={3} fill="#FFFFFF" fillOpacity={0.7} transform="rotate(-30 104 96)" />

      <Sparkle x={146} y={30} r={6} />
      <Sparkle x={16} y={132} r={4} color={c('#93C5FD')} />
      <Sparkle x={70} y={140} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ settings */

/** A gear with a toggle switch and two slider tracks in front. */
export const ControlPanel3D = memo(function ControlPanel3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="cpGear" cx="35%" cy="30%" r="85%">
          <Stop offset="0" stopColor={c('#BFDBFE')} />
          <Stop offset="0.5" stopColor={c('#3B82F6')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </RadialGradient>
        <SvgLinearGradient id="cpCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#D6E4FB')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="cpOn" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c('#1E3A8A')} />
          <Stop offset="1" stopColor={c('#2563EB')} />
        </SvgLinearGradient>
      </Defs>
      <Glow id="cpGlow" cx={80} cy={80} r={64} color={c('#60A5FA')} />
      <Path d={gearPath(74, 62, 40, 31, 9)} fill={c('#0B1A45')} fillOpacity={0.4} transform="translate(3 4)" />
      <Path d={gearPath(74, 62, 40, 31, 9)} fill="url(#cpGear)" />
      <Circle cx={74} cy={62} r={14} fill={c('#1C2E68')} />
      <Circle cx={74} cy={62} r={8} fill={c('#DBEAFE')} />
      <Ellipse cx={56} cy={42} rx={8} ry={4} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(-35 56 42)" />

      <Rect x={39} y={97} width={100} height={48} rx={12} fill={c('#0B1A45')} fillOpacity={0.4} />
      <Rect x={36} y={94} width={100} height={48} rx={12} fill="url(#cpCard)" />
      <Rect x={46} y={104} width={34} height={16} rx={8} fill="url(#cpOn)" />
      <Circle cx={72} cy={112} r={6} fill="#FFFFFF" />
      <Rect x={88} y={106} width={38} height={4} rx={2} fill="#94A3B8" />
      <Rect x={88} y={114} width={26} height={3} rx={1.5} fill="#CBD5E1" />
      <Rect x={46} y={128} width={80} height={4} rx={2} fill={c('#DBEAFE')} />
      <Rect x={46} y={128} width={50} height={4} rx={2} fill={c('#2563EB')} />
      <Circle cx={96} cy={130} r={4.5} fill="#FFFFFF" stroke={c('#2563EB')} strokeWidth={2} />

      <Sparkle x={138} y={30} r={6} />
      <Sparkle x={18} y={112} r={4} color={c('#93C5FD')} />
      <Sparkle x={146} y={86} r={4} opacity={0.75} />
    </Svg>
  );
});

/* ============================================================ locked */

/** A padlock with a gold membership star — "opens with membership". */
export const VaultLock3D = memo(function VaultLock3D({ size = 104, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="vlBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c('#3B82F6')} />
          <Stop offset="0.6" stopColor={c('#1E40AF')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="vlShackle" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#E2E8F0" />
          <Stop offset="1" stopColor="#94A3B8" />
        </SvgLinearGradient>
        <RadialGradient id="vlStar" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FEF3C7" />
          <Stop offset="0.5" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
      </Defs>
      <Glow id="vlGlow" cx={78} cy={86} r={62} color={c('#60A5FA')} />
      <Path d="M52 74 V56 C52 38 64 28 78 28 C92 28 104 38 104 56 V74" stroke={c('#0B1A45')} strokeOpacity={0.4} strokeWidth={14} fill="none" transform="translate(3 3)" />
      <Path d="M52 74 V56 C52 38 64 28 78 28 C92 28 104 38 104 56 V74" stroke="url(#vlShackle)" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Rect x={37} y={73} width={88} height={66} rx={16} fill={c('#0B1A45')} fillOpacity={0.45} />
      <Rect x={34} y={70} width={88} height={66} rx={16} fill="url(#vlBody)" />
      <Rect x={34} y={70} width={88} height={10} rx={5} fill="#FFFFFF" fillOpacity={0.14} />
      <Circle cx={78} cy={98} r={9} fill="#FFFFFF" />
      <Path d="M74 102 L72 120 H84 L82 102 Z" fill="#FFFFFF" />
      <Path d="M44 76 H70 L44 104 Z" fill="#FFFFFF" fillOpacity={0.14} />

      <Circle cx={124} cy={70} r={20} fill={c('#0B1A45')} fillOpacity={0.35} />
      <Circle cx={121} cy={66} r={19} fill="url(#vlStar)" />
      <Path d={starPath(121, 67, 11, 5)} fill="#FFFFFF" />
      <Ellipse cx={113} cy={57} rx={6} ry={3} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-25 113 57)" />

      <Sparkle x={24} y={40} r={6} />
      <Sparkle x={146} y={116} r={4} color="#FDE68A" />
      <Sparkle x={16} y={122} r={4} opacity={0.7} />
    </Svg>
  );
});

/* ============================================================ small states */

/** A magnifier over a card with nothing on it — "no matches". */
export const SearchLens3D = memo(function SearchLens3D({ size = 96, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="slCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#D6E4FB')} />
        </SvgLinearGradient>
        <RadialGradient id="slGlass" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="1" stopColor={c('#93C5FD')} stopOpacity={0.45} />
        </RadialGradient>
      </Defs>
      <Glow id="slGlow2" cx={80} cy={80} r={60} color={c('#60A5FA')} />
      <G transform="rotate(-8 70 70)">
        <Rect x={30} y={34} width={80} height={96} rx={12} fill="url(#slCard)" />
        <Rect x={42} y={48} width={40} height={6} rx={3} fill="#94A3B8" />
        <Rect x={42} y={62} width={54} height={5} rx={2.5} fill="#CBD5E1" />
        <Rect x={42} y={74} width={30} height={5} rx={2.5} fill="#CBD5E1" />
      </G>
      <Path d="M112 112 L134 134" stroke={c('#1C2E68')} strokeWidth={11} strokeLinecap="round" />
      <Circle cx={98} cy={98} r={24} fill="url(#slGlass)" stroke="#FFFFFF" strokeWidth={6} />
      <Circle cx={90} cy={98} r={2.8} fill={c('#1E3A8A')} />
      <Circle cx={98} cy={98} r={2.8} fill={c('#1E3A8A')} />
      <Circle cx={106} cy={98} r={2.8} fill={c('#1E3A8A')} />
      <Path d="M84 88 A16 16 0 0 1 94 80" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Sparkle x={140} y={36} r={6} />
      <Sparkle x={18} y={132} r={4} color={c('#93C5FD')} />
    </Svg>
  );
});

/** A plug pulled from its socket, a spark between — "could not load". */
export const Unplugged3D = memo(function Unplugged3D({ size = 96, tone = 'member' }: ArtProps) {
  const c = artTint(tone);
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="upPlug" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={c('#C7D7F5')} />
        </SvgLinearGradient>
        <SvgLinearGradient id="upSock" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c('#3B82F6')} />
          <Stop offset="1" stopColor={c('#1C2E68')} />
        </SvgLinearGradient>
      </Defs>
      <Glow id="upGlow" cx={80} cy={80} r={60} color={c('#60A5FA')} />
      <Path d="M14 104 C30 104 34 88 50 88" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Rect x={48} y={72} width={26} height={32} rx={8} fill="url(#upPlug)" />
      <Rect x={74} y={78} width={14} height={5} rx={2.5} fill="#E2E8F0" />
      <Rect x={74} y={93} width={14} height={5} rx={2.5} fill="#E2E8F0" />
      <Path d="M146 56 C130 56 126 72 112 72" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Rect x={102} y={62} width={30} height={42} rx={10} fill="url(#upSock)" />
      <Rect x={108} y={76} width={6} height={4} rx={2} fill={c('#0B1A45')} />
      <Rect x={108} y={90} width={6} height={4} rx={2} fill={c('#0B1A45')} />
      <Path d="M94 64 L90 76 L97 76 L92 90" stroke="#FBBF24" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={96} y={52} r={5} color="#FDE68A" />
      <Sparkle x={30} y={40} r={6} />
      <Sparkle x={140} y={128} r={4} color={c('#93C5FD')} />
    </Svg>
  );
});
