/**
 * ============================================================================
 * THE ACTIV MOBILE DESIGN KIT — tokens
 * ============================================================================
 *
 * Every screen is built from `src/ui` so the app reads as one product.
 * Two tones, matching the screens that already exist:
 *
 *   'member'  the member / payment side — ACTIV blue, navy→blue
 *             gradient hero (PaidDashboard, LoginScreen, Onboarding).
 *             NEVER purple on the member side.
 *   'business' the business area (Business Dashboard, companies, catalogue,
 *             discover, trust list…) — violet, matching the website's Business
 *             Account card (#4C1D95 → #8B5CF6). The user chose it; it is scoped
 *             to screens/business and never leaks into the member screens.
 *   'admin'   every admin tier + Super Admin — #FAFAFA canvas, indigo accent,
 *             white rounded cards (superTheme / tier dashboards).
 *
 * Never hard-code a colour, size or radius in a screen: pick it from here.
 * The older `src/theme/theme.ts` (COLORS / SPACING / …) is aligned to these
 * values, so old and new screens render as one app.
 *
 * Grid: everything sits on a 4-pt grid (SPACE, RADIUS, control heights).
 */

export type Tone = 'member' | 'admin' | 'business';

export const PALETTE = {
  // ACTIV blue (member side). #2563EB carries white text at 5.2:1 (AA).
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueDeep: '#0E1F4D',
  blueSoft: '#EAF1FE',
  blueTint: '#F5F8FF',
  // Admin indigo (matches superTheme ACCENTS.purple) — admin tone ONLY.
  indigo: '#5440D4',
  indigoDark: '#3B2DB0',
  indigoSoft: '#EEF2FF',
  indigoTint: '#F7F7FF',
  // Business violet — business tone ONLY. #7C3AED carries white text at 5.7:1
  // (AA); #8B5CF6 (4.2:1) is kept for fills that carry no text.
  violet: '#7C3AED',
  violetDark: '#6D28D9',
  violetDeep: '#4C1D95',
  violetLight: '#8B5CF6',
  violetSoft: '#EDE9FE',
  violetTint: '#F7F5FF',
  violetBorder: '#E4DCFB',
  // Status — base (icons, fills), Dark (text on the Soft background), Soft (chips, banners)
  green: '#059669',
  greenDark: '#047857',
  greenSoft: '#D1FAE5',
  amber: '#F59E0B',
  amberDark: '#B45309',
  amberSoft: '#FEF3C7',
  red: '#DC2626',
  redDark: '#B91C1C',
  redSoft: '#FEE2E2',
  sky: '#0284C7',
  skyDark: '#075985',
  skySoft: '#E0F2FE',
  gold: '#C9A227',
  goldDark: '#8A6A12',
  goldSoft: '#FBF3DC',
  // Neutrals
  canvas: '#F4F7FB',
  canvasAdmin: '#FAFAFA',
  card: '#FFFFFF',
  border: '#E5EAF1',
  borderStrong: '#CBD5E1',
  divider: '#EEF2F6',
  field: '#F1F5F9',
  fieldBg: '#F8FAFC',
  disabled: '#E2E8F0',
  text: '#0F172A',
  textSoft: '#334155',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15,23,42,0.45)',

  // ---- Semantic aliases (prefer these in new code) -------------------------
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EAF1FE',
  surface: '#FFFFFF',
  background: '#F4F7FB',
  success: '#059669',
  successText: '#047857',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningText: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerText: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#0284C7',
  infoText: '#075985',
  infoSoft: '#E0F2FE',
};

/** Gradient stops for hero headers and solid buttons. */
export const GRADIENTS = {
  member: ['#0E1F4D', '#1C3F95', '#2563EB'],
  memberButton: ['#2563EB', '#1D4ED8'],
  admin: ['#3B2DB0', '#5440D4', '#7C6CF0'],
  adminButton: ['#5440D4', '#3B2DB0'],
  business: ['#2E1065', '#4C1D95', '#7C3AED'],
  businessButton: ['#7C3AED', '#6D28D9'],
  gold: ['#8A6A12', '#C9A227', '#E7C766'],
  success: ['#047857', '#10B981'],
  danger: ['#DC2626', '#B91C1C'],
  platinum: ['#1F2937', '#4B5563', '#9CA3AF'],
};

/** Everything that changes with the tone, in one lookup. */
export const toneOf = (tone: Tone = 'member') => {
  const admin = tone === 'admin';
  if (tone === 'business') {
    return {
      accent: PALETTE.violet,
      accentDark: PALETTE.violetDark,
      accentSoft: PALETTE.violetSoft,
      accentTint: PALETTE.violetTint,
      canvas: PALETTE.canvas,
      gradient: GRADIENTS.business,
      button: GRADIENTS.businessButton,
    };
  }
  return {
    accent: admin ? PALETTE.indigo : PALETTE.blue,
    accentDark: admin ? PALETTE.indigoDark : PALETTE.blueDark,
    accentSoft: admin ? PALETTE.indigoSoft : PALETTE.blueSoft,
    accentTint: admin ? PALETTE.indigoTint : PALETTE.blueTint,
    canvas: admin ? PALETTE.canvasAdmin : PALETTE.canvas,
    gradient: admin ? GRADIENTS.admin : GRADIENTS.member,
    button: admin ? GRADIENTS.adminButton : GRADIENTS.memberButton,
  };
};

