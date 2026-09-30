import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Loader2, ShieldCheck, AlertCircle, IdCard, Ticket } from 'lucide-react';
import { getPublicPass, passQrImageUrl, type PublicPass } from '@/services/eventCheckinApi';

/**
 * /checkin/:token — what an ORDINARY phone camera opens from an entry-pass QR.
 *
 * DELIBERATELY HARMLESS. The QR in a confirmation email is a URL so that a
 * camera app opens a web page rather than showing a string of characters; this
 * is that page. It says what the code is (an ACTIV event pass), names the event
 * and its date, and shows the QR again so the holder can present it from here.
 *
 * It never shows the attendee's name, booking reference, contact details or
 * payment, and it NEVER marks attendance. Only events staff, signed in to the
 * ACTIV mobile app, can read a name from the pass and let its holder in — so a
 * pass photographed in a queue, or scanned by the attendee out of curiosity,
 * gives nothing away and changes nothing.
 */

const TZ = 'Asia/Kolkata';
const when = (start: string | null, end: string | null) => {
    if (!start) return 'Date to be confirmed';
    const s = new Date(start);
    if (Number.isNaN(s.getTime())) return 'Date to be confirmed';
    const day = s.toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = s.toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
    const midnight = s.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) === '00:00';
    const e = end ? new Date(end) : null;
    const endTime = e && !Number.isNaN(e.getTime())
        ? e.toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
        : '';
    if (midnight && !endTime) return day;
    return `${day} · ${time}${endTime ? ` – ${endTime}` : ''} IST`;
};

export default function EventPassPage() {
    const { token = '' } = useParams();
    const [pass, setPass] = useState<PublicPass | null>(null);
    const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const data = await getPublicPass(token);
                if (!alive) return;
                if (data && data.event) { setPass(data); setState('ok'); } else setState('invalid');
            } catch (err: unknown) {
                if (!alive) return;
                const status = (err as { response?: { status?: number } })?.response?.status;
                setState(status === 404 || status === 400 ? 'invalid' : 'error');
            }
        })();
        return () => { alive = false; };
    }, [token]);

    useEffect(() => {
        document.title = 'ACTIV event pass';
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8 sm:py-14">
            <Link to="/" className="mb-6" aria-label="ACTIV home">
                <img src="/logo_ACTIVian-removebg-preview.png" alt="ACTIV" className="h-12 w-auto" />
            </Link>

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {state === 'loading' && (
                    <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" /> Checking the pass…
                    </div>
                )}

                {state === 'invalid' && (
                    <div className="p-6 sm:p-8 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
                        <h1 className="mt-3 text-xl font-semibold text-slate-900">Not a valid ACTIV pass</h1>
                        <p className="mt-2 text-slate-600 leading-relaxed">
                            This code is not an ACTIV event pass. Please use the QR code from your booking confirmation email.
                        </p>
                    </div>
                )}

                {state === 'error' && (
                    <div className="p-6 sm:p-8 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                        <h1 className="mt-3 text-xl font-semibold text-slate-900">Could not check this pass</h1>
                        <p className="mt-2 text-slate-600">Please check your connection and try again.</p>
                    </div>
                )}

                {state === 'ok' && pass && (
                    <>
                        <div className="bg-gradient-to-br from-slate-900 to-blue-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-100">
                                <Ticket className="w-4 h-4" /> ACTIV event pass
                            </div>
                            <h1 className="mt-2 text-xl sm:text-2xl font-semibold leading-snug break-words">
                                {pass.event.title || 'ACTIV event'}
                            </h1>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2 text-slate-700">
                                <div className="flex items-start gap-2 min-w-0">
                                    <CalendarDays className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
                                    <span className="break-words">{when(pass.event.startAt, pass.event.endAt)}</span>
                                </div>
                                {!!pass.event.venue && pass.event.mode !== 'online' && (
                                    <div className="flex items-start gap-2 min-w-0">
                                        <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
                                        <span className="break-words">{pass.event.venue}</span>
                                    </div>
                                )}
                            </div>

                            {pass.valid ? (
                                <>
                                    <img
                                        src={passQrImageUrl(token)}
                                        alt="Entry pass QR code"
                                        width={220}
                                        height={220}
                                        className="block mx-auto w-[220px] h-[220px] rounded-xl border border-slate-200 bg-white p-2"
                                    />
                                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-slate-700 leading-relaxed">
                                        <div className="flex items-center gap-2 font-semibold text-blue-800">
                                            <ShieldCheck className="w-5 h-5" /> Show this at the entrance
                                        </div>
                                        <p className="mt-1">
                                            The event staff will scan this pass with the ACTIV app to let you in.
                                            Scanning it anywhere else does not check you in.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 text-slate-600">
                                        <IdCard className="w-5 h-5 mt-0.5 shrink-0" />
                                        <span>Carry a valid government-issued photo ID with this pass.</span>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-rose-800 leading-relaxed">
                                    <div className="font-semibold">This pass is not valid for entry</div>
                                    <p className="mt-1">
                                        The booking behind it is not confirmed or has been cancelled. Please contact the
                                        event organiser.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <p className="mt-6 text-sm text-slate-400 text-center max-w-md">
                This page shows no personal details and does not record attendance.
            </p>
        </div>
    );
}
