import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import {
  Skeleton, Notice, BottomActionBar, SPACE, RADIUS, TYPE, errorText,
  PremiumPage, PremiumPageHeader, PREMIUM_OVERLAP, HeaderStat, HeaderStatRow, GlassIconButton, GradientButton,
  PillTabs, StateView, SurfaceCard, GradientGlyph, FadeInUp, CertificateSeal3D,
} from '../../../ui';
import { getCertificate } from '../../../services/memberApi';
import { isPaymentGate } from '../useLoad';
import MemberLocked from '../MemberLocked';
import { MembershipCertificateView, TaxCertificateView, certDate, certRupees, fullYear } from './CertificateViews';

/**
 * A member's certificate — website `/member/certificate/:kind` (CertificatePage).
 *
 *   GET /members/certificate/membership
 *   GET /members/certificate/tax-exemption
 *
 * The server sends the fields, no PDF; the certificate is drawn natively
 * (CertificateViews). The server refuses with 403 until the membership is
 * active — that refusal IS the answer, so it is shown as the locked state, not
 * as a blank certificate.
 *
 * Sharing: the app ships no screenshot/PDF module, so Share sends the
 * certificate's facts as text plus the link to the same certificate on the
 * website (where it prints / saves as PDF).
 */

type Kind = 'membership' | 'tax-exemption';
const SITE = 'https://activ.org.in';

