// Analytics Screen - Business Card Theme Design System
// Scoped strictly to the ACTIVE company. There is no company switcher here on
// purpose: switching happens once, on the Business dashboard / Manage Companies.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS, resolveMediaUrl } from '../../config/api.config';
import { useActiveCompany, useActiveCompanyStore } from '../../stores/activeCompanyStore';

type AnalyticsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analytics'>;

interface Props {
  navigation: AnalyticsScreenNavigationProp;
}

const EMPTY_STATS = {
  totalProducts: 0,
  featuredProducts: 0,
  activeProducts: 0,
  profileViews: 0,
};

const AnalyticsScreen: React.FC<Props> = ({ navigation }) => {
  const activeCompany = useActiveCompany();
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [stats, setStats] = useState(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

  // Bumped every time the screen regains focus. The data effects below key off
  // it as well as the company id, so returning here after creating, editing or
  // deleting something re-reads from the server instead of showing the copy
  // fetched the first time this company was selected.
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
      loadCompanies();
    }, [loadCompanies])
  );

  useEffect(() => {
    const companyId = activeCompany?._id;
    if (!companyId) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }
    fetchAnalytics(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?._id, focusTick]);

  const fetchAnalytics = async (companyId: string) => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const response = await api.get(ENDPOINTS.PRODUCTS.STATS, {
        params: { companyId },
      });
      const data = response.data?.data || {};
      setStats({
        totalProducts: Number(data.total || 0),
        featuredProducts: Number(data.featured || 0),
        activeProducts: Number(data.active || 0),
        profileViews: Number(data.views || 0),
      });
    } catch (error) {
      console.log('Error fetching analytics stats:', error);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Business Analytics</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Company Header - read only, no switcher on this screen */}
        {activeCompany ? (
          <View style={styles.companySelectorCard}>
            {activeCompany.logo ? (
              <Image source={{ uri: resolveMediaUrl(activeCompany.logo) }} style={styles.companyLogo} />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Icon name="storefront" size={22} color="#7C3AED" />
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectorLabel}>ANALYTICS FOR</Text>
              <Text style={styles.companySelectorTitle}>{activeCompany.businessName || 'Company'}</Text>
              <Text style={styles.companySelectorSub}>
                {activeCompany.businessType || 'Manufacturing'}
                {activeCompany.location ? ` · ${activeCompany.location}` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.companySelectorCard}>
            <View style={styles.companyLogoPlaceholder}>
              <Icon name="storefront" size={22} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectorLabel}>ANALYTICS FOR</Text>
              <Text style={styles.companySelectorTitle}>No active company</Text>
              <Text style={styles.companySelectorSub}>Create a company to see its analytics</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <>
            {/* Metric Cards Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconBoxPurple}>
                  <Icon name="visibility" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.statTitle}>Profile Views</Text>
                <Text style={styles.statValue}>{stats.profileViews}</Text>
                <Text style={styles.statSubText}>This Month</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconBoxGreen}>
                  <Icon name="inventory-2" size={20} color="#10B981" />
                </View>
                <Text style={styles.statTitle}>Catalog Products</Text>
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
                <Text style={styles.statSubText}>Total Listed</Text>
              </View>
            </View>

            {/* Additional Performance Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Icon name="bar-chart" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Catalog Breakdown</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Active Catalog Items</Text>
                <Text style={styles.metricVal}>{stats.activeProducts}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Featured Offerings</Text>
                <Text style={styles.metricVal}>{stats.featuredProducts}</Text>
              </View>
            </View>

            {/* Overview Chart Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Icon name="trending-up" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Traffic & Engagement</Text>
              </View>
              <View style={styles.chartPlaceholder}>
                <Icon name="show-chart" size={48} color="#7C3AED" />
                <Text style={styles.chartText}>Analytics & engagement graphs populate in real-time as buyers visit your catalog.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Bottom Navigation Tab Bar */}
      <View style={styles.bottomNavCard}>
        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('BusinessDashboard')}>
          <Icon name="storefront" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Business</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('ProductsServices', {})}>
          <Icon name="grid-view" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('Discover')}>
          <Icon name="search" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
          <Icon name="bar-chart" size={24} color="#7C3AED" />
          <Text style={styles.navTabActiveText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <Icon name="settings" size={24} color="#6B7280" />
          <Text style={styles.navTabText}>Settings</Text>
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
    padding: 16,
    paddingBottom: 90,
  },

  companySelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  companyLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  companySelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  companySelectorSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconBoxPurple: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBoxGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E1B4B',
    marginVertical: 4,
  },
  statSubText: {
    fontSize: 11,
    color: '#6B7280',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  metricLabel: {
    fontSize: 14,
    color: '#475569',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },

  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F7F7FD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  chartText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
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

export default AnalyticsScreen;
