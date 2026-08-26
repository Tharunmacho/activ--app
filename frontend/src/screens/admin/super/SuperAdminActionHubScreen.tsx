import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../../services/api';
import { Applicant } from '../../../types';
import { useSuperAdminData } from './context/SuperAdminContext';
import { useSuperAdminBack } from './useSuperAdminBack';
import { SUPER, ACCENTS, superStyles, getGreeting, getInitials } from './superTheme';
import ApplicantRow from './components/ApplicantRow';
import { SkeletonList } from './components/Skeleton';
import EmptyState from './components/EmptyState';

type Tier = 'block' | 'district' | 'state';
type Level = 'tiers' | 'regions' | 'applications';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface Region {
  id: string;
  name: string;
  state: string;
  district: string;
  block: string;
  applications: number;
  pending: number;
  approved: number;
  rejected: number;
  admins: number;
}

const TIERS: { key: Tier; title: string; plural: string; icon: string; color: string; light: string }[] = [
  { key: 'block', title: 'Block', plural: 'Blocks', icon: 'location-city', color: ACCENTS.purple, light: ACCENTS.lightPurple },
  { key: 'district', title: 'District', plural: 'Districts', icon: 'map', color: ACCENTS.orange, light: ACCENTS.lightOrange },
  { key: 'state', title: 'State', plural: 'States', icon: 'public', color: ACCENTS.green, light: ACCENTS.lightGreen },
];

const STATUS_TABS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

const EMPTY_SUMMARY = { states: 0, districts: 0, blocks: 0 };

/**
 * The Hub: every application on the platform, reached by drilling down through
 * the geography that owns it.
 *
 *   tiers  ->  regions in that tier  ->  that region's applications
 *
 * All three levels live in one screen, so stepping back is instant and never
 * refetches a level the admin has already loaded.
 */
