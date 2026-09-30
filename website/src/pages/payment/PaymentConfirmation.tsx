<<<<<<< HEAD
import { useEffect, useState } from 'react';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, Printer, LayoutDashboard, Loader2, CalendarDays, Users, Award, Mail, ShieldCheck, ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getUserApplication } from '@/services/applicationApi';
import { getMyProfile } from '@/services/activApi';
=======
import React, { useEffect, useState } from 'react';
import MemberPageShell from '@/pages/member/MemberPageShell';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Home, FileText, Loader2, Calendar, User, CreditCard, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getUserApplication } from '@/services/applicationApi';
import { apiFetch } from "@/services/activApi";
>>>>>>> 8020f5d (Initial commit for website frontend)

/**
 * An amount, or a dash when none was recorded.
 *
 * A receipt must not print a figure nobody was charged, and it must not print
<<<<<<< HEAD
 * "₹null" either.
=======
 * "₹null" either. Both became possible once the invented defaults came out —
 * the first is a lie in writing on the page members screenshot, the second is a
 * bug report.
>>>>>>> 8020f5d (Initial commit for website frontend)
 */
const money = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : '₹' + Number(value).toLocaleString('en-IN');

<<<<<<< HEAD
const longDate = (value?: string | null) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
};

interface Receipt {
  membershipId: string;
  memberName: string;
  transactionId: string;
  paymentDate: string;
  planType: string;
  totalAmount: number | null;
  validUntil: string;
  applicationId: string;
}

