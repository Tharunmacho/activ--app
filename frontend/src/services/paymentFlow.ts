import api from './api';
import { unwrap, asArray } from '../ui';

/**
 * ============================================================================
 * PAYMENTS — the website's exact flow, from the app
 * ============================================================================
 *
 * One backend, one database. Every call here is one the website makes
 * (website/src/services/paymentApi.ts + features/member/membershipPlans.ts):
 *
 *   GET  /membership/plans/mine        the plans THIS member is offered
 *   GET  /members/my-profile           `renewal` (canRenew …), membershipNumber
 *   GET  /payment/config               { mode: 'mock' | 'gateway', provider }
 *   POST /payment/create-request       gateway: { membershipType: planId, orderType:'membership' }
 *                                        or     { orderType:'event_booking', bookingRef }
 *                                      → { payment_url, payment_request_id, orderId, amount }
 *   POST /payment/order → /payment/mock-authorize → /payment/complete
 *                                      mock only (dev servers; refused in production)
 *   GET  /payment/return/:orderId      public; settles an event booking with Instamojo
 *   GET  /payment/order/:orderId       signed-in; the order's own state
 *
 * THE CLIENT NEVER SENDS AN AMOUNT. The server prices the plan (or reads the
 * booking's total) — there is no price anywhere in this app.
 */

export type PlanAudience = 'business' | 'aspirant' | 'student' | 'platinum';

export interface Plan {
  key: string;
  name: string;
  description: string;
  /** Rupees, from the server. */
  price: number;
  audience: PlanAudience;
  membershipType: 'annual' | 'lifetime' | string;
  minYears: number;
  maxYears: number | null;
  experience: string;
  features: string[];
  popular: boolean;
}

export interface MyPlans {
  plans: Plan[];
  /** The plan the server resolved for this member (band / kind). */
  matched: Plan | null;
  years: number | null;
  reason: string;
  showAllPlans: boolean;
  /** The request did not land — "could not load the prices", not "no plans". */
  failed: boolean;
}

export const toAudience = (v: unknown): PlanAudience => {
  const s = String(v || '').toLowerCase();
  return s === 'aspirant' || s === 'student' || s === 'platinum' ? s : 'business';
};

const toPlan = (row: any): Plan => ({
  key: String(row?.key || row?.id || ''),
  name: String(row?.name || ''),
  description: String(row?.description || ''),
  price: Number(row?.price || 0),
  audience: toAudience(row?.audience),
  membershipType: String(row?.membershipType || 'annual'),
  minYears: Number(row?.minYears || 0),
  maxYears: row?.maxYears === null || row?.maxYears === undefined ? null : Number(row.maxYears),
  experience: String(row?.experience || ''),
  features: asArray<string>(row?.features).map((f) => String(f || '')).filter(Boolean),
  popular: row?.popular === true,
});

/**
 * The plans this member is offered. Platinum is NEVER purchasable here — it is
 * a lifetime tier the Super Admin grants by hand (website does the same).
 */
export const getMyPlans = async (): Promise<MyPlans> => {
  try {
    const res = await api.get('/membership/plans/mine');
    const d = unwrap<any>(res, {});
    const plans = asArray(d?.plans).map(toPlan).filter((p) => p.key && p.audience !== 'platinum');
    const m = d?.matched ? toPlan(d.matched) : null;
    return {
      plans,
      matched: m && m.audience !== 'platinum' ? m : null,
      years: typeof d?.years === 'number' ? d.years : null,
      reason: String(d?.reason || ''),
      showAllPlans: d?.showAllPlans === true,
      failed: false,
    };
  } catch {
    return { plans: [], matched: null, years: null, reason: '', showAllPlans: false, failed: true };
  }
};

/** "0–5 years", "10+ years" — the band a plan covers, for the card. */
export const bandLabel = (p: Plan): string => {
  if (p.audience !== 'business') return '';
  const min = Number(p.minYears || 0);
  if (p.maxYears === null) return `${min}+ years in business`;
  return `${min}–${p.maxYears} years in business`;
};

/* ------------------------------------------------------------------ renewal */

export interface RenewalInfo {
  state: string;
  lifetime: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  expiringSoon: boolean;
  canRenew: boolean;
  opensAt: string | null;
}

export const readRenewal = (profile: any): RenewalInfo | null => {
  const r = profile?.renewal;
  if (!r || typeof r !== 'object') return null;
  return {
    state: String(r.state || ''),
    lifetime: r.lifetime === true,
    expiresAt: r.expiresAt || null,
    daysLeft: typeof r.daysLeft === 'number' ? r.daysLeft : null,
    expiringSoon: r.expiringSoon === true,
    canRenew: r.canRenew === true,
    opensAt: r.opensAt || null,
  };
};

