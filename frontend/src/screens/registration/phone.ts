/**
 * Phone numbers at registration — a port of the website's
 * `website/src/lib/phoneNumber.ts` (`validateMobile`), which is itself the
 * browser copy of `backend/src/modules/common/phoneNumber.js`.
 *
 * The server is the authority: an Indian number is stored as its bare ten
 * digits, a foreign one keeps its '+<code>' — the ONLY thing that tells the
 * server the member is abroad (`internationalFromPhone`). A client LOOSER than
 * the server lets a number through that the final submit then refuses, three
 * fields later — so the same rules and the same country table are used here.
 */

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_MIN,
  E164_MAX,
  PRIORITY_ISO2,
  Country,
  countryByIso2,
  countryFromDial,
} from './countryCodes';

export type DialCountry = Country;

export const INDIA: DialCountry = countryByIso2(DEFAULT_COUNTRY) || { iso2: 'IN', name: 'India', dial: '91' };

/** The website's picker order: the priority countries, then every other one A–Z. */
export const DIAL_COUNTRIES: DialCountry[] = [
  ...PRIORITY_ISO2.map((iso) => countryByIso2(iso)).filter((c): c is Country => !!c),
  ...(COUNTRIES || [])
    .filter((c) => !PRIORITY_ISO2.includes(c?.iso2 || ''))
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
];

export const countryLabel = (c: DialCountry) => `${c?.name || ''} (+${c?.dial || ''})`;

export interface PhoneCheck {
  ok: boolean;
  /** What is sent: 10 digits for India, '+<dial><number>' abroad. */
  stored: string;
  reason: string;
}

/** Strip a +91/91/0091 code and a domestic trunk 0 (website `toNational`). */
const toNational = (value: unknown): string => {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

const isSequential = (n: string) => {
  let up = true;
  let down = true;
  for (let i = 1; i < n.length; i += 1) {
    const step = Number(n[i]) - Number(n[i - 1]);
    if (step !== 1) up = false;
    if (step !== -1) down = false;
  }
  return up || down;
};

const checkIndian = (raw: string, label: string): PhoneCheck => {
  const national = toNational(raw);
  if (national.length !== 10) {
    return { ok: false, stored: '', reason: `${label} must be a 10-digit Indian mobile number` };
  }
  if (!/^[6-9]/.test(national)) {
    return {
      ok: false,
      stored: '',
      reason: `${label} must start with 6, 7, 8 or 9 — that is what an Indian mobile number begins with`,
    };
  }
  const allSame = /^(\d)\1{9}$/.test(national);
  const pair = national.slice(0, 2).repeat(5) === national;
  if (allSame || isSequential(national) || pair) {
    return {
      ok: false,
      stored: '',
      reason: `${national} is not a real mobile number. Please enter the number you actually use.`,
    };
  }
  return { ok: true, stored: national, reason: '' };
};

/**
 * The website's `validateMobile(value, country, label)`. With no country, a
 * '+' prefix picks one; otherwise the number is read as Indian.
 */
export const validateMobile = (value: unknown, country?: DialCountry | null, label = 'Phone number'): PhoneCheck => {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: false, stored: '', reason: `${label} is required` };

  const chosen = (country?.iso2 ? countryByIso2(country.iso2) : undefined)
    || (raw.startsWith('+') ? countryFromDial(raw) : undefined)
    || INDIA;

  if (chosen.iso2 === DEFAULT_COUNTRY) return checkIndian(raw, label);

  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith(chosen.dial) && digits.length > chosen.dial.length) {
    digits = digits.slice(chosen.dial.length);
  }
  if (digits.length > 1 && digits.startsWith('0')) digits = digits.slice(1);

  const national = digits;
  const min = chosen.min || DEFAULT_MIN;
  const max = chosen.max || Math.max(DEFAULT_MIN, E164_MAX - chosen.dial.length);
  if (national.length < min || national.length > max) {
    const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
    return { ok: false, stored: '', reason: `${label} must be ${expected} for ${chosen.name} (+${chosen.dial})` };
  }

  const allSame = /^(\d)\1+$/.test(national);
  const pair = national.length >= 6 && national.length % 2 === 0
    && national.slice(0, 2).repeat(national.length / 2) === national;
  if (allSame || isSequential(national) || pair) {
    return {
      ok: false,
      stored: '',
      reason: `${national} is not a real mobile number. Please enter the number you actually use.`,
    };
  }
  return { ok: true, stored: `+${chosen.dial}${national}`, reason: '' };
};

/** Validate a number typed next to a chosen country. */
export const checkPhone = (raw: string, country: DialCountry, label = 'Phone number'): PhoneCheck =>
  validateMobile(raw, country || INDIA, label);

/**
 * A number with no picker beside it (WhatsApp): judged with NO country, as the
 * website does — a '+' prefix speaks for itself, otherwise it is Indian.
 */
export const checkLooseNumber = (raw: string, label = 'WhatsApp number'): PhoneCheck =>
  validateMobile(raw, null, label);
