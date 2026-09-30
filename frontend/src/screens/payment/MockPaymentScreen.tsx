import React, { useEffect } from 'react';
import { Screen, Loading } from '../../ui';

/**
 * The legacy `MockPayment` route. The test-mode payment now lives inside
 * PaymentCheckout and is offered ONLY when GET /payment/config reports
 * `mode: 'mock'` (a dev server) — a production build can never reach a mock
 * payment. Anything landing here is sent to the plans.
 */
const MockPaymentScreen: React.FC<any> = ({ navigation }) => {
  useEffect(() => {
    navigation.replace('MembershipPlans');
  }, [navigation]);
  return <Screen scroll={false}><Loading label="Opening your plans…" /></Screen>;
};

export default MockPaymentScreen;
