import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BRAND, PALETTE, SPACE, PressableScale, SiteArt, SiteArtKind, SurfaceCard } from '../../ui';
import { WEBSITE_PATHS } from '../../config/website.config';
export { ExploreContact } from './ExploreContact';

type OpenPage = (path: string, title: string) => void;
const LINKS: { label: string; caption: string; art: SiteArtKind; path: string; colors: string[] }[] = [
  { label: 'About ACTIV', caption: 'About\nACTIV', art: 'about', path: WEBSITE_PATHS.about, colors: ['#1C2E68', '#3577DA'] },
  { label: 'Membership', caption: 'Membership', art: 'membership', path: WEBSITE_PATHS.membership, colors: ['#5933A5', '#9270E0'] },
  { label: 'Schemes', caption: 'Schemes', art: 'schemes', path: WEBSITE_PATHS.schemes, colors: ['#086552', '#21AE8B'] },
  { label: 'Contact us', caption: 'Contact\nus', art: 'contact', path: WEBSITE_PATHS.contact, colors: ['#075985', '#38A9D6'] },
];

export function ExploreQuickLinks({ openPage }: { openPage: OpenPage }) {
  return <View style={s.links}>
    {LINKS.map(link => <SurfaceCard key={link.path} padded={false} style={s.link} contentStyle={s.linkInner}
      accessibilityLabel={link.label} onPress={() => openPage(link.path, link.label)}>
      <LinearGradient colors={link.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.art}>
        <View style={s.sheen} /><SiteArt kind={link.art} size={34} />
      </LinearGradient>
      <View style={s.labelBox}><Text style={s.label} numberOfLines={link.caption.includes('\n') ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.85}
        maxFontSizeMultiplier={1.2}>{link.caption}</Text></View>
    </SurfaceCard>)}
  </View>;
}

export function ExploreSchemes({ openPage }: { openPage: OpenPage }) {
  return <View style={s.section}>
    <Text style={s.heading} accessibilityRole="header">Schemes</Text>
    <View style={s.schemeRow}>{[
      { title: 'Central schemes', path: '/schemes/central', detail: 'Across India', colors: ['#086552', '#21AE8B'] },
      { title: 'State schemes', path: '/schemes/states', detail: 'In your state', colors: ['#1C2E68', '#3577DA'] },
    ].map(item => <SurfaceCard key={item.path} padded={false} style={s.schemeCard} contentStyle={s.schemeInner}
      accessibilityLabel={'Explore ' + item.title.toLowerCase()} onPress={() => openPage(item.path, item.title)}>
      <LinearGradient colors={item.colors} style={s.bannerArt}><SiteArt kind="schemes" size={43} /></LinearGradient>
      <Text style={s.schemeTitle}>{item.title}</Text><Text style={s.bannerCopy}>{item.detail}</Text>
      <Icon name="arrow-forward" size={18} color={BRAND.blue} style={s.schemeArrow} />
    </SurfaceCard>)}</View>
  </View>;
}

