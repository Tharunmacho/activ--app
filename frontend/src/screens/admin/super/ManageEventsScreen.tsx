import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../../services/api';
import { resolveMediaUrl } from '../../../config/api.config';
import { SUPER, ACCENTS, superStyles, formatDate } from './superTheme';
import { useSuperAdminBack } from './useSuperAdminBack';
import { SkeletonList } from './components/Skeleton';
import EmptyState from './components/EmptyState';

interface EventRow {
  id: string;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  venue: string;
  state: string;
  district: string;
  block: string;
  bannerUrl: string;
  status: 'draft' | 'published';
}

type StatusFilter = 'all' | 'published' | 'draft';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  startAt: '',
  venue: '',
  state: '',
};

/** `2026-08-30` or `2026-08-30 18:30` — the two shapes the form accepts. */
const DATE_HINT = 'YYYY-MM-DD or YYYY-MM-DD HH:mm';

const parseDateInput = (value: string): Date | null => {
  const raw = (value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2})?$/.test(raw)) return null;
  const parsed = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Create, publish and remove the platform-wide events members see. */
const ManageEventsScreen = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bannerAsset, setBannerAsset] = useState<any>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/events', { params: { status: 'all' } });
      const payload = response.data?.data || response.data || {};
      setEvents(payload.events || []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load events');
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBannerAsset(null);
    setBannerPreview('');
  };

  /** An open editor is what back closes first; only then does it leave the tab. */
  const goBack = useSuperAdminBack(
    useCallback(() => {
      if (editorOpen) {
        closeEditor();
        return true;
      }
      return false;
    }, [editorOpen]),
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBannerAsset(null);
    setBannerPreview('');
    setEditorOpen(true);
  };

  const openEdit = (event: EventRow) => {
    setEditingId(event?.id || null);
    setForm({
      title: event?.title || '',
      description: event?.description || '',
      startAt: toDateInput(event?.startAt),
      venue: event?.venue || '',
      state: event?.state || '',
    });
    setBannerAsset(null);
    setBannerPreview(resolveMediaUrl(event?.bannerUrl));
    setEditorOpen(true);
  };

  const pickBanner = () => {
    // Native module calls are guarded: a missing picker must not take the app down.
    try {
      if (typeof launchImageLibrary !== 'function') {
        Alert.alert('Unavailable', 'The photo picker is not available on this device.');
        return;
      }

      launchImageLibrary(
        { mediaType: 'photo', maxWidth: 1600, maxHeight: 900, quality: 0.9, selectionLimit: 1 },
        response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            Alert.alert('Error', response.errorMessage || 'Could not pick that image.');
            return;
          }
          const asset = (response.assets || [])[0];
          if (!asset?.uri) {
            Alert.alert('Error', 'That image could not be read. Please pick another.');
            return;
          }
          setBannerAsset(asset);
          setBannerPreview(asset.uri);
        },
      );
    } catch (err) {
      console.warn('Native module call safely caught:', err);
    }
  };

  const handleSave = async () => {
    const title = (form.title || '').trim();
    const startAt = parseDateInput(form.startAt);

    if (!title) return Alert.alert('Missing field', 'A title is required.');
    if (!startAt) return Alert.alert('Invalid date', `Enter the start date as ${DATE_HINT}.`);

    const fields: Record<string, string> = {
      title,
      description: (form.description || '').trim(),
      startAt: startAt.toISOString(),
      venue: (form.venue || '').trim(),
      state: (form.state || '').trim(),
    };

    setSaving(true);
    try {
      let body: any = fields;
      let config: any = undefined;

      if (bannerAsset?.uri) {
        const multipart = new FormData();
        Object.entries(fields).forEach(([key, value]) => multipart.append(key, value));
        multipart.append('banner', {
          uri: bannerAsset.uri,
          type: bannerAsset.type || 'image/jpeg',
          name: bannerAsset.fileName || 'event-banner.jpg',
        } as any);
        body = multipart;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }

      if (editingId) await api.put(`/events/${editingId}`, body, config);
      else await api.post('/events', body, config);

      closeEditor();
      fetchEvents(true);
    } catch (err: any) {
      Alert.alert('Could not save', err?.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (event: EventRow) => {
    const next = event?.status === 'published' ? 'draft' : 'published';
    setBusyId(event?.id || '');
    try {
      await api.patch(`/events/${event?.id}/status`, { status: next });
      setEvents(prev => (prev || []).map(row => (row.id === event?.id ? { ...row, status: next } : row)));
    } catch (err: any) {
      Alert.alert('Could not update', err?.response?.data?.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (event: EventRow) => {
    Alert.alert('Delete event', `“${event?.title || 'This event'}” will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(event?.id || '');
          try {
            await api.delete(`/events/${event?.id}`);
            setEvents(prev => (prev || []).filter(row => row.id !== event?.id));
          } catch (err: any) {
            Alert.alert('Could not delete', err?.response?.data?.message || 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const visibleEvents = (events || []).filter(e => filter === 'all' || e?.status === filter);

  const keyExtractor = useCallback(
    (item: EventRow, index: number) => String(item?.id || index),
    [],
  );

  const renderItem = useCallback(({ item }: { item: EventRow }) => {
    const busy = busyId === item?.id;
    const published = item?.status === 'published';
    const banner = resolveMediaUrl(item?.bannerUrl);

    return (
      <View style={styles.eventCard}>
        {banner ? <Image source={{ uri: banner }} style={styles.banner} resizeMode="cover" /> : null}

        <View style={styles.eventBody}>
          <View style={styles.eventHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.eventTitle} numberOfLines={2}>{item?.title || 'Untitled event'}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: published ? ACCENTS.lightGreen : SUPER.field },
            ]}>
              <Icon
                name={published ? 'campaign' : 'edit'}
                size={12}
                color={published ? ACCENTS.green : SUPER.textMuted}
              />
              <Text style={[
                styles.statusBadgeText,
                { color: published ? ACCENTS.green : SUPER.textMuted },
              ]}>
                {published ? 'Live' : 'Draft'}
              </Text>
            </View>
          </View>

          <View style={styles.eventMetaRow}>
            <View style={styles.metaItem}>
              <Icon name="event" size={14} color={SUPER.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{formatDate(item?.startAt) || 'No date'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="place" size={14} color={SUPER.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item?.venue || item?.state || 'Everywhere'}
              </Text>
            </View>
          </View>

          {item?.description ? (
            <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.eventActions}>
            <TouchableOpacity
              style={[
                superStyles.reviewBtn,
                { backgroundColor: published ? SUPER.field : ACCENTS.lightGreen },
              ]}
              onPress={() => togglePublish(item)}
              disabled={busy}
              activeOpacity={0.7}
            >
              {busy ? (
                <ActivityIndicator size="small" color={published ? SUPER.textMuted : ACCENTS.green} />
              ) : (
                <>
                  <Icon
                    name={published ? 'visibility-off' : 'campaign'}
                    size={16}
                    color={published ? SUPER.textMuted : ACCENTS.green}
                  />
                  <Text style={[
                    styles.eventActionText,
                    { color: published ? SUPER.textMuted : ACCENTS.green },
                  ]}>
                    {published ? 'Unpublish' : 'Publish'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[superStyles.reviewBtn, { backgroundColor: ACCENTS.lightPurple }]}
              onPress={() => openEdit(item)}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={16} color={ACCENTS.purple} />
              <Text style={[styles.eventActionText, { color: ACCENTS.purple }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Icon name="delete-outline" size={18} color={ACCENTS.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [busyId]);

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    multiline = false,
  ) => (
    <View style={styles.formField}>
      <Text style={superStyles.label}>{label}</Text>
      <TextInput
        style={[superStyles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor={SUPER.textFaint}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        autoCorrect={false}
      />
    </View>
  );

  const renderEditor = () => (
    <View style={superStyles.formCard}>
      <Text style={styles.formTitle}>{editingId ? 'Edit event' : 'New event'}</Text>

      <TouchableOpacity style={styles.bannerPicker} onPress={pickBanner} activeOpacity={0.85}>
        {bannerPreview ? (
          <Image source={{ uri: bannerPreview }} style={styles.bannerPreview} resizeMode="cover" />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Icon name="add-photo-alternate" size={26} color={ACCENTS.purple} />
            <Text style={styles.bannerPlaceholderText}>Add a banner image</Text>
          </View>
        )}
      </TouchableOpacity>

      {renderInput('Title', form.title, v => setField('title', v), 'Annual members meet')}
      {renderInput('Starts', form.startAt, v => setField('startAt', v), DATE_HINT)}
      {renderInput('Venue (optional)', form.venue, v => setField('venue', v), 'Where it takes place')}
      {renderInput('State (optional)', form.state, v => setField('state', v), 'Leave empty for every state')}
      {renderInput('Description (optional)', form.description, v => setField('description', v),
        'What is happening, and who should attend', true)}

      <Text style={styles.formNote}>
        New events are saved as a draft. Publish when it is ready for members to see.
      </Text>

      <View style={styles.formActions}>
        <TouchableOpacity style={[superStyles.ghostButton, { flex: 1 }]} onPress={closeEditor} activeOpacity={0.8}>
          <Text style={superStyles.ghostButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[superStyles.primaryButton, { flex: 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={superStyles.primaryButtonText}>
              {editingId ? 'Save changes' : 'Create event'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const listEmpty = () => {
    if (loading) return <SkeletonList count={3} />;
    if (error) {
      return <EmptyState icon="cloud-off" accentIcon="refresh" tone="error" title={error} caption="Pull down to try again." />;
    }
    return (
      <EmptyState
        icon="event"
        accentIcon="add"
        title="No events yet"
        caption="Tap “Add” to create the first one."
      />
    );
  };

  return (
    <SafeAreaView style={superStyles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SUPER.bg} />

      <View style={superStyles.pageHeader}>
        <TouchableOpacity style={superStyles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={SUPER.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={superStyles.pageTitle}>Events</Text>
          <Text style={superStyles.pageSubtitle}>
            {(events || []).filter(e => e?.status === 'published').length} live · {(events || []).length} total
          </Text>
        </View>
        <TouchableOpacity
          style={[superStyles.actionBtn, editorOpen && styles.actionBtnCancel]}
          onPress={() => (editorOpen ? closeEditor() : openCreate())}
          activeOpacity={0.8}
        >
          <Icon name={editorOpen ? 'close' : 'add'} size={16} color="#FFFFFF" />
          <Text style={superStyles.actionBtnText}>{editorOpen ? 'Close' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsWrap}>
        <View style={superStyles.tabsRow}>
          {STATUS_TABS.map(tab => {
            const isActive = filter === tab.key;
            const count = tab.key === 'all'
              ? (events || []).length
              : (events || []).filter(e => e?.status === tab.key).length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[superStyles.tabPillText, isActive && superStyles.tabPillTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visibleEvents}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={superStyles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        /* Inline expandable editor — never a native Modal inside a tab. */
        ListHeaderComponent={editorOpen ? renderEditor() : null}
        ListEmptyComponent={listEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchEvents(true)} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 16 },
  actionBtnCancel: { backgroundColor: SUPER.textMuted },

  formTitle: { fontSize: 18, fontWeight: '700', color: SUPER.text, marginBottom: 4 },
  formField: { marginBottom: 14 },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  formNote: { fontSize: 12, color: SUPER.textFaint, lineHeight: 17, marginBottom: 16 },
  formActions: { flexDirection: 'row', gap: 12 },

  bannerPicker: {
    marginTop: 16, marginBottom: 16, height: 140, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: SUPER.borderStrong, borderStyle: 'dashed',
    backgroundColor: ACCENTS.lightPurple,
  },
  bannerPreview: { width: '100%', height: '100%' },
  bannerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bannerPlaceholderText: { fontSize: 13, fontWeight: '600', color: ACCENTS.purple },

  eventCard: {
    backgroundColor: SUPER.card, borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  banner: { width: '100%', height: 140 },
  eventBody: { padding: 16 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: SUPER.text, lineHeight: 22 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 13, color: SUPER.textMuted },

  eventDescription: {
    fontSize: 13, color: SUPER.textMuted, lineHeight: 19, marginBottom: 16,
    borderTopWidth: 1, borderTopColor: SUPER.border, paddingTop: 12,
  },

  eventActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventActionText: { fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENTS.lightRed,
  },
});

export default ManageEventsScreen;
