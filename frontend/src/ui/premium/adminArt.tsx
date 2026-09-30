import React, { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * ============================================================================
 * ADMIN ART — original vector 3D-style illustrations for the admin console
 * ============================================================================
 *
 * Drawn here in react-native-svg for the admin screens (never stock PNGs), in
 * the admin indigo with warm accents. Isometric boxes for the places a tier
 * governs, glowing nodes for the network above them.
 *
 *   Tier heroes ... BlockVillage3D (block: a village with its shop)
 *                   DistrictSkyline3D (district: a town skyline)
 *                   StateNetwork3D (state: a map slab wired into a network)
 *                   GlobeCommand3D (super: a globe with orbiting admins)
 *   Screens ....... ApprovalStack3D · MembersCircle3D · Dossier3D ·
 *                   TeamKeys3D · AuditLog3D · HubTree3D
 *   States ........ AdminEmptyTray3D · AdminCloudOff3D (drawn for a LIGHT background)
 *
 * All static and memoised — float them with FloatingIllustration.
 */

type ArtProps = { size?: number };

/* ---------------------------------------------------------------- helpers */

function Spark({ x, y, r, color = '#FFFFFF', opacity = 0.9 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
  return <Path d={d} fill={color} fillOpacity={opacity} />;
}

function Person({ cx, cy, r, ring, fill = '#FFFFFF', glyph = '#5440D4' }: {
  cx: number; cy: number; r: number; ring: string; fill?: string; glyph?: string;
}) {
  const i = r - Math.max(2, r * 0.14);
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={ring} />
      <Circle cx={cx} cy={cy} r={i} fill={fill} />
      <Circle cx={cx} cy={cy - i * 0.22} r={i * 0.32} fill={glyph} />
      <Path d={`M${cx - i * 0.58} ${cy + i * 0.62} C${cx - i * 0.5} ${cy + i * 0.12} ${cx + i * 0.5} ${cy + i * 0.12} ${cx + i * 0.58} ${cy + i * 0.62} Z`} fill={glyph} />
    </G>
  );
}

type Pt = [number, number];
const P = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const poly = (...pts: Pt[]) => `M${pts.map(P).join(' L')} Z`;

/**
 * An isometric (2:1) box standing on its front-bottom corner (x, y).
 * `w` runs up-right, `d` up-left, `h` straight up.
 */
function isoBox(x: number, y: number, w: number, d: number, h: number) {
  const F: Pt = [x, y];
  const R: Pt = [x + w, y - w / 2];
  const L: Pt = [x - d, y - d / 2];
  const B: Pt = [x + w - d, y - w / 2 - d / 2];
  const up = (p: Pt): Pt => [p[0], p[1] - h];
  return {
    left: poly(L, F, up(F), up(L)),
    right: poly(F, R, up(R), up(F)),
    top: poly(up(L), up(F), up(R), up(B)),
    /** A point on the right face: u along the width (0..1), v up the height (px). */
    onRight: (u: number, v: number): Pt => [x + w * u, y - (w / 2) * u - v],
    onLeft: (u: number, v: number): Pt => [x - d * u, y - (d / 2) * u - v],
    topCenter: [x + (w - d) / 2, y - (w + d) / 4 - h] as Pt,
    topL: up(L), topF: up(F), topR: up(R), topB: up(B),
  };
}

/** A small parallelogram window on the right face of a box. */
function rightWin(box: ReturnType<typeof isoBox>, u: number, v: number, uw: number, vh: number) {
  const a = box.onRight(u, v);
  const b = box.onRight(u + uw, v);
  const c = box.onRight(u + uw, v + vh);
  const e = box.onRight(u, v + vh);
  return poly(a, b, c, e);
}

function leftWin(box: ReturnType<typeof isoBox>, u: number, v: number, uw: number, vh: number) {
  const a = box.onLeft(u, v);
  const b = box.onLeft(u + uw, v);
  const c = box.onLeft(u + uw, v + vh);
  const e = box.onLeft(u, v + vh);
  return poly(a, b, c, e);
}

/** An isometric ground tile centred on (cx, cy): half-width `rw`, thickness `t`. */
function isoTile(cx: number, cy: number, rw: number, t: number) {
  const top: Pt = [cx, cy - rw / 2];
  const right: Pt = [cx + rw, cy];
  const bottom: Pt = [cx, cy + rw / 2];
  const left: Pt = [cx - rw, cy];
  const dn = (p: Pt): Pt => [p[0], p[1] + t];
  return {
    face: poly(top, right, bottom, left),
    sideL: poly(left, bottom, dn(bottom), dn(left)),
    sideR: poly(bottom, right, dn(right), dn(bottom)),
  };
}

/** A map pin (teardrop) with its tip at (x, y). */
function pinPath(x: number, y: number, r: number) {
  return `M${x} ${y} C${x - r * 0.35} ${y - r * 0.9} ${x - r} ${y - r * 1.25} ${x - r} ${y - r * 1.9} A${r} ${r} 0 1 1 ${x + r} ${y - r * 1.9} C${x + r} ${y - r * 1.25} ${x + r * 0.35} ${y - r * 0.9} ${x} ${y} Z`;
}

/* ================================================================ BLOCK */

/** Block admin: a village block — a shop with its awning, two homes, a tree, a pin. */
export const BlockVillage3D = memo(function BlockVillage3D({ size = 120 }: ArtProps) {
  const tile = isoTile(80, 116, 66, 8);
  const shop = isoBox(70, 118, 34, 24, 26);
  const house = isoBox(38, 104, 20, 18, 18);
  const home2 = isoBox(112, 102, 18, 16, 16);
  const houseApex: Pt = [house.topCenter[0], house.topCenter[1] - 14];
  const home2Apex: Pt = [home2.topCenter[0], home2.topCenter[1] - 12];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <SvgLinearGradient id="bvGround" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.1} />
        </SvgLinearGradient>
        <SvgLinearGradient id="bvWallR" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
        <SvgLinearGradient id="bvWallL" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C7D2FE" />
          <Stop offset="1" stopColor="#A5B4FC" />
        </SvgLinearGradient>
        <SvgLinearGradient id="bvRoof" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#4C3BC9" />
        </SvgLinearGradient>
        <RadialGradient id="bvGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="bvPin" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#F59E0B" />
        </RadialGradient>
      </Defs>

      <Circle cx={80} cy={96} r={64} fill="url(#bvGlow)" />
      {/* ground */}
      <Path d={tile.sideL} fill="#1B1646" fillOpacity={0.55} />
      <Path d={tile.sideR} fill="#1B1646" fillOpacity={0.35} />
      <Path d={tile.face} fill="url(#bvGround)" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
      {/* the lane */}
      <Path d="M36 122 L104 88 L114 93 L46 127 Z" fill="#FFFFFF" fillOpacity={0.16} />
      <Path d="M44 120 L52 116 M62 111 L70 107 M80 102 L88 98" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />

      {/* home, back left */}
      <Path d={house.left} fill="url(#bvWallL)" />
      <Path d={house.right} fill="url(#bvWallR)" />
      <Path d={poly(house.topL, house.topF, houseApex)} fill="#3B2DB0" />
      <Path d={poly(house.topF, house.topR, houseApex)} fill="url(#bvRoof)" />
      <Path d={rightWin(house, 0.3, 3, 0.35, 9)} fill="#5440D4" fillOpacity={0.75} />

      {/* home, back right */}
      <Path d={home2.left} fill="url(#bvWallL)" />
      <Path d={home2.right} fill="url(#bvWallR)" />
      <Path d={poly(home2.topL, home2.topF, home2Apex)} fill="#3B2DB0" />
      <Path d={poly(home2.topF, home2.topR, home2Apex)} fill="url(#bvRoof)" />
      <Path d={rightWin(home2, 0.35, 5, 0.3, 6)} fill="#FBBF24" fillOpacity={0.9} />

      {/* the shop */}
      <Path d={shop.left} fill="url(#bvWallL)" />
      <Path d={shop.right} fill="url(#bvWallR)" />
      <Path d={shop.top} fill="#EEF2FF" />
      <Path d={rightWin(shop, 0.12, 0, 0.3, 15)} fill="#3B2DB0" fillOpacity={0.85} />
      <Path d={rightWin(shop, 0.52, 5, 0.36, 10)} fill="#93C5FD" fillOpacity={0.9} />
      <Path d={leftWin(shop, 0.22, 6, 0.55, 9)} fill="#5440D4" fillOpacity={0.45} />
      {/* striped awning over the shop front */}
      {[0, 1, 2, 3, 4].map((i) => {
        const u0 = i * 0.2;
        const a = shop.onRight(u0, 26);
        const b = shop.onRight(u0 + 0.2, 26);
        const c: Pt = [b[0] + 5, b[1] + 9];
        const e: Pt = [a[0] + 5, a[1] + 9];
        return <Path key={i} d={poly(a, b, c, e)} fill={i % 2 ? '#FFFFFF' : '#F59E0B'} />;
      })}
      {/* sign on the roof */}
      <Path d={poly(shop.onRight(0.2, 26), shop.onRight(0.8, 26), shop.onRight(0.8, 34), shop.onRight(0.2, 34))} fill="#5440D4" />
      <Path d={`M${P(shop.onRight(0.32, 30))} L${P(shop.onRight(0.68, 30))}`} stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />

      {/* tree */}
      <Rect x={127} y={108} width={3} height={12} rx={1.5} fill="#7C5A2E" />
      <Circle cx={128.5} cy={102} r={9} fill="#34D399" />
      <Circle cx={124} cy={106} r={6} fill="#10B981" />
      <Circle cx={131} cy={98} r={4} fill="#6EE7B7" fillOpacity={0.9} />
      <Rect x={24} y={116} width={2.5} height={9} rx={1.2} fill="#7C5A2E" />
      <Circle cx={25} cy={112} r={6} fill="#34D399" />

      {/* the pin that says "your block" */}
      <Ellipse cx={82} cy={56} rx={7} ry={2.5} fill="#1B1646" fillOpacity={0.35} />
      <Path d={pinPath(82, 55, 12)} fill="url(#bvPin)" />
      <Circle cx={82} cy={32} r={5} fill="#FFFFFF" />
      <Ellipse cx={77} cy={28} rx={3} ry={1.6} fill="#FFFFFF" fillOpacity={0.6} transform="rotate(-30 77 28)" />

      <Spark x={140} y={30} r={6} />
      <Spark x={22} y={60} r={4} color="#C7D2FE" />
      <Spark x={148} y={78} r={3.5} color="#FDE68A" />
    </Svg>
  );
});

