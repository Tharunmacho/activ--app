import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  AccessibilityInfo,
  findNodeHandle,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PALETTE,
  SPACE,
  TYPE,
  ConsoleCard,
  ConsoleGrid,
  ConsoleStatTile,
  ConsoleNote,
  ConsoleSectionTitle,
  ConsoleSearch,
  ConsoleButton,
  PremiumInput,
  CONSOLE_LIST,
  useReduceMotion,
} from '../../../../ui';
import { ChipRow } from '../superKit';
import {
  getDeliveryReport,
  CHANNEL_LABELS,
  statusLabel,
  type DeliveryReport,
  type ReportFilters,
  type ReportRow,
} from '../../../../services/deliveryReportApi';
import { errorText } from '../../../../services/superApi';

const fmt = (n?: number) => Number(n || 0).toLocaleString('en-IN');
const human = (s = '') =>
  s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase());
const when = (s?: string) =>
  s
    ? new Date(s).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not recorded';
const firstDate = () =>
  new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

function Ratio({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <View style={s.ratio}>
      <View style={s.between}>
        <Text style={s.caption}>{label}</Text>
        <Text style={s.caption}>
          {fmt(value)} / {fmt(total)} · {percent}%
        </Text>
      </View>
      <View style={s.track}>
        <View style={[s.progress, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

export function ReportsPane({
  header,
  refreshKey = 0,
}: {
  header?: React.ReactNode;
  refreshKey?: number;
}) {
  const [filters, setFilters] = useState<ReportFilters>({
    from: firstDate(),
    page: 1,
    limit: 25,
    campaignPage: 1,
  });
  const [data, setData] = useState<DeliveryReport | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState('');
  const [expanded, setExpanded] = useState(''),
    [dates, setDates] = useState(false);
  const seq = useRef(0);
  const list = useRef<FlatList<ReportRow>>(null);
  const recipientsAnchor = useRef<View>(null);
  const recipientsOffset = useRef(0);
  const pendingReveal = useRef(false);
  const { width, fontScale } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const wideRows = width >= 768 && fontScale < 1.5;
  const revealRecipients = useCallback(() => {
    list.current?.scrollToOffset({
      offset: Math.max(0, recipientsOffset.current - SPACE.sm),
      animated: !reduceMotion,
    });
    try {
      const anchor = findNodeHandle(recipientsAnchor.current);
      if (
        anchor != null &&
        typeof AccessibilityInfo.setAccessibilityFocus === 'function'
      ) {
        AccessibilityInfo.setAccessibilityFocus(anchor);
      }
    } catch {
      /* Scrolling still reveals the section when native focus is unavailable. */
    }
  }, [reduceMotion]);
  const change = (patch: ReportFilters) => {
    setExpanded('');
    setFilters(f => ({
      ...f,
      ...patch,
      page: 1,
      ...(patch.campaignKey !== undefined || patch.group !== undefined
        ? { campaignPage: 1 }
        : {}),
    }));
  };
  const showRecipients = (patch: ReportFilters) => {
    pendingReveal.current = true;
    change(patch);
    revealRecipients();
  };
  const load = useCallback(async () => {
    const request = ++seq.current;
    setBusy(true);
    setError('');
    try {
      const report = await getDeliveryReport(filters);
      if (request === seq.current) setData(report);
    } catch (err) {
      if (request === seq.current) setError(errorText(err));
    } finally {
      if (request === seq.current) setBusy(false);
    }
  }, [filters]);
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => {
      clearTimeout(timer);
      seq.current++;
    };
  }, [load, refreshKey]);
  useEffect(() => {
    if (!busy && pendingReveal.current) {
      pendingReveal.current = false;
      revealRecipients();
    }
  }, [busy, data, revealRecipients]);
  const summary = data?.summary;
  const selected = data?.campaigns.find(c => c._id === filters.campaignKey);
  const top = (
    <>
      {header}
      <ConsoleSectionTitle
        title="Delivery reports"
        subtitle="Publications, updates and automated messages"
        icon="insights"
      />
      <ChipRow<string>
        options={[
          { value: '', label: 'All activity' },
          { value: 'publication', label: 'Publications' },
          { value: 'automation', label: 'Automations' },
        ]}
        value={filters.group || ''}
        onChange={group => change({ group, campaignKey: '' })}
      />
      <ChipRow<string>
        options={[
          { value: '', label: 'All channels' },
          ...Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
        value={filters.channel || ''}
        onChange={channel => change({ channel })}
      />
      <ConsoleButton
        label={dates ? 'Hide dates' : `Dates · ${filters.from || 'All time'}`}
        icon="date-range"
        onPress={() => setDates(!dates)}
      />
      {dates && (
        <ConsoleCard style={s.card}>
          <PremiumInput
            tone="admin"
            label="From date (IST)"
            placeholder="YYYY-MM-DD"
            value={filters.from || ''}
            onChangeText={from => change({ from })}
            accessibilityLabel="Report from date"
          />
          <PremiumInput
            tone="admin"
            label="To date (IST)"
            placeholder="YYYY-MM-DD"
            value={filters.to || ''}
            onChangeText={to => change({ to })}
            accessibilityLabel="Report to date"
          />
        </ConsoleCard>
      )}
      <ConsoleNote
        kind="indigo"
        text="Counts are recipient-channel deliveries. One member may receive several channels. No confirmed open does not necessarily mean unread."
        style={s.card}
      />
      {error ? <ConsoleNote kind="red" text={error} style={s.card} /> : null}
      <ConsoleGrid style={s.card}>
        <ConsoleStatTile
          label="Recipient identities"
          value={fmt(summary?.recipients)}
          icon="people-outline"
          hint="Accounts and contacts"
          selected={!filters.status}
          onPress={() => showRecipients({ status: '' })}
        />
        <ConsoleStatTile
          label="Accepted / in inbox"
          value={fmt(summary?.accepted)}
          icon="send"
          hint={`${fmt(summary?.records)} delivery records`}
          accent="green"
          selected={filters.status === 'accepted_any'}
          onPress={() => showRecipients({ status: 'accepted_any' })}
        />
        <ConsoleStatTile
          label="Confirmed opens"
          value={fmt(summary?.opened)}
          icon="visibility"
          hint="WhatsApp reads and taps"
          accent="sky"
          selected={filters.status === 'read'}
          onPress={() => showRecipients({ status: 'read' })}
        />
        <ConsoleStatTile
          label="Failed"
          value={fmt(summary?.failed)}
          icon="error-outline"
          hint={`${fmt(summary?.queued)} queued · ${fmt(
            summary?.skipped,
          )} skipped`}
          accent="red"
          selected={filters.status === 'failed'}
          onPress={() => showRecipients({ status: 'failed' })}
        />
      </ConsoleGrid>
      {Object.entries(CHANNEL_LABELS).map(([key, label]) => {
        const channel = data?.channels.find(c => c._id === key);
        return (
          <TouchableOpacity
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Filter delivery records by ${label}`}
            accessibilityState={{ selected: filters.channel === key }}
            accessibilityHint={
              filters.channel === key
                ? 'Show all channels and view recipient details'
                : 'View recipient details for this channel'
            }
            onPress={() =>
              showRecipients({ channel: filters.channel === key ? '' : key })
            }
          >
            <ConsoleCard
              style={s.card}
              accent={filters.channel === key ? PALETTE.indigo : undefined}
            >
              <Text style={s.title}>{label}</Text>
              <Ratio
                label={key === 'in_app' ? 'In inbox' : 'Accepted'}
                value={channel?.accepted || 0}
                total={channel?.records || 0}
              />
              {key === 'whatsapp' && (
                <Ratio
                  label="Delivered"
                  value={channel?.delivered || 0}
                  total={channel?.records || 0}
                />
              )}
              {key !== 'email' ? (
                <Ratio
                  label={
                    key === 'push'
                      ? 'Tapped / accepted'
                      : key === 'whatsapp'
                      ? 'Opened / delivered'
                      : 'Opened'
                  }
                  value={channel?.opened || 0}
                  total={
                    (key === 'whatsapp'
                      ? channel?.delivered
                      : key === 'push'
                      ? channel?.accepted
                      : channel?.records) || 0
                  }
                />
              ) : (
                <Text style={s.caption}>
                  Email inbox delivery and opens are not measured.
                </Text>
              )}
              <Text style={s.caption}>
                {fmt(channel?.failed)} failed · {fmt(channel?.queued)} queued ·{' '}
                {fmt(channel?.skipped)} skipped
              </Text>
              <View style={s.between}>
                <Text style={s.link}>
                  {filters.channel === key
                    ? 'Selected · Show all channels'
                    : 'View recipient records'}
                </Text>
                <Icon name="arrow-forward" size={18} color={PALETTE.indigo} />
              </View>
            </ConsoleCard>
          </TouchableOpacity>
        );
      })}
      <ConsoleSectionTitle
        title={
          filters.campaignKey ? 'Selected report' : 'Publications & automations'
        }
        icon="campaign"
      />
      {filters.campaignKey ? (
        <ConsoleCard style={s.card}>
          <Text style={s.title}>{selected?.title || 'Selected report'}</Text>
          {selected && (
            <Text style={s.caption}>
              {human(selected.kind)} · {when(selected.createdAt)}
              {selected.currentAudience
                ? ` · Current audience: ${human(selected.currentAudience)}`
                : ''}
            </Text>
          )}
          {selected?.publicationStatuses?.some(state => state !== 'done') && (
            <Text style={s.caption}>
              Recipient preparation:{' '}
              {selected.publicationStatuses
                .filter(Boolean)
                .map(human)
                .join(', ')}
              . Counts grow as eligible recipients are processed.
            </Text>
          )}
          {selected?.publicationErrors?.filter(Boolean).map((reason, i) => (
            <Text key={i} style={s.error}>
              {reason}
            </Text>
          ))}
          <ConsoleButton
            label="All reports"
            icon="arrow-back"
            onPress={() => change({ campaignKey: '' })}
          />
        </ConsoleCard>
      ) : (
        <>
          {data?.campaigns.map(c => (
            <TouchableOpacity
              key={c._id}
              onPress={() =>
                change({ campaignKey: c._id, status: '', search: '' })
              }
              accessibilityRole="button"
              accessibilityLabel={`View report: ${c.title}`}
            >
              <ConsoleCard style={s.card}>
                <Text style={s.eyebrow}>
                  {human(c.kind === 'automation' ? c.event : c.kind)}
                </Text>
                <Text style={s.title}>
                  {c.kind === 'automation' ? human(c.event) : c.title}
                </Text>
                <Text style={s.caption}>{when(c.lastAt)}</Text>
                <Text style={s.caption}>
                  {fmt(c.records)} deliveries · {fmt(c.opened)} opened ·{' '}
                  {fmt(c.failed)} failed · {fmt(c.queued)} queued
                </Text>
              </ConsoleCard>
            </TouchableOpacity>
          ))}
          {(data?.campaignPagination.pages || 0) > 1 && (
            <View style={s.pages}>
              <ConsoleButton
                label="Previous"
                disabled={busy || data?.campaignPagination.page === 1}
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    campaignPage: Math.max(1, (f.campaignPage || 1) - 1),
                  }))
                }
              />
              <Text style={s.caption}>
                {data?.campaignPagination.page} /{' '}
                {data?.campaignPagination.pages}
              </Text>
              <ConsoleButton
                label="Next"
                disabled={
                  busy ||
                  data?.campaignPagination.page ===
                    data?.campaignPagination.pages
                }
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    campaignPage: (f.campaignPage || 1) + 1,
                  }))
                }
              />
            </View>
          )}
        </>
      )}
      <View
        ref={recipientsAnchor}
        accessible
        accessibilityRole="header"
        accessibilityLabel="Recipient details"
        onLayout={event => {
          recipientsOffset.current = event.nativeEvent.layout.y;
        }}
      >
        <ConsoleSectionTitle title="Recipient details" icon="people-outline" />
      </View>
      <ConsoleCard style={s.card}>
        <Text style={s.body} accessibilityLiveRegion="polite">
          {filters.channel
            ? CHANNEL_LABELS[filters.channel as keyof typeof CHANNEL_LABELS]
            : 'All channels'}
          {' · '}
          {filters.status === 'accepted_any'
            ? 'All accepted deliveries, including delivered, opened and marked read'
            : filters.status === 'read'
            ? 'Confirmed opens / taps'
            : filters.status
            ? human(filters.status)
            : 'Every outcome'}
          {busy ? ' · Updating records…' : ''}
        </Text>
        <Text style={s.caption}>
          {fmt(summary?.recipients)} distinct recipient identities across{' '}
          {fmt(summary?.records)} delivery records for the current activity,
          channel, date and search filters. Each row is a delivery record, so
          the same recipient can appear more than once. Tap a row for its
          timeline and provider details.
        </Text>
      </ConsoleCard>
      <ConsoleSearch
        value={filters.search || ''}
        onChangeText={search => change({ search })}
        placeholder="Name, email, phone or booking reference"
      />
      <ChipRow<string>
        options={[
          { value: '', label: 'All outcomes' },
          { value: 'unconfirmed', label: 'No confirmed open' },
          { value: 'read', label: 'Opened / tapped' },
          { value: 'accepted_any', label: 'All accepted deliveries' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'marked_read', label: 'Marked read' },
          { value: 'failed', label: 'Failed' },
          { value: 'queued', label: 'Queued' },
          { value: 'skipped', label: 'Skipped' },
          { value: 'mock', label: 'Not sent' },
        ]}
        value={filters.status || ''}
        onChange={status => change({ status })}
      />
      <ConsoleNote
        kind="indigo"
        text="Review follow-up candidates here. Existing Automation controls handle eligible retries. Viewing a report never sends a message."
        style={s.card}
      />
    </>
  );
  const row = ({ item }: { item: ReportRow }) => (
    <ConsoleCard style={s.card}>
      <TouchableOpacity
        onPress={() => setExpanded(expanded === item._id ? '' : item._id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: expanded === item._id }}
        accessibilityLabel={`${item.recipientName}, ${
          CHANNEL_LABELS[item.channel]
        }, ${item.title}, ${statusLabel(item)}`}
        accessibilityHint="Show or hide delivery timeline and provider details"
      >
        <View style={[s.recipientRow, wideRows && s.wideRow]}>
          <View style={[s.recipientColumn, wideRows && s.flex]}>
            <Text style={s.title}>{item.recipientName}</Text>
            <Text style={s.caption}>
              {item.recipient || 'Account inbox / device'}
            </Text>
          </View>
          <View style={[s.recipientColumn, wideRows && s.flex]}>
            <Text style={s.body}>{CHANNEL_LABELS[item.channel]}</Text>
            <Text style={s.caption}>{item.title}</Text>
            <Text style={s.caption}>{when(item.createdAt)}</Text>
          </View>
          <View style={[s.outcome, wideRows && s.wideOutcome]}>
            <Text
              style={[
                s.status,
                item.status === 'failed'
                  ? s.failedStatus
                  : ['read', 'delivered'].includes(item.status)
                  ? s.readStatus
                  : s.acceptedStatus,
              ]}
            >
              {statusLabel(item)}
            </Text>
            <Icon
              name={expanded === item._id ? 'expand-less' : 'expand-more'}
              size={20}
              color={PALETTE.textMuted}
            />
          </View>
        </View>
      </TouchableOpacity>
      {expanded === item._id && (
        <View style={s.detail}>
          <Text style={s.title}>Recorded timeline</Text>
          <Text style={s.caption}>
            {[item.region?.state, item.region?.district, item.region?.block]
              .filter(Boolean)
              .join(' / ') || 'Region not recorded'}
          </Text>
          <Text style={s.body}>
            Provider: {item.provider || 'Not recorded'} · Attempts:{' '}
            {fmt(item.attempts)}
          </Text>
          {item.templateId && (
            <Text style={s.body}>Template: {item.templateId}</Text>
          )}
          {item.bookingRef && (
            <Text style={s.body}>Booking: {item.bookingRef}</Text>
          )}
          {item.error && (
            <Text style={item.status === 'failed' ? s.error : s.body}>
              {item.error}
            </Text>
          )}
          {item.history?.map((event, i) => (
            <Text key={i} style={s.body}>
              {human(event.status)}: {when(event.at)}
              {event.detail ? ` · ${event.detail}` : ''}
            </Text>
          ))}
          {item.deliveredAt && (
            <Text style={s.body}>Delivered: {when(item.deliveredAt)}</Text>
          )}
          {item.openedAt && (
            <Text style={s.body}>Opened / tapped: {when(item.openedAt)}</Text>
          )}
          {item.readAt && (
            <Text style={s.body}>Marked read: {when(item.readAt)}</Text>
          )}
          {item.status === 'queued' && item.nextAttemptAt && (
            <Text style={s.body}>Next attempt: {when(item.nextAttemptAt)}</Text>
          )}
          <Text style={s.caption}>
            Email opens are not measured. Firebase acceptance is separate from a
            recorded notification tap.
          </Text>
        </View>
      )}
    </ConsoleCard>
  );
  return (
    <FlatList
      ref={list}
      data={data?.rows || []}
      renderItem={row}
      keyExtractor={(item, index) => String(item?._id || index)}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      ListHeaderComponent={top}
      contentContainerStyle={CONSOLE_LIST}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={load}
          tintColor={PALETTE.indigo}
        />
      }
      ListEmptyComponent={
        !busy ? (
          <Text style={s.empty}>No recipients match these filters.</Text>
        ) : null
      }
      ListFooterComponent={
        <View>
          <Text style={s.caption}>
            {fmt(data?.pagination.total)} delivery records
          </Text>
          <View style={s.pages}>
            <ConsoleButton
              label="Previous"
              accessibilityLabel="Previous recipients"
              disabled={busy || (data?.pagination.page || 1) <= 1}
              onPress={() =>
                setFilters(f => ({
                  ...f,
                  page: Math.max(1, (f.page || 1) - 1),
                }))
              }
            />
            <Text style={s.caption}>
              {data?.pagination.page || 1} / {data?.pagination.pages || 1}
            </Text>
            <ConsoleButton
              label="Next"
              accessibilityLabel="Next recipients"
              disabled={
                busy ||
                (data?.pagination.page || 1) >= (data?.pagination.pages || 1)
              }
              onPress={() =>
                setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))
              }
            />
          </View>
        </View>
      }
    />
  );
}
const s = StyleSheet.create({
  card: { marginBottom: SPACE.md },
  title: {
    ...TYPE.body,
    fontWeight: '700',
    color: PALETTE.text,
    marginBottom: SPACE.xs,
  },
  body: { ...TYPE.small, color: PALETTE.text, marginBottom: SPACE.xs },
  caption: {
    ...TYPE.caption,
    color: PALETTE.textMuted,
    marginBottom: SPACE.xs,
  },
  eyebrow: {
    ...TYPE.caption,
    color: PALETTE.indigo,
    fontWeight: '700',
    marginBottom: SPACE.xs,
  },
  error: { ...TYPE.small, color: PALETTE.redDark },
  flex: { flex: 1 },
  recipientRow: { gap: SPACE.sm },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  recipientColumn: { minWidth: 0 },
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACE.sm,
  },
  wideOutcome: { width: 176 },
  status: {
    ...TYPE.caption,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: SPACE.md,
    overflow: 'hidden',
  },
  failedStatus: { color: PALETTE.redDark, backgroundColor: PALETTE.redSoft },
  readStatus: { color: PALETTE.greenDark, backgroundColor: PALETTE.greenSoft },
  acceptedStatus: {
    color: PALETTE.indigoDark,
    backgroundColor: PALETTE.indigoSoft,
  },
  link: {
    ...TYPE.caption,
    color: PALETTE.indigo,
    fontWeight: '700',
    flexShrink: 1,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  ratio: { marginVertical: SPACE.sm },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: PALETTE.divider,
    overflow: 'hidden',
  },
  progress: { height: 5, backgroundColor: PALETTE.blue },
  pages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    marginVertical: SPACE.md,
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
    marginTop: SPACE.md,
    paddingTop: SPACE.md,
  },
  empty: {
    ...TYPE.body,
    textAlign: 'center',
    color: PALETTE.textMuted,
    padding: SPACE.xl,
  },
});