/** Corner radii on the 4-pt grid. Cards = lg, heroes/sheets = xl, fields/buttons-in-cards = md. */
export const RADIUS = { xs: 6, sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

/**
 * Spacing on the 4-pt grid. Screen gutter = lg (16). Gap between cards = md (12).
 * Card padding = lg (16). Gap between sections = xl/xxl (20/28).
 */
export const SPACE = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36, huge: 48 };

/** Fixed control sizes (4-pt grid, >= 44 touch targets). */
export const SIZE = {
  touch: 44,          // minimum hit area for anything tappable
  control: 48,        // buttons, fields, segmented track
  controlSm: 40,
  controlLg: 54,
  row: 56,            // ListRow / ToggleRow minimum height
  header: 56,         // AppHeader bar height
  iconChip: 40,       // tinted square behind a row / stat icon
  icon: 20,
  iconSm: 16,
  iconLg: 24,
};

/**
 * Elevation. Each level pairs an iOS shadow with an Android `elevation`; always
 * combine with a 1px PALETTE.border so cards still read on low-end Android
 * where elevation is flat. Never put a shadow and `overflow: 'hidden'` on the
 * same view (iOS clips the shadow) — wrap instead.
 */
export const SHADOW = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lifted: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Upward shadow for a sticky footer (BottomActionBar). */
  top: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
};

/**
 * Type scale. Weights: 800 display only, 700 titles/headings, 600 labels,
 * 400/500 body. Every style carries a lineHeight so rows align.
 */
export const TYPE = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.6, color: PALETTE.text },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3, color: PALETTE.text },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.1, color: PALETTE.text },
  subheading: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const, color: PALETTE.text },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, color: PALETTE.textSoft },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, color: PALETTE.text },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, color: PALETTE.textSoft },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, color: PALETTE.textMuted },
  small: { fontSize: 12, lineHeight: 17, color: PALETTE.textMuted },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1, color: PALETTE.textMuted, textTransform: 'uppercase' as const },
  /** Big numbers (stats, amounts) — tabular so columns line up. */
  number: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.4, color: PALETTE.text, fontVariant: ['tabular-nums' as const] },
};

type ToneColors = { fg: string; bg: string };
const OK: ToneColors = { fg: PALETTE.greenDark, bg: PALETTE.greenSoft };
const WAIT: ToneColors = { fg: PALETTE.amberDark, bg: PALETTE.amberSoft };
const BAD: ToneColors = { fg: PALETTE.redDark, bg: PALETTE.redSoft };
const INFO: ToneColors = { fg: PALETTE.blueDark, bg: PALETTE.blueSoft };
const NEUTRAL: ToneColors = { fg: '#475569', bg: '#EEF2F6' };

/** Status → colours, for Badge. Server status strings, case-insensitive. */
export const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  active: OK,
  paid: OK,
  approved: OK,
  completed: OK,
  published: OK,
  confirmed: OK,
  verified: OK,
  trusted: OK,
  success: OK,
  converted: OK,
  pending: WAIT,
  unpaid: WAIT,
  not_paid: WAIT,
  'pending-block': WAIT,
  'pending-district': WAIT,
  'pending-state': WAIT,
  awaiting_payment: WAIT,
  awaiting: WAIT,
  expiring: WAIT,
  processing: WAIT,
  under_review: WAIT,
  in_review: WAIT,
  contacted: WAIT,
  submitted: INFO,
  new: INFO,
  upcoming: INFO,
  ongoing: INFO,
  open: INFO,
  info: INFO,
  draft: NEUTRAL,
  unverified: NEUTRAL,
  inactive: NEUTRAL,
  closed: NEUTRAL,
  past: NEUTRAL,
  archived: NEUTRAL,
  refunded: NEUTRAL,
  expired: BAD,
  rejected: BAD,
  failed: BAD,
  cancelled: BAD,
  canceled: BAD,
  blocked: BAD,
  declined: BAD,
  platinum: { fg: '#F9FAFB', bg: '#374151' },
};

/**
 * Colours for any status spelling: 'Pending-Block', 'pending_block_approval',
 * 'Approved', 'awaiting payment' … Exact key first, then a family match, then
 * a neutral grey. Never throws.
 */
export const statusTone = (status?: string | null) => {
  const raw = String(status || '').trim().toLowerCase();
  if (STATUS_TONE[raw]) return STATUS_TONE[raw];
  const snake = raw.replace(/[\s-]+/g, '_');
  if (STATUS_TONE[snake]) return STATUS_TONE[snake];
  // Order matters: 'pending_block_approval' is a pending state, not a block.
  if (/reject|fail|cancel|declin|expired|^blocked$/.test(raw)) return BAD;
  if (/pending|await|review|process|expiring/.test(raw)) return WAIT;
  if (/approv|paid|active|complete|confirm|verif|success/.test(raw)) return OK;
  return { fg: PALETTE.textSoft, bg: '#EEF2F6' };
};
