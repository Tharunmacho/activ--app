import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  Screen, AppHeader, Hero, Card, Field, Loading, ErrorState, EmptyState, Badge, SegmentedTabs, Notice, Avatar,
  PrimaryButton, PALETTE, SPACE, RADIUS, SHADOW, money, shortDate, timeAgo,
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
 *             Prices in RUPEES (the server stores paise). Bands are half-open
 *             [minYears, maxYears): the gaps and overlaps are named here, as on
 *             the website, because four rows do not show that nothing covers
 *             8–10 years. Retire, never delete — a paid membership points at
 *             its plan. `showAllPlans` is the one settings switch.
 *   Platinum  granted by hand after the fee is paid at the office; never
 *             bought online. Search → grant (stack screen) → undo.
 *   Requests  members who asked for Platinum: call / WhatsApp, mark contacted,
 *             decline, grant.
 */

type Tab = 'plans' | 'platinum' | 'requests';

const GROUPS: { audience: string; title: string; hint: string; icon: string; color: string }[] = [
  { audience: 'business', title: 'Company plans', hint: 'Ordered by band. An applicant is offered the one their commencement year falls in.', icon: 'business', color: PALETTE.blue },
  { audience: 'aspirant', title: 'Aspirant plan', hint: 'For an applicant planning a business who is not trading yet. No band applies.', icon: 'star', color: PALETTE.green },
  { audience: 'student', title: 'Student plan', hint: 'For an applicant who is studying and not in business. No band applies.', icon: 'school', color: PALETTE.blue },
  { audience: 'platinum', title: 'Platinum plan', hint: 'Lifetime membership, paid offline and granted by the Super Admin. Never offered to applicants online.', icon: 'diamond', color: PALETTE.amber },
];

