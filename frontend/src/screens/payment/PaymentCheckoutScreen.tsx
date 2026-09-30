import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Linking, Alert, BackHandler } from 'react-native';
import {
  BottomActionBar, Notice, PALETTE, SPACE, TYPE, money, errorText,
  PremiumPage, PremiumPageHeader, SecureCard3D, GradientButton, SurfaceCard, LinkRow, StateView, GroupTitle,
  ReceiptLine, HeaderStat, HeaderStatRow, GradientGlyph,
} from '../../ui';
import { Overlap, ResultHeader, TotalBar, TrustLine, WebCheckout } from './paymentUi';
import {
  getPaymentConfig, startHostedPayment, payMembershipMock, payBookingMock, parseReturnUrl, getMyPlans,
  PaymentConfig,
} from '../../services/paymentFlow';

/*
 * The in-app browser. Required lazily and guarded (RULE 2.4): a build that
 * does not yet carry the native module falls back to the phone's browser
 * instead of crashing.
 */
let WebViewComp: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComp = require('react-native-webview').WebView || null;
} catch {
  WebViewComp = null;
}

/**
 * ============================================================================
 * CHECKOUT — one order through the gateway, exactly as the website does it
 * ============================================================================
 *
 *   GET  /payment/config            'gateway' (production) or 'mock' (dev)
 *   gateway:
 *   POST /payment/create-request    { membershipType: planId, orderType:'membership' }
 *                                   { orderType:'event_booking', bookingRef }
 *                                   → payment_url + orderId (NO amount is sent)
 *     The Instamojo page opens in an in-app WebView. When it navigates to the
 *     server-built return URL (…/payment-success?orderId=…) the WebView is
 *     closed and PaymentResult asks the server what happened — the address
 *     bar is never trusted. "Open in browser" is the fallback, followed by a
 *     status check.
 *   mock (dev servers only, refused in production):
 *     membership  POST /payment/order → /payment/mock-authorize → /payment/complete
 *     booking     POST /event-bookings/:ref/authorize → /event-bookings/:ref/pay
 *
 * The server's own sentences (mobile number required, not eligible to renew,
 * order already paid…) are shown verbatim.
 */

type Phase = 'preparing' | 'confirm' | 'webview' | 'browser' | 'paying' | 'error' | 'bookingDone';

