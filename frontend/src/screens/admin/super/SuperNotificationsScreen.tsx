import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PALETTE, SPACE, TYPE,
  ConsoleFrame, ConsoleHeader, ConsoleGrid, ConsoleStatTile, ConsoleCard, ConsoleChip, ConsoleTabs, ConsoleSearch,
  ConsoleSkeleton, ConsoleState, ConsoleNote, ConsoleButton, ConsoleSectionTitle, GlassIconButton, PremiumInput, CONSOLE_LIST,
} from '../../../ui';
import {
  listNotificationLogs, getDeliveryStatus, retryNotification, testSendNotification, getRoutingPreview, errorText,
} from '../../../services/superApi';
import { ChipRow, MiniAction, useRegionTreeAll, useRegionNames } from './superKit';
import { InlineSelect } from './events/eventKit';
import RegionInput from './components/RegionInput';
import { AutomationPane } from './delivery/AutomationPane';
import { canResend, channelColor, channelIcon } from './delivery/deliveryKit';

/**
 * ============================================================================
 * SUPER ADMIN — Notifications (website /super-admin/notifications)
 * ============================================================================
 *
 *   Automation  (default, website NotificationsAutomation) — every automated
 *               email / WhatsApp message and where it got to: accepted,
 *               delivered, read or failed and why; filters by event, message
 *               type, channel, status, dates and search; resend. See
 *               delivery/AutomationPane.tsx.
 *   Log         GET /notifications/logs (channel / status / event / search) —
 *               the raw record with health totals; a failed row can be sent
 *               again (POST /notifications/retry/:id).
 *   Delivery    GET /notifications/delivery-status — what is actually wired up
 *               (a deployment with no credentials looks like one that works);
 *               POST /notifications/test-send to watch one arrive.
 *   Routing     GET /notifications/routing-preview — which regional office a
 *               region's messages reply to (same backend route).
 *
 * The configuration banner shows on every view, FIRST: it is the answer to
 * "why is nobody getting emails".
 *
 * MOCK IS ITS OWN COUNT, NOT A KIND OF SENT (website): a mocked row says
 * "sent" because nothing failed, but nothing left the server — "Not sent".
 */

type View4 = 'automation' | 'log' | 'delivery' | 'routing';

/** The events a filter can name, in the order they happen to a member (website EVENTS). */
const EVENTS = [
  'ACCOUNT_REGISTERED', 'APPLICATION_SUBMITTED', 'ADMIN_NEW_APPLICATION', 'APPLICATION_ENDORSED',
  'CORRECTION_REQUESTED', 'APPLICATION_APPROVED', 'PAYMENT_REQUIRED', 'MEMBERSHIP_ACTIVATED',
  'MEMBERSHIP_RENEWAL_DUE',
  'EVENT_BOOKING_CONFIRMED', 'EVENT_BOOKING_WAITLISTED', 'EVENT_BOOKING_REMINDER', 'EVENT_BOOKING_CANCELLED',
  'EVENT_PARTICIPANT_CONFIRMED', 'EVENT_PARTICIPANT_REMINDER', 'EVENT_PARTICIPANT_CANCELLED',
  'EVENT_REGISTERED', 'EVENT_REMINDER',
  'EVENT_DOCUMENT_CONFIRMED', 'EVENT_DOCUMENT_REMINDER',
  'PLATINUM_REQUESTED', 'ADMIN_PLATINUM_REQUEST',
  'PASSWORD_RESET', 'ADMIN_WELCOME', 'DONATION_RECEIPT', 'DONATION_STATEMENT',
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

/** The raw log's words (website StatePill): `sent` reads "Delivered" there. */
const PILL: Record<string, { label: string; kind: 'approved' | 'rejected' | 'neutral' | 'warning' }> = {
  sent: { label: 'Delivered', kind: 'approved' },
  failed: { label: 'Failed', kind: 'rejected' },
  queued: { label: 'Queued', kind: 'neutral' },
  mock: { label: 'Not sent', kind: 'warning' },
};

function LogRow({ l, busy, onRetry }: { l: any; busy: boolean; onRetry: () => void }) {
  const ch = String(l?.channel || 'in_app');
  // `mock` outranks `status`: the row says "sent" because nothing failed, but nothing was sent.
  const state = l?.mock ? 'mock' : String(l?.status || 'queued');
  const pill = PILL[state] || PILL.queued;
  return (
    <ConsoleCard style={s.card} accent={state === 'failed' ? PALETTE.red : undefined}>
      <View style={s.row}>
        <View style={[s.chan, { backgroundColor: ch === 'whatsapp' ? PALETTE.greenSoft : ch === 'email' ? PALETTE.blueSoft : PALETTE.divider }]}>
          <Icon name={channelIcon(ch)} size={18} color={channelColor(ch)} />
        </View>
        <View style={s.flexText}>
          <Text style={s.name} maxFontSizeMultiplier={1.3}>{l?.subject || humanEvent(l?.event) || 'Notification'}</Text>
          <Text style={s.sub} maxFontSizeMultiplier={1.3}>
            {humanEvent(l?.event)} · to <Text style={s.strong}>{l?.recipient || '—'}</Text>
            {l?.replyTo ? ` · reply-to ${l.replyTo}` : ''}
          </Text>
          {/* The provider's own words — the only place the reason a message failed is visible. */}
          {l?.lastError ? <Text style={s.err} maxFontSizeMultiplier={1.3}>{String(l.lastError)}</Text> : null}
        </View>
      </View>
      <View style={s.foot}>
        <Text style={s.when} maxFontSizeMultiplier={1.3}>{when(l?.createdAt)}</Text>
        <ConsoleChip label={pill.label} kind={pill.kind} />
        <View style={s.flex} />
        {state === 'failed' && ch !== 'in_app' && canResend(l) ? (
          <MiniAction icon="replay" label={busy ? 'Sending…' : 'Send again'} onPress={onRetry} disabled={busy} />
        ) : null}
      </View>
    </ConsoleCard>
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
    <ConsoleNote
      kind="amber"
      icon="warning-amber"
      style={s.banner}
      text={`${head} Messages on ${emailOff && waOff ? 'those channels' : 'that channel'} are recorded as "not sent" and nothing leaves the server. Add ${keys} to backend/.env and restart.`}
    />
  );
}

function InfoLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.info, !last && s.infoDivider]}>
      <Text style={s.infoLabel} maxFontSizeMultiplier={1.3}>{label}</Text>
      <Text style={s.infoValue} selectable maxFontSizeMultiplier={1.3}>{value || '—'}</Text>
    </View>
  );
}

