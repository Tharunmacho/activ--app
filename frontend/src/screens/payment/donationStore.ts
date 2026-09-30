import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../../services/api';

/**
 * What this phone remembers about donations — the app's copy of the two
 * things the website keeps in the browser and the donor's email:
 *
 *   donor details   (website `activ-donor-details`) — so giving again is:
 *                   pick an amount, press Donate. Amount and message are
 *                   never kept; they belong to one gift.
 *   documents       the receipt / statement TOKENS of each completed gift.
 *                   Donors have no account; these unguessable tokens (the
 *                   same ones the emailed links carry) are how a receipt is
 *                   opened again. Per signed-in account.
 *
 * Every read and write is guarded — storage failing only costs convenience.
 */

const DETAILS_KEY = 'activ-donor-details';
const DOCS_KEY = 'activ:donationDocs';

export interface SavedDonor {
  donorType: 'individual' | 'organisation';
  fullName: string; email: string; phone: string; pan: string;
  line1: string; city: string; district: string; state: string; pincode: string;
}

export interface SavedDonationDoc {
  orderId: string;
  receiptNumber: string;
  receiptToken: string;
  statementToken: string;
  financialYear: string;
  amount: number | null;
  savedAt: string;
}

const account = async () => {
  try {
    const u = await getUserData();
    return String(u?.email || 'anon').toLowerCase();
  } catch {
    return 'anon';
  }
};

export const readSavedDonor = async (): Promise<Partial<SavedDonor> | null> => {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(DETAILS_KEY)) || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
};

export const writeSavedDonor = async (d: SavedDonor) => {
  try { await AsyncStorage.setItem(DETAILS_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
};

export const forgetSavedDonor = async () => {
  try { await AsyncStorage.removeItem(DETAILS_KEY); } catch { /* storage unavailable */ }
};

export const readDonationDocs = async (): Promise<SavedDonationDoc[]> => {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(`${DOCS_KEY}:${await account()}`)) || '[]');
    return Array.isArray(raw) ? raw.filter((r) => r && (r.receiptToken || r.statementToken)) : [];
  } catch {
    return [];
  }
};

/** Newest first, one row per order, capped. */
export const rememberDonationDoc = async (doc: SavedDonationDoc) => {
  if (!doc?.receiptToken && !doc?.statementToken) return;
  try {
    const list = (await readDonationDocs()).filter((r) => r.orderId !== doc.orderId);
    list.unshift(doc);
    await AsyncStorage.setItem(`${DOCS_KEY}:${await account()}`, JSON.stringify(list.slice(0, 100)));
  } catch { /* storage unavailable */ }
};
