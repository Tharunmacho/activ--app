import { useState, type ReactNode } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import MemberSidebar from './MemberSidebar';
import MemberTopBar from '@/features/member/components/MemberTopBar';
import { useNavigate } from 'react-router-dom';

export type ShellWidth = 'wide' | 'standard' | 'narrow';

/*
 * THE SAME THREE WIDTHS THE ADMIN AREA USES.
 *
 * `wide` was an uncapped `w-full`, so a dashboard ran edge to edge on a large
 * monitor while every admin screen stopped at 90rem — one product disagreeing
 * with itself about where the right margin is. One cap for every member screen
 * for the same reason: content that stops at one right margin on one screen and
 * a different one on the next reads as a layout fault even when each is fine
 * alone. Where the column SITS inside the window is decided below, by whether
 * there is a rail to act as the left margin.
 */
const WIDTHS: Record<ShellWidth, string> = {
    wide: 'max-w-[90rem]',
    // The same 90rem the admin screens and the dashboards use. `standard` and
    // `wide` differing by 18rem meant two member screens one click apart stopped
    // at different right margins for no reason a reader could see.
    standard: 'max-w-[90rem]',
    narrow: 'max-w-4xl',
};

/*
 * THE SAME PAGE, MEASURED FROM THE WINDOW EDGE RATHER THAN THE RAIL.
 *
 * A screen WITH the sidebar paints 18rem of rail plus a 90rem column — 108rem
 * of the window in total. A screen without one painted the 90rem column alone,
 * so a member walking from the dashboard into the four application steps
 * watched the product lose 18rem of width at the exact moment the rail
 * disappeared, and the difference came back as bare white down both sides.
 *
 * Railless screens are capped at that same 108rem instead, so every member
 * screen fills the window to the same place whether or not it has a rail. The
 * text column inside them does not get wider — the four forms still lay out in
 * two columns — the page simply stops leaving a gutter it has no use for.
 */
const RAILLESS: Record<ShellWidth, string> = {
    wide: 'max-w-[108rem]',
    standard: 'max-w-[108rem]',
    // Narrow is narrow on purpose — a single-column form does not want 108rem.
    narrow: 'max-w-4xl',
};

/**
 * The member page shell.
 *
 * `sidebar` decides whether this screen is a place a member navigates TO or a
 * step they are working THROUGH. The four screens the sidebar itself links to —
 * Dashboard, My Profile, Business Account, Explore Members — plus Settings keep
 * it, so its own links always lead somewhere that has it. The registration
 * forms, the submission screens and the whole payment flow do not: offering a
 * member four ways to leave halfway through paying is how a half-finished
 * application happens. Those get a back arrow instead.
 */
export default function MemberPageShell({
    title,
    subtitle,
    actions,
    width = 'standard',
    sidebar = true,
    backTo = '/member/unpaid-dashboard',
    children,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    width?: ShellWidth;
    /** False for a linear flow — see the note above. */
    sidebar?: boolean;
    /** Where the back arrow goes when there is no sidebar. */
    backTo?: string;
    children: ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {sidebar ? (
                <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            ) : null}

            <div className="flex-1 min-w-0 flex flex-col relative">
                <header className="h-[5.5rem] shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-6 sticky top-0 z-10">
                    {sidebar ? (
                        <button
                            type="button"
                            className="lg:hidden text-slate-500 hover:text-slate-700 shrink-0"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    ) : (
                        /* Without a rail there has to be a way out, at every width. */
                        <button
                            type="button"
                            className="shrink-0 w-9 h-9 rounded-lg border border-slate-200 flex items-center
                                       justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                            onClick={() => navigate(backTo)}
                            aria-label="Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="min-w-0">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 truncate">
                            {title}
                        </h1>
                        {subtitle ? (
                            <p className="text-sm text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>
                        ) : null}
                    </div>

                    {/*
                      * Messages and alerts, at the same place on every member
                      * screen.
                      *
                      * In the header rather than the rail on purpose: they are
                      * checked in passing, and a rail entry makes checking them
                      * a departure from whatever the member was doing. A screen's
                      * own `actions` sit to their left, so the two icons keep one
                      * fixed position the eye learns once.
                      *
                      * Not rendered without the rail: those screens are linear
                      * flows — the registration forms, the payment steps — and
                      * `MemberPageShell` already refuses to offer a way out of
                      * them. A notification panel is a way out.
                      */}
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                        {actions}
                        {sidebar ? <MemberTopBar /> : null}
                    </div>
                </header>

                {/*
                  * With a rail, the rail IS the left margin and the column is
                  * left-aligned behind it. Without one the column is centred and
                  * given the rail's width back — see RAILLESS above — so the
                  * page fills the window to the same place either way.
                  */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className={`w-full ${sidebar ? WIDTHS[width] : `${RAILLESS[width]} mx-auto`}`}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
