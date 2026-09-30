import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Share } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resolveMediaUrl } from '../../../config/api.config';
import {
  Screen, AppHeader, IconButton, Field, Loading, ErrorState, EmptyState, SegmentedTabs, Badge,
  PALETTE, SPACE, RADIUS, SHADOW,
} from '../../../ui';
import { listCmsEventsForEditor, deleteCmsEvent, eventPublicUrl, errorText, type CmsEventRow } from '../../../services/superApi';
import { useSuperAdminBack } from './useSuperAdminBack';
import { ChipRow, MiniAction, confirm } from './superKit';
import { hasBeenHeld, isOnPublicSite, listWhen } from './events/eventKit';

/**
 * ============================================================================
 * SUPER ADMIN → EVENTS (website /super-admin/events — EventsManager with
 * channel "members")
 * ============================================================================
 *
 *   GET    /cms/events       every event, drafts / members-only / targeted
 *   DELETE /cms/events/:id
 *   create / edit           → SuperEventEditor (its own screen, as the
 *                             website opens the form as its own screen)
 *
 * The list mirrors the website's: Upcoming / Past tabs with counts, a filter by
 * audience built from the targets actually in use, a search over everything a
 * person might recognise an event by, and on every row the facts the status
 * column cannot carry — members-only, on the onboarding site or members only,
 * registration open or not, and who it reaches. A blank title reads “Untitled
 * event”; an undated event reads “Date to be confirmed”, never a dash.
 */

type When = 'upcoming' | 'past';

