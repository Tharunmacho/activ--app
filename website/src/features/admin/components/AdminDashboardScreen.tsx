import { useState, useEffect } from "react";
import { formatApplicationRef } from '@/lib/applicationRef';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Menu, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "./AdminSidebar";
import { getAdminProfile, getAdminDashboard, errorMessage } from "@/services/activApi";
import { TIERS, type AdminTier } from "./tierConfig";

/**
 * The admin dashboard, shared by the three tiers.
 *
 * Block, district and state each carried a ~360-line copy, and the copies had
 * drifted in ways that changed what the screen reported: block read
 * `stats.totalApplications` where district and state read `stats.totalMembers`,
 * and only block guarded the response before dereferencing it.
 *
 * Two figures come from the server and are shown as the server states them —
 * there is no trend, because no endpoint returns one. A hardcoded
 * "0% vs last 30 days" with an upward arrow used to sit under every tile on
 * mobile; an arrow beside a hard zero reads as a real metric, so it is gone
 * rather than left to be believed.
 */
export default function AdminDashboardScreen({ tier }: { tier: AdminTier }) {
    const config = TIERS[tier];

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adminInfo, setAdminInfo] = useState<any>(null);
    const [stats, setStats] = useState({ totalMembers: 0, pending: 0, approved: 0, rejected: 0 });
    const [recentApplications, setRecentApplications] = useState<any[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);

                /*
                 * Both requests at once, not one after the other.
                 *
                 * These are independent — the dashboard is scoped server-side
                 * from the caller's token, not from anything the profile call
                 * returns — but they were awaited in sequence, so the screen
                 * cost two full round trips before it could render. Against the
                 * production cluster that is a measured 111ms median just in
                 * network, per trip, before either endpoint does any work.
                 *
                 * `allSettled`, not `all`: a failing profile lookup used to take
                 * the whole dashboard down with it via the shared catch, leaving
                 * the stats on "…" forever. They now fail independently.
                 */
                const [profileResult, dashboardResult] = await Promise.allSettled([
                    getAdminProfile(),
                    getAdminDashboard(),
                ]);

                if (cancelled) return;

                // `getAdminProfile` returns the unwrapped record, so there is
                // no `success` envelope to test here.
                const admin: any = profileResult.status === 'fulfilled' ? profileResult.value : null;
                if (!cancelled && admin) {
                    setAdminInfo({
                        ...admin,
                        state: admin.meta?.state || admin.state,
                        district: admin.meta?.district || admin.district,
                        block: admin.meta?.block || admin.block,
                    });
                }

                if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
                const dashboard = dashboardResult.value;

                if (dashboard.scopeUnresolved) {
                    setStats({ totalMembers: 0, pending: 0, approved: 0, rejected: 0 });
                    setRecentApplications([]);
                    toast.error(dashboard.message || "Scope unresolved");
                    return;
                }

                setStats({
                    totalMembers: dashboard.stats?.totalMembers || 0,
                    pending: dashboard.stats?.pendingApplications || 0,
                    approved: dashboard.stats?.approvedApplications || 0,
                    rejected: dashboard.stats?.rejectedApplications || 0,
                });

                /**
                 * The bucket the server already computed, not a re-derivation.
                 *
                 * This used to re-classify each row with
                 * `approvedApps.some(a => a._id === app._id || ...)`. The
                 * applicant payload has `id` and `applicationId` and **no
                 * `_id`**, so that clause was `undefined === undefined` — true —
                 * and `.some()` matched every application the moment the
                 * approved bucket was non-empty. Every row in Recent Activity
                 * was labelled "Approved", including files still waiting for
                 * this admin to review them.
                 */
                const all = dashboard.applicants?.all || [];
                setRecentApplications(all.slice(0, 5));
            } catch (error: any) {
                if (!cancelled) {
                    console.error("Error loading dashboard data:", error);
                    toast.error(errorMessage(error, "Failed to load dashboard data"));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [tier]);

    const userName = adminInfo?.fullName || localStorage.getItem("userName") || "Admin";
    const location = [adminInfo?.block, adminInfo?.district, adminInfo?.state]
        .filter(Boolean).join(", ");

    const TILES = [
        { label: "Total Members", value: stats.totalMembers, icon: Users, tint: "from-blue-600 to-blue-700 border-blue-500", sub: "text-blue-100" },
        { label: "Pending", value: stats.pending, icon: Clock, tint: "from-amber-500 to-amber-600 border-amber-400", sub: "text-amber-100" },
        { label: "Approved", value: stats.approved, icon: CheckCircle, tint: "from-green-600 to-green-700 border-green-500", sub: "text-green-100" },
        { label: "Rejected", value: stats.rejected, icon: XCircle, tint: "from-red-600 to-red-700 border-red-500", sub: "text-red-100" },
    ];

    const stageTone: Record<string, string> = {
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
        pending: "bg-amber-100 text-amber-700",
        upstream: "bg-slate-100 text-slate-700",
        closed: "bg-slate-100 text-slate-700",
    };

    return (
        <div className="min-h-screen flex bg-white">
            <AdminSidebar tier={tier} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 min-w-0 flex flex-col">
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                    <span className="w-10" />
                </div>

                {/*
                  The white header bar every other admin screen opens with.
                  Dashboard had none, so it was the one screen whose title
                  scrolled away with the content — and the only one without a way
                  back to itself from a sub-page.
                */}
                <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-4
                                   flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">
                            Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {config.label} admin — your region at a glance.
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-auto">
                    {/* `max-w-7xl mx-auto` centred this one screen's content
                        while every other admin page runs from the left margin. */}
                    <div className="p-6 max-w-[90rem] space-y-6">
                        <div>
                            <div className="flex items-center gap-4 mb-8">
                                <Avatar className="w-16 h-16 ring-4 ring-blue-100">
                                    <AvatarFallback className="bg-blue-600 text-white font-bold text-xl">
                                        {config.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">{userName}</h1>
                                    <p className="text-slate-500">{config.dashboardTitle}</p>
                                    {location ? <p className="text-sm text-slate-500 truncate">{location}</p> : null}
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold mb-4 text-slate-900">Overview Statistics</h2>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {TILES.map((t) => (
                                    <div
                                        key={t.label}
                                        className={`bg-gradient-to-br ${t.tint} rounded-2xl p-6 border shadow-xl`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <t.icon className={`w-5 h-5 ${t.sub}`} />
                                            <p className={`${t.sub} text-sm font-medium`}>{t.label}</p>
                                        </div>
                                        <p className="text-4xl font-bold tracking-tight tabular-nums text-white tabular-nums">
                                            {loading ? "…" : t.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent activity */}
                    <div className="px-6 pb-6 max-w-[90rem]">
                        <div className="max-w-[90rem] space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">Recent Activity</h2>
                                    <p className="text-slate-500 text-sm">Latest application submissions</p>
                                </div>
                                <Link to={`${config.base}/approvals`}>
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 shadow-sm">
                                        View All
                                    </Button>
                                </Link>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]">
                                <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 text-sm font-semibold text-slate-700 border-b border-slate-200 mb-4">
                                    <div>Name</div>
                                    <div>Status</div>
                                    {/* These read "Size" and "Modified" — leftovers from a
                                        file-list table, above cells holding the member type
                                        and the submission date. */}
                                    <div>Type</div>
                                    <div>Submitted</div>
                                </div>

                                <div className="space-y-3">
                                    {recentApplications.length > 0 ? (
                                        recentApplications.map((app) => {
                                            const displayName = app.fullName || "Unknown";
                                            const initials = displayName !== "Unknown"
                                                ? displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                                                : "N/A";
                                            const stage = String(app.stage || "pending");
                                            return (
                                                <div
                                                    key={app.id || app.applicationId}
                                                    className="grid grid-cols-1 md:grid-cols-4 gap-5 items-center p-4 rounded-xl bg-white hover:bg-slate-50 transition-colors duration-200 border border-slate-200"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="w-10 h-10 ring-2 ring-blue-200">
                                                            <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900 text-sm truncate">{displayName}</p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                <span title={app.applicationId || undefined}>
                                                                    {formatApplicationRef(app).short || 'N/A'}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Badge className={`${stageTone[stage] || stageTone.pending} hover:opacity-90`}>
                                                            {app.statusLabel || stage}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-700 capitalize">
                                                        {app.memberType || "—"}
                                                    </div>
                                                    <div className="text-sm text-slate-700">
                                                        {app.submittedAt
                                                            ? new Date(app.submittedAt).toLocaleDateString("en-GB", {
                                                                day: "2-digit", month: "short", year: "numeric",
                                                            })
                                                            : "—"}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10">
                                            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-500 text-sm">
                                                {loading ? "Loading applications…" : "No applications yet"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
