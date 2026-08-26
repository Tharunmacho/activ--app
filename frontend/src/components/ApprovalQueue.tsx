import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Applicant, ApplicantBuckets, AdminLevel } from '../types';
import { COLORS, FONTS, SPACING } from '../theme/theme';

type FilterKey = keyof ApplicantBuckets;

interface Props {
  buckets: ApplicantBuckets;
  /** Which tier is reviewing — drives copy and the empty-state explanation. */
  level: AdminLevel;
  /** Resolves once the decision has been persisted; the parent then refetches. */
  onReview: (applicant: Applicant, action: 'approve' | 'reject', reason?: string) => Promise<void>;
  onPressApplicant?: (applicant: Applicant) => void;
  activeFilter?: FilterKey;
  onFilterChange?: (filter: FilterKey) => void;
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const LEVEL_COPY: Record<AdminLevel, { title: string; waitingOn: string }> = {
  block: {
    title: 'Block Approvals',
    waitingOn: 'New member applications land here first.',
  },
  district: {
    title: 'District Approvals',
    waitingOn: 'Applications appear here only after the Block Admin approves them.',
  },
  state: {
    title: 'State Approvals',
    waitingOn: 'Applications appear here only after the District Admin approves them.',
  },
};

const STAGE_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FEF3C7', fg: '#D97706' },
  approved: { bg: '#DCFCE7', fg: '#16A34A' },
  rejected: { bg: '#FEE2E2', fg: '#DC2626' },
  upstream: { bg: '#E0E7FF', fg: '#4F46E5' },
  closed: { bg: '#F1F5F9', fg: '#64748B' },
};

