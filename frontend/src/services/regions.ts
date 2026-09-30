import api from './api';

/**
 * Region discovery, driven entirely by the admin database.
 *
 * The registration screens used to read a bundled 360KB JSON of every Indian
 * state, district and block. That list is complete but wrong for the job: it
 * offers thousands of regions the platform has nobody to review applications
 * for, and an applicant who picks one submits a file that lands in no queue.
 *
 * These endpoints return only regions with an active admin, so the picker is a
 * shortlist of places the applicant can actually be processed in.
 */

export interface RegionNode {
  name: string;
  /** How many active admins cover this region. Always >= 1 to be listed. */
  admins: number;
}

export interface RegionValidation {
  ok: boolean;
  reason: string;
  bootstrap?: boolean;
  region: { state: string; district: string; block: string } | null;
}

interface TreeDistrict extends RegionNode {
  blocks: RegionNode[];
}
interface TreeState extends RegionNode {
  districts: TreeDistrict[];
}

interface RegionTree {
  coverageAvailable: boolean;
  states: TreeState[];
}

const EMPTY_TREE: RegionTree = { coverageAvailable: false, states: [] };

/**
 * The whole tree is fetched once and cached in memory.
 *
 * Three chained requests would make the applicant wait between every dropdown
 * on a slow connection. The tree is small — names and counts for staffed
 * regions only — and it changes when an admin is created, which is why the TTL
 * is short rather than for the session.
 */
const CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * WHICH REGIONS THE ANSWER COVERS — the website's getRegionTree(force, include).
 *
 *   selectable  (default) pruned bottom-up: only regions staffed down to a block.
 *   all         every region any admin names (?include=all).
 *
 * Registration and the personal-details form read 'all', exactly as the website's
 * getStates/getDistricts/getBlocks do: a state staffed only by a state admin is a
 * real choice (the application routes upward via tierRouting), and district and
 * block are optional beneath it. One cache slot PER SCOPE, so the two answers can
 * never evict each other.
 */
export type RegionScope = 'selectable' | 'all';

const cache: Partial<Record<RegionScope, { at: number; tree: RegionTree }>> = {};
const inFlight: Partial<Record<RegionScope, Promise<RegionTree>>> = {};

const eq = (a?: string | null, b?: string | null) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** Fetch the tree for one scope, de-duplicating concurrent callers. */
export const fetchRegionTree = async (force = false, include: RegionScope = 'selectable'): Promise<RegionTree> => {
  const cached = cache[include];
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.tree;
  const pending = inFlight[include];
  if (!force && pending) return pending;

  const request = (async () => {
    try {
      const response = await api.get('/regions/tree', {
        // Sent only for the wider listing, as the website does.
        params: include === 'all' ? { include: 'all' } : undefined,
      });
      // This backend returns both { success, data } and bare objects.
      const payload = response.data?.data || response.data || {};
      const tree: RegionTree = {
        coverageAvailable: !!payload.coverageAvailable,
        states: Array.isArray(payload.states) ? payload.states : [],
      };
      // An empty answer is not cached (one blip would blank every dropdown).
      if ((tree.states || []).length) cache[include] = { at: Date.now(), tree };
      return tree;
    } finally {
      delete inFlight[include];
    }
  })();

  inFlight[include] = request;
  return request;
};

/** Drop BOTH cached scopes — call after an admin is created, so new regions appear. */
export const invalidateRegionCache = () => {
  (Object.keys(cache) as RegionScope[]).forEach((scope) => { delete cache[scope]; });
};

export const getStates = async (force = false): Promise<RegionNode[]> => {
  const tree = await fetchRegionTree(force, 'all');
  return (tree.states || []).map(node => ({ name: node.name, admins: node.admins }));
};

export const getDistricts = async (state?: string | null): Promise<RegionNode[]> => {
  if (!state) return [];
  const tree = await fetchRegionTree(false, 'all');
  const node = (tree.states || []).find(entry => eq(entry.name, state));
  return (node?.districts || []).map(entry => ({ name: entry.name, admins: entry.admins }));
};

export const getBlocks = async (
  state?: string | null,
  district?: string | null,
): Promise<RegionNode[]> => {
  if (!state || !district) return [];
  const tree = await fetchRegionTree(false, 'all');
  const stateNode = (tree.states || []).find(entry => eq(entry.name, state));
  const districtNode = (stateNode?.districts || []).find(entry => eq(entry.name, district));
  return (districtNode?.blocks || []).map(entry => ({ name: entry.name, admins: entry.admins }));
};

/** True when at least one region on the platform is staffed and selectable. */
export const hasCoverage = async (): Promise<boolean> => {
  const tree = await fetchRegionTree(false, 'all').catch(() => EMPTY_TREE);
  return (tree.states || []).length > 0;
};

/**
 * Server-side pre-flight, used before submitting a registration.
 *
 * The server re-checks this on submit regardless — this call only exists so the
 * applicant sees the problem on the form rather than as a failed submission.
 */
export const validateRegion = async (
  state: string,
  district: string,
  block: string,
): Promise<RegionValidation> => {
  try {
    const response = await api.get('/regions/validate', { params: { state, district, block } });
    const payload = response.data?.data || response.data || {};
    return {
      ok: !!payload.ok,
      reason: payload.reason || '',
      bootstrap: !!payload.bootstrap,
      region: payload.region || null,
    };
  } catch {
    // A failed pre-flight must not block a submission the server would accept.
    // The submit path validates again and is the real gate.
    return { ok: true, reason: '', region: null };
  }
};

/**
 * The canonical India reference — every state, district and block that exists,
 * staffed or not.
 *
 * Only the super admin's own pickers use this. A state admin is the root of a
 * region, so there is no parent to inherit a state name from, and this is what
 * stops that one free-text value being a typo the whole subtree inherits.
 */
export const getGeography = async (
  state?: string | null,
  district?: string | null,
): Promise<string[]> => {
  try {
    const params: Record<string, string> = {};
    if (state) params.state = state;
    if (state && district) params.district = district;

    const response = await api.get('/regions/geography', { params });
    const payload = response.data?.data || response.data || {};
    return payload.states || payload.districts || payload.blocks || [];
  } catch {
    return [];
  }
};
