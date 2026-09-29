import { HOME_FOR_ROLE, STORAGE_KEYS, type UserRole } from '@/config/api.config';

/**
 * WHO IS SIGNED IN — the one answer every screen asks.
 *
 * One browser, one session, and it may belong to an ADMIN. The website keeps
 * no separate member and admin sessions, so "is somebody signed in" is the
 * wrong question for anything member-shaped: a super admin who opened a member
 * page was shown the member dashboard under their own admin name ("Hi, CMS"),
 * and a super admin who booked an event was returned, after paying, into the
 * member area's booking screen. Both read "signed in" where they meant
 * "signed in AS A MEMBER".
 *
 * Ask `isMemberSession()` whenever the answer decides member data, a member
 * route or a member-only prefill. `RoleGate` (components/layout) applies the
 * same rule to whole route groups.
 */
export const ADMIN_ROLES: readonly string[] = [
    'block_admin', 'district_admin', 'state_admin', 'super_admin', 'cms_admin', 'events_admin', 'admin',
];

const read = (key: string): string => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
};

export type SessionKind = 'guest' | 'member' | 'admin';

/**
 * `member` is "a token and NOT an admin role" rather than `=== 'member'`: an
 * older session could carry the member's declared type ('business') as its
 * role — see the note in ProfileContext.
 */
export const sessionKind = (): SessionKind => {
    if (!read(STORAGE_KEYS.AUTH_TOKEN)) return 'guest';
    const role = read(STORAGE_KEYS.USER_ROLE).toLowerCase();
    return ADMIN_ROLES.includes(role) ? 'admin' : 'member';
};

export const isMemberSession = (): boolean => sessionKind() === 'member';
export const isAdminSession = (): boolean => sessionKind() === 'admin';

export const storedRole = (): string => read(STORAGE_KEYS.USER_ROLE).toLowerCase();

/** Where the signed-in account belongs; '/' for a guest. */
export const homeForSession = (): string => {
    const kind = sessionKind();
    if (kind === 'guest') return '/';
    if (kind === 'member') return HOME_FOR_ROLE.member;
    return HOME_FOR_ROLE[storedRole() as UserRole] || '/admin/login';
};

/**
 * The signed-in admin's own region, in words: "Tamil Nadu", "Ariyalur district,
 * Tamil Nadu", "Guindy block, Chennai". Read from the admin record the login
 * stored — '' for a super admin or when nothing is recorded.
 */
export const adminRegionLabel = (): string => {
    let data: any = {};
    try { data = JSON.parse(read('adminData') || '{}') || {}; } catch { data = {}; }
    const role = storedRole();
    const state = String(data.state || '').trim();
    const district = String(data.district || '').trim();
    const block = String(data.block || '').trim();
    if (role === 'block_admin' && block) return `${block} block${district ? `, ${district}` : ''}`;
    if (role === 'district_admin' && district) return `${district} district${state ? `, ${state}` : ''}`;
    if (role === 'state_admin' && state) return state;
    return '';
};

/** "Super Admin", "CMS Admin" — for telling someone which account is signed in. */
export const roleLabel = (role: string = storedRole()): string => ({
    super_admin: 'Super Admin',
    state_admin: 'State Admin',
    district_admin: 'District Admin',
    block_admin: 'Block Admin',
    cms_admin: 'CMS Admin',
    events_admin: 'Events Admin',
    admin: 'Admin',
} as Record<string, string>)[role] || 'Member';
