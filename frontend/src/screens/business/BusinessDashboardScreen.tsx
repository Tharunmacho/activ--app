// Business Dashboard Screen - Business Card (#F3E8FF / #7C3AED) Color System
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api, { getUserData } from '../../services/api';
import { ENDPOINTS, resolveMediaUrl } from '../../config/api.config';
import {
  useActiveCompany,
  useActiveCompanyStore,
  ActiveCompany,
} from '../../stores/activeCompanyStore';

type BusinessDashboardProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

type BusinessProfile = ActiveCompany;

const BusinessDashboardScreen: React.FC<BusinessDashboardProps> = ({ navigation }) => {
  // Companies + the active selection live in the shared store, so every other
  // business screen shows this exact company until the user switches here.
  const companies = useActiveCompanyStore((state) => state.companies);
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);
  const businessProfile = useActiveCompany();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [catalogStats, setCatalogStats] = useState({ total: 0, active: 0, featured: 0 });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  // Bumped every time the screen regains focus. The data effects below key off
  // it as well as the company id, so returning here after creating, editing or
  // deleting something re-reads from the server instead of showing the copy
  // fetched the first time this company was selected.
  const [focusTick, setFocusTick] = useState(0);
  const [memberName, setMemberName] = useState('');

  const companiesCount = (companies || []).length;

  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
      loadAllCompanies();
      loadMemberName();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    if (businessProfile?._id) {
      fetchCompanyData(businessProfile._id);
    } else {
      setCatalogStats({ total: 0, active: 0, featured: 0 });
      setRecentActivities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessProfile?._id, focusTick]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // The greeting name is pulled live from the backend (/auth/me) on every
  // focus, so it always reflects the real signed-in member rather than a stale
  // snapshot saved at login. The cached copy is only a fallback for when the
  // request fails (offline / expired session).
  const loadMemberName = async () => {
    let resolved = '';

    try {
      const response = await api.get(ENDPOINTS.AUTH.PROFILE);
      const payload = response.data?.data || response.data || {};
      resolved =
        payload?.details?.fullName ||
        payload?.auth?.fullName ||
        payload?.fullName ||
        '';
    } catch (err) {
      console.warn('Live profile fetch safely caught:', err);
    }

    if (!resolved) {
      try {
        const cached = await getUserData();
        resolved = cached?.fullName || cached?.name || '';
      } catch (err) {
        console.warn('Cached profile read safely caught:', err);
      }
    }

    // The reference design greets the member by first name only.
    const firstName = (resolved || '').trim().split(' ')[0] || '';
    setMemberName(firstName);
  };

  const loadAllCompanies = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      const companiesData = await loadCompanies({ force: forceRefresh });

      if ((companiesData || []).length === 0) {
        Alert.alert(
          'No Business Profile',
          "You haven't registered any company profile yet. Would you like to create one now?",
          [
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Create Profile', onPress: () => navigation.navigate('AddCompany') },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
      Alert.alert('Error', 'Failed to load business profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyData = async (companyId: string) => {
    if (!companyId) return;

    try {
      const statsResponse = await api.get(ENDPOINTS.PRODUCTS.STATS, {
        params: { companyId },
      });

      const stats = statsResponse.data?.data || statsResponse.data || {};
      setCatalogStats({
        total: Number(stats.total || 0),
        active: Number(stats.active || 0),
        featured: Number(stats.featured || 0),
      });

      const activitiesResponse = await api.get(ENDPOINTS.PRODUCTS.ACTIVITIES, {
        params: { companyId, limit: 5 },
      });

      if (activitiesResponse.data && activitiesResponse.data.data) {
        setRecentActivities(activitiesResponse.data.data);
      } else {
        setRecentActivities([]);
      }

    } catch (error: any) {
      console.error('Error fetching company data:', error);
      setCatalogStats({ total: 0, active: 0, featured: 0 });
      setRecentActivities([]);
    }
  };

  // Back always lands on the member (unpaid) dashboard - the first tab of
  // MemberMain - rather than retracing whatever route opened the business
  // area. reset() rebuilds the tab navigator at its initial tab, so a
  // previously-selected tab can't be restored instead.
  const handleGoBack = () => {
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MemberMain' }],
      });
    } catch (err) {
      console.warn('Back navigation safely caught:', err);
    }
  };

  const handleSelectCompany = (company: BusinessProfile) => {
    if (!company?._id) return;
    setActiveCompany(company._id);
    setShowCompanyPicker(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllCompanies(true);
    await loadMemberName();
    if (businessProfile?._id) {
      await fetchCompanyData(businessProfile._id);
    }
    setRefreshing(false);
  };

  const handleDeleteCompany = () => {
    if (!businessProfile) {
      Alert.alert('Error', 'No company selected to delete');
      return;
    }

    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete "${businessProfile.businessName}"? This action cannot be undone and will permanently remove all company data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.delete(ENDPOINTS.BUSINESS.DELETE(businessProfile._id));
              // Drop the deleted company from the shared store so no other
              // screen keeps rendering its data.
              setActiveCompany(null);
              await loadCompanies({ force: true });

              Alert.alert('Success', 'Company deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('ManageCompanies'),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete company.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Top Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleGoBack}
        >
          <Icon name="arrow-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeGreeting} numberOfLines={1}>
            Welcome back, {memberName || 'Member'} 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Manage your commercial presence
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Your Business</Text>

        {/* Card 1: Manage My Companies Bar Card */}
        <TouchableOpacity
          style={styles.manageCompaniesCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ManageCompanies')}
        >
          <View style={styles.manageIconBox}>
            <Icon name="business-center" size={22} color="#7C3AED" />
          </View>

          <View style={styles.manageTextContainer}>
            <Text style={styles.manageTitle}>Manage My Companies</Text>
            <Text style={styles.manageSub}>Switch or edit existing accounts</Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{companiesCount || 1}</Text>
          </View>

          <Icon name="keyboard-arrow-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Card 2: Business Account Card matching Business Banner Card (#F3E8FF) */}
        {businessProfile ? (
          <View style={styles.businessCardContainer}>
            <View style={styles.heroTopRow}>
              <View style={styles.storeLogoBox}>
                {businessProfile.logo ? (
                  <Image
                    source={{ uri: resolveMediaUrl(businessProfile.logo) }}
                    style={styles.storeLogoImage}
                  />
                ) : (
                  <Icon name="storefront" size={30} color="#7C3AED" />
                )}
              </View>

              <View style={styles.heroDetails}>
                <Text style={styles.heroName} numberOfLines={2}>
                  {businessProfile.businessName}
                </Text>
                <Text style={styles.heroType} numberOfLines={1}>
                  {businessProfile.businessType || '—'}
                </Text>

                <View style={styles.heroPhoneRow}>
                  <Icon name="phone" size={14} color="#7C3AED" />
                  <Text style={styles.heroPhone} numberOfLines={1}>
                    {businessProfile.mobileNumber || '-'}
                  </Text>
                </View>
              </View>

              <Image
                source={require('../../assets/images/briefcase_3d_final-removebg-preview.png')}
                style={styles.heroBriefcase}
                resizeMode="contain"
              />
            </View>

            <View style={styles.heroDivider} />

            {/* Action Buttons Row */}
            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.editCardButton}
                onPress={() =>
                  businessProfile?._id &&
                  navigation.navigate('EditCompany', { companyId: businessProfile._id })
                }
                activeOpacity={0.85}
              >
                <Icon name="edit" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.editCardButtonText}>Edit Company</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteCardButton}
                onPress={handleDeleteCompany}
                activeOpacity={0.85}
              >
                <Icon
                  name="delete-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.deleteCardButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <Icon name="storefront" size={54} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Business Profile Found</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('AddCompany')}
              activeOpacity={0.85}
            >
              <Text style={styles.createButtonText}>Create Business Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Catalog overview - every number here comes from /products/stats */}
        <Text style={styles.sectionLabel}>Catalog Overview</Text>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() =>
              businessProfile?._id &&
              navigation.navigate('ProductsServices', { companyId: businessProfile._id })
            }
          >
            <View style={styles.statIconBoxPurple}>
              <Icon name="inventory-2" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.statValue}>{catalogStats.total}</Text>
            <Text style={styles.statTitle}>Products</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={styles.statIconBoxGreen}>
              <Icon name="check-circle" size={18} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{catalogStats.active}</Text>
            <Text style={styles.statTitle}>Live</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconBoxAmber}>
              <Icon name="star" size={18} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{catalogStats.featured}</Text>
            <Text style={styles.statTitle}>Featured</Text>
          </View>
        </View>

        {/* Card 3: Recent Activity Card */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeaderRow}>
            <View style={styles.activityIconBox}>
              <Icon name="history" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.activityHeaderTitle}>Recent Activity</Text>
          </View>

          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItemRow}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityLabel}>{activity.label}</Text>
                  <Text style={styles.activityDesc}>{activity.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivityContainer}>
              <Text style={styles.emptyActivityText}>No recent activity found</Text>
              <Image
                source={require('../../assets/images/clipboard_3d_final-removebg-preview.png')}
                style={styles.emptyActivityGraphic}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
        {/* Bottom Navigation Tab Bar */}
        <View style={styles.bottomNavCard}>
          <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
            <Icon name="storefront" size={24} color="#7C3AED" />
            <Text style={styles.navTabActiveText}>Business</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTabItem}
            activeOpacity={0.7}
            onPress={() =>
              businessProfile?._id &&
              navigation.navigate('ProductsServices', { companyId: businessProfile._id })
            }
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

          <TouchableOpacity
            style={styles.navTabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={24} color="#6B7280" />
            <Text style={styles.navTabText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7FD',
  },

  // Header Section
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F7F7FD',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Welcome Section
  welcomeRow: {
    marginBottom: 20,
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // Card 1: Manage My Companies
  manageCompaniesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  manageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  manageTextContainer: {
    flex: 1,
  },
  manageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  manageSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  countBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Card 2: Business Card matching Dashboard (#F3E8FF background)
  businessCardContainer: {
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogoBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storeLogoImage: {
    width: '100%',
    height: '100%',
  },
  heroDetails: {
    flex: 1,
  },
  heroName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },
  heroType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },
  heroPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  heroPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    marginLeft: 5,
  },
  heroBriefcase: {
    width: 110,
    height: 100,
    marginLeft: 4,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#E9D5FF',
    marginVertical: 16,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  switchCardButton: {
    flex: 1.3,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchCardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  editCardButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  editCardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteCardButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  statIconBoxPurple: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconBoxGreen: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconBoxAmber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1B4B',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },


  // Recent Activity Card
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  activityItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginTop: 6,
    marginRight: 10,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  activityDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyActivityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  emptyActivityText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    paddingRight: 8,
  },
  emptyActivityGraphic: {
    width: 72,
    height: 64,
  },

  // Empty State
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 18,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
    marginVertical: 14,
  },
  createButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Floating Bottom Navigation Tab Bar matching Dashboard
  bottomNavCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemSelected: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  modalItemSub: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default BusinessDashboardScreen;
