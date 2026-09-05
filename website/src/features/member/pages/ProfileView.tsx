import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Menu, User, Briefcase, FileText, Building2, Edit, Camera,
    CheckCircle2, Circle, ArrowRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
    getMyProfile, getBusinessInfo, getFinancialInfo, getDeclarationInfo,
    uploadProfilePhoto, errorMessage,
} from "@/services/activApi";
import MemberSidebar from "./MemberSidebar";
import MemberTopBar from "@/features/member/components/MemberTopBar";
import { resolveMediaUrl } from "@/config/api.config";

/**
 * My Profile — everything this member has filled in, whatever they have paid.
 *
 * Two things were wrong here, and both had the same shape: the member could not
 * see their own answers.
 *
 * 1. THE PAYWALL ON A READ. Business, financial and declaration were rendered
 *    only when `paymentStatus === 'completed'`, and — worse — were not even
 *    FETCHED otherwise. So an applicant who had just spent twenty minutes
 *    filling in four forms opened My Profile and saw the first one back. There
 *    is no argument for it: this is the member's own data, read-only, and
 *    hiding it does not protect anything. The genuine gate is on Settings,
 *    where those forms are locked WHILE UNDER REVIEW so a file cannot change
 *    underneath the admin reviewing it — that is about editing, not about
 *    looking, and it stays exactly as it was.
 *
 * 2. FIELDS THAT VANISHED WHEN BLANK. `InfoItem` returned `null` for a falsy
 *    value, so a section the member had completed showed only the rows that
 *    happened to be filled in. A profile that silently drops its own labels
 *    cannot be checked against the form that produced it. Every field of a
 *    completed section is now printed, with "Not provided" where the member
 *    left it empty, which is a fact rather than an absence.
 *
 * A section the member has NOT started is not padded out with fifteen empty
 * rows — it gets one card naming the form and a link into it.
 *
 * The page also refreshes on `formSubmitted` and `profileUpdated`, not only on
 * Settings' own `profileDataUpdated`. The four registration forms dispatch the
 * first of those, so submitting one and coming back here used to show the
 * previous answer until a full page reload.
 */

interface SectionState {
    /** The member has answered this form at all. */
    filled: boolean;
    label: string;
    to: string;
}

