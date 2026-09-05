import { useMemo, useState } from 'react';
import { Plus, Trash2, Users, Clock, Lock, Globe, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import RegistrationFormBuilder, { type RegistrationField } from './RegistrationFormBuilder';
import { CmsField, CmsInput, CmsTextarea, CmsSection, CmsChoice } from './CmsUI';
import { listEventRegistrations, type EventRegistration } from '@/services/memberHubApi';
import { errorMessage } from '@/services/activApi';
import type { CmsAgendaItem, CmsSpeaker } from '@/services/cmsApi';

/**
 * The advanced half of the event editor (EVT-001, EVT-002).
 *
 * Split out of `EventsManager` rather than added to it. That file already
 * carries the events-section copy, the basics form and the listing; the agenda
 * builder alone is an array editor with add, remove and six fields per row, and
 * inlining it would have doubled the length of a component that is already the
 * longest in the CMS.
 *
 * Everything here is optional. An event announced with a title, a date and a
 * poster is a complete event — the association publishes plenty of them — so
 * none of these fields is required and none of them renders an empty row when
 * unused.
 */

export interface EventDetail {
    audience: 'all' | 'paid';
    agenda: CmsAgendaItem[];
    speakers: CmsSpeaker[];
    venueAddress: string;
    venueMapUrl: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    registrationEnabled: boolean;
    registrationDeadline: string;
    capacity: string;
    /** Rupees, as typed. Blank and "0" both mean a free event. */
    registrationFee: string;
    registrationNote: string;
    /** The questions THIS event asks, on top of the four standing ones. */
    registrationFields: RegistrationField[];
    reminderOffsetsHours: number[];
}

export const BLANK_DETAIL: EventDetail = {
    audience: 'all',
    agenda: [],
    speakers: [],
    venueAddress: '',
    venueMapUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    /*
     * NEW EVENTS ACCEPT REGISTRATIONS.
     *
     * This defaulted to `false`, which is the wrong way round for an
     * association: an event is posted so that members attend it, and one nobody
     * can register for is the exception rather than the rule. The whole
     * registration block — capacity, fee, deadline, the form builder — is hidden
     * behind this one tick, so an editor who never found it published seven
     * events in a row with no way to attend any of them and nothing on any
     * screen saying why. Measured against the live database: seven events, all
     * seven with registration off.
     *
     * Only the DEFAULT for a new event changes. Opening an existing event still
     * shows whatever it was saved with, and the tick still turns it off for the
     * events that genuinely are announcements.
     */
    registrationEnabled: true,
    registrationDeadline: '',
    capacity: '',
    registrationFee: '',
    registrationNote: '',
    registrationFields: [],
    reminderOffsetsHours: [],
};

const BLANK_AGENDA: CmsAgendaItem = {
    startTime: '', endTime: '', title: '', description: '', speaker: '', location: '',
};

const BLANK_SPEAKER: CmsSpeaker = {
    name: '', role: '', organization: '', bio: '', photoUrl: '',
};

/** The reminder offsets an editor can pick, in hours before the start. */
const REMINDERS: { hours: number; label: string }[] = [
    { hours: 168, label: '1 week' },
    { hours: 48, label: '2 days' },
    { hours: 24, label: '1 day' },
    { hours: 2, label: '2 hours' },
];

/**
 * A `datetime-local` value from a stored instant, in LOCAL time.
 *
 * Not `toISOString().slice(0, 16)`, which is the same trap `toDateInput` in
 * `EventsManager` documents: that produces UTC, so a deadline of 23:59 on the
 * 10th displays as 18:29 on the 10th to an editor in India and is silently
 * moved five and a half hours earlier the moment they press save.
 */
export const toLocalDateTimeInput = (value?: string | null): string => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function EventDetailFields({
    value,
    onChange,
    eventId,
}: {
    value: EventDetail;
    onChange: (detail: EventDetail) => void;
    /** Present only when editing — there are no registrations for a draft row. */
    eventId?: string | null;
}) {
    /*
     * OPEN BY DEFAULT.
     *
     * This panel holds the audience cards, the capacity, the fee and the
     * registration form builder — and it was collapsed, so an editor filling in
     * a new event saw a title, a date and a banner and reasonably concluded that
     * was the whole form. Reported as "I am not satisfied with the event fields"
     * and "customise fields should be there": they were there, behind a chevron
     * nothing drew the eye to.
     *
     * It still collapses, because an editor who only wants to fix a typo in the
     * title should be able to fold away four screens of programme detail. The
     * default is what changed, and it is the right way round: everything the
     * form can do is visible until someone chooses otherwise.
     */
    const [open, setOpen] = useState(true);
    const set = (patch: Partial<EventDetail>) => onChange({ ...value, ...patch });

    const updateAgenda = (index: number, patch: Partial<CmsAgendaItem>) => {
        const agenda = value.agenda.map((row, i) => (i === index ? { ...row, ...patch } : row));
        set({ agenda });
    };

    const updateSpeaker = (index: number, patch: Partial<CmsSpeaker>) => {
        const speakers = value.speakers.map((row, i) => (i === index ? { ...row, ...patch } : row));
        set({ speakers });
    };

    const toggleReminder = (hours: number) => {
        const current = value.reminderOffsetsHours || [];
        set({
            reminderOffsetsHours: current.includes(hours)
                ? current.filter((h) => h !== hours)
                : [...current, hours].sort((a, b) => b - a),
        });
    };

    return (
        <div className="sm:col-span-2 border-t border-slate-200 dark:border-[#1f1f1f] pt-4">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="w-full flex items-center justify-between gap-3 text-left"
            >
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-neutral-100">
                        Programme, speakers and registration
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {summarise(value)}
                    </span>
                </span>
                {open
                    ? <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />}
            </button>

            {open ? (
                <div className="mt-4 space-y-0">
                    {/* ---------------------------------------------- audience */}
                    <CmsSection
                        title="Who can see it"
                        hint="Separate from the draft/published control: that is whether it is ready, this is who it is for."
                    >
                        {/* Exclusive by construction — `audience` is one field —
                            and now exclusive to a keyboard and a screen reader
                            too. See `CmsChoice`. */}
                        <CmsChoice<'all' | 'paid'>
                            label="Who can see this event"
                            value={value.audience === 'paid' ? 'paid' : 'all'}
                            onChange={(audience) => set({ audience })}
                            options={[
                                {
                                    value: 'all',
                                    icon: <Globe className="w-4 h-4" />,
                                    title: 'Everyone',
                                    detail: 'On the public site and visible to every signed-in member.',
                                },
                                {
                                    value: 'paid',
                                    icon: <Lock className="w-4 h-4" />,
                                    title: 'Members only',
                                    detail: 'Only members with an active membership. Kept off the public site entirely.',
                                },
                            ]}
                        />
                    </CmsSection>

                    {/* ---------------------------------------------- agenda */}
                    <CmsSection
                        title="Agenda"
                        hint="Times are on the event's own day. Rows are sorted by start time when saved, so they can be added in any order."
                        actions={
                            <button
                                type="button"
                                onClick={() => set({ agenda: [...value.agenda, { ...BLANK_AGENDA }] })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                                           font-medium text-blue-600 dark:text-blue-400 border
                                           border-blue-200 dark:border-blue-500/30 hover:bg-blue-500/10"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add session
                            </button>
                        }
                    >
                        {value.agenda.length === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                No agenda. The event page shows its description instead.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {value.agenda.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border border-slate-200 dark:border-[#2a2a2a] p-3"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Clock className="w-4 h-4 text-neutral-400 mt-2.5 shrink-0" />

                                            <div className="grid gap-3 sm:grid-cols-4 flex-1 min-w-0">
                                                <CmsField label="Starts">
                                                    <CmsInput
                                                        type="time"
                                                        value={row.startTime}
                                                        onChange={(e) => updateAgenda(index, { startTime: e.target.value })}
                                                    />
                                                </CmsField>
                                                <CmsField label="Ends">
                                                    <CmsInput
                                                        type="time"
                                                        value={row.endTime}
                                                        onChange={(e) => updateAgenda(index, { endTime: e.target.value })}
                                                    />
                                                </CmsField>
                                                <div className="sm:col-span-2">
                                                    <CmsField label="Session">
                                                        <CmsInput
                                                            value={row.title}
                                                            placeholder="Inaugural address"
                                                            onChange={(e) => updateAgenda(index, { title: e.target.value })}
                                                        />
                                                    </CmsField>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <CmsField label="Speaker">
                                                        <CmsInput
                                                            value={row.speaker}
                                                            placeholder="Name as it should be printed"
                                                            onChange={(e) => updateAgenda(index, { speaker: e.target.value })}
                                                        />
                                                    </CmsField>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <CmsField label="Room / hall">
                                                        <CmsInput
                                                            value={row.location}
                                                            onChange={(e) => updateAgenda(index, { location: e.target.value })}
                                                        />
                                                    </CmsField>
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <CmsField label="Notes">
                                                        <CmsInput
                                                            value={row.description}
                                                            onChange={(e) => updateAgenda(index, { description: e.target.value })}
                                                        />
                                                    </CmsField>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                aria-label="Remove session"
                                                onClick={() => set({ agenda: value.agenda.filter((_, i) => i !== index) })}
                                                className="p-1.5 mt-2 rounded text-red-500 hover:bg-red-500/10 shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CmsSection>

                    {/* ---------------------------------------------- speakers */}
                    <CmsSection
                        title="Speakers"
                        hint="Listed on the event page. A session can name a speaker who is not listed here."
                        actions={
                            <button
                                type="button"
                                onClick={() => set({ speakers: [...value.speakers, { ...BLANK_SPEAKER }] })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                                           font-medium text-blue-600 dark:text-blue-400 border
                                           border-blue-200 dark:border-blue-500/30 hover:bg-blue-500/10"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add speaker
                            </button>
                        }
                    >
                        {value.speakers.length === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                No speakers listed.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {value.speakers.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border border-slate-200 dark:border-[#2a2a2a] p-3
                                                   flex items-start gap-2"
                                    >
                                        <div className="grid gap-3 sm:grid-cols-2 flex-1 min-w-0">
                                            <CmsField label="Name">
                                                <CmsInput
                                                    value={row.name}
                                                    onChange={(e) => updateSpeaker(index, { name: e.target.value })}
                                                />
                                            </CmsField>
                                            <CmsField label="Role">
                                                <CmsInput
                                                    value={row.role}
                                                    placeholder="Chief Guest"
                                                    onChange={(e) => updateSpeaker(index, { role: e.target.value })}
                                                />
                                            </CmsField>
                                            <CmsField label="Organisation">
                                                <CmsInput
                                                    value={row.organization}
                                                    onChange={(e) => updateSpeaker(index, { organization: e.target.value })}
                                                />
                                            </CmsField>
                                            <CmsField label="Photo URL" hint="Optional. Initials are shown without one.">
                                                <CmsInput
                                                    value={row.photoUrl}
                                                    onChange={(e) => updateSpeaker(index, { photoUrl: e.target.value })}
                                                />
                                            </CmsField>
                                            <div className="sm:col-span-2">
                                                <CmsField label="Short bio">
                                                    <CmsTextarea
                                                        rows={2}
                                                        value={row.bio}
                                                        onChange={(e) => updateSpeaker(index, { bio: e.target.value })}
                                                    />
                                                </CmsField>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            aria-label="Remove speaker"
                                            onClick={() => set({ speakers: value.speakers.filter((_, i) => i !== index) })}
                                            className="p-1.5 mt-2 rounded text-red-500 hover:bg-red-500/10 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CmsSection>

                    {/* ---------------------------------------------- venue */}
                    <CmsSection title="Venue and contact" hint="Shown beside the agenda on the member event page.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <CmsField label="Full address" hint="Under the venue name.">
                                    <CmsInput
                                        value={value.venueAddress}
                                        onChange={(e) => set({ venueAddress: e.target.value })}
                                    />
                                </CmsField>
                            </div>
                            <div className="sm:col-span-2">
                                <CmsField label="Map link" hint="Opens in a new tab.">
                                    <CmsInput
                                        value={value.venueMapUrl}
                                        placeholder="https://maps.app.goo.gl/…"
                                        onChange={(e) => set({ venueMapUrl: e.target.value })}
                                    />
                                </CmsField>
                            </div>
                            <CmsField label="Contact name">
                                <CmsInput
                                    value={value.contactName}
                                    onChange={(e) => set({ contactName: e.target.value })}
                                />
                            </CmsField>
                            <CmsField label="Contact phone">
                                <CmsInput
                                    value={value.contactPhone}
                                    onChange={(e) => set({ contactPhone: e.target.value })}
                                />
                            </CmsField>
                            <div className="sm:col-span-2">
                                <CmsField label="Contact email">
                                    <CmsInput
                                        type="email"
                                        value={value.contactEmail}
                                        onChange={(e) => set({ contactEmail: e.target.value })}
                                    />
                                </CmsField>
                            </div>
                        </div>
                    </CmsSection>

                    {/* ---------------------------------------------- registration */}
                    <CmsSection
                        title="Registration"
                        hint="Members take a seat from their dashboard. Leaving this off simply announces the event."
                    >
                        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={value.registrationEnabled}
                                onChange={(e) => set({ registrationEnabled: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600"
                            />
                            <span className="text-sm text-slate-800 dark:text-neutral-200">
                                Members can register for this event
                            </span>
                        </label>

                        {value.registrationEnabled ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <CmsField
                                    label="Capacity"
                                    hint="Blank or zero means unlimited. Beyond it, members join a waiting list."
                                >
                                    <CmsInput
                                        type="number"
                                        min={0}
                                        value={value.capacity}
                                        onChange={(e) => set({ capacity: e.target.value })}
                                    />
                                </CmsField>

                                {/*
                                  * The fee, beside the capacity it interacts with.
                                  *
                                  * A priced event takes registration in two steps:
                                  * the seat is held, then paid for. A waitlisted
                                  * member is never charged — there is no seat yet
                                  * to charge for — which is decided on the server,
                                  * not here.
                                  */}
                                <CmsField
                                    label="Registration fee (₹)"
                                    hint="Blank or zero is a free event. A fee adds a payment step before the seat is confirmed."
                                >
                                    <CmsInput
                                        type="number"
                                        min={0}
                                        step={1}
                                        placeholder="0"
                                        value={value.registrationFee}
                                        onChange={(e) => set({ registrationFee: e.target.value })}
                                    />
                                </CmsField>

                                <CmsField
                                    label="Registration closes"
                                    hint="Blank closes it when the event starts."
                                >
                                    <CmsInput
                                        type="datetime-local"
                                        value={value.registrationDeadline}
                                        onChange={(e) => set({ registrationDeadline: e.target.value })}
                                    />
                                </CmsField>

                                <div className="sm:col-span-2">
                                    <CmsField label="Note for registrants" hint="Shown above the register button.">
                                        <CmsInput
                                            value={value.registrationNote}
                                            placeholder="Please bring your membership certificate."
                                            onChange={(e) => set({ registrationNote: e.target.value })}
                                        />
                                    </CmsField>
                                </div>

                                {/*
                                  * The form this event asks, built here.
                                  *
                                  * Inside the `registrationEnabled` branch on
                                  * purpose: questions for a form nobody can
                                  * submit are questions nobody will ever answer,
                                  * and showing the builder anyway invites an
                                  * editor to spend ten minutes on one.
                                  */}
                                <div className="sm:col-span-2">
                                    <RegistrationFormBuilder
                                        fields={value.registrationFields}
                                        onChange={(registrationFields) => set({ registrationFields })}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <CmsField
                                        label="Remind registrants"
                                        hint="Shown on the event page. Delivery is not wired up yet."
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {REMINDERS.map(({ hours, label }) => {
                                                const on = (value.reminderOffsetsHours || []).includes(hours);
                                                return (
                                                    <button
                                                        key={hours}
                                                        type="button"
                                                        onClick={() => toggleReminder(hours)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium
                                                                    transition-colors ${
                                                            on
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-100 dark:bg-[#161616] text-neutral-500'
                                                        }`}
                                                    >
                                                        {label} before
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </CmsField>
                                </div>
                            </div>
                        ) : null}

                        {eventId ? <RegistrationList eventId={eventId} /> : null}
                    </CmsSection>
                </div>
            ) : null}
        </div>
    );
}

/** A one-line summary so the collapsed panel says what is inside it. */
function summarise(detail: EventDetail): string {
    const parts: string[] = [];

    parts.push(detail.audience === 'paid' ? 'Members only' : 'Open to everyone');
    if (detail.agenda.length) parts.push(`${detail.agenda.length} sessions`);
    if (detail.speakers.length) parts.push(`${detail.speakers.length} speakers`);
    if (detail.registrationEnabled) {
        parts.push(Number(detail.capacity) > 0 ? `${detail.capacity} seats` : 'registration open');
    }

    return parts.join(' · ');
}


// ---------------------------------------------------------------- attendees

/**
 * Who has registered.
 *
 * Loaded on demand rather than with the form. An attendee list is the one thing
 * on this screen that can be thousands of rows, and an editor changing a
 * session's start time has no reason to download it.
 */
function RegistrationList({ eventId }: { eventId: string }) {
    const [rows, setRows] = useState<EventRegistration[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});

    /**
     * One column per question anyone has actually answered.
     *
     * Derived from the ANSWERS, not from the event's current form. The organiser
     * can add, rename or delete a question after people have registered, and
     * every one of those cases breaks a table whose headings come from the live
     * form: a deleted question silently drops a column of real data, and a
     * renamed one relabels answers that were given under the old wording.
     *
     * Each answer carries the label it was captured under (see `responses` in
     * the registration model), so the first row to mention a key names the
     * column — and a question renamed halfway through keeps both spellings
     * visible rather than pretending everyone answered the new one.
     */
    const answerColumns = useMemo(() => {
        const seen = new Map<string, string>();

        (rows || []).forEach((row) => {
            (row.responses || []).forEach((answer) => {
                if (answer.key && !seen.has(answer.key)) seen.set(answer.key, answer.label || answer.key);
            });
        });

        return [...seen].map(([key, label]) => ({ key, label }));
    }, [rows]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await listEventRegistrations(eventId);
            setRows(data?.registrations || []);
            setCounts(data?.counts || {});
            setLoaded(true);
        } catch (err) {
            setError(errorMessage(err, 'Could not load the attendee list'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#1f1f1f]">
            {!loaded ? (
                <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                               text-slate-700 dark:text-neutral-200 border border-slate-200
                               dark:border-[#2a2a2a] hover:bg-slate-100 dark:hover:bg-[#161616]
                               disabled:opacity-60"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                    Show who has registered
                </button>
            ) : (
                <>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        {counts.registered || 0} registered
                        {counts.waitlist ? ` · ${counts.waitlist} waiting` : ''}
                        {counts.cancelled ? ` · ${counts.cancelled} cancelled` : ''}
                    </p>

                    {rows.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nobody yet.</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-neutral-500 border-b border-slate-200 dark:border-[#1f1f1f]">
                                        <th className="pb-2 pr-3 font-medium">Name</th>
                                        <th className="pb-2 pr-3 font-medium">Phone</th>
                                        <th className="pb-2 pr-3 font-medium">Region</th>
                                        {/*
                                          One column per question, from the
                                          ANSWERS rather than from the current
                                          form. The organiser can delete a
                                          question after people have answered it,
                                          and those answers still have to appear
                                          — reading the headings from the live
                                          form would silently drop a column of
                                          data that exists.
                                        */}
                                        {answerColumns.map((column) => (
                                            <th key={column.key} className="pb-2 pr-3 font-medium">
                                                {column.label}
                                            </th>
                                        ))}
                                        <th className="pb-2 pr-3 font-medium">Paid</th>
                                        <th className="pb-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.id} className="border-b border-slate-100 dark:border-[#161616]">
                                            <td className="py-2 pr-3 text-slate-800 dark:text-neutral-200">
                                                {row.memberName || '—'}
                                            </td>
                                            <td className="py-2 pr-3 text-neutral-500">{row.phone || '—'}</td>
                                            <td className="py-2 pr-3 text-neutral-500">
                                                {[row.block, row.district].filter(Boolean).join(', ') || '—'}
                                            </td>

                                            {answerColumns.map((column) => (
                                                <td key={column.key} className="py-2 pr-3 text-neutral-500">
                                                    {(row.responses || [])
                                                        .find((r) => r.key === column.key)?.value || '—'}
                                                </td>
                                            ))}

                                            {/*
                                              A seat can be held and unpaid, and
                                              on the day that is the difference
                                              between letting someone in and not.
                                            */}
                                            <td className="py-2 pr-3">
                                                {row.payment?.status === 'paid' ? (
                                                    <span className="text-emerald-600 font-medium">
                                                        ₹{row.payment.amount}
                                                    </span>
                                                ) : row.payment?.status === 'pending' ? (
                                                    <span className="text-amber-600 font-medium">Unpaid</span>
                                                ) : (
                                                    <span className="text-neutral-400">Free</span>
                                                )}
                                            </td>

                                            <td className="py-2 text-neutral-500 capitalize">{row.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}
        </div>
    );
}
