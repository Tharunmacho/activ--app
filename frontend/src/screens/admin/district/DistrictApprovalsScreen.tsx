import React from 'react';
import TierApprovalsView from '../shared/TierApprovalsView';
import { useDistrictAdminData } from './context/DistrictAdminContext';

/**
 * District admin → Approvals: the website's shared `AdminApprovalsScreen`
 * (tier="district"). The buckets are the server's own from
 * GET /admin/district/dashboard, rendered by the shared `ApprovalQueue`;
 * approve / reject post the website's /applications/:id/approve|reject aliases.
 */
const DistrictApprovalsScreen = ({ navigation }: any) => {
  const { applicants, submitReview, currentDistrict, loading, refreshing, fetchDashboardData } = useDistrictAdminData();
  return (
    <TierApprovalsView
      tier="district"
      region={currentDistrict || ''}
      applicants={applicants}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchDashboardData(true)}
      submitReview={submitReview}
      navigation={navigation}
    />
  );
};

export default DistrictApprovalsScreen;
