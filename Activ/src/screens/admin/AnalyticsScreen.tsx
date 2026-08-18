import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';

type AnalyticsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Analytics'
>;

interface Props {
  navigation: AnalyticsScreenNavigationProp;
}

interface AnalyticsData {
  userGrowth: {
    labels: string[];
    values: number[];
  };
  applicationTrends: {
    pending: number;
    approved: number;
    rejected: number;
  };
  revenueData: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  topStates: Array<{
    name: string;
    members: number;
    revenue: number;
  }>;
  demographics: {
    age: { [key: string]: number };
    gender: { [key: string]: number };
  };
}

const AnalyticsScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/analytics?period=${selectedPeriod}`);
      // The API returns either `{ success, data }` or the payload directly.
      const payload = response.data?.data || response.data || {};
      setAnalytics({
        userGrowth: {
          labels: payload.userGrowth?.labels || [],
          values: payload.userGrowth?.values || [],
        },
        applicationTrends: {
          pending: Number(payload.applicationTrends?.pending || 0),
          approved: Number(payload.applicationTrends?.approved || 0),
          rejected: Number(payload.applicationTrends?.rejected || 0),
        },
        revenueData: {
          total: Number(payload.revenueData?.total || 0),
          thisMonth: Number(payload.revenueData?.thisMonth || 0),
          lastMonth: Number(payload.revenueData?.lastMonth || 0),
          growth: Number(payload.revenueData?.growth || 0),
        },
        topStates: Array.isArray(payload.topStates) ? payload.topStates : [],
        demographics: {
          age: payload.demographics?.age || {},
          gender: payload.demographics?.gender || {},
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderPeriodButton = (period: 'week' | 'month' | 'year', label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.periodButtonActive,
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderMetricCard = (title: string, value: string, change: number, color: string) => {
    const isPositive = change >= 0;
    return (
      <View style={[styles.metricCard, { borderLeftColor: color }]}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <View style={styles.metricChange}>
          <Text style={[styles.metricChangeText, { color: isPositive ? COLORS.success : COLORS.error }]}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </Text>
          <Text style={styles.metricChangeLabel}>vs last period</Text>
        </View>
      </View>
    );
  };

  const renderApplicationChart = () => {
    if (!analytics) return null;

    const trends = analytics.applicationTrends || { pending: 0, approved: 0, rejected: 0 };
    const pending = Number(trends.pending || 0);
    const approved = Number(trends.approved || 0);
    const rejected = Number(trends.rejected || 0);
    const total = pending + approved + rejected;

    const pendingPercent = (pending / total) * 100 || 0;
    const approvedPercent = (approved / total) * 100 || 0;
    const rejectedPercent = (rejected / total) * 100 || 0;

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Application Trends</Text>
        <View style={styles.chartBar}>
          <View style={[styles.chartSegment, { width: `${approvedPercent}%`, backgroundColor: COLORS.success }]} />
          <View style={[styles.chartSegment, { width: `${pendingPercent}%`, backgroundColor: COLORS.warning }]} />
          <View style={[styles.chartSegment, { width: `${rejectedPercent}%`, backgroundColor: COLORS.error }]} />
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Approved ({approved})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Pending ({pending})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.legendText}>Rejected ({rejected})</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTopStates = () => {
    if (!analytics?.topStates) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Performing States</Text>
        {(analytics.topStates || []).map((state, index) => (
          <View key={index} style={styles.stateItem}>
            <View style={styles.stateRank}>
              <Text style={styles.stateRankText}>{index + 1}</Text>
            </View>
            <View style={styles.stateInfo}>
              <Text style={styles.stateName}>{state?.name || 'Unknown'}</Text>
              <Text style={styles.stateStats}>
                {Number(state?.members || 0)} members • ₹{Number(state?.revenue || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>Performance Insights</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {renderPeriodButton('week', 'Week')}
        {renderPeriodButton('month', 'Month')}
        {renderPeriodButton('year', 'Year')}
      </View>

      {/* Revenue Metrics */}
      {analytics?.revenueData && (
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            {renderMetricCard(
              'Total Revenue',
              `₹${Number(analytics.revenueData?.total || 0).toLocaleString()}`,
              Number(analytics.revenueData?.growth || 0),
              COLORS.primary
            )}
          </View>
          <View style={styles.metricsRow}>
            {renderMetricCard(
              'This Month',
              `₹${Number(analytics.revenueData?.thisMonth || 0).toLocaleString()}`,
              ((Number(analytics.revenueData?.thisMonth || 0) -
                Number(analytics.revenueData?.lastMonth || 0)) /
                Number(analytics.revenueData?.lastMonth || 0)) *
                100 || 0,
              COLORS.success
            )}
            {renderMetricCard(
              'Last Month',
              `₹${Number(analytics.revenueData?.lastMonth || 0).toLocaleString()}`,
              0,
              COLORS.info
            )}
          </View>
        </View>
      )}

      {/* Application Trends Chart */}
      {renderApplicationChart()}

      {/* Top States */}
      {renderTopStates()}

      {/* User Growth Chart (Placeholder for actual chart) */}
      {analytics?.userGrowth && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Growth</Text>
          <View style={styles.growthChart}>
            {(analytics.userGrowth.labels || []).map((label, index) => {
              const values = analytics.userGrowth.values || [];
              // Spreading an empty array into Math.max yields -Infinity, which
              // would render as a "NaN%" height and blow up native layout.
              const peak = values.length > 0 ? Math.max(...values.map(v => Number(v || 0))) : 0;
              const ratio = peak > 0 ? (Number(values[index] || 0) / peak) * 100 : 0;

              return (
                <View key={index} style={styles.growthBar}>
                  <View
                    style={[
                      styles.growthBarFill,
                      {
                        height: `${Math.max(0, Math.min(100, ratio))}%`,
                        backgroundColor: COLORS.primary,
                      },
                    ]}
                  />
                  <Text style={styles.growthLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Demographics */}
      {analytics?.demographics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demographics</Text>
          <View style={styles.demographicsContainer}>
            <View style={styles.demographicSection}>
              <Text style={styles.demographicTitle}>Gender Distribution</Text>
              {Object.entries(analytics.demographics.gender || {}).map(([key, value]) => (
                <View key={key} style={styles.demographicItem}>
                  <Text style={styles.demographicLabel}>{key}</Text>
                  <Text style={styles.demographicValue}>{value}%</Text>
                </View>
              ))}
            </View>
            <View style={styles.demographicSection}>
              <Text style={styles.demographicTitle}>Age Groups</Text>
              {Object.entries(analytics.demographics.age || {}).map(([key, value]) => (
                <View key={key} style={styles.demographicItem}>
                  <Text style={styles.demographicLabel}>{key}</Text>
                  <Text style={styles.demographicValue}>{value}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
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
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: SPACING.md,
    justifyContent: 'center',
  },
  periodButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weights.semiBold,
  },
  periodButtonTextActive: {
    color: COLORS.white,
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
  metricTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricChangeText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    marginRight: SPACING.xs,
  },
  metricChangeLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartBar: {
    flexDirection: 'row',
    height: 30,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  chartSegment: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stateRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stateRankText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  stateInfo: {
    flex: 1,
  },
  stateName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stateStats: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  growthChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingVertical: SPACING.md,
  },
  growthBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  growthBarFill: {
    width: '70%',
    minHeight: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: SPACING.xs,
  },
  growthLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  demographicsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demographicSection: {
    flex: 1,
  },
  demographicTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  demographicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  demographicLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  demographicValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.primary,
  },
});

export default AnalyticsScreen;

