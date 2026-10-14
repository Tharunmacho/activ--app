import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PALETTE, BRAND, PressableScale, SurfaceCard, StateView } from '../../ui';
import { usePublicResource } from '../../services/usePublicResource';
import { loadNativePublicPage, PublicPageData } from '../../services/nativePublicContent';
import { openWebsitePage } from '../../services/websiteNavigation';
import { PublicContentCard, PublicZoneCard } from './PublicExploreCards';
import { ContentLayout, Body, Photo, ContentMedia, ActionLink, ExtraFields, Heading, contentStyles as s, contentText } from './PublicContentKit';
import PublicRegionContent from './PublicRegionContent';

export default function PublicContentScreen({ navigation, route }: any) {
  const path = String(route?.params?.path || '');
  const [query, setQuery] = useState(''), [offset, setOffset] = useState(0), [category, setCategory] = useState(''), [district, setDistrict] = useState('');
  useEffect(() => { setQuery(''); setOffset(0); setCategory(''); setDistrict(''); }, [path]);
  const resource = usePublicResource(navigation, path + ':' + offset, signal => loadNativePublicPage(path, signal, offset));
  const page = resource.data;
  const open = (href: string, title: string) => openWebsitePage(navigation, href, title);
  const categories = Array.from(new Set<string>((page?.items || []).map(item => item.category).filter(Boolean))).sort();
  const districts = Array.from(new Set<string>((page?.items || []).map(item => item.district).filter(Boolean))).sort();
  const records = (page?.items || []).filter(item => (!category || item.category === category) && (!district || item.district === district) && (!query.trim() || [item.title, item.caption, item.summary, item.category, item.sector, item.state, item.district, item.label, item.name, ...(item.states || []).map((state: any) => state.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
  const list = page && ['news', 'gallery', 'zones', 'schemeStates', 'schemes'].includes(page.kind);
  return <ContentLayout navigation={navigation} title={page?.title || route?.params?.title || 'ACTIV'} art={page?.kind === 'gallery' || page?.kind === 'album' ? 'gallery' : page?.kind?.startsWith('scheme') ? 'schemes' : page?.kind === 'region' || page?.kind === 'zones' ? 'zones' : 'news'} resource={resource}>
    {list && <>
      {page.kind.startsWith('scheme') && <View style={x.row}><ActionLink navigation={navigation} href="/schemes/central" label="Central schemes" /><ActionLink navigation={navigation} href="/schemes/state" label="State schemes" /></View>}
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search content" placeholder="Search by title, place or category" placeholderTextColor={PALETTE.textMuted} style={s.input} />
      {categories.length > 1 && <SurfaceCard padded={false}><Picker accessibilityLabel="Filter by category" selectedValue={category} onValueChange={value => setCategory(String(value))}><Picker.Item label="All categories" value="" />{categories.map(value => <Picker.Item key={value} label={value} value={value} />)}</Picker></SurfaceCard>}
      {districts.length > 0 && <SurfaceCard padded={false}><Picker accessibilityLabel="Filter by district" selectedValue={district} onValueChange={value => setDistrict(String(value))}><Picker.Item label="All districts" value="" />{districts.map(value => <Picker.Item key={value} label={value} value={value} />)}</Picker></SurfaceCard>}
      <Text style={s.meta}>{records.length} {records.length === 1 ? 'result' : 'results'}</Text>
      {records.length === 0 && <StateView compact title={query ? 'No matching results' : 'More to discover soon'} message={query ? 'Try another search.' : 'Published updates will appear here.'} />}
      {records.map((item, index) => page.kind === 'zones' ? <PublicZoneCard key={item.slug || index} item={item} openPage={open} /> : page.kind === 'schemeStates' ?
        <ActionLink key={item.state} navigation={navigation} href={'/schemes/state/' + String(item.state).trim().toLowerCase().replace(/\s+/g, '-')} label={`${item.state} · ${item.total} schemes`} /> : page.kind === 'schemes' ?
          <SurfaceCard key={item.id || item.slug || index} onPress={() => open('/schemes/view/' + encodeURIComponent(item.slug || item.id), item.title)} accessibilityLabel={'View scheme: ' + item.title}>
            {!!item.image?.url && <Photo url={item.image.url} alt={item.title} />}
            <Text style={s.meta}>{[item.tier === 'national' ? 'Central' : item.state, item.district, item.category].filter(Boolean).join(' · ')}</Text><Heading>{item.title}</Heading><Body value={item.summary} /><Text style={x.more}>View benefits & eligibility →</Text>
          </SurfaceCard> : <PublicContentCard key={item.id || item._id || item.slug || index} item={item} kind={page.kind as 'news' | 'gallery'} openPage={open} />)}
    </>}
    {page?.kind === 'album' && <Album page={page} navigation={navigation} />}
    {page?.kind === 'article' && <Article item={page.item} navigation={navigation} />}
    {page?.kind === 'scheme' && <Scheme item={page.item} navigation={navigation} />}
    {page?.kind === 'region' && <PublicRegionContent page={page} path={path} navigation={navigation} offset={offset} onOffset={setOffset} />}
  </ContentLayout>;
}

function Album({ page, navigation }: { page: PublicPageData; navigation: any }) {
  const item = page.item;
  const photos = [{ ...item.media, caption: item.caption, description: item.description }, ...(item.photos || [])].filter(photo => photo?.url);
  const selected = page.photo === undefined ? null : photos[page.photo];
  const metadata = selected || item;
  const albumUrl = '/gallery/' + (item.slug || item._id || item.id);
  return <>
    <ActionLink navigation={navigation} href="/gallery" label="All albums" />
    <Text style={s.meta}>{[metadata.category || item.category, metadata.location || item.location, metadata.eventDate || item.eventDate ? new Date(metadata.eventDate || item.eventDate).toLocaleDateString('en-IN') : ''].filter(Boolean).join(' · ')}</Text>
    {page.photo !== undefined ? selected ? <>
      <Heading>{selected.title || selected.caption || item.title}</Heading><ContentMedia media={selected} title={selected.title || item.title} />
      {!!selected.caption && <Body value={selected.caption} navigation={navigation} />}<Body value={selected.description} navigation={navigation} /><ExtraFields fields={selected.customFields || []} navigation={navigation} />
      <Text style={s.meta}>Photo {(page.photo || 0) + 1} of {photos.length}</Text>
      <View style={x.row}>{(page.photo || 0) > 0 && <ActionLink navigation={navigation} href={albumUrl + '/photo/' + (page.photo! - 1)} label="Previous photo" />}{page.photo! + 1 < photos.length && <ActionLink navigation={navigation} href={albumUrl + '/photo/' + (page.photo! + 1)} label="Next photo" />}</View>
      <ActionLink navigation={navigation} href={albumUrl} label="View complete album" />
    </> : <StateView compact title="Photo unavailable" message="This photo may have been removed from the album." /> : <>
      <ContentMedia media={item.media} title={item.title} /><Body value={item.description || item.caption} navigation={navigation} />
      {!!item.media?.url && <ActionLink navigation={navigation} href={albumUrl + '/photo/0'} label="Open cover photo" />}
      {!!item.highlights?.length && <SurfaceCard><Heading>Highlights</Heading>{item.highlights.map((value: string, i: number) => <Body key={i} value={'• ' + value} navigation={navigation} />)}</SurfaceCard>}
      <ExtraFields fields={item.customFields || []} navigation={navigation} />
      {!!item.photos?.length && <Heading>In this album · {item.photos.length} photos</Heading>}
      {(item.photos || []).filter((photo: any) => photo.url).map((photo: any, index: number) => <View key={photo.url + index}>{!!photo.title && <Heading>{photo.title}</Heading>}<Text style={s.meta}>{[photo.category, photo.location, photo.eventDate ? new Date(photo.eventDate).toLocaleDateString('en-IN') : ''].filter(Boolean).join(' · ')}</Text><ContentMedia media={photo} title={photo.alt || photo.title || item.title} /><Body value={photo.caption} navigation={navigation} /><Body value={photo.description} navigation={navigation} /><ExtraFields fields={photo.customFields || []} navigation={navigation} /><ActionLink navigation={navigation} href={albumUrl + '/photo/' + (index + (item.media?.url ? 1 : 0))} label={'Open photo ' + (index + 1)} /></View>)}
    </>}
  </>;
}
function Article({ item, navigation }: { item: any; navigation: any }) {
  return <>
    <Text style={s.meta}>{[item.category, item.location, item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN') : ''].filter(Boolean).join(' · ')}</Text>
    <Photo url={item.image?.url || item.imageUrl} alt={item.image?.alt || item.title} />
    {!!item.summary && <SurfaceCard><Body value={item.summary} navigation={navigation} /></SurfaceCard>}
    <Body value={item.body} navigation={navigation} />
    {(item.photos || []).map((photo: any, index: number) => <Photo key={photo.url + index} url={photo.url} alt={photo.alt || item.title} caption={photo.caption} />)}
    <ExtraFields fields={item.extraFields} navigation={navigation} /><ActionLink navigation={navigation} href={item.externalUrl} label="Read original source" />
    <ActionLink navigation={navigation} href="/news" label="All news" />
  </>;
}
function Scheme({ item, navigation }: { item: any; navigation: any }) {
  return <>
    <Photo url={item.image?.url} alt={item.title} /><Body value={item.summary} navigation={navigation} />
    <SurfaceCard><Text style={s.meta}>{[item.tier === 'national' ? 'Central scheme' : item.state, item.district, item.category].filter(Boolean).join(' · ')}</Text>
      {item.authority && <Body value={'Run by: ' + item.authority} />}{item.deadline && <Body value={'Application status: ' + item.deadline} />}
      <ActionLink navigation={navigation} href={item.applyUrl} label="Apply on official portal" /><ActionLink navigation={navigation} href={item.documentUrl} label="Official notification / document" download />
      <ActionLink navigation={navigation} href={item.helpline ? 'tel:' + String(item.helpline).replace(/[^\d+]/g, '') : ''} label={'Helpline: ' + item.helpline} />
    </SurfaceCard>
    {[['About this scheme', item.body], ['Benefits', item.benefits], ['Who can apply', item.eligibility], ['How to apply', item.howToApply], ['Documents required', (item.documentsRequired || []).map((doc: string) => '• ' + doc).join('\n')]].filter(([_, value]) => contentText(value)).map(([label, value]) =>
      <SurfaceCard key={label}><Heading>{label}</Heading><Body value={value} navigation={navigation} /></SurfaceCard>)}
    <ExtraFields fields={item.extraFields} navigation={navigation} />
  </>;
}
const x = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, more: { color: BRAND.blue, fontSize: 14, fontWeight: '700', paddingTop: 8 } });
