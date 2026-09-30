import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BottomActionBar, Notice, PALETTE, SPACE, TYPE, money, dateTime,
  PremiumPage, GradientButton, GlassBadge, SurfaceCard, ReceiptLine, MeterBar,
} from '../../ui';
import { Overlap, ResultHeader, TotalBar, TrustLine } from './paymentUi';

import { resolveReturn, getOrder, getMyProfile } from '../../services/paymentFlow';

/**
 * ============================================================================
 * PAYMENT RESULT — the website's /payment-success, asked of the SERVER
 * ============================================================================
 *
 * Nothing in the return URL is trusted (it is editable). The screen polls:
 *
 *   GET /payment/return/:orderId?payment_id&payment_status   public — for an
 *       event booking the server verifies with Instamojo and confirms seats
 *   GET /payment/order/:orderId                              signed-in — the
 *       membership order's own state (the webhook activates the membership)
 *
 * until the order is `paid` or `failed`, for up to ~75 s; then "still
 * confirming" with a retry, because a slow webhook is not a failed payment.
 * A paid membership re-reads GET /members/my-profile for the Member ID and
 * lands on the paid dashboard.
 */

const POLL_EVERY_MS = 3000;
const MAX_TRIES = 25;

type Outcome = 'checking' | 'paid' | 'failed' | 'unconfirmed';

