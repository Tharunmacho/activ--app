import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import AdminSidebar from "./AdminSidebar";
import ApprovalQueue, { type ApplicantBuckets, type BucketKey } from "@/components/ApprovalQueue";
import ProfileViewModal from "@/components/ui/profile-view-modal";
import {
    apiFetch, dashboardPathForRole, approveApplication, rejectApplication,
    getApplicationProfile, errorMessage, type Applicant,
} from "@/services/activApi";
import { TIERS, type AdminTier } from "./tierConfig";
import ApplicantRegionFilter, {
    EMPTY_SELECTION, matchesSelection, type RegionSelection,
} from "./ApplicantRegionFilter";

/**
 * The admin approvals queue, shared by every tier.
 *
 * Three near-identical copies of this existed (~380 lines each), and each
 * carried a `handleApprove`/`handleReject` pair that was never wired to
 * anything — dead code that still posted a hardcoded `'Application rejected'`
 * reason. Those are gone; `handleReview` below is the only path.
 *
 * The three-tier workflow is enforced by the server, and this screen renders
 * exactly what it decides. `classifyForLevel` returns four buckets plus two
 * stages this tier can see but not act on — `upstream` (still with an earlier
 * tier) and `closed` (rejected by a different one) — and `ApprovalQueue` only
 * offers Approve/Reject on a `pending` file. Deriving buckets on the client
 * loses both stages and mis-files anything whose status spelling it cannot
 * match, which is why the server's classification is used verbatim.
 */
export default function AdminApprovalsScreen({ tier }: { tier: AdminTier }) {
    const navigate = useNavigate();
    const config = TIERS[tier];

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [tab, setTab] = useState<BucketKey>("all");

    const [serverBuckets, setServerBuckets] = useState<ApplicantBuckets>({
        pending: [], approved: [], rejected: [], all: [],
    });

    /**
     * Which block, or which district's blocks, the queue is narrowed to.
     *
     * A view over what the server already sent — see `ApplicantRegionFilter`.
     * Nothing here is sent back to the API, so a district admin cannot widen
     * their geofence with it and the mobile app is unaffected.
     */
    const [region, setRegion] = useState<RegionSelection>({ ...EMPTY_SELECTION });

    /**
     * The filter applied to ALL FOUR buckets, not just the visible one.
     *
     * The pills print their own counts, and filtering only the rendered list
     * would leave "Pending (12)" above three cards — which reads as a screen
     * that has lost nine applicants rather than as a filter doing its job.
     */
    const buckets = useMemo(() => {
        const active = !!(region.state || region.district || region.block);
        if (!active) return serverBuckets;

        const narrow = (rows: Applicant[]) =>
            (rows || []).filter((row) => matchesSelection(row, region));

        return {
            pending: narrow(serverBuckets.pending),
            approved: narrow(serverBuckets.approved),
            rejected: narrow(serverBuckets.rejected),
            all: narrow(serverBuckets.all),
        };
    }, [serverBuckets, region]);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailProfile, setDetailProfile] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailApplicant, setDetailApplicant] = useState<Applicant | null>(null);

    const load = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Please login again");
                return;
            }

            const response = await apiFetch(dashboardPathForRole());
            if (!response.ok) throw new Error("Failed to fetch applications");

            const data = await response.json();
            const buckets = data.data?.applicants || {};
            setServerBuckets({
                pending: buckets.pending || [],
                approved: buckets.approved || [],
                rejected: buckets.rejected || [],
                all: buckets.all || [],
            });
        } catch (error) {
            console.error("Error loading applications:", error);
            toast.error(errorMessage(error, "Failed to load applications"));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    /**
     * Approve or reject, then refetch.
     *
     * The reason is whatever the admin typed. It used to be the constant string
     * "Application rejected", sent as `remarks` — a field the schema does not
     * have — so every applicant received the same non-explanation, and even
     * that was dropped by Mongoose before it reached the database.
     */
    const handleReview = useCallback(async (
        applicant: Applicant,
        action: "approve" | "reject",
        reason?: string,
    ) => {
        try {
            if (action === "approve") {
                await approveApplication(applicant.id);
                toast.success("Application approved");
            } else {
                await rejectApplication(applicant.id, (reason || "").trim() || "No reason given");
                toast.success("Application rejected");
            }
            await load();
        } catch (error) {
            toast.error(errorMessage(error, `Could not ${action} the application`));
        }
    }, [load]);

    /**
     * The applicant detail view, opened from the queue.
     *
     * `ApprovalQueue` has always accepted an `onPressApplicant` callback and no
     * page passed one, so clicking a card on the website did nothing — while
     * the same tap on mobile opens the full four-form detail. The decision
     * buttons are handed through too, so an admin can read the whole
     * application and act on it without going back to the card.
     */
    const openDetail = useCallback(async (applicant: Applicant) => {
        setDetailApplicant(applicant);
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const profile = await getApplicationProfile(applicant.id);
            // The queue row carries the computed stage and label; the fetch
            // carries the four forms. The view needs both.
            setDetailProfile({
                ...(profile || {}),
                stage: applicant.stage,
                statusLabel: applicant.statusLabel,
                rejectionReason: applicant.rejectionReason || (profile as any)?.rejectionReason || "",
            });
        } catch (error) {
            toast.error(errorMessage(error, "Failed to load application data"));
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    }, []);

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
                    <h1 className="text-xl font-bold text-slate-900">Approvals</h1>
                    <span className="w-10" />
                </div>

                {/*
                  THE HEADER IS A WHITE BAR, LIKE EVERY OTHER ADMIN SCREEN.

                  It was a heading inside the scrolling content, sitting straight
                  on the page tint — so Approvals opened without the white band
                  that Settings, Members and Manage Admins all open with, and
                  scrolled the title away with the list. Outside the scroll area
                  it stays put and the four screens introduce themselves the same
                  way.

                  Back, because the rail is hidden on a phone and the browser's
                  own Back retraces whatever brought you here — which after an
                  approval is this same page.
                */}
                <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-4
                                   flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(config.base + '/dashboard')}
                        aria-label="Back to dashboard"
                        className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center
                                   text-slate-500 transition-colors hover:bg-slate-100
                                   hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">
                            Approvals
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {config.label} applications — approve or reject what has reached your tier.
                        </p>
                    </div>
                </header>

                {/*
                  Left-aligned at the shared width. `max-w-7xl mx-auto` centred
                  this one screen's content while the rest of the admin area runs
                  from the left margin.
                */}
                <div className="flex-1 p-6 overflow-auto">
                    <div className="w-full max-w-[90rem] space-y-6">
                        {/*
                          Above the pills, because it narrows what they count.
                          Options are built from the `all` bucket — the complete
                          set this tier can see — so choosing one does not delete
                          the choices beside it.
                        */}
                        <ApplicantRegionFilter
                            applicants={serverBuckets.all}
                            levels={config.approvalFilters}
                            selection={region}
                            onChange={setRegion}
                        />

                        <ApprovalQueue
                            buckets={buckets}
                            level={config.queueLevel}
                            activeFilter={tab}
                            onFilterChange={(f) => setTab(f)}
                            onReview={handleReview}
                            onPressApplicant={openDetail}
                        />
                    </div>
                </div>
            </div>

            <ProfileViewModal
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setDetailProfile(null); setDetailApplicant(null); }}
                profile={detailProfile}
                loading={detailLoading}
                onReview={async (action, reason) => {
                    if (detailApplicant) await handleReview(detailApplicant, action, reason);
                }}
            />
            <Toaster />
        </div>
    );
}