/* ================================================================ DISTRICT */

const SKY = [
  { x: 40, y: 124, w: 18, d: 16, h: 38 },
  { x: 62, y: 130, w: 20, d: 18, h: 64 },
  { x: 92, y: 126, w: 18, d: 16, h: 48 },
  { x: 116, y: 120, w: 16, d: 14, h: 30 },
];

/** District admin: a town skyline standing on its district slab. */
export const DistrictSkyline3D = memo(function DistrictSkyline3D({ size = 120 }: ArtProps) {
  const tile = isoTile(82, 118, 68, 8);
  const boxes = SKY.map((b) => ({ ...b, box: isoBox(b.x, b.y, b.w, b.d, b.h) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="dsGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="dsGround" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.08} />
        </SvgLinearGradient>
        <SvgLinearGradient id="dsR" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C7D2FE" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dsL" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#4C3BC9" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={80} cy={88} r={66} fill="url(#dsGlow)" />
      <Path d={tile.sideL} fill="#1B1646" fillOpacity={0.55} />
      <Path d={tile.sideR} fill="#1B1646" fillOpacity={0.35} />
      <Path d={tile.face} fill="url(#dsGround)" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1} />

      {boxes.map(({ box, h }, i) => (
        <G key={i}>
          <Path d={box.left} fill="url(#dsL)" />
          <Path d={box.right} fill="url(#dsR)" />
          <Path d={box.top} fill="#EEF2FF" />
          {/* window grid on the lit face */}
          {Array.from({ length: Math.max(1, Math.floor((h - 8) / 9)) }).map((_, row) => (
            <G key={row}>
              <Path d={rightWin(box, 0.18, 6 + row * 9, 0.24, 5)} fill={(row + i) % 3 === 0 ? '#FBBF24' : '#5440D4'} fillOpacity={(row + i) % 3 === 0 ? 0.95 : 0.55} />
              <Path d={rightWin(box, 0.58, 6 + row * 9, 0.24, 5)} fill={(row + i) % 4 === 1 ? '#FBBF24' : '#5440D4'} fillOpacity={(row + i) % 4 === 1 ? 0.95 : 0.55} />
            </G>
          ))}
          {Array.from({ length: Math.max(1, Math.floor((h - 8) / 12)) }).map((_, row) => (
            <Path key={`l${row}`} d={leftWin(box, 0.3, 8 + row * 12, 0.4, 5)} fill="#FFFFFF" fillOpacity={0.3} />
          ))}
        </G>
      ))}

      {/* antenna and beacon on the tallest tower */}
      <Line x1={boxes[1].box.topCenter[0]} y1={boxes[1].box.topCenter[1]} x2={boxes[1].box.topCenter[0]} y2={boxes[1].box.topCenter[1] - 16} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={boxes[1].box.topCenter[0]} cy={boxes[1].box.topCenter[1] - 18} r={3.5} fill="#F87171" />
      <Circle cx={boxes[1].box.topCenter[0]} cy={boxes[1].box.topCenter[1] - 18} r={7} fill="#F87171" fillOpacity={0.25} />

      {/* roads converging on the town */}
      <Path d="M22 118 L60 137" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 4" />
      <Path d="M142 116 L110 134" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 4" />

      <Spark x={24} y={40} r={6} />
      <Spark x={140} y={52} r={4.5} color="#C7D2FE" />
      <Spark x={136} y={20} r={3} color="#FDE68A" />
    </Svg>
  );
});

/* ================================================================ STATE */

const STATE_NODES: Pt[] = [[44, 88], [70, 70], [112, 76], [124, 104], [88, 118], [54, 112]];

/** State admin: the state as a map slab, every district wired into one hub. */
export const StateNetwork3D = memo(function StateNetwork3D({ size = 120 }: ArtProps) {
  const outline = 'M30 92 C28 78 44 66 58 64 C66 52 86 50 98 58 C114 56 132 66 136 82 C146 92 140 110 126 116 C116 128 96 134 80 128 C62 134 40 124 36 112 C26 106 26 98 30 92 Z';
  const hub: Pt = [86, 94];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="snGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="snFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.42} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.12} />
        </SvgLinearGradient>
        <RadialGradient id="snHub" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.5" stopColor="#A5B4FC" />
          <Stop offset="1" stopColor="#5440D4" />
        </RadialGradient>
        <RadialGradient id="snNode" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#F59E0B" />
        </RadialGradient>
      </Defs>
      <Circle cx={84} cy={92} r={70} fill="url(#snGlow)" />
      {/* slab thickness then the face */}
      <Path d={outline} fill="#1B1646" fillOpacity={0.55} transform="translate(0 9)" />
      <Path d={outline} fill="#2A2178" fillOpacity={0.6} transform="translate(0 5)" />
      <Path d={outline} fill="url(#snFace)" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} />
      {/* district borders */}
      <Path d="M58 64 C62 80 70 92 86 94 M98 58 C94 72 90 84 86 94 M136 82 C120 86 102 90 86 94 M86 94 C88 108 84 120 80 128 M36 112 C52 104 70 98 86 94" stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={1} fill="none" />
      {/* the network */}
      {STATE_NODES.map((n, i) => (
        <Path key={`l${i}`} d={`M${P(hub)} Q${(hub[0] + n[0]) / 2} ${Math.min(hub[1], n[1]) - 14} ${P(n)}`} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.4} strokeDasharray="3 3" fill="none" />
      ))}
      {STATE_NODES.map((n, i) => (
        <G key={`n${i}`}>
          <Circle cx={n[0]} cy={n[1]} r={7} fill="#FBBF24" fillOpacity={0.22} />
          <Circle cx={n[0]} cy={n[1]} r={4} fill="url(#snNode)" />
        </G>
      ))}
      {/* the state capital hub, raised */}
      <Ellipse cx={hub[0]} cy={hub[1] + 2} rx={12} ry={4} fill="#1B1646" fillOpacity={0.35} />
      <Circle cx={hub[0]} cy={hub[1] - 8} r={14} fill="#FFFFFF" fillOpacity={0.18} />
      <Circle cx={hub[0]} cy={hub[1] - 8} r={10} fill="url(#snHub)" />
      <Path d={`M${hub[0] - 4} ${hub[1] - 8} L${hub[0] - 1} ${hub[1] - 5} L${hub[0] + 5} ${hub[1] - 11}`} stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Person cx={42} cy={40} r={11} ring="#A5B4FC" />
      <Path d="M50 48 L70 66" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="2 3" />
      <Spark x={138} y={34} r={6} />
      <Spark x={120} y={140} r={4} color="#C7D2FE" />
      <Spark x={18} y={130} r={3.5} color="#FDE68A" />
    </Svg>
  );
});

