import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, LayoutChangeEvent, Platform, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import { asArray, RADIUS, SHADOW } from '../../../ui';

/**
 * ============================================================================
 * THE TWO CERTIFICATES, DRAWN NATIVELY
 * ============================================================================
 *
 * Same data and same wording as the website's
 * `features/member/certificates/MembershipCertificate.tsx` and
 * `TaxExemptionCertificate.tsx` (which the server does not render — it sends
 * the fields; each client draws them), with the template's furniture in SVG.
 *
 *   membership   a fixed 360-unit-wide sheet, scaled to the screen width.
 *   tax (80G)    a TRUE A4 page: laid out at the website's 794 x 1123 units
 *                with the website's paddings, type sizes and columns, then
 *                scaled uniformly — every phone shows the identical page, at
 *                exactly 1 : 1.4143. `CertificateZoomScreen` shows it larger.
 *
 *
 *   membership   heavy navy frame + gold rules, navy/gold/royal diagonal bands
 *                in all four corners, faint guilloche waves, the mark centred,
 *                the Founder President's signature ink, the struck medallion,
 *                the date of issue, a navy foot bar with the certificate no.
 *   tax (80G)    the navy wave down the left edge with gold lines riding it,
 *                navy + gold corners, the ribboned medallion — and, as the
 *                website does on the association's instruction, NO signature
 *                and NO QR.
 *
 * NOTHING IS INVENTED: a fact the server did not send is left out, an amount
 * it did not record is a dash, and a null `validUntil` is never printed as a
 * date (null means lifetime).
 *
 * The tax certificate also draws the donor's 80G receipt and year statement
 * (website DonationDocumentPage feeds the same component), via `stamp`,
 * `receiptColumn` and `amountInWords`.
 */

export const ASSOCIATION_NAME = 'Adidravidar Confederation of Trade and Industrial Vision';
const ADDRESS = '6&7, Hayagreeva Apartment, 121, Velachery Main Road, Chennai - 600032';
const PHONE = '+91-82201-12188';
const EMAIL = 'info@activ.org.in';
const WEB = 'https://activ.org.in';

/*
 * The certificate's print palette — the website template's own values
 * (navy + gold on white paper, never purple). Fixed layout: the sheet is a
 * document, so its type sizes are its own and do not follow TYPE.
 */
const NAVY = '#0E1F4D';
const NAVY_MID = '#1C2E68';
const NAVY_SOFT = '#2A4A9A';
const INK = '#13224F';
const MUTED = '#5B6B8F';
const GOLD = '#C8992F';
const GOLD_LIGHT = '#E6C878';
const GOLD_PALE = '#F7E3A6';
const GOLD_DEEP = '#8A6518';
const PAPER = '#FBFCFF';
const LINE = '#E3EAF6';
const PANEL_LINE = '#CFDBF1';

const LOGO = require('../../../assets/images/activlogo.png');
const SIGNATURE = require('../../../assets/images/chairman-signature.png');

/** 28/09/2026 — the website's en-GB 2-digit date. */
export const certDate = (iso?: string | null, sep = '/') => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${sep}${mm}${sep}${d.getFullYear()}`;
};

/** ₹ 1,000.00 — a dash when nothing was recorded. */
export const certRupees = (n?: number | null) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

/** "2026-27" → "2026–2027". */
export const fullYear = (fy?: string | null) => {
  const m = /^(\d{4})-(\d{2,4})$/.exec(String(fy || ''));
  return m ? `${m[1]}–${m[2].length === 2 ? `${m[1].slice(0, 2)}${m[2]}` : m[2]}` : String(fy || '');
};

/* ------------------------------------------------------------------ helpers */

/** An id safe for `url(#…)` — two medallions on one screen must not share one. */
const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/** The paper's measured size, so the frame is drawn in real pixels (no stretching). */
function usePaperSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(Number(e?.nativeEvent?.layout?.width || 0));
    const h = Math.round(Number(e?.nativeEvent?.layout?.height || 0));
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  };
  return { ...size, onLayout };
}

const at = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
};

/* ------------------------------------------------------------------ the medallion */

/**
 * The association's medallion, struck rather than stamped (website
 * CertificateMedallion): a bevelled gold rim, a royal band carrying the name
 * and the motto in gold, a cream face with a laurel wreath, three stars, the
 * mark extruded in gold, and a banner across the foot.
 */
