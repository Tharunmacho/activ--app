import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import TierAdminDashboard from '../TierAdminDashboard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const DistrictAnalyticsScreen: React.FC<Props> = ({ navigation }) => (
  <TierAdminDashboard tier="district" navigation={navigation} initialNav="dashboard" />
);

export default DistrictAnalyticsScreen;
