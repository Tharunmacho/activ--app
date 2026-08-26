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
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api.config';

/**
 * Set a new password using the code from the reset email.
 *
 * The code is pasted rather than picked up automatically because this app has
 * no deep-link handler registered — the reset email carries a web URL, and
 * without an `activ://` scheme claimed by the app there is nothing for the
 * system to hand back to it. Asking the member to paste the code is honest
 * about that and needs no native configuration to work.
 *
 * A `token` route param is still accepted, so the moment deep linking is set up
 * the screen works from a link with no further change.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type Route = RouteProp<RootStackParamList, 'ResetPassword'>;

interface Props {
  navigation: Nav;
  route?: Route;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [token, setToken] = useState(route?.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const code = token.trim();

    if (!code) {
      setError('Paste the reset code from your email.');
      return;
    }
    // Matches the server's own minimum, so a password it will refuse is never
    // sent and the member is told before waiting on a request.
    if (password.length < 6) {
      setError('Your new password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token: code, password });
      setDone(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'That code is not valid, or it has expired. Request a new link and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- done ---------------------------------------------------------------
  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Icon name="check-circle" size={48} color="#16A34A" />
          </View>

          <Text style={styles.doneTitle}>Password changed</Text>
          <Text style={styles.doneText}>
            You can now sign in with your new password.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
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

          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            Paste the code from your reset email, then choose a new password.
          </Text>

          <Text style={styles.label}>Reset code</Text>
          <View style={styles.inputWrap}>
            <Icon name="vpn-key" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={(text) => {
                setToken(text);
                if (error) setError('');
              }}
              placeholder="Paste the code from your email"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <Text style={[styles.label, styles.spaced]}>New password</Text>
          <View style={styles.inputWrap}>
            <Icon name="lock-outline" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!show}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShow(!show)} activeOpacity={0.7}>
              <Icon
                name={show ? 'visibility-off' : 'visibility'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, styles.spaced]}>Confirm new password</Text>
          <View style={styles.inputWrap}>
            <Icon name="lock-outline" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                if (error) setError('');
              }}
              placeholder="Type it again"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!show}
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="done"
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
              <Text style={styles.primaryButtonText}>Change password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Send me a new link</Text>
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
  spaced: { marginTop: SPACING.lg },

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
  input: {
    flex: 1,
    marginHorizontal: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: SPACING.sm,
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
    backgroundColor: '#F0FDF4',
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

export default ResetPasswordScreen;