export function Seal({ line, size = 96 }: { line: string; size?: number }) {
  const rim = useSvgId('mdRim');
  const bevel = useSvgId('mdBev');
  const royal = useSvgId('mdRoyal');
  const face = useSvgId('mdFace');
  const leafGold = useSvgId('mdLg');
  const leafRoyal = useSvgId('mdLr');
  const topArc = useSvgId('mdTop');
  const footArc = useSvgId('mdFoot');
  const sheen = useSvgId('mdSheen');

  const wreath = useMemo(() => {
    const leaves: { x: number; y: number; rot: number; gold: boolean }[] = [];
    const berries: { x: number; y: number }[] = [];
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 7; i += 1) {
        const deg = side < 0 ? 188 - i * 12 : -8 + i * 12;
        const p = at(130, 132, 76, deg);
        leaves.push({ x: p.x, y: p.y, rot: -(deg + 90), gold: i % 2 === 0 });
        if (i < 6) berries.push(at(130, 132, 62, deg + (side < 0 ? -6 : 6)));
      }
    });
    return { leaves, berries };
  }, []);

  const t1 = at(130, 130, 110, 200);
  const t2 = at(130, 130, 110, -20);
  const f1 = at(130, 130, 110, 215);
  const f2 = at(130, 130, 110, 325);
  const arc = (a: { x: number; y: number }, b: { x: number; y: number }, large: number, sweep: number) =>
    `M${a.x.toFixed(2)},${a.y.toFixed(2)} A110,110 0 ${large},${sweep} ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
  const banner = String(line || '').toUpperCase();

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Seal of the association — ${line}`} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 260 260">
        <Defs>
          <SvgLinearGradient id={rim} x1="0.12" y1="0" x2="0.88" y2="1">
            <Stop offset="0" stopColor={GOLD_PALE} />
            <Stop offset="0.28" stopColor={GOLD_LIGHT} />
            <Stop offset="0.55" stopColor={GOLD} />
            <Stop offset="1" stopColor={GOLD_DEEP} />
          </SvgLinearGradient>
          <SvgLinearGradient id={bevel} x1="0.9" y1="0" x2="0.1" y2="1">
            <Stop offset="0" stopColor={GOLD_DEEP} />
            <Stop offset="0.5" stopColor={GOLD} />
            <Stop offset="1" stopColor={GOLD_PALE} />
          </SvgLinearGradient>
          <SvgLinearGradient id={royal} x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor="#1D4ED8" />
            <Stop offset="0.5" stopColor="#1E3A8A" />
            <Stop offset="1" stopColor="#040B26" />
          </SvgLinearGradient>
          <RadialGradient id={face} cx="36%" cy="28%" r="82%">
            <Stop offset="0" stopColor="#FFFFFA" />
            <Stop offset="0.58" stopColor="#FCF7EA" />
            <Stop offset="1" stopColor="#E6DBBE" />
          </RadialGradient>
          <SvgLinearGradient id={leafGold} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GOLD_PALE} />
            <Stop offset="1" stopColor={GOLD} />
          </SvgLinearGradient>
          <SvgLinearGradient id={leafRoyal} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3B82F6" />
            <Stop offset="1" stopColor="#1E3A8A" />
          </SvgLinearGradient>
          <RadialGradient id={sheen} cx="30%" cy="24%" r="62%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
            <Stop offset="0.58" stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.14} />
          </RadialGradient>
          <Path id={topArc} d={arc(t1, t2, 1, 1)} fill="none" />
          <Path id={footArc} d={arc(f1, f2, 0, 0)} fill="none" />
        </Defs>

        <Circle cx={133} cy={136} r={129} fill="#0A1738" fillOpacity={0.22} />
        <Circle cx={130} cy={130} r={129} fill={`url(#${rim})`} />
        <Circle cx={130} cy={130} r={122} fill={`url(#${bevel})`} />
        <Circle cx={130} cy={130} r={120} fill={`url(#${royal})`} />
        <Circle cx={130} cy={130} r={120} fill="none" stroke={GOLD_PALE} strokeWidth={1} />
        <Circle cx={130} cy={130} r={99} fill="none" stroke={`url(#${rim})`} strokeWidth={6} />
        <Circle cx={130} cy={130} r={95} fill={`url(#${face})`} />

        <SvgText fill={GOLD_PALE} fontSize={9.5} fontWeight="700" letterSpacing={0.5}>
          <TextPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            ADIDRAVIDAR CONFEDERATION OF TRADE &amp; INDUSTRIAL VISION
          </TextPath>
        </SvgText>
        <SvgText fill={GOLD_PALE} fontSize={8.5} fontWeight="700" letterSpacing={0.4}>
          <TextPath href={`#${footArc}`} startOffset="50%" textAnchor="middle">
            ORGANISE FOR ECONOMIC LIBERTY
          </TextPath>
        </SvgText>
        {[180, 0].map((deg) => {
          const p = at(130, 130, 110, deg);
          return (
            <G key={deg}>
              <Circle cx={p.x} cy={p.y} r={5} fill={`url(#${rim})`} />
              <Circle cx={p.x - 1.2} cy={p.y - 1.2} r={1.6} fill={GOLD_PALE} fillOpacity={0.8} />
            </G>
          );
        })}

        {wreath.berries.map((bb, i) => (
          <Circle key={`b${i}`} cx={bb.x} cy={bb.y} r={2.6} fill={`url(#${leafGold})`} />
        ))}
        {wreath.leaves.map((leaf, i) => (
          <G key={`l${i}`} transform={`rotate(${leaf.rot} ${leaf.x} ${leaf.y})`}>
            <Ellipse cx={leaf.x} cy={leaf.y} rx={12.5} ry={5.2} fill={leaf.gold ? `url(#${leafGold})` : `url(#${leafRoyal})`} />
            {leaf.gold ? <Path d={`M${leaf.x - 10} ${leaf.y} H${leaf.x + 10}`} stroke={GOLD_DEEP} strokeWidth={0.8} strokeOpacity={0.55} /> : null}
          </G>
        ))}

        {[-24, 0, 24].map((deg) => {
          const p = at(130, 134, 56, 90 + deg);
          return <SvgText key={deg} x={p.x} y={p.y + 5} fontSize={14} fill="#1E3A8A" textAnchor="middle">★</SvgText>;
        })}

        {[4, 3, 2, 1].map((d) => (
          <SvgText key={d} x={130} y={134 + d * 1.2} fontSize={40} fontWeight="800" letterSpacing={1.2} textAnchor="middle" fill={GOLD_DEEP} fillOpacity={0.45 + d * 0.13}>
            ACTIV
          </SvgText>
        ))}
        <SvgText x={130} y={134} fontSize={40} fontWeight="800" letterSpacing={1.2} textAnchor="middle" fill="#1E3A8A" stroke={GOLD} strokeWidth={1}>
          ACTIV
        </SvgText>

        <Path d="M52 158 H208 L222 170 L208 182 H52 L38 170 Z" fill={`url(#${rim})`} />
        <Path d="M56 161 H204 V179 H56 Z" fill={`url(#${royal})`} />
        <SvgText x={130} y={174.5} fontSize={banner.length > 12 ? 10 : 12} fontWeight="800" letterSpacing={1.4} textAnchor="middle" fill={GOLD_PALE}>
          {banner}
        </SvgText>

        <Circle cx={130} cy={130} r={129} fill={`url(#${sheen})`} />
      </Svg>
    </View>
  );
}

/**
 * The medallion hung on two ribbon tails — website `RibbonMedallion`, to the
 * unit: a 140 x 178 box, the 140px medallion at its top, the tails (140 x 86)
 * starting 92px down, drawn BEHIND the medallion.
 */
function RibbonSeal({ line }: { line: string }) {
  const tail = useSvgId('rsTail');
  return (
    <View style={{ width: 140, height: 178 }}>
      <Svg width={140} height={86} viewBox="0 0 140 86" style={{ position: 'absolute', left: 0, top: 92 }}>
        <Defs>
          <SvgLinearGradient id={tail} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={NAVY_SOFT} />
            <Stop offset="1" stopColor={NAVY} />
          </SvgLinearGradient>
        </Defs>
        <Path d="M34 0 L66 8 L52 86 L40 70 L22 80 Z" fill={`url(#${tail})`} stroke={GOLD} strokeWidth={1.4} />
        <Path d="M106 0 L74 8 L88 86 L100 70 L118 80 Z" fill={`url(#${tail})`} stroke={GOLD} strokeWidth={1.4} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: 0 }}>
        <Seal line={line} size={140} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ frames */

const WAVES = Array.from({ length: 12 }, (_, i) => i);