=======
>>>>>>> 8020f5d (Initial commit for website frontend)
export default function PaymentConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    loadPaymentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
=======
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    loadPaymentDetails();
>>>>>>> 8020f5d (Initial commit for website frontend)
  }, []);

  const loadPaymentDetails = async () => {
    try {
<<<<<<< HEAD
      const stateDetails: any = location.state || {};
      const status = searchParams.get('status');
      const transactionId = searchParams.get('transaction_id') || searchParams.get('payment_id');

      /**
       * Only act on a payment that actually happened: the gateway passes
       * `paid: true` in its navigation state, and Instamojo returns
       * `?status=success`. Visiting this URL by hand shows nothing.
       */
      const paidHere = !!stateDetails.paid;
      if (!(status === 'success' || paidHere)) {
        navigate('/member/unpaid-dashboard');
        return;
      }

      /* This page confirms a payment; the gateway has already completed it. */
      localStorage.setItem('paymentStatus', 'completed');
      window.dispatchEvent(new CustomEvent('paymentCompleted'));
      window.dispatchEvent(new Event('profileUpdated'));

      const [appResult, profileResult] = await Promise.allSettled([getUserApplication(), getMyProfile()]);
      const app: any = (appResult.status === 'fulfilled' && appResult.value) || {};
      const profile: any = (profileResult.status === 'fulfilled' && profileResult.value) || {};

      /*
       * WHAT WAS ACTUALLY PAID — NEVER A DEFAULT, and the REAL member ID —
       * never an invented one. Both used to be made up here (a random
       * "ACTIV-2024-…" number and a ₹2,000 fallback) on the page members keep.
       */
      const totalAmount =
        stateDetails.totalAmount ?? stateDetails.planAmount
        ?? app.paymentDetails?.planAmount ?? app.paymentAmount ?? null;

      setReceipt({
        membershipId: String(profile.membershipNumber || ''),
        memberName: String(profile.fullName || profile.name || app.fullName || ''),
        transactionId: String(transactionId || stateDetails.transactionId || app.paymentDetails?.instamojoPaymentId || ''),
        paymentDate: stateDetails.paymentDate || app.paymentDate || new Date().toISOString(),
        planType: String(stateDetails.planType || app.paymentDetails?.planType
          || (app.memberType === 'aspirant' ? 'Aspirant membership'
            : app.memberType === 'student' ? 'Student membership' : 'Membership')),
        totalAmount: totalAmount === null ? null : Number(totalAmount),
        validUntil: longDate(profile.membershipExpiresAt || profile.validUntil),
        applicationId: String(app.applicationId || ''),
      });
      celebrate();
    } catch (error) {
      console.error('Error loading payment details:', error);
      // A failed load is not a receipt: nothing is claimed that is not known.
      setReceipt({
        membershipId: '', memberName: '', transactionId: '', paymentDate: new Date().toISOString(),
        planType: 'Membership', totalAmount: null, validUntil: '', applicationId: '',
=======
      // Check if we have details from navigation state
      const stateDetails = location.state;

      // Or get from URL parameters (from Instamojo redirect)
      const status = searchParams.get('status');
      const paymentId = searchParams.get('payment_id');
      const transactionId = searchParams.get('transaction_id');

      /**
       * Only act on a payment that actually happened.
       *
       * The condition was `status === 'success' || stateDetails || true`. The
       * trailing `|| true` made it unconditional, so simply visiting
       * `/payment/confirmation` — a URL anyone can type — ran the activation
       * below and turned the account into a paid membership. The gateway now
       * passes `paid: true` in its navigation state, and Instamojo returns
       * `?status=success`; nothing else counts.
       */
      const paidHere = !!(stateDetails && (stateDetails as any).paid);
      if (status === 'success' || paidHere) {
        // Fetch latest application data
        // Null when the member has no application, and when the request
        // fails. Every `app.…` read below would throw on it.
        const app = (await getUserApplication()) || ({} as any);

        /**
         * This page confirms a payment; it no longer performs one.
         *
         * It used to POST `/payment/complete` itself, with identifiers it made
         * up when the URL carried none — `'PAYMENT_' + Date.now()`. That worked
         * because the endpoint verified nothing, which is exactly the hole that
         * has now been closed: completion requires a server-created order and a
         * signature the server issued, and this page has neither.
         *
         * The gateway completes the payment before navigating here, so by the
         * time this renders the membership is already active. Re-posting would
         * be refused as a replay of an order that is already paid — correctly.
         */
        localStorage.setItem('paymentStatus', 'completed');
        window.dispatchEvent(new CustomEvent('paymentCompleted'));
        window.dispatchEvent(new Event('profileUpdated'));

        /*
         * WHAT WAS ACTUALLY PAID — NEVER A DEFAULT.
         *
         * This used to fall back to ₹2,000, and to ₹5,000 for a business
         * member, whenever the recorded amount was missing. On a RECEIPT that
         * is not a harmless placeholder: it tells a member who paid ₹10,000
         * that they paid ₹2,000, in writing, on the page they screenshot. And
         * since the Super Admin can change the prices, the defaults were
         * guaranteed to be wrong eventually.
         *
         * Only recorded values now, in order of how close they are to the
         * transaction: what the gateway screen carried across, then what the
         * application stored. `null` when none of them holds a figure, and the
         * receipt renders a dash rather than a number nobody was charged.
         */
        const recordedAmount =
          stateDetails?.planAmount
          ?? app.paymentDetails?.planAmount
          ?? app.paymentAmount
          ?? null;

        const planType =
          stateDetails?.planType
          || app.paymentDetails?.planType
          || (app.memberType === 'aspirant' ? 'Aspirant Plan' : 'Membership');

        const planAmount = recordedAmount;

        const details = {
          membershipId: `ACTIV-2024-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          memberName: app.fullName || 'Member',
          transactionId: transactionId || stateDetails?.transactionId || app.paymentDetails?.instamojoPaymentId || 'TEST_' + Date.now(),
          paymentDate: stateDetails?.paymentDate || app.paymentDate || new Date().toISOString(),
          planType: stateDetails?.planType || planType,
          planAmount: stateDetails?.planAmount || planAmount,
          supportAmount: stateDetails?.supportAmount || app.paymentDetails?.supportAmount || 0,
          totalAmount: stateDetails?.totalAmount || app.paymentAmount || planAmount,
          applicationId: app.applicationId,
          validFor: '1 Year'
        };

        setPaymentDetails(details);

        // Fire confetti animation
        fireConfetti();
      } else {
        // Redirect to dashboard if no valid payment details
        navigate('/member/unpaid-dashboard');
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
      // Don't redirect on error during testing
      /*
       * A FAILED LOAD IS NOT A RECEIPT.
       *
       * This used to invent one — "Test Member", application "TEST-APP", ₹2,000
       * — and render it as though it described a real payment. Nothing here is
       * known, so nothing is claimed: the amounts are null and the screen prints
       * a dash where a figure would go.
       */
      setPaymentDetails({
        membershipId: '',
        memberName: '',
        transactionId: '',
        paymentDate: new Date().toISOString(),
        planType: 'Membership',
        planAmount: null,
        supportAmount: 0,
        totalAmount: null,
        applicationId: '',
        validFor: '1 Year'
>>>>>>> 8020f5d (Initial commit for website frontend)
      });
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const celebrate = () => {
    try {
      const colors = ['#1c2e68', '#2563eb', '#38bdf8', '#fbbf24'];
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.35 }, colors, scalar: 0.9 });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.3 }, colors, scalar: 0.8 }), 350);
    } catch { /* decoration only */ }
  };

  /** A real receipt page, printable or saved as PDF from the browser's dialog. */
  const printReceipt = () => {
    if (!receipt) return;
    const rows: [string, string][] = [
      ['Member', receipt.memberName || '—'],
      ['Member ID', receipt.membershipId || 'Shown on your dashboard'],
      ['Plan', receipt.planType],
      ['Amount paid', money(receipt.totalAmount)],
      ['Paid on', longDate(receipt.paymentDate) || '—'],
      ['Valid until', receipt.validUntil || '—'],
      ['Payment reference', receipt.transactionId || '—'],
    ];
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ACTIV payment receipt</title>
      <style>body{font-family:Poppins,Segoe UI,Arial,sans-serif;color:#0f172a;margin:40px}
      .top{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1c2e68;padding-bottom:16px}
      h1{font-size:22px;margin:24px 0 4px}p{color:#475569;margin:0 0 24px}
      table{width:100%;border-collapse:collapse}td{padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:15px}
      td:first-child{color:#64748b;width:40%}td:last-child{font-weight:600}
      .paid{display:inline-block;background:#dcfce7;color:#166534;font-weight:700;padding:4px 12px;border-radius:999px;font-size:13px}
      .foot{margin-top:32px;font-size:12px;color:#64748b}</style></head><body>
      <div class="top"><img src="${window.location.origin}/logo_ACTIVian-removebg-preview.png" height="56" alt="ACTIV"><span class="paid">PAID</span></div>
      <h1>Membership payment receipt</h1><p>Adidravidar Confederation of Trade &amp; Industrial Vision</p>
      <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      <div class="foot">This is a computer-generated receipt. enquiry@activ.org.in · +91 82201 12188 · activ.org.in</div>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  if (loading || !receipt) {
    return (
      <MemberPageShell title="Payment confirmation" width="wide" sidebar={false}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#2563eb]" />
          <p className="text-slate-600">Confirming your payment…</p>
=======
  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3B82F6', '#10B981', '#8B5CF6']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3B82F6', '#10B981', '#8B5CF6']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  if (loading) {
    return (
      <MemberPageShell
          title="Payment Confirmation"
          subtitle="Your membership payment"
          width="wide"
            sidebar={false}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-700">Loading payment details...</p>
>>>>>>> 8020f5d (Initial commit for website frontend)
        </div>
      </MemberPageShell>
    );
  }

<<<<<<< HEAD
  const facts: [string, string][] = [
    ['Member', receipt.memberName || '—'],
    ['Plan', receipt.planType],
    ['Paid on', longDate(receipt.paymentDate) || '—'],
    ['Valid until', receipt.validUntil || 'See your dashboard'],
  ];

  return (
    <MemberPageShell title="Payment confirmation" subtitle="Your membership is active" width="wide" sidebar={false}>
      <div className="mx-auto max-w-5xl pb-10">
        {/* ============================================================ hero */}
        <section className="relative overflow-hidden rounded-3xl px-5 py-10 text-center text-white sm:px-10 sm:py-14"
                 style={{ backgroundImage: 'linear-gradient(135deg, #0f1c47 0%, #1c2e68 45%, #2563eb 100%)' }}>
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative">
            <span className="relative mx-auto grid h-20 w-20 place-items-center sm:h-24 sm:w-24">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative grid h-full w-full place-items-center rounded-full bg-emerald-500 shadow-[0_12px_40px_-8px_rgb(16_185_129/0.8)] ring-8 ring-white/15">
                <CheckCircle className="h-10 w-10 text-white sm:h-12 sm:w-12" strokeWidth={2.5} />
              </span>
            </span>
            <h1 className="mt-6 text-[1.9rem] font-black tracking-tight sm:text-[2.75rem]">Payment successful</h1>
            <p className="mx-auto mt-2 max-w-lg text-[1rem] text-blue-100 sm:text-[1.125rem]">
              Welcome to ACTIV{receipt.memberName ? `, ${receipt.memberName.split(' ')[0]}` : ''} — your membership is now active.
            </p>
            <div className="mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-white/10 px-5 py-3 ring-1 ring-white/20">
              <span className="text-[0.85rem] font-semibold uppercase tracking-widest text-blue-100">Amount paid</span>
              <span className="text-[1.75rem] font-black">{money(receipt.totalAmount)}</span>
            </div>
          </div>
        </section>

        <div className="-mt-6 grid gap-6 px-1 sm:px-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* =================================================== the receipt */}
          <div className="relative rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgb(15_23_42/0.35)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-8">
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-slate-400">Your member ID</p>
                <p className="mt-1 font-mono text-[1.6rem] font-bold tracking-[0.12em] text-[#1c2e68] break-all">
                  {receipt.membershipId || '—'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[0.85rem] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" /> Active member
              </span>
            </div>

            {/* ticket tear */}
            <div className="relative my-6 flex items-center">
              <span className="absolute -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200" />
              <span className="mx-6 h-px flex-1 border-t-2 border-dashed border-slate-200" />
              <span className="absolute -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200" />
            </div>

            <dl className="grid gap-x-8 gap-y-5 px-5 sm:grid-cols-2 sm:px-8">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[0.8rem] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
                  <dd className="mt-1 text-[1.05rem] font-semibold text-slate-900 break-words">{v}</dd>
                </div>
              ))}
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-[0.8rem] font-semibold uppercase tracking-wider text-slate-400">Payment reference</dt>
                <dd className="mt-1 font-mono text-[0.95rem] font-semibold text-slate-700 break-all">{receipt.transactionId || '—'}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:px-8">
              <button type="button" onClick={printReceipt}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 text-[0.95rem] font-bold text-slate-700 transition hover:border-[#2563eb] hover:text-[#2563eb]">
                <Printer className="h-5 w-5" /> Print / save receipt
              </button>
              <button type="button" onClick={() => navigate('/member/certificate/membership')}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 text-[0.95rem] font-bold text-slate-700 transition hover:border-[#2563eb] hover:text-[#2563eb]">
                <Award className="h-5 w-5" /> Membership certificate
              </button>
            </div>

            <p className="flex items-start gap-2 rounded-b-3xl bg-blue-50/70 px-5 py-4 text-[0.9rem] text-blue-900 sm:px-8">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              A confirmation with these details has been sent to your registered email and WhatsApp.
            </p>
          </div>

          {/* ================================================= what's next */}
          <aside className="rounded-3xl bg-white p-5 shadow-[0_24px_60px_-30px_rgb(15_23_42/0.35)] ring-1 ring-slate-200 sm:p-6 lg:self-start">
            <h2 className="text-[1.1rem] font-extrabold text-slate-900">What you can do now</h2>
            <ul className="mt-4 space-y-2">
              {[
                { icon: LayoutDashboard, text: 'Your member dashboard', to: '/payment/member-dashboard' },
                { icon: Users, text: 'Find and message members', to: '/member/directory' },
                { icon: CalendarDays, text: 'Members-only events', to: '/member/events' },
                { icon: Award, text: 'Download your certificate', to: '/member/certificate/membership' },
              ].map(({ icon: I, text, to }) => (
                <li key={to}>
                  <button type="button" onClick={() => navigate(to)}
                          className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563eb]"><I className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1 text-[0.95rem] font-semibold text-slate-800">{text}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#2563eb]" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => navigate('/payment/member-dashboard')}
                    className="btn-shine relative mt-5 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[1rem] font-bold text-white shadow-[0_12px_28px_-12px_rgb(37_99_235/0.7)]"
                    style={{ backgroundImage: 'linear-gradient(135deg, #1c2e68 0%, #2563eb 100%)' }}>
              <LayoutDashboard className="h-5 w-5" /> Go to dashboard
            </button>
          </aside>
=======
  if (!paymentDetails) {
    return null;
  }

  const handleDownloadReceipt = () => {
    // In a real application, this would generate and download a PDF receipt
    const receiptData = `
ACTIV MEMBERSHIP - PAYMENT RECEIPT
======================================

Transaction ID: ${paymentDetails.transactionId}
Payment Date: ${new Date(paymentDetails.paymentDate).toLocaleString()}
Application ID: ${paymentDetails.applicationId || 'N/A'}

Membership Type: ${paymentDetails.planType === 'annual' ? 'Annual Membership' : 'Lifetime Membership'}
Membership Fee: ${money(paymentDetails.planAmount)}
Support Amount: ₹${paymentDetails.supportAmount || 0}
--------------------------------------
Total Amount Paid: ${money(paymentDetails.totalAmount)}

Status: COMPLETED
Payment Method: ${paymentDetails.paymentMethod?.toUpperCase() || 'CARD'}

Thank you for joining ACTIV!
======================================
    `.trim();

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACTIV_Payment_Receipt_${paymentDetails.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <MemberPageShell
        title="Payment Confirmation"
        subtitle="Your membership payment"
        width="wide"
            sidebar={false}
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-300 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Payment Confirmation</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Success Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl mx-auto">
              <CheckCircle className="w-16 h-16 text-white" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl text-slate-600">
            Welcome to ACTIV – Your membership is now active
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Membership Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Membership Details Card */}
            <Card className="border-2 border-slate-300 shadow-xl">
              <div className="bg-slate-100 p-6 border-b-2 border-slate-300 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Membership Details</h2>
                <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-md">
                  ✓ Active
                </span>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Membership ID</p>
                    <p className="text-lg font-bold text-slate-900">{paymentDetails.membershipId}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Member Name</p>
                    <p className="text-lg font-bold text-slate-900">{paymentDetails.fullName}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Plan</p>
                    <p className="text-lg font-bold text-slate-900">{paymentDetails.planType}</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <p className="text-xs text-blue-700 mb-1 font-semibold uppercase tracking-wide">Amount Paid</p>
                    <p className="text-2xl font-bold text-blue-600">{money(paymentDetails.totalAmount)}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Valid For</p>
                    <p className="text-lg font-bold text-slate-900">{paymentDetails.validFor}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Payment Reference</p>
                    <p className="break-all text-[1.0625rem] font-semibold tracking-wide tabular-nums text-slate-900">
                        {paymentDetails.transactionId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Documents Card */}
            <Card className="border-2 border-slate-300 shadow-xl">
              <div className="bg-slate-100 p-6 border-b-2 border-slate-300">
                <h2 className="text-xl font-bold text-slate-900">Download Documents</h2>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <Button
                    variant="outline"
                    className="py-6 h-auto flex-col gap-3 hover:bg-green-50 hover:border-green-400 border-2"
                    onClick={handleDownloadReceipt}
                  >
                    <Download className="w-8 h-8 text-green-600" />
                    <span className="font-bold text-sm">Download Receipt</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Info */}
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-900 mb-1">Confirmation Sent</p>
                  <p className="text-sm text-blue-800">
                    Confirmation has been sent to your registered email and WhatsApp number. Keep these for your records.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - What's Next */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-slate-300 shadow-xl sticky top-24">
              <div className="bg-slate-100 p-6 border-b-2 border-slate-300">
                <h2 className="text-xl font-bold text-slate-900">What's Next?</h2>
              </div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {[
                    { icon: User, color: 'blue', text: 'Access your member dashboard to update profile and browse other members' },
                    { icon: Calendar, color: 'purple', text: 'Join area-specific events and networking opportunities' },
                    { icon: CheckCircle, color: 'green', text: 'Connect with fellow ACTIV members in your region' }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 text-${item.color}-600`} />
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed pt-2">{item.text}</p>
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-lg font-bold shadow-lg mt-8"
                  onClick={() => navigate('/payment/member-dashboard')}
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
>>>>>>> 8020f5d (Initial commit for website frontend)
        </div>
      </div>
    </MemberPageShell>
  );
}
