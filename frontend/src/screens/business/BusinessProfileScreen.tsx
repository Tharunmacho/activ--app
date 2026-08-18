// Business Profile Screen - Professional Purple Theme Form System
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import LinearGradient from 'react-native-linear-gradient';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';

type BusinessProfileProps = NativeStackScreenProps<RootStackParamList, 'BusinessProfile'>;

const BUSINESS_TYPES = [
  { id: 'manufacturing', name: 'Manufacturing', icon: 'precision-manufacturing' },
  { id: 'trader', name: 'Trader', icon: 'shopping-cart' },
  { id: 'service', name: 'Service Provider', icon: 'room-service' },
  { id: 'others', name: 'Others', icon: 'business-center' },
];

const BusinessProfileScreen: React.FC<BusinessProfileProps> = ({ navigation }) => {
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [businessLogo, setBusinessLogo] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    prefillUserData();
  }, [navigation]);

  const prefillUserData = async () => {
    try {
      const response = await api.get(ENDPOINTS.AUTH.PROFILE);
      const userData = response.data.data;
      if (userData.phoneNumber || userData.mobile) {
        setMobile(userData.phoneNumber || userData.mobile);
      }
      if (userData.email) {
        setEmail(userData.email);
      }
    } catch (error) {
      console.log('Could not fetch user data');
    }
  };

  const handleImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.9,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to select image. Please try again.');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setBusinessLogo(asset);
          setLogoPreview(asset.uri || null);
        }
      }
    );
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'businessName':
        if (!value.trim()) {
          newErrors.businessName = 'Business name is required';
        } else if (value.trim().length < 3) {
          newErrors.businessName = 'Name must be at least 3 characters';
        } else {
          delete newErrors.businessName;
        }
        break;
      case 'mobile':
        if (!value.trim()) {
          newErrors.mobile = 'Mobile number is required';
        } else if (!/^[6-9]\d{9}$/.test(value.replace(/\s+/g, ''))) {
          newErrors.mobile = 'Enter a valid 10-digit mobile number';
        } else {
          delete newErrors.mobile;
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'location':
        if (!value.trim()) {
          newErrors.location = 'Location is required';
        } else {
          delete newErrors.location;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    } else if (businessName.trim().length < 3) {
      newErrors.businessName = 'Name must be at least 3 characters';
    }

    if (!selectedBusinessType) {
      newErrors.businessType = 'Please select a business type';
    }

    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile.replace(/\s+/g, ''))) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Validation Error', Object.values(newErrors)[0]);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const formData = new FormData();

      formData.append('organizationName', businessName.trim());
      formData.append('description', description.trim());
      formData.append('businessTypes', JSON.stringify([selectedBusinessType]));
      formData.append('phone', mobile.trim());
      formData.append('area', area.trim());
      formData.append('location', location.trim());
      formData.append('doingBusiness', 'true');
      formData.append('registrationType', 'business');

      if (email) {
        formData.append('email', email.trim());
      }

      if (businessLogo && businessLogo.uri) {
        formData.append('logo', {
          uri: businessLogo.uri,
          type: businessLogo.type || 'image/jpeg',
          name: businessLogo.fileName || `business-logo-${Date.now()}.jpg`,
        } as any);
      }

      const createResponse = await api.post(ENDPOINTS.BUSINESS.CREATE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // The newly created company becomes the active one across all screens.
      const createdId = createResponse.data?.data?._id;
      if (createdId) {
        setActiveCompany(createdId);
      }
      await loadCompanies({ force: true });

      Alert.alert('Success', 'Business profile created successfully!', [
        {
          text: 'View Dashboard',
          onPress: () => navigation.replace('BusinessDashboard'),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      const errorMsg =
        error.response?.data?.message || error.response?.data?.error || 'Failed to create business profile.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Header with LinearGradient Accent */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create Business Profile</Text>
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
          {/* Logo Upload Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="business" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Business Logo</Text>
            </View>

            <View style={styles.logoSection}>
              <TouchableOpacity onPress={handleImagePicker} style={styles.logoBox} activeOpacity={0.85}>
                {logoPreview ? (
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: logoPreview }} style={styles.logoImage} />
                    <View style={styles.logoEditBadge}>
                      <Icon name="edit" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Icon name="add-photo-alternate" size={32} color="#7C3AED" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.uploadTitle}>Upload Logo</Text>
                <Text style={styles.uploadSub}>PNG or JPG format recommended.</Text>
                <Text style={styles.uploadLimit}>Max size: 5MB</Text>
              </View>
            </View>
          </View>

          {/* Business Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="store" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Business Details</Text>
            </View>

            {/* Business Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Name *</Text>
              <View style={[styles.inputContainer, errors.businessName ? styles.inputError : null]}>
                <Icon name="storefront" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={businessName}
                  onChangeText={(text) => {
                    setBusinessName(text);
                    validateField('businessName', text);
                  }}
                  placeholder="Enter business name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {errors.businessName ? <Text style={styles.errorText}>{errors.businessName}</Text> : null}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Icon name="description" size={20} color="#7C3AED" style={styles.fieldLeftIconTop} />
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your business, products, or services..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Business Type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Type *</Text>
              <View style={styles.pillGrid}>
                {BUSINESS_TYPES.map((type) => {
                  const isActive = selectedBusinessType === type.name;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.pillCard, isActive && styles.pillCardActive]}
                      onPress={() => {
                        setSelectedBusinessType(type.name);
                        setErrors({ ...errors, businessType: '' });
                      }}
                      activeOpacity={0.8}
                    >
                      <Icon name={type.icon} size={18} color={isActive ? '#FFFFFF' : '#7C3AED'} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{type.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.businessType ? <Text style={styles.errorText}>{errors.businessType}</Text> : null}
            </View>
          </View>

          {/* Contact Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="phone" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Contact Information</Text>
            </View>

            {/* Mobile */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number *</Text>
              <View style={[styles.inputContainer, errors.mobile ? styles.inputError : null]}>
                <Icon name="phone" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={mobile}
                  onChangeText={(text) => {
                    setMobile(text);
                    validateField('mobile', text);
                  }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
              <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
                <Icon name="email" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    validateField('email', text);
                  }}
                  placeholder="business@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
          </View>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="location-on" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Location Details</Text>
            </View>

            {/* Area */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Area / Locality</Text>
              <View style={styles.inputContainer}>
                <Icon name="place" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. Industrial Estate, Guindy"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* City/State */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City / State *</Text>
              <View style={[styles.inputContainer, errors.location ? styles.inputError : null]}>
                <Icon name="location-city" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    validateField('location', text);
                  }}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Icon name="close" size={18} color="#7C3AED" style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.submitButtonText}>Create Profile</Text>
                  <Icon name="check-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    backgroundColor: '#F7F7FD',
  },
  navHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F7F7FD',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },

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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  // Logo Section
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    marginRight: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  uploadSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  uploadLimit: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
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
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textAreaContainer: {
    height: 96,
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
    color: '#1E1B4B',
    height: '100%',
    paddingVertical: 0,
  },
  textAreaInput: {
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },

  // Pill Grid
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F7FD',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  pillCardActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // Buttons Row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  submitButton: {
    flex: 1.2,
    height: 52,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BusinessProfileScreen;
