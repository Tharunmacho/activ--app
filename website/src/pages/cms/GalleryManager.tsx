import { useEffect, useState } from 'react';
import {
    Plus, Trash2, Eye, EyeOff, Star, Save, Check, Loader2,
    Home, Pencil, X, ExternalLink, ArrowUpToLine,
} from 'lucide-react';
import {
    getGallery, addGalleryItem, updateGalleryItem, deleteGalleryItem,
    getGallerySettings, updateGallerySettings, errorMessage,
    EMPTY_MEDIA, type GalleryItem, type GallerySettings, type CmsMedia,
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
} from './components/CmsUI';
import { RepeatableList, LineList, IconPicker , ExtraFieldsEditor } from './components/CmsEditors';
import { CmsMediaFrame } from '@/components/shared/CmsMediaFrame';
import MediaPicker from './components/MediaPicker';

/**
 * The gallery page: the copy around the grid, and the images in it.
 *
 * Two independent saves. The page copy is a singleton and the images are their
 * own records, so putting them behind one button would mean a failure adding an
 * image discards a heading edit made a minute earlier.
 *
 * Hiding and deleting are separate actions on purpose. Hiding takes an image off
 * the site but keeps it — the usual case is "not right now", not "gone forever"
 * — while delete is permanent and asks first.
 *
 * FIVE STATES PER IMAGE, and they are deliberately independent:
 *
 *   visible     on the site at all. Off removes it everywhere.
 *   showOnHome  rides in the landing page's banner, newest first. On by
 *               default, so posting an event here is all it takes to put it on
 *               the home page; off keeps it on the gallery page only.
 *   pinned      leads BOTH surfaces — the banner and the gallery grid — so the
 *               event you want seen first is seen first everywhere.
 *   featured    fills one of the three collage frames on the gallery page.
 *   description the write-up on the item's own page, which is where clicking a
 *               poster — on the landing page or in the grid — goes.
 */

/**
 * One gallery item as the editor works on it.
 *
 * The same shape backs the "add" form and the edit panel on a stored row, so
 * the fields are written once and both places stay in step — the failure this
 * avoids is a field that can be set when adding and then never changed again.
 */
interface ItemDraft {
    media: CmsMedia;
    title: string;
    caption: string;
    category: string;
    eventDate: string;
    location: string;
    /** The write-up on the item's own page. */
    description: string;
    /** Bullet points beside the write-up, one per line. */
    highlights: string[];
    /** Further photographs, under the poster on its page. */
    photos: CmsMedia[];
    /** Fields the editor named themselves. */
    customFields: { label: string; value: string }[];
    featured: boolean;
    /** Leads both the banner and the gallery grid. */
    pinned: boolean;
    /** Rides in the landing page banner. */
    showOnHome: boolean;
    visible?: boolean;
}

const BLANK_ITEM: ItemDraft = {
    media: { ...EMPTY_MEDIA } as CmsMedia,
    title: '',
    caption: '',
    category: '',
    eventDate: '',
    location: '',
    description: '',
    highlights: [],
    photos: [],
    customFields: [],
    featured: false,
    pinned: false,
    // On by default, matching the server: posting to the gallery is what puts
    // an event on the landing page, and needing to remember a second switch is
    // how a poster ends up published and invisible.
    showOnHome: true,
};

/** A stored item, read back into the draft shape the form works on. */
const toDraft = (item: GalleryItem): ItemDraft => ({
    media: { ...EMPTY_MEDIA, ...(item.media || {}) },
    title: item.title || '',
    caption: item.caption || '',
    category: item.category || '',
    eventDate: item.eventDate || '',
    location: item.location || '',
    description: item.description || '',
    highlights: item.highlights || [],
    photos: (item.photos || []).map(p => ({ ...EMPTY_MEDIA, ...(p || {}) })),
    customFields: (item.customFields || []).map(f => ({ label: f.label || '', value: f.value || '' })),
    featured: !!item.featured,
    pinned: !!item.pinned,
    // Rows written before the field existed have no value, and they are the
    // ones already on the site — so absent reads as on, as it does server-side.
    showOnHome: item.showOnHome !== false,
    visible: item.visible,
});

