import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Screen, AppHeader, IconButton, Field, Loading, ErrorState, EmptyState, Notice, SegmentedTabs, StatTile, StatGrid,
  PALETTE, SPACE, RADIUS, SHADOW, money, shortDate,
} from '../../../ui';
import { listBookingOverview, errorText } from '../../../services/superApi';
import { ToggleRow } from './superKit';
import { BookingPeoplePane } from './SuperBookingPeopleScreen';

/**
 * ============================================================================
 * SUPER ADMIN — Booking Details (website /super-admin/bookings, BookingEvents)
 * ============================================================================
 *
 * GET /events/bookings/overview[?includeDrafts=1] — every event and how full
 * it is, in one request. The seat figures are the SERVER's (live bookings plus
 * members' own registrations — both fill the same room); nothing is summed
 * here.
 *
 *   Events tab  one card per event: price and member price, total / booked /
 *               remaining seats (remaining is null — "—" — on an uncapped
 *               event, never 0), waiting list, collected and unpaid, and the
 *               Draft / Bookings off / category chips. Searchable by name,
 *               venue or category. Tap for the event's bookings.
 *   People tab  everyone who has booked (BookingPeoplePane).
 */

type Tab = 'events' | 'people';

const fullness = (e: any) => (Number(e?.totalSeats || 0) > 0 ? Math.min(1, Number(e?.bookedSeats || 0) / Number(e.totalSeats)) : null);

