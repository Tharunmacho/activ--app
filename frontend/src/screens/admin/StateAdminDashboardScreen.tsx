import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import TierAdminDashboard from './TierAdminDashboard';

type StateAdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'StateAdminDashboard'
>;

interface Props {
  navigation: StateAdminDashboardScreenNavigationProp;
}

/**
 * Stage 3 of the approval workflow — the final tier.
 *
 * Shares the block dashboard's shell via TierAdminDashboard, scoped to the
 * state: it reads /admin/state/dashboard, its pending queue only ever contains
 * district-approved applications, approving is final and creates the member
 * profile across all four collections, and its roll-up tab lists the Districts
 * in this state with their block counts and approval rates.
 */
const StateAdminDashboardScreen: React.FC<Props> = ({ navigation }) => (
  <TierAdminDashboard tier="state" navigation={navigation} />
);

export default StateAdminDashboardScreen;
