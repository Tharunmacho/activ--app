import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { SuperAdminProvider } from '../screens/admin/super/context/SuperAdminContext';
import SuperAdminActionHubScreen from '../screens/admin/super/SuperAdminActionHubScreen';
import ManageAdminsScreen from '../screens/admin/super/ManageAdminsScreen';
import ManageEventsScreen from '../screens/admin/super/ManageEventsScreen';
import SystemScreen from '../screens/admin/super/SystemScreen';

export type SuperAdminBottomTabParamList = {
  Hub: undefined;
  Admins: { q?: string } | undefined;
  Events: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

const HubIcon = ({ color, size }: any) => <Icon name="dashboard" size={size} color={color} />;
const AdminsIcon = ({ color, size }: any) => <Icon name="people" size={size} color={color} />;
const EventsIcon = ({ color, size }: any) => <Icon name="event" size={size} color={color} />;
const SettingsIcon = ({ color, size }: any) => <Icon name="settings" size={size} color={color} />;

/** The bar's own height, before the device's gesture inset is added. */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 52 : 58;

const SuperAdminBottomTabs = () => {
  // Without this the bar sits under Android's gesture pill and iOS's home
  // indicator: labels get clipped and the last rows of a list scroll behind it.
  const insets = useSafeAreaInsets();

  return (
    <SuperAdminProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#FAFAFA',
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 0,
          },
          tabBarItemStyle: { paddingVertical: 0 },
        }}
      >
        <Tab.Screen name="Hub" component={SuperAdminActionHubScreen} options={{ tabBarIcon: HubIcon }} />
        <Tab.Screen name="Admins" component={ManageAdminsScreen} options={{ tabBarIcon: AdminsIcon }} />
        <Tab.Screen name="Events" component={ManageEventsScreen} options={{ tabBarIcon: EventsIcon }} />
        <Tab.Screen name="Settings" component={SystemScreen} options={{ tabBarIcon: SettingsIcon }} />
      </Tab.Navigator>
    </SuperAdminProvider>
  );
};

export default SuperAdminBottomTabs;
