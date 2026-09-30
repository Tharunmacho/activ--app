import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  BottomActionBar, PALETTE, SPACE, TYPE, SIZE, shortDate,
  ConsoleFrame, ConsoleHeader, ConsoleCard, ConsoleChip, ConsoleTabs, ConsoleSearch, ConsoleButton, ConsoleNote,
  GradientAvatar, GlassIconButton, PremiumInput, FadeInUp, TeamKeys3D, CONSOLE_LIST, CONSOLE_ACCENTS, ConsoleChipKind,
} from '../../../ui';
import api from '../../../services/api';
import { listStaffAccounts, updateStaffAccount, errorText, type StaffAccount } from '../../../services/superApi';
import { getGeography, invalidateRegionCache } from '../../../services/regions';
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
const TIERS: { key: AdminRole; label: string; plural: string; icon: string; color: string; light: string; chip: ConsoleChipKind; grad: string[] }[] = [
  { key: 'state_admin', label: 'State', plural: 'State Admins', icon: 'public', color: PALETTE.successText, light: PALETTE.successSoft, chip: 'approved', grad: CONSOLE_ACCENTS.green.grad },
  { key: 'district_admin', label: 'District', plural: 'District Admins', icon: 'map', color: PALETTE.warningText, light: PALETTE.warningSoft, chip: 'gold', grad: CONSOLE_ACCENTS.gold.grad },
  { key: 'block_admin', label: 'Block', plural: 'Block Admins', icon: 'location-city', color: PALETTE.indigo, light: PALETTE.indigoSoft, chip: 'info', grad: CONSOLE_ACCENTS.indigo.grad },
];

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'block_admin', label: 'Block' },
  { key: 'district_admin', label: 'District' },
  { key: 'state_admin', label: 'State' },
];

const EMPTY_FORM = {
  /**
   * Usually one of the three tiers. Widened to `string` because the roster
   * (website ManageAdmins) also lists accounts outside them — the events admin,
   * the super admin — and editing one must keep its role rather than silently
   * turning it into a block admin.
   */
  role: 'block_admin' as string,
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  state: '',
  district: '',
  block: '',
  /** Edit only — sent as `active` when it changes (PUT accepts it). */
  active: true,
};

/** Which region fields each tier owns. Anything below its tier is not stored. */
const REGION_FIELDS: Record<AdminRole, ('state' | 'district' | 'block')[]> = {
  state_admin: ['state'],
  district_admin: ['state', 'district'],
  block_admin: ['state', 'district', 'block'],
};
/** A role outside the three tiers owns no region (website `needs` -> []). */
const regionFieldsFor = (role?: string): ('state' | 'district' | 'block')[] =>
  (REGION_FIELDS as Record<string, ('state' | 'district' | 'block')[]>)[String(role || '')] || [];
const isTierRole = (role?: string) => TIERS.some(t => t.key === role);

type FormState = typeof EMPTY_FORM;

/* ================================================== site staff accounts */

/** Roles maintained in the "Site staff accounts" section, not the tier list. */
const STAFF_ROLES = ['cms_admin', 'events_admin'];
const isStaffRole = (role?: string) => STAFF_ROLES.includes(String(role || ''));

const MIN_PASSWORD = 8;

/** A rough strength read, for the hint under the field. Never a gate beyond MIN_PASSWORD. */
const passwordStrength = (pw: string): { label: string; color: string; bars: number } => {
  const value = String(pw || '');
  if (!value) return { label: '', color: PALETTE.textFaint, bars: 0 };
  let points = 0;
  if (value.length >= 12) points += 1;
  if (value.length >= 16) points += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1;
  if (/\d/.test(value)) points += 1;
  if (/[^A-Za-z0-9]/.test(value)) points += 1;
  if (value.length < MIN_PASSWORD || points <= 1) return { label: 'Weak', color: PALETTE.red, bars: 1 };
  if (points <= 3) return { label: 'Fair', color: PALETTE.warningText, bars: 2 };
  return { label: 'Strong', color: PALETTE.successText, bars: 3 };
};

/**
 * 16 characters, one of each class, from an alphabet without look-alikes (the
 * Super Admin reads it out to somebody). Uses `crypto.getRandomValues` where
 * the runtime has it; Hermes without a polyfill falls back to Math.random —
 * acceptable for a password handed over and replaced, but not a CSPRNG.
 */
const generatePassword = (): string => {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%*?-_+';
  const all = lower + upper + digits + symbols;
  const rand = (n: number) => {
    try {
      const c = (globalThis as any)?.crypto;
      if (c && typeof c.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        c.getRandomValues(buf);
        return buf[0] % n;
      }
    } catch {
      // fall through to Math.random
    }
    return Math.floor(Math.random() * n);
  };
  const chars = [lower, upper, digits, symbols].map(set => set.charAt(rand(set.length)));
  while (chars.length < 16) chars.push(all.charAt(rand(all.length)));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    const t = chars[i];
    chars[i] = chars[j];
    chars[j] = t;
  }
  return chars.join('');
};

