import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SPACING } from '../../theme/theme';
import api from '../../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MemberItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  gender?: string;
  block?: string;
  city?: string;
  district?: string;
  status?: string;
  approvedByText?: string;
}

type FilterKey = 'pending' | 'approved' | 'rejected' | 'all';

interface Props {
  navigation?: any;
  onNavigateToSettings?: () => void;
  isEmbedded?: boolean;
  initialTab?: FilterKey;
  endpoint?: string;
  applicantsData?: any[];
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const BrowseMembersScreen: React.FC<Props> = ({
  navigation,
  onNavigateToSettings,
  isEmbedded = false,
  initialTab = 'all',
  endpoint,
  applicantsData,
}) => {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMembersData = useCallback(async () => {
    try {
      setIsLoading(true);
      let allApplicants = applicantsData || [];
      if (!applicantsData || applicantsData.length === 0) {
        const targetEndpoint = endpoint || '/admin/block/dashboard';
        const res = await api.get(targetEndpoint);
        const payload = res.data?.data || res.data || {};
        allApplicants = payload.applicants?.all || payload.applicants?.approved || [];
      }

      if (allApplicants.length === 0) {
        allApplicants = [
          {
            id: 'demo-1',
            fullName: 'Pradeep',
            email: 'pradeep@gmail.com',
            role: 'member',
            block: 'Ariyalur',
            phone: '9092317264',
            stage: 'approved',
            gender: 'Male',
            approvedByText: 'Approved by Block Admin',
          },
        ];
      }

      const formatted: MemberItem[] = (Array.isArray(allApplicants) ? allApplicants : [])
        .filter((a: any) => a?.stage !== 'upstream' && a?.stage !== 'closed')
        .map((a: any) => {
          const isAspirant =
            a?.memberType === 'aspirant' ||
            a?.registrationType === 'aspirant' ||
            a?.role?.toLowerCase() === 'aspirant' ||
            a?.businessInfo?.doingBusiness === false ||
            a?.doingBusiness === false ||
            a?.data?.businessInfo?.doingBusiness === false ||
            a?.data?.registrationType === 'aspirant';

          const roleText = isAspirant
            ? 'Aspirant'
            : (a?.role && a?.role.toLowerCase() !== 'member'
                ? a.role
                : (a?.registrationType === 'business' || a?.businessInfo?.doingBusiness === true ? 'Business Member' : 'Member'));

          return {
            id: a?.id || a?.applicationId || a?._id || '',
            fullName: a?.fullName || '',
            email: a?.email || '',
            phone: a?.phone || '',
            role: roleText,
            gender: a?.gender || '',
            block: a?.block || a?.district || '',
            city: a?.city,
            district: a?.district,
            status:
              a?.stage === 'approved' || a?.status === 'Approved'
                ? 'Approved'
                : a?.stage === 'rejected' || a?.status === 'Rejected'
                ? 'Rejected'
                : 'Pending',
            approvedByText: a?.approvedByText || undefined,
          };
        });

      setMembers(formatted);
    } catch {
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [applicantsData, endpoint]);

  useEffect(() => {
    loadMembersData();
  }, [loadMembersData]);

  const stats = useMemo(() => {
    const list = members || [];
    return {
      total: list.length,
      approved: list.filter(m => m?.status === 'Approved').length,
      pending: list.filter(m => m?.status === 'Pending').length,
      rejected: list.filter(m => m?.status === 'Rejected').length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    let result = members || [];

    if (activeTab === 'pending') result = result.filter(m => m?.status === 'Pending');
    else if (activeTab === 'approved') result = result.filter(m => m?.status === 'Approved');
    else if (activeTab === 'rejected') result = result.filter(m => m?.status === 'Rejected');

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(
        m =>
          (m?.fullName || '').toLowerCase().includes(q) ||
          (m?.email || '').toLowerCase().includes(q) ||
          (m?.role || '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [members, activeTab, searchQuery]);

  const handleTabChange = useCallback((tab: FilterKey) => {
    setActiveTab(tab);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const getBadgeStyle = (status?: string | null) => {
    if (status === 'Approved') return { bg: '#DCFCE7', color: '#16A34A' };
    if (status === 'Rejected') return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF3C7', color: '#D97706' };
  };

  const renderMember = ({ item }: { item: MemberItem }) => {
    const badge = getBadgeStyle(item.status);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          if (navigation?.navigate) {
            navigation.navigate('ApplicantDetail', { applicant: item });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarCircleText}>
              {((item?.fullName || '?').charAt(0) || '?').toUpperCase()}
            </Text>
          </View>

          <View style={styles.nameWrap}>
            <Text style={styles.memberName}>{item?.fullName || 'Name not provided'}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>
              {item?.status || 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.infoList}>
          {!!(item?.id || '').slice(-6) && (
            <View style={styles.infoHalfRow}>
              <Text style={styles.metaLabelText}>ID: </Text>
              <Text style={styles.metaValText}>
                {(item?.id || '').slice(-6).toUpperCase()}
              </Text>
            </View>
          )}
          {!!item?.email && (
            <View style={styles.infoHalfRow}>
              <Text style={styles.metaValText} numberOfLines={1}>{item.email}</Text>
            </View>
          )}
          {!!item?.role && (
            <View style={styles.infoHalfRow}>
              <Text style={styles.metaLabelText}>Role: </Text>
              <Text style={styles.metaValText}>{item.role}</Text>
            </View>
          )}
          {!!item?.gender && (
            <View style={styles.infoHalfRow}>
              <Text style={styles.metaLabelText}>Gender: </Text>
              <Text style={styles.metaValText}>{item.gender}</Text>
            </View>
          )}
          {!!item?.block && (
            <View style={styles.infoFullRow}>
              <Icon name="location-on" size={15} color="#64748B" />
              <Text style={styles.infoText}>{item.block}</Text>
            </View>
          )}
          {!!item?.phone && (
            <View style={styles.infoFullRow}>
              <Icon name="call" size={15} color="#64748B" />
              <Text style={styles.infoText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {!!item?.approvedByText && item?.status !== 'Pending' && (
          <View style={styles.attributionBox}>
            <Text
              style={[
                styles.attributionText,
                item?.status === 'Rejected' && { color: '#DC2626' },
              ]}
            >
              {item.approvedByText}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Clean Seamless Header */}
      <View style={styles.header}>
        {!isEmbedded && <Text style={styles.title}>Members</Text>}
        <Text style={styles.subtitle}>
          {stats.total} members · {stats.approved} approved · {stats.pending} pending
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchAvatarPlaceholder}>
            <Icon name="person" size={18} color="#94A3B8" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Icon name="search" size={20} color="#94A3B8" />
        </View>

        {/* Filter Tabs Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            let count = stats.total;
            if (tab.key === 'pending') count = stats.pending;
            else if (tab.key === 'approved') count = stats.approved;
            else if (tab.key === 'rejected') count = stats.rejected;

            const label = tab.key === 'all' ? `All (${count})` : `${tab.label} (${count})`;

            let activeBg = '#2563EB';
            if (isActive) {
              if (tab.key === 'approved') activeBg = '#16A34A';
              else if (tab.key === 'rejected') activeBg = '#DC2626';
              else if (tab.key === 'pending') activeBg = '#2563EB';
              else if (tab.key === 'all') activeBg = '#2563EB';
            }

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabPill,
                  isActive && { backgroundColor: activeBg, borderColor: activeBg },
                ]}
                activeOpacity={0.8}
                onPress={() => handleTabChange(tab.key)}
              >
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item, index) => String(item?.id || index)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  searchAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 17,
  },
  nameWrap: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingRight: 20,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  infoHalfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
  },
  metaLabelText: {
    fontSize: 13,
    color: '#64748B',
  },
  metaValText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  infoFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
  attributionBox: {
    marginTop: 10,
    paddingTop: 4,
  },
  attributionText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
});

export default BrowseMembersScreen;
