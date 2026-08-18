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
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../theme/theme';
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
      // Call backend registration API with all required fields
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

      // Extract token and user data from response
      const responseData = response.data.data || response.data;
      if (response.data.success || response.status === 201) {
        const { token, user, memberDetails } = responseData;
        
        // Store token in AsyncStorage
        await setAuthToken(token);
        
        // Store user data (combine user and memberDetails)
        const userData = {
          ...user,
          ...memberDetails,
          password,
        };
        await setUserData(userData);
        
        // Store user role
        await setUserRole(user.role || 'member');
        
        // Show success message
        Alert.alert(
          'Registration Successful!',
          'Your account has been created. You can now access your dashboard.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Member Dashboard (unpaid status)
                navigation.replace('MemberMain');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle specific error messages from backend
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
      <StatusBar barStyle="dark-content" backgroundColor="#E8F0FE" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Registration</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.stepIndicator}>Step 2 of 2</Text>

      <View style={styles.tabContainer}>
        <View style={styles.inactiveTab}>
          <Text style={styles.inactiveTabText}>Personal Info</Text>
        </View>
        <View style={styles.activeTab}>
          <Text style={styles.activeTabText}>Location</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location Details</Text>
          </View>

          <View style={styles.form}>
            {/* State Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>State</Text>
              <View style={[styles.pickerContainer, errors.state && styles.inputError]}>
                <Picker
                  selectedValue={selectedState}
                  onValueChange={(value) => {
                    setSelectedState(value);
                    setErrors({ ...errors, state: '' });
                  }}
                  enabled={!isLoading}
                  style={styles.picker}
                  dropdownIconColor="#555"
                  mode="dropdown"
                >
                  <Picker.Item label="Select state" value="" />
                  {states.map((state) => (
                    <Picker.Item key={state} label={state} value={state} />
                  ))}
                </Picker>
              </View>
              {errors.state ? (
                <Text style={styles.errorText}>{errors.state}</Text>
              ) : null}
            </View>

            {/* District Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>District</Text>
              <View
                style={[
                  styles.pickerContainer,
                  errors.district && styles.inputError,
                  !selectedState && styles.pickerDisabled,
                ]}
              >
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={(value) => {
                    setSelectedDistrict(value);
                    setErrors({ ...errors, district: '' });
                  }}
                  enabled={!isLoading && !!selectedState}
                  style={styles.picker}
                  dropdownIconColor="#555"
                  mode="dropdown"
                >
                  <Picker.Item label="Select district" value="" />
                  {districts.map((district) => (
                    <Picker.Item key={district} label={district} value={district} />
                  ))}
                </Picker>
              </View>
              {errors.district ? (
                <Text style={styles.errorText}>{errors.district}</Text>
              ) : null}
            </View>

            {/* City Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder="Enter city name"
                placeholderTextColor="#7a7a7a"
                value={city}
                onChangeText={(text) => {
                  setCity(text);
                  setErrors({ ...errors, city: '' });
                }}
                editable={!isLoading}
              />
              {errors.city ? (
                <Text style={styles.errorText}>{errors.city}</Text>
              ) : null}
            </View>

            {/* Block Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Block</Text>
              <View
                style={[
                  styles.pickerContainer,
                  errors.block && styles.inputError,
                  !selectedDistrict && styles.pickerDisabled,
                ]}
              >
                <Picker
                  selectedValue={selectedBlock}
                  onValueChange={(value) => {
                    setSelectedBlock(value);
                    setErrors({ ...errors, block: '' });
                  }}
                  enabled={!isLoading && !!selectedDistrict}
                  style={styles.picker}
                  dropdownIconColor="#555"
                  mode="dropdown"
                >
                  <Picker.Item label="Select block" value="" />
                  {blocks.map((block) => (
                    <Picker.Item key={block} label={block} value={block} />
                  ))}
                </Picker>
              </View>
              {errors.block ? (
                <Text style={styles.errorText}>{errors.block}</Text>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.previousButton, isLoading && styles.buttonDisabled]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.previousButtonText}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#E8F0FE',
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#E8F0FE',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  stepIndicator: {
    fontSize: FONTS.sizes.base,
    color: '#999',
    textAlign: 'center',
    paddingVertical: SPACING.xs,
    backgroundColor: '#E8F0FE',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  activeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 3,
    borderBottomColor: '#4A90E2',
    marginLeft: SPACING.sm,
  },
  activeTabText: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
    color: '#4A90E2',
    textAlign: 'center',
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
    marginRight: SPACING.sm,
  },
  inactiveTabText: {
    fontSize: FONTS.sizes.base,
    color: '#999',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.md,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1.2,
    borderColor: '#d9d9d9',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 0,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: '#000',
    fontSize: 15,
  },
  pickerItemStyle: {
    fontSize: 15,
    color: '#000',
  },
  pickerPlaceholderStyle: {
    color: '#555',
  },
  pickerDisabled: {
    backgroundColor: '#F5F5F5',
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#d9d9d9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  previousButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#CCC',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousButtonText: {
    color: '#666',
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semiBold,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
});

export default RegistrationStep2Screen;
