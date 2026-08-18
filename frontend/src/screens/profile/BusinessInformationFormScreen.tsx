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

type BusinessInformationFormScreenProps = NativeStackScreenProps<RootStackParamList, 'BusinessInformationForm'>;

const CONSTITUTION_TYPES = ['OPC', 'TRUST', 'SOCIETY', 'Proprietorship', 'Partnership', 'Private Limited'];
const BUSINESS_TYPES = ['Manufacturing', 'Trader', 'Service Provider', 'Others'];
const GOVT_ORGANIZATIONS = ['MSME', 'KVIC', 'NABARD', 'None', 'Others'];

const BusinessInformationFormScreen: React.FC<BusinessInformationFormScreenProps> = ({ navigation, route }) => {
  const { userData } = route.params || {};

  const [doingBusiness, setDoingBusiness] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    constitutionType: '',
    businessActivities: '',
    businessCommencementYear: '',
    numberOfEmployees: '',
    otherChamber: '',
  });
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
  const [memberOfOtherChamber, setMemberOfOtherChamber] = useState<boolean | null>(null);
  const [selectedGovtOrgs, setSelectedGovtOrgs] = useState<string[]>([]);
  const [agreeToDeclaration, setAgreeToDeclaration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/members/business-info');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if (data.doingBusiness !== undefined) setDoingBusiness(data.doingBusiness);
        setFormData({
          organizationName: data.organizationName || '',
          constitutionType: data.constitutionType || '',
          businessActivities: data.businessActivities || '',
          businessCommencementYear: data.businessCommencementYear ? String(data.businessCommencementYear) : '',
          numberOfEmployees: data.numberOfEmployees ? String(data.numberOfEmployees) : '',
          otherChamber: data.otherChamber || '',
        });
        setSelectedBusinessTypes(data.businessTypes || []);
        if (data.memberOfOtherChamber !== undefined) setMemberOfOtherChamber(data.memberOfOtherChamber);
        setSelectedGovtOrgs(data.govtOrganizations || []);
      }
    } catch (error: any) {
      console.log('Notice loading business info:', error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBusinessType = (type: string) => {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleGovtOrg = (org: string) => {
    setSelectedGovtOrgs((prev) =>
      prev.includes(org) ? prev.filter((o) => o !== org) : [...prev, org]
    );
  };

  const handlePrevious = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    if (doingBusiness === null) {
      Alert.alert('Required', 'Please select whether you are currently doing business.');
      return;
    }

    // Aspirant Mode (Not doing business)
    if (doingBusiness === false) {
      if (!agreeToDeclaration) {
        Alert.alert('Declaration Required', 'Please accept the declaration to continue.');
        return;
      }
      setIsSaving(true);
      try {
        const aspirantData = {
          doingBusiness: false,
          registrationType: 'aspirant',
          memberOfOtherChamber: false,
          govtOrganizations: [],
          submittedAt: new Date().toISOString(),
        };

        await api.put('/members/profile', aspirantData);
        await api.post('/applications', {
          ...userData?.registrationForm,
          ...aspirantData,
        });

        navigation.navigate('ApplicationSubmitted');
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to submit aspirant registration');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Active Business Mode Validation
    if (!formData.organizationName.trim()) {
      Alert.alert('Required', 'Organization name is required');
      return;
    }

    if (!formData.constitutionType) {
      Alert.alert('Required', 'Please select a Constitution Type');
      return;
    }

    setIsSaving(true);
    try {
      const businessData = {
        doingBusiness: true,
        organizationName: formData.organizationName,
        constitutionType: formData.constitutionType,
        businessTypes: selectedBusinessTypes,
        businessActivities: formData.businessActivities,
        businessCommencementYear: formData.businessCommencementYear,
        numberOfEmployees: formData.numberOfEmployees,
        memberOfOtherChamber,
        otherChamber: formData.otherChamber,
        govtOrganizations: selectedGovtOrgs,
      };

      await api.put('/members/profile', businessData);

      navigation.navigate('FinancialComplianceForm', {
        userData: { ...userData, registrationForm: { ...userData?.registrationForm, ...businessData } },
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save business information');
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
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepCircleTextActive}>2</Text>
          </View>
        </View>
        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepCircleText}>3</Text>
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
          {/* Stepper (Circle 2 active) */}
          {renderStepper()}

          {/* SECTION 1: Business Status */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="business-center" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Business Status</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Are you currently doing business? *</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    doingBusiness === true && styles.radioOptionSelected,
                  ]}
                  onPress={() => setDoingBusiness(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, doingBusiness === true && styles.radioCircleActive]}>
                    {doingBusiness === true && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={[styles.radioText, doingBusiness === true && styles.radioTextActive]}>
                    Yes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    doingBusiness === false && styles.radioOptionSelected,
                  ]}
                  onPress={() => setDoingBusiness(false)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, doingBusiness === false && styles.radioCircleActive]}>
                    {doingBusiness === false && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={[styles.radioText, doingBusiness === false && styles.radioTextActive]}>
                    No (Aspirant)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SECTION 2: Organization Details (If doing business) */}
          {doingBusiness === true && (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Icon name="store" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
                  <Text style={styles.cardHeaderTitle}>Organization Details</Text>
                </View>

                {/* Organization Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Organization Name *</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="domain" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.organizationName}
                      onChangeText={(val) => handleInputChange('organizationName', val)}
                      placeholder="Enter organization name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Constitution Type */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Constitution Type *</Text>
                  <View style={styles.pillWrapContainer}>
                    {CONSTITUTION_TYPES.map((type) => {
                      const isActive = formData.constitutionType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.pillButton, isActive && styles.pillButtonActive]}
                          onPress={() => handleInputChange('constitutionType', type)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* SECTION 3: Business Operations */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Icon name="assessment" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
                  <Text style={styles.cardHeaderTitle}>Business Operations</Text>
                </View>

                {/* Business Type */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Business Type</Text>
                  <View style={styles.pillWrapContainer}>
                    {BUSINESS_TYPES.map((type) => {
                      const isActive = selectedBusinessTypes.includes(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.pillButton, isActive && styles.pillButtonActive]}
                          onPress={() => toggleBusinessType(type)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Business Activities */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Business Activities</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Icon name="description" size={20} color="#1E50E6" style={styles.fieldLeftIconTop} />
                    <TextInput
                      style={[styles.textInput, styles.textAreaInput]}
                      value={formData.businessActivities}
                      onChangeText={(val) => handleInputChange('businessActivities', val)}
                      placeholder="Describe your primary business products or services"
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Commencement Year & Employees Row */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Commencement Year</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="event" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.businessCommencementYear}
                      onChangeText={(val) => handleInputChange('businessCommencementYear', val)}
                      placeholder="e.g. 2020"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Number of Employees</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="groups" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.numberOfEmployees}
                      onChangeText={(val) => handleInputChange('numberOfEmployees', val)}
                      placeholder="e.g. 25"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              {/* SECTION 4: Affiliations & Registrations */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Icon name="verified" size={22} color="#1E50E6" style={styles.cardHeaderIcon} />
                  <Text style={styles.cardHeaderTitle}>Affiliations & Registrations</Text>
                </View>

                {/* Member of Other Chamber */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Member of Other Chamber?</Text>
                  <View style={styles.radioRow}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        memberOfOtherChamber === true && styles.radioOptionSelected,
                      ]}
                      onPress={() => setMemberOfOtherChamber(true)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, memberOfOtherChamber === true && styles.radioCircleActive]}>
                        {memberOfOtherChamber === true && <View style={styles.radioInnerCircle} />}
                      </View>
                      <Text style={[styles.radioText, memberOfOtherChamber === true && styles.radioTextActive]}>
                        Yes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        memberOfOtherChamber === false && styles.radioOptionSelected,
                      ]}
                      onPress={() => setMemberOfOtherChamber(false)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, memberOfOtherChamber === false && styles.radioCircleActive]}>
                        {memberOfOtherChamber === false && <View style={styles.radioInnerCircle} />}
                      </View>
                      <Text style={[styles.radioText, memberOfOtherChamber === false && styles.radioTextActive]}>
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {memberOfOtherChamber === true && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Chamber Name</Text>
                    <View style={styles.inputContainer}>
                      <Icon name="account-balance" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={formData.otherChamber}
                        onChangeText={(val) => handleInputChange('otherChamber', val)}
                        placeholder="Enter existing chamber name"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}

                {/* Govt Organizations */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Registered with Govt. Organization</Text>
                  <View style={styles.pillWrapContainer}>
                    {GOVT_ORGANIZATIONS.map((org) => {
                      const isActive = selectedGovtOrgs.includes(org);
                      return (
                        <TouchableOpacity
                          key={org}
                          style={[styles.pillButton, isActive && styles.pillButtonActive]}
                          onPress={() => toggleGovtOrg(org)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>
                            {org}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Aspirant Note & Declaration (If not doing business) */}
          {doingBusiness === false && (
            <View style={styles.card}>
              <View style={styles.infoBox}>
                <Icon name="school" size={28} color="#1E50E6" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Registering as Aspirant</Text>
                  <Text style={styles.infoText}>
                    You are registering as an Aspirant / Student. Financial & Compliance steps are skipped.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreeToDeclaration(!agreeToDeclaration)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxCircle, agreeToDeclaration && styles.checkboxCircleActive]}>
                  {agreeToDeclaration && <Icon name="check" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>
                  I hereby declare that all information provided is true and correct.
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
                  <Text style={styles.nextButtonText}>
                    {doingBusiness === false ? 'Submit' : 'Next'}
                  </Text>
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

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E50E6',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    lineHeight: 18,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
    fontWeight: '500',
    color: '#334155',
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

export default BusinessInformationFormScreen;
