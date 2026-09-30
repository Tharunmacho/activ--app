import React from 'react';
import TierDashboardView from '../shared/TierDashboardView';
import { useDistrictAdminData } from './context/DistrictAdminContext';

/**
 * District admin → Dashboard: the website's shared `AdminDashboardScreen`
 * (tier="district") — four tiles that add up, and the five latest applications.
 * Data: GET /admin/district/dashboard via the district context.
 */
const DistrictDashboardScreen = ({ navigation }: any) => {
  const {
    stats, applicants, loading, refreshing, fetchDashboardData, adminName, profileImageUri, scopeMessage,
  } = useDistrictAdminData();
  const location = [stats?.districtName, stats?.stateName].filter(Boolean).join(', ');
  return (
    <TierDashboardView
      tier="district"
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

export default DistrictDashboardScreen;
