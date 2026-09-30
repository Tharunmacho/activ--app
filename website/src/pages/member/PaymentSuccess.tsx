<<<<<<< HEAD
import { createPortal } from 'react-dom';
/**
 * Payment Successful — and, at `?view=receipt`, the same payment as a receipt.
 *
 * A STANDALONE PAGE. No member rail: this is a moment, not a place a member
 * navigates around in, and the rail beside a celebration read as the dashboard
 * with a banner on it. `MemberPageShell` with `sidebar={false}` gives the slim
 * top bar and a Back button — the only way out a confirmation needs.
 *
 * Every value is read back from the server rather than passed through the
 * navigation. A receipt assembled from whatever the previous screen held is a
 * receipt for what the client *thinks* it bought; this one shows what was
 * recorded, which is the only version worth printing.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowRight, Award, BadgeCheck, CalendarDays, Check, Copy, CreditCard, Hash,
    LayoutDashboard, Loader2, MailCheck, Printer, ReceiptText, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { getMyProfile } from '@/services/activApi';
import { getUserApplication } from '@/services/applicationApi';
import { formatApplicationRef } from '@/lib/applicationRef';

const GRADIENT = 'bg-gradient-to-br from-[#0b1f5c] via-[#1e3a8a] to-[#2563eb]';

const money = (n: unknown): string => {
    const value = Number(n);
    if (!Number.isFinite(value) || value <= 0) return '—';
    return `₹${value.toLocaleString('en-IN')}`;
};

const formatDate = (value?: string | Date | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const titleCase = (s: string) => (s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Confetti pieces for the hero — positions fixed so the render is stable. */
const CONFETTI = [
    { l: '8%', d: '0s', c: '#93c5fd' }, { l: '18%', d: '.4s', c: '#fde68a' }, { l: '29%', d: '.9s', c: '#bfdbfe' },
    { l: '41%', d: '.2s', c: '#a7f3d0' }, { l: '55%', d: '.7s', c: '#fde68a' }, { l: '66%', d: '.3s', c: '#93c5fd' },
    { l: '77%', d: '1s', c: '#bfdbfe' }, { l: '88%', d: '.5s', c: '#a7f3d0' }, { l: '94%', d: '1.2s', c: '#fde68a' },
];

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const location = useLocation();
=======
/**
 * Payment Successful — the website's version of the mobile screen.
 *
 * Ported from `frontend/src/screens/payment/PaymentSuccessScreen.tsx`: the
 * celebration hero with its PAYMENT CONFIRMED badge and Total Paid pill, the
 * membership receipt card as a four-cell grid over a transaction reference box,
 * the Member Documents pair, the confirmation note, and the dashboard CTA.
 *
 * Every value is read back from the server rather than passed through the
 * navigation. A receipt assembled from whatever the previous screen happened to
 * hold is a receipt for what the client *thinks* it bought; this one shows what
 * was actually recorded, which is the only version worth printing.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { toast } from 'sonner';
import { BIZ_DETAIL_LABEL, BIZ_DETAIL_VALUE } from '@/components/layout/surface';
import { ArrowRight, Award, BadgeCheck, LayoutDashboard, Loader2, MailCheck, Printer, Receipt, ReceiptText } from 'lucide-react';
import { getMyProfile, getCertificate, errorMessage } from '@/services/activApi';
import { getUserApplication } from '@/services/applicationApi';
import { formatApplicationRef } from '@/lib/applicationRef';
import { PALETTE, KitCard } from '@/features/member/memberScreenKit';

import { PAGE_TITLE, CARD_TITLE } from '@/components/layout/appTypography';
const rupees = (n: unknown) => {
    const value = Number(n || 0);
    return value > 0 ? `₹${value.toLocaleString('en-IN')}` : '—';
};

const formatDate = (value?: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** A year on from activation — the validity mobile prints. */
const validityFrom = (value?: string | null): string => {
    if (!value) return '1 Year';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '1 Year';
    d.setFullYear(d.getFullYear() + 1);
    return `Valid till ${formatDate(d.toISOString())}`;
};

