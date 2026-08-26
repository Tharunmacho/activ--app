import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { STORAGE_KEYS } from '../../../services/api';
import { resolveMediaUrl } from '../../../config/api.config';
import { useSuperAdminData } from './context/SuperAdminContext';
import { useSuperAdminBack } from './useSuperAdminBack';
import { SUPER, ACCENTS, superStyles, getInitials } from './superTheme';
import { SkeletonList } from './components/Skeleton';
import EmptyState from './components/EmptyState';

type Category = 'all' | 'application' | 'admin' | 'event';

interface AuditEntry {
  id: string;
  action: string;
  category: string;
  summary: string;
  actorName: string;
  actorEmail: string;
  actorRoleLabel: string;
  proxy: boolean;
  targetLabel: string;
  location: string;
  createdAt: string | null;
}

const CATEGORY_TABS: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'application', label: 'Apps' },
  { key: 'admin', label: 'Admins' },
  { key: 'event', label: 'Events' },
];

const ACTION_ICON: Record<string, { icon: string; fg: string; bg: string }> = {
  'application.approved': { icon: 'check-circle', fg: ACCENTS.green, bg: ACCENTS.lightGreen },
  'application.rejected': { icon: 'cancel', fg: ACCENTS.red, bg: ACCENTS.lightRed },
  'admin.created': { icon: 'person-add', fg: ACCENTS.purple, bg: ACCENTS.lightPurple },
  'admin.updated': { icon: 'edit', fg: ACCENTS.orange, bg: ACCENTS.lightOrange },
  'admin.deleted': { icon: 'person-remove', fg: ACCENTS.red, bg: ACCENTS.lightRed },
  'event.created': { icon: 'event', fg: ACCENTS.purple, bg: ACCENTS.lightPurple },
  'event.published': { icon: 'campaign', fg: ACCENTS.green, bg: ACCENTS.lightGreen },
  'event.unpublished': { icon: 'visibility-off', fg: SUPER.textMuted, bg: SUPER.field },
  'event.deleted': { icon: 'delete-outline', fg: ACCENTS.red, bg: ACCENTS.lightRed },
};

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 350;

/** `22 Aug 2026, 14:30` — the audit stream needs the time, not just the day. */
const formatStamp = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Settings: the profile card and sign-out the tier admins have, plus the audit
 * log — the record of who approved, rejected or deleted what.
 */
