import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Screen, AppHeader, Card, Field, Loading, ErrorState, EmptyState, Badge, SegmentedTabs, StatTile, StatGrid, PrimaryButton, InfoRow, Notice,
  PALETTE, SPACE, RADIUS, SHADOW,
} from '../../../ui';
import {
  listNotificationLogs, getDeliveryStatus, retryNotification, testSendNotification, getRoutingPreview, errorText,
} from '../../../services/superApi';
import { ChipRow, MiniAction, useRegionTreeAll, useRegionNames } from './superKit';
import { InlineSelect } from './events/eventKit';
import RegionInput from './components/RegionInput';

/**
 * ============================================================================
 * SUPER ADMIN — Notifications (website /super-admin/notifications)
 * ============================================================================
 *
 *   Log       GET /notifications/logs (channel / status / event / search) —
 *             every email / WhatsApp / in-app send, with health totals; a
 *             failed row can be sent again (POST /notifications/retry/:id).
 *   Delivery  GET /notifications/delivery-status — what is actually wired up
 *             (a deployment with no credentials looks like one that works);
 *             POST /notifications/test-send to watch one arrive.
 *   Routing   GET /notifications/routing-preview — which regional office a
 *             region's messages reply to (mobile extra; same backend route).
 *
 * MOCK IS ITS OWN COUNT, NOT A KIND OF SENT (website): a mocked row says
 * "sent" because nothing failed, but nothing left the server — "Not sent".
 */

type Tab = 'log' | 'delivery' | 'routing';

const CH_META: Record<string, { label: string; icon: string; fg: string; bg: string }> = {
  email: { label: 'Email', icon: 'email', fg: PALETTE.blueDark, bg: PALETTE.blueSoft },
  whatsapp: { label: 'WhatsApp', icon: 'chat', fg: '#047857', bg: PALETTE.greenSoft },
  in_app: { label: 'In-app', icon: 'notifications', fg: PALETTE.textSoft, bg: '#E2E8F0' },
};

/** The events a filter can name, in the order they happen to a member (website EVENTS). */
const EVENTS = [
  'ACCOUNT_REGISTERED', 'APPLICATION_SUBMITTED', 'ADMIN_NEW_APPLICATION', 'APPLICATION_ENDORSED',
  'CORRECTION_REQUESTED', 'APPLICATION_APPROVED', 'PAYMENT_REQUIRED', 'MEMBERSHIP_ACTIVATED',
  'MEMBERSHIP_RENEWAL_DUE',
  'EVENT_BOOKING_CONFIRMED', 'EVENT_BOOKING_WAITLISTED', 'EVENT_BOOKING_REMINDER', 'EVENT_BOOKING_CANCELLED',
  'EVENT_PARTICIPANT_CONFIRMED', 'EVENT_PARTICIPANT_REMINDER', 'EVENT_PARTICIPANT_CANCELLED',
  'EVENT_REGISTERED', 'EVENT_REMINDER',
  // Retired events, still on older log rows.
  'STAGE_CHANGED', 'PAYMENT_SUCCESS',
  'BOT_REPLY', 'CUSTOM',
];

const humanEvent = (value?: string) =>
  String(value || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const EVENT_LABELS = EVENTS.map(humanEvent);
const eventFromLabel = (label: string) => EVENTS[EVENT_LABELS.indexOf(label)] || '';

const when = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const PILL: Record<string, { label: string; fg: string; bg: string }> = {
  sent: { label: 'Delivered', fg: '#047857', bg: PALETTE.greenSoft },
  failed: { label: 'Failed', fg: '#B91C1C', bg: PALETTE.redSoft },
  queued: { label: 'Queued', fg: PALETTE.textSoft, bg: '#E2E8F0' },
  mock: { label: 'Not sent', fg: '#B45309', bg: PALETTE.amberSoft },
};

function LogRow({ l, busy, onRetry }: { l: any; busy: boolean; onRetry: () => void }) {
  const meta = CH_META[String(l?.channel)] || CH_META.in_app;
  // `mock` outranks `status`: the row says "sent" because nothing failed, but nothing was sent.
  const state = l?.mock ? 'mock' : String(l?.status || 'queued');
  const pill = PILL[state] || PILL.queued;
  return (
    <View style={[s.card, SHADOW.card]}>
      <View style={s.row}>
        <View style={[s.icon, { backgroundColor: meta.bg }]}><Icon name={meta.icon} size={18} color={meta.fg} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name}>{l?.subject || humanEvent(l?.event) || 'Notification'}</Text>
          <Text style={s.sub}>
            {humanEvent(l?.event)} · to <Text style={{ fontWeight: '700', color: PALETTE.textSoft }}>{l?.recipient || '—'}</Text>
            {l?.replyTo ? ` · reply-to ${l.replyTo}` : ''}
          </Text>
          {/* The provider's own words — the only place the reason a message failed is visible. */}
          {l?.lastError ? <Text style={s.err}>{String(l.lastError)}</Text> : null}
        </View>
      </View>
      <View style={s.foot}>
        <Text style={s.when}>{when(l?.createdAt)}</Text>
        <Badge label={pill.label} color={pill.fg} bg={pill.bg} />
        <View style={{ flex: 1 }} />
        {state === 'failed' && String(l?.channel) !== 'in_app' ? (
          <MiniAction icon="replay" label={busy ? 'Sending…' : 'Send again'} onPress={onRetry} disabled={busy} />
        ) : null}
      </View>
    </View>
  );
}

