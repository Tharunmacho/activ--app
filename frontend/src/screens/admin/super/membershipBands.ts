import { MembershipPlanRow } from '../../../services/superApi';

/**
 * ============================================================================
 * Membership band arithmetic — the website's Membership.tsx helpers, 1:1
 * ============================================================================
 *
 * Bands are half-open `[minYears, maxYears)`; `maxYears: null` is the open top
 * band. Only a COMPANY plan has a band (aspirant / student / platinum have no
 * commencement year). The calendar-year view is derived from the duration every
 * render, so it moves forward each January exactly as the server's rule does.
 * `bandLabel` mirrors the server's `bandLabel` — the two must agree.
 */

type PlanLike = Partial<MembershipPlanRow> | null | undefined;

const maxOf = (p: PlanLike): number | null =>
  p?.maxYears === null || p?.maxYears === undefined ? null : Number(p.maxYears);

export const hasBand = (p: PlanLike) => (p?.audience || 'business') === 'business';

export const bandLabel = (p: PlanLike) => {
  if (p?.audience === 'aspirant') return 'No business — aspirant';
  if (p?.audience === 'student') return 'Not doing business — student';
  if (p?.audience === 'platinum') return 'Lifetime · granted offline';
  const min = Number(p?.minYears || 0);
  const max = maxOf(p);
  if (max === null) return `${min}+ years trading`;
  if (min === 0) return `Under ${max} years trading`;
  return `${min} – ${max} years trading`;
};

/** "started 2022–2026", or "started 2016 or earlier". */
export const yearWindowLabel = (p: PlanLike, thisYear: number) => {
  if (!hasBand(p)) return '';
  const newest = thisYear - Number(p?.minYears || 0);
  const max = maxOf(p);
  const oldest = max === null ? null : thisYear - max + 1;
  if (oldest === null) return `started ${newest} or earlier`;
  if (oldest === newest) return `started ${newest}`;
  return `started ${oldest}–${newest}`;
};

/** A start year back to a duration (the editor's year inputs). */
export const yearsFromStart = (startYear: number, thisYear: number) => Math.max(0, thisYear - startYear);

/** The same half-open rule the server uses. */
export const inBand = (p: PlanLike, years: number) => {
  if (years < Number(p?.minYears || 0)) return false;
  const max = maxOf(p);
  return max === null || years < max;
};

/** Active company plans, ordered by band. */
export const companyPlans = (plans: MembershipPlanRow[]) =>
  (plans || []).filter((p) => (p?.audience || 'business') === 'business')
    .slice().sort((a, b) => Number(a?.minYears || 0) - Number(b?.minYears || 0));

/** Gaps and overlaps across the ACTIVE company bands — worded as the website words them. */
export const bandProblems = (business: MembershipPlanRow[]) => {
  const active = (business || []).filter((p) => p?.active);
  const problems: string[] = [];
  if (active.length && Number(active[0]?.minYears || 0) > 0) {
    problems.push(`Nothing covers companies under ${active[0].minYears} years old.`);
  }
  active.forEach((plan, i) => {
    const next = active[i + 1];
    const max = maxOf(plan);
    if (!next) {
      if (max !== null) problems.push(`Nothing covers companies over ${max} years old.`);
      return;
    }
    if (max === null) {
      problems.push(`"${plan?.name || plan?.key}" is open-ended, so "${next?.name || next?.key}" can never match.`);
      return;
    }
    const nextMin = Number(next?.minYears || 0);
    if (max < nextMin) problems.push(`Nothing covers ${max} to ${nextMin} years.`);
    if (max > nextMin) problems.push(`"${plan?.name || plan?.key}" and "${next?.name || next?.key}" overlap between ${nextMin} and ${max} years.`);
  });
  return problems;
};

export interface YearRun { key: string; years: string; duration: string; plan: MembershipPlanRow | null }

/**
 * Commencement years collapsed into contiguous runs, newest first — one row per
 * plan plus one per gap (website `yearRanges`). The last run is open-ended.
 */
export const yearRanges = (business: MembershipPlanRow[], thisYear: number, span = 40): YearRun[] => {
  const active = (business || []).filter((p) => p?.active);
  if (!active.length) return [];
  const planFor = (year: number) => active.find((p) => inBand(p, thisYear - year)) || null;
  const runs: YearRun[] = [];
  let runPlan = planFor(thisYear);
  let runNewest = thisYear;
  const close = (oldest: number, openEnded: boolean) => {
    const years = openEnded ? `${oldest} and earlier` : oldest === runNewest ? `${oldest}` : `${oldest} – ${runNewest}`;
    runs.push({ key: `${runNewest}-${oldest}`, years, duration: runPlan ? bandLabel(runPlan) : '—', plan: runPlan });
  };
  for (let year = thisYear - 1; year >= thisYear - span; year--) {
    const plan = planFor(year);
    if (plan?.key === runPlan?.key) continue;
    close(year + 1, false);
    runPlan = plan;
    runNewest = year;
  }
  close(thisYear - span, true);
  return runs;
};
