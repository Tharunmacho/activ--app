import { toast } from 'sonner';
import { Children, isValidElement, type ReactNode, type ReactElement } from 'react';
import { Loader2, AlertCircle, Save, X, Check } from 'lucide-react';

/**
 * Shared pieces for the CMS screens.
 *
 * Extracted because all seven screens have the same three states — loading,
 * failed, saving — and a screen that forgets one of them is a screen that
 * silently does nothing when the API is down. Defining them once means no
 * screen can omit them by accident.
 */

export function CmsCard({ title, description, children, actions }: {
    title: string;
    description?: string;
    children: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <section className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#1F1F1F] rounded-2xl overflow-hidden mb-6">
            <header className="px-6 pt-6 pb-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
                    {description && <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mt-1">{description}</p>}
                </div>
                {actions}
            </header>
            <div className="px-6 pb-6 pt-2">{children}</div>
        </section>
    );
}

/**
 * The page shell every manager sits in.
 *
 * One place decides how wide a manager is. `SiteSettingsManager` was capped at
 * `max-w-4xl` while `HomeManager` used the full column, so the two screens
 * ended at different points and the settings card left a wide band of empty
 * space beside it. The cap is gone: the CMS column is already padded by the
 * layout, and a form of labelled fields does not need a second margin inside
 * it.
 */
/**
 * Say that a save landed, where the editor is looking.
 *
 * Every manager used to report a save by swapping its own button's label to
 * "Saved" for two and a half seconds. On a long form that button is usually
 * scrolled off the bottom of the screen — an editor who pressed Ctrl+S, or who
 * clicked and then scrolled up to check their work, saw nothing at all and had
 * no way to tell whether the save had happened.
 *
 * A toast appears wherever the page is scrolled to. The inline label stays as
 * well: the two answer different questions — "did that work" and "which block
 * am I looking at".
 */
/**
 * Styled to the CMS panel, not to the page underneath it.
 *
 * `CmsLayout` scopes its `dark` class to its own subtree so the panel's theme
 * cannot leak into the public site. Sonner's Toaster renders at the app root —
 * outside that subtree — so it reads the *root* theme and would always appear
 * light while the CMS is dark. Reading the same `cms_theme` key the layout
 * writes keeps the two in step, and a failure to read it falls back to dark,
 * which is the panel's default.
 */
const cmsToastStyle = (accent: string) => {
    let dark = true;
    try { dark = localStorage.getItem('cms_theme') !== 'light'; } catch { /* private mode */ }

    return {
        background: dark ? '#0f172a' : '#ffffff',
        color: dark ? '#f8fafc' : '#0f172a',
        border: '1px solid ' + (dark ? '#1e293b' : '#e2e8f0'),
        borderLeft: '4px solid ' + accent,
    };
};

export const cmsSaved = (what: string) =>
    toast.success(what + ' saved', {
        description: 'The live site has been updated.',
        style: cmsToastStyle('#16a34a'),
    });

export const cmsFailed = (what: string, detail?: string) =>
    toast.error('Could not save ' + what.toLowerCase(), {
        description: detail,
        style: cmsToastStyle('#dc2626'),
        // Long enough to read a server message, since nothing else reports it.
        duration: 6000,
    });

export const cmsDeleted = (what: string) =>
    toast.success(what + ' deleted', { style: cmsToastStyle('#dc2626') });

export function CmsPage({ children }: { children: ReactNode }) {
    return <div className="w-full space-y-6 pb-12">{children}</div>;
}

/**
 * A titled division inside a card.
 *
 * Both managers grew their own version of this — an inline `<p>` with a
 * `border-t pt-6` wrapper, repeated at every division and drifting in weight,
 * spacing and wording between the two files. One component means a card reads
 * as sections everywhere rather than as one unbroken column of fields.
 *
 * The rule and the top padding are suppressed on the first section, so a card
 * does not open with a line immediately under its own heading.
 */
export function CmsSection({ title, hint, actions, children }: {
    title: string;
    hint?: string;
    /** Right-aligned control for this section, e.g. a Show toggle. */
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="pt-7 first:pt-0 border-t first:border-t-0 border-slate-200 dark:border-[#1F1F1F]">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
                    {hint && <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-1">{hint}</p>}
                </div>
                {actions}
            </div>
            {children}
        </section>
    );
}

/**
 * Work out how to empty the control this field wraps, without being told.
 *
 * Every text field in this CMS is written the same way — a controlled input
 * whose handler reads `e.target.value` and nothing else:
 *
 *     <CmsField label="Heading">
 *         <CmsInput value={x.heading} onChange={e => set({ heading: e.target.value })} />
 *     </CmsField>
 *
 * So the field already holds everything needed to clear itself: the current
 * value, and the function that sets it. Reading them off the child is what puts
 * a Clear button on ~200 fields across seven screens without touching a single
 * one of them — and, more importantly, on every field added from here on,
 * automatically. Wiring each by hand would have been the same behaviour with a
 * guarantee that somebody eventually forgets one.
 *
 * The synthetic event is a deliberate minimum: `target.value` and
 * `currentTarget.value`, which is the whole of what these handlers read. A
 * handler that reached for anything else would be the exception, and the
 * caller can always pass `onClear` explicitly instead.
 *
 * Deliberately NOT offered for:
 *   - checkboxes and radios, which have no empty state, only a false one
 *   - number inputs, where "empty" becomes 0 — a value with its own meaning
 *     (`pageSize: 0` means "show every image"), not an absence
 *   - anything that is not a plain text control, e.g. an icon or media picker,
 *     which carry their own Remove
 */
const inferClear = (children: ReactNode): (() => void) | undefined => {
    const child = Children.toArray(children).find(isValidElement) as ReactElement<Record<string, unknown>> | undefined;
    if (!child) return undefined;

    const isTextControl =
        child.type === CmsInput || child.type === CmsTextarea ||
        child.type === 'input' || child.type === 'textarea' || child.type === 'select';
    if (!isTextControl) return undefined;

    const { value, onChange, type } = (child.props || {}) as {
        value?: unknown; onChange?: unknown; type?: string;
    };

    if (type === 'checkbox' || type === 'radio' || type === 'number') return undefined;
    if (typeof value !== 'string' || value === '') return undefined;
    if (typeof onChange !== 'function') return undefined;

    return () => (onChange as (e: unknown) => void)({
        target: { value: '' },
        currentTarget: { value: '' },
    });
};

/**
 * One labelled control, with a Clear button when there is something to clear.
 *
 * Clearing IS deleting. The built-in fields cannot be removed from the form —
 * the public pages know them by name — but every one of them is hidden on the
 * site when it is empty, so emptying a field takes it off the page. The button
 * exists because that is not obvious, and because clearing a seven-line
 * write-up by dragging a cursor is tedious.
 *
 * `onClear` overrides the inference above; `canClear={false}` suppresses the
 * button on a field that must always hold a value.
 */
export function CmsField({ label, hint, children, onClear, canClear = true }: {
    label?: string;
    hint?: string;
    children: ReactNode;
    /** Empties this field. Omit to let the field work it out — see `inferClear`. */
    onClear?: () => void;
    /** False hides the button — typically "this field is already empty". */
    canClear?: boolean;
}) {
    const clear = onClear || inferClear(children);
    const showClear = !!clear && canClear;

    return (
        /*
          Still a <label>, so clicking the caption focuses the control as it
          always has. The button inside it stops its own click from propagating:
          without that, the label activates as well and the browser re-focuses
          the input in the same gesture that emptied it.
        */
        <label className="block">
            {(label || showClear) ? (
                <span className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-[#D4D4D8]">{label}</span>
                    {showClear && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); clear!(); }}
                            title="Empty this field — it is then not shown on the site"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-[#A1A1AA]
                                       hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </span>
            ) : null}
            {children}
            {hint && <span className="block text-xs text-slate-500 dark:text-[#A1A1AA] mt-1">{hint}</span>}
        </label>
    );
}

const inputBase =
    'w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#262626] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white ' +
    'placeholder:text-slate-400 dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all';

export function CmsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`${inputBase} ${props.className || ''}`} />;
}

