import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getUserData } from '../../../../services/api';
import { Applicant } from '../../../../types';

export interface StateStats {
  totalMembers: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalApplications: number;
  activeBusinesses: number;
  stateName: string;
}

export interface ApplicantBuckets {
  pending: Applicant[];
  approved: Applicant[];
  rejected: Applicant[];
  all: Applicant[];
}

const EMPTY_BUCKETS: ApplicantBuckets = { pending: [], approved: [], rejected: [], all: [] };

interface StateAdminContextType {
  loading: boolean;
  refreshing: boolean;
  stats: StateStats | null;
  applicants: ApplicantBuckets;
  adminName: string;
  adminEmail: string;
  dynamicRoleTitle: string;
  currentState: string;
  profileImageUri: string | null;
  setProfileImageUri: (uri: string | null) => void;
  fetchDashboardData: (isRefresh?: boolean) => Promise<void>;
  submitReview: (applicant: Applicant, action: 'approve' | 'reject') => Promise<void>;
  deleteCandidate: (applicantId: string) => Promise<void>;
  updateAdminProfile: (fullName: string, email: string) => void;
  pendingActionId: string | null;
}

const StateAdminContext = createContext<StateAdminContextType | undefined>(undefined);

export const StateAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StateStats | null>(null);
  const [applicants, setApplicants] = useState<ApplicantBuckets>(EMPTY_BUCKETS);
  const [adminName, setAdminName] = useState<string>('State Admin');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [profileImageUri, setProfileImageUriState] = useState<string | null>(null);

  const setProfileImageUri = async (uri: string | null) => {
    setProfileImageUriState(uri);
    try {
      if (uri) await AsyncStorage.setItem(`@profile_img_${adminEmail || 'state'}`, uri);
      else await AsyncStorage.removeItem(`@profile_img_${adminEmail || 'state'}`);
    } catch {}
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/admin/state/dashboard');
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
        if (data?.email) {
          setAdminEmail(data.email);
          try {
            const savedUri = await AsyncStorage.getItem(`@profile_img_${data.email}`);
            if (savedUri) setProfileImageUriState(savedUri);
          } catch {}
        }
      })
      .catch(() => {});
    fetchDashboardData();
  }, [fetchDashboardData]);

  const currentState = stats?.stateName || 'Tamil Nadu';
  const dynamicRoleTitle = `${currentState} State Admin`;

  const updateAdminProfile = (fullName: string, email: string) => {
    if (fullName) setAdminName(fullName);
    if (email) setAdminEmail(email);
  };

  const submitReview = async (applicant: Applicant, action: 'approve' | 'reject') => {
    setPendingActionId(applicant.id);
    try {
      await api.post(`/applications/${applicant.id}/state-review`, {
        action,
        rejectionReason: action === 'reject' ? `Rejected by ${dynamicRoleTitle}` : undefined,
      });

      setApplicants(prev => {
        const nextPending = (prev.pending || []).filter(a => a.id !== applicant.id);
        const updatedApplicant: any = {
          ...applicant,
          status: action === 'approve' ? 'Approved' : 'Rejected',
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

      Alert.alert('Success', action === 'approve' ? 'Application fully approved!' : 'Application rejected.');
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || `Failed to ${action} applicant`);
    } finally {
      setPendingActionId(null);
    }
  };

  const deleteCandidate = async (applicantId: string) => {
    setPendingActionId(applicantId);
    try {
      await api.post(`/admin/users/${applicantId}/delete`);
      setApplicants(prev => ({
        ...prev,
        pending: (prev.pending || []).filter(a => a.id !== applicantId),
        approved: (prev.approved || []).filter(a => a.id !== applicantId),
        rejected: (prev.rejected || []).filter(a => a.id !== applicantId),
        all: (prev.all || []).filter(a => a.id !== applicantId),
      }));
      Alert.alert('Success', 'Candidate deleted permanently from the database.');
      fetchDashboardData(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete candidate');
    } finally {
      setPendingActionId(null);
    }
  };

  const value: StateAdminContextType = {
    loading, refreshing, stats, applicants,
    adminName: adminName && adminName !== 'State Admin' ? adminName : dynamicRoleTitle,
    adminEmail, dynamicRoleTitle, currentState,
    profileImageUri, setProfileImageUri,
    fetchDashboardData, submitReview, deleteCandidate, updateAdminProfile, pendingActionId,
  };

  return <StateAdminContext.Provider value={value}>{children}</StateAdminContext.Provider>;
};

export const useStateAdminData = () => {
  const context = useContext(StateAdminContext);
  if (context === undefined) throw new Error('useStateAdminData must be used within a StateAdminProvider');
  return context;
};
