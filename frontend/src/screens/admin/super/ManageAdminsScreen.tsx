import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../../services/api';
import { getGeography, invalidateRegionCache } from '../../../services/regions';
import { SUPER, ACCENTS, superStyles, getInitials } from './superTheme';
import { SkeletonList } from './components/Skeleton';
import EmptyState from './components/EmptyState';
import RegionInput from './components/RegionInput';
import { useSuperAdminBack } from './useSuperAdminBack';

type AdminRole = 'block_admin' | 'district_admin' | 'state_admin';
type RoleFilter = 'all' | AdminRole;

interface AdminRow {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  roleLabel: string;
  state: string;
  district: string;
  block: string;
  active: boolean;
  /** Other active admins covering this exact region — they share one queue. */
  coAdmins?: number;
  parentAdminId?: string;
}

/**
 * Region names the form offers.
 *
 * `states` / `districts` / `blocks` are already staffed — picking one joins that
 * region. `reference*` are names from the India reference that nobody staffs
 * yet — picking one creates the region.
 */
interface RegionSuggestions {
  states: string[];
  districts: string[];
  blocks: string[];
  referenceStates: string[];
  referenceDistricts: string[];
  referenceBlocks: string[];
}

const EMPTY_SUGGESTIONS: RegionSuggestions = {
  states: [], districts: [], blocks: [],
  referenceStates: [], referenceDistricts: [], referenceBlocks: [],
};

/** Region names the Super Admin added with "+" and has not saved yet. */
interface AddedRegions {
  state: string[];
  district: string[];
  block: string[];
}

const EMPTY_ADDED: AddedRegions = { state: [], district: [], block: [] };

/** What removing an admin would do to the applications they were holding. */
interface RemovalPreview {
  affected: number;
  escalatesToLabel: string;
  remainingAdmins: number;
  children: number;
}

// Ordered most-senior first, so the categorised list reads top-down the way the
// hierarchy actually works.
const TIERS: { key: AdminRole; label: string; plural: string; icon: string; color: string; light: string }[] = [
  { key: 'state_admin', label: 'State', plural: 'State Admins', icon: 'public', color: ACCENTS.green, light: ACCENTS.lightGreen },
  { key: 'district_admin', label: 'District', plural: 'District Admins', icon: 'map', color: ACCENTS.orange, light: ACCENTS.lightOrange },
  { key: 'block_admin', label: 'Block', plural: 'Block Admins', icon: 'location-city', color: ACCENTS.purple, light: ACCENTS.lightPurple },
];

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'block_admin', label: 'Block' },
  { key: 'district_admin', label: 'District' },
  { key: 'state_admin', label: 'State' },
];

const EMPTY_FORM = {
  role: 'block_admin' as AdminRole,
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  state: '',
  district: '',
  block: '',
};

/** Which region fields each tier owns. Anything below its tier is not stored. */
const REGION_FIELDS: Record<AdminRole, ('state' | 'district' | 'block')[]> = {
  state_admin: ['state'],
  district_admin: ['state', 'district'],
  block_admin: ['state', 'district', 'block'],
};

type FormState = typeof EMPTY_FORM;

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Staff management: every admin on the platform, grouped by tier, with create,
 * edit and hard delete.
 */
