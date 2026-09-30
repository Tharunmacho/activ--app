import React from 'react';
import AdminMembersView from '../shared/AdminMembersView';
import { useBlockAdminData } from './context/BlockAdminContext';

/**
 * Block admin → Members: the website's Members screen (GET /admin/members),
 * geofenced to this admin's block. Read-only here: reminders and block/delete
 * belong to the State (and Super) Admin — hidden, exactly as on the website.
 */
const BlockMembersScreen = ({ navigation }: any) => {
  const { currentBlock } = useBlockAdminData();
  return <AdminMembersView tier="block" region={currentBlock || ''} navigation={navigation} />;
};

export default BlockMembersScreen;
