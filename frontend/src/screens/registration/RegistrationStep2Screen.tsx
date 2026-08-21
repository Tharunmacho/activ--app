import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Picker } from '@react-native-picker/picker';
import api, { setAuthToken, setUserData, setUserRole } from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import locationData from '../../assets/data/locations_nested.json';

type RegistrationStep2Props = NativeStackScreenProps<RootStackParamList, 'RegistrationStep2'>;

const RegistrationStep2Screen: React.FC<RegistrationStep2Props> = ({
  navigation,
  route,
}) => {
  const { fullName, email, phoneNumber, password } = route.params;
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [city, setCity] = useState('');
  
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  
  const [errors, setErrors] = useState({
    state: '',
    district: '',
    block: '',
    city: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const states = locationData.states.map((s) => s.state);

  useEffect(() => {
    if (selectedState) {
      const stateData = locationData.states.find((s) => s.state === selectedState);
      if (stateData) {
        setDistricts(stateData.districts.map((d) => d.district));
        setSelectedDistrict('');
        setSelectedBlock('');
        setBlocks([]);
      }
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      const stateData = locationData.states.find((s) => s.state === selectedState);
      if (stateData) {
        const districtData = stateData.districts.find(
          (d) => d.district === selectedDistrict
        );
        if (districtData) {
          setBlocks(districtData.block);
          setSelectedBlock('');
        }
      }
    }
  }, [selectedDistrict, selectedState]);

  const validateForm = (): boolean => {
    const newErrors = {
      state: selectedState ? '' : 'Please select a state',
      district: selectedDistrict ? '' : 'Please select a district',
      block: selectedBlock ? '' : 'Please select a block',
      city: city.trim() ? '' : 'City is required',
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await api.post(ENDPOINTS.AUTH.REGISTER, {
        fullName,
        email,
        phoneNumber,
        password,
        state: selectedState,
        district: selectedDistrict,
        block: selectedBlock,
        city: city.trim(),
      });

      const responseData = response.data.data || response.data;
      if (response.data.success || response.status === 201) {
        const { token, user, memberDetails } = responseData;
        
        await setAuthToken(token);
        
        const userData = {
          ...user,
          ...memberDetails,
          password,
        };
        await setUserData(userData);
        await setUserRole(user.role || 'member');
        
        Alert.alert(
          'Registration Successful!',
          'Your account has been created. You can now access your dashboard.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('MemberMain');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage = 'Email already registered. Please login instead.';
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFC" />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Registration</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={styles.inactiveTab} 
          onPress={() => navigation.goBack()} 
          activeOpacity={0.8}
        >
          <Text style={styles.inactiveTabText}>Personal Info</Text>
        </TouchableOpacity>
        <View style={styles.activeTab}>
          <Text style={styles.activeTabText}>Location</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Text */}
            <View style={styles.heroSection}>
              <Text style={styles.heroSubText}>Almost there ✨</Text>
              <Text style={styles.heroTitle}>Where are you located?</Text>
              <Text style={styles.heroDesc}>
                Help us connect you with your{'\n'}local regional community
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              
              {/* State Picker */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="map" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>State</Text>
                </View>
                <View style={[styles.pickerContainer, errors.state && styles.inputError]}>
                  <Picker
                    selectedValue={selectedState}
                    onValueChange={(value) => {
                      setSelectedState(value);
                      setErrors({ ...errors, state: '' });
                    }}
                    enabled={!isLoading}
                    style={styles.picker}
                    dropdownIconColor="#9CA3AF"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select state" value="" color="#9CA3AF" />
                    {states.map((state) => (
                      <Picker.Item key={state} label={state} value={state} color="#111827" />
                    ))}
                  </Picker>
                </View>
                {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
              </View>

              {/* District Picker */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="location-city" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>District</Text>
                </View>
                <View style={[
                  styles.pickerContainer, 
                  errors.district && styles.inputError,
                  !selectedState && styles.pickerDisabled
                ]}>
                  <Picker
                    selectedValue={selectedDistrict}
                    onValueChange={(value) => {
                      setSelectedDistrict(value);
                      setErrors({ ...errors, district: '' });
                    }}
                    enabled={!isLoading && !!selectedState}
                    style={styles.picker}
                    dropdownIconColor="#9CA3AF"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select district" value="" color="#9CA3AF" />
                    {districts.map((district) => (
                      <Picker.Item key={district} label={district} value={district} color="#111827" />
                    ))}
                  </Picker>
                </View>
                {errors.district ? <Text style={styles.errorText}>{errors.district}</Text> : null}
              </View>

              {/* City Input */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="location-on" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>City</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="Enter city name"
                  placeholderTextColor="#9CA3AF"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    setErrors({ ...errors, city: '' });
                  }}
                  editable={!isLoading}
                />
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
              </View>

              {/* Block Picker */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="domain" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Block / Taluk</Text>
                </View>
                <View style={[
                  styles.pickerContainer, 
                  errors.block && styles.inputError,
                  !selectedDistrict && styles.pickerDisabled
                ]}>
                  <Picker
                    selectedValue={selectedBlock}
                    onValueChange={(value) => {
                      setSelectedBlock(value);
                      setErrors({ ...errors, block: '' });
                    }}
                    enabled={!isLoading && !!selectedDistrict}
                    style={styles.picker}
                    dropdownIconColor="#9CA3AF"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select block" value="" color="#9CA3AF" />
                    {blocks.map((block) => (
                      <Picker.Item key={block} label={block} value={block} color="#111827" />
                    ))}
                  </Picker>
                </View>
                {errors.block ? <Text style={styles.errorText}>{errors.block}</Text> : null}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>Create Account</Text>
                    <Icon name="check-circle" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {/* Sign In Footer */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login' as any)}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 1,
  },
  activeTab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    marginLeft: 8,
  },
  activeTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginRight: 8,
  },
  inactiveTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  heroSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
    zIndex: 1,
  },
  heroSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: 52,
  },
  picker: {
    height: 52,
    color: '#111827',
  },
  pickerDisabled: {
    backgroundColor: '#F3F4F6',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  nextButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegistrationStep2Screen;
