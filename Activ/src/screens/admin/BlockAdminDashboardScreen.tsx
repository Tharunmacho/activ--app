import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Applicant, ApplicantStage } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api, { STORAGE_KEYS, getUserData } from '../../services/api';
import {
  ACCENTS,
  SURFACE,
  getInitials,
  getStageStyle,
} from './applicantStyles';

import BrowseMembersScreen from '../member/BrowseMembersScreen';

type BlockAdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BlockAdminDashboard'
>;

interface Props {
  navigation: any;
  initialNav?: NavKey;
}

interface BlockStats {
  totalMembers: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalApplications: number;
  activeBusinesses: number;
  blockName: string;
  districtName: string;
  stateName: string;
}

interface ApplicantBuckets {
  pending: Applicant[];
  approved: Applicant[];
  rejected: Applicant[];
  all: Applicant[];
}

type FilterKey = keyof ApplicantBuckets;
type NavKey = 'dashboard' | 'approvals' | 'members' | 'settings';

const EMPTY_BUCKETS: ApplicantBuckets = {
  pending: [],
  approved: [],
  rejected: [],
  all: [],
};

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const BOTTOM_NAV: { key: NavKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'approvals', label: 'Approvals', icon: 'fact-check' },
  { key: 'members', label: 'Members', icon: 'people' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

const HEADER_COPY: Record<NavKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Block Admin Dashboard', subtitle: 'Manage Block Level' },
  approvals: { title: 'Approvals', subtitle: 'Review applications' },
  members: { title: 'Members', subtitle: 'Approved members' },
  settings: { title: 'Settings', subtitle: 'Account & block info' },
};

