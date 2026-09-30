import { useState } from 'react';
import { Link } from 'react-router-dom';
<<<<<<< HEAD
import { Mail, ArrowLeft, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import api from '@/services/api';
import { errorMessage } from '@/services/activApi';
import { ENDPOINTS } from '@/config/api.config';
import AuthSplitLayout from '@/shared/components/AuthSplitLayout';

/**
 * ============================================================================
 * FORGOT PASSWORD — by email, for members OR admins
 * ============================================================================
 *
 *   /forgot-password         members only
 *   /admin/forgot-password   admins the Super Admin created, and nobody else
 *
 * The screen sends `portal`, and the server looks the address up ONLY among
 * the accounts that screen serves. An admin's email typed into the member form
 * (or a member's into the admin form) sends nothing, and the reset never
 * reveals a password — it lets the owner of the mailbox choose a new one.
 *
 * Email only, deliberately: SMS / WhatsApp codes are billed per message, and
 * a reset link sent from the association's own mailbox costs nothing.
 *
 * The server answers identically whether or not the account exists, and so
 * does this page — anything else turns the form into a directory of who is
 * registered.
 *
 * No component is declared inside this function: a component type created
 * during render remounts its input on every keystroke, and on a phone the
 * keyboard closes after each letter.
 */

type Audience = 'member' | 'admin';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELD =
    'h-[3.25rem] w-full rounded-xl border bg-white pl-11 pr-4 text-[1.0625rem] font-medium text-slate-900 ' +
    'placeholder:font-normal placeholder:text-slate-400 transition-colors focus:outline-none ' +
    'focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:bg-slate-50';
const PRIMARY =
    'flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[1.0625rem] ' +
    'font-semibold text-white shadow-[0_12px_26px_-12px_rgb(37_99_235/0.9)] transition-colors ' +
    'hover:bg-blue-700 disabled:opacity-60';

export default function ForgotPassword({ audience = 'member' }: { audience?: Audience } = {}) {
    const forAdmins = audience === 'admin';
    const signIn = forAdmins ? '/admin/login' : '/login';

=======
import { Mail, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import api from '@/services/api';
import { errorMessage } from '@/services/activApi';
import { ENDPOINTS } from '@/config/api.config';

/**
 * Ask for a password reset link.
 *
 * The login page has linked to `/forgot-password` all along, and no such route
 * existed — the link fell through to the 404 page. The backend endpoints have
 * been there the whole time; this is the screen that was missing.
 *
 * The server answers identically whether or not the address is registered, and
 * so does this page. Saying "no account with that email" would turn the form
 * into a way of discovering which addresses have accounts, which is worth more
 * to someone guessing than the small convenience is to a member who mistyped.
 */
export default function ForgotPassword() {
>>>>>>> 8020f5d (Initial commit for website frontend)
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
<<<<<<< HEAD
        const address = (email || '').trim().toLowerCase();
        if (!EMAIL_RX.test(address)) {
            setError(address.includes('@')
                ? 'That email address is not complete — check for a typo.'
                : 'Enter the email address on your account.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: address, portal: audience });
=======

        const address = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
            setError('Enter the email address you registered with.');
            return;
        }

        setError('');
        setLoading(true);
        try {
            await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: address });
>>>>>>> 8020f5d (Initial commit for website frontend)
            setSent(true);
        } catch (err) {
            setError(errorMessage(err, 'Could not reach the server. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
<<<<<<< HEAD
        <AuthSplitLayout
            eyebrow={forAdmins ? 'ACTIV admin portal' : 'ACTIV member portal'}
            headline={<>Forgot your<br />password?</>}
            quote='"It happens to everyone"'
            lede={forAdmins
                ? 'A reset reaches only the administrator accounts the Super Admin has set up. The link goes to the email address on that account, and nobody else can use it.'
                : 'We will email you a secure link to choose a new password. Nobody at ACTIV can see your password, and a reset never shows it — you simply choose a new one.'}
            formEyebrow={forAdmins ? 'Admin account recovery' : 'Account recovery'}
            title={sent ? 'Check your email' : 'Reset your password'}
            subtitle={sent ? '' : forAdmins
                ? 'Only for administrator accounts created by the ACTIV Super Admin.'
                : 'Enter the email address you registered with.'}
            surface="card"
            assurance="Reset links expire in one hour and work only once."
        >
            {sent ? (
                <div className="text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <MailCheck className="h-8 w-8" />
                    </div>
                    <p className="text-[1.0625rem] leading-relaxed text-slate-600">
                        If <span className="break-all font-semibold text-slate-900">{(email || '').trim().toLowerCase()}</span>{' '}
                        belongs to {forAdmins ? 'an administrator account' : 'a member account'}, a reset link is on its
                        way. It expires in one hour and can be used once.
                    </p>
                    <p className="mt-3 text-[0.9375rem] text-slate-500">
                        Nothing arrived? Check your spam folder, or{' '}
                        <button type="button" onClick={() => setSent(false)} className="font-semibold text-blue-700 hover:underline">
                            try another address
                        </button>.
                    </p>
                    <Link to={signIn} className={`${PRIMARY} mt-7`}>Back to sign in</Link>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} noValidate>
                        <label htmlFor="fp-email" className="mb-2 block text-[1rem] font-semibold text-slate-800">
                            Email address
                        </label>
                        <div className="relative">
                            <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                id="fp-email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder={forAdmins ? 'admin@activ.org.in' : 'you@example.com'}
                                disabled={loading}
                                className={`${FIELD} ${error ? 'border-red-400' : 'border-slate-200'}`}
                            />
                        </div>
                        {error && <p role="alert" className="mt-2 text-[0.9375rem] font-medium text-red-600">{error}</p>}

                        <button type="submit" disabled={loading} className={`${PRIMARY} mt-6`}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? 'Sending…' : 'Send reset link'}
                        </button>
                    </form>

                    <Link
                        to={signIn}
                        className="mt-6 flex items-center justify-center gap-2 text-[1rem] font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to sign in
                    </Link>

                    {forAdmins && (
                        <p className="mt-5 flex items-start justify-center gap-2 text-center text-[0.875rem] text-slate-400">
                            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                            Member accounts cannot be reset here.
                        </p>
                    )}
                </>
            )}
        </AuthSplitLayout>
=======
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
                {sent ? (
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center
                                        justify-center mx-auto mb-5">
                            <MailCheck className="w-8 h-8 text-blue-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
                        <p className="text-gray-600 leading-relaxed mb-8">
                            If <span className="font-medium">{email.trim().toLowerCase()}</span> is
                            registered, a reset link is on its way. The link expires in one hour.
                        </p>

                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
                        <p className="text-gray-600 mb-8">
                            Enter the email address you registered with and we will send you a link
                            to set a new password.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        disabled={loading}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none
                                                    focus:ring-2 focus:ring-blue-600 focus:border-transparent
                                                    ${error ? 'border-red-400' : 'border-gray-200'}`}
                                    />
                                </div>
                                {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-[#1c2e68]
                                           hover:bg-blue-900 text-white py-3 rounded-xl font-semibold
                                           transition-colors disabled:opacity-60"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Sending…' : 'Send reset link'}
                            </button>
                        </form>

                        <Link
                            to="/login"
                            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to sign in
                        </Link>
                    </>
                )}
            </div>
        </div>
>>>>>>> 8020f5d (Initial commit for website frontend)
    );
}
