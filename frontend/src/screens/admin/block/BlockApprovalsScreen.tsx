import React from 'react';
import TierApprovalsView from '../shared/TierApprovalsView';
import { useBlockAdminData } from './context/BlockAdminContext';

/**
 * Block admin → Approvals: the website's shared `AdminApprovalsScreen`
 * (tier="block"). The buckets are the server's own from
 * GET /admin/block/dashboard, rendered by the shared `ApprovalQueue`;
 * approve / reject post the website's /applications/:id/approve|reject aliases.
 */
const BlockApprovalsScreen = ({ navigation }: any) => {
  const { applicants, submitReview, currentBlock, loading, refreshing, fetchDashboardData } = useBlockAdminData();
  return (
    <TierApprovalsView
      tier="block"
      region={currentBlock || ''}
      applicants={applicants}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchDashboardData(true)}
      submitReview={submitReview}
      navigation={navigation}
    />
  );
};

export default BlockApprovalsScreen;
