import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Screen, AppHeader, Field, Loading, ErrorState, EmptyState, Badge, SegmentedTabs, StatTile, StatGrid, Avatar,
  PALETTE, SPACE, RADIUS, SHADOW, money, shortDate,
} from '../../../ui';
import {
  getDonationSummary, listDonors, listDonations, fyLabel, statementUrl, receiptUrl, errorText,
} from '../../../services/superApi';
import { ChipRow, MiniAction, openUrl, place } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — Donors (website /super-admin/donations)
 * ============================================================================
 *
 * GET /admin/super/donations/summary?fy, /donors?fy&q, and /donations?fy —
 * every donor and every gift (each gift is its own row, with its own message
 * and 80G receipt). The receipt and the year certificate are public web pages
 * keyed by an unguessable token; they open in the browser.
 */

type Tab = 'donors' | 'donations';

function DonorRow({ d, fy, onOpen }: { d: any; fy: string; onOpen: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onOpen}>
      <View style={[s.card, SHADOW.card]}>
        <View style={s.row}>
          <Avatar name={d?.fullName} size={44} color="#B45309" bg={PALETTE.amberSoft} />
          <View style={{ flex: 1, minWidth: 0, marginHorizontal: SPACE.md }}>
            <Text style={s.name} numberOfLines={1}>{d?.fullName || '—'}</Text>
            {d?.email ? <Text style={s.sub} numberOfLines={1}>{d.email}</Text> : null}
            {d?.phone ? <Text style={s.sub} numberOfLines={1}>{d.phone}</Text> : null}
            {place(d?.city, d?.district, d?.state) ? <Text style={s.sub} numberOfLines={1}>{place(d?.city, d?.district, d?.state)}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amount}>{money(d?.totalAmount)}</Text>
            <Text style={s.sub}>{d?.donationCount || 0} gift{d?.donationCount === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <View style={s.foot}>
          <Text style={s.footText}>All time {money(d?.allTimeAmount)}{d?.lastDonationAt ? ` · last ${shortDate(d.lastDonationAt)}` : ''}{d?.pan ? ` · PAN ${d.pan}` : ''}</Text>
          {d?.statementToken ? (
            <MiniAction icon="event-note" label="Year certificate" color="#B45309" onPress={() => openUrl(statementUrl(d.statementToken, fy || undefined))} />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DonationRow({ r, onOpenDonor }: { r: any; onOpenDonor: () => void }) {
  const paid = String(r?.status || '').toLowerCase() === 'paid';
  return (
    <View style={[s.card, SHADOW.card]}>
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TouchableOpacity onPress={onOpenDonor} disabled={!r?.donorId}>
            <Text style={s.name} numberOfLines={1}>{r?.donorName || '—'}</Text>
          </TouchableOpacity>
          {r?.donorEmail ? <Text style={s.sub} numberOfLines={1}>{r.donorEmail}</Text> : null}
          <Text style={s.sub} numberOfLines={1}>{r?.receiptNumber || 'No receipt yet'} · {shortDate(r?.paidAt || r?.createdAt) || '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.amount}>{money(r?.amount)}</Text>
          <Badge label={String(r?.status || 'pending')} status={String(r?.status || 'pending')} style={{ marginTop: 4 }} />
        </View>
      </View>
      {r?.message ? <Text style={s.message}>“{r.message}”</Text> : null}
      {paid && r?.receiptToken ? (
        <View style={[s.foot, { justifyContent: 'flex-end' }]}>
          <MiniAction icon="receipt-long" label="80G receipt" color="#B45309" onPress={() => openUrl(receiptUrl(r.receiptToken))} />
        </View>
      ) : null}
    </View>
  );
}

const SuperDonorsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [fy, setFy] = useState('');
  const [tab, setTab] = useState<Tab>('donors');
  const [q, setQ] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [sm, dn, dl] = await Promise.all([
        getDonationSummary(fy || undefined),
        listDonors({ fy: fy || undefined, q: (q || '').trim() || undefined, limit: 200 }),
        listDonations({ fy: fy || undefined, limit: 200 }),
      ]);
      setSummary(sm);
      setDonors(Array.isArray(dn?.rows) ? dn.rows : []);
      setDonations(Array.isArray(dl?.rows) ? dl.rows : []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fy, q]);

  // Search is sent to the server (debounced); the year reloads at once.
  useEffect(() => {
    const t = setTimeout(() => { load(); }, (q || '').length ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const years: string[] = Array.isArray(summary?.financialYears) ? summary.financialYears : [];
  const shownDonations = useMemo(() => {
    const term = (q || '').trim().toLowerCase();
    if (!term) return donations;
    return donations.filter((r) => [r?.donorName, r?.donorEmail, r?.receiptNumber, r?.message].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [donations, q]);

  const header = (
    <View>
      <AppHeader tone="admin" title="Donors" subtitle="Every donor, every gift, 80G receipts & year certificates" onBack={() => navigation.goBack()} />
      <ChipRow<string>
        options={[{ value: '', label: 'All years' }, ...years.map((y) => ({ value: y, label: `FY ${fyLabel(y)}` }))]}
        value={fy}
        onChange={setFy}
      />
      <View style={{ height: SPACE.md }} />
      <StatGrid>
        <StatTile label="Total donated" hint={fy ? `FY ${fyLabel(fy)}` : 'All years'} value={money(summary?.totalAmount || 0)} icon="currency-rupee" color="#B45309" soft={PALETTE.amberSoft} />
        <StatTile label="Donations" value={Number(summary?.donationCount || 0).toLocaleString('en-IN')} icon="volunteer-activism" color={PALETTE.indigo} soft={PALETTE.indigoSoft} />
        <StatTile label="Donors" value={Number(summary?.donorCount || 0).toLocaleString('en-IN')} icon="groups" color={PALETTE.green} soft={PALETTE.greenSoft} />
        <StatTile label="This month" value={money(summary?.thisMonthAmount || 0)} icon="calendar-today" color={PALETTE.blue} soft={PALETTE.blueSoft} />
      </StatGrid>
      <SegmentedTabs<Tab> tone="admin" value={tab} onChange={setTab}
        options={[{ value: 'donors', label: 'Donors', count: donors.length }, { value: 'donations', label: 'All donations', count: donations.length }]} />
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
        <Field icon="search" placeholder="Name, email, phone, PAN or receipt" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} />
      </View>
    </View>
  );

  if (loading && !summary) return <Screen tone="admin"><AppHeader tone="admin" title="Donors" onBack={() => navigation.goBack()} /><Loading tone="admin" label="Loading donors…" /></Screen>;
  if (error && !summary) return <Screen tone="admin"><AppHeader tone="admin" title="Donors" onBack={() => navigation.goBack()} /><ErrorState tone="admin" message={error} onRetry={() => load()} /></Screen>;

  const data: any[] = tab === 'donors' ? donors : shownDonations;
  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={data}
        keyExtractor={(x, i) => String(x?.id || x?._id || i)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => load('refresh')}
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={<EmptyState tone="admin" icon="volunteer-activism" title={tab === 'donors' ? `No donors ${fy ? `in FY ${fyLabel(fy)}` : 'yet'}${(q || '').trim() ? ' match that search' : ''}` : `No donations ${fy ? `in FY ${fyLabel(fy)}` : 'yet'}`} message={error || 'Donations made on the website appear here.'} />}
        renderItem={({ item }) => tab === 'donors' ? (
          <DonorRow d={item} fy={fy} onOpen={() => navigation.navigate('SuperDonorDetail', { id: String(item?.id || ''), name: item?.fullName })} />
        ) : (
          <DonationRow r={item} onOpenDonor={() => navigation.navigate('SuperDonorDetail', { id: String(item?.donorId || ''), name: item?.donorName })} />
        )}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#B45309' },
  message: { fontSize: 13, color: PALETTE.textSoft, fontStyle: 'italic', marginTop: SPACE.sm, lineHeight: 19 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: SPACE.md, flexWrap: 'wrap' },
  footText: { flex: 1, minWidth: 140, fontSize: 12, color: PALETTE.textMuted },
});

export default SuperDonorsScreen;
