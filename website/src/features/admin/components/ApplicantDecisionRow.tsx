import { useState } from 'react';
import { Check, X, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/**
 * One applicant in a drill-down, with the decision it is waiting for.
 *
 * Shared by the super admin's Hub and the district/state Hub, so a decision is
 * made the same way wherever the file was found. The three-tier workflow is not
 * re-implemented here and must not be: WHETHER this admin may act is `canAct` —
 * computed on the server from the caller's role, the tier the file sits at, and
 * whether the tiers beneath it are staffed at all — and acting goes through the
 * tier-agnostic `/applications/:id/approve`, which picks the tier and advances
 * the file one step.
 *
 * ---------------------------------------------------------------- reading it
 *
 * Three things have to be legible at a glance, and a grey pill said none of
 * them:
 *
 *   WHERE IT IS. Colour carries the state — amber is waiting, green is
 *   approved, red is rejected — because "Pending-District" and "Approved" as
 *   identical grey text is a list you have to read word by word. The left edge
 *   of the row carries the same colour, so a column of rows reads as a status
 *   column without any one of them being read.
 *
 *   WHOSE TURN IT IS. A pending file says which tier owes the decision, and
 *   whether that is you. "Pending-District" alone does not tell a super admin
 *   whether to act; "With District Admin" plus a button does.
 *
 *   THAT IT MOVED. A file this admin has just approved is gone from this list —
 *   it is now the next tier's, and it appears there. That is the server's doing;
 *   this component only has to not contradict it.
 */
export interface DecidableApplicant {
    id?: string;
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    /** The application's own status, e.g. `Pending-State`. The whole truth. */
    status?: string;
    /**
     * The same file as THIS level sees it — the server's `classifyForLevel`.
     *
     * `approved` here means "this tier approved it", not "the applicant is a
     * member": a file the district has passed on is approved to the district and
     * pending to the state, and both are true at once. This is what the badge
     * renders, because a district admin looking at their own list is asking what
     * they did with it, not what the state has yet to do.
     */
    stage?: 'pending' | 'approved' | 'rejected' | 'upstream' | 'closed';
    /** The server's answer: may the signed-in admin decide this file now? */
    canAct?: boolean;
    /** The tier that owes the next decision, when it is not this admin. */
    waitingOn?: string;
}

interface Props {
    applicant: DecidableApplicant;
    busy: boolean;
    onDecide: (id: string, approve: boolean, reason?: string) => void | Promise<void>;
}

type Tone = 'pending' | 'approved' | 'rejected';

/**
 * What this level's verdict looks like, and what it is called.
 *
 * Driven by `stage` — the server's answer for the level being browsed — not by
 * the raw status. Rendering the raw status is what made a file the district had
 * just approved still read "Pending · State" in the district's own list: true of
 * the application, and not an answer to the question the list is asking.
 *
 * `upstream` is a tier still waiting on an earlier one, and `closed` a file some
 * other tier rejected. Both are shown, neither is actionable — the bucket rules
 * in CLAUDE.md put them in "all" and in no action queue.
 */
const VERDICT: Record<string, { tone: Tone; label: string }> = {
    pending: { tone: 'pending', label: 'Pending' },
    upstream: { tone: 'pending', label: 'Waiting' },
    approved: { tone: 'approved', label: 'Approved' },
    rejected: { tone: 'rejected', label: 'Rejected' },
    closed: { tone: 'rejected', label: 'Rejected' },
};

/**
 * A stage from the raw status, for a payload that carries no stage.
 *
 * Matched on text rather than an enum because the collection holds three
 * spellings of every status — `Pending-Block`, `pending_block_approval` and bare
 * `approved` all reach this component.
 */
const stageFromStatus = (status: string): keyof typeof VERDICT => {
    const s = String(status || '').toLowerCase();
    if (s.includes('reject')) return 'rejected';
    if (s.includes('approved') && !s.includes('pending')) return 'approved';
    return 'pending';
};

const TONES: Record<Tone, { pill: string; edge: string; icon: typeof Clock }> = {
    pending: { pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', edge: 'bg-amber-400', icon: Clock },
    approved: { pill: 'bg-green-50 text-green-700 ring-1 ring-green-200', edge: 'bg-green-500', icon: CheckCircle2 },
    rejected: { pill: 'bg-red-50 text-red-700 ring-1 ring-red-200', edge: 'bg-red-500', icon: XCircle },
};

/** Fully approved, as opposed to approved by this tier and still travelling. */
const isFinal = (status: string) => String(status || '').toLowerCase() === 'approved';

export default function ApplicantDecisionRow({ applicant, busy, onDecide }: Props) {
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');

    const id = String(applicant.id || applicant._id || '');

    /*
     * `canAct` wins over the stage.
     *
     * They agree almost always. Where they part is the orphan case: the stage is
     * computed without coverage, so a file whose block has no admin still reads
     * `upstream` to the district — while `canAct`, which does read coverage, says
     * the district must decide it. Showing "Waiting" beside a live Approve button
     * would be the screen contradicting itself.
     */
    const stage = applicant.canAct ? 'pending' : (applicant.stage || stageFromStatus(applicant.status || ''));
    const verdict = VERDICT[stage] || VERDICT.pending;
    const { pill, edge, icon: Icon } = TONES[verdict.tone];

    return (
        <div className="relative">
            {/* The status as a colour, down the edge of the row. */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${edge}`} aria-hidden="true" />

            <div className="pl-5 pr-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                            {applicant.fullName || applicant.email || 'Applicant'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {applicant.email}{applicant.phone ? ` · ${applicant.phone}` : ''}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1
                                        rounded-full ${pill}`}
                            /* The whole truth on hover: the badge is this level's
                               verdict, the title is the application's own state. */
                            title={applicant.status || ''}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {verdict.label}
                        </span>

                        {/*
                          Where the file is now, said in words.

                          Two different sentences, and the distinction is the
                          point: "With District Admin" on a file this tier has not
                          decided means it is not yours yet, while "→ District
                          Admin" on one you just approved means you are done and
                          it has moved on. Both beat a bare badge, and when it IS
                          your turn the buttons are the answer, so nothing is said.
                        */}
                        {!applicant.canAct && applicant.waitingOn && !isFinal(applicant.status || '') && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                                <ArrowRight className="w-3.5 h-3.5" />
                                {stage === 'approved'
                                    ? `Sent to ${applicant.waitingOn} Admin`
                                    : `With ${applicant.waitingOn} Admin`}
                            </span>
                        )}

                        {applicant.canAct && (
                            <>
                                <button
                                    disabled={busy}
                                    onClick={() => onDecide(id, true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-600
                                               text-white text-xs font-semibold hover:bg-green-700
                                               disabled:opacity-50 transition-colors"
                                >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() => { setRejecting(v => !v); setReason(''); }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border
                                               border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50
                                               disabled:opacity-50 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" /> Reject
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {rejecting && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why is this being rejected?"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                            disabled={busy}
                            onClick={async () => { await onDecide(id, false, reason); setRejecting(false); setReason(''); }}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium
                                       hover:bg-red-700 disabled:opacity-50"
                        >
                            Confirm rejection
                        </button>
                        <button
                            onClick={() => { setRejecting(false); setReason(''); }}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