interface StaffDraft {
  fullName: string;
  email: string;
  phoneNumber: string;
  active: boolean;
  setPassword: boolean;
  password: string;
  confirmPassword: string;
}

/**
 * One CMS / events staff account, with its own inline editor.
 *
 * The Super Admin keeps these credentials: name, email, phone, active, and a
 * new password (PUT /admin/super/staff-accounts/:id). Inline card, never a
 * native Modal (Rule 2). A password change is confirmed first, and the success
 * message says to hand the new one over securely — it is stored as a bcrypt
 * hash and cannot be shown again.
 */
const StaffAccountCard = ({ item, index, onSaved }: { item: StaffAccount; index: number; onSaved: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [reveal, setReveal] = useState<{ [k: string]: boolean }>({});
  const [saving, setSaving] = useState(false);

  const inactive = item?.active === false;
  const lastLogin = item?.lastLoginAt ? shortDate(item.lastLoginAt) : '';

  const open = () => {
    setDraft({
      fullName: item?.fullName || '',
      email: item?.email || '',
      phoneNumber: item?.phoneNumber || '',
      active: item?.active !== false,
      setPassword: false,
      password: '',
      confirmPassword: '',
    });
    setReveal({});
    setEditing(true);
  };
  const close = () => {
    setEditing(false);
    setDraft(null);
    setReveal({});
  };
  const patch = (next: Partial<StaffDraft>) => setDraft(prev => (prev ? { ...prev, ...next } : prev));

  const submit = async (d: StaffDraft) => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        fullName: (d.fullName || '').trim(),
        email: (d.email || '').trim().toLowerCase(),
        phoneNumber: (d.phoneNumber || '').trim(),
        active: !!d.active,
      };
      if (d.setPassword) payload.password = d.password || '';
      const res = await updateStaffAccount(item?.id || '', payload);
      const changed: string[] = Array.isArray(res?.changed) ? res.changed : [];
      const who = payload.fullName || payload.email;

      if (changed.includes('password')) {
        Alert.alert(
          'Password changed',
          `${who} must now sign in with the new password.\n\n` +
          'Share it with them securely — in person or by phone, never in a group chat. It cannot be shown again.',
        );
      } else if (changed.length > 0) {
        Alert.alert('Account updated', `${who}'s account has been saved.`);
      } else {
        Alert.alert('Nothing changed', 'The account already had these details.');
      }
      close();
      onSaved();
    } catch (err: any) {
      Alert.alert('Could not save', errorText(err, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const d = draft;
    if (!d) return;
    if (!(d.fullName || '').trim()) { Alert.alert('Missing field', 'Full name is required.'); return; }
    if (!(d.email || '').trim()) { Alert.alert('Missing field', 'Email is required.'); return; }
    if (d.setPassword) {
      if ((d.password || '').length < MIN_PASSWORD) {
        Alert.alert('Weak password', `Use at least ${MIN_PASSWORD} characters.`);
        return;
      }
      if (d.password !== d.confirmPassword) {
        Alert.alert('Password mismatch', 'The passwords you entered do not match.');
        return;
      }
    }

    const emailChanged = (d.email || '').trim().toLowerCase() !== String(item?.email || '').toLowerCase();
    if (!d.setPassword && !emailChanged) {
      submit(d);
      return;
    }

    // Replacing a working credential is confirmed first.
    const lines = [
      d.setPassword
        ? `The password ${item?.email || 'this account'} signs in with today will stop working. Note the new one first — it cannot be shown after saving.`
        : '',
      emailChanged ? `The sign-in email changes to ${(d.email || '').trim().toLowerCase()}.` : '',
    ].filter(Boolean);
    Alert.alert(
      d.setPassword ? 'Change this password?' : 'Change the sign-in email?',
      lines.join('\n\n'),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: d.setPassword ? 'Change password' : 'Change email', style: 'destructive', onPress: () => submit(d) },
      ],
    );
  };

  const secureField = (key: 'password' | 'confirmPassword', label: string) => {
    if (!draft) return null;
    const shown = !!reveal[key];
    return (
      <PremiumInput
        tone="admin"
        label={label}
        icon="lock-outline"
        placeholder={key === 'password' ? 'At least 8 characters' : 'Type it again'}
        value={draft[key]}
        onChangeText={(v: string) => patch({ [key]: v } as Partial<StaffDraft>)}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        right={(
          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() => setReveal(prev => ({ ...prev, [key]: !prev[key] }))}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          >
            <Icon name={shown ? 'visibility-off' : 'visibility'} size={SIZE.icon} color={PALETTE.textFaint} />
          </TouchableOpacity>
        )}
      />
    );
  };

  const strength = passwordStrength(draft?.password || '');
  const mismatch = !!draft?.setPassword
    && (draft?.confirmPassword || '').length > 0
    && draft?.password !== draft?.confirmPassword;
  const emailEdited = !!draft
    && (draft.email || '').trim().toLowerCase() !== String(item?.email || '').toLowerCase();

  return (
    <FadeInUp delay={Math.min(index, 6) * 40} style={styles.gutter}>
      <ConsoleCard style={[styles.adminCard, inactive && styles.adminInactive]} accent={inactive ? PALETTE.amber : undefined}>
        <View style={styles.adminHeader}>
          <GradientAvatar name={item?.fullName || item?.email} size={48} tone="admin" status={inactive ? 'pending' : 'online'} />
          <View style={styles.flexText}>
            <Text style={styles.adminName} numberOfLines={1}>{item?.fullName || 'Unnamed account'}</Text>
            <Text style={styles.adminEmail} numberOfLines={1}>{item?.email || 'No email'}</Text>
            <View style={styles.chipRow}>
              <ConsoleChip label={item?.roleLabel || item?.role || 'Staff'} kind="info" icon={item?.role === 'events_admin' ? 'event' : 'web'} />
              {inactive ? <ConsoleChip label="Deactivated" kind="warning" icon="pause-circle-outline" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.adminMetaRow}>
          {item?.phoneNumber ? (
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}><Icon name="phone" size={14} color={PALETTE.indigo} /></View>
              <Text style={styles.metaText} numberOfLines={1}>{item.phoneNumber}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <View style={styles.metaIcon}><Icon name="login" size={14} color={PALETTE.indigo} /></View>
            <Text style={styles.metaText} numberOfLines={1}>{lastLogin ? `Last signed in ${lastLogin}` : 'No sign-in recorded'}</Text>
          </View>
        </View>

        {!editing ? (
          <View style={styles.actions}>
            <ConsoleButton kind="soft" size="sm" icon="manage-accounts" label="Edit credentials" onPress={open} style={styles.flex} />
          </View>
        ) : null}

        {editing && draft ? (
          <View style={styles.staffEditor}>
            <Text style={styles.groupLabel}>Account</Text>
            <PremiumInput
              tone="admin" label="Full Name" icon="person-outline" placeholder="Full name"
              value={draft.fullName} onChangeText={(v: string) => patch({ fullName: v })} autoCorrect={false}
            />
            <PremiumInput
              tone="admin" label="Sign-in Email" icon="mail-outline" placeholder="name@activ.org.in"
              value={draft.email} onChangeText={(v: string) => patch({ email: v })}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              hint={emailEdited ? 'They will sign in with this address. It must not belong to any other admin or member.' : undefined}
            />
            <PremiumInput
              tone="admin" label="Phone (optional)" icon="phone" placeholder="9876543210"
              value={draft.phoneNumber} onChangeText={(v: string) => patch({ phoneNumber: v })} keyboardType="phone-pad"
            />

            <View style={[styles.activeRow, !draft.active && styles.activeRowOff]}>
              <Icon name={draft.active ? 'toggle-on' : 'pause-circle-outline'} size={22} color={draft.active ? PALETTE.successText : PALETTE.warningText} />
              <View style={styles.flexText}>
                <Text style={styles.activeTitle}>{draft.active ? 'Account active' : 'Account deactivated'}</Text>
                <Text style={styles.activeHint}>{draft.active ? 'They can sign in to their portal.' : 'They cannot sign in. Nothing is deleted.'}</Text>
              </View>
              <Switch
                value={!!draft.active}
                onValueChange={(v) => patch({ active: v })}
                disabled={saving}
                trackColor={{ false: PALETTE.borderStrong, true: PALETTE.indigo }}
                thumbColor={Platform.OS === 'android' ? PALETTE.white : undefined}
                ios_backgroundColor={PALETTE.borderStrong}
                accessibilityLabel="Account active"
              />
            </View>

            <View style={styles.pwBox}>
              <View style={styles.pwHead}>
                <Icon name="vpn-key" size={18} color={PALETTE.indigo} />
                <View style={styles.flexText}>
                  <Text style={styles.activeTitle}>Set a new password</Text>
                  <Text style={styles.activeHint}>Replaces the current one. Leave off to keep it.</Text>
                </View>
                <Switch
                  value={!!draft.setPassword}
                  onValueChange={(v) => patch({ setPassword: v, password: '', confirmPassword: '' })}
                  disabled={saving}
                  trackColor={{ false: PALETTE.borderStrong, true: PALETTE.indigo }}
                  thumbColor={Platform.OS === 'android' ? PALETTE.white : undefined}
                  ios_backgroundColor={PALETTE.borderStrong}
                  accessibilityLabel="Set a new password"
                />
              </View>

              {draft.setPassword ? (
                <View style={styles.pwFields}>
                  {secureField('password', 'New Password')}
                  {secureField('confirmPassword', 'Confirm New Password')}
                  <View style={styles.strengthRow}>
                    {[1, 2, 3].map(i => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: strength.bars >= i ? strength.color : PALETTE.divider }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: mismatch ? PALETTE.red : strength.color }]}>
                    {mismatch
                      ? 'The two passwords do not match.'
                      : `${strength.label ? `${strength.label} — ` : ''}at least ${MIN_PASSWORD} characters; 12+ with mixed case, a number and a symbol is strong.`}
                  </Text>
                  <ConsoleButton
                    kind="ghost"
                    size="sm"
                    icon="auto-fix-high"
                    label="Generate a strong password"
                    onPress={() => {
                      const pw = generatePassword();
                      patch({ password: pw, confirmPassword: pw });
                      setReveal({ password: true });
                    }}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.actions}>
              <ConsoleButton kind="soft" size="sm" label="Cancel" onPress={close} style={styles.flex} disabled={saving} />
              <ConsoleButton size="sm" icon="check" label="Save" loading={saving} onPress={save} style={styles.flex} />
            </View>
          </View>
        ) : null}
      </ConsoleCard>
    </FadeInUp>
  );
};

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Staff management: every admin on the platform, grouped by tier, with create,
 * edit and hard delete.
 */
