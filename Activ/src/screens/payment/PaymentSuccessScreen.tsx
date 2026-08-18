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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Payment Confirmation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Celebration Banner */}
        <View style={styles.successHero}>
          <View style={styles.iconBadgeCircle}>
            <Icon name="check-circle" size={60} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Welcome to ACTIV – Your membership is now active
          </Text>
        </View>

        {/* Membership Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Membership Details</Text>
            <View style={styles.activePill}>
              <Icon name="check" size={12} color="#FFFFFF" />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>MEMBERSHIP ID</Text>
                <Text style={styles.gridValue}>{membershipId}</Text>
              </View>

              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>MEMBER NAME</Text>
                <Text style={styles.gridValue}>{memberName}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>PLAN TYPE</Text>
                <Text style={styles.gridValue}>{planType}</Text>
              </View>

              <View style={[styles.gridCell, styles.amountHighlightBox]}>
                <Text style={styles.amountLabel}>AMOUNT PAID</Text>
                <Text style={styles.amountValue}>₹{totalAmount.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>VALIDITY</Text>
                <Text style={styles.gridValue}>1 Year</Text>
              </View>

              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>PAYMENT DATE</Text>
                <Text style={styles.gridValue}>{paymentDate}</Text>
              </View>
            </View>

            <View style={styles.refBox}>
              <Text style={styles.refLabel}>TRANSACTION REFERENCE</Text>
              <Text style={styles.refValue}>{transactionId}</Text>
            </View>
          </View>
        </View>

        {/* Document Download Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Download Documents</Text>
          </View>

          <View style={styles.downloadGrid}>
            <TouchableOpacity style={styles.docBtn} onPress={handleDownloadCertificate}>
              <Icon name="description" size={32} color="#2563EB" />
              <Text style={styles.docBtnText}>Download Certificate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.docBtn} onPress={handleDownloadReceipt}>
              <Icon name="file-download" size={32} color="#059669" />
              <Text style={styles.docBtnText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation Info Box */}
        <View style={styles.infoCard}>
          <Icon name="info" size={24} color="#0284C7" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Confirmation Sent</Text>
            <Text style={styles.infoText}>
              Confirmation details have been sent to your registered Email and WhatsApp number.
            </Text>
          </View>
        </View>

        {/* Go to Dashboard Button */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.replace('PaidDashboard')}
          activeOpacity={0.85}
        >
          <Icon name="home" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  successHero: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  iconBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCell: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountHighlightBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  refBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  refValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'monospace',
  },
  downloadGrid: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  docBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
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
    borderRadius: 14,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  dashboardBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaymentSuccessScreen;
