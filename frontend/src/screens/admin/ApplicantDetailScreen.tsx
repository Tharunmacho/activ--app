import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';
import {
  ACCENTS,
  SURFACE,
  displayValue,
  formatDate,
  getInitials,
  getStageStyle,
} from './applicantStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicantDetail'>;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey = 'personal' | 'business' | 'financial' | 'declaration';

interface DetailRow {
  label: string;
  value: string;
}

/**
 * True only when the applicant actually supplied this field. Empty strings,
 * null/undefined, empty arrays and `false` booleans are all treated as "not
 * filled" so the review screen shows only the data captured at registration.
 */
const hasValue = (raw: unknown): boolean => {
  if (raw === null || raw === undefined || raw === '') return false;
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === 'boolean') return raw;
  return true;
};

/** Keeps only the rows the applicant actually filled in. */
const buildRows = (rows: { label: string; raw: unknown }[]): DetailRow[] =>
  rows
    .filter(row => hasValue(row.raw))
    .map(row => ({ label: row.label, value: displayValue(row.raw) }));

const ApplicantDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { applicant } = route.params;

  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    personal: true,
    business: false,
    financial: false,
    declaration: false,
  });
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [stage, setStage] = useState(applicant.stage);
  const [statusLabel, setStatusLabel] = useState(applicant.statusLabel);

  const stageStyle = getStageStyle(stage);
  const isPending = stage === 'pending';

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    setSubmitting(action);
    try {
      await api.post(`/applications/${applicant.applicationId}/block-review`, {
        action,
        ...(action === 'reject'
          ? { rejectionReason: 'Rejected by Block Admin' }
          : {}),
      });

      setStage(action === 'approve' ? 'approved' : 'rejected');
      setStatusLabel(action === 'approve' ? 'Approved' : 'Rejected');

      Alert.alert(
        action === 'approve' ? 'Approved' : 'Rejected',
        action === 'approve'
          ? `${applicant.fullName}'s application has been forwarded to the District Admin.`
          : `${applicant.fullName}'s application has been rejected.`,
        [{ text: 'Back to List', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(
        'Action failed',
        error.response?.data?.message || 'Could not update the application',
      );
    } finally {
      setSubmitting(null);
    }
  };

  const confirmReview = (action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Approve applicant' : 'Reject applicant',
      `${action === 'approve' ? 'Approve' : 'Reject'} the application from ${applicant.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => submitReview(action),
        },
      ],
    );
  };

  const personal = applicant.personalDetails || ({} as any);
  const business = applicant.businessInfo || ({} as any);
  const financial = applicant.financialInfo || ({} as any);
  const declaration = applicant.declaration || ({} as any);

  const allSections: {
    key: SectionKey;
    title: string;
    icon: string;
    accent: { tint: string; solid: string };
    rows: DetailRow[];
  }[] = [
    {
      key: 'personal',
      title: 'Personal & Demographic Details',
      icon: 'person-outline',
      accent: ACCENTS.indigo,
      rows: buildRows([
        { label: 'Name', raw: personal.fullName || applicant.fullName },
        { label: 'Block', raw: personal.block || applicant.block },
        { label: 'City', raw: personal.city || applicant.city },
        { label: 'District', raw: personal.district || applicant.district },
        { label: 'Phone', raw: personal.phone || applicant.phone },
        { label: 'Email', raw: personal.email || applicant.email },
        { label: 'Date of Birth', raw: personal.dateOfBirth ? formatDate(personal.dateOfBirth) : '' },
        { label: 'Aadhaar No', raw: personal.aadhaarNumber },
        { label: 'Street Name', raw: personal.streetName },
        { label: 'Education', raw: personal.education },
        { label: 'Religion', raw: personal.religion },
        { label: 'Social Category', raw: personal.socialCategory },
      ]),
    },
    {
      key: 'business',
      title: 'Business Information',
      icon: 'business-center',
      accent: ACCENTS.blue,
      rows: buildRows([
        { label: 'Organization Name', raw: business.organizationName },
        { label: 'Constitution Type', raw: business.constitutionType },
        { label: 'Business Type', raw: business.businessTypes },
        { label: 'Business Activities', raw: business.businessActivities },
        { label: 'Commencement Year', raw: business.businessCommencementYear },
        { label: 'Employees', raw: business.numberOfEmployees },
        { label: 'Other Chamber Member', raw: business.memberOfOtherChamber },
        { label: 'Other Chamber', raw: business.otherChamber },
        { label: 'Govt. Organizations', raw: business.govtOrganizations },
      ]),
    },
    {
      key: 'financial',
      title: 'Financial & Compliance',
      icon: 'account-balance',
      accent: ACCENTS.green,
      rows: buildRows([
        { label: 'PAN Number', raw: financial.panNumber },
        { label: 'GST Number', raw: financial.gstNumber },
        { label: 'Udyam Number', raw: financial.udyamNumber },
        { label: 'ITR Filed', raw: financial.itrFiled },
        { label: 'Turnover Range', raw: financial.turnoverRange },
        { label: 'Govt. Scheme Benefit', raw: financial.govtSchemeBenefit },
      ]),
    },
    {
      key: 'declaration',
      title: 'Declaration',
      icon: 'assignment-turned-in',
      accent: ACCENTS.amber,
      rows: buildRows([
        { label: 'Sister Concerns', raw: declaration.sisterConcerns },
        { label: 'Company Names', raw: declaration.companyNames },
        { label: 'Agreed to Declaration', raw: declaration.agreeToDeclaration },
      ]),
    },
  ];

  // Only surface sections the applicant actually filled in.
  const sections = allSections.filter(section => section.rows.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
          <Icon name="more-vert" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Action Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroAvatar, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.heroAvatarText}>{getInitials(applicant.fullName)}</Text>
            </View>

            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroName}>{applicant.fullName}</Text>
              <Text style={styles.heroMemberId}>
                Member ID: {applicant.memberCode || 'MEM-2024-001'}
              </Text>
            </View>

            <View style={[styles.heroBadge, { backgroundColor: stageStyle.tint }]}>
              <Text style={[styles.heroBadgeText, { color: stageStyle.solid }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {isPending ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.sideActionButton, styles.approveButton]}
                activeOpacity={0.85}
                disabled={submitting !== null}
                onPress={() => confirmReview('approve')}
              >
                {submitting === 'approve' ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sideActionButton, styles.rejectButton]}
                activeOpacity={0.85}
                disabled={submitting !== null}
                onPress={() => confirmReview('reject')}
              >
                {submitting === 'reject' ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="close" size={18} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.reviewedNotice}>
              <Icon name="info-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.reviewedNoticeText}>
                {stage === 'rejected'
                  ? applicant.rejectionReason || 'This application was rejected.'
                  : 'This application has already cleared block review.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.backToListButton]}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Icon name="menu" size={18} color={COLORS.textPrimary} />
            <Text style={[styles.actionButtonText, styles.backToListText]}>
              Back to List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible Sections */}
        {sections.map(section => {
          const isOpen = expanded[section.key];

          return (
            <View key={section.key} style={styles.accordion}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
              >
                <View
                  style={[
                    styles.accordionIcon,
                    { backgroundColor: section.accent.tint },
                  ]}
                >
                  <Icon name={section.icon} size={18} color={section.accent.solid} />
                </View>
                <Text style={styles.accordionTitle}>{section.title}</Text>
                <Icon
                  name={isOpen ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.accordionBody}>
                  {section.rows.map((row, index) => (
                    <View
                      key={row.label}
                      style={[
                        styles.detailRow,
                        index === section.rows.length - 1 && styles.detailRowLast,
                      ]}
                    >
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  heroTitleWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  heroName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  heroMemberId: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  heroBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  sideActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: SPACING.sm,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#16A34A',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  backToListButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
  },
  backToListText: {
    color: COLORS.textPrimary,
  },
  reviewedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: SURFACE.background,
    gap: 6,
  },
  reviewedNoticeText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  accordion: {
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: SURFACE.border,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  accordionTitle: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  accordionBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: SURFACE.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    width: '42%',
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weights.medium,
    textAlign: 'right',
  },
});

export default ApplicantDetailScreen;
