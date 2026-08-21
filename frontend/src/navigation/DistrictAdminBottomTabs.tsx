import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../theme/theme';

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

const Tab = createBottomTabNavigator<DistrictAdminBottomTabParamList>();

const HomeIcon = ({ color, size }: any) => <Icon name="home" size={size} color={color} />;
const ApprovalsIcon = ({ color, size }: any) => <Icon name="fact-check" size={size} color={color} />;
const MembersIcon = ({ color, size }: any) => <Icon name="people" size={size} color={color} />;
const SettingsIcon = ({ color, size }: any) => <Icon name="settings" size={size} color={color} />;

const DistrictAdminBottomTabs = () => {
  return (
    <DistrictAdminProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#FAFAFA',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
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
