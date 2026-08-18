import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Applicant, ApplicantBuckets } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api, { STORAGE_KEYS, getUserData } from '../../services/api';
import { ACCENTS, SURFACE, getInitials } from './applicantStyles';
import ApprovalQueue from '../../components/ApprovalQueue';

/**
 * Shared dashboard shell for the District and State tiers.
 *
 * Deliberately mirrors BlockAdminDashboardScreen's chrome — header with avatar,
 * 2x2 stat grid, approval queue, bottom navigation, inline-editable settings —
 * so all three admin levels feel like one product. Everything *inside* that
 * chrome is tier-specific: each level has its own endpoint, its own review
 * route, its own roll-up tab (Blocks vs Districts) and its own scope line.
 * Nothing block-specific leaks into the district or state views.
 */

export type Tier = 'district' | 'state';

interface Props {
  tier: Tier;
  navigation: any;
  initialNav?: NavKey;
}

type NavKey = 'dashboard' | 'approvals' | 'rollup' | 'settings';

interface RollupRow {
  id: string;
  name: string;
  members: number;
  blocks?: number;
  pendingApplications: number;
  performance?: number;
}

const EMPTY_BUCKETS: ApplicantBuckets = {
  pending: [],
  approved: [],
  rejected: [],
  all: [],
};

/** Everything that differs between the two tiers, in one place. */
const TIER = {
  district: {
    endpoint: '/admin/district/dashboard',
    reviewPath: (id: string) => `/applications/${id}/district-review`,
    levelWord: 'District',
    manageLine: 'Manage District Level',
    rollupKey: 'blocks',
    rollupLabel: 'Blocks',
    rollupIcon: 'apartment',
    rollupTitle: 'Blocks in this district',
    rollupEmpty: 'Blocks appear here once applications arrive from them.',
    approveMessage: 'Application approved and forwarded to the State Admin.',
    rejectFallback: 'Rejected by District Admin',
  },
  state: {
    endpoint: '/admin/state/dashboard',
    reviewPath: (id: string) => `/applications/${id}/state-review`,
    levelWord: 'State',
    manageLine: 'Manage State Level',
    rollupKey: 'districts',
    rollupLabel: 'Districts',
    rollupIcon: 'account-balance',
    rollupTitle: 'Districts in this state',
    rollupEmpty: 'Districts appear here once applications arrive from them.',
    approveMessage: 'Application approved. Member profile created.',
    rejectFallback: 'Rejected by State Admin',
  },
} as const;

