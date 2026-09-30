import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, AppHeader, Hero, Card, Field, PrimaryButton, InfoRow, Notice, PALETTE, SPACE, money } from '../../../ui';
import { grantPlatinum, getPlatinumOverview, PlatinumPaymentMode, PAYMENT_MODE_LABEL, errorText } from '../../../services/superApi';
import { ChipRow, ToggleRow, place } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — grant Platinum to one member (website PlatinumMembers → Grant)
 * ============================================================================
 *
 * POST /admin/super/membership/platinum/:memberId — the office receipt becomes
 * a paid `provider: 'offline'` payment order (so 80G and reports see it), and
 * the member becomes lifetime Platinum with no expiry. `platinumGrant.previous`
 * on the server is what lets "Undo grant" restore them exactly.
 */

const MODES = (Object.keys(PAYMENT_MODE_LABEL) as PlatinumPaymentMode[]).map((k) => ({ value: k, label: PAYMENT_MODE_LABEL[k] }));

const todayIso = () => new Date().toISOString().slice(0, 10);

const SuperPlatinumGrantScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const m = route?.params?.member || {};
  const passedPrice = Number(route?.params?.price);

  const [price, setPrice] = useState<number | null>(Number.isFinite(passedPrice) && passedPrice > 0 ? passedPrice : null);
  const [amount, setAmount] = useState(Number.isFinite(passedPrice) && passedPrice > 0 ? String(passedPrice) : '');
  const [mode, setMode] = useState<PlatinumPaymentMode>('cash');
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [receivedOn, setReceivedOn] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill the Platinum price the Super Admin set (editable: the office
  // records what was actually received).
  useEffect(() => {
    let alive = true;
    getPlatinumOverview().then((o) => {
      if (alive && typeof o?.plan?.price === 'number' && o.plan.price > 0) {
        setPrice(o.plan.price);
        setAmount((a) => a || String(o.plan.price));
      }
    }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const save = async () => {
    const rupees = Number(amount);
    if ((amount || '').trim() === '' || !Number.isFinite(rupees) || rupees < 0) { setError('Enter the amount received'); return; }
    const day = (receivedOn || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(day).getTime())) { setError('Received on must be a date like 2026-09-29.'); return; }
    if (day > todayIso()) { setError('Received on cannot be in the future.'); return; }
    if (!confirmed) { setError('Tick the box to confirm the payment was received'); return; }
    setError('');
    setSaving(true);
    try {
      await grantPlatinum(String(m?.id || ''), {
        amount: rupees,
        paymentMode: mode,
        receiptNumber: (receipt || '').trim() || undefined,
        receivedOn: (receivedOn || '').trim(),
        note: (note || '').trim() || undefined,
      });
      Alert.alert('Platinum granted', `${m?.fullName || 'The member'} is now a Platinum lifetime member.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not grant Platinum', errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title="Grant Platinum" subtitle="Lifetime · paid at the office" onBack={() => navigation.goBack()} />
      <Hero colors={['#111827', '#374151', '#6B7280']} eyebrow="PLATINUM LIFETIME" title={m?.fullName || 'Member'}
        subtitle={[m?.membershipNumber, place(m?.block, m?.district, m?.state)].filter(Boolean).join(' · ')} icon="diamond" />

      <Card style={s.card}>
        <InfoRow label="Email" value={m?.email} />
        <InfoRow label="Phone" value={m?.phoneNumber} />
        <InfoRow label="Current membership" value={[m?.membershipStatus, m?.membershipType].filter(Boolean).join(' · ') || m?.applicationOutcome} last />
      </Card>

      <Card style={s.card}>
        <Text style={s.title}>The office receipt</Text>
        <Field label="Amount received (₹)" value={amount} onChangeText={(t) => setAmount((t || '').replace(/[^\d.]/g, ''))} keyboardType="numeric" icon="currency-rupee" />
        <Text style={s.label}>Paid by</Text>
        <View style={{ marginHorizontal: -SPACE.lg, marginBottom: SPACE.md }}>
          <ChipRow<PlatinumPaymentMode> options={MODES} value={mode} onChange={setMode} />
        </View>
        <Field label="Receipt / cheque / UTR no." value={receipt} onChangeText={setReceipt} placeholder="Optional" autoCapitalize="characters" />
        <Field label="Received on" value={receivedOn} onChangeText={setReceivedOn} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Field label="Note" value={note} onChangeText={setNote} multiline placeholder="Optional — e.g. received at the Chennai office" />
        {price !== null && amount !== '' && Number(amount) !== Number(price) ? (
          <Text style={s.warn}>This differs from the Platinum price of {money(price)}. That is allowed — the amount received is what is recorded.</Text>
        ) : null}
        <View style={{ marginHorizontal: -SPACE.lg, marginTop: SPACE.md }}>
          <ToggleRow
            label={`I confirm ${money(Number(amount) || 0)} has been received from ${m?.fullName || 'this member'}`}
            hint="Their membership becomes lifetime and never needs renewing."
            value={confirmed}
            onChange={setConfirmed}
            last
          />
        </View>
      </Card>

      {error ? <Notice kind="danger" text={error} /> : null}
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.xl }}>
        <PrimaryButton tone="admin" variant="gold" icon="diamond" label="Grant Platinum" onPress={save} loading={saving} disabled={!confirmed} />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  title: { fontSize: 15, fontWeight: '800', color: PALETTE.text, marginBottom: SPACE.md },
  warn: { fontSize: 12, color: '#B45309', lineHeight: 17, marginTop: SPACE.sm },
  label: { fontSize: 13, fontWeight: '700', color: PALETTE.textSoft, marginBottom: 2 },
});

export default SuperPlatinumGrantScreen;
