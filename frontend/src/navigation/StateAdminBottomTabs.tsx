import React from 'react';
import { StateAdminProvider, useStateAdminData } from '../screens/admin/state/context/StateAdminContext';
import StateDashboardScreen from '../screens/admin/state/StateDashboardScreen';
import StateApprovalsScreen from '../screens/admin/state/StateApprovalsScreen';
import StateMembersScreen from '../screens/admin/state/StateMembersScreen';
import StateSettingsScreen from '../screens/admin/state/StateSettingsScreen';
import StateHubScreen from '../screens/admin/state/StateHubScreen';
import TierTabs from '../screens/admin/shared/TierTabs';

/**
 * The State admin: the website's rail for this tier (Dashboard · Approvals ·
 * Members · Hub · Settings) as bottom tabs, plus the menu drawer (☰).
 */
export type StateAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;
  Hub: undefined;
  Settings: undefined;
};

const Tabs = ({ navigation }: { navigation: any }) => {
  const { adminName, dynamicRoleTitle, currentState, profileImageUri } = useStateAdminData();
  return (
    <TierTabs
      tier="state"
      stackRoute="StateDashboard"
      rootNavigation={navigation}
      identity={{ adminName, roleTitle: dynamicRoleTitle, region: currentState || '', photo: profileImageUri }}
      screens={[
      { name: 'Dashboard', component: StateDashboardScreen },
      { name: 'Approvals', component: StateApprovalsScreen },
      { name: 'Members', component: StateMembersScreen },
      { name: 'Hub', component: StateHubScreen },
      { name: 'Settings', component: StateSettingsScreen },
      ]}
    />
  );
};

const StateAdminBottomTabs = ({ navigation }: any) => (
  <StateAdminProvider>
    <Tabs navigation={navigation} />
  </StateAdminProvider>
);

export default StateAdminBottomTabs;
