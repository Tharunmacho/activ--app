import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ConsoleScroll, ConsoleHeader, ConsoleCard, ConsoleSearch, ConsoleButton, ConsoleNote, GlassIconButton, PremiumInput, SPACE, PALETTE } from '../../../ui';
import { correctionForm, listMembershipIds, getMembershipId, updateMembershipId, type MembershipIdRecord, type MembershipIdCorrection, type MembershipIdPage } from '../../../services/membershipIdApi';
import { errorText } from '../../../services/superApi';
import { ToggleRow } from './superKit';

const INPUTS = [['fullName', 'Full name'], ['email', 'Email / login'], ['phoneNumber', 'Mobile number'], ['whatsappNumber', 'WhatsApp number'], ['state', 'State'], ['district', 'District'], ['block', 'Block'], ['city', 'City'], ['place', 'Place / overseas address'], ['educationalQualification', 'Education']] as const;
export default function SuperMembershipIdsScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MembershipIdPage | null>(null);
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [selected, setSelected] = useState<MembershipIdRecord | null>(null);
  const [form, setForm] = useState<MembershipIdCorrection | null>(null);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const next = await listMembershipIds(search, page); if (current === generation.current) setData(next); }
    catch (e) { if (current === generation.current) setError(errorText(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [search, page]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const open = async (id: string) => {
    setError(''); setMessage('');
    try { const row = await getMembershipId(id); setSelected(row); setForm(correctionForm(row)); }
    catch (e) { setError(errorText(e)); }
  };
  const change = (key: keyof MembershipIdCorrection, value: string | boolean) => setForm(f => f && ({ ...f, [key]: value }));
  const save = async () => {
    if (!selected || !form || saving) return;
    setSaving(true); setError('');
    try { await updateMembershipId(selected.id, form); setSelected(null); setForm(null); setMessage('Membership record updated.'); await load(); }
    catch (e) { setError(errorText(e)); }
    finally { setSaving(false); }
  };
  const back = () => { if (saving) return; if (selected) { setSelected(null); setForm(null); setError(''); } else navigation.goBack(); };
  return <ConsoleScroll avoidKeyboard refreshControl={!selected ? <RefreshControl refreshing={loading} onRefresh={load} /> : undefined}>
    <ConsoleHeader compact title={selected ? 'Membership record' : 'Membership IDs'} subtitle={selected ? selected.fullName : 'Member identities and correction history'} left={<GlassIconButton icon="arrow-back" accessibilityLabel="Back" onPress={back} />} />
    {!!message && <ConsoleNote style={s.card} text={message} />}
    {selected && form ? <>
      <ConsoleCard style={s.card}>
        <Text style={s.heading}>{selected.planName} · {selected.status}</Text>
        <PremiumInput tone="admin" label="Membership ID" value={form.membershipNumber} editable={selected.editable && !saving && !form.generateId} autoCapitalize="characters" onChangeText={v => change('membershipNumber', v.toUpperCase())} />
        {selected.editable && <ToggleRow label="Assign the next available category ID" value={form.generateId} onChange={v => { if (!saving) change('generateId', v); }} />}
        <Text style={s.help}>Example: ACTIV-BEG-20261012-001. Previous IDs remain searchable.</Text>
        {INPUTS.map(([key, label]) => <PremiumInput key={key} tone="admin" label={label} value={form[key]} editable={selected.editable && !saving} onChangeText={v => change(key, v)} maxLength={200} autoCapitalize={key === 'email' ? 'none' : 'words'} keyboardType={key === 'email' ? 'email-address' : key.includes('Number') ? 'phone-pad' : 'default'} />)}
        <PremiumInput tone="admin" label="Member since (YYYY-MM-DD)" value={form.memberSince} editable={selected.editable && !saving} onChangeText={v => change('memberSince', v)} maxLength={10} />
        {!selected.lifetime && <PremiumInput tone="admin" label="Valid through, inclusive (YYYY-MM-DD)" value={form.validUntil} editable={selected.editable && !saving} onChangeText={v => change('validUntil', v)} maxLength={10} />}
        {selected.editable && <PremiumInput tone="admin" label="Reason for this correction" value={form.note} editable={!saving} onChangeText={v => change('note', v)} multiline maxLength={500} />}
        {!!selected.previousIds.length && <Text selectable style={s.help}>Previous IDs: {selected.previousIds.join(', ')}</Text>}
      </ConsoleCard>
      {!!error && <ConsoleNote style={s.card} kind="red" text={error} />}
      {selected.editable && <View style={s.card}><ConsoleButton label="Save changes" icon="save" onPress={save} loading={saving} disabled={saving || !form.note.trim()} /></View>}
      {!!selected.history.length && <ConsoleCard style={s.card}><Text style={s.heading}>Correction history</Text>{selected.history.map((entry, i) => <View key={i} style={s.history}><Text style={s.body}>{entry.note}</Text><Text style={s.help}>{entry.by} · {new Date(entry.at).toLocaleDateString('en-IN')}</Text>{Object.entries(entry.changes).map(([key, value]) => <Text key={key} selectable style={s.help}>{key}: {String(value.before ?? '—')} → {String(value.after ?? '—')}</Text>)}</View>)}</ConsoleCard>}
    </> : <>
      <ConsoleNote style={s.card} text="BEG Beginner · INT Intermediate · IDL Ideal · STU Student · ASP Aspirant · LIF Lifetime. IDs include the joining date and a unique daily number." />
      <View style={s.card}><ConsoleSearch value={query} onChangeText={setQuery} placeholder="ID, name, email or mobile" onSubmitEditing={() => { setSearch(query); setPage(1); }} /><ConsoleButton label="Search members" icon="search" onPress={() => { setSearch(query); setPage(1); if (search === query && page === 1) void load(); }} /></View>
      {!!error && <ConsoleNote style={s.card} kind="red" text={error} />}
      <Text style={[s.help, s.card]}>{loading ? 'Loading members…' : `${data?.total || 0} members`}</Text>
      {!loading && data?.rows.map(row => <ConsoleCard key={row.id} style={s.card}>
        <Text selectable style={s.id}>{row.membershipNumber || 'ID pending'}</Text><Text style={s.heading}>{row.fullName}</Text>
        <Text style={s.body}>{row.planName} · {row.status}</Text><Text style={s.help}>{row.email}</Text><Text style={s.help}>{row.phoneNumber}</Text>
        <View style={s.dates}><View style={s.half}><Text style={s.help}>Member since</Text><Text style={s.body}>{row.memberSince || 'Not recorded'}</Text></View><View style={s.half}><Text style={s.help}>Valid until</Text><Text style={s.body}>{row.lifetime ? 'Lifetime' : row.validUntil || 'Not recorded'}</Text></View></View>
        <ConsoleButton label={row.editable ? 'Edit record' : 'View record'} icon="edit" onPress={() => open(row.id)} />
      </ConsoleCard>)}
      {!loading && !data?.rows.length && !error && <ConsoleNote style={s.card} text="No membership records match your search." />}
      <View style={[s.card, s.dates]}><View style={s.half}><ConsoleButton label="Previous" disabled={loading || page <= 1} onPress={() => setPage(p => p - 1)} /></View><View style={s.half}><ConsoleButton label="Next" disabled={loading || page * (data?.limit || 20) >= (data?.total || 0)} onPress={() => setPage(p => p + 1)} /></View></View>
    </>}
  </ConsoleScroll>;
}
const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.md },
  heading: { fontSize: 18, fontWeight: '700', color: PALETTE.text, marginVertical: 6 },
  id: { fontSize: 16, lineHeight: 23, fontWeight: '800', color: '#234EC2' },
  body: { fontSize: 15, lineHeight: 22, color: PALETTE.text },
  help: { fontSize: 13, lineHeight: 20, color: '#64748B', marginVertical: 3 },
  dates: { flexDirection: 'row', gap: SPACE.md, marginVertical: SPACE.md }, half: { flex: 1, minWidth: 0 },
  history: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 12 },
});
