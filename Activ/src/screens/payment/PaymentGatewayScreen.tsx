import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import api from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentGateway'>;

const PaymentGatewayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { planType = 'Membership Plan', planAmount = 2000, totalAmount = 2000, applicationId } = route.params || {};

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const handlePaymentSubmit = async () => {
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardName || !expiryDate || !cvv) {
        Alert.alert('Required Fields', 'Please fill in all card details.');
        return;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert('Invalid Input', 'Please enter a valid 16-digit card number.');
        return;
      }
    } else if (paymentMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. user@upi).');
        return;
      }
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) {
        Alert.alert('Bank Required', 'Please select your bank for Net Banking.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const generatedTxnId = `TXN_${Date.now()}`;
      const generatedPaymentId = `PAY_${Date.now()}`;

      // Call backend to record payment completion
      try {
        await api.post('/payment/complete', {
          paymentId: generatedPaymentId,
          paymentMethod,
          transactionId: generatedTxnId,
          status: 'completed',
          applicationId,
        });
      } catch (backendError) {
        console.log('Backend sync warning:', backendError);
      }

      // Navigate to Mock payment test simulator or success screen
      navigation.navigate('MockPayment', {
        paymentRequestId: generatedPaymentId,
        amount: totalAmount,
        planType,
        applicationId,
      });
    } catch (error: any) {
      console.error('Payment gateway error:', error);
      Alert.alert('Payment Error', error.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const popularBanks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Punjab National Bank',
    'Bank of Baroda',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Secure Payment Gateway</Text>
          <Text style={styles.headerSubtitle}>Complete your payment safely</Text>
        </View>
        <View style={styles.securityBadge}>
          <Icon name="lock" size={14} color="#059669" />
          <Text style={styles.securityText}>256-Bit SSL</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Summary Banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Payable</Text>
              <Text style={styles.summaryAmount}>₹{totalAmount.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planName}>{planType}</Text>
              <Text style={styles.taxLabel}>Taxes Included</Text>
            </View>
          </View>
        </View>

        {/* Payment Method Selector */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[styles.methodTab, paymentMethod === 'card' && styles.methodTabActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Icon
              name="credit-card"
              size={22}
              color={paymentMethod === 'card' ? '#2563EB' : '#64748B'}
            />
            <Text style={[styles.methodTabText, paymentMethod === 'card' && styles.methodTabTextActive]}>
              Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodTab, paymentMethod === 'upi' && styles.methodTabActive]}
            onPress={() => setPaymentMethod('upi')}
          >
            <Icon
              name="qr-code-scanner"
              size={22}
              color={paymentMethod === 'upi' ? '#2563EB' : '#64748B'}
            />
            <Text style={[styles.methodTabText, paymentMethod === 'upi' && styles.methodTabTextActive]}>
              UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodTab, paymentMethod === 'netbanking' && styles.methodTabActive]}
            onPress={() => setPaymentMethod('netbanking')}
          >
            <Icon
              name="account-balance"
              size={22}
              color={paymentMethod === 'netbanking' ? '#2563EB' : '#64748B'}
            />
            <Text style={[styles.methodTabText, paymentMethod === 'netbanking' && styles.methodTabTextActive]}>
              Net Banking
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Form */}
        {paymentMethod === 'card' && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Card Number</Text>
            <View style={styles.inputBox}>
              <Icon name="credit-card" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={t => setCardNumber(formatCardNumber(t))}
              />
            </View>

            <Text style={styles.formLabel}>Cardholder Name</Text>
            <View style={styles.inputBox}>
              <Icon name="person" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="NAME ON CARD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={cardName}
                onChangeText={setCardName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Expiry Date</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="MM/YY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={5}
                    value={expiryDate}
                    onChangeText={t => setExpiryDate(formatExpiry(t))}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>CVV</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="123"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={3}
                    value={cvv}
                    onChangeText={t => setCvv(t.replace(/\D/g, ''))}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* UPI Form */}
        {paymentMethod === 'upi' && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Virtual Payment Address (UPI ID)</Text>
            <View style={styles.inputBox}>
              <Icon name="alternate-email" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="username@upi"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={upiId}
                onChangeText={setUpiId}
              />
            </View>

            <View style={styles.infoNoteBox}>
              <Icon name="info" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <Text style={styles.infoNoteText}>
                You will receive a payment prompt on your UPI app (Google Pay, PhonePe, Paytm). Approve it to complete.
              </Text>
            </View>
          </View>
        )}

        {/* Net Banking Form */}
        {paymentMethod === 'netbanking' && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Select Your Bank</Text>
            {popularBanks.map(bank => (
              <TouchableOpacity
                key={bank}
                style={[
                  styles.bankItem,
                  selectedBank === bank && styles.bankItemActive,
                ]}
                onPress={() => setSelectedBank(bank)}
              >
                <Icon
                  name={selectedBank === bank ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={selectedBank === bank ? '#2563EB' : '#94A3B8'}
                />
                <Text style={[styles.bankName, selectedBank === bank && styles.bankNameActive]}>
                  {bank}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Encryption Notice */}
        <View style={styles.securityNotice}>
          <Icon name="verified-user" size={20} color="#10B981" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.noticeTitle}>PCI-DSS Compliant Encryption</Text>
            <Text style={styles.noticeText}>
              Your sensitive financial details are encrypted and processed securely.
            </Text>
          </View>
        </View>

        {/* Submit Buttons */}
        <TouchableOpacity
          style={[styles.paySubmitBtn, isProcessing && { backgroundColor: '#94A3B8' }]}
          onPress={handlePaymentSubmit}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.paySubmitText}>Pay ₹{totalAmount.toLocaleString()}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.cancelBtnText}>Cancel Payment</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  summaryBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  taxLabel: {
    fontSize: 11,
    color: '#60A5FA',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    ...SHADOWS.sm,
  },
  methodTabActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  methodTabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },
  infoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 10,
  },
  bankItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  bankName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  bankNameActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  noticeText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  paySubmitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
    ...SHADOWS.md,
  },
  paySubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default PaymentGatewayScreen;
