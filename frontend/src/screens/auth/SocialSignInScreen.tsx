import React, { useEffect, useRef, useState } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { homeForRole, clearSession, sanitizeUser, isAdminRole, UNSUPPORTED_ACCOUNT_MESSAGE } from '../../services/session';
import { useAuthStore } from '../../stores/exampleStore';
import { PALETTE, SPACE, TYPE, GradientButton, SocialConnect3D, SocialMark } from '../../ui';
import { errorText } from '../../ui/data';
import { authStyles as a } from './authStyles';
import { PremiumAuthScreen, StatusPanel } from './authKit';

/**
 * ============================================================================
 * SOCIAL SIGN-IN LANDING (website: pages/auth/SocialSignIn.tsx)
 * ============================================================================
 *
 * Reached from the deep link activ://auth/social?… that the server's OAuth
 * callback sends the system browser to when the sign-in was started with
 * `/auth/oauth/:provider/start?client=app`.
 *
 *   code        -> POST /auth/oauth/exchange { code } -> the normal sign-in
 *                  response, stored exactly as the password sign-in stores it
 *   no_account  -> "create an account", registration prefilled with the
 *                  provider's verified email and name
 *   anything else -> the website's sentence for that reason
 *
 * The code is single-use and lives 60 seconds, so it is exchanged once.
 *
 * Premium: the brand header with linked-accounts art; the provider's real
 * mark beside the verdict. Like the website's toast, a successful sign-in
 * greets the member by name for a moment before the home screen opens.
 */

type Props = NativeStackScreenProps<RootStackParamList, 'SocialSignIn'>;

const REASONS: Record<string, string> = {
  cancelled: 'Sign-in was cancelled.',
  expired: 'That sign-in took too long or was started in another window. Please try again.',
  failed: 'We could not complete the sign-in with that provider. Please try again.',
  no_email: 'That account did not share a verified email address with us, so we cannot match it to an ACTIV account.',
  admin: 'Administrators sign in with their email and password on the admin login screen.',
  not_configured: 'That sign-in option is not available yet. Please use your email and password.',
  unavailable: 'That sign-in option is not available yet. Please use your email and password.',
};

const PROVIDER_NAME: Record<string, string> = { google: 'Google', facebook: 'Facebook', linkedin: 'LinkedIn' };

const SocialSignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const code = String(route?.params?.code || '');
  const reason = String(route?.params?.error || '');
  const provider = String(route?.params?.provider || '');
  const email = String(route?.params?.email || '');
  const name = String(route?.params?.name || '');

  const [error, setError] = useState('');
  const [welcome, setWelcome] = useState('');
  const exchanged = useRef('');
  const { login } = useAuthStore();

  useEffect(() => {
    if (reason === 'no_account') return;
    if (!code) {
      setError(REASONS[reason] || REASONS.failed);
      return;
    }
    if (exchanged.current === code) return;
    exchanged.current = code;
    setError('');

    (async () => {
      try {
        await clearSession();
        const res = await api.post('/auth/oauth/exchange', { code });
        const payload = res?.data?.data || res?.data || {};
        const token: string = payload?.token || '';
        const role = String(payload?.role || payload?.user?.role || 'member');
        if (!token) throw new Error(res?.data?.message || REASONS.failed);
        if (isAdminRole(role)) {
          await clearSession();
          setError(REASONS.admin);
          return;
        }
        await login(sanitizeUser(payload?.user || {}), token, role as any);
        const home = await homeForRole(role, payload?.memberDetails);
        if (!home) {
          await clearSession();
          setError(UNSUPPORTED_ACCOUNT_MESSAGE);
          return;
        }
        // Website parity: "Welcome {fullName}!" before the home screen.
        const who = String(payload?.user?.fullName || payload?.user?.name || '').trim();
        setWelcome(who || 'back');
        setTimeout(() => {
          try { navigation.reset({ index: 0, routes: [{ name: home }] }); } catch (e) { console.warn('Navigation safely caught:', e); }
        }, 900);
      } catch (err: any) {
        setError(err?.response ? errorText(err, REASONS.failed) : String(err?.message || REASONS.failed));
      }
    })();
  }, [code, reason, login, navigation]);

  const backToLogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  const providerName = PROVIDER_NAME[provider] || '';
  const shell = {
    art: <SocialConnect3D size={100} />,
    eyebrow: providerName ? `Sign in with ${providerName}` : 'Social sign-in',
  };
  const providerRow = providerName ? (
    <View style={s.provider}>
      <SocialMark provider={providerName} size={18} />
      <Text style={s.providerText} numberOfLines={1}>{providerName}{email ? ` · ${email}` : ''}</Text>
    </View>
  ) : null;

  if (reason === 'no_account') {
    return (
      <PremiumAuthScreen {...shell} title="No account yet" subtitle="Create one and it links automatically next time.">
        <StatusPanel
          icon="person-add"
          kind="info"
          title="Let's create your account"
          actions={(
            <>
              <GradientButton
                label="Create an account"
                iconRight="arrow-forward"
                size="lg"
                onPress={() => navigation.replace('RegistrationStep1', { email, name })}
              />
              <GradientButton variant="outline" label="Back to sign in" onPress={backToLogin} />
            </>
          )}
        >
          <Text style={a.statusText}>
            No ACTIV member account uses <Text style={a.statusStrong}>{email || 'that email'}</Text>
            {providerName ? ` (from ${providerName})` : ''}. Create one and it will be
            linked automatically next time.
          </Text>
          {providerRow}
        </StatusPanel>
      </PremiumAuthScreen>
    );
  }

  if (error) {
    return (
      <PremiumAuthScreen {...shell} title="Could not sign in" subtitle="Nothing was changed on your account.">
        <StatusPanel
          icon="error-outline"
          kind="warning"
          title="Sign-in did not finish"
          actions={<GradientButton label="Back to sign in" icon="arrow-back" size="lg" onPress={backToLogin} />}
        >
          {error}
        </StatusPanel>
      </PremiumAuthScreen>
    );
  }

  if (welcome) {
    return (
      <PremiumAuthScreen {...shell} title={welcome === 'back' ? 'Welcome back!' : `Welcome, ${welcome}!`} subtitle="Opening your dashboard…">
        <StatusPanel icon="check-circle" kind="success" title="You're signed in">
          <ActivityIndicator color={PALETTE.blue} style={{ marginTop: SPACE.lg }} />
        </StatusPanel>
      </PremiumAuthScreen>
    );
  }

  return (
    <PremiumAuthScreen {...shell} title="Signing you in" subtitle="Checking your account with ACTIV…">
      <View style={s.loading} accessibilityRole="progressbar" accessibilityLabel="Signing you in">
        <ActivityIndicator size="large" color={PALETTE.blue} />
        <Text style={s.loadingText}>One moment…</Text>
        {providerRow}
      </View>
    </PremiumAuthScreen>
  );
};

const s = StyleSheet.create({
  provider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, alignSelf: 'center',
    marginTop: SPACE.lg, paddingHorizontal: SPACE.md, minHeight: 36, borderRadius: 999,
    borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.white, maxWidth: '100%',
  },
  providerText: { ...TYPE.caption, color: PALETTE.textSoft, flexShrink: 1 },
  loading: { alignItems: 'center', paddingVertical: SPACE.xl, gap: SPACE.md },
  loadingText: { ...TYPE.body, color: PALETTE.textMuted },
});

export default SocialSignInScreen;
