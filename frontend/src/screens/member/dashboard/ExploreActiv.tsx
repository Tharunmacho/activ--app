import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  PALETTE, SPACE, TYPE, Skeleton, shortDate,
  BRAND, FadeInUp, PressableScale, FloatingIllustration, PremiumSectionHeader, SiteArt, SiteArtKind, WebsiteGlobe3D,
} from '../../../ui';
import {
  getSiteNav, getLegalLinks, getZones, getLatestNews, getGalleryStrip, getPublicEvents,
  FALLBACK_NAV, FALLBACK_LEGAL, SiteLink, Zone, NewsTeaser, GalleryThumb, EventTeaser,
} from '../../../services/websiteContent';
import { WEBSITE_PATHS, websiteUrl } from '../../../config/website.config';

/**
 * ============================================================================
 * EXPLORE ACTIV — the association's public website, from the dashboard
 * ============================================================================
 *
 * Shown on BOTH member dashboards (unpaid and paid). Every tap opens the exact
 * website page in the in-app viewer (`WebsiteViewer`).
 *
 *   Page tiles ....... the website's own header menu (GET /cms/site), plus
 *                      Donate and Zones; each with its own drawn glyph
 *   Latest news ...... GET /cms/news — newest three, a paging carousel
 *   Upcoming events .. GET /cms/events?scope=public — the next three
 *   Gallery strip .... GET /cms/gallery?limit=8
 *   Zones & states ... GET /cms/regions/map — /regions/:slug and /states/:slug
 *   Policies ......... GET /cms/legal/links
 *
 * All reads go through services/websiteContent (cached, null-safe). A failed
 * read hides that teaser; the tiles always render (fixed fallback menu).
 */

type Nav = { navigate: (route: string, params?: any) => void };

type TileMeta = { art: SiteArtKind; colors: string[]; blurb: string };

/** Meaning → colour and glyph, by the page's path. Member side: blues, teal, green, amber, rose. */
const TILE_BY_PATH: Record<string, TileMeta> = {
  '/': { art: 'home', colors: ['#1E3A8A', '#3B82F6'], blurb: 'The association at a glance' },
  '/about': { art: 'about', colors: ['#0F766E', '#2DD4BF'], blurb: 'Our story, vision and leaders' },
  '/membership': { art: 'membership', colors: ['#92400E', '#F59E0B'], blurb: 'Plans and what they include' },
  '/events': { art: 'events', colors: ['#9F1239', '#FB7185'], blurb: 'Conclaves, meets and webinars' },
  '/news': { art: 'news', colors: ['#075985', '#38BDF8'], blurb: 'Stories from the chapters' },
  '/schemes': { art: 'schemes', colors: ['#065F46', '#34D399'], blurb: 'Government schemes to use' },
  '/gallery': { art: 'gallery', colors: ['#C2410C', '#FDBA74'], blurb: 'Moments from across India' },
  '/contact': { art: 'contact', colors: ['#334155', '#64748B'], blurb: 'Offices, phone and email' },
  '/donate': { art: 'donate', colors: ['#BE123C', '#F43F5E'], blurb: 'Support ACTIV · 80G receipt' },
  zones: { art: 'zones', colors: ['#0B1A45', '#2563EB'], blurb: 'ACTIV zone by zone' },
};

const metaFor = (path: string): TileMeta => {
  const base = `/${String(path || '').split(/[/?#]/)[1] || ''}`;
  return TILE_BY_PATH[path] || TILE_BY_PATH[base] || { art: 'web', colors: ['#1C2E68', '#60A5FA'], blurb: 'On the ACTIV website' };
};

