import React from 'react';
import MemberEventDetailScreen from '../member/events/MemberEventDetailScreen';

/** The same native programme, with anonymous reads and sign-in only for booking. */
export default function PublicEventDetailScreen(props: any) {
  return <MemberEventDetailScreen {...props} publicAccess />;
}
