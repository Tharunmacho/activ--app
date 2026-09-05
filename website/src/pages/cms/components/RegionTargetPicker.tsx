import { useEffect, useMemo, useState } from 'react';
import {
    Globe, MapPin, Search, Users, AlertTriangle, Loader2, ChevronRight, X,
    RefreshCw, Check,
} from 'lucide-react';
import { getRegionTree } from '@/services/activApi';
import { getEventReach } from '@/services/cmsApi';
import { CmsSection, CmsModeCard } from './CmsUI';

/**
 * Who a piece of content is for — any number of states, districts and blocks.
 *
 * THREE THINGS THIS REPLACES, all of them reported as "I cannot select the
 * regions":
 *
 *   1. THREE DROPDOWNS THAT EXPRESSED ONE REGION. A conclave held for ten
 *      blocks across two districts had to be posted ten times: ten records, ten
 *      registration lists, ten things to correct when the venue moved.
 *
 *   2. AN ADD-ONE-AT-A-TIME BUILDER. Its replacement was a list, which was
 *      right, but choosing ten blocks still meant thirty dropdown interactions
 *      and ten presses of Add. Ticking ten boxes is the operation the editor is
 *      actually performing.
 *
 *   3. AN EMPTY DROPDOWN THAT EXPLAINED NOTHING. When the region tree failed to
 *      load — or had not loaded yet — the state select rendered with only its
 *      placeholder in it, identical to a platform with no staffed regions at
 *      all. There is a loading state and a retry now, and "no regions" says why.
 *
 * EMPTY MEANS EVERYONE. That is the contract the model states and the one
 * `regionMatch.js` enforces on the way out, so it is offered as a mode rather
 * than as a row: "everywhere, and also Ariyalur" is either a contradiction or a
 * no-op depending which end of the system you ask.
 *
 * SELECTING A WIDER SCOPE DROPS THE NARROWER ONES INSIDE IT. Ticking Tamil Nadu
 * removes any districts and blocks of Tamil Nadu already chosen, because
 * `{ state: 'Tamil Nadu' }` already reaches every one of them. Keeping both
 * would show an editor two rows that mean one thing and make the reach count
 * look like it was double-counting.
 *
 * The options come from the live region tree — the admin collections, not a
 * bundled list — so a region opens for targeting the moment a block admin is
 * created for it. See the admin-first region architecture note in CLAUDE.md.
 */

export interface RegionTarget {
    state: string;
    district: string;
    block: string;
}

interface Props {
    /** Every region ticked in the tree, kept whether or not it is narrowing. */
    targets: RegionTarget[];
    onChange: (targets: RegionTarget[]) => void;
    /**
     * "Everyone in the association" — the first card, and a field of its own on
     * the event rather than a shorthand for an empty `targets`.
     *
     * Separate because the two cards are independent: an event may carry ticked
     * regions AND go to everybody, and reopening it has to show back both. With
     * an empty list standing in for everyone, ticking the first card could only
     * be saved by discarding the second card's regions.
     */
    reachEveryone?: boolean;
    onReachEveryoneChange?: (reachEveryone: boolean) => void;
    /** Feeds the reach count: the members-only switch narrows it further. */
    audience?: 'all' | 'paid';
    hint?: string;
    title?: string;
}

interface BlockNode { name?: string }
interface DistrictNode { name?: string; blocks?: BlockNode[] }
interface StateNode { name?: string; districts?: DistrictNode[] }

const label = (t: RegionTarget) => [t.state, t.district, t.block].filter(Boolean).join(' › ');

const same = (a: RegionTarget, b: RegionTarget) =>
    a.state === b.state && a.district === b.district && a.block === b.block;

/** Is `inner` inside `outer`? A scope is read left to right — see the model. */
const covers = (outer: RegionTarget, inner: RegionTarget) => {
    if (outer.state !== inner.state) return false;
    if (!outer.district) return true;
    if (outer.district !== inner.district) return false;
    if (!outer.block) return true;
    return outer.block === inner.block;
};