const BlockAdminDashboardScreen: React.FC<Props> = ({ navigation, initialNav = 'dashboard' }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BlockStats | null>(null);
  const [applicants, setApplicants] = useState<ApplicantBuckets>(EMPTY_BUCKETS);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('pending');
  const [membersTabFilter, setMembersTabFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav);
  const [adminName, setAdminName] = useState<string>('Block Admin');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: 'Block Admin',
    email: '',
    block: '',
    district: '',
  });
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: 'approve' | 'reject';
  } | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      const response = await api.get('/admin/block/dashboard');
      const payload = response.data.data || response.data;

      setStats(payload.stats || null);
      setApplicants({ ...EMPTY_BUCKETS, ...(payload.applicants || {}) });
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load dashboard data',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on focus so decisions made on the detail screen show up here.
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

  useEffect(() => {
    getUserData()
      .then(data => {
        if (data?.fullName || data?.name) setAdminName(data.fullName || data.name);
        if (data?.email) setAdminEmail(data.email);
      })
      .catch(() => {});
  }, []);

  const currentBlock = stats?.blockName || 'Ariyalur';
  const dynamicRoleTitle = `${currentBlock} Admin`;
  const displayedAdminName = adminName && adminName !== 'Block Admin' ? adminName : dynamicRoleTitle;

  const handleOpenEditModal = () => {
    setEditForm({
      fullName: displayedAdminName,
      email: adminEmail || 'admin@activ.com',
      block: currentBlock,
      district: stats?.districtName || 'Ariyalur',
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await api.put('/admin/profile', editForm);
      const updated = res.data?.data || res.data || {};

      if (updated.fullName) setAdminName(updated.fullName);
      if (updated.email) setAdminEmail(updated.email);
      setEditModalVisible(false);

      Alert.alert('Success', `${dynamicRoleTitle} profile updated in database successfully!`);
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update admin profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const submitReview = async (applicant: Applicant, action: 'approve' | 'reject') => {
    setPendingAction({ id: applicant.id, action });

    try {
      // Stage 1 of the workflow. Approving does not finalise anything — it
      // moves the file to 'Pending-District' for the next tier to review.
      await api.post(`/applications/${applicant.id}/block-review`, {
        action,
        rejectionReason:
          action === 'reject' ? `Rejected by ${dynamicRoleTitle}` : undefined,
      });

      setApplicants(prev => {
        const nextPending = (prev.pending || []).filter(a => a.id !== applicant.id);
        const updatedApplicant: any = {
          ...applicant,
          status: action === 'approve' ? 'Pending-District' : 'Rejected',
          stage: action === 'approve' ? 'approved' : 'rejected',
          statusLabel: action === 'approve' ? 'Approved' : 'Rejected',
          approvedByText: action === 'approve' ? `Approved by ${dynamicRoleTitle}` : `Rejected by ${dynamicRoleTitle}`,
        };

        return {
          ...prev,
          pending: nextPending,
          approved: action === 'approve' ? [updatedApplicant, ...(prev.approved || [])] : prev.approved,
          rejected: action === 'reject' ? [updatedApplicant, ...(prev.rejected || [])] : prev.rejected,
          all: (prev.all || []).map(a => (a.id === applicant.id ? updatedApplicant : a)),
        };
      });

      Alert.alert(
        'Success',
        action === 'approve'
          ? 'Application approved and forwarded to the District Admin.'
          : 'Application rejected.',
      );

      // The optimistic update above only moves the applicant between buckets;
      // the stat cards come from `stats` and would keep showing the old pending
      // count until the next focus. Refetch so the numbers match the list.
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || `Failed to ${action} applicant`,
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleNavPress = (nav: NavKey) => {
    setActiveNav(nav);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch {
      navigation.navigate('Login');
    }
  };

  const renderStatCard = (
    label: string,
    value: number,
    accent: { tint: string; solid: string },
    icon: string,
    onPress?: () => void,
  ) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: accent.tint }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.statIconWrap, { backgroundColor: accent.solid }]}>
        <Icon name={icon} size={16} color={COLORS.white} />
      </View>
      <Text style={[styles.statValue, { color: accent.solid }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const renderApplicantCard = (applicant: Applicant, showActions = true) => {
    const stageStyle = getStageStyle(applicant.stage as ApplicantStage);
    const isBusy = pendingAction?.id === applicant.id;
    const canAct = showActions && applicant.stage === 'pending';

    // Attribution comes from the server, which knows which tier actually acted.
    // The old client-side guess asserted "Rejected by District Admin" for every
    // rejection, including ones this block admin made itself.
    const approvedBySubtext = (applicant as any).approvedByText || '';

    return (
      <TouchableOpacity
        key={applicant.id}
        style={styles.applicantCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ApplicantDetail', { applicant })}
      >
        <View style={styles.applicantHeader}>
          <View style={[styles.avatar, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.avatarText}>{getInitials(applicant.fullName)}</Text>
          </View>

          <View style={styles.applicantHeaderText}>
            <Text style={styles.applicantName} numberOfLines={1}>
              {applicant.fullName || 'Name not provided'}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: stageStyle.tint }]}>
            <Icon
              name={applicant.stage === 'approved' ? 'check-circle' : applicant.stage === 'rejected' ? 'cancel' : 'schedule'}
              size={13}
              color={stageStyle.solid}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusPillText, { color: stageStyle.solid }]}>
              {applicant.statusLabel}
            </Text>
          </View>
        </View>

        {/* Only fields the applicant actually supplied are rendered — a fake
            phone number or member code on a review screen is worse than a gap. */}
        <View style={styles.metaGrid}>
          {!!applicant.memberCode && (
            <View style={styles.metaHalfRow}>
              <Text style={styles.metaLabel}>ID: </Text>
              <Text style={styles.metaVal}>{applicant.memberCode}</Text>
            </View>
          )}
          {!!applicant.email && (
            <View style={styles.metaHalfRow}>
              <Text style={styles.metaVal} numberOfLines={1}>{applicant.email}</Text>
            </View>
          )}
          {!!applicant.role && (
            <View style={styles.metaHalfRow}>
              <Text style={styles.metaLabel}>Role: </Text>
              <Text style={styles.metaVal}>{applicant.role}</Text>
            </View>
          )}
          {!!applicant.gender && (
            <View style={styles.metaHalfRow}>
              <Text style={styles.metaLabel}>Gender: </Text>
              <Text style={styles.metaVal}>{applicant.gender}</Text>
            </View>
          )}
          {!!applicant.block && (
            <View style={styles.metaFullRow}>
              <Icon name="location-on" size={15} color="#000" />
              <Text style={styles.metaFullText}>{applicant.block}</Text>
            </View>
          )}
          {!!applicant.phone && (
            <View style={styles.metaFullRow}>
              <Icon name="call" size={15} color="#666" />
              <Text style={styles.metaFullText}>{applicant.phone}</Text>
            </View>
          )}
        </View>

        {!!approvedBySubtext && applicant.stage !== 'pending' && (
          <View style={styles.attributionRow}>
            <Text style={styles.attributionText}>{approvedBySubtext}</Text>
          </View>
        )}

        {canAct && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.approveButton]}
              disabled={isBusy}
              onPress={() => submitReview(applicant, 'approve')}
            >
              {isBusy && pendingAction?.action === 'approve' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="check" size={16} color={COLORS.white} />
                  <Text style={styles.quickActionText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.rejectButton]}
              disabled={isBusy}
              onPress={() => submitReview(applicant, 'reject')}
            >
              {isBusy && pendingAction?.action === 'reject' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="close" size={16} color={COLORS.white} />
                  <Text style={styles.quickActionText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Flex row rather than a horizontal ScrollView so all four pills stay
  // visible and tappable on narrow screens instead of scrolling off-screen.
  const renderFilterTabs = () => (
    <View style={styles.tabsRow}>
      {FILTER_TABS.map(tab => {
        const isActive = activeFilter === tab.key;
        const totalCount = applicants.all?.length || 0;
        const count = tab.key === 'all' ? totalCount : (applicants[tab.key] || []).length;
        const labelText = tab.key === 'all' ? `All (${count})` : tab.label;

        let activeBg = ACCENTS.blue.solid;
        if (isActive) {
          if (tab.key === 'approved') activeBg = '#16A34A';
          else if (tab.key === 'rejected') activeBg = '#DC2626';
          else if (tab.key === 'pending') activeBg = '#D97706';
          else if (tab.key === 'all') activeBg = '#2563EB';
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && { backgroundColor: activeBg, borderColor: activeBg },
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
            >
              {labelText}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEmptyState = (icon: string, title: string, text: string) => (
    <View style={styles.emptyState}>
      <Icon name={icon} size={40} color={COLORS.textDisabled} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );

  const renderDashboard = () => {
    const visibleApplicants = applicants[activeFilter] || [];
    const totalMem = stats?.totalMembers || (applicants.all ? applicants.all.length : 0);
    const pendingMem = stats?.pendingApplications ?? (applicants.pending ? applicants.pending.length : 0);
    const approvedMem = stats?.approvedApplications ?? (applicants.approved ? applicants.approved.length : 0);
    const rejectedMem = stats?.rejectedApplications ?? (applicants.rejected ? applicants.rejected.length : 0);

    return (
      <>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Members', totalMem, ACCENTS.indigo, 'groups', () => { setMembersTabFilter('all'); setActiveNav('members'); })}
          {renderStatCard('Pending', pendingMem, ACCENTS.blue, 'schedule', () => { setActiveNav('approvals'); setActiveFilter('pending'); })}
          {renderStatCard('Approved', approvedMem, ACCENTS.green, 'check-circle', () => { setActiveNav('approvals'); setActiveFilter('approved'); })}
          {renderStatCard('Rejected', rejectedMem, ACCENTS.red, 'cancel', () => { setActiveNav('approvals'); setActiveFilter('rejected'); })}
        </View>

        {renderFilterTabs()}

        {visibleApplicants.length > 0
          ? visibleApplicants.map(a => renderApplicantCard(a))
          : renderEmptyState(
              'inbox',
              `No ${activeFilter} applicants`,
              'Applications for this block will appear here.',
            )}
      </>
    );
  };

  const renderApprovals = () => {
    const visibleApplicants = applicants[activeFilter] || [];
    return (
      <>
        {renderFilterTabs()}

        {visibleApplicants.length > 0
          ? visibleApplicants.map(a => renderApplicantCard(a))
          : renderEmptyState(
              'fact-check',
              `No ${activeFilter} applications`,
              'Nothing needs your review right now.',
            )}
      </>
    );
  };

  const renderMembers = () => {
    const members = applicants.approved || [];
    return (
      <>
        {members.length > 0
          ? members.map(a => renderApplicantCard(a, false))
          : renderEmptyState(
              'people-outline',
              'No approved members yet',
              'Members appear here once you approve their applications.',
            )}
      </>
    );
  };

  const renderSettings = () => {
    const totalMem = stats?.totalMembers || applicants.all?.length || 0;
    const pendingCount = stats?.pendingApplications || applicants.pending?.length || 0;
    const approvedCount = stats?.approvedApplications || applicants.approved?.length || 0;
    const rejectedCount = stats?.rejectedApplications || applicants.rejected?.length || 0;

    return (
      <View style={styles.settingsContainer}>
        <View style={styles.settingsCard}>
          <View style={styles.settingsProfileRow}>
            <View style={styles.settingsAvatarCircle}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }}>
                {getInitials(displayedAdminName)}
              </Text>
            </View>
            <View style={styles.settingsProfileTextWrap}>
              <View style={styles.settingsNameBadgeRow}>
                <Text style={styles.settingsProfileName}>{displayedAdminName}</Text>
                <View style={styles.roleBadgePill}>
                  <Text style={styles.roleBadgePillText}>{dynamicRoleTitle}</Text>
                </View>
              </View>

              <View style={styles.settingsMetaLine}>
                <Icon name="email" size={14} color="#64748B" />
                <Text style={styles.settingsMetaLineText}>
                  {adminEmail || 'admin@activ.com'}
                </Text>
              </View>

              <View style={styles.settingsMetaLine}>
                <Icon name="schedule" size={14} color="#64748B" />
                <Text style={styles.settingsMetaLineText}>
                  Block: {currentBlock}, District: {stats?.districtName || 'Ariyalur'}
                </Text>
              </View>

              <View style={styles.activeStatusRow}>
                <Text style={styles.activeStatusLabel}>Active Status</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>
            </View>
          </View>

          {!editModalVisible ? (
            <TouchableOpacity
              style={styles.editProfileBtn}
              activeOpacity={0.8}
              onPress={handleOpenEditModal}
            >
              <Icon name="edit" size={16} color="#FFFFFF" />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 }}>
                Edit {dynamicRoleTitle} Profile
              </Text>

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.fullName}
                onChangeText={val => setEditForm(prev => ({ ...prev, fullName: val }))}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.email}
                onChangeText={val => setEditForm(prev => ({ ...prev, email: val }))}
                placeholder="Email Address"
                keyboardType="email-address"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Block Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.block}
                onChangeText={val => setEditForm(prev => ({ ...prev, block: val }))}
                placeholder="Block Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>District Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.district}
                onChangeText={val => setEditForm(prev => ({ ...prev, district: val }))}
                placeholder="District Name"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  disabled={savingProfile}
                  onPress={handleSaveProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsSectionTitle}>Admin</Text>
          <View style={styles.settingsStatRow}>
            <View style={styles.settingsRowLeft}>
              <Icon name="person" size={18} color="#64748B" />
              <Text style={styles.settingsRowText}>Total Members:</Text>
            </View>
            <Text style={[styles.settingsStatValue, { color: '#2563EB' }]}>{totalMem}</Text>
          </View>

          <View style={styles.settingsStatRow}>
            <View style={styles.settingsRowLeft}>
              <Icon name="schedule" size={18} color="#D97706" />
              <Text style={styles.settingsRowText}>Pending Approvals:</Text>
            </View>
            <Text style={[styles.settingsStatValue, { color: '#D97706' }]}>{pendingCount}</Text>
          </View>

          <View style={styles.settingsStatRow}>
            <View style={styles.settingsRowLeft}>
              <Icon name="check" size={18} color="#16A34A" />
              <Text style={styles.settingsRowText}>Approved:</Text>
            </View>
            <Text style={[styles.settingsStatValue, { color: '#16A34A' }]}>{approvedCount}</Text>
          </View>

          <View style={styles.settingsStatRow}>
            <View style={styles.settingsRowLeft}>
              <Icon name="close" size={18} color="#DC2626" />
              <Text style={styles.settingsRowText}>Rejected:</Text>
            </View>
            <Text style={[styles.settingsStatValue, { color: '#DC2626' }]}>{rejectedCount}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutCardBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutCardBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBody = () => {
    switch (activeNav) {
      case 'approvals':
        return renderApprovals();
      case 'members':
        return renderMembers();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENTS.blue.solid} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const header = HEADER_COPY[activeNav];
  const headerTitle = activeNav === 'dashboard' ? `${currentBlock} Admin Dashboard` : header.title;
  const subtitle =
    activeNav === 'dashboard' && currentBlock
      ? `${header.subtitle} · ${currentBlock}`
      : header.subtitle;

  const adminInitials = getInitials(displayedAdminName) || 'BA';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE.card} />

      {activeNav !== 'members' && (
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.headerAvatar}
            activeOpacity={0.7}
            onPress={() => handleNavPress('settings')}
          >
            <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>
              {adminInitials}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeNav === 'members' ? (
        <BrowseMembersScreen
          key={membersTabFilter}
          navigation={navigation}
          onNavigateToSettings={() => handleNavPress('settings')}
          initialTab={membersTabFilter}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderBody()}
        </ScrollView>
      )}



      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        {BOTTOM_NAV.map(item => {
          const isActive = activeNav === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? ACCENTS.blue.solid : COLORS.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE.border,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE.background,
    marginRight: SPACING.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: ACCENTS.red.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENTS.indigo.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48.5%',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
  },
  statLabel: {
    marginTop: 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  sectionIntro: {
    marginBottom: SPACING.xs,
  },
  sectionIntroTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  sectionIntroText: {
    marginTop: 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: SURFACE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: ACCENTS.blue.solid,
    borderColor: ACCENTS.blue.solid,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  applicantCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  applicantHeaderText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  applicantName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  applicantEmail: {
    marginTop: 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: SPACING.sm,
  },
  statusPillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
  },
  metaHalfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
    paddingRight: SPACING.xs,
  },
  metaLabel: {
    fontSize: FONTS.sizes.sm,
    color: '#64748B',
  },
  metaVal: {
    fontSize: FONTS.sizes.sm,
    color: '#334155',
    fontWeight: FONTS.weights.medium,
  },
  metaFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    gap: 6,
  },
  metaFullText: {
    fontSize: FONTS.sizes.sm,
    color: '#334155',
  },
  attributionRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  attributionText: {
    fontSize: FONTS.sizes.xs,
    color: '#2563EB',
    fontWeight: FONTS.weights.medium,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    gap: 6,
  },
  approveButton: {
    backgroundColor: ACCENTS.green.solid,
  },
  rejectButton: {
    backgroundColor: ACCENTS.red.solid,
  },
  quickActionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semiBold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  emptyText: {
    marginTop: 4,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Settings view (Matching Screenshot 2)
  settingsContainer: {
    gap: SPACING.md,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsProfileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  settingsAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsProfileTextWrap: {
    flex: 1,
  },
  settingsNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  settingsProfileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  roleBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  settingsMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  settingsMetaLineText: {
    fontSize: 13,
    color: '#64748B',
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  activeStatusLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  settingsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsRowText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  settingsStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsStatValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
  },
  logoutCardBtnText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: SURFACE.card,
    borderTopWidth: 1,
    borderTopColor: SURFACE.border,
    paddingVertical: SPACING.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navLabel: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  navLabelActive: {
    color: ACCENTS.blue.solid,
    fontWeight: FONTS.weights.semiBold,
  },
});

export default BlockAdminDashboardScreen;
