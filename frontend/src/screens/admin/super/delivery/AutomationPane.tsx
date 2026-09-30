import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PALETTE, SPACE, TYPE,
  ConsoleCard, ConsoleSkeleton, ConsoleState, ConsoleNote, ConsoleSearch, ConsoleButton, ConsoleSectionTitle, CONSOLE_LIST,
} from '../../../../ui';
import {
  getAutomationLogs, EMPTY_AUTOMATION, type AutomationPage, type DeliveryCounts, type DeliveryLogRow,
} from '../../../../services/notificationDeliveryApi';
import { errorText } from '../../../../services/superApi';
import { ChipRow } from '../superKit';
import { InlineSelect, DateField } from '../events/eventKit';
import {
  DeliveryBadge, DeliveryDetail, ResendButton, MESSAGE_TYPES, STATE_META,
  channelColor, channelIcon, channelWord, messageLabel, reasonOf, stateOf, whenLabel,
} from './deliveryKit';

/**
 * ============================================================================
 * NOTIFICATIONS → AUTOMATION (website NotificationsAutomation.tsx)
 * ============================================================================
 *
 * Every message the platform sent on its own — booking confirmations,
 * reminders, documents, cancellations, membership messages — and where each
 * one got to: accepted by the provider, delivered, read, or failed and why.
 *
 *   GET  /notifications/logs?group=automation&page&limit=25&eventId&channel
 *        &delivery&event&from&to&search    (search only at ≥ 2 characters)
 *   POST /notifications/retry/:id          Resend, confirmed inline
 *
 * The counts are for the FILTERED set, so narrowing to one event answers "how
 * many of this event's confirmations failed". Any filter change returns to
 * page one; requests are debounced 300 ms. Tap a message for its full detail
 * (template, provider id, timeline, reason) — expanded in place, no Modal.
 */

const PAGE_SIZE = 25;

const TYPE_LABELS = MESSAGE_TYPES.map(([, l]) => l);
const typeFromLabel = (label: string) => (MESSAGE_TYPES.find(([, l]) => l === label) || [''])[0];

