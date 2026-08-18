// Business Settings Screen - Business Card (#F3E8FF / #7C3AED) Color System
//
// Everything here maps to a real capability of a business account:
// the company record itself, its public listing, its catalog, and the session.
// No placeholder rows - a row exists only if tapping it does something.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Switch,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../stores/exampleStore';
import {
  useActiveCompany,
  useActiveCompanyStore,
} from '../../stores/activeCompanyStore';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

type StatusTone = {
  label: string;
  background: string;
  color: string;
  icon: string;
};

// The company record carries `status` (pending until an admin activates it).
const STATUS_TONES: Record<string, StatusTone> = {
  active: { label: 'Active', background: '#DCFCE7', color: '#15803D', icon: 'verified' },
  pending: { label: 'Pending Approval', background: '#FEF3C7', color: '#B45309', icon: 'schedule' },
  inactive: { label: 'Inactive', background: '#FEE2E2', color: '#B91C1C', icon: 'block' },
};

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { logout } = useAuthStore();
  const activeCompany = useActiveCompany();
  const companies = useActiveCompanyStore((state) => state.companies);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);

  const [isListed, setIsListed] = useState(true);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [catalogStats, setCatalogStats] = useState({ total: 0, active: 0, featured: 0 });
  // Bumped every time the screen regains focus. The data effects below key off
  // it as well as the company id, so returning here after creating, editing or
  // deleting something re-reads from the server instead of showing the copy
  // fetched the first time this company was selected.
  const [focusTick, setFocusTick] = useState(0);

  const companyName = activeCompany?.businessName || '';
  const companyId = activeCompany?._id || '';
  const companiesCount = (companies || []).length;
  const statusTone =
    STATUS_TONES[(activeCompany?.status || 'pending').toLowerCase()] || STATUS_TONES.pending;

  // Settings can be opened straight from the tab bar, so the store may not have
  // been populated by the dashboard yet.
  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
      loadCompanies().catch((err) => console.warn('Company load safely caught:', err));
    }, [loadCompanies])
  );

  useEffect(() => {
    setIsListed(activeCompany?.isActive !== false);
  }, [activeCompany?._id, activeCompany?.isActive]);

  // A settings screen that can't tell you whether your catalog is empty is
  // just a menu, so pull the same counts the dashboard shows.
  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      if (!companyId) {
        setCatalogStats({ total: 0, active: 0, featured: 0 });
        return;
      }
      try {
        const res = await api.get(ENDPOINTS.PRODUCTS.STATS, { params: { companyId } });
        const payload = res.data?.data || res.data || {};
        if (cancelled) return;
        setCatalogStats({
          total: Number(payload.total || 0),
          active: Number(payload.active || 0),
          featured: Number(payload.featured || 0),
        });
      } catch (err) {
        console.warn('Catalog stats safely caught:', err);
        if (!cancelled) setCatalogStats({ total: 0, active: 0, featured: 0 });
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [companyId, focusTick]);

  // Every company-scoped action needs a company to act on. Rather than
  // navigating to a screen that would render empty, say so and offer the fix.
  const requireCompany = (run: () => void) => {
    if (!companyId) {
      Alert.alert('No Active Company', 'Select or create a company first, then try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Manage Companies', onPress: () => navigation.navigate('ManageCompanies') },
      ]);
      return;
    }
    run();
  };

  // Directory visibility - drives whether other members find this company in
  // Discover. Optimistic, reverted if the write fails.
  const handleToggleListing = async (next: boolean) => {
    if (!companyId) {
      requireCompany(() => {});
      return;
    }

    setIsListed(next);
    setIsSavingListing(true);

    try {
      await api.put(ENDPOINTS.BUSINESS.UPDATE(companyId), { isActive: next });
      await loadCompanies({ force: true });
    } catch (error: any) {
      setIsListed(!next);
      Alert.alert(
        'Could Not Update Listing',
        error?.response?.data?.message || 'Please check your connection and try again.'
      );
    } finally {
      setIsSavingListing(false);
    }
  };

  const handleShareCompany = async () => {
    if (!activeCompany) {
      requireCompany(() => {});
      return;
    }

    const lines = [
      activeCompany.businessName || '',
      activeCompany.businessType || '',
      activeCompany.mobileNumber ? `Phone: ${activeCompany.mobileNumber}` : '',
      activeCompany.email ? `Email: ${activeCompany.email}` : '',
      [activeCompany.area, activeCompany.location].filter(Boolean).join(', '),
      activeCompany.description || '',
    ].filter(Boolean);

    try {
      await Share.share({
        title: activeCompany.businessName || 'Business Details',
        message: lines.join('\n'),
      });
    } catch (err) {
      console.warn('Share safely caught:', err);
    }
  };

  const handleDeleteCompany = () => {
    requireCompany(() => {
      Alert.alert(
        'Delete Company',
        `Permanently delete "${companyName}"? Its products and listing are removed with it. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.delete(ENDPOINTS.BUSINESS.DELETE(companyId));
                setActiveCompany(null);
                await loadCompanies({ force: true });
                Alert.alert('Deleted', 'Company removed successfully.', [
                  { text: 'OK', onPress: () => navigation.navigate('ManageCompanies') },
                ]);
              } catch (error: any) {
                Alert.alert(
                  'Error',
                  error?.response?.data?.message || 'Failed to delete company.'
                );
              }
            },
          },
        ]
      );
    });
  };

  // Leaves the business area but keeps the session - not a logout.
  const handleExitBusiness = () => {
    Alert.alert('Exit Business Account', 'Switch back to the main member dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit to Dashboard',
        onPress: () => {
          try {
            navigation.reset({ index: 0, routes: [{ name: 'MemberMain' as any }] });
          } catch (err) {
            console.warn('Exit navigation safely caught:', err);
          }
        },
      },
    ]);
  };

  // Ends the session for real.
  const handleLogout = () => {
    Alert.alert('Log Out', 'You will need to sign in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
          } catch (err) {
            console.warn('Logout safely caught:', err);
          }
        },
      },
    ]);
  };

  const renderRow = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    isLast?: boolean
  ) => (
    <TouchableOpacity
      style={isLast ? styles.settingRowLast : styles.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconBox}>
        <Icon name={icon} size={20} color="#7C3AED" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Business Settings</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Which company every setting below applies to */}
        <View style={styles.contextCard}>
          <View style={styles.contextTopRow}>
            <View style={styles.contextIconBox}>
              <Icon name="storefront" size={22} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contextLabel}>Active Company</Text>
              <Text style={styles.contextValue} numberOfLines={1}>
                {companyName || 'None selected'}
              </Text>
              <Text style={styles.contextMeta} numberOfLines={1}>
                {activeCompany?.businessType || 'Business'}
                {activeCompany?.location ? ` · ${activeCompany.location}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.contextBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusTone.background }]}>
              <Icon name={statusTone.icon} size={13} color={statusTone.color} />
              <Text style={[styles.statusBadgeText, { color: statusTone.color }]}>
                {statusTone.label}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Icon name="business" size={13} color="#7C3AED" />
              <Text style={styles.countBadgeText}>
                {companiesCount} {companiesCount === 1 ? 'company' : 'companies'}
              </Text>
            </View>
          </View>
        </View>

        {/* Company record */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Company Profile</Text>

          {renderRow(
            'edit',
            'Edit Company Profile',
            'Name, type, contact, location and logo',
            () => requireCompany(() => navigation.navigate('EditCompany', { companyId }))
          )}

          {renderRow(
            'swap-horiz',
            'Manage Companies',
            'Switch between or review your business accounts',
            () => navigation.navigate('ManageCompanies')
          )}

          {renderRow(
            'add-business',
            'Add New Company',
            'Register another business under your membership',
            () => navigation.navigate('AddCompany')
          )}

          {renderRow(
            'ios-share',
            'Share Business Details',
            'Send name, contact and location to a buyer',
            handleShareCompany,
            true
          )}
        </View>

        {/* Catalog */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Catalog</Text>

          <View style={styles.statStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{catalogStats.total}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{catalogStats.active}</Text>
              <Text style={styles.statLabel}>Live</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{catalogStats.featured}</Text>
              <Text style={styles.statLabel}>Featured</Text>
            </View>
          </View>

          {renderRow(
            'inventory-2',
            'Products & Services',
            'Review, edit or remove your catalog items',
            () => requireCompany(() => navigation.navigate('ProductsServices', { companyId }))
          )}

          {renderRow(
            'add-circle-outline',
            'Add Product or Service',
            'Publish a new item with photo, price and stock',
            () => requireCompany(() => navigation.navigate('AddProduct', { companyId })),
            true
          )}
        </View>

        {/* Directory presence */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Directory & Reach</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Icon name="travel-explore" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>List in Discover</Text>
              <Text style={styles.settingSub}>
                {isListed
                  ? 'Other members can find this company and its products'
                  : 'Hidden from search across the member network'}
              </Text>
            </View>
            {isSavingListing ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Switch
                value={isListed}
                onValueChange={handleToggleListing}
                trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                thumbColor={isListed ? '#7C3AED' : '#F1F5F9'}
              />
            )}
          </View>

          {renderRow(
            'search',
            'Browse the Network',
            'Search companies and products across members',
            () => navigation.navigate('Discover')
          )}

          {renderRow(
            'bar-chart',
            'Analytics',
            'Profile views and catalog performance',
            () => navigation.navigate('Analytics'),
            true
          )}
        </View>

        {/* Session */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Session</Text>

          {renderRow(
            'dashboard',
            'Exit to Member Dashboard',
            'Leave the business area, stay signed in',
            handleExitBusiness,
            true
          )}
        </View>

        {/* Irreversible actions, kept apart from everything else */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerHeaderTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDeleteCompany}
            activeOpacity={0.7}
          >
            <View style={styles.dangerIconBox}>
              <Icon name="delete-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Delete This Company</Text>
              <Text style={styles.settingSub}>
                Removes {companyName || 'the company'} and its catalog permanently
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="#FCA5A5" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Icon name="logout" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Bottom Navigation Tab Bar */}
      <View style={styles.bottomNavCard}>
        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('BusinessDashboard')}
        >
          <Icon name="storefront" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Business</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductsServices', {})}
        >
          <Icon name="grid-view" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Discover')}
        >
          <Icon name="search" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Analytics')}
        >
          <Icon name="bar-chart" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
          <Icon name="settings" size={24} color="#7C3AED" />
          <Text style={styles.navTabActiveText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7FD',
  },
  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F7F7FD',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Active company context
  contextCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
  },
  contextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.8,
  },
  contextValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
    marginTop: 2,
  },
  contextMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contextBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Setting groups
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E9D5FF',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  settingRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  settingSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    paddingRight: 8,
  },

  // Danger zone
  dangerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  dangerHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dangerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.2,
    borderColor: '#FECDD3',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },

  bottomNavCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  navTabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  navTabActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 2,
  },
});

export default SettingsScreen;
