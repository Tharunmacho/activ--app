import React from 'react';
import SuperApprovalsScreen from '../../screens/admin/super/SuperApprovalsScreen';
import SuperMembersScreen from '../../screens/admin/super/SuperMembersScreen';
import SuperEventAttendanceScreen from '../../screens/admin/super/SuperEventAttendanceScreen';

/**
 * The Super Admin area's stack screens (reached from the "More" tab,
 * SuperMenuScreen). Registered once in App.tsx — add screens here only.
 *
 * SuperEventAttendance is read-only: its per-event list opens the events
 * admin's `EventAttendance` screen (routes/eventsAdminRoutes.tsx) with
 * `readOnly: true`.
 */
const NO_HEADER = { headerShown: false };

export const superScreens = (Stack: any) => (
  <>
    <Stack.Screen name="SuperApprovals" component={SuperApprovalsScreen} options={NO_HEADER} />
    <Stack.Screen name="SuperMembers" component={SuperMembersScreen} options={NO_HEADER} />
    <Stack.Screen name="SuperEventAttendance" component={SuperEventAttendanceScreen} options={NO_HEADER} />
  </>
);
