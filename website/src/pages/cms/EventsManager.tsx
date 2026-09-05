import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, Check, Loader2 } from 'lucide-react';
import {
    getCmsEvents, createCmsEvent, updateCmsEvent, deleteCmsEvent,
    getEventsSettings, updateEventsSettings,
    errorMessage, EMPTY_MEDIA,
    type CmsEvent, type EventsSettings, type CmsMedia,
} from '@/services/cmsApi';
import {
    CmsCard,
    CmsField,
    CmsInput,
    CmsTextarea,
    CmsButton,
    CmsLoading,
    CmsError,
    CmsEmpty,
    cmsSaved,
    cmsFailed,
    cmsDeleted,
    CmsPage,
    CmsSection,
    CmsChoice,
    CmsCheck,
} from './components/CmsUI';
import MediaPicker from './components/MediaPicker';
import RegionTargetPicker from './components/RegionTargetPicker';
import { StatList, IconPicker, RepeatableList , ExtraFieldsEditor } from './components/CmsEditors';
import { CmsMediaFrame } from '@/components/shared/CmsMediaFrame';
import EventDetailFields, {
    BLANK_DETAIL, toLocalDateTimeInput, type EventDetail,
} from './components/EventDetailFields';
import { Lock, Globe, Building2, MapPin } from 'lucide-react';

/**
 * Events.
 *
 * These are the platform's events, not a CMS-only copy: the same records the
 * member app reads. The draft/published control is what separates "written"
 * from "announced".
 *
 * Two props make one component serve two surfaces:
 *
 *   `channel`  WHICH SITE the event belongs to. **CMS -> Events** posts the
 *              onboarding programme; **Super Admin -> Events** posts the
 *              association's own, which never appears on the public pages.
 *              This used to be inferred from `audience: paid`, which held only
 *              while an event was also restricted to paying members — the
 *              moment one was opened to everyone in a block it appeared on a
 *              national marketing page.
 *
 *   `defaultAudience`  WHO may see it, within that site. Both surfaces open at
 *              `all` now: an event aimed at a block is for everyone standing
 *              in that block, paid or not. The members-only switch stays on
 *              the form for events that are genuinely a membership benefit.
 */

export type EventAudienceDefault = 'all' | 'paid';

/** Hints long enough that inlining them buries the markup they sit in. */
const NO_MATCH_HINT =
    'Shown when a search or filter finds nothing. {query} is replaced with what was searched for.';

const CHIP_HINT =
    'An "All" chip is always shown first. A chip label is what the category on an event '
    + 'must match to appear under that filter.';

const BLANK = {
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    category: '',
    /*
     * Who the event is aimed at. Empty means everyone.
     *
     * The fields have been on the Event model since it was written and the
     * form never offered them, so every event ever created here was national.
     */
    /*
     * A LIST of regions, not one.
     *
     * The single state/district/block trio could express exactly one region, so
     * an event for eight blocks had to be posted eight times — eight records,
     * eight registration lists, eight things to correct when the venue moved.
     * The server still stores those three fields, mirrored from the first entry
     * for the mobile app's benefit, and derives them itself; nothing here has
     * to send them.
     */
    targets: [] as { state: string; district: string; block: string }[],
    /*
     * Whether this event is advertised on the onboarding site's events section.
     *
     * The blank value is the safe one; the real default comes from the surface
     * — see `openNew`, which sets it from `channel` the same way it sets the
     * audience. An admin-area event is internal until somebody says otherwise,
     * and a CMS event is onboarding content by definition.
     */
    showOnOnboarding: false,
    /*
     * "Everyone in the association" — the first of the two audience cards.
     *
     * Held beside `targets`, not derived from it, so both cards survive a save.
     * `true` on a blank form: a new event goes to the whole association until
     * someone narrows it, which is the safer default of the two and the one the
     * form has always opened on.
     */
    reachEveryone: true,
    media: { ...EMPTY_MEDIA } as CmsMedia,
    status: 'published' as 'published' | 'draft',
    /*
     * Agenda, speakers, audience and registration (EVT-001, EVT-002).
     *
     * Nested rather than flattened into this object so that the whole advanced
     * panel can be handed to one component and read back as one value. It also
     * keeps the two halves separable at save time: everything above is what an
     * event has always had, everything in here is additive.
     */
    detail: { ...BLANK_DETAIL } as EventDetail,
};

/**
 * Is this event aimed at particular regions?
 *
 * Both representations are consulted, the same way the server does it: the
 * `targets` list is the real answer, and the legacy `state`/`district`/`block`
 * trio carries the one region of any row written before multi-targeting.
 */
const hasTargets = (e: CmsEvent) =>
    (Array.isArray(e?.targets) && e.targets.length > 0)
    || !!(e?.state || e?.district || e?.block);

/**
 * Is this event on the onboarding site right now?
 *
 * The browser's copy of `onboardingVisibility.isOnboardingContent`, and it has
 * to stay the browser's copy of it: the form shows this back as a chosen
 * option, so a form that computed it differently from the server would tell an
 * editor their event is public when it is not, or the reverse.
 *
 * Read from the EVENT's own channel rather than from the surface the editor
 * happens to be standing on. The same event is reachable from both screens, and
 * "is the public reading this" is a fact about the event.
 */