const ManageAdminsScreen = ({ route }: any) => {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  /** CMS / events staff, from their own endpoint (credentials maintained here). */
  const [staff, setStaff] = useState<StaffAccount[]>([]);
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

  /** The account's stored on/off, so `active` is only sent when the Super Admin changes it. */
  const [originalActive, setOriginalActive] = useState(true);

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
    () => {
      // Website ManageAdmins: `role` only when narrowed, `q` only from 2 chars
      // (the server ignores shorter ones anyway).
      const q = (debouncedQuery || '').trim();
      return {
        ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
        ...(q.length >= 2 ? { q } : {}),
      };
    },
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

  const fetchStaff = useCallback(async () => {
    try {
      const rows = await listStaffAccounts();
      setStaff(Array.isArray(rows) ? rows : []);
    } catch {
      // The tier list is this screen's main job; a failed staff read leaves
      // the section out rather than blocking the rest.
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Same reason as the Hub: bottom tabs stay mounted, so without this the list
  // and its per-tier counts are whatever they were when the tab was first
  // opened. Deleting an admin from another screen would leave a ghost row here.
  useFocusEffect(
    useCallback(() => {
      fetchAdmins(true);
      fetchStaff();
    }, [fetchAdmins, fetchStaff]),
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
  // The CMS and events accounts get their own "Site staff accounts" section,
  // read from /admin/super/staff-accounts, with the credential editor the tier
  // form cannot offer (the tier edit refuses any non-tier role). Shown on
  // "All" only, narrowed by the search box. Super admin rows are not listed:
  // their password is changed in Settings.
  const staffShown = useMemo(() => {
    if (roleFilter !== 'all') return [];
    const q = (debouncedQuery || '').trim().toLowerCase();
    return (staff || []).filter(a => q.length < 2 ||
      `${a?.fullName || ''} ${a?.email || ''} ${a?.roleLabel || ''}`.toLowerCase().includes(q));
  }, [staff, roleFilter, debouncedQuery]);

  const sections = useMemo(() => [
    ...TIERS.map(tier => ({
      key: tier.key as string,
      title: tier.plural,
      icon: tier.icon,
      color: tier.color,
      light: tier.light,
      data: (admins || []).filter(a => a?.role === tier.key),
    })),
    {
      key: 'staff',
      title: 'Site staff accounts',
      icon: 'manage-accounts',
      color: PALETTE.indigo,
      light: PALETTE.indigoSoft,
      data: staffShown as any[],
    },
  ].filter(section => section.data.length > 0),
  [admins, staffShown]);

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
      const owned = regionFieldsFor(role);
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

  const toggleActive = (next: boolean) => {
    if (next) { setForm(prev => ({ ...prev, active: true })); return; }
    Alert.alert(
      'Deactivate this admin?',
      'They will not be able to sign in, and any pending applications that only they cover escalate to the tier above until the account is reactivated. Saved when you tap Save changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => setForm(prev => ({ ...prev, active: false })) },
      ],
    );
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
      role: String(admin?.role || 'block_admin'),
      fullName: admin?.fullName || '',
      email: admin?.email || '',
      phoneNumber: admin?.phoneNumber || '',
      password: '',
      confirmPassword: '',
      state: admin?.state || '',
      district: admin?.district || '',
      block: admin?.block || '',
      active: admin?.active !== false,
    });
    setOriginalActive(admin?.active !== false);
    setAdded(EMPTY_ADDED);
    setRevealedFields({});
    setMode('edit');
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = async () => {
    /*
     * Only the region keys this tier OWNS are sent (website ManageAdmins
     * `needs`): a state admin carries `state`, a district admin state +
     * district, a block admin all three. Sending `district: ''` for a state
     * admin would put an empty string into the region tree.
     */
    const needs = regionFieldsFor(form.role);
    const payload: Record<string, any> = {
      fullName: (form.fullName || '').trim(),
      email: (form.email || '').trim().toLowerCase(),
      phoneNumber: (form.phoneNumber || '').trim(),
      role: form.role,
    };
    needs.forEach((k) => { payload[k] = String((form as any)?.[k] || '').trim(); });
    if (form.password) payload.password = form.password;
    if (mode === 'edit' && isTierRole(form.role) && form.active !== originalActive) payload.active = !!form.active;

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

    if (needs.includes('state') && !payload.state) return Alert.alert('Missing field', 'State is required.');
    if (needs.includes('district') && !payload.district) {
      return Alert.alert('Missing field', 'District is required for this tier.');
    }
    if (needs.includes('block') && !payload.block) {
      return Alert.alert('Missing field', 'Block is required for a block admin.');
    }

    setSaving(true);
    try {
      if (mode === 'edit' && editingId) {
        await api.put(`/admin/super/admins/${encodeURIComponent(editingId)}`, payload);
        Alert.alert('Admin updated', `${payload.fullName}'s account has been saved.`);
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
      const response = await api.get(`/admin/super/admins/${encodeURIComponent(admin?.id || '')}/removal-preview`);
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
              await api.delete(`/admin/super/admins/${encodeURIComponent(admin?.id || '')}`);
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

  const renderItem = useCallback(({ item, index, section }: { item: AdminRow; index: number; section?: any }) => {
    if (section?.key === 'staff' || isStaffRole(item?.role)) {
      return <StaffAccountCard item={item as any} index={index} onSaved={fetchStaff} />;
    }
    const busy = busyId === item?.id;
    const place = [item?.block, item?.district, item?.state].filter(Boolean).join(', ');
    const meta = TIERS.find(t => t.key === item?.role);
    const inactive = item?.active === false;
    const lastLogin = (item as any)?.lastLoginAt ? shortDate((item as any).lastLoginAt) : '';

    return (
      <FadeInUp delay={Math.min(index, 6) * 40} style={styles.gutter}>
        <ConsoleCard style={[styles.adminCard, inactive && styles.adminInactive]} accent={inactive ? PALETTE.amber : undefined}>
          <View style={styles.adminHeader}>
            <GradientAvatar name={item?.fullName || item?.email} size={48} tone="admin" status={inactive ? 'pending' : 'online'} />
            <View style={styles.flexText}>
              <Text style={styles.adminName} numberOfLines={1}>{item?.fullName || 'Unnamed admin'}</Text>
              <Text style={styles.adminEmail} numberOfLines={1}>{item?.email || 'No email'}</Text>
              <View style={styles.chipRow}>
                <ConsoleChip label={item?.roleLabel || item?.role || 'Admin'} kind={meta?.chip || 'neutral'} icon={meta?.icon || 'manage-accounts'} />
                {inactive ? <ConsoleChip label="Deactivated" kind="warning" icon="pause-circle-outline" /> : null}
              </View>
            </View>
          </View>

          <View style={styles.adminMetaRow}>
            {place ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}><Icon name="location-on" size={14} color={PALETTE.indigo} /></View>
                <Text style={styles.metaText} numberOfLines={2}>{place}</Text>
              </View>
            ) : null}
            {item?.phoneNumber ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}><Icon name="phone" size={14} color={PALETTE.indigo} /></View>
                <Text style={styles.metaText} numberOfLines={1}>{item.phoneNumber}</Text>
              </View>
            ) : null}
            {/* Several admins on one region share a single queue. Showing it here
                is what turns an invisible duplication risk into a known team. */}
            {Number(item?.coAdmins || 0) > 0 ? (
              <View style={styles.metaItem}>
                <View style={[styles.metaIcon, { backgroundColor: PALETTE.successSoft }]}><Icon name="groups" size={14} color={PALETTE.successText} /></View>
                <Text style={[styles.metaText, styles.metaTextShared]} numberOfLines={2}>
                  Shared queue with {item.coAdmins} other admin{item.coAdmins === 1 ? '' : 's'}
                </Text>
              </View>
            ) : isTierRole(item?.role) ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}><Icon name="person" size={14} color={PALETTE.indigo} /></View>
                <Text style={styles.metaText} numberOfLines={1}>Sole owner of this region's queue</Text>
              </View>
            ) : null}
            {lastLogin ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}><Icon name="login" size={14} color={PALETTE.indigo} /></View>
                <Text style={styles.metaText} numberOfLines={1}>Last signed in {lastLogin}</Text>
              </View>
            ) : null}
            {inactive ? (
              <View style={styles.metaItem}>
                <View style={[styles.metaIcon, { backgroundColor: PALETTE.warningSoft }]}><Icon name="pause-circle-outline" size={14} color={PALETTE.warningText} /></View>
                <Text style={[styles.metaText, styles.metaTextInactive]} numberOfLines={2}>
                  Deactivated — their region's queue has escalated
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <ConsoleButton kind="soft" size="sm" icon="edit" label="Edit" onPress={() => openEdit(item)} style={styles.flex} />
            <ConsoleButton kind="danger" size="sm" icon="delete-outline" label="Delete" loading={busy} onPress={() => handleDelete(item)} style={styles.flex} />
          </View>
        </ConsoleCard>
      </FadeInUp>
    );
  }, [busyId, fetchStaff]);

  const renderSectionHeader = useCallback(({ section }: any) => {
    const meta = TIERS.find(t => t.key === section?.key);
    const isStaff = section?.key === 'staff';
    return (
      <View>
        <View style={styles.sectionHeader}>
          <LinearGradient
            colors={meta?.grad || (isStaff ? CONSOLE_ACCENTS.indigo.grad : CONSOLE_ACCENTS.slate.grad)}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionIcon}
          >
            <Icon name={section?.icon} size={15} color={PALETTE.white} />
          </LinearGradient>
          <Text style={styles.sectionTitle} numberOfLines={1}>{section?.title}</Text>
          <ConsoleChip label={String((section?.data || []).length)} kind="info" dot={false} />
        </View>
        {isStaff ? (
          <ConsoleNote
            icon="vpn-key"
            style={styles.staffNote}
            text="The CMS and events sign-ins. You keep their credentials — reset a password here and nobody else is needed. Your own password is changed in Settings."
          />
        ) : null}
      </View>
    );
  }, []);

  /**
   * A secure field is rendered with a reveal toggle.
   *
   * The Super Admin is typing a password *for somebody else* and then has to
   * pass it on, so being unable to check what was typed is worse than the usual
   * shoulder-surfing trade-off. It starts masked and is per-field, so opening
   * one does not unmask another.
   */
  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    options: { secure?: boolean; keyboard?: any; capitalize?: any; icon?: string } = {},
  ) => {
    const revealed = !!options.secure && !!revealedFields[label];

    return (
      <PremiumInput
        tone="admin"
        label={label}
        icon={options.icon}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!!options.secure && !revealed}
        keyboardType={options.keyboard || 'default'}
        autoCapitalize={options.capitalize || 'words'}
        autoCorrect={false}
        right={options.secure ? (
          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() => setRevealedFields(prev => ({ ...prev, [label]: !prev[label] }))}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={revealed ? 'visibility-off' : 'visibility'}
              size={SIZE.icon}
              color={PALETTE.textFaint}
            />
          </TouchableOpacity>
        ) : undefined}
      />
    );
  };

  /**
   * The create / edit form.
   *
   * Every field is editable, region included, on create and on edit alike. The
   * Super Admin types region names directly: an unrecognised name is not an
   * error, it is a new region, and saving makes it selectable on the applicant
   * registration form.
   *
   * Only the region fields the chosen tier owns are shown — a state admin has no
   * district — so nothing is stored that the tier has no use for. Cancel / Save
   * live in the sticky footer while the form is open.
   */
  const renderForm = () => {
    const owned = regionFieldsFor(form.role);
    const outsideTiers = !isTierRole(form.role);

    return (
      <FadeInUp style={styles.gutter}>
        <ConsoleCard style={styles.formCard}>
          <View style={styles.formHead}>
            <LinearGradient colors={CONSOLE_ACCENTS.indigo.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.formIcon}>
              <Icon name={mode === 'edit' ? 'edit' : 'person-add'} size={SIZE.icon} color={PALETTE.white} />
            </LinearGradient>
            <View style={styles.flexText}>
              <Text style={styles.formTitle}>{mode === 'edit' ? 'Edit admin' : 'New admin'}</Text>
              <Text style={styles.formSub}>{mode === 'edit' ? 'Change the tier, region or account' : 'Pick a tier, then the region it governs'}</Text>
            </View>
          </View>

          <Text style={styles.groupLabel}>Tier</Text>
          <ConsoleTabs
            value={(isTierRole(form.role) ? form.role : '') as string}
            onChange={(v) => setRole(v as AdminRole)}
            options={TIERS.map(option => ({ value: option.key as string, label: option.label }))}
            style={styles.flushTabs}
          />

          {outsideTiers ? (
            <Text style={styles.tierNote}>
              Current role: <Text style={styles.mono}>{form.role}</Text> — it owns no region and keeps its role
              unless you pick a tier above.
            </Text>
          ) : (
            <Text style={styles.tierNote}>
              Saved into the <Text style={styles.mono}>{String(form.role || '').replace('_admin', '')}admins</Text> collection.
            </Text>
          )}

          {owned.length > 0 ? <Text style={styles.groupLabel}>Region</Text> : null}

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

          <View style={styles.rule} />
          <Text style={styles.groupLabel}>Account</Text>

          {renderInput('Full Name', form.fullName, v => setField('fullName', v), 'Jane Doe', { icon: 'person-outline' })}
          {renderInput('Email Address', form.email, v => setField('email', v), 'name@activ.com', {
            keyboard: 'email-address', capitalize: 'none', icon: 'mail-outline',
          })}
          {renderInput('Phone (optional)', form.phoneNumber, v => setField('phoneNumber', v), '9876543210', {
            keyboard: 'phone-pad', icon: 'phone',
          })}
          {renderInput(
            mode === 'edit' ? 'New Password (leave blank to keep)' : 'Password',
            form.password,
            v => setField('password', v),
            'At least 8 characters',
            { secure: true, capitalize: 'none', icon: 'lock-outline' },
          )}

          {(mode === 'create' || form.password.length > 0) ? renderInput(
            'Confirm Password',
            form.confirmPassword,
            v => setField('confirmPassword', v),
            'Type the password again',
            { secure: true, capitalize: 'none', icon: 'lock-outline' },
          ) : null}

          {/* Account on/off — `PUT /admin/super/admins/:id { active }`, sent only
              when it changes. The server records it (reactivated / deactivated)
              and escalates a deactivated admin's queue to the tier above. */}
          {mode === 'edit' && isTierRole(form.role) ? (
            <View style={[styles.activeRow, !form.active && styles.activeRowOff]}>
              <Icon name={form.active ? 'toggle-on' : 'pause-circle-outline'} size={22} color={form.active ? PALETTE.successText : PALETTE.warningText} />
              <View style={styles.flexText}>
                <Text style={styles.activeTitle}>{form.active ? 'Account active' : 'Account deactivated'}</Text>
                <Text style={styles.activeHint}>
                  {form.active
                    ? 'They can sign in and act on their region\'s queue.'
                    : 'They cannot sign in; their region\'s pending applications escalate to the tier above until reactivated.'}
                </Text>
              </View>
              <Switch
                value={!!form.active}
                onValueChange={toggleActive}
                disabled={saving}
                trackColor={{ false: PALETTE.borderStrong, true: PALETTE.indigo }}
                thumbColor={Platform.OS === 'android' ? PALETTE.white : undefined}
                ios_backgroundColor={PALETTE.borderStrong}
                accessibilityLabel="Account active"
              />
            </View>
          ) : null}

          <ConsoleNote
            icon="fence"
            style={styles.formNote}
            text="This region is the admin's geofence — they only ever see applications from it. It is also what applicants can choose: a region with no admin does not appear on the registration form, and a region you add here appears the moment you save."
          />
        </ConsoleCard>
      </FadeInUp>
    );
  };

  const listEmpty = () => {
    if (loading) return <View style={styles.gutter}><SkeletonList count={4} /></View>;
    if (error) {
      return <EmptyState tone="error" title={error} caption="Pull down to try again." action="Try again" onAction={() => fetchAdmins()} />;
    }
    return (
      <EmptyState
        title="No admins match"
        caption={(query || '').trim() || roleFilter !== 'all'
          ? 'Try a different filter.'
          : 'Add one to open a region for registration.'}
      />
    );
  };

  const footer = mode !== 'idle' ? (
    <BottomActionBar safeBottom={false}>
      <ConsoleButton kind="soft" label="Cancel" onPress={closeForm} style={styles.flex} />
      <ConsoleButton
        icon="check"
        label={mode === 'edit' ? 'Save changes' : 'Create admin'}
        loading={saving}
        onPress={handleSave}
        style={styles.flex}
      />
    </BottomActionBar>
  ) : undefined;

  const header = (
    <View>
      <ConsoleHeader
        left={<GlassIconButton icon="arrow-back" onPress={goBack} accessibilityLabel="Back" />}
        topCenter="Super Admin"
        right={(
          <GlassIconButton
            icon={mode === 'idle' ? 'person-add' : 'close'}
            onPress={() => (mode === 'idle' ? openCreate() : closeForm())}
            accessibilityLabel={mode === 'idle' ? 'Add admin' : 'Close form'}
          />
        )}
        eyebrow={`${(admins || []).length} accounts`}
        title="Admins"
        subtitle="A block admin opens a region for registration."
        art={<TeamKeys3D size={96} />}
        badges={[
          { icon: 'public', label: `${Number(counts.state_admin || 0)} state` },
          { icon: 'map', label: `${Number(counts.district_admin || 0)} district` },
          { icon: 'location-city', label: `${Number(counts.block_admin || 0)} block` },
        ]}
        waveHeight={62}
      />

      {mode === 'idle' ? (
        <FadeInUp style={styles.addWrap}>
          <ConsoleButton icon="person-add" label="Add an admin" onPress={openCreate} />
        </FadeInUp>
      ) : null}

      <ConsoleSearch value={query} onChangeText={setQuery} placeholder="Name, email or region" style={styles.search} />

      <ConsoleTabs
        value={roleFilter}
        onChange={setRoleFilter}
        options={ROLE_TABS.map(tab => ({ value: tab.key, label: tab.label, count: counts[tab.key] || 0 }))}
        style={styles.roleTabs}
      />

      {/* Inline expandable form — never a native Modal inside a tab. */}
      {mode !== 'idle' ? renderForm() : null}
    </View>
  );

  return (
    <ConsoleFrame footer={footer} avoidKeyboard>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={CONSOLE_LIST}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={listEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAdmins(true)} colors={[PALETTE.indigo]} tintColor={PALETTE.white} />}
      />
    </ConsoleFrame>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexText: { flex: 1, minWidth: 0 },
  gutter: { marginHorizontal: SPACE.lg },
  addWrap: { marginHorizontal: SPACE.lg, marginTop: -26, marginBottom: SPACE.md },
  search: { marginTop: SPACE.xs },
  roleTabs: { marginTop: SPACE.md, marginBottom: SPACE.sm },
  revealBtn: { paddingLeft: SPACE.sm, minHeight: SIZE.touch, justifyContent: 'center' },

  formCard: { marginTop: SPACE.md, marginBottom: SPACE.lg },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.lg },
  formIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formTitle: { ...TYPE.title },
  formSub: { ...TYPE.caption, marginTop: 1 },
  groupLabel: { ...TYPE.eyebrow, color: PALETTE.indigoDark, marginBottom: SPACE.sm },
  flushTabs: { paddingHorizontal: 0 },
  tierNote: { ...TYPE.caption, fontSize: 11, lineHeight: 15, marginTop: SPACE.sm, marginBottom: SPACE.lg },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: PALETTE.textSoft },
  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: PALETTE.divider, marginTop: SPACE.xs, marginBottom: SPACE.lg },
  formNote: { marginTop: SPACE.xs },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md, marginBottom: SPACE.md,
    borderRadius: 16, backgroundColor: PALETTE.successSoft,
  },
  activeRowOff: { backgroundColor: PALETTE.warningSoft },
  activeTitle: { ...TYPE.bodyStrong },
  activeHint: { ...TYPE.caption, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.lg, marginBottom: SPACE.md, marginHorizontal: SPACE.lg },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, minWidth: 0, ...TYPE.heading, fontSize: 16 },

  adminCard: { marginBottom: SPACE.md },
  adminInactive: { opacity: 0.85 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  adminName: { ...TYPE.subheading, fontWeight: '800' },
  adminEmail: { ...TYPE.caption, marginTop: SPACE.xxs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACE.sm - 2 },

  adminMetaRow: {
    gap: SPACE.sm, marginTop: SPACE.md, paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: PALETTE.divider,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  metaIcon: { width: 26, height: 26, borderRadius: 9, backgroundColor: PALETTE.indigoSoft, alignItems: 'center', justifyContent: 'center' },
  metaText: { flex: 1, minWidth: 0, ...TYPE.label, fontWeight: '500', color: PALETTE.textMuted },
  metaTextShared: { color: PALETTE.successText, fontWeight: '600' },
  metaTextInactive: { color: PALETTE.warningText, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },

  staffNote: { marginHorizontal: SPACE.lg, marginTop: -SPACE.xs, marginBottom: SPACE.md },
  staffEditor: {
    marginTop: SPACE.lg, paddingTop: SPACE.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: PALETTE.divider,
  },
  pwBox: { borderRadius: 16, borderWidth: 1, borderColor: PALETTE.divider, padding: SPACE.md, marginBottom: SPACE.xs },
  pwHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  pwFields: { marginTop: SPACE.md },
  strengthRow: { flexDirection: 'row', gap: 4, marginTop: SPACE.xs },
  strengthBar: { flex: 1, height: 5, borderRadius: 3 },
  strengthText: { ...TYPE.caption, marginTop: SPACE.xs, marginBottom: SPACE.sm },
});

export default ManageAdminsScreen;
