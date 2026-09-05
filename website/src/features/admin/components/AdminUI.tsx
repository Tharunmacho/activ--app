import { type ReactNode } from 'react';
import { Menu, ArrowRight } from 'lucide-react';

/**
 * The admin area's visual language, in one file.
 *
 * WHY THIS EXISTS. Each admin screen had grown its own weights — `border` here
 * and `border-slate-200 shadow-sm` there, `font-medium text-slate-700` labels
 * against `font-semibold text-slate-700`, inputs at `py-2` beside inputs at
 * `h-11`. Individually invisible; together they made the admin area read as a
 * thinner, less finished product than the pages the public sees, which is the
 * wrong way round for the screens that run the association.
 *
 * WHAT THE LOOK IS. Modelled on the CRM dashboard supplied as a reference —
 * the treatment only, never its content:
 *
 *   - a near-white page, so a WHITE card is a raised surface rather than a
 *     rectangle that needs an outline to be seen;
 *   - cards at `rounded-2xl` with a hairline border and a two-layer shadow so
 *     soft it reads as depth rather than as a drop shadow;
 *   - a soft tinted rounded square behind every icon, which is what makes a
 *     row of headings scannable;
 *   - one loud element per view — a single solid-blue card carrying the number
 *     that matters — and everything else quiet;
 *   - numbers set large and tight, labels small and muted, so a figure is read
 *     before the word beside it.
 *
 * THE SIDEBAR IS DELIBERATELY NOT HERE. It keeps its own colour; the brief was
 * the cards, the type and the page behind them.
 *
 * Change a weight here and every admin screen moves together — which is the
 * point, and is what stopped being true when a dozen screens each held their
 * own copy of a card.
 */

// ---------------------------------------------------------------- foundations

/**
 * The page behind the cards.
 *
 * `slate-50` and not white: a white card on a white page has to be outlined to
 * exist, and an outline is a heavier, busier thing than the shadow that
 * replaces it here.
 */
/*
 * White, because the admin area is a white-theme product: the card is defined
 * by its border and its shadow rather than by contrast against a tinted page.
 * The earlier `slate-100/70` was worse than a tint — being translucent, it let
 * whatever the body painted show through and the admin screens picked up a
 * lavender wash nobody had chosen.
 */
export const ADMIN_BG = 'bg-white';

/**
 * The card.
 *
 * TWO SHADOW LAYERS, not one — a tight dark one for the contact edge and a
 * wider soft one for the lift. A single `shadow-md` at this radius reads as a
 * box that has come unstuck from the page.
 *
 * THE FIRST VERSION OF THIS WAS TOO FAINT. At 4% and 6% on a `slate-50` page,
 * the card and the page were within a few percent of each other and the whole
 * screen read as one flat wash — every panel present but none of them raised,
 * which is exactly the "looks light" complaint. The numbers here are roughly
 * doubled and the border is at full opacity, so a card is a surface sitting ON
 * the page rather than a rectangle drawn on it.
 *
 * Still nowhere near `shadow-xl`: the aim is depth an eye reads without
 * noticing, not a drop shadow it notices instead of the content.
 */
export const ADMIN_CARD =
    'bg-white border border-slate-200 rounded-2xl '
    + 'shadow-[0_1px_3px_rgba(16,24,40,0.10),0_6px_16px_-6px_rgba(16,24,40,0.12)]';

/** The same card, lifting on hover — for a card that is also a link. */
export const ADMIN_CARD_HOVER =
    ADMIN_CARD
    + ' transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300'
    + ' hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_16px_32px_-8px_rgba(16,24,40,0.16)]';

export const ADMIN_PAGE = 'p-6 space-y-6 max-w-[90rem]';

/** The registration forms' input, to the pixel. */
export const ADMIN_INPUT =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 '
    + 'outline-none transition-colors placeholder:text-slate-400 '
    + 'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 '
    + 'disabled:bg-slate-50 disabled:text-slate-400';

export const ADMIN_PRIMARY_BTN =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-blue-600 '
    + 'text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 '
    + 'disabled:opacity-60';

export const ADMIN_SECONDARY_BTN =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-slate-200 '
    + 'bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors '
    + 'hover:border-slate-300 hover:bg-slate-50';

/** The tinted square behind an icon. Quiet fill, saturated glyph. */
const TILE: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
};

export function AdminIconTile({ tone = 'blue', children, size = 'md' }: {
    tone?: keyof typeof TILE | string;
    children: ReactNode;
    size?: 'sm' | 'md';
}) {
    return (
        <span className={`${size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'} rounded-xl flex items-center
                          justify-center shrink-0 ${TILE[tone] || TILE.blue}`}>
            {children}
        </span>
    );
}

// ---------------------------------------------------------------- surfaces

