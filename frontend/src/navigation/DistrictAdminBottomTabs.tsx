import React from 'react';
import { DistrictAdminProvider, useDistrictAdminData } from '../screens/admin/district/context/DistrictAdminContext';
import DistrictDashboardScreen from '../screens/admin/district/DistrictDashboardScreen';
import DistrictApprovalsScreen from '../screens/admin/district/DistrictApprovalsScreen';
import DistrictMembersScreen from '../screens/admin/district/DistrictMembersScreen';
import DistrictSettingsScreen from '../screens/admin/district/DistrictSettingsScreen';
import DistrictHubScreen from '../screens/admin/district/DistrictHubScreen';
import TierTabs from '../screens/admin/shared/TierTabs';

/**
 * The District admin: the website's rail for this tier (Dashboard · Approvals ·
 * Members · Hub · Settings) as bottom tabs, plus the menu drawer (☰).
 */
export type DistrictAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;
  Hub: undefined;
  Settings: undefined;
};

const Tabs = ({ navigation }: { navigation: any }) => {
  const { adminName, dynamicRoleTitle, currentDistrict, profileImageUri } = useDistrictAdminData();
  return (
    <TierTabs
      tier="district"
      stackRoute="DistrictDashboard"
      rootNavigation={navigation}
      identity={{ adminName, roleTitle: dynamicRoleTitle, region: currentDistrict || '', photo: profileImageUri }}
      screens={[
      { name: 'Dashboard', component: DistrictDashboardScreen },
      { name: 'Approvals', component: DistrictApprovalsScreen },
      { name: 'Members', component: DistrictMembersScreen },
      { name: 'Hub', component: DistrictHubScreen },
      { name: 'Settings', component: DistrictSettingsScreen },
      ]}
    />
  );
};

const DistrictAdminBottomTabs = ({ navigation }: any) => (
  <DistrictAdminProvider>
    <Tabs navigation={navigation} />
  </DistrictAdminProvider>
);

export default DistrictAdminBottomTabs;