const SuperAdminActionHubScreen = ({ navigation }: any) => {
  const {
    adminName,
    stats,
    tierStats,
    bottlenecks,
    bottleneckAfterDays,
    coverageGaps,
    proxyReview,
    pendingActionId,
    fetchOverview,
    searchQuery,
    setSearchQuery,
    clearSearch,
    searchResults,
    searching,
  } = useSuperAdminData();

  const [level, setLevel] = useState<Level>('tiers');
  const [tier, setTier] = useState<Tier>('block');
  const [region, setRegion] = useState<Region | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionFilter, setRegionFilter] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const showingSearch = (searchQuery || '').trim().length >= 2;

  // ---- data ----

  const fetchTierSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/admin/super/directory', { params: { level: 'state' } });
      const payload = response.data?.data || response.data || {};
      setSummary({ ...EMPTY_SUMMARY, ...(payload.summary || {}) });
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load the hub');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRegions = useCallback(async (target: Tier, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/admin/super/directory', { params: { level: target } });
      const payload = response.data?.data || response.data || {};
      setRegions(payload.regions || []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load regions');
      setRegions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchApplications = useCallback(async (
    target: Region,
    targetTier: Tier,
    targetStatus: StatusFilter,
    isRefresh = false,
  ) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: Record<string, string> = { status: targetStatus, limit: '100' };
      params[targetTier] = target.name;
      params.level = targetTier;

      const response = await api.get('/admin/super/applications', { params });
      const payload = response.data?.data || response.data || {};
      setApplicants(payload.applicants || []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load applications');
      setApplicants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Refetch whenever the Hub comes back into focus, not just on mount.
   *
   * These are bottom tabs, so every screen stays mounted once visited. With a
   * plain mount effect the Hub kept showing the counts it read the first time it
   * opened: add a block admin on the Admins tab, come back, and "Browse
   * applications" still claimed the old number of blocks — the data was live,
   * the screen simply never asked again.
   *
   * The overview cards above come from SuperAdminContext, which had the same
   * mount-only effect, so both are refreshed together here.
   *
   * Whichever level is open is what gets reloaded — refetching the tier summary
   * while the user is three levels down looking at one region's applications
   * would leave that list stale instead.
   */
  useFocusEffect(
    useCallback(() => {
      // Refresh mode, not load mode: the screen already has data to show, and
      // dropping to a skeleton on every tab switch reads as a slower app than
      // one that quietly corrects its numbers a moment later.
      fetchOverview(true);
      if (level === 'tiers') fetchTierSummary(true);
      else if (level === 'regions') fetchRegions(tier, true);
      else if (level === 'applications' && region) fetchApplications(region, tier, status, true);
      // Deliberately not depending on `status`: the effect below already
      // handles a status change while a region is open, and listing it here
      // would fire two identical requests for one tap.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, tier, region, fetchOverview, fetchTierSummary, fetchRegions, fetchApplications]),
  );

  // Re-fetch when the status tab changes while a region is open.
  const statusRef = useRef(status);
  useEffect(() => {
    if (level !== 'applications' || !region) {
      statusRef.current = status;
      return;
    }
    if (statusRef.current === status) return;
    statusRef.current = status;
    fetchApplications(region, tier, status);
  }, [status, level, region, tier, fetchApplications]);

  // ---- moving between levels ----

  const openTier = (target: Tier) => {
    setTier(target);
    setRegions([]);
    setRegionFilter('');
    setLevel('regions');
    fetchRegions(target);
  };

  const openRegion = (target: Region) => {
    setRegion(target);
    setApplicants([]);
    setStatus('all');
    statusRef.current = 'all';
    setLevel('applications');
    fetchApplications(target, tier, 'all');
  };

  /**
   * Up one drill-down level. Returns false at the top, which tells the hook the
   * Hub has nothing left to close and the press belongs to the system.
   */
  const stepBack = useCallback((): boolean => {
    if (level === 'applications') {
      setRegion(null);
      setLevel('regions');
      return true;
    }
    if (level === 'regions') {
      setLevel('tiers');
      return true;
    }
    return false;
  }, [level]);

  const goBack = useSuperAdminBack(stepBack, { isHome: true });

  const onRefresh = () => {
    if (level === 'applications' && region) fetchApplications(region, tier, status, true);
    else if (level === 'regions') fetchRegions(tier, true);
    else {
      fetchTierSummary(true);
      fetchOverview(true);
    }
  };

  const handleReview = useCallback(async (applicant: Applicant, action: 'approve' | 'reject') => {
    const ok = await proxyReview(applicant, action);
    if (ok && region) {
      const isApprove = action === 'approve';
      setRegion(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pending: Math.max(0, (prev.pending || 0) - 1),
          approved: isApprove ? (prev.approved || 0) + 1 : prev.approved,
          rejected: !isApprove ? (prev.rejected || 0) + 1 : prev.rejected,
        };
      });
      setRegions(prev => prev.map(r => {
        if (r.id !== region.id) return r;
        return {
          ...r,
          pending: Math.max(0, (r.pending || 0) - 1),
          approved: isApprove ? (r.approved || 0) + 1 : r.approved,
          rejected: !isApprove ? (r.rejected || 0) + 1 : r.rejected,
        };
      }));
      fetchApplications(region, tier, status, true);
    }
  }, [proxyReview, region, tier, status, fetchApplications]);

  /**
   * A search hit carries only summary fields. An admin hit hands off to the
   * Admins tab; an applicant hit resolves to the full record first, so the
   * detail screen is never handed a half-populated applicant.
   */
  const openHit = useCallback(async (kind: 'member' | 'application' | 'admin', hit: any) => {
    const term = hit?.email || hit?.fullName || '';
    clearSearch();

    if (kind === 'admin') {
      navigation.navigate('Admins', { q: term });
      return;
    }

    try {
      const response = await api.get('/admin/super/applications', {
        params: { q: term, status: 'all', limit: '1' },
      });
      const payload = response.data?.data || response.data || {};
      const applicant = (payload.applicants || [])[0];
      if (applicant) {
        navigation.navigate('ApplicantDetail', { applicant });
        return;
      }
      setError(`No application found for ${term}`);
    } catch {
      setError('Could not open that record');
    }
  }, [clearSearch, navigation]);

  const visibleRegions = useMemo(() => {
    const needle = (regionFilter || '').trim().toLowerCase();
    if (!needle) return regions || [];
    return (regions || []).filter(r => String(r?.name || '').toLowerCase().includes(needle));
  }, [regions, regionFilter]);

  // ---- level 1: stat cards + tier cards ----

  const renderStatCard = (label: string, value: number, color: string, light: string, icon: string) => (
    <View style={superStyles.statCard}>
      <View style={superStyles.statHeaderRow}>
        <View style={[superStyles.statIconWrap, { backgroundColor: light }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={[superStyles.statValue, { color }]}>{Number(value || 0)}</Text>
      </View>
      <Text style={superStyles.statLabel}>{label}</Text>
      <View style={superStyles.statFooterRow}>
        <Icon name="arrow-upward" size={12} color={color} />
        <Text style={[superStyles.statSubText, { color }]}>0%</Text>
        <Text style={superStyles.statSubTextLight}> vs last 30 days</Text>
      </View>
      <View style={[superStyles.waveDecoration, { backgroundColor: light, opacity: 0.5 }]} />
    </View>
  );

  const renderTiers = () => (
    <View>
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
          {TIERS.map(meta => {
            const tStats = tierStats?.[meta.key] || { total: 0, pending: 0, approved: 0, rejected: 0 };
            return (
              <TouchableOpacity
                key={meta.key}
                style={[superStyles.card, { width: 300, padding: 0, overflow: 'hidden' }]}
                activeOpacity={0.8}
                onPress={() => openTier(meta.key)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View style={[superStyles.menuIcon, { backgroundColor: meta.light }]}>
                    <Icon name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: SUPER.text, marginLeft: 12 }}>{meta.title} Level</Text>
                  <View style={{ flex: 1 }} />
                  <Icon name="chevron-right" size={20} color={SUPER.textFaint} />
                </View>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F8FAFC' }}>
                  {[
                    { label: 'Total Members', value: tStats.total, color: SUPER.text },
                    { label: 'Pending', value: tStats.pending, color: ACCENTS.orange },
                    { label: 'Approved', value: tStats.approved, color: ACCENTS.green },
                    { label: 'Rejected', value: tStats.rejected, color: ACCENTS.red },
                  ].map((stat, i) => (
                    <View key={stat.label} style={{ width: '50%', padding: 12, borderBottomWidth: i < 2 ? 1 : 0, borderRightWidth: i % 2 === 0 ? 1 : 0, borderColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: stat.color }}>{Number(stat.value || 0)}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {(bottlenecks || []).length > 0 ? (
        <TouchableOpacity style={styles.alertBanner} onPress={() => openTier('block')} activeOpacity={0.8}>
          <Icon name="schedule" size={16} color={ACCENTS.orange} />
          <Text style={styles.alertText}>
            {(bottlenecks || []).length} application{(bottlenecks || []).length === 1 ? '' : 's'} waiting
            {' '}{bottleneckAfterDays}+ days at a local tier
          </Text>
          <Icon name="chevron-right" size={18} color={ACCENTS.orange} />
        </TouchableOpacity>
      ) : null}

      {/* Unstaffed regions.
          These applications are not stuck — orphan fallback has already handed
          them to the tier above, and will hand them back the moment a
          replacement is created. This panel exists so the vacancy itself is
          visible, listed worst-first, because filling it is the actual fix. */}
      {(coverageGaps || []).length > 0 ? (
        <View style={styles.gapCard}>
          <View style={styles.gapHeader}>
            <Icon name="person-off" size={18} color={ACCENTS.red} />
            <Text style={styles.gapTitle}>
              {(coverageGaps || []).length} region{(coverageGaps || []).length === 1 ? '' : 's'} with no admin
            </Text>
          </View>

          <Text style={styles.gapCaption}>
            Their queues have escalated automatically. Creating a replacement admin hands the
            applications straight back.
          </Text>

          {(coverageGaps || []).slice(0, 5).map(gap => (
            <View key={gap?.id || gap?.region} style={styles.gapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gapRegion} numberOfLines={1}>
                  {gap?.region || 'Unknown region'}
                </Text>
                <Text style={styles.gapDetail} numberOfLines={1}>
                  No {gap?.missingTierLabel || ''} Admin — escalated to {gap?.escalatedToLabel || 'Super'}
                </Text>
              </View>
              <View style={styles.gapCount}>
                <Text style={styles.gapCountText}>{Number(gap?.pending || 0)}</Text>
              </View>
            </View>
          ))}

          {(coverageGaps || []).length > 5 ? (
            <Text style={styles.gapMore}>
              +{(coverageGaps || []).length - 5} more region
              {(coverageGaps || []).length - 5 === 1 ? '' : 's'}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.gapAction}
            onPress={() => navigation.navigate('Admins' as never)}
            activeOpacity={0.8}
          >
            <Icon name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.gapActionText}>Staff a region</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={superStyles.sectionHeaderRow}>
        <Text style={superStyles.sectionTitle}>Browse applications</Text>
      </View>

      <View style={superStyles.menuCard}>
        {TIERS.map(meta => {
          const count = meta.key === 'block' ? summary.blocks
            : meta.key === 'district' ? summary.districts
            : summary.states;
          return (
            <TouchableOpacity
              key={meta.key}
              style={superStyles.menuRow}
              activeOpacity={0.7}
              onPress={() => openTier(meta.key)}
            >
              <View style={[superStyles.menuIcon, { backgroundColor: meta.light }]}>
                <Icon name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={superStyles.menuLabel}>{meta.title}</Text>
                <Text style={superStyles.menuCaption}>
                  {count} {count === 1 ? meta.title.toLowerCase() : meta.plural.toLowerCase()}
                </Text>
              </View>
              <Icon name="chevron-right" size={22} color={SUPER.textFaint} />
            </TouchableOpacity>
          );
        })}

        {/* Staff management shortcut */}
        <TouchableOpacity
          style={[superStyles.menuRow, superStyles.menuRowLast]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Admins')}
        >
          <View style={[superStyles.menuIcon, { backgroundColor: ACCENTS.lightPurple }]}>
            <Icon name="admin-panel-settings" size={20} color={ACCENTS.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={superStyles.menuLabel}>Admins</Text>
            <Text style={superStyles.menuCaption}>{stats.totalAdmins} accounts</Text>
          </View>
          <Icon name="chevron-right" size={22} color={SUPER.textFaint} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---- level 2: region cards ----

  const renderRegion = ({ item }: { item: Region }) => (
    <TouchableOpacity style={styles.regionCard} activeOpacity={0.9} onPress={() => openRegion(item)}>
      <View style={styles.regionHead}>
        <View style={styles.regionAvatar}>
          <Text style={styles.regionAvatarText}>{getInitials(item?.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.regionNameRow}>
            <Text style={styles.regionName} numberOfLines={1}>{item?.name || 'Unassigned'}</Text>
            {/* Active = this region actually has an admin assigned to it. */}
            <View style={[
              superStyles.statusPill,
              { backgroundColor: Number(item?.admins || 0) > 0 ? ACCENTS.lightGreen : SUPER.field },
            ]}>
              <View style={[
                superStyles.statusPillDot,
                { backgroundColor: Number(item?.admins || 0) > 0 ? ACCENTS.green : SUPER.textFaint },
              ]} />
              <Text style={[
                superStyles.statusPillText,
                { color: Number(item?.admins || 0) > 0 ? ACCENTS.green : SUPER.textMuted },
              ]}>
                {Number(item?.admins || 0) > 0 ? 'Active' : 'No admin'}
              </Text>
            </View>
          </View>
          {tier !== 'state' ? (
            <Text style={styles.regionParent} numberOfLines={1}>
              {[item?.district !== item?.name ? item?.district : '', item?.state].filter(Boolean).join(', ') || '—'}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={SUPER.textFaint} />
      </View>

      {/* Application data only — staff counts live in the Admins tab. */}
      <View style={styles.regionStats}>
        {[
          { label: 'Total', value: item?.applications, color: SUPER.text },
          { label: 'Pending', value: item?.pending, color: ACCENTS.orange },
          { label: 'Approved', value: item?.approved, color: ACCENTS.green },
          { label: 'Rejected', value: item?.rejected, color: ACCENTS.red },
        ].map((stat, i) => (
          <View key={stat.label} style={[styles.regionStat, i > 0 && styles.regionStatDivider]}>
            <Text style={[styles.regionStatValue, { color: stat.color }]}>{Number(stat.value || 0)}</Text>
            <Text style={styles.regionStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  // ---- level 3 ----

  const renderApplicant = ({ item }: { item: Applicant }) => (
    <ApplicantRow
      applicant={item}
      busy={pendingActionId === (item?.id || item?._id)}
      onPress={applicant => navigation.navigate('ApplicantDetail', { applicant })}
      onReview={handleReview}
    />
  );

  /** The region's four totals, shown above its application list. */
  const renderRegionSummary = () => (
    <View style={superStyles.summaryCard}>
      {[
        { label: 'Total', value: region?.applications, color: SUPER.text },
        { label: 'Pending', value: region?.pending, color: ACCENTS.orange },
        { label: 'Approved', value: region?.approved, color: ACCENTS.green },
        { label: 'Rejected', value: region?.rejected, color: ACCENTS.red },
      ].map((cell, index) => (
        <View
          key={cell.label}
          style={[superStyles.summaryCell, index > 0 && superStyles.summaryDivider]}
        >
          <Text style={[superStyles.summaryValue, { color: cell.color }]}>
            {Number(cell.value || 0)}
          </Text>
          <Text style={superStyles.summaryLabel}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderSearchPanel = () => {
    const groups: { title: string; kind: 'application' | 'member' | 'admin'; hits: any[] }[] = [
      { title: 'Applications', kind: 'application', hits: searchResults.applications || [] },
      { title: 'Members', kind: 'member', hits: searchResults.members || [] },
      { title: 'Admins', kind: 'admin', hits: searchResults.admins || [] },
    ];
    const total = groups.reduce((sum, g) => sum + (g.hits || []).length, 0);

    if (searching && total === 0) return <SkeletonList count={4} />;

    if (total === 0) {
      return (
        <EmptyState
          icon="search"
          accentIcon="close"
          title={`No matches for “${(searchQuery || '').trim()}”`}
          caption="Try a name, an email address or a region."
        />
      );
    }

    return (
      <View>
        {groups.filter(g => (g.hits || []).length > 0).map(group => (
          <View key={group.title} style={styles.hitGroup}>
            <Text style={styles.hitGroupTitle}>{group.title}</Text>
            <View style={superStyles.card}>
              {(group.hits || []).map((hit, index) => (
                <TouchableOpacity
                  key={`${group.kind}-${hit?.id || hit?.email}`}
                  style={[styles.hitRow, index === (group.hits || []).length - 1 && styles.hitRowLast]}
                  activeOpacity={0.7}
                  onPress={() => openHit(group.kind, hit)}
                >
                  <View style={styles.hitAvatar}>
                    <Text style={styles.hitAvatarText}>{getInitials(hit?.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hitName} numberOfLines={1}>
                      {hit?.fullName || hit?.email || 'Unnamed'}
                    </Text>
                    <Text style={styles.hitMeta} numberOfLines={1}>
                      {[hit?.roleLabel || hit?.status, hit?.location].filter(Boolean).join(' · ') || hit?.email || ''}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={SUPER.textFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const listEmpty = () => {
    if (loading) {
      return <SkeletonList count={level === 'regions' ? 4 : 3} variant={level === 'regions' ? 'region' : 'row'} />;
    }
    if (error) {
      return <EmptyState icon="cloud-off" accentIcon="refresh" tone="error" title={error} caption="Pull down to try again." />;
    }
    return level === 'regions'
      ? <EmptyState title="No regions match" caption="Clear the filter to see every region." />
      : (
        <EmptyState
          title={`No ${status === 'all' ? '' : status} applications here`.replace('  ', ' ')}
          caption={`Nothing in ${region?.name || 'this region'} matches this filter yet.`}
        />
      );
  };

  const keyExtractor = useCallback(
    (item: any, index: number) => String(item?.id || item?._id || item?.name || index),
    [],
  );

  return (
    <SafeAreaView style={superStyles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SUPER.bg} />

      {level === 'tiers' ? (
        // Dashboard-style header, matching the tier admin dashboards.
        <View style={superStyles.header}>
          <View style={superStyles.headerLeft}>
            <Text style={superStyles.welcomeText}>{getGreeting()}</Text>
            <Text style={superStyles.headerTitle} numberOfLines={1}>
              {(adminName || 'Super Admin').split(' ')[0]}!
            </Text>
            <Text style={superStyles.headerSubtitle}>Super Admin · Platform-wide</Text>
          </View>
          <TouchableOpacity
            style={superStyles.headerRight}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <View style={superStyles.avatarSmall}>
              <Text style={superStyles.avatarSmallText}>{getInitials(adminName)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        // Drill-down header: back arrow + where you are.
        <View style={superStyles.pageHeader}>
          <TouchableOpacity style={superStyles.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={SUPER.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={superStyles.pageTitle} numberOfLines={1}>
              {level === 'regions'
                ? (TIERS.find(t => t.key === tier)?.plural || 'Regions')
                : (region?.name || 'Region')}
            </Text>
            <Text style={superStyles.pageSubtitle} numberOfLines={1}>
              {level === 'regions'
                ? `${visibleRegions.length} ${(TIERS.find(t => t.key === tier)?.plural || '').toLowerCase()}`
                : [region?.district !== region?.name ? region?.district : '', region?.state]
                    .filter(Boolean).join(', ') || `${(applicants || []).length} applications`}
            </Text>
          </View>
        </View>
      )}

      {level === 'tiers' ? (
        <View style={superStyles.searchBar}>
          <Icon name="search" size={20} color={SUPER.textFaint} />
          <TextInput
            style={superStyles.searchInput}
            placeholder="Search members, applications, admins"
            placeholderTextColor={SUPER.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {showingSearch ? (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={SUPER.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {level === 'regions' ? (
        <View style={superStyles.searchBar}>
          <Icon name="search" size={20} color={SUPER.textFaint} />
          <TextInput
            style={superStyles.searchInput}
            placeholder={`Filter ${(TIERS.find(t => t.key === tier)?.plural || '').toLowerCase()}`}
            placeholderTextColor={SUPER.textFaint}
            value={regionFilter}
            onChangeText={setRegionFilter}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {regionFilter ? (
            <TouchableOpacity onPress={() => setRegionFilter('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={SUPER.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {level === 'applications' ? (
        <View style={styles.tabsWrap}>
          <View style={superStyles.tabsRow}>
            {STATUS_TABS.map(tab => {
              const isActive = status === tab;
              // Counts come from the region row the drill-down was opened
              // from — the same figures its card showed a moment ago.
              const count = tab === 'all' ? region?.applications
                : tab === 'pending' ? region?.pending
                : tab === 'approved' ? region?.approved
                : region?.rejected;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[superStyles.tabPill, isActive && superStyles.tabPillActive]}
                  onPress={() => setStatus(tab)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[superStyles.tabPillText, isActive && superStyles.tabPillTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({Number(count || 0)})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <FlatList
        data={
          showingSearch || level === 'tiers' ? []
            : level === 'regions' ? visibleRegions
            : (applicants || [])
        }
        keyExtractor={keyExtractor}
        renderItem={
          level === 'regions'
            ? (renderRegion as any)
            : level === 'applications'
              ? (renderApplicant as any)
              : () => null
        }
        contentContainerStyle={superStyles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          showingSearch ? renderSearchPanel()
            : level === 'tiers'
              ? (loading ? <SkeletonList count={3} variant="tier" /> : renderTiers())
              : level === 'applications'
                ? renderRegionSummary()
                : null
        }
        ListEmptyComponent={showingSearch || level === 'tiers' ? null : listEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 16 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24,
    borderRadius: 16, backgroundColor: ACCENTS.lightOrange,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#B45309', lineHeight: 18 },

  gapCard: {
    backgroundColor: SUPER.card, borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: ACCENTS.lightRed,
  },
  gapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  gapTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: SUPER.text },
  gapCaption: { fontSize: 12, color: SUPER.textMuted, lineHeight: 17, marginBottom: 12 },
  gapRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: SUPER.border,
  },
  gapRegion: { fontSize: 13, fontWeight: '600', color: SUPER.text },
  gapDetail: { fontSize: 11, color: SUPER.textFaint, marginTop: 2 },
  gapCount: {
    minWidth: 34, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: ACCENTS.lightRed, alignItems: 'center',
  },
  gapCountText: { fontSize: 12, fontWeight: '700', color: ACCENTS.red },
  gapMore: { fontSize: 11, color: SUPER.textFaint, marginTop: 8, textAlign: 'center' },
  gapAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: SUPER.accent,
  },
  gapActionText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  tierCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: SUPER.card, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  tierIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tierTitle: { fontSize: 16, fontWeight: '700', color: SUPER.text, marginBottom: 2 },
  tierCaption: { fontSize: 12, color: SUPER.textMuted },

  regionCard: {
    backgroundColor: SUPER.card, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  regionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  regionAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENTS.lightPurple, alignItems: 'center', justifyContent: 'center',
  },
  regionAvatarText: { fontSize: 16, fontWeight: '700', color: ACCENTS.purple },
  regionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  regionName: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: SUPER.text },
  regionParent: { fontSize: 12, color: SUPER.textMuted },
  regionStats: {
    flexDirection: 'row', marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: SUPER.border,
  },
  regionStat: { flex: 1, alignItems: 'center' },
  regionStatDivider: { borderLeftWidth: 1, borderLeftColor: SUPER.border },
  regionStatValue: { fontSize: 18, fontWeight: '800' },
  regionStatLabel: { fontSize: 11, color: SUPER.textFaint, marginTop: 4 },

  hitGroup: { marginBottom: 8 },
  hitGroupTitle: {
    fontSize: 13, fontWeight: '700', color: SUPER.textMuted,
    marginBottom: 10, marginLeft: 4,
  },
  hitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SUPER.border,
  },
  hitRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  hitAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ACCENTS.lightPurple, alignItems: 'center', justifyContent: 'center',
  },
  hitAvatarText: { fontSize: 14, fontWeight: '700', color: ACCENTS.purple },
  hitName: { fontSize: 14, fontWeight: '600', color: SUPER.text },
  hitMeta: { fontSize: 12, color: SUPER.textMuted, marginTop: 2 },
});

export default SuperAdminActionHubScreen;
