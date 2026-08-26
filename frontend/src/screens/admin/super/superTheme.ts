import { StyleSheet } from 'react-native';

/**
 * The super admin console uses the same visual language as the Block, District
 * and State dashboards — same #FAFAFA canvas, same indigo accent, same card
 * geometry — so an admin moving between tiers never has to relearn the screen.
 *
 * Tokens mirror `ACCENTS` in the tier dashboards exactly. Changing one here
 * without changing it there is what makes the tiers drift apart.
 */
export const ACCENTS = {
  purple: '#5440d4',
  lightPurple: '#EEF2FF',
  orange: '#F59E0B',
  lightOrange: '#FEF3C7',
  green: '#10B981',
  lightGreen: '#D1FAE5',
  red: '#EF4444',
  lightRed: '#FEE2E2',
};

export const SUPER = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  border: '#F1F5F9',
  borderStrong: '#E2E8F0',
  pillBorder: '#CBD5E1',
  field: '#F1F5F9',

  text: '#1E293B',
  textMuted: '#64748B',
  textFaint: '#94A3B8',

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

export const superStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUPER.bg },
  scrollContent: { padding: 16, paddingBottom: 40 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  // --- Dashboard header: greeting + name + avatar (Hub entry level) ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SUPER.bg,
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  welcomeText: { fontSize: 13, color: SUPER.accent, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: SUPER.text, marginBottom: 2, lineHeight: 34 },
  headerSubtitle: { fontSize: 13, color: SUPER.textFaint, fontWeight: '400' },
  headerRight: { alignItems: 'center', justifyContent: 'center' },
  avatarSmall: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: SUPER.accent,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarSmallText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // --- Page header: back + title + action (every other screen) ---
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SUPER.bg,
    marginBottom: 8,
  },
  backBtn: { padding: 8, backgroundColor: SUPER.field, borderRadius: 20 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: SUPER.text },
  pageSubtitle: { fontSize: 12, color: SUPER.textFaint, marginTop: 2 },
  actionBtn: {
    backgroundColor: SUPER.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SUPER.field, alignItems: 'center', justifyContent: 'center',
  },

  // --- Stat cards, identical geometry to the tier dashboards ---
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%',
    minHeight: 130,
    backgroundColor: SUPER.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 8 },
  statFooterRow: { flexDirection: 'row', alignItems: 'center' },
  statSubText: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
  statSubTextLight: { fontSize: 11, color: SUPER.textFaint },
  waveDecoration: {
    position: 'absolute',
    bottom: -15, right: -10, left: -10,
    height: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 20,
    transform: [{ rotate: '-5deg' }],
  },

  // --- Filter pills: responsive row that never overflows (Rule 4) ---
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 4 },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: SUPER.pillBorder,
    backgroundColor: SUPER.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: { backgroundColor: SUPER.accent, borderColor: SUPER.accent },
  tabPillText: { fontSize: 12, fontWeight: '600', color: SUPER.textMuted, textAlign: 'center' },
  tabPillTextActive: { color: '#FFFFFF' },

  // --- The standard white list card ---
  card: {
    backgroundColor: SUPER.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: SUPER.text },
  sectionCaption: { fontSize: 12, color: SUPER.textFaint, marginTop: 2 },

  // --- Search bar ---
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: SUPER.card,
    borderWidth: 1,
    borderColor: SUPER.borderStrong,
  },
  searchInput: { flex: 1, fontSize: 14, color: SUPER.text, padding: 0 },

  // --- Forms ---
  formCard: {
    backgroundColor: SUPER.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  label: { fontSize: 12, fontWeight: '600', color: SUPER.textMuted, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SUPER.borderStrong,
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 14,
    fontSize: 14,
    color: SUPER.text,
  },
  divider: { height: 1, backgroundColor: SUPER.border, marginVertical: 16 },

  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: SUPER.accent,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  ghostButton: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: SUPER.pillBorder,
    backgroundColor: SUPER.card,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  ghostButtonText: { color: SUPER.textMuted, fontSize: 15, fontWeight: '600' },

  // --- Approve / reject pair, identical to the tier dashboards ---
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  reviewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 8,
  },
  approveBtn: { backgroundColor: ACCENTS.lightGreen },
  rejectBtn: { backgroundColor: ACCENTS.lightRed },
  approveBtnText: { color: ACCENTS.green, fontWeight: '600', fontSize: 14 },
  rejectBtnText: { color: ACCENTS.red, fontWeight: '600', fontSize: 14 },

  // --- Browse menu: a compact row list, not oversized cards ---
  menuCard: {
    backgroundColor: SUPER.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: SUPER.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: SUPER.text },
  menuCaption: { fontSize: 12, color: SUPER.textFaint, marginTop: 2 },

  // --- "Active" style status badge ---
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // --- Summary card: the four totals in one strip ---
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: SUPER.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryDivider: { borderLeftWidth: 1, borderLeftColor: SUPER.border },
  summaryValue: { fontSize: 19, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: SUPER.textFaint, marginTop: 4 },

  // --- Outlined action pair used on the admin cards ---
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 12, gap: 8, borderWidth: 1.5,
    backgroundColor: SUPER.card,
  },
  outlineBtnEdit: { borderColor: ACCENTS.purple },
  outlineBtnEditText: { color: ACCENTS.purple, fontWeight: '600', fontSize: 14 },
  outlineBtnDelete: { borderColor: ACCENTS.red },
  outlineBtnDeleteText: { color: ACCENTS.red, fontWeight: '600', fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: '600', color: SUPER.textMuted, textAlign: 'center' },
  emptyCaption: { marginTop: 4, fontSize: 12, color: SUPER.textFaint, textAlign: 'center' },
});
