import api from '@/services/api';
import { ENDPOINTS } from '@/config/api.config';

/**
 * DONATIONS — the public giving flow and the Super Admin's donor book.
 *
 * Donors have no account: a donation is identified by the gateway order id
 * (thank-you page) and afterwards by unguessable tokens (receipt, year
 * statement) that travel in the emailed links. Every response is unwrapped
 * defensively — this backend answers both `{ success, data }` and bare objects.
 */

const unwrap = <T>(res: any, fallback: T): T => {
    const payload = res?.data?.data ?? res?.data;
    return (payload === undefined || payload === null ? fallback : payload) as T;
};

export type DonorType = 'individual' | 'organisation';

export interface DonorAddress {
    line1?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
}

export interface DonorDetails {
    fullName?: string;
    email?: string;
    phone?: string;
    pan?: string;
    donorType?: DonorType | string;
    address?: DonorAddress;
}

export interface DonationOrg {
    name?: string;
    shortName?: string;
    pan?: string;
    registration80G?: string;
    address?: string;
}

export interface CreateDonationInput {
    amount: number;
    fullName: string;
    email: string;
    phone: string;
    pan?: string;
    donorType: DonorType;
    address: DonorAddress;
    message?: string;
}

export interface CreateDonationResult {
    donationId?: string;
    orderId?: string;
    amount?: number;
    paymentUrl?: string;
    mock?: boolean;
}

export interface DonationReturn {
    status: 'paid' | 'pending' | 'failed' | string;
    amount?: number;
    receiptNumber?: string;
    receiptToken?: string;
    statementToken?: string;
    donorName?: string;
    financialYear?: string;
}

export interface DonationReceipt {
    receiptNumber?: string;
    financialYear?: string;
    paidAt?: string | null;
    amount?: number;
    amountInWords?: string;
    paymentMode?: string;
    gatewayPaymentId?: string;
    message?: string;
    donor?: DonorDetails;
    org?: DonationOrg;
    statementToken?: string;
}

export interface StatementDonation {
    receiptNumber?: string;
    paidAt?: string | null;
    amount?: number;
    paymentMode?: string;
}

export interface DonationStatement {
    financialYear?: string;
    fyStart?: string;
    fyEnd?: string;
    isFinal?: boolean;
    generatedAt?: string;
    statementNumber?: string;
    donor?: DonorDetails;
    donations?: StatementDonation[];
    total?: number;
    totalInWords?: string;
    availableYears?: string[];
    org?: DonationOrg;
}

export interface DonationSummary {
    financialYears?: string[];
    fy?: string;
    totalAmount?: number;
    donationCount?: number;
    donorCount?: number;
    thisMonthAmount?: number;
}

export interface DonorRow {
    id: string;
    fullName?: string;
    email?: string;
    phone?: string;
    pan?: string;
    city?: string;
    district?: string;
    state?: string;
    donationCount?: number;
    totalAmount?: number;
    allTimeAmount?: number;
    lastDonationAt?: string | null;
    statementToken?: string;
}

export interface DonationRow {
    id: string;
    receiptNumber?: string;
    amount?: number;
    status?: string;
    paidAt?: string | null;
    createdAt?: string | null;
    financialYear?: string;
    message?: string;
    paymentMode?: string;
    receiptToken?: string;
    donorId?: string;
    donorName?: string;
    donorEmail?: string;
}

export interface DonorDetailResponse {
    donor?: DonorDetails & { id?: string; statementToken?: string; createdAt?: string };
    donations?: DonationRow[];
    byYear?: { financialYear: string; total: number; count: number }[];
}

/* ------------------------------------------------------------------ public */

export const createDonation = async (input: CreateDonationInput): Promise<CreateDonationResult> =>
    unwrap<CreateDonationResult>(await api.post(ENDPOINTS.DONATIONS.CREATE, input), {});

export const mockCompleteDonation = async (orderId: string) =>
    unwrap<any>(await api.post(ENDPOINTS.DONATIONS.MOCK_COMPLETE(orderId)), {});

export const getDonationReturn = async (
    orderId: string,
    query: { payment_id?: string; payment_status?: string } = {},
): Promise<DonationReturn> =>
    unwrap<DonationReturn>(await api.get(ENDPOINTS.DONATIONS.RETURN(orderId), { params: query }), { status: 'pending' });

export const getDonationReceipt = async (token: string): Promise<DonationReceipt> =>
    unwrap<DonationReceipt>(await api.get(ENDPOINTS.DONATIONS.RECEIPT(token)), {});

export const getDonationStatement = async (token: string, fy?: string): Promise<DonationStatement> =>
    unwrap<DonationStatement>(
        await api.get(ENDPOINTS.DONATIONS.STATEMENT(token), { params: fy ? { fy } : {} }),
        {},
    );

/* ------------------------------------------------------------- super admin */

export const getDonationSummary = async (fy?: string): Promise<DonationSummary> =>
    unwrap<DonationSummary>(await api.get(ENDPOINTS.DONATIONS.ADMIN_SUMMARY, { params: fy ? { fy } : {} }), {});

export const listDonors = async (params: { fy?: string; q?: string; page?: number; limit?: number } = {}) =>
    unwrap<{ rows?: DonorRow[]; total?: number }>(await api.get(ENDPOINTS.DONATIONS.ADMIN_DONORS, { params }), {});

export const getDonor = async (id: string): Promise<DonorDetailResponse> =>
    unwrap<DonorDetailResponse>(await api.get(ENDPOINTS.DONATIONS.ADMIN_DONOR(id)), {});

export const listDonations = async (params: { fy?: string; status?: string; page?: number; limit?: number } = {}) =>
    unwrap<{ rows?: DonationRow[]; total?: number }>(await api.get(ENDPOINTS.DONATIONS.ADMIN_LIST, { params }), {});

export const resendDonationReceipt = async (id: string) =>
    unwrap<any>(await api.post(ENDPOINTS.DONATIONS.ADMIN_RESEND(id)), {});

/* ----------------------------------------------------------------- helpers */

/** ₹1,000 — Indian grouping, no paise unless there are some. */
export const inr = (n?: number | null) =>
    typeof n === 'number' && Number.isFinite(n)
        ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        : '—';

/** 29 Sept 2026 */
export const shortDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "2026-27" -> "2026–2027" */
export const fyLabel = (fy?: string) => {
    const m = /^(\d{4})-(\d{2,4})$/.exec(fy || '');
    if (!m) return fy || '';
    return `${m[1]}–${m[2].length === 2 ? `${m[1].slice(0, 2)}${m[2]}` : m[2]}`;
};

/** Where the receipt and year certificate open, for links built on this site. */
export const receiptPath = (token?: string) => (token ? `/donate/receipt/${encodeURIComponent(token)}` : '');
export const statementPath = (token?: string, fy?: string) =>
    token ? `/donate/statement/${encodeURIComponent(token)}${fy ? `?fy=${encodeURIComponent(fy)}` : ''}` : '';