const PaymentCheckoutScreen: React.FC<any> = ({ navigation, route }) => {
  const params = route?.params || {};
  const orderType: 'membership' | 'event_booking' = params?.orderType === 'event_booking' ? 'event_booking' : 'membership';
  const planId: string = String(params?.planId || '');
  const bookingRef: string = String(params?.bookingRef || '');
  const eventId: string = String(params?.eventId || '');
  const renew = params?.renew === true;
  /* The website sends the application id with the membership order when it has one. */
  const applicationId: string = String(params?.applicationId || '');

  const [phase, setPhase] = useState<Phase>('preparing');
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [planName, setPlanName] = useState('');

  const handedOff = useRef(false);

  const goResult = useCallback((ret?: { orderId?: string; paymentId?: string; paymentStatus?: string }) => {
    if (handedOff.current) return;
    handedOff.current = true;
    const id = (ret?.orderId || orderId || '').trim();
    if (!id) {
      handedOff.current = false;
      setError('The payment order could not be identified. If money was taken, it will still be credited — check your dashboard shortly.');
      setPhase('error');
      return;
    }
    navigation.replace('PaymentResult', {
      orderId: id,
      orderType,
      bookingRef: bookingRef || undefined,
      eventId: eventId || undefined,
      paymentId: ret?.paymentId || undefined,
      paymentStatus: ret?.paymentStatus || undefined,
    });
  }, [navigation, orderId, orderType, bookingRef, eventId]);

  /** Start the gateway order (or show the mock confirm step). */
  const start = useCallback(async () => {
    setPhase('preparing');
    setError('');
    handedOff.current = false;
    if (orderType === 'membership' && !planId) {
      setError('Choose a plan first.');
      setPhase('error');
      return;
    }
    if (orderType === 'event_booking' && !bookingRef) {
      setError('This booking could not be found.');
      setPhase('error');
      return;
    }
    try {
      const cfg = await getPaymentConfig();
      setConfig(cfg);
      if (orderType === 'membership') {
        // Display only — the server prices the order from the key.
        const mine = await getMyPlans();
        const p = (mine.plans || []).find((x) => x.key === planId);
        if (p) { setPlanName(p.name); setAmount(p.price); }
      }
      if (cfg.mode === 'gateway') {
        const started = await startHostedPayment({ orderType, planId, bookingRef, applicationId: applicationId || undefined });
        setPayUrl(started.paymentUrl);
        setOrderId(started.orderId);
        if (started.amount !== null) setAmount(started.amount);
        setPhase(WebViewComp ? 'webview' : 'browser');
        if (!WebViewComp) {
          try { await Linking.openURL(started.paymentUrl); } catch { /* the button below retries */ }
        }
      } else {
        setPhase('confirm');
      }
    } catch (err) {
      setError(errorText(err, 'The payment could not be started. Please try again.'));
      setPhase('error');
    }
  }, [orderType, planId, bookingRef, applicationId]);

  useEffect(() => { start(); }, [start]);

  const cancel = useCallback(() => {
    Alert.alert(
      'Leave the payment?',
      'If you have already paid, it will still be credited to you. You can check on your dashboard.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: orderId ? 'Check status' : 'Leave', onPress: () => (orderId ? goResult() : navigation.goBack()) },
      ],
    );
    return true;
  }, [orderId, goResult, navigation]);

  // Android back inside the gateway = ask, never silently drop the order.
  useEffect(() => {
    if (phase !== 'webview') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', cancel);
    return () => sub.remove();
  }, [phase, cancel]);

  const payMock = async () => {
    setPhase('paying');
    try {
      if (orderType === 'membership') {
        const order = await payMembershipMock(planId, applicationId || undefined);
        navigation.replace('PaymentSuccess', { orderId: order.orderId, planType: planName || planId, renewed: renew });
      } else {
        await payBookingMock(bookingRef);
        setPhase('bookingDone');
      }
    } catch (err) {
      setError(errorText(err, 'The payment did not go through.'));
      setPhase('error');
    }
  };

  const openBrowser = async () => {
    if (!payUrl) return;
    try {
      await Linking.openURL(payUrl);
      setPhase('browser');
    } catch {
      Alert.alert('Could not open the browser', 'Please try the in-app payment page instead.');
    }
  };

  const title = orderType === 'event_booking' ? 'Pay for your booking' : renew ? 'Renew membership' : 'Checkout';

  /* ---------------------------------------------------------------- webview */
  if (phase === 'webview' && WebViewComp && payUrl) {
    return (
      <WebCheckout
        WebViewComp={WebViewComp}
        url={payUrl}
        isReturn={parseReturnUrl}
        onReturn={goResult}
        onClose={cancel}
        onError={() => setPhase('browser')}
        onOpenBrowser={openBrowser}
      />
    );
  }

  const goBack = () => navigation.goBack();
  const eyebrow = orderType === 'event_booking' ? 'Event booking' : renew ? 'Renewal' : 'Membership';

  if (phase === 'preparing' || phase === 'paying') {
    const preparing = phase === 'preparing';
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="checking"
            onBack={preparing ? goBack : undefined}
            eyebrow={eyebrow}
            title={preparing ? 'Preparing a secure payment' : 'Processing your payment'}
            subtitle={preparing ? 'Opening an encrypted order with the gateway…' : 'Please keep this screen open.'}
          />
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            {[
              { icon: 'lock', text: 'Your order is created on ACTIV’s server — the price comes from there, not this phone.', done: true },
              { icon: 'credit-card', text: 'Card, UPI and net banking are handled by Instamojo.', done: !preparing },
              { icon: 'receipt-long', text: 'Your receipt appears the moment the payment is confirmed.', done: false },
            ].map((row, i) => (
              <View key={row.icon} style={[s.stepRow, i > 0 && { marginTop: SPACE.md }]}>
                <GradientGlyph icon={row.done ? 'check' : row.icon} tone={row.done ? 'green' : 'slate'} size={34} iconSize={17} />
                <Text style={s.stepText} maxFontSizeMultiplier={1.3}>{row.text}</Text>
              </View>
            ))}
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (phase === 'error') {
    return (
      <PremiumPage header={<PremiumPageHeader onBack={goBack} eyebrow={eyebrow} title={title} art={<SecureCard3D size={84} />} />}>
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <StateView kind="error" compact title="Payment not started" message={error} onAction={start} secondary="Go back" onSecondary={goBack} />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (phase === 'bookingDone') {
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="success"
            eyebrow="Booking"
            title="Your seats are confirmed"
            subtitle={`Booking reference ${bookingRef}`}
          />
        )}
        footer={(
          <BottomActionBar>
            <GradientButton
              label="View your ticket"
              icon="confirmation-number"
              // The ticket, with the member area under it (not the checkout).
              onPress={() => navigation.reset({ index: 1, routes: [{ name: 'MemberMain' }, { name: 'EventBooking', params: { eventId, ref: bookingRef } }] })}
              style={s.flex}
            />
          </BottomActionBar>
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <ReceiptLine label="Reference" value={bookingRef} selectable />
            <ReceiptLine label="Status" value="Paid" />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (phase === 'browser') {
    return (
      <PremiumPage
        header={(
          <PremiumPageHeader
            onBack={goBack}
            eyebrow="Secure payment"
            title="Finish paying in your browser"
            subtitle="Complete the payment on Instamojo, then come back here and check the status."
            art={<SecureCard3D size={88} />}
          />
        )}
        footer={(
          <BottomActionBar note="Confirmed by ACTIV's server with Instamojo — you will not be charged twice.">
            <View style={s.stack}>
              <GradientButton label="Open payment page" icon="open-in-new" onPress={openBrowser} disabled={!payUrl} />
              <GradientButton label="I have paid — check status" icon="fact-check" variant="outline" onPress={() => goResult()} disabled={!orderId} />
            </View>
          </BottomActionBar>
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter} padded={false}>
            <LinkRow icon="open-in-new" title="Open the payment page" subtitle="Instamojo opens in your phone's browser." />
            <LinkRow icon="lock" tone="green" title="Pay by card, UPI or net banking" subtitle="ACTIV never sees your payment details." />
            <LinkRow icon="fact-check" tone="teal" title="Come back and check the status" subtitle="Your receipt appears the moment it is confirmed." last />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  /* ---------------------------------------------------------------- confirm (mock mode, dev servers) */
  const amountText = money(amount);
  return (
    <PremiumPage
      header={(
        <PremiumPageHeader
          onBack={goBack}
          eyebrow={eyebrow}
          title={orderType === 'event_booking' ? `Booking ${bookingRef}` : planName || 'Your membership'}
          subtitle="Review and confirm your payment."
          art={<SecureCard3D size={88} />}
          artLabel="Secure card payment"
        >
          <HeaderStatRow>
            <HeaderStat icon="payments" value={amountText} label="Amount due" />
            <HeaderStat icon="verified-user" value="Secure" label="Server-priced" />
          </HeaderStatRow>
        </PremiumPageHeader>
      )}
      footer={(
        <BottomActionBar note="The amount is set by ACTIV's server.">
          <GradientButton label={`Pay ${amountText === '—' ? '' : amountText}`.trim()} icon="lock" onPress={payMock} style={s.flex} />
        </BottomActionBar>
      )}
    >
      <Overlap>
        <Notice kind="warning" icon="science" style={s.notice} text={`Test mode (${config?.provider || 'mock'}): this server takes no real money. Production uses Instamojo.`} />
        <GroupTitle title="Order summary" style={{ marginTop: SPACE.sm }} />
        <SurfaceCard style={s.gutter}>
          {orderType === 'membership' ? <ReceiptLine label="Plan" value={planName || planId} /> : <ReceiptLine label="Booking" value={bookingRef} />}
          <ReceiptLine label="Charged by" value="ACTIV" />
          <TotalBar label="Amount" value={amountText} />
          <View style={s.trustGap} />
          <TrustLine icon="lock" tone="green" text="The amount is set by the server — nothing on this phone can change it." />
        </SurfaceCard>
      </Overlap>
    </PremiumPage>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flex: 1, gap: SPACE.sm },
  gutter: { marginHorizontal: SPACE.lg },
  notice: { marginHorizontal: SPACE.lg },
  trustGap: { height: SPACE.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  stepText: { ...TYPE.body, flex: 1, minWidth: 0, color: PALETTE.textSoft },
});

export default PaymentCheckoutScreen;