/** The configuration banner — FIRST, because it answers "why is nobody getting emails". */
function ConfigBanner({ st }: { st: any }) {
  if (!st) return null;
  const emailOff = !st?.email?.configured;
  const waOff = !st?.whatsapp?.configured;
  if (!emailOff && !waOff) return null;
  const head = emailOff && waOff ? 'Neither email nor WhatsApp is configured.' : emailOff ? 'Email is not configured.' : 'WhatsApp is not configured.';
  const keys = [emailOff ? 'EMAIL_USER and EMAIL_PASS' : '', waOff ? 'BOTBEE_API_TOKEN and BOTBEE_PHONE_NUMBER_ID' : ''].filter(Boolean).join(', ');
  return (
    <Notice kind="warning" icon="warning-amber"
      text={`${head} Messages on ${emailOff && waOff ? 'those channels' : 'that channel'} are recorded as "not sent" and nothing leaves the server. Add ${keys} to backend/.env and restart.`} />
  );
}

function ChannelCard({ icon, title, configured, rows, note, noteIcon }: {
  icon: string; title: string; configured: boolean; rows: [string, string][]; note?: string; noteIcon?: string;
}) {
  return (
    <Card style={s.block}>
      <View style={s.headRow}>
        <View style={[s.icon, { backgroundColor: PALETTE.blueSoft }]}><Icon name={icon} size={18} color={PALETTE.blueDark} /></View>
        <Text style={s.blockTitle}>{title}</Text>
        <Badge label={configured ? 'Configured' : 'Not configured'} status={configured ? 'active' : 'pending'} />
      </View>
      {rows.map(([label, value], i) => <InfoRow key={label} label={label} value={value} last={i === rows.length - 1 && !note} />)}
      {note ? (
        <View style={s.note}>
          <Icon name={noteIcon || 'info-outline'} size={15} color={PALETTE.textFaint} style={{ marginTop: 1 }} />
          <Text style={s.noteText}>{note}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function DeliveryTab({ st, error, onReload }: { st: any; error: string; onReload: () => void }) {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const target = (to || '').trim();
    if (!target) { Alert.alert('Recipient', channel === 'email' ? 'Enter an email address' : 'Enter a phone number'); return; }
    setSending(true);
    try {
      const r = await testSendNotification(channel, target);
      if (r?.mock) Alert.alert('Nothing was sent', 'That channel has no credentials configured.');
      else if (r?.success) Alert.alert('Sent', 'Check the inbox or handset.');
      else Alert.alert('Send failed', String(r?.error || 'Send failed'));
      onReload();
    } catch (err) { Alert.alert('Test send failed', errorText(err)); } finally { setSending(false); }
  };

  if (error && !st) return <ErrorState tone="admin" message={error} onRetry={onReload} />;
  if (!st) return <Loading tone="admin" />;
  const em = st?.email || {};
  const wa = st?.whatsapp || {};
  return (
    <View>
      <ConfigBanner st={st} />
      <ChannelCard icon="email" title="Email" configured={!!em?.configured}
        rows={[
          ['Host', String(em?.host || '—')],
          ['Account', String(em?.user || '—')],
          ['From address', String(em?.from || '—')],
          ['Regional From', em?.regionalFrom ? 'On' : 'Off — region is in the display name'],
          ['Fallback Reply-To', String(em?.supportAddress || '—')],
        ]}
        note="Application emails are sent from the verified address with the applicant's region in the display name, and Reply-To set to their own Block, District or State admin's registered address." />
      <ChannelCard icon="chat" title="WhatsApp (BotBee)" configured={!!wa?.configured}
        rows={[
          ['Base URL', String(wa?.baseUrl || '—')],
          ['Template endpoint', String(wa?.templateEndpoint || '—')],
          ['Auth style', String(wa?.authStyle || '—')],
          ['Webhook secret', wa?.webhookConfigured ? 'Set' : 'Not set — inbound bot disabled'],
        ]}
        note={wa?.webhookUrl ? `Register this webhook URL on BotBee: ${wa.webhookUrl}` : undefined} noteIcon="webhook" />
      <Card style={s.block}>
        <Text style={s.blockTitle}>Send a test message</Text>
        <Text style={s.hint}>The difference between "the credentials are saved" and "it arrives".</Text>
        <View style={{ marginHorizontal: -SPACE.lg, marginBottom: SPACE.md }}>
          <ChipRow<'email' | 'whatsapp'> options={[{ value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]} value={channel} onChange={setChannel} />
        </View>
        <Field value={to} onChangeText={setTo} placeholder={channel === 'email' ? 'you@example.com' : '9876543210'}
          keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'} autoCapitalize="none" icon={channel === 'email' ? 'alternate-email' : 'phone'} />
        <PrimaryButton tone="admin" icon="send" label="Send test" onPress={send} loading={sending} />
      </Card>
    </View>
  );
}

function RoutingTab() {
  const tree = useRegionTreeAll();
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const names = useRegionNames(tree, state, district);
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    try { setOut(await getRoutingPreview({ state, district, block })); } catch (err) { Alert.alert('Could not check', errorText(err)); } finally { setBusy(false); }
  };
  const rows = out && typeof out === 'object' ? Object.entries(out).filter(([, v]) => v !== null && typeof v !== 'object') : [];
  return (
    <View>
      <Card style={s.block}>
        <Text style={s.blockTitle}>Which office answers a region?</Text>
        <Text style={s.hint}>Messages to members reply to their District or State office (block mailboxes are placeholders), falling back to the ACTIV office.</Text>
        <RegionInput label="State" value={state} inUse={names.states} onChange={(v: string) => { setState(v); setDistrict(''); setBlock(''); }} />
        {state ? <RegionInput label="District" value={district} inUse={names.districts} onChange={(v: string) => { setDistrict(v); setBlock(''); }} /> : null}
        {state && district ? <RegionInput label="Block" value={block} inUse={names.blocks} onChange={setBlock} /> : null}
        <PrimaryButton tone="admin" icon="alt-route" label="Check routing" onPress={check} loading={busy} />
      </Card>
      {out ? (
        <Card style={s.block}>
          {rows.length === 0 ? <Text style={s.sub}>No contact found.</Text> : rows.map(([k, v], i) => (
            <InfoRow key={k} label={k.replace(/([A-Z])/g, ' $1')} value={String(v)} last={i === rows.length - 1} />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const SuperNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('log');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [event, setEvent] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [delivery, setDelivery] = useState<any>(null);
  const [deliveryError, setDeliveryError] = useState('');

  /*
   * The configuration banner and the log are two independent questions (the
   * website's `allSettled`): an empty or failed log must not hide the banner
   * that explains why it is empty.
   */
  const loadDelivery = useCallback(async () => {
    setDeliveryError('');
    try { setDelivery(await getDeliveryStatus()); } catch (err) { setDeliveryError(errorText(err)); }
  }, []);
  useEffect(() => { loadDelivery(); }, [loadDelivery]);

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    const term = (search || '').trim();
    try {
      const d = await listNotificationLogs({
        page: p, limit: 30, status, channel, event,
        // Only a real query is sent — one character matches half the log.
        search: term.length >= 2 ? term : '',
      });
      setData((prev: any) => (p > 1 && prev ? { ...d, logs: [...(prev.logs || []), ...(d?.logs || [])] } : d));
      setPage(p);
    } catch (err) { setError(errorText(err)); } finally { setLoading(false); setRefreshing(false); }
  }, [status, channel, event, search]);
  useEffect(() => {
    if (tab !== 'log') return undefined;
    // Debounced, so typing into the recipient box does not fire a request per keystroke.
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [load, tab]);

  const refresh = () => { setRefreshing(true); loadDelivery(); load(1); };

  const retry = async (l: any) => {
    const id = String(l?._id || l?.id || '');
    if (!id) return;
    setBusyId(id);
    try {
      const row = await retryNotification(id);
      Alert.alert(row?.status === 'sent' ? 'Re-sent' : 'Still failing', row?.status === 'sent' ? 'The message went out.' : String(row?.lastError || 'unknown error'));
      load(1);
    } catch (err) { Alert.alert('Could not re-send that message', errorText(err)); } finally { setBusyId(''); }
  };

  const h = data?.health || {};
  const pages = Number(data?.pagination?.pages || 1);
  const header = (
    <View>
      <AppHeader tone="admin" title="Notifications" subtitle="Every email and WhatsApp message, and whether it arrived" onBack={() => navigation.goBack()} />
      <SegmentedTabs<Tab> tone="admin" value={tab} onChange={setTab}
        options={[{ value: 'log', label: 'Log' }, { value: 'delivery', label: 'Delivery' }, { value: 'routing', label: 'Routing' }]} />
      {tab === 'log' ? (
        <View>
          <ConfigBanner st={delivery} />
          <View style={{ height: SPACE.md }} />
          <StatGrid>
            <StatTile label="Delivered" hint="reached the recipient" value={Number(h?.sent || 0)} icon="check-circle" color={PALETTE.green} soft={PALETTE.greenSoft} onPress={() => setStatus('sent')} />
            <StatTile label="Failed" hint="the provider refused it" value={Number(h?.failed || 0)} icon="cancel" color={PALETTE.red} soft={PALETTE.redSoft} onPress={() => setStatus('failed')} />
            <StatTile label="Not sent" hint="no credentials configured" value={Number(h?.mock || 0)} icon="warning-amber" color={PALETTE.amber} soft={PALETTE.amberSoft} />
            <StatTile label="Total attempts" hint="however it ended" value={Number(h?.total || 0)} icon="send" color={PALETTE.textSoft} soft="#E2E8F0" onPress={() => setStatus('')} />
          </StatGrid>
          <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
            <Field icon="search" placeholder="Filter by email or phone number" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
          </View>
          <ChipRow<string> options={[{ value: '', label: 'Every status' }, { value: 'sent', label: 'Delivered' }, { value: 'failed', label: 'Failed' }, { value: 'queued', label: 'Queued' }]} value={status} onChange={setStatus} />
          <ChipRow<string> options={[{ value: '', label: 'Every channel' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'in_app', label: 'In-app' }]} value={channel} onChange={setChannel} />
          <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
            <InlineSelect value={event ? humanEvent(event) : ''} options={EVENT_LABELS} placeholder="Every event" emptyLabel="Every event"
              onChange={(label) => setEvent(label ? eventFromLabel(label) : '')} />
          </View>
        </View>
      ) : null}
    </View>
  );

  if (tab !== 'log') {
    return (
      <Screen tone="admin">
        {header}
        {tab === 'delivery' ? <DeliveryTab st={delivery} error={deliveryError} onReload={loadDelivery} /> : <RoutingTab />}
      </Screen>
    );
  }

  const logs = Array.isArray(data?.logs) ? data.logs : [];
  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={logs}
        keyExtractor={(l, i) => String(l?._id || l?.id || i)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={loading ? <Loading tone="admin" /> : error
          ? <ErrorState tone="admin" message={`The delivery log could not be loaded. ${error}`} onRetry={() => load(1)} />
          : <EmptyState tone="admin" icon="notifications-none" title="Nothing has been sent yet." />}
        ListFooterComponent={!loading && logs.length > 0 && page < pages ? (
          <TouchableOpacity style={s.more} onPress={() => load(page + 1)}><Text style={s.moreText}>Load more</Text></TouchableOpacity>
        ) : null}
        renderItem={({ item }) => <LogRow l={item} busy={busyId === String(item?._id || item?.id)} onRetry={() => retry(item)} />}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 2, lineHeight: 17 },
  err: { fontSize: 12, color: PALETTE.red, marginTop: SPACE.sm, lineHeight: 17 },
  foot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md, paddingLeft: 36 + SPACE.md },
  when: { fontSize: 11, color: PALETTE.textFaint },
  block: { marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACE.sm },
  blockTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: PALETTE.text, marginBottom: 4 },
  hint: { fontSize: 12, color: PALETTE.textMuted, lineHeight: 17, marginBottom: SPACE.md },
  note: { flexDirection: 'row', gap: 6, marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: PALETTE.border },
  noteText: { flex: 1, fontSize: 12, color: PALETTE.textMuted, lineHeight: 17 },
  more: { alignSelf: 'center', marginTop: SPACE.sm, paddingHorizontal: 20, minHeight: 42, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1, borderColor: PALETTE.indigo },
  moreText: { color: PALETTE.indigo, fontWeight: '800' },
});

export default SuperNotificationsScreen;
