import { useEffect, useState } from 'react';
import { getMyProfile } from '@/services/activApi';
import { SESSION_EVENT } from '@/services/api';

/**
 * CAN THIS MEMBER RENEW — the server's answer, never the browser's.
 *
 * `renewal` rides on `GET /members/my-profile` and is built by
 * `membershipState.renewalFor`, the same function `POST /payment/order` checks
 * before it opens an order. So a Renew button shown here is a button the
 * payment will honour: expired, or inside the last 30 days of the year.
 */
export interface RenewalInfo {
    /** 'active' | 'expired' | 'awaiting_payment' | 'none' */
    state: string;
    lifetime: boolean;
    expiresAt: string | null;
    daysLeft: number | null;
    expiringSoon: boolean;
    canRenew: boolean;
    /** When the Renew button unlocks, for a member not yet inside the window. */
    opensAt: string | null;
}

/** Where every Renew button goes. `renew=1` puts the payment screen in renewal wording. */
export const RENEW_PATH = '/member/payment?renew=1';

export const readRenewal = (profile: any): RenewalInfo | null => {
    const r = profile?.renewal;
    if (!r || typeof r !== 'object') return null;
    return {
        state: String(r.state || ''),
        lifetime: r.lifetime === true,
        expiresAt: r.expiresAt || null,
        daysLeft: typeof r.daysLeft === 'number' ? r.daysLeft : null,
        expiringSoon: r.expiringSoon === true,
        canRenew: r.canRenew === true,
        opensAt: r.opensAt || null,
    };
};

export const renewalDate = (iso?: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** One sentence for a banner or a card, phrased for where the member stands. */
export const renewalMessage = (r: RenewalInfo | null): string => {
    if (!r) return '';
    const on = renewalDate(r.expiresAt);
    if (r.state === 'expired') {
        return on
            ? `Your membership ended on ${on}. Renew now to restore every member benefit.`
            : 'Your membership has ended. Renew now to restore every member benefit.';
    }
    if (r.canRenew && r.daysLeft !== null) {
        const days = Math.max(0, r.daysLeft);
        return `Your membership ends ${days === 0 ? 'today' : `in ${days} ${days === 1 ? 'day' : 'days'}`}${on ? ` (${on})` : ''}. `
            + 'Renew now — the new year starts when this one ends, so you lose nothing.';
    }
    return '';
};

export const useRenewal = (): RenewalInfo | null => {
    const [renewal, setRenewal] = useState<RenewalInfo | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const profile = await getMyProfile();
                if (!cancelled) setRenewal(readRenewal(profile));
            } catch {
                if (!cancelled) setRenewal(null);
            }
        };
        load();
        window.addEventListener('paymentCompleted', load);
        window.addEventListener('profileUpdated', load);
        window.addEventListener(SESSION_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener('paymentCompleted', load);
            window.removeEventListener('profileUpdated', load);
            window.removeEventListener(SESSION_EVENT, load);
        };
    }, []);

    return renewal;
};

export default useRenewal;
