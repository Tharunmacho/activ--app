import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminTabScreenOptions, makeAdminTabIcon } from '../screens/admin/shared/adminTabBar';

import { SuperAdminProvider } from '../screens/admin/super/context/SuperAdminContext';
import SuperAdminActionHubScreen from '../screens/admin/super/SuperAdminActionHubScreen';
import ManageAdminsScreen from '../screens/admin/super/ManageAdminsScreen';
import SystemScreen from '../screens/admin/super/SystemScreen';
import SuperMenuScreen from '../screens/admin/super/SuperMenuScreen';

export type SuperAdminBottomTabParamList = {
  Hub: undefined;
  Admins: { q?: string } | undefined;
  Settings: undefined;
  /** Every other Super Admin feature (the website sidebar) — see SuperMenuScreen. */
  More: undefined;
};

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

const HubIcon = makeAdminTabIcon('space-dashboard');
const AdminsIcon = makeAdminTabIcon('manage-accounts');
const SettingsIcon = makeAdminTabIcon('settings');
const MoreIcon = makeAdminTabIcon('apps');

const SuperAdminBottomTabs = () => {
  // Without this the bar sits under Android's gesture pill and iOS's home
  // indicator: labels get clipped and the last rows of a list scroll behind it.
  const insets = useSafeAreaInsets();

  return (
    <SuperAdminProvider>
      <Tab.Navigator
        screenOptions={adminTabScreenOptions(insets.bottom)}
      >
        <Tab.Screen name="Hub" component={SuperAdminActionHubScreen} options={{ tabBarIcon: HubIcon }} />
        <Tab.Screen name="Admins" component={ManageAdminsScreen} options={{ tabBarIcon: AdminsIcon }} />
        <Tab.Screen name="Settings" component={SystemScreen} options={{ tabBarIcon: SettingsIcon }} />
        <Tab.Screen name="More" component={SuperMenuScreen} options={{ tabBarIcon: MoreIcon }} />
      </Tab.Navigator>
    </SuperAdminProvider>
  );
};

export default SuperAdminBottomTabs;
