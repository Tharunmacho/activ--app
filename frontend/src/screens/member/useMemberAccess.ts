import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMyProfile, isPaidMember, getMyApplications, getBusinessInfo, getDeclarationInfo,
} from '../../services/memberApi';
import {
  pickMostAdvancedApplication, profileCompletion, deriveMemberAccess, membershipCta, CtaTarget,
} from './dashboard/memberRules';

/**
 * Who the signed-in member is and what they may open — the mobile copy of the
 * website's memberAccess (MEMBER_NAV `unlock: 'membershipActive'`).
 *
 * Paid-only (website parity): Member Directory, Messages, certificates.
 * Everyone: dashboard, profile, business, events, updates, help, settings.
 * Re-read whenever a screen using it regains focus, so paying elsewhere in
 * the app unlocks the menu without a restart.
 */
export function useMemberAccess() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const p = await getMyProfile();
      setProfile(p || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load your membership');
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs on first focus too — no separate mount effect (would load twice).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const paid = isPaidMember(profile);
  return { profile, paid, loading, error, reload: load };
}

/* ------------------------------------------------------------------ the locked-surface call to action */

/**
 * The website's `membershipCta(deriveMemberAccess(...), renewal)` for a
 * surface an unpaid member cannot use yet (directory, messages, a Message
 * button). "Activate membership" is only the answer for an APPROVED
 * application — before that the next step is the profile, the submission or
 * the review, and a Pay button would be refused by the server.
 */
export function useLockedCta(paid: boolean, profile: any) {
  const [state, setState] = useState<{ application: any; percent: number } | null>(null);

  useFocusEffect(useCallback(() => {
    if (paid) return undefined;
    let cancelled = false;
    Promise.allSettled([getMyApplications(), getBusinessInfo(), getDeclarationInfo()]).then(([a, b, d]) => {
      if (cancelled) return;
      const application = a.status === 'fulfilled' ? pickMostAdvancedApplication(a.value) : null;
      const { percent } = profileCompletion(
        profile || {},
        b.status === 'fulfilled' ? b.value : null,
        d.status === 'fulfilled' ? d.value : null,
        application,
      );
      setState({ application, percent });
    });
    return () => { cancelled = true; };
  }, [paid, profile]));

  const access = deriveMemberAccess(state?.percent || 0, state?.application || null, paid);
  return membershipCta(access, profile?.renewal || null);
}

/** Where each CTA target goes in the app (the DashboardScreen mapping). */
export const runMembershipCta = (navigation: any, target: CtaTarget, profile?: any) => {
  const userData = {
    email: profile?.email || '', fullName: profile?.fullName || '',
    phoneNumber: profile?.phoneNumber || '', memberId: profile?.memberId || '',
  };
  try {
    if (target === 'Renew') navigation.navigate('MembershipPlans', { renew: true });
    else if (target === 'Activate') navigation.navigate('MembershipPlans');
    else if (target === 'ApplicationStatus') navigation.navigate('ApplicationStatus');
    else if (target === 'Submit') navigation.navigate('DeclarationForm', { userData });
    else if (target === 'PaidDashboard') navigation.reset({ index: 0, routes: [{ name: 'PaidDashboard' }] });
    else navigation.navigate('PersonalDetailsForm', { userData });
  } catch (err) {
    console.warn('CTA navigation safely caught:', err);
  }
};
