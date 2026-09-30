import api from './api';

/**
 * The business area's calls — the SAME endpoints the website's business pages
 * use (one backend, one database). Every path below is mounted in
 * backend/src/modules/members/{business,product}.routes.js.
 *
 * Every helper unwraps `{ success, data }` or a bare body (RULE 1.5) and
 * never throws on shape; network/HTTP errors still throw so screens can show
 * their error + retry state.
 */

const unwrap = <T>(res: any, fallback: T): T => {
  const d = res?.data;
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined && d.data !== null) return d.data as T;
  return (d ?? fallback) as T;
};
const arr = <T>(v: any): T[] => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------ types */

export interface PublicProduct {
  _id: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  sku?: string;
  stock?: number;
  imageUrl?: string;
}

/** A NIC product category as stored on a company (`code` '' = the member's own). */
export interface CompanyCategory {
  code?: string;
  description?: string;
  industryType?: string;
}

export interface Company {
  _id: string;
  businessName?: string;
  businessType?: string;
  description?: string;
  businessActivities?: string;
  constitutionType?: string;
  numberOfEmployees?: string;
  mobileNumber?: string;
  email?: string;
  area?: string;
  location?: string;
  logo?: string;
  banner?: string;
  govtRegistrations?: string[];
  govtSchemes?: string[];
  productCategories?: CompanyCategory[];
  memberOfOtherChamber?: boolean;
  otherChamber?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  products?: PublicProduct[];
  /** How many members keep this company on their trust list. */
  trustedBy?: number;
  /** Whether the CALLER does. */
  isTrusted?: boolean;
  /** True when the viewer owns it. */
  isOwner?: boolean;
  /** Trust-list rows only. */
  trustedAt?: string;
  note?: string;
  [key: string]: any;
}

export interface Product {
  _id: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  sku?: string;
  stock?: number;
  minStock?: number;
  imageUrl?: string;
  isActive?: boolean;
  views?: number;
  companyId?: any;
  [key: string]: any;
}

export interface StockMovement {
  id: string;
  productId?: string;
  productName?: string;
  delta: number;
  resultingStock?: number;
  reason?: string;
  note?: string;
  at?: string;
}

export interface LowStockRow {
  id: string;
  name?: string;
  stock: number;
  minStock?: number;
  [key: string]: any;
}

export const STOCK_REASONS = ['restock', 'sale', 'damage', 'return', 'correction', 'other'] as const;
export type StockReason = typeof STOCK_REASONS[number];

/* ------------------------------------------------------------ companies */

/** The caller's own company (owner-scoped). */
export const getCompany = async (id: string): Promise<Company | null> =>
  unwrap<Company | null>(await api.get(`/business-profiles/${encodeURIComponent(id)}`), null);

/** Every company the caller owns. */
export const getMyCompanies = async (): Promise<Company[]> =>
  arr<Company>(unwrap<any>(await api.get('/business-profiles/all'), []));

/** A company as the rest of the network sees it (+ isTrusted / trustedBy / isOwner). */
export const getPublicCompany = async (id: string): Promise<Company | null> =>
  unwrap<Company | null>(await api.get(`/business-profiles/public/${encodeURIComponent(id)}`), null);

/* ------------------------------------------------------------ trust list */

export const getTrustList = async (): Promise<Company[]> =>
  arr<Company>(unwrap<any>(await api.get('/business-profiles/trust-list'), []));

/** Just the ids — one request for a whole Discover page. */
export const getTrustListIds = async (): Promise<string[]> =>
  arr<string>(unwrap<any>(await api.get('/business-profiles/trust-list/ids'), [])).map((x) => String(x));

export const addToTrustList = async (companyId: string, note = '') =>
  unwrap<{ companyId: string; isTrusted: boolean; trustedBy: number }>(
    await api.post(`/business-profiles/trust-list/${encodeURIComponent(companyId)}`, { note }),
    { companyId, isTrusted: true, trustedBy: 0 },
  );

export const removeFromTrustList = async (companyId: string) =>
  unwrap<{ companyId: string; isTrusted: boolean; trustedBy: number }>(
    await api.delete(`/business-profiles/trust-list/${encodeURIComponent(companyId)}`),
    { companyId, isTrusted: false, trustedBy: 0 },
  );

/* ------------------------------------------------------------ products */

export const getProducts = async (companyId: string): Promise<Product[]> =>
  arr<Product>(unwrap<any>(await api.get('/products', { params: { companyId } }), []));

export const getProduct = async (id: string): Promise<Product | null> =>
  unwrap<Product | null>(await api.get(`/products/${encodeURIComponent(id)}`), null);

/** Multipart, like the website's EditProduct (`image` only when a new one was picked). */
export const updateProduct = async (id: string, form: FormData) =>
  unwrap<Product | null>(
    await api.put(`/products/${encodeURIComponent(id)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
    null,
  );

export const deleteProduct = async (id: string) => api.delete(`/products/${encodeURIComponent(id)}`);

/** Shown to other members (`isActive`) or hidden. */
export const setProductPublished = async (id: string, published: boolean) =>
  unwrap<any>(await api.patch(`/products/${encodeURIComponent(id)}/publish`, { published }), null);

/** Either `delta` (+12 arrived / -3 sold) or `setTo` (a stock take). Never both. */
export const adjustStock = async (
  id: string,
  body: { delta?: number; setTo?: number; reason?: StockReason; note?: string },
) => unwrap<any>(await api.post(`/products/${encodeURIComponent(id)}/stock`, body), null);

export const getLowStock = async (): Promise<LowStockRow[]> =>
  arr<LowStockRow>(unwrap<any>(await api.get('/products/low-stock'), []));

export const getStockMovements = async (params: { productId?: string; limit?: number } = {}): Promise<StockMovement[]> =>
  arr<StockMovement>(unwrap<any>(await api.get('/products/stock-movements', { params }), []));

export const getProductStats = async (companyId: string) =>
  unwrap<any>(await api.get('/products/stats', { params: { companyId } }), {});

/* ------------------------------------------------------------ helpers */

export const errorMessage = (err: any, fallback = 'Something went wrong. Please try again.') => {
  if (!err?.response) return 'Cannot reach the server. Check your internet connection.';
  return String(err?.response?.data?.message || fallback);
};

/** The companyId on a product may be populated or a bare id. */
export const productCompanyId = (p: Product | null | undefined) =>
  String((p?.companyId && typeof p.companyId === 'object' ? p.companyId?._id : p?.companyId) || '');
