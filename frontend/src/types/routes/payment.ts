/**
 * Stack routes owned by the PAYMENT area. Declared up front because other
 * areas navigate to them (the member area opens checkout for an event booking
 * and for a renewal):
 *
 *   navigation.navigate('MembershipPlans', { renew: true })
 *   navigation.navigate('PaymentCheckout', { orderType: 'event_booking', bookingRef, eventId })
 *
 * The payment area implements them (server-priced plans, Instamojo checkout
 * through POST /payment/create-request, confirmation via
 * GET /payment/return/:orderId) — same endpoints as the website.
 */
export type PaymentRoutes = {
  /** Plans the signed-in member is offered (GET /membership/plans/mine). `renew` = renewal. */
  MembershipPlans: { renew?: boolean } | undefined;
  /** Opens the gateway for one order and waits for the result. Never takes an amount. */
  PaymentCheckout: {
    orderType: 'membership' | 'event_booking';
    /** membership: the plan key from /membership/plans/mine */
    planId?: string;
    /** event_booking: the booking reference from POST /event-bookings/event/:eventId */
    bookingRef?: string;
    eventId?: string;
    renew?: boolean;
  };
  /** Result after the gateway (GET /payment/return/:orderId). */
  PaymentResult: {
    orderId: string;
    orderType?: 'membership' | 'event_booking';
    bookingRef?: string;
    eventId?: string;
    /** From the gateway's return URL — passed to /payment/return, never trusted on its own. */
    paymentId?: string;
    paymentStatus?: string;
  };
  /** The donation form (POST /donations). The amount is the donor's choice; the server validates it. */
  Donate: undefined;
  /** After the gateway (GET /donations/return/:orderId). */
  DonationResult: { orderId: string; paymentId?: string; paymentStatus?: string };
  /** An 80G receipt (one gift) or the year's consolidated statement, by its token. */
  DonationDocument: { kind: 'receipt' | 'statement'; token: string; fy?: string };
};
