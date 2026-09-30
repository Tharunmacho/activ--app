import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Screen, AppHeader, Field, Loading, ErrorState, EmptyState, Badge, Avatar, Notice, PALETTE, SPACE, RADIUS, SHADOW, money, shortDate,
} from '../../../ui';
import { listBookingPeople, getBookingPerson, errorText } from '../../../services/superApi';
import { MiniAction, callNumber, whatsappNumber } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — Booking people (website Bookings → People tab, BookingPeople)
 * ============================================================================
 *
 * GET /events/bookings/people — everyone who has booked anything, members and
 * guests alike, one row per EMAIL ADDRESS (a guest booking and a signed-in one
 * by the same person are one row with their totals added). Loaded once and
 * searched in place, as the website's table does.
 *
 * Tap a person for their whole history (GET /events/bookings/person?email=),
 * shown inline under the card — the website's slide-over, without a native
 * Modal (CLAUDE.md Rule 2).
 *
 * `BookingPeoplePane` is also the People tab of the Bookings screen.
 */

const payTone = (status: string) => (status === 'paid'
  ? { label: 'Paid', fg: '#047857', bg: PALETTE.greenSoft }
  : status === 'not_required' ? { label: 'Free', fg: PALETTE.blueDark, bg: PALETTE.blueSoft }
    : status === 'failed' ? { label: 'Failed', fg: '#B91C1C', bg: PALETTE.redSoft }
      : { label: 'Unpaid', fg: '#B45309', bg: PALETTE.amberSoft });

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

function Tile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={14} color={PALETTE.textFaint} />
        <Text style={s.tileLabel}>{label.toUpperCase()}</Text>
      </View>
      <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Contact({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!String(value || '').trim()) return null;
  return (
    <View style={s.contact}>
      <Icon name={icon} size={16} color={PALETTE.textFaint} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.contactLabel}>{label.toUpperCase()}</Text>
        <Text style={s.contactValue} selectable>{value}</Text>
      </View>
    </View>
  );
}

