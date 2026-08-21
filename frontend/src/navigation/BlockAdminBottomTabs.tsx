import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../theme/theme';

import { BlockAdminProvider } from '../screens/admin/block/context/BlockAdminContext';
import BlockDashboardScreen from '../screens/admin/block/BlockDashboardScreen';
import BlockApprovalsScreen from '../screens/admin/block/BlockApprovalsScreen';
import BlockMembersScreen from '../screens/admin/block/BlockMembersScreen';
import BlockSettingsScreen from '../screens/admin/block/BlockSettingsScreen';

export type BlockAdminBottomTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Members: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BlockAdminBottomTabParamList>();

const HomeIcon = ({ color, size }: any) => <Icon name="home" size={size} color={color} />;
const ApprovalsIcon = ({ color, size }: any) => <Icon name="fact-check" size={size} color={color} />;
const MembersIcon = ({ color, size }: any) => <Icon name="people" size={size} color={color} />;
const SettingsIcon = ({ color, size }: any) => <Icon name="settings" size={size} color={color} />;

const BlockAdminBottomTabs = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <BlockAdminProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366F1', // Primary purple from design
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0', // Slightly darker border for contrast
            backgroundColor: '#FAFAFA', // Match screen background exactly
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={BlockDashboardScreen}
          options={{
            tabBarIcon: HomeIcon,
          }}
        />
        <Tab.Screen
          name="Approvals"
          component={BlockApprovalsScreen}
          options={{
            tabBarIcon: ApprovalsIcon,
          }}
        />
        <Tab.Screen
          name="Members"
          component={BlockMembersScreen}
          options={{
            tabBarIcon: MembersIcon,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={BlockSettingsScreen}
          options={{
            tabBarIcon: SettingsIcon,
          }}
        />
      </Tab.Navigator>
    </BlockAdminProvider>
  );
};

export default BlockAdminBottomTabs;
