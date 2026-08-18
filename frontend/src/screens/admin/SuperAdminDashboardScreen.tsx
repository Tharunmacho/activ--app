import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';

type SuperAdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SuperAdminDashboard'
>;

interface Props {
  navigation: SuperAdminDashboardScreenNavigationProp;
}

interface SuperAdminStats {
  totalMembers: number;
  totalStates: number;
  totalDistricts: number;
  totalBlocks: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  activeBusinesses: number;
  totalRevenue: number;
  monthlyGrowth: number;
  activeUsers: number;
}

interface StateData {
  id: string;
  name: string;
  members: number;
  districts: number;
  revenue: number;
  growth: number; // percentage
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

const SuperAdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [states, setStates] = useState<StateData[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/super/dashboard');
      const payload = response.data.data || response.data;
      setStats(payload.stats || null);
      setStates(payload.states || []);
      setSystemAlerts(payload.systemAlerts || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderMetricCard = (title: string, value: number | string, subtitle: string, color: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderStateItem = ({ item }: { item: StateData }) => {
    const growthColor = item.growth >= 0 ? COLORS.success : COLORS.error;
    const growthIcon = item.growth >= 0 ? '↑' : '↓';

    return (
      <TouchableOpacity style={styles.stateCard}>
        <View style={styles.stateHeader}>
          <Text style={styles.stateName}>{item.name}</Text>
          <View style={[styles.growthBadge, { backgroundColor: growthColor }]}>
            <Text style={styles.growthText}>
              {growthIcon} {Math.abs(item.growth)}%
            </Text>
          </View>
        </View>
        <View style={styles.stateStats}>
          <View style={styles.stateStat}>
            <Text style={styles.stateStatValue}>{item.members.toLocaleString()}</Text>
            <Text style={styles.stateStatLabel}>Members</Text>
          </View>
          <View style={styles.stateStat}>
            <Text style={styles.stateStatValue}>{item.districts}</Text>
            <Text style={styles.stateStatLabel}>Districts</Text>
          </View>
          <View style={styles.stateStat}>
            <Text style={styles.stateStatValue}>₹{(item.revenue / 1000).toFixed(1)}K</Text>
            <Text style={styles.stateStatLabel}>Revenue</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSystemAlert = ({ item }: { item: SystemAlert }) => {
    const getAlertColor = (type: string) => {
      switch (type) {
        case 'error': return COLORS.error;
        case 'warning': return COLORS.warning;
        case 'info': return COLORS.info;
        default: return COLORS.textSecondary;
      }
    };

    const getAlertIcon = (type: string) => {
      switch (type) {
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return '•';
      }
    };

    return (
      <View style={[styles.alertItem, { borderLeftColor: getAlertColor(item.type) }]}>
        <Text style={styles.alertIcon}>{getAlertIcon(item.type)}</Text>
        <View style={styles.alertContent}>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={styles.alertTime}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Super Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Super Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Complete System Overview</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          {renderMetricCard('Total Members', stats?.totalMembers.toLocaleString() || '0', 'Registered Users', COLORS.primary)}
          {renderMetricCard('Active Users', stats?.activeUsers.toLocaleString() || '0', 'Last 30 Days', COLORS.success)}
        </View>
        <View style={styles.metricsRow}>
          {renderMetricCard('Total Revenue', `₹${(stats?.totalRevenue || 0).toLocaleString()}`, 'All Time', COLORS.secondary)}
          {renderMetricCard('Monthly Growth', `${stats?.monthlyGrowth || 0}%`, 'This Month', stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? COLORS.success : COLORS.error)}
        </View>
      </View>

      {/* System Overview */}
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{stats?.totalStates || 0}</Text>
            <Text style={styles.overviewLabel}>States</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{stats?.totalDistricts || 0}</Text>
            <Text style={styles.overviewLabel}>Districts</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{stats?.totalBlocks || 0}</Text>
            <Text style={styles.overviewLabel}>Blocks</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{stats?.activeBusinesses || 0}</Text>
            <Text style={styles.overviewLabel}>Businesses</Text>
          </View>
        </View>
      </View>

      {/* Application Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application Statistics</Text>
        <View style={styles.applicationStats}>
          <View style={[styles.applicationStatCard, { backgroundColor: COLORS.warning + '20' }]}>
            <Text style={[styles.applicationStatValue, { color: COLORS.warning }]}>
              {stats?.pendingApplications || 0}
            </Text>
            <Text style={styles.applicationStatLabel}>Pending</Text>
          </View>
          <View style={[styles.applicationStatCard, { backgroundColor: COLORS.success + '20' }]}>
            <Text style={[styles.applicationStatValue, { color: COLORS.success }]}>
              {stats?.approvedApplications || 0}
            </Text>
            <Text style={styles.applicationStatLabel}>Approved</Text>
          </View>
          <View style={[styles.applicationStatCard, { backgroundColor: COLORS.error + '20' }]}>
            <Text style={[styles.applicationStatValue, { color: COLORS.error }]}>
              {stats?.rejectedApplications || 0}
            </Text>
            <Text style={styles.applicationStatLabel}>Rejected</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('Analytics' as any)}
          >
            <Text style={styles.actionButtonText}>📊 Global Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
            onPress={() => navigation.navigate('Reports' as any)}
          >
            <Text style={styles.actionButtonText}>📄 System Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.info }]}
            onPress={() => navigation.navigate('UserManagement' as any)}
          >
            <Text style={styles.actionButtonText}>👥 User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.success }]}
            onPress={() => {}}
          >
            <Text style={styles.actionButtonText}>⚙️ System Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Alerts</Text>
          <View style={styles.alertsContainer}>
            {systemAlerts.map(alert => (
              <View key={alert.id}>
                {renderSystemAlert({ item: alert })}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* State Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>State Performance</Text>
        <FlatList
          data={states}
          renderItem={renderStateItem}
          keyExtractor={(item, index) => String(item?.id || (item as any)?._id || index)}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No state data available</Text>
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
  },
  metricsContainer: {
    padding: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginHorizontal: SPACING.xs,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  overviewContainer: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overviewValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  overviewLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  applicationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  applicationStatCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  applicationStatValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.xs,
  },
  applicationStatLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  actionButton: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: 8,
    marginHorizontal: '1%',
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
  },
  alertsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  alertItem: {
    flexDirection: 'row',
    padding: SPACING.sm,
    borderLeftWidth: 4,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  alertIcon: {
    fontSize: FONTS.sizes.lg,
    marginRight: SPACING.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  alertTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  stateCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stateName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  growthBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  growthText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  stateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stateStat: {
    alignItems: 'center',
  },
  stateStatValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  stateStatLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    padding: SPACING.md,
  },
});

export default SuperAdminDashboardScreen;

