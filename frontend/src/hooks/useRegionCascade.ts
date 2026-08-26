import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStates, getDistricts, getBlocks, RegionNode, invalidateRegionCache } from '../services/regions';

/**
 * The three chained region pickers, backed by the admin database.
 *
 * Encapsulated as a hook because both the registration flow and the profile
 * form need identical behaviour, and getting the chaining subtly wrong in one
 * of them is how an applicant ends up with a district that does not belong to
 * their state.
 *
 * The invariant this enforces: a child selection is cleared the moment its
 * parent changes, and is only ever set to a value present in the freshly loaded
 * child list. There is no state in which the three selections disagree.
 */

export interface RegionCascade {
  states: RegionNode[];
  districts: RegionNode[];
  blocks: RegionNode[];

  state: string;
  district: string;
  block: string;

  setState: (value: string) => void;
  setDistrict: (value: string) => void;
  setBlock: (value: string) => void;

  /** True while the *first* load is in flight — the picker has nothing to show yet. */
  loading: boolean;
  /** True while a dependent list is refreshing after a parent changed. */
  refreshing: boolean;
  /** A human-readable load failure, or '' when everything is fine. */
  error: string;
  /**
   * True when the platform has no staffed region at all. The caller should say
   * so plainly rather than render three empty dropdowns.
   */
  noCoverage: boolean;

  reload: () => void;
}

interface Options {
  /** Pre-select these when they are still covered — used when editing a profile. */
  initialState?: string | null;
  initialDistrict?: string | null;
  initialBlock?: string | null;
}

const eq = (a?: string | null, b?: string | null) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export const useRegionCascade = (options: Options = {}): RegionCascade => {
  const { initialState, initialDistrict, initialBlock } = options;

  const [states, setStates] = useState<RegionNode[]>([]);
  const [districts, setDistricts] = useState<RegionNode[]>([]);
  const [blocks, setBlocks] = useState<RegionNode[]>([]);

  const [state, setStateValue] = useState('');
  const [district, setDistrictValue] = useState('');
  const [block, setBlockValue] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Guards every async setState. Without it, a request that resolves after the
  // screen is dismissed updates a torn-down component.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The initial values are only applied on the very first load, so a later
  // refresh cannot yank the user's current selection back to where they started.
  const seeded = useRef(false);

  const loadStates = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      if (force) invalidateRegionCache();
      const list = await getStates(force);
      if (!mounted.current) return;

      setStates(list || []);
      setLoadedOnce(true);

      if (!seeded.current && initialState) {
        // Only adopt a pre-set region if it is still staffed. A member whose
        // block admin has since been removed must re-pick rather than silently
        // keep a region the platform can no longer route.
        const match = (list || []).find(node => eq(node.name, initialState));
        if (match) setStateValue(match.name);
      }
      seeded.current = true;
    } catch (err: any) {
      if (!mounted.current) return;
      setStates([]);
      setError(err?.response?.data?.message || 'Could not load regions. Check your connection and retry.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [initialState]);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // Districts follow the state.
  useEffect(() => {
    let cancelled = false;

    if (!state) {
      setDistricts([]);
      setDistrictValue('');
      setBlocks([]);
      setBlockValue('');
      return undefined;
    }

    setRefreshing(true);
    getDistricts(state)
      .then(list => {
        if (cancelled || !mounted.current) return;
        setDistricts(list || []);

        // Keep the current district only if the new state still offers it.
        setDistrictValue(prev => {
          const keep = (list || []).find(node => eq(node.name, prev));
          if (keep) return keep.name;
          const seed = (list || []).find(node => eq(node.name, initialDistrict));
          return prev === '' && seed ? seed.name : '';
        });
      })
      .catch(() => {
        if (!cancelled && mounted.current) setDistricts([]);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state, initialDistrict]);

  // Blocks follow the district.
  useEffect(() => {
    let cancelled = false;

    if (!state || !district) {
      setBlocks([]);
      setBlockValue('');
      return undefined;
    }

    setRefreshing(true);
    getBlocks(state, district)
      .then(list => {
        if (cancelled || !mounted.current) return;
        setBlocks(list || []);

        setBlockValue(prev => {
          const keep = (list || []).find(node => eq(node.name, prev));
          if (keep) return keep.name;
          const seed = (list || []).find(node => eq(node.name, initialBlock));
          return prev === '' && seed ? seed.name : '';
        });
      })
      .catch(() => {
        if (!cancelled && mounted.current) setBlocks([]);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state, district, initialBlock]);

  // Setters clear their descendants immediately, so the form is never briefly
  // showing a district from the previously selected state.
  const setState = useCallback((value: string) => {
    setStateValue(value || '');
    setDistrictValue('');
    setBlockValue('');
  }, []);

  const setDistrict = useCallback((value: string) => {
    setDistrictValue(value || '');
    setBlockValue('');
  }, []);

  const setBlock = useCallback((value: string) => {
    setBlockValue(value || '');
  }, []);

  const reload = useCallback(() => {
    seeded.current = false;
    loadStates(true);
  }, [loadStates]);

  const noCoverage = useMemo(
    () => loadedOnce && !error && (states || []).length === 0,
    [loadedOnce, error, states],
  );

  return {
    states,
    districts,
    blocks,
    state,
    district,
    block,
    setState,
    setDistrict,
    setBlock,
    loading,
    refreshing,
    error,
    noCoverage,
    reload,
  };
};

export default useRegionCascade;