function ChannelCard({ channel, title, configured, rows, note, noteIcon }: {
  channel: 'email' | 'whatsapp'; title: string; configured: boolean; rows: [string, string][]; note?: string; noteIcon?: string;
}) {
  return (
    <ConsoleCard style={s.card}>
      <View style={s.headRow}>
        <View style={[s.chan, { backgroundColor: channel === 'whatsapp' ? PALETTE.greenSoft : PALETTE.blueSoft }]}>
          <Icon name={channelIcon(channel)} size={18} color={channelColor(channel)} />
        </View>
        <Text style={s.blockTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{title}</Text>
        <ConsoleChip label={configured ? 'Configured' : 'Not configured'} kind={configured ? 'approved' : 'pending'} />
      </View>
      {rows.map(([label, value], i) => <InfoLine key={label} label={label} value={value} last={i === rows.length - 1 && !note} />)}
      {note ? (
        <View style={s.note}>
          <Icon name={noteIcon || 'info-outline'} size={15} color={PALETTE.textFaint} style={s.noteIcon} />
          <Text style={s.noteText} selectable maxFontSizeMultiplier={1.3}>{note}</Text>
        </View>
      ) : null}
    </ConsoleCard>
  );
}

function DeliveryView({ st, error, onReload }: { st: any; error: string; onReload: () => void }) {
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

  if (error && !st) return <ConsoleState kind="error" title="Could not load the configuration" message={error} action="Try again" onAction={onReload} />;
  if (!st) return <ConsoleSkeleton rows={2} />;
  const em = st?.email || {};
  const wa = st?.whatsapp || {};
  return (
    <View>
      <ChannelCard channel="email" title="Email" configured={!!em?.configured}
        rows={[
          ['Host', String(em?.host || '—')],
          ['Account', String(em?.user || '—')],
          ['From address', String(em?.from || '—')],
          ['Regional From', em?.regionalFrom ? 'On' : 'Off — region is in the display name'],
          ['Fallback Reply-To', String(em?.supportAddress || '—')],
        ]}
        note="Application emails are sent from the verified address with the applicant's region in the display name, and Reply-To set to their own Block, District or State admin's registered address." />
      <ChannelCard channel="whatsapp" title="WhatsApp (BotBee)" configured={!!wa?.configured}
        rows={[
          ['Base URL', String(wa?.baseUrl || '—')],
          ['Template endpoint', String(wa?.templateEndpoint || '—')],
          ['Auth style', String(wa?.authStyle || '—')],
          ['Webhook secret', wa?.webhookConfigured ? 'Set' : 'Not set — inbound bot disabled'],
        ]}
        note={wa?.webhookUrl ? `Register this webhook URL on BotBee: ${wa.webhookUrl}` : undefined} noteIcon="webhook" />
      <ConsoleCard style={s.card}>
        <Text style={s.blockTitle} maxFontSizeMultiplier={1.3}>Send a test message</Text>
        <Text style={s.hint} maxFontSizeMultiplier={1.3}>The difference between "the credentials are saved" and "it arrives".</Text>
        <View style={s.pullOut}>
          <ChipRow<'email' | 'whatsapp'> options={[{ value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]} value={channel} onChange={setChannel} />
        </View>
        <PremiumInput tone="admin" value={to} onChangeText={setTo} placeholder={channel === 'email' ? 'you@example.com' : '9876543210'}
          keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'} autoCapitalize="none" icon={channel === 'email' ? 'alternate-email' : 'phone'}
          accessibilityLabel="Test recipient" />
        <ConsoleButton icon="send" label="Send test" onPress={send} loading={sending} />
      </ConsoleCard>
    </View>
  );
}

function RoutingView() {
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
      <ConsoleCard style={s.card}>
        <Text style={s.blockTitle} maxFontSizeMultiplier={1.3}>Which office answers a region?</Text>
        <Text style={s.hint} maxFontSizeMultiplier={1.3}>Messages to members reply to their District or State office (block mailboxes are placeholders), falling back to the ACTIV office.</Text>
        <RegionInput label="State" value={state} inUse={names.states} onChange={(v: string) => { setState(v); setDistrict(''); setBlock(''); }} />
        {state ? <RegionInput label="District" value={district} inUse={names.districts} onChange={(v: string) => { setDistrict(v); setBlock(''); }} /> : null}
        {state && district ? <RegionInput label="Block" value={block} inUse={names.blocks} onChange={setBlock} /> : null}
        <ConsoleButton icon="alt-route" label="Check routing" onPress={check} loading={busy} />
      </ConsoleCard>
      {out ? (
        <ConsoleCard style={s.card}>
          {rows.length === 0 ? <Text style={s.sub} maxFontSizeMultiplier={1.3}>No contact found.</Text> : rows.map(([k, v], i) => (
            <InfoLine key={k} label={k.replace(/([A-Z])/g, ' $1')} value={String(v)} last={i === rows.length - 1} />
          ))}
        </ConsoleCard>
      ) : null}
    </View>
  );
}

const SuperNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initial = String(route?.params?.view || '') as View4;
  const [view, setView] = useState<View4>(['automation', 'log', 'delivery', 'routing'].includes(initial) ? initial : 'automation');
  const [automationNonce, setAutomationNonce] = useState(0);

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
  const seq = useRef(0);

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
    const mine = ++seq.current;
    setLoading(true); setError('');
    const term = (search || '').trim();
    try {
      const d = await listNotificationLogs({
        page: p, limit: 30, status, channel, event,
        // Only a real query is sent — one character matches half the log.
        search: term.length >= 2 ? term : '',
      });
      if (mine !== seq.current) return;
      setData((prev: any) => (p > 1 && prev ? { ...d, logs: [...(prev.logs || []), ...(d?.logs || [])] } : d));
      setPage(p);
    } catch (err) { if (mine === seq.current) setError(errorText(err)); } finally {
      if (mine === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [status, channel, event, search]);
  useEffect(() => {
    if (view !== 'log') return undefined;
    // Debounced, so typing into the recipient box does not fire a request per keystroke.
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [load, view]);

  const refreshAll = () => {
    loadDelivery();
    if (view === 'automation') setAutomationNonce((n) => n + 1);
    else if (view === 'log') { setRefreshing(true); load(1); }
  };

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

  const top = (
    <>
      <ConsoleHeader
        compact
        eyebrow="Super Admin · messages"
        title="Notifications"
        subtitle="Every email and WhatsApp message the platform has attempted, and whether it arrived"
        left={<GlassIconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => navigation?.goBack?.()} />}
        right={<GlassIconButton icon="refresh" accessibilityLabel="Refresh" onPress={refreshAll} />}
      />
      <ConsoleTabs<View4>
        value={view}
        onChange={setView}
        style={s.tabs}
        options={[
          { value: 'automation', label: 'Automation' }, { value: 'log', label: 'Log' },
          { value: 'delivery', label: 'Setup' }, { value: 'routing', label: 'Routing' },
        ]}
      />
      <ConfigBanner st={delivery} />
    </>
  );

  if (view === 'automation') {
    return (
      <ConsoleFrame>
        <AutomationPane header={top} refreshKey={automationNonce} />
      </ConsoleFrame>
    );
  }

  if (view === 'delivery' || view === 'routing') {
    return (
      <ConsoleFrame avoidKeyboard>
        <ScrollView
          contentContainerStyle={CONSOLE_LIST}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={view === 'delivery' ? <RefreshControl refreshing={false} onRefresh={loadDelivery} tintColor={PALETTE.indigo} /> : undefined}
        >
          {top}
          {view === 'delivery' ? <DeliveryView st={delivery} error={deliveryError} onReload={loadDelivery} /> : <RoutingView />}
        </ScrollView>
      </ConsoleFrame>
    );
  }

  const h = data?.health || {};
  const pages = Number(data?.pagination?.pages || 1);
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const header = (
    <>
      {top}
      <ConsoleGrid style={s.grid}>
        <ConsoleStatTile label="Delivered" hint="reached the recipient" value={Number(h?.sent || 0)} icon="check-circle" accent="green"
          selected={status === 'sent'} onPress={() => setStatus(status === 'sent' ? '' : 'sent')} />
        <ConsoleStatTile label="Failed" hint="the provider refused it" value={Number(h?.failed || 0)} icon="cancel" accent="red"
          selected={status === 'failed'} onPress={() => setStatus(status === 'failed' ? '' : 'failed')} delay={60} />
        <ConsoleStatTile label="Not sent" hint="no credentials configured" value={Number(h?.mock || 0)} icon="warning-amber" accent="amber" delay={120} />
        <ConsoleStatTile label="Total attempts" hint="however it ended" value={Number(h?.total || 0)} icon="send" accent="slate"
          onPress={() => setStatus('')} delay={180} />
      </ConsoleGrid>
      <ConsoleSectionTitle title="Filters" icon="tune" />
      <ConsoleSearch value={search} onChangeText={setSearch} placeholder="Filter by email or phone number" />
      <ChipRow<string> options={[{ value: '', label: 'Every status' }, { value: 'sent', label: 'Delivered' }, { value: 'failed', label: 'Failed' }, { value: 'queued', label: 'Queued' }]} value={status} onChange={setStatus} />
      <ChipRow<string> options={[{ value: '', label: 'Every channel' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'in_app', label: 'In-app' }]} value={channel} onChange={setChannel} />
      <View style={s.select}>
        <InlineSelect value={event ? humanEvent(event) : ''} options={EVENT_LABELS} placeholder="Every event" emptyLabel="Every event"
          onChange={(label) => setEvent(label ? eventFromLabel(label) : '')} />
      </View>
      {loading && !logs.length ? <ConsoleSkeleton rows={3} /> : null}
      {error && logs.length ? <ConsoleNote style={s.banner} kind="red" icon="error-outline" text={error} /> : null}
    </>
  );

  return (
    <ConsoleFrame>
      <FlatList
        data={logs}
        keyExtractor={(l, i) => String(l?._id || l?.id || i)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        contentContainerStyle={CONSOLE_LIST}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={PALETTE.indigo} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : error
          ? <ConsoleState kind="error" title="Could not load the delivery log" message={error} action="Try again" onAction={() => load(1)} />
          : <ConsoleState title="Nothing has been sent yet." message="Every email, WhatsApp and in-app message is recorded here." />}
        ListFooterComponent={!loading && logs.length > 0 && page < pages ? (
          <ConsoleButton kind="soft" icon="expand-more" label="Load more" onPress={() => load(page + 1)} style={s.more} />
        ) : null}
        renderItem={({ item }) => <LogRow l={item} busy={busyId === String(item?._id || item?.id)} onRetry={() => retry(item)} />}
      />
    </ConsoleFrame>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  flexText: { flex: 1, minWidth: 0 },
  tabs: { marginTop: -SPACE.lg, marginBottom: SPACE.sm },
  banner: { marginHorizontal: SPACE.lg, marginTop: SPACE.sm, marginBottom: SPACE.sm },
  grid: { marginTop: SPACE.sm },
  select: { paddingHorizontal: SPACE.lg, marginTop: SPACE.md },
  card: { marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  chan: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPE.subheading, fontWeight: '800' },
  sub: { ...TYPE.caption, marginTop: 2, lineHeight: 17 },
  strong: { fontWeight: '700', color: PALETTE.textSoft },
  err: { fontSize: 12, color: PALETTE.red, marginTop: SPACE.sm, lineHeight: 17 },
  foot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  when: { fontSize: 11, color: PALETTE.textFaint },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  blockTitle: { flex: 1, minWidth: 0, ...TYPE.subheading, fontWeight: '800', marginBottom: 4 },
  hint: { ...TYPE.caption, lineHeight: 17, marginBottom: SPACE.md },
  pullOut: { marginHorizontal: -SPACE.lg, marginTop: -SPACE.sm, marginBottom: SPACE.md },
  info: { paddingVertical: SPACE.sm },
  infoDivider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: PALETTE.divider },
  infoLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: PALETTE.textFaint, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: PALETTE.text, marginTop: 2 },
  note: { flexDirection: 'row', gap: 6, marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: PALETTE.divider },
  noteIcon: { marginTop: 1 },
  noteText: { flex: 1, minWidth: 0, fontSize: 12, color: PALETTE.textMuted, lineHeight: 17 },
  more: { alignSelf: 'center', marginTop: SPACE.sm },
});

export default SuperNotificationsScreen;
