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

type DeclarationFormScreenProps = NativeStackScreenProps<RootStackParamList, 'DeclarationForm'>;

const DeclarationFormScreen: React.FC<DeclarationFormScreenProps> = ({ navigation, route }) => {
  const { userData } = route.params || {};

  const [formData, setFormData] = useState({
    sisterConcerns: '',
  });
  const [companies, setCompanies] = useState<string[]>(['']);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDeclarationInfo();
  }, []);

  const fetchDeclarationInfo = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/declaration-info');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setFormData({
          sisterConcerns: data.sisterConcerns ? String(data.sisterConcerns) : '',
        });
        if (data.companyNames) {
          const splitCompanies = typeof data.companyNames === 'string'
            ? data.companyNames.split(',').map((c: string) => c.trim()).filter(Boolean)
            : Array.isArray(data.companyNames) ? data.companyNames : [''];
          setCompanies(splitCompanies.length > 0 ? splitCompanies : ['']);
        }
        if (data.agreeToTerms !== undefined) setAgreeToTerms(data.agreeToTerms);
      }
    } catch (error: any) {
      console.log('Notice loading declaration info:', error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompanyChange = (index: number, value: string) => {
    const updated = [...companies];
    updated[index] = value;
    setCompanies(updated);
  };

  const addCompany = () => {
    setCompanies([...companies, '']);
  };

  const removeCompany = (index: number) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((_, i) => i !== index));
    }
  };

  const handlePrevious = () => {
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!agreeToTerms) {
      Alert.alert('Agreement Required', 'Please accept the declaration terms to submit your application.');
      return;
    }

    setIsSubmitting(true);
    try {
      const companyNames = companies.filter((c) => c.trim() !== '').join(', ');

      const declarationData = {
        sisterConcerns: formData.sisterConcerns,
        companyNames,
        agreeToTerms,
        submittedAt: new Date().toISOString(),
      };

      await api.put('/members/profile', declarationData);
      await api.post('/applications', {
        ...userData?.registrationForm,
        ...declarationData,
      });

      Alert.alert(
        'Application Submitted!',
        'Your profile has been completed! Your application is now under review by Block, District & State admins.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'ApplicationSubmitted' }],
              }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
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
          <View style={styles.stepCircleCompleted}>
            <Icon name="check" size={18} color="#FFFFFF" />
          </View>
        </View>
        <View style={[styles.stepLine, styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepCircleTextActive}>4</Text>
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
          {/* Stepper (Circle 4 active) */}
          {renderStepper()}

          {/* SECTION 1: Business Associations */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="domain" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Sister Concerns & Firms</Text>
            </View>

            {/* Sister Concerns Count */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Number of Sister Concerns</Text>
              <View style={styles.inputContainer}>
                <Icon name="business" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.sisterConcerns}
                  onChangeText={(val) => handleInputChange('sisterConcerns', val)}
                  placeholder="Enter number (0 if none)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Company / Firm Names */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Company / Firm Names</Text>
                <TouchableOpacity onPress={addCompany} style={styles.addButton} activeOpacity={0.8}>
                  <Icon name="add-circle" size={18} color="#1E50E6" />
                  <Text style={styles.addButtonText}>Add Firm</Text>
                </TouchableOpacity>
              </View>

              {companies.map((comp, idx) => (
                <View key={idx} style={styles.companyInputRow}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Icon name="storefront" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={comp}
                      onChangeText={(val) => handleCompanyChange(idx, val)}
                      placeholder={`Company / Firm Name ${idx + 1}`}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {companies.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeCompany(idx)}
                      style={styles.removeButton}
                      activeOpacity={0.7}
                    >
                      <Icon name="remove-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* SECTION 2: Member Declaration Agreement */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="gavel" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Member Declaration</Text>
            </View>

            <View style={styles.declarationList}>
              <View style={styles.declarationItemRow}>
                <Icon name="check-circle" size={18} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.declarationItemText}>
                  All information provided across all sections is true and accurate.
                </Text>
              </View>
              <View style={styles.declarationItemRow}>
                <Icon name="check-circle" size={18} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.declarationItemText}>
                  I understand false statements may lead to application rejection or termination.
                </Text>
              </View>
              <View style={styles.declarationItemRow}>
                <Icon name="check-circle" size={18} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.declarationItemText}>
                  I agree to abide by the rules, constitution, and code of ethics of the Chamber.
                </Text>
              </View>
              <View style={styles.declarationItemRow}>
                <Icon name="check-circle" size={18} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.declarationItemText}>
                  I consent to verification of my details by Block, District, and State Authorities.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxCircle, agreeToTerms && styles.checkboxCircleActive]}>
                {agreeToTerms && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxText}>
                I accept and agree to the above declaration terms and conditions.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.prevButton}
              onPress={handlePrevious}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Icon name="arrow-back" size={18} color="#1E50E6" style={{ marginRight: 6 }} />
              <Text style={styles.prevButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, !agreeToTerms && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!agreeToTerms || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.nextButtonContent}>
                  <Text style={styles.nextButtonText}>Submit Application</Text>
                  <Icon name="send" size={18} color="#FFFFFF" style={styles.nextArrowIcon} />
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E50E6',
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
  companyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  removeButton: {
    padding: 6,
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
    height: '100%',
    paddingVertical: 0,
  },

  // Declaration List
  declarationList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  declarationItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  declarationItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 18,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxCircleActive: {
    backgroundColor: '#1E50E6',
    borderColor: '#1E50E6',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
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
  submitButton: {
    flex: 1.2,
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: 'transparent',
    opacity: 0.7,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextArrowIcon: {
    marginTop: 1,
  },
});

export default DeclarationFormScreen;
