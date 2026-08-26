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
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { validateEmail, validatePassword } from '../../utils/validators';
import api, { setUserData } from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';
import { useAuthStore } from '../../stores/exampleStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuthStore();

  const validateForm = (): boolean => {
    let isValid = true;

    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      isValid = false;
    } else {
      setEmailError('');
    }

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setPasswordError(passwordErr);
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await api.post(ENDPOINTS.AUTH.LOGIN, {
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.data.success) {
        const { token, user, role } = response.data.data;
        const fullUserData = { ...user, password };
        await setUserData(fullUserData);
        await login(fullUserData, token, role);

        switch (role) {
          case UserRole.MEMBER:
          case 'member':
            navigation.replace('MemberMain');
            break;
          case UserRole.BLOCK_ADMIN:
          case 'block_admin':
            navigation.replace('BlockDashboard');
            break;
          case UserRole.DISTRICT_ADMIN:
          case 'district_admin':
            navigation.replace('DistrictDashboard');
            break;
          case UserRole.STATE_ADMIN:
          case 'state_admin':
            navigation.replace('StateDashboard');
            break;
          case UserRole.SUPER_ADMIN:
          case 'super_admin':
            navigation.replace('SuperAdminDashboard');
            break;
          default:
            navigation.replace('MemberMain');
        }
      }
    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('RegistrationStep1');
  };

  const handleSocialLogin = (provider: string) => {
    try {
      Alert.alert(
        `${provider || 'Social'} Login`,
        `${provider || 'Social'} sign-in is coming soon.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.warn('Social login handler safely caught:', err);
    }
  };

  const handleForgotPassword = () => {
    // Was an Alert telling the member to enter their email, with nowhere to
    // enter it. The screen it should always have opened now exists.
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Pure White Circular Logo Container */}
          <View style={styles.heroCircleContainer}>
            <View style={styles.heroCircle}>
              <Image
                source={require('../../assets/images/activlogo.png')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Heading & Subtitle */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to access your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={[styles.inputCard, emailError ? styles.inputCardError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A1A1AA"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputCard, passwordError ? styles.inputCardError : null]}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#A1A1AA"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.6}
                >
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Remember Me & Forget Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Forget password?</Text>
              </TouchableOpacity>
            </View>

            {/* Main Action Button (Light Blue Theme Color) */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Don't have an account? Register as member */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.7}>
                <Text style={styles.signUpText}>Register as member</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.divider} />
            </View>

            {/* 3 Social Buttons in 1 Row — logos only, no labels */}
            <View style={styles.socialRow}>
              {/* Google */}
              <TouchableOpacity
                style={styles.socialCardButton}
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() => handleSocialLogin('Google')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Image
                  source={require('../../assets/images/google.png')}
                  style={styles.socialLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                style={styles.socialCardButton}
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() => handleSocialLogin('Facebook')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Facebook"
              >
                <Image
                  source={require('../../assets/images/facebook.png')}
                  style={styles.socialLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* LinkedIn */}
              <TouchableOpacity
                style={styles.socialCardButton}
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() => handleSocialLogin('LinkedIn')}
                accessibilityRole="button"
                accessibilityLabel="Continue with LinkedIn"
              >
                <Image
                  source={require('../../assets/images/linkedin.png')}
                  style={styles.socialLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F4F8', // Light blue soft background tint
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    justifyContent: 'center',
  },
  heroCircleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  heroCircle: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: '#FFFFFF', // Pure White Background only as requested
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroLogo: {
    // Source art is 899x277 (~3.25:1) — width drives the fit under `contain`
    width: 100,
    height: 34,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputCard: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputCardError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  passwordInput: {
    paddingRight: 36,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 3,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkboxChecked: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E88E5',
  },
  loginButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E88E5', // Light blue primary color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  registerPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  signUpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E88E5',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  socialCardButton: {
    // Sized to the logo instead of stretching to a full third of the row
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  socialLogo: {
    // Source art is square 96x96 — square box keeps the marks at native proportions
    width: 26,
    height: 26,
  },
});

export default LoginScreen;