const ProfileView = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [profileImage, setProfileImage] = useState<string>("");
    const [personalData, setPersonalData] = useState<any>(null);
    const [businessData, setBusinessData] = useState<any>(null);
    const [financialData, setFinancialData] = useState<any>(null);
    const [declarationData, setDeclarationData] = useState<any>(null);

    const loadProfileData = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        /*
         * All four, always, and none of them all-or-nothing.
         *
         * `allSettled` because three of these 404 or answer an empty default
         * for a member who has not reached that form yet, and neither is an
         * error. A rejected `Promise.all` would blank the page over a form the
         * member was never going to fill in.
         */
        const [profile, business, financial, declaration] = await Promise.allSettled([
            getMyProfile(),
            getBusinessInfo(),
            getFinancialInfo(),
            getDeclarationInfo(),
        ]);

        if (profile.status === 'fulfilled' && profile.value) {
            const me: any = profile.value;
            setPersonalData(me);

            /*
             * `profilePhoto` is the field this backend returns.
             *
             * This read `profileImage`, which no endpoint has ever sent, so the
             * avatar was blank for every member who had one. Both are accepted
             * now; the stored copy is the last resort so the picture does not
             * disappear while the profile call is in flight.
             */
            const photo = me.profilePhoto || me.profileImage || localStorage.getItem('userProfilePhoto') || '';
            if (photo) setProfileImage(resolveMediaUrl(photo) || photo);
        }

        if (business.status === 'fulfilled') setBusinessData(business.value);
        if (financial.status === 'fulfilled') setFinancialData(financial.value);
        if (declaration.status === 'fulfilled') setDeclarationData(declaration.value);

        setLoading(false);
    }, [navigate]);

    useEffect(() => {
        loadProfileData();

        /*
         * Every event that can change what belongs on this page.
         *
         * `formSubmitted` is the one the four registration forms dispatch and
         * the one this page used to ignore — which is why finishing a form and
         * navigating here showed the previous answer.
         */
        const refresh = () => { loadProfileData(); };

        window.addEventListener('profileDataUpdated', refresh);
        window.addEventListener('formSubmitted', refresh);
        window.addEventListener('profileUpdated', refresh);
        window.addEventListener('paymentCompleted', refresh);

        return () => {
            window.removeEventListener('profileDataUpdated', refresh);
            window.removeEventListener('formSubmitted', refresh);
            window.removeEventListener('profileUpdated', refresh);
            window.removeEventListener('paymentCompleted', refresh);
        };
    }, [loadProfileData]);

    // ------------------------------------------------------------ completeness

    /**
     * Has this form been answered? Asked of the DATA, not of a stored flag.
     *
     * Each endpoint answers with a filled-in default object rather than 404ing,
     * so "did they fill it in" cannot be `!!businessData` — that is true for
     * everyone. It has to be a question about the values themselves.
     */
    const hasBusiness = useMemo(() => {
        if (!businessData) return false;
        return businessData.doingBusiness === true
            || businessData.doingBusiness === false
            || !!String(businessData.organizationName || '').trim();
    }, [businessData]);

    const hasFinancial = useMemo(() => {
        if (!financialData) return false;
        const filled = ['panNumber', 'gstNumber', 'udyamNumber', 'turnoverRange']
            .some((key) => !!String(financialData[key] || '').trim());
        return filled
            || financialData.filedITR === true
            || financialData.govtSchemeBenefit === true
            || (financialData.status && financialData.status !== 'draft');
    }, [financialData]);

    const hasDeclaration = useMemo(() => {
        if (!declarationData) return false;
        return declarationData.agreeToDeclaration === true
            || Number(declarationData.sisterConcerns || 0) > 0
            || (declarationData.companyNames || []).length > 0;
    }, [declarationData]);

    /** An aspirant is never asked for a PAN, so that form is not "missing". */
    const isAspirant = businessData?.doingBusiness === false;

    const sections: SectionState[] = useMemo(() => ([
        { filled: !!personalData, label: 'Personal Details', to: '/member/profile?step=1' },
        { filled: hasBusiness, label: 'Business Details', to: '/member/profile?step=2' },
        ...(isAspirant
            ? []
            : [{ filled: hasFinancial, label: 'Financial Details', to: '/member/profile?step=3' }]),
        { filled: hasDeclaration, label: 'Declaration', to: '/member/profile?step=4' },
    ]), [personalData, hasBusiness, hasFinancial, hasDeclaration, isAspirant]);

    const doneCount = sections.filter((section) => section.filled).length;

    // ------------------------------------------------------------ photo

    /**
     * The photo goes through the upload endpoint, not the profile writer.
     *
     * This used to `PUT /members/profile` with `{ profileImage: <base64> }`.
     * That key is not one `updateMember` reads — it writes `profilePhoto` — so
     * Mongoose dropped it, the request answered 200, the toast said "updated",
     * and nothing had been saved. `uploadProfilePhoto` posts the file to the
     * endpoint built for it and returns the stored path.
     */
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size should be less than 2MB");
            return;
        }

        setUploading(true);
        try {
            const saved = await uploadProfilePhoto(file);
            const url = resolveMediaUrl(saved?.profilePhoto || '') || '';

            if (url) {
                setProfileImage(url);
                try { localStorage.setItem('userProfilePhoto', url); } catch { /* storage unavailable */ }
                // The sidebar avatar reads that key and listens for this.
                window.dispatchEvent(new CustomEvent('profilePhotoUpdated'));
            }

            toast.success("Profile photo updated");
        } catch (err) {
            toast.error(errorMessage(err, "Failed to upload photo"));
        } finally {
            setUploading(false);
            // Let the same file be chosen again after a failure.
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50">
                <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-slate-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 z-10">
                    <div className="h-[5.5rem] px-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                className="lg:hidden p-2 rounded-xl hover:bg-slate-100"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">My Profile</h1>
                                <p className="text-sm text-slate-500 mt-0.5 truncate">
                                    Everything you have submitted, in one place
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button onClick={() => navigate('/member/settings')} variant="outline" className="h-11 rounded-xl">
                                <Edit className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Edit Profile</span>
                            </Button>
                            <MemberTopBar />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-[90rem] space-y-6">
                        {/* ---------------------------------------------- header card */}
                        <Card className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg">
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="h-16 w-16 text-slate-400" />
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                                        {uploading
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Camera className="h-4 w-4" />}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="flex-1 text-center md:text-left min-w-0">
                                    {/* `name` is not a field this backend returns — it stores `fullName`,
                                        so this always fell through to the literal "User" while the
                                        card below showed the real name two inches lower. */}
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {personalData?.fullName || personalData?.name || "Member"}
                                    </h2>
                                    <p className="text-slate-500 mt-1">{personalData?.email || ""}</p>
                                    <p className="text-slate-500">{personalData?.phoneNumber || ""}</p>

                                    <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                                        {personalData?.district && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                                {personalData.district}
                                            </span>
                                        )}
                                        {personalData?.state && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                {personalData.state}
                                            </span>
                                        )}
                                        {personalData?.membershipNumber && (
                                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm tracking-wider">
                                                ID {personalData.membershipNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/*
                              * Which forms are in, and a way into the ones that are not.
                              *
                              * The member's own answer to "have I finished?", derived from
                              * the data rather than from a stored flag — a flag goes stale
                              * the moment a form is submitted and nothing rewrites it.
                              */}
                            <div className="mt-6 pt-5 border-t border-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                    <p className="text-sm font-bold text-slate-800">
                                        Application forms
                                        <span className="ml-2 text-slate-400 font-medium tabular-nums">
                                            {doneCount} of {sections.length} submitted
                                        </span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {sections.map((section) => (
                                        section.filled ? (
                                            <span
                                                key={section.label}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold
                                                           text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> {section.label}
                                            </span>
                                        ) : (
                                            <button
                                                key={section.label}
                                                type="button"
                                                onClick={() => navigate(section.to)}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold
                                                           text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full
                                                           px-3 py-1.5 transition-colors"
                                            >
                                                <Circle className="h-3.5 w-3.5" /> {section.label}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        )
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* ---------------------------------------------- personal */}
                        {personalData ? (
                            <Card className="p-6">
                                <SectionHeading icon={<User className="h-5 w-5 text-blue-600" />}>
                                    Personal Information
                                </SectionHeading>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* `fullName` is the field the backend stores; `name`
                                        was read here and is never returned. */}
                                    <InfoItem label="Full Name" value={personalData.fullName || personalData.name} />
                                    <InfoItem label="Email" value={personalData.email} />
                                    <InfoItem label="Phone Number" value={personalData.phoneNumber} />
                                    <InfoItem label="Membership Status" value={personalData.membershipStatus || 'pending'} />
                                    <InfoItem label="Membership Type" value={personalData.membershipType} />
                                    <InfoItem label="Member ID" value={personalData.membershipNumber} />
                                    <InfoItem label="State" value={personalData.state} />
                                    <InfoItem label="District" value={personalData.district} />
                                    <InfoItem label="Block" value={personalData.block} />
                                    <InfoItem label="City" value={personalData.city} />
                                    {/*
                                      * Religion and social category are no longer paid-only.
                                      *
                                      * The applicant was asked for them on the personal form
                                      * during registration; hiding their own answer back from
                                      * them until they paid served nothing.
                                      */}
                                    <InfoItem label="Religion" value={personalData.religion} />
                                    <InfoItem label="Social Category" value={personalData.socialCategory} />
                                </div>
                            </Card>
                        ) : null}

                        {/* ---------------------------------------------- business */}
                        {hasBusiness ? (
                            <Card className="p-6">
                                <SectionHeading icon={<Briefcase className="h-5 w-5 text-blue-600" />}>
                                    Business Information
                                </SectionHeading>

                                {/*
                                  * An aspirant gets one line, not ten blank ones.
                                  *
                                  * `doingBusiness === false` means the member declared they
                                  * run no business, so organisation, constitution and the
                                  * rest were never asked for. Printing them as "Not
                                  * provided" would imply they had skipped something.
                                  */}
                                {isAspirant ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <InfoItem
                                            label="Business Status"
                                            value="Aspirant (not currently doing business)"
                                        />
                                        <InfoItem label="Registration Type" value={businessData.registrationType} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoItem label="Business Status" value={yesNo(businessData.doingBusiness)} />
                                        <InfoItem label="Registration Type" value={businessData.registrationType} />
                                        <InfoItem label="Organization Name" value={businessData.organizationName} />
                                        <InfoItem label="Constitution Type" value={businessData.constitutionType} />
                                        <InfoItem label="Commencement Year" value={businessData.businessCommencementYear} />
                                        <InfoItem label="Number of Employees" value={businessData.numberOfEmployees} />
                                        <InfoItem label="Business Activities" value={asText(businessData.businessActivities)} />
                                        <InfoItem label="Business Types" value={asText(businessData.businessTypes)} />
                                        <InfoItem label="Govt Organizations" value={asText(businessData.govtOrganizations)} />
                                        <InfoItem label="Other Chamber Member?" value={yesNo(businessData.memberOfOtherChamber)} />
                                        <InfoItem label="Other Chamber Name" value={businessData.otherChamber} />
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <NotYetCard
                                icon={<Briefcase className="h-5 w-5 text-blue-600" />}
                                title="Business Information"
                                detail="Tell us whether you run a business, and its details, to complete this section."
                                to="/member/profile?step=2"
                                onGo={navigate}
                            />
                        )}

                        {/* ---------------------------------------------- financial */}
                        {/* Never shown for an aspirant: they were not asked for a PAN or
                            a turnover, so the card would carry two "No" answers and
                            nothing else. Mobile omits it on the same condition. */}
                        {isAspirant ? null : hasFinancial ? (
                            <Card className="p-6">
                                <SectionHeading icon={<Building2 className="h-5 w-5 text-blue-600" />}>
                                    Financial &amp; Compliance
                                </SectionHeading>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoItem label="PAN Number" value={financialData.panNumber} />
                                    <InfoItem label="GST Number" value={financialData.gstNumber} />
                                    <InfoItem label="UDYAM Number" value={financialData.udyamNumber} />
                                    <InfoItem label="Filed ITR?" value={yesNo(financialData.filedITR)} />
                                    <InfoItem label="Turnover Range" value={financialData.turnoverRange} />
                                    <InfoItem label="Govt Scheme Benefit?" value={yesNo(financialData.govtSchemeBenefit)} />
                                    {/* Two fields the server has always returned and this
                                        page has never printed. */}
                                    <InfoItem label="Government Schemes" value={asText(financialData.govtSchemes)} />
                                    <InfoItem label="Scheme Details" value={financialData.schemeDetails} />
                                </div>
                            </Card>
                        ) : (
                            <NotYetCard
                                icon={<Building2 className="h-5 w-5 text-blue-600" />}
                                title="Financial &amp; Compliance"
                                detail="PAN, GST, UDYAM and turnover details complete this section."
                                to="/member/profile?step=3"
                                onGo={navigate}
                            />
                        )}

                        {/* ---------------------------------------------- declaration */}
                        {hasDeclaration ? (
                            <Card className="p-6">
                                <SectionHeading icon={<FileText className="h-5 w-5 text-blue-600" />}>
                                    Declaration
                                </SectionHeading>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoItem
                                        label="Number of Sister Concerns"
                                        value={declarationData.sisterConcerns}
                                    />
                                    <InfoItem
                                        label="Company Names"
                                        value={asText(declarationData.companyNames)}
                                    />
                                    <InfoItem
                                        label="Declaration Agreed?"
                                        value={yesNo(declarationData.agreeToDeclaration)}
                                    />
                                </div>
                            </Card>
                        ) : (
                            <NotYetCard
                                icon={<FileText className="h-5 w-5 text-blue-600" />}
                                title="Declaration"
                                detail="Declare any sister concerns and accept the association's declaration."
                                to="/member/profile?step=4"
                                onGo={navigate}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

/**
 * Render a boolean as words.
 *
 * `false` is a real answer — "no, I do not run a business" — and it must reach
 * the row as "No" rather than as an absence.
 */
const yesNo = (value: unknown): string | undefined => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
};

/** Lists are stored as arrays; joined so they read as a sentence. */
const asText = (value: unknown): string | undefined => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || undefined;
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
};

const SectionHeading = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-xl font-bold text-slate-800">{children}</h3>
    </div>
);

/**
 * One field, printed whether or not it was answered.
 *
 * This used to `return null` on a falsy value, which meant a completed section
 * showed only the rows that happened to be filled in — so the member could not
 * check their profile against the form that produced it, and a field the
 * backend had silently dropped looked exactly like a field they had chosen to
 * leave blank. "Not provided" distinguishes the two.
 */
const InfoItem = ({ label, value }: { label: string; value?: string | number | null }) => {
    const empty = value === undefined || value === null || String(value).trim() === '';

    return (
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
            {empty ? (
                <p className="text-slate-400 italic">Not provided</p>
            ) : (
                <p className="text-slate-800 break-words">{String(value)}</p>
            )}
        </div>
    );
};

/**
 * A form the member has not started.
 *
 * One card and one link, rather than fifteen rows of "Not provided". The
 * distinction matters: an unanswered FIELD inside a submitted form is worth
 * showing, because the member chose to leave it out; an entire form they have
 * not reached yet is not a gap in their profile, it is the next thing to do.
 */
const NotYetCard = ({
    icon,
    title,
    detail,
    to,
    onGo,
}: {
    icon: React.ReactNode;
    title: string;
    detail: string;
    to: string;
    onGo: (to: string) => void;
}) => (
    <Card className="p-6 border-dashed">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
                <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    {icon}
                </span>
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{detail}</p>
                </div>
            </div>

            <Button
                onClick={() => onGo(to)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0"
            >
                Complete now
                <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
        </div>
    </Card>
);

export default ProfileView;
