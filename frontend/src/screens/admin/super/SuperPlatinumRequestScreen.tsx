import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  Screen, AppHeader, Hero, Card, InfoRow, Field, PrimaryButton, Loading, ErrorState, Badge, Notice, PALETTE, SPACE, RADIUS, shortDate, money,
} from '../../../ui';
import { getPlatinumRequestDetail, updatePlatinumRequest, PlatinumRequestStatus, errorText } from '../../../services/superApi';
import { resolveMediaUrl } from '../../../config/api.config';
import { MiniAction, confirm, place, callNumber, whatsappNumber, openUrl } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — one Platinum request (website PlatinumMembers request row +
 * PlatinumRequestDetails)
 * ============================================================================
 *
 * GET  /admin/super/membership/platinum/requests/:id — everything the member
 *      filled in (personal, membership & application, business, declaration,
 *      earlier requests), read-only, for the office calling them back.
 * PATCH …/requests/:id { status, notes } — contacted / declined (the decline
 *      reason is the note, as on the website). Granting goes through the normal
 *      grant, which marks the request `converted` itself.
 */

const words = (v?: string | null) => String(v || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');
const join = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || ''));
const CONTACT_LABEL: Record<string, string> = { call: 'a phone call', whatsapp: 'WhatsApp', email: 'email' };
const STATUS_WORD: Record<string, string> = { new: 'New', contacted: 'Contacted', converted: 'Platinum granted', declined: 'Declined' };

/** Absent values are left out rather than printed as dashes (website `Row`). */
function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return <InfoRow label={label} value={value} />;
}

const SuperPlatinumRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route?.params?.id || '';
  const blockedReason: string = String(route?.params?.blockedReason || '');

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await getPlatinumRequestDetail(id);
      setDetail(d);
      setNotes(String(d?.request?.notes || ''));
    } catch (err) { setError(errorText(err, 'Could not load the member’s details')); } finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (status: PlatinumRequestStatus) => {
    if (status === 'declined' && !(await confirm('Decline this request?', 'The note above is kept as the reason, for your records. The member stays on their current membership.', 'Decline', true))) return;
    setBusy(true);
    try {
      await updatePlatinumRequest(id, { status, notes: (notes || '').trim() });
      Alert.alert('Updated', status === 'contacted' ? 'Marked as contacted' : status === 'declined' ? 'Request declined' : 'Updated');
      await load();
    } catch (err) { Alert.alert('Could not update the request', errorText(err)); } finally { setBusy(false); }
  };
  const saveNotes = async () => {
    setBusy(true);
    try { await updatePlatinumRequest(id, { notes: (notes || '').trim() }); Alert.alert('Saved', 'Notes saved.'); } catch (err) { Alert.alert('Could not update the request', errorText(err)); } finally { setBusy(false); }
  };
  /** Grant = the normal grant screen, for the member who asked (`request.memberId`). */
  const grant = () => {
    const r = detail?.request || {};
    const p = detail?.personal || {};
    const mem = detail?.membership || {};
    if (!r?.memberId) { Alert.alert('Not possible', 'This request is not linked to a member record.'); return; }
    navigation.navigate('SuperPlatinumGrant', {
      member: {
        id: r.memberId, fullName: r?.name || p?.fullName, email: r?.email || p?.email, phoneNumber: r?.phone || p?.phoneNumber,
        block: p?.block, district: p?.district, state: p?.state, membershipNumber: mem?.memberNumber,
        membershipStatus: mem?.status, membershipType: mem?.type,
      },
    });
  };

  if (loading && !detail) return <Screen tone="admin"><AppHeader tone="admin" title="Platinum request" onBack={() => navigation.goBack()} /><Loading tone="admin" label="Loading the member’s details…" /></Screen>;
  if (error && !detail) return <Screen tone="admin"><AppHeader tone="admin" title="Platinum request" onBack={() => navigation.goBack()} /><ErrorState tone="admin" message={error} onRetry={load} /></Screen>;

  const r = detail?.request || {};
  const p = detail?.personal || {};
  const mem = detail?.membership || {};
  const biz = detail?.business || null;
  const decl = detail?.declaration || null;
  const app = detail?.application || null;
  const open = r?.status === 'new' || r?.status === 'contacted';
  const photo = p?.profilePhoto ? resolveMediaUrl(p.profilePhoto) : '';
  const region = p?.isInternational ? place(p?.place, p?.country) : place(p?.block, p?.district, p?.state);
  const earlier: any[] = (Array.isArray(detail?.history) ? detail.history : []).filter((h: any) => h?.id !== r?.id);
  /** Sister concerns and company names are business answers only. */
  const trading = !!biz?.doingBusiness && !['aspirant', 'student'].includes(String(biz?.registrationType || mem?.memberType || '').toLowerCase());
  const lifetime = mem?.tier === 'platinum' || mem?.type === 'lifetime';

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title="Platinum request" subtitle={shortDate(r?.createdAt)} onBack={() => navigation.goBack()} />
      <Hero colors={['#0B1F5C', '#1E3A8A', '#2563EB']} eyebrow="WANTS PLATINUM" title={r?.name || p?.fullName || 'Member'}
        subtitle={`Prefers ${CONTACT_LABEL[r?.preferredContact] || 'a phone call'}${r?.preferredTime ? ` · ${r.preferredTime}` : ''}`} icon="contact-phone">
        <View style={s.heroActions}>
          <MiniAction icon="call" label={r?.phone || 'Call'} color="#FFFFFF" onPress={() => callNumber(r?.phone || p?.phoneNumber)} disabled={!(r?.phone || p?.phoneNumber)} />
          <MiniAction icon="chat" label="WhatsApp" color="#FFFFFF" onPress={() => whatsappNumber(p?.whatsappNumber || r?.phone, `Hello ${r?.name || ''}, this is the ACTIV office about your Platinum membership request.`)} disabled={!(p?.whatsappNumber || r?.phone)} />
          <MiniAction icon="email" label="Email" color="#FFFFFF" onPress={() => openUrl(r?.email ? `mailto:${r.email}?subject=${encodeURIComponent('Your ACTIV Platinum membership request')}` : '')} disabled={!r?.email} />
        </View>
      </Hero>

      <View style={s.statusRow}>
        <Badge label={STATUS_WORD[r?.status] || String(r?.status || 'New')} status={r?.status === 'converted' ? 'approved' : r?.status === 'declined' ? 'rejected' : 'pending'} />
        {r?.handledBy ? <Text style={s.small}>{r.handledBy} · {shortDate(r?.handledAt)}</Text> : null}
      </View>
      {r?.message ? <Card style={s.card}><Text style={s.cardTitle}>Their message</Text><Text style={s.body}>“{r.message}”</Text></Card> : null}
      {open && blockedReason ? <Notice kind="warning" text={blockedReason} /> : null}

      <Card style={s.card}>
        <Text style={s.cardTitle}>Personal</Text>
        {photo ? <Image source={{ uri: photo }} style={s.photo} /> : null}
        <Row label="Full name" value={p?.fullName} />
        <Row label="Email" value={p?.email || r?.email} />
        <Row label="Mobile" value={p?.phoneNumber || r?.phone} />
        <Row label="WhatsApp" value={p?.whatsappNumber} />
        <Row label="Gender" value={words(p?.gender)} />
        <Row label="Social category" value={p?.socialCategory} />
        <Row label="Religion" value={p?.religion} />
        <Row label="Education" value={p?.educationalQualification} />
        <Row label={p?.isInternational ? 'Place' : 'Block · District · State'} value={region} />
        <Row label="City" value={p?.city} />
        <Row label="Registered on" value={shortDate(p?.registeredOn)} />
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>Membership & application</Text>
        <Row label="Member ID" value={mem?.memberNumber} />
        <Row label="Member type" value={words(mem?.memberType)} />
        <Row label="Membership" value={`${words(mem?.status)}${mem?.type && mem.type !== 'none' ? ` · ${words(mem.type)}` : ''}${mem?.tier === 'platinum' ? ' · Platinum' : ''}`} />
        <Row label="Member since" value={shortDate(mem?.activatedAt)} />
        <Row label="Valid until" value={lifetime ? 'Lifetime' : shortDate(mem?.expiresAt)} />
        <Row label="Last payment" value={mem?.lastPaymentAmount ? `${money(mem.lastPaymentAmount)}${mem?.lastPaymentDate ? ` · ${shortDate(mem.lastPaymentDate)}` : ''}` : ''} />
        {app ? (
          <>
            <Row label="Application" value={app?.reference} />
            <Row label="Application status" value={app?.status} />
            <Row label="Applied as" value={words(app?.memberType)} />
            <Row label="Submitted" value={shortDate(app?.submittedAt)} />
          </>
        ) : <Row label="Application" value="Not submitted yet" />}
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>Business</Text>
        {biz ? (
          <>
            <Row label="Doing business" value={yesNo(biz?.doingBusiness)} />
            <Row label="Registered as" value={words(biz?.registrationType)} />
            <Row label="Company" value={biz?.organizationName || r?.companyName} />
            <Row label="Constitution" value={biz?.constitutionType} />
            <Row label="Commencement year" value={biz?.commencementYear} />
            <Row label="Employees" value={biz?.numberOfEmployees ? String(biz.numberOfEmployees) : ''} />
            <Row label="Type of business" value={join(biz?.businessTypes)} />
            <Row label="Activities" value={join(biz?.businessActivities)} />
            <Row label="Other chamber" value={biz?.memberOfOtherChamber ? (biz?.otherChamber || 'Yes') : ''} />
            <Row label="Government registrations" value={join(biz?.govtOrganizations)} />
          </>
        ) : <Row label="Business details" value="Not filled in yet" />}
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>Declaration</Text>
        {decl ? (
          <>
            {trading ? <Row label="Sister concerns" value={String(decl?.sisterConcerns ?? '')} /> : null}
            <Row label="Declaration accepted" value={yesNo(decl?.agreed)} />
            {trading ? <Row label="Company names" value={join(decl?.companyNames)} /> : null}
          </>
        ) : <Row label="Declaration" value="Not filled in yet" />}
      </Card>

      {earlier.length ? (
        <Card style={s.card}>
          <Text style={s.cardTitle}>Earlier Platinum requests</Text>
          {earlier.map((h) => (
            <Row key={String(h?.id)} label={shortDate(h?.createdAt) || '—'} value={`${words(h?.status)}${h?.notes ? ` — ${h.notes}` : ''}`} />
          ))}
        </Card>
      ) : null}

      <Card style={s.card}>
        <Text style={s.cardTitle}>Office notes</Text>
        <Field value={notes} onChangeText={setNotes} multiline placeholder={open ? 'What was agreed on the call, or the reason if you decline (optional, for your records)' : 'Notes'} />
        <PrimaryButton tone="admin" variant="outline" icon="save" label="Save notes" onPress={saveNotes} disabled={busy} />
      </Card>

      {open ? (
        <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.xl, gap: SPACE.md }}>
          <PrimaryButton tone="admin" variant="gold" icon="diamond" label="Grant Platinum" onPress={grant} loading={busy} disabled={!!blockedReason} />
          {r?.status === 'new' ? <PrimaryButton tone="admin" icon="done" label="Mark contacted" onPress={() => setStatus('contacted')} disabled={busy} /> : null}
          <PrimaryButton tone="admin" variant="danger" icon="close" label="Decline" onPress={() => setStatus('declined')} disabled={busy} />
        </View>
      ) : null}
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  cardTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.text, marginBottom: SPACE.sm },
  body: { fontSize: 14, color: PALETTE.textSoft, lineHeight: 21 },
  small: { fontSize: 12, color: PALETTE.textMuted, flexShrink: 1 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusRow: { paddingHorizontal: SPACE.lg, marginTop: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: 8 },
  photo: { width: 80, height: 80, borderRadius: RADIUS.md, marginBottom: SPACE.sm, backgroundColor: PALETTE.border },
});

export default SuperPlatinumRequestScreen;
