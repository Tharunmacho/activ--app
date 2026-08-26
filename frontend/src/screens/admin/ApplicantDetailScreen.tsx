import React, { useState, useEffect } from 'react';
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
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';
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
  icon: string;
}

const hasValue = (raw: unknown): boolean => {
  if (raw === null || raw === undefined || raw === '') return false;
  if (Array.isArray(raw)) return raw.length > 0;
  return true;
};

const buildRows = (rows: { label: string; raw: unknown; icon?: string }[]): DetailRow[] =>
  rows
    .filter(row => hasValue(row.raw))
    .map(row => ({
      label: row.label,
      value: displayValue(row.raw),
      icon: row.icon || 'info-outline',
    }));

const ApplicantDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { applicant } = route.params;

  const [fullApp, setFullApp] = useState<any>(applicant);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    personal: true,
    business: true,
    financial: true,
    declaration: true,
  });
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [stage, setStage] = useState(applicant.stage || 'pending');
  const [statusLabel, setStatusLabel] = useState(applicant.statusLabel || applicant.status || 'Pending');

  useEffect(() => {
    fetchApplicationDetails();
  }, []);

  const fetchApplicationDetails = async () => {
    const appId = applicant.applicationId || applicant._id || applicant.id;
    const userId = applicant.userId || applicant.memberId;

    setIsLoadingDetails(true);
    try {
      if (appId) {
        const res = await api.get(`/applications/${appId}`);
        if (res.data?.success && res.data?.data) {
          setFullApp((prev: any) => ({ ...prev, ...res.data.data }));
          return;
        }
      }
      if (userId) {
        const res = await api.get(`/applications/user/${userId}`);
        const list = Array.isArray(res.data?.data) ? res.data.data : res.data?.applications || [];
        if (list.length > 0) {
          setFullApp((prev: any) => ({ ...prev, ...list[0] }));
        }
      }
    } catch (err) {
      console.log('Notice: Could not fetch extra application details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const stageStyle = getStageStyle(stage) || ACCENTS.slate;
  const isPending = stage === 'pending';

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    setSubmitting(action);
    const appId = fullApp.applicationId || fullApp._id || fullApp.id;
    try {
      await api.post(`/applications/${appId}/${action}`, {
        action,
        ...(action === 'reject'
          ? { rejectionReason: 'Rejected by Admin' }
          : {}),
      });

      setStage(action === 'approve' ? 'approved' : 'rejected');
      setStatusLabel(action === 'approve' ? 'Approved' : 'Rejected');

      Alert.alert(
        action === 'approve' ? 'Approved' : 'Rejected',
        action === 'approve'
          ? `${fullApp.fullName || applicant.fullName}'s application has been approved.`
          : `${fullApp.fullName || applicant.fullName}'s application has been rejected.`,
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
    const name = fullApp.fullName || applicant.fullName;
    Alert.alert(
      action === 'approve' ? 'Approve applicant' : 'Reject applicant',
      `${action === 'approve' ? 'Approve' : 'Reject'} the application from ${name}?`,
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

  const appData = fullApp?.data || fullApp || {};
  const personal = appData?.personalDetails || appData?.personal || fullApp?.personalDetails || appData;
  const business = appData?.businessInfo || appData?.business || fullApp?.businessInfo || appData;
  const financial = appData?.financialInfo || appData?.financial || fullApp?.financialInfo || appData;
  const declaration = appData?.declaration || fullApp?.declaration || appData;

  const isAspirant = (() => {
    const bizBool = business.doingBusiness !== undefined ? business.doingBusiness : (appData.doingBusiness !== undefined ? appData.doingBusiness : fullApp.doingBusiness);
    if (bizBool === false) return true;
    if (bizBool === true || business.organizationName || appData.organizationName || fullApp.organizationName) return false;
    const str = String(fullApp.registrationType || fullApp.memberType || appData.registrationType || appData.memberType || '').toLowerCase();
    return str.includes('aspirant');
  })();

  const userRole = isAspirant ? 'Aspirant' : 'Business Member';

  const sections: {
    key: SectionKey;
    title: string;
    subtitle: string;
    icon: string;
    accent: { tint: string; solid: string };
    rows: DetailRow[];
  }[] = [
    {
      key: 'personal',
      title: 'Form 1: Personal & Demographic Details',
      subtitle: 'Basic contact and demographic information',
      icon: 'person',
      accent: { tint: '#EEF2FF', solid: '#4F46E5' },
      rows: buildRows([
        { label: 'Full Name', raw: personal.fullName || appData.fullName || fullApp.fullName || applicant.fullName, icon: 'person-outline' },
        { label: 'Block', raw: personal.block || appData.block || fullApp.block || applicant.block, icon: 'location-city' },
        { label: 'City / Town', raw: personal.city || appData.city || fullApp.city || applicant.city, icon: 'place' },
        { label: 'District', raw: personal.district || appData.district || fullApp.district || applicant.district, icon: 'map' },
        { label: 'State', raw: personal.state || appData.state || fullApp.state || applicant.state, icon: 'public' },
        { label: 'Phone Number', raw: personal.phoneNumber || personal.phone || appData.phoneNumber || appData.phone || fullApp.phone || applicant.phone, icon: 'phone' },
        { label: 'Email Address', raw: personal.email || appData.email || fullApp.email || applicant.email, icon: 'email' },
        { label: 'Date of Birth', raw: personal.dateOfBirth || personal.dob || appData.dateOfBirth || appData.dob ? formatDate(personal.dateOfBirth || personal.dob || appData.dateOfBirth || appData.dob) : '', icon: 'cake' },
        { label: 'Gender', raw: personal.gender || appData.gender || applicant.gender, icon: 'wc' },
        { label: 'Aadhaar / ID No', raw: personal.aadhaarNumber || personal.aadhaar || personal.idNumber || appData.aadhaarNumber, icon: 'badge' },
        { label: 'Street Address', raw: personal.streetName || personal.street || personal.address || appData.streetName || appData.address, icon: 'home' },
        { label: 'Education', raw: personal.educationalQualification || personal.education || appData.educationalQualification || appData.education, icon: 'school' },
        { label: 'Religion', raw: personal.religion || appData.religion, icon: 'star-outline' },
        { label: 'Social Category', raw: personal.socialCategory || appData.socialCategory, icon: 'category' },
      ]),
    },
    ...(!isAspirant
      ? [
          {
            key: 'business' as SectionKey,
            title: 'Form 2: Business Information',
            subtitle: 'Company profile and operational details',
            icon: 'business-center',
            accent: { tint: '#EFF6FF', solid: '#2563EB' },
            rows: buildRows([
              { label: 'Member Type / Role', raw: userRole, icon: 'card-membership' },
              { label: 'Doing Business', raw: 'Yes', icon: 'storefront' },
              { label: 'Organization Name', raw: business.organizationName || business.businessName || appData.organizationName || appData.businessName, icon: 'corporate-fare' },
              { label: 'Constitution Type', raw: business.constitutionType || appData.constitutionType, icon: 'gavel' },
              { label: 'Business Type', raw: business.businessTypes || business.businessType || appData.businessTypes || appData.businessType, icon: 'domain' },
              { label: 'Business Activities', raw: business.businessActivities || appData.businessActivities, icon: 'work' },
              { label: 'Commencement Year', raw: business.businessCommencementYear || appData.businessCommencementYear, icon: 'event' },
              { label: 'Employees Count', raw: business.numberOfEmployees || appData.numberOfEmployees, icon: 'groups' },
              { label: 'Other Chamber Member', raw: business.memberOfOtherChamber !== undefined ? (business.memberOfOtherChamber ? 'Yes' : 'No') : (appData.memberOfOtherChamber !== undefined ? (appData.memberOfOtherChamber ? 'Yes' : 'No') : undefined), icon: 'verified' },
              { label: 'Other Chamber Details', raw: business.otherChamber || appData.otherChamber, icon: 'groups' },
              { label: 'Govt. Organizations', raw: business.govtOrganizations || appData.govtOrganizations, icon: 'account-balance' },
            ]),
          },
          {
            key: 'financial' as SectionKey,
            title: 'Form 3: Financial & Compliance',
            subtitle: 'Taxation, scheme benefits and compliance',
            icon: 'account-balance-wallet',
            accent: { tint: '#ECFDF5', solid: '#059669' },
            rows: buildRows([
              { label: 'PAN Number', raw: financial.panNumber || appData.panNumber, icon: 'subtitles' },
              { label: 'GST Number', raw: financial.gstNumber || appData.gstNumber, icon: 'receipt' },
              { label: 'Udyam Number', raw: financial.udyamNumber || appData.udyamNumber, icon: 'confirmation-number' },
              { label: 'ITR Filed', raw: financial.itrFiled !== undefined ? (financial.itrFiled ? 'Yes' : 'No') : (financial.filedITR !== undefined ? (financial.filedITR ? 'Yes' : 'No') : (appData.itrFiled !== undefined ? (appData.itrFiled ? 'Yes' : 'No') : undefined)), icon: 'check-circle' },
              { label: 'Turnover Range', raw: financial.turnoverRange || financial.lastYearTurnover || appData.turnoverRange || appData.lastYearTurnover, icon: 'attach-money' },
              { label: 'Govt. Scheme Benefits', raw: financial.govtSchemeBenefit || financial.govtSchemes || appData.govtSchemeBenefit || appData.govtSchemes, icon: 'card-giftcard' },
            ]),
          },
        ]
      : []),
    {
      key: 'declaration',
      title: 'Form 4: Declaration & Terms',
      subtitle: 'Affiliation and legal agreement',
      icon: 'assignment-turned-in',
      accent: { tint: '#FEF3C7', solid: '#D97706' },
      rows: buildRows([
        ...(!isAspirant
          ? [
              { label: 'Sister Concerns', raw: declaration.sisterConcerns || appData.sisterConcerns, icon: 'hub' },
              { label: 'Company Names', raw: declaration.companyNames || appData.companyNames, icon: 'business' },
            ]
          : []),
        { label: 'Agreed to Terms', raw: declaration.agreeToDeclaration !== undefined ? (declaration.agreeToDeclaration ? 'Yes (Confirmed)' : 'No') : (appData.agreeToTerms !== undefined ? (appData.agreeToTerms ? 'Yes (Confirmed)' : 'No') : 'Yes (Confirmed)'), icon: 'rule' },
        { label: 'Submitted Date', raw: formatDate(appData.submittedAt || fullApp.createdAt || fullApp.updatedAt), icon: 'today' },
      ]),
    },
  ];

  const visibleSections = sections.filter(sec => sec.rows.length > 0);

  const displayName = fullApp.fullName || applicant.fullName || 'Applicant';
  const displayCode = fullApp.memberCode || fullApp.applicationId || applicant.id || 'MEM-2024-001';

  const renderDetailCard = (row: DetailRow, index: number) => (
    <View key={row.label + '_' + index} style={styles.detailRowBox}>
      <View style={styles.detailRowHeader}>
        <View style={styles.detailIconBox}>
          <Icon name={row.icon} size={13} color="#64748B" />
        </View>
        <Text style={styles.detailLabelText}>{row.label}</Text>
      </View>
      <Text style={styles.detailValueText}>{row.value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Clean Seamless Top Bar Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dribbble Style Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroAvatarCircle}>
              <Text style={styles.heroAvatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.heroMainInfo}>
              <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
              <View style={[styles.rolePill, { backgroundColor: isAspirant ? '#ECFDF5' : '#EFF6FF' }]}>
                <Icon name={isAspirant ? 'school' : 'business'} size={12} color={isAspirant ? '#059669' : '#2563EB'} />
                <Text style={[styles.rolePillText, { color: isAspirant ? '#059669' : '#2563EB' }]}>
                  {userRole}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadgePill, { backgroundColor: stageStyle.tint }]}>
              <View style={[styles.statusBadgeDot, { backgroundColor: stageStyle.solid }]} />
              <Text style={[styles.statusBadgeText, { color: stageStyle.solid }]}>
                {statusLabel}
              </Text>
            </View>
          </View>



          {/* Action Buttons */}
          {isPending ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                activeOpacity={0.85}
                disabled={submitting !== null}
                onPress={() => confirmReview('approve')}
              >
                {submitting === 'approve' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                activeOpacity={0.85}
                disabled={submitting !== null}
                onPress={() => confirmReview('reject')}
              >
                {submitting === 'reject' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="cancel" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.noticeCard,
                {
                  backgroundColor: stage === 'approved' ? '#ECFDF5' : '#FEF2F2',
                  borderColor: stage === 'approved' ? '#A7F3D0' : '#FCA5A5',
                },
              ]}
            >
              <Icon
                name={stage === 'approved' ? 'verified' : 'error-outline'}
                size={18}
                color={stage === 'approved' ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.noticeText,
                  { color: stage === 'approved' ? '#065F46' : '#991B1B', fontWeight: '600' },
                ]}
              >
                {stage === 'approved'
                  ? 'Membership Approved & Verified'
                  : fullApp.rejectionReason || 'This application was rejected.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backToListBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Icon name="format-list-bulleted" size={18} color="#334155" />
            <Text style={styles.backToListText}>Back to List</Text>
          </TouchableOpacity>
        </View>

        {isLoadingDetails && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Loading full application data...</Text>
          </View>
        )}

        {/* Collapsible Form Sections */}
        {visibleSections.map(section => {
          const isOpen = expanded[section.key];

          return (
            <View key={section.key} style={styles.formCard}>
              <TouchableOpacity
                style={styles.formCardHeader}
                activeOpacity={0.85}
                onPress={() => toggleSection(section.key)}
              >
                <View style={[styles.formIconBox, { backgroundColor: section.accent.tint }]}>
                  <Icon name={section.icon} size={20} color={section.accent.solid} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.formCardTitle}>{section.title}</Text>
                  <Text style={styles.formCardSubtitle}>{section.subtitle}</Text>
                </View>
                <Icon
                  name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#64748B"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.formCardBody}>
                  {section.rows.map((row, idx) => renderDetailCard(row, idx))}
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
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMainInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memberIdText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#16A34A',
    ...SHADOWS.sm,
  },
  rejectBtn: {
    backgroundColor: '#DC2626',
    ...SHADOWS.sm,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  backToListBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  backToListText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  loadingBox: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  formIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  formCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  detailRowBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  detailValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default ApplicantDetailScreen;