const PaymentResultScreen: React.FC<any> = ({ navigation, route }) => {
  const p = route?.params || {};
  const orderId: string = String(p?.orderId || '');
  const paymentId: string = String(p?.paymentId || '');
  const paymentStatus: string = String(p?.paymentStatus || '');
  const [orderType, setOrderType] = useState<string>(String(p?.orderType || 'membership'));
  const [bookingRef, setBookingRef] = useState<string>(String(p?.bookingRef || ''));

  const [outcome, setOutcome] = useState<Outcome>('checking');
  const [amount, setAmount] = useState<number | null>(null);
  const [planName, setPlanName] = useState('');
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [memberNo, setMemberNo] = useState('');
  const [tries, setTries] = useState(0);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gatewaySaysFailed = paymentStatus.toLowerCase() === 'failed';

  const check = useCallback(async (attempt: number) => {
    if (!alive.current) return;
    setTries(attempt);
    if (!orderId) { setOutcome('unconfirmed'); return; }
    try {
      const found = await resolveReturn(orderId, { paymentId, paymentStatus });
      if (!alive.current) return;
      if (found.orderType) setOrderType(found.orderType);
      if (found.bookingRef) setBookingRef(found.bookingRef);
      if (found.eventId) setEventId(found.eventId);
      if (found.amount !== null) setAmount(found.amount);
      let status = found.status;

      if (status !== 'paid' && status !== 'failed' && (found.orderType || orderType) !== 'event_booking') {
        const order = await getOrder(orderId).catch(() => null);
        if (order?.status) status = String(order.status);
        if (typeof order?.amount === 'number') setAmount(order.amount);
        if (order?.planName) setPlanName(String(order.planName));
        if (order?.paidAt) setPaidAt(String(order.paidAt));
      }

      if (status === 'paid') {
        if ((found.orderType || orderType) !== 'event_booking') {
          const profile = await getMyProfile().catch(() => null);
          if (profile?.membershipNumber) setMemberNo(String(profile.membershipNumber));
        }
        setOutcome('paid');
        return;
      }
      if (status === 'failed' || (gatewaySaysFailed && attempt >= 3)) { setOutcome('failed'); return; }
    } catch {
      /* A failed read is not an answer about the payment — keep asking. */
    }
    if (attempt >= MAX_TRIES) { setOutcome(gatewaySaysFailed ? 'failed' : 'unconfirmed'); return; }
    timer.current = setTimeout(() => check(attempt + 1), POLL_EVERY_MS);
  }, [orderId, paymentId, paymentStatus, orderType, gatewaySaysFailed]);

  useEffect(() => {
    alive.current = true;
    check(1);
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const retry = () => { setOutcome('checking'); check(1); };
  const toDashboard = () => navigation.reset({ index: 0, routes: [{ name: 'PaidDashboard' }] });
  /* The member area's event screens are owned by another team; MemberMain is
     the stable landing until they exist. */
  const toEvents = () => navigation.reset({ index: 0, routes: [{ name: 'MemberMain' }] });
  /* A paid booking lands on its ticket (GET /event-bookings/:ref), member area underneath. */
  const [eventId, setEventId] = useState<string>(String(p?.eventId || ''));
  const toTicket = () => (bookingRef
    ? navigation.reset({ index: 1, routes: [{ name: 'MemberMain' }, { name: 'EventBooking', params: { eventId, ref: bookingRef } }] })
    : toEvents());
  const booking = orderType === 'event_booking';
  const orderShort = orderId ? `Order ${orderId.slice(-8).toUpperCase()}` : '';

  if (outcome === 'checking') {
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="checking"
            eyebrow={orderShort || 'Payment'}
            title="Confirming your payment"
            subtitle={tries > 3 ? 'Still confirming with the bank… this can take a minute.' : 'Asking ACTIV\'s server for the result. Please keep this screen open.'}
          />
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <Text style={s.progressLabel} maxFontSizeMultiplier={1.3}>{`Checking with the gateway · attempt ${Math.max(1, tries)} of ${MAX_TRIES}`}</Text>
            <MeterBar value={Math.min(1, Math.max(1, tries) / MAX_TRIES)} height={6} style={{ marginTop: SPACE.sm }} />
            <View style={s.gap} />
            <TrustLine icon="verified-user" tone="green" text="The address bar is never trusted — only ACTIV's server can confirm a payment." />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (outcome === 'paid') {
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="success"
            eyebrow="Payment successful"
            title={booking ? 'Your seats are confirmed' : 'Welcome to ACTIV!'}
            subtitle={booking ? 'Your booking is paid. The confirmation is on its way by email and WhatsApp.' : 'Your membership is active. Your receipt and certificates are ready.'}
            amount={money(amount)}
          >
            {memberNo ? <GlassBadge label={`Member ID ${memberNo}`} icon="badge" /> : null}
          </ResultHeader>
        )}
        footer={(
          <BottomActionBar>
            {booking ? (
              <GradientButton label="View your ticket" icon="confirmation-number" onPress={toTicket} style={s.flex} />
            ) : (
              <>
                <GradientButton variant="outline" label="Receipt" icon="receipt-long" onPress={() => navigation.navigate('PaymentSuccess', { orderId, planType: planName })} style={s.flex} />
                <GradientButton label="Dashboard" icon="dashboard" onPress={toDashboard} style={s.flex} />
              </>
            )}
          </BottomActionBar>
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            {booking ? <ReceiptLine label="Booking" value={bookingRef} selectable /> : <ReceiptLine label="Plan" value={planName} />}
            <ReceiptLine label="Order" value={orderId} selectable />
            <ReceiptLine label="Paid on" value={dateTime(paidAt || new Date())} />
            <TotalBar label="Amount paid" value={money(amount)} />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (outcome === 'failed') {
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="failed"
            eyebrow="Payment not completed"
            title="The payment did not go through"
            subtitle="No money was taken for this order. You can try again."
          />
        )}
        footer={(
          <BottomActionBar>
            <GradientButton variant="outline" label={booking ? 'Back to events' : 'Back to plans'} onPress={() => (booking ? toEvents() : navigation.navigate('MembershipPlans'))} style={s.flex} />
            <GradientButton label="Try again" icon="refresh" onPress={() => navigation.goBack()} style={s.flex} />
          </BottomActionBar>
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            {orderId ? <ReceiptLine label="Order" value={orderId} selectable /> : null}
            <TrustLine icon="support-agent" tone="amber" text="If money left your account, it is returned by the bank automatically. Contact ACTIV from Help with the order number." style={orderId ? { marginTop: SPACE.md } : undefined} />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  return (
    <PremiumPage
      header={(
        <ResultHeader
          outcome="pending"
          eyebrow="Still confirming"
          title="We have not heard back yet"
          subtitle="Payments can take a few minutes to be confirmed by the bank. If money was taken, it will be credited to you automatically."
        />
      )}
      footer={(
        <BottomActionBar note={`Order ${orderId || '—'}`}>
          <GradientButton
            variant="outline"
            label={booking ? 'Back to events' : 'Dashboard'}
            onPress={() => (booking ? toEvents() : navigation.reset({ index: 0, routes: [{ name: 'MemberMain' }] }))}
            style={s.flex}
          />
          <GradientButton label="Check again" icon="refresh" onPress={retry} style={s.flex} />
        </BottomActionBar>
      )}
    >
      <Overlap>
        <Notice kind="info" style={s.gutter} text="Please do not pay again for the same order. Check again in a minute, or look at your dashboard — it updates on its own." />
      </Overlap>
    </PremiumPage>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  gutter: { marginHorizontal: SPACE.lg },
  gap: { height: SPACE.lg },
  progressLabel: { ...TYPE.caption, color: PALETTE.textSoft },
});

export default PaymentResultScreen;
