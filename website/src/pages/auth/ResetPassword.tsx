<<<<<<< HEAD
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import api from '@/services/api';
import { errorMessage } from '@/services/activApi';
import { ENDPOINTS } from '@/config/api.config';
import AuthSplitLayout from '@/shared/components/AuthSplitLayout';

/**
 * Set a new password — from the link in the reset email.
 *
 *   /reset-password?token=…         member accounts only
 *   /admin/reset-password?token=…   admin accounts only
 *
 * The token is checked against the server BEFORE the form is shown, and the
 * server looks it up only among the accounts this screen serves (`portal`).
 *
 * THE KEYBOARD BUG. The card wrapper used to be a component declared INSIDE
 * this function (`const Shell = (…) => …`). That is a brand-new component type
 * on every render, so each keystroke unmounted and remounted the input: focus
 * was lost and on a phone the keyboard closed after every letter, which is why
 * a full password could not be typed. Everything here is either plain JSX or
 * a module-level component — keep it that way.
 */

type Audience = 'member' | 'admin';

const FIELD =
    'h-[3.25rem] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-[1.0625rem] font-medium ' +
    'text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition-colors focus:outline-none ' +
    'focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:bg-slate-50';
const PRIMARY =
    'flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[1.0625rem] ' +
    'font-semibold text-white shadow-[0_12px_26px_-12px_rgb(37_99_235/0.9)] transition-colors ' +
    'hover:bg-blue-700 disabled:opacity-60';

function PasswordField({ id, label, value, onChange, show, onToggle, disabled, autoFocus }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; disabled?: boolean; autoFocus?: boolean;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[1rem] font-semibold text-slate-800">{label}</label>
            <div className="relative">
                <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus={autoFocus}
                    disabled={disabled}
                    className={FIELD}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    /* Keep focus in the field: tapping the eye must not close the phone keyboard. */
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center
                               rounded-lg text-slate-400 hover:text-slate-700"
                >
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
    );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
    return (
        <li className={`flex items-center gap-2 text-[0.9375rem] ${ok ? 'text-green-700' : 'text-slate-500'}`}>
            <span className={`flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full
                              ${ok ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Check size={12} className={ok ? 'opacity-100' : 'opacity-30'} />
            </span>
            {text}
        </li>
    );
}

function Centered({ icon, tone, children }: { icon: React.ReactNode; tone: 'amber' | 'green' | 'slate'; children: React.ReactNode }) {
    const bg = tone === 'amber' ? 'bg-amber-50 text-amber-500' : tone === 'green' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500';
    return (
        <div className="text-center">
            <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${bg}`}>{icon}</div>
            {children}
        </div>
    );
}

export default function ResetPassword({ audience = 'member' }: { audience?: Audience } = {}) {
    const forAdmins = audience === 'admin';
    const signIn = forAdmins ? '/admin/login' : '/login';
    const forgot = forAdmins ? '/admin/forgot-password' : '/forgot-password';

=======
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { errorMessage } from '@/services/activApi';
import { ENDPOINTS } from '@/config/api.config';

/**
 * Set a new password from the link in the reset email.
 *
 * The token arrives in the query string — `buildResetUrl` on the server builds
 * `/reset-password?token=…`, so this page must read it from there and nowhere
 * else.
 *
 * It is checked against the server BEFORE the form is shown. Letting someone
 * type a new password twice and only then learn the link expired is a waste of
 * their time, and the check is one cheap request.
 */
export default function ResetPassword() {
>>>>>>> 8020f5d (Initial commit for website frontend)
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';

    const [checking, setChecking] = useState(true);
    const [valid, setValid] = useState(false);
<<<<<<< HEAD
    const [account, setAccount] = useState('');
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setChecking(false);
            setValid(false);
<<<<<<< HEAD
            return undefined;
        }

        let cancelled = false;
        api.get(ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, { params: { token, portal: audience } })
            .then((res) => {
                if (cancelled) return;
                const payload = res.data?.data || res.data || {};
                setValid(!!payload?.valid);
                setAccount(String(payload?.email || ''));
=======
            return;
        }

        let cancelled = false;
        api.get(ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, { params: { token } })
            .then((res) => {
                if (cancelled) return;
                const payload = res.data?.data ?? res.data ?? {};
                setValid(!!payload.valid);
>>>>>>> 8020f5d (Initial commit for website frontend)
            })
            .catch(() => { if (!cancelled) setValid(false); })
            .finally(() => { if (!cancelled) setChecking(false); });

        return () => { cancelled = true; };
<<<<<<< HEAD
    }, [token, audience]);

    const rules = useMemo(() => {
        const p = password || '';
        return {
            length: p.length >= 8,
            mixed: /[a-z]/.test(p) && /[A-Z]/.test(p),
            number: /\d/.test(p),
            symbol: /[^A-Za-z0-9]/.test(p),
        };
    }, [password]);
    const score = Object.values(rules).filter(Boolean).length;
    const strength = !password ? '' : score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
    const barColour = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-500' : 'bg-green-600';
    const matches = !!confirm && password === confirm;