/* ================================================================ SUPER */

/** Super admin: a globe inside an orbit of admins — the command centre. */
export const GlobeCommand3D = memo(function GlobeCommand3D({ size = 120 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="gcGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="gcGlobe" cx="34%" cy="28%" r="85%">
          <Stop offset="0" stopColor="#E0E7FF" />
          <Stop offset="0.45" stopColor="#7C6CF0" />
          <Stop offset="1" stopColor="#2A2178" />
        </RadialGradient>
        <SvgLinearGradient id="gcLand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#10B981" />
        </SvgLinearGradient>
        <RadialGradient id="gcBadge" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={82} r={72} fill="url(#gcGlow)" />
      {/* back half of the orbit */}
      <Path d="M18 90 A64 22 -18 0 1 142 58" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.5} fill="none" />
      <Circle cx={80} cy={80} r={42} fill="url(#gcGlobe)" />
      {/* continents, abstract */}
      <Path d="M58 60 C66 52 80 54 84 62 C88 70 80 74 74 78 C68 82 70 92 62 94 C54 90 50 70 58 60 Z" fill="url(#gcLand)" fillOpacity={0.85} />
      <Path d="M92 90 C98 84 110 88 112 96 C110 106 100 112 94 108 C90 102 88 96 92 90 Z" fill="url(#gcLand)" fillOpacity={0.85} />
      <Path d="M96 52 C102 50 108 54 106 60 C102 62 96 60 96 52 Z" fill="url(#gcLand)" fillOpacity={0.7} />
      {/* meridians and parallels */}
      <Ellipse cx={80} cy={80} rx={18} ry={42} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} fill="none" />
      <Ellipse cx={80} cy={80} rx={34} ry={42} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1} fill="none" />
      <Ellipse cx={80} cy={80} rx={42} ry={14} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1} fill="none" />
      <Path d="M42 62 H118 M42 98 H118" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={1} />
      <Ellipse cx={64} cy={58} rx={12} ry={6} fill="#FFFFFF" fillOpacity={0.35} transform="rotate(-30 64 58)" />
      {/* front half of the orbit, with the admins riding it */}
      <Path d="M142 58 A64 22 -18 0 1 18 90" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2} fill="none" />
      <Person cx={24} cy={96} r={11} ring="#A5B4FC" />
      <Person cx={136} cy={54} r={10} ring="#A5B4FC" />
      <Person cx={96} cy={122} r={9} ring="#A5B4FC" />
      {/* the super-admin star badge */}
      <Circle cx={124} cy={118} r={16} fill="#1B1646" fillOpacity={0.35} />
      <Circle cx={122} cy={115} r={15} fill="url(#gcBadge)" />
      <Path d="M122 105 L125 112 L132 112.5 L126.5 117 L128.5 124 L122 120 L115.5 124 L117.5 117 L112 112.5 L119 112 Z" fill="#FFFFFF" />
      <Spark x={30} y={30} r={6} />
      <Spark x={146} y={24} r={4} color="#C7D2FE" />
      <Spark x={148} y={140} r={3.5} color="#FDE68A" />
    </Svg>
  );
});

