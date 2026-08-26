import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Applicant } from '../../../../types';
import { SUPER, ACCENTS, superStyles, getInitials, formatDate } from '../superTheme';

interface Props {
  applicant: Applicant;
  busy?: boolean;
  onPress?: (applicant: Applicant) => void;
  onReview?: (applicant: Applicant, action: 'approve' | 'reject') => void;
}

/**
 * An applicant card, laid out exactly like the one on the Block, District and
 * State dashboards — same avatar, badge, meta row, detail grid and action pair.
 * The super admin reviews the same record, so it should look the same.
 */
const ApplicantRow: React.FC<Props> = ({ applicant, busy, onPress, onReview }) => {
  const stage = applicant?.stage || 'pending';

  const badgeBg = stage === 'pending' ? ACCENTS.lightOrange
    : stage === 'approved' ? ACCENTS.lightGreen
    : stage === 'rejected' ? ACCENTS.lightRed
    : SUPER.field;
  const badgeFg = stage === 'pending' ? ACCENTS.orange
    : stage === 'approved' ? ACCENTS.green
    : stage === 'rejected' ? ACCENTS.red
    : SUPER.textMuted;
  const badgeIcon = stage === 'pending' ? 'schedule'
    : stage === 'approved' ? 'check'
    : stage === 'rejected' ? 'close'
    : 'more-horiz';

  return (
    <TouchableOpacity
      style={styles.applicantCard}
      activeOpacity={0.9}
      onPress={() => onPress?.(applicant)}
    >
      <View style={styles.applicantHeader}>
        <View style={styles.applicantInfoRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(applicant?.fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.applicantName} numberOfLines={1}>
              {applicant?.fullName || 'Unnamed applicant'}
            </Text>
            <Text style={styles.applicantEmail} numberOfLines={1}>
              {applicant?.email || 'No email provided'}
            </Text>
            <Text style={styles.applicantRole} numberOfLines={1}>
              Role: <Text style={{ color: ACCENTS.purple }}>{applicant?.role || 'member'}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Icon name={badgeIcon} size={12} color={badgeFg} />
          <Text style={[styles.statusBadgeText, { color: badgeFg }]}>
            {applicant?.statusLabel || 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.applicantMetaRow}>
        <View style={styles.metaItem}>
          <Icon name="place" size={14} color={SUPER.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {applicant?.block || applicant?.district || applicant?.state || '—'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="phone" size={14} color={SUPER.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{applicant?.phone || '—'}</Text>
        </View>
      </View>

      <View style={styles.applicantDetailsGrid}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Applied on</Text>
          <Text style={styles.detailValue}>{formatDate(applicant?.submittedAt) || '—'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Membership Type</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {applicant?.memberType || applicant?.role || 'Member'}
          </Text>
        </View>
      </View>

      {stage === 'pending' && onReview ? (
        <View style={superStyles.actionButtonsRow}>
          <TouchableOpacity
            style={[superStyles.reviewBtn, superStyles.approveBtn]}
            onPress={() => onReview(applicant, 'approve')}
            disabled={busy}
            activeOpacity={0.7}
          >
            {busy ? (
              <ActivityIndicator size="small" color={ACCENTS.green} />
            ) : (
              <>
                <Icon name="check" size={16} color={ACCENTS.green} />
                <Text style={superStyles.approveBtnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[superStyles.reviewBtn, superStyles.rejectBtn]}
            onPress={() => onReview(applicant, 'reject')}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Icon name="close" size={16} color={ACCENTS.red} />
            <Text style={superStyles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  applicantCard: {
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
  applicantHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, gap: 8,
  },
  applicantInfoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENTS.lightPurple, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: ACCENTS.purple },
  applicantName: { fontSize: 16, fontWeight: '700', color: SUPER.text, marginBottom: 2 },
  applicantEmail: { fontSize: 12, color: SUPER.textMuted, marginBottom: 2 },
  applicantRole: { fontSize: 12, color: SUPER.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  applicantMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 13, color: SUPER.textMuted },

  applicantDetailsGrid: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: SUPER.border,
    paddingTop: 16, marginBottom: 16,
  },
  detailCol: { flex: 1, paddingRight: 8 },
  detailLabel: { fontSize: 11, color: SUPER.textFaint, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '500', color: SUPER.text },
});

export default React.memo(ApplicantRow);
