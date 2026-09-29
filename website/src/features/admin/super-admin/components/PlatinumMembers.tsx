import { useCallback, useEffect, useMemo, useState } from 'react';
import PlatinumRequestDetails from './PlatinumRequestDetails';
import {
    Crown, Search, Loader2, Check, Undo2, X, ShieldCheck, Infinity as InfinityIcon, Receipt,
    Phone, MessageCircle, Mail, Inbox, PhoneCall, Building2, MapPin, Clock, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/activApi';
import { PlatinumBadge } from '@/components/shared/Platinum';
import {
    getPlatinumOverview, searchPlatinumCandidates, grantPlatinum, revokePlatinum,
    PAYMENT_MODE_LABEL, type PlatinumCandidate, type PlatinumPaymentMode, type PlatinumOverview,
    listPlatinumRequests, updatePlatinumRequest, type PlatinumRequest, type PlatinumRequestStatus,
} from '@/services/platinumApi';

/**
 * PLATINUM LIFETIME MEMBERS — granted here, paid at the office.
 *
 * The fee (₹2,00,000 by default — the `platinum` plan row above) is taken in
 * cash, cheque or transfer and never through the online checkout. The Super
 * Admin finds the member, records the receipt and grants; the member's
 * membership becomes lifetime (no renewal, ever) with a Platinum badge on their
 * dashboard and certificate. Only an approved applicant or an existing member
 * can be granted — the server says why when not.
 *
 * Inline panels rather than a dialog (RULE 2 / the phone standard).
 */

const rupees = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (v?: string | null) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const today = () => new Date().toISOString().slice(0, 10);
const region = (m: PlatinumCandidate) => [m.block, m.district, m.state].filter(Boolean).join(', ');

function GrantForm({ member, price, onDone, onCancel }: {
    member: PlatinumCandidate; price: number; onDone: (m: PlatinumCandidate) => void; onCancel: () => void;
}) {
    const [amount, setAmount] = useState(String(price || ''));
    const [mode, setMode] = useState<PlatinumPaymentMode>('cash');
    const [receipt, setReceipt] = useState('');
    const [receivedOn, setReceivedOn] = useState(today());
    const [note, setNote] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value < 0) { toast.error('Enter the amount received'); return; }
        if (!confirmed) { toast.error('Tick the box to confirm the payment was received'); return; }
        setBusy(true);
        try {
            const updated = await grantPlatinum(member.id, {
                amount: value, paymentMode: mode, receiptNumber: receipt.trim(), receivedOn, note: note.trim(),
            });
            toast.success(`${member.fullName || 'The member'} is now a Platinum lifetime member`);
            onDone(updated);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not grant Platinum'));
        } finally {
            setBusy(false);
        }
    };

    const field = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

    return (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
            <p className="flex items-center gap-2 text-[1.125rem] font-semibold text-slate-800">
                <Receipt className="h-4 w-4 text-blue-700" /> Record the payment received at the office
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0 text-[1.0625rem] font-semibold text-slate-700">Amount received (₹)
                    <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className={field} />
                </label>
                <label className="block min-w-0 text-[1.0625rem] font-semibold text-slate-700">Paid by
                    <select value={mode} onChange={(e) => setMode(e.target.value as PlatinumPaymentMode)} className={field}>
                        {(Object.keys(PAYMENT_MODE_LABEL) as PlatinumPaymentMode[]).map((k) => (
                            <option key={k} value={k}>{PAYMENT_MODE_LABEL[k]}</option>
                        ))}
                    </select>
                </label>
                <label className="block min-w-0 text-[1.0625rem] font-semibold text-slate-700">Receipt / cheque / UTR no.
                    <input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Optional" className={field} />
                </label>
                <label className="block min-w-0 text-[1.0625rem] font-semibold text-slate-700">Received on
                    <input type="date" value={receivedOn} max={today()} onChange={(e) => setReceivedOn(e.target.value)} className={field} />
                </label>
                <label className="block min-w-0 text-[1.0625rem] font-semibold text-slate-700 sm:col-span-2">Note
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional — e.g. received at the Chennai office" className={field} />
                </label>
            </div>
            {Number(amount) !== Number(price) && amount !== '' ? (
                <p className="mt-2 text-[1rem] text-amber-700">
                    This differs from the Platinum price of {rupees(price)}. That is allowed — the amount received is what is recorded.
                </p>
            ) : null}
            <label className="mt-3 flex items-start gap-2 text-[1.125rem] text-slate-700">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" />
                <span>I confirm {rupees(Number(amount) || 0)} has been received from <strong>{member.fullName || 'this member'}</strong>.
                    Their membership becomes lifetime and never needs renewing.</span>
            </label>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancel} disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700">
                    <X className="h-4 w-4" /> Cancel
                </button>
                <button type="button" onClick={submit} disabled={busy || !confirmed}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-60">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Grant Platinum
                </button>
            </div>
        </div>
    );
}

