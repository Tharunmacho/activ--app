<<<<<<< HEAD
import { galleryPath } from '@/lib/eventPath';
import { eventPath } from '@/lib/eventPath';
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, ArrowRight, Calendar, MapPin } from 'lucide-react';
import {
<<<<<<< HEAD
    getHome, getHomeGallery, getCmsEvents, peekCmsCache,
    type HomeCarousel, type HomeContent, type CmsMedia, type GalleryItem, type CmsSectionOverride, type CmsEvent,
} from '@/services/cmsApi';
import { CmsExtraFields } from '@/components/shared/CmsExtraFields';
import { SectionFields } from '@/components/shared/SectionFields';

=======
    getHome, getHomeGallery,
    type HomeCarousel, type CmsMedia, type GalleryItem, type CmsSectionOverride,
} from '@/services/cmsApi';
import { CmsExtraFields } from '@/components/shared/CmsExtraFields';
>>>>>>> 8020f5d (Initial commit for website frontend)
import { sectionHidden, sectionFields } from '@/components/shared/cmsSections';
import { CmsMediaFrame } from '@/components/shared/CmsMediaFrame';
import { CmsIcon } from '@/components/shared/CmsIcon';
import { SCREEN_CONTAINER } from '@/components/layout/pageContainer';
import { CountUp } from '@/components/shared/CountUp';
import { Tilt3D } from '@/components/shared/Tilt3D';
import {
    HERO_HEADING, HERO_LEDE, EYEBROW, STAT_FIGURE, STAT_LABEL, MICRO_LABEL,
} from '@/components/layout/typography';

/**
<<<<<<< HEAD
 * What the banner's own added fields are set in — the SUB-HEADLINE's type.
 *
 * `HERO_LEDE` itself, not an approximation of it. A field added to the
 * Headline card is a continuation of the words over the picture, so it reads
 * at the size those words read at. Written out at 20px it was half the size
 * of the paragraph directly above it and read as a footnote somebody had
 * pasted in.
 *
 * It is the constant rather than a copy of its values so the two cannot drift:
 * if the hero's lede is ever re-scaled, the fields re-scale with it.
 */
const BANNER_PROSE = 'text-[1em] leading-relaxed font-semibold text-gray-200';

/** The highlight card's type, for the rows added to that card. */
const CARD_PROSE = 'text-[1.0625rem] font-semibold leading-snug';

/**
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
 * The landing banner.
 *
 * Slides, headline, both buttons and the card overlapping the bottom edge are
 * all authored in the CMS. Nothing is hardcoded: with no slides the banner is
 * not rendered at all, rather than showing stock photography an admin cannot
 * remove.
 *
 * The carousel is only mounted once slides exist. Embla measures its container
 * on mount, and initialising it against an empty list leaves it unable to
 * scroll when the slides arrive a moment later.
 *
 * ---------------------------------------------------------------- posters
 *
 * The banner ALSO carries the recent gallery posters, and each of those slides
 * is a link to that event's own page. This is the thing a visitor actually
 * clicks — it is the first and largest image on the site — so a poster that
 * only appears in the strip further down is a poster most people never reach.
 *
 * Those slides are not stored in the home document. They are the gallery's own
 * items, read at render time, so posting an event to the gallery puts it in the
 * banner and deleting it there takes it out. There is no second copy to keep in
 * step. An authored slide, which is a message rather than an event, has no link
 * and behaves exactly as it always did.
 */

/**
 * A slide, whichever of the two sources it came from.
 *
 * One shape rather than a union with a discriminant: everything below either
 * has an `href` or does not, and that single field is the whole difference
 * between a banner image and a poster you can click.
 */
interface BannerSlide {
    media: CmsMedia;
    caption: string;
<<<<<<< HEAD
    /*
     * The words shown while THIS picture is on screen, and their side. Blank
     * headline and subheadline fall back to the banner's shared ones — the
     * whole banner used to print one sentence over every image.
     */
    headline: string;
    highlight: string;
    subheadline: string;
    align: 'left' | 'right';
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
    /** Set only on a gallery poster: where clicking it goes. */
    href?: string;
    title?: string;
    eventDate?: string;
    location?: string;
    category?: string;
}

<<<<<<< HEAD
/* `=== true`, not `!== false`: the server ALWAYS sends the switch (On by
   default, see the event model). A missing value means a backend too old to
   know it, and an event the CMS cannot account for must not ride the banner. */
const inBanner = (events: CmsEvent[] | null) => (events || []).filter((e) => e?.showInBanner === true);

export function CarouselSection() {
    /*
     * THE FIRST FRAME IS THE LAST COPY THIS BROWSER SAW (`peekCmsCache`), so a
     * returning visitor gets the banner at once instead of a grey block while
     * three requests cross the network. The live answers replace it below.
     */
    const [firstHome] = useState(() => peekCmsCache<HomeContent>('home'));
    const [carousel, setCarousel] = useState<HomeCarousel | null>(firstHome?.carousel || null);
    /* Which of this banner's cards the editor removed, and what they added to each — see `cmsSections`. */
    const [sections, setSections] = useState<CmsSectionOverride[]>(firstHome?.sections || []);
    const [posters, setPosters] = useState<GalleryItem[]>(() => peekCmsCache<GalleryItem[]>('gallery:home') || []);
    /* Events switched into the banner — see `showInBanner` on the event. */
    const [bannerEvents, setBannerEvents] = useState<CmsEvent[]>(() => inBanner(peekCmsCache<CmsEvent[]>('events')));
    const [isLoading, setIsLoading] = useState(!firstHome);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, duration: 40 },
        /* 6s, not 3s: every slide now carries its own heading and
           subheading, and three seconds is not long enough to read two
           lines before they change. */
        [Autoplay({ delay: 6000, stopOnInteraction: false })],
    );

    /* Which slide is on screen — the words over the banner follow it. */
    const [selected, setSelected] = useState(0);
    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => { emblaApi.off('select', onSelect); emblaApi.off('reInit', onSelect); };
    }, [emblaApi]);

