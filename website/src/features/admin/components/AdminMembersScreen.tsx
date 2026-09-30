import { useState, useEffect, useMemo, useCallback } from "react";
<<<<<<< HEAD
import { Search, Users, BadgeCheck, CalendarClock, XCircle, Hourglass, Send, Loader2, RefreshCw } from "lucide-react";
=======
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, CheckCircle, XCircle } from "lucide-react";
>>>>>>> 8020f5d (Initial commit for website frontend)
import { toast } from "sonner";
import AdminSidebar from "./AdminSidebar";
import AdminMemberList from "./AdminMemberList";
import ProfileViewModal from "@/components/ui/profile-view-modal";
<<<<<<< HEAD
import { getApplicationProfile, memberAction, errorMessage } from "@/services/activApi";
import {
    listAdminMembers, setMemberReminders, remindMemberNow, remindAllExpired,
    type AdminMember, type AdminMembersPayload, type MembersTab,
} from "@/services/adminMembersApi";
import { type AdminTier } from "./tierConfig";
import { adminRegionLabel } from "@/lib/session";
import { AdminPageHeader, AdminStat, ADMIN_BG, ADMIN_PAGE } from './AdminUI';

/**
 * ADMIN → MEMBERS, for every tier — each inside its own region.
 *
 * ACTIVE means PAID and in date. EXPIRED means the paid period has ended — the
 * server flips it automatically — and those members are sent "renew now" on
 * the 1st and 15th of every month while their Reminders switch is on. AWAITING
 * PAYMENT is an approved application whose fee is not paid yet.
 *
 * This replaced a directory of "approved + rejected applications", where Active
 * meant approved and Inactive meant rejected — neither said whether anyone had
 * paid. The rules are `backend/src/modules/admin/adminMembers.service.js`.
 *
 * WHO MAY DO WHAT: every tier reads. The Reminders switch, "Remind now" and
 * "Remind all expired" are the State Admin's (and the Super Admin's) — the
 * server refuses anyone else. Block / delete stay State and Super only, as before.
 */

const TABS: { key: MembersTab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'expiring', label: 'Expiring soon' },
    { key: 'expired', label: 'Expired' },
    { key: 'awaiting', label: 'Awaiting payment' },
    { key: 'all', label: 'All' },
];

const TYPES = [
    { key: '', label: 'All types' },
    { key: 'business', label: 'Business' },
    { key: 'aspirant', label: 'Aspirant' },
    { key: 'student', label: 'Student' },
];

const inTab = (m: AdminMember, tab: MembersTab) => {
    if (tab === 'active') return m.status === 'active';
    if (tab === 'expiring') return m.status === 'active' && m.expiringSoon;
    if (tab === 'expired') return m.status === 'expired';
    if (tab === 'awaiting') return m.status === 'awaiting_payment';
    return true;
};

