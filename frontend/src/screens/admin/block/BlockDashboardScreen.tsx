import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useBlockAdminData } from './context/BlockAdminContext';
import { Applicant } from '../../../types';
import { getInitials } from '../applicantStyles';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) return 'Good Night 🌙';
  if (hour < 12) return 'Good Morning ☀️';
  if (hour < 17) return 'Good Afternoon ☀️';
  return 'Good Evening 🌇';
};

const ACCENTS = {
  purple: '#6366F1',
  lightPurple: '#EEF2FF',
  orange: '#F59E0B',
  lightOrange: '#FEF3C7',
  green: '#10B981',
  lightGreen: '#D1FAE5',
  red: '#EF4444',
  lightRed: '#FEE2E2',
};

const BlockDashboardScreen = ({ navigation }: any) => {
  const { 
    stats, 
    applicants, 
    loading, 
    refreshing, 
    fetchDashboardData, 
    currentBlock, 
    dynamicRoleTitle,
    adminName,
    profileImageUri,
    submitReview,
    pendingActionId
  } = useBlockAdminData();

  const [activeFilter, setActiveFilter] = React.useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const onRefresh = () => fetchDashboardData(true);

  const renderStatCard = (label: string, value: number, color: string, lightColor: string, icon: string) => (
    <View style={styles.statCard}>
      <View style={styles.statHeaderRow}>
        <View style={[styles.statIconWrap, { backgroundColor: lightColor }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {/*
        A trend footer used to sit here: an upward arrow, a literal "0%", and
        " vs last 30 days" - on every tile, for every admin, always. It was not
        computed from anything; no endpoint returns a period-over-period figure.
        An arrow pointing up beside a hard-coded zero reads as a real metric,
        so it is removed rather than left to be believed.
      */}
      {/* Decorative Wave Simulation */}
      <View style={[styles.waveDecoration, { backgroundColor: lightColor, opacity: 0.5 }]} />
    </View>
  );

  const renderFilterTabs = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 4 }}>
      {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
        const isActive = activeFilter === tab;
        const count = tab === 'all' ? (applicants.all?.length || 0) : (applicants[tab]?.length || 0);
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, { flex: 1, paddingHorizontal: 4, marginRight: 0 }, isActive && styles.tabPillActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text 
              style={[styles.tabPillText, { textAlign: 'center', fontSize: 12 }, isActive && styles.tabPillTextActive]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderApplicantCard = (applicant: Applicant) => (
    <TouchableOpacity 
      key={applicant.id} 
      style={styles.applicantCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ApplicantDetail', { applicant })}
    >
      <View style={styles.applicantHeader}>
        <View style={styles.applicantInfoRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(applicant.fullName)}</Text>
          </View>
          <View>
            <Text style={styles.applicantName}>{applicant.fullName}</Text>
            <Text style={styles.applicantEmail}>{applicant.email || 'No email provided'}</Text>
            <Text style={styles.applicantRole}>Role: <Text style={{ color: ACCENTS.purple }}>{applicant.role || 'member'}</Text></Text>
          </View>
        </View>
        
        <View style={[
          styles.statusBadge, 
          applicant.stage === 'pending' ? { backgroundColor: ACCENTS.lightOrange } :
          applicant.stage === 'approved' ? { backgroundColor: ACCENTS.lightGreen } :
          { backgroundColor: ACCENTS.lightRed }
        ]}>
          <Icon 
            name={applicant.stage === 'pending' ? 'schedule' : applicant.stage === 'approved' ? 'check' : 'close'} 
            size={12} 
            color={
              applicant.stage === 'pending' ? ACCENTS.orange :
              applicant.stage === 'approved' ? ACCENTS.green :
              ACCENTS.red
            } 
          />
          <Text style={[
            styles.statusBadgeText,
            applicant.stage === 'pending' ? { color: ACCENTS.orange } :
            applicant.stage === 'approved' ? { color: ACCENTS.green } :
            { color: ACCENTS.red }
          ]}>{applicant.statusLabel}</Text>
        </View>
      </View>

      <View style={styles.applicantMetaRow}>
        <View style={styles.metaItem}>
          <Icon name="place" size={14} color="#64748B" />
          <Text style={styles.metaText}>{applicant.block || currentBlock}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="phone" size={14} color="#64748B" />
          <Text style={styles.metaText}>{applicant.phone}</Text>
        </View>
      </View>

      <View style={styles.applicantDetailsGrid}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Applied on</Text>
          <Text style={styles.detailValue}>{applicant.submittedAt ? new Date(applicant.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Membership Type</Text>
          <Text style={styles.detailValue}>{applicant.memberType || applicant.role || 'Member'}</Text>
        </View>
      </View>

      {applicant.stage === 'pending' && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => submitReview(applicant, 'approve')}
            activeOpacity={0.7}
          >
            <Icon name="check" size={16} color={ACCENTS.green} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => submitReview(applicant, 'reject')}
            activeOpacity={0.7}
          >
            <Icon name="close" size={16} color={ACCENTS.red} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const visibleApplicants = applicants[activeFilter] || [];
  


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>{getGreeting()}</Text>
          <Text style={styles.headerTitle}>{adminName.split(' ')[0]}!</Text>
          <Text style={styles.headerSubtitle}>{currentBlock} Block Admin</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={styles.avatarSmall} />
          ) : (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{getInitials(adminName)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stat Grid */}
        <View style={styles.statsGrid}>
          {/*
            THE FOUR TILES ARE ONE SUM — see the website's `AdminDashboardScreen`.

            `stats?.totalMembers || applicants.all?.length` was the same fault
            in client form: the server's figure meant "approved, unless nothing
            is approved" and the `||` then hid a legitimate 0 behind the list
            length. `totalApplications` is the region's applicants, and the
            three tiles beside it are the buckets they fall into.
          */}
          {renderStatCard('Total Applicants', stats?.totalApplications ?? (applicants.all?.length || 0), ACCENTS.purple, ACCENTS.lightPurple, 'groups')}
          {renderStatCard('Pending Applications', stats?.pendingApplications || applicants.pending?.length || 0, ACCENTS.orange, ACCENTS.lightOrange, 'schedule')}
          {renderStatCard('Approved', stats?.approvedApplications || applicants.approved?.length || 0, ACCENTS.green, ACCENTS.lightGreen, 'check-circle')}
          {renderStatCard('Rejected', stats?.rejectedApplications || applicants.rejected?.length || 0, ACCENTS.red, ACCENTS.lightRed, 'cancel')}
        </View>

        {renderFilterTabs()}

        <View style={styles.listContainer}>
          {visibleApplicants.map(a => renderApplicantCard(a))}
        </View>



      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  welcomeText: { fontSize: 13, color: '#6366F1', fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 2, lineHeight: 34 },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', fontWeight: '400' },
  headerRight: { alignItems: 'center', justifyContent: 'center' },
  notificationBtn: { position: 'relative', padding: 4 },
  notificationDot: {
    position: 'absolute', top: 4, right: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
  },
  avatarSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarSmallText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%',
    minHeight: 130, // Make the cards bigger vertically
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // More rounded corners
    padding: 20, // More padding for a bigger feel
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
  statValue: { fontSize: 28, fontWeight: '800' }, // Bigger numbers
  statLabel: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 8 },
  statFooterRow: { flexDirection: 'row', alignItems: 'center' },
  statSubText: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
  statSubTextLight: { fontSize: 11, color: '#94A3B8' },
  waveDecoration: {
    position: 'absolute',
    bottom: -15, right: -10, left: -10,
    height: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 20,
    transform: [{ rotate: '-5deg' }]
  },

  tabsRow: { flexDirection: 'row', marginBottom: 16 },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabPillTextActive: { color: '#FFFFFF' },

  listContainer: { marginBottom: 24 },
  applicantCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    marginBottom: 16,
  },
  applicantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  applicantInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  applicantName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  applicantEmail: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  applicantRole: { fontSize: 12, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  applicantMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B' },

  applicantDetailsGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginBottom: 16 },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1E293B' },

  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  approveBtn: { backgroundColor: '#D1FAE5' },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  approveBtnText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
  rejectBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  viewAllText: { fontSize: 13, color: '#6366F1', fontWeight: '600' },
  
  activitiesContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  activityIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityTextWrap: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  activityDate: { fontSize: 12, color: '#94A3B8' },
});

export default BlockDashboardScreen;
