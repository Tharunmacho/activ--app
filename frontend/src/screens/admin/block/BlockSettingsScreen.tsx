import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import BlockAdminDashboardScreen from '../BlockAdminDashboardScreen';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const BlockSettingsScreen: React.FC<Props> = ({ navigation }) => (
  <BlockAdminDashboardScreen navigation={navigation} initialNav="settings" />
);

export default BlockSettingsScreen;
