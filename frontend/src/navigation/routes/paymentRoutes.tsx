import React from 'react';
import MembershipPlansScreen from '../../screens/payment/MembershipPlansScreen';
import PaymentCheckoutScreen from '../../screens/payment/PaymentCheckoutScreen';
import PaymentResultScreen from '../../screens/payment/PaymentResultScreen';
import DonateScreen from '../../screens/payment/DonateScreen';
import DonationResultScreen from '../../screens/payment/DonationResultScreen';
import DonationDocumentScreen from '../../screens/payment/DonationDocumentScreen';

/**
 * The PAYMENT area's stack screens (types in types/routes/payment.ts).
 *
 *   MembershipPlans   GET /membership/plans/mine (+ renewal from my-profile)
 *   PaymentCheckout   GET /payment/config → POST /payment/create-request → WebView
 *   PaymentResult     GET /payment/return/:orderId (+ GET /payment/order/:orderId)
 *   Donate            POST /donations → WebView (…/donate/thank-you) or mock-complete
 *   DonationResult    GET /donations/return/:orderId (polled)
 *   DonationDocument  GET /donations/receipt/:token · /donations/statement/:token?fy=
 *
 * The legacy CompleteMembership / PaymentGateway / MockPayment / PaymentSuccess
 * routes stay registered in App.tsx and now route into these.
 */
export const paymentScreens = (Stack: any) => (
  <>
    <Stack.Screen name="MembershipPlans" component={MembershipPlansScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PaymentCheckout" component={PaymentCheckoutScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="PaymentResult" component={PaymentResultScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="Donate" component={DonateScreen} options={{ headerShown: false }} />
    <Stack.Screen name="DonationResult" component={DonationResultScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="DonationDocument" component={DonationDocumentScreen} options={{ headerShown: false }} />
  </>
);
