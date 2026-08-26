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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';

/**
 * Ask for a password reset link.
 *
 * The "Forget password?" link on the login screen used to open an `Alert`
 * telling the member to enter their email — with nowhere to enter it. This is
 * the screen that was missing.
 *
 * The server answers the same way whether or not the address is registered, and
 * so does this screen. Saying "no account with that email" would turn the form
 * into a way of discovering which addresses have accounts, which is worth more
 * to someone guessing than the small convenience is to a member who mistyped.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: Nav;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const address = email.trim().toLowerCase();

    if (!address) {
      setError('Enter the email address you registered with.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('That does not look like an email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: address });
      setSent(true);
    } catch (err: any) {
      // A network failure is the member's problem to act on; anything else the
      // server chose to say is deliberately generic already.
      setError(
        err?.response?.data?.message ||
          'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- sent ---------------------------------------------------------------
  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Icon name="mark-email-read" size={44} color={COLORS.primary} />
          </View>

          <Text style={styles.doneTitle}>Check your email</Text>
          <Text style={styles.doneText}>
            If {email.trim().toLowerCase()} is registered, a reset link is on its way. The
            link expires in one hour.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ResetPassword')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>I have a reset code</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- form ---------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter the email address you registered with and we will send you a link to set a
            new password.
          </Text>

          <Text style={styles.label}>Email address</Text>
          <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
            <Icon name="mail-outline" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send reset link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ResetPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>I already have a reset code</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.md },

  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: SPACING.md },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 54,
    backgroundColor: '#F8FAFC',
  },
  inputWrapError: { borderColor: '#EF4444' },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: SPACING.xs,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.lg,
  },

  doneWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  doneText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ForgotPasswordScreen;
