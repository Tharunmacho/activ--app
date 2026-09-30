import React from 'react';
import AdminMembersView from '../shared/AdminMembersView';
import { useDistrictAdminData } from './context/DistrictAdminContext';

/**
 * District admin → Members: the website's Members screen (GET /admin/members),
 * geofenced to this admin's district. Read-only here: reminders and block/delete
 * belong to the State (and Super) Admin — hidden, exactly as on the website.
 */
const DistrictMembersScreen = ({ navigation }: any) => {
  const { currentDistrict } = useDistrictAdminData();
  return <AdminMembersView tier="district" region={currentDistrict || ''} navigation={navigation} />;
};

export default DistrictMembersScreen;
