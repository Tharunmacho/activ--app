import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import TierAdminDashboard from '../TierAdminDashboard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const StateSettingsScreen: React.FC<Props> = ({ navigation }) => (
  <TierAdminDashboard tier="state" navigation={navigation} initialNav="settings" />
);

export default StateSettingsScreen;
