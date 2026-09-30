import React, { useEffect } from 'react';
import { Screen, Loading } from '../../ui';

/**
 * The legacy `PaymentGateway` route. It used to draw fake card / UPI / net
 * banking fields and pay through the mock-only path. Checkout now happens on
 * the gateway's own page (PaymentCheckout); only the plan KEY travels — any
 * amount in the old params is ignored, as the server always ignored it.
 */
const PaymentGatewayScreen: React.FC<any> = ({ navigation, route }) => {
  useEffect(() => {
    const planId = String(route?.params?.planId || '');
    if (planId) navigation.replace('PaymentCheckout', { orderType: 'membership', planId });
    else navigation.replace('MembershipPlans');
  }, [navigation, route]);
  return <Screen scroll={false}><Loading label="Opening checkout…" /></Screen>;
};

export default PaymentGatewayScreen;
