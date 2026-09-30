/**
 * The registration forms' option lists — the app's copy of the website's
 * `lib/memberFormOptions.ts`, which in turn mirrors the backend's
 * `modules/members/demographicOptions.js`. Casing matters: the server
 * whitelists these exact strings, and an unlisted value is dropped silently.
 */

export const SOCIAL_CATEGORIES = ['SC', 'Christian SC', 'ST', 'Others'] as const;

export const RELIGIONS = ['Hindu', 'Christian', 'Buddhist', 'Sikh', 'Muslim'] as const;

/** `demographicOptions.js` -> GENDERS. */
export const GENDERS = ['Male', 'Female', 'Others'] as const;

/** Scheduled Caste status is confined to Hindu, Sikh and Buddhist members. */
const RELIGIONS_BY_SOCIAL_CATEGORY: Record<string, readonly string[]> = {
  SC: ['Hindu', 'Buddhist', 'Sikh'],
  'Christian SC': ['Christian'],
};

/** The religions offered for a category. Unknown or blank category -> all. */
export const religionsFor = (socialCategory?: string | null): readonly string[] =>
  RELIGIONS_BY_SOCIAL_CATEGORY[String(socialCategory || '').trim()] || RELIGIONS;

/** Older spellings on live records ("Hinduism", "Islam"…) mapped onto the list. */
const RELIGION_SYNONYMS: Record<string, string> = {
  hindu: 'Hindu',
  hinduism: 'Hindu',
  christian: 'Christian',
  christianity: 'Christian',
  muslim: 'Muslim',
  islam: 'Muslim',
  islamic: 'Muslim',
  sikh: 'Sikh',
  sikhism: 'Sikh',
  buddhist: 'Buddhist',
  buddhism: 'Buddhist',
};

/** A stored religion as one of the five, or '' when it has no equivalent. */
export const normalizeReligion = (value?: string | null): string => {
  const raw = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!raw) return '';
  return RELIGION_SYNONYMS[raw] || '';
};

/** A category from the list, or '' (retired labels such as "Christian ST" must be re-picked). */
export const normalizeSocialCategory = (value?: string | null): string => {
  const raw = String(value || '').trim();
  return (SOCIAL_CATEGORIES as readonly string[]).includes(raw) ? raw : '';
};

/** A gender from the list, or ''. */
export const normalizeGender = (value?: string | null): string => {
  const raw = String(value || '').trim().toLowerCase();
  const hit = (GENDERS as readonly string[]).find((g) => g.toLowerCase() === raw);
  return hit || '';
};

const COMMENCEMENT_YEAR_FLOOR = 1950;

/** This year down to 1950, newest first. */
export const commencementYears = (): string[] => {
  const years: string[] = [];
  for (let year = new Date().getFullYear(); year >= COMMENCEMENT_YEAR_FLOOR; year -= 1) {
    years.push(String(year));
  }
  return years;
};
