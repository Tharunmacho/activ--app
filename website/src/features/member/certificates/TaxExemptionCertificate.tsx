import {
    FileText, CalendarDays, CalendarRange, IdCard, UserRound, IndianRupee, Link2, MapPin, Phone, Mail, Globe,
} from 'lucide-react';
import { CertificateSheet, ASSOCIATION_NAME } from './CertificateSheet';
import { CertificateMedallion, GOLD, GOLD_LIGHT, GOLD_PALE, GOLD_DEEP } from './CertificateMedallion';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Certificate } from '@/services/activApi';

/**
 * ============================================================================
 * THE 80G TAX EXEMPTION CERTIFICATE — A4 PORTRAIT, THE ASSOCIATION'S TEMPLATE
 * ============================================================================
 *
 * Laid out to the association's own template, element for element:
 *
 *   a navy wave down the left edge, gold lines riding it; navy + gold corners
 *   the mark CENTRED on the title axis (no side slogans)
 *   CERTIFICATE OF / Tax Exemption / UNDER SECTION 80G · INCOME TAX ACT, 1961
 *   the ribboned medallion, top right
 *   the donor's name and PAN, the eligibility sentence
 *   a six-fact card with icons, and the payment-details table
 *   the motto, the seal — NO SIGNATURES and NO QR (the association's instruction)
 *   the association's name, address and contacts, and a reference strip
 *
 * NOTHING IS INVENTED. A fact the server did not send is left out (the PAN row,
 * the PAN line under the name) or printed as a dash (an amount), never filled.
 *
 * 210 x 297mm = 794 x 1123px at 96dpi; the frame SVG is drawn in those units.
 */

const NAVY = '#0E1F4D';
const NAVY_MID = '#1C2E68';
const NAVY_SOFT = '#2A4A9A';
const INK = '#13224F';
const MUTED = '#5B6B8F';

const ADDRESS = '6&7, Hayagreeva Apartment, 121, Velachery Main Road, Chennai - 600032';
const PHONE = '+91-82201-12188';
const EMAIL = 'info@activ.org.in';
const WEB = 'https://activ.org.in';

const longDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
};
const rupees = (n?: number | null) =>
    typeof n === 'number' && Number.isFinite(n) ? `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
/** "2025-26" -> "2025–2026", as the template prints it. */
const fullYear = (fy: string) => {
    const m = /^(\d{4})-(\d{2,4})$/.exec(fy || '');
    return m ? `${m[1]}–${m[2].length === 2 ? `${m[1].slice(0, 2)}${m[2]}` : m[2]}` : fy;
};

/* ------------------------------------------------------------------ frame */

/** Exported: the donor receipt and year certificate stand on the same paper. */
export function Frame() {
    return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 794 1123"
             preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="tx-navy" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={NAVY_MID} /><stop offset="1" stopColor={NAVY} />
                </linearGradient>
                <linearGradient id="tx-wave" x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0" stopColor={NAVY} /><stop offset="0.5" stopColor={NAVY_MID} /><stop offset="1" stopColor={NAVY} />
                </linearGradient>
                <linearGradient id="tx-royal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#3A5DB4" /><stop offset="1" stopColor={NAVY_SOFT} />
                </linearGradient>
                <linearGradient id="tx-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={GOLD_PALE} /><stop offset="0.5" stopColor={GOLD} /><stop offset="1" stopColor={GOLD_DEEP} />
                </linearGradient>
                <linearGradient id="tx-pale" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#C9D8F2" /><stop offset="1" stopColor="#EEF3FC" />
                </linearGradient>
                <radialGradient id="tx-glow" cx="0.55" cy="0.4" r="0.7">
                    <stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EEF3FC" />
                </radialGradient>
            </defs>

            <rect x="0" y="0" width="794" height="1123" fill="url(#tx-glow)" />

            {/* faint guilloche waves across the paper */}
            <g fill="none" stroke="#DCE6F7" strokeWidth="1" opacity="0.8">
                {Array.from({ length: 11 }, (_, i) => (
                    <path key={i} d={`M-20 ${200 + i * 72} C 220 ${130 + i * 72}, 540 ${290 + i * 72}, 820 ${190 + i * 72}`} />
                ))}
            </g>

            {/* ---------------- the left wave, three layers deep */}
            <path d="M0 0 H176 C 132 70, 150 150, 168 210 C 186 280, 170 340, 128 380 C 92 414, 100 520, 108 620 C 116 720, 70 800, 40 880 C 22 930, 16 980, 0 1010 Z"
                  fill="url(#tx-pale)" opacity="0.75" />
            <path d="M0 0 H128 C 98 60, 104 120, 128 164 C 150 204, 160 236, 154 270 C 148 310, 118 330, 86 340 C 56 350, 50 386, 58 430 C 68 490, 72 560, 62 640 C 54 720, 30 790, 0 850 Z"
                  fill="url(#tx-wave)" />
            <path d="M0 0 H62 C 44 70, 40 130, 22 200 C 12 240, 8 270, 0 300 Z" fill="url(#tx-royal)" opacity="0.55" />
            {/* the deep edge strip, top to bottom */}
            <rect x="0" y="0" width="18" height="1123" fill="url(#tx-navy)" />

            {/* the gold lines that ride the wave */}
            <g fill="none" stroke="url(#tx-gold)" strokeLinecap="round">
                <path d="M136 0 C 106 60, 112 120, 136 164 C 158 204, 168 238, 162 272 C 156 314, 124 336, 92 346 C 64 356, 58 390, 66 432 C 76 492, 80 562, 70 642 C 62 722, 38 792, 8 852" strokeWidth="2.2" />
                <path d="M184 0 C 142 70, 158 150, 176 210 C 194 282, 178 344, 136 384 C 100 418, 108 522, 116 622 C 124 722, 78 802, 48 882 C 30 932, 24 982, 8 1012" strokeWidth="1.1" opacity="0.8" />
                <path d="M40 0 L 0 60" strokeWidth="1.6" />
                <path d="M76 0 L 0 110" strokeWidth="1" opacity="0.85" />
            </g>

            {/* ---------------- top-right corner */}
            <polygon points="794,0 690,0 794,98" fill="url(#tx-navy)" />
            <polygon points="690,0 676,0 794,112 794,98" fill="url(#tx-gold)" />
            <polygon points="676,0 648,0 794,140 794,112" fill="url(#tx-royal)" opacity="0.85" />
            <polygon points="648,0 642,0 794,146 794,140" fill="url(#tx-gold)" />

            {/* ---------------- bottom-left corner */}
            <polygon points="0,1123 0,990 124,1123" fill="url(#tx-navy)" />
            <polygon points="0,990 0,976 137,1123 124,1123" fill="url(#tx-gold)" />
            <polygon points="0,976 0,948 163,1123 137,1123" fill="url(#tx-royal)" opacity="0.88" />
            <polygon points="0,948 0,942 168,1123 163,1123" fill="url(#tx-gold)" />

            {/* ---------------- bottom-right corner, light, so the skyline reads */}
            <polygon points="794,1123 794,1010 690,1123" fill="url(#tx-navy)" />
            <polygon points="794,1010 794,996 676,1123 690,1123" fill="url(#tx-gold)" />

            {/* skyline and gears, faint, bottom right — the template's motif */}
            <g fill="#DCE6F7" stroke="#B5C6E6" strokeWidth="1.1" opacity="0.7" transform="translate(612 972) scale(0.9)">
                <path d="M0 100 V70 H16 V52 H28 V100 Z M30 100 V40 H44 V100 Z M46 100 V12 H54 V0 H58 V12 H66 V100 Z M68 100 V50 H86 V100 Z M88 100 V26 H100 V100 Z M102 100 V60 H122 V100 Z M124 100 V38 H136 V100 Z" />
                <circle cx="168" cy="54" r="24" fill="none" strokeWidth="5" strokeDasharray="7 5" />
                <circle cx="168" cy="54" r="12" fill="none" />
            </g>
        </svg>
    );
}

/** The medallion with its two ribbon tails, as the template hangs it. */
export function RibbonMedallion({ line = 'Tax Exemption' }: { line?: string } = {}) {
    return (
        <div className="relative h-[178px] w-[140px]">
            <svg className="absolute left-0 top-[92px] h-[86px] w-[140px]" viewBox="0 0 140 86" aria-hidden="true">
                <defs>
                    <linearGradient id="tx-tail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={NAVY_SOFT} /><stop offset="1" stopColor={NAVY} />
                    </linearGradient>
                </defs>
                <path d="M34 0 L66 8 L52 86 L40 70 L22 80 Z" fill="url(#tx-tail)" stroke={GOLD} strokeWidth="1.4" />
                <path d="M106 0 L74 8 L88 86 L100 70 L118 80 Z" fill="url(#tx-tail)" stroke={GOLD} strokeWidth="1.4" />
            </svg>
            <div className="absolute left-0 top-0">
                <CertificateMedallion line={line} className="h-[140px] w-[140px]" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------ furniture */

function Fact({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3.5">
            <Icon className="mt-0.5 h-[26px] w-[26px] shrink-0" style={{ color: NAVY_MID }} strokeWidth={2} />
            <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight" style={{ color: MUTED }}>{label}</p>
                <p className="mt-0.5 break-words text-[15.5px] font-bold leading-snug" style={{ color: INK }}>{value}</p>
            </div>
        </div>
    );
}

/**
 * The same certificate serves the DONOR documents too (`/donate/receipt`,
 * `/donate/statement`): one design for every 80G paper ACTIV issues.
 *
 *   stamp          a line under the Section 80G rule — "Provisional …" on a
 *                  year certificate whose financial year is still running.
 *   receiptColumn  adds a "Receipt No." column, so each monthly gift on the
 *                  year-end certificate ties back to its own receipt.
 *   amountInWords  printed under the table, as a tax officer expects.
 */
export default function TaxExemptionCertificate({ cert, stamp = '', receiptColumn = false, amountInWords = '' }: {
    cert: Certificate; stamp?: string; receiptColumn?: boolean; amountInWords?: string;
}) {
    const member = cert.member || ({} as Certificate['member']);
    const contribution = cert.contribution || null;

    const payments = (contribution?.payments && contribution.payments.length
        ? contribution.payments
        : (contribution && (contribution.amount !== null || contribution.receivedOn)
            ? [{ date: contribution.receivedOn, amount: contribution.amount, mode: 'Online', reference: contribution.reference }]
            : []));
    const total = payments.some((p) => typeof p.amount === 'number')
        ? payments.reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : 0), 0)
        : (typeof contribution?.amount === 'number' ? contribution.amount : null);

    const issued = longDate(cert.issuedAt);
    const fy = fullYear(cert.financialYear || '');

    const facts = [
        { icon: FileText, label: 'Certificate number', value: cert.reference || '' },
        { icon: CalendarRange, label: 'Financial year', value: fy },
        { icon: CalendarDays, label: 'Date of issue', value: issued },
        { icon: IdCard, label: 'Donor PAN', value: member.pan || '' },
        { icon: UserRound, label: 'Donor name', value: member.name || '' },
        { icon: IndianRupee, label: 'Total donation amount', value: total === null ? '' : rupees(total) },
    ].filter((f) => !!f.value);

    /* Room is finite on one page: past two payment rows the table and the seal
       tighten, and past six (a donor giving every month) the rows get smaller
       still — every payment of the year is listed, none is dropped. The
       zoom-to-fit below is the last resort. */
    const shown = payments;
    const dense = shown.length > 2;
    const tight = shown.length > 6;
    const cell = tight ? 'py-[1px]' : dense ? 'py-[3px]' : 'py-1.5';
    const headers = receiptColumn ? ['S.No', 'Date', 'Receipt No.', 'Amount', 'Mode'] : ['S.No', 'Date', 'Amount', 'Mode'];
    const name = member.name || '—';

    /* THE SHEET NEVER SPILLS. A long name, a five-row payment table and a
       wrapped address together run past 297mm, and the fixed one-page sheet
       would clip the foot. So the flow is measured once at full size and, only
       if it overflows, zoomed down to fit — zoom re-lays it out, so the foot
       still sits at the bottom. The frame stays full size behind it. */
    const flowRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState(1);
    useLayoutEffect(() => {
        const el = flowRef.current;
        if (!el || fit !== 1) return;
        const need = el.scrollHeight;
        const have = el.clientHeight;
        if (have > 0 && need > have + 1) setFit(Math.max(0.6, have / need));
    }, [fit, cert]);

    return (
        <CertificateSheet size="a4" bleed onePage letterhead={false} registrations={false} footNote={null}>
            <div className="relative flex w-full flex-1 flex-col overflow-hidden" style={{ background: '#FBFCFF', color: INK }}>
                <Frame />

                {/* In Chrome a percentage size on a zoomed box resolves against
                    the parent's VISUAL size, so inset-0 still fills the sheet
                    and the flow gets 1/fit more room to lay out in. */}
                <div ref={flowRef} className="absolute inset-0 flex flex-col" style={{ zoom: fit }}>
                {/* ============================================ head */}
                {/* The mark, centred on the same axis as the title below it (the
                    title's padding is uneven because of the wave and the medallion). */}
                <header className="relative z-10 flex justify-center pl-[120px] pr-[150px] pt-[38px]">
                    <img src="/logo_ACTIVian-removebg-preview.png" alt={ASSOCIATION_NAME} className="h-[74px] w-auto object-contain" />
                </header>

                {/* the ribboned medallion, top right */}
                <div className="absolute right-[22px] top-[132px] z-10">
                    <RibbonMedallion />
                </div>

                {/* ============================================ title */}
                <div className="relative z-10 mt-[16px] pl-[120px] pr-[150px] text-center">
                    <p className="text-[24px] font-medium uppercase tracking-[0.36em]" style={{ color: NAVY }}>Certificate of</p>
                    <h1 className="font-certificate text-[64px] font-bold leading-[1.02]" style={{ color: NAVY }}>Tax Exemption</h1>
                </div>
                <p className="relative z-10 mt-2 flex items-center justify-center gap-4 pl-[60px] pr-[40px] text-[13.5px] font-bold uppercase tracking-[0.24em]" style={{ color: NAVY }}>
                    <span className="h-[2px] w-14 shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
                    Under Section 80G · Income Tax Act, 1961
                    <span className="h-[2px] w-14 shrink-0" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
                </p>
                {stamp ? (
                    <p className="relative z-10 mx-auto mt-2 rounded-full border px-4 py-1 text-center text-[12.5px] font-bold uppercase tracking-[0.12em]"
                       style={{ color: '#92400E', borderColor: '#F3C98B', background: '#FFF7E8' }}>
                        {stamp}
                    </p>
                ) : null}

                {/* ============================================ holder */}
                <div className="relative z-10 mt-[14px] pl-[110px] pr-[70px] text-center">
                    <p className="text-[17px] tracking-wide" style={{ color: INK }}>This is to certify that</p>
                    <p className={`mt-1 break-words font-certificate font-bold leading-tight mx-auto max-w-[540px] ${name.length > 38 ? 'text-[27px]' : name.length > 26 ? 'text-[31px]' : 'text-[39px]'}`} style={{ color: NAVY }}>
                        {name}
                    </p>
                    {member.pan ? (
                        <p className="mt-1 flex items-center justify-center gap-2 text-[16px]" style={{ color: INK }}>
                            <UserRound className="h-[18px] w-[18px]" style={{ color: NAVY_MID }} fill={NAVY_MID} />
                            PAN No: <span className="font-bold">{member.pan}</span>
                        </p>
                    ) : null}
                    <p className="mx-auto mt-2 max-w-[500px] text-[15.5px] leading-[1.55]" style={{ color: INK }}>
                        has contributed to the {ASSOCIATION_NAME} (ACTIV), and the contribution is eligible for
                        exemption under Section 80G of the Income Tax Act, 1961.
                    </p>
                </div>

                {/* ============================================ the card */}
                <div className="relative z-10 mx-[88px] mt-[14px] rounded-2xl border bg-white/90 px-6 pb-3.5 pt-1"
                     style={{ borderColor: '#CFDBF1', boxShadow: '0 8px 26px -16px rgba(14,31,77,0.38)' }}>
                    <div className="grid grid-cols-2">
                        {facts.map((f, i) => (
                            <div key={f.label}
                                 className={`${dense ? 'py-1.5' : 'py-2'} ${i % 2 === 0 ? 'border-r pr-5' : 'pl-7'} ${i < facts.length - (facts.length % 2 === 0 ? 2 : 1) ? 'border-b' : ''}`}
                                 style={{ borderColor: '#E3EAF6' }}>
                                <Fact icon={f.icon} label={f.label} value={f.value} />
                            </div>
                        ))}
                    </div>

                    {shown.length > 0 && (
                        <div className="mt-0.5 border-t pt-2" style={{ borderColor: '#E3EAF6' }}>
                            <p className="mb-2 flex items-center gap-3.5 text-[14.5px] font-bold" style={{ color: INK }}>
                                <Link2 className="h-[22px] w-[22px]" style={{ color: NAVY_MID }} strokeWidth={2.2} /> Payment details
                            </p>
                            <table className={`w-full ${tight ? 'text-[12px]' : 'text-[14px]'}`} style={{ borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #CFDBF1', borderRadius: 8, overflow: 'hidden' }}>
                                <thead>
                                    <tr style={{ background: '#E6EDFA', color: INK }}>
                                        {headers.map((h, i) => (
                                            <th key={h} className={`px-3 ${cell} text-center font-bold ${i ? 'border-l' : ''}`} style={{ borderColor: '#CFDBF1' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((p, i) => (
                                        <tr key={i} style={{ color: INK }}>
                                            <td className={`border-t px-3 ${cell} text-center`} style={{ borderColor: '#E3EAF6' }}>{i + 1}</td>
                                            <td className={`border-l border-t px-3 ${cell} text-center`} style={{ borderColor: '#E3EAF6' }}>{longDate(p.date) || '—'}</td>
                                            {receiptColumn ? (
                                                <td className={`border-l border-t px-2 ${cell} text-center`} style={{ borderColor: '#E3EAF6' }}>{p.reference || '—'}</td>
                                            ) : null}
                                            <td className={`border-l border-t px-3 ${cell} text-center font-semibold`} style={{ borderColor: '#E3EAF6' }}>{rupees(p.amount)}</td>
                                            <td className={`border-l border-t px-3 ${cell} text-center`} style={{ borderColor: '#E3EAF6' }}>{p.mode || 'Online'}</td>
                                        </tr>
                                    ))}
                                    {shown.length > 1 && total !== null ? (
                                        <tr style={{ color: INK, background: '#F3F6FC' }}>
                                            <td colSpan={receiptColumn ? 3 : 2} className={`border-t px-3 ${cell} text-right font-bold`} style={{ borderColor: '#CFDBF1' }}>Total</td>
                                            <td className={`border-l border-t px-3 ${cell} text-center font-extrabold`} style={{ borderColor: '#CFDBF1' }}>{rupees(total)}</td>
                                            <td className="border-l border-t" style={{ borderColor: '#CFDBF1' }} />
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                            {amountInWords ? (
                                <p className="mt-1.5 text-center text-[13px] font-semibold italic" style={{ color: INK }}>{amountInWords}</p>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* the motto */}
                <div className="relative z-10 mt-[12px] flex items-center justify-center gap-4 px-[80px]">
                    <span className="h-[1.5px] w-[70px] shrink-0" style={{ background: GOLD }} />
                    <p className="text-center text-[14px] italic leading-[1.5]" style={{ color: NAVY_SOFT }}>
                        Your support empowers communities and creates<br />opportunities for a better tomorrow.
                    </p>
                    <span className="h-[1.5px] w-[70px] shrink-0" style={{ background: GOLD }} />
                </div>

                {/* the seal — no signatures on this certificate */}
                <div className="relative z-10 mt-[6px] flex justify-center">
                    <CertificateMedallion line="Community" className={dense ? 'h-[88px] w-[88px]' : 'h-[102px] w-[102px]'} />
                </div>

                {/* ============================================ foot */}
                <div className="relative z-10 mt-auto px-[150px] pb-[22px] text-center">
                    <p className="text-[14px] font-extrabold uppercase leading-snug tracking-[0.04em]" style={{ color: NAVY }}>{ASSOCIATION_NAME}</p>
                    <p className="mx-auto mt-1.5 flex max-w-[360px] items-start justify-center gap-2 text-[12.5px] leading-snug" style={{ color: INK }}>
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: NAVY_MID }} fill={NAVY_MID} stroke="#fff" /> {ADDRESS}
                    </p>
                    <p className="-mx-[40px] mt-2 flex items-center justify-center gap-x-3 whitespace-nowrap text-[12.5px]" style={{ color: INK }}>
                        <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" style={{ color: NAVY_MID }} />{PHONE}</span>
                        <span className="opacity-40">|</span>
                        <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" style={{ color: NAVY_MID }} />{EMAIL}</span>
                        <span className="opacity-40">|</span>
                        <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" style={{ color: NAVY_MID }} />{WEB}</span>
                    </p>
                    <span className="mt-3 block h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_LIGHT}, transparent)` }} />
                    {/* The reference: readable size and ink, on TWO fixed lines — the
                        number alone, then the date and the year — so nothing runs off
                        under the frame and no separator is ever stranded at a line end. */}
                    <div className="mx-auto mt-2 max-w-[520px] text-[11.5px] leading-[1.55]" style={{ color: INK }}>
                        <p>Certificate No: <strong className="tracking-[0.02em]">{cert.reference || '—'}</strong></p>
                        <p>
                            Issue Date: <strong>{issued || '—'}</strong>
                            {fy ? <><span className="mx-2 opacity-40">|</span>Valid for Financial Year: <strong>{fy}</strong></> : null}
                        </p>
                    </div>
                </div>
                </div>
            </div>
        </CertificateSheet>
    );
}