/** Membership: navy frame, gold rules, diagonal bands in all four corners, the foot bar. */
function MembershipFrame({ w, h }: { w: number; h: number }) {
  const navy = useSvgId('mfNavy');
  const royalId = useSvgId('mfRoyal');
  const gold = useSvgId('mfGold');
  const glow = useSvgId('mfGlow');
  if (!w || !h) return null;
  const k = Math.min(w, h) * 0.26; // corner reach
  /** A diagonal stripe between reach a and b from the corner (x0,y0), pointing inwards (sx, sy). */
  const band = (x0: number, y0: number, sx: number, sy: number, a: number, b: number) =>
    `${x0 + sx * a},${y0} ${x0 + sx * b},${y0} ${x0},${y0 + sy * b} ${x0},${y0 + sy * a}`;
  const corner = (x0: number, y0: number, sx: number, sy: number, key: string) => (
    <G key={key}>
      <Polygon points={`${x0},${y0} ${x0 + sx * k * 0.62},${y0} ${x0},${y0 + sy * k * 0.62}`} fill={`url(#${navy})`} />
      <Polygon points={band(x0, y0, sx, sy, k * 0.62, k * 0.68)} fill={`url(#${gold})`} />
      <Polygon points={band(x0, y0, sx, sy, k * 0.68, k * 0.82)} fill={`url(#${royalId})`} fillOpacity={0.9} />
      <Polygon points={band(x0, y0, sx, sy, k * 0.82, k * 0.85)} fill={`url(#${gold})`} />
      <Polygon points={band(x0, y0, sx, sy, k * 0.85, k * 0.96)} fill="#9FB6E4" fillOpacity={0.28} />
    </G>
  );
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={navy} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={NAVY_MID} />
          <Stop offset="1" stopColor={NAVY} />
        </SvgLinearGradient>
        <SvgLinearGradient id={royalId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3A5DB4" />
          <Stop offset="1" stopColor={NAVY_SOFT} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD_PALE} />
          <Stop offset="0.45" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_DEEP} />
        </SvgLinearGradient>
        <RadialGradient id={glow} cx="50%" cy="42%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EEF3FC" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${glow})`} />
      {WAVES.map((i) => {
        const y = 120 + i * ((h - 160) / 11);
        return <Path key={i} d={`M-10 ${y} C ${w * 0.3} ${y - 50}, ${w * 0.65} ${y + 60}, ${w + 10} ${y - 20}`} stroke="#DCE6F7" strokeWidth={1} fill="none" />;
      })}
      {corner(0, 0, 1, 1, 'tl')}
      {corner(w, 0, -1, 1, 'tr')}
      {corner(0, h, 1, -1, 'bl')}
      {corner(w, h, -1, -1, 'br')}
      <Rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke={`url(#${navy})`} strokeWidth={8} />
      <Rect x={9.5} y={9.5} width={w - 19} height={h - 19} fill="none" stroke={`url(#${gold})`} strokeWidth={2} />
      <Rect x={18} y={18} width={w - 36} height={h - 36} rx={3} fill="none" stroke={`url(#${gold})`} strokeWidth={1} />
    </Svg>
  );
}

/**
 * THE A4 PAGE. 210 x 297mm = 794 x 1123 at 96dpi — the website sheet's own
 * units. The tax certificate is laid out at exactly this size and then scaled
 * as a whole, so every phone (and the zoom view) shows the identical page.
 */
export const A4_W = 794;
export const A4_H = 1123;

const GUILLOCHE = Array.from({ length: 11 }, (_, i) => i);

/** Tax (80G): website TaxExemptionCertificate `Frame`, drawn in the same 794 x 1123 units. */
function TaxFrame() {
  const navy = useSvgId('tfNavy');
  const wave = useSvgId('tfWave');
  const royalId = useSvgId('tfRoyal');
  const gold = useSvgId('tfGold');
  const pale = useSvgId('tfPale');
  const glow = useSvgId('tfGlow');
  const goldStroke = `url(#${gold})`;
  return (
    <Svg width={A4_W} height={A4_H} viewBox={`0 0 ${A4_W} ${A4_H}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={navy} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={NAVY_MID} />
          <Stop offset="1" stopColor={NAVY} />
        </SvgLinearGradient>
        <SvgLinearGradient id={wave} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={NAVY} />
          <Stop offset="0.5" stopColor={NAVY_MID} />
          <Stop offset="1" stopColor={NAVY} />
        </SvgLinearGradient>
        <SvgLinearGradient id={royalId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3A5DB4" />
          <Stop offset="1" stopColor={NAVY_SOFT} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD_PALE} />
          <Stop offset="0.5" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_DEEP} />
        </SvgLinearGradient>
        <SvgLinearGradient id={pale} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#C9D8F2" />
          <Stop offset="1" stopColor="#EEF3FC" />
        </SvgLinearGradient>
        <RadialGradient id={glow} cx="55%" cy="40%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EEF3FC" />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={A4_W} height={A4_H} fill={`url(#${glow})`} />

      {/* faint guilloche waves across the paper */}
      {GUILLOCHE.map((i) => (
        <Path
          key={i}
          d={`M-20 ${200 + i * 72} C 220 ${130 + i * 72}, 540 ${290 + i * 72}, 820 ${190 + i * 72}`}
          fill="none" stroke="#DCE6F7" strokeWidth={1} strokeOpacity={0.8}
        />
      ))}

      {/* the left wave, three layers deep */}
      <Path d="M0 0 H176 C 132 70, 150 150, 168 210 C 186 280, 170 340, 128 380 C 92 414, 100 520, 108 620 C 116 720, 70 800, 40 880 C 22 930, 16 980, 0 1010 Z" fill={`url(#${pale})`} fillOpacity={0.75} />
      <Path d="M0 0 H128 C 98 60, 104 120, 128 164 C 150 204, 160 236, 154 270 C 148 310, 118 330, 86 340 C 56 350, 50 386, 58 430 C 68 490, 72 560, 62 640 C 54 720, 30 790, 0 850 Z" fill={`url(#${wave})`} />
      <Path d="M0 0 H62 C 44 70, 40 130, 22 200 C 12 240, 8 270, 0 300 Z" fill={`url(#${royalId})`} fillOpacity={0.55} />
      {/* the deep edge strip, top to bottom */}
      <Rect x={0} y={0} width={18} height={A4_H} fill={`url(#${navy})`} />

      {/* the gold lines that ride the wave */}
      <Path d="M136 0 C 106 60, 112 120, 136 164 C 158 204, 168 238, 162 272 C 156 314, 124 336, 92 346 C 64 356, 58 390, 66 432 C 76 492, 80 562, 70 642 C 62 722, 38 792, 8 852" fill="none" stroke={goldStroke} strokeLinecap="round" strokeWidth={2.2} />
      <Path d="M184 0 C 142 70, 158 150, 176 210 C 194 282, 178 344, 136 384 C 100 418, 108 522, 116 622 C 124 722, 78 802, 48 882 C 30 932, 24 982, 8 1012" fill="none" stroke={goldStroke} strokeLinecap="round" strokeWidth={1.1} strokeOpacity={0.8} />
      <Path d="M40 0 L 0 60" fill="none" stroke={goldStroke} strokeLinecap="round" strokeWidth={1.6} />
      <Path d="M76 0 L 0 110" fill="none" stroke={goldStroke} strokeLinecap="round" strokeWidth={1} strokeOpacity={0.85} />

      {/* top-right corner */}
      <Polygon points="794,0 690,0 794,98" fill={`url(#${navy})`} />
      <Polygon points="690,0 676,0 794,112 794,98" fill={goldStroke} />
      <Polygon points="676,0 648,0 794,140 794,112" fill={`url(#${royalId})`} fillOpacity={0.85} />
      <Polygon points="648,0 642,0 794,146 794,140" fill={goldStroke} />

      {/* bottom-left corner */}
      <Polygon points="0,1123 0,990 124,1123" fill={`url(#${navy})`} />
      <Polygon points="0,990 0,976 137,1123 124,1123" fill={goldStroke} />
      <Polygon points="0,976 0,948 163,1123 137,1123" fill={`url(#${royalId})`} fillOpacity={0.88} />
      <Polygon points="0,948 0,942 168,1123 163,1123" fill={goldStroke} />

      {/* bottom-right corner, light, so the skyline reads */}
      <Polygon points="794,1123 794,1010 690,1123" fill={`url(#${navy})`} />
      <Polygon points="794,1010 794,996 676,1123 690,1123" fill={goldStroke} />

      {/* skyline and gears, faint, bottom right — the template's motif */}
      <G opacity={0.7} transform="translate(612 972) scale(0.9)">
        <Path
          d="M0 100 V70 H16 V52 H28 V100 Z M30 100 V40 H44 V100 Z M46 100 V12 H54 V0 H58 V12 H66 V100 Z M68 100 V50 H86 V100 Z M88 100 V26 H100 V100 Z M102 100 V60 H122 V100 Z M124 100 V38 H136 V100 Z"
          fill="#DCE6F7" stroke="#B5C6E6" strokeWidth={1.1}
        />
        <Circle cx={168} cy={54} r={24} fill="none" stroke="#B5C6E6" strokeWidth={5} strokeDasharray="7 5" />
        <Circle cx={168} cy={54} r={12} fill="none" stroke="#B5C6E6" strokeWidth={1.1} />
      </G>
    </Svg>
  );
}

/** A 2px gold rule that fades: 'in' (transparent → gold), 'out' (gold → transparent), 'both'. */
function FadeRule({ width, height, fade, color = GOLD }: { width: number; height: number; fade: 'in' | 'out' | 'both'; color?: string }) {
  const id = useSvgId('fr');
  const stops = fade === 'in'
    ? [[0, 0], [1, 1]]
    : fade === 'out' ? [[0, 1], [1, 0]] : [[0, 0], [0.5, 1], [1, 0]];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {stops.map(([o, a]) => <Stop key={o} offset={String(o)} stopColor={color} stopOpacity={a} />)}
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ furniture */

function Rules({ children }: { children: React.ReactNode }) {
  return (
    <View style={f.rules}>
      <View style={f.rule} />
      <View style={{ flexShrink: 1 }}>{children}</View>
      <View style={f.rule} />
    </View>
  );
}

function FactRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[f.fact, !last && f.factDivider]}>
      <Icon name={icon} size={18} color={NAVY_MID} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={f.factLabel}>{label}</Text>
        <Text style={f.factValue} selectable>{value}</Text>
      </View>
    </View>
  );
}