function EventCard({ e, onEdit, onDelete, onShare, onQr }: { e: CmsEventRow; onEdit: () => void; onDelete: () => void; onShare: () => void; onQr: () => void }) {
  const banner = resolveMediaUrl(e?.media?.url || e?.imageUrl || '');
  const published = e?.status === 'published';
  const onPublic = isOnPublicSite(e);
  const where = e?.mode === 'online'
    ? `Online${e?.onlinePlatform ? ` · ${e.onlinePlatform}` : ''}`
    : (e?.location || '');
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onEdit} style={[s.card, SHADOW.card]}>
      {banner ? (
        <Image source={{ uri: banner }} style={s.banner} resizeMode={e?.media?.fit === 'contain' ? 'contain' : 'cover'} />
      ) : (
        <View style={[s.banner, s.bannerEmpty]}><Icon name="event" size={30} color="#A5B4FC" /></View>
      )}
      <View style={s.statusFloat}>
        <Badge label={published ? 'Published' : 'Draft'} status={published ? 'published' : 'draft'} />
      </View>
      <View style={s.body}>
        {e?.title
          ? <Text style={s.title} numberOfLines={2}>{e.title}</Text>
          : <Text style={[s.title, s.untitled]}>Untitled event</Text>}

        <View style={s.badges}>
          {e?.audience === 'paid' ? <Tag icon="lock" text="Members" fg={PALETTE.blueDark} bg={PALETTE.blueSoft} /> : null}
          {onPublic
            ? <Tag icon="language" text="Onboarding" fg="#047857" bg={PALETTE.greenSoft} />
            : <Tag icon="lock-outline" text="Members only" fg={PALETTE.textSoft} bg="#E2E8F0" />}
          {e?.registrationEnabled
            ? <Tag icon="how-to-reg" text="Registration open" fg="#047857" bg={PALETTE.greenSoft} />
            : <Tag icon="block" text="No registration" fg="#B45309" bg={PALETTE.amberSoft} />}
          {e?.category ? <Tag icon="sell" text={e.category} fg={PALETTE.indigo} bg={PALETTE.indigoSoft} /> : null}
        </View>

        <View style={s.meta}>
          <Icon name="schedule" size={15} color={PALETTE.textMuted} />
          <Text style={[s.metaText, !e?.startAt && { fontStyle: 'italic' }]} numberOfLines={1}>
            {e?.startAt ? (listWhen(e.startAt) || 'Date to be confirmed') : 'Date to be confirmed'}
          </Text>
        </View>
        <View style={s.meta}>
          <Icon name={e?.mode === 'online' ? 'videocam' : 'place'} size={15} color={PALETTE.textMuted} />
          <Text style={s.metaText} numberOfLines={1}>{where || '—'}</Text>
        </View>
        <View style={[s.reach, e?.targetLabel ? { backgroundColor: PALETTE.blueSoft } : null]}>
          <Icon name={e?.targetLabel ? 'my-location' : 'public'} size={14} color={e?.targetLabel ? PALETTE.blueDark : PALETTE.textMuted} />
          <Text style={[s.reachText, e?.targetLabel ? { color: PALETTE.blueDark } : null]} numberOfLines={2}>
            {e?.targetLabel ? `${e.targetLabel} only` : 'Everyone'}
          </Text>
        </View>

        <View style={s.actions}>
          <MiniAction icon="edit" label="Edit" onPress={onEdit} />
          <MiniAction icon="qr-code-2" label="QR" onPress={onQr} color={PALETTE.textSoft} />
          <MiniAction icon="share" label="Share link" onPress={onShare} color={PALETTE.blueDark} />
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onDelete} style={s.delete} accessibilityLabel={`Delete ${e?.title || 'this event'}`}>
            <Icon name="delete-outline" size={20} color={PALETTE.red} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Tag({ icon, text, fg, bg }: { icon: string; text: string; fg: string; bg: string }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Icon name={icon} size={12} color={fg} />
      <Text style={[s.tagText, { color: fg }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const ManageEventsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<CmsEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [when, setWhen] = useState<When>('upcoming');
  const [target, setTarget] = useState('all');
  const [query, setQuery] = useState('');

  const goBack = useSuperAdminBack();

  const load = useCallback(async (mode: 'load' | 'refresh' | 'quiet' = 'load') => {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'load') setLoading(true);
    setError('');
    try {
      setEvents(await listCmsEventsForEditor());
    } catch (err) {
      setError(errorText(err, 'Could not load events'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on every return from the editor, without blanking the list.
  const loadedOnce = useRef(false);
  useFocusEffect(useCallback(() => {
    load(loadedOnce.current ? 'quiet' : 'load');
    loadedOnce.current = true;
  }, [load]));

  const targetOf = (e: CmsEventRow) => e?.targetLabel || 'Everyone';
  const targetOptions = useMemo(() => Array.from(new Set((events || []).map(targetOf)))
    .sort((a, b) => (a === 'Everyone' ? -1 : b === 'Everyone' ? 1 : a.localeCompare(b))), [events]);
  const upcomingCount = useMemo(() => (events || []).filter((e) => !hasBeenHeld(e)).length, [events]);
  const pastCount = (events || []).length - upcomingCount;

  const visible = useMemo(() => {
    const needle = (query || '').trim().toLowerCase();
    return (events || [])
      .filter((e) => target === 'all' || targetOf(e) === target)
      .filter((e) => (when === 'past' ? hasBeenHeld(e) : !hasBeenHeld(e)))
      .filter((e) => !needle || [e?.title, e?.venue, e?.category, e?.state, e?.district, e?.block, e?.description, e?.targetLabel]
        .filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [events, target, when, query]);

  const openNew = () => navigation.navigate('SuperEventEditor', {});
  const openEdit = (e: CmsEventRow) => navigation.navigate('SuperEventEditor', { event: e });

  const remove = async (e: CmsEventRow) => {
    const ok = await confirm('Delete event', `Delete “${e?.title || 'Untitled event'}”? This removes it from the public site and from the member app.`, 'Delete', true);
    if (!ok) return;
    try {
      await deleteCmsEvent(String(e?.id || ''));
      setEvents((prev) => (prev || []).filter((x) => x?.id !== e?.id));
      load('quiet');
    } catch (err) {
      Alert.alert('Could not delete the event', errorText(err));
    }
  };

  const share = (e: CmsEventRow) => {
    const url = eventPublicUrl(e);
    Share.share({ message: e?.title ? `${e.title}\n${url}` : url, title: e?.title || 'Event' }).catch(() => null);
  };

  const header = (
    <View>
      <AppHeader tone="admin" title="Events" onBack={goBack}
        subtitle={`${(events || []).filter((e) => e?.status === 'published').length} published · ${(events || []).length} in all`}
        right={<IconButton icon="add" accessibilityLabel="Add event" onPress={openNew} color={PALETTE.indigo} />} />
      <Text style={s.lede}>
        Aim an event at a state, district or block and every member there sees it — paid or unpaid. Every event also goes
        on the onboarding site, unless you untick that on the form.
      </Text>
      <SegmentedTabs<When> tone="admin" value={when} onChange={setWhen}
        options={[{ value: 'upcoming', label: 'Upcoming', count: upcomingCount }, { value: 'past', label: 'Past', count: pastCount }]} />
      {targetOptions.length > 1 ? (
        <ChipRow<string> value={target} onChange={setTarget}
          options={[{ value: 'all', label: 'Every audience' }, ...targetOptions.map((t) => ({ value: t, label: t === 'Everyone' ? 'Everyone (no target)' : t }))]} />
      ) : null}
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.md }}>
        <Field icon="search" value={query} onChangeText={setQuery} placeholder="Title, venue, category or region" autoCorrect={false} />
      </View>
      {when === 'upcoming' && pastCount > 0 ? (
        <TouchableOpacity onPress={() => setWhen('past')} activeOpacity={0.8} style={s.note}>
          <Text style={s.noteText}>
            <Text style={{ fontWeight: '800', color: PALETTE.text }}>{upcomingCount} {upcomingCount === 1 ? 'is' : 'are'} still to come. </Text>
            The other {pastCount} {pastCount === 1 ? 'has' : 'have'} already been held.
          </Text>
          <Text style={s.noteLink}>Show them</Text>
        </TouchableOpacity>
      ) : null}
      {(events || []).length > 0 && visible.length !== (events || []).length ? (
        <Text style={s.count}>Showing {visible.length} of {(events || []).length}</Text>
      ) : null}
    </View>
  );

  if (loading && !(events || []).length) {
    return <Screen tone="admin"><AppHeader tone="admin" title="Events" onBack={goBack} /><Loading tone="admin" label="Loading events…" /></Screen>;
  }
  if (error && !(events || []).length) {
    return <Screen tone="admin"><AppHeader tone="admin" title="Events" onBack={goBack} /><ErrorState tone="admin" message={error} onRetry={() => load()} /></Screen>;
  }

  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(item, index) => String(item?.id || index)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => load('refresh')}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={(events || []).length === 0
          ? <EmptyState tone="admin" icon="event" title="No events yet" message="Aim your first event at a region, or at everyone." action="Add event" onAction={openNew} />
          : <EmptyState tone="admin" icon="filter-alt-off" title="Nothing matches" message="No event answers all of the filters above. Clear one of them." />}
        renderItem={({ item }) => (
          <EventCard e={item} onEdit={() => openEdit(item)} onDelete={() => remove(item)} onShare={() => share(item)}
            onQr={() => navigation.navigate('SuperEventQr', { event: item, justCreated: false })} />
        )}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  lede: { fontSize: 13, lineHeight: 19, color: PALETTE.textMuted, paddingHorizontal: SPACE.lg, marginBottom: SPACE.md },
  note: { marginHorizontal: SPACE.lg, marginBottom: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border },
  noteText: { fontSize: 12, lineHeight: 17, color: PALETTE.textMuted },
  noteLink: { fontSize: 12, fontWeight: '800', color: PALETTE.indigo, marginTop: 4 },
  count: { fontSize: 12, fontWeight: '700', color: PALETTE.textFaint, paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, marginHorizontal: SPACE.lg, marginBottom: SPACE.lg, overflow: 'hidden' },
  banner: { width: '100%', aspectRatio: 16 / 9, backgroundColor: PALETTE.field },
  bannerEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.indigoSoft, aspectRatio: 3.2 },
  statusFloat: { position: 'absolute', top: SPACE.md, right: SPACE.md },
  body: { padding: SPACE.lg },
  title: { fontSize: 17, fontWeight: '800', color: PALETTE.text, lineHeight: 23 },
  untitled: { fontStyle: 'italic', fontWeight: '600', color: PALETTE.textFaint },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACE.sm, marginBottom: SPACE.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, maxWidth: '100%' },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { flex: 1, fontSize: 13, color: PALETTE.textSoft },
  reach: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: PALETTE.field, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  reachText: { fontSize: 12, fontWeight: '700', color: PALETTE.textMuted, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACE.lg, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: PALETTE.border },
  delete: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.redSoft },
});

export default ManageEventsScreen;
