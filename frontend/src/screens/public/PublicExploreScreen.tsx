import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  BRAND, PALETTE, SPACE, BrandFrame, BrandHeaderBlock, BrandLogo, CardSkeletons,
  EventTicket3D, FloatingIllustration, GradientButton, LocationMap3D, Megaphone3D,
  PressableScale, SiteArt, StateView, SurfaceCard, WebsiteGlobe3D,
} from '../../ui';
import { WEBSITE_PATHS } from '../../config/website.config';
import { loadExploreContent, ExploreContent, ExploreSection } from '../../services/publicContent';
import { isUpcomingEvent } from '../../utils/eventLifecycle';
import { useEventClock } from '../../utils/useEventClock';
import { clearPublicAction } from '../../services/publicNavigation';
import { openWebsitePage } from '../../services/websiteNavigation';
import { ExploreQuickLinks } from '../../components/explore/ExploreDestinations';
import ExploreActiv from '../member/dashboard/ExploreActiv';
import { PublicContentCard, PublicZoneCard, publicRecordKey } from './PublicExploreCards';

const TABS: { key: ExploreSection; label: string; icon: string; title: string; subtitle: string }[] = [
  { key: 'home', label: 'Home', icon: 'home', title: 'Discover.\nConnect. Grow.', subtitle: 'Your community. Your next opportunity.' },
  { key: 'events', label: 'Events', icon: 'event', title: 'Meet. Learn.\nBe inspired.', subtitle: 'Discover upcoming events and programmes.' },
  { key: 'gallery', label: 'Gallery', icon: 'collections', title: 'Moments\nthat matter.', subtitle: 'A closer look at our community in action.' },
  { key: 'news', label: 'News', icon: 'newspaper', title: 'Our stories.\nOur progress.', subtitle: 'The latest from the ACTIV community.' },
  { key: 'zones', label: 'Zones', icon: 'public', title: 'Connected\nacross India.', subtitle: 'Find your region and explore local updates.' },
];
const EMPTY: ExploreContent = { events: [], news: [], gallery: [], zones: [] };

function HeroArt({ section, size }: { section: ExploreSection; size: number }) {
  const art = section === 'home' ? <WebsiteGlobe3D size={size} />
    : section === 'events' ? <EventTicket3D size={size} />
      : section === 'news' ? <Megaphone3D size={size} />
        : section === 'zones' ? <LocationMap3D size={size} /> : <SiteArt kind="gallery" size={size} />;
  return <FloatingIllustration size={size} amplitude={5}>{art}</FloatingIllustration>;
}

