import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { DistrictAdminProvider } from '../screens/admin/district/context/DistrictAdminContext';
import DistrictDashboardScreen from '../screens/admin/district/DistrictDashboardScreen';
import DistrictApprovalsScreen from '../screens/admin/district/DistrictApprovalsScreen';
import DistrictMembersScreen from '../screens/admin/district/DistrictMembersScreen';
import DistrictSettingsScreen from '../screens/admin/district/DistrictSettingsScreen';

export type DistrictAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;
  Settings: undefined;
};

/** The bar's own height, before the device's gesture inset is added. */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 52 : 58;

const Tab = createBottomTabNavigator<DistrictAdminBottomTabParamList>();

const HomeIcon = ({ color, size }: any) => <Icon name="home" size={size} color={color} />;
const ApprovalsIcon = ({ color, size }: any) => <Icon name="fact-check" size={size} color={color} />;
const MembersIcon = ({ color, size }: any) => <Icon name="people" size={size} color={color} />;
const SettingsIcon = ({ color, size }: any) => <Icon name="settings" size={size} color={color} />;

const DistrictAdminBottomTabs = () => {
  // Without this the bar sits under Android's gesture pill and iOS's home
  // indicator: labels get clipped and the last rows of a list scroll behind it.
  const insets = useSafeAreaInsets();

  return (
    <DistrictAdminProvider>
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
        <Tab.Screen name="Dashboard" component={DistrictDashboardScreen} options={{ tabBarIcon: HomeIcon }} />
        <Tab.Screen name="Approvals" component={DistrictApprovalsScreen} options={{ tabBarIcon: ApprovalsIcon }} />
        <Tab.Screen name="Members" component={DistrictMembersScreen} options={{ tabBarIcon: MembersIcon }} />
        <Tab.Screen name="Settings" component={DistrictSettingsScreen} options={{ tabBarIcon: SettingsIcon }} />
      </Tab.Navigator>
    </DistrictAdminProvider>
  );
};

export default DistrictAdminBottomTabs;
