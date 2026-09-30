import { StyleSheet } from 'react-native';
import { PALETTE, RADIUS, SPACE, SHADOW, TYPE, SIZE } from '../../../ui';

/**
 * The super admin console uses the same visual language as the Block, District
 * and State dashboards — same canvas, same indigo accent, same card geometry —
 * so an admin moving between tiers never has to relearn the screen.
 *
 * Every value here now comes from the design kit (`src/ui` tokens). This file
 * survives as a thin alias layer so the older Super screens keep their style
 * names; new code should import PALETTE / SPACE / RADIUS / TYPE from `src/ui`
 * directly. Never put a hex literal back in here.
 */
export const ACCENTS = {
  purple: PALETTE.indigo,
  lightPurple: PALETTE.indigoSoft,
  orange: PALETTE.warning,
  lightOrange: PALETTE.warningSoft,
  green: PALETTE.success,
  lightGreen: PALETTE.successSoft,
  red: PALETTE.danger,
  lightRed: PALETTE.dangerSoft,
};

export const SUPER = {
  bg: PALETTE.canvasAdmin,
  card: PALETTE.card,
  border: PALETTE.divider,
  borderStrong: PALETTE.border,
  pillBorder: PALETTE.borderStrong,
  field: PALETTE.field,

  text: PALETTE.text,
  textMuted: PALETTE.textMuted,
  textFaint: PALETTE.textFaint,

  accent: ACCENTS.purple,
  accentSoft: ACCENTS.lightPurple,
  success: ACCENTS.green,
  successSoft: ACCENTS.lightGreen,
  danger: ACCENTS.red,
  dangerSoft: ACCENTS.lightRed,
  warning: ACCENTS.orange,
  warningSoft: ACCENTS.lightOrange,
};

/** Matches the greeting on the tier dashboards. */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) return 'Good Night 🌙';
  if (hour < 12) return 'Good Morning ☀️';
  if (hour < 17) return 'Good Afternoon ☀️';
  return 'Good Evening 🌇';
};

/** Initials for an avatar chip, safe against null/undefined names. */
export const getInitials = (name?: string | null): string => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').charAt(0).toUpperCase() || '?';
  return `${(parts[0] || '').charAt(0)}${(parts[parts.length - 1] || '').charAt(0)}`.toUpperCase();
};

/** `12 Mar 2026`, matching the tier dashboards' date format. */
export const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** The kit's card: white, 1px border, soft shadow, RADIUS.lg. */
const CARD = {
  backgroundColor: PALETTE.card,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: PALETTE.border,
  ...SHADOW.card,
};

