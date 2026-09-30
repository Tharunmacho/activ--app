import React from 'react';
import { BlockAdminProvider, useBlockAdminData } from '../screens/admin/block/context/BlockAdminContext';
import BlockDashboardScreen from '../screens/admin/block/BlockDashboardScreen';
import BlockApprovalsScreen from '../screens/admin/block/BlockApprovalsScreen';
import BlockMembersScreen from '../screens/admin/block/BlockMembersScreen';
import BlockSettingsScreen from '../screens/admin/block/BlockSettingsScreen';

import TierTabs from '../screens/admin/shared/TierTabs';

/**
 * The Block admin: the website's rail for this tier (Dashboard · Approvals ·
 * Members · Settings) as bottom tabs, plus the menu drawer (☰).
 */
export type BlockAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;

  Settings: undefined;
};

const Tabs = ({ navigation }: { navigation: any }) => {
  const { adminName, dynamicRoleTitle, currentBlock, profileImageUri } = useBlockAdminData();
  return (
    <TierTabs
      tier="block"
      stackRoute="BlockDashboard"
      rootNavigation={navigation}
      identity={{ adminName, roleTitle: dynamicRoleTitle, region: currentBlock || '', photo: profileImageUri }}
      screens={[
      { name: 'Dashboard', component: BlockDashboardScreen },
      { name: 'Approvals', component: BlockApprovalsScreen },
      { name: 'Members', component: BlockMembersScreen },

      { name: 'Settings', component: BlockSettingsScreen },
      ]}
    />
  );
};

const BlockAdminBottomTabs = ({ navigation }: any) => (
  <BlockAdminProvider>
    <Tabs navigation={navigation} />
  </BlockAdminProvider>
);

export default BlockAdminBottomTabs;