export default function PaymentSuccess() {
    const navigate = useNavigate();
>>>>>>> 8020f5d (Initial commit for website frontend)
    const [searchParams] = useSearchParams();
    const [profile, setProfile] = useState<any>(null);
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
<<<<<<< HEAD
    const [copied, setCopied] = useState(false);

    const isReceipt = searchParams.get('view') === 'receipt';
    /* Set by the payment screen when this payment RENEWED an existing membership. */
    const renewed = !isReceipt && (location.state as any)?.renewed === true;
=======
>>>>>>> 8020f5d (Initial commit for website frontend)

    const load = useCallback(async () => {
        const [p, a] = await Promise.allSettled([getMyProfile(), getUserApplication()]);
        setProfile(p.status === 'fulfilled' ? p.value : null);
        setApplication(a.status === 'fulfilled' ? a.value : null);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        /*
<<<<<<< HEAD
         * ONLY WHEN A PAYMENT ACTUALLY JUST HAPPENED. The dashboards gate on
         * membership, so arriving from the gateway must tell them it moved.
         * Opening the same page as a RECEIPT is not that event.
=======
         * ONLY WHEN A PAYMENT ACTUALLY JUST HAPPENED.
         *
         * The dashboards and the sidebar gate on membership, so arriving here
         * from the gateway has to tell them it moved. Opening the same screen
         * as a RECEIPT is not that event — announcing a completed payment
         * every time somebody looks up what they paid would have the whole
         * member area refetch itself, and any listener that reacts to it
         * (a toast, a redirect) fire on a page view.
>>>>>>> 8020f5d (Initial commit for website frontend)
         */
        if (searchParams.get('view') === 'receipt') return;
        window.dispatchEvent(new CustomEvent('paymentCompleted'));
        window.dispatchEvent(new Event('profileUpdated'));
    }, [load, searchParams]);

<<<<<<< HEAD
    const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/member/documents'));

    const shellProps = {
        title: isReceipt ? 'Payment receipt' : 'Payment successful',
        subtitle: isReceipt ? 'Your membership fee, as recorded' : renewed ? 'Your membership is renewed' : 'Your membership is now active',
        width: 'standard' as const,
        sidebar: false,
        backTo: isReceipt ? '/member/documents' : '/payment/member-dashboard',
        onBack: isReceipt ? goBack : () => navigate('/payment/member-dashboard'),
=======
    /**
     * Open a certificate.
     *
     * `getCertificate` throws on a 403 rather than resolving empty, and that
     * refusal is the answer the member needs — a membership that is not active
     * yet cannot produce a certificate, and showing a blank one instead of the
     * reason helps nobody.
     */
    const openCertificate = async (kind: 'membership' | 'tax-exemption') => {
        try {
            const cert = await getCertificate(kind);
            const url = (cert as any)?.url || (cert as any)?.downloadUrl || '';
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            else toast.info('Your certificate is being prepared and will be emailed to you.');
        } catch (err) {
            toast.error(errorMessage(err, 'That certificate is not available yet.'));
        }
>>>>>>> 8020f5d (Initial commit for website frontend)
    };

    if (loading) {
        return (
<<<<<<< HEAD
            <MemberPageShell {...shellProps}>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
=======
            <MemberPageShell title="Payment Successful" width="wide" sidebar={false} backTo="/payment/member-dashboard">
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: PALETTE.primary }} />
>>>>>>> 8020f5d (Initial commit for website frontend)
                </div>
            </MemberPageShell>
        );
    }

