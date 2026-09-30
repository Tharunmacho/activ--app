import React from 'react';
import EventsAdminBottomTabs from '../EventsAdminBottomTabs';
import EventScannerScreen from '../../screens/eventsAdmin/EventScannerScreen';
import EventAttendanceScreen from '../../screens/eventsAdmin/EventAttendanceScreen';
import EventDoorBookingsScreen from '../../screens/eventsAdmin/EventDoorBookingsScreen';
import EventBookingDetailScreen from '../../screens/eventsAdmin/EventBookingDetailScreen';

/**
 * The EVENTS ADMIN's console (and the attendance screens the Super Admin
 * reads, read-only).
 *
 *   EventsAdminHome      the tabs: Dashboard · Events · Account
 *   EventCheckinScanner  camera scan + manual entry, inline result card
 *   EventDoorBookings    one event's bookings (from the attendance rows)
 *   EventBookingDetail   every seat on a booking, admitted one by one
 *                        (`readOnly` for the super admin)
 *   EventAttendance      one event's door list, live, with search + CSV
 *                        (`readOnly` for the super admin)
 *
 * Writing the programme (events, categories, gallery, news) stays on the
 * website; bookings, amounts, payments and cancellations are the super
 * admin's (server: BOOKING_VIEWERS). Registered once in App.tsx — add screens
 * here only. Stack screens, so every result card is an inline view, never a
 * Modal inside a tab (CLAUDE.md Rule 2).
 */
const NO_HEADER = { headerShown: false };

export const eventsAdminScreens = (Stack: any) => (
  <>
    <Stack.Screen name="EventsAdminHome" component={EventsAdminBottomTabs} options={NO_HEADER} />
    <Stack.Screen name="EventCheckinScanner" component={EventScannerScreen} options={NO_HEADER} />
    <Stack.Screen name="EventDoorBookings" component={EventDoorBookingsScreen} options={NO_HEADER} />
    <Stack.Screen name="EventBookingDetail" component={EventBookingDetailScreen} options={NO_HEADER} />
    <Stack.Screen name="EventAttendance" component={EventAttendanceScreen} options={NO_HEADER} />
  </>
);
