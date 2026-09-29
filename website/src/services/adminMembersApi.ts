import api, { unwrap } from './api';

/**
 * Admin → Members: paid (Active), lapsed (Expired), approved-not-paid (Awaiting
 * payment). Server rules: `backend/src/modules/admin/adminMembers.service.js`.
 */

export type MemberState = 'active' | 'expired' | 'awaiting_payment';
export type MembersTab = 'active' | 'expiring' | 'expired' | 'awaiting' | 'all';

export interface AdminMember {
    id: string;
    applicationId: string;
    applicationRef: string;
    name: string;
    email: string;
    phone: string;
    photo: string;
    block: string;
    district: string;
    state: string;
    memberNumber: string;
    kind: 'business' | 'aspirant' | 'student' | '';
    kindLabel: string;
    platinum: boolean;
    lifetime: boolean;
    planName: string;
    activatedAt: string | null;
    expiresAt: string | null;
    daysLeft: number | null;
    /** The membership status (`state` is the region). */
    status: MemberState;
    expiringSoon: boolean;
    blocked: boolean;
    reminders: boolean;
    remindersChangedBy: string;
    remindersChangedAt: string | null;
    lastReminderAt: string | null;
}

export interface AdminMembersPayload {
    rows: AdminMember[];
    counts: Record<MembersTab, number>;
    summary: { active: number; expiringSoon: number; expired: number; awaitingPayment: number; platinum: number; renewedThisMonth: number };
    canManageReminders: boolean;
    scopeUnresolved: boolean;
}

const EMPTY: AdminMembersPayload = {
    rows: [],
    counts: { active: 0, expiring: 0, expired: 0, awaiting: 0, all: 0 },
    summary: { active: 0, expiringSoon: 0, expired: 0, awaitingPayment: 0, platinum: 0, renewedThisMonth: 0 },
    canManageReminders: false,
    scopeUnresolved: false,
};

export const listAdminMembers = async (params: { tab?: MembersTab; q?: string; type?: string } = {}): Promise<AdminMembersPayload> =>
    unwrap<AdminMembersPayload>(await api.get('/admin/members', { params }), EMPTY);

export const setMemberReminders = async (id: string, enabled: boolean) =>
    unwrap<AdminMember>(await api.patch(`/admin/members/${encodeURIComponent(id)}/reminders`, { enabled }), null as unknown as AdminMember);

export const remindMemberNow = async (id: string) =>
    unwrap<{ sent: boolean; at: string }>(await api.post(`/admin/members/${encodeURIComponent(id)}/remind`), { sent: false, at: '' });

export const remindAllExpired = async () =>
    unwrap<{ sent: number; skipped: number }>(await api.post('/admin/members/remind-expired'), { sent: 0, skipped: 0 });