/* ================================================================ SCREENS */

/** Approvals: a stack of applications with a green approval stamp. */
export const ApprovalStack3D = memo(function ApprovalStack3D({ size = 110 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="asGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="asCard" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
        <RadialGradient id="asStamp" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={66} fill="url(#asGlow)" />
      <Rect x={48} y={30} width={74} height={92} rx={10} fill="#FFFFFF" fillOpacity={0.25} transform="rotate(10 85 76)" />
      <Rect x={42} y={34} width={74} height={92} rx={10} fill="#FFFFFF" fillOpacity={0.45} transform="rotate(4 79 80)" />
      <Rect x={38} y={44} width={74} height={92} rx={10} fill="#1B1646" fillOpacity={0.35} />
      <Rect x={36} y={38} width={74} height={92} rx={10} fill="url(#asCard)" />
      <Circle cx={54} cy={58} r={9} fill="#C7D2FE" />
      <Circle cx={54} cy={55} r={3.5} fill="#5440D4" />
      <Path d="M47.5 64 C49 59 59 59 60.5 64 Z" fill="#5440D4" />
      <Rect x={68} y={52} width={32} height={5} rx={2.5} fill="#5440D4" fillOpacity={0.8} />
      <Rect x={68} y={61} width={22} height={4} rx={2} fill="#A5B4FC" />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={46} y={78 + i * 11} width={i === 3 ? 34 : 54} height={4} rx={2} fill="#C7D2FE" />
      ))}
      <Circle cx={112} cy={112} r={21} fill="#1B1646" fillOpacity={0.3} />
      <Circle cx={110} cy={108} r={20} fill="url(#asStamp)" />
      <Circle cx={110} cy={108} r={15} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="3 2.5" />
      <Path d="M101 108 L107 114 L119 101" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Spark x={130} y={34} r={6} />
      <Spark x={24} y={80} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/** Members: three members and the card they hold, with the renewal loop. */
