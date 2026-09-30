import { Tone } from '../tokens';

/**
 * ============================================================================
 * PREMIUM LAYER — tokens
 * ============================================================================
 *
 * The brand surfaces (sign-in, registration, and — once approved — every
 * screen's header) are painted from here. Kept beside the base tokens rather
 * than inside them so the base kit's values do not move under the screens that
 * are not redesigned yet.
 *
 * Member: logo navy #1C2E68 into the website's navy→blue (#1E3A8A → #2563EB).
 * Admin:  the kit's indigo, deepened at the top so white type holds contrast.
 * Business: violet — the website's Business Account card (#4C1D95 → #8B5CF6).
 *         The text-bearing end stops at #7C3AED (white 5.7:1, AA); #8B5CF6
 *         (4.2:1) is only a glow / fill. Scoped to screens/business.
 * Never purple on the member side.
 */

export const BRAND = {
  navy: '#1C2E68',
  navyDeep: '#0B1A45',
  blue900: '#1E3A8A',
  blue: '#2563EB',
  blueLight: '#60A5FA',
  indigoDeep: '#1B1646',
  indigo: '#5440D4',
  indigoDark: '#3B2DB0',
  indigoLight: '#A5B4FC',
  /** Soft filled input background. */
  inputFill: '#F3F6FB',
  inputFillAdmin: '#F5F5FC',
  errorFill: '#FEF2F2',
  white: '#FFFFFF',
  /** Translucent whites for glass elements sitting on the gradient. */
  glass: 'rgba(255,255,255,0.14)',
  glassStrong: 'rgba(255,255,255,0.22)',
  glassBorder: 'rgba(255,255,255,0.28)',
  onBrandSoft: 'rgba(255,255,255,0.80)',
  onBrandFaint: 'rgba(255,255,255,0.62)',
  shadowNavy: '#0B1A45',
  violetDeep: '#2E1065',
  violet900: '#4C1D95',
  violet: '#7C3AED',
  violetLight: '#8B5CF6',
  violetGlow: '#A78BFA',
};

export const PREMIUM_GRADIENTS = {
  memberHeader: [BRAND.navyDeep, BRAND.navy, BRAND.blue900, BRAND.blue],
  memberButton: [BRAND.blue900, BRAND.blue],
  adminHeader: [BRAND.indigoDeep, '#2A2178', BRAND.indigoDark, BRAND.indigo],
  adminButton: [BRAND.indigoDark, BRAND.indigo],
  businessHeader: [BRAND.violetDeep, BRAND.violet900, '#6D28D9', BRAND.violet],
  businessButton: [BRAND.violet900, BRAND.violet],
};

/** Everything premium that changes with the tone, in one lookup. */
export const premiumTone = (tone: Tone = 'member') => {
  const admin = tone === 'admin';
  if (tone === 'business') {
    return {
      header: PREMIUM_GRADIENTS.businessHeader,
      button: PREMIUM_GRADIENTS.businessButton,
      top: BRAND.violetDeep,
      accent: BRAND.violet,
      accentDark: '#5B21B6',
      accentSoft: '#EDE9FE',
      /** A second soft stop (initials tiles, tinted rows). */
      accentSoft2: '#E4DCFB',
      glow: BRAND.violetGlow,
      inputFill: '#F7F5FD',
      shadow: BRAND.violetDeep,
    };
  }
  return {
    header: admin ? PREMIUM_GRADIENTS.adminHeader : PREMIUM_GRADIENTS.memberHeader,
    button: admin ? PREMIUM_GRADIENTS.adminButton : PREMIUM_GRADIENTS.memberButton,
    /** Solid colour at the very top — the Android status bar. */
    top: admin ? BRAND.indigoDeep : BRAND.navyDeep,
    accent: admin ? BRAND.indigo : BRAND.blue,
    accentDark: admin ? BRAND.indigoDark : BRAND.blue900,
    accentSoft: admin ? '#EEF2FF' : '#EAF1FE',
    accentSoft2: '#DCE8FD',
    glow: admin ? BRAND.indigoLight : BRAND.blueLight,
    inputFill: admin ? BRAND.inputFillAdmin : BRAND.inputFill,
    shadow: admin ? BRAND.indigoDeep : BRAND.shadowNavy,
  };
};

/** Premium type — bigger, tighter headings for the brand header. */
export const PREMIUM_TYPE = {
  hero: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.8 },
  heroMd: { fontSize: 26, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.6 },
  lead: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const },
};

/** Radii specific to the premium surfaces. */
export const PREMIUM_RADIUS = { input: 14, sheet: 28, section: 24 };
