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
// No SafeAreaView here on purpose: this screen is also rendered *inside*
// BlockAdminDashboardScreen, which already applies the top inset. A second
// wrapper would double-pad the header and break alignment (Rule 4).
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
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const BrowseMembersScreen: React.FC<Props> = ({ navigation, onNavigateToSettings, initialTab = 'all' }) => {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMembersData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/block/dashboard');
      const payload = res.data?.data || res.data || {};
      const allApplicants = payload.applicants?.all || [];

      // Carry through only what the server actually holds. Substituting a
      // placeholder email or phone here would show an admin contact details
      // that belong to nobody.
      const formatted: MemberItem[] = (Array.isArray(allApplicants) ? allApplicants : []).map(
        (a: any) => ({
          id: a?.id || a?.applicationId || a?._id || '',
          fullName: a?.fullName || '',
          email: a?.email || '',
          phone: a?.phone || '',
          role: a?.role || '',
          gender: a?.gender || '',
          block: a?.block || '',
          city: a?.city,
          district: a?.district,
          status:
            a?.stage === 'approved' ? 'Approved' : a?.stage === 'rejected' ? 'Rejected' : 'Pending',
          // Attribution is the server's to decide — it knows which tier acted.
          approvedByText: a?.approvedByText || undefined,
        }),
      );

      setMembers(formatted);
    } catch {
      // Network/parse failures leave the list empty rather than crashing.
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Derived from state rather than mirrored into it: filtering can no longer
  // drift out of sync with `members`, and there is no extra render pass.
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

        {/* Render only the details this member actually has on file. */}
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
              <Icon name="location-on" size={15} color="#000" />
              <Text style={styles.infoText}>{item.block}</Text>
            </View>
          )}
          {!!item?.phone && (
            <View style={styles.infoFullRow}>
              <Icon name="call" size={15} color="#666" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Members</Text>
          <TouchableOpacity
            style={styles.avatarBtn}
            activeOpacity={0.7}
            onPress={onNavigateToSettings}
          >
            <Text style={styles.avatarBtnText}>AA</Text>
          </TouchableOpacity>
        </View>
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

        {/* Filter Tabs Bar (Horizontal Scrollable for 100% Un-truncated Text Visibility) */}
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
              else if (tab.key === 'pending') activeBg = '#D97706';
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
    backgroundColor: '#EEF2FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameWrap: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    color: '#334155',
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
