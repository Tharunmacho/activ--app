import React from 'react';
import TierApprovalsView from '../shared/TierApprovalsView';
import { useStateAdminData } from './context/StateAdminContext';

/**
 * State admin → Approvals: the website's shared `AdminApprovalsScreen`
 * (tier="state"). The buckets are the server's own from
 * GET /admin/state/dashboard, rendered by the shared `ApprovalQueue`;
 * approve / reject post the website's /applications/:id/approve|reject aliases.
 */
const StateApprovalsScreen = ({ navigation }: any) => {
  const { applicants, submitReview, currentState, loading, refreshing, fetchDashboardData } = useStateAdminData();
  return (
    <TierApprovalsView
      tier="state"
      region={currentState || ''}
      applicants={applicants}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchDashboardData(true)}
      submitReview={submitReview}
      navigation={navigation}
    />
  );
};

export default StateApprovalsScreen;