export const getMyProfile = async () => unwrap<any>(await api.get('/members/my-profile'), {});

/* ------------------------------------------------------------------ gateway */

export interface PaymentConfig {
  mode: 'mock' | 'gateway';
  provider: string;
  hosted: boolean;
  configured: boolean;
}

export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  const d = unwrap<any>(await api.get('/payment/config'), {});
  /* No mode is NOT mock: guessing mock on a production server offers a
     checkout the server refuses. Fail loudly so the screen can retry. */
  if (d?.mode !== 'gateway' && d?.mode !== 'mock') {
    throw new Error('The payment service could not be reached. Please try again.');
  }
  return {
    mode: d.mode === 'gateway' ? 'gateway' : 'mock',
    provider: String(d?.provider || ''),
    hosted: d?.hosted === true,
    configured: d?.configured === true,
  };
};

export interface HostedStart {
  paymentUrl: string;
  paymentRequestId: string;
  orderId: string;
  amount: number | null;
}

/** Start an Instamojo payment. `planId` for a membership, `bookingRef` for seats. */
export const startHostedPayment = async (input: {
  orderType: 'membership' | 'event_booking';
  planId?: string;
  bookingRef?: string;
  /** The website's startHostedMembershipPayment also sends it, when known. */
  applicationId?: string;
}): Promise<HostedStart> => {
  const body = input.orderType === 'event_booking'
    ? { orderType: 'event_booking', bookingRef: input.bookingRef }
    : {
      orderType: 'membership',
      membershipType: input.planId,
      ...(input.applicationId ? { applicationId: input.applicationId } : {}),
    };
  const d = unwrap<any>(await api.post('/payment/create-request', body), {});
  const paymentUrl = String(d?.payment_url || d?.longurl || '');
  if (!paymentUrl) throw new Error('The payment could not be started');
  return {
    paymentUrl,
    paymentRequestId: String(d?.payment_request_id || ''),
    orderId: String(d?.orderId || ''),
    amount: typeof d?.amount === 'number' ? d.amount : null,
  };
};

/**
 * The MOCK membership purchase (dev servers only — the server refuses it in
 * production): order → mock-authorize → complete. Returns the order.
 */
export const payMembershipMock = async (planId: string, applicationId?: string) => {
  const order = unwrap<any>(await api.post('/payment/order', { planId, ...(applicationId ? { applicationId } : {}) }), {});
  if (!order?.orderId) throw new Error('The payment could not be started');
  const auth = unwrap<any>(await api.post('/payment/mock-authorize', { orderId: order.orderId }), {});
  if (!auth?.signature) throw new Error('The payment was not authorised');
  await api.post('/payment/complete', {
    orderId: order.orderId,
    gatewayPaymentId: auth.gatewayPaymentId,
    signature: auth.signature,
    paymentMethod: 'mock',
  });
  return order as { orderId: string; amount?: number; planName?: string };
};

/** The MOCK event-booking payment: authorize → pay (dev only). */
export const payBookingMock = async (bookingRef: string) => {
  const ref = encodeURIComponent(bookingRef);
  const auth = unwrap<any>(await api.post(`/event-bookings/${ref}/authorize`, {}), {});
  if (!auth?.signature) throw new Error('The payment was not authorised');
  await api.post(`/event-bookings/${ref}/pay`, {
    gatewayPaymentId: auth.gatewayPaymentId,
    signature: auth.signature,
    mode: 'online',
  });
};

/* ------------------------------------------------------------------ return */

export interface ReturnResult {
  orderId: string;
  orderType: string;
  status: string;
  amount: number | null;
  bookingRef: string;
  eventId: string;
}

/** Public: what the server knows about the order (settles an event booking). */
export const resolveReturn = async (
  orderId: string,
  gateway: { paymentId?: string; paymentStatus?: string } = {},
): Promise<ReturnResult> => {
  const d = unwrap<any>(await api.get(`/payment/return/${encodeURIComponent(orderId)}`, {
    params: {
      ...(gateway.paymentId ? { payment_id: gateway.paymentId } : {}),
      ...(gateway.paymentStatus ? { payment_status: gateway.paymentStatus } : {}),
    },
  }), {});
  return {
    orderId: String(d?.orderId || orderId),
    orderType: String(d?.orderType || ''),
    status: String(d?.status || ''),
    amount: typeof d?.amount === 'number' ? d.amount : null,
    bookingRef: String(d?.bookingRef || ''),
    eventId: String(d?.eventId || ''),
  };
};