=======
    }, [token]);
>>>>>>> 8020f5d (Initial commit for website frontend)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

<<<<<<< HEAD
        // The server's own minimum is 6; ask for 8 here so a new password is a
        // real one, without refusing what an older client could still set.
        if ((password || '').length < 8) {
            setError('Use at least 8 characters.');
=======
        // Mirrors the server's own minimum, so a password it will refuse never
        // costs a round trip.
        if (password.length < 6) {
            setError('Your new password must be at least 6 characters.');
>>>>>>> 8020f5d (Initial commit for website frontend)
            return;
        }
        if (password !== confirm) {
            setError('The two passwords do not match.');
            return;
        }

        setError('');
        setSaving(true);
        try {
<<<<<<< HEAD
            await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password, portal: audience });
=======
            await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
>>>>>>> 8020f5d (Initial commit for website frontend)
            setDone(true);
        } catch (err) {
            setError(errorMessage(err, 'That link is no longer valid. Request a new one.'));
        } finally {
            setSaving(false);
        }
    };

<<<<<<< HEAD
    const title = checking ? 'One moment' : !valid ? 'Link expired' : done ? 'Password changed' : 'Set a new password';
    const subtitle = checking || !valid || done
        ? ''
        : account ? `For the account ${account}.` : 'Choose a password you have not used here before.';

    return (
        <AuthSplitLayout
            eyebrow={forAdmins ? 'ACTIV admin portal' : 'ACTIV member portal'}
            headline={<>Choose a new<br />password</>}
            quote='"Secure access, simply"'
            lede="Pick something you have not used before on ACTIV. Once it is saved, the link you used stops working, and you can sign in straight away with the new password."
            formEyebrow={forAdmins ? 'Admin account recovery' : 'Account recovery'}
            title={title}
            subtitle={subtitle}
            surface="card"
            assurance="Your new password is stored encrypted. Nobody at ACTIV can read it."
        >
            {checking ? (
                <div className="flex items-center justify-center gap-3 py-8 text-[1.0625rem] text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Checking your link…
                </div>
            ) : !valid ? (
                <Centered tone="amber" icon={<AlertCircle className="h-8 w-8" />}>
                    <p className="text-[1.0625rem] leading-relaxed text-slate-600">
                        Reset links last one hour and work once. Request a new one and it will work
                        straight away.
                    </p>
                    <Link to={forgot} className={`${PRIMARY} mt-7`}>Request a new link</Link>
                    <Link to={signIn} className="mt-5 inline-flex items-center gap-2 text-[1rem] font-semibold text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-4 w-4" /> Back to sign in
                    </Link>
                </Centered>
            ) : done ? (
                <Centered tone="green" icon={<CheckCircle2 className="h-8 w-8" />}>
                    <p className="text-[1.0625rem] leading-relaxed text-slate-600">
                        Your password has been updated. Sign in with your new password.
                    </p>
                    <button type="button" onClick={() => navigate(signIn, { replace: true })} className={`${PRIMARY} mt-7`}>
                        Sign in
                    </button>
                </Centered>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <PasswordField
                            id="rp-password"
                            label="New password"
                            value={password}
                            onChange={(v) => { setPassword(v); setError(''); }}
                            show={show}
                            onToggle={() => setShow((s) => !s)}
                            disabled={saving}
                            autoFocus
                        />

                        {password && (
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
                                        {[1, 2, 3, 4].map((i) => (
                                            <span key={i} className={`h-1.5 rounded-full ${i <= score ? barColour : 'bg-slate-200'}`} />
                                        ))}
                                    </div>
                                    <span className="w-14 text-right text-[0.875rem] font-semibold text-slate-600">{strength}</span>
                                </div>
                                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    <Rule ok={rules.length} text="At least 8 characters" />
                                    <Rule ok={rules.mixed} text="Upper and lower case" />
                                    <Rule ok={rules.number} text="A number" />
                                    <Rule ok={rules.symbol} text="A symbol" />
                                </ul>
                            </div>
                        )}

                        <PasswordField
                            id="rp-confirm"
                            label="Confirm new password"
                            value={confirm}
                            onChange={(v) => { setConfirm(v); setError(''); }}
                            show={show}
                            onToggle={() => setShow((s) => !s)}
                            disabled={saving}
                        />
                        {confirm && (
                            <p className={`-mt-2 text-[0.9375rem] font-medium ${matches ? 'text-green-700' : 'text-amber-600'}`}>
                                {matches ? 'Passwords match.' : 'Passwords do not match yet.'}
                            </p>
                        )}

                        {error && <p role="alert" className="text-[0.9375rem] font-medium text-red-600">{error}</p>}

                        <button type="submit" disabled={saving} className={PRIMARY}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Saving…' : 'Change password'}
                        </button>
                    </form>

                    <Link
                        to={signIn}
                        className="mt-6 flex items-center justify-center gap-2 text-[1rem] font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to sign in
                    </Link>
                </>
            )}
        </AuthSplitLayout>
=======
    const Shell = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">{children}</div>
        </div>
    );

    if (checking) {
        return (
            <Shell>
                <div className="flex items-center justify-center gap-3 text-gray-500 py-8">
                    <Loader2 className="w-5 h-5 animate-spin" /> Checking your link…
                </div>
            </Shell>
        );
    }

    if (!valid) {
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">This link has expired</h1>
                    <p className="text-gray-600 mb-8">
                        Reset links last one hour and can be used once. Request a new one and it will
                        work straight away.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="inline-block bg-[#1c2e68] hover:bg-blue-900 text-white px-6 py-3
                                   rounded-xl font-semibold transition-colors"
                    >
                        Send a new link
                    </Link>
                </div>
            </Shell>
        );
    }

    if (done) {
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Password changed</h1>
                    <p className="text-gray-600 mb-8">You can now sign in with your new password.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-[#1c2e68] hover:bg-blue-900 text-white px-8 py-3 rounded-xl
                                   font-semibold transition-colors"
                    >
                        Sign in
                    </button>
                </div>
            </Shell>
        );
    }

    const field = (
        id: string, label: string, value: string, set: (v: string) => void, autoComplete: string,
    ) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => { set(e.target.value); setError(''); }}
                    autoComplete={autoComplete}
                    disabled={saving}
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );

    return (
        <Shell>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
            <p className="text-gray-600 mb-8">Choose a password you have not used here before.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {field('password', 'New password', password, setPassword, 'new-password')}
                {field('confirm', 'Confirm new password', confirm, setConfirm, 'new-password')}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-[#1c2e68]
                               hover:bg-blue-900 text-white py-3 rounded-xl font-semibold
                               transition-colors disabled:opacity-60"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving…' : 'Change password'}
                </button>
            </form>

            <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
        </Shell>
>>>>>>> 8020f5d (Initial commit for website frontend)
    );
}
