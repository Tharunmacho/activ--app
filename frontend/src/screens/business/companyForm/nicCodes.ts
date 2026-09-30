/**
 * The NIC product-category catalogue — the app's copy of the website's
 * `lib/nicCodes.ts`, reading the SAME data (`nicCodes.json`, copied verbatim
 * from `website/src/data/nicCodes.json`; 1,846 rows with the leading zeros
 * restored, so a code identifies exactly one category).
 *
 * Loaded on first use rather than at import, so the ~155 KB parse costs nothing
 * until somebody opens the product-category picker.
 */

interface CompactRow { c: string; d: string; t: string }

export interface NicCategory {
  code: string;
  description: string;
  /** 'Manufacturing' | 'Service' */
  industryType: string;
  /** 'Division' | 'Group' | 'Class' | 'Sub-class' */
  level: string;
}

/**
 * What a company stores (`productCategories[]` on the Company schema). `code`
 * is '' for a category the member typed that NIC does not list — a legitimate
 * answer, which is why this is not an enum anywhere.
 */
export interface ProductCategory {
  code: string;
  description: string;
  industryType: string;
}

/** The server keeps at most this many (`MAX_PRODUCT_CATEGORIES`). */
export const MAX_PRODUCT_CATEGORIES = 10;

const LEVELS: Record<number, string> = { 2: 'Division', 3: 'Group', 4: 'Class', 5: 'Sub-class' };

let cache: NicCategory[] | null = null;

export const loadNicCategories = (): NicCategory[] => {
  if (cache) return cache;
  try {
    const raw = require('./nicCodes.json');
    const rows: CompactRow[] = Array.isArray(raw) ? raw : Array.isArray(raw?.default) ? raw.default : [];
    cache = rows.map((row) => ({
      code: String(row?.c || ''),
      description: String(row?.d || ''),
      industryType: row?.t === 'M' ? 'Manufacturing' : 'Service',
      level: LEVELS[String(row?.c || '').length] || 'Sub-class',
    }));
  } catch (err) {
    console.warn('Could not load the NIC category list:', err);
    return [];
  }
  return cache;
};

const norm = (value: unknown): string => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every token must match (so "rice mill" narrows), a numeric token also
 * matches the code as a prefix. Ranked: description starts with the query,
 * a word starts with it, the code starts with it, merely contains — then broad
 * (division) before specific (sub-class). Same ranking as the website.
 */
export const searchNicCategories = (
  catalogue: NicCategory[],
  query: string,
  limit = 50,
): { results: NicCategory[]; total: number } => {
  const q = norm(query);
  if (!q) return { results: [], total: 0 };

  const tokens = q.split(' ').filter(Boolean);
  const wordStart = new RegExp(`\\b${escapeRegex(q)}`);
  const scored: { row: NicCategory; rank: number }[] = [];

  for (const row of catalogue || []) {
    const desc = norm(row?.description);
    const code = String(row?.code || '');
    if (!tokens.every((t) => desc.includes(t) || code.startsWith(t))) continue;

    let rank = 3;
    if (desc.startsWith(q)) rank = 0;
    else if (wordStart.test(desc)) rank = 1;
    else if (code.startsWith(q)) rank = 2;
    scored.push({ row, rank });
  }

  scored.sort((a, b) =>
    a.rank - b.rank
    || a.row.code.length - b.row.code.length
    || a.row.code.localeCompare(b.row.code));

  return { results: scored.slice(0, limit).map((s) => s.row), total: scored.length };
};

export const isKnownDescription = (catalogue: NicCategory[], query: string): boolean => {
  const q = norm(query);
  return (catalogue || []).some((row) => norm(row?.description) === q);
};

export const categoryLabel = (c?: ProductCategory | null): string =>
  c?.code ? `${c.code} — ${c?.description || ''}` : String(c?.description || '');

export const sameCategory = (a: ProductCategory, b: ProductCategory): boolean =>
  (a?.code && b?.code) ? a.code === b.code : norm(a?.description) === norm(b?.description);
