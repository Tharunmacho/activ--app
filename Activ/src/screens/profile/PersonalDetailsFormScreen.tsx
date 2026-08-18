import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../stores/exampleStore';
import api, { getUserData, getUserPassword } from '../../services/api';
import locationData from '../../assets/data/locations_nested.json';

type PersonalDetailsFormScreenProps = NativeStackScreenProps<RootStackParamList, 'PersonalDetailsForm'>;

const RELIGION_OPTIONS = [
  'Hinduism',
  'Christianity',
  'Islam',
  'Sikhism',
  'Buddhism',
  'Jainism',
  'Others',
];

const SOCIAL_CATEGORY_OPTIONS = [
  'Christian ST',
  'Christian SC',
  'ST',
  'SC',
  'Others',
];

const PersonalDetailsFormScreen: React.FC<PersonalDetailsFormScreenProps> = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const userData = route.params?.userData || {};

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    state: 'Tamil Nadu',
    district: 'Ariyalur',
    block: 'Ariyalur',
    city: 'Ariyalur',
    religion: '',
    socialCategory: '',
    currentPassword: userData.password || (user as any)?.password || '',
    password: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Active inline expanded dropdown ('state' | 'district' | 'block' | 'religion' | 'socialCategory' | null)
  const [expandedPicker, setExpandedPicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States list safely extracted
  const allStates = (locationData?.states || []).map((s) => s.state).filter(Boolean);

  // Selected State Data safely extracted
  const currentStateObj =
    (locationData?.states || []).find(
      (s) => s?.state && formData?.state && s.state.toLowerCase() === formData.state.toLowerCase()
    ) || locationData?.states?.[0];

  const availableDistricts = (currentStateObj?.districts || []).map((d) => d.district).filter(Boolean);

  // Selected District Data safely extracted
  const currentDistrictObj = (currentStateObj?.districts || []).find(
    (d) => d?.district && formData?.district && d.district.toLowerCase().trim() === formData.district.toLowerCase().trim()
  );

  const baseBlocks = (currentDistrictObj?.block || []).filter(Boolean);
  const blockVariants: { [key: string]: string[] } = {
    'Jayamkondam': ['Jayamkondam', 'Jayankondan'],
    'Jayankondan': ['Jayankondan', 'Jayamkondam'],
    'T. Palur': ['T. Palur', 'T.Palur'],
    'T.Palur': ['T.Palur', 'T. Palur'],
  };

  const expandedBlocks: string[] = [];
  baseBlocks.forEach((b) => {
    if (blockVariants[b]) {
      blockVariants[b].forEach((v) => expandedBlocks.push(v));
    } else {
      expandedBlocks.push(b);
    }
  });

  if (formData.block && !expandedBlocks.includes(formData.block)) {
    expandedBlocks.unshift(formData.block);
  }
  if (!expandedBlocks.includes('Others')) {
    expandedBlocks.push('Others');
  }
  const availableBlocks = Array.from(new Set(expandedBlocks));

  useEffect(() => {
    if (userData.email) {
      setFormData((prev) => ({
        ...prev,
        fullName: userData.fullName || prev.fullName,
        email: userData.email || prev.email,
        phoneNumber: userData.phoneNumber || prev.phoneNumber,
        currentPassword: userData.password || (user as any)?.password || prev.currentPassword || '',
      }));
    }
    loadMemberData();

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const loadMemberData = async () => {
    setIsLoading(true);
    try {
      const storedUserData = await getUserData();
      const savedPass = await getUserPassword();
      const defaultPassword =
        savedPass || storedUserData?.password || userData?.password || (user as any)?.password || '';

      const response = await api.get('/members/my-profile');
      if (response.data.success && response.data.data) {
        const memberData = response.data.data;
        setFormData((prev) => ({
          ...prev,
          fullName: memberData.fullName || storedUserData?.fullName || prev.fullName || '',
          email: memberData.email || storedUserData?.email || prev.email || '',
          phoneNumber: memberData.phoneNumber || storedUserData?.phoneNumber || prev.phoneNumber || '',
          state: memberData.state || storedUserData?.state || prev.state || 'Tamil Nadu',
          district: memberData.district || storedUserData?.district || prev.district || 'Ariyalur',
          block: memberData.block || storedUserData?.block || prev.block || 'Ariyalur',
          city: memberData.city || storedUserData?.city || prev.city || 'Ariyalur',
          religion: memberData.religion || storedUserData?.religion || prev.religion || '',
          socialCategory: memberData.socialCategory || storedUserData?.socialCategory || prev.socialCategory || '',
          currentPassword: defaultPassword,
          password: '',
          confirmPassword: '',
        }));
      }
    } catch (error: any) {
      console.log('Notice loading profile data:', error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const val = value || '';
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };

      if (field === 'state') {
        const newSt = (locationData?.states || []).find(
          (s) => s?.state && s.state.toLowerCase() === val.toLowerCase()
        );
        const firstDist = newSt?.districts?.[0]?.district || '';
        const firstBlk = newSt?.districts?.[0]?.block?.[0] || '';
        updated.district = firstDist;
        updated.block = firstBlk;
        updated.city = firstDist;
      } else if (field === 'district') {
        const dData = (currentStateObj?.districts || []).find(
          (d) => d?.district && d.district.toLowerCase() === val.toLowerCase()
        );
        updated.block = dData?.block?.[0] || '';
        updated.city = val;
      }
      return updated;
    });

    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const togglePicker = (pickerName: string) => {
    setSearchQuery('');
    setExpandedPicker((prev) => (prev === pickerName ? null : pickerName));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.email.trim()) newErrors.email = 'Email address is required';

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await api.put('/members/profile', {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        state: formData.state,
        district: formData.district,
        block: formData.block,
        city: formData.city,
        religion: formData.religion,
        socialCategory: formData.socialCategory,
        currentPassword: formData.currentPassword,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      navigation.navigate('BusinessInformationForm', {
        userData: { ...user, registrationForm: formData },
      });
    } catch (error: any) {
      navigation.navigate('BusinessInformationForm', {
        userData: { ...user, registrationForm: formData },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperWrapper}>
      <View style={styles.stepperRow}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepCircleTextActive}>1</Text>
          </View>
        </View>
        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepCircleText}>2</Text>
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

  const renderInlineOptions = (
    pickerName: string,
    rawOptions: string[],
    currentSelected: string
  ) => {
    if (expandedPicker !== pickerName) return null;

    const filtered = (rawOptions || []).filter(
      (opt) =>
        opt &&
        typeof opt === 'string' &&
        opt.toLowerCase().includes((searchQuery || '').toLowerCase().trim())
    );

    return (
      <View style={styles.inlineDropdownCard}>
        {(pickerName === 'state' || pickerName === 'district' || pickerName === 'block') && (
          <View style={styles.inlineSearchBox}>
            <Icon name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inlineSearchInput}
              placeholder={`Search ${pickerName}...`}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="clear" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <ScrollView
          style={styles.inlineListScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="always"
        >
          {filtered.map((item, idx) => (
            <TouchableOpacity
              key={item + '_' + idx}
              style={styles.inlineOptionItem}
              onPress={() => {
                handleInputChange(pickerName, item);
                setExpandedPicker(null);
                setSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.inlineOptionText,
                  currentSelected === item && styles.inlineOptionTextSelected,
                ]}
              >
                {item}
              </Text>
              {currentSelected === item && <Icon name="check" size={18} color="#1E50E6" />}
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.noResultsText}>No matching options found</Text>
          )}
        </ScrollView>
      </View>
    );
  };

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

      {/* Header Bar */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
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
          {/* Stepper (Only 1 2 3 4 circles) */}
          {renderStepper()}

          {/* SECTION 1: Location Information */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <Icon name="location-on" size={20} color="#1E50E6" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Location Information</Text>
                <Text style={styles.cardHeaderSubtitle}>Tell us where your business is located</Text>
              </View>
            </View>

            {/* District (Icon: location-city) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>District</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownPicker,
                  expandedPicker === 'district' && styles.dropdownPickerActive,
                ]}
                onPress={() => togglePicker('district')}
                activeOpacity={0.8}
              >
                <Icon name="location-city" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <Text style={styles.dropdownValueText}>
                  {formData.district || 'Select District'}
                </Text>
                <Icon
                  name={expandedPicker === 'district' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
              {renderInlineOptions('district', availableDistricts, formData.district)}
              {errors.district ? <Text style={styles.errorText}>{errors.district}</Text> : null}
            </View>

            {/* Block (Icon: business) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Block</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownPicker,
                  expandedPicker === 'block' && styles.dropdownPickerActive,
                ]}
                onPress={() => togglePicker('block')}
                activeOpacity={0.8}
              >
                <Icon name="business" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <Text style={styles.dropdownValueText}>{formData.block || 'Select Block'}</Text>
                <Icon
                  name={expandedPicker === 'block' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
              {renderInlineOptions('block', availableBlocks, formData.block)}
            </View>

            {/* City (Icon: place) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City</Text>
              <View style={styles.inputContainer}>
                <Icon name="place" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.city}
                  onChangeText={(val) => handleInputChange('city', val)}
                  placeholder="Enter City Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* SECTION 2: Contact Information */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <Icon name="phone" size={20} color="#1E50E6" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Contact Information</Text>
                <Text style={styles.cardHeaderSubtitle}>We'll use this to reach you</Text>
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.phoneNumber}
                  onChangeText={(val) => handleInputChange('phoneNumber', val)}
                  placeholder="Enter Phone Number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(val) => handleInputChange('email', val)}
                  placeholder="Enter Email Address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
          </View>

          {/* SECTION 3: Security Information */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <Icon name="security" size={20} color="#1E50E6" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Security Information</Text>
                <Text style={styles.cardHeaderSubtitle}>Keep your account safe</Text>
              </View>
            </View>

            {/* Current Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.currentPassword}
                  onChangeText={(val) => handleInputChange('currentPassword', val)}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon
                    name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.confirmPassword}
                  onChangeText={(val) => handleInputChange('confirmPassword', val)}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>
          </View>

          {/* SECTION 4: Demographic Information */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <Icon name="groups" size={20} color="#1E50E6" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Demographic Information</Text>
                <Text style={styles.cardHeaderSubtitle}>Help us know you better</Text>
              </View>
            </View>

            {/* Religion */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Religion</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownPicker,
                  expandedPicker === 'religion' && styles.dropdownPickerActive,
                ]}
                onPress={() => togglePicker('religion')}
                activeOpacity={0.8}
              >
                <Icon name="star-outline" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <Text
                  style={[
                    styles.dropdownValueText,
                    !formData.religion && styles.placeholderText,
                  ]}
                >
                  {formData.religion || 'Select Religion'}
                </Text>
                <Icon
                  name={expandedPicker === 'religion' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
              {renderInlineOptions('religion', RELIGION_OPTIONS, formData.religion)}
            </View>

            {/* Social Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Social Category</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownPicker,
                  expandedPicker === 'socialCategory' && styles.dropdownPickerActive,
                ]}
                onPress={() => togglePicker('socialCategory')}
                activeOpacity={0.8}
              >
                <Icon name="category" size={20} color="#1E50E6" style={styles.fieldLeftIcon} />
                <Text
                  style={[
                    styles.dropdownValueText,
                    !formData.socialCategory && styles.placeholderText,
                  ]}
                >
                  {formData.socialCategory || 'Select Social Category'}
                </Text>
                <Icon
                  name={
                    expandedPicker === 'socialCategory'
                      ? 'keyboard-arrow-up'
                      : 'keyboard-arrow-down'
                  }
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
              {renderInlineOptions('socialCategory', SOCIAL_CATEGORY_OPTIONS, formData.socialCategory)}
            </View>
          </View>

          {/* Action Button */}
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
                <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.nextArrowIcon} />
              </View>
            )}
          </TouchableOpacity>
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

  navHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F0F4F8',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Stepper (Only 1 2 3 4 circles)
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
    marginBottom: 20,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
  dropdownPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  dropdownPickerActive: {
    borderColor: '#1E50E6',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  placeholderText: {
    color: '#94A3B8',
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
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },

  // Inline Expansion Dropdown List
  inlineDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderTopWidth: 0,
    borderColor: '#1E50E6',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 10,
    maxHeight: 220,
    shadowColor: '#1E50E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inlineSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  inlineListScroll: {
    maxHeight: 160,
  },
  inlineOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  inlineOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  inlineOptionTextSelected: {
    fontWeight: '700',
    color: '#1E50E6',
  },
  noResultsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 14,
  },

  // Safety Banner

  // Next Button
  nextButton: {
    height: 54,
    backgroundColor: '#1E50E6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#1E50E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextArrowIcon: {
    marginTop: 1,
  },
});

export default PersonalDetailsFormScreen;
