import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import api, { getUserData, setUserData } from '../../../../services/api';
import { Applicant } from '../../../../types';

export interface SuperStats {
  totalMembers: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalAdmins: number;
  bottleneckCount: number;
  /** Pending applications currently held by a tier above their own, for want of an admin. */
  escalatedCount: number;
}

/**
 * A region whose own tier has gone unstaffed.
 *
 * These applications are not stuck — orphan fallback has already handed them
 * upwards — but this is the platform saying out loud that a vacancy exists, and
 * the order the vacancies should be filled in.
 */
export interface CoverageGap {
  id: string;
  missingTier: string;
  missingTierLabel: string;
  escalatedTo: string;
  escalatedToLabel: string;
  region: string;
  state: string;
  district: string;
  block: string;
  pending: number;
}
export interface TierStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AllTierStats {
  block: TierStats;
  district: TierStats;
  state: TierStats;
}

export interface TierQueue {
  block: number;
  district: number;
  state: number;
}

/** An applicant plus how long the owning tier has left it sitting. */
export interface Bottleneck extends Applicant {
  stuckDays: number;
  waitingSince: string | null;
  blockedTier: string;
}

export interface SearchHit {
  id: string;
  fullName: string;
  email: string;
  location: string;
  phone?: string;
  status?: string;
  roleLabel?: string;
}

export interface SearchResults {
  query: string;
  members: SearchHit[];
  applications: SearchHit[];
  admins: SearchHit[];
}

const EMPTY_STATS: SuperStats = {
  totalMembers: 0,
  totalApplications: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0,
  totalAdmins: 0,
  bottleneckCount: 0,
  escalatedCount: 0,
};

const EMPTY_SEARCH: SearchResults = { query: '', members: [], applications: [], admins: [] };

