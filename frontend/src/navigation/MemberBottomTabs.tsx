import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MemberBottomTabParamList } from '../types';
import DashboardScreen from '../screens/member/dashboard/DashboardScreen';
import BrowseMembersScreen from '../screens/member/BrowseMembersScreen';
import NotificationScreen from '../screens/member/NotificationScreen';
import ProfileScreen from '../screens/member/profile/ProfileScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../theme/theme';

const Tab = createBottomTabNavigator<MemberBottomTabParamList>();

// Tab bar icon components
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="home" size={size} color={color} />
);

const ExploreIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="explore" size={size} color={color} />
);

const NotificationsIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="notifications" size={size} color={color} />
);

const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="person" size={size} color={color} />
);

const MemberBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { display: 'none' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="BrowseMembers"
        component={BrowseMembersScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ExploreIcon,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: NotificationsIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};

export default MemberBottomTabs;