/**
 * ONE TEMPLATE FOR EVERYONE. The sheet is laid out at a fixed design width and
 * then scaled as a picture to whatever width the phone gives it. Laid out at
 * the phone's own width instead, the text re-wrapped and the logo, seal and
 * rules landed in different places on every device — two members comparing
 * certificates saw two different documents.
 */
const SHEET_W = 360;

function Paper({ children }: { children: React.ReactNode }) {
  const { w, h, onLayout } = usePaperSize();
  const [avail, setAvail] = useState(0);
  const scale = avail > 0 ? avail / SHEET_W : 1;
  return (
    <View
      style={[f.paperShadow, avail > 0 && h > 0 ? { height: Math.round(h * scale) } : null]}
      onLayout={(e: LayoutChangeEvent) => {
        const next = Math.round(Number(e?.nativeEvent?.layout?.width || 0));
        if (next > 0 && next !== avail) setAvail(next);
      }}
    >
      <View style={[f.paper, { width: SHEET_W, transformOrigin: 'top left', transform: [{ scale }] }]} onLayout={onLayout}>
        <MembershipFrame w={w} h={h} />
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ membership */

export function MembershipCertificateView({ cert }: { cert: any }) {
  const member = cert?.member || {};
  const company = String(member?.companyName || member?.name || '—');
  const platinum = String(cert?.membershipTier || '') === 'platinum';
  const validTill = platinum
    ? 'Lifetime'
    : cert?.validUntil ? certDate(cert.validUntil) : String(cert?.membershipType || '') === 'lifetime' ? 'Lifetime' : '';

  const keep = (rows: { icon: string; label: string; value: string }[]) => rows.filter((r) => !!r.value);
  const identity = keep([
    { icon: 'business', label: 'Company Name', value: String(member?.companyName || '') },
    { icon: 'badge', label: 'Membership No.', value: String(member?.membershipNumber || '') },
    { icon: 'person-outline', label: 'Representative', value: String(member?.name || '') },
    { icon: 'workspace-premium', label: 'Udyam Registration', value: String(member?.udyamNumber || '') },
    { icon: 'receipt', label: 'GSTIN', value: String(member?.gstNumber || '') },
    { icon: 'work-outline', label: 'Business Sector', value: String(member?.businessSector || '') },
  ]);
  const address = keep(member?.isInternational
    ? [
      { icon: 'place', label: 'Place', value: String(member?.place || '') },
      { icon: 'public', label: 'Country', value: String(member?.country || '') },
    ]
    : [
      { icon: 'place', label: 'Block', value: String(member?.block || '') },
      { icon: 'place', label: 'District', value: String(member?.district || '') },
      { icon: 'place', label: 'State', value: String(member?.state || '') },
    ]);
  const dates = keep([
    { icon: 'event', label: 'Date of Membership', value: certDate(cert?.memberSince || cert?.activatedAt) },
    { icon: 'event-available', label: 'Valid Till', value: validTill },
    { icon: 'verified', label: 'Membership', value: platinum ? 'Platinum Lifetime Member' : '' },
  ]);
  const rows = [...identity, ...address, ...dates];
  const issued = certDate(cert?.issuedAt);

  return (
    <Paper>
      <View style={f.content}>
        <Image source={LOGO} style={f.logo} resizeMode="contain" accessibilityLabel="ACTIV" />
        <Text style={f.assoc}>{ASSOCIATION_NAME.toUpperCase()}</Text>

        <Text style={f.titleBig}>MEMBERSHIP{'\n'}CERTIFICATE</Text>
        <Rules><Text style={f.subGold}>Empowering SC/ST Entrepreneurs</Text></Rules>

        <Text style={f.certify}>This is to certify that</Text>
        <Text style={[f.holder, company.length > 30 && { fontSize: 20, lineHeight: 25 }]} selectable>{company}</Text>
        <View style={f.goldLine} />
        <Text style={f.admitted}>
          has been admitted as {platinum ? 'a Platinum Lifetime Member' : 'an official member'} of
        </Text>
        <Text style={f.activ}>ACTIV</Text>

        {rows.length ? (
          <View style={f.panel}>
            {rows.map((r, i) => <FactRow key={r.label} {...r} last={i === rows.length - 1} />)}
          </View>
        ) : null}

        <Rules><Text style={f.motto}>TOGETHER <Text style={{ color: GOLD }}>•</Text> TRADE <Text style={{ color: GOLD }}>•</Text> GROW</Text></Rules>

        <View style={f.signRow}>
          <View style={f.signCol}>
            <Text style={f.signLabel}>Founder President</Text>
            <Image source={SIGNATURE} style={f.signature} resizeMode="contain" accessibilityLabel="Signature of the Founder President" />
            <View style={f.signLine} />
          </View>
          <View style={f.sealCol}>
            <Seal line="Membership" size={92} />
            <Text style={f.sealCaption}>Official Seal</Text>
          </View>
          <View style={f.signCol}>
            <Text style={f.signLabel}>Date of Issue</Text>
            <View style={f.dateBox}><Text style={f.signDate}>{issued || '—'}</Text></View>
            <View style={f.signLine} />
          </View>
        </View>
      </View>
      <View style={f.footBar}>
        <Text style={f.footText} numberOfLines={1}>
          <Icon name="description" size={13} color={GOLD_LIGHT} />  Certificate No: <Text style={{ fontWeight: '800' }}>{cert?.reference || '—'}</Text>
        </Text>
        <Text style={f.footTextSmall}>Issued by: ACTIV | Chennai, Tamil Nadu · www.activ.org.in</Text>
      </View>
    </Paper>
  );
}

/* ------------------------------------------------------------------ tax exemption (80G) */

/**
 * Type on the A4 page never follows the phone's font-size setting: the page is
 * a document, and a member with large text would otherwise get a different
 * page (re-wrapped lines, a clipped foot) from everyone else.
 */
const T = (props: React.ComponentProps<typeof Text>) => <Text allowFontScaling={false} {...props} />;

/** The website's `font-certificate` (Playfair Display → Georgia → serif); the app bundles no Playfair. */
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });

