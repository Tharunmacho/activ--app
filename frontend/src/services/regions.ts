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

let cache: { at: number; tree: RegionTree } | null = null;
let inFlight: Promise<RegionTree> | null = null;

const eq = (a?: string | null, b?: string | null) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/**
 * Fetch the tree, de-duplicating concurrent callers.
 *
 * Two pickers mounting at once would otherwise each fire a request; sharing the
 * in-flight promise keeps it to one.
 */
export const fetchRegionTree = async (force = false): Promise<RegionTree> => {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.tree;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await api.get('/regions/tree');
      // This backend returns both { success, data } and bare objects.
      const payload = response.data?.data || response.data || {};
      const tree: RegionTree = {
        coverageAvailable: !!payload.coverageAvailable,
        states: Array.isArray(payload.states) ? payload.states : [],
      };
      cache = { at: Date.now(), tree };
      return tree;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

/** Drop the cache — call after an admin is created, so new regions appear. */
export const invalidateRegionCache = () => {
  cache = null;
};

export const getStates = async (force = false): Promise<RegionNode[]> => {
  const tree = await fetchRegionTree(force);
  return (tree.states || []).map(node => ({ name: node.name, admins: node.admins }));
};

export const getDistricts = async (state?: string | null): Promise<RegionNode[]> => {
  if (!state) return [];
  const tree = await fetchRegionTree();
  const node = (tree.states || []).find(entry => eq(entry.name, state));
  return (node?.districts || []).map(entry => ({ name: entry.name, admins: entry.admins }));
};

export const getBlocks = async (
  state?: string | null,
  district?: string | null,
): Promise<RegionNode[]> => {
  if (!state || !district) return [];
  const tree = await fetchRegionTree();
  const stateNode = (tree.states || []).find(entry => eq(entry.name, state));
  const districtNode = (stateNode?.districts || []).find(entry => eq(entry.name, district));
  return (districtNode?.blocks || []).map(entry => ({ name: entry.name, admins: entry.admins }));
};

/** True when at least one region on the platform is staffed and selectable. */
export const hasCoverage = async (): Promise<boolean> => {
  const tree = await fetchRegionTree().catch(() => EMPTY_TREE);
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