const SystemScreen = ({ navigation }: any) => {
  const {
    adminName, adminEmail, adminPhone, updateAdminProfile,
    adminProfilePhoto, setAdminProfilePhoto, stats,
  } = useSuperAdminData();

  // Profile editing, matching the tier admins' settings screens field for field.
  // The one difference is that there is no region input: a super admin is not
  // geofenced, so there is nothing here to scope them to.
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameInput, setNameInput] = useState(adminName);
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [phoneInput, setPhoneInput] = useState(adminPhone);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [revealed, setRevealed] = useState<{ [label: string]: boolean }>({});

  useEffect(() => {
    setNameInput(adminName);
    setEmailInput(adminEmail);
    setPhoneInput(adminPhone);
  }, [adminName, adminEmail, adminPhone]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    let changed = 0;
    try {
      if (nameInput !== adminName || emailInput !== adminEmail || phoneInput !== adminPhone) {
        await api.put('/admin/profile', {
          fullName: nameInput,
          email: emailInput,
          phoneNumber: (phoneInput || '').trim(),
        });
        updateAdminProfile(nameInput, emailInput, (phoneInput || '').trim());
        changed += 1;
      }

      if (newPassword) {
        if (!oldPassword) {
          Alert.alert('Validation Error', 'Provide your current password to set a new one.');
          setIsSaving(false);
          return;
        }
        await api.post('/auth/change-password', { oldPassword, newPassword });
        setOldPassword('');
        setNewPassword('');
        changed += 1;
      }

      if (changed > 0) Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
      setRevealed({});
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  /** Same field renderer as the tier screens, with the password reveal toggle. */
  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    options: { secure?: boolean; keyboard?: any; capitalize?: any } = {},
  ) => {
    const shown = !!options.secure && !!revealed[label];
    return (
      <View style={styles.inputContainer} key={label}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.inputField, styles.inputFlex, options.secure && styles.inputWithIcon]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={SUPER.textFaint}
            secureTextEntry={!!options.secure && !shown}
            keyboardType={options.keyboard || 'default'}
            autoCapitalize={options.capitalize || 'words'}
            autoCorrect={false}
            editable={isEditing}
          />
          {options.secure ? (
            <TouchableOpacity
              style={styles.revealBtn}
              onPress={() => setRevealed(prev => ({ ...prev, [label]: !prev[label] }))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            >
              <Icon name={shown ? 'visibility-off' : 'visibility'} size={20} color={SUPER.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const [tab, setTab] = useState<'audit' | 'profile'>('profile');
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const params = useMemo(
    () => ({ category, q: (debouncedQuery || '').trim(), limit: PAGE_SIZE }),
    [category, debouncedQuery],
  );

  const fetchPage = useCallback(async (nextPage: number, mode: 'replace' | 'append' | 'refresh') => {
    if (mode === 'append') setLoadingMore(true);
    else if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);

    try {
      const [logResponse, countResponse] = await Promise.all([
        api.get('/audit', { params: { ...params, page: nextPage } }),
        nextPage === 1 ? api.get('/audit/counts').catch(() => null) : Promise.resolve(null),
      ]);

      const payload = logResponse.data?.data || logResponse.data || {};
      const rows: AuditEntry[] = payload.entries || [];
      const pagination = payload.pagination || {};

      setEntries(prev => (mode === 'append' ? [...(prev || []), ...rows] : rows));
      setPage(Number(pagination.page || nextPage));
      setPages(Number(pagination.pages || 1));
      setTotal(Number(pagination.total || rows.length));
      if (countResponse) setCounts(countResponse.data?.data || countResponse.data || {});
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load the audit log');
      if (mode !== 'append') setEntries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => {
    if (tab === 'audit') fetchPage(1, 'replace');
  }, [tab, fetchPage]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.AUTH_TOKEN,
              STORAGE_KEYS.USER_DATA,
              STORAGE_KEYS.USER_ROLE,
            ]);
          } catch {
            // A storage failure must not trap the admin in the console.
          }
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }, [navigation]);

  const keyExtractor = useCallback(
    (item: AuditEntry, index: number) => String(item?.id || index),
    [],
  );

  const renderItem = useCallback(({ item }: { item: AuditEntry }) => {
    const tone = ACTION_ICON[item?.action] || { icon: 'history', fg: SUPER.textMuted, bg: SUPER.field };
    return (
      <View style={styles.entryCard}>
        <View style={[styles.entryIcon, { backgroundColor: tone.bg }]}>
          <Icon name={tone.icon} size={18} color={tone.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.entrySummary}>{item?.summary || item?.action || 'Action recorded'}</Text>
          <View style={styles.entryMetaRow}>
            <Icon name="person" size={12} color={SUPER.textFaint} />
            <Text style={styles.entryMeta} numberOfLines={1}>
              {[item?.actorName, item?.location].filter(Boolean).join(' · ') || 'Unknown actor'}
            </Text>
          </View>
          <View style={styles.entryFooter}>
            <Icon name="schedule" size={12} color={SUPER.textFaint} />
            <Text style={styles.entryStamp}>{formatStamp(item?.createdAt) || 'Unknown time'}</Text>
            {item?.proxy ? (
              <View style={styles.proxyTag}><Text style={styles.proxyTagText}>Proxy</Text></View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }, []);

  const listFooter = () => {
    if (loadingMore) return <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={ACCENTS.purple} />;
    if (page < pages) {
      return (
        <TouchableOpacity
          style={[superStyles.ghostButton, { marginBottom: 16 }]}
          onPress={() => fetchPage(page + 1, 'append')}
          activeOpacity={0.8}
        >
          <Text style={superStyles.ghostButtonText}>Load more</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const listEmpty = () => {
    if (loading) return <SkeletonList count={5} />;
    if (error) {
      return <EmptyState icon="cloud-off" accentIcon="refresh" tone="error" title={error} caption="Pull down to try again." />;
    }
    return (
      <EmptyState
        icon="history"
        accentIcon="visibility"
        title="Nothing recorded yet"
        caption="Approvals, rejections and admin changes appear here as they happen."
      />
    );
  };

  /**
   * Unwind what is open, innermost first: an in-progress profile edit, then the
   * audit tab, then the tab itself. Backing out of an edit discards it rather
   * than saving — the same as the Cancel path — so back is never a silent write.
   */
  const goBack = useSuperAdminBack(
    useCallback(() => {
      if (isEditing) {
        setIsEditing(false);
        setOldPassword('');
        setNewPassword('');
        setRevealed({});
        setNameInput(adminName);
        setEmailInput(adminEmail);
        setPhoneInput(adminPhone);
        return true;
      }
      if (tab !== 'profile') {
        setTab('profile');
        return true;
      }
      return false;
    }, [isEditing, tab, adminName, adminEmail, adminPhone]),
  );

  const handlePhotoUpload = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      
      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'profile.jpg',
      } as any);

      setUploading(true);
      const res = await api.post('/admin/super/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success && res.data.data.profilePhoto) {
        setAdminProfilePhoto(res.data.data.profilePhoto);
        Alert.alert('Success', 'Profile photo updated successfully');
      } else {
        throw new Error('Failed to update profile photo');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const renderProfile = () => (
    <View style={styles.profileScroll}>
      {/* Profile card, matching the tier admins' settings screen. */}
      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.avatarLarge} onPress={handlePhotoUpload} disabled={uploading}>
          {adminProfilePhoto ? (
            <Image 
              source={{ uri: resolveMediaUrl(adminProfilePhoto) }} 
              style={{ width: '100%', height: '100%', borderRadius: 999 }} 
            />
          ) : (
            <Text style={styles.avatarLargeText}>{getInitials(adminName)}</Text>
          )}
          
          <View style={styles.cameraIconBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Icon name="camera-alt" size={14} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{adminName || 'Super Admin'}</Text>
          <Text style={styles.profileRole}>Super Admin</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{adminEmail || 'No email on this account'}</Text>
        </View>
      </View>

      <View style={superStyles.formCard}>
        <View style={styles.formHeaderRow}>
          <Text style={styles.menuSectionTitle}>Profile Information</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>}
          </TouchableOpacity>
        </View>

        {renderField('Full Name', nameInput, setNameInput, 'Enter your name')}
        {renderField('Email Address', emailInput, setEmailInput, 'Enter your email', {
          keyboard: 'email-address', capitalize: 'none',
        })}
        {renderField('Mobile Number', phoneInput, setPhoneInput, 'Enter your mobile number', {
          keyboard: 'phone-pad',
        })}

        {isEditing ? (
          <>
            {renderField('Current Password', oldPassword, setOldPassword, 'Enter current password', {
              secure: true, capitalize: 'none',
            })}
            {renderField('New Password', newPassword, setNewPassword, 'Leave blank to keep', {
              secure: true, capitalize: 'none',
            })}
          </>
        ) : null}
      </View>

      <View style={superStyles.formCard}>
        <Text style={styles.menuSectionTitle}>Platform</Text>
        {[
          { icon: 'groups', label: 'Total members', value: stats.totalMembers, color: ACCENTS.purple, light: ACCENTS.lightPurple },
          { icon: 'description', label: 'Applications', value: stats.totalApplications, color: ACCENTS.orange, light: ACCENTS.lightOrange },
          { icon: 'admin-panel-settings', label: 'Admin accounts', value: stats.totalAdmins, color: ACCENTS.green, light: ACCENTS.lightGreen },
        ].map((row, index, all) => (
          <View
            key={row.label}
            style={[styles.summaryRow, index === all.length - 1 && styles.summaryRowLast]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: row.light }]}>
              <Icon name={row.icon} size={18} color={row.color} />
            </View>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={[styles.summaryValue, { color: row.color }]}>{Number(row.value || 0)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Icon name="logout" size={20} color={ACCENTS.red} />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={superStyles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SUPER.bg} />

      <View style={superStyles.pageHeader}>
        <TouchableOpacity style={superStyles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={SUPER.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={superStyles.pageTitle}>Settings</Text>
          <Text style={superStyles.pageSubtitle}>
            {tab === 'audit' ? `${total} recorded actions` : 'Profile and system log'}
          </Text>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        <View style={superStyles.tabsRow}>
          {(['profile', 'audit'] as const).map(key => {
            const isActive = tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                onPress={() => setTab(key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[superStyles.tabPillText, isActive && superStyles.tabPillTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {key === 'profile' ? 'Profile' : 'Audit Log'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'profile' ? (
        <FlatList
          data={[]}
          keyExtractor={keyExtractor}
          renderItem={() => null}
          contentContainerStyle={superStyles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderProfile()}
        />
      ) : (
        <>
          <View style={superStyles.searchBar}>
            <Icon name="search" size={20} color={SUPER.textFaint} />
            <TextInput
              style={superStyles.searchInput}
              placeholder="Who did what — name, email or applicant"
              placeholderTextColor={SUPER.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color={SUPER.textFaint} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.tabsWrap}>
            <View style={superStyles.tabsRow}>
              {CATEGORY_TABS.map(item => {
                const isActive = category === item.key;
                const count = item.key === 'all' ? counts.all : counts[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                    onPress={() => setCategory(item.key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[superStyles.tabPillText, isActive && superStyles.tabPillTextActive]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {item.label}{count !== undefined ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <FlatList
            data={entries || []}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={superStyles.listContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPage(1, 'refresh')} />}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 16 },
  profileScroll: { paddingTop: 4 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENTS.lightPurple,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36, marginRight: 16,
    backgroundColor: ACCENTS.purple, justifyContent: 'center', alignItems: 'center',
  },
  avatarLargeText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -1 },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ACCENTS.purple,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: SUPER.text, marginBottom: 2 },
  profileRole: { fontSize: 13, color: ACCENTS.purple, fontWeight: '500', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: SUPER.textMuted },

  menuSectionTitle: { fontSize: 15, fontWeight: '700', color: SUPER.text, marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SUPER.border,
  },
  summaryRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { flex: 1, fontSize: 14, color: SUPER.textMuted, fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '800' },

  formHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  editBtn: {
    backgroundColor: ACCENTS.purple, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10, minWidth: 72, alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  inputContainer: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: SUPER.textMuted, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputField: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: SUPER.borderStrong,
    backgroundColor: '#FBFCFE', paddingHorizontal: 14, fontSize: 14, color: SUPER.text,
  },
  inputFlex: { flex: 1 },
  inputWithIcon: { paddingRight: 44 },
  revealBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 44, alignItems: 'center', justifyContent: 'center',
  },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ACCENTS.lightRed, borderRadius: 16, paddingVertical: 16, marginBottom: 16,
  },
  logoutBtnText: { fontSize: 15, fontWeight: '600', color: ACCENTS.red },

  entryCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: SUPER.card, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  entryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entrySummary: { fontSize: 14, fontWeight: '600', color: SUPER.text, lineHeight: 20 },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  entryMeta: { flex: 1, fontSize: 12, color: SUPER.textMuted },
  entryFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  entryStamp: { fontSize: 11, color: SUPER.textFaint },
  proxyTag: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: ACCENTS.lightOrange, marginLeft: 4,
  },
  proxyTagText: { fontSize: 10, fontWeight: '700', color: ACCENTS.orange },
});

export default SystemScreen;