function ChannelCounts({ channel, counts }: { channel: 'email' | 'whatsapp'; counts: DeliveryCounts }) {
  const email = channel === 'email';
  const cells: [string, string, string, string][] = [
    ['Accepted', String(Number(counts?.accepted || 0) + Number(counts?.sent || 0)), email ? 'the mail server took it' : 'Meta took it, no report yet', PALETTE.blueDark],
    ['Delivered', email ? 'n/a' : String(Number(counts?.delivered || 0)), email ? 'email has no receipts' : 'reached the phone', PALETTE.greenDark],
    ['Read', email ? 'n/a' : String(Number(counts?.read || 0)), email ? 'email has no receipts' : 'opened', PALETTE.greenDark],
    ['Failed', String(Number(counts?.failed || 0)), 'refused or undeliverable', PALETTE.redDark],
    ['Not sent', String(Number(counts?.mock || 0)), 'no provider configured', PALETTE.textSoft],
  ];
  return (
    <ConsoleCard style={s.card}>
      <View style={s.countHead}>
        <View style={[s.chan, { backgroundColor: email ? PALETTE.blueSoft : PALETTE.greenSoft }]}>
          <Icon name={channelIcon(channel)} size={18} color={channelColor(channel)} />
        </View>
        <Text style={s.countTitle} maxFontSizeMultiplier={1.3}>{email ? 'Email' : 'WhatsApp'}</Text>
        <Text style={s.countTotal} maxFontSizeMultiplier={1.3}>{Number(counts?.total || 0)} messages</Text>
      </View>
      <View style={s.cells}>
        {cells.map(([label, value, hint, color]) => (
          <View key={label} style={s.cell} accessible accessibilityLabel={`${email ? 'Email' : 'WhatsApp'} ${label}: ${value}, ${hint}`}>
            <Text style={s.cellLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label.toUpperCase()}</Text>
            <Text style={[s.cellValue, { color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>{value}</Text>
            <Text style={s.cellHint} numberOfLines={2} maxFontSizeMultiplier={1.2}>{hint}</Text>
          </View>
        ))}
      </View>
    </ConsoleCard>
  );
}

function MessageCard({ row, open, onToggle, onChanged }: { row: DeliveryLogRow; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const state = stateOf(row);
  const reason = reasonOf(row);
  return (
    <ConsoleCard
      style={s.card}
      accent={state === 'failed' ? PALETTE.red : undefined}
      onPress={onToggle}
      accessibilityLabel={`${messageLabel(row?.event)} to ${row?.recipientName || row?.recipient || 'unknown'}, ${channelWord(row?.channel)}, ${(STATE_META[state] || STATE_META.queued).label}`}
    >
      <View style={s.row}>
        <View style={[s.chan, { backgroundColor: row?.channel === 'whatsapp' ? PALETTE.greenSoft : PALETTE.blueSoft }]}>
          <Icon name={channelIcon(row?.channel)} size={18} color={channelColor(row?.channel)} />
        </View>
        <View style={s.flexText}>
          <Text style={s.title} numberOfLines={2} maxFontSizeMultiplier={1.3}>{row?.recipientName || row?.recipient || '—'}</Text>
          {row?.recipientName && row?.recipient ? <Text style={s.sub} numberOfLines={1} maxFontSizeMultiplier={1.3}>{row.recipient}</Text> : null}
          <Text style={s.msg} numberOfLines={2} maxFontSizeMultiplier={1.3}>{messageLabel(row?.event)}</Text>
        </View>
        <DeliveryBadge state={state} />
      </View>
      <View style={s.metaRow}>
        {row?.eventTitle ? (
          <View style={s.meta}>
            <Icon name="event" size={14} color={PALETTE.textMuted} />
            <Text style={s.metaText} numberOfLines={1} maxFontSizeMultiplier={1.3}>{row.eventTitle}</Text>
          </View>
        ) : null}
        {row?.bookingRef ? (
          <View style={s.meta}>
            <Icon name="confirmation-number" size={14} color={PALETTE.textMuted} />
            <Text style={[s.metaText, s.mono]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{row.bookingRef}</Text>
          </View>
        ) : null}
        <View style={s.meta}>
          <Icon name="schedule" size={14} color={PALETTE.textMuted} />
          <Text style={s.metaText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {whenLabel(row?.createdAt) || '—'} · {Number(row?.attempts || 1)} {Number(row?.attempts || 1) === 1 ? 'try' : 'tries'}
          </Text>
        </View>
      </View>
      {reason && !open ? (
        <Text style={s.reason} numberOfLines={2} maxFontSizeMultiplier={1.3}>{reason.length > 120 ? `${reason.slice(0, 119)}…` : reason}</Text>
      ) : null}
      {open ? (
        <View style={s.detail}>
          <DeliveryDetail row={row} />
          <View style={s.resend}><ResendButton row={row} onDone={onChanged} /></View>
        </View>
      ) : (
        <View style={s.footRow}>
          {state === 'failed' ? <ResendButton row={row} onDone={onChanged} compact /> : <View />}
          <View style={s.moreRow}>
            <Text style={s.more} maxFontSizeMultiplier={1.2}>Details</Text>
            <Icon name="expand-more" size={18} color={PALETTE.indigo} />
          </View>
        </View>
      )}
    </ConsoleCard>
  );
}

export function AutomationPane({ header, refreshKey = 0 }: { header?: React.ReactElement | null; refreshKey?: number }) {
  const [data, setData] = useState<AutomationPage>(EMPTY_AUTOMATION);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [eventId, setEventId] = useState('');
  const [channel, setChannel] = useState('');
  const [delivery, setDelivery] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState('');
  const [showDates, setShowDates] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (mode: 'load' | 'refresh' | 'quiet' = 'load') => {
    const mine = ++seq.current;
    if (mode === 'refresh') setRefreshing(true); else if (mode === 'load') setLoading(true);
    setError('');
    try {
      const term = (search || '').trim();
      const result = await getAutomationLogs({
        page, limit: PAGE_SIZE, eventId, channel, delivery, event: type, from, to,
        search: term.length >= 2 ? term : '',
      });
      if (mine === seq.current) { setData(result); setLoaded(true); }
    } catch (err) {
      if (mine === seq.current) setError(errorText(err, 'The automation log could not be loaded'));
    } finally {
      if (mine === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, eventId, channel, delivery, type, from, to, search]);

  // Debounced, so typing into the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { load('load'); }, 300);
    return () => clearTimeout(timer);
  }, [load, refreshKey]);

  // Any filter change starts again at page one.
  useEffect(() => { setPage(1); }, [eventId, channel, delivery, type, from, to, search]);

  const rows = useMemo(() => (Array.isArray(data?.logs) ? data.logs : []), [data]);
  const pg = data?.pagination || EMPTY_AUTOMATION.pagination;
  const filtered = !!(eventId || channel || delivery || type || from || to || (search || '').trim());

  const events = Array.isArray(data?.events) ? data.events : [];
  const eventLabels = useMemo(() => events.map((ev) => `${ev?.title || 'Untitled event'} (${Number(ev?.count || 0)})`), [events]);
  const eventLabel = useMemo(() => {
    const i = events.findIndex((ev) => String(ev?.eventId || '') === eventId);
    return i >= 0 ? eventLabels[i] : '';
  }, [events, eventLabels, eventId]);

  const clearAll = () => {
    setEventId(''); setChannel(''); setDelivery(''); setType(''); setFrom(''); setTo(''); setSearch('');
  };

  const showing = pg.total
    ? `Showing ${(pg.page - 1) * pg.limit + 1} to ${Math.min(pg.page * pg.limit, pg.total)} of ${pg.total}`
    : 'No entries';

  const renderItem = useCallback(({ item }: { item: DeliveryLogRow }) => (
    <MessageCard
      row={item}
      open={openId === String(item?._id || '')}
      onToggle={() => setOpenId((cur) => (cur === String(item?._id || '') ? '' : String(item?._id || '')))}
      onChanged={() => load('quiet')}
    />
  ), [openId, load]);

  const listHeader = (
    <>
      {header || null}
      <ConsoleNote
        style={s.note}
        text={'Accepted means the provider (Meta or the mail server) took the message — not yet that it arrived. WhatsApp then reports sent, delivered and read, or failed with its reason. Email has no delivery receipts, so an email can only show accepted or failed.'}
      />
      {loaded ? (
        <>
          <ChannelCounts channel="email" counts={data.counts.byChannel.email} />
          <ChannelCounts channel="whatsapp" counts={data.counts.byChannel.whatsapp} />
        </>
      ) : null}

      <ConsoleSectionTitle title="Filters" icon="tune" action={filtered ? 'Clear filters' : undefined} onAction={filtered ? clearAll : undefined} style={s.section} />
      <ConsoleSearch value={search} onChangeText={setSearch} placeholder="Search name, phone, email or booking ref" />
      <View style={s.selects}>
        <InlineSelect
          label="Event"
          value={eventLabel}
          options={eventLabels}
          placeholder="Every event"
          emptyLabel="Every event"
          onChange={(label) => {
            const i = eventLabels.indexOf(label);
            setEventId(i >= 0 ? String(events[i]?.eventId || '') : '');
          }}
        />
        <InlineSelect
          label="Message type"
          value={type ? messageLabel(type) : ''}
          options={TYPE_LABELS}
          placeholder="Every message type"
          emptyLabel="Every message type"
          onChange={(label) => setType(label ? typeFromLabel(label) : '')}
        />
      </View>
      <ChipRow<string>
        value={channel}
        onChange={setChannel}
        options={[{ value: '', label: 'Email + WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]}
      />
      <ChipRow<string>
        value={delivery}
        onChange={setDelivery}
        options={[
          { value: '', label: 'Every status' }, { value: 'accepted', label: 'Accepted' }, { value: 'sent', label: 'Sent' },
          { value: 'delivered', label: 'Delivered' }, { value: 'read', label: 'Read' }, { value: 'failed', label: 'Failed' },
          { value: 'mock', label: 'Not sent' },
        ]}
      />
      <TouchableOpacity
        onPress={() => setShowDates((v) => !v)}
        style={s.datesToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: showDates }}
        accessibilityLabel="Date range"
      >
        <Icon name="date-range" size={18} color={PALETTE.indigo} />
        <Text style={s.datesText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {from || to ? `${from || 'Any day'} → ${to || 'today'}` : 'Any date'}
        </Text>
        <Icon name={showDates ? 'expand-less' : 'expand-more'} size={20} color={PALETTE.indigo} />
      </TouchableOpacity>
      {showDates ? (
        <View style={s.dates}>
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} min={from || undefined} />
          {from || to ? <ConsoleButton size="sm" kind="soft" icon="close" label="Any date" onPress={() => { setFrom(''); setTo(''); }} /> : null}
        </View>
      ) : null}

      {error && loaded ? <ConsoleNote style={s.note} kind="red" icon="error-outline" text={error} /> : null}
      {error && !loaded ? <ConsoleState kind="error" title="Could not load the automation log" message={error} action="Try again" onAction={() => load('load')} /> : null}
      {loading && !refreshing ? <ConsoleSkeleton rows={3} style={s.skeleton} /> : null}
    </>
  );

  const pager = !loading && rows.length ? (
    <View style={s.pager}>
      <Text style={s.showing} maxFontSizeMultiplier={1.3}>{showing}</Text>
      {pg.pages > 1 ? (
        <View style={s.pagerRow}>
          <ConsoleButton size="sm" kind="soft" icon="chevron-left" label="Previous" disabled={pg.page <= 1 || loading}
            onPress={() => setPage((p) => Math.max(1, p - 1))} accessibilityLabel="Previous page" />
          <Text style={s.pageNo} maxFontSizeMultiplier={1.2}>{pg.page} / {pg.pages}</Text>
          <ConsoleButton size="sm" kind="soft" icon="chevron-right" label="Next" disabled={pg.page >= pg.pages || loading}
            onPress={() => setPage((p) => Math.min(pg.pages, p + 1))} accessibilityLabel="Next page" />
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <FlatList
      data={loading && !refreshing ? [] : rows}
      keyExtractor={(item, index) => String(item?._id || index)}
      renderItem={renderItem}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      contentContainerStyle={CONSOLE_LIST}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={!loading && !(error && !loaded) ? (
        <ConsoleState
          title={filtered ? 'No messages match' : 'Nothing automated yet'}
          message={filtered ? 'No messages match those filters.' : 'No automated messages have been sent yet.'}
          action={filtered ? 'Clear filters' : undefined}
          onAction={filtered ? clearAll : undefined}
        />
      ) : null}
      ListFooterComponent={pager}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={PALETTE.indigo} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const s = StyleSheet.create({
  flexText: { flex: 1, minWidth: 0 },
  note: { marginHorizontal: SPACE.lg, marginTop: SPACE.md, marginBottom: SPACE.md },
  section: { marginTop: SPACE.sm },
  skeleton: { marginTop: SPACE.md },
  card: { marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  countHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  countTitle: { ...TYPE.subheading, fontWeight: '800', flex: 1, minWidth: 0 },
  countTotal: { ...TYPE.caption, fontWeight: '700' },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  cell: { flexBasis: '30%', flexGrow: 1, minWidth: 0, backgroundColor: PALETTE.canvasAdmin, borderRadius: 12, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.sm },
  cellLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: PALETTE.textMuted },
  cellValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  cellHint: { fontSize: 10, lineHeight: 13, color: PALETTE.textFaint, marginTop: 2 },
  selects: { paddingHorizontal: SPACE.lg, marginTop: SPACE.md },
  datesToggle: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginHorizontal: SPACE.lg, marginTop: SPACE.md,
    paddingHorizontal: SPACE.md, minHeight: 44, borderRadius: 14, backgroundColor: PALETTE.indigoSoft,
  },
  datesText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: PALETTE.indigoDark },
  dates: { paddingHorizontal: SPACE.lg, marginTop: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  chan: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.subheading, fontWeight: '800' },
  sub: { ...TYPE.caption, marginTop: 1 },
  msg: { fontSize: 13, fontWeight: '700', color: PALETTE.indigoDark, marginTop: SPACE.xs },
  metaRow: { marginTop: SPACE.sm, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  metaText: { ...TYPE.caption, flex: 1, minWidth: 0 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  reason: { fontSize: 12, lineHeight: 17, color: PALETTE.redDark, marginTop: SPACE.sm },
  detail: { marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: PALETTE.divider },
  resend: { marginTop: SPACE.md },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.sm, gap: SPACE.sm },
  moreRow: { flexDirection: 'row', alignItems: 'center' },
  more: { fontSize: 12, fontWeight: '800', color: PALETTE.indigo },
  pager: { paddingHorizontal: SPACE.lg, marginTop: SPACE.sm, gap: SPACE.sm },
  showing: { ...TYPE.caption },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  pageNo: { fontSize: 14, fontWeight: '800', color: PALETTE.textSoft },
});