const ManageAdminsScreen = ({ route }: any) => {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Region name suggestions. Not constraints — every region field is free text.
  const [suggestions, setSuggestions] = useState<RegionSuggestions>(EMPTY_SUGGESTIONS);

  /**
   * Region names added with "+" on the open form, per level.
   *
   * They live only as long as the form does. Once the admin is saved the server
   * knows the region, and the next form gets it back in `suggestions.states` /
   * `.districts` / `.blocks` as a real, staffed region.
   */
  const [added, setAdded] = useState<AddedRegions>(EMPTY_ADDED);

  /** Which secure fields are currently unmasked, keyed by their label. */
  const [revealedFields, setRevealedFields] = useState<{ [label: string]: boolean }>({});

  // A name handed over from the Hub's search bar.
  const incomingQuery = route?.params?.q;
  useEffect(() => {
    if (typeof incomingQuery === 'string' && incomingQuery) setQuery(incomingQuery);
  }, [incomingQuery]);

  const listRef = useRef<SectionList>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const params = useMemo(
    () => ({ role: roleFilter, q: (debouncedQuery || '').trim() }),
    [roleFilter, debouncedQuery],
  );

  const fetchAdmins = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/admin/super/admins', { params });
      const payload = response.data?.data || response.data || {};
      setAdmins(payload.admins || []);
      setCounts(payload.counts || {});
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Same reason as the Hub: bottom tabs stay mounted, so without this the list
  // and its per-tier counts are whatever they were when the tab was first
  // opened. Deleting an admin from another screen would leave a ghost row here.
  useFocusEffect(
    useCallback(() => {
      fetchAdmins(true);
    }, [fetchAdmins]),
  );

  /**
   * Load the suggestion lists, re-scoped whenever the parent region changes.
   *
   * Debounced because the state and district fields are free text: without it
   * every keystroke in "Tamil Nadu" fires a request. The lists are only
   * suggestions, so being a moment behind the input costs nothing.
   */
  useEffect(() => {
    if (mode === 'idle') {
      setSuggestions(EMPTY_SUGGESTIONS);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      api.get('/admin/super/admins/regions', {
        params: { state: form.state || '', district: form.district || '' },
      })
        .then(response => {
          if (cancelled) return;
          const payload = response.data?.data || response.data || {};
          setSuggestions({ ...EMPTY_SUGGESTIONS, ...payload });
        })
        .catch(() => {
          // Suggestions are a convenience. Losing them must not block a save,
          // because the fields work perfectly well as plain text.
          if (!cancelled) setSuggestions(EMPTY_SUGGESTIONS);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, form.state, form.district]);

  // Categorised by tier. Empty tiers are dropped so the list never shows a
  // heading with nothing beneath it.
  const sections = useMemo(() => TIERS
    .map(tier => ({
      key: tier.key,
      title: tier.plural,
      icon: tier.icon,
      color: tier.color,
      light: tier.light,
      data: (admins || []).filter(a => a?.role === tier.key),
    }))
    .filter(section => section.data.length > 0),
  [admins]);

  const setField = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  /**
   * Changing the tier drops the region fields the new tier does not own.
   *
   * State and district are kept when the new tier still uses them — moving a
   * block admin up to district admin should not make the super admin retype the
   * state they already entered. Only the now-meaningless fields are cleared, so
   * nothing is silently stored that the tier has no use for.
   */
  const setRole = (role: AdminRole) =>
    setForm(prev => {
      const owned = REGION_FIELDS[role];
      return {
        ...prev,
        role,
        state: owned.includes('state') ? prev.state : '',
        district: owned.includes('district') ? prev.district : '',
        block: owned.includes('block') ? prev.block : '',
      };
    });

  /**
   * Renaming a parent region clears its children.
   *
   * Moving from "Ariyalur" to "Kollam" leaves the previously selected district
   * belonging to a state it is not in. Clearing is the honest response; silently
   * keeping it would create a district under the wrong state.
   */
  const setRegionField = (field: 'state' | 'district' | 'block', value: string) => {
    setForm(prev => {
      if (field === 'state') return { ...prev, state: value, district: '', block: '' };
      if (field === 'district') return { ...prev, district: value, block: '' };
      return { ...prev, block: value };
    });

    // Names added below the level that just changed belonged to the old parent.
    // A block typed under Ariyalur must not still be offered once the district
    // is something else — it would attach a real admin to the wrong region.
    if (field === 'state') setAdded(prev => ({ ...prev, district: [], block: [] }));
    if (field === 'district') setAdded(prev => ({ ...prev, block: [] }));
  };

  /**
   * Add a name to a dropdown without leaving the form.
   *
   * The India reference is thorough but not complete, and a region can be new
   * outright. Rather than making the Super Admin trust that free text survives
   * the save, "+" puts the name in the list straight away: it is visibly an
   * option, and the second admin for that region picks it instead of retyping
   * it. Nothing is written to the server here — the account's save is what
   * creates the region for real.
   */
  const addRegionOption = (field: 'state' | 'district' | 'block', name: string) => {
    const value = String(name || '').trim();
    if (!value) return;
    setAdded(prev => {
      const current = prev[field] || [];
      const exists = current.some(item => String(item || '').toLowerCase() === value.toLowerCase());
      return exists ? prev : { ...prev, [field]: [...current, value] };
    });
  };

  /**
   * Undo a "+", removing the name from the dropdown again.
   *
   * Only names added on this form can be removed this way, and nothing has been
   * written yet, so this deletes nothing real — it takes a typo back out of the
   * list before it becomes an account. If the removed name was the one selected,
   * the field is cleared through `setRegionField` so the levels below it go too;
   * leaving a block selected under a district that was just withdrawn would
   * geofence the new admin to a region the form no longer shows.
   */
  const removeRegionOption = (field: 'state' | 'district' | 'block', name: string) => {
    const value = String(name || '').trim();
    if (!value) return;

    setAdded(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(
        item => String(item || '').toLowerCase() !== value.toLowerCase(),
      ),
    }));

    if (String(form[field] || '').trim().toLowerCase() === value.toLowerCase()) {
      setRegionField(field, '');
    }
  };

  const closeForm = () => {
    setMode('idle');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAdded(EMPTY_ADDED);
    setRevealedFields({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, role: roleFilter !== 'all' ? roleFilter : 'block_admin' });
    setAdded(EMPTY_ADDED);
    setRevealedFields({});
    setMode('create');
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
  };

  const openEdit = (admin: AdminRow) => {
    setEditingId(admin?.id || null);
    setForm({
      role: (TIERS.find(t => t.key === admin?.role)?.key) || 'block_admin',
      fullName: admin?.fullName || '',
      email: admin?.email || '',
      phoneNumber: admin?.phoneNumber || '',
      password: '',
      confirmPassword: '',
      state: admin?.state || '',
      district: admin?.district || '',
      block: admin?.block || '',
    });
    setAdded(EMPTY_ADDED);
    setRevealedFields({});
    setMode('edit');
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = async () => {
    const payload = {
      role: form.role,
      fullName: (form.fullName || '').trim(),
      email: (form.email || '').trim().toLowerCase(),
      phoneNumber: (form.phoneNumber || '').trim(),
      state: (form.state || '').trim(),
      district: form.role === 'state_admin' ? '' : (form.district || '').trim(),
      block: form.role === 'block_admin' ? (form.block || '').trim() : '',
      ...(form.password ? { password: form.password } : {}),
    };

    // Checked here as well as on the server so the problem shows immediately.
    if (!payload.fullName) return Alert.alert('Missing field', 'Full name is required.');
    if (!payload.email) return Alert.alert('Missing field', 'Email is required.');
    if (mode === 'create' && (form.password || '').length < 8) {
      return Alert.alert('Weak password', 'Use at least 8 characters.');
    }
    if (form.password && form.password.length < 8) {
      return Alert.alert('Weak password', 'Use at least 8 characters.');
    }
    if (form.password && form.password !== form.confirmPassword) {
      return Alert.alert('Password mismatch', 'The passwords you entered do not match.');
    }

    if (!payload.state) return Alert.alert('Missing field', 'State is required.');
    if (payload.role !== 'state_admin' && !payload.district) {
      return Alert.alert('Missing field', 'District is required for this tier.');
    }
    if (payload.role === 'block_admin' && !payload.block) {
      return Alert.alert('Missing field', 'Block is required for a block admin.');
    }

    setSaving(true);
    try {
      if (mode === 'edit' && editingId) {
        await api.put(`/admin/super/admins/${editingId}`, payload);
        Alert.alert('Changes Saved', `${payload.fullName}'s profile has been successfully updated.`);
      } else {
        const response = await api.post('/admin/super/admins', payload);
        const created = response.data?.data || response.data || {};
        const shared = Number(created?.coAdmins || 0);
        const opened: string[] = created?.regionsCreated || [];

        Alert.alert(
          'Admin created',
          [
            `${payload.fullName} can now sign in with that email.`,
            // The remote-control payoff: say plainly when this save just made a
            // new region selectable for applicants.
            opened.length > 0
              ? `The new ${opened.join(' / ')} is now selectable on the applicant registration form.`
              : '',
            // Load balancing: several admins on one region share a single queue.
            // Saying so up front stops two people quietly reviewing the same file.
            shared > 0
              ? `They share this region's queue with ${shared} other admin${shared === 1 ? '' : 's'}.`
              : '',
          ].filter(Boolean).join('\n\n'),
        );
      }

      // A new or moved admin changes which regions applicants may register into.
      invalidateRegionCache();
      closeForm();
      fetchAdmins(true);
    } catch (err: any) {
      Alert.alert('Could not save', err?.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete, with the consequences shown first.
   *
   * The preview is fetched before the confirmation so the super admin is told
   * how many pending applications are about to change hands and which tier
   * inherits them. Those applications are never lost — orphan fallback routing
   * hands them to the tier above automatically, and hands them back if a
   * replacement is created — but "50 files move to the District tier" is not
   * something anyone should have to infer.
   */
  const handleDelete = async (admin: AdminRow) => {
    setBusyId(admin?.id || '');

    let preview: RemovalPreview | null = null;
    try {
      const response = await api.get(`/admin/super/admins/${admin?.id}/removal-preview`);
      preview = (response.data?.data || response.data || null) as RemovalPreview;
    } catch {
      // A failed preview must not block the delete; it only makes the warning
      // less specific.
      preview = null;
    } finally {
      setBusyId(null);
    }

    const consequences: string[] = [];
    if (preview) {
      if (preview.remainingAdmins > 0) {
        consequences.push(
          `${preview.remainingAdmins} other admin${preview.remainingAdmins === 1 ? '' : 's'} still ` +
          'cover this region, so its queue is unaffected.',
        );
      } else if (preview.affected > 0) {
        consequences.push(
          `${preview.affected} pending application${preview.affected === 1 ? '' : 's'} will escalate ` +
          `to the ${preview.escalatesToLabel} tier until a replacement is created.`,
        );
      } else {
        consequences.push('No region will be left unstaffed, and no pending application is affected.');
      }

      if (preview.children > 0) {
        consequences.push(
          `${preview.children} admin${preview.children === 1 ? '' : 's'} beneath them will be left ` +
          'without a parent at this tier.',
        );
      }
    }

    Alert.alert(
      'Delete permanently',
      `${admin?.fullName || admin?.email} will be erased from the database and can no longer sign in. ` +
      'This cannot be undone.' +
      (consequences.length > 0 ? `\n\n${consequences.join('\n\n')}` : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(admin?.id || '');
            try {
              await api.delete(`/admin/super/admins/${admin?.id}`);
              setAdmins(prev => (prev || []).filter(row => row.id !== admin?.id));
              invalidateRegionCache();
            } catch (err: any) {
              Alert.alert('Could not delete', err?.response?.data?.message || 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  /** An open form is what back closes first; only then does it leave the tab. */
  const goBack = useSuperAdminBack(
    useCallback(() => {
      if (mode !== 'idle') {
        closeForm();
        return true;
      }
      return false;
    }, [mode]),
  );

  const keyExtractor = useCallback(
    (item: AdminRow, index: number) => String(item?.id || item?.email || index),
    [],
  );

  const renderItem = useCallback(({ item }: { item: AdminRow }) => {
    const busy = busyId === item?.id;
    const place = [item?.block, item?.district, item?.state].filter(Boolean).join(', ');

    return (
      <View style={styles.adminCard}>
        <View style={styles.adminHeader}>
          <View style={styles.adminInfoRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(item?.fullName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminName} numberOfLines={1}>{item?.fullName || 'Unnamed admin'}</Text>
              <Text style={styles.adminEmail} numberOfLines={1}>{item?.email || 'No email'}</Text>
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: ACCENTS.lightPurple }]}>
            <Text style={[styles.roleBadgeText, { color: ACCENTS.purple }]}>{item?.roleLabel || 'Admin'}</Text>
          </View>
        </View>

        <View style={styles.adminMetaRow}>
          {place ? (
            <View style={styles.metaItem}>
              <Icon name="location-on" size={13} color={SUPER.textFaint} />
              <Text style={styles.metaText} numberOfLines={1}>{place}</Text>
            </View>
          ) : null}
          {item?.phoneNumber ? (
            <View style={styles.metaItem}>
              <Icon name="phone" size={13} color={SUPER.textFaint} />
              <Text style={styles.metaText} numberOfLines={1}>{item.phoneNumber}</Text>
            </View>
          ) : null}
          {/* Several admins on one region share a single queue. Showing it here
              is what turns an invisible duplication risk into a known team. */}
          {Number(item?.coAdmins || 0) > 0 ? (
            <View style={styles.metaItem}>
              <Icon name="groups" size={13} color={ACCENTS.green} />
              <Text style={[styles.metaText, styles.metaTextShared]} numberOfLines={1}>
                Shared queue with {item.coAdmins} other admin{item.coAdmins === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
          {item?.active === false ? (
            <View style={styles.metaItem}>
              <Icon name="pause-circle-outline" size={13} color={ACCENTS.orange} />
              <Text style={[styles.metaText, styles.metaTextInactive]} numberOfLines={1}>
                Deactivated — their region's queue has escalated
              </Text>
            </View>
          ) : null}
          <View style={superStyles.actionButtonsRow}>
            <TouchableOpacity onPress={() => openEdit(item)} style={{ flex: 1 }}>
              <View style={[superStyles.outlineBtn, superStyles.outlineBtnEdit]}>
                <Icon name="edit" size={16} color={ACCENTS.purple} />
                <Text style={superStyles.outlineBtnEditText}>Edit</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} disabled={busy} style={{ flex: 1 }}>
              <View style={[superStyles.outlineBtn, superStyles.outlineBtnDelete]}>
                {busy ? (
                  <ActivityIndicator size="small" color={ACCENTS.red} />
                ) : (
                  <>
                    <Icon name="delete-outline" size={16} color={ACCENTS.red} />
                    <Text style={superStyles.outlineBtnDeleteText}>Delete</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [busyId]);

  const renderSectionHeader = useCallback(({ section }: any) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: section?.light }]}>
        <Icon name={section?.icon} size={16} color={section?.color} />
      </View>
      <Text style={styles.sectionTitle}>{section?.title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{(section?.data || []).length}</Text>
      </View>
    </View>
  ), []);

  /**
   * A secure field is rendered with a reveal toggle.
   *
   * The Super Admin is typing a password *for somebody else* and then has to
   * pass it on, so being unable to check what was typed is worse than the usual
   * shoulder-surfing trade-off — a mistyped character is only discovered when
   * that person cannot sign in. It starts masked and is per-field, so opening
   * one does not unmask another.
   */
  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    options: { secure?: boolean; keyboard?: any; capitalize?: any } = {},
  ) => {
    const revealed = !!options.secure && !!revealedFields[label];

    return (
      <View style={styles.formField}>
        <Text style={superStyles.label}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[superStyles.input, styles.inputFlex, options.secure && styles.inputWithIcon]}
            placeholder={placeholder}
            placeholderTextColor={SUPER.textFaint}
            value={value}
            onChangeText={onChange}
            secureTextEntry={!!options.secure && !revealed}
            keyboardType={options.keyboard || 'default'}
            autoCapitalize={options.capitalize || 'words'}
            autoCorrect={false}
          />
          {options.secure ? (
            <TouchableOpacity
              style={styles.revealBtn}
              onPress={() => setRevealedFields(prev => ({ ...prev, [label]: !prev[label] }))}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            >
              <Icon
                name={revealed ? 'visibility-off' : 'visibility'}
                size={20}
                color={SUPER.textFaint}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  /**
   * The create / edit form.
   *
   * Read top to bottom it is the hierarchy itself: pick a tier, pick the admin
   * above you, and everything that admin owns is filled in and locked. The only
   * free-text region on the whole screen is a state admin's state, and that one
   * is picked from the canonical India list rather than typed.
   */
  /**
   * The create / edit form.
   *
   * Every field is editable, region included, on create and on edit alike. The
   * Super Admin types region names directly: an unrecognised name is not an
   * error, it is a new region, and saving makes it selectable on the applicant
   * registration form. That is the remote control this screen is meant to be.
   *
   * Only the region fields the chosen tier owns are shown — a state admin has no
   * district — so nothing is stored that the tier has no use for.
   */
  const renderForm = () => {
    const owned = REGION_FIELDS[form.role];

    return (
      <View style={superStyles.formCard}>
        <Text style={styles.formTitle}>{mode === 'edit' ? 'Edit admin' : 'New admin'}</Text>

        <Text style={[superStyles.label, { marginTop: 16 }]}>Tier</Text>
        <View style={superStyles.tabsRow}>
          {TIERS.map(option => {
            const isActive = form.role === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                onPress={() => setRole(option.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[superStyles.tabPillText, isActive && superStyles.tabPillTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.tierNote}>
          Saved into the <Text style={styles.mono}>{form.role.replace('_admin', '')}admins</Text> collection.
        </Text>

        {owned.includes('state') ? (
          <RegionInput
            label="State"
            value={form.state}
            onChange={value => setRegionField('state', value)}
            inUse={suggestions.states}
            suggested={suggestions.referenceStates}
            extra={added.state}
            onAdd={name => addRegionOption('state', name)}
            onRemove={name => removeRegionOption('state', name)}
            scopeLabel="in India"
            placeholder="Type or pick a state"
          />
        ) : null}

        {owned.includes('district') ? (
          <RegionInput
            label="District"
            value={form.district}
            onChange={value => setRegionField('district', value)}
            inUse={suggestions.districts}
            suggested={suggestions.referenceDistricts}
            extra={added.district}
            onAdd={name => addRegionOption('district', name)}
            onRemove={name => removeRegionOption('district', name)}
            scopeLabel={form.state ? `in ${form.state}` : ''}
            placeholder={form.state ? `A district in ${form.state}` : 'Pick the state first'}
            disabled={!form.state}
          />
        ) : null}

        {owned.includes('block') ? (
          <RegionInput
            label="Block"
            value={form.block}
            onChange={value => setRegionField('block', value)}
            inUse={suggestions.blocks}
            suggested={suggestions.referenceBlocks}
            extra={added.block}
            onAdd={name => addRegionOption('block', name)}
            onRemove={name => removeRegionOption('block', name)}
            scopeLabel={form.district ? `in ${form.district}` : ''}
            placeholder={form.district ? `A block in ${form.district}` : 'Pick the district first'}
            disabled={!form.district}
          />
        ) : null}

        {renderInput('Full Name', form.fullName, v => setField('fullName', v), 'Jane Doe')}
        {renderInput('Email Address', form.email, v => setField('email', v), 'name@activ.com', {
          keyboard: 'email-address', capitalize: 'none',
        })}
        {renderInput('Phone (optional)', form.phoneNumber, v => setField('phoneNumber', v), '9876543210', {
          keyboard: 'phone-pad',
        })}
        {renderInput(
          mode === 'edit' ? 'New Password (leave blank to keep)' : 'Password',
          form.password,
          v => setField('password', v),
          'At least 8 characters',
          { secure: true, capitalize: 'none' },
        )}

        {(mode === 'create' || form.password.length > 0) ? renderInput(
          'Confirm Password',
          form.confirmPassword,
          v => setField('confirmPassword', v),
          'Type the password again',
          { secure: true, capitalize: 'none' },
        ) : null}

        <Text style={styles.formNote}>
          This region is the admin's geofence — they only ever see applications from it. It is also
          what applicants can choose: a region with no admin does not appear on the registration
          form, and a region you add here appears the moment you save.
        </Text>

        <View style={styles.formActions}>
          <TouchableOpacity style={[superStyles.ghostButton, { flex: 1 }]} onPress={closeForm} activeOpacity={0.8}>
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
                {mode === 'edit' ? 'Save changes' : 'Create admin'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const listEmpty = () => {
    if (loading) return <SkeletonList count={4} />;
    if (error) {
      return <EmptyState icon="cloud-off" accentIcon="refresh" tone="error" title={error} caption="Pull down to try again." />;
    }
    return (
      <EmptyState
        icon="badge"
        accentIcon="person-add"
        title="No admins match"
        caption="Tap “Add” to create one for this tier."
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
          <Text style={superStyles.pageTitle}>Admins</Text>
          <Text style={superStyles.pageSubtitle}>{(admins || []).length} accounts on the platform</Text>
        </View>
        <TouchableOpacity
          style={[superStyles.actionBtn, mode !== 'idle' && styles.actionBtnCancel]}
          onPress={() => (mode === 'idle' ? openCreate() : closeForm())}
          activeOpacity={0.8}
        >
          <Icon name={mode === 'idle' ? 'add' : 'close'} size={16} color="#FFFFFF" />
          <Text style={superStyles.actionBtnText}>{mode === 'idle' ? 'Add' : 'Close'}</Text>
        </TouchableOpacity>
      </View>

      <View style={superStyles.searchBar}>
        <Icon name="search" size={20} color={SUPER.textFaint} />
        <TextInput
          style={superStyles.searchInput}
          placeholder="Name, email or region"
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
          {ROLE_TABS.map(tab => {
            const isActive = roleFilter === tab.key;
            const count = counts[tab.key] || 0;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                onPress={() => setRoleFilter(tab.key)}
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

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={superStyles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        /* Inline expandable form — never a native Modal inside a tab. */
        ListHeaderComponent={mode !== 'idle' ? renderForm() : null}
        ListEmptyComponent={listEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAdmins(true)} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1 },
  inputWithIcon: { paddingRight: 44 },
  revealBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 44, alignItems: 'center', justifyContent: 'center',
  },
  tabsWrap: { paddingHorizontal: 16 },
  actionBtnCancel: { backgroundColor: SUPER.textMuted },

  formTitle: { fontSize: 18, fontWeight: '700', color: SUPER.text },
  formField: { marginBottom: 14 },
  formNote: { fontSize: 12, color: SUPER.textFaint, lineHeight: 17, marginBottom: 16 },
  formActions: { flexDirection: 'row', gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: SUPER.text },
  sectionCount: {
    paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999,
    backgroundColor: SUPER.field,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: SUPER.textMuted },

  adminCard: {
    backgroundColor: SUPER.card, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  adminHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, gap: 8,
  },
  adminInfoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENTS.lightPurple, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: ACCENTS.purple },
  adminName: { fontSize: 16, fontWeight: '700', color: SUPER.text, marginBottom: 2 },
  adminEmail: { fontSize: 12, color: SUPER.textMuted },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  adminMetaRow: {
    gap: 10, marginBottom: 16,
    borderTopWidth: 1, borderTopColor: SUPER.border, paddingTop: 16,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, fontSize: 13, color: SUPER.textMuted },
  metaTextEmpty: { color: SUPER.textFaint, fontStyle: 'italic' },
  metaTextShared: { color: ACCENTS.green, fontWeight: '600' },
  metaTextInactive: { color: ACCENTS.orange, fontWeight: '600' },

  tierNote: { fontSize: 11, color: SUPER.textFaint, marginTop: 8, marginBottom: 16 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: SUPER.textMuted },

  adminActions: { flexDirection: 'row', gap: 12 },
});

export default ManageAdminsScreen;
