import { useEffect, useMemo, useState } from 'react';
import {
    MessageSquare, Users, CalendarDays, Megaphone, FileBadge, Handshake, Inbox,
} from 'lucide-react';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { EmptyState, MembershipGate, GateBenefit } from '@/features/member/components/MemberUI';
import { useProfile } from '@/contexts/ProfileContext';
import { getMyApplication } from '@/services/activApi';
import useMembershipGate from '@/features/member/useMembershipGate';
import {
    deriveMemberAccess, membershipCta, MEMBERS_ONLY_COPY,
} from '@/features/member/memberAccess';

/**
 * Messages — the one member feature an applicant cannot use, and the reason.
 *
 * Every other thing the association publishes is open before payment: the
 * events programme, the updates feed, the member directory. Member-to-member
 * messaging is what an active membership adds, and this screen is where that is
 * said out loud.
 *
 * It is a screen rather than a padlocked rail entry that goes nowhere, and that
 * choice is the point. A greyed-out row teaches an applicant that the product
 * is broken; a row that opens, names the feature and carries the one button
 * that resolves it is the offer the association actually wants to make. The
 * button comes from `membershipCta`, so it names the step this account is on
 * rather than pointing everyone at a payment screen that would refuse most of
 * them.
 *
 * For a member whose membership IS active this is an inbox with nothing in it
 * yet — stated plainly, because the messaging transport is not built. Showing
 * them the applicant's upgrade card would be worse than useless: it would ask
 * someone who has already paid to pay.
 */
export default function MemberMessages() {
    const { profileCompletion } = useProfile();
    const { isPaid, isResolved } = useMembershipGate();
    const [application, setApplication] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        getMyApplication()
            .then((app) => { if (!cancelled) setApplication(app); })
            .catch(() => { /* an applicant with no application is the normal case */ });
        return () => { cancelled = true; };
    }, []);

    const access = useMemo(
        () => deriveMemberAccess(profileCompletion, application, isPaid),
        [profileCompletion, application, isPaid],
    );

    const cta = useMemo(() => membershipCta(access), [access]);

    /**
     * Nothing until the answer is in.
     *
     * `isPaid` is `null` while the membership status is still being read, and
     * rendering the upgrade card in that gap would tell a paid member they have
     * not paid. A short blank is the cheaper mistake — see `useMembershipGate`.
     */
    if (!isResolved) {
        return (
            <MemberPageShell title="Messages" subtitle="Member conversations" width="standard">
                <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" aria-hidden />
            </MemberPageShell>
        );
    }

    if (access.membershipActive) {
        return (
            <MemberPageShell title="Messages" subtitle="Member conversations" width="standard">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]">
                    <EmptyState
                        icon={<Inbox className="w-6 h-6" />}
                        title="Your inbox is empty"
                        detail={
                            'Direct messages from other members will appear here. Member-to-member '
                            + 'messaging is being rolled out — until it is live, the member directory '
                            + 'is the way to find who else is in your region.'
                        }
                    />
                </div>
            </MemberPageShell>
        );
    }

    return (
        <MemberPageShell title="Messages" subtitle="Member conversations" width="standard">
            <MembershipGate
                icon={<MessageSquare className="w-5 h-5" />}
                title={MEMBERS_ONLY_COPY.title}
                detail={MEMBERS_ONLY_COPY.detail}
                cta={cta}
            >
                <div>
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-slate-500 mb-3">
                        What your membership covers
                    </p>
                    <ul className="grid gap-4 sm:grid-cols-2">
                        <GateBenefit
                            icon={<MessageSquare className="w-4 h-4" />}
                            title="Direct messages"
                            detail="Write to any member of the association from their directory card."
                        />
                        <GateBenefit
                            icon={<Handshake className="w-4 h-4" />}
                            title="Member connections"
                            detail="Introduce your business to members trading in your sector."
                        />
                        <GateBenefit
                            icon={<FileBadge className="w-4 h-4" />}
                            title="Membership certificate"
                            detail="Your certificate and tax exemption document, issued on activation."
                        />
                        <GateBenefit
                            icon={<Megaphone className="w-4 h-4" />}
                            title="Members-only notices"
                            detail="Updates the association publishes to active members alone."
                        />
                        <GateBenefit
                            open
                            icon={<CalendarDays className="w-4 h-4" />}
                            title="Events programme"
                            detail="Browse the programme and register for a seat — open to you now."
                        />
                        <GateBenefit
                            open
                            icon={<Users className="w-4 h-4" />}
                            title="Member directory"
                            detail="See who is already a member across the state — open to you now."
                        />
                    </ul>
                </div>
            </MembershipGate>
        </MemberPageShell>
    );
}
