import React from 'react';
import TierDashboardView from '../shared/TierDashboardView';
import { useStateAdminData } from './context/StateAdminContext';

/**
 * State admin → Dashboard: the website's shared `AdminDashboardScreen`
 * (tier="state") — four tiles that add up, and the five latest applications.
 * Data: GET /admin/state/dashboard via the state context.
 */
const StateDashboardScreen = ({ navigation }: any) => {
  const {
    stats, applicants, loading, refreshing, fetchDashboardData, adminName, profileImageUri, scopeMessage,
  } = useStateAdminData();
  const location = [stats?.stateName].filter(Boolean).join(', ');
  return (
    <TierDashboardView
      tier="state"
      adminName={adminName}
      location={location}
      photo={profileImageUri}
      stats={stats}
      applicants={applicants}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchDashboardData(true)}
      scopeMessage={scopeMessage}
      navigation={navigation}
    />
  );
};

export default StateDashboardScreen;
