import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDistrictAdminData } from './context/DistrictAdminContext';
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
  purple: '#6366F1', lightPurple: '#EEF2FF',
  orange: '#F59E0B', lightOrange: '#FEF3C7',
  green: '#10B981', lightGreen: '#D1FAE5',
  red: '#EF4444', lightRed: '#FEE2E2',
};

const DistrictDashboardScreen = ({ navigation }: any) => {
  const {
    stats, applicants, refreshing, fetchDashboardData,
    currentDistrict, adminName, profileImageUri, submitReview,
  } = useDistrictAdminData();

  const [activeFilter, setActiveFilter] = React.useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const renderStatCard = (label: string, value: number, color: string, lightColor: string, icon: string) => (
    <View style={styles.statCard}>
      <View style={styles.statHeaderRow}>
        <View style={[styles.statIconWrap, { backgroundColor: lightColor }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statFooterRow}>
        <Icon name="arrow-upward" size={12} color={color} />
        <Text style={[styles.statSubText, { color }]}>0%</Text>
        <Text style={styles.statSubTextLight}> vs last 30 days</Text>
      </View>
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
            activeOpacity={0.75}
          >
            <Text
              style={[styles.tabPillText, { textAlign: 'center', fontSize: 12 }, isActive && styles.tabPillTextActive]}
              numberOfLines={1} adjustsFontSizeToFit
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
            color={applicant.stage === 'pending' ? ACCENTS.orange : applicant.stage === 'approved' ? ACCENTS.green : ACCENTS.red}
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
          <Text style={styles.metaText}>{applicant.block || applicant.district || currentDistrict}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="phone" size={14} color="#64748B" />
          <Text style={styles.metaText}>{applicant.phone}</Text>
        </View>
      </View>

      <View style={styles.applicantDetailsGrid}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Block</Text>
          <Text style={styles.detailValue}>{applicant.block || '—'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>{applicant.role || 'Member'}</Text>
        </View>
      </View>

      {applicant.stage === 'pending' && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => submitReview(applicant, 'approve')} activeOpacity={0.7}>
            <Icon name="check" size={16} color={ACCENTS.green} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => submitReview(applicant, 'reject')} activeOpacity={0.7}>
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

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>{getGreeting()}</Text>
          <Text style={styles.headerTitle}>{adminName.split(' ')[0]}!</Text>
          <Text style={styles.headerSubtitle}>{currentDistrict} District Admin</Text>
        </View>
        <TouchableOpacity style={styles.headerRight} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={styles.avatarSmall} />
          ) : (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{getInitials(adminName)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} />}>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Members', stats?.totalMembers || applicants.all?.length || 0, ACCENTS.purple, ACCENTS.lightPurple, 'groups')}
          {renderStatCard('Pending', stats?.pendingApplications || applicants.pending?.length || 0, ACCENTS.orange, ACCENTS.lightOrange, 'schedule')}
          {renderStatCard('Approved', stats?.approvedApplications || applicants.approved?.length || 0, ACCENTS.green, ACCENTS.lightGreen, 'check-circle')}
          {renderStatCard('Rejected', stats?.rejectedApplications || applicants.rejected?.length || 0, ACCENTS.red, ACCENTS.lightRed, 'cancel')}
        </View>

        {renderFilterTabs()}

        <View style={styles.listContainer}>
          {visibleApplicants.length > 0 ? visibleApplicants.map(a => renderApplicantCard(a)) : (
            <View style={{ padding: 20, alignItems: 'center', marginTop: 20 }}>
              <Icon name="inbox" size={40} color="#CBD5E1" />
              <Text style={{ marginTop: 12, color: '#64748B' }}>No {activeFilter === 'all' ? '' : activeFilter} applications.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FAFAFA' },
  headerLeft: { flex: 1, paddingRight: 12 },
  welcomeText: { fontSize: 13, color: '#6366F1', fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 2, lineHeight: 34 },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', fontWeight: '400' },
  headerRight: { alignItems: 'center', justifyContent: 'center' },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarSmallText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', minHeight: 130, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, overflow: 'hidden', position: 'relative', justifyContent: 'space-between' },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 8 },
  statFooterRow: { flexDirection: 'row', alignItems: 'center' },
  statSubText: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
  statSubTextLight: { fontSize: 11, color: '#94A3B8' },
  waveDecoration: { position: 'absolute', bottom: -15, right: -10, left: -10, height: 40, borderTopLeftRadius: 30, borderTopRightRadius: 20, transform: [{ rotate: '-5deg' }] },
  tabPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  tabPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabPillTextActive: { color: '#FFFFFF' },
  listContainer: { marginBottom: 24 },
  applicantCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, marginBottom: 16 },
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
});

export default DistrictDashboardScreen;