const shareText = (kind: Kind, cert: any): string => {
  const m = cert?.member || {};
  if (kind === 'tax-exemption') {
    const c = cert?.contribution || {};
    return [
      'ACTIV — Certificate of Tax Exemption (Section 80G, Income Tax Act, 1961)',
      m?.name ? `Name: ${m.name}` : '',
      m?.pan ? `PAN: ${m.pan}` : '',
      cert?.financialYear ? `Financial year: ${fullYear(cert.financialYear)}` : '',
      typeof c?.amount === 'number' ? `Amount: ${certRupees(c.amount)}` : '',
      cert?.reference ? `Certificate No: ${cert.reference}` : '',
      cert?.issuedAt ? `Issued: ${certDate(cert.issuedAt)}` : '',
      '',
      `View or print: ${SITE}/member/certificate/tax-exemption`,
    ].filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const platinum = String(cert?.membershipTier || '') === 'platinum';
  const valid = platinum ? 'Lifetime' : cert?.validUntil ? certDate(cert.validUntil) : String(cert?.membershipType || '') === 'lifetime' ? 'Lifetime' : '';
  return [
    'ACTIV — Membership Certificate',
    `${m?.companyName || m?.name || 'Member'} has been admitted as ${platinum ? 'a Platinum Lifetime Member' : 'an official member'} of ACTIV.`,
    m?.membershipNumber ? `Membership No: ${m.membershipNumber}` : '',
    valid ? `Valid till: ${valid}` : '',
    cert?.reference ? `Certificate No: ${cert.reference}` : '',
    '',
    `View or print: ${SITE}/member/certificate/membership`,
  ].filter(Boolean).join('\n');
};

const MemberCertificateScreen = ({ navigation, route }: any) => {
  const initial: Kind = route?.params?.kind === 'tax-exemption' ? 'tax-exemption' : 'membership';
  const [kind, setKind] = useState<Kind>(initial);
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [gated, setGated] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    setGated(false);
    try {
      const c = await getCertificate(kind);
      if (!alive.current) return;
      setCert(c);
      if (!c) setError('This certificate could not be issued');
    } catch (err) {
      if (!alive.current) return;
      setCert(null);
      setGated(isPaymentGate(err));
      setError(errorText(err, 'This certificate could not be issued'));
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [kind]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  const share = useCallback(async () => {
    if (!cert) return;
    try {
      await Share.share({ message: shareText(kind, cert), title: kind === 'tax-exemption' ? 'Tax Exemption Certificate' : 'Membership Certificate' });
    } catch (err) {
      console.warn('Share safely caught:', err);
    }
  }, [cert, kind]);

  const platinum = String(cert?.membershipTier || '') === 'platinum';
  const validTill = platinum
    ? 'Lifetime'
    : cert?.validUntil ? certDate(cert.validUntil) : String(cert?.membershipType || '') === 'lifetime' ? 'Lifetime' : '';
  const ready = !!cert && !error;

  const header = (
    <PremiumPageHeader
      eyebrow={kind === 'tax-exemption' ? 'Section 80G · Income Tax Act' : 'Official document'}
      title={kind === 'tax-exemption' ? 'Tax exemption certificate' : 'Membership certificate'}
      subtitle={ready ? 'Issued by ACTIV — share it or print it from the website.' : 'Your certificates, drawn from your membership record.'}
      onBack={() => navigation.goBack()}
      right={ready ? <GlassIconButton icon="share" accessibilityLabel="Share certificate" onPress={share} /> : null}
      art={<CertificateSeal3D size={88} />}
    >
      {ready ? (
        <HeaderStatRow>
          <HeaderStat
            icon="tag"
            label="Certificate no."
            value={String(cert?.reference || '—')}
          />
          {kind === 'tax-exemption' ? (
            <HeaderStat icon="date-range" label="Financial year" value={fullYear(cert?.financialYear || '') || '—'} />
          ) : (
            <HeaderStat icon="event-available" label="Valid till" value={validTill || '—'} />
          )}
        </HeaderStatRow>
      ) : null}
    </PremiumPageHeader>
  );

  const tabs = (
    <FadeInUp delay={200} style={s.tabs}>
      <PillTabs<Kind>
        value={kind}
        onChange={setKind}
        options={[
          { value: 'membership', label: 'Membership', icon: 'workspace-premium' },
          { value: 'tax-exemption', label: 'Tax (80G)', icon: 'receipt-long' },
        ]}
      />
    </FadeInUp>
  );

  if (loading) {
    return (
      <PremiumPage header={header}>
        {tabs}
        <View style={s.sheet} accessibilityLabel="Preparing your certificate">
          <Skeleton height={560} radius={RADIUS.xs} />
        </View>
      </PremiumPage>
    );
  }

  if (error || !cert) {
    return (
      <PremiumPage header={header} onRefresh={() => load('refresh')} refreshing={refreshing}>
        {tabs}
        {gated ? (
          <FadeInUp delay={260} style={s.gate}>
            <MemberLocked feature="Your certificates" onActivate={() => navigation.navigate('MembershipPlans')} />
          </FadeInUp>
        ) : (
          <StateView
            kind="error"
            art={<CertificateSeal3D size={84} />}
            title="This certificate could not be issued"
            message={error || 'This certificate could not be issued'}
            onAction={() => load()}
          />
        )}
      </PremiumPage>
    );
  }

  return (
    <PremiumPage
      header={header}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}
      footer={(
        <BottomActionBar note="The link opens this certificate on activ.org.in, where it prints or saves as a PDF.">
          <GradientButton label="Share certificate" icon="share" onPress={share} style={s.grow} />
        </BottomActionBar>
      )}
    >
      {tabs}
      {kind === 'tax-exemption' && !(cert?.contribution && typeof cert.contribution.amount === 'number') ? (
        <FadeInUp delay={240}>
          <Notice kind="info" style={s.notice} text="The amount of your payment is not on record, so no figure is printed on this certificate." />
        </FadeInUp>
      ) : null}
      <FadeInUp key={kind} delay={260} distance={24} style={s.sheet}>
        {kind === 'tax-exemption' ? (
          <TaxCertificateView
            cert={cert}
            hint="Tap the certificate to view it full size"
            onPress={() => {
              try {
                navigation.navigate('CertificateZoom', { cert });
              } catch (err) {
                console.warn('Certificate zoom navigation safely caught:', err);
              }
            }}
          />
        ) : <MembershipCertificateView cert={cert} />}
      </FadeInUp>
      <FadeInUp delay={320}>
        <SurfaceCard style={s.verify}>
          <View style={s.verifyRow}>
            <GradientGlyph icon="verified" tone="green" size={40} />
            <View style={s.flexMin}>
              <Text style={s.verifyTitle} maxFontSizeMultiplier={1.3}>Issued from your membership record</Text>
              <Text style={s.verifyText} maxFontSizeMultiplier={1.3}>
                {cert?.issuedAt ? `Issued ${certDate(cert.issuedAt)}` : 'Issued by ACTIV'}
                {cert?.reference ? ` · No. ${cert.reference}` : ''}. Nothing on it is filled in by hand — a fact not on record is left off.
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </FadeInUp>
    </PremiumPage>
  );
};

const s = StyleSheet.create({
  tabs: { marginTop: -PREMIUM_OVERLAP },
  sheet: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  gate: { marginTop: SPACE.md },
  notice: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  verify: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  verifyTitle: { ...TYPE.subheading },
  verifyText: { ...TYPE.caption, marginTop: 2 },
  flexMin: { flex: 1, minWidth: 0 },
  grow: { flex: 1 },
});

export default MemberCertificateScreen;