/**
 * One fixed A4 page, scaled uniformly as a picture. The wrapper holds the exact
 * 794:1123 (1 : 1.4143) aspect at whatever width it is given — `width` when the
 * caller fixes it (the zoom view), otherwise the width its parent offers.
 */
function A4Page({ width, onPress, children }: { width?: number; onPress?: () => void; children: React.ReactNode }) {
  const fixed = typeof width === 'number' && width > 0 ? width : 0;
  const [measured, setMeasured] = useState(0);
  const w = fixed || measured;
  const scale = w > 0 ? w / A4_W : 0;
  const sheet = (
    <View
      style={[f.a4Shadow, fixed ? { width: fixed, height: Math.round((fixed * A4_H) / A4_W) } : f.a4Fluid]}
      onLayout={(e: LayoutChangeEvent) => {
        if (fixed) return;
        const next = Number(e?.nativeEvent?.layout?.width || 0);
        if (next > 0 && Math.abs(next - measured) > 0.5) setMeasured(next);
      }}
    >
      <View style={f.a4Clip}>
        {scale > 0 ? (
          <View style={[f.a4Sheet, { transformOrigin: 'top left', transform: [{ scale }] }]}>
            <TaxFrame />
            {children}
          </View>
        ) : null}
      </View>
    </View>
  );
  if (typeof onPress !== 'function') return sheet;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel="Certificate of Tax Exemption, A4 page"
      accessibilityHint="Opens the certificate full screen, where it can be enlarged"
    >
      {sheet}
    </Pressable>
  );
}

/** A fact in the two-column card — website `Fact`. */
function A4Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={f.a4Fact}>
      <Icon name={icon} size={26} color={NAVY_MID} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={f.a4FactLabel}>{label}</T>
        <T style={f.a4FactValue}>{value}</T>
      </View>
    </View>
  );
}

/**
 * The 80G certificate — website `TaxExemptionCertificate`, element for element,
 * on a true A4 page (794 x 1123, every position, padding and type size ported):
 *
 *   the frame (left wave + gold lines, three corners, skyline)
 *   the mark centred on the title axis · the ribboned medallion top right
 *   CERTIFICATE OF / Tax Exemption / UNDER SECTION 80G · INCOME TAX ACT, 1961
 *   [stamp] · the holder, PAN and eligibility sentence
 *   the card: a two-column fact grid, then the payments table + total + words
 *   the motto between gold rules · the Community seal (no signature, no QR)
 *   the foot: name, address, phone | email | web, gold rule, reference lines
 *
 * THE PAGE NEVER SPILLS. Past two payments the table and the seal tighten
 * (`dense`), past six the rows shrink again (`tight`) — every payment is listed.
 * If the flow still runs past 1123 it is measured and scaled down to fit (never
 * below 0.6), laid out wider by the same factor so the foot stays at the
 * bottom — the website's zoom-to-fit.
 *
 * `onPress` makes the page a button (the screens open the full-screen zoom).
 */