=======
export function CarouselSection() {
    const [carousel, setCarousel] = useState<HomeCarousel | null>(null);
    /* Which of this banner's cards the editor removed, and what they added to each — see `cmsSections`. */
    const [sections, setSections] = useState<CmsSectionOverride[]>([]);
    const [posters, setPosters] = useState<GalleryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, duration: 40 },
        [Autoplay({ delay: 3000, stopOnInteraction: false })],
    );

>>>>>>> 8020f5d (Initial commit for website frontend)
    const scrollPrev = useCallback(() => { if (emblaApi) emblaApi.scrollPrev(); }, [emblaApi]);
    const scrollNext = useCallback(() => { if (emblaApi) emblaApi.scrollNext(); }, [emblaApi]);

    useEffect(() => {
        let cancelled = false;

<<<<<<< HEAD
        /*
         * ALL THREE IN FLIGHT TOGETHER, AND EACH LANDS ON ITS OWN.
         *
         * This was one `Promise.all`, so the banner waited for the SLOWEST of
         * the three — the events list, measured at 2–8 seconds in production —
         * before drawing anything. The home document alone is enough to draw
         * the banner; the posters and the events join it as they arrive (the
         * carousel re-measures on `slides.length`).
         *
         * The PUBLIC event list: only an event a visitor may read can be in
         * the banner, and that list is already filtered to exactly those.
         */
        getHome()
            .then((home) => {
                if (cancelled) return;
                // A failed read keeps the copy on screen rather than blanking it.
                if (!home.failed || !firstHome) {
                    setCarousel(home.carousel);
                    setSections(home.sections || []);
                }
                setIsLoading(false);
            })
            .catch(() => { if (!cancelled) setIsLoading(false); });
        getHomeGallery()
            .then((gallery) => { if (!cancelled) setPosters(gallery || []); })
            .catch(() => null);
        getCmsEvents()
            .then((events) => { if (!cancelled) setBannerEvents(inBanner(events)); })
            .catch(() => null);
=======
        // Both in flight together. The banner cannot paint without the home
        // document, and waiting for it before asking for the posters would put
        // two round trips in front of the first thing on the page.
        Promise.all([getHome(), getHomeGallery()])
            .then(([home, gallery]) => {
                if (cancelled) return;
                setCarousel(home.carousel);
                setSections(home.sections || []);
                setPosters(gallery || []);
                setIsLoading(false);
            })
            .catch(() => { if (!cancelled) { setCarousel(null); setSections([]); setIsLoading(false); } });
>>>>>>> 8020f5d (Initial commit for website frontend)

        return () => { cancelled = true; };
    }, []);

    /**
     * The authored slides and the gallery posters, in the order the CMS asks for.
     *
     * Memoised because it is the dependency of the `reInit` below: a new array
     * on every render would re-measure the carousel on every render.
     */
    const slides = useMemo<BannerSlide[]>(() => {
        // A removed Slides card means the authored slides are off the page.
        // The posters are a separate card and can outlive them — a banner of
        // nothing but recent events is a reasonable thing to ask for.
        const authored: BannerSlide[] = sectionHidden(sections, 'carousel.slides')
            ? []
<<<<<<< HEAD
            : (carousel?.slides || []).map(s => ({
                media: s.media,
                caption: s.caption || '',
                headline: s.headline || '',
                highlight: s.headlineHighlight || '',
                subheadline: s.subheadline || '',
                align: s.align === 'right' ? 'right' as const : 'left' as const,
            }));

        const config = carousel?.galleryPosters;

        /*
         * EVENTS SWITCHED INTO THE BANNER — the gallery's treatment, given to
         * events: the editor's banner words when written, the event's own
         * title and summary when not, and a click opens the event's page.
         *
         * Not gated on the gallery-posters card. That card governs the
         * gallery's images; an event has its own switch, on the event.
         */
        const fromEvents: BannerSlide[] = bannerEvents
            .filter(e => e?.media?.url || e?.imageUrl)
            .map(e => {
                const summary = String(e.description || '').replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                const when = e.startAt ? new Date(e.startAt) : null;
                return {
                    media: e.media?.url ? e.media : { ...e.media, url: e.imageUrl },
                    caption: '',
                    ...(e.bannerHeadline || e.bannerHighlight || e.bannerSubheadline
                        ? {
                            headline: e.bannerHeadline || '',
                            highlight: e.bannerHighlight || '',
                            subheadline: e.bannerSubheadline || '',
                        }
                        : {
                            headline: e.title || '',
                            highlight: '',
                            subheadline: summary.length > 180 ? `${summary.slice(0, 177).trimEnd()}…` : summary,
                        }),
                    align: e.bannerAlign === 'right' ? 'right' as const : 'left' as const,
                    href: eventPath(e),
                    title: e.title || '',
                    eventDate: when && !Number.isNaN(when.getTime())
                        ? when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '',
                    location: e.venue || e.location || '',
                    category: e.category || 'Event',
                };
            });

        const place = (extras: BannerSlide[]) => (config?.position === 'before'
            ? [...extras, ...authored]
            : [...authored, ...extras]);

        if (!config || config.enabled === false) return place(fromEvents);
        if (sectionHidden(sections, 'carousel.galleryPosters')) return place(fromEvents);
=======
            : (carousel?.slides || []).map(s => ({ media: s.media, caption: s.caption || '' }));

        const config = carousel?.galleryPosters;
        if (!config || config.enabled === false) return authored;
        if (sectionHidden(sections, 'carousel.galleryPosters')) return authored;
>>>>>>> 8020f5d (Initial commit for website frontend)

        /*
         * EVERY poster switched on, however many that is.
         *
         * There was a `limit` here capping it at six. The per-image switch
         * on the gallery item says which images belong in the banner, and a
         * number on another card quietly overruling it meant an editor who
         * turned nine on got six. One control, one answer — the same change
         * the events strip got.
         */
        const fromGallery: BannerSlide[] = posters
            .filter(item => item?.media?.url)
            .map(item => ({
                media: item.media,
                caption: item.caption || '',
<<<<<<< HEAD
                /*
                 * A GALLERY PHOTO HAS CONTENT OF ITS OWN — its album title and
                 * caption — so that is what it says, LARGE, when no banner words
                 * were written for it. It used to print the banner's default
                 * sentence over itself and leave its real title in the small
                 * corner card. The default heading is only for a photo with
                 * nothing at all to say.
                 *
                 * Banner words and album words are not mixed: written banner
                 * words replace the album's as a set.
                 */
                ...(item.bannerHeadline || item.bannerHighlight || item.bannerSubheadline
                    ? {
                        headline: item.bannerHeadline || '',
                        highlight: item.bannerHighlight || '',
                        subheadline: item.bannerSubheadline || '',
                    }
                    : {
                        headline: item.title || '',
                        highlight: '',
                        subheadline: item.caption || '',
                    }),
                align: item.bannerAlign === 'right' ? 'right' as const : 'left' as const,
                href: galleryPath(item),
=======
                href: `/gallery/${item._id}`,
>>>>>>> 8020f5d (Initial commit for website frontend)
                title: item.title || '',
                eventDate: item.eventDate || '',
                location: item.location || '',
                category: item.category || '',
            }));

<<<<<<< HEAD
        return place([...fromEvents, ...fromGallery]);
    }, [carousel, posters, bannerEvents, sections]);
