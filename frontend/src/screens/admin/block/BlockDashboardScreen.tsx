import React from 'react';
import TierDashboardView from '../shared/TierDashboardView';
import { useBlockAdminData } from './context/BlockAdminContext';

/**
 * Block admin → Dashboard: the website's shared `AdminDashboardScreen`
 * (tier="block") — four tiles that add up, and the five latest applications.
 * Data: GET /admin/block/dashboard via the block context.
 */
const BlockDashboardScreen = ({ navigation }: any) => {
  const {
    stats, applicants, loading, refreshing, fetchDashboardData, adminName, profileImageUri, scopeMessage,
  } = useBlockAdminData();
  const location = [stats?.blockName, stats?.districtName, stats?.stateName].filter(Boolean).join(', ');
  return (
    <TierDashboardView
      tier="block"
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

export default BlockDashboardScreen;
