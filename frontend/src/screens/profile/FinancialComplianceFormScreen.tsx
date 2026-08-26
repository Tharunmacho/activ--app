import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';

type FinancialComplianceFormScreenProps = NativeStackScreenProps<RootStackParamList, 'FinancialComplianceForm'>;

const TURNOVER_RANGES = [
  'Below 1 Lakh',
  '1-5 Lakhs',
  '5-10 Lakhs',
  '10-50 Lakhs',
  '50 Lakhs - 1 Crore',
  'Above 1 Crore',
];

const GOVT_SCHEMES = [
  'Startup India',
  'MUDRA',
  'Stand-Up India',
  'PMEGP',
  'None',
  'Others',
];

const FinancialComplianceFormScreen: React.FC<FinancialComplianceFormScreenProps> = ({ navigation, route }) => {
  const { userData } = route.params || {};

  const [formData, setFormData] = useState({
    panNumber: '',
    gstNumber: '',
    lastYearTurnover: '',
  });
  const [itrFiled, setItrFiled] = useState<boolean | null>(null);
  const [selectedGovtSchemes, setSelectedGovtSchemes] = useState<string[]>([]);
  const [schemeDetails, setSchemeDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFinancialInfo();
  }, []);

  const fetchFinancialInfo = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/financial-info');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setFormData({
          panNumber: data.panNumber || '',
          gstNumber: data.gstNumber || '',
          lastYearTurnover: data.turnoverRange || data.lastYearTurnover || '',
        });
        if (data.filedITR !== undefined) setItrFiled(data.filedITR);
        else if (data.itrFiled !== undefined) setItrFiled(data.itrFiled);

        /**
         * Read the schemes the member actually picked.
         *
         * This used to set `['Yes']` whenever `govtSchemeBenefit` was true —
         * a value that is not one of the six options, so no pill rendered as
         * selected and reopening the form looked like nothing had been saved.
         * It was a stand-in for real data: `govtSchemes` was being dropped by
         * Mongoose strict mode, so there was nothing truthful to show. The
         * field is stored now, so the real list is read back.
         */
        setSelectedGovtSchemes(Array.isArray(data.govtSchemes) ? data.govtSchemes : []);
        setSchemeDetails(data.schemeDetails || '');
      }
    } catch (error: any) {
      console.log('Notice loading financial info:', error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGovtScheme = (scheme: string) => {
    setSelectedGovtSchemes((prev) =>
      prev.includes(scheme) ? prev.filter((s) => s !== scheme) : [...prev, scheme]
    );
  };

  const validatePAN = (pan: string): boolean => {
    if (!pan) return true;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateGST = (gst: string): boolean => {
    if (!gst) return true;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  const handlePrevious = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    if (formData.panNumber && !validatePAN(formData.panNumber)) {
      Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
      return;
    }

    if (formData.gstNumber && !validateGST(formData.gstNumber)) {
      Alert.alert('Invalid GST', 'Please enter a valid 15-character GSTIN number.');
      return;
    }

    setIsSaving(true);
    try {
      const isGovtBeneficiary = selectedGovtSchemes.length > 0 && !selectedGovtSchemes.includes('None');
      const financialData: any = {
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        filedITR: itrFiled,
        govtSchemeBenefit: isGovtBeneficiary,
        // Legacy keys
        itrFiled,
        govtSchemes: selectedGovtSchemes,
        schemeDetails: selectedGovtSchemes.includes('Others') ? schemeDetails : undefined,
      };
      if (formData.lastYearTurnover) {
        financialData.turnoverRange = formData.lastYearTurnover;
        financialData.lastYearTurnover = formData.lastYearTurnover;
      }

      await api.put('/members/profile', financialData);

      navigation.navigate('DeclarationForm', {
        userData: { ...userData, registrationForm: { ...userData?.registrationForm, ...financialData } },
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save financial information');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperWrapper}>
      <View style={styles.stepperRow}>
        <View style={styles.stepItem}>
          <View style={styles.stepCircleCompleted}>
            <Icon name="check" size={18} color="#FFFFFF" />
          </View>
        </View>
        <View style={[styles.stepLine, styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircleCompleted}>
            <Icon name="check" size={18} color="#FFFFFF" />
          </View>
        </View>
        <View style={[styles.stepLine, styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepCircleTextActive}>3</Text>
          </View>
        </View>
        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepCircleText}>4</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E50E6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />

      {/* Nav Header - Back button only */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={handlePrevious} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper (Circle 3 active) */}
          {renderStepper()}

          {/* SECTION 1: Tax Identification */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="receipt-long" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Tax Identification</Text>
            </View>

            {/* PAN Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PAN Number</Text>
              <View style={styles.inputContainer}>
                <Icon name="credit-card" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.panNumber}
                  onChangeText={(val) => handleInputChange('panNumber', val.toUpperCase())}
                  placeholder="ABCDE1234F"
                  placeholderTextColor="#94A3B8"
                  maxLength={10}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={styles.helperText}>Format: ABCDE1234F (Optional)</Text>
            </View>

            {/* GST Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>GSTIN Number</Text>
              <View style={styles.inputContainer}>
                <Icon name="receipt" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.gstNumber}
                  onChangeText={(val) => handleInputChange('gstNumber', val.toUpperCase())}
                  placeholder="22ABCDE1234F1Z5"
                  placeholderTextColor="#94A3B8"
                  maxLength={15}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={styles.helperText}>Format: 22ABCDE1234F1Z5 (Optional)</Text>
            </View>
          </View>

          {/* SECTION 2: Income Tax Returns & Turnover */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="account-balance-wallet" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Turnover & Compliance</Text>
            </View>

            {/* ITR Filed */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Have you filed Income Tax Returns (ITR)?</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    itrFiled === true && styles.radioOptionSelected,
                  ]}
                  onPress={() => setItrFiled(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, itrFiled === true && styles.radioCircleActive]}>
                    {itrFiled === true && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={[styles.radioText, itrFiled === true && styles.radioTextActive]}>
                    Yes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    itrFiled === false && styles.radioOptionSelected,
                  ]}
                  onPress={() => setItrFiled(false)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, itrFiled === false && styles.radioCircleActive]}>
                    {itrFiled === false && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={[styles.radioText, itrFiled === false && styles.radioTextActive]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Last Year Turnover Range */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Annual Turnover Range</Text>
              <View style={styles.pillWrapContainer}>
                {TURNOVER_RANGES.map((range) => {
                  const isActive = formData.lastYearTurnover === range;
                  return (
                    <TouchableOpacity
                      key={range}
                      style={[styles.pillButton, isActive && styles.pillButtonActive]}
                      onPress={() => handleInputChange('lastYearTurnover', range)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                        {range}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* SECTION 3: Government Scheme Benefits */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="verified-user" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Government Scheme Benefits</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Beneficiary of Government Schemes?</Text>
              <View style={styles.pillWrapContainer}>
                {GOVT_SCHEMES.map((scheme) => {
                  const isActive = selectedGovtSchemes.includes(scheme);
                  return (
                    <TouchableOpacity
                      key={scheme}
                      style={[styles.pillButton, isActive && styles.pillButtonActive]}
                      onPress={() => toggleGovtScheme(scheme)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                        {scheme}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedGovtSchemes.includes('Others') && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Specify Other Schemes</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Icon name="description" size={20} color="#1E50E6" style={styles.fieldLeftIconTop} />
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={schemeDetails}
                    onChangeText={setSchemeDetails}
                    placeholder="Enter details of other government schemes"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.prevButton}
              onPress={handlePrevious}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <Icon name="arrow-back" size={18} color="#1E50E6" style={{ marginRight: 6 }} />
              <Text style={styles.prevButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.nextButtonContent}>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Icon name="arrow-forward" size={18} color="#FFFFFF" style={styles.nextArrowIcon} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Matches the login screen so sign-in and the profile forms read as one
    // continuous surface.
    backgroundColor: '#F0F4F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  // Nav Header
  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F0F4F8',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stepper
  stepperWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#1E50E6',
    shadowColor: '#1E50E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  stepCircleCompleted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  stepCircleTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },

  // Scroll Content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  cardHeaderIcon: {
    marginRight: 2,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.2,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  textAreaContainer: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  fieldLeftIconTop: {
    marginRight: 10,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
    height: '100%',
    paddingVertical: 0,
  },
  textAreaInput: {
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 2,
  },

  // Radio Options
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  radioOptionSelected: {
    borderColor: '#1E50E6',
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#1E50E6',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E50E6',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#1E50E6',
  },

  // Pill Wrap Container
  pillWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillButtonActive: {
    backgroundColor: '#1E50E6',
    borderColor: '#1E50E6',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
  },

  // Buttons Row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  prevButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E50E6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E50E6',
  },
  nextButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#1E50E6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E50E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextArrowIcon: {
    marginTop: 1,
  },
});

export default FinancialComplianceFormScreen;
