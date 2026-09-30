import api from './api';
import { unwrap, asArray } from '../ui';

/**
 * Block / District / State admin endpoints — the SAME ones the website's admin
 * screens call (website/src/services/adminMembersApi.ts, AdminHubScreen,
 * AdminSettingsScreen). One backend, one database: the server geofences every
 * read to the caller's own region and re-checks every write.
 */

/* ------------------------------------------------------------------ Members */

export type MembersTab = 'active' | 'expiring' | 'expired' | 'awaiting' | 'all';
export type MemberKindFilter = '' | 'business' | 'aspirant' | 'student';

export interface AdminMemberRow {
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
  status: 'active' | 'expired' | 'awaiting_payment';
  expiringSoon: boolean;
  blocked: boolean;
  reminders: boolean;
  remindersChangedBy: string;
  remindersChangedAt: string | null;
  lastReminderAt: string | null;
}

export interface AdminMembersPayload {
  rows: AdminMemberRow[];
  counts: Record<MembersTab, number>;
  summary: { active: number; expiringSoon: number; expired: number; awaitingPayment: number; platinum: number; renewedThisMonth: number };
  canManageReminders: boolean;
  scopeUnresolved: boolean;
}

export const EMPTY_MEMBERS: AdminMembersPayload = {
  rows: [],
  counts: { active: 0, expiring: 0, expired: 0, awaiting: 0, all: 0 },
  summary: { active: 0, expiringSoon: 0, expired: 0, awaitingPayment: 0, platinum: 0, renewedThisMonth: 0 },
  canManageReminders: false,
  scopeUnresolved: false,
};

/** GET /admin/members?tab&q&type — geofenced to the caller's region. */
export const listAdminMembers = async (params: { tab?: MembersTab; q?: string; type?: string } = {}): Promise<AdminMembersPayload> => {
  const clean: Record<string, string> = {};
  if (params.tab) clean.tab = params.tab;
  if ((params.q || '').trim()) clean.q = (params.q || '').trim();
  if (params.type) clean.type = params.type;
  const data = unwrap<any>(await api.get('/admin/members', { params: clean }), EMPTY_MEMBERS) || {};
  return {
    ...EMPTY_MEMBERS,
    ...data,
    rows: asArray<AdminMemberRow>(data?.rows),
    counts: { ...EMPTY_MEMBERS.counts, ...(data?.counts || {}) },
    summary: { ...EMPTY_MEMBERS.summary, ...(data?.summary || {}) },
  };
};

/** State / Super only (the server refuses the others). */
export const setMemberReminders = async (id: string, enabled: boolean) =>
  unwrap<any>(await api.patch(`/admin/members/${encodeURIComponent(id)}/reminders`, { enabled }), null);

/** State / Super only; the server refuses a second one inside 24 hours. */
export const remindMemberNow = async (id: string) =>
  unwrap<{ sent: boolean; at: string }>(await api.post(`/admin/members/${encodeURIComponent(id)}/remind`), { sent: false, at: '' });

/** State / Super only. */
export const remindAllExpired = async () =>
  unwrap<{ sent: number; skipped: number }>(await api.post('/admin/members/remind-expired'), { sent: 0, skipped: 0 });

/**
 * Block / unblock / delete a member — by their APPLICATION id, exactly as the
 * website does (`memberAction(m.applicationId, …)`). On the website Members
 * screen these are offered to the State and Super Admin only.
 */
export const memberAction = async (applicationId: string, action: 'activate' | 'suspend' | 'delete') =>
  unwrap<any>(await api.post(`/admin/users/${encodeURIComponent(applicationId)}/${action}`, {}), null);

/* ------------------------------------------------------------------ Hub */

export type RegionLevel = 'district' | 'block';
export type HubStatus = 'all' | 'pending' | 'approved' | 'rejected';

export interface HubRegion {
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

/** The levels beneath each tier, WIDEST FIRST (CLAUDE.md LEVELS_FOR). */
export const LEVELS_FOR: Record<string, RegionLevel[]> = {
  state: ['district', 'block'],
  district: ['block'],
};

/** GET /admin/team/directory?level= — the regions of one level in the caller's patch. */
export const hubRegions = async (level: RegionLevel): Promise<HubRegion[]> => {
  const data = unwrap<any>(await api.get('/admin/team/directory', { params: { level } }), {}) || {};
  return asArray<HubRegion>(data?.regions);
};

/** GET /admin/team/overview — the Hub's top figures, narrowed to the caller's patch. */
export const hubOverview = async () => unwrap<any>(await api.get('/admin/team/overview'), {}) || {};

/**
 * GET /admin/team/applications — one region's applications.
 *
 * NO `level` is sent, exactly like the website: the server reads `level` as
 * WHOSE VERDICT to show, and without it uses the reader's own seat — the same
 * verdict the Dashboard reports. The region is narrowed by the fields it names.
 */
export const hubApplications = async (region: Partial<HubRegion>, status: HubStatus = 'all') => {
  const params: Record<string, string> = { limit: '50' };
  if (region?.state) params.state = region.state;
  if (region?.district) params.district = region.district;
  if (region?.block) params.block = region.block;
  if (status !== 'all') params.status = status;
  const data = unwrap<any>(await api.get('/admin/team/applications', { params }), {}) || {};
  return asArray<any>(data?.applicants);
};

/** The caller's role selects the seat the verdict is signed into (website approve/reject). */
export const approveApplication = async (id: string) =>
  api.post(`/applications/${encodeURIComponent(id)}/approve`, {});
export const rejectApplication = async (id: string, rejectionReason: string) =>
  api.post(`/applications/${encodeURIComponent(id)}/reject`, { rejectionReason });