function Chip({ text, fg, bg, icon }: { text: string; fg: string; bg: string; icon?: string }) {
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text style={[s.chipText, { color: fg }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Figure({ label, value, color, children }: { label: string; value: string; color?: string; children?: React.ReactNode }) {
  return (
    <View style={s.figure}>
      <Text style={[s.figValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.figLabel}>{label}</Text>
      {children}
    </View>
  );
}

function EventCard({ e, index, onOpen }: { e: any; index: number; onOpen: () => void }) {
  const total = Number(e?.totalSeats || 0);
  const booked = Number(e?.bookedSeats || 0);
  const remaining = e?.remainingSeats === null || e?.remainingSeats === undefined ? null : Number(e.remainingSeats);
  const share = fullness(e);
  const barColor = share === null ? PALETTE.green : share >= 1 ? PALETTE.red : share >= 0.8 ? PALETTE.amber : PALETTE.green;
  const price = Number(e?.price || 0);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Booking details for ${e?.title || 'Untitled event'}`}>
      <View style={[s.card, SHADOW.card]}>
        <View style={s.row}>
          <Text style={s.sno}>{index + 1}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title} numberOfLines={2}>{e?.title || 'Untitled event'}</Text>
            <View style={s.meta}>
              <Icon name="event" size={14} color={PALETTE.textMuted} />
              <Text style={s.sub}>{shortDate(e?.startAt) || 'Date to be confirmed'}</Text>
            </View>
            {e?.venue ? (
              <View style={s.meta}>
                <Icon name="place" size={14} color={PALETTE.textMuted} />
                <Text style={[s.sub, { flex: 1 }]} numberOfLines={1}>{e.venue}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.price}>{price > 0 ? money(price) : 'Free'}</Text>
            {e?.hasMemberRate ? <Text style={s.memberRate}>Members {money(e?.memberPrice || 0)}</Text> : null}
          </View>
        </View>

        <View style={s.chips}>
          {e?.category ? <Chip text={String(e.category)} fg="#6D28D9" bg="#EDE9FE" /> : null}
          {e?.status !== 'published' ? <Chip text="Draft" fg={PALETTE.textSoft} bg="#E2E8F0" /> : null}
          {!e?.registrationEnabled ? <Chip text="Bookings off" icon="block" fg="#B45309" bg={PALETTE.amberSoft} /> : null}
        </View>

        <View style={s.figures}>
          <Figure label="Total seat" value={total > 0 ? String(total) : 'Unlimited'} color={total > 0 ? '#BE123C' : PALETTE.textFaint} />
          <Figure label="Booked" value={String(booked)} color="#047857" />
          <Figure label="Remaining" value={remaining === null ? '—' : String(remaining)} color={remaining === null ? PALETTE.textFaint : remaining === 0 ? '#BE123C' : PALETTE.blueDark}>
            {Number(e?.waitlistedSeats || 0) > 0 ? <Text style={s.waiting}>+{Number(e.waitlistedSeats)} waiting</Text> : null}
          </Figure>
        </View>
        {share !== null ? <View style={s.barTrack}><View style={[s.barFill, { width: `${Math.round(share * 100)}%`, backgroundColor: barColor }]} /></View> : null}

        <View style={s.money}>
          <Text style={s.stat}><Text style={s.statStrong}>{Number(e?.bookings || 0)}</Text> booking{Number(e?.bookings) === 1 ? '' : 's'}</Text>
          <Text style={[s.stat, { color: PALETTE.text }]}>Collected <Text style={s.statStrong}>{money(Number(e?.collected || 0))}</Text></Text>
          {Number(e?.pendingAmount || 0) > 0 ? <Text style={[s.stat, { color: '#B45309', fontWeight: '800' }]}>{money(e.pendingAmount)} unpaid</Text> : null}
        </View>
        <View style={s.more}><Icon name="visibility" size={16} color={PALETTE.indigo} /><Text style={s.moreText}>Booking Details</Text><Icon name="chevron-right" size={20} color={PALETTE.indigo} /></View>
      </View>
    </TouchableOpacity>
  );
}

const SuperBookingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('events');
  const [drafts, setDrafts] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [peopleKey, setPeopleKey] = useState(0);

  const load = useCallback(async (mode: 'load' | 'refresh' | 'quiet' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else if (mode === 'load') setLoading(true);
    setError('');
    try { setData(await listBookingOverview(drafts)); } catch (err) { setError(errorText(err, 'The events could not be loaded')); } finally { setLoading(false); setRefreshing(false); }
  }, [drafts]);
  // Quiet refetch on return from an event (a payment or a cancellation moves these figures).
  const loadedOnce = useRef(false);
  useFocusEffect(useCallback(() => { load(loadedOnce.current ? 'quiet' : 'load'); loadedOnce.current = true; }, [load]));

  // Merged over the zeros, as the website does, so a response without `totals` leaves the tiles at 0.
  const t = { events: 0, seats: 0, capacity: 0, bookings: 0, collected: 0, pending: 0, ...(data?.totals || {}) };
  const events: any[] = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const visible = useMemo(() => {
    const needle = (query || '').trim().toLowerCase();
    if (!needle) return events;
    return events.filter((e) => [e?.title || 'Untitled event', e?.venue, e?.category].some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [events, query]);

  const refreshAll = () => { if (tab === 'people') setPeopleKey((k) => k + 1); else load('refresh'); };

  const top = (
    <View>
      <AppHeader tone="admin" title="Booking Details" subtitle="Every event, how full it is, and what has been taken" onBack={() => navigation.goBack()}
        right={<IconButton icon="refresh" accessibilityLabel="Refresh" onPress={refreshAll} color={PALETTE.indigo} />} />
      <StatGrid>
        <StatTile label="Seats booked" value={Number(t.seats || 0)} icon="groups" color={PALETTE.blueDark} soft={PALETTE.blueSoft}
          hint={Number(t.capacity) > 0 ? `of ${t.capacity} across ${t.events} events` : `across ${t.events} events`} />
        <StatTile label="Bookings" hint="one booking may hold several seats" value={Number(t.bookings || 0)} icon="confirmation-number" color="#6D28D9" soft="#EDE9FE" />
        <StatTile label="Collected" hint="money actually received" value={money(Number(t.collected || 0))} icon="payments" color={PALETTE.green} soft={PALETTE.greenSoft} />
        <StatTile label="Awaiting payment" hint="held, not taken" value={money(Number(t.pending || 0))} icon="schedule" color={PALETTE.amber} soft={PALETTE.amberSoft} />
      </StatGrid>
      {error && data ? <Notice kind="danger" text={error} /> : null}
      <SegmentedTabs<Tab> tone="admin" value={tab} onChange={setTab}
        options={[{ value: 'events', label: 'Events' }, { value: 'people', label: 'People' }]} />
    </View>
  );

  if (tab === 'people') {
    return <Screen tone="admin" scroll={false}><BookingPeoplePane header={top} refreshKey={peopleKey} /></Screen>;
  }

  const header = (
    <View>
      {top}
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
        <Field icon="search" placeholder="Search an event by name, venue or category" value={query} onChangeText={setQuery} autoCorrect={false} />
      </View>
      <View style={[s.card, { paddingVertical: SPACE.xs }]}>
        <ToggleRow label="Include drafts" hint="An unpublished event has no public booking page." value={drafts} onChange={setDrafts} last />
      </View>
    </View>
  );

  if (loading && !data) return <Screen tone="admin">{top}<Loading tone="admin" /></Screen>;
  if (error && !data) return <Screen tone="admin">{top}<ErrorState tone="admin" message={error} onRetry={() => load()} /></Screen>;

  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(e, i) => String(e?.id || i)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => load('refresh')}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={events.length
          ? <EmptyState tone="admin" icon="filter-alt-off" title="Nothing matches" message="No event answers that search." />
          : <EmptyState tone="admin" icon="confirmation-number" title="No published events yet" message="Create one under Events and it appears here the moment it is saved." />}
        ListFooterComponent={events.length ? (
          <Text style={s.foot}>
            <Text style={{ fontWeight: '800', color: PALETTE.textSoft }}>Booked</Text> counts seats on live bookings taken through the public
            Book Now page together with members' own registrations — both fill the same room. A checkout somebody abandoned holds its seats
            for thirty minutes and then releases them, so this figure can go down as well as up. Open an event for the names, the payments
            and the door list.
          </Text>
        ) : null}
        renderItem={({ item, index }) => (
          <EventCard e={item} index={index} onOpen={() => navigation.navigate('SuperEventBookings', {
            eventId: String(item?.id || ''), title: item?.title || 'Untitled event', capacity: Number(item?.totalSeats || 0),
          })} />
        )}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  sno: { width: 18, fontSize: 13, fontWeight: '800', color: PALETTE.textFaint, marginTop: 2 },
  title: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sub: { fontSize: 12, color: PALETTE.textMuted },
  price: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  memberRate: { fontSize: 11, fontWeight: '800', color: '#047857', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACE.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  chipText: { fontSize: 11, fontWeight: '800' },
  figures: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  figure: { flex: 1, backgroundColor: PALETTE.field, borderRadius: RADIUS.md, paddingVertical: SPACE.sm, alignItems: 'center' },
  figValue: { fontSize: 17, fontWeight: '800', color: PALETTE.text },
  figLabel: { fontSize: 11, fontWeight: '700', color: PALETTE.textMuted, marginTop: 2 },
  waiting: { fontSize: 10, fontWeight: '800', color: '#B45309', marginTop: 2 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: PALETTE.field, marginTop: SPACE.sm, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  money: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md },
  stat: { fontSize: 12, color: PALETTE.textMuted, fontWeight: '600' },
  statStrong: { color: PALETTE.text, fontWeight: '800' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: SPACE.sm },
  moreText: { fontSize: 12, fontWeight: '800', color: PALETTE.indigo },
  foot: { fontSize: 12, lineHeight: 18, color: PALETTE.textMuted, paddingHorizontal: SPACE.lg, marginTop: SPACE.sm },
});

export default SuperBookingsScreen;
