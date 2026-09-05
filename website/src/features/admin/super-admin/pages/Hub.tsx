import { useEffect, useState } from 'react';
import {
    Menu, ChevronRight, ArrowLeft, Loader2, MapPin, Map, Globe,
    Users, Search, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { toast } from 'sonner';
import { apiFetch, getSuperOverview, approveApplication, rejectApplication, errorMessage } from '@/services/activApi';
import ApplicantDecisionRow from '@/features/admin/components/ApplicantDecisionRow';

/**
 * The Hub: every application on the platform, reached by drilling down through
 * the geography that owns it.
 *
 *     tiers  →  regions in that tier  →  that region's applications
 *
 * This replaces a flat stat panel with a "Recent Activity" table that was empty
 * on every load. Four numbers told a super admin how much work existed and
 * nothing about where it was — the drill-down is what makes a platform of 405
 * blocks navigable, because it answers "which region is stuck" rather than
 * "how many are pending".
 *
 * All three levels live in one screen, so stepping back is instant and never
 * refetches a level already loaded.
 */

type Tier = 'block' | 'district' | 'state';
type Level = 'tiers' | 'regions' | 'applications';
type Status = 'all' | 'pending' | 'approved' | 'rejected';

/**
 * The three tiers, and the colour each one owns.
 *
 * COLOUR AS AN IDENTIFIER, NOT AS DECORATION. A super admin moves between these
 * three cards constantly and the only thing distinguishing them was a word and a
 * small tinted glyph — so the eye had to read "District Level" every time rather
 * than recognising it. Giving each tier one hue, used on its header band, its
 * icon and its hover ring, makes the card recognisable before it is read, and
 * the same hue then means the same tier wherever it appears.
 *
 * Violet → district amber → state emerald reads as an outward journey: the
 * smallest patch is the coolest colour, the widest the warmest-then-settled. It
 * is arbitrary, as any such mapping is; what matters is that it is fixed.
 *
 * `head` is a tint rather than a saturated fill: the numbers underneath are the
 * content, and a solid colour band above them competes for the same attention
 * the figures need. Saturation is spent on the icon and the top rule instead.
 */
const TIERS: {
    key: Tier; title: string; plural: string; icon: typeof MapPin;
    accent: string; head: string; rule: string; ring: string;
}[] = [
    {
        key: 'block', title: 'Block', plural: 'Blocks', icon: MapPin,
        accent: 'text-violet-600 bg-violet-100',
        head: 'bg-gradient-to-r from-violet-50 to-white',
        rule: 'bg-violet-500',
        ring: 'hover:border-violet-300 hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.45)]',
    },
    {
        key: 'district', title: 'District', plural: 'Districts', icon: Map,
        accent: 'text-amber-600 bg-amber-100',
        head: 'bg-gradient-to-r from-amber-50 to-white',
        rule: 'bg-amber-500',
        ring: 'hover:border-amber-300 hover:shadow-[0_12px_32px_-8px_rgba(245,158,11,0.45)]',
    },
    {
        key: 'state', title: 'State', plural: 'States', icon: Globe,
        accent: 'text-emerald-600 bg-emerald-100',
        head: 'bg-gradient-to-r from-emerald-50 to-white',
        rule: 'bg-emerald-500',
        ring: 'hover:border-emerald-300 hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.45)]',
    },
];

const STATUSES: Status[] = ['all', 'pending', 'approved', 'rejected'];

interface Region {
    id: string;
    name: string;
    state: string;
    district: string;
    block: string;
    admins: number;
    applications: number;
    pending: number;
    approved: number;
    rejected: number;
}

export default function Hub() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [level, setLevel] = useState<Level>('tiers');
    const [tier, setTier] = useState<Tier>('block');
    const [region, setRegion] = useState<Region | null>(null);
    const [status, setStatus] = useState<Status>('all');

    const [overview, setOverview] = useState<any>(null);
    const [regions, setRegions] = useState<Region[]>([]);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');

    const [overviewFailed, setOverviewFailed] = useState(false);
    const [acting, setActing] = useState<string | null>(null);

    useEffect(() => {
        getSuperOverview()
            .then((data) => {
                setOverview(data);
                // An empty object means the request resolved with nothing usable.
                // Saying so beats rendering four confident zeros.
                setOverviewFailed(!data || !data.stats);
            })
            .catch(() => { setOverview(null); setOverviewFailed(true); });
    }, []);

    /**
     * The response nests: `data.stats` for the platform, `data.tierStats` for the
     * per-level breakdown. Reading these off the root is what made every figure
     * read zero.
     */
    const platform = overview?.stats || {};
    const tierStats: Record<string, any> = overview?.tierStats || {};

    const openTier = async (t: Tier) => {
        setTier(t);
        setLevel('regions');
        setLoading(true);
        try {
            const res = await apiFetch(`/admin/super/directory?level=${t}`);
            const data = res.ok ? (await res.json()).data : {};
            setRegions(data.regions || []);
        } catch {
            setRegions([]);
        } finally {
            setLoading(false);
        }
    };

    const openRegion = async (r: Region, nextStatus: Status = status) => {
        setRegion(r);
        setStatus(nextStatus);
        setLevel('applications');
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '50' });
            /*
              WHICH LEVEL is being browsed, so the server can place each file
              at the tier that currently holds it. Without it a file approved
              at the block stayed in the block's list — labelled
              "Pending-District" and still offering buttons for a decision
              that had already moved on.
            */
            params.set('level', tier);
            // Only the fields this tier actually names — sending an empty block
            // would filter to applications whose block is literally ''.
            if (r.state) params.set('state', r.state);
            if (r.district) params.set('district', r.district);
            if (r.block) params.set('block', r.block);
            if (nextStatus !== 'all') params.set('status', nextStatus);

            const res = await apiFetch(`/admin/super/applications?${params}`);
            const data = res.ok ? (await res.json()).data : {};
            setApplicants(data.applicants || []);
        } catch {
            setApplicants([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Approve or reject, then refresh the file list and the region counts.
     *
     * The endpoint is tier-agnostic: the server picks whichever tier the file
     * currently sits at and advances it one step, so approving a Pending-Block
     * file here moves it to Pending-District exactly as the block admin's own
     * approval would. Nothing about the workflow is decided on this screen.
     *
     * Both refreshes matter. The row changing without its region's "3 pending"
     * changing reads as a save that half worked.
     */
    const decide = async (id: string, approve: boolean, reason?: string) => {
        setActing(id);
        try {
            if (approve) {
                // The server names where the file went next; say that rather
                // than a generic "Approved" that leaves the admin guessing.
                const res = await approveApplication(id);
                toast.success(res?.message || 'Approved — sent to the next tier');
            } else {
                await rejectApplication(id, (reason || '').trim() || 'No reason given');
                toast.success('Rejected');
            }
            if (region) await openRegion(region, status);
            if (tier) await openTierCounts(tier);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not record that decision'));
        } finally {
            setActing(null);
        }
    };

    /** Refresh the region counts behind the current level, without navigating. */
    const openTierCounts = async (t: Tier) => {
        try {
            const res = await apiFetch(`/admin/super/directory?level=${t}`);
            const data = res.ok ? (await res.json()).data : {};
            setRegions(data.regions || []);
        } catch { /* the list simply keeps its previous counts */ }
    };

    const back = () => {
        if (level === 'applications') { setLevel('regions'); setRegion(null); }
        else if (level === 'regions') { setLevel('tiers'); setRegions([]); }
    };

    const visibleRegions = query.trim().length >= 2
        ? regions.filter(r => `${r.name} ${r.state} ${r.district} ${r.block}`
            .toLowerCase().includes(query.trim().toLowerCase()))
        : regions;

    /**
     * ONE LOUD TILE, AND THE REST QUIET.
     *
     * These were four saturated cards — blue, purple, teal, indigo, side by
     * side. Four things shouting is four things ignored: nothing on the row said
     * which number the Super Admin opens this page to read, and the colours
     * carried no meaning beyond being different from each other.
     *
     * Total members is the one that matters, so it keeps the solid fill and
     * everything else is white. The eye lands on it, and the three beside it are
     * still perfectly legible — they simply stop competing.
     */
    const stat = (label: string, value: number | string, primary = false) => (
        <div className={`p-6 rounded-2xl ${
            primary
                ? 'bg-blue-600 shadow-[0_10px_28px_-6px_rgba(37,99,235,0.55)]'
                : 'bg-white border border-slate-200 shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]'
        }`}>
            <p className={`text-4xl font-bold tracking-tight tabular-nums ${
                primary ? 'text-white' : 'text-slate-900'
            }`}>
                {value ?? 0}
            </p>
            <p className={`text-sm font-medium mt-1.5 ${
                primary ? 'text-blue-100' : 'text-slate-500'
            }`}>
                {label}
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex">
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-3">
                    <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                        <Menu className="w-5 h-5" />
                    </button>

                    {level !== 'tiers' && (
                        <button onClick={back} className="text-slate-500 hover:text-slate-900" aria-label="Back">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="min-w-0">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 truncate">
                            {level === 'tiers' && 'Hub'}
                            {level === 'regions' && `${TIERS.find(t => t.key === tier)?.plural}`}
                            {level === 'applications' && (region?.name || 'Applications')}
                        </h1>
                        <p className="text-sm text-slate-600 mt-0.5">
                            {level === 'tiers' && 'Browse applications by the region that owns them.'}
                            {level === 'regions' && 'Pick a region to see its applications.'}
                            {level === 'applications' && [region?.block, region?.district, region?.state]
                                .filter(Boolean).join(', ')}
                        </p>
                    </div>
                </header>

                <main className="p-6 space-y-6 max-w-[90rem]">
                    {/* ------------------------------------------------ tiers */}
                    {level === 'tiers' && (
                        <>
                            {overviewFailed && (
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200
                                                rounded-lg p-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900">
                                        The overview could not be loaded, so the figures below are not
                                        current. The drill-down still works.
                                    </p>
                                </div>
                            )}

                            {/* Platform totals, from `data.stats`. */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {stat('Total members', platform.totalMembers, true)}
                                {stat('Pending', platform.pendingApplications)}
                                {stat('Approved', platform.approvedApplications)}
                                {stat('Rejected', platform.rejectedApplications)}
                            </div>

                            {/*
                              * One card per tier, each carrying its own four figures.
                              *
                              * This is what mobile shows and what the flat row above
                              * cannot: the same application counts differently at each
                              * level, because a file approved by the block is still
                              * pending for the district. One "pending" number for the
                              * whole platform answers no question a super admin has.
                              *
                              * The card IS the drill-down, as on mobile — the numbers
                              * and the way in are the same control.
                              */}
                            <div className="grid gap-5 md:grid-cols-3">
                                {TIERS.map(({ key, title, icon: Icon, accent, head, rule, ring }) => {
                                    const t = tierStats[key] || {};
                                    const figures = [
                                        { label: 'Total members', value: t.total, tone: 'text-slate-900' },
                                        { label: 'Pending', value: t.pending, tone: 'text-amber-600' },
                                        { label: 'Approved', value: t.approved, tone: 'text-emerald-600' },
                                        { label: 'Rejected', value: t.rejected, tone: 'text-rose-600' },
                                    ];

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => openTier(key)}
                                            className={`group relative bg-white border border-slate-200 rounded-2xl
                                                        text-left overflow-hidden transition-all duration-200
                                                        shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]
                                                        hover:-translate-y-0.5 ${ring}`}
                                        >
                                            {/* The tier's colour, as a rule across the top.
                                                Two pixels of saturation identifies the card
                                                from across the page without taking any of
                                                the attention the figures need. */}
                                            <span className={`absolute inset-x-0 top-0 h-1 ${rule}`} />

                                            <div className={`flex items-center gap-3 px-5 pt-5 pb-4 ${head}`}>
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <p className="font-bold tracking-tight text-slate-900 flex-1">
                                                    {title} Level
                                                </p>
                                                {/* Slides on hover, so the card reads as a way
                                                    in rather than as a panel of numbers. */}
                                                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0
                                                                         transition-transform duration-200
                                                                         group-hover:translate-x-0.5
                                                                         group-hover:text-slate-600" />
                                            </div>

                                            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100
                                                            border-t border-slate-100">
                                                {figures.map((f) => (
                                                    <div key={f.label} className="px-5 py-4 -mt-px first:mt-0">
                                                        <p className={`text-2xl font-bold tracking-tight tabular-nums ${f.tone}`}>
                                                            {Number(f.value || 0)}
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-500 mt-1">
                                                            {f.label}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => navigate('/super-admin/admins')}
                                className="w-full bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] p-6 text-left hover:shadow-md
                                           transition-shadow flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">Staff a region</p>
                                        <p className="text-sm text-slate-500">
                                            Adding a block admin is what opens a region for registration.
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        </>
                    )}

                    {/* ---------------------------------------------- regions */}
                    {level === 'regions' && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Filter regions"
                                    className="h-11 w-full pl-9 pr-3.5 rounded-xl border border-slate-200 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                                               focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            {loading ? (
                                <Busy />
                            ) : visibleRegions.length === 0 ? (
                                <Empty text="No regions at this level yet." />
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] divide-y divide-slate-100">
                                    {visibleRegions.map(r => (
                                        <button
                                            key={r.id || r.name}
                                            onClick={() => openRegion(r)}
                                            className="w-full px-5 py-4 flex items-center justify-between
                                                       hover:bg-slate-50 text-left"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900">{r.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {[r.district, r.state].filter(Boolean).join(', ') || '—'}
                                                    {/* An unstaffed region is the one worth chasing:
                                                        its applications escalate to the tier above. */}
                                                    {r.admins === 0 && (
                                                        <span className="ml-2 text-amber-600">no admin</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                                    {r.pending} pending
                                                </span>
                                                <span className="text-xs text-slate-500">{r.applications} total</span>
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ----------------------------------------- applications */}
                    {level === 'applications' && (
                        <>
                            <div className="flex gap-2">
                                {STATUSES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => region && openRegion(region, s)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                                            status === s
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {loading ? (
                                <Busy />
                            ) : applicants.length === 0 ? (
                                <Empty text={`No ${status === 'all' ? '' : status + ' '}applications in this region.`} />
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] divide-y divide-slate-100">
                                    {/* The decision is made here, on the row the drill-down found.
                                        Sending a super admin to a different screen to approve is
                                        the point at which they lose the region they drilled into. */}
                                    {applicants.map((a: any) => (
                                        <ApplicantDecisionRow
                                            key={a._id || a.id}
                                            applicant={a}
                                            busy={acting === String(a.id || a._id)}
                                            onDecide={decide}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

const Busy = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] flex items-center justify-center gap-3 py-16 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
    </div>
);

const Empty = ({ text }: { text: string }) => (
    <p className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] text-center text-slate-500 py-16">{text}</p>
);
