import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ConsoleCard, ConsoleButton, PALETTE, SPACE, TYPE } from '../../../../ui';
import api from '../../../../services/api';
import NotificationPreferences from '../../../../components/NotificationPreferences';

export default function PushDeliveryStatus() {
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const response = await api.get('/notifications/push/status'); setStatus(response.data?.data || response.data); }
    catch { setMessage('Push status could not be loaded. Please try again.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const test = async () => {
    setBusy(true); setMessage('');
    try { await api.post('/notifications/push/test'); setMessage('Test queued for devices signed in to your Super Admin account.'); await load(); }
    catch (error: any) { setMessage(error?.response?.data?.message || 'The test could not be queued.'); }
    finally { setBusy(false); }
  };
  return <ConsoleCard style={{ marginVertical: SPACE.md }}>
    <Text style={{ ...TYPE.title, color: PALETTE.text }}>Push notifications</Text>
    <Text style={{ ...TYPE.body, color: PALETTE.textMuted, marginVertical: SPACE.sm }}>{status ? status.configured ? 'Firebase configured' : 'Firebase setup required' : 'Loading status…'}</Text>
    {status && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      {[[status.devices, 'Registered devices'], [status.queued, 'Queued alerts'], [status.broadcasts, 'Publications processing'], [status.failed, 'Failed alerts']].map(([value, label]) =>
        <View key={label} style={{ width: '46%', padding: SPACE.sm }}><Text style={{ ...TYPE.number, color: PALETTE.text }}>{value}</Text><Text style={{ ...TYPE.caption, color: PALETTE.textMuted }}>{label}</Text></View>)}
    </View>}
    {status?.workerEnabled === false && <Text>Notification delivery is paused on the server.</Text>}
    <NotificationPreferences />
    <ConsoleButton label="Refresh push status" onPress={() => void load()} />
    <View style={{ height: SPACE.sm }} />
    <ConsoleButton label={busy ? 'Queuing…' : 'Send test to my devices'} disabled={busy || !status?.configured || !status?.workerEnabled} onPress={() => void test()} />
    {!!message && <Text accessibilityRole="alert" style={{ ...TYPE.body, color: PALETTE.textMuted, marginTop: SPACE.sm }}>{message}</Text>}
  </ConsoleCard>;
}
