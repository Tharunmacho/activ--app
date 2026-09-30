import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PALETTE, SPACE, TYPE, money, shortDate, timeAgo,
  ConsoleScroll, ConsoleHeader, ConsoleGrid, ConsoleStatTile, ConsoleCard, ConsoleChip, ConsoleTabs, ConsoleButton,
  ConsoleSearch, ConsoleSectionTitle, ConsoleSkeleton, ConsoleState, ConsoleNote, GlassIconButton, GradientAvatar,
  PremiumInput, MembershipBenefits3D, type ConsoleChipKind,
} from '../../../ui';
import {
  listMembershipPlans, updateMembershipSettings, retireMembershipPlan, deleteMembershipPlan, updateMembershipPlan, alignMembershipBands,
  getPlatinumOverview, searchPlatinumCandidates, revokePlatinum, listPlatinumRequests, updatePlatinumRequest,
  MembershipPlanRow, PAYMENT_MODE_LABEL, errorText,
} from '../../../services/superApi';
import { ToggleRow, MiniAction, ChipRow, confirm, place, callNumber, whatsappNumber, openUrl } from './superKit';
import { hasBand, bandLabel, yearWindowLabel, inBand, companyPlans, bandProblems, yearRanges } from './membershipBands';

/**
 * ============================================================================
 * SUPER ADMIN — Membership (website /super-admin/membership)
 * ============================================================================
 *
 *   Plans     GET /admin/super/membership/plans — every plan, retired included.
 *             Prices in RUPEES (the server stores paise; membershipplan.service
 *             is the only converter — the price shown and the price charged are
 *             one lookup). Bands are half-open [minYears, maxYears): the gaps
 *             and overlaps are named here, as on the website, because four rows
 *             do not show that nothing covers 8–10 years. Delete asks the
 *             server, and when payments point at the plan the server refuses and
 *             retire is offered instead (retire, never lose a receipt's plan).
 *             `showAllPlans` is the one settings switch. No price is hardcoded.
 *   Platinum  granted by hand after the fee is paid at the office; never
 *             bought online. Search → grant (stack screen) → undo.
 *   Requests  members who asked for Platinum: call / WhatsApp, mark contacted,
 *             decline, grant.
 */

type Tab = 'plans' | 'platinum' | 'requests';

const GROUPS: { audience: string; title: string; hint: string; icon: string }[] = [
  { audience: 'business', title: 'Company plans', hint: 'Ordered by band. An applicant is offered the one their commencement year falls in.', icon: 'business' },
  { audience: 'aspirant', title: 'Aspirant plan', hint: 'For an applicant planning a business who is not trading yet. No band applies.', icon: 'star' },
  { audience: 'student', title: 'Student plan', hint: 'For an applicant who is studying and not in business. No band applies.', icon: 'school' },
  { audience: 'platinum', title: 'Platinum plan', hint: 'Lifetime membership, paid offline and granted by the Super Admin. Never offered to applicants online.', icon: 'diamond' },
];