interface SuperAdminContextType {
  loading: boolean;
  refreshing: boolean;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  updateAdminProfile: (fullName: string, email: string, phoneNumber?: string) => void;
  adminProfilePhoto: string;
  stats: SuperStats;
  tierStats: AllTierStats | null;
  tierQueue: TierQueue;
  bottlenecks: Bottleneck[];
  bottleneckAfterDays: number;
  coverageGaps: CoverageGap[];
  /** The overview request failed — the figures on the Hub are not current (website Hub banner). */
  overviewFailed: boolean;
  pendingActionId: string | null;
  searchQuery: string;
  searchResults: SearchResults;
  searching: boolean;
  setSearchQuery: (value: string) => void;
  clearSearch: () => void;
  fetchOverview: (isRefresh?: boolean) => Promise<void>;
  proxyReview: (applicant: Applicant, action: 'approve' | 'reject', reason?: string) => Promise<boolean>;
  handleApproval: (applicationId: string, options?: { note?: string }) => Promise<void>;
  handleRejection: (applicationId: string, options?: { note?: string }) => Promise<void>;
  handleSoftDelete: (applicationId: string) => Promise<void>;
  setAdminProfilePhoto: (url: string) => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;

export const SuperAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Super Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminProfilePhoto, setAdminProfilePhoto] = useState('');
  const [stats, setStats] = useState<SuperStats>(EMPTY_STATS);
  const [tierStats, setTierStats] = useState<AllTierStats | null>(null);
  const [tierQueue, setTierQueue] = useState<TierQueue>({ block: 0, district: 0, state: 0 });
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [bottleneckAfterDays, setBottleneckAfterDays] = useState(3);
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [overviewFailed, setOverviewFailed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_SEARCH);
  const [searching, setSearching] = useState(false);

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/admin/super/overview');
      // This backend returns both { success, data } and bare objects.
      const payload = response.data?.data || response.data || {};
      setStats({ ...EMPTY_STATS, ...(payload.stats || {}) });
      if (payload.tierStats) setTierStats(payload.tierStats);
      setTierQueue({ block: 0, district: 0, state: 0, ...(payload.tierQueue || {}) });
      setBottlenecks(payload.bottlenecks || []);
      setBottleneckAfterDays(Number(payload.bottleneckAfterDays || 3));
      setCoverageGaps(payload.coverageGaps || []);
      // Same test as the website Hub: an answer without `stats` is not an overview.
      setOverviewFailed(!payload || !payload.stats);
    } catch (error: any) {
      // Shown inline on the Hub (website parity) — an Alert on every focus
      // refresh would stack popups while the drill-down still works.
      setOverviewFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getUserData()
      .then(data => {
        const name = data?.fullName || data?.name;
        if (name) setAdminName(name);
        if (data?.email) setAdminEmail(data.email);
        if (data?.phoneNumber || data?.phone) setAdminPhone(data.phoneNumber || data.phone);
        if (data?.profilePhoto) setAdminProfilePhoto(data.profilePhoto);
      })
      .catch(() => {});
    // The record itself, for the same reason as the tier contexts: the cached
    // user object only carries what login happened to include, and it goes stale
    // as soon as the profile is edited anywhere else.
    api.get('/admin/profile')
      .then(response => {
        const profile = response.data?.data || response.data || {};
        if (profile?.fullName) setAdminName(profile.fullName);
        if (profile?.email) setAdminEmail(profile.email);
        if (typeof profile?.phoneNumber === 'string') setAdminPhone(profile.phoneNumber);
      })
      .catch(() => {});

    fetchOverview();
  }, [fetchOverview]);

  // Debounced global search. The timer is cleared on every keystroke and on
  // unmount so a pending request can never fire into a torn-down screen.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    const term = (searchQuery || '').trim();

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (term.length < MIN_SEARCH_LENGTH) {
      setSearchResults(EMPTY_SEARCH);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const response = await api.get('/admin/super/search', { params: { q: term } });
        const payload = response.data?.data || response.data || {};
        // Ignore a slow response that a newer keystroke has already superseded.
        if (seq !== searchSeq.current) return;
        setSearchResults({ ...EMPTY_SEARCH, ...payload });
      } catch {
        if (seq === searchSeq.current) setSearchResults(EMPTY_SEARCH);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(EMPTY_SEARCH);
  }, []);

  /**
   * Super override. The backend routes this to whichever tier currently owns
   * the file, so an approval advances it one step — it does not skip straight
   * to final approval — and records the super admin as the proxy.
   */
  const proxyReview = useCallback(async (
    applicant: Applicant,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<boolean> => {
    const id = applicant?.id || applicant?._id || '';
    if (!id) {
      Alert.alert('Error', 'This application has no id to act on.');
      return false;
    }

    setPendingActionId(id);
    try {
      // Exactly the website's payloads (activApi approveApplication /
      // rejectApplication): approve `{}`, reject `{ rejectionReason }`.
      const res = await api.post(
        `/applications/${id}/${action}`,
        action === 'reject' ? { rejectionReason: (reason || '').trim() || 'No reason given' } : {},
      );

      setBottlenecks(prev => (prev || []).filter(item => item.id !== id));
      setStats(prev => ({ ...prev, bottleneckCount: Math.max(0, (prev.bottleneckCount || 0) - 1) }));

      Alert.alert(
        'Done',
        action === 'approve'
          ? String(res?.data?.message || 'Approved — the member profile has been created')
          : 'Rejected',
      );
      fetchOverview(true);
      return true;
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || `Failed to ${action} this application`);
      return false;
    } finally {
      setPendingActionId(null);
    }
  }, [fetchOverview]);

  const handleApproval = async () => {};
  const handleRejection = async () => {};
  const handleSoftDelete = async () => {};

  const updateAdminProfile = useCallback((fullName: string, email: string, phoneNumber?: string) => {
    if (fullName) setAdminName(fullName);
    if (email) setAdminEmail(email);
    if (typeof phoneNumber === 'string') setAdminPhone(phoneNumber);

    getUserData()
      .then(data => setUserData({
        ...(data || {}),
        ...(fullName ? { fullName, name: fullName } : {}),
        ...(email ? { email } : {}),
        ...(typeof phoneNumber === 'string' ? { phoneNumber, phone: phoneNumber } : {}),
      }))
      .catch(() => {});
  }, []);

  const value: SuperAdminContextType = {
    loading,
    refreshing,
    adminName,
    adminEmail,
    adminPhone,
    updateAdminProfile,
    adminProfilePhoto,
    stats,
    tierStats,
    tierQueue,
    bottlenecks,
    bottleneckAfterDays,
    coverageGaps,
    overviewFailed,
    pendingActionId,
    searchQuery,
    searchResults,
    searching,
    setSearchQuery,
    clearSearch,
    fetchOverview,
    proxyReview,
    handleApproval,
    handleRejection,
    handleSoftDelete,
    setAdminProfilePhoto,
  };

  return <SuperAdminContext.Provider value={value}>{children}</SuperAdminContext.Provider>;
};

export const useSuperAdminData = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdminData must be used within a SuperAdminProvider');
  }
  return context;
};
