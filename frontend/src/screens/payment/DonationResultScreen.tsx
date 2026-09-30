import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomActionBar, SPACE, money,
  PremiumPage, PremiumPageHeader, DonateHeart3D, ResultOrb3D, GradientButton, SurfaceCard, StateView, ReceiptLine,
  LinkRow, GroupTitle, FadeInUp,
} from '../../ui';
import { Overlap, ResultHeader, TotalBar, TrustLine } from './paymentUi';

import { getDonationReturn, fyLabel } from '../../services/paymentFlow';
import { rememberDonationDoc } from './donationStore';

/**
 * Where a donor lands after the gateway — website `pages/donate/DonateThankYou.tsx`.
 *
 * GET /donations/return/:orderId (+ the gateway's payment_id / payment_status,
 * passed on, never trusted alone). The server verifies with the gateway. A
 * pending answer is re-asked 6 times, 3 s apart, then "still confirming" with
 * a retry. A paid gift's receipt / statement tokens are remembered on this
 * phone (donationStore) so the documents can be opened again later.
 */

const POLLS = 6;
const EVERY_MS = 3000;

const DonationResultScreen = ({ navigation, route }: any) => {
  const orderId = String(route?.params?.orderId || '');
  const paymentId = String(route?.params?.paymentId || '');
  const gatewayStatus = String(route?.params?.paymentStatus || '');

  const [result, setResult] = useState<any>(null);
  const [phase, setPhase] = useState<'checking' | 'done' | 'stuck' | 'error'>(orderId ? 'checking' : 'error');
  const tries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const check = useCallback(async () => {
    if (!orderId) { setPhase('error'); return; }
    try {
      const r = await getDonationReturn(orderId, { payment_id: paymentId, payment_status: gatewayStatus });
      if (!alive.current) return;
      setResult(r);
      const status = String(r?.status || '').toLowerCase();
      if (status === 'paid') {
        rememberDonationDoc({
          orderId,
          receiptNumber: String(r?.receiptNumber || ''),
          receiptToken: String(r?.receiptToken || ''),
          statementToken: String(r?.statementToken || ''),
          financialYear: String(r?.financialYear || ''),
          amount: typeof r?.amount === 'number' ? r.amount : null,
          savedAt: new Date().toISOString(),
        });
      }
      if (status === 'paid' || status === 'failed') { setPhase('done'); return; }
    } catch {
      /* treated like pending; the retry covers a blip */
    }
    if (!alive.current) return;
    tries.current += 1;
    if (tries.current >= POLLS) { setPhase('stuck'); return; }
    timer.current = setTimeout(() => { check(); }, EVERY_MS);
  }, [orderId, paymentId, gatewayStatus]);

  useEffect(() => {
    alive.current = true;
    check();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  const retry = () => {
    tries.current = 0;
    setPhase('checking');
    check();
  };

  const goBack = () => navigation.goBack();
  const status = String(result?.status || '').toLowerCase();

  if (phase === 'error') {
    return (
      <PremiumPage header={<PremiumPageHeader onBack={goBack} eyebrow="Donation" title="Your donation" art={<DonateHeart3D size={88} />} />}>
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <StateView
              compact
              art={<ResultOrb3D size={64} kind="pending" />}
              title="We could not find that donation"
              message="If you were charged, your receipt will reach your email shortly."
              action="Back to donations"
              actionIcon="arrow-back"
              onAction={() => navigation.navigate('MemberDonations')}
            />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (phase === 'checking') {
    return (
      <PremiumPage
        header={<ResultHeader outcome="checking" onBack={goBack} eyebrow="Confirming" title="Confirming your donation" subtitle="This usually takes a few seconds." />}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <TrustLine icon="verified-user" tone="green" text="ACTIV's server verifies the payment with the gateway — your receipt is issued only then." />
          </SurfaceCard>
        </Overlap>
      </PremiumPage>
    );
  }

  if (status === 'paid') {
    return (
      <PremiumPage
        header={(
          <ResultHeader
            outcome="success"
            eyebrow="Donation received"
            title={`Thank you${result?.donorName ? `, ${result.donorName}` : ''}!`}
            subtitle="Your donation to ACTIV has been received. Your 80G receipt is on its way to your email."
            amount={money(result?.amount)}
            amountLabel="You gave"
          />
        )}
        footer={(
          <BottomActionBar>
            <GradientButton variant="outline" label="My donations" icon="favorite-border" onPress={() => navigation.navigate('MemberDonations')} style={s.flex} />
            {result?.receiptToken ? (
              <GradientButton label="80G receipt" icon="receipt-long" onPress={() => navigation.navigate('DonationDocument', { kind: 'receipt', token: String(result.receiptToken) })} style={s.flex} />
            ) : null}
          </BottomActionBar>
        )}
      >
        <Overlap>
          <SurfaceCard style={s.gutter}>
            <ReceiptLine label="Receipt number" value={result?.receiptNumber} selectable />
            <ReceiptLine label="Financial year" value={fyLabel(result?.financialYear)} />
            <TotalBar label="Amount" value={money(result?.amount)} />
          </SurfaceCard>
        </Overlap>
        {result?.statementToken ? (
          <FadeInUp delay={220}>
            <GroupTitle title="Year certificate" subtitle="Every gift this financial year is added to it automatically." />
            <SurfaceCard style={s.gutter} padded={false}>
              <LinkRow
                icon="date-range"
                tone="green"
                title="Your year certificate"
                subtitle={result?.financialYear ? `FY ${fyLabel(result.financialYear)}` : 'This financial year'}
                onPress={() => navigation.navigate('DonationDocument', { kind: 'statement', token: String(result.statementToken), fy: String(result?.financialYear || '') })}
                last
              />
            </SurfaceCard>
          </FadeInUp>
        ) : null}
      </PremiumPage>
    );
  }

  if (status === 'failed') {
    return (
      <PremiumPage
        header={<ResultHeader outcome="failed" eyebrow="Not completed" title="The payment did not go through" subtitle="No money was taken. You can try again." />}
        footer={(
          <BottomActionBar>
            <GradientButton variant="outline" label="My donations" onPress={() => navigation.navigate('MemberDonations')} style={s.flex} />
            <GradientButton label="Try again" icon="refresh" onPress={() => navigation.replace('Donate')} style={s.flex} />
          </BottomActionBar>
        )}
      />
    );
  }

  return (
    <PremiumPage
      header={(
        <ResultHeader
          outcome="pending"
          onBack={goBack}
          eyebrow="Still confirming"
          title="Still confirming your payment"
          subtitle="The gateway has not confirmed it yet. If you were charged, your receipt will be emailed to you as soon as it does."
        />
      )}
      footer={(
        <BottomActionBar>
          <GradientButton label="Check again" icon="refresh" onPress={retry} style={s.flex} />
        </BottomActionBar>
      )}
    />
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  gutter: { marginHorizontal: SPACE.lg },
});

export default DonationResultScreen;