const TierAdminDashboard: React.FC<Props> = ({ tier, navigation, initialNav = 'dashboard' }) => {
  const cfg = TIER[tier];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [applicants, setApplicants] = useState<ApplicantBuckets>(EMPTY_BUCKETS);
  const [rollup, setRollup] = useState<RollupRow[]>([]);
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    district: '',
    state: '',
  });

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const response = await api.get(cfg.endpoint);
        const payload = response.data?.data || response.data || {};

        setStats(payload.stats || null);
        setApplicants({ ...EMPTY_BUCKETS, ...(payload.applicants || {}) });

        const rows = payload[cfg.rollupKey];
        setRollup(Array.isArray(rows) ? rows : []);
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to load dashboard data',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cfg.endpoint, cfg.rollupKey],
  );

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

  const districtName = stats?.districtName || '';
  const stateName = stats?.stateName || '';
  const scopeName = tier === 'district' ? districtName : stateName;

  // The scope name often already contains the tier word ("UI Test District"),
  // so don't append it again — "UI Test District District Dashboard" reads badly.
  const roleTitle = `${scopeName || cfg.levelWord} Admin`;
  const displayedAdminName =
    adminName && !/admin$/i.test(adminName) ? adminName : roleTitle;

  const headerCopy: Record<NavKey, { title: string; subtitle: string }> = {
    dashboard: {
      title: `${scopeName || cfg.levelWord} Admin Dashboard`,
      subtitle: scopeName ? `${cfg.manageLine} · ${scopeName}` : cfg.manageLine,
    },
    approvals: { title: 'Approvals', subtitle: `Review ${cfg.levelWord.toLowerCase()}-stage applications` },
    rollup: { title: cfg.rollupLabel, subtitle: cfg.rollupTitle },
    settings: { title: 'Settings', subtitle: `Account & ${cfg.levelWord.toLowerCase()} info` },
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  // Tier-correct review: district approvals forward to the state, state
  // approvals are final and create the member profile.
  const handleReview = useCallback(
    async (applicant: Applicant, action: 'approve' | 'reject', reason?: string) => {
      try {
        await api.post(cfg.reviewPath(applicant?.id || ''), {
          action,
          rejectionReason:
            action === 'reject' ? reason || cfg.rejectFallback : undefined,
        });

        Alert.alert(
          'Success',
          action === 'approve' ? cfg.approveMessage : 'Application rejected.',
        );
        await fetchDashboardData(true);
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.response?.data?.message || `Failed to ${action} application`,
        );
      }
    },
    [cfg, fetchDashboardData],
  );

  const handleOpenEdit = () => {
    setEditForm({
      fullName: displayedAdminName,
      email: adminEmail || '',
      district: districtName,
      state: stateName,
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await api.put('/admin/profile', editForm);
      const updated = res.data?.data || res.data || {};

      if (updated.fullName) setAdminName(updated.fullName);
      if (updated.email) setAdminEmail(updated.email);
      setIsEditing(false);

      Alert.alert('Success', `${roleTitle} profile updated successfully.`);
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update admin profile',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      navigation.navigate('Login');
    }
  };

  const bottomNav: { key: NavKey; label: string; icon: string }[] = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'approvals', label: 'Approvals', icon: 'fact-check' },
      { key: 'rollup', label: cfg.rollupLabel, icon: cfg.rollupIcon },
      { key: 'settings', label: 'Settings', icon: 'settings' },
    ],
    [cfg.rollupLabel, cfg.rollupIcon],
  );

  const renderStatCard = (
    label: string,
    value: number | string,
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

  const renderDashboard = () => {
    const totalMem = Number(stats?.totalMembers || (applicants.all ? applicants.all.length : 0));
    const pendingMem = Number(stats?.pendingApplications ?? (applicants.pending ? applicants.pending.length : 0));
    const approvedMem = Number(stats?.approvedApplications ?? (applicants.approved ? applicants.approved.length : 0));
    const rejectedMem = Number(stats?.rejectedApplications ?? (applicants.rejected ? applicants.rejected.length : 0));

    return (
      <>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Members', totalMem, ACCENTS.indigo, 'groups', () => setActiveNav('rollup'))}
          {renderStatCard('Pending', pendingMem, ACCENTS.blue, 'schedule', () => { setActiveNav('approvals'); setActiveFilter('pending'); })}
          {renderStatCard('Approved', approvedMem, ACCENTS.green, 'check-circle', () => { setActiveNav('approvals'); setActiveFilter('approved'); })}
          {renderStatCard('Rejected', rejectedMem, ACCENTS.red, 'cancel', () => { setActiveNav('approvals'); setActiveFilter('rejected'); })}
        </View>

        <ApprovalQueue
          buckets={applicants}
          level={tier}
          onReview={handleReview}
          onPressApplicant={a => navigation.navigate('ApplicantDetail', { applicant: a })}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </>
    );
  };

  const renderApprovals = () => (
    <ApprovalQueue
      buckets={applicants}
      level={tier}
      onReview={handleReview}
      onPressApplicant={a => navigation.navigate('ApplicantDetail', { applicant: a })}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
    />
  );

  const renderRollup = () => (
    <View style={styles.rollupWrap}>
      {rollup.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name={cfg.rollupIcon} size={40} color={COLORS.textDisabled} />
          <Text style={styles.emptyTitle}>No {cfg.rollupLabel.toLowerCase()} yet</Text>
          <Text style={styles.emptyText}>{cfg.rollupEmpty}</Text>
        </View>
      ) : (
        rollup.map((row, index) => (
          <View key={row?.id || index} style={styles.rollupCard}>
            <View style={styles.rollupHeader}>
              <View style={styles.rollupIconWrap}>
                <Icon name={cfg.rollupIcon} size={18} color={ACCENTS.blue.solid} />
              </View>
              <Text style={styles.rollupName} numberOfLines={1}>
                {row?.name || 'Unassigned'}
              </Text>
              {Number(row?.pendingApplications || 0) > 0 && (
                <View style={styles.rollupBadge}>
                  <Text style={styles.rollupBadgeText}>
                    {Number(row?.pendingApplications || 0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.rollupStats}>
              <View style={styles.rollupStat}>
                <Text style={styles.rollupStatValue}>{Number(row?.members || 0)}</Text>
                <Text style={styles.rollupStatLabel}>Applicants</Text>
              </View>
              <View style={styles.rollupStat}>
                <Text style={styles.rollupStatValue}>
                  {Number(row?.pendingApplications || 0)}
                </Text>
                <Text style={styles.rollupStatLabel}>Pending</Text>
              </View>
              {tier === 'state' && (
                <>
                  <View style={styles.rollupStat}>
                    <Text style={styles.rollupStatValue}>{Number(row?.blocks || 0)}</Text>
                    <Text style={styles.rollupStatLabel}>Blocks</Text>
                  </View>
                  <View style={styles.rollupStat}>
                    <Text style={[styles.rollupStatValue, { color: ACCENTS.green.solid }]}>
                      {Number(row?.performance || 0)}%
                    </Text>
                    <Text style={styles.rollupStatLabel}>Approved</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingsCard}>
        <View style={styles.settingsProfileRow}>
          <View style={styles.settingsAvatarCircle}>
            <Text style={styles.settingsAvatarText}>{getInitials(displayedAdminName)}</Text>
          </View>
          <View style={styles.settingsProfileTextWrap}>
            <View style={styles.settingsNameBadgeRow}>
              <Text style={styles.settingsProfileName} numberOfLines={1}>
                {displayedAdminName}
              </Text>
              <View style={styles.roleBadgePill}>
                <Text style={styles.roleBadgePillText}>{cfg.levelWord} Admin</Text>
              </View>
            </View>

            <View style={styles.settingsMetaLine}>
              <Icon name="email" size={14} color="#64748B" />
              <Text style={styles.settingsMetaLineText} numberOfLines={1}>
                {adminEmail || '—'}
              </Text>
            </View>

            <View style={styles.settingsMetaLine}>
              <Icon name="place" size={14} color="#64748B" />
              <Text style={styles.settingsMetaLineText}>
                {tier === 'district'
                  ? `District: ${districtName || '—'}, State: ${stateName || '—'}`
                  : `State: ${stateName || '—'}`}
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

        {/* Inline expandable edit card, never a native Modal (Rule 2). */}
        {!isEditing ? (
          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.8}
            onPress={handleOpenEdit}
          >
            <Icon name="edit" size={16} color="#FFFFFF" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editWrap}>
            <Text style={styles.editTitle}>Edit {roleTitle} Profile</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.fullName}
              onChangeText={val => setEditForm(prev => ({ ...prev, fullName: val }))}
              placeholder="Full Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={editForm.email}
              onChangeText={val => setEditForm(prev => ({ ...prev, email: val }))}
              placeholder="Email Address"
              keyboardType="email-address"
              placeholderTextColor="#94A3B8"
            />

            {tier === 'district' && (
              <>
                <Text style={styles.fieldLabel}>District Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.district}
                  onChangeText={val => setEditForm(prev => ({ ...prev, district: val }))}
                  placeholder="District Name"
                  placeholderTextColor="#94A3B8"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>State Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.state}
              onChangeText={val => setEditForm(prev => ({ ...prev, state: val }))}
              placeholder="State Name"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
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
        <Text style={styles.settingsSectionTitle}>{cfg.levelWord} Overview</Text>

        {[
          { icon: 'person', color: '#2563EB', label: 'Total Members:', value: Number(stats?.totalMembers || 0) },
          { icon: 'schedule', color: '#D97706', label: 'Pending Approvals:', value: Number(stats?.pendingApplications || 0) },
          { icon: 'check', color: '#16A34A', label: 'Approved:', value: Number(stats?.approvedApplications || 0) },
          { icon: 'close', color: '#DC2626', label: 'Rejected:', value: Number(stats?.rejectedApplications || 0) },
          {
            icon: cfg.rollupIcon,
            color: '#64748B',
            label: `${cfg.rollupLabel}:`,
            value: tier === 'district'
              ? Number(stats?.totalBlocks || 0)
              : Number(stats?.totalDistricts || 0),
          },
        ].map(row => (
          <View key={row.label} style={styles.settingsStatRow}>
            <View style={styles.settingsRowLeft}>
              <Icon name={row.icon} size={18} color={row.color} />
              <Text style={styles.settingsRowText}>{row.label}</Text>
            </View>
            <Text style={[styles.settingsStatValue, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#DC2626" />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBody = () => {
    switch (activeNav) {
      case 'approvals':
        return renderApprovals();
      case 'rollup':
        return renderRollup();
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

  const header = headerCopy[activeNav];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE.card} />

      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {header.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {header.subtitle}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAvatar}
          activeOpacity={0.7}
          onPress={() => setActiveNav('settings')}
        >
          <Text style={styles.headerAvatarText}>
            {getInitials(displayedAdminName) || (tier === 'district' ? 'DA' : 'SA')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderBody()}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        {bottomNav.map(item => {
          const isActive = activeNav === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => setActiveNav(item.key)}
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
  container: { flex: 1, backgroundColor: SURFACE.background },
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
  headerTextWrap: { flex: 1 },
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
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENTS.indigo.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.md,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
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
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold },
  statLabel: {
    marginTop: 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  rollupWrap: { padding: SPACING.md },
  rollupCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: SURFACE.border,
  },
  rollupHeader: { flexDirection: 'row', alignItems: 'center' },
  rollupIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENTS.blue.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rollupName: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  rollupBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: ACCENTS.amber.solid,
    alignItems: 'center',
  },
  rollupBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  rollupStats: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    justifyContent: 'space-between',
  },
  rollupStat: { flex: 1, alignItems: 'center' },
  rollupStatValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  rollupStatLabel: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyTitle: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    marginTop: 4,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settingsContainer: { gap: SPACING.md, padding: SPACING.md },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsProfileRow: { flexDirection: 'row', alignItems: 'flex-start' },
  settingsAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsAvatarText: { color: '#334155', fontWeight: 'bold', fontSize: 18 },
  settingsProfileTextWrap: { flex: 1 },
  settingsNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  settingsProfileName: {
    flex: 1,
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
  roleBadgePillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  settingsMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  settingsMetaLineText: { flex: 1, fontSize: 13, color: '#64748B' },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  activeStatusLabel: { fontSize: 13, color: '#64748B' },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activePillText: { fontSize: 12, fontWeight: 'bold', color: '#16A34A' },
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
  editProfileBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  editWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  editTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  editBtnRow: {
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
  cancelBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  settingsStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsRowText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  settingsStatValue: { fontSize: 15, fontWeight: 'bold' },
  logoutBtn: {
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
  logoutBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 15 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: SURFACE.card,
    borderTopWidth: 1,
    borderTopColor: SURFACE.border,
    paddingVertical: SPACING.sm,
  },
  navItem: { flex: 1, alignItems: 'center' },
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

export default TierAdminDashboard;
