import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Screen, AppHeader, Card, Field, Badge, PrimaryButton, Notice, PALETTE, SPACE, money, shortDate, dateTime,
} from '../../../ui';
import { recordBookingPayment, cancelEventBooking, errorText } from '../../../services/superApi';
import { ChipRow, MiniAction, callNumber, whatsappNumber } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — one booking in full (website "View Booking Details" panel)
 * ============================================================================
 *
 * Event details, booking details and the participants who were actually
 * entered — a field with no value is NOT drawn, as on the website.
 *
 * The two actions open INLINE, as the website's footer does:
 *   Confirm booking  any booking that has not been paid and is not cancelled
 *                    (pending, or failed — the lapsed online hold): asks how
 *                    the money was collected (cash / UPI / bank transfer /
 *                    other) → POST /events/:id/bookings/:ref/record-payment
 *                    { mode }. The server takes the seats and notifies.
 *   Cancel booking   an active or waiting-list booking: an optional reason
 *                    (sent to the booker, max 300) → POST …/:ref/cancel
 *                    { reason }.
 */

type PayMode = 'cash' | 'upi' | 'bank_transfer' | 'offline';
const PAY_MODES: { value: PayMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'offline', label: 'Other (offline)' },
];

const payChip = (status: string) => (status === 'paid'
  ? { label: 'Paid', fg: '#047857', bg: PALETTE.greenSoft }
  : status === 'not_required' ? { label: 'Free', fg: PALETTE.blueDark, bg: PALETTE.blueSoft }
    : status === 'failed' ? { label: 'Failed', fg: '#B91C1C', bg: PALETTE.redSoft }
      : { label: 'Pending', fg: '#B45309', bg: PALETTE.amberSoft });

/** One labelled field — or nothing, when there is no value. */
function Row({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  const empty = !children && (value === null || value === undefined || value === '');
  if (empty) return null;
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      {children || <Text style={s.fieldValue} selectable>{value}</Text>}
    </View>
  );
}

const SuperBookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId: string = String(route?.params?.eventId || '');
  const event = route?.params?.event || {};
  const [booking, setBooking] = useState<any>(route?.params?.booking || {});
  const [acting, setActing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const payStatus = String(booking?.payment?.status || 'pending');
  const canConfirm = booking?.status !== 'cancelled' && (payStatus === 'pending' || payStatus === 'failed');
  const canCancel = booking?.status === 'active' || booking?.status === 'waitlist';
  const pay = payChip(payStatus);
  const bookedBy = booking?.bookedBy || {};
  const named = (Array.isArray(booking?.participants) ? booking.participants : [])
    .filter((p: any) => String(p?.name || '').trim() || String(p?.email || '').trim() || String(p?.phone || '').trim());

  const markPaid = async () => {
    const ref = String(booking?.bookingRef || '');
    if (!ref || !eventId || acting) return;
    setActing(true);
    try {
      const updated = await recordBookingPayment(eventId, ref, payMode);
      if (updated && updated.bookingRef) setBooking(updated);
      else setBooking((b: any) => ({ ...b, payment: { ...(b?.payment || {}), status: 'paid', mode: payMode } }));
      setConfirmOpen(false);
      setNotice('Payment recorded — the booker has been sent their confirmation.');
    } catch (err) {
      Alert.alert('The payment could not be recorded', errorText(err));
    } finally { setActing(false); }
  };

  const cancel = async () => {
    const ref = String(booking?.bookingRef || '');
    if (!ref || !eventId || acting) return;
    setActing(true);
    try {
      await cancelEventBooking(eventId, ref, (reason || '').trim());
      Alert.alert('Booking cancelled', `${ref} is cancelled and its seats are free again.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('The booking could not be cancelled', errorText(err));
    } finally { setActing(false); }
  };

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title={booking?.eventTitle || event?.title || 'Untitled event'} subtitle={booking?.bookingRef || ''} onBack={() => navigation.goBack()} />

      {notice ? <Notice kind="success" text={notice} /> : null}

      <Card style={s.card}>
        <Text style={s.cardTitle}>Event Details</Text>
        <Row label="Event Name" value={booking?.eventTitle || event?.title} />
        <Row label="Date" value={shortDate(booking?.eventStartAt || event?.startAt)} />
        <Row label="No Of Seat" value={Number(event?.capacity || 0) > 0 ? String(event.capacity) : ''} />
        <Row label="Venue" value={booking?.eventVenue} />
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>Booking Details</Text>
        <Row label="Booking Date" value={dateTime(booking?.createdAt)} />
        <Row label="Name" value={bookedBy?.name} />
        <Row label="Email" value={bookedBy?.email} />
        <Row label="Mobile" value={bookedBy?.phone} />
        <Row label="No Of Participants" value={booking?.noOfPersons ? String(booking.noOfPersons) : ''} />
        <Row label="Booked As" value={booking?.isGuest ? 'Guest' : 'Signed-in member'} />
        <Row label="Ticket Price" value={Number(booking?.unitAmount || 0) > 0 ? money(booking.unitAmount) : 'Free'} />
        <Row label="Total Amount" value={Number(booking?.totalAmount || 0) > 0 ? money(booking.totalAmount) : 'Free'} />
        {booking?.payment?.mode ? <Row label="Payment Mode"><Badge label={String(booking.payment.mode)} color="#B45309" bg={PALETTE.amberSoft} style={{ alignSelf: 'flex-start' }} /></Row> : null}
        <Row label="Payment Status"><Badge label={pay.label} color={pay.fg} bg={pay.bg} style={{ alignSelf: 'flex-start' }} /></Row>
        {booking?.status === 'cancelled' ? <Row label="Booking"><Badge label="Cancelled" status="cancelled" style={{ alignSelf: 'flex-start' }} /></Row> : null}
        {booking?.status === 'waitlist' ? <Row label="Booking"><Badge label="Waiting list" color="#B45309" bg={PALETTE.amberSoft} style={{ alignSelf: 'flex-start' }} /></Row> : null}
        {booking?.memberRateApplied ? (
          <Row label="Rate Applied" value={`Member price${Number(booking?.memberSaving || 0) > 0 ? ` · saved ${money(booking.memberSaving)}` : ''}`} />
        ) : null}
        {bookedBy?.phone ? (
          <View style={s.contactRow}>
            <MiniAction icon="call" label="Call" onPress={() => callNumber(bookedBy.phone)} />
            <MiniAction icon="chat" label="WhatsApp" color={PALETTE.green} onPress={() => whatsappNumber(bookedBy.phone)} />
          </View>
        ) : null}
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>Participants</Text>
        {named.length === 0 ? <Text style={s.empty}>No participant details were given.</Text> : named.map((p: any, i: number) => (
          <View key={`p${i}`} style={[s.person, i === named.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.personNo}>{i + 1}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              {p?.name ? <Text style={s.personName}>{p.name}</Text> : null}
              {p?.email ? <Text style={s.personSub} selectable>{p.email}</Text> : null}
              {p?.phone ? <Text style={s.personSub} selectable>{p.phone}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      {/* ------------------------------------------------ the actions */}
      <View style={s.footer}>
        {confirmOpen ? (
          <Card>
            <Text style={s.fieldLabel}>PAYMENT COLLECTED BY</Text>
            <View style={{ marginHorizontal: -SPACE.lg }}><ChipRow<PayMode> options={PAY_MODES} value={payMode} onChange={setPayMode} /></View>
            <PrimaryButton tone="admin" icon="check-circle" label="Confirm & notify" onPress={markPaid} loading={acting} style={{ marginTop: SPACE.md }} />
            <PrimaryButton tone="admin" variant="outline" label="Back" onPress={() => setConfirmOpen(false)} disabled={acting} style={{ marginTop: SPACE.sm }} />
          </Card>
        ) : cancelOpen ? (
          <Card>
            <Field label="Reason" placeholder="Reason (sent to the booker, optional)" value={reason} onChangeText={setReason} maxLength={300} editable={!acting} />
            <PrimaryButton tone="admin" variant="danger" icon="block" label="Cancel & notify" onPress={cancel} loading={acting} />
            <PrimaryButton tone="admin" variant="outline" label="Keep booking" onPress={() => setCancelOpen(false)} disabled={acting} style={{ marginTop: SPACE.sm }} />
          </Card>
        ) : (
          <>
            {canConfirm ? <PrimaryButton tone="admin" icon="check-circle" label="Confirm booking" onPress={() => { setConfirmOpen(true); setNotice(''); }} disabled={acting} /> : null}
            {canCancel ? <PrimaryButton tone="admin" variant="outline" icon="block" label="Cancel booking" onPress={() => { setCancelOpen(true); setNotice(''); }} disabled={acting} /> : null}
          </>
        )}
        <PrimaryButton tone="admin" variant="outline" label="Close" onPress={() => navigation.goBack()} disabled={acting} />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.text, marginBottom: SPACE.sm },
  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: PALETTE.textFaint, marginBottom: 4 },
  fieldValue: { fontSize: 15, fontWeight: '700', color: PALETTE.text },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.md },
  empty: { fontSize: 14, fontWeight: '700', color: PALETTE.textFaint, textAlign: 'center', paddingVertical: SPACE.lg },
  person: { flexDirection: 'row', gap: SPACE.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
  personNo: { width: 20, fontSize: 14, fontWeight: '800', color: PALETTE.textFaint },
  personName: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  personSub: { fontSize: 13, color: PALETTE.textMuted, marginTop: 2 },
  footer: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg, marginBottom: SPACE.xxl, gap: SPACE.sm },
});

export default SuperBookingDetailScreen;