export function AdminCard({
    icon,
    title,
    subtitle,
    actions,
    tone = 'blue',
    children,
    flush = false,
}: {
    icon?: ReactNode;
    title?: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    tone?: string;
    children?: ReactNode;
    /** For a card whose body is a table or list that should meet the edges. */
    flush?: boolean;
}) {
    const warning = tone === 'amber';

    return (
        <section className={warning
            ? 'bg-amber-50 border border-amber-200 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
            : ADMIN_CARD}>
            {(title || actions) && (
                <header className={`flex flex-wrap items-start gap-3 p-6 ${children ? 'pb-0' : ''} ${
                    flush ? 'border-b border-slate-100 pb-5' : ''
                }`}>
                    {icon && <AdminIconTile tone={tone}>{icon}</AdminIconTile>}
                    <div className="min-w-0 flex-1">
                        {title && (
                            <h2 className={`text-base font-bold tracking-tight ${
                                warning ? 'text-amber-900' : 'text-slate-900'
                            }`}>
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className={`text-sm mt-1 leading-relaxed ${
                                warning ? 'text-amber-800' : 'text-slate-500'
                            }`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions && <div className="shrink-0">{actions}</div>}
                </header>
            )}
            {children && <div className={flush ? '' : 'p-6'}>{children}</div>}
        </section>
    );
}

/**
 * The page banner.
 *
 * `flex-wrap` on the row and `min-w-0` on the text: the action button used to be
 * pushed off the right edge on a narrow window, and the page — which has no
 * horizontal scroll — simply clipped it.
 */
export function AdminPageHeader({
    title,
    subtitle,
    actions,
    onMenu,
}: {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    onMenu?: () => void;
}) {
    return (
        <header className="bg-white border-b border-slate-200/80 px-6 py-5 flex flex-wrap items-center gap-3">
            {onMenu && (
                <button className="lg:hidden text-slate-600" onClick={onMenu} aria-label="Open menu">
                    <Menu className="w-5 h-5" />
                </button>
            )}
            <div className="min-w-0 flex-1">
                <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">
                    {title}
                </h1>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
        </header>
    );
}

/**
 * A headline figure.
 *
 * ONE OF THESE IS `primary` PER VIEW, AND ONLY ONE. The solid fill is the
 * loudest thing on the page, and its whole job is to say which number to read
 * first; a row of four of them says nothing at all. The rest are white and
 * quiet, and the eye lands on the blue one.
 *
 * The number is set at `text-4xl` with tight tracking above a small muted label,
 * rather than the other way round, because a stat card is read as a figure that
 * happens to be labelled and not as a label that happens to have a figure.
 */
export function AdminStat({
    icon,
    label,
    hint,
    value,
    tone = 'blue',
    primary = false,
    footer,
    onClick,
}: {
    icon?: ReactNode;
    label: string;
    hint?: string;
    value: ReactNode;
    tone?: string;
    primary?: boolean;
    /** The action line along the bottom — text only; the arrow is drawn here. */
    footer?: string;
    onClick?: () => void;
}) {
    const interactive = !!onClick;

    const body = (
        <>
            <div className="flex items-start gap-3">
                {icon && (
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        primary ? 'bg-white/20 text-white' : (TILE[tone] || TILE.blue)
                    }`}>
                        {icon}
                    </span>
                )}
                <div className="min-w-0">
                    <p className={`text-base font-bold tracking-tight ${
                        primary ? 'text-white' : 'text-slate-900'
                    }`}>
                        {label}
                    </p>
                    {hint && (
                        <p className={`text-sm mt-0.5 leading-snug ${
                            primary ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                            {hint}
                        </p>
                    )}
                </div>
            </div>

            <p className={`mt-5 text-4xl font-bold tracking-tight tabular-nums ${
                primary ? 'text-white' : 'text-slate-900'
            }`}>
                {value}
            </p>

            {footer && (
                <span className={`mt-5 pt-4 flex items-center justify-between text-sm font-semibold border-t ${
                    primary
                        ? 'border-white/25 text-white'
                        : 'border-slate-100 text-slate-700 group-hover:text-blue-600'
                }`}>
                    {footer}
                    <ArrowRight className="w-4 h-4 shrink-0" />
                </span>
            )}
        </>
    );

    const shell = `group flex flex-col p-6 text-left w-full ${
        primary
            ? 'rounded-2xl bg-blue-600 shadow-[0_10px_28px_-6px_rgba(37,99,235,0.55)]'
            : (interactive ? ADMIN_CARD_HOVER : ADMIN_CARD)
    } ${interactive ? 'cursor-pointer' : ''}`;

    return interactive
        ? <button type="button" onClick={onClick} className={shell}>{body}</button>
        : <div className={shell}>{body}</div>;
}

/**
 * A pill toggle — "This week / This month".
 *
 * An inset track with the active option raised out of it in solid blue. Options
 * are data rather than children so the group can own its own semantics; see
 * `CmsChoice` for the same argument made at length.
 */
export function AdminSegmented<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    label?: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1"
        >
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(option.value)}
                        className={`rounded-full px-4 h-9 text-sm font-semibold transition-colors ${
                            active
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** `FormField` from the registration shell: bold label, hint underneath. */
export function AdminField({
    label,
    hint,
    full,
    required,
    children,
}: {
    label: string;
    hint?: ReactNode;
    full?: boolean;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={`min-w-0 ${full ? 'sm:col-span-2' : ''}`}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
        </div>
    );
}