export const MembersCircle3D = memo(function MembersCircle3D({ size = 110 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="mcGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="mcRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C7D2FE" />
          <Stop offset="1" stopColor="#5440D4" />
        </SvgLinearGradient>
        <SvgLinearGradient id="mcCard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={80} cy={82} r={66} fill="url(#mcGlow)" />
      <Path d="M36 64 A48 48 0 0 1 124 60" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} fill="none" strokeDasharray="5 5" />
      <Path d="M120 52 L126 61 L115 63" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Person cx={48} cy={84} r={17} ring="url(#mcRing)" />
      <Person cx={112} cy={84} r={17} ring="url(#mcRing)" />
      <Person cx={80} cy={74} r={22} ring="url(#mcRing)" />
      <Rect x={54} y={106} width={56} height={34} rx={7} fill="#1B1646" fillOpacity={0.35} />
      <Rect x={52} y={102} width={56} height={34} rx={7} fill="url(#mcCard)" />
      <Rect x={52} y={110} width={56} height={6} fill="#FFFFFF" fillOpacity={0.35} />
      <Circle cx={63} cy={126} r={5} fill="#FFFFFF" fillOpacity={0.9} />
      <Rect x={72} y={122} width={28} height={3.5} rx={1.75} fill="#FFFFFF" fillOpacity={0.85} />
      <Rect x={72} y={128} width={18} height={3} rx={1.5} fill="#FFFFFF" fillOpacity={0.6} />
      <Spark x={134} y={116} r={6} />
      <Spark x={24} y={40} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/** Applicant detail: a dossier folder with the applicant's card and a magnifier. */
export const Dossier3D = memo(function Dossier3D({ size = 110 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="dsrGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="dsrFolder" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#3B2DB0" />
        </SvgLinearGradient>
        <SvgLinearGradient id="dsrFront" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A5B4FC" />
          <Stop offset="1" stopColor="#5440D4" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={80} cy={84} r={66} fill="url(#dsrGlow)" />
      <Path d="M28 50 H62 L70 58 H130 V128 H28 Z" fill="url(#dsrFolder)" />
      <Rect x={40} y={40} width={74} height={62} rx={8} fill="#FFFFFF" transform="rotate(-6 77 71)" />
      <Circle cx={60} cy={62} r={10} fill="#C7D2FE" transform="rotate(-6 77 71)" />
      <Circle cx={59} cy={59} r={4} fill="#5440D4" />
      <Path d="M52 70 C54 64 64 64 66 69 Z" fill="#5440D4" />
      <Rect x={75} y={54} width={30} height={4} rx={2} fill="#5440D4" transform="rotate(-6 77 71)" />
      <Rect x={75} y={63} width={22} height={3.5} rx={1.75} fill="#A5B4FC" transform="rotate(-6 77 71)" />
      <Rect x={52} y={80} width={50} height={3.5} rx={1.75} fill="#C7D2FE" transform="rotate(-6 77 71)" />
      <Path d="M24 76 H136 L128 132 H32 Z" fill="url(#dsrFront)" />
      <Path d="M24 76 H136 L135 82 H25 Z" fill="#FFFFFF" fillOpacity={0.3} />
      <Circle cx={116} cy={112} r={17} fill="#FFFFFF" fillOpacity={0.25} stroke="#FFFFFF" strokeWidth={5} />
      <Path d="M128 124 L140 136" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx={110} cy={106} rx={5} ry={2.5} fill="#FFFFFF" fillOpacity={0.7} transform="rotate(-35 110 106)" />
      <Spark x={140} y={36} r={6} />
      <Spark x={18} y={104} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/** Manage admins: two admin ID cards fanned out, with an "add" badge and a key. */
export const TeamKeys3D = memo(function TeamKeys3D({ size = 110 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="tkGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="tkCard" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
        <SvgLinearGradient id="tkBand" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#5440D4" />
          <Stop offset="1" stopColor="#8B7CF6" />
        </SvgLinearGradient>
        <RadialGradient id="tkAdd" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={66} fill="url(#tkGlow)" />
      <G transform="rotate(-12 64 86)">
        <Rect x={30} y={52} width={64} height={80} rx={10} fill="url(#tkCard)" fillOpacity={0.75} />
        <Rect x={30} y={52} width={64} height={16} rx={10} fill="url(#tkBand)" fillOpacity={0.75} />
      </G>
      <Rect x={62} y={50} width={64} height={80} rx={10} fill="#1B1646" fillOpacity={0.3} />
      <Rect x={60} y={44} width={64} height={80} rx={10} fill="url(#tkCard)" />
      <Rect x={60} y={44} width={64} height={18} rx={10} fill="url(#tkBand)" />
      <Rect x={60} y={54} width={64} height={8} fill="url(#tkBand)" />
      <Person cx={92} cy={80} r={13} ring="#A5B4FC" />
      <Rect x={74} y={100} width={36} height={4} rx={2} fill="#5440D4" />
      <Rect x={80} y={109} width={24} height={3.5} rx={1.75} fill="#A5B4FC" />
      <Circle cx={124} cy={122} r={15} fill="url(#tkAdd)" />
      <Path d="M124 115 V129 M117 122 H131" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={34} cy={38} r={9} fill="none" stroke="#FDE68A" strokeWidth={4} />
      <Path d="M40 44 L56 60 M50 54 L54 50 M46 50 L49 47" stroke="#FDE68A" strokeWidth={4} strokeLinecap="round" />
      <Spark x={142} y={36} r={6} />
      <Spark x={22} y={112} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/** Settings & audit: a clipboard carrying a timeline, and a clock. */
export const AuditLog3D = memo(function AuditLog3D({ size = 110 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="alGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="alBoard" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#3B2DB0" />
        </SvgLinearGradient>
        <RadialGradient id="alClock" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C7D2FE" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={66} fill="url(#alGlow)" />
      <Rect x={40} y={34} width={76} height={100} rx={12} fill="#1B1646" fillOpacity={0.3} transform="translate(3 5)" />
      <Rect x={40} y={34} width={76} height={100} rx={12} fill="url(#alBoard)" />
      <Rect x={48} y={46} width={60} height={82} rx={7} fill="#FFFFFF" />
      <Rect x={62} y={28} width={32} height={14} rx={6} fill="#C7D2FE" />
      <Circle cx={78} cy={32} r={3} fill="#5440D4" />
      <Line x1={60} y1={58} x2={60} y2={118} stroke="#C7D2FE" strokeWidth={2} />
      {[
        { y: 60, c: '#10B981', w: 32 },
        { y: 78, c: '#F59E0B', w: 26 },
        { y: 96, c: '#5440D4', w: 30 },
        { y: 114, c: '#EF4444', w: 20 },
      ].map((r) => (
        <G key={r.y}>
          <Circle cx={60} cy={r.y} r={4.5} fill={r.c} />
          <Rect x={70} y={r.y - 4} width={r.w} height={3.5} rx={1.75} fill="#5440D4" fillOpacity={0.7} />
          <Rect x={70} y={r.y + 2} width={r.w - 10} height={3} rx={1.5} fill="#C7D2FE" />
        </G>
      ))}
      <Circle cx={118} cy={112} r={19} fill="#1B1646" fillOpacity={0.3} />
      <Circle cx={116} cy={108} r={18} fill="url(#alClock)" />
      <Path d="M116 97 V108 L124 113" stroke="#5440D4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Spark x={136} y={40} r={6} />
      <Spark x={22} y={90} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/** Hub: the hierarchy — one region fanning out into the ones beneath it. */
export const HubTree3D = memo(function HubTree3D({ size = 110 }: ArtProps) {
  const top: Pt = [80, 38];
  const mids: Pt[] = [[46, 82], [114, 82]];
  const leaves: Pt[] = [[26, 126], [62, 126], [98, 126], [134, 126]];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="htGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="htTop" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.5" stopColor="#A5B4FC" />
          <Stop offset="1" stopColor="#5440D4" />
        </RadialGradient>
        <RadialGradient id="htMid" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </RadialGradient>
        <RadialGradient id="htLeaf" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#A7F3D0" />
          <Stop offset="1" stopColor="#059669" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={68} fill="url(#htGlow)" />
      {mids.map((m, i) => (
        <Path key={`t${i}`} d={`M${P(top)} C${top[0]} ${top[1] + 26} ${m[0]} ${m[1] - 26} ${P(m)}`} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} fill="none" />
      ))}
      {leaves.map((l, i) => {
        const m = mids[i < 2 ? 0 : 1];
        return <Path key={`m${i}`} d={`M${P(m)} C${m[0]} ${m[1] + 22} ${l[0]} ${l[1] - 22} ${P(l)}`} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="3 3" fill="none" />;
      })}
      <Circle cx={top[0]} cy={top[1] + 3} r={17} fill="#1B1646" fillOpacity={0.3} />
      <Circle cx={top[0]} cy={top[1]} r={16} fill="url(#htTop)" />
      <Path d={`M${top[0] - 7} ${top[1] + 1} L${top[0]} ${top[1] - 7} L${top[0] + 7} ${top[1] + 1} M${top[0] - 5} ${top[1]} V${top[1] + 7} H${top[0] + 5} V${top[1]}`} stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" fill="none" />
      {mids.map((m, i) => (
        <G key={`mm${i}`}>
          <Circle cx={m[0]} cy={m[1] + 2} r={12} fill="#1B1646" fillOpacity={0.3} />
          <Circle cx={m[0]} cy={m[1]} r={11} fill="url(#htMid)" />
          <Rect x={m[0] - 4} y={m[1] - 5} width={8} height={10} rx={1.5} fill="#FFFFFF" fillOpacity={0.9} />
        </G>
      ))}
      {leaves.map((l, i) => (
        <G key={`ll${i}`}>
          <Circle cx={l[0]} cy={l[1]} r={8} fill="url(#htLeaf)" />
          <Circle cx={l[0]} cy={l[1]} r={2.5} fill="#FFFFFF" />
        </G>
      ))}
      <Spark x={138} y={34} r={6} />
      <Spark x={20} y={50} r={4} color="#C7D2FE" />
    </Svg>
  );
});

/* ================================================================ STATES (light bg) */

/** Empty: an open tray with nothing in it and a sparkle — drawn for a light card. */
export const AdminEmptyTray3D = memo(function AdminEmptyTray3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="etGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#C7D2FE" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#EEF2FF" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="etTray" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#3B2DB0" />
        </SvgLinearGradient>
        <SvgLinearGradient id="etSheet" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={80} cy={86} r={64} fill="url(#etGlow)" />
      <Rect x={50} y={36} width={60} height={62} rx={8} fill="url(#etSheet)" stroke="#C7D2FE" strokeWidth={1.5} transform="rotate(-8 80 67)" />
      <Rect x={58} y={48} width={34} height={4} rx={2} fill="#A5B4FC" transform="rotate(-8 80 67)" />
      <Rect x={58} y={58} width={24} height={4} rx={2} fill="#C7D2FE" transform="rotate(-8 80 67)" />
      <Path d="M30 96 L46 76 H114 L130 96 V124 C130 129 126 132 121 132 H39 C34 132 30 129 30 124 Z" fill="url(#etTray)" />
      <Path d="M30 96 H62 C62 104 70 108 80 108 C90 108 98 104 98 96 H130 V124 C130 129 126 132 121 132 H39 C34 132 30 129 30 124 Z" fill="#5440D4" />
      <Path d="M30 96 H62 C62 104 70 108 80 108 C90 108 98 104 98 96 H130" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} fill="none" />
      <Ellipse cx={80} cy={142} rx={42} ry={5} fill="#1B1646" fillOpacity={0.1} />
      <Spark x={126} y={40} r={8} color="#8B7CF6" />
      <Spark x={34} y={58} r={5} color="#FBBF24" />
      <Spark x={138} y={70} r={4} color="#A5B4FC" />
    </Svg>
  );
});

/** Error: a cloud that has lost its connection — drawn for a light card. */
export const AdminCloudOff3D = memo(function AdminCloudOff3D({ size = 96 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="coGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FECACA" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#FEF2F2" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="coCloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
        <RadialGradient id="coBadge" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FCA5A5" />
          <Stop offset="1" stopColor="#DC2626" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={64} fill="url(#coGlow)" />
      <Path d="M44 112 C30 112 24 100 28 90 C32 80 42 78 48 80 C50 62 66 50 84 54 C98 56 108 66 110 78 C124 76 136 86 134 100 C132 108 126 112 118 112 Z" fill="#1B1646" fillOpacity={0.12} transform="translate(2 6)" />
      <Path d="M44 112 C30 112 24 100 28 90 C32 80 42 78 48 80 C50 62 66 50 84 54 C98 56 108 66 110 78 C124 76 136 86 134 100 C132 108 126 112 118 112 Z" fill="url(#coCloud)" stroke="#C7D2FE" strokeWidth={1.5} />
      <Path d="M58 92 C66 84 80 82 92 88" stroke="#A5B4FC" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M66 100 C72 96 80 96 86 99" stroke="#A5B4FC" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Circle cx={116} cy={114} r={16} fill="url(#coBadge)" />
      <Path d="M110 108 L122 120 M122 108 L110 120" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />
      <Spark x={36} y={44} r={5} color="#FCA5A5" />
      <Spark x={130} y={50} r={4} color="#A5B4FC" />
    </Svg>
  );
});

/** Admin profile & settings: an admin badge on a lanyard, with a gear and a padlock. */
export const ProfileGear3D = memo(function ProfileGear3D({ size = 110 }: ArtProps) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id="pgGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A5B4FC" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A5B4FC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="pgCard" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E0E7FF" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pgBand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B7CF6" />
          <Stop offset="1" stopColor="#3B2DB0" />
        </SvgLinearGradient>
        <RadialGradient id="pgGear" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#D97706" />
        </RadialGradient>
        <RadialGradient id="pgLock" cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#6EE7B7" />
          <Stop offset="1" stopColor="#047857" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={84} r={66} fill="url(#pgGlow)" />
      <Path d="M62 14 L78 44 M98 14 L82 44" stroke="#C7D2FE" strokeWidth={5} strokeLinecap="round" />
      <Rect x={70} y={40} width={20} height={10} rx={3} fill="#A5B4FC" />
      <Rect x={47} y={52} width={70} height={90} rx={12} fill="#1B1646" fillOpacity={0.3} />
      <Rect x={45} y={48} width={70} height={90} rx={12} fill="url(#pgCard)" />
      <Rect x={45} y={48} width={70} height={24} rx={12} fill="url(#pgBand)" />
      <Rect x={45} y={60} width={70} height={12} fill="url(#pgBand)" />
      <Person cx={80} cy={88} r={16} ring="#A5B4FC" />
      <Rect x={60} y={112} width={40} height={4.5} rx={2.25} fill="#5440D4" />
      <Rect x={66} y={122} width={28} height={3.5} rx={1.75} fill="#A5B4FC" />
      <G>
        {teeth.map((deg) => (
          <Rect key={deg} x={121} y={96} width={8} height={10} rx={2} fill="url(#pgGear)" transform={`rotate(${deg} 125 112)`} />
        ))}
        <Circle cx={125} cy={112} r={13} fill="url(#pgGear)" />
        <Circle cx={125} cy={112} r={5} fill="#FFFFFF" />
      </G>
      <Rect x={22} y={104} width={24} height={20} rx={5} fill="url(#pgLock)" />
      <Path d="M27 104 V98 C27 91 41 91 41 98 V104" stroke="#6EE7B7" strokeWidth={3.5} fill="none" />
      <Circle cx={34} cy={113} r={3} fill="#FFFFFF" />
      <Spark x={138} y={40} r={6} />
      <Spark x={24} y={60} r={4} color="#C7D2FE" />
    </Svg>
  );
});
