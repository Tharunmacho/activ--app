import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Phone, Mail, User, Users, ExternalLink,
} from 'lucide-react';
import {
    getCmsEvent, getCmsEvents, getEventsSettings,
    type CmsEvent, type EventsSettings,
} from '@/services/cmsApi';
import { HeaderSection } from '../../components/layout/HeaderSection';
import { FooterSection } from '../../components/layout/FooterSection';
import { CmsMediaFrame } from '@/components/shared/CmsMediaFrame';
import { PAGE_CONTAINER } from '@/components/layout/pageContainer';
import { SECTION_HEADING, SECTION_LEDE, EYEBROW, CARD_BODY, MICRO_LABEL } from '@/components/layout/typography';
import { Reveal } from '@/components/shared/Reveal';

/**
 * One event, in full.
 *
 * Where an events card goes when it is clicked, on the home page or on
 * `/events`. The Event model has carried an agenda, a speaker list, a venue
 * address, contact details and registration terms since it was written, and
 * until now the public site rendered a title, a date and a location — the rest
 * was captured in the CMS and shown to nobody.
 *
 * The same shape as the gallery poster page on purpose: a visitor who has
 * opened one knows how to read the other, and the two pages share their
 * skeleton, their missing-item state and their related row.
 */

/** The side card's button, shared by its internal and external forms. */
const CTA_CLASS =
    'mt-6 w-full inline-flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-700 ' +
    'text-white px-6 py-3.5 rounded-full font-bold text-[0.8125rem] uppercase tracking-[0.1em] transition-colors';

/** "Tue, 20 Jan 2024" — the date as it reads on the page. */
const formatDay = (iso?: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
};