/**
 * A colour, as a swatch and as text.
 *
 * Two controls over one value: the native picker for choosing, the text field
 * for pasting an exact brand hex. The picker alone cannot be given a value from
 * a brand guide; the text field alone makes an editor guess what #1c2e68 looks
 * like.
 *
 * Only `#rgb` / `#rrggbb` reaches the swatch, because a native colour input
 * silently resets to black on anything it cannot parse — which would look like
 * the field clearing itself while the value was being typed.
 */
export function CmsColorInput({ value, onChange, fallback = '#ffffff' }: {
    value: string;
    onChange: (next: string) => void;
    fallback?: string;
}) {
    const raw = (value || '').trim();
    const valid = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw);

    return (
        <div className="flex items-center gap-3">
            <input
                type="color"
                aria-label="Pick a colour"
                value={valid ? raw : fallback}
                onChange={e => onChange(e.target.value)}
                className="h-11 w-14 shrink-0 rounded-lg border border-slate-300 dark:border-[#262626]
                           bg-transparent p-1 cursor-pointer"
            />
            <CmsInput
                value={raw}
                onChange={e => onChange(e.target.value)}
                placeholder={fallback}
                spellCheck={false}
                className="font-mono uppercase"
            />
        </div>
    );
}

export function CmsTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`${inputBase} resize-y ${props.className || ''}`} />;
}