const isOnPublicSite = (e: CmsEvent) =>
    e?.showOnOnboarding === true
    || ((e?.channel || 'public') === 'public' && !hasTargets(e));

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Read a stored instant back into the two form inputs, in LOCAL time.
 *
 * Both halves must use the same clock. Taking the date from `toISOString()` and
 * the time from `getHours()` mixes UTC with local, so an event at 01:30 local
 * on the 7th shows as the 6th at 01:30 — the right time on the wrong day.
 */
const toDateInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toTimeInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Turn the date and time inputs into an unambiguous instant.
 *
 * Sent as `startAt` rather than as a `date` + `time` pair, because the server
 * would otherwise parse the pair in ITS OWN timezone. In development that is
 * the same clock as the editor and looks correct; on a UTC host an event
 * entered as 2.30pm is stored as 2.30pm UTC and shown to visitors in Chennai as
 * 8pm. Building the instant here — where the editor's timezone IS the intended
 * one — removes the guess.
 */
const toInstant = (date: string, time: string): string => {
    if (!date) return '';
    const [h, m] = (time || '00:00').split(':').map(Number);
    const d = new Date(date + 'T00:00:00');
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d.toISOString();
};

export default function EventsManager({
    defaultAudience = 'all',
    channel = 'public',
    showSectionCopy = channel === 'public',
}: {
    defaultAudience?: EventAudienceDefault;
    /**
     * Whether to render the section-copy panel above the list.
     *
     * That panel edits the ONBOARDING PAGE's furniture — the eyebrow, heading
     * and blurb above the public events grid, the category chips, the
     * empty-state sentence. It is website copy, it belongs to the CMS, and it
     * was the first thing the super admin saw on a screen whose whole job is
     * posting the association's own programme: five cards of wording for a page
     * they were not editing, above the one control they came for.
     *
     * Defaulted from `channel` rather than passed everywhere, because the two
     * answers have never differed: the surface that posts onboarding content is
     * the surface that owns the onboarding page's copy.
     */
    showSectionCopy?: boolean;
    /**
     * WHICH SITE an event posted from this screen belongs to.
     *
     * The CMS posts the onboarding site's programme; the super admin's Events
     * screen posts the association's own, for member dashboards and the app.
     * Declared by the screen rather than inferred from the role, because the
     * same super admin uses both and the answer is about where they are
     * standing, not who they are.
     */
    channel?: 'public' | 'members';
} = {}) {
    const [events, setEvents] = useState<CmsEvent[]>([]);
    const [settings, setSettings] = useState<EventsSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [savingCopy, setSavingCopy] = useState(false);
    const [savedCopy, setSavedCopy] = useState(false);

    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
    const [showForm, setShowForm] = useState(false);
    /**
     * Which audience the list is showing.
     *
     * The programme is one list of everything ever posted, and the question
     * an administrator actually arrives with is "what did we send to
     * Ariyalur". Built from the events themselves rather than from the region
     * tree: only targets in use are worth offering, and the tree has 6,966
     * blocks.
     */
    const [targetFilter, setTargetFilter] = useState('all');
    const [saving, setSaving] = useState(false);

    const targetOf = (e: CmsEvent) => e.targetLabel || 'Everyone';

    const targetOptions = Array.from(new Set(events.map(targetOf)))
        .sort((a, b) => (a === 'Everyone' ? -1 : b === 'Everyone' ? 1 : a.localeCompare(b)));

    const visibleEvents = targetFilter === 'all' ? events : events.filter(e => targetOf(e) === targetFilter);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            // Together: the list and the copy around it are independent, and
            // waiting for one before asking for the other doubles the delay.
            const [list, config] = await Promise.all([getCmsEvents(), getEventsSettings()]);
            setEvents(list);
            setSettings(config);
        } catch (err) {
            setError(errorMessage(err, 'Could not load events'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const saveCopy = async () => {
        if (!settings) return;
        setSavingCopy(true);
        setSavedCopy(false);
        setError('');
        try {
            setSettings(await updateEventsSettings(settings));
            setSavedCopy(true);
            cmsSaved('Section copy');
            setTimeout(() => setSavedCopy(false), 2500);
        } catch (err) {
            setError(errorMessage(err, 'Could not save the section copy'));
        } finally {
            setSavingCopy(false);
        }
    };

    const openNew = () => {
        setEditing(null);
        // The audience this surface opens at. See the note at the top.
        setForm({
            ...BLANK,
            /*
             * The onboarding answer this surface opens at.
             *
             * `true` in the CMS: that screen exists to post the onboarding
             * site's programme, so anything written there is public content
             * unless the editor says otherwise. `false` in the admin area,
             * where an event is the association's own until someone chooses to
             * advertise it. Both defaults are the answer the editor would have
             * given, which is the only reason a default is safe here.
             */
            showOnOnboarding: channel === 'public',
            reachEveryone: true,
            detail: { ...BLANK.detail, audience: defaultAudience },
        });
        setShowForm(true);
    };

    const openEdit = (e: CmsEvent) => {
        setEditing(e.id);
        setForm({
            title: e.title || '',
            description: e.description || '',
            date: toDateInput(e.startAt),
            time: toTimeInput(e.startAt),
            endTime: toTimeInput(e.endAt),
            location: e.location || '',
            category: e.category || '',
            /*
             * The list, with the legacy fields as the fallback.
             *
             * A row written before multi-targeting has no `targets` and carries
             * its one region in the three old fields. Reading it back as a
             * one-entry list is what lets an editor open such an event, add a
             * second block and save it without losing the first.
             */
            targets: Array.isArray(e.targets) && e.targets.length
                ? e.targets.map((t: any) => ({
                    state: t.state || '', district: t.district || '', block: t.block || '',
                }))
                : (e.state
                    ? [{ state: e.state, district: e.district || '', block: e.block || '' }]
                    : []),
            /*
             * WHERE THIS EVENT IS *CURRENTLY* PUBLISHED, not just the flag.
             *
             * Derived the way `onboardingVisibility.isOnboardingContent` derives
             * it on the server, because a bare `e.showOnOnboarding === true`
             * misreads the whole existing programme. The flag postdates every
             * event in the collection, so an untargeted CMS event — which IS on
             * the public site, via the channel — comes back with it `false`, and
             * the form would show "keep it inside the association" for an event
             * anyone can already read. Adding a region to it and saving would
             * then take it off the public site, and the editor's own screen
             * would have told them that was the state it was already in.
             */
            showOnOnboarding: isOnPublicSite(e),
            /*
             * Restored from the event, with a fallback for every row written
             * before the field existed: those express "everyone" as an empty
             * target list, so an empty list still means the first card is on.
             */
            reachEveryone: e.reachEveryone === true || !hasTargets(e),
            media: { ...EMPTY_MEDIA, ...(e.media || {}) },
            status: (e.status || 'published') as 'published' | 'draft',
            detail: {
                // Every one of these is optional on the wire: a row written
                // before these fields existed comes back without them, so each
                // falls back to the blank rather than to `undefined`.
                audience: e.audience === 'paid' ? 'paid' : 'all',
                agenda: Array.isArray(e.agenda) ? e.agenda : [],
                speakers: Array.isArray(e.speakers) ? e.speakers : [],
                venueAddress: e.venueAddress || '',
                venueMapUrl: e.venueMapUrl || '',
                contactName: e.contactName || '',
                contactPhone: e.contactPhone || '',
                contactEmail: e.contactEmail || '',
                registrationEnabled: !!e.registrationEnabled,
                registrationDeadline: toLocalDateTimeInput(e.registrationDeadline),
                capacity: e.capacity ? String(e.capacity) : '',
                // Blank, not "0", for a free event: an empty box reads as "no
                // fee" where a typed zero reads as a price somebody set.
                registrationFee: e.registrationFee ? String(e.registrationFee) : '',
                registrationNote: e.registrationNote || '',
                registrationFields: Array.isArray(e.registrationFields) ? e.registrationFields : [],
                reminderOffsetsHours: Array.isArray(e.reminderOffsetsHours) ? e.reminderOffsetsHours : [],
            },
        });
        setShowForm(true);
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                title: form.title,
                description: form.description,
                startAt: toInstant(form.date, form.time),
                // An end time is optional, and only means anything with a start.
                endAt: form.endTime ? toInstant(form.date, form.endTime) : '',
                location: form.location,
                category: form.category,
                /*
                 * Region targeting, as a list. An empty list is everyone.
                 *
                 * JSON-encoded for the same reason the agenda is: this payload
                 * becomes `FormData` whenever there is an image, and
                 * `FormData.append` stringifies an array of objects to
                 * "[object Object]" — losing every target with no error
                 * anywhere. The server's `parseArray` reads it back on both
                 * transports.
                 *
                 * The legacy `state`/`district`/`block` are NOT sent: the
                 * server mirrors them from the first entry, and sending both
                 * would let a stale trio here overwrite the mirror it just
                 * derived.
                 */
                targets: JSON.stringify(form.targets),
                imageUrl: form.media.url,
                bannerAlt: form.media.alt,
                bannerFit: form.media.fit,
                bannerPosition: form.media.position,
                status: form.status,

                audience: form.detail.audience,
                channel,
                /*
                 * Sent from BOTH surfaces, and deliberately so.
                 *
                 * The CMS does not render the switch, but it does send the
                 * value it read back — otherwise re-saving a super admin's
                 * event from the CMS would leave the field absent, the server
                 * would leave the stored value alone, and the two screens would
                 * be showing an event whose public visibility neither of them
                 * could account for. Sending what was loaded keeps one answer.
                 */
                showOnOnboarding: form.showOnOnboarding,
                // Sent alongside `targets`, never instead of it — the pair is
                // what lets a reopened event show back both cards.
                reachEveryone: form.reachEveryone,
                /*
                 * Arrays are JSON-encoded here, not passed as arrays.
                 *
                 * `createCmsEvent` builds a `FormData` whenever there is an
                 * image, and `FormData.append` stringifies whatever it is
                 * given — an array of objects becomes "[object Object]" and the
                 * whole agenda is lost with no error anywhere. The server's
                 * `parseArray` reads the JSON back for both transports.
                 */
                agenda: JSON.stringify(form.detail.agenda),
                speakers: JSON.stringify(form.detail.speakers),
                reminderOffsetsHours: JSON.stringify(form.detail.reminderOffsetsHours),

                venueAddress: form.detail.venueAddress,
                venueMapUrl: form.detail.venueMapUrl,
                contactName: form.detail.contactName,
                contactPhone: form.detail.contactPhone,
                contactEmail: form.detail.contactEmail,

                registrationEnabled: form.detail.registrationEnabled,
                // A `datetime-local` value carries no offset, so it is read in
                // the editor's own timezone here — where that IS the intended
                // one — rather than left for the server to guess.
                registrationDeadline: form.detail.registrationDeadline
                    ? new Date(form.detail.registrationDeadline).toISOString()
                    : '',
                capacity: Number(form.detail.capacity) || 0,
                registrationFee: Number(form.detail.registrationFee) || 0,
                registrationNote: form.detail.registrationNote,
                // JSON-encoded for the same reason the agenda is: this payload
                // becomes `FormData` whenever there is an image, and
                // `FormData.append` would stringify the array to
                // "[object Object]" — losing the whole form with no error.
                registrationFields: JSON.stringify(form.detail.registrationFields),
            };

            if (editing) await updateCmsEvent(editing, payload);
            else await createCmsEvent(payload);
            cmsSaved(editing ? 'Event' : 'New event');
            setShowForm(false);
            await load();
        } catch (err) {
            // The server rejects a missing title or an unparseable date with a
            // specific message; showing it verbatim is more use than a generic one.
            const message = errorMessage(err, 'Could not save the event');
            setError(message);
            cmsFailed('the event', message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (e: CmsEvent) => {
        if (!window.confirm(`Delete "${e.title || 'Untitled event'}"? This removes it from the public site and from the member app.`)) return;
        try {
            await deleteCmsEvent(e.id);
            cmsDeleted(e.title || 'Event');
            await load();
        } catch (err) {
            const message = errorMessage(err, 'Could not delete the event');
            setError(message);
            cmsFailed('the deletion', message);
        }
    };

    if (loading) return <CmsLoading label="Loading events…" />;

    return (
        <CmsPage>
            <CmsError message={error} onRetry={load} />

            {/* The wording around the onboarding page's grid -- CMS only. The
                grid itself is the list below, the same events the member app
                shows, so publishing once is enough for both. */}
            {showSectionCopy && settings && (
                <CmsCard
                    title="Section copy"
                    description="The heading above the events grid, on the home page and on /events."
                >
                    <div className="space-y-0">
                        <CmsSection title="Heading" hint="The wording above the events grid.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <CmsField label="Eyebrow" hint="The small pill above the heading.">
                                <CmsInput
                                    value={settings.badgeText}
                                    onChange={(e) => setSettings({ ...settings, badgeText: e.target.value })}
                                    placeholder="Upcoming Events"
                                />
                            </CmsField>
                            <CmsField label="Heading">
                                <CmsInput
                                    value={settings.heading}
                                    onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
                                    placeholder="Our"
                                />
                            </CmsField>
                        </div>

                        <div className="mt-4">
                            <CmsField
                                label="Heading highlight"
                                hint="The tail of the heading, shown in the accent colour."
                            >
                                <CmsInput
                                    value={settings.headingHighlight}
                                    onChange={(e) => setSettings({ ...settings, headingHighlight: e.target.value })}
                                    placeholder="Events & Conclaves"
                                />
                            </CmsField>
                        </div>

                        <div className="mt-4 space-y-4">
                        <CmsField
                            label="Hero paragraph"
                            hint="Under the heading on the /events band. Not shown on the home page."
                        >
                            <CmsTextarea
                                rows={3}
                                value={settings.lede}
                                onChange={(e) => setSettings({ ...settings, lede: e.target.value })}
                                placeholder="Discover impactful events, conclaves and programs..."
                            />
                        </CmsField>

                        <CmsField label="Subtitle" hint="Between two rules under the heading. Home page only.">
                            <CmsInput
                                value={settings.subtitle}
                                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                                placeholder="join the network"
                            />
                        </CmsField>

                        <CmsField label="Empty message" hint="Shown in place of the grid when nothing is published.">
                            <CmsInput
                                value={settings.emptyText}
                                onChange={(e) => setSettings({ ...settings, emptyText: e.target.value })}
                                placeholder="No events are scheduled at the moment."
                            />
                        </CmsField>

                        <CmsField
                            label="No-match message"
                            hint={NO_MATCH_HINT}
                        >
                            <CmsInput
                                value={settings.emptyFilterText}
                                onChange={(e) => setSettings({ ...settings, emptyFilterText: e.target.value })}
                                placeholder="No events match {query}. Try another filter."
                            />
                        </CmsField>
                        </div>
                        </CmsSection>

                        {/* ----------------------------------------- hero band */}
                        <CmsSection
                            title="Hero band"
                            hint="The navy band at the top of /events. Every part is optional, and an empty one is not drawn."
                        >
                            <MediaPicker
                                label="Hero photograph"
                                aspect="1 / 1"
                                value={settings.heroMedia}
                                onChange={(heroMedia) => setSettings({ ...settings, heroMedia })}
                            />

                            <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
                                <IconPicker
                                    value={settings.heroBadge.icon}
                                    onChange={(icon) => setSettings({
                                        ...settings,
                                        heroBadge: { ...settings.heroBadge, icon },
                                    })}
                                    label="Badge icon"
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <CmsField label="Badge title" hint="Blank hides the badge.">
                                        <CmsInput
                                            value={settings.heroBadge.title}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                heroBadge: { ...settings.heroBadge, title: e.target.value },
                                            })}
                                            placeholder="Do not miss out"
                                        />
                                    </CmsField>
                                    <CmsField label="Badge subtitle">
                                        <CmsInput
                                            value={settings.heroBadge.subtitle}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                heroBadge: { ...settings.heroBadge, subtitle: e.target.value },
                                            })}
                                            placeholder="Be part of our next big event."
                                        />
                                    </CmsField>
                                </div>
                            </div>

                            <div className="mt-6">
                                <CmsField label="Figures" hint="The tiles across the band. Four fit a row.">
                                    <StatList
                                        items={settings.stats}
                                        onChange={(stats) => setSettings({ ...settings, stats })}
                                        noun="figure"
                                        max={4}
                                    />
                                </CmsField>
                            </div>
                        </CmsSection>

                        {/* ------------------------------------ search and chips */}
                        <CmsSection
                            title="Search and filter chips"
                            hint={CHIP_HINT}
                        >
                            <CmsField label="Search placeholder">
                                <CmsInput
                                    value={settings.searchPlaceholder}
                                    onChange={(e) => setSettings({ ...settings, searchPlaceholder: e.target.value })}
                                    placeholder="Search events..."
                                />
                            </CmsField>

                            <div className="mt-4">
                                <RepeatableList<{ label: string; icon: string }>
                                    items={settings.categories}
                                    onChange={(categories) => setSettings({ ...settings, categories })}
                                    noun="chip"
                                    blank={() => ({ label: '', icon: 'calendar-days' })}
                                    row={(chip, update) => (
                                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                                            <IconPicker value={chip.icon} onChange={(icon) => update({ icon })} />
                                            <CmsField label="Label">
                                                <CmsInput
                                                    value={chip.label}
                                                    onChange={(e) => update({ label: e.target.value })}
                                                    placeholder="Conferences"
                                                />
                                            </CmsField>
                                        </div>
                                    )}
                                />
                            </div>
                        </CmsSection>

                        {/* ------------------------------------------ cta strip */}
                        <CmsSection
                            title="Call-to-action strip"
                            hint="The navy strip under the grid on /events. A blank title and label hide it."
                        >
                            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                                <IconPicker
                                    value={settings.banner.icon}
                                    onChange={(icon) => setSettings({
                                        ...settings, banner: { ...settings.banner, icon },
                                    })}
                                    label="Icon"
                                />
                                <div className="space-y-4">
                                    <CmsField label="Title">
                                        <CmsInput
                                            value={settings.banner.title}
                                            onChange={(e) => setSettings({
                                                ...settings, banner: { ...settings.banner, title: e.target.value },
                                            })}
                                            placeholder="Have an Event to Share?"
                                        />
                                    </CmsField>
                                    <CmsField label="Subtitle">
                                        <CmsInput
                                            value={settings.banner.subtitle}
                                            onChange={(e) => setSettings({
                                                ...settings, banner: { ...settings.banner, subtitle: e.target.value },
                                            })}
                                            placeholder="Partner with us to create impactful experiences."
                                        />
                                    </CmsField>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <CmsField label="Button label" hint="Blank hides the button.">
                                            <CmsInput
                                                value={settings.banner.ctaLabel}
                                                onChange={(e) => setSettings({
                                                    ...settings, banner: { ...settings.banner, ctaLabel: e.target.value },
                                                })}
                                                placeholder="Partner With Us"
                                            />
                                        </CmsField>
                                        <CmsField label="Button link">
                                            <CmsInput
                                                value={settings.banner.ctaHref}
                                                onChange={(e) => setSettings({
                                                    ...settings, banner: { ...settings.banner, ctaHref: e.target.value },
                                                })}
                                                placeholder="/contact"
                                            />
                                        </CmsField>
                                    </div>
                                </div>
                            </div>
                        </CmsSection>

                        <CmsSection title="Grid and button" hint="How many events the home page shows, and where the button goes.">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <CmsField label="Events on the home page" hint="The rest are reached via the button.">
                                <CmsInput
                                    type="number" min={1} max={24}
                                    value={String(settings.homeLimit)}
                                    onChange={(e) => setSettings({ ...settings, homeLimit: Number(e.target.value) || 3 })}
                                />
                            </CmsField>
                            <CmsField label="Button label" hint="Blank hides the button.">
                                <CmsInput
                                    value={settings.viewAllLabel}
                                    onChange={(e) => setSettings({ ...settings, viewAllLabel: e.target.value })}
                                    placeholder="See All Events"
                                />
                            </CmsField>
                            <CmsField label="Button link">
                                <CmsInput
                                    value={settings.viewAllHref}
                                    onChange={(e) => setSettings({ ...settings, viewAllHref: e.target.value })}
                                    placeholder="/events"
                                />
                            </CmsField>
                        </div>
                        <ExtraFieldsEditor
                            items={settings.extraFields || []}
                            onChange={extraFields => setSettings({ ...settings, extraFields })}
                            hint="Anything else this page should say. Each row shows as a labelled line under the grid."
                        />
                        </CmsSection>
                    </div>

                    <div className="mt-6">
                        <button
                            type="button"
                            disabled={savingCopy}
                            onClick={saveCopy}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500
                                       text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {savingCopy ? <Loader2 size={16} className="animate-spin" />
                                : savedCopy ? <Check size={16} /> : <Save size={16} />}
                            {savingCopy ? 'Saving...' : savedCopy ? 'Saved -- live page updated' : 'Save section copy'}
                        </button>
                    </div>
                </CmsCard>
            )}

            {showForm && (
                <CmsCard
                    title={editing ? 'Edit event' : 'New event'}
                    description="Published events appear on the public site and to signed-in members."
                    actions={
                        <button type="button" onClick={() => setShowForm(false)}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                    }
                >
                    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            {/*
                              NOT `required` — no field on this form is.
                              
                              An event is written over several sittings, and a
                              form that refuses to save without a title is a form
                              that gets "TBC" typed into it. The draft/published
                              control is what says whether it is ready; the
                              fields say what is known so far. The server stores
                              a blank the same way, and every reader falls back —
                              see the note at the top of the event schema.
                            */}
                            <CmsField label="Title" hint="Optional, like everything here. Blank shows as “Untitled event”.">
                                <CmsInput value={form.title} placeholder="Untitled event"
                                    onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </CmsField>
                        </div>

                        {/*
                          Second, under the title, because it is the decision
                          that determines who ever receives this event.

                          It sat below the date and time and above the venue,
                          where it read as another address field and was missed
                          entirely. WHERE THE EVENT IS HELD and WHO IT IS FOR are
                          different questions: the venue is a line on a card, this
                          decides whose dashboard the card appears on at all.
                        */}
                        <div className="sm:col-span-2">
                            <RegionTargetPicker
                                targets={form.targets}
                                onChange={targets => setForm({ ...form, targets })}
                                reachEveryone={form.reachEveryone}
                                onReachEveryoneChange={reachEveryone =>
                                    setForm({ ...form, reachEveryone })}
                                // Feeds the reach count: the members-only switch
                                // narrows the audience further, and its effect is
                                // invisible from the section it is set in.
                                audience={form.detail.audience}
                                title="Who sees this event"
                                hint={'Members, block admins, district admins and state admins only see events aimed '
                                    + 'at where they are. Tick nothing to reach the whole association.'}
                            />
                        </div>

                        {/*
                          THE SECOND QUESTION, AND ONLY ON THIS SURFACE.

                          The picker above decides whose DASHBOARD this appears
                          on. This decides whether the same event is also
                          advertised on the onboarding website, where the reader
                          is an anonymous visitor rather than a member in a
                          region.

                          Asked as a question rather than assumed either way,
                          because both answers are normal and neither is safe to
                          guess: a district's internal training day must not
                          reach a marketing page, and the same district's trade
                          expo exists precisely to be found by people who are not
                          members yet.

                          ALWAYS ON THIS SURFACE, AND IN THE CMS ONLY ONCE
                          REGIONS ARE SET.

                          An untargeted CMS event is onboarding content by
                          definition, so the control there would be a choice
                          that could only have one answer — noise on every form.
                          The moment an editor picks a region it stops being
                          obvious: a targeted event that is NOT on the onboarding
                          site simply disappears from the public grid, and
                          without this it disappeared silently, from a screen
                          whose only visible effect was three ticked boxes.
                        */}
                        {(channel === 'members' || form.targets.length > 0) && (
                            <div className="sm:col-span-2">
                                <CmsSection
                                    title="Onboarding website"
                                    hint={'The regions above decide whose dashboard this reaches. This is an '
                                        + 'addition on top of that, not an alternative to it.'}
                                >
                                    {/*
                                      A CHECKBOX, BECAUSE BOTH THINGS HAPPEN AT ONCE.

                                      This was a pair of cards — "keep it inside the
                                      association" against "post it in the onboarding
                                      events section" — and that framing was simply
                                      untrue. Posting to the onboarding site does not
                                      take the event off the member dashboards:
                                      `event.service.listEvents` never reads
                                      `showOnOnboarding`, so members in the targeted
                                      regions receive it either way. The pair claimed
                                      the two were alternatives and an editor
                                      reasonably read the second card as replacing the
                                      first.

                                      One box, phrased as the addition it is. The
                                      unconditional half is stated above it as a fact
                                      rather than offered as an option nobody can
                                      turn off.
                                    */}
                                    <p className="mb-3 flex items-start gap-2 text-xs text-slate-600
                                                  dark:text-neutral-400">
                                        <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                        <span>
                                            <strong className="font-semibold text-slate-700 dark:text-neutral-200">
                                                Members always see this
                                            </strong>{' '}
                                            — on their dashboard and in the app,{' '}
                                            {form.targets.length
                                                ? 'everywhere in the regions chosen above.'
                                                : 'across the whole association.'}{' '}
                                            That cannot be turned off here; widen or narrow it with the regions.
                                        </span>
                                    </p>

                                    <CmsCheck
                                        checked={form.showOnOnboarding}
                                        onChange={(showOnOnboarding) => setForm({ ...form, showOnOnboarding })}
                                        icon={<Globe className="w-4 h-4" />}
                                        title="Also post it in the onboarding events section"
                                        detail={form.targets.length
                                            ? 'Adds it to the public site as well, labelled with its region and '
                                              + 'findable under the region filter there. Members keep it either way.'
                                            : 'Adds it to the public site as well, for the whole association. '
                                              + 'Members keep it either way.'}
                                    />

                                    {/*
                                      Shown only when both are true, because that
                                      is the combination whose consequence is not
                                      obvious from either control on its own: the
                                      event is aimed at a few regions AND is going
                                      on a page that anyone, anywhere, can read.
                                      Nothing is being overridden — the regions
                                      still govern the dashboards — but the editor
                                      should know the notice is now readable
                                      outside them.
                                    */}
                                    {form.showOnOnboarding && form.targets.length > 0 && (
                                        <p className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200
                                                      dark:border-blue-900/60 bg-blue-500/5 px-3 py-2 text-xs
                                                      text-blue-700 dark:text-blue-300">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span>
                                                Aimed at {form.targets.length === 1
                                                    ? '1 region'
                                                    : `${form.targets.length} regions`}, and now readable by
                                                anyone on the public site. Visitors can filter the events page down
                                                to a state, district or block, so it stays findable by the people
                                                it is for.
                                            </span>
                                        </p>
                                    )}
                                </CmsSection>
                            </div>
                        )}

                        <CmsField label="Date" hint="Optional. Left blank, the event lists as “Date to be confirmed”.">
                            <CmsInput type="date" value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </CmsField>

                        <div className="grid grid-cols-2 gap-3">
                            <CmsField label="Starts" hint="In your own timezone.">
                                <CmsInput type="time" value={form.time}
                                    onChange={(e) => setForm({ ...form, time: e.target.value })} />
                            </CmsField>
                            <CmsField label="Ends" hint="Optional.">
                                <CmsInput type="time" value={form.endTime}
                                    onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                            </CmsField>
                        </div>


                        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                            <CmsField label="Location / venue">
                                <CmsInput value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="Chennai Trade Centre, Nandambakkam" />
                            </CmsField>

                            {/*
                              A datalist rather than a select: the chip list
                              below is free text an editor can add to, and a
                              closed dropdown would make an event uncategorisable
                              until someone had also edited the chips. This
                              suggests the existing chips and still accepts a new
                              word — which then shows on the card as a badge and
                              is matched by a chip the moment one is added.
                            */}
                            <CmsField
                                label="Category"
                                hint="Matches a filter chip on /events. Blank shows no badge."
                            >
                                <CmsInput
                                    list="event-category-options"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    placeholder="Conferences"
                                />
                                <datalist id="event-category-options">
                                    {(settings?.categories || []).map((c, i) => (
                                        <option key={i} value={c.label} />
                                    ))}
                                </datalist>
                            </CmsField>
                        </div>

                        <div className="sm:col-span-2">
                            {/* 16/9 — the shape of the banner on an event card. */}
                            <MediaPicker
                                label="Banner"
                                aspect="16 / 9"
                                value={form.media}
                                onChange={(media) => setForm({ ...form, media })}
                                hint="Upload a file or paste a URL. Blank means the card renders without an image."
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <CmsField label="Description">
                                <CmsTextarea rows={4} value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </CmsField>
                        </div>

                        <EventDetailFields
                            value={form.detail}
                            onChange={(detail) => setForm({ ...form, detail })}
                            eventId={editing}
                        />

                        <CmsField label="Visibility" hint="A draft is stored but shown to nobody.">
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as 'published' | 'draft' })}
                                className="w-full bg-slate-50 dark:bg-black border border-slate-300 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-neutral-100"
                            >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                            </select>
                        </CmsField>

                        <div className="sm:col-span-2 flex gap-2">
                            <CmsButton type="submit" loading={saving}>
                                {editing ? 'Save event' : 'Create event'}
                            </CmsButton>
                            <CmsButton type="button" variant="ghost" onClick={() => setShowForm(false)}>
                                Cancel
                            </CmsButton>
                        </div>
                    </form>
                </CmsCard>
            )}

            <CmsCard
                title={`Events (${visibleEvents.length}${targetFilter === 'all' ? '' : ' of ' + events.length})`}
                description="Aim an event at a region when you create it. The list can be narrowed to one audience below."
                actions={
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Only targets actually in use. Offering the whole region
                            tree here would be 6,966 blocks, nearly all of them
                            matching nothing. */}
                        {targetOptions.length > 1 && (
                            <select
                                value={targetFilter}
                                onChange={(e) => setTargetFilter(e.target.value)}
                                aria-label="Filter events by who sees them"
                                className="bg-slate-50 dark:bg-black border border-slate-300 dark:border-[#2a2a2a]
                                           rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-neutral-100"
                            >
                                <option value="all">Every audience</option>
                                {targetOptions.map(t => (
                                    <option key={t} value={t}>{t === 'Everyone' ? 'Everyone (no target)' : t}</option>
                                ))}
                            </select>
                        )}
                        <CmsButton type="button" onClick={openNew}><Plus className="w-4 h-4" /> Add event</CmsButton>
                    </div>
                }
            >
                {events.length === 0 ? (
                    <CmsEmpty title="No events yet" hint="Add one and it appears on the public site straight away." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-slate-200 dark:border-[#1f1f1f]">
                                    <th className="pb-2 pr-4 font-medium w-16">Banner</th>
                                    <th className="pb-2 pr-4 font-medium">Title</th>
                                    <th className="pb-2 pr-4 font-medium">When</th>
                                    <th className="pb-2 pr-4 font-medium">Where</th>
                                    <th className="pb-2 pr-4 font-medium">Status</th>
                                    <th className="pb-2 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleEvents.map((e) => (
                                    <tr key={e.id} className="border-b border-slate-800/60">
                                        <td className="py-3 pr-4">
                                            {e.media?.url ? (
                                                <div className="w-14 h-10 rounded overflow-hidden bg-slate-100 dark:bg-[#161616]">
                                                    <CmsMediaFrame media={e.media} />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-10 rounded bg-slate-100 dark:bg-[#161616]" />
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-800 dark:text-neutral-200">
                                            {/* Named, not dashed. A row reading "—"
                                                is indistinguishable from a row that
                                                failed to load, and an untitled event
                                                is a normal thing to have half-written
                                                now that no field is required. */}
                                            {e.title || (
                                                <span className="italic text-neutral-400">Untitled event</span>
                                            )}
                                            {/* The audience is a fact about the row that
                                                the status column cannot carry: a published
                                                members-only event and a published open one
                                                both read "published". */}
                                            {e.audience === 'paid' ? (
                                                <span className="ml-2 inline-flex items-center gap-1 text-[0.625rem]
                                                                 font-bold uppercase tracking-wide px-1.5 py-0.5
                                                                 rounded-full bg-blue-100 dark:bg-blue-950
                                                                 text-blue-700 dark:text-blue-400 align-middle">
                                                    <Lock className="w-2.5 h-2.5" /> Members
                                                </span>
                                            ) : null}
                                            {/*
                                              WHETHER THE PUBLIC CAN READ IT — the other
                                              fact the status column cannot carry, and
                                              the alternative to opening every event to
                                              find out.

                                              EACH SURFACE SHOWS THE UNUSUAL ANSWER, not
                                              the same badge twice. In the admin area
                                              almost nothing is public, so "Onboarding"
                                              is the row worth marking; in the CMS almost
                                              everything is, so the same badge would land
                                              on every line and carry no information —
                                              there it is the targeted event that has
                                              dropped OFF the public grid that the editor
                                              needs to see. Same rule as the
                                              registration badge below, and for the same
                                              reason.
                                            */}
                                            {channel === 'members' && isOnPublicSite(e) ? (
                                                <span className="ml-2 inline-flex items-center gap-1 text-[0.625rem]
                                                                 font-bold uppercase tracking-wide px-1.5 py-0.5
                                                                 rounded-full bg-emerald-100 dark:bg-emerald-950
                                                                 text-emerald-700 dark:text-emerald-400 align-middle">
                                                    <Globe className="w-2.5 h-2.5" /> Onboarding
                                                </span>
                                            ) : null}
                                            {channel === 'public' && !isOnPublicSite(e) ? (
                                                <span className="ml-2 inline-flex items-center gap-1 text-[0.625rem]
                                                                 font-bold uppercase tracking-wide px-1.5 py-0.5
                                                                 rounded-full bg-amber-100 dark:bg-amber-950/60
                                                                 text-amber-700 dark:text-amber-400 align-middle"
                                                    title="Not listed on the public events page — either aimed at chosen regions, or posted from the admin area.">
                                                    <Building2 className="w-2.5 h-2.5" /> Off public site
                                                </span>
                                            ) : null}
                                            {/*
                                              Registration OFF is the state worth
                                              showing, and it was the one that was
                                              invisible.

                                              This printed "registration open" when
                                              on and nothing at all when off — so a
                                              list of seven events with registration
                                              off looked identical to a list of
                                              seven perfectly normal ones, and the
                                              first anybody knew was a member asking
                                              why there was no Register button.
                                              Measured against the live database:
                                              that is exactly what had happened.

                                              An announcement nobody registers for is
                                              a real thing to publish, so this is a
                                              label and not a warning — but it is a
                                              label you can see.
                                            */}
                                            {e.registrationEnabled ? (
                                                <span className="ml-1.5 text-[0.625rem] font-medium
                                                                 text-emerald-600 align-middle">
                                                    registration open
                                                </span>
                                            ) : (
                                                <span className="ml-1.5 inline-flex items-center gap-1
                                                                 text-[0.625rem] font-semibold uppercase
                                                                 tracking-wide px-1.5 py-0.5 rounded-full
                                                                 bg-amber-100 dark:bg-amber-950
                                                                 text-amber-700 dark:text-amber-400
                                                                 align-middle">
                                                    No registration
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                            {e.startAt ? new Date(e.startAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">
                                            {e.location || '—'}
                                            {/*
                                              Who it reaches, under where it is held.
                                              An event aimed at one block is invisible
                                              to everyone else, and that is not
                                              something to have to open the form to
                                              find out.
                                            */}
                                            {/* A pill rather than a line of text: this is the
                                                column an administrator scans to answer "which
                                                of these went to Ariyalur", and a targeted
                                                event has to stand out from a national one. */}
                                            <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded-full ${
                                                e.targetLabel
                                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                                    : 'bg-slate-100 dark:bg-[#161616] text-neutral-500 dark:text-neutral-400'
                                            }`}>
                                                {e.targetLabel ? `${e.targetLabel} only` : 'Everyone'}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                e.status === 'published'
                                                    ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                                                    : 'bg-slate-100 dark:bg-[#161616] text-neutral-500 dark:text-neutral-400'
                                            }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <button onClick={() => openEdit(e)}
                                                className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#161616]" aria-label="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {/* Labelled, so it is not mistaken for the
                                                pencil beside it. Both were 14px icons
                                                two pixels apart; one is reversible. */}
                                            <button onClick={() => handleDelete(e)}
                                                className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                                           text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30
                                                           hover:bg-red-500/10 transition-colors"
                                                aria-label={`Delete ${e.title}`}>
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CmsCard>
        </CmsPage>
    );
}
