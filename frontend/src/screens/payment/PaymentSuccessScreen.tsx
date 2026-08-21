import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentSuccess'>;

const PaymentSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const params = route.params || {};

  const membershipId = params.orderId || `ACTIV-2024-${String(Math.floor(Math.random() * 899999 + 100000))}`;
  const memberName = params.memberName || 'Member';
  const planType = params.planType || 'Membership Plan';
  const totalAmount = params.totalAmount || params.planAmount || 2000;
  const transactionId = params.transactionId || `TXN_${Date.now()}`;
  const paymentDate = params.paymentDate
    ? new Date(params.paymentDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const handleDownloadReceipt = () => {
    const receiptText = `
ACTIV MEMBERSHIP RECEIPT
==============================
Membership ID: ${membershipId}
Member Name: ${memberName}
Plan Type: ${planType}
Amount Paid: ₹${totalAmount}
Transaction ID: ${transactionId}
Payment Date: ${paymentDate}
Status: COMPLETED
Validity: 1 Year

Thank you for joining ACTIV!
==============================
    `.trim();

    Alert.alert('Payment Receipt', receiptText, [
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const handleDownloadCertificate = () => {
    Alert.alert(
      'Digital Certificate',
      'Your ACTIV Membership Certificate has been generated and queued for download.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Seamless Top Bar Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Confirmation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dribbble Style Hero Celebration Header */}
        <View style={styles.successHeroCard}>
          <View style={styles.heroGlowCircle}>
            <View style={styles.heroIconCircle}>
              <Icon name="check-circle" size={54} color="#10B981" />
            </View>
          </View>

          <View style={styles.verifiedBadge}>
            <Icon name="verified" size={14} color="#059669" />
            <Text style={styles.verifiedBadgeText}>PAYMENT CONFIRMED</Text>
          </View>

          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Welcome to ACTIV! Your membership is officially active.
          </Text>

          {/* Amount Callout Pill */}
          <View style={styles.heroAmountCard}>
            <Text style={styles.heroAmountLabel}>Total Paid</Text>
            <Text style={styles.heroAmountValue}>₹{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Dribbble Membership Receipt Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="card-membership" size={20} color="#2563EB" />
              <Text style={styles.cardHeaderTitle}>Membership Details</Text>
            </View>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {/* Grid Row 1 */}
            <View style={styles.gridRow}>
              <View style={styles.metricBox}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="badge" size={16} color="#2563EB" />
                </View>
                <Text style={styles.metricLabel}>MEMBERSHIP ID</Text>
                <Text style={styles.metricValue}>{membershipId}</Text>
              </View>

              <View style={styles.metricBox}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Icon name="person" size={16} color="#10B981" />
                </View>
                <Text style={styles.metricLabel}>MEMBER NAME</Text>
                <Text style={styles.metricValue}>{memberName}</Text>
              </View>
            </View>

            {/* Grid Row 2 */}
            <View style={styles.gridRow}>
              <View style={styles.metricBox}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#F3E8FF' }]}>
                  <Icon name="workspace-premium" size={16} color="#8B5CF6" />
                </View>
                <Text style={styles.metricLabel}>PLAN TYPE</Text>
                <Text style={styles.metricValue}>{planType}</Text>
              </View>

              <View style={styles.metricBox}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="event-available" size={16} color="#D97706" />
                </View>
                <Text style={styles.metricLabel}>VALIDITY</Text>
                <Text style={styles.metricValue}>1 Year</Text>
              </View>
            </View>

            {/* Transaction Ref Box */}
            <View style={styles.txnBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name="receipt" size={14} color="#64748B" />
                <Text style={styles.txnLabel}>TRANSACTION REFERENCE</Text>
              </View>
              <Text style={styles.txnValue}>{transactionId}</Text>
              <Text style={styles.txnDate}>Paid on {paymentDate}</Text>
            </View>
          </View>
        </View>

        {/* Downloads Section */}
        <View style={styles.downloadsSection}>
          <Text style={styles.sectionHeading}>Member Documents</Text>
          <View style={styles.downloadGrid}>
            <TouchableOpacity
              style={styles.docCard}
              onPress={handleDownloadCertificate}
              activeOpacity={0.8}
            >
              <View style={[styles.docIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="workspace-premium" size={26} color="#4F46E5" />
              </View>
              <Text style={styles.docTitle}>Membership Certificate</Text>
              <Text style={styles.docSubtext}>Digital PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.docCard}
              onPress={handleDownloadReceipt}
              activeOpacity={0.8}
            >
              <View style={[styles.docIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="receipt-long" size={26} color="#059669" />
              </View>
              <Text style={styles.docTitle}>Payment Receipt</Text>
              <Text style={styles.docSubtext}>Tax Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation Info Note */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Icon name="mark-email-read" size={20} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Confirmation Sent</Text>
            <Text style={styles.infoText}>
              Receipt & login credentials sent to your Email & WhatsApp.
            </Text>
          </View>
        </View>

        {/* Dashboard CTA Button */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.replace('PaidDashboard')}
          activeOpacity={0.85}
        >
          <Icon name="dashboard" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.dashboardBtnText}>Go to Member Dashboard</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  successHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  heroGlowCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroAmountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  heroAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  heroAmountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  txnBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  txnValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  txnDate: {
    fontSize: 11,
    color: '#64748B',
  },
  downloadsSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  downloadGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  docCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  docSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  infoText: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 16,
  },
  dashboardBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  dashboardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaymentSuccessScreen;
