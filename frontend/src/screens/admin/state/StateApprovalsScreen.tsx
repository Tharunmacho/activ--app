import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStateAdminData } from './context/StateAdminContext';
import { Applicant } from '../../../types';
import { getInitials } from '../applicantStyles';

const ACCENTS = {
  purple: '#6366F1', lightPurple: '#EEF2FF',
  orange: '#F59E0B', lightOrange: '#FEF3C7',
  green: '#10B981', lightGreen: '#D1FAE5',
  red: '#EF4444', lightRed: '#FEE2E2',
};

const StateApprovalsScreen = ({ navigation }: any) => {
  const { applicants, submitReview, currentState, refreshing, fetchDashboardData } = useStateAdminData();
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const renderFilterTabs = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 4 }}>
      {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
        const isActive = activeFilter === tab;
        const count = tab === 'all' ? (applicants.all?.length || 0) : (applicants[tab]?.length || 0);
        return (
          <TouchableOpacity key={tab} style={[styles.tabPill, { flex: 1, paddingHorizontal: 4, marginRight: 0 }, isActive && styles.tabPillActive]} onPress={() => setActiveFilter(tab)} activeOpacity={0.75}>
            <Text style={[styles.tabPillText, { textAlign: 'center', fontSize: 12 }, isActive && styles.tabPillTextActive]} numberOfLines={1} adjustsFontSizeToFit>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderApplicantCard = (applicant: Applicant) => (
    <View key={applicant.id} style={styles.applicantCardWrap}>
      <View style={styles.applicantCard}>
        <View style={styles.applicantHeader}>
          <View style={styles.applicantInfoRow}>
            <View style={styles.avatarCircle}><Text style={styles.avatarText}>{getInitials(applicant.fullName)}</Text></View>
            <View>
              <Text style={styles.applicantName}>{applicant.fullName}</Text>
              <Text style={styles.applicantEmail}>{applicant.email || 'No email provided'}</Text>
              <Text style={styles.applicantRole}>Role: <Text style={{ color: ACCENTS.purple }}>{applicant.role || 'member'}</Text></Text>
            </View>
          </View>
          <View style={[styles.statusBadge,
            applicant.stage === 'pending' ? { backgroundColor: ACCENTS.lightOrange } :
            applicant.stage === 'approved' ? { backgroundColor: ACCENTS.lightGreen } : { backgroundColor: ACCENTS.lightRed }]}>
            <Icon name={applicant.stage === 'pending' ? 'schedule' : applicant.stage === 'approved' ? 'check' : 'close'} size={12}
              color={applicant.stage === 'pending' ? ACCENTS.orange : applicant.stage === 'approved' ? ACCENTS.green : ACCENTS.red} />
            <Text style={[styles.statusBadgeText, applicant.stage === 'pending' ? { color: ACCENTS.orange } : applicant.stage === 'approved' ? { color: ACCENTS.green } : { color: ACCENTS.red }]}>
              {applicant.statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.applicantMetaRow}>
          <View style={styles.metaItem}><Icon name="place" size={14} color="#64748B" /><Text style={styles.metaText}>{applicant.district || applicant.block || currentState}</Text></View>
          <View style={styles.metaItem}><Icon name="phone" size={14} color="#64748B" /><Text style={styles.metaText}>{applicant.phone}</Text></View>
        </View>

        {applicant.stage === 'pending' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => submitReview(applicant, 'approve')} activeOpacity={0.7}>
              <Icon name="check" size={16} color={ACCENTS.green} /><Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => submitReview(applicant, 'reject')} activeOpacity={0.7}>
              <Icon name="close" size={16} color={ACCENTS.red} /><Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.viewFullBtn} onPress={() => navigation.navigate('ApplicantDetail', { applicant })}>
          <Text style={styles.viewFullBtnText}>View Full Details</Text>
          <Icon name="chevron-right" size={16} color={ACCENTS.purple} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const visibleApplicants = applicants[activeFilter] || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: 12 }]}>Approvals</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} />}>
        {renderFilterTabs()}
        {visibleApplicants.map(a => renderApplicantCard(a))}
        {visibleApplicants.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Icon name="fact-check" size={48} color="#CBD5E1" />
            <Text style={{ marginTop: 12, color: '#64748B', fontSize: 15 }}>No {activeFilter} applications</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  tabPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  tabPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabPillTextActive: { color: '#FFFFFF' },
  applicantCardWrap: { marginBottom: 24 },
  applicantCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
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
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  approveBtn: { backgroundColor: '#D1FAE5' },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  approveBtnText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
  rejectBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  viewFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginTop: 4 },
  viewFullBtnText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
});

export default StateApprovalsScreen;
