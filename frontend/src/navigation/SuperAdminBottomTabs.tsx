import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminTabScreenOptions, makeAdminTabIcon } from '../screens/admin/shared/adminTabBar';

import { SuperAdminProvider } from '../screens/admin/super/context/SuperAdminContext';
import SuperAdminActionHubScreen from '../screens/admin/super/SuperAdminActionHubScreen';
import ManageAdminsScreen from '../screens/admin/super/ManageAdminsScreen';
import ManageEventsScreen from '../screens/admin/super/ManageEventsScreen';
import SystemScreen from '../screens/admin/super/SystemScreen';
import SuperMenuScreen from '../screens/admin/super/SuperMenuScreen';

/**
 * The Super Admin console — five tabs (the most that fit a 360dp phone with
 * their labels): Hub, Admins, Events, Settings, and More (every other feature
 * the website's sidebar has — SuperMenuScreen). Everything deeper is a stack
 * screen (routes/superRoutes.tsx) pushed over the tabs.
 */
export type SuperAdminBottomTabParamList = {
  Hub: undefined;
  Admins: { q?: string } | undefined;
  /** Every event — create, edit, QR, delete (website /super-admin/events). */
  Events: undefined;
  Settings: undefined;
  /** Every other Super Admin feature (the website sidebar) — see SuperMenuScreen. */
  More: undefined;
};

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

const HubIcon = makeAdminTabIcon('space-dashboard');
const AdminsIcon = makeAdminTabIcon('manage-accounts');
const EventsIcon = makeAdminTabIcon('event');
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
        <Tab.Screen name="Events" component={ManageEventsScreen} options={{ tabBarIcon: EventsIcon }} />
        <Tab.Screen name="Settings" component={SystemScreen} options={{ tabBarIcon: SettingsIcon }} />
        <Tab.Screen name="More" component={SuperMenuScreen} options={{ tabBarIcon: MoreIcon }} />
      </Tab.Navigator>
    </SuperAdminProvider>
  );
};

export default SuperAdminBottomTabs;
