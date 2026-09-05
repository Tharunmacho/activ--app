import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, Package, Users, X, SlidersHorizontal, ImageOff } from 'lucide-react';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { EmptyState, RowsSkeleton } from '@/features/member/components/MemberUI';
import {
    searchDirectory, listDirectorySectors,
    type DirectoryEntry, type DirectoryFilters,
} from '@/services/memberHubApi';
import { getStates, getDistricts, getBlocks, errorMessage } from '@/services/activApi';
import { resolveMediaUrl } from '@/config/api.config';

/**
 * The member directory (DIR-001).
 *
 * Replaces `/explore`, which loaded the first fifty members the API would
 * return and filtered that array in the browser. Two things were wrong with it:
 * the "search" reached only those fifty rows, so a member in the fifty-first was
 * unfindable by name; and it had no way to ask for a district or a sector at
 * all, because neither can be answered from a page of already-loaded rows.
 *
 * Every filter here is sent to the server and applied against the whole
 * membership. The region dropdowns are fed from `/regions`, the same live tree
 * the registration forms use — never a bundled list, per the admin-first region
 * rule: the regions that exist are the ones the admin database says exist.
 */

const PAGE_SIZE = 20;

const emptyFilters: DirectoryFilters = {
    q: '', state: '', district: '', block: '', sector: '', memberType: '',
};