export default function RegionTargetPicker({
    targets,
    onChange,
    reachEveryone = false,
    onReachEveryoneChange,
    audience = 'all',
    hint,
    title,
}: Props) {
    const [states, setStates] = useState<StateNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [term, setTerm] = useState('');
    /*
     * SETS, NOT ONE OPEN BRANCH EACH.
     *
     * These were single strings, so opening a second district closed the first
     * and opening a second state closed everything under it. Picking four blocks
     * across two districts therefore meant re-expanding the tree between every
     * pick, and after each one the row that had just been ticked scrolled away
     * with its branch. Several branches can stand open now, which is what makes
     * choosing more than one region bearable.
     */
    const [openStates, setOpenStates] = useState<Set<string>>(new Set());
    const [openDistricts, setOpenDistricts] = useState<Set<string>>(new Set());

    /** Add or remove one key, without mutating the set React is rendering. */
    const toggleIn = (
        setter: React.Dispatch<React.SetStateAction<Set<string>>>,
        key: string,
    ) => setter((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });

    /** Open one branch — used when a card asks for the tree, not by the rows. */
    const setOpenState = (name: string) =>
        setOpenStates((current) => (name ? new Set(current).add(name) : current));

    /*
     * TWO INDEPENDENT ANSWERS, STORED INDEPENDENTLY.
     *
     * `targets` is what was ticked in the tree. `reachEveryone` is the first
     * card. Either, both or neither may be on, and the event carries both, so
     * reopening it restores exactly what the editor last saw.
     *
     * That separation lives on the Event schema, and it had to: with an empty
     * list standing in for "everyone", ticking the first card could only be
     * saved by throwing the second card's regions away — so every edit of such
     * an event started from a blank tree. See `reachEveryone` on the model.
     */
    const list = useMemo(() => (Array.isArray(targets) ? targets : []), [targets]);
    const everyone = reachEveryone === true;

    /**
     * Who this actually goes to, once both answers are read together.
     *
     * "Everyone" wins — everyone ∪ Tamil Nadu is everyone — and the ticked
     * regions are kept, simply not narrowing anything while it is on. This is
     * the same rule the server applies in `event.service.listEvents`, and it has
     * to be, or the reach count would describe a different audience from the one
     * that receives the event.
     */
    const effective = everyone ? [] : list;
    const everywhere = effective.length === 0;


    const loadTree = (force = false) => {
        setLoading(true);
        setLoadError('');

        /*
         * `include: 'all'` — EVERY REGION THE ADMIN DATABASE KNOWS.
         *
         * The default listing is the APPLICANT's: pruned bottom-up so a
         * registration dropdown cannot offer a state with no block beneath it to
         * finish choosing through. Reading that listing here deleted real
         * regions from this picker. A platform with two staffed states — one
         * with 38 districts of block admins, one carrying only its state admin
         * — offered exactly one, with nothing on screen to say the other had
         * been withheld or why. The editor's reasonable conclusion was that the
         * state admin they had just created had not saved.
         *
         * Targeting asks the opposite question. A state whose only staffed
         * account is its state admin is a real audience: that admin, and every
         * member standing in that state, receive the event. Nothing about
         * reaching them requires a block admin to exist first — that rule is
         * about opening a region for REGISTRATION, and it does not belong here.
         */
        getRegionTree(force, 'all')
            .then((tree) => {
                const rows = Array.isArray(tree?.states) ? tree.states : [];
                setStates(rows);
                /*
                 * An empty tree is a real answer, and a different one from a
                 * failure. This listing holds every region any admin account
                 * names, so empty means no admin has been created anywhere —
                 * which the editor can act on, unlike a blank dropdown.
                 */
                if (!rows.length) {
                    setLoadError('No regions exist yet. Create an admin for a state, district or block to open one for targeting.');
                }
            })
            .catch(() => setLoadError('The region list could not be loaded.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadTree(); }, []);

    // ---------------------------------------------------------------- selection

    /**
     * Add a scope, dropping anything it already covers.
     *
     * A region can be ticked while "Everyone" is still on: the tick is stored
     * either way, and `reachEveryone` decides whether it is narrowing anything.
     */
    const select = (target: RegionTarget) => {
        if (list.some((t) => covers(t, target))) return;   // already reached
        onChange([...list.filter((t) => !covers(target, t)), target]);
    };

    const deselect = (target: RegionTarget) =>
        onChange(list.filter((t) => !same(t, target)));

    /**
     * Ticked = chosen exactly, or reached by something wider.
     *
     * Read from the stored list, which holds the ticks whether or not
     * "Everyone" is overruling them. Deriving "everyone" from an EMPTY list is
     * what used to blank the tree the moment that card was ticked.
     */
    const statusOf = (target: RegionTarget): 'on' | 'partial' | 'off' => {
        if (list.some((t) => same(t, target))) return 'on';
        if (list.some((t) => covers(t, target))) return 'on';
        if (list.some((t) => covers(target, t))) return 'partial';
        return 'off';
    };

    const toggle = (target: RegionTarget) => {
        const status = statusOf(target);

        if (status === 'on') {
            // Remove the entry itself, and any wider one that was reaching it —
            // untick means "not this", and leaving the parent on would ignore it.
            onChange(list.filter((t) => !same(t, target) && !covers(t, target)));
            return;
        }
        select(target);
    };

    // ---------------------------------------------------------------- search

    const filtered = useMemo(() => {
        const q = term.trim().toLowerCase();
        if (!q) return states;

        /*
         * A state stays when it matches, or when anything inside it does — and
         * in the second case only the matching descendants are kept, so a
         * search for "hosur" does not open a district of ninety irrelevant
         * blocks around the one that matched.
         */
        return states
            .map((s) => {
                const stateHit = (s.name || '').toLowerCase().includes(q);

                const districts = (s.districts || [])
                    .map((d) => {
                        const districtHit = (d.name || '').toLowerCase().includes(q);
                        const blocks = (d.blocks || [])
                            .filter((b) => (b.name || '').toLowerCase().includes(q));

                        if (stateHit || districtHit) return d;
                        return blocks.length ? { ...d, blocks } : null;
                    })
                    .filter(Boolean) as DistrictNode[];

                if (stateHit) return s;
                return districts.length ? { ...s, districts } : null;
            })
            .filter(Boolean) as StateNode[];
    }, [states, term]);

    // ---------------------------------------------------------------- reach

    const [reach, setReach] = useState<{ members: number; excludedByAudience: number } | null>(null);
    const [reachLoading, setReachLoading] = useState(false);

    // Serialised, because `list` is a fresh array identity on every render of
    // the parent form — depending on it directly would re-ask the server on
    // every keystroke typed into the event's title.
    /*
     * The EFFECTIVE audience, not the ticks.
     *
     * `effective` is `[]` while "Everyone" is on, which is the audience the
     * server will apply. Keying on the raw ticks instead would report "reaches
     * 40 members in Ariyalur" for an event that is in fact going to all 4,000.
     */
    const reachKey = useMemo(
        () => JSON.stringify({ effective, audience }),
        [effective, audience],
    );

    useEffect(() => {
        let cancelled = false;
        setReachLoading(true);

        const timer = window.setTimeout(() => {
            getEventReach(effective, audience)
                .then((data) => { if (!cancelled) setReach(data); })
                // A failed count keeps the last known answer: "0 members" is the
                // one wrong answer that would stop an editor publishing
                // something perfectly correct.
                .catch(() => { /* keep what was last known */ })
                .finally(() => { if (!cancelled) setReachLoading(false); });
        }, 300);

        return () => { cancelled = true; window.clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reachKey]);

    // ---------------------------------------------------------------- render

    return (
        <CmsSection
            title={title || 'Who sees this'}
            hint={hint || 'Tick as many states, districts or blocks as you like. The event goes to '
                + 'everyone inside any of them, and to nobody else.'}
        >
            {/* ------------------------------------------- options ---------
              TWO CARDS, BOTH OPTIONAL, EITHER OR BOTH.

              The original treatment — thick border, tinted fill, no checkbox
              square — with checkbox semantics behind it. They were a forced
              either/or, so there was no way to say "everyone, and these are the
              regions I care about" without one tick erasing the other, and the
              erased one did not come back on reopening the event.

                everyone only   -> every member, wherever they are
                regions only    -> only members inside them
                BOTH ticked     -> everyone. Everyone UNION Tamil Nadu is
                                   everyone; the regions stay ticked, and stay
                                   SAVED, simply not narrowing anything while
                                   the first card is on.
                NEITHER ticked  -> everyone, which is what an empty target list
                                   has always meant.

              All four survive a save and a reopen, because the two answers are
              two fields — see `reachEveryone` on the Event schema. The reach
              line at the bottom of this section reports which of the four is in
              force, so nothing here has to restate it.
            */}
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <CmsModeCard
                    checked={everyone}
                    onChange={(next) => onReachEveryoneChange?.(next)}
                    icon={<Globe className="w-4 h-4" />}
                    title="Everyone in the association"
                    detail={list.length && everyone
                        ? `Every member, wherever they are. The ${list.length} `
                          + `${list.length === 1 ? 'region' : 'regions'} below stay saved, and are not `
                          + 'narrowing anything while this is ticked.'
                        : 'Every member, wherever they are.'}
                />
                <CmsModeCard
                    checked={list.length > 0}
                    onChange={(next) => {
                        // Ticking cannot invent a region, so it opens the tree
                        // and waits; unticking clears what was chosen.
                        if (next) setOpenState(states[0]?.name || '');
                        else onChange([]);
                    }}
                    icon={<MapPin className="w-4 h-4" />}
                    title="Only chosen regions"
                    detail={list.length
                        ? `${list.length} ${list.length === 1 ? 'region' : 'regions'} selected`
                        : 'Pick states, districts or blocks below.'}
                />
            </div>

            {/* ---------------------------------------------- chips ----------
              Kept on screen while "Everyone" is ticked, dimmed, so the editor
              can see what unticking that card would go back to. */}
            {list.length > 0 ? (
                <ul className={`flex flex-wrap gap-2 mb-4 ${everyone ? 'opacity-60' : ''}`}>
                    {list.map((target) => (
                        <li
                            key={label(target)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-[#101a2e]
                                       border border-blue-200 dark:border-[#1e3a5f] pl-2.5 pr-1 py-1"
                        >
                            <MapPin size={12} className="shrink-0 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-neutral-100">
                                {label(target)}
                            </span>
                            <button
                                type="button"
                                onClick={() => deselect(target)}
                                aria-label={`Remove ${label(target)}`}
                                className="shrink-0 w-5 h-5 rounded flex items-center justify-center
                                           text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </li>
                    ))}

                    <li>
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700
                                       dark:hover:text-neutral-200 px-2 py-1.5"
                        >
                            Clear all
                        </button>
                    </li>
                </ul>
            ) : null}

            {/* ---------------------------------------------- the tree -------
              One line of instruction, because the two gestures on every row look
              identical and do different things.

              The box takes the whole region; the chevron opens what is inside
              it. Without this said, the only way to learn that ticking a state
              already covers all 402 of its blocks is to open it and start
              ticking them one at a time — which several editors did.
            */}
            <p className="mb-2 text-xs text-slate-500 dark:text-[#A1A1AA]">
                Tick a state or district to take <strong className="font-semibold">all</strong> of it.
                Use the arrow to open it and pick individual districts or blocks instead.
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden">
                <div className="relative border-b border-slate-200 dark:border-[#2a2a2a]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Search a state, district or block"
                        className="w-full h-10 pl-9 pr-3 bg-white dark:bg-black text-sm
                                   text-slate-900 dark:text-neutral-100 focus:outline-none"
                    />
                </div>

                {/*
                  Taller, and it earns the space.

                  At 20rem this showed about seven rows, so choosing a block —
                  state, then district, then block, each pushing the last one up —
                  meant scrolling a 38-district list inside a window that could
                  hold a fifth of it. `min` keeps it from taking over a short
                  screen: on a laptop in a browser window it is the viewport that
                  runs out first, not the list.
                */}
                <div className="max-h-[min(60vh,32rem)] overflow-y-auto">
                    {loading ? (
                        <div className="p-4 space-y-2" aria-hidden>
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-8 rounded bg-slate-100 dark:bg-[#141414] animate-pulse" />
                            ))}
                        </div>
                    ) : loadError ? (
                        <div className="p-5 text-center">
                            <AlertTriangle size={18} className="mx-auto text-amber-500 mb-2" />
                            <p className="text-xs text-slate-600 dark:text-[#A1A1AA] max-w-xs mx-auto
                                          leading-relaxed">
                                {loadError}
                            </p>
                            <button
                                type="button"
                                onClick={() => loadTree(true)}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold
                                           text-blue-600 hover:underline"
                            >
                                <RefreshCw size={12} /> Try again
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="p-5 text-center text-xs text-slate-500 dark:text-[#A1A1AA]">
                            Nothing matches “{term}”.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                            {filtered.map((s) => {
                                const stateName = s.name || '';
                                const stateTarget = { state: stateName, district: '', block: '' };
                                const status = statusOf(stateTarget);
                                const districtCount = (s.districts || []).length;
                                /*
                                 * A STATE WITH NO DISTRICTS IS STILL A TARGET.
                                 *
                                 * It appears the moment a state admin exists,
                                 * before anyone has staffed a district beneath
                                 * it — and it is tickable exactly like any
                                 * other, because ticking it means "everyone in
                                 * this state" and that is a real audience
                                 * whether or not the tree under it has been
                                 * filled in.
                                 *
                                 * What it must NOT get is an expand control. A
                                 * chevron that opens an empty list reads as a
                                 * failed load, and an editor who presses it
                                 * concludes the districts are missing rather
                                 * than absent. `note` says so in words instead.
                                 */
                                const expandable = districtCount > 0;
                                const expanded = expandable && (openStates.has(stateName) || !!term);

                                return (
                                    <li key={stateName}>
                                        <Row
                                            depth={0}
                                            status={status}
                                            name={stateName}
                                            note={expandable
                                                ? `${districtCount} ${districtCount === 1 ? 'district' : 'districts'}`
                                                : 'state-wide only'}
                                            noteTitle={expandable ? undefined
                                                : 'No district or block admin exists here yet. Ticking this state '
                                                  + 'reaches its state admin and every member standing in it.'}
                                            expanded={expandable ? expanded : undefined}
                                            onToggleCheck={() => toggle(stateTarget)}
                                            onToggleOpen={expandable
                                                ? () => toggleIn(setOpenStates, stateName)
                                                : undefined}
                                        />

                                        {expanded ? (
                                            <ul>
                                                {(s.districts || []).map((d) => {
                                                    const districtName = d.name || '';
                                                    const districtTarget = {
                                                        state: stateName, district: districtName, block: '',
                                                    };
                                                    const dStatus = statusOf(districtTarget);
                                                    const dKey = stateName + '/' + districtName;
                                                    const blockCount = (d.blocks || []).length;
                                                    // Same rule as the state row: a
                                                    // chevron onto an empty list reads
                                                    // as a failed load.
                                                    const dExpandable = blockCount > 0;
                                                    const dOpen = dExpandable
                                                        && (openDistricts.has(dKey) || !!term);

                                                    return (
                                                        <li key={dKey}>
                                                            <Row
                                                                depth={1}
                                                                status={dStatus}
                                                                name={districtName}
                                                                note={dExpandable
                                                                    ? `${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`
                                                                    : 'district-wide only'}
                                                                noteTitle={dExpandable ? undefined
                                                                    : 'No block admin exists here yet. Ticking this '
                                                                      + 'district reaches everyone standing in it.'}
                                                                expanded={dExpandable ? dOpen : undefined}
                                                                onToggleCheck={() => toggle(districtTarget)}
                                                                onToggleOpen={dExpandable
                                                                    ? () => toggleIn(setOpenDistricts, dKey)
                                                                    : undefined}
                                                            />

                                                            {dOpen ? (
                                                                <ul>
                                                                    {(d.blocks || []).map((b) => {
                                                                        const blockTarget = {
                                                                            state: stateName,
                                                                            district: districtName,
                                                                            block: b.name || '',
                                                                        };

                                                                        return (
                                                                            <li key={dKey + '/' + b.name}>
                                                                                <Row
                                                                                    depth={2}
                                                                                    status={statusOf(blockTarget)}
                                                                                    name={b.name || ''}
                                                                                    onToggleCheck={() =>
                                                                                        toggle(blockTarget)}
                                                                                />
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            ) : null}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* ---------------------------------------------- the reach ------ */}
            {/*
              The one number an editor needs before publishing.

              Not the list read back — they can see the list. This is the
              intersection of the regions above and the members-only switch
              elsewhere on the form, which is what neither control shows and what
              silently emptied an event's audience once already.
            */}
            <div className="mt-4 rounded-lg border border-slate-200 dark:border-[#2a2a2a]
                            bg-slate-50 dark:bg-[#0d0d0d] px-3.5 py-3">
                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#A1A1AA]">
                    {reachLoading
                        ? <Loader2 size={13} className="shrink-0 animate-spin" />
                        : everywhere
                            ? <Globe size={13} className="shrink-0" />
                            : <Users size={13} className="shrink-0" />}

                    {reach ? (
                        <span>
                            This reaches{' '}
                            <strong className="text-slate-900 dark:text-neutral-100">
                                {reach.members} {reach.members === 1 ? 'member' : 'members'}
                            </strong>
                            {everywhere
                                ? ' — everyone in the association.'
                                : ` in ${list.length} ${list.length === 1 ? 'region' : 'regions'}.`}
                        </span>
                    ) : (
                        <span>
                            {everywhere
                                ? 'Everyone in the association will see this.'
                                : `Aimed at ${list.length} ${list.length === 1 ? 'region' : 'regions'}.`}
                        </span>
                    )}
                </p>

                {reach && reach.excludedByAudience > 0 ? (
                    <p className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span>
                            <strong>{reach.excludedByAudience}</strong>{' '}
                            {reach.excludedByAudience === 1 ? 'member is' : 'members are'} in these regions
                            but will NOT see this, because it is set to members with an active membership only.
                        </span>
                    </p>
                ) : null}

                {reach && reach.members === 0 ? (
                    <p className="mt-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span>
                            Nobody will see this. Widen the regions, or turn off members-only, unless you
                            are posting ahead of a membership drive.
                        </span>
                    </p>
                ) : null}
            </div>
        </CmsSection>
    );
}

// ---------------------------------------------------------------- pieces

/**
 * One row of the region tree.
 *
 * `partial` is its own state and not a half-hearted `on`. A state with three of
 * its forty blocks ticked is neither selected nor unselected, and rendering it
 * as either loses information the editor needs: as `on` it claims the whole
 * state is included, as `off` it hides that anything inside is.
 */
function Row({
    depth,
    status,
    name,
    note,
    noteTitle,
    expanded,
    onToggleCheck,
    onToggleOpen,
}: {
    depth: 0 | 1 | 2;
    status: 'on' | 'partial' | 'off';
    name: string;
    note?: string;
    /** Hover text for the note, where the short form needs explaining. */
    noteTitle?: string;
    expanded?: boolean;
    onToggleCheck: () => void;
    /** Omitted for a row with nothing inside it — see the note on `expandable`. */
    onToggleOpen?: () => void;
}) {
    const PAD = ['pl-3', 'pl-9', 'pl-16'][depth];

    return (
        <div className={`${PAD} pr-3 py-2 flex items-center gap-2.5 hover:bg-slate-50
                         dark:hover:bg-[#0f0f0f] transition-colors`}>
            <button
                type="button"
                onClick={onToggleCheck}
                aria-pressed={status === 'on'}
                aria-label={`${status === 'on' ? 'Remove' : 'Add'} ${name}`}
                className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center
                            transition-colors ${
                    status === 'on'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : status === 'partial'
                            ? 'border-blue-500 bg-blue-100 dark:bg-blue-950'
                            : 'border-slate-300 dark:border-[#3a3a3a]'
                }`}
            >
                {status === 'on' ? <Check size={11} strokeWidth={3} /> : null}
                {status === 'partial' ? (
                    <span className="w-1.5 h-1.5 rounded-sm bg-blue-600" />
                ) : null}
            </button>

            <button
                type="button"
                onClick={onToggleOpen || onToggleCheck}
                className="min-w-0 flex-1 flex items-center gap-2 text-left"
            >
                <span className={`truncate ${
                    depth === 0
                        ? 'text-sm font-semibold text-slate-800 dark:text-neutral-100'
                        : depth === 1
                            ? 'text-[0.8125rem] font-medium text-slate-700 dark:text-neutral-200'
                            : 'text-[0.8125rem] text-slate-600 dark:text-neutral-300'
                }`}>
                    {name}
                </span>
                {note ? (
                    /*
                      `truncate` and `min-w-0`, not `shrink-0`.
                      
                      The note is the row's least important text, so on a narrow
                      card it is the part that should give way. Held rigid it
                      pushed the row wider than the panel, and the card has no
                      horizontal scroll to reach the overflow with.
                    */
                    <span
                        title={noteTitle}
                        className="min-w-0 truncate text-[0.625rem] text-slate-400"
                    >
                        {note}
                    </span>
                ) : null}
            </button>

            {onToggleOpen ? (
                <ChevronRight
                    size={14}
                    className={`shrink-0 text-slate-400 transition-transform ${
                        expanded ? 'rotate-90' : ''
                    }`}
                />
            ) : null}
        </div>
    );
}
