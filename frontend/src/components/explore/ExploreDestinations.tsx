import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BRAND, PALETTE, SPACE, PremiumSelect, PressableScale, SurfaceCard } from '../../ui';
import { WEBSITE_PATHS } from '../../config/website.config';
import { exploreStateChoices, publishedExploreZones } from '../../utils/exploreRegions';
import { exploreToneForZone } from './exploreCardTones';
import { ExploreGradientCard, exploreCardWidth } from './ExploreGradientCard';
export { ExploreContact } from './ExploreContact';

type OpenPage = (path: string, title: string) => void;
const LINKS = [
  { label: 'About ACTIV', icon: 'info-outline', path: WEBSITE_PATHS.about },
  { label: 'Membership', icon: 'card-membership', path: WEBSITE_PATHS.membership },
  { label: 'Schemes', icon: 'account-balance', path: WEBSITE_PATHS.schemes },
  { label: 'Contact us', icon: 'call', path: WEBSITE_PATHS.contact },
];
const REGION_GRADIENTS: Record<string, string[]> = {
  national: ['#0B1A45', '#2563EB'],
  south: ['#0F766E', '#2DD4BF'],
  north: ['#075985', '#38BDF8'],
  east: ['#92400E', '#F59E0B'],
  west: ['#9F1239', '#FB7185'],
  'north-east': ['#5B21B6', '#A78BFA'],
};
const REGION_GRADIENT_ORDER = ['south', 'north', 'east', 'west', 'north-east'];
const regionGradient = (slug: string, index = 0) => {
  const key = slug.toLowerCase().replace(/[_\s]+/g, '-').replace(/^(?:region|zone)-|-region$|-zone$/g, '');
  return REGION_GRADIENTS[key === 'northeast' ? 'north-east' : key]
    || REGION_GRADIENTS[REGION_GRADIENT_ORDER[Math.abs(index) % REGION_GRADIENT_ORDER.length]];
};

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