/** Signed-in: the order record (status, amount, plan, paidAt). */
export const getOrder = async (orderId: string) =>
  unwrap<any>(await api.get(`/payment/order/${encodeURIComponent(orderId)}`), {});

/**
 * Is this URL the gateway's return to ACTIV? The server builds
 * `<site>/payment-success?orderId=…` (Instamojo appends payment_id and
 * payment_status). Matched on any host, so a staging/local site works too.
 */
export const parseReturnUrl = (url: string): { orderId: string; paymentId: string; paymentStatus: string } | null => {
  const u = String(url || '');
  if (!/\/payment-success(\?|$|#|\/)/i.test(u)) return null;
  const q = u.split('?')[1] || '';
  const get = (k: string) => {
    const m = new RegExp(`(?:^|&)${k}=([^&#]*)`).exec(q);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch { return m[1]; }
  };
  return { orderId: get('orderId'), paymentId: get('payment_id'), paymentStatus: get('payment_status') };
};

/* ==========================================================================
 * DONATIONS — the website's donationsApi, call for call
 * ==========================================================================
 *
 *   POST /donations                         { amount, fullName, email, phone, pan?, donorType, address, message? }
 *                                           → { donationId, orderId, amount, paymentUrl, mock }
 *   POST /donations/mock-complete/:orderId  dev servers only (mock: true)
 *   GET  /donations/return/:orderId         { status, amount, receiptNumber, receiptToken, statementToken, … }
 *   GET  /donations/receipt/:token          one gift's 80G receipt
 *   GET  /donations/statement/:token?fy=    the financial year's consolidated certificate
 *
 * The amount is only what the donor CHOSE; the server validates it and builds
 * the gateway order. The gateway returns to `<site>/donate/thank-you?orderId=…`.
 */

export type DonorType = 'individual' | 'organisation';

export interface DonationInput {
  amount: number;
  fullName: string;
  email: string;
  phone: string;
  pan?: string;
  donorType: DonorType;
  address: { line1: string; city: string; district: string; state: string; pincode: string };
  message?: string;
}

export const createDonation = async (input: DonationInput) =>
  unwrap<any>(await api.post('/donations', input), {}) as {
    donationId?: string; orderId?: string; amount?: number; paymentUrl?: string; mock?: boolean;
  };

export const mockCompleteDonation = async (orderId: string) =>
  unwrap<any>(await api.post(`/donations/mock-complete/${encodeURIComponent(orderId)}`), {});

export const getDonationReturn = async (orderId: string, query: { payment_id?: string; payment_status?: string } = {}) =>
  unwrap<any>(await api.get(`/donations/return/${encodeURIComponent(orderId)}`, {
    params: {
      ...(query.payment_id ? { payment_id: query.payment_id } : {}),
      ...(query.payment_status ? { payment_status: query.payment_status } : {}),
    },
  }), { status: 'pending' });

export const getDonationReceipt = async (token: string) =>
  unwrap<any>(await api.get(`/donations/receipt/${encodeURIComponent(token)}`), {});

export const getDonationStatement = async (token: string, fy?: string) =>
  unwrap<any>(await api.get(`/donations/statement/${encodeURIComponent(token)}`, { params: fy ? { fy } : {} }), {});

/** "2026-27" → "2026–2027" (website fyLabel). */
export const fyLabel = (fy?: string | null) => {
  const m = /^(\d{4})-(\d{2,4})$/.exec(String(fy || ''));
  if (!m) return String(fy || '');
  return `${m[1]}–${m[2].length === 2 ? `${m[1].slice(0, 2)}${m[2]}` : m[2]}`;
};

/**
 * Is this URL the gateway's return from a DONATION? The server builds
 * `<site>/donate/thank-you?orderId=…` (Instamojo appends payment_id and
 * payment_status). Matched on any host.
 */
export const parseDonationReturnUrl = (url: string): { orderId: string; paymentId: string; paymentStatus: string } | null => {
  const u = String(url || '');
  if (!/\/donate\/thank-you(\?|$|#|\/)/i.test(u)) return null;
  const q = u.split('?')[1] || '';
  const get = (k: string) => {
    const m = new RegExp(`(?:^|&)${k}=([^&#]*)`).exec(q);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch { return m[1]; }
  };
  return { orderId: get('orderId'), paymentId: get('payment_id'), paymentStatus: get('payment_status') };
};
