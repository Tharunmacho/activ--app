import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getAuthToken } from '../services/api';
import { enablePushFromSettings, enableVisitorNotifications, firebaseReady } from '../services/pushNotifications';
import { GradientButton, PALETTE, SPACE, TYPE } from '../ui';

export const NOTIFICATION_WELCOME_KEY = '@activ_push_welcome_seen';
const EXISTING_CHOICES = [NOTIFICATION_WELCOME_KEY, '@activ_push_permission_asked', '@activ_visitor_push_enabled'];

// One global prompt after session restoration reaches an app home. A dismissal
// is remembered separately from consent: Later never opts a device in or out.
export default function NotificationPermissionPrompt({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const handled = useRef(false);
  const mounted = useRef(true);
  const working = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!ready || handled.current || !firebaseReady()) { setVisible(false); return; }
    let cancelled = false;
    AsyncStorage.multiGet(EXISTING_CHOICES).then(entries => {
      // Includes a previous explicit off choice; first-use UI must not undo it.
      const alreadyChosen = entries.some(([, value]) => value !== null);
      if (!cancelled && !handled.current) setVisible(!alreadyChosen);
    }).catch(() => { /* Do not turn a storage failure into repeated permission prompts. */ });
    return () => { cancelled = true; };
  }, [ready]);

  const decide = async (allow: boolean) => {
    if (working.current || handled.current) return;
    working.current = true; handled.current = true;
    setBusy(true);
    try {
      await AsyncStorage.setItem(NOTIFICATION_WELCOME_KEY, allow ? 'allowed' : 'later').catch(() => undefined);
      if (allow && mounted.current) {
        // Read the current session at the gesture, so a restored member uses
        // account registration and a visitor receives only public updates.
        const signedIn = await getAuthToken();
        if (!mounted.current) return;
        if (signedIn) await enablePushFromSettings();
        else await enableVisitorNotifications();
      }
    } catch {
      if (mounted.current) Alert.alert('Could not enable notifications', 'Please check your connection. You can enable notifications from the bell or your account settings.');
    } finally {
      working.current = false;
      if (mounted.current) { setBusy(false); setVisible(false); }
    }
  };

  return <Modal visible={ready && active && visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) void decide(false); }}>
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.icon}><Icon name="notifications-active" size={32} color={PALETTE.blue} /></View>
          <Text accessibilityRole="header" style={styles.title}>Stay updated</Text>
          <Text style={styles.body}>Get alerts about ACTIV events and updates. When you sign in, you can also receive updates for your membership and region.</Text>
          <Text style={styles.hint}>You can turn notifications off anytime in your phone or app settings.</Text>
          <GradientButton label="Allow notifications" icon="notifications-none" onPress={() => { void decide(true); }} loading={busy} disabled={busy} style={styles.button} />
          <GradientButton label="Later" variant="outline" onPress={() => { void decide(false); }} disabled={busy} style={styles.button} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACE.lg, backgroundColor: 'rgba(11,26,69,0.5)' },
  card: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 24, backgroundColor: PALETTE.white, overflow: 'hidden' },
  content: { padding: SPACE.xl },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: PALETTE.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.lg },
  title: { ...TYPE.heading, fontSize: 24, lineHeight: 30, color: PALETTE.text },
  body: { ...TYPE.body, color: PALETTE.textMuted, marginTop: SPACE.md },
  hint: { ...TYPE.caption, color: PALETTE.textMuted, marginTop: SPACE.md, marginBottom: SPACE.sm },
  button: { marginTop: SPACE.sm },
});