export function ExploreZones({ zones, openPage, onSeeAll }: { zones: any[]; openPage: OpenPage; onSeeAll?: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = exploreCardWidth(width, fontScale);
  const published = useMemo(() => publishedExploreZones(zones), [zones]);
  const national = published.find(zone => zone.national && zone.hasPage);
  const regions = useMemo(() => published.filter(zone => !zone.national), [published]);
  const [zoneSlug, setZoneSlug] = useState('');
  const [stateSlug, setStateSlug] = useState('');
  const zone = regions.find(item => item.slug === zoneSlug);
  const states = useMemo(() => exploreStateChoices(regions, zone?.slug), [regions, zone?.slug]);
  const selectedState = states.find(item => item.slug === stateSlug);
  useEffect(() => {
    if (zoneSlug && !regions.some(item => item.slug === zoneSlug)) { setZoneSlug(''); setStateSlug(''); }
    else if (stateSlug && !states.some(item => item.slug === stateSlug)) setStateSlug('');
  }, [regions, states, zoneSlug, stateSlug]);
  const reset = () => { setZoneSlug(''); setStateSlug(''); };
  const shownRegions = selectedState ? regions.filter(item => item.slug === selectedState.zoneSlug)
    : zone ? [zone] : regions;
  const shownStates = selectedState ? [selectedState] : zone ? states : [];
  const filtered = !!(zone || selectedState);
  const toneFor = (slug: string) => exploreToneForZone(slug, regions.findIndex(item => item.slug === slug));
  const colorsFor = (slug: string) => regionGradient(slug, regions.findIndex(item => item.slug === slug));
  return <View style={s.section}>
    <View style={s.sectionHeading}><Text style={s.heading} accessibilityRole="header">ACTIV near you</Text>
      {onSeeAll && <PressableScale onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all Zones" contentStyle={s.seeAll}><Text style={s.seeAllText}>All zones</Text><Icon name="arrow-forward" size={16} color={BRAND.blue} /></PressableScale>}
    </View>
    <Text style={s.sectionCopy}>Explore our regions and state communities.</Text>
    {!!regions.length && <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.zoneFilters} keyboardShouldPersistTaps="handled">
        {[{ slug: '', label: 'All zones' }, ...regions].map(item => {
          const active = item.slug === (zone?.slug || '');
          const tone = toneFor(item.slug);
          return <PressableScale key={item.slug || 'all'} onPress={() => { setZoneSlug(item.slug); setStateSlug(''); }}
            accessibilityRole="button" accessibilityLabel={'Filter by ' + item.label} accessibilityState={{ selected: active }}
            contentStyle={[s.zoneFilter, { backgroundColor: active ? tone.accent : tone.background, borderColor: tone.border }]}>
            <Text style={[s.zoneFilterText, { color: active ? PALETTE.white : tone.title }]}>{item.label}</Text>
          </PressableScale>;
        })}
      </ScrollView>
      <PremiumSelect key={zone?.slug || 'all-zones'} label="Find your state" icon="place" strong
        value={selectedState?.name || ''} placeholder={states.length ? 'Choose a state' : 'State pages coming soon'}
        options={states.map(item => item.name)} disabled={!states.length}
        onChange={name => setStateSlug(states.find(item => item.name === name)?.slug || '')} />
      {filtered && <View style={s.filterSummary}>
        <Text style={s.filterSummaryText} accessibilityLiveRegion="polite">{selectedState?.name || zone?.label}</Text>
        <PressableScale onPress={reset} accessibilityRole="button" accessibilityLabel="Clear zone and state filters" contentStyle={s.resetFilters}>
          <Icon name="close" size={16} color={BRAND.blue} /><Text style={s.seeAllText}>Reset</Text>
        </PressableScale>
      </View>}
    </>}
    <ScrollView key={`${zone?.slug || 'all'}:${selectedState?.slug || ''}`} horizontal showsHorizontalScrollIndicator={false}
      style={s.regionScroll} contentContainerStyle={s.regionRow} keyboardShouldPersistTaps="handled"
      snapToInterval={cardWidth + 12} decelerationRate="fast">
      {!filtered && national && <ExploreGradientCard title={national.label} description="The ACTIV community across India"
        colors={REGION_GRADIENTS.national} icon="public" caption="Across India" width={cardWidth}
        accessibilityLabel={'Explore ' + national.label} onPress={() => openPage(WEBSITE_PATHS.region(national.slug), national.label)} />}
      {shownStates.map(state => <ExploreGradientCard key={'state-' + state.slug} title={state.name} description={state.zoneLabel}
        caption="Open state page" icon="place" colors={colorsFor(state.zoneSlug)} width={cardWidth}
        accessibilityLabel={'Explore ' + state.name}
        onPress={() => openPage(WEBSITE_PATHS.state(state.slug), state.name)} />)}
      {shownRegions.map(item => <ExploreGradientCard key={item.slug} title={item.label}
        description={item.states.slice(0, 2).map(state => state.name).join(' · ') || 'Regional news, events and leadership'}
        caption={item.hasPage ? (item.states.length ? `${item.states.length} ${item.states.length === 1 ? 'state' : 'states'} · Open zone` : 'Open zone page') : 'Browse published states'}
        art="zones" colors={colorsFor(item.slug)} width={cardWidth}
        accessibilityLabel={item.hasPage ? 'Explore ' + item.label : 'Browse states in ' + item.label}
        onPress={() => {
          if (item.hasPage) openPage(WEBSITE_PATHS.region(item.slug), item.label);
          else { setZoneSlug(item.slug); setStateSlug(''); }
        }} />)}
    </ScrollView>
    {!published.length && <SurfaceCard><Text style={s.bannerCopy}>Regional pages will appear here as they are published.</Text></SurfaceCard>}
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
  stacked: { flexDirection: 'column' },
  schemeTitle: { color: BRAND.navyDeep, fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: SPACE.sm }, schemeArrow: { alignSelf: 'flex-end', marginTop: SPACE.sm },
  bannerArt: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { color: PALETTE.textMuted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  seeAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }, seeAllText: { color: BRAND.blue, fontSize: 14, fontWeight: '600' },
  regionScroll: { marginHorizontal: -SPACE.lg },
  regionRow: { gap: 12, paddingHorizontal: SPACE.lg, paddingTop: 8, paddingBottom: 12, alignItems: 'stretch' },
  zoneFilters: { gap: 8, paddingBottom: 12 },
  zoneFilter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  zoneFilterText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  filterSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  filterSummaryText: { flex: 1, color: BRAND.navyDeep, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  resetFilters: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
