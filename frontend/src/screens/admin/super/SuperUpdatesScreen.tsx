import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppHeader, Loading, ErrorState, EmptyState, Badge, SegmentedTabs, PrimaryButton, Notice, PALETTE, SPACE, RADIUS, SHADOW, shortDate } from '../../../ui';
import { listAnnouncementsAdmin, setAnnouncementStatus, deleteAnnouncement, errorText } from '../../../services/superApi';
import { MiniAction, confirm } from './superKit';

/**
 * ============================================================================
 * SUPER ADMIN — Updates (website /super-admin/updates)
 * ============================================================================
 *
 * Association announcements members read on their dashboard.
 * GET /announcements/admin (drafts included), PATCH /announcements/:id/status,
 * DELETE /announcements/:id; create / edit in SuperUpdateEditor.
 */

type Tab = 'all' | 'published' | 'draft';

export const CATEGORY_TONE: Record<string, { fg: string; bg: string; icon: string }> = {
  general: { fg: PALETTE.blueDark, bg: PALETTE.blueSoft, icon: 'campaign' },
  notice: { fg: '#6D28D9', bg: '#EDE9FE', icon: 'push-pin' },
  policy: { fg: '#0F766E', bg: '#CCFBF1', icon: 'policy' },
  scheme: { fg: '#B45309', bg: PALETTE.amberSoft, icon: 'account-balance' },
  achievement: { fg: '#047857', bg: PALETTE.greenSoft, icon: 'emoji-events' },
  urgent: { fg: '#B91C1C', bg: PALETTE.redSoft, icon: 'priority-high' },
};

function UpdateCard({ a, onEdit, onToggle, onDelete }: { a: any; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const tone = CATEGORY_TONE[String(a?.category || 'general')] || CATEGORY_TONE.general;
  const published = String(a?.status) === 'published';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onEdit}>
      <View style={[s.card, SHADOW.card]}>
        <View style={s.row}>
          <View style={[s.icon, { backgroundColor: tone.bg }]}><Icon name={tone.icon} size={20} color={tone.fg} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.titleRow}>
              {a?.pinned ? <Icon name="push-pin" size={14} color={PALETTE.indigo} style={{ marginRight: 4 }} /> : null}
              <Text style={s.title} numberOfLines={2}>{a?.title || 'Untitled update'}</Text>
            </View>
            <Text style={s.sub} numberOfLines={1}>
              {String(a?.category || 'general')}{a?.pinned ? ' · pinned' : ''}
            </Text>
            <Text style={s.reach} numberOfLines={2}>
              {a?.targetLabel || 'All regions'} · {String(a?.audience) === 'paid' ? 'Paid members only' : 'All members'}
            </Text>
          </View>
          <Badge label={published ? 'Published' : 'Draft'} status={published ? 'published' : 'draft'} />
        </View>
        {a?.summary ? <Text style={s.summary} numberOfLines={3}>{a.summary}</Text> : null}
        <Text style={s.date}>{published ? `Published ${shortDate(a?.publishedAt)}` : `Created ${shortDate(a?.createdAt)}`}{a?.expiresAt ? ` · until ${shortDate(a.expiresAt)}` : ''}</Text>
        <View style={s.actions}>
          <MiniAction icon={published ? 'unpublished' : 'publish'} label={published ? 'Unpublish' : 'Publish'} color={published ? PALETTE.amber : PALETTE.green} onPress={onToggle} />
          <MiniAction icon="edit" label="Edit" onPress={onEdit} />
          <View style={{ flex: 1 }} />
          <MiniAction icon="delete-outline" label="Delete" color={PALETTE.red} onPress={onDelete} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const SuperUpdatesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('all');
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const d = await listAnnouncementsAdmin();
      setRows(Array.isArray(d?.announcements) ? d.announcements : []);
    } catch (err) { setError(errorText(err)); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = rows || [];
  const shown = useMemo(() => (tab === 'all' ? all : all.filter((a) => String(a?.status) === tab)), [all, tab]);

  const toggle = async (a: any) => {
    const next = String(a?.status) === 'published' ? 'draft' : 'published';
    try {
      await setAnnouncementStatus(String(a?.id), next);
      Alert.alert(next === 'draft' ? 'Withdrawn from members' : 'Published to members');
      load('refresh');
    } catch (err) { Alert.alert('Could not change the status', errorText(err)); }
  };
  const remove = async (a: any) => {
    if (!(await confirm(`Delete "${a?.title || 'Untitled'}"?`, 'Members who have already read it will no longer see it.', 'Delete', true))) return;
    try { await deleteAnnouncement(String(a?.id)); load('refresh'); } catch (err) { Alert.alert('Could not delete the update', errorText(err)); }
  };

  const header = (
    <View>
      <AppHeader tone="admin" title="Association Updates" subtitle={`News and notices, targeted by region and by membership · ${all.length}`} onBack={() => navigation.goBack()} />
      {error ? <View style={{ marginBottom: SPACE.md }}><Notice kind="danger" text={error} action="Retry" onAction={() => load('refresh')} /></View> : null}
      <View style={{ paddingHorizontal: SPACE.lg, marginBottom: SPACE.md }}>
        <PrimaryButton tone="admin" icon="add" label="New update" onPress={() => navigation.navigate('SuperUpdateEditor')} />
      </View>
      <SegmentedTabs<Tab> tone="admin" value={tab} onChange={setTab} options={[
        { value: 'all', label: 'All', count: all.length },
        { value: 'published', label: 'Published', count: all.filter((a) => String(a?.status) === 'published').length },
        { value: 'draft', label: 'Drafts', count: all.filter((a) => String(a?.status) !== 'published').length },
      ]} />
      <View style={{ height: SPACE.md }} />
    </View>
  );

  if (loading && !rows) return <Screen tone="admin"><AppHeader tone="admin" title="Updates" onBack={() => navigation.goBack()} /><Loading tone="admin" /></Screen>;
  if (error && !rows) return <Screen tone="admin"><AppHeader tone="admin" title="Updates" onBack={() => navigation.goBack()} /><ErrorState tone="admin" message={error} onRetry={() => load()} /></Screen>;

  return (
    <Screen tone="admin" scroll={false}>
      <FlatList
        data={shown}
        keyExtractor={(a, i) => String(a?.id || i)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => load('refresh')}
        contentContainerStyle={{ paddingBottom: SPACE.xxl * 2 }}
        ListEmptyComponent={<EmptyState tone="admin" icon="campaign" title="No updates here" message="Nothing published yet. Create one and it appears on every matching member's dashboard." />}
        renderItem={({ item }) => (
          <UpdateCard a={item} onEdit={() => navigation.navigate('SuperUpdateEditor', { announcement: item })} onToggle={() => toggle(item)} onDelete={() => remove(item)} />
        )}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: PALETTE.text, flexShrink: 1 },
  sub: { fontSize: 12, color: PALETTE.textMuted, marginTop: 3, textTransform: 'capitalize' },
  reach: { fontSize: 12, color: PALETTE.textSoft, marginTop: 2 },
  summary: { fontSize: 13, color: PALETTE.textSoft, marginTop: SPACE.md, lineHeight: 19 },
  date: { fontSize: 11, color: PALETTE.textFaint, marginTop: SPACE.sm },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
});

export default SuperUpdatesScreen;