export default function PublicExploreScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const [section, setSection] = useState<ExploreSection>(() => TABS.find(tab => tab.key === route?.params?.section)?.key || 'home');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ExploreContent>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [contactRefresh, setContactRefresh] = useState(0);
  const now = useEventClock();
  const abort = useRef<AbortController | null>(null);
  const list = useRef<FlatList<any>>(null);
  useEffect(() => {
    const requested = TABS.find(tab => tab.key === route?.params?.section)?.key;
    if (!requested) return;
    setSection(requested);
    setQuery('');
    list.current?.scrollToOffset({ offset: 0, animated: false });
    navigation.setParams?.({ section: undefined });
  }, [navigation, route?.params?.section]);
  const read = useCallback(async (refresh = false) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError('');
    setRefreshing(refresh);
    if (!refresh) setLoading(true);
    try {
      const result = await loadExploreContent(section, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch {
      if (!controller.signal.aborted) setError('Check your connection and try again.');
    } finally {
      if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [section]);
  useEffect(() => { read(); return () => abort.current?.abort(); }, [read]);

  const switchTab = (tab: ExploreSection) => {
    Keyboard.dismiss();
    setQuery('');
    if (tab !== section) { setLoading(true); setError(''); setSection(tab); }
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const openPage = (path: string, title: string) => {
    const eventPath = /^\/events\/([^/?#]+)\/?$/.exec(path);
    if (eventPath) navigation.navigate('PublicEventDetail', { id: decodeURIComponent(eventPath[1]) });
    else if (path === WEBSITE_PATHS.events) switchTab('events');
    else openWebsitePage(navigation, path, title);
  };
  const signIn = () => { clearPublicAction(); navigation.navigate('Login'); };
  const join = () => { clearPublicAction(); navigation.navigate('RegistrationStep1'); };
  const records = useMemo(() => {
    let items = section === 'home' ? [] : data[section];
    if (section === 'events') items = items.filter(e => isUpcomingEvent(e, now))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const needle = query.trim().toLocaleLowerCase();
    return needle ? items.filter(item => [item.title, item.caption, item.label, item.name, item.category, item.summary,
      item.location, item.venue, item.state, ...(item.states || []).map((state: any) => state.name)]
      .join(' ').toLocaleLowerCase().includes(needle)) : items;
  }, [section, data, query, now]);
  const tab = TABS.find(item => item.key === section)!;
  const compact = width < 360;
  const artSize = compact || fontScale > 1.2 ? 80 : 108;
  const ready = !loading && !error;
  const home = <View style={s.homeContent}>
    {loading && <View style={s.gutter}><CardSkeletons rows={2} variant="media" /></View>}
    {!!error && <View style={s.gutter}><StateView kind="error" title="Unable to load content" message={error} onAction={() => read()} compact /></View>}
    {ready && <>
      <ExploreActiv navigation={navigation} sections={['events']} content={data} publicAccess showEmpty />
      <ExploreActiv navigation={navigation} sections={['gallery']} content={data} publicAccess showEmpty />
      <ExploreActiv navigation={navigation} sections={['news']} content={data} publicAccess showEmpty />
    </>}
    <ExploreActiv navigation={navigation} sections={['schemes', 'zones']} content={data} publicAccess refreshKey={contactRefresh} />
    <View style={s.gutter}>
    <ExploreQuickLinks openPage={openPage} />
    <SurfaceCard padded={false} style={s.joinCard}>
        <LinearGradient colors={[BRAND.navyDeep, BRAND.blue900]} style={s.joinInner}>
          <View style={s.joinOrb} />
          <View style={s.joinHeading}>
            <View style={s.flex}><Text style={s.joinEyebrow}>GROW WITH ACTIV</Text>
              <Text style={s.joinTitle}>{'Your community.\nYour next chapter.'}</Text></View>
            <View style={s.joinArt}><SiteArt kind="membership" size={58} /></View>
          </View>
          <Text style={s.joinCopy}>Build connections, discover opportunities and grow together.</Text>
          <GradientButton label="Become a member" iconRight="arrow-forward" variant="glass" onPress={join} style={s.joinButton} />
          <PressableScale onPress={() => openPage(WEBSITE_PATHS.membership, 'Membership')} accessibilityRole="link" accessibilityLabel="Discover membership benefits" contentStyle={s.joinBenefits}>
            <Text style={s.joinBenefitsText}>Discover membership benefits</Text><Icon name="arrow-forward" size={14} color={BRAND.onBrandSoft} />
          </PressableScale>
        </LinearGradient>
    </SurfaceCard>
    </View>
    <ExploreActiv navigation={navigation} sections={['contact']} publicAccess refreshKey={contactRefresh} />
  </View>;

  const tabs = <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
    <LinearGradient colors={[BRAND.navy, BRAND.blue900, '#234DB3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabRow}>{TABS.map(item => {
      const selected = section === item.key;
      return <PressableScale key={item.key} onPress={() => switchTab(item.key)} accessibilityRole="tab" accessibilityLabel={item.label}
        accessibilityState={{ selected }} style={s.tab} contentStyle={[s.tabContent, selected && s.tabContentSelected]}>
        <View style={[s.tabIconShadow, selected && s.tabSelectedShadow]}>
          <LinearGradient colors={selected ? ['#4B90FF', BRAND.blue] : ['#FFFFFF20', '#FFFFFF08']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabIcon}>
            <View style={s.tabSheen} /><SiteArt kind={item.key} size={27} />
          </LinearGradient>
        </View>
        <Text style={[s.tabText, selected && s.tabTextSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} maxFontSizeMultiplier={1.2}>{item.label}</Text>
      </PressableScale>;
    })}</LinearGradient>
  </View>;

  return <BrandFrame footer={tabs}>
    <FlatList ref={list} data={[]} renderItem={() => null}
      contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setContactRefresh(value => value + 1); read(true); }} colors={[BRAND.blue]} tintColor={PALETTE.white} progressViewOffset={insets.top} />}
      ListHeaderComponent={<>
        <BrandHeaderBlock waveHeight={54}>
          <View style={s.heroContent}>
            <View style={s.topbar}><BrandLogo size="sm" />
              <PressableScale accessibilityRole="button" accessibilityLabel="Sign in" onPress={signIn} contentStyle={s.signIn}>
                <Icon name="login" size={17} color={PALETTE.white} /><Text style={s.signInText}>Sign in</Text>
              </PressableScale>
            </View>
            <View style={s.heroRow}>
              <View style={s.heroText}><Text style={s.eyebrow}>{section === 'home' ? 'WELCOME TO ACTIV' : 'EXPLORE / ' + tab.label.toUpperCase()}</Text>
                <Text style={[s.heroTitle, compact && s.heroTitleCompact]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>{tab.title}</Text>
              </View>
              <HeroArt section={section} size={artSize} />
            </View>
            <Text style={s.heroSubtitle}>{tab.subtitle}</Text>
          </View>
        </BrandHeaderBlock>
        {section === 'home' ? home : <View style={[s.gutter, s.searchWrap]}>
          <SurfaceCard padded={false} contentStyle={s.searchInner}>
            <View style={s.searchIcon}><Icon name="search" size={23} color={BRAND.blue} /></View>
            <TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder={'Search ' + tab.label.toLowerCase()}
              placeholderTextColor={PALETTE.textMuted} accessibilityLabel={'Search ' + tab.label.toLowerCase()} returnKeyType="search" autoCorrect={false} />
            {!!query && <PressableScale onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" contentStyle={s.clearSearch}>
              <Icon name="close" size={20} color={PALETTE.textMuted} />
            </PressableScale>}
          </SurfaceCard>
          {ready && <View style={s.resultHeading}><Text style={s.resultTitle}>{section === 'events' ? 'Upcoming events' : section === 'zones' ? 'Explore regions' : 'Discover ' + tab.label.toLowerCase()}</Text>
            <View style={s.count}><Text style={s.countText} accessibilityLabel={records.length + ' results'}>{records.length}</Text></View>
          </View>}
        </View>}
        {section !== 'home' && loading && <View style={s.gutter}><CardSkeletons rows={2} variant="media" /></View>}
        {section !== 'home' && !!error && <View style={s.gutter}><StateView kind="error" title="Unable to load content" message={error} onAction={() => read()} compact /></View>}
        {section !== 'home' && ready && records.length > 0 && <FlatList key={section} horizontal data={records}
          keyExtractor={(item, index) => publicRecordKey(item) || String(index)} showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.contentRow} snapToInterval={Math.min(340, width - 64) + SPACE.md} decelerationRate="fast"
          initialNumToRender={4} windowSize={5} keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <View style={{ width: Math.min(340, width - 64) }}>{section === 'zones'
            ? <PublicZoneCard item={item} openPage={openPage} />
            : <PublicContentCard item={item} kind={section as 'events' | 'news' | 'gallery'} openPage={openPage} />}</View>} />}
      </>}
      ListEmptyComponent={ready && section !== 'home' && !records.length ? <View style={s.gutter}><StateView compact title={query.trim() ? 'No matching results' : section === 'events' ? 'More events on the way' : 'More to discover soon'}
        message={query.trim() ? 'Try another name or clear your search.' : section === 'events' ? 'Upcoming programmes will appear here when announced.' : 'Check back for updates from the ACTIV community.'}
        action={query.trim() ? 'Clear search' : undefined} onAction={query.trim() ? () => setQuery('') : undefined} /></View> : null}
      ListFooterComponent={<View style={[s.gutter, s.footer]}>
        <View style={s.legal}>{[
          ['Privacy policy', '/privacy-policy', 'shield'], ['Terms of use', '/terms-and-conditions', 'description'], ['Delete account', WEBSITE_PATHS.deleteAccount, 'manage-accounts'],
        ].map(([label, path, icon]) => <PressableScale key={path} accessibilityRole="link" accessibilityLabel={label} onPress={() => openPage(path, label)} style={s.legalItem} contentStyle={s.legalLink}>
          <Icon name={icon} size={19} color="#9AC7FF" /><Text style={s.legalText} maxFontSizeMultiplier={1.2}>{label}</Text>
        </PressableScale>)}</View>
        <Text style={s.footerText}>ACTIV · Connect. Empower. Grow.</Text>
      </View>}
    />
  </BrandFrame>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, body: { flexGrow: 1, backgroundColor: PALETTE.canvas, paddingBottom: SPACE.sm },
  contentRow: { paddingHorizontal: SPACE.lg, gap: SPACE.md, paddingBottom: SPACE.md, alignItems: 'flex-start' },
  gutter: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: SPACE.lg },
  heroContent: { width: '100%', maxWidth: 680, alignSelf: 'center' }, topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  signIn: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 15, borderRadius: 16, backgroundColor: BRAND.glass, borderWidth: 1, borderColor: BRAND.glassBorder },
  signInText: { color: PALETTE.white, fontSize: 13, fontWeight: '700' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.lg }, heroText: { flex: 1, minWidth: 0 },
  eyebrow: { color: BRAND.onBrandSoft, fontSize: 10, lineHeight: 16, letterSpacing: 1.6, fontWeight: '800', marginBottom: 9 },
  heroTitle: { color: PALETTE.white, fontSize: 28, lineHeight: 35, letterSpacing: -0.7, fontWeight: '800' }, heroTitleCompact: { fontSize: 25, lineHeight: 32 },
  heroSubtitle: { color: BRAND.onBrandSoft, fontSize: 14, lineHeight: 21, marginTop: SPACE.md, paddingBottom: SPACE.sm },
  homeContent: { marginTop: -8 },
  joinCard: { marginBottom: SPACE.md }, joinInner: { padding: SPACE.lg, overflow: 'hidden' }, joinTitle: { color: PALETTE.white, fontSize: 21, lineHeight: 29, fontWeight: '800' },
  joinOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -75, top: -70, backgroundColor: '#60A5FA22' },
  joinHeading: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  joinEyebrow: { color: '#A5C8FF', fontSize: 10, lineHeight: 17, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  joinArt: { width: 68, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: BRAND.glass, borderWidth: 1, borderColor: BRAND.glassBorder },
  joinBenefits: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 },
  joinBenefitsText: { color: BRAND.onBrandSoft, fontSize: 12, fontWeight: '600' },
  joinCopy: { color: BRAND.onBrandSoft, fontSize: 14, lineHeight: 22, marginTop: SPACE.sm }, joinButton: { marginTop: SPACE.lg },
  searchWrap: { marginTop: -22, marginBottom: SPACE.sm }, searchInner: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  searchIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: PALETTE.blueSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 56, paddingVertical: 12, paddingHorizontal: 0, color: PALETTE.text, fontSize: 15, fontWeight: '500' }, clearSearch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: SPACE.lg, marginBottom: SPACE.sm }, resultTitle: { flexShrink: 1, color: BRAND.navyDeep, fontSize: 17, fontWeight: '800', lineHeight: 24 },
  count: { backgroundColor: PALETTE.blueSoft, borderRadius: 9, minWidth: 26, paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center' }, countText: { fontSize: 12, fontWeight: '700', color: BRAND.blue900 },
  footer: { paddingTop: SPACE.sm, paddingBottom: SPACE.md }, legal: { flexDirection: 'row', gap: 7, backgroundColor: BRAND.navy, padding: 9, borderRadius: 20 },
  legalItem: { flex: 1, minWidth: 0 }, legalLink: { minHeight: 70, paddingHorizontal: 3, paddingVertical: 10, gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#FFFFFF0D' },
  legalText: { color: '#E5EEFF', fontSize: 10.5, lineHeight: 15, textAlign: 'center', fontWeight: '600' }, footerText: { color: PALETTE.textMuted, fontSize: 10, textAlign: 'center', marginTop: 10 },
  tabs: { backgroundColor: PALETTE.canvas, paddingTop: 5, paddingHorizontal: 10 },
  tabRow: { flexDirection: 'row', width: '100%', maxWidth: 720, alignSelf: 'center', gap: 3, padding: 6,
    borderRadius: 26, borderWidth: 1, borderColor: '#537CCB',
    shadowColor: BRAND.shadowNavy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  tab: { flex: 1, minWidth: 0 }, tabContent: { minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  tabContentSelected: { backgroundColor: '#FFFFFF1C', borderColor: '#FFFFFF33' },
  tabIconShadow: { borderRadius: 12 }, tabSelectedShadow: { shadowColor: '#071332', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  tabIcon: { width: 36, height: 36, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tabSheen: { position: 'absolute', top: -13, right: -6, width: 36, height: 29, borderRadius: 18, backgroundColor: '#FFFFFF26' },
  tabText: { fontSize: 10.5, lineHeight: 15, color: '#C7D8F7', fontWeight: '600' }, tabTextSelected: { color: PALETTE.white, fontWeight: '800' },
});
