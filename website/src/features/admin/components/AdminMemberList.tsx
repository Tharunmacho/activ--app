<<<<<<< HEAD
import type { ReactNode } from 'react';
import {
    Eye, Trash2, UserCheck, UserX, Users, Briefcase, Sparkles, GraduationCap, Infinity as InfinityIcon,
    BellRing, BellOff, Send, Loader2, CalendarClock, MapPin,
} from 'lucide-react';
import ApplicantAvatar from '@/components/shared/ApplicantAvatar';
import { PlatinumBadge } from '@/components/shared/Platinum';
import type { AdminMember } from '@/services/adminMembersApi';

/**
 * One row per member — who they are, WHAT membership they hold (a badge per
 * kind), whether it is paid and in date, and the renewal-reminder switch.
 *
 * The row is a plain `<div>`: only the identity block opens the application,
 * so the switch and the action buttons are never nested inside another button.
 */

const day = (v?: string | null) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** A membership-kind badge: icon + colour per kind. */
export function MembershipTypeBadge({ member }: { member: Pick<AdminMember, 'kind' | 'kindLabel' | 'platinum' | 'lifetime'> }) {
    if (member.platinum) return <PlatinumBadge size="sm" label="Platinum" />;
    const style: Record<string, { icon: ReactNode; cls: string }> = {
        business: { icon: <Briefcase className="h-3.5 w-3.5" />, cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
        aspirant: { icon: <Sparkles className="h-3.5 w-3.5" />, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
        student: { icon: <GraduationCap className="h-3.5 w-3.5" />, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    };
    const s = style[member.kind] || { icon: <Users className="h-3.5 w-3.5" />, cls: 'bg-slate-100 text-slate-700 ring-slate-200' };
    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.8125rem] font-semibold ring-1 ${s.cls}`}>
                {s.icon} {member.kindLabel || 'Member'}
            </span>
            {member.lifetime ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.8125rem] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    <InfinityIcon className="h-3.5 w-3.5" /> Lifetime
                </span>
            ) : null}
        </span>
    );
}

/** Active (in date) · Expiring in N days · Expired · Awaiting payment. */
export function MemberStateChip({ member }: { member: Pick<AdminMember, 'status' | 'expiringSoon' | 'daysLeft' | 'lifetime'> }) {
    let cls = 'border-emerald-200 bg-emerald-50 text-emerald-700';
    let dot = 'bg-emerald-500';
    let text = 'Active';
    if (member.status === 'expired') {
        cls = 'border-rose-200 bg-rose-50 text-rose-700'; dot = 'bg-rose-500'; text = 'Expired';
    } else if (member.status === 'awaiting_payment') {
        cls = 'border-slate-200 bg-slate-50 text-slate-600'; dot = 'bg-slate-400'; text = 'Awaiting payment';
    } else if (member.expiringSoon) {
        cls = 'border-amber-200 bg-amber-50 text-amber-800'; dot = 'bg-amber-500';
        text = member.daysLeft !== null && member.daysLeft <= 0 ? 'Expires today' : `Expires in ${member.daysLeft} day${member.daysLeft === 1 ? '' : 's'}`;
    }
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.9375rem] font-semibold ${cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {text}
        </span>
    );
}

export default function AdminMemberList({
    members, loading, emptyHint, onOpen, onToggleActive, onDelete, busyId,
    canManageReminders, onToggleReminders, onRemindNow,
}: {
    members: AdminMember[];
    loading?: boolean;
    emptyHint?: string;
    onOpen: (member: AdminMember) => void;
    /** Block / unblock — State and Super only; omitted otherwise. */
    onToggleActive?: (member: AdminMember, nextActive: boolean) => void;
    onDelete?: (member: AdminMember) => void;
    busyId?: string | null;
    /** The reminder switch is shown to — and works for — the State / Super admin only. */
    canManageReminders?: boolean;
    onToggleReminders?: (member: AdminMember, enabled: boolean) => void;
    onRemindNow?: (member: AdminMember) => void;
}) {
    const shell = 'bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]';

    if (loading) {
        return (
            <div className={`${shell} py-10 sm:py-16`}>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-blue-100">
                        <Users className="h-7 w-7 text-blue-600" />
=======
import { Eye, Trash2, UserCheck, UserX, Users } from "lucide-react";

/**
 * The admin member list, matching the mobile app's `BlockMembersScreen` row.
 *
 * The website rendered each member as a large blue-gradient card in a
 * three-column grid: a 64px avatar, the name, the member type, a status badge,
 * then email / phone / location on their own lines, a join date and a "View
 * Profile" button. Twelve members filled three screens, and the white text on
 * saturated blue made the actual content — a name and an email — the least
 * legible part of the card.
 *
 * Mobile shows one quiet row per member: initials, name over email, the status
 * word, then the actions. That is what a directory wants, and it is what this
 * renders. The rows sit in a single white surface rather than separate cards,
 * so a long list reads as one list.
 *
 * The row used to be a single `<button>` wrapping everything. Putting the three
 * action buttons inside it would have nested interactive elements, which is
 * invalid HTML and makes the inner clicks ambiguous, so the row is a plain
 * `<div>` and only the identity block is the button that opens the profile.
 */

export interface AdminMemberRow {
    id: string;
    applicationId?: string;
    name: string;
    email?: string;
    /** "Active" | "Inactive", resolved by the server. */
    status?: string;
    /** Why they are inactive — suspended, or rejected and the reason given. */
    inactiveReason?: string;
}

export default function AdminMemberList({
    members,
    loading,
    emptyHint,
    onOpen,
    onToggleActive,
    onDelete,
    busyId,
}: {
    members: AdminMemberRow[];
    loading?: boolean;
    emptyHint?: string;
    onOpen: (member: AdminMemberRow) => void;
    /**
     * Block an active member, or unblock a blocked one.
     *
     * OMITTED, NOT DISABLED, when the caller does not supply it. Both of these
     * used to render as a greyed-out icon for a tier that could not use them,
     * which reads as "this is broken" rather than "this is not yours" — and a
     * disabled control still tells an admin the capability exists and invites
     * them to ask why it will not work for them.
     */
    onToggleActive?: (member: AdminMemberRow, nextActive: boolean) => void;
    /** Permanent, cascading delete. The caller confirms before calling. */
    onDelete?: (member: AdminMemberRow) => void;
    /** Row currently mid-request; its buttons are disabled. */
    busyId?: string | null;
}) {
    const initials = (name: string) =>
        (name || '')
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || '?';

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] py-16">
                <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3 animate-pulse">
                        <Users className="w-7 h-7 text-blue-600" />
>>>>>>> 8020f5d (Initial commit for website frontend)
                    </div>
                    <p className="text-slate-500">Loading members…</p>
                </div>
            </div>
        );
    }
<<<<<<< HEAD
    if (!members.length) {
        return (
            <div className={`${shell} py-10 sm:py-16`}>
                <div className="flex flex-col items-center px-4 text-center">
                    <Users className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-[1.25rem] font-semibold text-slate-700">No members here</p>
                    {emptyHint ? <p className="mt-1 text-[1.0625rem] text-slate-500">{emptyHint}</p> : null}
=======

    if (!members.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)] py-16">
                <div className="flex flex-col items-center text-center px-4">
                    <Users className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-[1.25rem] font-semibold text-slate-700">No members found</p>
                    {emptyHint ? <p className="text-[1.25rem] text-slate-500 mt-1">{emptyHint}</p> : null}
>>>>>>> 8020f5d (Initial commit for website frontend)
                </div>
            </div>
        );
    }

<<<<<<< HEAD
    const iconBtn = 'grid h-10 w-10 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <div className={`${shell} overflow-hidden`}>
            {members.map((m, i) => {
                const busy = !!busyId && busyId === m.id;
                const lapsed = m.status === 'expired';
                const remindable = m.status === 'expired' || (m.status === 'active' && m.expiringSoon);
                const region = [m.block, m.district, m.state].filter(Boolean).join(', ');
                return (
                    <div key={m.id}
                        className={`flex flex-col gap-3 border-l-[3px] px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center ${
                            lapsed ? 'border-l-rose-400 bg-rose-50/30' : m.expiringSoon ? 'border-l-amber-400' : 'border-l-transparent'
                        } ${i === members.length - 1 ? '' : 'border-b border-slate-100'}`}>
                        {/* identity */}
                        <button type="button" onClick={() => onOpen(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <ApplicantAvatar name={m.name} photo={m.photo} className="h-11 w-11" textClassName="text-[1.125rem]" tone="bg-blue-50 text-blue-700" />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate font-semibold text-slate-900">{m.name || 'Name not provided'}</span>
                                    <MembershipTypeBadge member={m} />
                                    {m.blocked ? <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.75rem] font-semibold text-white">Blocked</span> : null}
                                </span>
                                <span className="block truncate text-[0.9375rem] text-slate-500">{[m.email, m.phone].filter(Boolean).join(' · ')}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.875rem] text-slate-500">
                                    {m.memberNumber ? <span className="font-semibold text-slate-700">{m.memberNumber}</span> : null}
                                    {m.planName ? <span>{m.planName}</span> : null}
                                    {region ? <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{region}</span></span> : null}
                                    {m.status !== 'awaiting_payment' ? (
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            {m.lifetime ? 'Valid for life' : m.expiresAt ? `${lapsed ? 'Expired' : 'Valid until'} ${day(m.expiresAt)}` : 'No end date recorded'}
                                        </span>
                                    ) : <span>Approved — payment not made yet</span>}
                                </span>
                            </span>
                        </button>

                        {/* state + reminders + actions */}
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <MemberStateChip member={m} />

                            {/* The switch belongs to the State / Super Admin: other tiers
                                do not see it at all, not even greyed out. */}
                            {canManageReminders && m.status !== 'awaiting_payment' && !m.lifetime ? (
                                <label title="Renewal reminders on the 1st and 15th once the membership expires"
                                    className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-2.5 text-[0.875rem] font-semibold text-slate-700 hover:bg-slate-50">
                                    {m.reminders ? <BellRing className="h-4 w-4 text-blue-600" /> : <BellOff className="h-4 w-4" />}
                                    Reminders
                                    <input type="checkbox" role="switch" className="peer sr-only" checked={m.reminders}
                                        disabled={busy}
                                        onChange={(e) => onToggleReminders && onToggleReminders(m, e.target.checked)} />
                                    <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${m.reminders ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${m.reminders ? 'left-[1.125rem]' : 'left-0.5'}`} />
                                    </span>
                                </label>
                            ) : null}

                            {canManageReminders && remindable && onRemindNow ? (
                                <button type="button" disabled={busy} onClick={() => onRemindNow(m)}
                                    title={m.lastReminderAt ? `Last reminder ${day(m.lastReminderAt)}` : 'Send a renewal reminder now'}
                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[0.875rem] font-semibold text-white disabled:opacity-60">
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Remind now
                                </button>
                            ) : null}

                            <div className="flex items-center">
                                <button type="button" title="View full application" aria-label={`View ${m.name || 'member'}`}
                                    onClick={() => onOpen(m)} className={`${iconBtn} text-blue-600 hover:bg-blue-50`}>
                                    <Eye className="h-4 w-4" />
                                </button>
                                {onToggleActive ? (
                                    <button type="button" disabled={busy} onClick={() => onToggleActive(m, m.blocked)}
                                        title={m.blocked ? 'Unblock — let them sign in again' : 'Block — stop them signing in'}
                                        aria-label={m.blocked ? `Unblock ${m.name}` : `Block ${m.name}`}
                                        className={`${iconBtn} ${m.blocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                                        {m.blocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                    </button>
                                ) : null}
                                {onDelete ? (
                                    <button type="button" disabled={busy} onClick={() => onDelete(m)} title="Delete permanently"
                                        aria-label={`Delete ${m.name}`} className={`${iconBtn} text-rose-600 hover:bg-rose-50`}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
=======
    const iconBtn =
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden
                        shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]">
            {members.map((member, i) => {
                const inactive = (member.status || '').toLowerCase() === 'inactive';
                const rowId = member.id || member.applicationId || String(i);
                const busy = !!busyId && busyId === rowId;

                return (
                    <div
                        key={rowId}
                        /* A deactivated member is dimmed and marked with a rose
                           rule down the left edge, so the state is legible from
                           the shape of the row before any text is read. */
                        className={`flex items-center gap-4 px-5 py-4 transition-colors border-l-[3px] ${
                            inactive
                                ? 'border-l-rose-400 bg-rose-50/40 hover:bg-rose-50/70'
                                : 'border-l-transparent hover:bg-slate-50'
                        } ${i === members.length - 1 ? '' : 'border-b border-slate-100'}`}
                    >
                        <button
                            type="button"
                            onClick={() => onOpen(member)}
                            className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                            <span className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[1.25rem] flex items-center justify-center shrink-0">
                                {initials(member.name)}
                            </span>

                            <span className="flex-1 min-w-0">
                                <span className="block font-semibold text-slate-900 truncate">
                                    {member.name || 'Name not provided'}
                                </span>
                                <span className="block text-[1.25rem] text-slate-500 truncate">
                                    {member.email || 'No email'}
                                </span>
                                {/* Only shown when there is one — an active member
                                    has no reason to display, and an empty line
                                    under every active row is noise. */}
                                {inactive && member.inactiveReason ? (
                                    <span className="block text-[1.1875rem] text-red-500 truncate mt-0.5">
                                        {member.inactiveReason}
                                    </span>
                                ) : null}
                            </span>
                        </button>

                        {/*
                          A BADGE, NOT A WORD.
                          
                          This was coloured text alone, and green text at the end
                          of a row reads as part of the row rather than as its
                          state — so toggling a member produced a change nobody
                          could see. A filled pill with a dot in front of it is
                          the thing the eye finds when it scans a column for
                          "which of these is switched off".
                        */}
                        <span
                            className={`shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full
                                        border px-2.5 py-1 text-[1.1875rem] font-semibold transition-colors ${
                                inactive
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                inactive ? 'bg-rose-500' : 'bg-emerald-500'
                            }`} />
                            {inactive ? 'Inactive' : 'Active'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                title="View full application"
                                aria-label={`View ${member.name || 'member'}`}
                                onClick={() => onOpen(member)}
                                className={`${iconBtn} text-indigo-600 hover:bg-indigo-50`}
                            >
                                <Eye className="w-4 h-4" />
                            </button>

                            {!!onToggleActive && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    /* "Block", not "Suspend": the action now stops the
                                       member signing in at all, and the word an admin
                                       reads should match what actually happens. */
                                    title={inactive
                                        ? 'Unblock this member — they can sign in again'
                                        : 'Block this member — they will not be able to sign in'}
                                    aria-label={inactive ? `Unblock ${member.name || 'member'}` : `Block ${member.name || 'member'}`}
                                    onClick={() => onToggleActive(member, inactive)}
                                    className={`${iconBtn} ${inactive
                                        ? 'text-green-600 hover:bg-green-50'
                                        : 'text-amber-600 hover:bg-amber-50'
                                        }`}
                                >
                                    {inactive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </button>
                            )}

                            {!!onDelete && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    title="Delete permanently"
                                    aria-label={`Delete ${member.name || 'member'}`}
                                    onClick={() => onDelete(member)}
                                    className={`${iconBtn} text-red-600 hover:bg-red-50`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
>>>>>>> 8020f5d (Initial commit for website frontend)
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
