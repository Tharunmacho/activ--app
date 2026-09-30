import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  Screen, AppHeader, Hero, Card, InfoRow, Loading, ErrorState, EmptyState, Badge, PALETTE, SPACE, RADIUS, SHADOW, money, shortDate,
} from '../../../ui';
import { getDonor, resendDonationReceipt, fyLabel, statementUrl, receiptUrl, errorText } from '../../../services/superApi';
import { MiniAction, openUrl, callNumber } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — one donor (website /super-admin/donations/:id)
 * ============================================================================
 *
 * GET /admin/super/donations/donors/:id — the donor, their totals per
 * financial year (each has its own year certificate), and EVERY donation as
 * its own row (receipt, date, amount, status, message in full). "Resend"
 * re-emails the 80G receipt: POST /admin/super/donations/:id/resend.
 */

const GOLD = ['#78350F', '#B45309', '#F59E0B'];

const SuperDonorDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route?.params?.id || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getDonor(id)); } catch (err) { setError(errorText(err)); } finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resend = async (donationId: string) => {
    setSending(donationId);
    try {
      await resendDonationReceipt(donationId);
      Alert.alert('Sent', 'Receipt sent to the donor again.');
    } catch (err) {
      Alert.alert('Could not resend', errorText(err));
    } finally {
      setSending('');
    }
  };

  const title = route?.params?.name || 'Donor';
  if (loading && !data) return <Screen tone="admin"><AppHeader tone="admin" title={title} onBack={() => navigation.goBack()} /><Loading tone="admin" /></Screen>;
  if (error) return <Screen tone="admin"><AppHeader tone="admin" title={title} onBack={() => navigation.goBack()} /><ErrorState tone="admin" message={error} onRetry={load} /></Screen>;

  const d = data?.donor || {};
  const byYear: any[] = Array.isArray(data?.byYear) ? data.byYear : [];
  const donations: any[] = Array.isArray(data?.donations) ? data.donations : [];
  const allTime = byYear.reduce((sum, y) => sum + Number(y?.total || 0), 0);
  const addr = d?.address || {};

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title={d?.fullName || title} subtitle={d?.email || 'Every gift, receipt and year certificate for this donor.'} onBack={() => navigation.goBack()} />
      <Hero colors={GOLD} eyebrow={d?.donorType === 'organisation' ? 'ORGANISATION DONOR' : 'DONOR'} title={money(allTime)}
        subtitle={`${donations.filter((x) => String(x?.status) === 'paid').length} completed donation(s) across ${byYear.length} financial year(s)`} icon="volunteer-activism" />

      <Card style={s.card}>
        <Text style={s.cardTitle}>Donor details</Text>
        <InfoRow label={d?.donorType === 'organisation' ? 'Organisation' : 'Name'} value={d?.fullName} />
        <InfoRow label="Email" value={d?.email} />
        <InfoRow label="Mobile" value={d?.phone} />
        <InfoRow label="PAN" value={d?.pan} />
        <InfoRow label="Address" value={addr?.line1} />
        <InfoRow label="City" value={addr?.city} />
        <InfoRow label="District" value={addr?.district} />
        <InfoRow label="State" value={addr?.state} />
        <InfoRow label="PIN code" value={addr?.pincode} last />
        {d?.phone ? <View style={{ marginTop: SPACE.md, flexDirection: 'row' }}><MiniAction icon="call" label="Call" onPress={() => callNumber(d.phone)} /></View> : null}
      </Card>

      <Text style={s.section}>By financial year</Text>
      {byYear.length === 0 ? <EmptyState tone="admin" icon="event-note" title="No completed donations yet" /> : byYear.map((y) => (
        <View key={y?.financialYear} style={[s.year, SHADOW.card]}>
          <View style={{ flex: 1 }}>
            <Text style={s.yearTitle}>FY {fyLabel(y?.financialYear)}</Text>
            <Text style={s.sub}>{y?.count || 0} gift{y?.count === 1 ? '' : 's'}</Text>
          </View>
          <Text style={s.amount}>{money(y?.total)}</Text>
          {d?.statementToken ? (
            <MiniAction icon="event-note" label="Year certificate" color="#B45309" onPress={() => openUrl(statementUrl(d.statementToken, y?.financialYear))} />
          ) : null}
        </View>
      ))}

      <Text style={s.section}>Every donation</Text>
      {donations.length === 0 ? <EmptyState tone="admin" icon="receipt-long" title="No donations recorded" /> : donations.map((r) => {
        const paid = String(r?.status || '').toLowerCase() === 'paid';
        return (
          <View key={String(r?.id)} style={[s.don, SHADOW.card]}>
            <View style={s.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.receipt} numberOfLines={1}>{r?.receiptNumber || 'No receipt yet'}</Text>
                <Text style={s.sub}>{shortDate(r?.paidAt || r?.createdAt)}{r?.financialYear ? ` · FY ${fyLabel(r.financialYear)}` : ''}{r?.paymentMode ? ` · ${r.paymentMode}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.amount}>{money(r?.amount)}</Text>
                <Badge label={String(r?.status || 'pending')} status={String(r?.status || 'pending')} style={{ marginTop: 4 }} />
              </View>
            </View>
            {r?.message ? <Text style={s.message}>“{r.message}”</Text> : null}
            {paid ? (
              <View style={s.actions}>
                {r?.receiptToken ? <MiniAction icon="receipt-long" label="Receipt" color="#B45309" onPress={() => openUrl(receiptUrl(r.receiptToken))} /> : null}
                <MiniAction icon="send" label={sending === r?.id ? 'Sending…' : 'Resend'} onPress={() => resend(String(r?.id || ''))} disabled={!!sending} />
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  cardTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.text, marginBottom: SPACE.sm },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: PALETTE.textMuted, textTransform: 'uppercase', marginHorizontal: SPACE.lg, marginTop: SPACE.xl, marginBottom: SPACE.sm },
  year: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  yearTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.text },
  don: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  receipt: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#B45309' },
  message: { fontSize: 13, color: PALETTE.textSoft, fontStyle: 'italic', marginTop: SPACE.sm, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
});

export default SuperDonorDetailScreen;