const getInitials = (fullName?: string | null): string => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const ApprovalQueue: React.FC<Props> = ({
  buckets,
  level,
  onReview,
  onPressApplicant,
  activeFilter: controlledFilter,
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<FilterKey>('pending');
  const activeFilter = controlledFilter ?? internalFilter;
  const setActiveFilter = (f: FilterKey) => {
    setInternalFilter(f);
    if (onFilterChange) onFilterChange(f);
  };
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | null>(null);
  // Inline rejection form rather than a native Modal: this queue renders inside
  // sub-tab views, where a transparent Modal risks a WindowManager crash.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const safeBuckets = useMemo<ApplicantBuckets>(
    () => ({
      pending: buckets?.pending || [],
      approved: buckets?.approved || [],
      rejected: buckets?.rejected || [],
      all: buckets?.all || [],
    }),
    [buckets],
  );

  const visible = safeBuckets[activeFilter] || [];
  const copy = LEVEL_COPY[level] || LEVEL_COPY.block;

  const submit = useCallback(
    async (applicant: Applicant, action: 'approve' | 'reject', reason?: string) => {
      setBusyId(applicant?.id || '');
      setBusyAction(action);
      try {
        await onReview(applicant, action, reason);
        setRejectingId(null);
        setRejectReason('');
      } finally {
        setBusyId(null);
        setBusyAction(null);
      }
    },
    [onReview],
  );

  const renderCard = (applicant: Applicant) => {
    const stage = applicant?.stage || 'pending';
    const palette = STAGE_COLORS[stage] || STAGE_COLORS.pending;
    const isBusy = busyId === (applicant?.id || '');
    const canAct = stage === 'pending';
    const isRejecting = rejectingId === (applicant?.id || '');

    // Prefer a real member code; fall back to a short form of the application
    // id, which is a genuine reference rather than an invented one.
    const reference = (applicant?.memberCode || applicant?.id || '').slice(-6).toUpperCase();
    const location = [applicant?.block, applicant?.district].filter(Boolean).join(', ');

    return (
      <TouchableOpacity
        key={applicant?.id || applicant?.applicationId}
        style={styles.card}
        activeOpacity={onPressApplicant ? 0.85 : 1}
        disabled={!onPressApplicant}
        onPress={() => onPressApplicant && onPressApplicant(applicant)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(applicant?.fullName)}</Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {applicant?.fullName || 'Name not provided'}
            </Text>
            {!!applicant?.email && (
              <Text style={styles.email} numberOfLines={1}>
                {applicant.email}
              </Text>
            )}
          </View>

          <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
            <Text style={[styles.statusPillText, { color: palette.fg }]} numberOfLines={1}>
              {applicant?.statusLabel || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Only what the applicant actually submitted. An admin deciding on a
            membership must never see a fabricated phone number or location. */}
        <View style={styles.metaGrid}>

          {(() => {
            const isAsp =
              applicant?.doingBusiness === false ||
              applicant?.businessInfo?.doingBusiness === false ||
              String(applicant?.registrationType || applicant?.memberType || applicant?.role || '').toLowerCase().includes('aspirant');

            const displayRole = isAsp
              ? 'Aspirant'
              : (applicant?.doingBusiness === true || applicant?.businessInfo?.doingBusiness === true || applicant?.organizationName
                  ? 'Business Member'
                  : (applicant?.role && applicant.role.toLowerCase() !== 'member' ? applicant.role : 'Business Member'));

            return (
              <View style={styles.metaHalf}>
                <Text style={styles.metaLabel}>Role: </Text>
                <Text
                  style={[
                    styles.metaValue,
                    isAsp ? { color: '#059669', fontWeight: '700' } : { color: '#2563EB', fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {displayRole}
                </Text>
              </View>
            );
          })()}
          {!!location && (
            <View style={styles.metaFull}>
              <Icon name="location-on" size={14} color="#64748B" />
              <Text style={styles.metaValue} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
          {!!applicant?.phone && (
            <View style={styles.metaFull}>
              <Icon name="call" size={14} color="#64748B" />
              <Text style={styles.metaValue}>{applicant.phone}</Text>
            </View>
          )}
        </View>

        {/* An escalated file arrived here because the tier below has no admin.
            Deciding on another tier's application without being told why is how
            an admin loses trust in the queue, so the reason is always shown. */}
        {!!applicant?.orphaned && !!applicant?.fallbackReason && (
          <View style={styles.escalation}>
            <Icon name="trending-up" size={14} color="#B45309" />
            <Text style={styles.escalationText} numberOfLines={2}>
              {applicant.fallbackReason}
            </Text>
          </View>
        )}

        {!!applicant?.approvedByText && (
          <Text
            style={[
              styles.attribution,
              (stage === 'rejected' || stage === 'closed') && { color: '#DC2626' },
            ]}
          >
            {applicant.approvedByText}
          </Text>
        )}

        {!!applicant?.rejectionReason && stage !== 'pending' && (
          <Text style={styles.reason} numberOfLines={3}>
            Reason: {applicant.rejectionReason}
          </Text>
        )}

        {canAct && !isRejecting && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={isBusy}
              onPress={() => submit(applicant, 'approve')}
            >
              {isBusy && busyAction === 'approve' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="check" size={16} color={COLORS.white} />
                  <Text style={styles.actionText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              disabled={isBusy}
              onPress={() => {
                setRejectingId(applicant?.id || '');
                setRejectReason('');
              }}
            >
              <Icon name="close" size={16} color={COLORS.white} />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {canAct && isRejecting && (
          <View style={styles.rejectForm}>
            <Text style={styles.rejectLabel}>Reason for rejection</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Explain why this application is being rejected"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                disabled={isBusy}
                onPress={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
              >
                <Text style={[styles.actionText, { color: '#475569' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={isBusy}
                onPress={() => submit(applicant, 'reject', (rejectReason || '').trim())}
              >
                {isBusy && busyAction === 'reject' ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.actionText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{copy.title}</Text>

      {/* Flex row so all four pills stay visible and tappable on narrow screens. */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map(tab => {
          const isActive = activeFilter === tab.key;
          const count = (safeBuckets[tab.key] || []).length;

          let activeBg = '#2563EB';
          if (tab.key === 'approved') activeBg = '#16A34A';
          else if (tab.key === 'rejected') activeBg = '#DC2626';
          else if (tab.key === 'pending') activeBg = '#2563EB';

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { backgroundColor: activeBg, borderColor: activeBg }]}
              activeOpacity={0.8}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
              >
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {visible.length > 0 ? (
        visible.map(renderCard)
      ) : (
        <View style={styles.empty}>
          <Icon name="inbox" size={36} color={COLORS.textDisabled} />
          <Text style={styles.emptyTitle}>No {activeFilter} applications</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'pending'
              ? copy.waitingOn
              : 'Nothing to show in this bucket yet.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E8EBF2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 17,
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  name: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  email: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: SPACING.xs,
    maxWidth: 110,
  },
  statusPillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  metaHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 4,
    paddingRight: SPACING.xs,
  },
  metaFull: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 2,
    gap: 6,
  },
  metaLabel: {
    fontSize: FONTS.sizes.xs,
    color: '#64748B',
  },
  metaValue: {
    flexShrink: 1,
    fontSize: FONTS.sizes.xs,
    color: '#334155',
    fontWeight: FONTS.weights.medium,
  },
  attribution: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.xs,
    color: '#2563EB',
    fontWeight: FONTS.weights.medium,
  },
  escalation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  escalationText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: '#B45309',
    fontWeight: FONTS.weights.medium,
  },
  reason: {
    marginTop: 4,
    fontSize: FONTS.sizes.xs,
    color: '#64748B',
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#16A34A',
  },
  rejectBtn: {
    backgroundColor: '#DC2626',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semiBold,
  },
  rejectForm: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  rejectLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
    color: '#475569',
    marginBottom: 4,
  },
  rejectInput: {
    minHeight: 64,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONTS.sizes.sm,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  emptyText: {
    marginTop: 4,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default ApprovalQueue;
