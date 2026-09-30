import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Share, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Screen, AppHeader, IconButton, Field, Loading, ErrorState, EmptyState, Badge, Notice, SegmentedTabs, StatTile, StatGrid,
  PALETTE, SPACE, RADIUS, SHADOW, money, shortDate,
} from '../../../ui';
import {
  listEventBookings, listEventAttendees, exportBookingsCsv, listEventsForPicker, errorText,
} from '../../../services/superApi';
import { ChipRow, MiniAction, callNumber } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — Event Bookings (website /super-admin/bookings/:eventId)
 * ============================================================================
 *
 *   Event picker  GET /events?limit=200 — switch event without going back,
 *                 labelled "title — date — price" as the website's select.
 *   Bookings      GET /events/:id/bookings?page&limit=10&search&paymentStatus
 *                 — server-side search and the All / Paid / Unpaid filter,
 *                 paged ten at a time exactly as the website asks; the running
 *                 number continues across pages. The summary tiles are the
 *                 WHOLE event's (the server computes them over every booking).
 *                 "View Booking Details" opens SuperBookingDetail (confirm a
 *                 payment with its mode, or cancel with a reason).
 *   Who is coming GET /events/:id/attendees — one row per PERSON, for the door:
 *                 booked-by, own-or-booker contact, Guest/Member, payment and
 *                 member rate, Confirmed or Waiting list; counts in the footer.
 *   Excel report  GET /events/:id/bookings/export — the website's CSV, handed
 *                 to the system share sheet (no file-system native module).
 */

type Tab = 'bookings' | 'attendees';
type PayFilter = '' | 'paid' | 'pending';
const LIMIT = 10;

const payChip = (status: string, unpaidWord = 'Pending') => (status === 'paid'
  ? { label: 'Paid', fg: '#047857', bg: PALETTE.greenSoft }
  : status === 'not_required' ? { label: 'Free', fg: PALETTE.blueDark, bg: PALETTE.blueSoft }
    : status === 'failed' ? { label: 'Failed', fg: '#B91C1C', bg: PALETTE.redSoft }
      : status === 'pending' || !status ? { label: unpaidWord, fg: '#B45309', bg: PALETTE.amberSoft }
        : { label: status, fg: PALETTE.textSoft, bg: '#E2E8F0' });

const modeLabel = (mode: string) => (mode === 'bank_transfer' ? 'Bank' : mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : '');

