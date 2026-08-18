import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import TierAdminDashboard from './TierAdminDashboard';

type DistrictAdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DistrictAdminDashboard'
>;

interface Props {
  navigation: DistrictAdminDashboardScreenNavigationProp;
}

/**
 * Stage 2 of the approval workflow.
 *
 * Shares the block dashboard's shell (header, stat grid, approval queue, bottom
 * nav, inline-editable settings) via TierAdminDashboard, but every behaviour is
 * district-scoped: it reads /admin/district/dashboard, its pending queue only
 * ever contains block-approved applications, approving forwards to the State
 * Admin, and its roll-up tab lists the Blocks feeding this district.
 */
const DistrictAdminDashboardScreen: React.FC<Props> = ({ navigation }) => (
  <TierAdminDashboard tier="district" navigation={navigation} />
);

export default DistrictAdminDashboardScreen;