/** "10:30" — empty when the event carries no time of day. */
const formatTime = (iso?: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [event, setEvent] = useState<CmsEvent | null>(null);
    const [related, setRelated] = useState<CmsEvent[]>([]);
    const [settings, setSettings] = useState<EventsSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setMissing(false);
        setEvent(null);
        // Arriving from a card lower down the previous page would otherwise open
        // this one already scrolled past its own banner.
        window.scrollTo({ top: 0, behavior: 'auto' });

        getEventsSettings()
            .then(config => { if (!cancelled) setSettings(config); })
            .catch(() => { /* the labels fall back to their defaults */ });

        getCmsEvent(String(id || ''))
            .then((found) => {
                if (cancelled) return;
                setEvent(found);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setMissing(true);
                setLoading(false);
            });

        // Only for the row at the foot of the page, so its failure is silent.
        getCmsEvents()
            .then((list) => { if (!cancelled) setRelated(list || []); })
            .catch(() => { /* the row is simply not drawn */ });

        return () => { cancelled = true; };
    }, [id]);

    // ---------------------------------------------------------------- states

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen font-sans bg-white">
                <HeaderSection />
                <div className={`${PAGE_CONTAINER} py-20 animate-pulse flex-grow`}>
                    <div className="h-4 w-32 bg-slate-200 rounded mb-10" />
                    <div className="h-[22rem] md:h-[30rem] bg-slate-200 rounded-3xl mb-10" />
                    <div className="h-8 w-2/3 bg-slate-200 rounded mb-4" />
                    <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-5/6 bg-slate-200 rounded" />
                </div>
                <FooterSection />
            </div>
        );
    }

    if (missing || !event) {
        return (
            <div className="flex flex-col min-h-screen font-sans bg-white">
                <HeaderSection />
                <div className={`${PAGE_CONTAINER} py-24 flex-grow text-center`}>
                    <h1 className={`${SECTION_HEADING} text-brand-800 mb-4`}>Not found</h1>
                    <p className={`${SECTION_LEDE} text-gray-500 mb-8`}>
                        This event is no longer listed.
                    </p>
                    <Link
                        to="/events"
                        className="inline-flex items-center gap-2 bg-brand-800 hover:bg-brand-700 text-white
                                   px-8 py-3.5 rounded-full font-bold text-[0.8125rem] uppercase tracking-[0.1em]
                                   transition-colors"
                    >
                        <ArrowLeft size={15} /> Back to Events
                    </Link>
                </div>
                <FooterSection />
            </div>
        );
    }

    // ---------------------------------------------------------------- content

    const agenda = (event.agenda || []).filter(row => row && (row.title || row.startTime));
    const speakers = (event.speakers || []).filter(person => person && person.name);
    const day = formatDay(event.startAt);
    const startTime = formatTime(event.startAt);
    const endTime = formatTime(event.endAt);

    const facts = [
        day ? {
            icon: <Calendar size={16} />,
            label: 'Date',
            value: day,
        } : null,
        startTime ? {
            icon: <Clock size={16} />,
            label: 'Time',
            // An end time is optional — many events are announced without one.
            value: endTime ? `${startTime} – ${endTime}` : startTime,
        } : null,
        (event.venue || event.location) ? {
            icon: <MapPin size={16} />,
            label: 'Venue',
            value: event.venueAddress
                ? `${event.venue || event.location}\n${event.venueAddress}`
                : (event.venue || event.location),
        } : null,
        event.contactName || event.contactPhone || event.contactEmail ? {
            icon: <User size={16} />,
            label: 'Contact',
            value: [event.contactName, event.contactPhone, event.contactEmail].filter(Boolean).join('\n'),
        } : null,
        event.capacity ? {
            icon: <Users size={16} />,
            label: 'Seats',
            value: String(event.capacity),
        } : null,
    ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

    /* Same category first, then anything else — and never this event itself. */
    const others = (related || []).filter(e => e.id !== event.id);
    const sameCategory = event.category ? others.filter(e => e.category === event.category) : [];
    const moreEvents = [...sameCategory, ...others.filter(e => !sameCategory.includes(e))].slice(0, 4);

    return (
        <div className="flex flex-col min-h-screen font-sans bg-white">
            <HeaderSection />

            <main className="flex-grow">
                <section className="w-full pt-10 pb-16 md:pt-14 md:pb-24 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50/60 rounded-full blur-3xl
                                    -z-10 translate-x-1/3 -translate-y-1/3 transform-gpu pointer-events-none" />

                    <div className={`${PAGE_CONTAINER} relative z-10`}>

                        <Link
                            to="/events"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-700
                                       font-bold text-[0.8125rem] uppercase tracking-[0.1em] transition-colors mb-8"
                        >
                            <ArrowLeft size={15} /> Back to Events
                        </Link>

                        {/* ---- the banner ---- */}
                        {event.media?.url && (
                            <Reveal>
                                <div className="rounded-[1.75rem] overflow-hidden border border-brand-100/70 bg-gray-50
                                                shadow-[0_18px_60px_-24px_rgb(28_46_104/0.35)]">
                                    <div className="w-full h-[18rem] sm:h-[24rem] lg:h-[30rem]">
                                        <CmsMediaFrame media={event.media} priority width={1100} />
                                    </div>
                                </div>
                            </Reveal>
                        )}

                        {/* ---- title and facts ---- */}
                        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr] items-start">

                            <div>
                                {event.category && (
                                    <div className="inline-flex items-center space-x-2 bg-brand-50 text-brand-600 px-4 py-1.5
                                                    rounded-full mb-5 border border-brand-100">
                                        <span className={EYEBROW}>{event.category}</span>
                                    </div>
                                )}

                                <h1 className={`${SECTION_HEADING} text-brand-800 mb-5`}>{event.title}</h1>

                                {event.description && (
                                    <p className={`${CARD_BODY} text-gray-600 whitespace-pre-line mb-8`}>
                                        {event.description}
                                    </p>
                                )}

                                {/* ---- agenda ---- */}
                                {agenda.length > 0 && (
                                    <div className="mb-10">
                                        <h2 className="text-lg font-black text-brand-800 mb-4">Programme</h2>
                                        <ol className="border-l-2 border-brand-100 pl-5 space-y-6">
                                            {agenda.map((row, i) => (
                                                <li key={row.id || i} className="relative">
                                                    {/* The dot sits on the rule, so the times read as a timeline
                                                        rather than as a table with a stray border. */}
                                                    <span className="absolute -left-[1.6875rem] top-1.5 w-3 h-3 rounded-full
                                                                     bg-brand-600 ring-4 ring-white" />
                                                    {(row.startTime || row.endTime) && (
                                                        <p className={`${MICRO_LABEL} text-brand-500 mb-1`}>
                                                            {row.startTime}{row.endTime ? ` – ${row.endTime}` : ''}
                                                        </p>
                                                    )}
                                                    <p className="text-[0.9375rem] font-extrabold text-brand-800">{row.title}</p>
                                                    {row.description && (
                                                        <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
                                                            {row.description}
                                                        </p>
                                                    )}
                                                    {(row.speaker || row.location) && (
                                                        <p className={`${MICRO_LABEL} text-gray-400 mt-1.5`}>
                                                            {[row.speaker, row.location].filter(Boolean).join(' · ')}
                                                        </p>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* ---- speakers ---- */}
                                {speakers.length > 0 && (
                                    <div className="mb-8">
                                        <h2 className="text-lg font-black text-brand-800 mb-4">Speakers</h2>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {speakers.map((person, i) => (
                                                <div
                                                    key={person.id || i}
                                                    className="flex items-start gap-4 rounded-2xl border border-brand-100/70
                                                               bg-[#fafbfc] p-4"
                                                >
                                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white border
                                                                    border-brand-100 shrink-0 flex items-center justify-center">
                                                        {person.photoUrl
                                                            ? <CmsMediaFrame media={{ url: person.photoUrl }} width={80} />
                                                            : <User size={20} className="text-brand-500" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[0.9375rem] font-extrabold text-brand-800">{person.name}</p>
                                                        {(person.role || person.organization) && (
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {[person.role, person.organization].filter(Boolean).join(', ')}
                                                            </p>
                                                        )}
                                                        {person.bio && (
                                                            <p className="text-sm text-gray-500 mt-2">{person.bio}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ---- the side card ---- */}
                            <aside className="rounded-[1.5rem] border border-brand-100/70 bg-[#fafbfc] p-6 sm:p-8
                                              shadow-[0_10px_36px_-18px_rgb(28_46_104/0.25)] lg:sticky lg:top-28">
                                {facts.map((fact, i) => (
                                    <div key={`${fact.label}-${i}`} className="flex items-start gap-3 mb-5 last:mb-0">
                                        <span className="w-10 h-10 rounded-full bg-white border border-brand-100
                                                         text-brand-600 flex items-center justify-center shrink-0">
                                            {fact.icon}
                                        </span>
                                        <div className="min-w-0">
                                            <p className={`${MICRO_LABEL} text-gray-400`}>{fact.label}</p>
                                            <p className="text-[0.9375rem] font-extrabold text-brand-800
                                                          break-words whitespace-pre-line">
                                                {fact.value}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {event.venueMapUrl && (
                                    <a
                                        href={event.venueMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-800
                                                   text-[0.8125rem] font-bold transition-colors"
                                    >
                                        Open in maps <ExternalLink size={13} />
                                    </a>
                                )}

                                {event.registrationNote && (
                                    <p className="mt-5 text-sm text-gray-500 whitespace-pre-line">{event.registrationNote}</p>
                                )}

                                {/*
                                  Registration happens inside the member area, so
                                  this sends a visitor to sign in rather than
                                  pretending to take a booking it cannot take.
                                */}
                                {event.registrationEnabled && (
                                    <Link to="/login" className={CTA_CLASS}>
                                        Register <ArrowRight size={15} />
                                    </Link>
                                )}

                                {/* Contact rows already sit in the facts above; the
                                    two below are the ones worth being able to tap. */}
                                <div className="mt-5 space-y-2">
                                    {event.contactPhone && (
                                        <a
                                            href={`tel:${event.contactPhone}`}
                                            className="flex items-center gap-2 text-sm font-semibold text-brand-700
                                                       hover:text-brand-600 transition-colors"
                                        >
                                            <Phone size={14} /> {event.contactPhone}
                                        </a>
                                    )}
                                    {event.contactEmail && (
                                        <a
                                            href={`mailto:${event.contactEmail}`}
                                            className="flex items-center gap-2 text-sm font-semibold text-brand-700
                                                       hover:text-brand-600 transition-colors break-all"
                                        >
                                            <Mail size={14} /> {event.contactEmail}
                                        </a>
                                    )}
                                </div>
                            </aside>
                        </div>

                        {/* ---- more events ---- */}
                        {moreEvents.length > 0 && (
                            <div className={`${agenda.length || speakers.length ? 'mt-20 pt-12' : 'mt-10 pt-10'}
                                             border-t border-gray-100`}>
                                <h2 className="text-xl font-black text-brand-800 mb-6">
                                    {settings?.viewAllLabel ? 'More events' : 'More events'}
                                </h2>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    {moreEvents.map(other => (
                                        <Link
                                            key={other.id}
                                            to={`/events/${other.id}`}
                                            className="group block rounded-2xl overflow-hidden bg-white border border-brand-100/70
                                                       shadow-[0_10px_30px_-16px_rgb(28_46_104/0.25)]
                                                       hover:shadow-[0_22px_48px_-20px_rgb(28_46_104/0.4)]
                                                       transition-shadow duration-500"
                                        >
                                            <div className="w-full h-40 overflow-hidden bg-gray-50">
                                                <CmsMediaFrame
                                                    media={other.media}
                                                    width={340}
                                                    className="group-hover:scale-105 transition-transform duration-700 transform-gpu"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <p className="text-[0.8125rem] font-extrabold text-brand-800 line-clamp-2
                                                              group-hover:text-brand-600 transition-colors">
                                                    {other.title}
                                                </p>
                                                {formatDay(other.startAt) && (
                                                    <p className={`${MICRO_LABEL} text-gray-400 mt-2`}>
                                                        {formatDay(other.startAt)}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <FooterSection />
        </div>
    );
}