function BookingCard({ b, n, onOpen }: { b: any; n: number; onOpen: () => void }) {
  const cancelled = String(b?.status || '') === 'cancelled';
  const pay = payChip(String(b?.payment?.status || ''));
  const mode = modeLabel(String(b?.payment?.mode || ''));
  return (
    <View style={[s.card, SHADOW.card, cancelled && { opacity: 0.55 }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Booking details for ${b?.bookedBy?.name || b?.bookingRef}`}>
        <View style={s.row}>
          <Text style={s.sno}>{n}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>
              {b?.bookedBy?.name || '—'}{cancelled ? <Text style={s.cancelled}>  Cancelled</Text> : null}
            </Text>
            <Text style={s.sub} numberOfLines={1}>{b?.bookedBy?.email || '—'}</Text>
            <Text style={s.sub} numberOfLines={1}>{b?.bookedBy?.phone || '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amount}>{Number(b?.totalAmount || 0) > 0 ? money(b.totalAmount) : 'Free'}</Text>
            {b?.memberRateApplied ? (
              <Text style={s.rate}>Member rate{Number(b?.memberSaving || 0) > 0 ? ` · saved ${money(b.memberSaving)}` : ''}</Text>
            ) : null}
          </View>
        </View>
        <View style={s.chips}>
          <Badge label={pay.label} color={pay.fg} bg={pay.bg} />
          {mode ? <Badge label={mode} color={PALETTE.blueDark} bg={PALETTE.blueSoft} /> : null}
          <View style={s.persons}><Icon name="groups" size={13} color="#FFFFFF" /><Text style={s.personsText}>{Number(b?.noOfPersons || 0)}</Text></View>
        </View>
      </TouchableOpacity>
      <View style={s.actions}>
        {b?.bookedBy?.phone ? <MiniAction icon="call" label="Call" onPress={() => callNumber(b.bookedBy.phone)} /> : null}
        <View style={{ flex: 1 }} />
        <MiniAction icon="visibility" label="View Booking Details" onPress={onOpen} />
      </View>
    </View>
  );
}

function AttendeeRow({ a, n }: { a: any; n: number }) {
  const status = String(a?.paymentStatus || 'pending');
  const pay = payChip(status, 'Unpaid');
  const waitlist = String(a?.status || '') === 'waitlist';
  return (
    <View style={s.att}>
      <Text style={s.sno}>{n}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.name} numberOfLines={1}>{a?.name}</Text>
        {a?.bookedByName && a?.bookedByName !== a?.name ? <Text style={s.sub} numberOfLines={1}>booked by {a.bookedByName}</Text> : null}
        {a?.email || a?.bookedByEmail
          ? <Text style={[s.sub, !a?.email && { color: PALETTE.textFaint }]} numberOfLines={1}>{a?.email || a?.bookedByEmail}</Text> : null}
        {a?.phone || a?.bookedByPhone
          ? <Text style={[s.sub, !a?.phone && { color: PALETTE.textFaint }]} numberOfLines={1}>{a?.phone || a?.bookedByPhone}</Text> : null}
        <Text style={s.mono} numberOfLines={1}>{a?.bookingRef}</Text>
        <View style={s.chips}>
          <Badge label={a?.isGuest ? 'Guest' : 'Member'} color={a?.isGuest ? PALETTE.textSoft : '#6D28D9'} bg={a?.isGuest ? '#E2E8F0' : '#EDE9FE'} />
          <Badge label={pay.label} color={pay.fg} bg={pay.bg} />
          {a?.isMemberRate ? <Text style={s.rate}>Member rate</Text> : null}
          {waitlist
            ? <Badge label="Waiting list" color="#B45309" bg={PALETTE.amberSoft} />
            : <Badge label="Confirmed" status="confirmed" />}
        </View>
      </View>
    </View>
  );
}

const SuperEventBookingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId: string = String(route?.params?.eventId || '');
  const [tab, setTab] = useState<Tab>('bookings');

  // ---- the event picker
  const [events, setEvents] = useState<{ id: string; title: string; startAt: string | null; registrationFee: number; capacity: number }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    listEventsForPicker()
      .then((rows) => { if (alive) setEvents(rows); })
      .catch(() => null)
      .finally(() => { if (alive) setEventsLoading(false); });
    return () => { alive = false; };
  }, []);
  const selected = useMemo(() => events.find((e) => e.id === eventId) || null, [events, eventId]);
  const title: string = selected?.title || route?.params?.title || 'Event bookings';
  const capacity = selected ? selected.capacity : Number(route?.params?.capacity || 0);

  // ---- bookings (server-side search, filter and paging)
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced((search || '').trim()), 400); return () => clearTimeout(t); }, [search]);
  const [paymentStatus, setPaymentStatus] = useState<PayFilter>('');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [eventId, debounced, paymentStatus]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (mode: 'load' | 'refresh' | 'quiet' = 'load') => {
    if (!eventId) { setLoading(false); return; }
    if (mode === 'refresh') setRefreshing(true); else if (mode === 'load') setLoading(true);
    setError('');
    try {
      setData(await listEventBookings(eventId, { page, limit: LIMIT, search: debounced, paymentStatus }));
    } catch (err) { setError(errorText(err, 'The bookings could not be loaded')); } finally { setLoading(false); setRefreshing(false); }
  }, [eventId, page, debounced, paymentStatus]);

  // ---- who is coming (loaded when its tab is open)
  const [attendees, setAttendees] = useState<any[] | null>(null);
  const [seatsBooked, setSeatsBooked] = useState(0);
  const [attLoading, setAttLoading] = useState(false);
  const [attQuery, setAttQuery] = useState('');
  const loadAttendees = useCallback(async () => {
    if (!eventId) return;
    setAttLoading(true);
    try {
      const res = await listEventAttendees(eventId);
      setAttendees(Array.isArray(res?.attendees) ? res.attendees : []);
      setSeatsBooked(Number(res?.seatsBooked || 0));
    } catch (err) { setError(errorText(err, 'The attendee list could not be loaded')); } finally { setAttLoading(false); }
  }, [eventId]);

  // Every return from a booking's detail screen refreshes both views quietly.
  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    load(first.current ? 'load' : 'quiet');
    if (tab === 'attendees') loadAttendees();
    first.current = false;
  }, [load, loadAttendees, tab]));

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    if (exporting || !eventId) return;
    setExporting(true);
    try {
      const { csv, filename } = await exportBookingsCsv(eventId, title || 'event');
      if (!(csv || '').trim()) { Alert.alert('Nothing to export', 'This event has no bookings yet.'); return; }
      await Share.share({ title: filename, message: csv });
    } catch (err) {
      Alert.alert('The report could not be downloaded', errorText(err));
    } finally { setExporting(false); }
  };

  const pickEvent = (e: { id: string; title: string; capacity: number }) => {
    setPickerOpen(false);
    setAttendees(null);
    navigation.setParams({ eventId: e.id, title: e.title, capacity: e.capacity });
  };

  const summary = data?.summary || {};
  const pg = data?.pagination || {};
  const rows: any[] = Array.isArray(data?.bookings) ? data.bookings : [];
  const pages = Math.max(1, Number(pg?.pages || 1));
  const total = Number(pg?.total || 0);
  const pageNo = Number(pg?.page || page);
  const limit = Number(pg?.limit || LIMIT);
  const showingLine = total ? `Showing ${(pageNo - 1) * limit + 1} to ${Math.min(pageNo * limit, total)} of ${total} entries` : 'No entries';

  const attRows = useMemo(() => {
    const needle = (attQuery || '').trim().toLowerCase();
    const list = Array.isArray(attendees) ? attendees : [];
    if (!needle) return list;
    return list.filter((a) => [a?.name, a?.email, a?.phone, a?.bookingRef, a?.bookedByName, a?.bookedByEmail, a?.bookedByPhone]
      .some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [attendees, attQuery]);
  const confirmed = (attendees || []).filter((r) => r?.status !== 'waitlist').length;
  const waiting = (attendees || []).length - confirmed;

  const openBooking = (b: any) => navigation.navigate('SuperBookingDetail', {
    eventId, booking: b, event: { title, capacity, startAt: selected?.startAt || null },
  });

  const header = (
    <View>
      <AppHeader tone="admin" title="Event Bookings" subtitle="Seats booked through Book Now, and what has been paid" onBack={() => navigation.goBack()}
        right={<IconButton icon={exporting ? 'hourglass-empty' : 'file-download'} accessibilityLabel="Excel report" onPress={exportCsv} color={PALETTE.green} />} />

      {/* ------------------------------------------------ the event picker */}
      <View style={[s.card, { paddingVertical: SPACE.md }]}>
        <Text style={s.eyebrow}>EVENT</Text>
        <TouchableOpacity onPress={() => setPickerOpen((v) => !v)} activeOpacity={0.8} style={s.picker} disabled={eventsLoading || !events.length}
          accessibilityRole="button" accessibilityLabel="Choose an event">
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.pickTitle} numberOfLines={2}>{title}</Text>
            {selected ? (
              <Text style={s.sub}>{[selected.startAt ? shortDate(selected.startAt) : '', selected.registrationFee > 0 ? money(selected.registrationFee) : 'Free'].filter(Boolean).join(' — ')}</Text>
            ) : eventsLoading ? <Text style={s.sub}>Loading events…</Text> : null}
          </View>
          <Icon name={pickerOpen ? 'expand-less' : 'expand-more'} size={24} color={PALETTE.textMuted} />
        </TouchableOpacity>
        {pickerOpen ? (
          <View style={{ marginTop: SPACE.sm }}>
            {events.map((e) => (
              <TouchableOpacity key={e.id} onPress={() => pickEvent(e)} style={[s.pickRow, e.id === eventId && { backgroundColor: PALETTE.indigoSoft }]}
                accessibilityRole="radio" accessibilityState={{ checked: e.id === eventId }}>
                <Text style={s.pickRowTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={s.sub}>{[e.startAt ? shortDate(e.startAt) : '', e.registrationFee > 0 ? money(e.registrationFee) : 'Free'].filter(Boolean).join(' — ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <StatGrid>
        <StatTile label="Bookings" hint={`${Number(summary?.paidBookings || 0)} paid`} value={Number(summary?.bookings || 0)} icon="confirmation-number" color={PALETTE.blueDark} soft={PALETTE.blueSoft} />
        <StatTile label="Seats taken" hint={capacity > 0 ? `of ${capacity}` : 'no seat limit set'} value={Number(summary?.seats || 0)} icon="groups" color="#6D28D9" soft="#EDE9FE" />
        <StatTile label="Collected" hint="money actually received" value={money(Number(summary?.collected || 0))} icon="payments" color={PALETTE.green} soft={PALETTE.greenSoft} />
        <StatTile label="Awaiting payment" hint={`${Number(summary?.pendingBookings || 0)} booking${Number(summary?.pendingBookings || 0) === 1 ? '' : 's'}`}
          value={money(Number(summary?.pending || 0))} icon="schedule" color={PALETTE.amber} soft={PALETTE.amberSoft} />
      </StatGrid>

      <SegmentedTabs<Tab> tone="admin" value={tab} onChange={setTab}
        options={[
          { value: 'bookings', label: 'Bookings', ...(data ? { count: Number(summary?.bookings || 0) } : {}) },
          { value: 'attendees', label: 'Who is coming', ...(data ? { count: Number(summary?.seats || 0) } : {}) },
        ]} />

      {error && (data || attendees) ? <Notice kind="danger" text={error} /> : null}

      {tab === 'bookings' ? (
        <View>
          <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
            <Field icon="search" placeholder="Name, email, mobile or booking reference" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
          </View>
          <View style={{ marginTop: -SPACE.sm, marginBottom: SPACE.md }}>
            <ChipRow<PayFilter> value={paymentStatus} onChange={setPaymentStatus}
              options={[{ value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Unpaid' }]} />
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
          <Field icon="search" placeholder="Search a name, email, mobile or booking reference" value={attQuery} onChangeText={setAttQuery} autoCapitalize="none" autoCorrect={false} />
        </View>
      )}
    </View>
  );

  const pager = (
    <View style={s.pager}>
      <Text style={s.showing}>{showingLine}</Text>
      {pages > 1 ? (
        <View style={s.pagerRow}>
          <TouchableOpacity onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={pageNo <= 1} style={[s.pageBtn, pageNo <= 1 && { opacity: 0.4 }]} accessibilityLabel="Previous page">
            <Icon name="chevron-left" size={20} color={PALETTE.textSoft} />
          </TouchableOpacity>
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => Math.abs(n - pageNo) <= 1 || n === 1 || n === pages)
            .map((n, idx, all) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {idx > 0 && all[idx - 1] !== n - 1 ? <Text style={s.ellipsis}>…</Text> : null}
                <TouchableOpacity onPress={() => setPage(n)} style={[s.pageBtn, n === pageNo && s.pageOn]} accessibilityState={{ selected: n === pageNo }}>
                  <Text style={[s.pageText, n === pageNo && { color: '#FFFFFF' }]}>{n}</Text>
                </TouchableOpacity>
              </View>
            ))}
          <TouchableOpacity onPress={() => setPage((p) => Math.min(pages, p + 1))} disabled={pageNo >= pages} style={[s.pageBtn, pageNo >= pages && { opacity: 0.4 }]} accessibilityLabel="Next page">
            <Icon name="chevron-right" size={20} color={PALETTE.textSoft} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const attFooter = attendees && attendees.length ? (
    <View style={s.attFoot}>
      <Text style={s.attFootText}><Text style={s.bold}>{confirmed}</Text> named</Text>
      {seatsBooked > confirmed + waiting ? <Text style={s.attFootText}><Text style={s.bold}>{seatsBooked}</Text> seats booked in total</Text> : null}
      {waiting ? <Text style={[s.attFootText, { color: '#B45309' }]}><Text style={s.bold}>{waiting}</Text> on the waiting list — no seat held</Text> : null}
    </View>
  ) : null;

  if (!eventId) {
    return <Screen tone="admin"><AppHeader tone="admin" title="Event Bookings" onBack={() => navigation.goBack()} /><EmptyState tone="admin" icon="event" title="No event chosen" message="Open an event from Booking Details." /></Screen>;
  }
  if (loading && !data) return <Screen tone="admin"><AppHeader tone="admin" title="Event Bookings" onBack={() => navigation.goBack()} /><Loading tone="admin" /></Screen>;
  if (error && !data) return <Screen tone="admin"><AppHeader tone="admin" title="Event Bookings" onBack={() => navigation.goBack()} /><ErrorState tone="admin" message={error} onRetry={() => load()} /></Screen>;

  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={tab === 'bookings' ? rows : attRows}
        keyExtractor={(x: any, i) => String(tab === 'bookings' ? x?.bookingRef || i : x?.key || `${x?.bookingRef}-${i}`)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => { load('refresh'); if (tab === 'attendees') loadAttendees(); }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={tab === 'bookings'
          ? (loading ? <Loading tone="admin" /> : <EmptyState tone="admin" icon="confirmation-number" title={debounced || paymentStatus ? 'No bookings match that filter.' : 'No bookings for this event yet.'} />)
          : (attLoading || attendees === null ? <Loading tone="admin" /> : <EmptyState tone="admin" icon="event-seat" title={attQuery ? 'Nobody matches' : 'Nobody has booked a seat on this event yet.'} />)}
        ListFooterComponent={tab === 'bookings' ? pager : attFooter}
        renderItem={({ item, index }) => (tab === 'bookings'
          ? <BookingCard b={item} n={(pageNo - 1) * limit + index + 1} onOpen={() => openBooking(item)} />
          : <AttendeeRow a={item} n={index + 1} />)}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: PALETTE.textFaint, marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderWidth: 1, borderColor: PALETTE.borderStrong, borderRadius: RADIUS.md, padding: SPACE.md },
  pickTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  pickRow: { paddingVertical: 10, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm },
  pickRowTitle: { fontSize: 14, fontWeight: '700', color: PALETTE.text },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  sno: { minWidth: 20, fontSize: 13, fontWeight: '800', color: PALETTE.textFaint, marginTop: 2 },
  name: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  cancelled: { fontSize: 12, fontWeight: '800', color: PALETTE.red },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2 },
  mono: { fontSize: 11, color: PALETTE.textMuted, marginTop: 2, fontFamily: 'monospace' },
  amount: { fontSize: 16, fontWeight: '800', color: PALETTE.text },
  rate: { fontSize: 11, fontWeight: '800', color: '#047857', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: SPACE.sm },
  persons: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PALETTE.blueDark, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  personsText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: SPACE.md },
  att: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, backgroundColor: PALETTE.card, borderBottomWidth: 1, borderBottomColor: PALETTE.border, paddingHorizontal: SPACE.lg, paddingVertical: 12 },
  pager: { paddingHorizontal: SPACE.lg, marginTop: SPACE.sm, gap: SPACE.sm },
  showing: { fontSize: 12, color: PALETTE.textMuted },
  pagerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  pageBtn: { minWidth: 40, height: 40, paddingHorizontal: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: PALETTE.border, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.card },
  pageOn: { backgroundColor: PALETTE.indigo, borderColor: PALETTE.indigo },
  pageText: { fontSize: 14, fontWeight: '800', color: PALETTE.textSoft },
  ellipsis: { paddingHorizontal: 4, color: PALETTE.textFaint },
  attFoot: { marginHorizontal: SPACE.lg, marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: PALETTE.blueSoft, gap: 4 },
  attFootText: { fontSize: 13, fontWeight: '600', color: PALETTE.textSoft },
  bold: { fontWeight: '800', color: PALETTE.text },
});

export default SuperEventBookingsScreen;
