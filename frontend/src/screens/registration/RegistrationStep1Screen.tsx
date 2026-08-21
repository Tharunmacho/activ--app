import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validateRequired,
} from '../../utils/validators';

type RegistrationStep1Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RegistrationStep1'>;
};

const RegistrationStep1Screen: React.FC<RegistrationStep1Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const validateForm = (): boolean => {
    const newErrors = {
      fullName: validateRequired(formData.fullName, 'Full name') || '',
      email: validateEmail(formData.email) || '',
      phoneNumber: validatePhone(formData.phoneNumber) || '',
      password: validatePassword(formData.password) || '',
      confirmPassword: validatePasswordMatch(formData.password, formData.confirmPassword) || '',
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleRegister = () => {
    if (!validateForm()) return;
    navigation.navigate('RegistrationStep2', {
      fullName: formData.fullName.trim(),
      email: formData.email.toLowerCase().trim(),
      phoneNumber: formData.phoneNumber.trim(),
      password: formData.password,
    });
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
        <View style={styles.activeTab}>
          <Text style={styles.activeTabText}>Personal Info</Text>
        </View>
        <TouchableOpacity style={styles.inactiveTab} onPress={() => {}} activeOpacity={1}>
          <Text style={styles.inactiveTabText}>Location</Text>
        </TouchableOpacity>
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
              <Text style={styles.heroSubText}>Let's get started 👋</Text>
              <Text style={styles.heroTitle}>Create Your Account</Text>
              <Text style={styles.heroDesc}>
                Fill in your details to create{'\n'}your member account
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              
              {/* Full Name */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="person-outline" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Full Name</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.fullName && styles.inputError]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.fullName}
                  onChangeText={(text) => handleChange('fullName', text)}
                  editable={!isLoading}
                />
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
              </View>

              {/* Phone Number */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="phone" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Phone Number</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  placeholder="+91 XXXXX XXXXX"
                  placeholderTextColor="#9CA3AF"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleChange('phoneNumber', text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!isLoading}
                />
                {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="email" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Email Address</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="lock-outline" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Password</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                    placeholder="Enter Password"
                    placeholderTextColor="#9CA3AF"
                    value={formData.password}
                    onChangeText={(text) => handleChange('password', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Icon name="lock-outline" size={20} color="#2563EB" style={styles.labelIcon} />
                  <Text style={styles.label}>Confirm Password</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9CA3AF"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleChange('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              {/* Next Button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleRegister}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
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
    marginRight: 8,
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
    marginLeft: 8,
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
  inputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
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

export default RegistrationStep1Screen;