const CONTACT_LABEL: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', email: 'Email' };
const STATUS_CHIP: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    contacted: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    converted: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    declined: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};
const STATUS_WORD: Record<string, string> = { new: 'New', contacted: 'Contacted', converted: 'Platinum granted', declined: 'Declined' };
const digits = (v: string) => String(v || '').replace(/\D/g, '');
const waNumber = (v: string) => { const d = digits(v); return d.length === 10 ? `91${d}` : d; };

/**
 * PLATINUM REQUESTS — members who pressed "Apply for Platinum".
 *
 * The office and every Super Admin are emailed the moment one arrives; this
 * is the queue to work through: call them, mark contacted, and once the fee
 * is received grant it here — which closes the request by itself.
 */
function PlatinumRequests({ price, onGranted }: { price: number; onGranted: () => void }) {
    const [tab, setTab] = useState<'new' | 'contacted' | 'all'>('new');
    const [rows, setRows] = useState<PlatinumRequest[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({ new: 0, contacted: 0, all: 0 });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [granting, setGranting] = useState('');
    const [declining, setDeclining] = useState('');
    const [note, setNote] = useState('');
    /** The request whose full member record is open. */
    const [detailsFor, setDetailsFor] = useState('');

    const load = useCallback(async () => {
        try {
            const r = await listPlatinumRequests(tab === 'all' ? 'all' : tab);
            setRows(r.requests || []);
            setCounts(r.counts || {});
        } catch (err) {
            toast.error(errorMessage(err, 'Could not load Platinum requests'));
        } finally {
            setLoading(false);
        }
    }, [tab]);
    useEffect(() => { setLoading(true); load(); }, [load]);

    const setStatus = async (r: PlatinumRequest, status: PlatinumRequestStatus, notes?: string) => {
        setBusy(r.id);
        try {
            await updatePlatinumRequest(r.id, { status, ...(notes !== undefined ? { notes } : {}) });
            toast.success(status === 'contacted' ? 'Marked as contacted' : status === 'declined' ? 'Request declined' : 'Updated');
            setDeclining(''); setNote('');
            load();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the request'));
        } finally {
            setBusy('');
        }
    };

    const TABS: { key: 'new' | 'contacted' | 'all'; label: string }[] = [
        { key: 'new', label: 'New' }, { key: 'contacted', label: 'Contacted' }, { key: 'all', label: 'All' },
    ];

    return (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-display text-[1.5rem] font-semibold text-slate-900">
                        <Inbox className="h-5 w-5 text-blue-700" /> Platinum requests
                    </h3>
                    <p className="text-[1.0625rem] text-slate-500">Members who asked to become Platinum. Call them, then grant it once the payment is received.</p>
                </div>
                <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                    {TABS.map((t) => (
                        <button key={t.key} type="button" onClick={() => setTab(t.key)}
                            className={`min-h-10 rounded-lg px-3 text-[1.0625rem] font-semibold ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {t.label}{typeof counts[t.key] === 'number' ? <span className="ml-1.5 opacity-80">{counts[t.key]}</span> : null}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="mt-4 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
            ) : rows.length === 0 ? (
                <p className="mt-4 rounded-xl bg-white p-4 text-[1.0625rem] text-slate-500 ring-1 ring-slate-100">
                    {tab === 'new' ? 'No new requests. When a member presses “Apply for Platinum”, it appears here and the office is emailed.' : 'Nothing here yet.'}
                </p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {rows.map((r) => {
                        const regionText = [r.block, r.district, r.state].filter(Boolean).join(', ');
                        const openRow = r.status === 'new' || r.status === 'contacted';
                        return (
                            <li key={r.id} className="rounded-2xl bg-white p-3 sm:p-4 ring-1 ring-slate-200">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-[1.1875rem] font-semibold text-slate-900">{r.name || 'Member'}</span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[0.9375rem] font-semibold ${STATUS_CHIP[r.status] || STATUS_CHIP.new}`}>
                                                {STATUS_WORD[r.status] || r.status}
                                            </span>
                                            <span className="text-[0.9375rem] text-slate-400">{day(r.createdAt)}</span>
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {r.phone ? (
                                                <a href={`tel:${digits(r.phone)}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 text-[1rem] font-semibold text-blue-700 hover:bg-blue-100">
                                                    <Phone className="h-4 w-4" /> {r.phone}
                                                </a>
                                            ) : null}
                                            {r.phone ? (
                                                <a href={`https://wa.me/${waNumber(r.phone)}`} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-[1rem] font-semibold text-emerald-700 hover:bg-emerald-100">
                                                    <MessageCircle className="h-4 w-4" /> WhatsApp
                                                </a>
                                            ) : null}
                                            {r.email ? (
                                                <a href={`mailto:${r.email}?subject=${encodeURIComponent('Your ACTIV Platinum membership request')}`}
                                                    className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 text-[1rem] font-semibold text-slate-700 hover:bg-slate-100">
                                                    <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{r.email}</span>
                                                </a>
                                            ) : null}
                                            <button type="button" aria-expanded={detailsFor === r.id}
                                                onClick={() => setDetailsFor(detailsFor === r.id ? '' : r.id)}
                                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-[1rem] font-semibold text-blue-700 hover:bg-blue-50">
                                                <FileText className="h-4 w-4" /> {detailsFor === r.id ? 'Hide details' : 'View full details'}
                                            </button>
                                        </div>
                                        <dl className="mt-2 grid gap-x-4 gap-y-1 text-[1rem] text-slate-600 sm:grid-cols-2">
                                            <div className="flex min-w-0 items-center gap-1.5"><PhoneCall className="h-4 w-4 shrink-0 text-slate-400" />
                                                <span className="truncate">Prefers {CONTACT_LABEL[r.preferredContact] || 'a call'}{r.preferredTime ? ` · ${r.preferredTime}` : ''}</span></div>
                                            {regionText ? <div className="flex min-w-0 items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{regionText}</span></div> : null}
                                            {r.companyName ? <div className="flex min-w-0 items-center gap-1.5"><Building2 className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{r.companyName}</span></div> : null}
                                            {r.handledBy ? <div className="flex min-w-0 items-center gap-1.5"><Clock className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{r.handledBy} · {day(r.handledAt)}</span></div> : null}
                                        </dl>
                                        {r.message ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[1rem] text-slate-700 [overflow-wrap:anywhere]">“{r.message}”</p> : null}
                                        {r.notes ? <p className="mt-1 text-[0.9375rem] text-slate-500 [overflow-wrap:anywhere]">Note: {r.notes}</p> : null}
                                    </div>

                                    {openRow && granting !== r.id && declining !== r.id ? (
                                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:w-52">
                                            {r.status === 'new' ? (
                                                <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, 'contacted')}
                                                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 font-semibold text-blue-700 hover:bg-blue-50">
                                                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark contacted
                                                </button>
                                            ) : null}
                                            <button type="button" onClick={() => setGranting(r.id)} disabled={!!r.blockedReason}
                                                title={r.blockedReason || undefined}
                                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 font-semibold text-white disabled:opacity-50">
                                                <Crown className="h-4 w-4" /> Grant Platinum
                                            </button>
                                            <button type="button" onClick={() => { setDeclining(r.id); setNote(''); }}
                                                className="min-h-10 rounded-xl px-3 font-semibold text-slate-500 hover:bg-slate-50">Decline</button>
                                            {r.blockedReason ? <p className="text-[0.9375rem] text-amber-700">{r.blockedReason}</p> : null}
                                        </div>
                                    ) : null}
                                </div>

                                {detailsFor === r.id ? <PlatinumRequestDetails requestId={r.id} /> : null}

                                {declining === r.id ? (
                                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional, for your records)"
                                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[1.0625rem] outline-none focus:border-blue-500" />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setDeclining('')} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-600">Keep</button>
                                            <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, 'declined', note.trim())}
                                                className="min-h-10 flex-1 rounded-xl bg-slate-700 px-3 font-semibold text-white">Decline</button>
                                        </div>
                                    </div>
                                ) : null}

                                {granting === r.id ? (
                                    <GrantForm
                                        member={{ id: r.memberId, fullName: r.name } as PlatinumCandidate}
                                        price={price}
                                        onCancel={() => setGranting('')}
                                        onDone={() => { setGranting(''); load(); onGranted(); }}
                                    />
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function PlatinumMembers() {
    const [overview, setOverview] = useState<PlatinumOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [results, setResults] = useState<PlatinumCandidate[]>([]);
    const [searching, setSearching] = useState(false);
    const [granting, setGranting] = useState<string>('');
    const [undoing, setUndoing] = useState<string>('');
    const [undoBusy, setUndoBusy] = useState(false);

    const load = useCallback(async () => {
        try { setOverview(await getPlatinumOverview()); }
        catch (err) { toast.error(errorMessage(err, 'Could not load Platinum members')); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Debounced search — one request per pause in typing.
    useEffect(() => {
        const text = q.trim();
        if (text.length < 2) { setResults([]); return undefined; }
        let cancelled = false;
        setSearching(true);
        const t = window.setTimeout(async () => {
            try { const r = await searchPlatinumCandidates(text); if (!cancelled) setResults(r || []); }
            catch { if (!cancelled) setResults([]); }
            finally { if (!cancelled) setSearching(false); }
        }, 300);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [q]);

    const price = overview?.plan?.price || 200000;
    const members = useMemo(() => overview?.members || [], [overview]);

    const onGranted = (m: PlatinumCandidate) => {
        setGranting('');
        setResults((rs) => rs.map((r) => (r.id === m.id ? m : r)));
        load();
    };

    const undo = async (m: PlatinumCandidate) => {
        setUndoBusy(true);
        try {
            await revokePlatinum(m.id);
            toast.success(`Platinum removed from ${m.fullName || 'the member'}; their earlier membership is restored`);
            setUndoing('');
            load();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not remove Platinum'));
        } finally {
            setUndoBusy(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            {/* ---- the offer ---- */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1f5c] via-[#1e3a8a] to-[#2563eb] p-4 sm:p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[1rem] font-semibold uppercase tracking-[0.18em] text-[#f8e7b0]">
                            <Crown className="h-4 w-4" /> Platinum lifetime membership
                        </p>
                        <p className="mt-1 font-display text-[2rem] sm:text-[2.5rem] font-bold">{rupees(price)}</p>
                        <p className="text-[1.125rem] text-white/75">One payment at the office · never renews · granted here</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-xl bg-white/10 px-3 py-2">
                            <p className="font-display text-[1.625rem] font-bold">{loading ? '—' : members.length}</p>
                            <p className="text-[1.125rem] text-white/70">Platinum members</p>
                        </div>
                        <div className="rounded-xl bg-white/10 px-3 py-2">
                            <p className="grid place-items-center"><InfinityIcon className="h-6 w-6" /></p>
                            <p className="text-[1.125rem] text-white/70">Validity</p>
                        </div>
                    </div>
                </div>
                <p className="mt-3 text-[1rem] text-white/60">
                    The price is the Platinum plan in the list above — edit it there. Members see it advertised on their dashboard.
                </p>
            </div>

            {/* ---- who asked ---- */}
            <PlatinumRequests price={price} onGranted={load} />

            {/* ---- grant ---- */}
            <div className="mt-5">
                <h3 className="font-display text-[1.5rem] font-semibold text-slate-900">Make a member Platinum</h3>
                <p className="text-[1.125rem] text-slate-500">Search by name, email, mobile or Member ID. Their application must be approved.</p>
                <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing a name, email or number…"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-[1.125rem] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" /> : null}
                </div>

                {q.trim().length >= 2 && !searching && results.length === 0 ? (
                    <p className="mt-3 text-[1.125rem] text-slate-500">No member matches “{q.trim()}”.</p>
                ) : null}

                <ul className="mt-3 space-y-2">
                    {results.map((m) => (
                        <li key={m.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                                        <span className="truncate">{m.fullName || 'Unnamed member'}</span>
                                        {m.membershipTier === 'platinum' ? <PlatinumBadge size="sm" /> : null}
                                    </p>
                                    <p className="truncate text-[1.0625rem] text-slate-500">{[m.email, m.phoneNumber].filter(Boolean).join(' · ')}</p>
                                    <p className="truncate text-[1rem] text-slate-400">{[m.membershipNumber, region(m)].filter(Boolean).join(' · ')}</p>
                                </div>
                                {m.membershipTier === 'platinum' ? (
                                    <span className="inline-flex items-center gap-1 text-[1.0625rem] font-semibold text-emerald-700"><Check className="h-4 w-4" /> Platinum</span>
                                ) : m.blockedReason ? (
                                    <span className="text-[1.0625rem] text-amber-700 sm:max-w-[16rem] sm:text-right">{m.blockedReason}</span>
                                ) : granting === m.id ? null : (
                                    <button type="button" onClick={() => setGranting(m.id)}
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 font-semibold text-white sm:w-auto">
                                        <Crown className="h-4 w-4" /> Make Platinum
                                    </button>
                                )}
                            </div>
                            {granting === m.id ? (
                                <GrantForm member={m} price={price} onDone={onGranted} onCancel={() => setGranting('')} />
                            ) : null}
                        </li>
                    ))}
                </ul>
            </div>

            {/* ---- the list ---- */}
            <div className="mt-6">
                <h3 className="font-display text-[1.5rem] font-semibold text-slate-900">Platinum members</h3>
                {loading ? (
                    <p className="mt-3 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
                ) : members.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-[1.125rem] text-slate-500">
                        No Platinum members yet. Search above to grant the first one.
                    </p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {members.map((m) => (
                            <li key={m.id} className="rounded-xl border border-slate-200 p-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                                            <span className="truncate">{m.fullName || 'Unnamed member'}</span><PlatinumBadge size="sm" />
                                        </p>
                                        <p className="truncate text-[1.0625rem] text-slate-500">{[m.membershipNumber, m.email].filter(Boolean).join(' · ')}</p>
                                        {m.platinumGrant ? (
                                            <p className="text-[1rem] text-slate-500">
                                                {rupees(m.platinumGrant.amount)} · {PAYMENT_MODE_LABEL[m.platinumGrant.paymentMode as PlatinumPaymentMode] || 'Paid'}
                                                {m.platinumGrant.receiptNumber ? ` · ${m.platinumGrant.receiptNumber}` : ''}
                                                {' · '}granted {day(m.platinumGrant.grantedAt)}
                                            </p>
                                        ) : null}
                                    </div>
                                    {undoing === m.id ? (
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <span className="text-[1rem] text-slate-600 sm:max-w-[15rem]">Restore their earlier membership and cancel this receipt?</span>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setUndoing('')} disabled={undoBusy}
                                                    className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700">Keep</button>
                                                <button type="button" onClick={() => undo(m)} disabled={undoBusy}
                                                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 font-semibold text-white">
                                                    {undoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setUndoing(m.id)}
                                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[1.125rem] font-semibold text-slate-600 hover:bg-slate-50">
                                            <Undo2 className="h-4 w-4" /> Undo
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-3 flex items-start gap-2 text-[1rem] text-slate-500">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    Each grant is recorded as a paid membership receipt, so it appears on the member’s 80G certificate and in payment reports.
                </p>
            </div>
        </section>
    );
}
