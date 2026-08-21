import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../theme/theme';

import { StateAdminProvider } from '../screens/admin/state/context/StateAdminContext';
import StateDashboardScreen from '../screens/admin/state/StateDashboardScreen';
import StateApprovalsScreen from '../screens/admin/state/StateApprovalsScreen';
import StateMembersScreen from '../screens/admin/state/StateMembersScreen';
import StateSettingsScreen from '../screens/admin/state/StateSettingsScreen';

export type StateAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<StateAdminBottomTabParamList>();

const HomeIcon = ({ color, size }: any) => <Icon name="home" size={size} color={color} />;
const ApprovalsIcon = ({ color, size }: any) => <Icon name="fact-check" size={size} color={color} />;
const MembersIcon = ({ color, size }: any) => <Icon name="people" size={size} color={color} />;
const SettingsIcon = ({ color, size }: any) => <Icon name="settings" size={size} color={color} />;

const StateAdminBottomTabs = () => {
  return (
    <StateAdminProvider>
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
        <Tab.Screen name="Dashboard" component={StateDashboardScreen} options={{ tabBarIcon: HomeIcon }} />
        <Tab.Screen name="Approvals" component={StateApprovalsScreen} options={{ tabBarIcon: ApprovalsIcon }} />
        <Tab.Screen name="Members" component={StateMembersScreen} options={{ tabBarIcon: MembersIcon }} />
        <Tab.Screen name="Settings" component={StateSettingsScreen} options={{ tabBarIcon: SettingsIcon }} />
      </Tab.Navigator>
    </StateAdminProvider>
  );
};

export default StateAdminBottomTabs;