export default function AdminMembersScreen({ tier }: { tier: AdminTier }) {
    /** "Tamil Nadu", "Ariyalur district, Tamil Nadu" — the signed-in admin's own patch. */
    const regionLabel = adminRegionLabel();
    const mayManageMembers = tier === 'state' || tier === 'super';

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [data, setData] = useState<AdminMembersPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [tab, setTab] = useState<MembersTab>('active');
    const [type, setType] = useState('');
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
=======
import { getAdminDashboard, getApplicationProfile, memberAction, errorMessage } from "@/services/activApi";
import { TIERS, type AdminTier } from "./tierConfig";
import { AdminPageHeader, ADMIN_BG, ADMIN_PAGE } from './AdminUI';

/**
 * The admin Members directory, shared by every tier.
 *
 * Block, district and state each carried a ~275-line copy of this. The copies
 * had already drifted: district and state kept a fabricated
 * `index % 4 === 3` "Inactive" rule for two rounds of fixes after block had
 * been corrected to read the real `isActive` field.
 *
 * Members are the approved applicants plus the rejected ones, which the server
 * marks Inactive — the same directory mobile renders, from the same payload.
 */
/**
 * One tab, selected or not.
 *
 * The blue fill is what the shared primitive does not give us: its
 * `data-[state=active]` styling is a white background, which is invisible on a
 * white card — pressing Active filtered the list underneath and left the tabs
 * looking identical, so a working control read as broken. Declared once here so
 * the three triggers cannot drift apart.
 */
const TAB_TRIGGER =
    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-[1.25rem] font-semibold '
    + 'text-slate-600 transition-colors hover:text-slate-900 '
    + 'data-[state=active]:bg-blue-600 data-[state=active]:text-white '
    + 'data-[state=active]:shadow-sm';

export default function AdminMembersScreen({ tier }: { tier: AdminTier }) {
    const config = TIERS[tier];

    /**
     * WHO MAY BLOCK OR DELETE A MEMBER.
     *
     * The State Admin and the Super Admin. Every tier had both, and the
     * association asked for them to sit higher up — delete cascades through the
     * application, the login, the member record and the three additional forms,
     * and cannot be undone, so it went with block rather than being left behind
     * as the more dangerous half of a pair.
     *
     * A block or district admin keeps everything reading: the directory, the
     * search, the Active / Inactive tabs and the full application behind each
     * row. This only decides whether the two action icons are drawn.
     *
     * NOT A PERMISSION BOUNDARY. `POST /admin/users/:id/:action` is restricted
     * to the same two roles, and `adminService.memberAction` re-checks it —
     * this is the screen not offering what the server would refuse.
     */
    const mayManageMembers = tier === 'state' || tier === 'super';

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
>>>>>>> 8020f5d (Initial commit for website frontend)

    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
<<<<<<< HEAD

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError('');
            setData(await listAdminMembers({ tab: 'all' }));
        } catch (error) {
            setLoadError(errorMessage(error, "The members list could not be loaded"));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load, tier]);

    const rows = useMemo(() => data?.rows || [], [data]);
    /* Server answer AND the screen's tier: a district or block screen never
       draws a reminder control, whatever the response says. */
    const canManageReminders = !!data?.canManageReminders && mayManageMembers;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows
            .filter((m) => inTab(m, tab))
            .filter((m) => !type || m.kind === type)
            .filter((m) => !q || [m.name, m.email, m.phone, m.memberNumber, m.block, m.district].some((v) => String(v || '').toLowerCase().includes(q)));
    }, [rows, tab, type, query]);

    const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, rows.filter((m) => inTab(m, t.key)).length])) as Record<MembersTab, number>, [rows]);
    const summary = data?.summary;

    /* ---------------------------------------------------------- actions */

    const patchRow = (id: string, patch: Partial<AdminMember>) =>
        setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : d));

    const onToggleReminders = async (m: AdminMember, enabled: boolean) => {
        setBusyId(m.id);
        try {
            await setMemberReminders(m.id, enabled);
            patchRow(m.id, { reminders: enabled });
            toast.success(enabled
                ? `Reminders on — ${m.name || 'this member'} is reminded on the 1st and 15th once expired`
                : `Reminders off for ${m.name || 'this member'}`);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not change reminders'));
        } finally {
            setBusyId(null);
        }
    };

    const onRemindNow = async (m: AdminMember) => {
        setBusyId(m.id);
        try {
            const r = await remindMemberNow(m.id);
            patchRow(m.id, { lastReminderAt: r.at || new Date().toISOString() });
            toast.success(`Renewal reminder sent to ${m.name || 'the member'} — email, WhatsApp and their bell`);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not send the reminder'));
        } finally {
            setBusyId(null);
        }
    };

    const onRemindAll = async () => {
        if (!window.confirm(`Send a renewal reminder to every expired member in your region with reminders on? Anyone reminded in the last 24 hours is skipped.`)) return;
        setBulkBusy(true);
        try {
            const r = await remindAllExpired();
            toast.success(`Reminder sent to ${r.sent} member${r.sent === 1 ? '' : 's'}${r.skipped ? ` · ${r.skipped} skipped (reminded in the last 24 hours)` : ''}`);
            load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not send reminders'));
        } finally {
            setBulkBusy(false);
        }
    };

    const onToggleActive = async (m: AdminMember, nextActive: boolean) => {
        if (!m.applicationId) { toast.error('This member has no application on record'); return; }
        setBusyId(m.id);
        try {
            await memberAction(m.applicationId, nextActive ? 'activate' : 'suspend');
            toast.success(nextActive ? 'Member unblocked — they can sign in again' : 'Member blocked — they can no longer sign in');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not update this member'));
        } finally {
            setBusyId(null);
        }
    };

    const onDelete = async (m: AdminMember) => {
        if (!m.applicationId) { toast.error('This member has no application on record'); return; }
        const ok = window.confirm(`Permanently delete ${m.name || 'this member'}?\n\nThis removes their application, login, member record, business, financial and declaration forms. It cannot be undone.`);
        if (!ok) return;
        setBusyId(m.id);
        try {
            await memberAction(m.applicationId, 'delete');
            toast.success(`${m.name || 'Member'} deleted`);
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete this member'));
        } finally {
            setBusyId(null);
        }
    };

    const onOpen = async (m: AdminMember) => {
        if (!m.applicationId) { toast.error('This member has no application on record'); return; }
        try {
            setProfileLoading(true);
            setProfileModalOpen(true);
            const profile = await getApplicationProfile(m.applicationId);
            if (!profile) { toast.error('Application not found'); setProfileModalOpen(false); return; }
            setSelectedProfile(profile);
        } catch (error) {
            toast.error(errorMessage(error, 'Failed to load application data'));
=======
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
            try {
                setLoading(true);
                const dashboard = await getAdminDashboard();
                if (dashboard.scopeUnresolved) {
                    throw new Error(dashboard.message || "Scope unresolved");
                }

                /**
                 * The directory comes from the server already split.
                 *
                 * This used to be built from `applicants.approved` with
                 * `isActive === false` deciding the status. Every approved
                 * applicant defaults to active, so the Inactive tab could never
                 * hold anyone and looked broken. The server now returns
                 * `members`, which is the approved list plus the rejected one —
                 * a rejected applicant is Inactive — with the status resolved
                 * there so mobile and the website cannot disagree.
                 */
                const directory = dashboard.members || [];

                setMembers(directory.map((app: any) => ({
                    id: app.id || app.applicationId,
                    applicationId: app.applicationId || app.id,
                    name: app.fullName || "Unknown",
                    email: app.email || "N/A",
                    status: app.memberStatus || (app.isActive === false ? "Inactive" : "Active"),
                    inactiveReason: app.inactiveReason || "",
                })));
            } catch (error: any) {
                console.error("Error loading members:", error);
                toast.error(errorMessage(error, "Failed to load members"));
                setMembers([]);
            } finally {
                setLoading(false);
            }
    }, []);

    useEffect(() => { load(); }, [load, tier]);

    /**
     * Block or unblock a member.
     *
     * The id sent is the application id the row carries. The endpoint used to be
     * handed `memberId`, which is the auth id on any applicant who has a login —
     * a different collection from the one the lookup searched — so the call came
     * back "User not found" for a member visible on screen.
     */
    const handleToggleActive = useCallback(async (member: any, nextActive: boolean) => {
        const id = member.applicationId || member.id;
        if (!id) return;
        try {
            setBusyId(member.id || id);
            await memberAction(id, nextActive ? "activate" : "suspend");
            toast.success(nextActive
                ? 'Member unblocked — they can sign in again'
                : 'Member blocked — they can no longer sign in');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, "Could not update this member"));
        } finally {
            setBusyId(null);
        }
    }, [load]);

    /**
     * Delete a member outright.
     *
     * Confirmed first because it cannot be undone: the server removes the
     * application, the login credential, the member record and all four
     * additional forms in one pass. Deleting only the member record — which is
     * what the endpoint used to do — left an account that could still sign in.
     */
    const handleDelete = useCallback(async (member: any) => {
        const id = member.applicationId || member.id;
        if (!id) return;

        const name = member.name || "this member";
        const ok = window.confirm(
            `Permanently delete ${name}?

This removes their application, login, member record, business, financial and declaration forms. It cannot be undone.`,
        );
        if (!ok) return;

        try {
            setBusyId(member.id || id);
            await memberAction(id, "delete");
            toast.success(`${name} deleted`);
            await load();
        } catch (error) {
            toast.error(errorMessage(error, "Could not delete this member"));
        } finally {
            setBusyId(null);
        }
    }, [load]);

    const buckets = useMemo(() => ({
        all: members,
        active: members.filter((m) => m.status !== "Inactive"),
        inactive: members.filter((m) => m.status === "Inactive"),
    }), [members]);

    const counts = useMemo(() => ({
        total: buckets.all.length,
        active: buckets.active.length,
        inactive: buckets.inactive.length,
    }), [buckets]);

    const filteredMembers = useMemo(() => {
        const q = (searchQuery || "").toLowerCase();
        return (buckets[tab] || []).filter(
            (m: any) =>
                (m.name || "").toLowerCase().includes(q) ||
                (m.email || "").toLowerCase().includes(q),
        );
    }, [buckets, tab, searchQuery]);

    const handleViewProfile = async (applicationId?: string) => {
        if (!applicationId) {
            toast.error("This member has no application on record");
            return;
        }
        try {
            setProfileLoading(true);
            setProfileModalOpen(true);
            const profile = await getApplicationProfile(applicationId);
            if (!profile) {
                toast.error("Application not found");
                setProfileModalOpen(false);
                return;
            }
            setSelectedProfile(profile);
        } catch (error) {
            toast.error(errorMessage(error, "Failed to load application data"));
>>>>>>> 8020f5d (Initial commit for website frontend)
            setProfileModalOpen(false);
        } finally {
            setProfileLoading(false);
        }
    };

