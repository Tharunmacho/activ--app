import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MockPayment'>;

const MockPaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { paymentRequestId = `REQ_${Date.now()}`, amount = 2000, planType = 'Aspirant Plan', applicationId } = route.params || {};

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePayment = async (success: boolean) => {
    setIsProcessing(true);
    try {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
      const generatedTxnId = `TEST_TXN_${Date.now()}`;

      if (success) {
        Alert.alert('Payment Successful 🎉', 'Your payment was processed successfully!');
        navigation.replace('PaymentSuccess', {
          orderId: paymentRequestId,
          transactionId: generatedTxnId,
          paymentDate: new Date().toISOString(),
          planType,
          planAmount: amount,
          totalAmount: amount,
          applicationId,
        });
      } else {
        Alert.alert('Payment Failed ❌', 'Payment transaction was cancelled or declined.');
        navigation.replace('ApplicationStatus');
      }
    } catch (error) {
      console.error('Mock payment error:', error);
      Alert.alert('Error', 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      {/* Hero Header Card */}
      <View style={styles.heroPanel}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconBox}>
            <Icon name="business" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>ACTIV Platform</Text>
            <Text style={styles.brandSubtitle}>Test Payment Environment</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
          <Text style={styles.amountValue}>₹{amount.toLocaleString()}.00</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="tag" size={16} color="#99F6E4" />
          <Text style={styles.detailText}>ID: {paymentRequestId}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#99F6E4" />
          <Text style={styles.detailText}>
            Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Mode Card */}
        <View style={styles.testCard}>
          <View style={styles.testIconCircle}>
            <Icon name="security" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.testTitle}>Developer Test Environment</Text>
            <Text style={styles.testSubtitle}>
              Simulate payment responses for testing. No real money will be charged.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.successBtn, isProcessing && { backgroundColor: '#94A3B8' }]}
          onPress={() => handleSimulatePayment(true)}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="check-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.successBtnText}>Complete Payment (Success)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.failBtn, isProcessing && { opacity: 0.6 }]}
          onPress={() => handleSimulatePayment(false)}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          <Icon name="cancel" size={22} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.failBtnText}>Simulate Failure</Text>
        </TouchableOpacity>

        {/* Security Seals */}
        <View style={styles.footerRow}>
          <View style={styles.sealItem}>
            <Icon name="shield" size={14} color="#64748B" />
            <Text style={styles.sealText}>Secure</Text>
          </View>
          <View style={styles.sealItem}>
            <Icon name="lock" size={14} color="#64748B" />
            <Text style={styles.sealText}>Encrypted</Text>
          </View>
          <View style={styles.sealItem}>
            <Icon name="credit-card" size={14} color="#64748B" />
            <Text style={styles.sealText}>PCI Compliant</Text>
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroPanel: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  brandIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#99F6E4',
  },
  amountBox: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#99F6E4',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#CCFBF1',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  testIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  testSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  successBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    ...SHADOWS.md,
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  failBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  failBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  sealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sealText: {
    fontSize: 11,
    color: '#64748B',
  },
});

export default MockPaymentScreen;