export function ExploreZones({ zones, openPage, onSeeAll }: { zones: any[]; openPage: OpenPage; onSeeAll?: () => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(310, width - SPACE.lg * 2 - 24);
  return <View style={s.section}>
    <View style={s.sectionHeading}><Text style={s.heading} accessibilityRole="header">Zones</Text>
      {onSeeAll && <PressableScale onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all Zones" contentStyle={s.seeAll}><Text style={s.seeAllText}>See all</Text><Icon name="arrow-forward" size={16} color={BRAND.blue} /></PressableScale>}
    </View>
    {zones.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.zoneRow} snapToInterval={cardWidth + SPACE.md} decelerationRate="fast">
      {zones.map(zone => <SurfaceCard key={zone.slug} padded={false} style={{ width: cardWidth }}>
        <PressableScale onPress={() => openPage(WEBSITE_PATHS.region(zone.slug), zone.label)} accessibilityRole="button" accessibilityLabel={'Explore ' + zone.label}>
          <LinearGradient colors={[BRAND.navy, BRAND.blue900]} style={s.zoneHead}>
            <SiteArt kind="zones" size={46} /><View style={s.copy}><Text style={s.zoneEyebrow}>ACTIV REGION</Text><Text style={s.zoneTitle}>{zone.label}</Text></View><Icon name="arrow-forward" size={18} color={PALETTE.white} />
          </LinearGradient>
        </PressableScale>
        <View style={s.states}>{(zone.states || []).filter((state: any) => state.hasPage !== false && (!state.status || state.status === 'published')).slice(0, 3).map((state: any) =>
          <PressableScale key={state.slug} accessibilityRole="button" accessibilityLabel={'Explore ' + state.name} onPress={() => openPage(WEBSITE_PATHS.state(state.slug), state.name)} contentStyle={s.state}>
            <Text style={s.stateText} numberOfLines={1}>{state.name}</Text><Icon name="chevron-right" size={14} color={BRAND.blue} />
          </PressableScale>)}
          {!zone.states?.length && <Text style={s.bannerCopy}>Explore your local ACTIV community.</Text>}
        </View>
        <PressableScale onPress={() => openPage(WEBSITE_PATHS.region(zone.slug), zone.label)} accessibilityRole="button" accessibilityLabel={'View all states in ' + zone.label} contentStyle={s.allStates}>
          <Text style={s.seeAllText}>Explore the region</Text><Icon name="arrow-forward" size={16} color={BRAND.blue} />
        </PressableScale>
      </SurfaceCard>)}
    </ScrollView> : <SurfaceCard><Text style={s.bannerCopy}>ACTIV regions and states will appear here as they are published.</Text></SurfaceCard>}
  </View>;
}

const s = StyleSheet.create({
  links: { flexDirection: 'row', gap: 8, marginTop: SPACE.lg, marginBottom: SPACE.lg, alignItems: 'stretch' },
  link: { flex: 1, minWidth: 0, borderRadius: 18 },
  linkInner: { alignItems: 'center', paddingHorizontal: 3, paddingVertical: 12, borderRadius: 18 },
  art: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheen: { position: 'absolute', width: 42, height: 42, borderRadius: 21, top: -25, right: -8, backgroundColor: '#FFFFFF30' },
  labelBox: { minHeight: 34, marginTop: 9, width: '100%', justifyContent: 'center' },
  label: { color: BRAND.navyDeep, fontSize: 11.5, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  section: { marginTop: SPACE.lg, marginBottom: SPACE.sm },
  heading: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, marginBottom: SPACE.md },
  schemeRow: { flexDirection: 'row', gap: SPACE.md }, schemeCard: { flex: 1, minWidth: 0 }, schemeInner: { padding: SPACE.md },
  schemeTitle: { color: BRAND.navyDeep, fontSize: 15, lineHeight: 22, fontWeight: '800', marginTop: SPACE.sm }, schemeArrow: { alignSelf: 'flex-end', marginTop: SPACE.sm },
  bannerArt: { width: 58, height: 62, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  bannerCopy: { color: PALETTE.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm }, seeAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACE.md }, seeAllText: { color: BRAND.blue, fontSize: 12, fontWeight: '700' },
  zoneRow: { gap: SPACE.md, paddingBottom: SPACE.md, alignItems: 'flex-start' }, zoneHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, padding: SPACE.md },
  zoneEyebrow: { color: BRAND.onBrandSoft, fontSize: 9, lineHeight: 15, letterSpacing: 1.2, fontWeight: '700' }, zoneTitle: { color: PALETTE.white, fontSize: 17, lineHeight: 24, fontWeight: '800', marginTop: 3 },
  states: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: SPACE.md, minHeight: 124, alignContent: 'flex-start' }, state: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44, borderRadius: 10, paddingHorizontal: 9, backgroundColor: PALETTE.blueSoft, maxWidth: '100%' }, stateText: { flexShrink: 1, fontSize: 11, lineHeight: 18, fontWeight: '600', color: BRAND.navy },
  allStates: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, borderTopWidth: 1, borderTopColor: PALETTE.divider },
});