const MONTHS3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function ExploreActiv({ navigation, refreshKey = 0 }: { navigation: Nav; refreshKey?: number }) {
  const { width } = useWindowDimensions();
  const [nav, setNav] = useState<SiteLink[]>(FALLBACK_NAV);
  const [legal, setLegal] = useState<SiteLink[]>(FALLBACK_LEGAL);
  const [zones, setZones] = useState<Zone[]>([]);
  const [news, setNews] = useState<NewsTeaser[] | null>(null);
  const [gallery, setGallery] = useState<GalleryThumb[] | null>(null);
  const [events, setEvents] = useState<EventTeaser[] | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const force = refreshKey > 0;
    const safe = <T,>(p: Promise<T>, set: (v: T) => void) => {
      p.then((v) => { if (!cancelled) set(v); }).catch(() => { /* the service never rejects; belt and braces */ });
    };
    safe(getSiteNav(force), (v) => setNav(Array.isArray(v) && v.length ? v : FALLBACK_NAV));
    safe(getLegalLinks(force), (v) => setLegal(Array.isArray(v) && v.length ? v : FALLBACK_LEGAL));
    safe(getZones(force), (v) => setZones(Array.isArray(v) ? v : []));
    safe(getLatestNews(3, force), (v) => setNews(Array.isArray(v) ? v : []));
    safe(getGalleryStrip(8, force), (v) => setGallery(Array.isArray(v) ? v : []));
    safe(getPublicEvents(3, force), (v) => setEvents(Array.isArray(v) ? v : []));
    return () => { cancelled = true; };
  }, [refreshKey]);

  const open = useCallback((path: string, title?: string) => {
    try {
      navigation.navigate('WebsiteViewer', { url: websiteUrl(path), title: title || 'ACTIV' });
    } catch (err) {
      console.warn('Opening the website viewer safely caught:', err);
    }
  }, [navigation]);

  const openExternal = useCallback(async (url: string) => {
    try {
      if (typeof Linking?.openURL === 'function') await Linking.openURL(url);
    } catch (err) {
      console.warn('External link safely caught:', err);
    }
  }, []);

  const tiles = useMemo(() => {
    const list = (nav || []).map((l) => ({ key: l.path, label: l.label, path: l.path, meta: metaFor(l.path) }));
    if (!list.some((t) => t.path === WEBSITE_PATHS.donate)) {
      list.push({ key: 'donate', label: 'Donate', path: WEBSITE_PATHS.donate, meta: TILE_BY_PATH['/donate'] });
    }
    const firstZone = (zones || [])[0];
    if (firstZone?.slug) {
      list.push({ key: 'zones', label: 'Zones & States', path: WEBSITE_PATHS.region(firstZone.slug), meta: TILE_BY_PATH.zones });
    }
    return list;
  }, [nav, zones]);

  const states = useMemo(
    () => (zones || []).flatMap((z) => (z?.states || []).map((s) => ({ ...s, zone: z.label }))),
    [zones],
  );

  const cardW = Math.round(Math.min(340, (width || 360) * 0.8));

  return (
    <View>
      <PremiumSectionHeader
        title="Explore ACTIV"
        subtitle="The association's website, right here in the app"
        action="Website"
        onAction={() => open(WEBSITE_PATHS.home, 'ACTIV')}
      />

      {/* ---- intro banner */}
      <FadeInUp delay={60}>
        <PressableScale
          onPress={() => open(WEBSITE_PATHS.about, 'About ACTIV')}
          style={x.gutter}
          scaleTo={0.985}
          contentStyle={x.bannerShadow}
          accessibilityRole="button"
          accessibilityLabel="Discover ACTIV. Open the About page."
        >
          <LinearGradient
            colors={[BRAND.navyDeep, BRAND.navy, BRAND.blue900, BRAND.blue]}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={x.banner}
          >
            <View style={x.bannerOrb} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={x.bannerEyebrow} maxFontSizeMultiplier={1.2}>ACTIV · activ.org.in</Text>
              <Text style={x.bannerTitle} maxFontSizeMultiplier={1.25}>Adidravidar Confederation of Trade & Industrial Vision</Text>
              <View style={x.bannerCta}>
                <Text style={x.bannerCtaText} maxFontSizeMultiplier={1.2}>Discover our story</Text>
                <Icon name="arrow-forward" size={16} color={BRAND.navy} />
              </View>
            </View>
            <FloatingIllustration size={84} amplitude={5}>
              <WebsiteGlobe3D size={84} />
            </FloatingIllustration>
          </LinearGradient>
        </PressableScale>
      </FadeInUp>

      {/* ---- page tiles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.tileRow}>
        {tiles.map((t, i) => (
          <FadeInUp key={t.key} delay={120 + Math.min(i, 6) * 60} distance={12}>
            <PressableScale
              onPress={() => open(t.path, t.label)}
              scaleTo={0.95}
              contentStyle={[x.tileShadow, { shadowColor: t.meta.colors[0] }]}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}. ${t.meta.blurb}. Opens the website.`}
            >
              <LinearGradient colors={t.meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={x.tile}>
                <View style={x.tileOrb} />
                <View style={x.tileHead}>
                  <SiteArt kind={t.meta.art} size={40} />
                  <Icon name="arrow-outward" size={16} color="rgba(255,255,255,0.8)" />
                </View>
                <Text style={x.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t.label}</Text>
                <Text style={x.tileBlurb} numberOfLines={2} maxFontSizeMultiplier={1.2}>{t.meta.blurb}</Text>
              </LinearGradient>
            </PressableScale>
          </FadeInUp>
        ))}
      </ScrollView>

      {/* ---- latest news */}
      {news === null || news.length > 0 ? (
        <>
          <View style={x.subHead}>
            <Text style={x.subTitle} maxFontSizeMultiplier={1.3}>Latest news</Text>
            <PressableScale onPress={() => open(WEBSITE_PATHS.news, 'News')} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="All news" hitSlop={8}>
              <Text style={x.subAction} maxFontSizeMultiplier={1.3}>All news</Text>
            </PressableScale>
          </View>
          {news === null ? (
            <View style={x.gutter}><Skeleton width="100%" height={220} radius={22} /></View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={cardW + SPACE.md}
                decelerationRate="fast"
                contentContainerStyle={x.newsRow}
                onScroll={(e) => {
                  const xOff = Number(e?.nativeEvent?.contentOffset?.x || 0);
                  const idx = Math.round(xOff / (cardW + SPACE.md));
                  if (idx !== page) setPage(Math.max(0, Math.min(news.length - 1, idx)));
                }}
                scrollEventThrottle={32}
              >
                {news.map((n) => (
                  <PressableScale
                    key={n.key}
                    onPress={() => (n.external ? openExternal(n.external) : open(n.path, 'News'))}
                    scaleTo={0.98}
                    contentStyle={[x.newsCard, { width: cardW }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${n.title}. ${n.category}. Read on the website.`}
                  >
                    <View style={x.newsImgWrap}>
                      {n.image ? (
                        <Image source={{ uri: n.image }} style={x.newsImg} resizeMode="cover" accessibilityIgnoresInvertColors />
                      ) : (
                        <LinearGradient colors={TILE_BY_PATH['/news'].colors} style={[x.newsImg, x.center]}>
                          <SiteArt kind="news" size={56} />
                        </LinearGradient>
                      )}
                      <LinearGradient colors={['rgba(11,26,69,0)', 'rgba(11,26,69,0.75)']} style={x.newsFade} />
                      {n.category ? <View style={x.newsCat}><Text style={x.newsCatText} numberOfLines={1}>{n.category.toUpperCase()}</Text></View> : null}
                      {n.external ? <View style={x.newsExt}><Icon name="open-in-new" size={14} color={PALETTE.white} /></View> : null}
                    </View>
                    <View style={x.newsBody}>
                      <Text style={x.newsTitle} numberOfLines={2} maxFontSizeMultiplier={1.25}>{n.title}</Text>
                      {n.summary ? <Text style={x.newsSummary} numberOfLines={2} maxFontSizeMultiplier={1.25}>{n.summary}</Text> : null}
                      {n.date ? <Text style={x.newsDate} maxFontSizeMultiplier={1.2}>{shortDate(n.date) || n.date}</Text> : null}
                    </View>
                  </PressableScale>
                ))}
              </ScrollView>
              {news.length > 1 ? (
                <View style={x.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {news.map((n, i) => <View key={n.key} style={[x.dot, i === page && x.dotOn]} />)}
                </View>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {/* ---- upcoming public events */}
      {events && events.length > 0 ? (
        <>
          <View style={x.subHead}>
            <Text style={x.subTitle} maxFontSizeMultiplier={1.3}>On the public calendar</Text>
            <PressableScale onPress={() => open(WEBSITE_PATHS.events, 'Events')} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="All events" hitSlop={8}>
              <Text style={x.subAction} maxFontSizeMultiplier={1.3}>All events</Text>
            </PressableScale>
          </View>
          <View style={[x.gutter, x.eventCard]}>
            {events.map((e, i) => {
              const d = e.startAt ? new Date(e.startAt) : null;
              const ok = !!d && !Number.isNaN(d.getTime());
              return (
                <PressableScale
                  key={e.key}
                  onPress={() => open(e.path, 'Event')}
                  scaleTo={0.985}
                  contentStyle={[x.eventRow, i < events.length - 1 && x.divider]}
                  accessibilityRole="button"
                  accessibilityLabel={`${e.title}. ${ok && d ? shortDate(e.startAt) : 'Date to be confirmed'}. Opens the website.`}
                >
                  <LinearGradient colors={TILE_BY_PATH['/events'].colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={x.date}>
                    <Text style={x.dateDay} maxFontSizeMultiplier={1.1}>{ok && d ? String(d.getDate()).padStart(2, '0') : '--'}</Text>
                    <Text style={x.dateMon} maxFontSizeMultiplier={1.1}>{ok && d ? MONTHS3[d.getMonth()] : 'TBC'}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={x.eventTitle} numberOfLines={2} maxFontSizeMultiplier={1.25}>{e.title}</Text>
                    <View style={x.eventMeta}>
                      <Icon name={e.mode === 'online' ? 'videocam' : 'place'} size={13} color={PALETTE.textMuted} />
                      <Text style={x.eventMetaText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {e.mode === 'online' ? 'Online' : (e.place || 'Venue to be announced')}{e.category ? ` · ${e.category}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color={PALETTE.textFaint} />
                </PressableScale>
              );
            })}
          </View>
        </>
      ) : null}

      {/* ---- gallery strip */}
      {gallery === null || gallery.length > 0 ? (
        <>
          <View style={x.subHead}>
            <Text style={x.subTitle} maxFontSizeMultiplier={1.3}>From the gallery</Text>
            <PressableScale onPress={() => open(WEBSITE_PATHS.gallery, 'Gallery')} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="Open the gallery" hitSlop={8}>
              <Text style={x.subAction} maxFontSizeMultiplier={1.3}>Gallery</Text>
            </PressableScale>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.photoRow}>
            {gallery === null
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} width={112} height={112} radius={18} />)
              : gallery.map((g, i) => (
                <FadeInUp key={g.key} delay={Math.min(i, 5) * 50} distance={8}>
                  <PressableScale
                    onPress={() => open(g.path, 'Gallery')}
                    scaleTo={0.95}
                    contentStyle={x.photo}
                    accessibilityRole="button"
                    accessibilityLabel={`${g.title || 'Photo'}. Opens in the gallery.`}
                  >
                    <Image source={{ uri: g.image }} style={x.photoImg} resizeMode="cover" accessibilityIgnoresInvertColors />
                    {g.title ? (
                      <LinearGradient colors={['rgba(11,26,69,0)', 'rgba(11,26,69,0.8)']} style={x.photoCap}>
                        <Text style={x.photoCapText} numberOfLines={2} maxFontSizeMultiplier={1.1}>{g.title}</Text>
                      </LinearGradient>
                    ) : null}
                  </PressableScale>
                </FadeInUp>
              ))}
          </ScrollView>
        </>
      ) : null}

      {/* ---- zones & states */}
      {zones.length > 0 ? (
        <>
          <View style={x.subHead}>
            <Text style={x.subTitle} maxFontSizeMultiplier={1.3}>ACTIV across India</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.chipRow}>
            {zones.map((z) => (
              <PressableScale
                key={z.slug}
                onPress={() => open(WEBSITE_PATHS.region(z.slug), z.label)}
                scaleTo={0.94}
                contentStyle={x.zoneChip}
                accessibilityRole="button"
                accessibilityLabel={`${z.label} zone${z.states.length ? `, ${z.states.length} states` : ''}. Opens the zone page.`}
              >
                <LinearGradient colors={z.national ? ['#92400E', '#F59E0B'] : ['#1E3A8A', '#3B82F6']} style={x.zoneIcon}>
                  <Icon name={z.national ? 'flag' : 'explore'} size={14} color={PALETTE.white} />
                </LinearGradient>
                <Text style={x.zoneText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{z.national ? '🇮🇳 ' : ''}{z.label}</Text>
                {z.states.length ? <Text style={x.zoneCount} maxFontSizeMultiplier={1.1}>{z.states.length}</Text> : null}
              </PressableScale>
            ))}
          </ScrollView>
          {states.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[x.chipRow, { paddingTop: 0 }]}>
              {states.map((s) => (
                <PressableScale
                  key={s.slug}
                  onPress={() => open(WEBSITE_PATHS.state(s.slug), s.name)}
                  scaleTo={0.94}
                  contentStyle={x.stateChip}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${s.zone} zone. Opens the state page.`}
                >
                  <Icon name="place" size={13} color={PALETTE.blue} />
                  <Text style={x.stateText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{s.name}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {/* ---- policies */}
      <View style={x.legal}>
        {legal.map((l, i) => (
          <React.Fragment key={l.path}>
            {i > 0 ? <Text style={x.legalDot}>·</Text> : null}
            <PressableScale onPress={() => open(l.path, l.label)} scaleTo={0.95} accessibilityRole="link" accessibilityLabel={l.label} hitSlop={6}>
              <Text style={x.legalText} maxFontSizeMultiplier={1.2}>{l.label}</Text>
            </PressableScale>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const x = StyleSheet.create({
  gutter: { marginHorizontal: SPACE.lg },
  center: { alignItems: 'center', justifyContent: 'center' },

  bannerShadow: {
    borderRadius: 22, backgroundColor: BRAND.navy, shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  banner: { borderRadius: 22, padding: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, overflow: 'hidden' },
  bannerOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, top: -80, backgroundColor: 'rgba(96,165,250,0.2)' },
  bannerEyebrow: { ...TYPE.eyebrow, fontSize: 10, color: BRAND.onBrandFaint },
  bannerTitle: { ...TYPE.subheading, color: PALETTE.white, marginTop: SPACE.xs, lineHeight: 21 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: PALETTE.white,
    borderRadius: 999, paddingHorizontal: SPACE.md, minHeight: 32, marginTop: SPACE.md,
  },
  bannerCtaText: { fontSize: 13, fontWeight: '800', color: BRAND.navy },

  tileRow: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.sm, gap: SPACE.md },
  tileShadow: {
    borderRadius: 20, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5, backgroundColor: PALETTE.white,
  },
  tile: { width: 132, height: 142, borderRadius: 20, padding: SPACE.md, overflow: 'hidden' },
  tileOrb: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: -40, bottom: -50, backgroundColor: 'rgba(255,255,255,0.14)' },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tileLabel: { ...TYPE.bodyStrong, color: PALETTE.white, marginTop: SPACE.md },
  tileBlurb: { ...TYPE.caption, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  subHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACE.lg, marginTop: SPACE.xl, marginBottom: SPACE.md },
  subTitle: { ...TYPE.subheading },
  subAction: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: PALETTE.blue },

  newsRow: { paddingHorizontal: SPACE.lg, gap: SPACE.md, paddingBottom: SPACE.sm },
  newsCard: {
    backgroundColor: PALETTE.white, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(226,232,240,0.9)',
    shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 4,
  },
  newsImgWrap: { height: 138, borderTopLeftRadius: 21, borderTopRightRadius: 21, overflow: 'hidden', backgroundColor: PALETTE.field },
  newsImg: { width: '100%', height: '100%' },
  newsFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  newsCat: { position: 'absolute', left: SPACE.md, bottom: SPACE.sm, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: SPACE.sm, paddingVertical: 2, maxWidth: '70%' },
  newsCatText: { fontSize: 10, lineHeight: 14, fontWeight: '800', color: PALETTE.white, letterSpacing: 0.8 },
  newsExt: { position: 'absolute', right: SPACE.md, top: SPACE.md, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,26,69,0.5)', alignItems: 'center', justifyContent: 'center' },
  newsBody: { padding: SPACE.md, paddingBottom: SPACE.lg },
  newsTitle: { ...TYPE.subheading, lineHeight: 21 },
  newsSummary: { ...TYPE.caption, fontWeight: '400', lineHeight: 17, marginTop: SPACE.xs },
  newsDate: { fontSize: 11, lineHeight: 15, color: PALETTE.textFaint, marginTop: SPACE.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACE.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.borderStrong },
  dotOn: { width: 18, backgroundColor: PALETTE.blue },

  eventCard: {
    backgroundColor: PALETTE.white, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(226,232,240,0.9)',
    shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, minHeight: 72 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: PALETTE.divider },
  date: { width: 48, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: PALETTE.white, fontVariant: ['tabular-nums'] },
  dateMon: { fontSize: 9.5, lineHeight: 12, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  eventTitle: { ...TYPE.bodyStrong },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  eventMetaText: { ...TYPE.caption, fontWeight: '400', flexShrink: 1 },

  photoRow: { paddingHorizontal: SPACE.lg, gap: SPACE.sm, paddingBottom: SPACE.xs },
  photo: { width: 112, height: 112, borderRadius: 18, overflow: 'hidden', backgroundColor: PALETTE.field },
  photoImg: { width: '100%', height: '100%' },
  photoCap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACE.sm, paddingTop: SPACE.lg, paddingBottom: SPACE.sm },
  photoCapText: { fontSize: 10.5, lineHeight: 13, fontWeight: '700', color: PALETTE.white },

  chipRow: { paddingHorizontal: SPACE.lg, gap: SPACE.sm, paddingBottom: SPACE.sm },
  zoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 40, paddingLeft: 5, paddingRight: SPACE.md,
    borderRadius: 999, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border,
  },
  zoneIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  zoneText: { ...TYPE.bodyStrong, fontSize: 13 },
  zoneCount: { fontSize: 11, fontWeight: '800', color: PALETTE.blueDark, backgroundColor: PALETTE.blueSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  stateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: SPACE.md, borderRadius: 999,
    backgroundColor: PALETTE.blueTint, borderWidth: 1, borderColor: PALETTE.blueSoft,
  },
  stateText: { fontSize: 12.5, fontWeight: '600', color: PALETTE.blueDark },

  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: SPACE.xs, marginTop: SPACE.lg, marginHorizontal: SPACE.lg },
  legalDot: { color: PALETTE.textFaint },
  legalText: { fontSize: 12, lineHeight: 18, color: PALETTE.textMuted, fontWeight: '600', paddingVertical: SPACE.xs },
});

