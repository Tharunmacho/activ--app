import { useEffect, useState } from 'react';
import {
    Pencil, Loader2, Eye, EyeOff, KeyRound, Wand2, Copy, Check, X,
    ShieldCheck, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { CARD_TITLE } from '@/components/layout/appTypography';
import {
    listStaffAccounts, updateStaffAccount, errorMessage, type StaffAccount,
} from '@/services/activApi';

/**
 * Site-staff accounts — the CMS admin and the events admin.
 *
 * The Super Admin maintains these credentials directly: name, email, phone,
 * active, and a new password. Nothing here reaches a super admin account (the
 * server refuses one whatever id is sent) and nothing here has a region — these
 * accounts run one portal each.
 *
 * A password set here is for SOMEBODY ELSE. It is stored as a bcrypt hash and
 * can never be shown again, so the form lets it be read back, generated, and
 * copied, and asks for confirmation before replacing the one that works today.
 */

const MIN = 8;

const strengthOf = (pw: string): { score: 0 | 1 | 2 | 3; label: string; bar: string; text: string } => {
    const value = pw || '';
    if (!value) return { score: 0, label: '', bar: 'bg-slate-200', text: 'text-slate-500' };
    let points = 0;
    if (value.length >= 12) points += 1;
    if (value.length >= 16) points += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1;
    if (/\d/.test(value)) points += 1;
    if (/[^A-Za-z0-9]/.test(value)) points += 1;
    if (value.length < MIN || points <= 1) return { score: 1, label: 'Weak', bar: 'bg-red-500', text: 'text-red-600' };
    if (points <= 3) return { score: 2, label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-700' };
    return { score: 3, label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-700' };
};

/** 16 characters from an unambiguous alphabet, at least one of each class. */
const generatePassword = (): string => {
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%*?-_+';
    const all = lower + upper + digits + symbols;
    const rand = (n: number) => {
        const buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        return buf[0] % n;
    };
    const chars = [lower, upper, digits, symbols].map(set => set[rand(set.length)]);
    while (chars.length < 16) chars.push(all[rand(all.length)]);
    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = rand(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

const formatWhen = (value: string | null) => {
    if (!value) return 'Never';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const INPUT = 'h-11 w-full px-3.5 rounded-xl border border-slate-200 text-[1.25rem] outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const LABEL = 'block text-[1.25rem] font-semibold text-slate-700 mb-2';

type Draft = {
    fullName: string; email: string; phoneNumber: string; active: boolean;
    setPassword: boolean; password: string; confirmPassword: string;
};

export default function SiteStaffAccounts() {
    const [accounts, setAccounts] = useState<StaffAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [reveal, setReveal] = useState<Record<string, boolean>>({});
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    /** Shown after a password change, on the card, until dismissed. */
    const [notice, setNotice] = useState<{ id: string; name: string } | null>(null);

    const load = async () => {
        setLoading(true);
        setFailed(false);
        try {
            setAccounts(await listStaffAccounts());
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openEdit = (a: StaffAccount) => {
        setEditingId(a.id);
        setReveal({});
        setConfirming(false);
        setCopied(false);
        setNotice(null);
        setDraft({
            fullName: a.fullName || '',
            email: a.email || '',
            phoneNumber: a.phoneNumber || '',
            active: a.active !== false,
            setPassword: false,
            password: '',
            confirmPassword: '',
        });
    };

    const close = () => {
        setEditingId(null);
        setDraft(null);
        setReveal({});
        setConfirming(false);
    };

    const patch = (next: Partial<Draft>) => {
        setDraft(prev => (prev ? { ...prev, ...next } : prev));
        setConfirming(false);
    };

    const passwordError = (d: Draft): string => {
        if (!d.setPassword) return '';
        if ((d.password || '').length < MIN) return `The new password must be at least ${MIN} characters.`;
        if (d.password !== d.confirmPassword) return 'The two passwords do not match.';
        return '';
    };

    const save = async (a: StaffAccount) => {
        if (!draft) return;
        const problem = passwordError(draft);
        if (problem) { toast.error(problem); return; }
        if (!draft.fullName.trim()) { toast.error('Full name is required'); return; }

        const emailChanged = draft.email.trim().toLowerCase() !== (a.email || '').toLowerCase();
        // Replacing a working credential is confirmed first — email is the other half of it.
        if ((draft.setPassword || emailChanged) && !confirming) {
            setConfirming(true);
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, any> = {
                fullName: draft.fullName.trim(),
                email: draft.email.trim().toLowerCase(),
                phoneNumber: draft.phoneNumber.trim(),
                active: draft.active,
            };
            if (draft.setPassword) payload.password = draft.password;

            const res = await updateStaffAccount(a.id, payload);
            const changed: string[] = Array.isArray(res?.changed) ? res.changed : [];

            if (changed.length === 0) toast.message('Nothing to change');
            else toast.success(`${a.roleLabel || 'Account'} updated`);

            if (changed.includes('password')) setNotice({ id: a.id, name: draft.fullName.trim() || a.email });
            close();
            await load();
        } catch (err) {
            setConfirming(false);
            toast.error(errorMessage(err, 'Could not update this account'));
        } finally {
            setSaving(false);
        }
    };

    const passwordField = (name: 'password' | 'confirmPassword', label: string) => {
        if (!draft) return null;
        const shown = !!reveal[name];
        return (
            <div className="min-w-0">
                <label htmlFor={`staff-${name}`} className={LABEL}>{label}</label>
                <div className="relative">
                    <input
                        id={`staff-${name}`}
                        type={shown ? 'text' : 'password'}
                        value={draft[name]}
                        onChange={(e) => patch({ [name]: e.target.value } as Partial<Draft>)}
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`${INPUT} pr-10 font-mono`}
                    />
                    <button
                        type="button"
                        onClick={() => setReveal(prev => ({ ...prev, [name]: !prev[name] }))}
                        aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                        aria-pressed={shown}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                    >
                        {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        );
    };

    const editor = (a: StaffAccount) => {
        if (!draft) return null;
        const strength = strengthOf(draft.password);
        const mismatch = draft.setPassword && draft.confirmPassword.length > 0 && draft.password !== draft.confirmPassword;
        const emailChanged = draft.email.trim().toLowerCase() !== (a.email || '').toLowerCase();

        return (
            <form
                onSubmit={(e) => { e.preventDefault(); save(a); }}
                className="mt-5 pt-5 border-t border-slate-200 space-y-5"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                        <label htmlFor="staff-fullName" className={LABEL}>Full name</label>
                        <input id="staff-fullName" value={draft.fullName} autoComplete="off"
                            onChange={(e) => patch({ fullName: e.target.value })} className={INPUT} />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="staff-phone" className={LABEL}>Phone (optional)</label>
                        <input id="staff-phone" type="tel" value={draft.phoneNumber} autoComplete="off"
                            onChange={(e) => patch({ phoneNumber: e.target.value })} className={INPUT} />
                    </div>
                    <div className="min-w-0 md:col-span-2">
                        <label htmlFor="staff-email" className={LABEL}>Sign-in email</label>
                        <input id="staff-email" type="email" value={draft.email} autoComplete="off" spellCheck={false}
                            onChange={(e) => patch({ email: e.target.value })} className={INPUT} />
                        {emailChanged && (
                            <p className="mt-1.5 text-[1.1875rem] text-amber-700">
                                They will sign in with this address from now on. It must not be used by any other admin or member.
                            </p>
                        )}
                    </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                    <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) => patch({ active: e.target.checked })}
                        className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <span className="min-w-0">
                        <span className="block text-[1.25rem] font-semibold text-slate-800">Account active</span>
                        <span className="block text-[1.1875rem] text-slate-500">
                            Untick to stop this account signing in. Nothing is deleted.
                        </span>
                    </span>
                </label>

                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.setPassword}
                            onChange={(e) => patch({ setPassword: e.target.checked, password: '', confirmPassword: '' })}
                            className="mt-1 h-4 w-4 accent-blue-600"
                        />
                        <span className="min-w-0">
                            <span className="flex items-center gap-2 text-[1.25rem] font-semibold text-slate-800">
                                <KeyRound className="w-4 h-4 text-blue-600" /> Set a new password
                            </span>
                            <span className="block text-[1.1875rem] text-slate-500">
                                Replaces the current one. Leave unticked to keep it.
                            </span>
                        </span>
                    </label>

                    {draft.setPassword && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {passwordField('password', 'New password')}
                                {passwordField('confirmPassword', 'Confirm new password')}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex-1 min-w-0 sm:!min-w-[12rem]">
                                    <div className="grid grid-cols-3 gap-1" aria-hidden="true">
                                        {[1, 2, 3].map(i => (
                                            <span key={i} className={`h-1.5 rounded-full ${strength.score >= i ? strength.bar : 'bg-slate-200'}`} />
                                        ))}
                                    </div>
                                    <p className={`mt-1.5 text-[1.1875rem] ${mismatch ? 'text-red-600' : strength.text}`}>
                                        {mismatch
                                            ? 'The two passwords do not match.'
                                            : strength.label
                                                ? `${strength.label} — at least ${MIN} characters; 12+ with mixed case, a number and a symbol is strong.`
                                                : `At least ${MIN} characters; 12+ with mixed case, a number and a symbol is strong.`}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const pw = generatePassword();
                                            patch({ password: pw, confirmPassword: pw });
                                            setReveal({ password: true });
                                            setCopied(false);
                                        }}
                                        className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 text-[1.1875rem] font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Wand2 className="w-4 h-4 text-blue-600" /> Generate
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!draft.password}
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(draft.password);
                                                setCopied(true);
                                            } catch {
                                                toast.error('Could not copy — select the password and copy it by hand');
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 text-[1.1875rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {confirming && (
                    <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                        <p className="min-w-0 text-[1.25rem] text-amber-900">
                            {draft.setPassword
                                ? <>The password <strong className="break-all">{a.email}</strong> signs in with today will stop working. Copy the new one first — it cannot be shown after saving. </>
                                : null}
                            {emailChanged
                                ? <>The sign-in email changes to <strong className="break-all">{draft.email.trim().toLowerCase()}</strong>. </>
                                : null}
                            Press <strong>Confirm and save</strong> to go ahead.
                        </p>
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={close}
                        className="h-11 w-full sm:w-auto px-6 rounded-xl border border-slate-200 text-[1.25rem] font-semibold text-slate-700 hover:border-slate-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 px-6 rounded-xl bg-blue-600 text-white text-[1.25rem] font-semibold disabled:opacity-60"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirming ? 'Confirm and save' : 'Save changes'}
                    </button>
                </div>
            </form>
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4" aria-labelledby="staff-accounts-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="staff-accounts-title" className={`${CARD_TITLE} text-slate-900`}>Site staff accounts</h2>
                    <p className="text-[1.25rem] text-slate-500 mt-0.5">
                        The CMS and events sign-ins. You keep their credentials — reset a password here and nobody else is needed.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    aria-label="Reload staff accounts"
                    className="shrink-0 grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading && accounts.length === 0 ? (
                <div className="flex items-center gap-3 py-6 text-slate-500 text-[1.25rem]">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading staff accounts…
                </div>
            ) : failed ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[1.25rem] text-red-800 flex flex-wrap items-center justify-between gap-3">
                    <span>Could not load the staff accounts.</span>
                    <button type="button" onClick={load} className="font-semibold underline">Try again</button>
                </div>
            ) : accounts.length === 0 ? (
                <p className="py-4 text-[1.25rem] text-slate-500">No CMS or events staff account exists yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {accounts.map((a) => {
                        const editing = editingId === a.id;
                        return (
                            <article key={a.id} className={`rounded-xl border p-4 sm:p-5 ${editing ? 'border-blue-300 ring-4 ring-blue-500/10' : 'border-slate-200'}`}>
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-slate-900 text-[1.3125rem] [overflow-wrap:anywhere]">{a.fullName || 'Unnamed account'}</p>
                                            <span className="text-[1.0625rem] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a.roleLabel}</span>
                                            {!a.active && (
                                                <span className="text-[1.0625rem] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Deactivated</span>
                                            )}
                                        </div>
                                        <p className="text-[1.1875rem] text-slate-600 break-all">{a.email}</p>
                                        <p className="text-[1.1875rem] text-slate-500">
                                            {a.phoneNumber ? `${a.phoneNumber} · ` : ''}Last sign-in: {formatWhen(a.lastLoginAt)}
                                        </p>
                                    </div>
                                    {!editing && (
                                        <button
                                            type="button"
                                            onClick={() => openEdit(a)}
                                            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 text-[1.1875rem] font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                    )}
                                    {editing && (
                                        <button type="button" onClick={close} aria-label="Close editor"
                                            className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:text-slate-700 shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {notice?.id === a.id && !editing && (
                                    <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                        <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                                        <p className="min-w-0 flex-1 text-[1.25rem] text-emerald-900">
                                            Password changed. Share the new password with {notice.name} securely — in person or by
                                            phone, not in a group chat. It cannot be shown again.
                                        </p>
                                        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
                                            className="shrink-0 text-emerald-700 hover:text-emerald-900">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {editing && editor(a)}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