function PlanCard({ p, thisYear, onEdit, onRestore, onDelete }: {
  p: MembershipPlanRow; thisYear: number; onEdit: () => void; onRestore: () => void; onDelete: () => void;
}) {
  const years = hasBand(p) ? yearWindowLabel(p, thisYear) : '';
  const retired = !p?.active;
  return (
    <ConsoleCard style={s.card} accent={retired ? PALETTE.borderStrong : PALETTE.indigo} onPress={onEdit} accessibilityLabel={`${p?.name || p?.key}, ${money(p?.price)}, edit`}>
      <View style={s.planTop}>
        <View style={s.flexText}>
          <View style={s.chips}>
            {p?.popular ? <ConsoleChip label="Popular" kind="info" icon="star" /> : null}
            {retired ? <ConsoleChip label="Retired" kind="neutral" /> : <ConsoleChip label="Offered" kind="approved" />}
          </View>
          <Text style={[s.planName, retired && s.muted]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{p?.name || p?.key}</Text>
          <Text style={s.meta} maxFontSizeMultiplier={1.3}>{bandLabel(p)}{years ? ` · ${years}` : ''}</Text>
        </View>
        <Text style={[s.price, retired && s.muted]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{money(p?.price)}</Text>
      </View>
      {p?.description ? <Text style={s.desc} numberOfLines={3} maxFontSizeMultiplier={1.3}>{p.description}</Text> : null}
      <View style={s.actions}>
        <MiniAction icon="edit" label="Edit" onPress={onEdit} />
        {retired ? <MiniAction icon="unarchive" label="Offer again" color={PALETTE.green} onPress={onRestore} /> : null}
        <MiniAction icon="delete-outline" label="Delete" color={PALETTE.red} onPress={onDelete} />
      </View>
    </ConsoleCard>
  );
}

function PlansTab({ navigation, nonce }: { navigation: any; nonce: number }) {
  const [data, setData] = useState<{ plans: MembershipPlanRow[]; settings: { showAllPlans: boolean } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [aligning, setAligning] = useState(false);
  const [previewYear, setPreviewYear] = useState('');
  // Read once per render so every year label on the screen agrees.
  const thisYear = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await listMembershipPlans()); } catch (err) { setError(errorText(err, 'Could not load the membership plans')); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load, nonce]));

  const plans = useMemo(() => (Array.isArray(data?.plans) ? data?.plans || [] : []), [data]);
  const business = useMemo(() => companyPlans(plans), [plans]);
  const problems = useMemo(() => bandProblems(business), [business]);
  const runs = useMemo(() => yearRanges(business, thisYear), [business, thisYear]);
  const showAll = !!data?.settings?.showAllPlans;
  const offered = plans.filter((p) => p?.active).length;

  const preview = useMemo(() => {
    const year = parseInt(previewYear, 10);
    if (!Number.isFinite(year) || year <= 0) return null;
    const years = Math.max(0, thisYear - year);
    const matched = business.filter((p) => p?.active).find((p) => inBand(p, years)) || null;
    return { years, matched };
  }, [previewYear, business, thisYear]);

  /** Optimistic, as on the website: the switch must feel immediate. */
  const setShowAll = async (v: boolean) => {
    setBusy(true);
    setData((d) => (d ? { ...d, settings: { showAllPlans: v } } : d));
    try {
      await updateMembershipSettings({ showAllPlans: v });
      Alert.alert('Saved', v ? 'Applicants now see every plan' : 'Applicants now see only the plan their commencement year earns');
    } catch (err) {
      setData((d) => (d ? { ...d, settings: { showAllPlans: !v } } : d));
      Alert.alert('Could not save that setting', errorText(err));
    } finally { setBusy(false); }
  };
  /**
   * Delete, with retire offered only when deletion is actually blocked
   * (website Membership.tsx `removePlan`): the server is the only side that can
   * count the payments referencing a plan, so ask for the delete and react.
   */
  const remove = async (p: MembershipPlanRow) => {
    const key = String(p?.key || '');
    if (!key) return;
    const label = p?.name || key;
    if (!(await confirm('Delete this plan?', `Delete "${label}"? This cannot be undone.`, 'Delete', true))) return;
    try {
      await deleteMembershipPlan(key);
      Alert.alert('Deleted', `"${label}" deleted`);
      load();
    } catch (err) {
      const message = errorText(err, 'Could not delete this plan');
      if (/cannot be deleted/i.test(message)) {
        if (await confirm('Retire it instead?', message, 'Retire')) {
          try {
            await retireMembershipPlan(key);
            Alert.alert('Retired', `"${label}" retired — existing records are untouched`);
            load();
          } catch (retireErr) { Alert.alert('Could not retire this plan', errorText(retireErr)); }
        }
        return;
      }
      Alert.alert('Could not delete this plan', message);
    }
  };
  /** A retired plan stays listed so it can be turned back on (the website does it via "Offered to applicants"). */
  const restore = async (p: MembershipPlanRow) => {
    const key = String(p?.key || '');
    if (!key) return;
    try { await updateMembershipPlan(key, { active: true }); load(); } catch (err) { Alert.alert('Could not save this plan', errorText(err)); }
  };
  const align = async () => {
    setAligning(true);
    try {
      const r = await alignMembershipBands();
      const n = Number(r?.changed || 0);
      Alert.alert('Bands', n ? `Adjusted ${n} ${n === 1 ? 'plan' : 'plans'} — every year is covered now` : 'The bands were already continuous');
      load();
    } catch (err) { Alert.alert('Could not align the bands', errorText(err)); } finally { setAligning(false); }
  };
  const edit = (p: MembershipPlanRow) => navigation?.navigate?.('SuperPlanEditor', { planKey: p?.key, plan: p });

  if (loading && !data) return <ConsoleSkeleton rows={3} style={s.gap} />;
  if (error && !data) return <ConsoleState kind="error" title="Could not load the plans" message={error} action="Try again" onAction={load} />;

  return (
    <View>
      <ConsoleGrid style={s.gap}>
        <ConsoleStatTile label="Plans offered" value={offered} icon="workspace-premium" accent="indigo" hint={`${plans.length - offered} retired`} />
        <ConsoleStatTile label="Company bands" value={business.filter((p) => p?.active).length} icon="date-range" accent={problems.length ? 'amber' : 'green'} hint={problems.length ? `${problems.length} to fix` : 'continuous'} delay={60} />
      </ConsoleGrid>

      <View style={s.pad}>
        <ConsoleButton icon="add" label="Add plan" onPress={() => navigation?.navigate?.('SuperPlanEditor')} />
      </View>

      <ConsoleCard style={s.card}>
        <ToggleRow
          label="Show every plan to every applicant"
          hint={showAll
            ? 'On — every applicant picks from all the company plans, whatever their commencement year. Turn this off to show each applicant only the one plan their year earns, the way the aspirant plan works.'
            : 'Off — each applicant sees only the one plan their commencement year earns them, at the price set below, exactly as an aspirant sees only the aspirant plan. Turn this on to let them choose from all of them.'}
          value={showAll}
          onChange={setShowAll}
          disabled={busy}
          last
        />
      </ConsoleCard>

      {problems.length ? (
        <ConsoleCard style={s.card} accent={PALETTE.amber}>
          <View style={s.warnHead}>
            <Icon name="warning-amber" size={20} color={PALETTE.amberDark} />
            <Text style={s.warnTitle} maxFontSizeMultiplier={1.3}>These bands leave applicants without a plan</Text>
          </View>
          {problems.map((t, i) => <Text key={i} style={s.warnItem} maxFontSizeMultiplier={1.3}>• {t}</Text>)}
          <Text style={s.warnBody} maxFontSizeMultiplier={1.3}>An applicant no band covers is shown every plan instead, and where two bands overlap the cheaper one silently wins — which reads as the rule not working.</Text>
          <ConsoleButton icon="auto-fix-high" label="Make the bands continuous" onPress={align} loading={aligning} style={s.warnBtn} />
        </ConsoleCard>
      ) : null}

      {GROUPS.map((g) => {
        const rows = g.audience === 'business' ? business : plans.filter((p) => p?.audience === g.audience);
        return (
          <View key={g.audience}>
            <ConsoleSectionTitle title={g.title} subtitle={g.hint} icon={g.icon} style={s.section} />
            {rows.length === 0 ? <Text style={s.empty} maxFontSizeMultiplier={1.3}>No plans here yet.</Text> : rows.map((p, i) => (
              <PlanCard key={String(p?.key || i)} p={p} thisYear={thisYear} onEdit={() => edit(p)} onRestore={() => restore(p)} onDelete={() => remove(p)} />
            ))}
          </View>
        );
      })}

      {runs.length ? (
        <>
          <ConsoleSectionTitle
            title="Commencement year → plan"
            subtitle="What a company that started in each year is offered today. Every row shifts by one year each January, because the bands are durations."
            icon="date-range"
            style={s.section}
          />
          <ConsoleCard style={s.card}>
            {runs.map((r, i) => (
              <TouchableOpacity
                key={r.key}
                activeOpacity={0.7}
                disabled={!r.plan}
                onPress={() => { if (r.plan) edit(r.plan); }}
                style={[s.runRow, i < runs.length - 1 && s.runDivider, !r.plan && s.runGap]}
                accessibilityRole="button"
                accessibilityLabel={`${r.years}: ${r.plan ? `${r.plan.name}, ${money(r.plan.price)}` : 'no plan covers these years'}`}
              >
                <View style={s.flexText}>
                  <Text style={s.runYears} maxFontSizeMultiplier={1.3}>{r.years}</Text>
                  <Text style={s.meta} maxFontSizeMultiplier={1.3}>{r.duration}</Text>
                </View>
                <View style={s.runRight}>
                  {r.plan ? (
                    <>
                      <Text style={s.runPlan} numberOfLines={1} maxFontSizeMultiplier={1.3}>{r.plan.name}</Text>
                      <Text style={s.runPrice} maxFontSizeMultiplier={1.2}>{money(r.plan.price)}</Text>
                    </>
                  ) : (
                    <Text style={s.runNone} maxFontSizeMultiplier={1.3}>No plan covers these years</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ConsoleCard>
        </>
      ) : null}

      <ConsoleSectionTitle title="Check a commencement year" subtitle="What an applicant whose company started in this year would be shown." icon="auto-awesome" style={s.section} />
      <ConsoleCard style={s.card}>
        <PremiumInput
          tone="admin"
          icon="calendar-today"
          value={previewYear}
          onChangeText={(t) => setPreviewYear((t || '').replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="e.g. 2021"
          accessibilityLabel="Commencement year"
        />
        {preview ? (
          showAll ? (
            <Text style={s.previewText} maxFontSizeMultiplier={1.3}><Text style={s.bold}>{preview.years} years trading</Text> — and every plan is shown, because the switch at the top of this page is on.</Text>
          ) : preview.matched ? (
            <Text style={s.previewText} maxFontSizeMultiplier={1.3}><Text style={s.bold}>{preview.years} years trading</Text> → they see <Text style={s.strong}>{preview.matched.name}</Text> at <Text style={s.strong}>{money(preview.matched.price)}</Text>, and nothing else.</Text>
          ) : (
            <Text style={[s.previewText, s.warnText]} maxFontSizeMultiplier={1.3}><Text style={s.bold}>{preview.years} years trading</Text> — no band covers this, so they would be shown every plan. Fix the bands above.</Text>
          )
        ) : null}
      </ConsoleCard>
    </View>
  );
}

const modeLabel = (mode?: string) => PAYMENT_MODE_LABEL[(mode || 'other') as keyof typeof PAYMENT_MODE_LABEL] || 'Paid';

/** One search result (website PlatinumMembers → "Make a member Platinum"). */
function CandidateRow({ m, onGrant }: { m: any; onGrant: () => void }) {
  const isPlat = String(m?.membershipTier || '') === 'platinum';
  const contact = [m?.email, m?.phoneNumber].filter(Boolean).join(' · ');
  const where = [m?.membershipNumber, place(m?.block, m?.district, m?.state)].filter(Boolean).join(' · ');
  return (
    <ConsoleCard style={s.card}>
      <View style={s.row}>
        <GradientAvatar name={m?.fullName || '?'} size={42} tone="admin" ring={false} />
        <View style={s.flexTextPad}>
          <Text style={s.planName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{m?.fullName || 'Unnamed member'}</Text>
          {contact ? <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{contact}</Text> : null}
          {where ? <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{where}</Text> : null}
        </View>
        {isPlat ? <ConsoleChip label="Platinum" kind="gold" icon="diamond" /> : null}
      </View>
      {!isPlat && m?.blockedReason ? <Text style={[s.desc, s.warnText]} maxFontSizeMultiplier={1.3}>{m.blockedReason}</Text> : null}
      {!isPlat && !m?.blockedReason ? (
        <View style={s.actions}>
          <MiniAction icon="diamond" label="Make Platinum" onPress={onGrant} />
        </View>
      ) : null}
    </ConsoleCard>
  );
}

/** One existing Platinum member, with the office receipt and Undo. */
function PlatinumMemberRow({ m, onRevoke }: { m: any; onRevoke: () => void }) {
  const g = m?.platinumGrant || null;
  return (
    <ConsoleCard style={s.card} accent={PALETTE.gold}>
      <View style={s.row}>
        <GradientAvatar name={m?.fullName || '?'} size={42} tone="admin" ring={false} />
        <View style={s.flexTextPad}>
          <Text style={s.planName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{m?.fullName || 'Unnamed member'}</Text>
          <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{[m?.membershipNumber, m?.email].filter(Boolean).join(' · ') || '—'}</Text>
        </View>
        <ConsoleChip label="Platinum" kind="gold" icon="diamond" />
      </View>
      {g ? (
        <Text style={s.desc} maxFontSizeMultiplier={1.3}>
          {money(g?.amount)} · {modeLabel(g?.paymentMode)}{g?.receiptNumber ? ` · ${g.receiptNumber}` : ''}{g?.grantedAt ? ` · granted ${shortDate(g.grantedAt)}` : ''}
        </Text>
      ) : null}
      <View style={s.actions}>
        <MiniAction icon="undo" label="Undo" color={PALETTE.red} onPress={onRevoke} />
      </View>
    </ConsoleCard>
  );
}

function PlatinumTab({ navigation, nonce }: { navigation: any; nonce: number }) {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setOverview(await getPlatinumOverview()); } catch (err) { setError(errorText(err, 'Could not load Platinum members')); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load, nonce]));

  // Debounced search — one request per pause in typing (as on the website).
  const term = (q || '').trim();
  useEffect(() => {
    if (term.length < 2) { setResults([]); setSearching(false); return undefined; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await searchPlatinumCandidates(term); if (!cancelled) setResults(Array.isArray(r) ? r : []); }
      catch { if (!cancelled) setResults([]); }
      finally { if (!cancelled) setSearching(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [term]);

  const revoke = async (m: any) => {
    const mid = String(m?.id || '');
    if (!mid) return;
    if (!(await confirm('Undo this Platinum grant?', 'Restore their earlier membership and cancel this receipt?', 'Remove', true))) return;
    try {
      await revokePlatinum(mid);
      Alert.alert('Platinum removed', `Platinum removed from ${m?.fullName || 'the member'}; their earlier membership is restored`);
      load();
    } catch (err) { Alert.alert('Could not remove Platinum', errorText(err)); }
  };

  if (loading && !overview) return <ConsoleSkeleton rows={3} style={s.gap} />;
  if (error && !overview) return <ConsoleState kind="error" title="Could not load Platinum" message={error} action="Try again" onAction={load} />;
  const members: any[] = Array.isArray(overview?.members) ? overview.members : [];
  // The price is the Platinum PLAN ROW — never a number in this client.
  const price = Number(overview?.plan?.price);
  const hasPrice = Number.isFinite(price) && price > 0;

  return (
    <View>
      <ConsoleGrid style={s.gap}>
        <ConsoleStatTile label="Platinum price" value={hasPrice ? money(price) : '—'} icon="diamond" accent="gold" hint="one payment · never renews" />
        <ConsoleStatTile label="Platinum members" value={members.length} icon="all-inclusive" accent="indigo" hint="lifetime validity" delay={60} />
      </ConsoleGrid>
      <ConsoleNote
        style={s.noteGap}
        icon="sell"
        text="The price is the Platinum plan on the Plans tab — edit it there. Members see it advertised on their dashboard."
      />

      <ConsoleSectionTitle title="Make a member Platinum" subtitle="Search by name, email, mobile or Member ID. Their application must be approved." icon="person-search" style={s.section} />
      <ConsoleSearch value={q} onChangeText={setQ} placeholder="Start typing a name, email or number…" style={s.searchGap} />
      {searching ? (
        <View style={s.searching}><ActivityIndicator color={PALETTE.indigo} /><Text style={s.meta} maxFontSizeMultiplier={1.3}>Searching…</Text></View>
      ) : term.length >= 2 && results.length === 0 ? (
        <Text style={s.empty} maxFontSizeMultiplier={1.3}>No member matches “{term}”.</Text>
      ) : results.map((m, i) => (
        <CandidateRow key={String(m?.id || i)} m={m} onGrant={() => navigation?.navigate?.('SuperPlatinumGrant', { member: m, ...(hasPrice ? { price } : {}) })} />
      ))}

      <ConsoleSectionTitle title="Platinum members" icon="workspace-premium" style={s.section} />
      {members.length === 0 ? (
        <ConsoleState title="No Platinum members yet" message="Search above to grant the first one." />
      ) : members.map((m, i) => (
        <PlatinumMemberRow key={String(m?.id || i)} m={m} onRevoke={() => revoke(m)} />
      ))}
      <ConsoleNote
        style={s.noteGap}
        icon="verified-user"
        kind="slate"
        text="Each grant is recorded as a paid membership receipt, so it appears on the member’s 80G certificate and in payment reports."
      />
    </View>
  );
}

const CONTACT_LABEL: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', email: 'Email' };
const STATUS_WORD: Record<string, string> = { new: 'New', contacted: 'Contacted', converted: 'Platinum granted', declined: 'Declined' };
const statusKind = (st?: string): ConsoleChipKind => (st === 'converted' ? 'approved' : st === 'declined' ? 'rejected' : st === 'contacted' ? 'pending' : 'info');

function RequestsTab({ navigation, nonce }: { navigation: any; nonce: number }) {
  const [status, setStatus] = useState('new');
  const [data, setData] = useState<{ requests: any[]; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [price, setPrice] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await listPlatinumRequests(status)); } catch (err) { setError(errorText(err, 'Could not load Platinum requests')); } finally { setLoading(false); }
  }, [status]);
  useFocusEffect(useCallback(() => { load(); }, [load, nonce]));
  useEffect(() => {
    let alive = true;
    getPlatinumOverview().then((o) => {
      const p = Number(o?.plan?.price);
      if (alive && Number.isFinite(p) && p > 0) setPrice(p);
    }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const markContacted = async (r: any) => {
    const rid = String(r?.id || '');
    if (!rid) return;
    setBusy(rid);
    try { await updatePlatinumRequest(rid, { status: 'contacted' }); Alert.alert('Updated', 'Marked as contacted'); load(); }
    catch (err) { Alert.alert('Could not update the request', errorText(err)); }
    finally { setBusy(''); }
  };
  const grant = (r: any) => {
    if (!r?.memberId) { Alert.alert('Not possible', 'This request is not linked to a member record.'); return; }
    navigation?.navigate?.('SuperPlatinumGrant', {
      member: { id: r.memberId, fullName: r?.name, email: r?.email, phoneNumber: r?.phone, block: r?.block, district: r?.district, state: r?.state },
      ...(price ? { price } : {}),
    });
  };
  const openDetail = (r: any) => navigation?.navigate?.('SuperPlatinumRequest', { id: String(r?.id || ''), blockedReason: r?.blockedReason || '' });

  const counts = data?.counts || {};
  const rows: any[] = Array.isArray(data?.requests) ? data?.requests || [] : [];
  return (
    <View>
      <ConsoleNote style={s.noteGapTop} icon="contact-phone" text="Members who asked to become Platinum. Call them, then grant it once the payment is received." />
      <ChipRow<string>
        options={[
          { value: 'new', label: `New (${Number(counts?.new || 0)})` },
          { value: 'contacted', label: `Contacted (${Number(counts?.contacted || 0)})` },
          { value: 'converted', label: `Granted (${Number(counts?.converted || 0)})` },
          { value: 'declined', label: `Declined (${Number(counts?.declined || 0)})` },
          { value: 'all', label: `All (${Number(counts?.all || 0)})` },
        ]}
        value={status}
        onChange={setStatus}
      />
      <View style={s.gapSm} />
      {loading && !data ? <ConsoleSkeleton rows={2} /> : error ? (
        <ConsoleState kind="error" title="Could not load the requests" message={error} action="Try again" onAction={load} />
      ) : rows.length === 0 ? (
        <ConsoleState
          title={status === 'new' ? 'No new requests' : 'Nothing here yet'}
          message={status === 'new' ? 'When a member presses “Apply for Platinum”, it appears here and the office is emailed.' : undefined}
        />
      ) : rows.map((r, i) => {
        const open = r?.status === 'new' || r?.status === 'contacted';
        const region = place(r?.block, r?.district, r?.state);
        const rid = String(r?.id || '');
        return (
          <ConsoleCard key={rid || String(i)} style={s.card} accent={open ? PALETTE.indigo : undefined}>
            <View style={s.row}>
              <GradientAvatar name={r?.name || '?'} size={42} tone="admin" ring={false} />
              <View style={s.flexTextPad}>
                <Text style={s.planName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{r?.name || 'Member'}</Text>
                <Text style={s.meta} maxFontSizeMultiplier={1.3}>{shortDate(r?.createdAt)}{r?.createdAt ? ` · ${timeAgo(r.createdAt)}` : ''}</Text>
              </View>
              <ConsoleChip label={STATUS_WORD[String(r?.status || '')] || String(r?.status || 'New')} kind={statusKind(r?.status)} />
            </View>
            <Text style={s.meta} maxFontSizeMultiplier={1.3}>Prefers {CONTACT_LABEL[String(r?.preferredContact || '')] || 'a call'}{r?.preferredTime ? ` · ${r.preferredTime}` : ''}</Text>
            {region ? <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{region}</Text> : null}
            {r?.companyName ? <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{r.companyName}</Text> : null}
            {r?.phone ? <Text style={s.meta} maxFontSizeMultiplier={1.3}>{r.phone}</Text> : null}
            {r?.email ? <Text style={s.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>{r.email}</Text> : null}
            {r?.handledBy ? <Text style={s.meta} maxFontSizeMultiplier={1.3}>{r.handledBy} · {shortDate(r?.handledAt)}</Text> : null}
            {r?.message ? <Text style={s.quote} maxFontSizeMultiplier={1.3}>“{r.message}”</Text> : null}
            {r?.notes ? <Text style={s.meta} maxFontSizeMultiplier={1.3}>Note: {r.notes}</Text> : null}
            {open && r?.blockedReason ? <Text style={[s.desc, s.warnText]} maxFontSizeMultiplier={1.3}>{r.blockedReason}</Text> : null}
            <View style={s.actions}>
              <MiniAction icon="call" label="Call" onPress={() => callNumber(r?.phone)} disabled={!r?.phone} />
              <MiniAction icon="chat" label="WhatsApp" color={PALETTE.green} onPress={() => whatsappNumber(r?.phone, `Hello ${r?.name || ''}, this is the ACTIV office about your Platinum membership request.`)} disabled={!r?.phone} />
              <MiniAction icon="email" label="Email" color={PALETTE.textSoft} onPress={() => openUrl(r?.email ? `mailto:${r.email}?subject=${encodeURIComponent('Your ACTIV Platinum membership request')}` : '')} disabled={!r?.email} />
              <MiniAction icon="description" label="View full details" onPress={() => openDetail(r)} />
            </View>
            {open ? (
              <View style={s.actions}>
                {r?.status === 'new' ? <MiniAction icon="done" label={busy === rid ? 'Saving…' : 'Mark contacted'} onPress={() => markContacted(r)} disabled={!!busy} /> : null}
                <MiniAction icon="diamond" label="Grant Platinum" color={PALETTE.indigoDark} onPress={() => grant(r)} disabled={!!r?.blockedReason} />
                <MiniAction icon="close" label="Decline" color={PALETTE.textMuted} onPress={() => openDetail(r)} />
              </View>
            ) : null}
          </ConsoleCard>
        );
      })}
    </View>
  );
}

const SuperMembershipScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initial = String(route?.params?.tab || '');
  const [tab, setTab] = useState<Tab>(initial === 'platinum' || initial === 'requests' ? initial : 'plans');
  // The header's Refresh re-runs the open tab's load (each tab owns its data).
  const [nonce, setNonce] = useState(0);

  return (
    <ConsoleScroll>
      <ConsoleHeader
        compact
        eyebrow="Super Admin · membership"
        title="Membership plans"
        subtitle="What a membership costs, and which commencement year earns which plan"
        art={<MembershipBenefits3D size={84} />}
        left={<GlassIconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => navigation?.goBack?.()} />}
        right={<GlassIconButton icon="refresh" accessibilityLabel="Refresh" onPress={() => setNonce((n) => n + 1)} />}
      />
      <ConsoleTabs<Tab>
        value={tab}
        onChange={setTab}
        style={s.tabs}
        options={[{ value: 'plans', label: 'Plans' }, { value: 'platinum', label: 'Platinum' }, { value: 'requests', label: 'Requests' }]}
      />
      <ConsoleNote style={s.noteGapTop} icon="payments" text="An edit here changes what applicants are charged — checkout reads the same plan rows." />
      {tab === 'plans' ? <PlansTab navigation={navigation} nonce={nonce} />
        : tab === 'platinum' ? <PlatinumTab navigation={navigation} nonce={nonce} />
          : <RequestsTab navigation={navigation} nonce={nonce} />}
    </ConsoleScroll>
  );
};

const s = StyleSheet.create({
  tabs: { marginTop: -SPACE.md },
  gap: { marginTop: SPACE.md },
  gapSm: { height: SPACE.md },
  pad: { paddingHorizontal: SPACE.lg, marginBottom: SPACE.md },
  noteGap: { marginHorizontal: SPACE.lg, marginTop: SPACE.sm, marginBottom: SPACE.sm },
  noteGapTop: { marginHorizontal: SPACE.lg, marginTop: SPACE.md },
  searchGap: { marginBottom: SPACE.md },
  section: { marginHorizontal: SPACE.lg, marginTop: SPACE.xl, marginBottom: SPACE.md },
  card: { marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  flexText: { flex: 1, minWidth: 0 },
  flexTextPad: { flex: 1, minWidth: 0, marginHorizontal: SPACE.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginBottom: SPACE.xs },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  planName: { ...TYPE.subheading, fontWeight: '800', flexShrink: 1 },
  muted: { color: PALETTE.textMuted },
  meta: { ...TYPE.caption, marginTop: 3 },
  desc: { fontSize: 13, color: PALETTE.textSoft, marginTop: SPACE.sm, lineHeight: 19 },
  price: { fontSize: 20, fontWeight: '800', color: PALETTE.indigo, maxWidth: '45%' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' },
  empty: { ...TYPE.caption, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  warnTitle: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: PALETTE.amberDark },
  warnItem: { fontSize: 13, color: PALETTE.amberDark, marginTop: 6, lineHeight: 18 },
  warnBody: { ...TYPE.caption, marginTop: SPACE.sm, lineHeight: 17 },
  warnBtn: { marginTop: SPACE.md },
  warnText: { color: PALETTE.amberDark },
  runRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACE.md },
  runDivider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: PALETTE.divider },
  runGap: { backgroundColor: PALETTE.amberSoft, marginHorizontal: -SPACE.sm, paddingHorizontal: SPACE.sm, borderRadius: 10 },
  runYears: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  runRight: { alignItems: 'flex-end', marginLeft: SPACE.md, flexShrink: 1, maxWidth: '50%' },
  runPlan: { fontSize: 13, fontWeight: '700', color: PALETTE.text },
  runPrice: { fontSize: 14, fontWeight: '800', color: PALETTE.indigo, marginTop: 2 },
  runNone: { fontSize: 13, fontWeight: '700', color: PALETTE.amberDark, textAlign: 'right' },
  previewText: { fontSize: 14, color: PALETTE.textSoft, lineHeight: 20, marginTop: SPACE.md },
  bold: { fontWeight: '800', color: PALETTE.text },
  strong: { fontWeight: '800', color: PALETTE.indigoDark },
  searching: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  quote: { fontSize: 13, color: PALETTE.textSoft, backgroundColor: PALETTE.canvasAdmin, borderRadius: 10, padding: SPACE.sm, marginTop: SPACE.sm, lineHeight: 19 },
});

export default SuperMembershipScreen;