export function TaxCertificateView({ cert, stamp = '', receiptColumn = false, amountInWords = '', width, onPress, hint = '' }: {
  cert: any; stamp?: string; receiptColumn?: boolean; amountInWords?: string;
  width?: number; onPress?: () => void; hint?: string;
}) {
  const member = cert?.member || {};
  const contribution = cert?.contribution || null;
  const listed = asArray<any>(contribution?.payments);
  const payments: any[] = listed.length
    ? listed
    : contribution && (contribution.amount !== null || contribution.receivedOn)
      ? [{ date: contribution.receivedOn, amount: contribution.amount, mode: 'Online', reference: contribution.reference }]
      : [];
  const total = payments.some((p) => typeof p?.amount === 'number')
    ? payments.reduce((sum, p) => sum + (typeof p?.amount === 'number' ? p.amount : 0), 0)
    : (typeof contribution?.amount === 'number' ? contribution.amount : null);
  const issued = certDate(cert?.issuedAt, '-');
  const fy = fullYear(cert?.financialYear || '');
  const name = String(member?.name || '—');
  const pan = String(member?.pan || '');

  const facts = [
    { icon: 'description', label: 'Certificate number', value: String(cert?.reference || '') },
    { icon: 'date-range', label: 'Financial year', value: fy },
    { icon: 'event', label: 'Date of issue', value: issued },
    { icon: 'badge', label: 'Donor PAN', value: pan },
    { icon: 'person-outline', label: 'Donor name', value: String(member?.name || '') },
    { icon: 'currency-rupee', label: 'Total donation amount', value: total === null ? '' : certRupees(total) },
  ].filter((r) => !!r.value);

  const dense = payments.length > 2;
  const tight = payments.length > 6;
  const cellPad = tight ? 1 : dense ? 3 : 6;
  const cellText = tight ? f.a4CellTight : f.a4Cell;
  const cols = receiptColumn
    ? [{ h: 'S.No', flex: 0.62 }, { h: 'Date', flex: 1.15 }, { h: 'Receipt No.', flex: 1.55 }, { h: 'Amount', flex: 1.3 }, { h: 'Mode', flex: 0.95 }]
    : [{ h: 'S.No', flex: 0.7 }, { h: 'Date', flex: 1.2 }, { h: 'Amount', flex: 1.3 }, { h: 'Mode', flex: 1 }];
  const labelFlex = cols.slice(0, receiptColumn ? 3 : 2).reduce((s, c) => s + c.flex, 0);
  const nameSize = name.length > 38 ? 27 : name.length > 26 ? 31 : 39;
  const lastRowStart = facts.length - (facts.length % 2 === 0 ? 2 : 1);

  /* Zoom-to-fit. The flow is laid out at A4_W / fit wide and at least
     A4_H / fit tall, then scaled by fit; when it measures taller than that,
     fit steps down. Reset whenever what is printed changes. */
  const [fit, setFit] = useState(1);
  const tries = useRef(0);
  const signature = [name, pan, facts.length, payments.length, stamp, receiptColumn ? 1 : 0, amountInWords, cert?.reference || ''].join('|');
  useEffect(() => {
    tries.current = 0;
    setFit(1);
  }, [signature]);
  const onFlowLayout = (e: LayoutChangeEvent) => {
    const h = Number(e?.nativeEvent?.layout?.height || 0);
    const limit = A4_H / fit;
    if (h > limit + 1 && fit > 0.6 && tries.current < 4) {
      tries.current += 1;
      setFit(Math.max(0.6, Math.min(fit - 0.005, A4_H / h)));
    }
  };

  const cell = (i: number, flex: number, extra?: object) => [
    f.a4Td, { flex, paddingVertical: cellPad }, i > 0 && f.a4TdLeft, extra,
  ];

  return (
    <View>
      <A4Page width={width} onPress={onPress}>
        <View
          onLayout={onFlowLayout}
          style={[f.a4Flow, { width: A4_W / fit, minHeight: A4_H / fit, transformOrigin: 'top left', transform: [{ scale: fit }] }]}
        >
          {/* ============================== head — the mark on the title axis */}
          <View style={f.a4Header}>
            <Image source={LOGO} style={f.a4Logo} resizeMode="contain" accessibilityLabel={ASSOCIATION_NAME} />
          </View>

          {/* the ribboned medallion, top right */}
          <View style={f.a4Ribbon}>
            <RibbonSeal line="Tax Exemption" />
          </View>

          {/* ============================== title */}
          <View style={f.a4Title}>
            <T style={f.a4CertOf}>CERTIFICATE OF</T>
            <T style={f.a4TitleText}>Tax Exemption</T>
          </View>
          <View style={f.a4Section}>
            <FadeRule width={56} height={2} fade="in" />
            <T style={f.a4SectionText}>UNDER SECTION 80G · INCOME TAX ACT, 1961</T>
            <FadeRule width={56} height={2} fade="out" />
          </View>
          {stamp ? (
            <View style={f.a4Stamp}>
              <T style={f.a4StampText}>{String(stamp).toUpperCase()}</T>
            </View>
          ) : null}

          {/* ============================== holder */}
          <View style={f.a4Holder}>
            <T style={f.a4Certify}>This is to certify that</T>
            <T style={[f.a4Name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.25) }]}>{name}</T>
            {pan ? (
              <View style={f.a4PanRow}>
                <Icon name="person" size={18} color={NAVY_MID} />
                <T style={f.a4Pan}>PAN No: <T style={{ fontWeight: '700' }}>{pan}</T></T>
              </View>
            ) : null}
            <T style={f.a4Eligible}>
              has contributed to the {ASSOCIATION_NAME} (ACTIV), and the contribution is eligible for
              exemption under Section 80G of the Income Tax Act, 1961.
            </T>
          </View>

          {/* ============================== the card */}
          {facts.length || payments.length ? (
            <View style={f.a4Card}>
              {facts.length ? (
                <View style={f.a4Grid}>
                  {facts.map((r, i) => (
                    <View
                      key={r.label}
                      style={[
                        f.a4GridCell,
                        { paddingVertical: dense ? 6 : 8 },
                        i % 2 === 0 ? f.a4GridLeft : f.a4GridRight,
                        i < lastRowStart && f.a4GridBottom,
                      ]}
                    >
                      <A4Fact icon={r.icon} label={r.label} value={r.value} />
                    </View>
                  ))}
                </View>
              ) : null}

              {payments.length ? (
                <View style={f.a4Payments}>
                  <View style={f.a4PayHead}>
                    <Icon name="link" size={22} color={NAVY_MID} />
                    <T style={f.a4PayHeadText}>Payment details</T>
                  </View>
                  <View style={f.a4Table}>
                    <View style={[f.a4Tr, f.a4Thead]}>
                      {cols.map((c, i) => (
                        <View key={c.h} style={cell(i, c.flex, f.a4ThBorder)}>
                          <T style={[cellText, { fontWeight: '700' }]}>{c.h}</T>
                        </View>
                      ))}
                    </View>
                    {payments.map((p, idx) => {
                      const values = [
                        String(idx + 1),
                        certDate(p?.date, '-') || '—',
                        ...(receiptColumn ? [String(p?.reference || '') || '—'] : []),
                        certRupees(typeof p?.amount === 'number' ? p.amount : null),
                        String(p?.mode || '') || 'Online',
                      ];
                      const amountAt = receiptColumn ? 3 : 2;
                      return (
                        <View key={`${p?.reference || ''}-${idx}`} style={[f.a4Tr, f.a4TrTop]}>
                          {values.map((v, i) => (
                            <View key={cols[i]?.h || i} style={cell(i, cols[i]?.flex || 1, receiptColumn && i === 2 ? f.a4TdNarrow : undefined)}>
                              <T style={[cellText, i === amountAt && { fontWeight: '600' }]}>{v}</T>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                    {payments.length > 1 && total !== null ? (
                      <View style={[f.a4Tr, f.a4TotalRow]}>
                        <View style={[f.a4Td, { flex: labelFlex, paddingVertical: cellPad, alignItems: 'flex-end' }]}>
                          <T style={[cellText, { fontWeight: '700' }]}>Total</T>
                        </View>
                        <View style={[f.a4Td, f.a4TdLeft, f.a4ThBorder, { flex: cols[receiptColumn ? 3 : 2]?.flex || 1, paddingVertical: cellPad }]}>
                          <T style={[cellText, { fontWeight: '800' }]}>{certRupees(total)}</T>
                        </View>
                        <View style={[f.a4Td, f.a4TdLeft, f.a4ThBorder, { flex: cols[cols.length - 1]?.flex || 1 }]} />
                      </View>
                    ) : null}
                  </View>
                  {amountInWords ? <T style={f.a4Words}>{amountInWords}</T> : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* the motto */}
          <View style={f.a4Motto}>
            <View style={f.a4MottoRule} />
            <T style={f.a4MottoText}>
              Your support empowers communities and creates{'\n'}opportunities for a better tomorrow.
            </T>
            <View style={f.a4MottoRule} />
          </View>

          {/* the seal — no signatures on this certificate */}
          <View style={f.a4Seal}>
            <Seal line="Community" size={dense ? 88 : 102} />
          </View>

          {/* ============================== foot, pinned to the bottom */}
          <View style={{ flexGrow: 1 }} />
          <View style={f.a4Foot}>
            <T style={f.a4FootName}>{ASSOCIATION_NAME.toUpperCase()}</T>
            <View style={f.a4Address}>
              <Icon name="place" size={16} color={NAVY_MID} style={{ marginTop: 1 }} />
              <T style={f.a4AddressText}>{ADDRESS}</T>
            </View>
            <View style={f.a4Contact}>
              <View style={f.a4ContactItem}><Icon name="phone" size={16} color={NAVY_MID} /><T style={f.a4ContactText} numberOfLines={1}>{PHONE}</T></View>
              <T style={[f.a4ContactText, f.a4Pipe]}>|</T>
              <View style={f.a4ContactItem}><Icon name="mail-outline" size={16} color={NAVY_MID} /><T style={f.a4ContactText} numberOfLines={1}>{EMAIL}</T></View>
              <T style={[f.a4ContactText, f.a4Pipe]}>|</T>
              <View style={f.a4ContactItem}><Icon name="language" size={16} color={NAVY_MID} /><T style={f.a4ContactText} numberOfLines={1}>{WEB}</T></View>
            </View>
            <View style={f.a4FootRule}>
              <FadeRule width={494} height={1} fade="both" color={GOLD_LIGHT} />
            </View>
            <View style={f.a4Ref}>
              <T style={f.a4RefText}>Certificate No: <T style={{ fontWeight: '700', letterSpacing: 0.23 }}>{cert?.reference || '—'}</T></T>
              <T style={f.a4RefText}>
                Issue Date: <T style={{ fontWeight: '700' }}>{issued || '—'}</T>
                {fy ? <T><T style={{ opacity: 0.4 }}>{'   |   '}</T>Valid for Financial Year: <T style={{ fontWeight: '700' }}>{fy}</T></T> : null}
              </T>
            </View>
          </View>
        </View>
      </A4Page>
      {hint ? (
        <View style={f.a4Hint}>
          <Icon name="zoom-in" size={16} color={MUTED} />
          <Text style={f.a4HintText}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ styles */

const f = StyleSheet.create({
  // Shadow on the wrapper, clipping on the sheet — iOS drops a shadow on a clipped view.
  paperShadow: { borderRadius: RADIUS.xs, backgroundColor: PAPER, ...SHADOW.lifted, shadowColor: '#0B1A45', shadowOpacity: 0.2 },
  paper: { backgroundColor: PAPER, borderRadius: RADIUS.xs, overflow: 'hidden' },
  content: { paddingHorizontal: 26, paddingTop: 34, paddingBottom: 22, alignItems: 'center' },

  logo: { width: 132, height: 41 },
  assoc: { fontSize: 9.5, fontWeight: '800', color: NAVY_MID, textAlign: 'center', marginTop: 4, letterSpacing: 1, lineHeight: 13 },
  titleBig: { fontSize: 25, fontWeight: '900', color: NAVY, textAlign: 'center', marginTop: 14, letterSpacing: 1, lineHeight: 29 },
  rules: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, alignSelf: 'stretch', justifyContent: 'center' },
  rule: { flex: 1, maxWidth: 40, height: 1.5, backgroundColor: GOLD },
  subGold: { fontSize: 12, fontWeight: '800', color: GOLD_DEEP, textAlign: 'center' },
  certify: { fontSize: 13, fontStyle: 'italic', color: INK, marginTop: 16 },
  holder: { fontSize: 23, lineHeight: 28, fontWeight: '900', color: NAVY, textAlign: 'center', marginTop: 4 },
  goldLine: { width: '70%', height: 1.5, backgroundColor: GOLD, marginTop: 6, opacity: 0.8 },
  admitted: { fontSize: 13, color: INK, marginTop: 6, textAlign: 'center' },
  activ: { fontSize: 16, fontWeight: '900', color: NAVY, marginTop: 1 },

  panel: { alignSelf: 'stretch', marginTop: 16, borderWidth: 1, borderColor: PANEL_LINE, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, paddingVertical: 4 },
  fact: { flexDirection: 'row', gap: 10, paddingVertical: 9 },
  factDivider: { borderBottomWidth: 1, borderBottomColor: LINE },
  factDividerTop: { borderTopWidth: 1, borderTopColor: LINE },
  factLabel: { fontSize: 11, fontWeight: '600', color: MUTED },
  factValue: { fontSize: 14, fontWeight: '800', color: INK, marginTop: 1 },

  motto: { fontSize: 10.5, fontWeight: '800', color: NAVY_MID, letterSpacing: 2.2, textAlign: 'center' },

  signRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 16, gap: 6 },
  signCol: { flex: 1, minWidth: 0, alignItems: 'center' },
  sealCol: { alignItems: 'center' },
  signature: { width: '100%', height: 40, marginTop: 2, tintColor: NAVY_MID },
  dateBox: { height: 40, justifyContent: 'flex-end', paddingBottom: 3, marginTop: 2 },
  signDate: { fontSize: 14, fontWeight: '800', color: NAVY_MID },
  signLine: { alignSelf: 'stretch', height: 1, backgroundColor: NAVY_MID, opacity: 0.7, marginBottom: 22 },
  signLabel: { fontSize: 11, fontWeight: '800', color: NAVY, textAlign: 'center' },
  sealCaption: { fontSize: 10.5, fontWeight: '700', color: NAVY, marginTop: 2 },

  footBar: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 3, borderTopColor: GOLD },
  footText: { color: '#FFFFFF', fontSize: 12 },
  footTextSmall: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, marginTop: 3 },

  /* ---------------- the A4 tax page — website units (794 x 1123), ported 1:1 */
  a4Shadow: { borderRadius: 2, backgroundColor: PAPER, ...SHADOW.lifted, shadowColor: '#0B1A45', shadowOpacity: 0.2 },
  a4Fluid: { width: '100%', aspectRatio: A4_W / A4_H },
  a4Clip: { ...StyleSheet.absoluteFillObject, borderRadius: 2, overflow: 'hidden' },
  a4Sheet: { position: 'absolute', left: 0, top: 0, width: A4_W, height: A4_H, backgroundColor: PAPER, overflow: 'hidden' },
  a4Flow: { position: 'absolute', left: 0, top: 0, flexDirection: 'column' },

  a4Header: { paddingLeft: 120, paddingRight: 150, paddingTop: 38, alignItems: 'center' },
  a4Logo: { height: 74, width: Math.round((74 * 899) / 277) },
  a4Ribbon: { position: 'absolute', right: 22, top: 132, zIndex: 10 },

  a4Title: { marginTop: 16, paddingLeft: 120, paddingRight: 150, alignItems: 'center' },
  a4CertOf: { fontSize: 24, lineHeight: 36, fontWeight: '500', letterSpacing: 8.64, color: NAVY, textAlign: 'center' },
  a4TitleText: { fontFamily: SERIF, fontSize: 64, lineHeight: 65, fontWeight: '700', color: NAVY, textAlign: 'center' },
  a4Section: { marginTop: 8, paddingLeft: 60, paddingRight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  a4SectionText: { fontSize: 13.5, lineHeight: 20, fontWeight: '700', letterSpacing: 3.24, color: NAVY, textAlign: 'center', flexShrink: 1 },
  a4Stamp: { alignSelf: 'center', maxWidth: 640, marginTop: 8, borderWidth: 1, borderColor: '#F3C98B', backgroundColor: '#FFF7E8', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 4 },
  a4StampText: { fontSize: 12.5, lineHeight: 19, fontWeight: '700', letterSpacing: 1.5, color: '#92400E', textAlign: 'center' },

  a4Holder: { marginTop: 14, paddingLeft: 110, paddingRight: 70, alignItems: 'center' },
  a4Certify: { fontSize: 17, lineHeight: 26, letterSpacing: 0.43, color: INK, textAlign: 'center' },
  a4Name: { marginTop: 4, maxWidth: 540, fontFamily: SERIF, fontWeight: '700', color: NAVY, textAlign: 'center' },
  a4PanRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  a4Pan: { fontSize: 16, lineHeight: 24, color: INK },
  a4Eligible: { marginTop: 8, maxWidth: 500, fontSize: 15.5, lineHeight: 24, color: INK, textAlign: 'center' },

  a4Card: {
    marginHorizontal: 88, marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: PANEL_LINE,
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingBottom: 14, paddingTop: 4,
    boxShadow: '0px 8px 26px -16px rgba(14,31,77,0.38)',
  },
  a4Grid: { flexDirection: 'row', flexWrap: 'wrap' },
  a4GridCell: { width: '50%', borderColor: LINE },
  a4GridLeft: { borderRightWidth: 1, paddingRight: 20 },
  a4GridRight: { paddingLeft: 28 },
  a4GridBottom: { borderBottomWidth: 1 },
  a4Fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minWidth: 0 },
  a4FactLabel: { fontSize: 13, lineHeight: 16, fontWeight: '500', color: MUTED },
  a4FactValue: { marginTop: 2, fontSize: 15.5, lineHeight: 21, fontWeight: '700', color: INK },

  a4Payments: { marginTop: 2, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  a4PayHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  a4PayHeadText: { fontSize: 14.5, lineHeight: 22, fontWeight: '700', color: INK },
  a4Table: { borderWidth: 1, borderColor: PANEL_LINE, borderRadius: 8, overflow: 'hidden' },
  a4Tr: { flexDirection: 'row', alignItems: 'stretch' },
  a4Thead: { backgroundColor: '#E6EDFA' },
  a4TrTop: { borderTopWidth: 1, borderTopColor: LINE },
  a4TotalRow: { backgroundColor: '#F3F6FC', borderTopWidth: 1, borderTopColor: PANEL_LINE },
  a4Td: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', minWidth: 0 },
  a4TdNarrow: { paddingHorizontal: 8 },
  a4TdLeft: { borderLeftWidth: 1, borderLeftColor: LINE },
  a4ThBorder: { borderLeftColor: PANEL_LINE },
  a4Cell: { fontSize: 14, lineHeight: 21, color: INK, textAlign: 'center' },
  a4CellTight: { fontSize: 12, lineHeight: 18, color: INK, textAlign: 'center' },
  a4Words: { marginTop: 6, fontSize: 13, lineHeight: 20, fontWeight: '600', fontStyle: 'italic', color: INK, textAlign: 'center' },

  a4Motto: { marginTop: 12, paddingHorizontal: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  a4MottoRule: { width: 70, height: 1.5, backgroundColor: GOLD },
  a4MottoText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic', color: NAVY_SOFT, textAlign: 'center', flexShrink: 1 },
  a4Seal: { marginTop: 6, alignItems: 'center' },

  a4Foot: { paddingHorizontal: 150, paddingBottom: 22, alignItems: 'center' },
  a4FootName: { fontSize: 14, lineHeight: 19, fontWeight: '800', letterSpacing: 0.56, color: NAVY, textAlign: 'center' },
  a4Address: { marginTop: 6, maxWidth: 360, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8 },
  a4AddressText: { flexShrink: 1, fontSize: 12.5, lineHeight: 17, color: INK, textAlign: 'center' },
  a4Contact: { marginTop: 8, marginHorizontal: -40, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  a4ContactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  a4ContactText: { fontSize: 12.5, lineHeight: 19, color: INK },
  a4Pipe: { opacity: 0.4 },
  a4FootRule: { marginTop: 12, alignSelf: 'stretch', alignItems: 'center' },
  a4Ref: { marginTop: 8, maxWidth: 520, alignItems: 'center' },
  a4RefText: { fontSize: 11.5, lineHeight: 18, color: INK, textAlign: 'center' },

  a4Hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  a4HintText: { fontSize: 12, color: MUTED },
});
