import React from 'react';
import AdminHubView from '../shared/AdminHubView';
import { useStateAdminData } from './context/StateAdminContext';

/**
 * State admin → Hub: every district and block of the state, drilled down to
 * each region's applications (GET /admin/team/*). A verdict given here also
 * refreshes the dashboard's buckets.
 */
const StateHubScreen = ({ navigation }: any) => {
  const { currentState, fetchDashboardData } = useStateAdminData();
  return (
    <AdminHubView
      tier="state"
      region={currentState || ''}
      navigation={navigation}
      onDecided={() => { fetchDashboardData(true); }}
    />
  );
};

export default StateHubScreen;
