import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../../services/api';
import { errorText } from '../../../services/superApi';
import { ConsoleCard, ConsoleButton, PremiumInput, PALETTE, SPACE } from '../../../ui';

type Policy = { enabled: boolean; requireLatestAvailable: boolean; minimumVersionCode: number; message: string };
const data = (response: any) => response?.data?.data ?? response?.data;
export default function AppUpdateSettings() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [minimum, setMinimum] = useState('1');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setError('');
    api.get('/app-updates/admin').then(response => {
      const value = data(response);
      if (!value || !Number.isInteger(value.minimumVersionCode)) throw new Error('Could not load Android update settings.');
      if (active) { setPolicy({ ...value, requireLatestAvailable: value.requireLatestAvailable !== false }); setMinimum(String(value.minimumVersionCode)); }
    }).catch(cause => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [attempt]);
  const save = async () => {
    if (!policy || busy) return;
    const value = Number(minimum);
    if (!/^\d+$/.test(minimum) || !Number.isSafeInteger(value) || value < 1 || value > 2100000000) { setError('Enter a valid positive Android build number.'); return; }
    if (policy.enabled && !confirmed) { setError('Confirm the required release is available in Google Play.'); return; }
    setBusy(true); setError(''); setSaved(false);
    try {
      const next = data(await api.put('/app-updates/admin', { enabled: policy.enabled, requireLatestAvailable: policy.requireLatestAvailable, minimumVersionCode: value, message: policy.message.trim(), productionAvailableConfirmed: confirmed }));
      if (!next || !Number.isInteger(next.minimumVersionCode)) throw new Error('The update settings could not be saved.');
      setPolicy(next); setMinimum(String(next.minimumVersionCode)); setConfirmed(false); setSaved(true);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  return <ConsoleCard style={s.card}>
    <Text style={s.title}>Android app updates</Text>
    <Text style={s.hint}>Require members to update when Google Play offers their device a newer release. Older apps without this check need to install a supported build first.</Text>
    {!policy && !error ? <Text style={s.hint}>Loading update settings…</Text> : null}
    {policy ? <View style={s.stack}>
      <View style={s.row}><Text style={[s.label, s.flex]}>Require app updates</Text><Switch accessibilityLabel="Require app updates" value={policy.enabled} disabled={busy} onValueChange={enabled => { setPolicy({ ...policy, enabled }); setConfirmed(false); setSaved(false); }}/></View>
      <View style={s.row}><View style={s.flex}><Text style={s.label}>Require each new Play release</Text><Text style={s.hint}>Detect future releases automatically when available to this member.</Text></View><Switch accessibilityLabel="Require each new Play release" value={policy.requireLatestAvailable} disabled={busy} onValueChange={requireLatestAvailable => { setPolicy({ ...policy, requireLatestAvailable }); setConfirmed(false); setSaved(false); }}/></View>
      <PremiumInput tone="admin" label="Minimum Android build number" value={minimum} onChangeText={value => { setMinimum(value); setConfirmed(false); setSaved(false); }} keyboardType="number-pad" editable={!busy} inputStyle={s.input} hint="Use the Play release version code. 1 adds no extra minimum; automatic updates still apply."/>
      <PremiumInput tone="admin" label="Message shown to members" value={policy.message} onChangeText={message => { setPolicy({ ...policy, message }); setSaved(false); }} multiline maxLength={300} editable={!busy} inputStyle={s.input}/>
      {policy.enabled ? <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Required release is available in Google Play" accessibilityState={{ checked: confirmed, disabled: busy }} disabled={busy} onPress={() => setConfirmed(value => !value)} style={s.confirm}>
        <Icon name={confirmed ? 'check-box' : 'check-box-outline-blank'} size={24} color={PALETTE.indigo}/><Text style={[s.hint, s.flex]}>I confirm the required release is published and available to members in Google Play.</Text>
      </TouchableOpacity> : null}
      <ConsoleButton label="Save update settings" icon="save" onPress={save} loading={busy} disabled={busy || (policy.enabled && !confirmed)}/>
    </View> : null}
    {saved ? <Text accessibilityLiveRegion="polite" style={s.hint}>Android update settings saved.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {!policy && error ? <ConsoleButton kind="soft" label="Retry update settings" onPress={() => setAttempt(value => value + 1)}/> : null}
  </ConsoleCard>;
}
const s = StyleSheet.create({
  card: { marginTop: SPACE.lg }, stack: { gap: SPACE.md }, flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  title: { fontSize: 20, lineHeight: 28, color: PALETTE.text, fontWeight: '600', marginBottom: SPACE.sm },
  label: { fontSize: 16, lineHeight: 24, color: PALETTE.text, fontWeight: '600' },
  hint: { fontSize: 15, lineHeight: 22, color: PALETTE.textMuted, marginBottom: SPACE.sm },
  input: { fontSize: 16, lineHeight: 24 }, error: { color: PALETTE.red, fontSize: 15, lineHeight: 22 },
  confirm: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingVertical: SPACE.sm },
});