=======
        return config.position === 'before'
            ? [...fromGallery, ...authored]
            : [...authored, ...fromGallery];
    }, [carousel, posters, sections]);
>>>>>>> 8020f5d (Initial commit for website frontend)

    // Embla caches slide measurements; without this the arrows do nothing on a
    // list that arrived after mount.
    useEffect(() => {
        if (emblaApi) emblaApi.reInit();
    }, [emblaApi, slides.length]);
    const card = carousel?.highlightCard;
    const cardFields = sectionFields(sections, 'carousel.highlightCard');
    const showCard = !sectionHidden(sections, 'carousel.highlightCard')
        && !!(card?.enabled && (card.value || card.eyebrow || (card.stats || []).length || cardFields.length));

    // Render skeleton while loading
    if (isLoading) {
        return (
            <div className="w-full mb-12">
<<<<<<< HEAD
                <div className="relative w-full min-h-[85vh] bg-slate-200 animate-pulse" />
=======
                <div className="relative w-full h-[85vh] min-h-[37.5rem] bg-slate-200 animate-pulse" />
>>>>>>> 8020f5d (Initial commit for website frontend)
            </div>
        );
    }

    // Nothing authored yet: render nothing rather than an empty dark band.
    if (!carousel || (!slides.length && !carousel.headline)) return null;

    /*
     * The words over the banner, and the rows the editor added to them.
     *
     * ONLY the Headline card's rows. The other three banner cards — Slides,
     * Posters, Buttons — decide what appears rather than what it says, so
     * they no longer offer the control at all: a labelled line dropped into
     * the hero from a card called "Slides" is an answer to a question
     * nobody asked. See `ownFields` on `CmsStep`.
     */
    const showHeadline = !sectionHidden(sections, 'carousel.headline');
    const overlayFields = showHeadline
        ? sectionFields(sections, 'carousel.headline')
        : [];

<<<<<<< HEAD
    /*
     * ==========================================================================
     * THE WORDS COMPRESS AS THE CONTENT GROWS
     * ==========================================================================
     *
     * The band is 85vh because that is the shape the page wants, and the first
     * two answers to "more content" were to widen the measure and to make the
     * headline fluid. Past a point neither is enough: a headline, a lede and
     * three added fields will not fit at full size however wide the column is.
     *
     * So the type steps DOWN as the content grows, which is what an editor
     * means by the page adapting — not the page getting taller.
     *
     * Counted in characters rather than in fields, because that is what
     * actually costs lines: one field holding a paragraph fills more of the
     * band than three holding a word each, and a headline nobody shortened
     * costs the same whether or not any field exists.
     *
     * Three steps and no more. A continuous scale sounds better and reads
     * worse — the type would shift by a pixel every time somebody edited a
     * word, so two pages of similar length would never quite match. The
     * thresholds are where the copy stops fitting at the step above, measured
     * against the 1024px measure at the widths this site is used at.
     */
    /*
     * THE WORDS FOR THE SLIDE ON SCREEN.
     *
     * A slide with a heading or subheading of its own shows its own — all
     * three lines together, never mixed with the shared ones, so a slide never
     * pairs its heading with another picture's subheading. A slide with
     * neither shows the banner's shared headline, as every slide did before.
     */
    const current = slides[selected] || slides[0];
    /* ANY of the three counts as the image's own content — highlighted words
       alone are still something written for this picture. */
    const own = !!(current && (current.headline || current.highlight || current.subheadline));
    const words = own && current
        ? { headline: current.headline, highlight: current.highlight, subheadline: current.subheadline }
        : { headline: carousel.headline, highlight: carousel.headlineHighlight, subheadline: carousel.subheadline };
    const align: 'left' | 'right' = current?.align === 'right' ? 'right' : 'left';

    /* Sized for the LONGEST slide's words, so the type does not jump in size
       every time the banner turns. */
    const longestWords = Math.max(
        (carousel.headline || '').length + (carousel.headlineHighlight || '').length + (carousel.subheadline || '').length,
        ...slides.map(sl => (sl.headline || '').length + (sl.highlight || '').length + (sl.subheadline || '').length),
    );

    const overlayWeight =
        longestWords
        + overlayFields.reduce((n, f) => n + (f.label || '').length + (f.value || '').length, 0)
        /* The other three banner cards' rows print here too — see the
           overlay below — so they count towards the room needed. */
        + ['carousel.buttons', 'carousel.slides', 'carousel.galleryPosters']
            .reduce((n, key) => n + sectionFields(sections, key)
                .reduce((m, f) => m + (f.label || '').length + (f.value || '').length, 0), 0);

    /* 1 is the designed size; below it the same layout, set smaller. */
    const density = overlayWeight > 520 ? 0.74
        : overlayWeight > 330 ? 0.86
            : 1;

    const hasOverlay = overlayFields.length > 0
        || (showHeadline && !!(carousel.headline || carousel.subheadline))
        || (showHeadline && slides.some(sl => sl.headline || sl.highlight || sl.subheadline))
