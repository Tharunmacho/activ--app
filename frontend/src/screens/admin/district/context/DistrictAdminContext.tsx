import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getUserData, setUserData } from '../../../../services/api';
import { Applicant } from '../../../../types';

export interface DistrictStats {
  totalMembers: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalApplications: number;
  activeBusinesses: number;
  districtName: string;
  stateName: string;
}

export interface ApplicantBuckets {
  pending: Applicant[];
  approved: Applicant[];
  rejected: Applicant[];
  all: Applicant[];
}

const EMPTY_BUCKETS: ApplicantBuckets = {
  pending: [],
  approved: [],
  rejected: [],
  all: [],
};

interface DistrictAdminContextType {
  loading: boolean;
  refreshing: boolean;
  stats: DistrictStats | null;
  applicants: ApplicantBuckets;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  dynamicRoleTitle: string;
  currentDistrict: string;
  profileImageUri: string | null;
  setProfileImageUri: (uri: string | null) => void;
  fetchDashboardData: (isRefresh?: boolean) => Promise<void>;
  submitReview: (applicant: Applicant, action: 'approve' | 'reject', reason?: string) => Promise<void>;

  updateAdminProfile: (fullName: string, email: string, phoneNumber?: string) => void;
  pendingActionId: string | null;
}

const DistrictAdminContext = createContext<DistrictAdminContextType | undefined>(undefined);

export const DistrictAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DistrictStats | null>(null);
  const [applicants, setApplicants] = useState<ApplicantBuckets>(EMPTY_BUCKETS);
  const [adminName, setAdminName] = useState<string>('District Admin');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPhone, setAdminPhone] = useState<string>('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [profileImageUri, setProfileImageUriState] = useState<string | null>(null);

  const setProfileImageUri = async (uri: string | null) => {
    setProfileImageUriState(uri);
    try {
      if (uri) await AsyncStorage.setItem(`@profile_img_${adminEmail || 'district'}`, uri);
      else await AsyncStorage.removeItem(`@profile_img_${adminEmail || 'district'}`);
    } catch {}
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/admin/district/dashboard');
      const payload = response.data.data || response.data;
      setStats(payload.stats || null);
      setApplicants({ ...EMPTY_BUCKETS, ...(payload.applicants || {}) });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getUserData()
      .then(async data => {
        if (data?.fullName || data?.name) setAdminName(data.fullName || data.name);
        if (data?.phoneNumber || data?.phone) setAdminPhone(data.phoneNumber || data.phone);
        if (data?.email) {
          setAdminEmail(data.email);
          try {
            const savedUri = await AsyncStorage.getItem(`@profile_img_${data.email}`);
            if (savedUri) setProfileImageUriState(savedUri);
          } catch {}
        }
      })
      .catch(() => {});

    // Then the record itself. The cached user object is only ever as complete as
    // the login response that wrote it, and it goes stale the moment a Super
    // Admin edits the account — so the stored copy seeds the screen instantly and
    // this corrects it a moment later. Failing is fine: the cached values stand.
    api.get('/admin/profile')
      .then(response => {
        const profile = response.data?.data || response.data || {};
        if (profile?.fullName) setAdminName(profile.fullName);
        if (profile?.email) setAdminEmail(profile.email);
        if (typeof profile?.phoneNumber === 'string') setAdminPhone(profile.phoneNumber);
      })
      .catch(() => {});
    fetchDashboardData();
  }, [fetchDashboardData]);

  // No fallback — see the note in BlockAdminContext.
  const currentDistrict = stats?.districtName || '';
  const dynamicRoleTitle = currentDistrict ? `${currentDistrict} District Admin` : 'District Admin';

  const updateAdminProfile = (fullName: string, email: string, phoneNumber?: string) => {
    if (fullName) setAdminName(fullName);
    if (email) setAdminEmail(email);
    if (typeof phoneNumber === 'string') setAdminPhone(phoneNumber);

    // Mirror it into the cached user object. Without this the screen shows the
    // new value until the app restarts, then silently reverts to the one stored
    // at login — which reads as the save having failed.
    getUserData()
      .then(data => setUserData({
        ...(data || {}),
        ...(fullName ? { fullName, name: fullName } : {}),
        ...(email ? { email } : {}),
        ...(typeof phoneNumber === 'string' ? { phoneNumber, phone: phoneNumber } : {}),
      }))
      .catch(() => {});
  };

  /**
   * The reason the admin actually typed, not a placeholder.
   *
   * This took only (applicant, action) and hardcoded
   * `rejectionReason: `Rejected by ${dynamicRoleTitle}``. The shared
   * `ApprovalQueue` component has always collected a real reason and passed
   * it as a third argument — which this signature simply did not accept, so
   * every explanation an admin wrote was dropped on the floor and the
   * applicant was shown boilerplate. The backend stores whatever arrives in
   * `rejectionReason`, so the value was lost here, on the client.
   *
   * The old string stays as a fallback for a rejection submitted with no
   * text, so a reason is never empty.
   */
  const submitReview = async (
    applicant: Applicant,
    action: 'approve' | 'reject',
    reason?: string,
  ) => {
    setPendingActionId(applicant.id);
    try {
      await api.post(`/applications/${applicant.id}/district-review`, {
        action,
        rejectionReason:
          action === 'reject'
            ? (reason || '').trim() || `Rejected by ${dynamicRoleTitle}`
            : undefined,
      });

      setApplicants(prev => {
        const nextPending = (prev.pending || []).filter(a => a.id !== applicant.id);
        const updatedApplicant: any = {
          ...applicant,
          status: action === 'approve' ? 'Pending-State' : 'Rejected',
          stage: action === 'approve' ? 'approved' : 'rejected',
          statusLabel: action === 'approve' ? 'Approved' : 'Rejected',
          approvedByText: action === 'approve'
            ? `Approved by ${dynamicRoleTitle}`
            : `Rejected by ${dynamicRoleTitle}`,
        };
        return {
          ...prev,
          pending: nextPending,
          approved: action === 'approve' ? [updatedApplicant, ...(prev.approved || [])] : prev.approved,
          rejected: action === 'reject' ? [updatedApplicant, ...(prev.rejected || [])] : prev.rejected,
          all: (prev.all || []).map(a => (a.id === applicant.id ? updatedApplicant : a)),
        };
      });

      Alert.alert(
        'Success',
        action === 'approve'
          ? 'Application approved and forwarded to the State Admin.'
          : 'Application rejected.',
      );
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || `Failed to ${action} applicant`);
    } finally {
      setPendingActionId(null);
    }
  };

  const value: DistrictAdminContextType = {
    loading,
    refreshing,
    stats,
    applicants,
    adminName: adminName && adminName !== 'District Admin' ? adminName : dynamicRoleTitle,
    adminEmail,
    adminPhone,
    dynamicRoleTitle,
    currentDistrict,
    profileImageUri,
    setProfileImageUri,
    fetchDashboardData,
    submitReview,

    updateAdminProfile,
    pendingActionId,
  };

  return (
    <DistrictAdminContext.Provider value={value}>
      {children}
    </DistrictAdminContext.Provider>
  );
};

export const useDistrictAdminData = () => {
  const context = useContext(DistrictAdminContext);
  if (context === undefined) {
    throw new Error('useDistrictAdminData must be used within a DistrictAdminProvider');
  }
  return context;
};