<<<<<<< HEAD
    const emptyHint = query || type
        ? 'Try a different search or type.'
        : tab === 'expired' ? 'Nobody’s membership has lapsed.'
            : tab === 'expiring' ? 'No membership ends in the next 30 days.'
                : tab === 'awaiting' ? 'Every approved applicant has paid.'
                    : 'Members appear here once they have paid.';

    return (
        <div className={`min-h-screen flex ${ADMIN_BG}`}>
            {/* No `tier`: the sidebar labels itself from the SIGNED-IN role, not the route. */}
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0 flex flex-col">
                <AdminPageHeader
                    title="Members"
                    subtitle={tier === 'super'
                        ? 'Paid members across the association — who is active, who has lapsed, who is still to pay'
                        : `Members in ${regionLabel || 'your region'} — who is active, who has lapsed, who is still to pay`}
                    onMenu={() => setSidebarOpen(true)}
                />

                <div className={`flex-1 overflow-y-auto ${ADMIN_PAGE}`}>
                    {data?.scopeUnresolved ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[1.0625rem] text-amber-900">
                            {(data as any).message || 'This account has no region on record, so no members can be shown. Ask the Super Admin to set its region.'}
                        </p>
                    ) : null}

                    {/* ---- the figures ---- */}
                    {loadError ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[1rem] text-rose-800">
                                <strong>Members could not be loaded.</strong> {loadError}
                            </p>
                            <button type="button" onClick={load}
                                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                                <RefreshCw className="h-4 w-4" /> Retry
                            </button>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <AdminStat primary icon={<BadgeCheck className="h-5 w-5" />} label="Active" hint={summary?.renewedThisMonth ? `Paid and in date · ${summary.renewedThisMonth} renewed this month` : 'Paid and in date'} value={summary?.active ?? 0} onClick={() => setTab('active')} />
                        <AdminStat tone="amber" icon={<CalendarClock className="h-5 w-5" />} label="Expiring soon" hint="Within 30 days" value={summary?.expiringSoon ?? 0} onClick={() => setTab('expiring')} />
                        <AdminStat tone="rose" icon={<XCircle className="h-5 w-5" />} label="Expired" hint="Not renewed" value={summary?.expired ?? 0} onClick={() => setTab('expired')} />
                        <AdminStat tone="slate" icon={<Hourglass className="h-5 w-5" />} label="Awaiting payment" hint="Approved, not paid" value={summary?.awaitingPayment ?? 0} onClick={() => setTab('awaiting')} />
                    </div>

                    <p className="flex items-start gap-2 rounded-xl bg-blue-50/60 px-3 py-2.5 text-[0.9375rem] text-slate-600 ring-1 ring-blue-100">
                        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>
                            <strong className="text-slate-800">Active</strong> = paid and in date. When the paid period ends the member moves to
                            <strong className="text-slate-800"> Expired</strong> by itself
                            {canManageReminders
                                ? <>, and — while their Reminders switch is on — is sent “your membership has expired, renew now” on the 1st and 15th of every month.</>
                                : '.'}
                        </span>
                    </p>

                    {/* ---- tabs ---- */}
                    <div role="tablist" aria-label="Members" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/60 [scrollbar-width:none]">
                        {TABS.map((t) => {
                            const on = tab === t.key;
                            return (
                                <button key={t.key} role="tab" aria-selected={on} type="button" onClick={() => setTab(t.key)}
                                    className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[1rem] font-semibold transition-colors ${
                                        on ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                                    {t.label}
                                    <span className={`rounded-full px-1.5 text-[0.8125rem] ${on ? 'bg-white/20' : 'bg-white text-slate-500'}`}>{counts[t.key] ?? 0}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ---- search, type, bulk ---- */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, Member ID or area…"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Membership type"
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-blue-500 sm:w-48">
                            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        {canManageReminders && (tab === 'expired' || tab === 'all') && counts.expired > 0 ? (
                            <button type="button" onClick={onRemindAll} disabled={bulkBusy}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-60">
                                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Remind all expired
                            </button>
                        ) : null}
                    </div>

                    <AdminMemberList
                        members={visible}
                        loading={loading}
                        busyId={busyId}
                        emptyHint={emptyHint}
                        onOpen={onOpen}
                        canManageReminders={canManageReminders}
                        onToggleReminders={onToggleReminders}
                        onRemindNow={onRemindNow}
                        onToggleActive={mayManageMembers ? onToggleActive : undefined}
                        onDelete={mayManageMembers ? onDelete : undefined}
                    />

                    {!loading && rows.length === 0 && !data?.scopeUnresolved ? (
                        <p className="flex items-center gap-2 text-[0.9375rem] text-slate-500"><Users className="h-4 w-4" /> No paid or approved members in this region yet.</p>
                    ) : null}
                </div>
            </div>

=======
    return (
        <div className={`min-h-screen flex ${ADMIN_BG}`}>
            <AdminSidebar tier={tier} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0 flex flex-col">
                {/*
                  * `AdminPageHeader`, not two hand-built bars.
                  *
                  * This screen carried its own mobile bar AND its own desktop
                  * header — the menu button, the back button and the title,
                  * written twice and kept in step by hand. The shared header is
                  * what Approvals, Manage Admins, Membership, Events, Bookings
                  * and Settings all open with, and it is the thing that decides
                  * where the title sits relative to the cards beneath it. Two
                  * implementations meant this screen's heading was a different
                  * size and a different distance from its content than every
                  * other screen in the product.
                  */}
                <AdminPageHeader
                    title="Members"
                    subtitle={
                        /*
                         * "in your region" is a lie for the SUPER admin, who is
                         * not geofenced at all — `tierConfig` gives them
                         * `regionKey: null` for exactly that reason. The three
                         * geofenced tiers see their own patch; the super admin
                         * sees the association.
                         */
                        tier === 'super'
                            ? 'Every approved and rejected applicant, across the association'
                            : `${config.label} members — approved and rejected applicants in your region`
                    }
                    onMenu={() => setSidebarOpen(true)}
                />

                {/* `ADMIN_PAGE` — the shared padding and the centred 90rem
                    column. This was `p-6` with a `max-w-[90rem]` that had no
                    `mx-auto`, so on a wide display the content hugged the left
                    and left a band of empty page on the right. */}
                <div className={`flex-1 overflow-y-auto ${ADMIN_PAGE}`}>
                        <Card className="border border-slate-200 rounded-2xl overflow-hidden
                                         shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]">
                            <CardContent className="pt-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    {/*
                                        A decorative "Filter" button used to sit beside
                                        this with no onClick. The tabs below are the
                                        filter, and mobile offers no other.
                                    */}
                                    <Input
                                        placeholder="Search members by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/*
                          THE SELECTED TAB HAS TO BE VISIBLE.

                          The shared `TabsTrigger` marks the active tab with
                          `data-[state=active]:bg-background` — white — and this
                          list sits on a near-white card. White on white: pressing
                          Active changed the list underneath and left the tabs
                          looking identical, so the control read as broken when it
                          was working perfectly.

                          Solid blue instead, the same treatment the segmented
                          control in `AdminUI` uses, on an inset slate track. Now
                          the chosen tab is the loudest thing in the row.
                        */}
                        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1 bg-slate-100 rounded-xl ring-1 ring-slate-200/60">
                                <TabsTrigger
                                    value="all"
                                    className={TAB_TRIGGER}
                                >
                                    <Users className="w-4 h-4" /> All ({counts.total})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="active"
                                    className={TAB_TRIGGER}
                                >
                                    <CheckCircle className="w-4 h-4" /> Active ({counts.active})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="inactive"
                                    className={TAB_TRIGGER}
                                >
                                    <XCircle className="w-4 h-4" /> Inactive ({counts.inactive})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <AdminMemberList
                            members={filteredMembers}
                            loading={loading}
                            busyId={busyId}
                            emptyHint={
                                searchQuery
                                    ? "Try adjusting your search"
                                    : "There are no members to display yet."
                            }
                            onOpen={(m) => handleViewProfile(m.applicationId)}
                            onToggleActive={mayManageMembers ? handleToggleActive : undefined}
                            onDelete={mayManageMembers ? handleDelete : undefined}
                        />
                </div>
            </div>

            {/* Read-only here: these members are already approved, so there is
                no decision to make. The Approvals queue passes `onReview`. */}
>>>>>>> 8020f5d (Initial commit for website frontend)
            <ProfileViewModal
                open={profileModalOpen}
                onClose={() => { setProfileModalOpen(false); setSelectedProfile(null); }}
                profile={selectedProfile}
                loading={profileLoading}
            />
        </div>
    );
}
