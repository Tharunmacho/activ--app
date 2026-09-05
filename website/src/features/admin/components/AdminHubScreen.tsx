import { useEffect, useState } from 'react';
import {
    Menu, ChevronRight, ArrowLeft, Loader2, MapPin, Map, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from './AdminSidebar';
import { TIERS, type AdminTier } from './tierConfig';
import ApplicantDecisionRow from './ApplicantDecisionRow';
import {
    apiFetch, approveApplication, rejectApplication, errorMessage,
} from '@/services/activApi';

/**
 * The Hub, for a tier that runs a patch: their regions, and the work inside them.
 *
 *     levels in my patch  →  the regions at that level  →  that region's files
 *
 * The same shape as the super admin's Hub and for the same reason — a district
 * admin with twelve blocks needs to know WHICH block is stuck, and a list of
 * applications sorted by date does not answer that. The difference is only how
 * far it reaches: a district admin sees their blocks, a state admin their
 * districts and every block within them. The narrowing is the server's, not
 * this screen's: `/admin/team/*` forces the acting token's region, so a crafted
 * request cannot widen what is shown here.
 *
 * APPROVING HAPPENS HERE. The drill-down exists to find the file that needs a
 * decision, and sending someone to a different screen to make it is the point at
 * which they lose the region they had drilled into. The buttons call the same
 * tier-agnostic endpoints the Approvals screen uses, so the three-tier workflow
 * — and its geofence — is enforced in exactly one place.
 */

type Level = 'levels' | 'regions' | 'applications';
type RegionLevel = 'district' | 'block';
type Status = 'all' | 'pending' | 'approved' | 'rejected';

const STATUSES: Status[] = ['all', 'pending', 'approved', 'rejected'];

/**
 * The levels a tier looks down at, and the colour each one owns.
 *
 * THE SAME HUES THE SUPER ADMIN'S HUB USES — violet for block, amber for
 * district. A district admin and the super admin are looking at the same two
 * levels from different heights, and the level should be the same colour on
 * both screens or the colour means nothing.
 *
 * `head` is a tint rather than a fill: the six figures underneath are the
 * content, and a solid band above them competes for the attention they need.
 * Saturation goes on the icon and the top rule.
 */
const LEVEL_CARDS: Record<RegionLevel, {
    title: string; plural: string; icon: typeof MapPin;
    accent: string; head: string; rule: string; ring: string;
}> = {
    district: {
        title: 'District', plural: 'Districts', icon: Map,
        accent: 'text-amber-600 bg-amber-100',
        head: 'bg-gradient-to-r from-amber-50 to-white',
        rule: 'bg-amber-500',
        ring: 'hover:border-amber-300 hover:shadow-[0_12px_32px_-8px_rgba(245,158,11,0.45)]',
    },
    block: {
        title: 'Block', plural: 'Blocks', icon: MapPin,
        accent: 'text-violet-600 bg-violet-100',
        head: 'bg-gradient-to-r from-violet-50 to-white',
        rule: 'bg-violet-500',
        ring: 'hover:border-violet-300 hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.45)]',
    },
};

/**
 * What each tier oversees.
 *
 * A district admin has one level beneath them and a state admin two. A block
 * admin has none, which is why this screen is not in their rail at all.
 */
const LEVELS_FOR: Record<string, RegionLevel[]> = {
    state: ['district', 'block'],
    district: ['block'],
};

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

export default function AdminHubScreen({ tier }: { tier: AdminTier }) {
    const config = TIERS[tier];
    const levels = LEVELS_FOR[tier] || ['block'];

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [level, setLevel] = useState<Level>('levels');
    const [regionLevel, setRegionLevel] = useState<RegionLevel>(levels[0]);
    const [region, setRegion] = useState<Region | null>(null);
    const [status, setStatus] = useState<Status>('all');

    const [summary, setSummary] = useState<Record<RegionLevel, Region[]>>({ district: [], block: [] });
    const [regions, setRegions] = useState<Region[]>([]);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [acting, setActing] = useState<string | null>(null);

    const fetchRegions = async (which: RegionLevel): Promise<Region[]> => {
        try {
            const res = await apiFetch(`/admin/team/directory?level=${which}`);
            const data = res.ok ? (await res.json()).data : {};
            return data.regions || [];
        } catch {
            return [];
        }
    };

    /**
     * Every level this tier oversees, up front.
     *
     * The landing cards carry real counts rather than a label and an arrow —
     * "which of my two levels has work waiting" is the first question, and a
     * card that only says "Blocks" makes it necessary to open both to find out.
     */
    const loadSummary = async () => {
        setLoading(true);
        const pairs = await Promise.all(levels.map(async (l) => [l, await fetchRegions(l)] as const));
        const next = { district: [] as Region[], block: [] as Region[] };
        pairs.forEach(([l, rows]) => { next[l] = rows; });
        setSummary(next);
        setLoading(false);
    };

    useEffect(() => { loadSummary(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tier]);

    const openLevel = (which: RegionLevel) => {
        setRegionLevel(which);
        setRegions(summary[which] || []);
        setQuery('');
        setLevel('regions');
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
            params.set('level', regionLevel);
            // Only the fields this region actually names — sending an empty
            // block would filter to applications whose block is literally ''.
            if (r.state) params.set('state', r.state);
            if (r.district) params.set('district', r.district);
            if (r.block) params.set('block', r.block);
            if (nextStatus !== 'all') params.set('status', nextStatus);

            const res = await apiFetch(`/admin/team/applications?${params}`);
            const data = res.ok ? (await res.json()).data : {};
            setApplicants(data.applicants || []);
        } catch {
            setApplicants([]);
        } finally {
            setLoading(false);
        }
    };

    const back = () => {
        if (level === 'applications') { setLevel('regions'); setRegion(null); }
        else if (level === 'regions') { setLevel('levels'); setRegions([]); }
    };

    /**
     * Approve or reject, then refresh both the file list and the counts.
     *
     * The counts matter as much as the row: a district admin clearing a block's
     * queue wants the "3 pending" beside that block to become "2", and a screen
     * that updates one and not the other reads as a failed save.
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
            await loadSummary();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not record that decision'));
        } finally {
            setActing(null);
        }
    };

    const visibleRegions = query.trim().length >= 2
        ? regions.filter(r => `${r.name} ${r.state} ${r.district} ${r.block}`
            .toLowerCase().includes(query.trim().toLowerCase()))
        : regions;

    /** The tier's own totals, summed from the level it owns directly. */
    /**
     * Everything the level card reports, summed from the regions themselves.
     *
     * `admins` and `unstaffed` are counted here for one reason: a REGION and an
     * ADMIN are not the same thing, and a card showing only "7 Blocks" invites
     * the reading that there are seven block admins. Delete one and the block
     * remains — the directory derives regions from the applications and the
     * staffing together, so a block nobody staffs still exists and still holds
     * files. Showing both numbers makes that legible instead of contradictory,
     * and `unstaffed` names the regions whose files escalate to this tier.
     */
    const totals = (rows: Region[]) => rows.reduce((acc, r) => ({
        applications: acc.applications + Number(r.applications || 0),
        pending: acc.pending + Number(r.pending || 0),
        approved: acc.approved + Number(r.approved || 0),
        rejected: acc.rejected + Number(r.rejected || 0),
        admins: acc.admins + Number(r.admins || 0),
        unstaffed: acc.unstaffed + (Number(r.admins || 0) === 0 ? 1 : 0),
    }), { applications: 0, pending: 0, approved: 0, rejected: 0, admins: 0, unstaffed: 0 });

    const headline = totals(summary[levels[0]] || []);

    /**
     * ONE LOUD TILE, AND THE REST QUIET.
     *
     * Four saturated cards side by side is four things shouting, which is four
     * things ignored — and the colours carried no meaning beyond being different
     * from one another. The headline figure keeps the solid fill; the rest are
     * white and stop competing with it. Same treatment as the super admin's Hub.
     */
    const stat = (label: string, value: number, primary = false) => (
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
            <AdminSidebar tier={tier} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-3">
                    <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                        <Menu className="w-5 h-5" />
                    </button>

                    {level !== 'levels' && (
                        <button onClick={back} className="text-slate-500 hover:text-slate-900" aria-label="Back">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="min-w-0">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 truncate">
                            {level === 'levels' && 'Hub'}
                            {level === 'regions' && LEVEL_CARDS[regionLevel].plural}
                            {level === 'applications' && (region?.name || 'Applications')}
                        </h1>
                        <p className="text-sm text-slate-600 mt-0.5">
                            {level === 'levels' && `Every application in your ${config.label.toLowerCase()}, by the region that owns it.`}
                            {level === 'regions' && 'Pick a region to see its applications.'}
                            {level === 'applications' && ([region?.block, region?.district, region?.state]
                                .filter(Boolean).join(', ') || '')}
                        </p>
                    </div>
                </header>

                <main className="p-6 space-y-6 max-w-[90rem]">
                    {/* ------------------------------------------------ levels */}
                    {level === 'levels' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {stat('Applications', headline.applications, true)}
                                {stat('Pending', headline.pending)}
                                {stat('Approved', headline.approved)}
                                {stat('Rejected', headline.rejected)}
                            </div>

                            {loading ? <Busy /> : (
                                <div className={`grid gap-4 ${levels.length > 1 ? 'md:grid-cols-2' : ''}`}>
                                    {levels.map((which) => {
                                        const card = LEVEL_CARDS[which];
                                        const Icon = card.icon;
                                        const rows = summary[which] || [];
                                        const t = totals(rows);
                                        /*
                                          Six figures, in two rows of three:
                                          the regions and who staffs them, then
                                          the work sitting in them. `Admins` is
                                          the number the Admins screen shows, so
                                          the two pages can be read against each
                                          other without either looking wrong.
                                        */
                                        const figures = [
                                            { label: card.plural, value: rows.length, tone: 'text-slate-900' },
                                            { label: 'Admins', value: t.admins, tone: 'text-blue-600' },
                                            { label: 'Unstaffed', value: t.unstaffed, tone: t.unstaffed ? 'text-amber-600' : 'text-slate-400' },
                                            { label: 'Pending', value: t.pending, tone: 'text-amber-600' },
                                            { label: 'Approved', value: t.approved, tone: 'text-emerald-600' },
                                            { label: 'Rejected', value: t.rejected, tone: 'text-rose-600' },
                                        ];

                                        return (
                                            <button
                                                key={which}
                                                onClick={() => openLevel(which)}
                                                className={`group relative bg-white border border-slate-200
                                                            rounded-2xl text-left overflow-hidden
                                                            transition-all duration-200 hover:-translate-y-0.5
                                                            shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]
                                                            ${card.ring}`}
                                            >
                                                {/* The level's colour, as a rule across the top —
                                                    two pixels of saturation that identify the card
                                                    from across the page. */}
                                                <span className={`absolute inset-x-0 top-0 h-1 ${card.rule}`} />

                                                <div className={`flex items-center gap-3 px-5 pt-5 pb-4 ${card.head}`}>
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.accent}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <p className="font-bold tracking-tight text-slate-900 flex-1">
                                                        {card.title} Level
                                                    </p>
                                                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0
                                                                             transition-transform duration-200
                                                                             group-hover:translate-x-0.5
                                                                             group-hover:text-slate-600" />
                                                </div>

                                                {/* Three across, two rows: the borders come from
                                                    the cell's position in the grid, so the last
                                                    column and the last row carry none. */}
                                                <div className="grid grid-cols-3 divide-x divide-y divide-slate-100 border-t border-slate-100">
                                                    {figures.map((f, i) => (
                                                        <div
                                                            key={f.label}
                                                            className="px-5 py-4 -mt-px first:mt-0"
                                                        >
                                                            <p className={`text-2xl font-bold tracking-tight tabular-nums ${f.tone}`}>
                                                                {Number(f.value || 0)}
                                                            </p>
                                                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{f.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ----------------------------------------------- regions */}
                    {level === 'regions' && (
                        <>
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Filter regions"
                                    className="h-11 w-full pl-9 pr-3.5 rounded-xl border border-slate-200 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                                               focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            {loading ? <Busy /> : visibleRegions.length === 0 ? (
                                <Empty text="No regions at this level yet." />
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] divide-y divide-slate-100">
                                    {visibleRegions.map(r => (
                                        <button
                                            key={r.id || r.name}
                                            onClick={() => openRegion(r, 'all')}
                                            className="w-full px-5 py-4 flex items-center justify-between
                                                       hover:bg-slate-50 text-left gap-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900">{r.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {[r.district, r.state].filter(Boolean).join(', ') || '—'}
                                                    {/*
                                                      Staffing, on every row rather than only when it
                                                      is missing. "1 admin" against seven rows is what
                                                      makes the card's Blocks and Admins figures add
                                                      up on screen — and an unstaffed region is the one
                                                      worth chasing, because its files escalate here.
                                                    */}
                                                    {r.admins === 0
                                                        ? <span className="ml-2 text-amber-600 font-semibold">no admin</span>
                                                        : <span className="ml-2">· {r.admins} admin{r.admins === 1 ? '' : 's'}</span>}
                                                </p>
                                            </div>

                                            {/* All three counts, not just pending: "approved 40,
                                                rejected 1" and "approved 2, rejected 39" are very
                                                different blocks with the same pending figure. */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Pill tone="amber">{r.pending} pending</Pill>
                                                <Pill tone="green">{r.approved} approved</Pill>
                                                <Pill tone="red">{r.rejected} rejected</Pill>
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ------------------------------------------ applications */}
                    {level === 'applications' && (
                        <>
                            <div className="flex flex-wrap gap-2">
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

                            {loading ? <Busy /> : applicants.length === 0 ? (
                                <Empty text={`No ${status === 'all' ? '' : status + ' '}applications in this region.`} />
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] divide-y divide-slate-100">
                                    {/* The same row the super admin's Hub uses, and the same
                                        server answer behind it: `canAct` already accounts for an
                                        unstaffed block escalating its files to this tier. */}
                                    {applicants.map((a: any) => (
                                        <ApplicantDecisionRow
                                            key={a.id || a._id}
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

const Pill = ({ tone, children }: { tone: 'amber' | 'green' | 'red'; children: React.ReactNode }) => {
    const tones = {
        amber: 'text-amber-700 bg-amber-50',
        green: 'text-green-700 bg-green-50',
        red: 'text-red-700 bg-red-50',
    }[tone];
    return <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${tones}`}>{children}</span>;
};

const Busy = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] flex items-center justify-center gap-3 py-16 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
    </div>
);

const Empty = ({ text }: { text: string }) => (
    <p className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] text-center text-slate-500 py-16">{text}</p>
);