function PersonDetail({ p, bookings, loading }: { p: any; bookings: any[] | null; loading: boolean }) {
  const list = Array.isArray(bookings) ? bookings : [];
  return (
    <View style={s.detail}>
      <Contact icon="mail-outline" label="Email" value={p?.email} />
      <Contact icon="phone" label="Mobile" value={p?.phone} />
      <Contact icon="verified-user" label="Account" value={p?.isMember ? 'Signed-in member' : 'Guest checkout only'} />
      <Contact icon="event" label="First booked" value={shortDate(p?.firstBookedAt)} />

      <View style={s.tiles}>
        <Tile icon="confirmation-number" label="Bookings" value={String(Number(p?.bookings || 0))} />
        <Tile icon="event" label="Events" value={String(Number(p?.events || 0))} />
        <Tile icon="groups" label="Seats" value={String(Number(p?.seats || 0))} />
        <Tile icon="currency-rupee" label="Paid" value={money(Number(p?.paid || 0))} />
      </View>
      {Number(p?.pending || 0) > 0 ? (
        <View style={s.owed}><Text style={s.owedText}>{money(p.pending)} is owed on a booking that was never completed.</Text></View>
      ) : null}

      <Text style={s.histTitle}>Every booking</Text>
      <Text style={s.sub}>Newest first, across every event.</Text>
      {loading ? <Text style={[s.sub, { marginTop: SPACE.sm }]}>Loading…</Text> : list.length === 0 ? (
        <Text style={[s.sub, { marginTop: SPACE.sm }]}>No bookings found for this address.</Text>
      ) : list.map((b) => {
        const pay = payTone(String(b?.payment?.status || 'pending'));
        const names = (Array.isArray(b?.participants) ? b.participants : []).map((x: any) => String(x?.name || '').trim()).filter(Boolean);
        const seats = Number(b?.noOfPersons || 0);
        return (
          <View key={String(b?.bookingRef)} style={s.bRow}>
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.bTitle} numberOfLines={2}>{b?.eventTitle || 'Untitled event'}</Text>
                <Text style={s.mono}>{b?.bookingRef}{b?.eventStartAt ? ` · ${shortDate(b.eventStartAt)}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.bAmount}>{Number(b?.totalAmount || 0) > 0 ? money(b.totalAmount) : 'Free'}</Text>
                <Text style={s.sub}>{plural(seats, 'seat')}</Text>
              </View>
            </View>
            <View style={s.chips}>
              <Badge label={pay.label} color={pay.fg} bg={pay.bg} />
              {b?.payment?.mode ? <Badge label={String(b.payment.mode)} color="#B45309" bg={PALETTE.amberSoft} /> : null}
              {b?.status === 'cancelled' ? <Badge label="Cancelled" status="cancelled" /> : null}
              {b?.status === 'waitlist' ? <Badge label="Waiting list" color="#B45309" bg={PALETTE.amberSoft} /> : null}
              {b?.memberRateApplied ? (
                <Text style={s.rate}>Member rate{Number(b?.memberSaving || 0) > 0 ? ` · saved ${money(b.memberSaving)}` : ''}</Text>
              ) : null}
            </View>
            {names.length ? <Text style={[s.sub, { marginTop: 6 }]}>{names.join(' · ')}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function PersonCard({ p, index, open, bookings, loading, onToggle }: { p: any; index: number; open: boolean; bookings: any[] | null; loading: boolean; onToggle: () => void }) {
  const events = Number(p?.events || 0);
  const seats = Number(p?.seats || 0);
  return (
    <View style={[s.card, SHADOW.card]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={s.row} accessibilityRole="button"
        accessibilityLabel={`${p?.name || p?.email || 'Person'} — booking history`}>
        <Avatar name={p?.name || p?.email} size={44} color="#FFFFFF" bg={PALETTE.blueDark} />
        <View style={{ flex: 1, minWidth: 0, marginHorizontal: SPACE.md }}>
          <Text style={s.eyebrowNo}>#{index + 1}</Text>
          {p?.name
            ? <Text style={s.name} numberOfLines={1}>{p.name}</Text>
            : <Text style={[s.name, s.noName]} numberOfLines={1}>No name given</Text>}
          <Text style={s.sub} numberOfLines={1}>{p?.email}</Text>
          <Text style={s.sub} numberOfLines={1}>{p?.phone || '—'}{p?.lastBookedAt ? ` · last booked ${shortDate(p.lastBookedAt)}` : ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', maxWidth: 120 }}>
          <Badge label={p?.isMember ? 'Member' : 'Guest'} color={p?.isMember ? '#6D28D9' : PALETTE.textSoft} bg={p?.isMember ? '#EDE9FE' : '#E2E8F0'} />
          {p?.hasMemberRate ? <Text style={[s.rate, { marginTop: 4 }]}>Member rate</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={s.figures}>
        <Text style={s.fig}><Text style={s.figStrong}>{Number(p?.bookings || 0)}</Text> booking{Number(p?.bookings) === 1 ? '' : 's'}</Text>
        <Text style={s.fig}>{plural(events, 'event')} · {plural(seats, 'seat')}</Text>
        <Text style={[s.fig, { color: PALETTE.text, fontWeight: '800' }]}>{money(Number(p?.paid || 0))}</Text>
        {Number(p?.pending || 0) > 0 ? <Text style={[s.fig, { color: '#B45309', fontWeight: '800' }]}>{money(p.pending)} unpaid</Text> : null}
      </View>
      <View style={s.actions}>
        {p?.phone ? <MiniAction icon="call" label="Call" onPress={() => callNumber(p.phone)} /> : null}
        {p?.phone ? <MiniAction icon="chat" label="WhatsApp" color={PALETTE.green} onPress={() => whatsappNumber(p.phone)} /> : null}
        <View style={{ flex: 1 }} />
        <MiniAction icon={open ? 'expand-less' : 'visibility'} label={open ? 'Close' : 'View'} color={PALETTE.green} onPress={onToggle} />
      </View>
      {open ? <PersonDetail p={p} bookings={bookings} loading={loading} /> : null}
    </View>
  );
}

/** The people list, with whatever header the host screen puts above it. */
export function BookingPeoplePane({ header, refreshKey = 0 }: { header?: React.ReactElement | null; refreshKey?: number }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openEmail, setOpenEmail] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await listBookingPeople();
      setPeople(Array.isArray(data?.people) ? data.people : []);
    } catch (err) { setError(errorText(err, 'The list could not be loaded')); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(refreshKey ? 'refresh' : 'load'); }, [load, refreshKey]);

  const toggle = async (p: any) => {
    const email = String(p?.email || '');
    if (openEmail === email) { setOpenEmail(''); setHistory(null); return; }
    setOpenEmail(email); setHistory(null); setHistoryLoading(true);
    try {
      const data = await getBookingPerson(email);
      setHistory(Array.isArray(data?.bookings) ? data.bookings : []);
    } catch (err) {
      setError(errorText(err, 'That history could not be loaded'));
      setHistory([]);
    } finally { setHistoryLoading(false); }
  };

  const rows = useMemo(() => {
    const needle = (q || '').trim().toLowerCase();
    const list = Array.isArray(people) ? people : [];
    if (!needle) return list;
    return list.filter((p) => [p?.name, p?.email, p?.phone].some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [people, q]);

  const listHeader = (
    <View>
      {header}
      {error && people ? <Notice kind="danger" text={error} /> : null}
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.sm }}>
        <Field icon="search" placeholder="Search a name, email address or mobile number" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} />
      </View>
      {Array.isArray(people) && people.length ? (
        <Text style={s.count}>{rows.length === people.length ? plural(people.length, 'person').replace('persons', 'people') : `${rows.length} of ${people.length}`}</Text>
      ) : null}
    </View>
  );

  if (loading && !people) return <View style={{ flex: 1 }}>{header}<Loading tone="admin" /></View>;
  if (error && !people) return <View style={{ flex: 1 }}>{header}<ErrorState tone="admin" message={error} onRetry={() => load()} /></View>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(p, i) => String(p?.email || i)}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      ListHeaderComponent={listHeader}
      refreshing={refreshing}
      onRefresh={() => load('refresh')}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
      ListEmptyComponent={<EmptyState tone="admin" icon="contacts" title={q ? 'Nobody matches' : 'Nobody has booked an event yet.'} />}
      ListFooterComponent={(people || []).length ? (
        <Text style={s.foot}>
          One row per person, matched on their email address — so somebody who booked once as a guest and once signed in appears
          once, with their totals added together. <Text style={{ fontWeight: '800', color: PALETTE.textSoft }}>Bookings, events and seats are three different numbers</Text>: one booking can cover four seats at a single event.
        </Text>
      ) : null}
      renderItem={({ item, index }) => (
        <PersonCard p={item} index={index} open={openEmail === String(item?.email || '')} bookings={history} loading={historyLoading} onToggle={() => toggle(item)} />
      )}
    />
  );
}

const SuperBookingPeopleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <Screen tone="admin" scroll={false}>
      <BookingPeoplePane header={<AppHeader tone="admin" title="Booking people" subtitle="Everyone who has booked an event" onBack={() => navigation.goBack()} />} />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrowNo: { fontSize: 10, fontWeight: '800', color: PALETTE.textFaint },
  name: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  noName: { fontStyle: 'italic', fontWeight: '600', color: PALETTE.textFaint },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2 },
  rate: { fontSize: 11, fontWeight: '800', color: '#047857' },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md },
  fig: { fontSize: 12, color: PALETTE.textMuted, fontWeight: '600' },
  figStrong: { color: PALETTE.text, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
  detail: { marginTop: SPACE.md, borderTopWidth: 1, borderTopColor: PALETTE.border, paddingTop: SPACE.md },
  contact: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.sm },
  contactLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: PALETTE.textFaint },
  contactValue: { fontSize: 14, fontWeight: '700', color: PALETTE.text, marginTop: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  tile: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderColor: PALETTE.border, borderRadius: RADIUS.md, padding: SPACE.md },
  tileLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: PALETTE.textFaint },
  tileValue: { fontSize: 20, fontWeight: '800', color: PALETTE.text, marginTop: 4 },
  owed: { marginTop: SPACE.md, backgroundColor: PALETTE.amberSoft, borderRadius: RADIUS.md, padding: SPACE.md, borderWidth: 1, borderColor: '#FDE68A' },
  owedText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  histTitle: { fontSize: 14, fontWeight: '800', color: PALETTE.text, marginTop: SPACE.lg },
  bRow: { paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
  bTitle: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  bAmount: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  mono: { fontSize: 11, color: PALETTE.textMuted, marginTop: 2, fontFamily: 'monospace' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: SPACE.sm },
  count: { fontSize: 12, fontWeight: '700', color: PALETTE.textFaint, paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  foot: { fontSize: 12, lineHeight: 18, color: PALETTE.textMuted, paddingHorizontal: SPACE.lg, marginTop: SPACE.sm },
});

export default SuperBookingPeopleScreen;
