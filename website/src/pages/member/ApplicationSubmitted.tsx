/**
 * Application Submitted — the website's version of the mobile screen.
 *
 * Ported from `frontend/src/screens/application/ApplicationSubmittedScreen.tsx`:
 * a pulsing success mark, the statement, an "Approval Progress" card carrying a
 * "Stage 1 of 3" pill and the numbered review rail, the notification notice, and
 * the two actions in mobile's order — View Application Status, then Go to
 * Dashboard.
 *
 * What changes for the web is the frame. This is a confirmation: a mark, a
 * sentence, one card and one action. It is a single line of reading whatever the
 * window is, so it keeps mobile's column and centres it rather than stretching a
 * three-stage list across a monitor because the room is there.
 *
 * The reference and the stage states are read from the application itself, not
 * from localStorage. The screen previously showed
 * `localStorage.getItem('applicationId') || 'ACTV2024001'` — a hardcoded
 * placeholder that every member saw whenever that key was missing, which is
 * always, because nothing writes it any more.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import MemberPageShell from '@/pages/member/MemberPageShell';
import {
    Bell, Loader2, Copy, Check, CalendarDays, MapPin, BadgeCheck,
    ArrowRight, LayoutDashboard, Clock, ShieldCheck, Mail,
} from 'lucide-react';
import { getUserApplication } from '@/services/applicationApi';
import { deriveApprovalFlags } from '@/services/activApi';
import { formatApplicationRef } from '@/lib/applicationRef';
import { dashboardPathFor, applicantKindLabel } from '@/features/member/memberAccess';
import useMembershipGate from '@/features/member/useMembershipGate';
import {
    PALETTE, SuccessMark, ScreenTitle, ScreenSubtitle, KitCard, KitCardHeader,
    StageRail, NoticeRow, PrimaryAction, GhostAction, type KitStage,
} from '@/features/member/memberScreenKit';

/** "5 Sept 2026". Empty for a date that is missing or will not parse. */
const formatDate = (value?: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * What the association does next, in the member's terms.
 *
 * This screen answered "it is in" and stopped, which leaves the one question a
 * person actually has at this moment — "so what happens now, and when?" — to be
 * guessed at. The three steps below are the same three the rail above shows,
 * said as process rather than as state, because a rail of pending nodes tells
 * you where a file is and nothing about what is being done to it.
 *
 * No dates are promised. The association reviews at three tiers on its own
 * schedule, and a screen that invents "within 7 days" is a screen that starts
 * lying on day eight.
 */
const WHAT_NEXT = [
    {
        icon: ShieldCheck,
        title: 'Three tiers review it',
        detail: 'Your Block admin looks at it first, then District, then State. '
            + 'Each has to approve before it moves on.',
    },
    {
        icon: Bell,
        title: 'You hear at every stage',
        detail: 'A notification arrives as each tier clears it — nothing here needs '
            + 'watching in the meantime.',
    },
    {
        icon: BadgeCheck,
        title: 'Then you pay and you are in',
        detail: 'Once the State admin approves, your membership payment unlocks and '
            + 'your profile goes live in the directory.',
    },
];

/** Mobile's three review stages, with its captions. */
const STAGE_LABELS = [
    { key: 'block', label: 'Block Admin Review' },
    { key: 'district', label: 'District Admin Review' },
    { key: 'state', label: 'State Admin Review' },
];

export default function ApplicationSubmitted() {
    const navigate = useNavigate();
    const { isPaid } = useMembershipGate();
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setApplication(await getUserApplication().catch(() => null));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const flags = deriveApprovalFlags(application);
    const appRef = formatApplicationRef(application);
    const dashboard = dashboardPathFor(isPaid === true);

    /**
     * Which stage the file is actually at.
     *
     * Mobile hardcodes "Stage 1 of 3" because it only ever reaches this screen
     * the moment an application is created. That is true here too — but a member
     * can come back to this URL later, and telling someone whose district review
     * is under way that they are at stage 1 is worse than doing the small amount
     * of work to look.
     */
    const cleared = [flags.isBlockApproved, flags.isDistrictApproved, flags.isStateApproved]
        .filter(Boolean).length;
    const currentStage = Math.min(cleared + 1, STAGE_LABELS.length);

    const stages: KitStage[] = STAGE_LABELS.map((stage, i) => {
        const done = i < cleared;
        const active = i === cleared;
        return {
            key: stage.key,
            label: stage.label,
            caption: done ? 'Approved' : active ? 'In progress' : 'Waiting',
            done,
            active,
        };
    });

    const copyRef = () => {
        if (!appRef.full) return;
        navigator.clipboard?.writeText(appRef.full)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            })
            .catch(() => { /* clipboard blocked; the tooltip still carries it */ });
    };

    if (loading) {
        return (
            <MemberPageShell title="Application Submitted" width="wide" sidebar={false} backTo={dashboard}>
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: PALETTE.primary }} />
                </div>
            </MemberPageShell>
        );
    }

    return (
        <MemberPageShell
            title="Application Submitted"
            subtitle="Your application is in and moving through review"
            width="wide"
            sidebar={false}
            backTo={dashboard}
        >
            <div className="w-full">
                <SuccessMark />

                <ScreenTitle>Application Submitted</ScreenTitle>
                <ScreenSubtitle>
                    Your membership application is in and moving through review.
                </ScreenSubtitle>

                {/*
                  THE FACTS ABOUT THIS SUBMISSION, ON ONE LINE.

                  Reference, date, member type and the region reviewing it — the
                  four things a member quotes when they contact the association,
                  and the four the status screen already prints in exactly this
                  strip. This screen showed only the reference and left the other
                  three to be found one click away, which is the wrong way round:
                  THIS is the moment someone writes them down.
                */}
                <div className="mt-8 rounded-2xl bg-white border py-4 grid grid-cols-2 lg:grid-cols-4
                                lg:divide-x"
                     style={{ borderColor: PALETTE.border }}>
                    <FactCell
                        icon={<Copy className="w-3.5 h-3.5" />}
                        label="Application Reference"
                        value={appRef.short || '—'}
                        title={appRef.full}
                        action={appRef.full ? (
                            <button
                                type="button"
                                onClick={copyRef}
                                title={`Copy full ID: ${appRef.full}`}
                                aria-label="Copy full application ID"
                                className="shrink-0 transition-colors hover:opacity-70"
                                style={{ color: copied ? PALETTE.success : PALETTE.muted }}
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        ) : null}
                    />
                    <FactCell
                        icon={<CalendarDays className="w-3.5 h-3.5" />}
                        label="Submitted"
                        value={formatDate(application?.submittedAt || application?.createdAt) || '—'}
                    />
                    <FactCell
                        icon={<BadgeCheck className="w-3.5 h-3.5" />}
                        label="Member Type"
                        value={applicantKindLabel(application) || '—'}
                        className="border-t lg:border-t-0"
                    />
                    <FactCell
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        label="Reviewed In"
                        value={[application?.block, application?.district].filter(Boolean).join(', ') || '—'}
                        title={[application?.block, application?.district, application?.state]
                            .filter(Boolean).join(', ')}
                        className="border-t lg:border-t-0"
                    />
                </div>

                {/*
                  TWO COLUMNS THAT BOTH CARRY THEIR WEIGHT.

                  The right-hand column used to hold two buttons and then roughly
                  400px of bare white down to the fold, because a 2:1 grid was
                  being used to put a pair of buttons beside a three-item list.
                  The progress rail and what-happens-next are the two halves of
                  the same answer, so they sit side by side, and the actions go
                  under the rail where a member arrives at them having read it.
                */}
                <div className="grid gap-6 lg:grid-cols-2 items-start mt-6">

                    <div className="space-y-6">
                        <KitCard>
                            <KitCardHeader
                                title="Approval Progress"
                                pill={`Stage ${currentStage} of ${STAGE_LABELS.length}`}
                            />
                            <StageRail stages={stages} />
                        </KitCard>

                        <div>
                            <PrimaryAction onClick={() => navigate('/member/application-status')}>
                                View Application Status
                            </PrimaryAction>
                            <GhostAction onClick={() => navigate(dashboard)}>
                                Go to Dashboard
                            </GhostAction>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <KitCard>
                            <KitCardHeader title="What happens next" />

                            <ol className="space-y-5 mt-1">
                                {WHAT_NEXT.map((step, i) => {
                                    const Icon = step.icon;
                                    return (
                                        <li key={step.title} className="flex gap-3.5">
                                            <span className="w-9 h-9 rounded-xl flex items-center justify-center
                                                             shrink-0"
                                                  style={{ backgroundColor: '#EEF2FF', color: PALETTE.primary }}>
                                                <Icon className="w-[1.125rem] h-[1.125rem]" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-display text-sm font-bold leading-tight"
                                                   style={{ color: PALETTE.ink }}>
                                                    <span className="tabular-nums" style={{ color: PALETTE.muted }}>
                                                        {i + 1}.{' '}
                                                    </span>
                                                    {step.title}
                                                </p>
                                                <p className="text-[0.8125rem] mt-1 leading-relaxed"
                                                   style={{ color: PALETTE.muted }}>
                                                    {step.detail}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </KitCard>

                        <NoticeRow icon={<Bell className="w-4 h-4" />}>
                            You&apos;ll be notified as each stage is completed.
                        </NoticeRow>

                        {/*
                          Where to go with a question — including the reference,
                          because "quote your application id" is the first thing
                          anyone will be asked and it is on this screen already.
                        */}
                        <NoticeRow
                            icon={<Mail className="w-4 h-4" />}
                            tone={PALETTE.muted}
                            soft="#F8FAFC"
                        >
                            Questions? Write to{' '}
                            <a
                                href={`mailto:support@activ.org.in?subject=${
                                    encodeURIComponent(`Application ${appRef.short || ''}`)}`}
                                className="font-semibold underline"
                                style={{ color: PALETTE.primary }}
                            >
                                support@activ.org.in
                            </a>
                            {appRef.short ? ` and quote ${appRef.short}.` : '.'}
                        </NoticeRow>
                    </div>
                </div>
            </div>
        </MemberPageShell>
    );
}

/**
 * One fact in the strip under the headline.
 *
 * Same shape as `StripCell` on the Application Status screen, plus an icon and
 * an optional trailing control — the two screens print the same four facts and
 * a member moving between them should not have to re-find where each one lives.
 */
const FactCell = ({ icon, label, value, title, className = '', action }: {
    icon: ReactNode;
    label: string;
    value: string;
    title?: string;
    className?: string;
    action?: ReactNode;
}) => (
    <div className={`px-4 py-1 min-w-0 ${className}`} style={{ borderColor: PALETTE.border }}>
        <div className="flex items-center gap-1.5" style={{ color: PALETTE.muted }}>
            <span className="shrink-0">{icon}</span>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.06em] truncate">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
            <p className="font-display text-sm font-bold truncate"
               style={{ color: PALETTE.ink }}
               title={title || value}>
                {value}
            </p>
            {action}
        </div>
    </div>
);