=======
    const hasOverlay = overlayFields.length > 0
        || (showHeadline && !!(carousel.headline || carousel.subheadline))
>>>>>>> 8020f5d (Initial commit for website frontend)
        || !!carousel.ctaLabel;

    /**
     * Whether the banner has any buttons at all.
     *
     * Both labels are blank by default now — the association is not running an
     * appeal, and the one thing a visitor is asked to do (Login) is in the
     * header. Everything the buttons used to affect has to answer to this or
     * the layout keeps their space: the row itself, the gap under the lede that
     * separated it from them, and the bottom padding that lifted a wrapped
     * second button clear of the statistics card.
     */
    const hasButtons = !sectionHidden(sections, 'carousel.buttons')
        && !!(carousel.ctaLabel || carousel.secondaryCtaLabel);

    /** Internal paths route; anything else is a plain anchor. */
    const button = (label: string, href: string, icon: string, primary: boolean) => {
        if (!label) return null;
        const className = primary
            ? 'bg-brand-600 hover:bg-brand-700 text-white px-6 sm:px-8 py-3.5 rounded-full font-bold transition-all shadow-lg flex items-center space-x-2 transform hover:scale-105 transform-gpu'
            : 'border-2 border-white hover:bg-white/10 text-white px-6 sm:px-8 py-3.5 rounded-full font-medium transition-all flex items-center space-x-2';

        const inner = (
            <>
                <CmsIcon name={icon} size={18} fallback={primary ? 'heart' : 'play'} />
                <span>{label}</span>
            </>
        );

        return (href || '').startsWith('/')
            ? <Link to={href} className={className}>{inner}</Link>
            : <a href={href || '#'} className={className}>{inner}</a>;
    };

    return (
<<<<<<< HEAD
        <div className="relative w-full mb-12">
            {/*
              * ==================================================================
              * A FULL-SCREEN SLIDESHOW: THE PICTURE FILLS THE BAND EDGE TO EDGE
              * ==================================================================
              *
              * From `md` the picture COVERS the whole band — no box, no blurred
              * side bars (both were tried; the association wants the photograph
              * full screen). The band's HEIGHT follows the screen's shape
              * (16:9, capped at 88vh) instead of a fixed 85vh, so a 16:9 photo or
              * poster fills it with nothing cut, and other shapes lose only a
              * sliver top and bottom.
              *
              * The statistics card sits UNDER the band, overlapping only its
              * edge — pinned across the bottom it covered the lowest fifth of
              * every picture, which on a poster is the venue and the date.
              *
              * ON A PHONE the band is portrait, so the picture is shown whole
              * (`contain`) over a blurred copy of itself; `cover` there cut the
              * people off a landscape photo.
              */}
            <div className="relative w-full min-h-[60vh] md:min-h-0 md:h-[min(56.25vw,88vh)] bg-slate-900 overflow-hidden
                            flex flex-col justify-center md:flex-row md:items-center">
=======
        <div className={`w-full ${showCard ? 'mb-32' : 'mb-12'}`}>
            <div className="relative w-full h-[85vh] min-h-[37.5rem] bg-slate-900 overflow-visible">
>>>>>>> 8020f5d (Initial commit for website frontend)

                {slides.length > 0 && (
                    <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
                        <div className="flex h-full">
                            {slides.map((slide, i) => {
<<<<<<< HEAD
                                const picture = (
                                    <>
                                        <div aria-hidden="true" className="md:hidden absolute inset-0 overflow-hidden">
                                            <CmsMediaFrame
                                                media={{ ...slide.media, fit: 'cover', alt: '' }}
                                                width={320}
                                                className="scale-125 blur-2xl opacity-70"
                                            />
                                        </div>
=======
                                /* The picture and the shade over it. On a poster
                                   this whole block becomes the link, so that the
                                   thing a visitor points at is the thing that
                                   takes them somewhere. */
                                const picture = (
                                    <>
                                        {/* The frame honours the fit and focal point chosen in the
                                            CMS, so a portrait upload is not cropped to a sliver in a
                                            banner this wide, and a video renders as a video. */}
>>>>>>> 8020f5d (Initial commit for website frontend)
                                        <div className="absolute inset-0">
                                            <CmsMediaFrame
                                                media={slide.media}
                                                priority={i === 0}
<<<<<<< HEAD
                                                width={1920}
                                                sizes="100vw"
                                                transparent
                                                /* No picture, or one that will not load: the
                                                   brand's navy→blue, never a black band that
                                                   reads as a broken image. */
                                                fallback={
                                                    <div aria-hidden="true" className="absolute inset-0
                                                         bg-gradient-to-br from-[#0f1d4a] via-[#1c2e68] to-[#2563eb]">
                                                        <div className="absolute inset-0 opacity-20
                                                             bg-[radial-gradient(circle_at_20%_30%,#ffffff_0,transparent_45%)]" />
                                                    </div>
                                                }
                                                className={`max-md:!object-contain max-md:!object-center md:!object-cover ${slide.href
                                                    ? 'group-hover:scale-[1.03] transition-transform duration-[1200ms] transform-gpu'
                                                    : ''}`}
                                            />
                                        </div>
                                        {/* The shade sits under the words, on their side — none on
                                            a poster, which carries no words over it. */}
                                        <div className={`absolute inset-0 ${slide.href ? 'hidden' : ''} ${slide.align === 'right'
                                            ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-black/80 via-black/50
                                                        to-transparent z-10 pointer-events-none`} />
=======
                                                width={1600}
                                                className={slide.href
                                                    ? 'group-hover:scale-[1.03] transition-transform duration-[1200ms] transform-gpu'
                                                    : ''}
                                            />
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50
                                                        to-transparent z-10 pointer-events-none" />

>>>>>>> 8020f5d (Initial commit for website frontend)
                                    </>
                                );

                                return (
                                    <div key={slide.href || i} className="flex-[0_0_100%] min-w-0 h-full relative">
                                        {slide.href ? (
<<<<<<< HEAD
                                            /* Embla swallows the click that ends a drag,
                                               so a swipe on a phone does not navigate. */
=======
                                            /*
                                              Embla registers its own capture-phase
                                              click handler and swallows the click
                                              that ends a drag, so swiping the
                                              banner on a phone does not navigate.
                                              Nothing extra is needed here.
                                            */
>>>>>>> 8020f5d (Initial commit for website frontend)
                                            <Link
                                                to={slide.href}
                                                aria-label={slide.title ? `View details of ${slide.title}` : 'View gallery item'}
                                                className="group absolute inset-0 block"
                                            >
                                                {picture}
                                            </Link>
                                        ) : picture}

                                        {slide.caption && !slide.href && (
                                            <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-6">
                                                <p className="text-white/90 text-[1.375rem] md:text-[1.5625rem] text-center max-w-3xl drop-shadow">
                                                    {slide.caption}
                                                </p>
                                            </div>
                                        )}

                                        {/*
<<<<<<< HEAD
                                          A poster says what it is, on its own
                                          translucent panel (legible over any
                                          photograph): high on a phone, bottom
                                          right from `lg`. `pointer-events-none`
                                          so it never takes the click from the link.
                                        */}
                                        {slide.href && (
                                            /* One small pill, in the corner, so it hides
                                               almost nothing of the poster. */
                                            <span className="absolute right-3 sm:right-6 bottom-28 sm:bottom-6 z-20 pointer-events-none
                                                             inline-flex items-center gap-1.5 rounded-full bg-black/60
                                                             border border-white/30 px-3.5 py-1.5 text-white
                                                             text-[0.75rem] sm:text-[0.8125rem] font-extrabold uppercase tracking-widest">
                                                View details <ArrowRight size={13} />
                                            </span>
=======
                                          A poster says what it is, and says that it
                                          can be opened.

                                          ITS OWN PANEL, not text on the photograph.
                                          The banner's shade runs left to right, for
                                          the headline, so the far side of the frame
                                          is at full brightness — and a lit hall or a
                                          white marquee leaves white text there
                                          unreadable. A translucent plate is legible
                                          over anything, at any width.

                                          IT MOVES. On a phone the bottom of this
                                          banner belongs to the two buttons and to
                                          the statistics card that crosses its
                                          bottom edge, so a block pinned there
                                          collides with both — it sits high instead,
                                          under the header. From `lg`, where the
                                          headline occupies the left half and the
                                          card is clear of the corner, it takes the
                                          bottom right.

                                          `pointer-events-none` throughout: it must
                                          never intercept the click meant for the
                                          link underneath it.
                                        */}
                                        {slide.href && (slide.title || slide.eventDate || slide.location) && (
                                            <div className="absolute right-3 sm:right-4 lg:right-8
                                                            top-6 sm:top-8 lg:top-auto lg:bottom-24 z-20
                                                            max-w-[min(20rem,72%)] text-right pointer-events-none
                                                            /* No `backdrop-blur`: this sits over a
                                                               full-bleed photograph, so the compositor
                                                               re-blurs the whole image on every frame of
                                                               a scroll. Measured at 167ms frames on the
                                                               home page. A solid translucent fill looks
                                                               the same at this opacity. */
                                                            bg-black/55 border border-white/15
                                                            rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
                                                {slide.category && (
                                                    <span className="inline-block bg-white/95 text-brand-700 text-[0.75rem] font-bold
                                                                     px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                                                        {slide.category}
                                                    </span>
                                                )}

                                                {slide.title && (
                                                    <p className="text-white text-[1.25rem] sm:text-[1.375rem] lg:text-2xl font-extrabold
                                                                  leading-snug line-clamp-2">
                                                        {slide.title}
                                                    </p>
                                                )}

                                                {(slide.eventDate || slide.location) && (
                                                    <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1
                                                                    text-white/90">
                                                        {slide.eventDate && (
                                                            <span className={`${MICRO_LABEL} flex items-center gap-1.5`}>
                                                                <Calendar size={12} /> {slide.eventDate}
                                                            </span>
                                                        )}
                                                        {slide.location && (
                                                            <span className={`${MICRO_LABEL} hidden sm:flex items-center gap-1.5 min-w-0`}>
                                                                <MapPin size={12} className="shrink-0" />
                                                                <span className="truncate">{slide.location}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/*
                                                  Desktop only. On a phone this
                                                  panel sits over the headline's
                                                  first line if it runs to four
                                                  rows — and the affordance is
                                                  redundant there anyway: the whole
                                                  image is the tap target, and a
                                                  phone has no hover to reveal it.
                                                */}
                                                <span className="mt-3 hidden lg:inline-flex items-center gap-1.5 border border-white/40
                                                                 text-white text-[0.8125rem] font-extrabold uppercase
                                                                 tracking-widest px-3.5 py-1.5 rounded-full">
                                                    View details <ArrowRight size={13} />
                                                </span>
                                            </div>
>>>>>>> 8020f5d (Initial commit for website frontend)
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

<<<<<<< HEAD
                {slides.length > 1 && (
                    <>
                        {/* From `sm`: a disc on each side of the banner. */}
                        <button
                            type="button"
=======
                {/*
                  Arrows are pointless with one slide and misleading with none.
                  Below `sm` they are pointless for a second reason: the overlay
                  headline is centred in the banner and wraps to three or four
                  lines on a 390px screen, so a pair of 48px discs pinned at 40%
                  of the height land ON the words — "Better Future" was sitting
                  behind the left arrow. The carousel is a swipe on a touch
                  screen, so nothing is lost by taking them off it; from `sm`
                  there is width for them beside the text and they come back.
                */}
                {slides.length > 1 && (
                    <>
                        <button
>>>>>>> 8020f5d (Initial commit for website frontend)
                            onClick={scrollPrev}
                            aria-label="Previous slide"
                            className="hidden sm:flex absolute left-4 md:left-8 top-[40%] -translate-y-1/2 w-12 h-12 items-center
                                       justify-center rounded-full bg-white/20 hover:bg-white/30 text-white
                                       ring-1 ring-white/25 transition-colors z-30"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        <button
<<<<<<< HEAD
                            type="button"
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
                            onClick={scrollNext}
                            aria-label="Next slide"
                            className="hidden sm:flex absolute right-4 md:right-8 top-[40%] -translate-y-1/2 w-12 h-12 items-center
                                       justify-center rounded-full bg-white/20 hover:bg-white/30 text-white
                                       ring-1 ring-white/25 transition-colors z-30"
                        >
                            <ChevronRight size={28} />
                        </button>
<<<<<<< HEAD

                        {/*
                          * ON A PHONE: arrows and dots together at the foot of the
                          * banner. Beside the words they sat ON the headline (which
                          * is why they were hidden before); down here they cover
                          * nothing and sit under the thumb.
                          */}
                        <div className="sm:hidden absolute inset-x-0 bottom-14 z-30 flex items-center justify-center gap-4">
                            <button type="button" onClick={scrollPrev} aria-label="Previous slide"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white
                                               ring-1 ring-white/30 active:scale-90 transition">
                                <ChevronLeft size={22} />
                            </button>
                            <div className="flex items-center gap-1.5">
                                {slides.map((s, i) => (
                                    <button key={s.href || i} type="button"
                                            aria-label={`Slide ${i + 1} of ${slides.length}`}
                                            aria-current={i === selected}
                                            onClick={() => emblaApi && emblaApi.scrollTo(i)}
                                            className={`h-2 rounded-full transition-all ${i === selected
                                                ? 'w-5 bg-white' : 'w-2 bg-white/50'}`} />
                                ))}
                            </div>
                            <button type="button" onClick={scrollNext} aria-label="Next slide"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white
                                               ring-1 ring-white/30 active:scale-90 transition">
                                <ChevronRight size={22} />
                            </button>
                        </div>
                    </>
                )}

                {hasOverlay && !current?.href && (
                    /*
                     * NOT OVER A POSTER. An event or gallery poster carries its own
                     * title, date and venue, and the big headline on top of it hid
                     * them; its title and facts are in the corner panel instead.
                     *
                     * `relative`: this is what gives the band its height. The
                     * bottom padding keeps the words clear of the statistics card
                     * (desktop) and of the arrow row (phone).
                     */
                    <div className={`relative z-20 w-full py-16 sm:py-24 pointer-events-none
                                     ${slides.length > 1 ? 'max-sm:pb-32' : ''}
                                     ${showCard ? 'md:pb-20' : ''}`}>
                        <div className={SCREEN_CONTAINER}>
                            <div
                                className={`max-w-3xl lg:max-w-4xl xl:max-w-5xl text-white pointer-events-auto
                                            ${align === 'right' ? 'ml-auto text-right' : ''}`}
                                style={{ fontSize: `calc(clamp(1.25rem, 0.82rem + 1.3vw, 2.0625rem) * ${density})` }}
                            >
                                {/* Keyed on the slide, so the words fade in with each picture. */}
                                <div key={`${selected}-${align}`} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                {showHeadline && (words.headline || words.highlight) && (
                                    <h1 className="text-[2.18em] font-black leading-[1.06] tracking-tight mb-6">
                                        {words.headline}
                                        {words.highlight && (
                                            <> <span className="text-brand-300">{words.highlight}</span></>
=======
                    </>
                )}

                {/* Headline and buttons */}
                {/*
                  `pb-28` on a phone, none from `sm`. The overlay centres its
                  content in the banner's full height, but the statistics card is
                  absolutely positioned across the bottom edge of it — so on a
                  390px screen, where the two buttons wrap onto separate lines,
                  the second one landed underneath the card and could not be
                  tapped at all. Padding the flex container shifts the centre up
                  by the height of the overlap.
                */}
                {hasOverlay && (
                    <div className={`absolute inset-0 z-20 flex items-center pointer-events-none
                                     ${hasButtons ? 'pb-28 sm:pb-32 lg:pb-0' : 'pb-20 sm:pb-24 lg:pb-0'}`}>
                        <div className={SCREEN_CONTAINER}>
                            <div className="max-w-3xl text-white pointer-events-auto">
                                {showHeadline && (carousel.headline || carousel.headlineHighlight) && (
                                    <h1 className={`${HERO_HEADING} mb-6`}>
                                        {carousel.headline}
                                        {carousel.headlineHighlight && (
                                            <> <span className="text-brand-300">{carousel.headlineHighlight}</span></>
>>>>>>> 8020f5d (Initial commit for website frontend)
                                        )}
                                    </h1>
                                )}

<<<<<<< HEAD
                                {showHeadline && words.subheadline && (
                                    <p className={`text-[1em] leading-relaxed font-semibold text-gray-200 max-w-2xl lg:max-w-3xl xl:max-w-4xl
                                                   ${align === 'right' ? 'ml-auto' : ''}
                                                   ${hasButtons ? 'mb-10' : 'mb-0'}`}>
                                        {words.subheadline}
                                    </p>
                                )}
                                </div>

                                {hasButtons && (
                                    <div className={`flex flex-wrap items-center gap-4 ${align === 'right' ? 'justify-end' : ''}`}>
=======
                                {showHeadline && carousel.subheadline && (
                                    <p className={`${HERO_LEDE} text-gray-200 max-w-2xl
                                                   ${hasButtons ? 'mb-10' : 'mb-0'}`}>
                                        {carousel.subheadline}
                                    </p>
                                )}

                                {/* Not rendered at all when both labels are blank —
                                    an empty flex row still occupies the gap above
                                    it, which reads as a button that failed to
                                    paint rather than as one that is not there. */}
                                {hasButtons && (
                                    <div className="flex flex-wrap items-center gap-4">
>>>>>>> 8020f5d (Initial commit for website frontend)
                                        {button(carousel.ctaLabel, carousel.ctaHref, carousel.ctaIcon, true)}
                                        {button(carousel.secondaryCtaLabel, carousel.secondaryCtaHref, carousel.secondaryCtaIcon, false)}
                                    </div>
                                )}

<<<<<<< HEAD
                                {/* The editor's own rows on this banner. */}
                                <div className={BANNER_PROSE}>
                                    <CmsExtraFields
                                        fields={overlayFields}
                                        variant="list"
                                        tone="dark"
                                        force="content"
                                        className={hasButtons ? 'mt-10' : 'mt-8'}
                                    />
                                    <SectionFields proseClass={BANNER_PROSE} sections={sections} sectionKey="carousel.buttons" tone="dark" force="content" />
                                    <SectionFields proseClass={BANNER_PROSE} sections={sections} sectionKey="carousel.slides" tone="dark" force="content" />
                                    <SectionFields proseClass={BANNER_PROSE} sections={sections} sectionKey="carousel.galleryPosters" tone="dark" force="content" />
                                </div>
=======
                                {/* The editor's own rows on this banner — see `overlayFields`. */}
                                <CmsExtraFields
                                    fields={overlayFields}
                                    tone="dark"
                                    className={hasButtons ? 'mt-10' : 'mt-8'}
                                />
>>>>>>> 8020f5d (Initial commit for website frontend)
                            </div>
                        </div>
                    </div>
                )}
<<<<<<< HEAD
            </div>

                {/* The card overlapping the bottom edge — outside the band, see above */}
=======

                {/* The card overlapping the bottom edge */}
>>>>>>> 8020f5d (Initial commit for website frontend)
                {showCard && (
                    /* A wide, shallow tilt on a long card: the same degrees that
                       look right on a 320px tile shear a 1024px one. The long
                       perspective and the small intensity are what keep this
                       reading as a plate lifting off the banner rather than as a
                       skew. */
                    <Tilt3D
                        /* `-bottom-16`, not `-bottom-20`. The card is anchored by its
                           bottom edge, so every pixel it grows is a pixel its TOP rises
                           into the banner — and the banner has a paragraph there. Less
                           overhang leaves the same plate-lifting-off effect with the
                           text clear behind it. */
<<<<<<< HEAD
                        /* Under the banner at every width, over its edge only —
                           see the note on the band. */
                        className="relative z-30 mx-auto -mt-10 md:-mt-14 w-[calc(100%-2rem)] md:w-[90%] max-w-5xl"
=======
                        className="absolute left-1/2 -translate-x-1/2 -bottom-16 w-[90%] max-w-5xl z-30"
>>>>>>> 8020f5d (Initial commit for website frontend)
                        intensity={4}
                        lift={1.01}
                        perspective={1600}
                        glare={false}
                    >
                    <div className="bg-white rounded-3xl shadow-[0_30px_70px_-24px_rgb(28_46_104/0.5)]
<<<<<<< HEAD
                                    p-4 sm:p-6 md:p-8 lg:p-10 border border-brand-100">
                    {/*
                      * COMPACT ON A PHONE. The desktop type (STAT_FIGURE,
                      * EYEBROW, STAT_LABEL) stacked into a ~480px plate on a
                      * 390px screen — bigger than the photograph above it. Below
                      * `sm` every size here is stepped down and the figures sit
                      * three across in one row; from `sm` the shared type
                      * constants apply exactly as before.
                      */}
                    <div className="flex flex-col md:flex-row items-center
                                    justify-between gap-4 sm:gap-6 md:gap-0">

                        {(card!.value || card!.eyebrow) && (
                            <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto">
                                <div className="w-11 h-11 sm:w-16 sm:h-16 bg-brand-50 rounded-full flex items-center justify-center
                                                text-brand-600 shrink-0">
                                    <CmsIcon name={card!.icon} size={24} className="sm:w-8 sm:h-8" fallback="users" />
                                </div>
                                <div className="min-w-0">
                                    {card!.eyebrow && (
                                        <p className={`max-sm:text-[0.8rem] max-sm:tracking-[0.12em] max-sm:mb-0.5 ${EYEBROW} text-brand-500 sm:mb-1.5`}>
                                            {card!.eyebrow}
                                        </p>
                                    )}
                                    <p className={`max-sm:text-[1.85rem] max-sm:leading-tight ${STAT_FIGURE} text-brand-800`}>
                                        <CountUp value={card!.value} />
                                        {card!.caption && (
                                            <span className="block text-[0.95rem] sm:text-[1.25rem] font-medium text-gray-500 sm:mt-1">{card!.caption}</span>
=======
                                    p-6 md:p-8 lg:p-10 border border-brand-100">
                    <div className="flex flex-col md:flex-row items-center
                                    justify-between gap-6 md:gap-0">

                        {(card!.value || card!.eyebrow) && (
                            <div className="flex items-center space-x-6 w-full md:w-auto">
                                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center
                                                text-brand-600 shrink-0">
                                    <CmsIcon name={card!.icon} size={32} fallback="users" />
                                </div>
                                <div>
                                    {card!.eyebrow && (
                                        <p className={`${EYEBROW} text-brand-500 mb-1.5`}>
                                            {card!.eyebrow}
                                        </p>
                                    )}
                                    <p className={`${STAT_FIGURE} text-brand-800`}>
                                        <CountUp value={card!.value} />
                                        {card!.caption && (
                                            <span className="text-[1.25rem] font-medium text-gray-500 ml-2">{card!.caption}</span>
>>>>>>> 8020f5d (Initial commit for website frontend)
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {(card!.value || card!.eyebrow) && (card!.stats || []).length > 0 && (
                            <div className="w-px h-20 bg-gray-200 mx-4 lg:mx-8 hidden md:block" />
                        )}

                        {(card!.stats || []).length > 0 && (
                            /*
                             * A GRID, NOT A WRAPPING FLEX ROW.
                             *
                             * `flex-wrap` with `justify-between` put three figures on
                             * a row that fitted two: DISTRICTS and BLOCKS side by side,
                             * then EVENTS alone on a second row, left-aligned under the
                             * first — an orphan that reads as a fourth thing that did
                             * not fit rather than as one of three.
                             *
                             * It also doubled the card's height, and the card is
                             * positioned by its BOTTOM edge — so the extra row pushed
                             * its top up through the hero paragraph behind it. The
                             * overlap in the screenshot is this wrap, not the offset.
                             *
                             * `auto-cols-fr` with `grid-flow-col` from `md` puts every
                             * figure in an equal column on one row, whatever the CMS
                             * has been given — three today, five tomorrow. Below `md`
                             * they stack two-up, which is deliberate: on a phone the
                             * card is already full width and a single row of five would
                             * be five unreadable columns.
                             */
<<<<<<< HEAD
                            /* One row of equal columns at every width now — on a
                               phone as small figures three across (with a rule
                               above them), rather than two-up with an orphan. */
                            <div className="grid w-full md:w-auto grid-flow-col auto-cols-fr gap-x-2 sm:gap-x-8 lg:gap-x-16
                                            max-md:border-t max-md:border-brand-100 max-md:pt-4">
                                {card!.stats.map((stat, i) => (
                                    <div key={i} className="flex flex-col items-center text-center min-w-0">
                                        <CmsIcon name={stat.icon} size={20} className="text-brand-600 mb-1.5 sm:mb-3 sm:w-7 sm:h-7" fallback="users" />
                                        <p className={`max-sm:text-[1.5rem] max-sm:leading-tight ${STAT_FIGURE} text-brand-800`}>
                                            <CountUp value={stat.value} />
                                        </p>
                                        <p className={`max-sm:text-[0.75rem] max-sm:tracking-[0.06em] ${STAT_LABEL} text-gray-500 mt-0.5 sm:mt-1.5 truncate max-w-full`}>
=======
                            <div className="grid w-full md:w-auto grid-cols-2 gap-x-6 gap-y-6
                                            md:grid-flow-col md:auto-cols-fr sm:gap-x-8 lg:gap-x-16">
                                {card!.stats.map((stat, i) => (
                                    <div key={i} className="flex flex-col items-center text-center min-w-0">
                                        <CmsIcon name={stat.icon} size={28} className="text-brand-600 mb-3" fallback="users" />
                                        <p className={`${STAT_FIGURE} text-brand-800`}>
                                            <CountUp value={stat.value} />
                                        </p>
                                        <p className={`${STAT_LABEL} text-gray-500 mt-1.5`}>
>>>>>>> 8020f5d (Initial commit for website frontend)
                                            {stat.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

<<<<<<< HEAD
                    {/* The editor's own rows on this card, under the figures,
                        in the card's own type. */}
                    <div className={CARD_PROSE}>
                        <CmsExtraFields
                            fields={cardFields}
                            /* This plate of figures is a card and nothing else
                               — see `fieldMode` on its CMS step. */
                            force="card"
                            className="mt-8 border-t border-brand-100 pt-6"
                        />
                    </div>
                    </div>
                    </Tilt3D>
                )}
=======
                    {/* The editor's own rows on this card, under the figures. */}
                    <CmsExtraFields
                        fields={cardFields}
                        className="mt-8 border-t border-brand-100 pt-6"
                    />
                    </div>
                    </Tilt3D>
                )}
            </div>
>>>>>>> 8020f5d (Initial commit for website frontend)
        </div>
    );
}