/**
 * Every field of one item.
 *
 * Extracted rather than duplicated: the add form and the edit panel are the
 * same form against different state.
 */
function ItemFields({ value, onChange, categories }: {
    value: ItemDraft;
    onChange: (next: ItemDraft) => void;
    categories: { label: string; icon: string }[];
}) {
    const set = (patch: Partial<ItemDraft>) => onChange({ ...value, ...patch });

    return (
        <div className="space-y-5">
            {/* 4/3 — the shape of a card in the grid. */}
            <MediaPicker
                label="Poster or photograph"
                aspect="4 / 3"
                value={value.media}
                onChange={media => set({ media })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <CmsField label="Title" onClear={() => set({ title: '' })} canClear={!!value.title}>
                    <CmsInput
                        value={value.title}
                        onChange={e => set({ title: e.target.value })}
                        placeholder="Annual Business Conference 2024"
                    />
                </CmsField>

                <CmsField
                    label="Category"
                    hint="Must match a filter chip above to be filterable."
                    onClear={() => set({ category: '' })}
                    canClear={!!value.category}
                >
                    <select
                        value={value.category}
                        onChange={e => set({ category: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-300 dark:border-[#2a2a2a]
                                   rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-neutral-100"
                    >
                        <option value="">No category</option>
                        {categories.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                    </select>
                </CmsField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <CmsField
                    label="Date"
                    hint="Free text — shown exactly as typed."
                    onClear={() => set({ eventDate: '' })}
                    canClear={!!value.eventDate}
                >
                    <CmsInput
                        value={value.eventDate}
                        onChange={e => set({ eventDate: e.target.value })}
                        placeholder="20 Jan 2024"
                    />
                </CmsField>
                <CmsField label="Location" onClear={() => set({ location: '' })} canClear={!!value.location}>
                    <CmsInput
                        value={value.location}
                        onChange={e => set({ location: e.target.value })}
                        placeholder="Chennai, India"
                    />
                </CmsField>
            </div>

            <CmsField
                label="Short caption"
                hint="One line under the title on the item's own page."
                onClear={() => set({ caption: '' })}
                canClear={!!value.caption}
            >
                <CmsInput
                    value={value.caption}
                    onChange={e => set({ caption: e.target.value })}
                    placeholder="Three hundred entrepreneurs, one afternoon."
                />
            </CmsField>

            <CmsField
                label="Full details"
                hint="What a visitor reads after clicking the poster. Blank lines start a new paragraph."
                onClear={() => set({ description: '' })}
                canClear={!!value.description}
            >
                <CmsTextarea
                    rows={7}
                    value={value.description}
                    onChange={e => set({ description: e.target.value })}
                    placeholder={'What the event was, who attended, what came of it.'}
                />
            </CmsField>

            <LineList
                label="Highlights"
                hint="One per line, shown as a ticked list on the item's page. Leave empty to hide it."
                clearable
                value={value.highlights}
                onChange={highlights => set({ highlights })}
                rows={4}
                placeholder={'300+ attendees\n12 speakers\n40 new members'}
            />

            {/*
              The fields above are the ones the LAYOUT knows: the date and the
              place have their own icons on the page, the title is the heading.
              These are the editor's own — name them whatever this event needs.
            */}
            <CmsSection
                title="Your own fields"
                hint="Add anything else worth recording — Chief Guest, Organised by, Sponsors, Attendance.
                      Each one shows as a labelled row on the item's page, in this order. Don't want a field
                      any more? Delete the row. Don't want one of the fields above? Leave it blank and it is
                      not shown at all."
            >
                <RepeatableList<{ label: string; value: string }>
                    items={value.customFields}
                    onChange={customFields => set({ customFields })}
                    noun="field"
                    blank={() => ({ label: '', value: '' })}
                    row={(field, update) => (
                        /* Stacked below `sm` so a long value never pushes the row
                           wider than the card it sits in. */
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-3">
                            <CmsField label="Field name">
                                <CmsInput
                                    value={field.label}
                                    onChange={e => update({ label: e.target.value })}
                                    placeholder="Chief Guest"
                                />
                            </CmsField>
                            <CmsField label="Content">
                                <CmsTextarea
                                    rows={2}
                                    value={field.value}
                                    onChange={e => update({ value: e.target.value })}
                                    placeholder="Hon'ble Minister for Industries"
                                />
                            </CmsField>
                        </div>
                    )}
                />
            </CmsSection>

            <CmsSection
                title="More photographs"
                hint="Shown under the poster on its own page. These do not appear in the grid."
            >
                <RepeatableList<CmsMedia>
                    items={value.photos}
                    onChange={photos => set({ photos })}
                    noun="photograph"
                    blank={() => ({ ...EMPTY_MEDIA })}
                    row={(photo, update) => (
                        <MediaPicker
                            label=""
                            aspect="4 / 3"
                            value={photo}
                            onChange={next => update(next)}
                        />
                    )}
                />
            </CmsSection>

            <div className="space-y-2">
                {/*
                  Three switches, three different questions, in the order an
                  editor asks them: is it on the home page, does it lead, and
                  does it fill a collage frame.
                */}
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                    <input
                        type="checkbox"
                        checked={value.pinned}
                        onChange={e => set({ pinned: e.target.checked })}
                        className="rounded border-slate-400"
                    />
                    Show this one first
                    <span className="text-xs text-neutral-500">
                        (leads the landing banner and the gallery grid, ahead of everything else)
                    </span>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                    <input
                        type="checkbox"
                        checked={value.showOnHome}
                        onChange={e => set({ showOnHome: e.target.checked })}
                        className="rounded border-slate-400"
                    />
                    Show in the landing page banner
                    <span className="text-xs text-neutral-500">(newest first; the slide links to this item's page)</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                    <input
                        type="checkbox"
                        checked={value.featured}
                        onChange={e => set({ featured: e.target.checked })}
                        className="rounded border-slate-400"
                    />
                    Feature in the collage at the top of the gallery page
                    <span className="text-xs text-neutral-500">(the first three featured images are used)</span>
                </label>
            </div>
        </div>
    );
}

export default function GalleryManager() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [settings, setSettings] = useState<GallerySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [savingCopy, setSavingCopy] = useState(false);
    const [savedCopy, setSavedCopy] = useState(false);

    const [draft, setDraft] = useState<ItemDraft>({ ...BLANK_ITEM });
    const [adding, setAdding] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    /**
     * The row being edited, and the copy being edited.
     *
     * An inline panel rather than a dialog: the row stays where it is, so an
     * editor working down a long gallery does not lose their place, and there is
     * never a stack of overlays to dismiss.
     */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<ItemDraft | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const startEdit = (item: GalleryItem) => {
        setEditingId(item._id);
        setEditDraft(toDraft(item));
        setError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(null);
    };

    const saveEdit = async () => {
        if (!editingId || !editDraft) return;
        if (!editDraft.media.url) {
            setError('An image or video is required.');
            return;
        }

        setSavingEdit(true);
        setError('');
        try {
            await updateGalleryItem(editingId, flatten(editDraft));
            cmsSaved(editDraft.title || 'Image');
            cancelEdit();
            await load();
        } catch (err) {
            setError(errorMessage(err, 'Could not save the image'));
        } finally {
            setSavingEdit(false);
        }
    };

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [list, config] = await Promise.all([
                // Includes hidden images: this is the admin grid, and an image
                // you cannot see is an image you cannot un-hide.
                getGallery(true),
                getGallerySettings(),
            ]);
            setItems(list);
            setSettings(config);
        } catch (err) {
            setError(errorMessage(err, 'Could not load the gallery'));
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
            setSettings(await updateGallerySettings(settings));
            setSavedCopy(true);
            cmsSaved('Gallery copy');
            setTimeout(() => setSavedCopy(false), 2500);
        } catch (err) {
            setError(errorMessage(err, 'Could not save the page copy'));
        } finally {
            setSavingCopy(false);
        }
    };

    /**
     * Media fields are sent flat rather than nested.
     *
     * A file upload goes as multipart, where a nested object would arrive as the
     * string "[object Object]". The server reads `url`/`alt`/`fit`/`position`
     * off the payload root when there is no `media` key, so one flat shape works
     * for both the JSON and the multipart path.
     */
    const flatten = (item: ItemDraft) => ({
        url: item.media.url,
        alt: item.media.alt,
        fit: item.media.fit,
        position: item.media.position,
        type: item.media.type,
        title: item.title,
        caption: item.caption,
        category: item.category,
        eventDate: item.eventDate,
        location: item.location,
        description: item.description,
        // Arrays and objects, not flattened: these two only ever travel as JSON
        // (the media above is already uploaded by the picker, so no save from
        // this screen is multipart).
        highlights: item.highlights,
        photos: item.photos.filter(p => p && p.url),
        // A row left completely blank is not a field; the server drops it too.
        customFields: item.customFields.filter(f => f.label || f.value),
        featured: item.featured,
        pinned: item.pinned,
        showOnHome: item.showOnHome,
        ...(item.visible === undefined ? {} : { visible: item.visible }),
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.media.url) {
            setError('Choose a file or paste a URL first.');
            return;
        }
        setAdding(true);
        setError('');
        try {
            await addGalleryItem(flatten(draft));
            setDraft({ ...BLANK_ITEM, media: { ...EMPTY_MEDIA } });
            await load();
        } catch (err) {
            setError(errorMessage(err, 'Could not add the image'));
        } finally {
            setAdding(false);
        }
    };

    /** Patch one field on one stored item. */
    const patchItem = async (id: string, patch: Record<string, any>) => {
        setBusyId(id);
        setError('');
        try {
            await updateGalleryItem(id, patch);
            await load();
        } catch (err) {
            setError(errorMessage(err, 'Could not update the image'));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (item: GalleryItem) => {
        if (!window.confirm(`Delete "${item.title || 'this image'}" permanently? Hiding it is reversible; this is not.`)) return;
        setBusyId(item._id);
        try {
            await deleteGalleryItem(item._id);
            cmsDeleted(item.title || 'Image');
            await load();
        } catch (err) {
            setError(errorMessage(err, 'Could not delete the image'));
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <CmsLoading label="Loading gallery…" />;

    const categories = settings?.categories || [];
    const featuredCount = items.filter(i => i.featured).length;
    // `!== false`, not `=== true`: rows written before the flag existed have no
    // value and are on the landing page, which is what the server does too.
    const onHomeCount = items.filter(i => i.showOnHome !== false && i.visible !== false).length;

    return (
        <CmsPage>
            <CmsError message={error} onRetry={load} />

            {/* ============================================== page copy */}
            {settings && (
                <CmsCard title="Page copy" description="The heading, description and filter chips above the grid.">
                    <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                            <IconPicker
                                value={settings.badgeIcon}
                                onChange={badgeIcon => setSettings({ ...settings, badgeIcon })}
                                label="Badge icon"
                            />
                            <CmsField label="Badge text" hint="The small pill above the heading.">
                                <CmsInput
                                    value={settings.badgeText}
                                    onChange={e => setSettings({ ...settings, badgeText: e.target.value })}
                                    placeholder="Our Gallery"
                                />
                            </CmsField>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <CmsField label="Heading">
                                <CmsInput
                                    value={settings.heading}
                                    onChange={e => setSettings({ ...settings, heading: e.target.value })}
                                    placeholder="Moments That Tell Our"
                                />
                            </CmsField>
                            <CmsField label="Highlighted word" hint="Rendered in blue at the end of the heading.">
                                <CmsInput
                                    value={settings.headingHighlight}
                                    onChange={e => setSettings({ ...settings, headingHighlight: e.target.value })}
                                    placeholder="Story"
                                />
                            </CmsField>
                        </div>

                        <CmsField label="Description">
                            <CmsTextarea
                                rows={3}
                                value={settings.description}
                                onChange={e => setSettings({ ...settings, description: e.target.value })}
                            />
                        </CmsField>

                        <LineList
                            label="Handwritten note"
                            hint="One line each, shown beside the collage on wide screens. Leave empty to hide it."
                            value={settings.noteLines}
                            onChange={noteLines => setSettings({ ...settings, noteLines })}
                            rows={3}
                            placeholder={'Our Work\nOur People\nOur Impact'}
                        />

                        <CmsSection
                            title="Filter chips"
                            hint={'An "All" chip is always shown first. A chip label is what an image category must match to appear under that filter.'}
                        >
                            <RepeatableList<{ label: string; icon: string }>
                                items={categories}
                                onChange={next => setSettings({ ...settings, categories: next })}
                                noun="chip"
                                blank={() => ({ label: '', icon: 'image' })}
                                row={(chip, update) => (
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                                        <IconPicker value={chip.icon} onChange={icon => update({ icon })} />
                                        <CmsField label="Label">
                                            <CmsInput
                                                value={chip.label}
                                                onChange={e => update({ label: e.target.value })}
                                                placeholder="Conferences"
                                            />
                                        </CmsField>
                                    </div>
                                )}
                            />
                        </CmsSection>

                        <CmsSection title="Paging" hint="How many images load before the button appears.">
                            <div className="grid gap-4 sm:grid-cols-2">
                            <CmsField label="Images before 'view more'" hint="0 shows every image at once.">
                                <CmsInput
                                    type="number" min={0} max={200}
                                    value={String(settings.pageSize)}
                                    onChange={e => setSettings({ ...settings, pageSize: Number(e.target.value) || 0 })}
                                />
                            </CmsField>
                            <CmsField label="'View more' label" hint="Blank hides the button.">
                                <CmsInput
                                    value={settings.viewMoreLabel}
                                    onChange={e => setSettings({ ...settings, viewMoreLabel: e.target.value })}
                                    placeholder="View More Photos"
                                />
                            </CmsField>
                            </div>
                        </CmsSection>

                        {/* ------------------------------------ one item's page */}
                        <CmsSection
                            title="Poster page"
                            hint="The labels on the page a visitor lands on after clicking a poster.
                                  The content itself is edited on each image below."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <CmsField label="Back link">
                                    <CmsInput
                                        value={settings.detail.backLabel}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, backLabel: e.target.value },
                                        })}
                                        placeholder="Back to Gallery"
                                    />
                                </CmsField>
                                <CmsField label="Write-up heading">
                                    <CmsInput
                                        value={settings.detail.aboutHeading}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, aboutHeading: e.target.value },
                                        })}
                                        placeholder="About this event"
                                    />
                                </CmsField>
                                <CmsField label="Highlights heading">
                                    <CmsInput
                                        value={settings.detail.highlightsHeading}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, highlightsHeading: e.target.value },
                                        })}
                                        placeholder="Highlights"
                                    />
                                </CmsField>
                                <CmsField label="Photographs heading">
                                    <CmsInput
                                        value={settings.detail.photosHeading}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, photosHeading: e.target.value },
                                        })}
                                        placeholder="More photographs"
                                    />
                                </CmsField>
                                <CmsField label="Related row heading" hint="Blank hides the heading, not the row.">
                                    <CmsInput
                                        value={settings.detail.relatedHeading}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, relatedHeading: e.target.value },
                                        })}
                                        placeholder="More from the gallery"
                                    />
                                </CmsField>
                                <CmsField label="Deleted or hidden item" hint="Shown when a link points at an item that is gone.">
                                    <CmsInput
                                        value={settings.detail.missingText}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, missingText: e.target.value },
                                        })}
                                        placeholder="This item is no longer available."
                                    />
                                </CmsField>
                                <CmsField label="Button label" hint="The button on the side card. Blank hides it.">
                                    <CmsInput
                                        value={settings.detail.ctaLabel}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, ctaLabel: e.target.value },
                                        })}
                                        placeholder="Join ACTIV"
                                    />
                                </CmsField>
                                <CmsField label="Button destination" hint="A path such as /register, or a full https:// address.">
                                    <CmsInput
                                        value={settings.detail.ctaHref}
                                        onChange={e => setSettings({
                                            ...settings, detail: { ...settings.detail, ctaHref: e.target.value },
                                        })}
                                        placeholder="/register"
                                    />
                                </CmsField>
                            </div>
                        </CmsSection>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <CmsField label="Nothing published yet" hint="Shown in place of the grid.">
                                <CmsInput
                                    value={settings.emptyText}
                                    onChange={e => setSettings({ ...settings, emptyText: e.target.value })}
                                    placeholder="No photographs have been published yet."
                                />
                            </CmsField>
                            <CmsField
                                label="Filter matched nothing"
                                hint="Write {category} where the chosen filter should appear."
                            >
                                <CmsInput
                                    value={settings.emptyFilterText}
                                    onChange={e => setSettings({ ...settings, emptyFilterText: e.target.value })}
                                    placeholder="Nothing in {category} yet."
                                />
                            </CmsField>
                        <ExtraFieldsEditor
                            items={settings.extraFields || []}
                            onChange={extraFields => setSettings({ ...settings, extraFields })}
                            hint="Anything else this page should say. Each row shows as a labelled line under the grid."
                        />
                        </div>
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
                            {savingCopy ? 'Saving…' : savedCopy ? 'Saved — live page updated' : 'Save page copy'}
                        </button>
                    </div>
                </CmsCard>
            )}

            {/* ============================================== add an image */}
            <CmsCard
                title="Add a poster or photograph"
                description="Appears at the end of the gallery grid and — unless you turn it off below —
                             in the landing page banner, where clicking it opens its own page."
            >
                <form onSubmit={handleAdd} className="space-y-5">
                    <ItemFields value={draft} onChange={setDraft} categories={categories} />

                    <CmsButton type="submit" loading={adding}>
                        <Plus className="w-4 h-4" /> Add to gallery
                    </CmsButton>
                </form>
            </CmsCard>

            {/* ============================================== the images */}
            <CmsCard
                title={`Images (${items.length})`}
                description={[
                    featuredCount === 0
                        ? 'No image is featured, so the collage at the top of the gallery page is not shown.'
                        : `${featuredCount} featured — the first three fill the collage at the top of the gallery page.`,
                    onHomeCount === 0
                        ? 'None is set to appear in the landing page banner.'
                        : `${onHomeCount} riding in the landing page banner.`,
                ].join(' ')}
            >
                {items.length === 0 ? (
                    <CmsEmpty title="No images yet" hint="The grid is not shown until one is added." />
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div
                                key={item._id}
                                className={`border border-slate-200 dark:border-[#2a2a2a] rounded-lg
                                            ${item.visible === false ? 'opacity-60' : ''}`}
                            >
                                <div className="flex gap-4 p-3">
                                    <div className="w-28 h-20 shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-[#161616]">
                                        <CmsMediaFrame media={item.media} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100 truncate">
                                            {item.title || 'Untitled'}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                            {[item.category, item.eventDate, item.location].filter(Boolean).join(' · ') || 'No details'}
                                        </p>

                                        {/* What is true of this row right now, in words.
                                            The four icon buttons beside it say what can be
                                            changed; these say what the state IS, which is
                                            what an editor scanning the list is looking for. */}
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            {item.visible === false && (
                                                <span className="text-xs text-amber-600 dark:text-amber-400">Hidden from the site</span>
                                            )}
                                            {item.pinned && (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">Shown first</span>
                                            )}
                                            {item.showOnHome !== false && item.visible !== false && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400">In the landing banner</span>
                                            )}
                                            {!item.description && (
                                                <span className="text-xs text-neutral-500">No write-up yet</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-1 shrink-0">
                                        {/* Opens the item's public page — the fastest way to
                                            check that a write-up reads the way it was meant to. */}
                                        <a
                                            href={`/gallery/${item._id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Open its page on the site"
                                            className="p-2 rounded text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#161616]"
                                        >
                                            <ExternalLink size={16} />
                                        </a>

                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => patchItem(item._id, { pinned: !item.pinned })}
                                            title={item.pinned
                                                ? 'Stop showing this one first'
                                                : 'Show this one first, in the banner and the gallery grid'}
                                            className={`p-2 rounded transition-colors disabled:opacity-40 ${
                                                item.pinned
                                                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                                    : 'text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#161616]'
                                            }`}
                                        >
                                            <ArrowUpToLine size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => patchItem(item._id, { showOnHome: item.showOnHome === false })}
                                            title={item.showOnHome === false
                                                ? 'Show in the landing page banner'
                                                : 'Remove from the banner (stays in the gallery)'}
                                            className={`p-2 rounded transition-colors disabled:opacity-40 ${
                                                item.showOnHome !== false
                                                    ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
                                                    : 'text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#161616]'
                                            }`}
                                        >
                                            <Home size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => patchItem(item._id, { featured: !item.featured })}
                                            title={item.featured ? 'Remove from the collage' : 'Feature in the collage'}
                                            className={`p-2 rounded transition-colors disabled:opacity-40 ${
                                                item.featured
                                                    ? 'text-amber-500 hover:bg-amber-500/10'
                                                    : 'text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#161616]'
                                            }`}
                                        >
                                            <Star size={16} fill={item.featured ? 'currentColor' : 'none'} />
                                        </button>

                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => patchItem(item._id, { visible: item.visible === false })}
                                            title={item.visible === false ? 'Show on the site' : 'Hide from the site'}
                                            className="p-2 rounded text-neutral-500 hover:bg-slate-100 dark:hover:bg-[#161616]
                                                       disabled:opacity-40"
                                        >
                                            {item.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => (editingId === item._id ? cancelEdit() : startEdit(item))}
                                            title={editingId === item._id ? 'Close the editor' : 'Edit the details'}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                                       text-slate-700 dark:text-neutral-200 border border-slate-300
                                                       dark:border-[#2a2a2a] hover:bg-slate-100 dark:hover:bg-[#161616]
                                                       disabled:opacity-40 transition-colors"
                                        >
                                            {editingId === item._id ? <X size={13} /> : <Pencil size={13} />}
                                            {editingId === item._id ? 'Close' : 'Edit'}
                                        </button>

                                        {/* Labelled, not a bare icon: it sits beside the
                                            show/hide toggle at the same size, and one of
                                            the two is reversible while the other is not. */}
                                        <button
                                            type="button"
                                            disabled={busyId === item._id}
                                            onClick={() => handleDelete(item)}
                                            title="Delete permanently"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                                       text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30
                                                       hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                                        >
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                </div>

                                {/* ---- the editor for this row ---- */}
                                {editingId === item._id && editDraft && (
                                    <div className="border-t border-slate-200 dark:border-[#2a2a2a] p-4
                                                    bg-slate-50/60 dark:bg-black/40 rounded-b-lg">
                                        <ItemFields
                                            value={editDraft}
                                            onChange={setEditDraft}
                                            categories={categories}
                                        />

                                        <div className="flex flex-wrap gap-3 mt-6">
                                            <CmsButton type="button" onClick={saveEdit} loading={savingEdit}>
                                                <Save className="w-4 h-4" /> Save changes
                                            </CmsButton>
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                disabled={savingEdit}
                                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600
                                                           dark:text-neutral-300 border border-slate-300 dark:border-[#2a2a2a]
                                                           hover:bg-slate-100 dark:hover:bg-[#161616] disabled:opacity-40
                                                           transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CmsCard>
        </CmsPage>
    );
}