export function CmsButton({
    children, loading, variant = 'primary', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: 'primary' | 'ghost' | 'danger';
}) {
    const styles = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white',
        ghost: 'bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-800 dark:text-[#E4E4E7]',
        danger: 'bg-red-600 hover:bg-red-500 text-white',
    }[variant];

    return (
        <button
            {...rest}
            // Disabled while saving: a second click would fire a second write,
            // and for the singletons that is a race over the same document.
            disabled={rest.disabled || loading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${rest.className || ''}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {children}
        </button>
    );
}

export function SaveButton({ loading, label = 'Save changes' }: { loading?: boolean; label?: string }) {
    return (
        <CmsButton type="submit" loading={loading}>
            {!loading && <Save className="w-4 h-4" />}
            {loading ? 'Saving…' : label}
        </CmsButton>
    );
}

export function CmsLoading({ label = 'Loading…' }: { label?: string }) {
    return (
        <div className="flex items-center gap-3 text-slate-500 dark:text-[#A1A1AA] py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{label}</span>
        </div>
    );
}

/**
 * A failure the admin can act on.
 *
 * Shows the server's own message where there is one — the API answers with
 * things like "An image is required", which is more use than a generic
 * "something went wrong".
 */
export function CmsError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    if (!message) return null;
    return (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
                {onRetry && (
                    <button onClick={onRetry} className="text-xs text-red-700 dark:text-red-300 underline mt-1">
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
}

export function CmsEmpty({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="text-center py-12">
            <p className="text-slate-700 dark:text-[#D4D4D8] font-medium">{title}</p>
            {hint && <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mt-1">{hint}</p>}
        </div>
    );
}

/**
 * A pick-exactly-one choice, rendered as cards.
 *
 * WHY THIS EXISTS: three of these had been written separately — the audience
 * pair, the region-mode pair, the onboarding pair — and all three were TWO
 * INDEPENDENT TOGGLE BUTTONS carrying `aria-pressed`. They looked exclusive
 * because the styling was derived from one boolean, and they were not: two
 * pressed-state buttons are two on/off controls, so assistive tech announced
 * each as separately switchable, keyboard users tabbed through them as two
 * unrelated stops, and nothing on the card said "one of these" the way a radio
 * mark does. An editor reporting that both could be selected was reading the
 * control correctly; only the paint said otherwise.
 *
 * So: one `radiogroup`, `role="radio"` with `aria-checked`, and a visible mark.
 * `aria-checked` cannot be true on two radios of one group, and the mark makes
 * the exclusivity visible rather than implied by a border colour.
 *
 * ROVING TABINDEX AND ARROW KEYS, per the WAI-ARIA radio group pattern: the
 * group is ONE tab stop and the arrows move within it. Two tab stops for one
 * decision is the keyboard half of the same mistake.
 *
 * The options are data rather than children so the group can own that keyboard
 * behaviour. Three call sites passing JSX would be three chances to leave the
 * roving tabindex out of one of them.
 */
export function CmsChoice<T extends string>({
    label,
    value,
    options,
    onChange,
    size = 'md',
}: {
    /** Names the group for assistive tech; the visible heading is the section's. */
    label: string;
    value: T;
    options: { value: T; icon?: ReactNode; title: string; detail?: ReactNode }[];
    onChange: (value: T) => void;
    /** `lg` is the heavier treatment used where the choice leads a section. */
    size?: 'md' | 'lg';
}) {
    const index = options.findIndex(o => o.value === value);

    /*
     * Arrows wrap, and MOVE THE SELECTION, not just the focus.
     *
     * That is the standard behaviour for a radio group and the reason it is one
     * tab stop: there is always a selection, so arrowing to an option and
     * arrowing away again cannot leave the group in a state nobody chose.
     * Home/End are the same idea at the ends.
     */
    const onArrow = (e: React.KeyboardEvent) => {
        const last = options.length - 1;
        if (last < 1) return;

        // -1 when nothing matches, so the first arrow press lands on a real
        // option instead of counting from a phantom position.
        const from = index < 0 ? 0 : index;
        let next: number | null = null;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = from >= last ? 0 : from + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = from <= 0 ? last : from - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = last;

        if (next === null) return;
        e.preventDefault();
        onChange(options[next].value);

        // Focus follows selection, or the group announces a change the caret is
        // not standing on.
        const group = e.currentTarget.closest('[role="radiogroup"]');
        const radios = group ? group.querySelectorAll('[role="radio"]') : null;
        const target = radios ? radios[next] : null;
        if (target instanceof HTMLElement) target.focus();
    };

    const pad = size === 'lg' ? 'p-3.5 rounded-xl border-2' : 'p-3 rounded-lg border';

    return (
        <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2">
            {options.map((option, i) => {
                const selected = option.value === value;

                return (
                    <div
                        key={option.value}
                        role="radio"
                        aria-checked={selected}
                        /*
                         * ONE tab stop for the group. The selected option holds
                         * it; with nothing selected the first option does, so
                         * the group is never unreachable by keyboard.
                         */
                        tabIndex={selected || (index < 0 && i === 0) ? 0 : -1}
                        onClick={() => onChange(option.value)}
                        onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                onChange(option.value);
                                return;
                            }
                            onArrow(e);
                        }}
                        /* `min-w-0`: these sit in a grid column and the detail
                           line is a full sentence, which without it widens the
                           column past the card holding it. */
                        className={`min-w-0 cursor-pointer text-left transition-colors
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                                    focus-visible:ring-offset-1 ${pad} ${
                            selected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300'
                        }`}
                    >
                        <span className="flex items-start gap-2.5">
                            {/*
                              The mark. Drawn rather than borrowed from an
                              `<input type="radio">` so it keeps the card's own
                              colours in both themes — but it is what makes the
                              group readable as pick-one at a glance, which a
                              border tint alone never did.
                            */}
                            <span
                                aria-hidden="true"
                                className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center
                                            justify-center transition-colors ${
                                    selected
                                        ? 'border-blue-600'
                                        : 'border-slate-300 dark:border-[#3a3a3a]'
                                }`}
                            >
                                {selected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                            </span>

                            <span className="min-w-0">
                                <span className={`flex items-center gap-2 ${
                                    size === 'lg' ? 'text-sm font-bold' : 'text-sm font-semibold'
                                } ${
                                    selected
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-slate-800 dark:text-neutral-200'
                                }`}>
                                    {option.icon}
                                    <span className="min-w-0">{option.title}</span>
                                </span>

                                {option.detail && (
                                    <span className="block text-xs text-slate-500 dark:text-[#A1A1AA]
                                                     mt-1 leading-snug">
                                        {option.detail}
                                    </span>
                                )}
                            </span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * A single card that is on or off — an ADDITION, not a choice between two.
 *
 * The distinction from `CmsChoice` is the whole reason both exist, and getting
 * it wrong is not cosmetic. A pair of cards states "one of these two"; a
 * checkbox states "this as well". Rendering an addition as a pair claims the
 * unticked option is a real alternative that the ticked one replaces — so an
 * editor reading "Keep it inside the association | Post it in the onboarding
 * events section" reasonably concluded that posting it publicly TOOK IT AWAY
 * from the member dashboards. It never did: `event.service.listEvents` does not
 * read `showOnOnboarding` at all, and both are true at once.
 *
 * Use `CmsChoice` when the states are mutually exclusive in the data — the
 * region mode is, because the target list is either empty or it is not. Use
 * this when one state is the other plus something.
 */
export function CmsCheck({
    checked,
    onChange,
    icon,
    title,
    detail,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: ReactNode;
    title: string;
    detail?: ReactNode;
}) {
    return (
        <div
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onClick={() => onChange(!checked)}
            onKeyDown={(e) => {
                if (e.key !== ' ' && e.key !== 'Enter') return;
                e.preventDefault();
                onChange(!checked);
            }}
            className={`min-w-0 cursor-pointer text-left transition-colors p-3 rounded-lg border
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                        focus-visible:ring-offset-1 ${
                checked
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300'
            }`}
        >
            <span className="flex items-start gap-2.5">
                {/* Square, not round. The shape is the only thing distinguishing
                    this from a radio at a glance, and it is what says the option
                    is independent rather than one of a set. */}
                <span
                    aria-hidden="true"
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center
                                justify-center transition-colors ${
                        checked
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 dark:border-[#3a3a3a]'
                    }`}
                >
                    {checked && <Check size={11} strokeWidth={3} />}
                </span>

                <span className="min-w-0">
                    <span className={`flex items-center gap-2 text-sm font-semibold ${
                        checked
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-800 dark:text-neutral-200'
                    }`}>
                        {icon}
                        <span className="min-w-0">{title}</span>
                    </span>

                    {detail && (
                        <span className="block text-xs text-slate-500 dark:text-[#A1A1AA] mt-1 leading-snug">
                            {detail}
                        </span>
                    )}
                </span>
            </span>
        </div>
    );
}

/**
 * A card that is on or off, in the heavier "mode card" treatment.
 *
 * The visual is the original one — a thick border and a tinted fill, no
 * checkbox square — because that is what these read as best at the top of a
 * section. What changed is only the semantics behind it: `role="checkbox"` and
 * `aria-checked`, so several may be on at once and assistive tech says so.
 *
 * `CmsChoice` is the other shape, for a genuine one-of-N. Reach for this when
 * the options are independent — when ticking one does not un-tick another.
 */
export function CmsModeCard({
    checked,
    onChange,
    icon,
    title,
    detail,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: ReactNode;
    title: string;
    detail?: ReactNode;
}) {
    return (
        <div
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onClick={() => onChange(!checked)}
            onKeyDown={(e) => {
                if (e.key !== ' ' && e.key !== 'Enter') return;
                e.preventDefault();
                onChange(!checked);
            }}
            className={`min-w-0 cursor-pointer text-left rounded-xl border-2 p-3.5 transition-colors
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                        focus-visible:ring-offset-1 ${
                checked
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300'
            }`}
        >
            <span className={`inline-flex items-center gap-2 text-sm font-bold ${
                checked ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-neutral-200'
            }`}>
                {icon}
                {title}
            </span>
            <span className="block text-xs text-slate-500 dark:text-[#A1A1AA] mt-1 leading-snug">
                {detail}
            </span>
        </div>
    );
}