<<<<<<< HEAD
    /* ------------------------------------------------------------ the facts */
    const memberName = String(profile?.fullName || application?.fullName || '');
    const firstName = memberName.split(' ').filter(Boolean)[0] || 'member';
    const memberId = String(profile?.membershipNumber || profile?.memberCode || formatApplicationRef(application).short || '');
    const kind = String(profile?.memberType || application?.memberType || '').toLowerCase();
    const kindLabel = kind === 'student' ? 'Student' : kind === 'aspirant' ? 'Aspirant' : kind === 'business' ? 'Business' : '';
    const platinum = String(profile?.membershipTier || '').toLowerCase() === 'platinum';
    const typeRaw = String(profile?.membershipType || '').toLowerCase();
    const lifetime = platinum || typeRaw === 'lifetime';
    const planName = platinum ? 'Platinum Lifetime' : [kindLabel, 'membership'].filter(Boolean).join(' ') || 'ACTIV membership';
    const period = lifetime ? 'Lifetime' : typeRaw === 'annual' ? 'Annual' : '';
    const paidAt = profile?.lastPaymentDate || profile?.membershipActivatedAt || null;
    const amount = profile?.lastPaymentAmount ?? profile?.paymentAmount;
    const txnRef = String(profile?.paymentId || '');
    const method = String(profile?.paymentMethod || '');

    const validUntil = (() => {
        if (lifetime) return 'Lifetime — no renewal';
        if (profile?.membershipExpiresAt) return formatDate(profile.membershipExpiresAt);
        const start = profile?.membershipActivatedAt || paidAt;
        if (!start) return '';
        const d = new Date(start);
        if (Number.isNaN(d.getTime())) return '';
        d.setFullYear(d.getFullYear() + 1);
        return formatDate(d);
    })();

    const copyRef = async () => {
        try {
            await navigator.clipboard.writeText(txnRef);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error('Could not copy — select the reference and copy it instead');
        }
    };

    const rows: { icon: typeof Hash; label: string; value: string }[] = [
        { icon: BadgeCheck, label: 'Paid for', value: [planName, period && !lifetime ? `· ${period}` : ''].filter(Boolean).join(' ') },
        { icon: CalendarDays, label: 'Valid until', value: validUntil },
        { icon: UserRound, label: 'Member name', value: memberName },
        { icon: Hash, label: 'Member ID', value: memberId },
        { icon: CalendarDays, label: 'Paid on', value: formatDate(paidAt) },
        ...(method ? [{ icon: CreditCard, label: 'Payment method', value: titleCase(method) }] : []),
    ].filter((r) => !!r.value);

    return (
        <MemberPageShell {...shellProps}>
            <style>{`
                @keyframes ps-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
                @keyframes ps-ring { 0% { transform: scale(.8); opacity: .55 } 100% { transform: scale(1.9); opacity: 0 } }
                @keyframes ps-fall { 0% { transform: translateY(-20px) rotate(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(180px) rotate(320deg); opacity: 0 } }
                .ps-pop { animation: ps-pop .6s cubic-bezier(.2,.9,.3,1.3) both }
                .ps-ring { animation: ps-ring 2.2s ease-out infinite }
                .ps-confetti { animation: ps-fall 3.2s ease-in infinite }
                @media (prefers-reduced-motion: reduce) { .ps-pop, .ps-ring, .ps-confetti { animation: none !important } .ps-confetti { display: none } }
                .ps-print-sheet { display: none }
                /* PRINT / SAVE AS PDF: only the A4 receipt sheet below, on one page.
                   The page itself scrolls inside the shell, so printing the screen
                   cut the receipt at whatever was on screen — hence a dedicated sheet. */
                @media print {
                    @page { size: A4 portrait; margin: 12mm }
                    html, body { background: #fff !important }
                    /* The sheet is portalled onto <body>; everything else is removed,
                       not hidden, so it cannot push a blank second page. */
                    body > *:not(.ps-print-sheet) { display: none !important }
                    .ps-print-sheet { display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact }
                }
            `}</style>

            {/* ================= the printable receipt (print / PDF only) */}
            {createPortal(
            <div className="ps-print-sheet" aria-hidden="true">
                <div style={{ fontFamily: 'Poppins, Arial, sans-serif', color: '#0f172a', border: '2px solid #1e3a8a', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#0b1f5c,#1e3a8a 55%,#2563eb)', color: '#fff', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <img src="/logo_ACTIVian-removebg-preview.png" alt="ACTIV" style={{ height: 46, background: '#fff', borderRadius: 8, padding: '4px 8px' }} />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.3 }}>Adidravidar Confederation of Trade &amp; Industrial Vision</div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>6&amp;7, Hayagreeva Apartment, 121, Velachery Main Road, Chennai 600032 · info@activ.org.in · +91 82201 12188</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>Payment receipt</div>
                            <div style={{ fontSize: 13, marginTop: 2 }}>{formatDate(paidAt) || formatDate(new Date().toISOString())}</div>
                        </div>
                    </div>
                    <div style={{ padding: '26px 28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>Received from</div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{memberName}</div>
                                {memberId ? <div style={{ fontSize: 14, color: '#334155' }}>Member ID: <b>{memberId}</b></div> : null}
                            </div>
                            <div style={{ border: '3px solid #059669', color: '#059669', borderRadius: 10, padding: '6px 16px', fontSize: 22, fontWeight: 900, letterSpacing: 4, transform: 'rotate(-6deg)' }}>PAID</div>
                        </div>
                        <table style={{ width: '100%', marginTop: 22, borderCollapse: 'collapse', fontSize: 15 }}>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.label}>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', width: '38%' }}>{r.label}</td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>{r.value}</td>
                                    </tr>
                                ))}
                                {txnRef ? (
                                    <tr>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Transaction reference</td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{txnRef}</td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px' }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a' }}>Amount paid</span>
                            <span style={{ fontSize: 28, fontWeight: 900, color: '#1e3a8a' }}>{money(amount)}</span>
                        </div>
                        <p style={{ marginTop: 26, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                            This is a computer-generated receipt for your ACTIV membership fee and needs no signature.
                            Your membership and 80G tax certificates are available in your member dashboard at activ.org.in.
                        </p>
                    </div>
                    <div style={{ background: '#0b1f5c', color: '#fff', fontSize: 12, padding: '10px 28px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>www.activ.org.in</span><span>Thank you for being part of ACTIV</span>
                    </div>
                </div>
            </div>, document.body)}

            <div className="w-full space-y-5 sm:space-y-6">
                {/* =============================================== hero */}
                {isReceipt ? (
                    <section className={`ps-no-print relative overflow-hidden rounded-3xl ${GRADIENT} px-5 py-6 sm:px-8 sm:py-7 text-white`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                                    <ReceiptText className="h-6 w-6" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-blue-100">Payment receipt</p>
                                    <p className="font-display text-[1.375rem] sm:text-[1.625rem] font-bold leading-tight">{planName}</p>
                                </div>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-blue-100">Amount paid</p>
                                <p className="font-display text-[2rem] sm:text-[2.25rem] font-bold leading-none tabular-nums">{money(amount)}</p>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className={`ps-no-print relative overflow-hidden rounded-3xl ${GRADIENT} px-5 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-12 text-center text-white
                                         shadow-[0_24px_60px_-24px_rgba(30,58,138,0.7)]`}>
                        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
                        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl" />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
                            {CONFETTI.map((c, i) => (
                                <span key={i} className="ps-confetti absolute top-0 h-2.5 w-1.5 rounded-sm"
                                    style={{ left: c.l, animationDelay: c.d, backgroundColor: c.c }} />
                            ))}
                        </div>

                        <div className="relative mx-auto grid h-24 w-24 place-items-center sm:h-28 sm:w-28">
                            <span aria-hidden="true" className="ps-ring absolute inset-0 rounded-full bg-emerald-300/40" />
                            <span className="ps-pop relative grid h-20 w-20 place-items-center rounded-full bg-white shadow-xl sm:h-24 sm:w-24">
                                <Check className="h-10 w-10 text-emerald-500 sm:h-12 sm:w-12" strokeWidth={3} />
                            </span>
                        </div>

                        <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/25">
                            <Sparkles className="h-3.5 w-3.5 text-amber-200" /> Payment confirmed
                        </span>
                        <h2 className="relative mt-3 font-display text-[1.75rem] sm:text-[2.5rem] font-bold leading-tight">
                            {renewed ? `Thank you for renewing, ${firstName}!` : `Welcome to ACTIV, ${firstName}!`}
                        </h2>
                        <p className="relative mx-auto mt-2 max-w-xl text-[1rem] sm:text-[1.125rem] text-blue-100">
                            {renewed
                                ? `Your ${planName.toLowerCase()} is renewed${profile?.membershipExpiresAt ? ` until ${new Date(profile.membershipExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Every member benefit carries on.`
                                : `Your ${planName.toLowerCase()} is now active. Everything a member gets is open to you.`}
                        </p>

                        <div className="relative mx-auto mt-6 inline-flex flex-col items-center rounded-2xl bg-white/10 px-7 py-4 ring-1 ring-white/20 backdrop-blur-sm">
                            <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-blue-100">Total paid</span>
                            <span className="font-display text-[2.25rem] sm:text-[2.75rem] font-bold leading-none tabular-nums">{money(amount)}</span>
                            <span className="mt-1.5 text-[0.9375rem] text-blue-100">{planName}{period && !lifetime ? ` · ${period}` : ''}</span>
                        </div>
                    </section>
                )}

                <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    {/* =============================================== receipt */}
                    <section className="ps-receipt relative min-w-0 overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08),0_18px_40px_-20px_rgba(16,24,40,0.28)] ring-1 ring-slate-200">
                        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                    <ReceiptText className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-display text-[1.25rem] font-bold text-slate-900">Membership receipt</p>
                                    <p className="text-[0.9375rem] text-slate-500">Adidravidar Confederation of Trade &amp; Industrial Vision</p>
                                </div>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[0.875rem] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                <BadgeCheck className="h-4 w-4" /> Paid
                            </span>
                        </div>

                        {/* perforated divider */}
                        <div aria-hidden="true" className="relative my-5 h-6">
                            <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-slate-100 ring-1 ring-slate-200" />
                            <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-slate-100 ring-1 ring-slate-200" />
                            <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-200" />
                        </div>

                        <dl className="grid gap-x-6 gap-y-4 px-5 sm:grid-cols-2 sm:px-7">
                            {rows.map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex min-w-0 items-start gap-3">
                                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <dt className="text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                                        <dd className="mt-0.5 break-words text-[1.0625rem] font-semibold text-slate-900">{value}</dd>
                                    </div>
                                </div>
                            ))}
                        </dl>

                        <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-2xl bg-blue-50/70 px-4 py-4 ring-1 ring-blue-100 sm:mx-7">
                            <span className="text-[1rem] font-semibold text-slate-700">Amount paid</span>
                            <span className="font-display text-[1.75rem] font-bold leading-none tabular-nums text-blue-800">{money(amount)}</span>
                        </div>

                        {txnRef ? (
                            <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 sm:mx-7">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[0.8125rem] font-semibold uppercase tracking-wider text-slate-500">Transaction reference</p>
                                    <p className="mt-0.5 break-all font-mono text-[0.9375rem] font-semibold text-slate-900">{txnRef}</p>
                                </div>
                                <button type="button" onClick={copyRef}
                                    className="ps-no-print inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.9375rem] font-semibold text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        ) : null}

                        <div className="ps-no-print mt-5 flex flex-col gap-2 border-t border-slate-100 px-5 py-5 sm:flex-row sm:px-7">
                            <button type="button" onClick={() => window.print()}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white sm:w-auto">
                                <Printer className="h-4 w-4" /> Print or save as PDF
                            </button>
                            <button type="button" onClick={() => navigate('/member/plan?view=standalone')}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto">
                                View plan details
                            </button>
                        </div>
                    </section>

                    {/* =============================================== next */}
                    <aside className="ps-no-print min-w-0 space-y-4 lg:sticky lg:top-28">
                        <div className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08),0_18px_40px_-20px_rgba(16,24,40,0.28)] ring-1 ring-slate-200">
                            <p className="font-display text-[1.125rem] font-bold text-slate-900">Your documents</p>
                            <p className="text-[0.9375rem] text-slate-500">Ready now — open, print or save.</p>
                            <div className="mt-4 grid gap-2.5">
                                {[
                                    { Icon: Award, title: 'Membership certificate', note: 'With your Member ID', to: '/member/certificate/membership' },
                                    { Icon: ReceiptText, title: '80G tax certificate', note: 'For your income-tax filing', to: '/member/certificate/tax-exemption' },
                                ].map(({ Icon, title, note, to }) => (
                                    <button key={to} type="button" onClick={() => navigate(to)}
                                        className="group flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-slate-200 transition-colors hover:bg-blue-50/60 hover:ring-blue-200">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-slate-900">{title}</span>
                                            <span className="block truncate text-[0.875rem] text-slate-500">{note}</span>
                                        </span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!isReceipt ? (
                            <div className="flex gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-600">
                                    <MailCheck className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sky-900">Confirmation sent</p>
                                    <p className="text-[0.9375rem] text-sky-800">Your receipt is on its way to your email and WhatsApp.</p>
                                </div>
                            </div>
                        ) : null}

                        <button type="button" onClick={() => navigate('/payment/member-dashboard')}
                            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl ${GRADIENT} px-5 text-[1.0625rem] font-bold text-white shadow-[0_12px_28px_-12px_rgba(30,58,138,0.7)] transition-transform hover:-translate-y-0.5`}>
                            <LayoutDashboard className="h-5 w-5" /> Go to my dashboard <ArrowRight className="h-4 w-4" />
                        </button>
                        <p className="flex items-center justify-center gap-1.5 text-[0.875rem] text-slate-500">
                            <ShieldCheck className="h-4 w-4" /> Recorded securely by ACTIV
                        </p>
                    </aside>
=======
    /*
     * THE SAME SCREEN, TWO OCCASIONS.
     *
     * Arriving here straight from the gateway, this is the moment a payment
     * went through and the celebration is the point. Opened months later from
     * Official Documents, the same figures are a RECEIPT — and a page that
     * shouts "Payment Successful! Welcome to ACTIV!" at somebody looking for
     * a number to give their accountant is the wrong register entirely.
     *
     * `?view=receipt` is the difference: the tick, the confetti ring and the
     * welcome come off, the heading says what the page is, and the payment
     * details — which were always the substance of it — are all that is left.
     */
    const isReceipt = searchParams.get('view') === 'receipt';

    const memberName = profile?.fullName || application?.fullName || '—';
    const membershipId = profile?.memberCode || formatApplicationRef(application).short || '—';
    const planType = profile?.membershipType || application?.memberType || 'Membership';
    const paidAt = profile?.lastPaymentDate || profile?.membershipActivatedAt || null;
    const amount = profile?.lastPaymentAmount ?? profile?.paymentAmount;
    const txnRef = profile?.paymentId || '—';

    return (
        <MemberPageShell
            title={isReceipt ? 'Payment Receipt' : 'Payment Successful'}
            subtitle={isReceipt
                ? 'Your membership fee, as recorded'
                : 'Your membership is now active'}
            width="wide"
            sidebar={!isReceipt}
            /* Back goes where the reader came FROM. The receipt is reached
               from Documents, from the plan screen and from the dashboard, and
               a fixed `backTo` sent all three to Documents — which is why
               leaving the receipt landed somewhere the reader had never been.
               `backTo` takes a path, so the history step is done here and the
               path is only the fallback for a direct visit. */
            backTo="/member/documents"
            onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/member/documents'))}
        >
            <div className="w-full">

                {/* ---------------- celebration hero ---------------- */}
                {!isReceipt && (
                <div className="rounded-2xl bg-white border p-7 text-center mb-5
                                shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]"
                     style={{ borderColor: PALETTE.border }}>
                    <div className="relative h-[7.5rem] flex items-center justify-center">
                        <span aria-hidden className="absolute w-[6.5rem] h-[6.5rem] rounded-full opacity-20 animate-ping"
                              style={{ backgroundColor: '#10B981', animationDuration: '2.4s' }} />
                        <span className="relative w-[5.75rem] h-[5.75rem] rounded-full flex items-center justify-center"
                              style={{ backgroundColor: '#ECFDF5' }}>
                            <BadgeCheck className="w-14 h-14" style={{ color: '#10B981' }} strokeWidth={1.8} />
                        </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                                     text-[0.8125rem] font-extrabold tracking-wide mt-2"
                          style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                        <BadgeCheck className="w-3.5 h-3.5" />
                        PAYMENT CONFIRMED
                    </span>

                    <h1 className={`font-display ${PAGE_TITLE} mt-4`}
                        style={{ color: PALETTE.ink }}>
                        Payment Successful!
                    </h1>
                    <p className="text-[1.1875rem] mt-2" style={{ color: PALETTE.muted }}>
                        Welcome to ACTIV! Your membership is officially active.
                    </p>

                    <div className="inline-block rounded-2xl px-6 py-3 mt-5"
                         style={{ backgroundColor: '#F8FAFC' }}>
                        <p className="text-[0.75rem] font-bold uppercase tracking-[0.06em]"
                           style={{ color: PALETTE.muted }}>
                            Total Paid
                        </p>
                        <p className="font-display text-[1.75rem] font-extrabold tabular mt-0.5"
                           style={{ color: PALETTE.ink }}>
                            {rupees(amount)}
                        </p>
                    </div>
                </div>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-3">

                {/* ---------------- membership receipt ----------------
                    A RECEIPT READS TOP TO BOTTOM: what was paid, then what
                    for, then to whom, then the reference that proves it. It
                    was a 2×2 grid of unrelated facts with the amount missing
                    from it entirely — the one number a receipt exists to
                    state was on the celebration panel above, which the
                    receipt view does not draw. */}
                <div className="lg:col-span-2">
                <KitCard>
                    <div className="mb-5 flex items-center gap-2">
                        <Receipt className="h-5 w-5 shrink-0 text-blue-600" />
                        <h2 className={`${CARD_TITLE} text-slate-900`}>
                            Membership payment
                        </h2>
                    </div>

                    {/* ---- the amount, at the top, in the size it deserves ---- */}
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5">
                        <p className={BIZ_DETAIL_LABEL}>Amount paid</p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                            <span className="font-display text-[2.8125rem] font-extrabold leading-none tabular
                                             tracking-tight text-slate-900">
                                {rupees(amount)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1
                                             text-[1.0625rem] font-extrabold text-emerald-700">
                                <BadgeCheck className="h-4 w-4" /> Paid
                            </span>
                        </p>
                        {paidAt ? (
                            <p className="mt-2 text-[1.1875rem] font-semibold text-slate-500">
                                Received on {formatDate(paidAt)}
                            </p>
                        ) : null}
                    </div>

                    {/* ---- what it was for ---- */}
                    <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <Metric label="Paid for" value={`${String(planType)} membership`} />
                        <Metric label="Valid until" value={validityFrom(paidAt)} />
                        <Metric label="Member name" value={memberName} />
                        <Metric label="Membership ID" value={membershipId} />
                    </div>

                    {/* ---- and the reference that proves it ---- */}
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <p className={BIZ_DETAIL_LABEL}>Transaction reference</p>
                        <p className="mt-1.5 break-all text-[1.125rem] font-bold tracking-wide tabular-nums text-slate-900">
                            {txnRef}
                        </p>
                    </div>

                    {/* ---- the two things a member does with a receipt ---- */}
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5
                                       text-[1.125rem] font-bold text-white transition-colors hover:bg-blue-700"
                        >
                            <Printer className="h-5 w-5" /> Print or save as PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/member/plan')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white
                                       px-6 py-3.5 text-[1.125rem] font-bold text-slate-700 transition-colors
                                       hover:border-blue-300 hover:text-blue-700"
                        >
                            View plan details
                        </button>
                    </div>
                </KitCard>

                </div>

                {/* ---------------- member documents ---------------- */}
                <div className="space-y-5 lg:sticky lg:top-6">
                <div>
                    <p className={`${BIZ_DETAIL_LABEL} mb-3`}>
                        Member Documents
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <DocCard
                            Icon={Award}
                            tone="#4F46E5"
                            soft="#EEF2FF"
                            title="Membership Certificate"
                            subtitle="Digital PDF"
                            onClick={() => openCertificate('membership')}
                        />
                        <DocCard
                            Icon={ReceiptText}
                            tone="#059669"
                            soft="#ECFDF5"
                            title="Tax Exemption"
                            subtitle="80G Certificate"
                            onClick={() => openCertificate('tax-exemption')}
                        />
                    </div>
                </div>

                {/* ---------------- confirmation note ---------------- */}
                <div className="rounded-2xl border p-4 flex gap-3"
                     style={{ backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }}>
                    <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                        <MailCheck className="w-[1.125rem] h-[1.125rem]" style={{ color: '#0284C7' }} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-display text-[1.1875rem] font-bold" style={{ color: '#075985' }}>
                            Confirmation Sent
                        </p>
                        <p className="text-[1.0625rem] mt-1 leading-relaxed" style={{ color: '#0369A1' }}>
                            Receipt and login details have been sent to your email and WhatsApp.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/payment/member-dashboard')}
                    className="w-full h-12 rounded-xl text-white font-bold text-[1.125rem] flex items-center
                               justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: PALETTE.primary }}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Go to Member Dashboard
                    <ArrowRight className="w-4 h-4" />
                </button>
                </div>

>>>>>>> 8020f5d (Initial commit for website frontend)
                </div>
            </div>
        </MemberPageShell>
    );
}
<<<<<<< HEAD
=======

/**
 * A label over its value — `BIZ_DETAIL_LABEL` and `BIZ_DETAIL_VALUE` from
 * `surface.ts`, which are the business account screens' pair.
 *
 * The label stays small and uppercase and the VALUE carries the weight: a
 * caption over "Tharun .v" is a key beside its value, and at the same size
 * and weight as the thing it names the eye has no way to tell which is which.
 */
const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
        <p className={BIZ_DETAIL_LABEL}>{label}</p>
        <p className={`${BIZ_DETAIL_VALUE} mt-1.5 break-words text-[1.125rem]`} title={value}>
            {value}
        </p>
    </div>
);

const DocCard = ({ Icon, tone, soft, title, subtitle, onClick }: {
    Icon: typeof Award; tone: string; soft: string;
    title: string; subtitle: string; onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        /* `BusinessUI.Card`'s border and two-stop shadow, so a document tile
           is the same object as every other card in the product. */
        className="rounded-2xl border border-slate-200 bg-white p-5 text-center
                   shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_30px_-12px_rgba(16,24,40,0.28)]
                   transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ backgroundColor: soft, color: tone }}>
            <Icon className="h-7 w-7" />
        </span>
        <p className="text-[1.125rem] font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-[1.1875rem] font-semibold text-slate-500">{subtitle}</p>
    </button>
);
>>>>>>> 8020f5d (Initial commit for website frontend)