export const superStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUPER.bg },
  scrollContent: { padding: SPACE.lg, paddingBottom: SPACE.huge },
  listContent: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xs, paddingBottom: SPACE.huge },

  // --- Dashboard header: greeting + name + avatar (Hub entry level) ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.lg,
    backgroundColor: SUPER.bg,
  },
  headerLeft: { flex: 1, minWidth: 0, paddingRight: SPACE.md },
  welcomeText: { ...TYPE.eyebrow, color: SUPER.accent, marginBottom: SPACE.xs },
  headerTitle: { ...TYPE.display, marginBottom: SPACE.xxs },
  headerSubtitle: { ...TYPE.caption, fontSize: 13, lineHeight: 18 },
  headerRight: { alignItems: 'center', justifyContent: 'center' },
  avatarSmall: {
    width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, backgroundColor: SUPER.accent,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarSmallText: { color: PALETTE.white, fontWeight: '700', fontSize: 15 },

  // --- Page header: back + title + action (every other screen) ---
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    minHeight: SIZE.header + SPACE.sm,
    backgroundColor: SUPER.bg,
  },
  backBtn: {
    width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border,
  },
  pageTitle: { ...TYPE.title },
  pageSubtitle: { ...TYPE.caption, fontSize: 13, lineHeight: 18, marginTop: 1 },
  actionBtn: {
    backgroundColor: SUPER.accent,
    paddingHorizontal: SPACE.lg,
    minHeight: SIZE.controlSm,
    borderRadius: RADIUS.pill,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.sm - 2,
  },
  actionBtnText: { color: PALETTE.white, fontWeight: '700', fontSize: 14 },
  iconBtn: {
    width: SIZE.touch, height: SIZE.touch, borderRadius: SIZE.touch / 2,
    backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, alignItems: 'center', justifyContent: 'center',
  },

  // --- Stat cards, identical geometry to the kit's StatTile ---
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch', rowGap: SPACE.md, marginBottom: SPACE.xl },
  statCard: {
    ...CARD,
    width: '48.5%',
    minHeight: 124,
    padding: SPACE.lg,
    position: 'relative',
    justifyContent: 'space-between',
  },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACE.md },
  statIconWrap: { width: SIZE.iconChip, height: SIZE.iconChip, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  statValue: { ...TYPE.number },
  statLabel: { ...TYPE.label, marginBottom: SPACE.xs },
  statFooterRow: { flexDirection: 'row', alignItems: 'center' },
  statSubText: { fontSize: 11, lineHeight: 15, fontWeight: '600', marginLeft: 2 },
  statSubTextLight: { fontSize: 11, lineHeight: 15, color: SUPER.textMuted },
  waveDecoration: {
    position: 'absolute',
    bottom: -15, right: -10, left: -10,
    height: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 20,
    transform: [{ rotate: '-5deg' }],
  },

  // --- Filter pills: responsive row that never overflows (Rule 4) ---
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.lg, gap: 4, padding: 4, borderRadius: RADIUS.md + 2, backgroundColor: PALETTE.disabled },
  tabPill: {
    flex: 1,
    minWidth: 0,
    minHeight: SIZE.controlSm,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: { backgroundColor: PALETTE.card, ...SHADOW.xs, shadowOpacity: 0.1 },
  tabPillText: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: SUPER.textMuted, textAlign: 'center' },
  tabPillTextActive: { color: SUPER.accent },

  // --- The standard white list card ---
  card: {
    ...CARD,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACE.md, gap: SPACE.md,
  },
  sectionTitle: { ...TYPE.heading },
  sectionCaption: { ...TYPE.caption, marginTop: 2 },

  // --- Search bar ---
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginHorizontal: SPACE.lg,
    marginBottom: SPACE.md,
    paddingHorizontal: 14,
    minHeight: SIZE.control,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.fieldBg,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: SUPER.text, paddingVertical: 10 },

  // --- Forms (same geometry as the kit's Field) ---
  formCard: {
    ...CARD,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
  },
  label: { ...TYPE.label, marginBottom: 6 },
  input: {
    minHeight: SIZE.control,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.fieldBg,
    paddingHorizontal: 14,
    fontSize: 15,
    color: SUPER.text,
  },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: PALETTE.divider, marginVertical: SPACE.lg },

  primaryButton: {
    minHeight: SIZE.control, borderRadius: RADIUS.pill, backgroundColor: SUPER.accent, paddingHorizontal: SPACE.xl,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE.sm,
  },
  primaryButtonText: { color: PALETTE.white, fontSize: 15, fontWeight: '700' },
  ghostButton: {
    minHeight: SIZE.control, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: PALETTE.borderStrong,
    backgroundColor: SUPER.card, paddingHorizontal: SPACE.xl,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE.sm,
  },
  ghostButtonText: { color: PALETTE.textSoft, fontSize: 15, fontWeight: '700' },

  // --- Approve / reject pair, identical to the tier dashboards ---
  actionButtonsRow: { flexDirection: 'row', gap: SPACE.sm },
  reviewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: SIZE.controlSm, borderRadius: RADIUS.pill, gap: SPACE.sm,
  },
  approveBtn: { backgroundColor: ACCENTS.lightGreen },
  rejectBtn: { backgroundColor: ACCENTS.lightRed },
  approveBtnText: { color: PALETTE.successText, fontWeight: '700', fontSize: 14 },
  rejectBtnText: { color: PALETTE.dangerText, fontWeight: '700', fontSize: 14 },

  // --- Browse menu: a compact row list, not oversized cards ---
  menuCard: {
    ...CARD,
    paddingHorizontal: SPACE.lg,
    marginBottom: SPACE.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
    minHeight: SIZE.row,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: PALETTE.divider,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { width: SIZE.iconChip, height: SIZE.iconChip, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: SUPER.text },
  menuCaption: { ...TYPE.caption, fontSize: 13, lineHeight: 18, marginTop: 1 },

  // --- "Active" style status badge ---
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill,
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },

  // --- Summary card: the four totals in one strip ---
  summaryCard: {
    ...CARD,
    flexDirection: 'row',
    paddingVertical: SPACE.md + 2,
    paddingHorizontal: SPACE.sm,
    marginBottom: SPACE.lg,
  },
  summaryCell: { flex: 1, minWidth: 0, alignItems: 'center' },
  summaryDivider: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: PALETTE.divider },
  summaryValue: { ...TYPE.number, fontSize: 20, lineHeight: 26 },
  summaryLabel: { ...TYPE.caption, fontSize: 11, lineHeight: 15, marginTop: SPACE.xxs },

  // --- Outlined action pair used on the admin cards ---
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: SIZE.controlSm, borderRadius: RADIUS.pill, gap: SPACE.sm, borderWidth: 1.5,
    backgroundColor: SUPER.card,
  },
  outlineBtnEdit: { borderColor: ACCENTS.purple },
  outlineBtnEditText: { color: ACCENTS.purple, fontWeight: '700', fontSize: 14 },
  outlineBtnDelete: { borderColor: ACCENTS.red },
  outlineBtnDeleteText: { color: ACCENTS.red, fontWeight: '700', fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: SPACE.huge, paddingHorizontal: SPACE.xxl },
  emptyTitle: { ...TYPE.heading, marginTop: SPACE.md, textAlign: 'center' },
  emptyCaption: { ...TYPE.body, color: SUPER.textMuted, marginTop: SPACE.xs, textAlign: 'center' },
});
