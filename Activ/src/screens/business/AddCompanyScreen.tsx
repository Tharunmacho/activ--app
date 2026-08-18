// Add Company Screen - Business Card Theme Form System
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';

type AddCompanyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddCompany'
>;

interface Props {
  navigation: AddCompanyScreenNavigationProp;
}

const BUSINESS_TYPES = [
  'Manufacturing',
  'Trader',
  'Service Provider',
  'Others',
];

const AddCompanyScreen: React.FC<Props> = ({ navigation }) => {
  const setActiveCompany = useActiveCompanyStore((state) => state.setActiveCompany);
  const loadCompanies = useActiveCompanyStore((state) => state.loadCompanies);

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'Manufacturing',
    mobileNumber: '',
    email: '',
    location: '',
    area: '',
    description: '',
  });

  const [logoAsset, setLogoAsset] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImagePicker = () => {
    try {
      if (typeof launchImageLibrary !== 'function') {
        Alert.alert('Unavailable', 'The photo picker is not available on this device.');
        return;
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          // Square-ish source keeps the round preview from cropping oddly.
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.9,
          selectionLimit: 1,
        },
        (response) => {
          if (response.didCancel) return;
          if (response.errorCode) {
            Alert.alert('Error', response.errorMessage || 'Failed to select image. Please try again.');
            return;
          }

          const asset = (response.assets || [])[0];
          if (!asset?.uri) {
            Alert.alert('Error', 'That image could not be read. Please pick another.');
            return;
          }

          setLogoAsset(asset);
          setLogoPreview(asset.uri);
        }
      );
    } catch (err) {
      console.warn('Native module call safely caught:', err);
      Alert.alert('Error', 'Could not open the photo picker.');
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.businessType) newErrors.businessType = 'Business type is required';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      if (logoAsset && logoAsset.uri) {
        const formDataToSend = new FormData();
        formDataToSend.append('businessName', formData.businessName.trim());
        formDataToSend.append('organizationName', formData.businessName.trim());
        formDataToSend.append('businessType', formData.businessType);
        formDataToSend.append('mobileNumber', formData.mobileNumber.trim());
        formDataToSend.append('phone', formData.mobileNumber.trim());
        formDataToSend.append('location', formData.location.trim());
        formDataToSend.append('doingBusiness', 'true');
        formDataToSend.append('registrationType', 'business');

        if (formData.email.trim()) formDataToSend.append('email', formData.email.trim());
        if (formData.area.trim()) formDataToSend.append('area', formData.area.trim());
        if (formData.description.trim()) formDataToSend.append('description', formData.description.trim());

        formDataToSend.append('logo', {
          uri: logoAsset.uri,
          type: logoAsset.type || 'image/jpeg',
          name: logoAsset.fileName || `company-logo-${Date.now()}.jpg`,
        } as any);

        const response = await api.post(ENDPOINTS.BUSINESS.CREATE, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && (response.data.success || response.data.data)) {
          // A newly created company becomes the active one everywhere.
          const created = response.data?.data || {};
          if (created?._id) {
            setActiveCompany(created._id);
          }
          await loadCompanies({ force: true });
          Alert.alert('Success', 'Company profile created successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('BusinessDashboard') },
          ]);
        } else {
          throw new Error(
            response.data?.message || 'Server did not confirm the company was created.'
          );
        }
      } else {
        const payload = {
          businessName: formData.businessName.trim(),
          organizationName: formData.businessName.trim(),
          businessType: formData.businessType,
          mobileNumber: formData.mobileNumber.trim(),
          phone: formData.mobileNumber.trim(),
          location: formData.location.trim(),
          email: formData.email.trim(),
          area: formData.area.trim(),
          description: formData.description.trim(),
        };

        const response = await api.post(ENDPOINTS.BUSINESS.CREATE, payload);

        if (response.data && (response.data.success || response.data.data)) {
          // A newly created company becomes the active one everywhere.
          const created = response.data?.data || {};
          if (created?._id) {
            setActiveCompany(created._id);
          }
          await loadCompanies({ force: true });
          Alert.alert('Success', 'Company profile created successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('BusinessDashboard') },
          ]);
        } else {
          throw new Error(
            response.data?.message || 'Server did not confirm the company was created.'
          );
        }
      }
    } catch (error: any) {
      console.error('Error adding company:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to add company. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FD" />

      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Add New Company</Text>
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
          {/* Logo Section Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="business" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Company Identity</Text>
            </View>

            <TouchableOpacity
              style={styles.uploadContainer}
              onPress={handleImagePicker}
              activeOpacity={0.8}
            >
              {logoPreview ? (
                <View style={styles.logoPreviewWrapper}>
                  <View style={styles.avatarFrame}>
                    <View style={styles.avatarClip}>
                      <Image
                        source={{ uri: logoPreview }}
                        style={styles.logoImagePreview}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.avatarBadge}>
                      <Icon name="photo-camera" size={18} color="#FFFFFF" />
                    </View>
                  </View>

                  <Text style={styles.changeHint}>Tap to change logo</Text>
                </View>
              ) : (
                <>
                  <View style={styles.uploadIconCircle}>
                    <Icon name="cloud-upload" size={32} color="#7C3AED" />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Company Logo</Text>
                  <Text style={styles.uploadHint}>JPG or PNG format recommended</Text>
                </>
              )}
            </TouchableOpacity>
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
                  value={formData.businessName}
                  onChangeText={(value) => handleInputChange('businessName', value)}
                  placeholder="Enter business name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {errors.businessName ? <Text style={styles.errorText}>{errors.businessName}</Text> : null}
            </View>

            {/* Business Type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Type *</Text>
              <View style={styles.pillGrid}>
                {BUSINESS_TYPES.map((type) => {
                  const isActive = formData.businessType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.pillCard, isActive && styles.pillCardActive]}
                      onPress={() => handleInputChange('businessType', type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.businessType ? <Text style={styles.errorText}>{errors.businessType}</Text> : null}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Icon name="description" size={20} color="#7C3AED" style={styles.fieldLeftIconTop} />
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Describe your company offerings..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Contact & Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="contact-phone" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Contact & Location</Text>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number *</Text>
              <View style={[styles.inputContainer, errors.mobileNumber ? styles.inputError : null]}>
                <Icon name="phone" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.mobileNumber}
                  onChangeText={(value) => handleInputChange('mobileNumber', value)}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.mobileNumber ? <Text style={styles.errorText}>{errors.mobileNumber}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City / Location *</Text>
              <View style={[styles.inputContainer, errors.location ? styles.inputError : null]}>
                <Icon name="location-city" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.location}
                  onChangeText={(value) => handleInputChange('location', value)}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
            </View>

            {/* Area */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Area / Locality</Text>
              <View style={styles.inputContainer}>
                <Icon name="place" size={20} color="#7C3AED" style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.textInput}
                  value={formData.area}
                  onChangeText={(value) => handleInputChange('area', value)}
                  placeholder="e.g. Guindy Industrial Estate"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <Icon name="close" size={18} color="#7C3AED" style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Save Company</Text>
                </>
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
    paddingBottom: 40,
  },

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
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  uploadHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  logoPreviewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    width: 132,
    height: 132,
    position: 'relative',
  },
  avatarClip: {
    width: 132,
    height: 132,
    borderRadius: 66,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImagePreview: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F3E8FF',
  },
  changeHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 12,
  },

  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  fieldLeftIconTop: {
    marginRight: 10,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E1B4B',
  },
  textAreaContainer: {
    height: 'auto',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  textAreaInput: {
    minHeight: 60,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillCard: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillCardActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
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
  saveButton: {
    flex: 1.2,
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddCompanyScreen;