export default function MemberDirectory() {
    const [filters, setFilters] = useState<DirectoryFilters>(emptyFilters);
    const [page, setPage] = useState(1);

    const [members, setMembers] = useState<DirectoryEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);

    /**
     * The screen opens on the viewer's own block.
     *
     * A member searching a trade directory is almost always looking for someone
     * they can actually deal with, and "my block" is the answer they would have
     * typed anyway. Applying it as a DEFAULT rather than a rule is the whole
     * point: the dropdowns show it, the chip below says so, and one click on
     * "Search the whole association" widens it. A filter the server applied
     * invisibly would be one the member could neither see nor undo, and what
     * they would report is that the directory is empty.
     *
     * Applied once, on the first response, and never again — re-applying it
     * would fight the member every time they cleared a dropdown.
     */
    const regionDefaulted = useRef(false);
    const [homeRegion, setHomeRegion] = useState({ state: '', district: '', block: '' });
    const [error, setError] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [states, setStates] = useState<string[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);
    const [blocks, setBlocks] = useState<string[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);

    /**
     * The search box is debounced; the dropdowns are not.
     *
     * Typing is a stream of intentions and only the last one is meant, so a
     * request per keystroke is six wasted round trips per word. Choosing a
     * district is a single deliberate act, and delaying it by a third of a
     * second only makes the screen feel slow.
     */
    const [term, setTerm] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setFilters((current) => (current.q === term ? current : { ...current, q: term }));
            setPage(1);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [term]);

    // ---------------------------------------------------------------- lookups

    useEffect(() => {
        let cancelled = false;

        Promise.allSettled([getStates(), listDirectorySectors()]).then(([stateResult, sectorResult]) => {
            if (cancelled) return;

            if (stateResult.status === 'fulfilled') {
                setStates((stateResult.value?.states || []).map((s: any) => s.name).filter(Boolean));
            }
            if (sectorResult.status === 'fulfilled') {
                setSectors(sectorResult.value?.sectors || []);
            }
        });

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;

        if (!filters.state) {
            setDistricts([]);
            setBlocks([]);
            return;
        }

        getDistricts(filters.state)
            .then((data) => {
                if (!cancelled) setDistricts((data?.districts || []).map((d: any) => d.name).filter(Boolean));
            })
            .catch(() => { if (!cancelled) setDistricts([]); });

        return () => { cancelled = true; };
    }, [filters.state]);

    useEffect(() => {
        let cancelled = false;

        if (!filters.state || !filters.district) {
            setBlocks([]);
            return;
        }

        getBlocks(filters.state, filters.district)
            .then((data) => {
                if (!cancelled) setBlocks((data?.blocks || []).map((b: any) => b.name).filter(Boolean));
            })
            .catch(() => { if (!cancelled) setBlocks([]); });

        return () => { cancelled = true; };
    }, [filters.state, filters.district]);

    // ---------------------------------------------------------------- search

    /**
     * Guard against an out-of-order response.
     *
     * Two searches in flight can come back in either order, and the slower one
     * arriving last would overwrite the newer results with the older ones. The
     * counter means only the most recent request is allowed to write state —
     * the same reason every effect in this file carries a `cancelled` flag.
     */
    const requestId = useRef(0);

    const runSearch = useCallback(async () => {
        const id = requestId.current + 1;
        requestId.current = id;

        setLoading(true);
        try {
            const data = await searchDirectory({ ...filters, page, limit: PAGE_SIZE });
            if (requestId.current !== id) return;

            const region = data?.viewerRegion;
            if (region) setHomeRegion(region);

            /*
             * Narrow to the viewer's own region, once.
             *
             * Deliberately after the first search rather than before it: the
             * region has to come from the server (the token often carries no
             * location claims — see `resolveMemberContext`), so the alternative
             * is a blocking round trip before the screen can show anything. One
             * unfiltered search, then a narrowed one, is the cheaper order and
             * it degrades correctly — a member whose record has no block simply
             * stays on the association-wide view.
             */
            if (!regionDefaulted.current) {
                regionDefaulted.current = true;

                const narrowed = {
                    state: region?.state || '',
                    district: region?.district || '',
                    block: region?.block || '',
                };

                if (narrowed.state) {
                    setFilters((current) => ({ ...current, ...narrowed }));
                    setPage(1);
                    return;   // the effect re-runs with the narrowed filters
                }
            }

            setMembers(data?.members || []);
            setTotal(data?.pagination?.total || 0);
            setPages(data?.pagination?.pages || 0);
            setError('');
        } catch (err) {
            if (requestId.current !== id) return;
            setError(errorMessage(err, 'Could not search the directory'));
            setMembers([]);
        } finally {
            if (requestId.current === id) setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { runSearch(); }, [runSearch]);

    const set = (patch: Partial<DirectoryFilters>) => {
        setFilters((current) => {
            const next = { ...current, ...patch };

            // Clearing the parent has to clear what hangs off it, or a stale
            // district silently filters a search the member thinks is national.
            if (patch.state !== undefined) { next.district = ''; next.block = ''; }
            if (patch.district !== undefined) { next.block = ''; }

            return next;
        });
        setPage(1);
    };

    const activeCount = useMemo(
        () => (['state', 'district', 'block', 'sector', 'memberType'] as const)
            .filter((key) => !!filters[key]).length,
        [filters],
    );

    const clearAll = () => {
        setTerm('');
        setFilters(emptyFilters);
        setPage(1);
    };

    /** True while the screen is showing its automatic "my own region" default. */
    const onHomeRegion = !!homeRegion.state
        && filters.state === homeRegion.state
        && filters.district === homeRegion.district
        && filters.block === homeRegion.block;

    const homeLabel = [homeRegion.block, homeRegion.district].filter(Boolean).join(', ')
        || homeRegion.state;

    return (
        <MemberPageShell
            title="Member Directory"
            subtitle="Find members and businesses across the association"
            width="standard"
        >
            <div className="space-y-5">
                {/* ---------- search and filters ---------- */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="search"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="Search by name or business"
                                className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm
                                           focus:outline-none focus:ring-2 focus:ring-blue-500/30
                                           focus:border-blue-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters((open) => !open)}
                            className={`shrink-0 h-11 px-3.5 rounded-xl border text-[0.8125rem] font-semibold
                                        inline-flex items-center gap-1.5 transition-colors ${
                                activeCount > 0
                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeCount > 0 ? (
                                <span className="bg-blue-600 text-white text-[0.6875rem] font-bold w-4 h-4
                                                 rounded-full flex items-center justify-center">
                                    {activeCount}
                                </span>
                            ) : null}
                        </button>
                    </div>

                    {showFilters ? (
                        /*
                         * An inline expandable panel, not a dialog. The member
                         * area's rule throughout: an in-screen popup is an
                         * expandable card, so the two clients behave the same
                         * way and neither depends on a modal host.
                         */
                        <div className="pt-1 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Select
                                    label="State"
                                    value={filters.state || ''}
                                    options={states}
                                    onChange={(value) => set({ state: value })}
                                />
                                <Select
                                    label="District"
                                    value={filters.district || ''}
                                    options={districts}
                                    onChange={(value) => set({ district: value })}
                                    disabled={!filters.state}
                                    disabledHint="Pick a state first"
                                />
                                <Select
                                    label="Block"
                                    value={filters.block || ''}
                                    options={blocks}
                                    onChange={(value) => set({ block: value })}
                                    disabled={!filters.district}
                                    disabledHint="Pick a district first"
                                />
                                <Select
                                    label="Sector"
                                    value={filters.sector || ''}
                                    options={sectors}
                                    onChange={(value) => set({ sector: value })}
                                />
                            </div>

                            {activeCount > 0 || term ? (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold
                                               text-slate-500 hover:text-slate-700"
                                >
                                    <X className="w-3.5 h-3.5" /> Clear all filters
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {/* ---------- results ---------- */}
                {loading ? (
                    <RowsSkeleton rows={4} />
                ) : error ? (
                    <EmptyState
                        icon={<Users className="w-6 h-6" />}
                        title="The directory could not be searched"
                        detail={error}
                    />
                ) : members.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-6 h-6" />}
                        title="No members found"
                        detail={
                            activeCount > 0 || term
                                ? 'Try widening the filters, or searching for a different name.'
                                : 'Members appear here once their membership is active.'
                        }
                    />
                ) : (
                    <>
                        {/*
                          * Say WHY this list is short before the member concludes
                          * the association is.
                          *
                          * The screen opens narrowed to their own block, which is
                          * the right default and a completely invisible one
                          * unless it is stated. The escape is right here rather
                          * than three clicks into the filter panel.
                          */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <p className="text-[0.8125rem] text-slate-500">
                                {total} {total === 1 ? 'member' : 'members'}
                                {activeCount > 0 || term ? ' matching' : ''}
                                {onHomeRegion && homeLabel ? (
                                    <span className="text-slate-400"> in {homeLabel}</span>
                                ) : null}
                            </p>

                            {onHomeRegion ? (
                                <button
                                    type="button"
                                    onClick={() => set({ state: '', district: '', block: '' })}
                                    className="text-[0.8125rem] font-semibold text-blue-600 hover:underline"
                                >
                                    Search the whole association
                                </button>
                            ) : homeRegion.state ? (
                                <button
                                    type="button"
                                    onClick={() => set(homeRegion)}
                                    className="text-[0.8125rem] font-semibold text-blue-600 hover:underline"
                                >
                                    Back to {homeLabel}
                                </button>
                            ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {members.map((member) => <DirectoryRow key={member.id} member={member} />)}
                        </div>

                        {pages > 1 ? (
                            <div className="flex items-center justify-between gap-3 pt-1">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-[0.8125rem]
                                               font-semibold text-slate-600 hover:bg-slate-50
                                               disabled:opacity-40 disabled:hover:bg-transparent"
                                >
                                    Previous
                                </button>

                                <span className="text-[0.8125rem] text-slate-500 tabular-nums">
                                    Page {page} of {pages}
                                </span>

                                <button
                                    type="button"
                                    disabled={page >= pages}
                                    onClick={() => setPage((current) => current + 1)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-[0.8125rem]
                                               font-semibold text-slate-600 hover:bg-slate-50
                                               disabled:opacity-40 disabled:hover:bg-transparent"
                                >
                                    Next
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </MemberPageShell>
    );
}

// ---------------------------------------------------------------- row

/**
 * One member, led by what they sell.
 *
 * The row used to print a name, a business name, an address line and a product
 * COUNT — "7 listed". Someone searching a trade directory is searching for a
 * product, and a count tells them something exists without telling them whether
 * it is the thing they need, so twenty rows meant twenty cards to open.
 *
 * The address is gone entirely: the server no longer sends `city` or the
 * companies' `location`/`area`, because a directory that says where a member's
 * premises are is the mailing list DIR-001 exists not to be. The block is kept
 * as a small chip — it is the region the search is filtered on, and a buyer
 * does need to know whether a supplier is in their own block.
 */
function DirectoryRow({ member }: { member: DirectoryEntry }) {
    const photo = resolveMediaUrl(member.profilePhoto);
    const where = [member.block, member.district].filter(Boolean).join(', ');
    const primary = member.companies[0];
    const products = member.products || [];

    return (
        <Link
            to={`/member/directory/${member.id}`}
            className="group bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] p-4 flex gap-3
                       hover:border-blue-400 hover:shadow-md transition-all"
        >
            {photo ? (
                <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-blue-50"
                />
            ) : (
                <span className="w-12 h-12 rounded-full bg-blue-600 text-white shrink-0
                                 flex items-center justify-center text-sm font-bold">
                    {(member.fullName || '?').split(' ').filter(Boolean).slice(0, 2)
                        .map((part) => part[0]).join('').toUpperCase()}
                </span>
            )}

            <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-bold text-slate-900 truncate
                              group-hover:text-blue-700 transition-colors">
                    {member.fullName}
                </p>

                {primary ? (
                    <p className="text-[0.8125rem] text-slate-600 truncate flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        {primary.businessName}
                    </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {where ? (
                        <span className="text-[0.6875rem] font-semibold text-slate-500 bg-slate-100
                                         px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {where}
                        </span>
                    ) : null}

                    {member.sectors.map((sector) => (
                        <span
                            key={sector}
                            className="text-[0.6875rem] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full"
                        >
                            {sector}
                        </span>
                    ))}
                </div>

                {/*
                  * What they sell, as pictures.
                  *
                  * Four at most — that is what the server sends — and the count
                  * of the rest as a fifth tile, so the row says both "here is
                  * what they do" and "there is more behind this card".
                  */}
                {products.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {products.map((product) => (
                            <ProductTile key={product.id} name={product.name} imageUrl={product.imageUrl} />
                        ))}
                    </div>
                ) : null}

                {member.productCount > products.length ? (
                    <p className="text-[0.6875rem] text-slate-400 mt-1.5 inline-flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        +{member.productCount - products.length} more in their catalogue
                    </p>
                ) : null}
            </div>
        </Link>
    );
}

/**
 * One product: its picture and its name, and nothing else.
 *
 * No price. A price on a search row reads as a quotation, and in this trade it
 * is negotiated and goes stale — the member's own card carries the full line.
 *
 * The name sits UNDER the image rather than over it. A caption band across a
 * photograph is unreadable against a pale product on a pale background, which
 * is most of a catalogue, and a two-line name simply covers the picture.
 */
function ProductTile({ name, imageUrl }: { name: string; imageUrl: string }) {
    const src = resolveMediaUrl(imageUrl);

    return (
        <div className="min-w-0">
            <div className="aspect-square rounded-lg bg-slate-100 overflow-hidden flex items-center
                            justify-center">
                {src ? (
                    <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <ImageOff className="w-4 h-4 text-slate-300" />
                )}
            </div>
            <p className="text-[0.625rem] text-slate-600 mt-1 leading-tight line-clamp-2" title={name}>
                {name}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------- select

function Select({
    label,
    value,
    options,
    onChange,
    disabled,
    disabledHint,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    disabled?: boolean;
    disabledHint?: string;
}) {
    return (
        <label className="block min-w-0">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {label}
            </span>
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                           disabled:bg-slate-50 disabled:text-slate-400"
            >
                <option value="">{disabled ? (disabledHint || 'Not available') : `All ${label.toLowerCase()}s`}</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </label>
    );
}
