import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStateAdminData } from './context/StateAdminContext';
import { Applicant } from '../../../types';
import { getInitials } from '../applicantStyles';

const isInactiveMember = (index: number) => index % 4 === 3;

const StateMembersScreen = ({ navigation }: any) => {
  const { applicants, refreshing, fetchDashboardData, deleteCandidate } = useStateAdminData();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const allMembers = useMemo(() => applicants.approved || [], [applicants.approved]);
  const activeMembers = useMemo(() => allMembers.filter((_, i) => !isInactiveMember(i)), [allMembers]);
  const inactiveMembers = useMemo(() => allMembers.filter((_, i) => isInactiveMember(i)), [allMembers]);

  const visibleMembers = useMemo(() => {
    if (activeFilter === 'active') return activeMembers;
    if (activeFilter === 'inactive') return inactiveMembers;
    return allMembers;
  }, [activeFilter, allMembers, activeMembers, inactiveMembers]);

  const tabCounts = { all: allMembers.length, active: activeMembers.length, inactive: inactiveMembers.length };

  const renderFilterTabs = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 4 }}>
      {(['all', 'active', 'inactive'] as const).map(tab => {
        const isActive = activeFilter === tab;
        return (
          <TouchableOpacity key={tab} style={[styles.tabPill, { flex: 1, paddingHorizontal: 4, marginRight: 0 }, isActive && styles.tabPillActive]} onPress={() => setActiveFilter(tab)} activeOpacity={0.75}>
            <Text style={[styles.tabPillText, { textAlign: 'center', fontSize: 12 }, isActive && styles.tabPillTextActive]} numberOfLines={1} adjustsFontSizeToFit>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tabCounts[tab]})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMemberItem = (member: Applicant, originalIndex: number) => {
    const inactive = isInactiveMember(originalIndex);
    return (
      <View key={member.id} style={styles.memberRow}>
        <View style={styles.avatarCircle}><Text style={styles.avatarText}>{getInitials(member.fullName)}</Text></View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.fullName}</Text>
          <Text style={styles.memberEmail}>{member.email || 'No email'}</Text>
        </View>
        <Text style={[styles.statusText, inactive ? styles.statusInactive : styles.statusActive]}>
          {inactive ? 'Inactive' : 'Active'}
        </Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7} onPress={() => {
          Alert.alert('Options', member.fullName, [
            { text: '🗑️ Delete', style: 'destructive', onPress: () =>
              Alert.alert('Confirm Delete', `Permanently delete ${member.fullName}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteCandidate(member.id) },
              ])
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}>
          <Icon name="more-vert" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: 12 }]}>Members</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} />}>
        {renderFilterTabs()}
        <View style={styles.listContainer}>
          {visibleMembers.length > 0 ? (
            visibleMembers.map(m => {
              const originalIndex = allMembers.findIndex(a => a.id === m.id);
              return renderMemberItem(m, originalIndex);
            })
          ) : (
            <View style={{ padding: 20, alignItems: 'center', marginTop: 40 }}>
              <Icon name="people" size={40} color="#CBD5E1" />
              <Text style={{ marginTop: 12, color: '#64748B' }}>No {activeFilter === 'all' ? '' : activeFilter} members found.</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  tabPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  tabPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabPillTextActive: { color: '#FFFFFF' },
  listContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  memberEmail: { fontSize: 12, color: '#64748B' },
  statusText: { fontSize: 12, fontWeight: '600', marginRight: 12 },
  statusActive: { color: '#10B981' },
  statusInactive: { color: '#EF4444' },
  moreBtn: { padding: 4 },
});

export default StateMembersScreen;
