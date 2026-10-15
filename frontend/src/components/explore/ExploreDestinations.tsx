import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BRAND, PALETTE, SPACE, PressableScale, SurfaceCard } from '../../ui';
import { WEBSITE_PATHS } from '../../config/website.config';
export { ExploreContact } from './ExploreContact';

type OpenPage = (path: string, title: string) => void;
const LINKS = [
  { label: 'About ACTIV', icon: 'info-outline', path: WEBSITE_PATHS.about },
  { label: 'Membership', icon: 'card-membership', path: WEBSITE_PATHS.membership },
  { label: 'Schemes', icon: 'account-balance', path: WEBSITE_PATHS.schemes },
  { label: 'Contact us', icon: 'call', path: WEBSITE_PATHS.contact },
];

export function ExploreQuickLinks({ openPage }: { openPage: OpenPage }) {
  return <View style={s.links}>
    {LINKS.map(link => <PressableScale key={link.path} style={s.link} contentStyle={s.linkInner}
      accessibilityRole="button" accessibilityLabel={link.label} onPress={() => openPage(link.path, link.label)}>
      <View style={s.art}><Icon name={link.icon} size={22} color={BRAND.blue} /></View>
      <Text style={s.label}>{link.label}</Text>
    </PressableScale>)}
  </View>;
}

export function ExploreSchemes({ openPage }: { openPage: OpenPage }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  return <View style={s.section}>
    <Text style={s.heading} accessibilityRole="header">Schemes</Text>
    <View style={[s.schemeRow, stacked && s.stacked]}>{[
      { title: 'Central schemes', path: '/schemes/central', detail: 'Across India', colors: ['#086552', '#21AE8B'] },
      { title: 'State schemes', path: '/schemes/state', detail: 'In your state', colors: ['#1C2E68', '#3577DA'] },
    ].map(item => <SurfaceCard key={item.path} padded={false} style={s.schemeCard} contentStyle={s.schemeInner}
      accessibilityLabel={'Explore ' + item.title.toLowerCase()} onPress={() => openPage(item.path, item.title)}>
      <LinearGradient colors={item.colors} style={s.bannerArt}><Icon name="account-balance" size={26} color={PALETTE.white} /></LinearGradient>
      <Text style={s.schemeTitle}>{item.title}</Text><Text style={s.bannerCopy}>{item.detail}</Text>
      <Icon name="arrow-forward" size={18} color={BRAND.blue} style={s.schemeArrow} />
    </SurfaceCard>)}</View>
  </View>;
}

const publishedStates = (zone: any): any[] => (Array.isArray(zone.states) ? zone.states : [])
  .filter((state: any) => state.hasPage !== false && (!state.status || state.status === 'published'));

export function ExploreZones({ zones, openPage, onSeeAll }: { zones: any[]; openPage: OpenPage; onSeeAll?: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  const national = zones.find(zone => zone.national || /national/i.test(String(zone.slug || zone.label || '')));
  const regions = zones.filter(zone => zone !== national);
  return <View style={s.section}>
    <View style={s.sectionHeading}><Text style={s.heading} accessibilityRole="header">ACTIV near you</Text>
      {onSeeAll && <PressableScale onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all Zones" contentStyle={s.seeAll}><Text style={s.seeAllText}>All zones</Text><Icon name="arrow-forward" size={16} color={BRAND.blue} /></PressableScale>}
    </View>
    <Text style={s.sectionCopy}>Explore our regions and state communities.</Text>
    {national && <PressableScale onPress={() => openPage(WEBSITE_PATHS.region(national.slug), national.label)}
      accessibilityRole="button" accessibilityLabel={'Explore ' + national.label} style={s.national}>
      <LinearGradient colors={[BRAND.navy, '#264C96']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.nationalInner}>
        <View style={s.nationalIcon}><Icon name="public" size={28} color={PALETTE.white} /></View>
        <View style={s.copy}><Text style={s.nationalTitle}>{national.label}</Text><Text style={s.nationalCopy}>The ACTIV community across India</Text></View>
        <Icon name="arrow-forward" size={21} color={PALETTE.white} />
      </LinearGradient>
    </PressableScale>}
    <View style={s.regionGrid}>{regions.map((zone, index) => {
      const states = publishedStates(zone);
      const preview = states.slice(0, 2).map(state => state.name).join(' · ');
      return <PressableScale key={zone.slug} style={[s.regionCard, stacked && s.fullWidth]} contentStyle={s.regionInner}
        accessibilityRole="button" accessibilityLabel={'Explore ' + zone.label}
        onPress={() => openPage(WEBSITE_PATHS.region(zone.slug), zone.label)}>
        <View style={s.regionTop}><View style={[s.regionIcon, { backgroundColor: index % 2 ? '#EAF5F1' : '#EDF2FF' }]}>
          <Icon name="explore" size={23} color={index % 2 ? '#187464' : BRAND.blue} /></View>
          <Icon name="north-east" size={18} color={PALETTE.textMuted} /></View>
        <Text style={s.regionTitle}>{zone.label}</Text>
        <Text style={s.regionCopy} numberOfLines={2}>{preview || 'Regional news, events and leadership'}</Text>
        {states.length > 0 && <Text style={s.regionCount}>{states.length} {states.length === 1 ? 'state' : 'states'}</Text>}
      </PressableScale>;
    })}</View>
    {!zones.length && <SurfaceCard><Text style={s.bannerCopy}>Regional pages will appear here as they are published.</Text></SurfaceCard>}
  </View>;
}

const s = StyleSheet.create({
  links: { flexDirection: 'row', gap: 8, marginVertical: SPACE.lg },
  link: { flex: 1, minWidth: 0 }, linkInner: { alignItems: 'center', gap: 8 },
  art: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EBF1FF', alignItems: 'center', justifyContent: 'center' },
  label: { color: BRAND.navyDeep, fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  section: { marginTop: SPACE.lg, marginBottom: SPACE.sm },
  heading: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 28, fontWeight: '700', marginBottom: SPACE.sm, flexShrink: 1 },
  sectionCopy: { color: PALETTE.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  schemeRow: { flexDirection: 'row', gap: SPACE.md }, schemeCard: { flex: 1, minWidth: 0 }, schemeInner: { padding: SPACE.md },
  stacked: { flexDirection: 'column' }, fullWidth: { width: '100%', flexBasis: '100%' },
  schemeTitle: { color: BRAND.navyDeep, fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: SPACE.sm }, schemeArrow: { alignSelf: 'flex-end', marginTop: SPACE.sm },
  bannerArt: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, bannerCopy: { color: PALETTE.textMuted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  seeAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }, seeAllText: { color: BRAND.blue, fontSize: 14, fontWeight: '600' },
  national: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  nationalInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  nationalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF15', alignItems: 'center', justifyContent: 'center' },
  nationalTitle: { color: PALETTE.white, fontSize: 19, lineHeight: 26, fontWeight: '700' },
  nationalCopy: { color: '#DCE7FF', fontSize: 13, lineHeight: 19, marginTop: 3 },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  regionCard: { width: '47.8%', flexGrow: 1, flexBasis: '45%', maxWidth: '100%' },
  regionInner: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: '#DDE5F1' },
  regionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  regionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  regionTitle: { color: BRAND.navyDeep, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  regionCopy: { color: PALETTE.textMuted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  regionCount: { color: BRAND.blue, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 10 },
});
