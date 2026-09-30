import React from 'react';
import AdminMembersView from '../shared/AdminMembersView';
import { useStateAdminData } from './context/StateAdminContext';

/**
 * State admin → Members: the website's Members screen (GET /admin/members),
 * geofenced to this admin's state. The State admin owns the renewal-reminder
 * switch, Remind now / Remind all expired, and Block / Unblock / Delete.
 */
const StateMembersScreen = ({ navigation }: any) => {
  const { currentState } = useStateAdminData();
  return <AdminMembersView tier="state" region={currentState || ''} navigation={navigation} />;
};

export default StateMembersScreen;
