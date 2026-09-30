import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminTabScreenOptions, makeAdminTabIcon } from '../screens/admin/shared/adminTabBar';

import EventsAdminDashboardScreen from '../screens/eventsAdmin/EventsAdminDashboardScreen';
import EventsCheckinHomeScreen from '../screens/eventsAdmin/EventsCheckinHomeScreen';
import EventsAdminAccountScreen from '../screens/eventsAdmin/EventsAdminAccountScreen';

/**
 * The EVENTS ADMIN console — the same premium tab bar as the four admin tiers.
 *
 *   Dashboard  today at the door, what is coming, programme counts
 *   Events     every event to check in to (upcoming / past), with its actions
 *   Account    who is signed in, what lives on the website, log out
 *
 * The scanner, bookings, booking detail and attendance are STACK screens
 * (routes/eventsAdminRoutes.tsx) pushed over the tabs: the camera is only
 * mounted while the scanner is open, and nothing here needs a native Modal
 * inside a tab (CLAUDE.md Rule 2).
 */
export type EventsAdminTabParamList = {
  Dashboard: undefined;
  Events: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<EventsAdminTabParamList>();

const DashboardIcon = makeAdminTabIcon('space-dashboard');
const EventsIcon = makeAdminTabIcon('event');
const AccountIcon = makeAdminTabIcon('account-circle');

const EventsAdminBottomTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={adminTabScreenOptions(insets.bottom)}>
      <Tab.Screen name="Dashboard" component={EventsAdminDashboardScreen} options={{ tabBarIcon: DashboardIcon }} />
      <Tab.Screen name="Events" component={EventsCheckinHomeScreen} options={{ tabBarIcon: EventsIcon }} />
      <Tab.Screen name="Account" component={EventsAdminAccountScreen} options={{ tabBarIcon: AccountIcon }} />
    </Tab.Navigator>
  );
};

export default EventsAdminBottomTabs;
