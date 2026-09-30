import React from 'react';
import AdminHubView from '../shared/AdminHubView';
import { useDistrictAdminData } from './context/DistrictAdminContext';

/**
 * District admin → Hub: every block of the district, drilled down to
 * each region's applications (GET /admin/team/*). A verdict given here also
 * refreshes the dashboard's buckets.
 */
const DistrictHubScreen = ({ navigation }: any) => {
  const { currentDistrict, fetchDashboardData } = useDistrictAdminData();
  return (
    <AdminHubView
      tier="district"
      region={currentDistrict || ''}
      navigation={navigation}
      onDecided={() => { fetchDashboardData(true); }}
    />
  );
};

export default DistrictHubScreen;
