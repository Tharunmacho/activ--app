import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PremiumPage, PremiumPageHeader, SurfaceCard, GradientButton, PressableScale, StateView, SPACE, PALETTE } from '../../ui';
import { getPublicNotice, getPublicNotices, PublicNotice, recordVisitorOpen, visitorPushEnabled } from '../../services/visitorNotifications';
import { enableVisitorNotifications, disableVisitorNotifications } from '../../services/pushNotifications';
import { getAuthToken } from '../../services/api';
import { ContentImage } from '../../ui/ContentImage';
import { resolveMediaUrl } from '../../config/api.config';

export default function PublicNotificationsScreen({ navigation, route }: any) {
  const [items, setItems] = useState<PublicNotice[]>([]);
  const [selected, setSelected] = useState<PublicNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const read = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setItems(await getPublicNotices()); setEnabled(await visitorPushEnabled());
      if (route?.params?.id) setSelected(await getPublicNotice(route.params.id));
    } catch { setError('This update may no longer be available. Refresh to try again.'); setSelected(null); }
    finally { setLoading(false); }
  }, [route?.params?.id]);
  useEffect(() => { void read(); }, [read]);
  const open = async (item: PublicNotice) => {
    try {
      const current = await getPublicNotice(item.id);
      void recordVisitorOpen(item.id, 'in_app');
      if (current.kind === 'event') navigation.navigate('PublicEventDetail', { id: current.sourceId });
      else setSelected(current);
    } catch { Alert.alert('Update unavailable', 'This update is no longer published. Refresh the list to see current updates.'); }
  };
  const toggle = async () => {
    setBusy(true);
    try {
      if (await getAuthToken()) { navigation.navigate('MemberNotifications'); return; }
      if (enabled) await disableVisitorNotifications(); else await enableVisitorNotifications();
      setEnabled(await visitorPushEnabled());
    } catch { Alert.alert('Could not update notifications', 'Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return <PremiumPage header={<PremiumPageHeader title="Notifications" subtitle="Public events and updates from ACTIV" onBack={() => {
    if (selected) { setSelected(null); navigation.setParams?.({ id: undefined }); } else navigation.goBack();
  }} />} refreshing={loading} onRefresh={read}>
    <View style={s.content}>
      <SurfaceCard><Text style={s.title}>Stay connected</Text><Text style={s.copy}>Receive public events and community updates on this phone. Sign in for updates selected for your membership and region.</Text>
        <GradientButton label={enabled ? 'Turn off visitor alerts' : 'Enable notifications'} icon="notifications-none" onPress={toggle} loading={busy} />
      </SurfaceCard>
      {!!error && <StateView kind="error" title="Unable to load updates" message={error} onAction={read} compact />}
      {!error && selected ? <SurfaceCard>
        <Text style={s.title}>{selected.title}</Text>
        {!!selected.imageUrl && <ContentImage uri={resolveMediaUrl(selected.imageUrl)} style={{ width: '100%', aspectRatio: 1.6, borderRadius: 12, marginBottom: SPACE.md }} resizeMode="contain" />}
        <Text style={s.copy}>{selected.body || selected.summary}</Text>
        {selected.kind === 'event' && <GradientButton label="View event" icon="event" onPress={() => navigation.navigate('PublicEventDetail', { id: selected.sourceId })} />}
      </SurfaceCard> : !error && items.map(item => <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => void open(item)}>
        <SurfaceCard><Text style={s.label}>{item.kind === 'event' ? 'PUBLIC EVENT' : 'COMMUNITY UPDATE'}</Text><Text style={s.title}>{item.title}</Text>
          <Text style={s.copy} numberOfLines={3}>{item.summary}</Text><Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text></SurfaceCard>
      </PressableScale>)}
      {!loading && !error && !selected && !items.length && <SurfaceCard><Text style={s.copy}>New public updates will appear here when ACTIV publishes them.</Text></SurfaceCard>}
      <SurfaceCard><Text style={s.title}>Your next opportunity starts here</Text><Text style={s.copy}>Join ACTIV to connect with members and discover opportunities for your region.</Text>
        <GradientButton label="Become a member" onPress={() => navigation.navigate('RegistrationStep1')} />
        <GradientButton label="Sign in" variant="outline" onPress={() => navigation.navigate('Login')} style={{ marginTop: SPACE.sm }} />
      </SurfaceCard>
    </View>
  </PremiumPage>;
}
const s = StyleSheet.create({ content: { gap: SPACE.md, padding: SPACE.md }, title: { fontSize: 18, fontWeight: '700', color: PALETTE.text, marginBottom: SPACE.sm },
  copy: { fontSize: 14, lineHeight: 22, color: PALETTE.textMuted, marginBottom: SPACE.md }, label: { fontSize: 11, fontWeight: '700', color: PALETTE.blue, marginBottom: SPACE.sm },
  date: { fontSize: 12, color: PALETTE.textMuted } });