function PlanCard({ p, thisYear, onEdit, onRestore, onDelete }: {
  p: MembershipPlanRow; thisYear: number; onEdit: () => void; onRestore: () => void; onDelete: () => void;
}) {
  const years = hasBand(p) ? yearWindowLabel(p, thisYear) : '';
  return (
    <View style={[s.plan, SHADOW.card, !p?.active && s.retired]}>
      <View style={s.planTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
            <Text style={[s.planName, !p?.active && { color: PALETTE.textMuted }]} numberOfLines={1}>{p?.name || p?.key}</Text>
            {p?.popular ? <Badge label="Popular" color={PALETTE.blueDark} bg={PALETTE.blueSoft} /> : null}
            {!p?.active ? <Badge label="Retired" status="draft" /> : null}
          </View>
          <Text style={s.planMeta}>{bandLabel(p)}{years ? ` · ${years}` : ''}</Text>
        </View>
        <Text style={s.price}>{money(p?.price)}</Text>
      </View>
      {p?.description ? <Text style={s.planDesc} numberOfLines={3}>{p.description}</Text> : null}
      <View style={s.planActions}>
        <View style={{ flex: 1 }} />
        <MiniAction icon="edit" label="Edit" onPress={onEdit} />
        {!p?.active ? <MiniAction icon="unarchive" label="Offer again" color={PALETTE.green} onPress={onRestore} /> : null}
        <MiniAction icon="delete-outline" label="Delete" color={PALETTE.red} onPress={onDelete} />
      </View>
    </View>
  );
}

function PlansTab({ navigation }: { navigation: any }) {
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
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const plans = useMemo(() => (Array.isArray(data?.plans) ? data?.plans || [] : []), [data]);
  const business = useMemo(() => companyPlans(plans), [plans]);
  const problems = useMemo(() => bandProblems(business), [business]);
  const runs = useMemo(() => yearRanges(business, thisYear), [business, thisYear]);
  const showAll = !!data?.settings?.showAllPlans;

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
    if (!(await confirm('Delete this plan?', `Delete "${p?.name || p?.key || 'this plan'}"? This cannot be undone.`, 'Delete', true))) return;
    try {
      await deleteMembershipPlan(p.key);
      Alert.alert('Deleted', `"${p?.name || p?.key}" deleted`);
      load();
    } catch (err) {
      const message = errorText(err, 'Could not delete this plan');
      if (/cannot be deleted/i.test(message)) {
        if (await confirm('Retire it instead?', message, 'Retire')) {
          try {
            await retireMembershipPlan(p.key);
            Alert.alert('Retired', `"${p?.name || p?.key}" retired — existing records are untouched`);
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
    try { await updateMembershipPlan(p.key, { active: true }); load(); } catch (err) { Alert.alert('Could not save this plan', errorText(err)); }
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
  const edit = (p: MembershipPlanRow) => navigation.navigate('SuperPlanEditor', { planKey: p.key, plan: p });

  if (loading && !data) return <Loading tone="admin" label="Loading plans…" />;
  if (error && !data) return <ErrorState tone="admin" message={error} onRetry={load} />;

  return (
    <View>
      <View style={{ paddingHorizontal: SPACE.lg, marginTop: SPACE.lg }}>
        <PrimaryButton tone="admin" icon="add" label="Add plan" onPress={() => navigation.navigate('SuperPlanEditor')} />
      </View>
      <Card style={{ marginHorizontal: SPACE.lg, marginTop: SPACE.lg }}>
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
      </Card>

      {problems.length ? (
        <View style={[s.warn, SHADOW.card]}>
          <View style={s.row}>
            <Icon name="warning-amber" size={20} color="#92400E" />
            <Text style={s.warnTitle}>These bands leave applicants without a plan</Text>
          </View>
          {problems.map((t, i) => <Text key={i} style={s.warnItem}>• {t}</Text>)}
          <Text style={s.warnBody}>An applicant no band covers is shown every plan instead, and where two bands overlap the cheaper one silently wins — which reads as the rule not working.</Text>
          <PrimaryButton tone="admin" variant="gold" icon="auto-fix-high" label="Make the bands continuous" onPress={align} loading={aligning} style={{ marginTop: SPACE.md }} />
        </View>
      ) : null}

      {GROUPS.map((g) => {
        const rows = g.audience === 'business' ? business : plans.filter((p) => p?.audience === g.audience);
        return (
          <View key={g.audience} style={{ marginTop: SPACE.xl }}>
            <View style={s.groupHead}>
              <Icon name={g.icon} size={18} color={g.color} />
              <Text style={s.groupTitle}>{g.title}</Text>
            </View>
            <Text style={s.groupHint}>{g.hint}</Text>
            {rows.length === 0 ? <Text style={s.groupEmpty}>No plans here yet.</Text> : rows.map((p) => (
              <PlanCard key={p.key} p={p} thisYear={thisYear} onEdit={() => edit(p)} onRestore={() => restore(p)} onDelete={() => remove(p)} />
            ))}
          </View>
        );
      })}

      {runs.length ? (
        <Card style={{ marginHorizontal: SPACE.lg, marginTop: SPACE.xl }}>
          <View style={s.row}>
            <Icon name="date-range" size={20} color={PALETTE.blue} />
            <Text style={[s.groupTitle, { marginLeft: 8 }]}>Commencement year → plan</Text>
          </View>
          <Text style={[s.planMeta, { marginBottom: SPACE.sm }]}>What a company that started in each year is offered today. Every row shifts by one year each January, because the bands are durations.</Text>
          {runs.map((r, i) => (
            <TouchableOpacity key={r.key} activeOpacity={0.7} disabled={!r.plan} onPress={() => { if (r.plan) edit(r.plan); }}
              style={[s.runRow, i < runs.length - 1 && s.runDivider, !r.plan && s.runGap]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.runYears}>{r.years}</Text>
                <Text style={s.planMeta}>{r.duration}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: SPACE.md, flexShrink: 1 }}>
                {r.plan ? (
                  <>
                    <Text style={s.runPlan} numberOfLines={1}>{r.plan.name}</Text>
                    <Text style={s.runPrice}>{money(r.plan.price)}</Text>
                  </>
                ) : (
                  <Text style={s.runNone}>No plan covers these years</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginHorizontal: SPACE.lg, marginTop: SPACE.lg }}>
        <View style={s.row}>
          <Icon name="auto-awesome" size={20} color={PALETTE.blue} />
          <Text style={[s.groupTitle, { marginLeft: 8 }]}>Check a commencement year</Text>
        </View>
        <Text style={[s.planMeta, { marginBottom: SPACE.sm }]}>What an applicant whose company started in this year would be shown.</Text>
        <Field value={previewYear} onChangeText={(t) => setPreviewYear((t || '').replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="e.g. 2021" />
        {preview ? (
          showAll ? (
            <Text style={s.previewText}><Text style={s.bold}>{preview.years} years trading</Text> — and every plan is shown, because the switch at the top of this page is on.</Text>
          ) : preview.matched ? (
            <Text style={s.previewText}><Text style={s.bold}>{preview.years} years trading</Text> → they see <Text style={[s.bold, { color: PALETTE.blueDark }]}>{preview.matched.name}</Text> at <Text style={[s.bold, { color: PALETTE.blueDark }]}>{money(preview.matched.price)}</Text>, and nothing else.</Text>
          ) : (
            <Text style={[s.previewText, { color: '#B45309' }]}><Text style={s.bold}>{preview.years} years trading</Text> — no band covers this, so they would be shown every plan. Fix the bands above.</Text>
          )
        ) : null}
      </Card>
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
    <View style={[s.plan, SHADOW.card]}>
      <View style={s.row}>
        <Avatar name={m?.fullName} size={42} color="#F9FAFB" bg="#374151" />
        <View style={{ flex: 1, minWidth: 0, marginLeft: SPACE.md }}>
          <Text style={s.planName} numberOfLines={1}>{m?.fullName || 'Unnamed member'}</Text>
          {contact ? <Text style={s.planMeta} numberOfLines={1}>{contact}</Text> : null}
          {where ? <Text style={s.planMeta} numberOfLines={1}>{where}</Text> : null}
        </View>
        {isPlat ? <Badge label="Platinum" status="platinum" /> : null}
      </View>
      {!isPlat && m?.blockedReason ? <Text style={[s.planDesc, { color: '#B45309' }]}>{m.blockedReason}</Text> : null}
      {!isPlat && !m?.blockedReason ? (
        <View style={s.planActions}>
          <View style={{ flex: 1 }} />
          <MiniAction icon="diamond" label="Make Platinum" onPress={onGrant} />
        </View>
      ) : null}
    </View>
  );
}

/** One existing Platinum member, with the office receipt and Undo. */
function PlatinumMemberRow({ m, onRevoke }: { m: any; onRevoke: () => void }) {
  const g = m?.platinumGrant || null;
  return (
    <View style={[s.plan, SHADOW.card]}>
      <View style={s.row}>
        <Avatar name={m?.fullName} size={42} color="#F9FAFB" bg="#374151" />
        <View style={{ flex: 1, minWidth: 0, marginLeft: SPACE.md }}>
          <Text style={s.planName} numberOfLines={1}>{m?.fullName || 'Unnamed member'}</Text>
          <Text style={s.planMeta} numberOfLines={1}>{[m?.membershipNumber, m?.email].filter(Boolean).join(' · ') || '—'}</Text>
        </View>
        <Badge label="Platinum" status="platinum" />
      </View>
      {g ? (
        <Text style={s.planDesc}>
          {money(g?.amount)} · {modeLabel(g?.paymentMode)}{g?.receiptNumber ? ` · ${g.receiptNumber}` : ''}{g?.grantedAt ? ` · granted ${shortDate(g.grantedAt)}` : ''}
        </Text>
      ) : null}
      <View style={s.planActions}>
        <View style={{ flex: 1 }} />
        <MiniAction icon="undo" label="Undo" color={PALETTE.red} onPress={onRevoke} />
      </View>
    </View>
  );
}

function PlatinumTab({ navigation }: { navigation: any }) {
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
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    if (!(await confirm('Undo this Platinum grant?', 'Restore their earlier membership and cancel this receipt?', 'Remove', true))) return;
    try {
      await revokePlatinum(m.id);
      Alert.alert('Platinum removed', `Platinum removed from ${m?.fullName || 'the member'}; their earlier membership is restored`);
      load();
    } catch (err) { Alert.alert('Could not remove Platinum', errorText(err)); }
  };

  if (loading && !overview) return <Loading tone="admin" label="Loading Platinum…" />;
  if (error && !overview) return <ErrorState tone="admin" message={error} onRetry={load} />;
  const members: any[] = Array.isArray(overview?.members) ? overview.members : [];
  const price = overview?.plan?.price;

  return (
    <View>
      <Hero
        colors={['#0B1F5C', '#1E3A8A', '#2563EB']}
        eyebrow="PLATINUM LIFETIME MEMBERSHIP"
        title={money(price)}
        subtitle="One payment at the office · never renews · granted here"
        icon="diamond"
        style={{ marginTop: SPACE.lg }}
      >
        <View style={s.heroStats}>
          <View style={s.heroStat}><Text style={s.heroStatValue}>{members.length}</Text><Text style={s.heroStatLabel}>Platinum members</Text></View>
          <View style={s.heroStat}><Icon name="all-inclusive" size={22} color="#FFFFFF" /><Text style={s.heroStatLabel}>Validity</Text></View>
        </View>
        <Text style={s.heroNote}>The price is the Platinum plan on the Plans tab — edit it there. Members see it advertised on their dashboard.</Text>
      </Hero>

      <Text style={s.sectionTitle}>Make a member Platinum</Text>
      <Text style={s.groupHint}>Search by name, email, mobile or Member ID. Their application must be approved.</Text>
      <View style={{ paddingHorizontal: SPACE.lg }}>
        <Field icon="search" placeholder="Start typing a name, email or number…" value={q} onChangeText={setQ}
          autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      </View>
      {searching ? <Loading tone="admin" label="Searching…" /> : term.length >= 2 && results.length === 0 ? (
        <Text style={s.groupEmpty}>No member matches “{term}”.</Text>
      ) : results.map((m) => (
        <CandidateRow key={String(m?.id)} m={m} onGrant={() => navigation.navigate('SuperPlatinumGrant', { member: m, price })} />
      ))}

      <Text style={s.sectionTitle}>Platinum members</Text>
      {members.length === 0 ? (
        <Text style={s.groupEmpty}>No Platinum members yet. Search above to grant the first one.</Text>
      ) : members.map((m) => (
        <PlatinumMemberRow key={String(m?.id)} m={m} onRevoke={() => revoke(m)} />
      ))}
      <View style={s.footnote}>
        <Icon name="verified-user" size={16} color={PALETTE.textMuted} />
        <Text style={s.footnoteText}>Each grant is recorded as a paid membership receipt, so it appears on the member’s 80G certificate and in payment reports.</Text>
      </View>
    </View>
  );
}

const CONTACT_LABEL: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', email: 'Email' };
const STATUS_WORD: Record<string, string> = { new: 'New', contacted: 'Contacted', converted: 'Platinum granted', declined: 'Declined' };
const statusTone = (st?: string) => (st === 'converted' ? 'approved' : st === 'declined' ? 'rejected' : st === 'contacted' ? 'pending' : 'active');

function RequestsTab({ navigation }: { navigation: any }) {
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
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    let alive = true;
    getPlatinumOverview().then((o) => { if (alive) setPrice(o?.plan?.price); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const markContacted = async (r: any) => {
    setBusy(String(r?.id || ''));
    try { await updatePlatinumRequest(String(r?.id || ''), { status: 'contacted' }); Alert.alert('Updated', 'Marked as contacted'); load(); }
    catch (err) { Alert.alert('Could not update the request', errorText(err)); }
    finally { setBusy(''); }
  };
  const grant = (r: any) => {
    if (!r?.memberId) { Alert.alert('Not possible', 'This request is not linked to a member record.'); return; }
    navigation.navigate('SuperPlatinumGrant', { member: { id: r.memberId, fullName: r?.name, email: r?.email, phoneNumber: r?.phone, block: r?.block, district: r?.district, state: r?.state }, price });
  };

  const counts = data?.counts || {};
  const rows: any[] = Array.isArray(data?.requests) ? data?.requests || [] : [];
  return (
    <View>
      <Text style={s.groupHint}>Members who asked to become Platinum. Call them, then grant it once the payment is received.</Text>
      <ChipRow<string>
        options={[
          { value: 'new', label: `New (${counts?.new ?? 0})` },
          { value: 'contacted', label: `Contacted (${counts?.contacted ?? 0})` },
          { value: 'converted', label: `Granted (${counts?.converted ?? 0})` },
          { value: 'declined', label: `Declined (${counts?.declined ?? 0})` },
          { value: 'all', label: `All (${counts?.all ?? 0})` },
        ]}
        value={status}
        onChange={setStatus}
      />
      {loading && !data ? <Loading tone="admin" /> : error ? <ErrorState tone="admin" message={error} onRetry={load} /> : rows.length === 0 ? (
        <EmptyState tone="admin" icon="contact-phone" title={status === 'new' ? 'No new requests' : 'Nothing here yet'}
          message={status === 'new' ? 'When a member presses “Apply for Platinum”, it appears here and the office is emailed.' : undefined} />
      ) : rows.map((r) => {
        const open = r?.status === 'new' || r?.status === 'contacted';
        const region = place(r?.block, r?.district, r?.state);
        return (
          <View key={String(r?.id)} style={[s.plan, SHADOW.card]}>
            <View style={s.row}>
              <Avatar name={r?.name} size={42} color="#BE185D" bg="#FCE7F3" />
              <View style={{ flex: 1, minWidth: 0, marginLeft: SPACE.md }}>
                <Text style={s.planName} numberOfLines={1}>{r?.name || 'Member'}</Text>
                <Text style={s.planMeta}>{shortDate(r?.createdAt)}{r?.createdAt ? ` · ${timeAgo(r.createdAt)}` : ''}</Text>
              </View>
              <Badge label={STATUS_WORD[r?.status] || String(r?.status || 'New')} status={statusTone(r?.status)} />
            </View>
            <Text style={s.planMeta}>Prefers {CONTACT_LABEL[r?.preferredContact] || 'a call'}{r?.preferredTime ? ` · ${r.preferredTime}` : ''}</Text>
            {region ? <Text style={s.planMeta} numberOfLines={1}>{region}</Text> : null}
            {r?.companyName ? <Text style={s.planMeta} numberOfLines={1}>{r.companyName}</Text> : null}
            {r?.phone ? <Text style={s.planMeta}>{r.phone}</Text> : null}
            {r?.email ? <Text style={s.planMeta} numberOfLines={1}>{r.email}</Text> : null}
            {r?.handledBy ? <Text style={s.planMeta}>{r.handledBy} · {shortDate(r?.handledAt)}</Text> : null}
            {r?.message ? <Text style={s.quote}>“{r.message}”</Text> : null}
            {r?.notes ? <Text style={s.planMeta}>Note: {r.notes}</Text> : null}
            {open && r?.blockedReason ? <Text style={[s.planDesc, { color: '#B45309' }]}>{r.blockedReason}</Text> : null}
            <View style={s.planActions}>
              <MiniAction icon="call" label="Call" onPress={() => callNumber(r?.phone)} disabled={!r?.phone} />
              <MiniAction icon="chat" label="WhatsApp" color={PALETTE.green} onPress={() => whatsappNumber(r?.phone, `Hello ${r?.name || ''}, this is the ACTIV office about your Platinum membership request.`)} disabled={!r?.phone} />
              <MiniAction icon="email" label="Email" color={PALETTE.textSoft} onPress={() => openUrl(r?.email ? `mailto:${r.email}?subject=${encodeURIComponent('Your ACTIV Platinum membership request')}` : '')} disabled={!r?.email} />
              <MiniAction icon="description" label="View full details" onPress={() => navigation.navigate('SuperPlatinumRequest', { id: r?.id, blockedReason: r?.blockedReason || '' })} />
            </View>
            {open ? (
              <View style={s.planActions}>
                {r?.status === 'new' ? <MiniAction icon="done" label={busy === r?.id ? 'Saving…' : 'Mark contacted'} onPress={() => markContacted(r)} disabled={!!busy} /> : null}
                <MiniAction icon="diamond" label="Grant Platinum" color={PALETTE.blueDark} onPress={() => grant(r)} disabled={!!r?.blockedReason} />
                <MiniAction icon="close" label="Decline" color={PALETTE.textMuted} onPress={() => navigation.navigate('SuperPlatinumRequest', { id: r?.id, blockedReason: r?.blockedReason || '' })} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const SuperMembershipScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [tab, setTab] = useState<Tab>((route?.params?.tab as Tab) || 'plans');

  return (
    <Screen tone="admin">
      <AppHeader tone="admin" title="Membership Plans" subtitle="What a membership costs, and which commencement year earns which plan" onBack={() => navigation.goBack()} />
      <Notice kind="info" text="An edit here changes what applicants are charged — checkout reads the same plan rows." />
      <SegmentedTabs<Tab>
        tone="admin"
        value={tab}
        onChange={setTab}
        options={[{ value: 'plans', label: 'Plans' }, { value: 'platinum', label: 'Platinum' }, { value: 'requests', label: 'Requests' }]}
      />
      {tab === 'plans' ? <PlansTab navigation={navigation} /> : tab === 'platinum' ? <PlatinumTab navigation={navigation} /> : <RequestsTab navigation={navigation} />}
    </Screen>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  plan: { backgroundColor: PALETTE.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: PALETTE.border, padding: SPACE.lg, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  retired: { backgroundColor: '#F8FAFC' },
  planTop: { flexDirection: 'row', alignItems: 'flex-start' },
  planName: { fontSize: 16, fontWeight: '800', color: PALETTE.text, flexShrink: 1 },
  planMeta: { fontSize: 12, color: PALETTE.textMuted, marginTop: 3 },
  planDesc: { fontSize: 13, color: PALETTE.textSoft, marginTop: SPACE.sm, lineHeight: 19 },
  price: { fontSize: 20, fontWeight: '800', color: PALETTE.indigo, marginLeft: SPACE.md },
  planActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACE.md, flexWrap: 'wrap' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACE.lg },
  groupTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.text },
  groupHint: { fontSize: 12, color: PALETTE.textMuted, lineHeight: 17, marginHorizontal: SPACE.lg, marginTop: 4, marginBottom: SPACE.md },
  groupEmpty: { fontSize: 13, color: PALETTE.textMuted, marginHorizontal: SPACE.lg, marginBottom: SPACE.md },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.text, marginHorizontal: SPACE.lg, marginTop: SPACE.xl },
  warn: { backgroundColor: PALETTE.amberSoft, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#FCD34D', padding: SPACE.lg, marginHorizontal: SPACE.lg, marginTop: SPACE.lg },
  warnTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginLeft: 8, flex: 1 },
  warnItem: { fontSize: 13, color: '#B45309', marginTop: 6, lineHeight: 18 },
  warnBody: { fontSize: 12, color: '#B45309', marginTop: SPACE.sm, lineHeight: 17 },
  runRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACE.md },
  runDivider: { borderBottomWidth: 1, borderBottomColor: PALETTE.border },
  runGap: { backgroundColor: PALETTE.amberSoft, marginHorizontal: -SPACE.sm, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.sm },
  runYears: { fontSize: 14, fontWeight: '800', color: PALETTE.text },
  runPlan: { fontSize: 13, fontWeight: '700', color: PALETTE.text },
  runPrice: { fontSize: 14, fontWeight: '800', color: PALETTE.text, marginTop: 2 },
  runNone: { fontSize: 13, fontWeight: '700', color: '#B45309', textAlign: 'right' },
  previewText: { fontSize: 14, color: PALETTE.textSoft, lineHeight: 20, marginTop: SPACE.sm },
  bold: { fontWeight: '800', color: PALETTE.text },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: SPACE.md },
  heroStat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, paddingVertical: SPACE.sm },
  heroStatValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: SPACE.md, lineHeight: 17 },
  footnote: { flexDirection: 'row', gap: 8, marginHorizontal: SPACE.lg, marginTop: SPACE.sm, alignItems: 'flex-start' },
  footnoteText: { flex: 1, fontSize: 12, color: PALETTE.textMuted, lineHeight: 17 },
  quote: { fontSize: 13, color: PALETTE.textSoft, backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.sm, lineHeight: 19 },
});

export default SuperMembershipScreen;
