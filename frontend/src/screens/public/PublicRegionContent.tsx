import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ContentImage } from '../../ui/ContentImage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BRAND, PALETTE, GradientButton, GlassIconButton, PremiumPage, PremiumPageHeader, PremiumSelect, PressableScale, StateView, SurfaceCard } from '../../ui';
import { resolveMediaUrl } from '../../config/api.config';
import { openWebsitePage } from '../../services/websiteNavigation';
import { readPublicCms, submitPublicCms } from '../../services/publicContent';
import { PublicPageData, REGION_SECTIONS } from '../../services/nativePublicContent';
import { ActionLink, Body, ContentMedia, ExtraFields, Heading, Photo, contentStyles as s } from './PublicContentKit';
import { NewsMediaItem, NewsResourceLinks } from './PublicNewsArticleScreen';
import { newsMedia } from '../../utils/newsContent';

const visible = (items: any) => (Array.isArray(items) ? items : []).filter(item => item && !item.isHidden && item.visible !== false);
const hasContact = (contact: any) => !!(contact && (contact.email || contact.phone || contact.address || contact.addressLines?.length));
const sectionIcon: Record<string, string> = { about: 'info-outline', gallery: 'photo-library', leaders: 'people-outline', events: 'event', achievements: 'emoji-events', keyAchievements: 'emoji-events', projects: 'work-outline', publications: 'menu-book', newsUpdates: 'article' };
export default function PublicRegionContent({ page, path, navigation, offset, onOffset }: {
  page: PublicPageData; path: string; navigation: any; offset: number; onOffset: (offset: number) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width < 360 || fontScale >= 1.4;
  const record = useMemo(() => page.page || {}, [page.page]);
  const [filter, setFilter] = useState('');
  useEffect(() => { setFilter(''); setProfile(null); }, [path]);
  const [profile, setProfile] = useState<{ person: any; context: any } | null>(null);
  const scope = page.scope === 'states' ? 'state' : record.regionKey === 'national' ? 'national' : 'region';
  const context = { tier: scope, region: record.regionName || record.regionKey || '', state: record.stateName || '', district: '' };
  const leaderList = (items: any[], ctx = context) => visible(items).map((person: any, index: number) => <Leader key={person.id || index} person={person} onPress={() => setProfile({ person, context: ctx })} />);
  const boards = [...visible(record.stateRegions), ...visible(record.statePanels), ...visible(record.districts).map((district: any) => ({ ...district, district: true }))];
  const ownUrl = '/' + page.scope + '/' + record.slug;
  const section = page.section;
  const custom = visible(record.customSections).find((item: any) => item.key === section);
  const feed = useMemo(() => visible(custom?.items || record[section || '']).filter(item => !filter.trim() || [item.title, item.summary, item.body, item.location, item.category].join(' ').toLowerCase().includes(filter.trim().toLowerCase())), [record, custom, section, filter]);
  const sections = [...Object.entries(REGION_SECTIONS).filter(([key]) => key === 'gallery' || key === 'about' && record.fullDescription || visible(record[key]).length > 0).map(([key, title]) => ({ key, title })), ...visible(record.customSections).filter(item => item.key && item.title)];
  const contactGroups = [...visible(record.regionContactGroups), ...visible(record.districtContactGroups)].filter(group => visible(group.contacts).some(hasContact));
  return <>
    {section ? <>
      <ActionLink navigation={navigation} href={ownUrl} label={'Back to ' + page.title} /><Heading>{custom?.title || REGION_SECTIONS[section] || 'Details'}</Heading>
      {section === 'about' ? <Body value={record.fullDescription || record.shortDescription} navigation={navigation} /> : section === 'leaders' ? leaderList(record.leaders) : section === 'gallery' ? <>
        {(page.items || []).map((photo: any, index: number) => <View key={photo.id || index}><ContentMedia media={photo.media || { url: photo.url || photo.imageUrl, type: 'image' }} title={photo.caption || page.title} /><Body value={photo.title || photo.caption} />{(photo.slug || photo.id) && <ActionLink navigation={navigation} href={'/gallery/' + (photo.slug || photo.id)} label="View complete album" />}</View>)}
        {!(page.items || []).length && <StateView compact title="Photos coming soon" message="Community moments will appear here when they are published." />}
        {!!page.total && <Text style={s.meta}>{page.total} {page.total === 1 ? 'photograph' : 'photographs'}</Text>}<View style={x.row}>
          {offset > 0 && <GradientButton label="Previous photos" onPress={() => onOffset(Math.max(0, offset - 24))} />}
          {offset + (page.items || []).length < (page.total || 0) && <GradientButton label="More photos" onPress={() => onOffset(offset + 24)} />}
        </View>
      </> : <><Body value={custom?.intro || custom?.text} navigation={navigation} /><TextInput value={filter} onChangeText={setFilter} placeholder="Search this section" accessibilityLabel="Search this section" style={s.input} />{feed.map((item: any, index: number) => <FeedCard key={item.id || index} item={item} navigation={navigation} />)}{!feed.length && <Text style={s.body}>{filter ? 'No matching results.' : 'No items have been published in this section yet.'}</Text>}</>}
    </> : <>
      <Body value={record.shortDescription || record.hero?.blurb} navigation={navigation} />
      {!!record.hero?.sideImageUrl && <Photo url={record.hero.sideImageUrl} alt={page.title} />}
      {!!visible(record.hero?.facts).length && <View style={x.facts}>{visible(record.hero?.facts).map((fact: any, index: number) => <View key={index} style={x.fact}><Text style={s.meta}>{fact.label}</Text><Text style={x.factValue}>{fact.value}</Text></View>)}</View>}
      {!!sections.length && <><Heading>Explore {page.title}</Heading><View style={x.sectionGrid}>{sections.map(item => <PressableScale key={item.key} accessibilityRole="link" accessibilityLabel={item.title} onPress={() => openWebsitePage(navigation, ownUrl + '/' + item.key, item.title)} style={[x.sectionTileWrap, singleColumn && x.singleColumn]} contentStyle={[x.sectionTile, singleColumn && x.sectionRow]}><Icon name={sectionIcon[item.key] || 'article'} size={24} color={BRAND.blue} /><Text style={x.sectionTitle}>{item.title}</Text><Icon name="arrow-forward" size={18} color={BRAND.blue} /></PressableScale>)}</View></>}
      {!!visible(record.leaders).length && <><Heading>{record.labels?.ownTierEyebrow || (scope === 'state' ? 'State' : scope === 'national' ? 'National' : 'Zone')} leadership</Heading>{leaderList(record.leaders)}</>}
      {scope === 'state' && record.regionPanel?.slug && <ActionLink navigation={navigation} href={'/regions/' + record.regionPanel.slug} label={'Explore ' + record.regionPanel.label} />}
      {boards.map((board: any, index: number) => <View key={board.id || board.slug || index} style={x.board}>
        <Heading>{board.name}</Heading><Body value={board.description || board.blurb} navigation={navigation} />
        {leaderList(board.leaders, { ...context, tier: board.district ? 'district' : page.scope === 'regions' ? scope === 'national' ? 'region' : 'state' : 'region', state: page.scope === 'regions' && scope !== 'national' ? board.name : context.state, district: board.district ? board.name : '' })}
        <Contact contact={board.contact} navigation={navigation} />
        {visible(board.contacts).map((contact: any, i: number) => <Contact key={contact.id || i} contact={contact} navigation={navigation} />)}
        {board.slug && page.scope === 'regions' && <ActionLink navigation={navigation} href={'/' + (scope === 'national' ? 'regions' : 'states') + '/' + board.slug} label={'Explore ' + board.name} />}
      </View>)}
      {visible(record.focusStates).filter((state: any) => state.hasPage !== false).map((state: any) => <ActionLink key={state.slug} navigation={navigation} href={'/states/' + state.slug} label={state.name} />)}
      {(hasContact(record.contact) || visible(record.contacts).some(hasContact) || contactGroups.length > 0) && <Heading>{record.labels?.contactHeading || 'Get in touch'}</Heading>}<Contact contact={record.contact} navigation={navigation} />
      {visible(record.contacts).map((contact: any, i: number) => <Contact key={contact.id || i} contact={contact} navigation={navigation} />)}
      {contactGroups.map((group: any, i: number) => <SurfaceCard key={group.id || i}><Heading>{group.name}</Heading>{visible(group.contacts).map((contact: any, j: number) => <Contact key={contact.id || j} contact={contact} navigation={navigation} />)}</SurfaceCard>)}
      {visible(record.relatedLinks).map((item: any, i: number) => <ActionLink key={i} navigation={navigation} href={item.href} label={item.label || 'Related link'} />)}
      <ExtraFields fields={record.extraFields} navigation={navigation} />
    </>}
    {!!profile && <LeaderProfile person={profile.person} context={profile.context} path={path} navigation={navigation} onClose={() => setProfile(null)} />}
  </>;
}
function Leader({ person, onPress }: { person: any; onPress: () => void }) {
  const uri = resolveMediaUrl(person.photoUrl || '');
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <SurfaceCard onPress={onPress} accessibilityLabel={'View profile: ' + person.name} style={x.leaderCard}>
    <View style={x.person}>
      {uri && !failed ? <ContentImage uri={uri} width={320} accessibilityLabel={person.name} onError={() => setFailed(true)} resizeMode="cover" style={x.portrait} /> : <View style={[x.portrait, x.initial]}><Text style={x.initialText}>{String(person.name || 'A').charAt(0)}</Text></View>}
      <View style={s.flex}><Text style={s.title}>{person.name}</Text><Text style={s.meta}>{[person.role, person.designation, person.organisation].filter(Boolean).join('\n')}</Text><Text style={x.profileLink}>View profile & contact →</Text></View>
    </View>
  </SurfaceCard>;
}
function Contact({ contact, navigation }: { contact: any; navigation: any }) {
  if (!hasContact(contact)) return null;
  return <View style={x.contact}>
    {!!(contact.name || contact.personName) && <Heading>{contact.name || contact.personName}</Heading>}
    <Body value={[contact.designation, contact.organisation, contact.address || (Array.isArray(contact.addressLines) ? contact.addressLines : []).join('\n'), [contact.city, contact.state, contact.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')} />
    <ActionLink navigation={navigation} href={contact.phone ? 'tel:' + String(contact.phone).replace(/[^\d+]/g, '') : ''} label={contact.phone || 'Call'} />
    <ActionLink navigation={navigation} href={contact.email ? 'mailto:' + contact.email : ''} label={contact.email || 'Email'} />
    <ActionLink navigation={navigation} href={contact.mapUrl} label="Get directions" />
  </View>;
}
function FeedCard({ item, navigation }: { item: any; navigation: any }) {
  const [cover, ...photos] = newsMedia(item);
  return <SurfaceCard style={x.leaderCard}>{!!cover && <NewsMediaItem media={cover} navigation={navigation} />}<Text style={s.meta}>{[item.date, item.location, item.category].filter(Boolean).join(' · ')}</Text><Heading>{item.title}</Heading>
    <Body value={item.summary} navigation={navigation} /><Body value={item.body} navigation={navigation} />
    {photos.map(photo => <NewsMediaItem key={photo.url} media={photo} navigation={navigation} />)}<NewsResourceLinks article={item} navigation={navigation} />
    <ActionLink navigation={navigation} href={item.href} label="View details" /><ActionLink navigation={navigation} href={item.fileUrl} label="Download document" download />
  </SurfaceCard>;
}
function LeaderProfile({ person, context, path, navigation, onClose }: { person: any; context: any; path: string; navigation: any; onClose: () => void }) {
  const inFlight = useRef(false);
  const [purposes, setPurposes] = useState<any[] | null>(null), [form, setForm] = useState(false), [loading, setLoading] = useState(false), [sending, setSending] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
  const [values, setValues] = useState({ name: '', phone: '', email: '', organisation: '', district: '', purpose: '', note: '' });
  const showForm = async () => {
    setForm(true); setError(''); setLoading(true);
    try { const rows = await readPublicCms('/cms/leader-messages/purposes'); setPurposes(Array.isArray(rows) ? rows : []); }
    catch { setError('Could not load enquiry options. Please try again.'); }
    finally { setLoading(false); }
  };
  const submit = async () => {
    if (inFlight.current) return;
    const selected = purposes?.find(purpose => purpose.key === values.purpose);
    if (!values.name.trim() || values.phone.replace(/\D/g, '').length < 7 || !selected || selected.requiresNote && !values.note.trim()) { setError('Enter your name, a valid phone number and an enquiry purpose. Add a note if required.'); return; }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) { setError('Enter a valid email address.'); return; }
    inFlight.current = true; setSending(true); setError('');
    try {
      const receipt = await submitPublicCms('/cms/leader-messages', { leader: { id: person.id, name: person.name, role: person.role, designation: person.designation, organisation: person.organisation }, ...context, pagePath: path,
        sender: { name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim(), organisation: values.organisation.trim(), district: values.district.trim() }, purpose: values.purpose, note: values.note.trim() });
      if (receipt?.sent !== true) { setError('Could not confirm your enquiry was sent. Please try again.'); return; }
      setSent(true);
    } catch (err: any) { setError(err?.response?.data?.message || 'Could not send your enquiry. Please try again.'); }
    finally { inFlight.current = false; setSending(false); }
  };
  return <Modal animationType="slide" onRequestClose={onClose} visible>
    <PremiumPage safeBottom header={<PremiumPageHeader title={person.name} eyebrow="ACTIV LEADERSHIP" subtitle={[person.role, person.designation, person.organisation].filter(Boolean).join(' · ')}
      right={<GlassIconButton icon="close" accessibilityLabel="Close profile" onPress={onClose} />} />}>
      <View style={s.content}><SurfaceCard padded={false}><View style={s.readingContent}>
        <Photo url={person.photoUrl} alt={person.name} /><Body value={person.bio} navigation={navigation} />
        <Contact contact={person} navigation={navigation} />
        {sent ? <SurfaceCard><Heading>Enquiry sent</Heading><Body value="The ACTIV office has received your request and will follow up using your contact details." /></SurfaceCard> : <>
          {!form || !purposes?.length ? <GradientButton label={loading ? 'Loading enquiry options…' : 'Request a callback'} disabled={loading} onPress={showForm} /> : null}
          {form && !!purposes?.length && <SurfaceCard><Heading>Request a callback</Heading><Body value="Your request goes to the ACTIV office, which coordinates contact with the office-bearer." />
            {(['name', 'phone', 'email', 'organisation', 'district'] as const).map(key => <View key={key}><Text style={s.meta}>{key[0].toUpperCase() + key.slice(1)}{key === 'name' || key === 'phone' ? ' *' : ' (optional)'}</Text><TextInput style={s.input} accessibilityLabel={'Your ' + key} value={values[key]} keyboardType={key === 'phone' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'email' ? 'none' : 'words'} onChangeText={value => setValues(previous => ({ ...previous, [key]: value }))} /></View>)}
            <PremiumSelect label="Enquiry purpose" required value={purposes.find(item => item.key === values.purpose)?.label || ''} options={purposes.map(item => item.label)} placeholder="Choose a purpose" onChange={label => setValues(previous => ({ ...previous, purpose: purposes.find(item => item.label === label)?.key || '' }))} />
            <Body value={purposes.find(item => item.key === values.purpose)?.hint} /><TextInput style={[s.input, { minHeight: 96 }]} accessibilityLabel="Enquiry note" placeholder="Additional note" multiline maxLength={300} value={values.note} onChangeText={note => setValues(previous => ({ ...previous, note }))} />
            <GradientButton label={sending ? 'Sending…' : 'Send enquiry'} disabled={sending} onPress={submit} />
          </SurfaceCard>}
          {!!error && <Text accessibilityRole="alert" style={[s.body, { color: '#B91C1C' }]}>{error}</Text>}
        </>}
      </View></SurfaceCard></View>
    </PremiumPage>
  </Modal>;
}
const x = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, person: { flexDirection: 'row', gap: 14, alignItems: 'center' }, portrait: { width: 64, height: 76, borderRadius: 12, backgroundColor: PALETTE.blueSoft }, initial: { alignItems: 'center', justifyContent: 'center' }, initialText: { color: BRAND.blue900, fontSize: 28, fontWeight: '700' }, profileLink: { marginTop: 8, color: BRAND.blue, fontWeight: '600', fontSize: 14 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fact: { flexGrow: 1, flexBasis: '43%', backgroundColor: PALETTE.blueSoft, padding: 14, borderRadius: 14, gap: 4 }, factValue: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }, sectionTileWrap: { width: '47%', flexGrow: 1, maxWidth: '49%' }, singleColumn: { width: '100%', maxWidth: '100%' }, sectionTile: { flexGrow: 1, gap: 12, backgroundColor: PALETTE.white, borderRadius: 16, borderWidth: 1, borderColor: PALETTE.border, padding: 16, minHeight: 130 }, sectionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68 }, sectionTitle: { flex: 1, color: BRAND.navyDeep, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  board: { borderTopWidth: 1, borderTopColor: PALETTE.border, paddingTop: 20, marginTop: 4 }, leaderCard: { shadowOpacity: 0.04, shadowRadius: 5, elevation: 1, marginBottom: 12 }, contact: { borderWidth: 1, borderColor: PALETTE.border, borderRadius: 16, padding: 16, backgroundColor: PALETTE.white, marginBottom: 12 },
});
