import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { BRAND, PALETTE, GradientButton, PremiumSelect, PressableScale, SurfaceCard } from '../../ui';
import { usePublicResource } from '../../services/usePublicResource';
import { ContactForm, infoPage, loadPublicInfo, sendPublicEnquiry } from '../../services/publicInfo';
import { contactMapHtml, publicOffices } from '../../utils/contactOffices';
import { ActionLink, Body, ContentLayout, ContentMedia, ExtraFields, Heading, contentStyles as c } from './PublicContentKit';

const list = (value: any): any[] => Array.isArray(value) ? value.filter(item => item != null) : [];
const shown = (doc: any, key: string) => !list(doc.sections).some(section => section.key === key && section.hidden === true);
const paragraphs = (value: any) => Array.isArray(value) ? list(value).join('\n\n') : String(value || '');
const hasSectionFields = (doc: any, key: string) => list(list(doc.sections).find(section => section.key === key)?.fields).some(field => field.value && !field.isHidden);
function SectionFields({ doc, section, navigation }: any) {
  return <ExtraFields fields={list(doc.sections).find(row => row.key === section)?.fields || []} navigation={navigation} />;
}
function Bullets({ items, navigation }: any) {
  return <>{list(items).map((item, i) => <View key={i} style={s.bullet}><Text style={s.dot}>•</Text><View style={c.flex}><Body value={typeof item === 'string' ? item : item.text || item.title || ''} navigation={navigation} /></View></View>)}</>;
}
function About({ doc, navigation }: any) {
  return <>
    {shown(doc, 'about.badge') && <><Body value={doc.badgeText} navigation={navigation} /><SectionFields doc={doc} section="about.badge" navigation={navigation} /></>}
    {shown(doc, 'about.heading') && <SurfaceCard><Heading>{[doc.heading, doc.headingHighlight].filter(Boolean).join(' ') || 'About ACTIV'}</Heading><Body value={doc.body} navigation={navigation} /><SectionFields doc={doc} section="about.heading" navigation={navigation} /></SurfaceCard>}
    {shown(doc, 'about.image') && <><ContentMedia media={doc.media} title="About ACTIV" /><SectionFields doc={doc} section="about.image" navigation={navigation} /></>}
    {shown(doc, 'about.points') && (list(doc.bullets).length > 0 || list(doc.bulletPoints).length > 0 || hasSectionFields(doc, 'about.points')) && <SurfaceCard><Bullets items={doc.bullets?.length ? doc.bullets : doc.bulletPoints} navigation={navigation} /><SectionFields doc={doc} section="about.points" navigation={navigation} /></SurfaceCard>}
    {shown(doc, 'about.statsBar') && <><View style={s.stats}>{list(doc.statsBar).map((stat, i) => <SurfaceCard key={i} style={s.stat}><Text style={s.number}>{stat.value}{stat.suffix}</Text><Text style={c.meta}>{stat.label}</Text></SurfaceCard>)}</View><SectionFields doc={doc} section="about.statsBar" navigation={navigation} /></>}
    {shown(doc, 'about.quote') && !!doc.quote?.text && <SurfaceCard><Body value={doc.quote.text} navigation={navigation} /><Text style={c.title}>{doc.quote.author}</Text><Text style={c.meta}>{doc.quote.role}</Text><SectionFields doc={doc} section="about.quote" navigation={navigation} /></SurfaceCard>}
    <ExtraFields fields={doc.extraFields} navigation={navigation} />
  </>;
}
function Membership({ doc, navigation }: any) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const blurb = (key: string, value: any = {}) => shown(doc, key) && (value?.heading || value?.subtitle || value?.lead || list(value?.bullets).length > 0 || hasSectionFields(doc, key)) && <SurfaceCard><Heading>{value?.heading}</Heading><Body value={value?.subtitle} navigation={navigation} /><Body value={value?.lead} navigation={navigation} /><Bullets items={value?.bullets} navigation={navigation} /><SectionFields doc={doc} section={key} navigation={navigation} /></SurfaceCard>;
  return <>
    {shown(doc, 'membership.opening') && <SurfaceCard><Body value={doc.eyebrow} navigation={navigation} /><Heading>{[doc.subtitleLead, doc.subtitleRest].filter(Boolean).join(' ') || doc.title || 'Membership with ACTIV'}</Heading><Body value={paragraphs(doc.body)} navigation={navigation} /><SectionFields doc={doc} section="membership.opening" navigation={navigation} /></SurfaceCard>}
    {blurb('membership.why', doc.whyJoin)}
    {shown(doc, 'membership.advantages') && list(doc.advantages).map((advantage, i) => {
      const key = advantage.slug || String(i), open = !!expanded[key];
      return <SurfaceCard key={key}><PressableScale onPress={() => setExpanded(current => ({ ...current, [key]: !current[key] }))} accessibilityRole="button" accessibilityLabel={advantage.title} accessibilityState={{ expanded: open }} contentStyle={s.advantage}>
        <View style={c.flex}><Text style={c.title}>{advantage.number ? `${advantage.number}. ` : ''}{advantage.title}</Text>{!!advantage.subtitle && <Text style={c.meta}>{advantage.subtitle}</Text>}</View><Text style={s.expand}>{open ? '−' : '+'}</Text>
      </PressableScale>{open && <View style={s.details}><Body value={paragraphs(advantage.body)} navigation={navigation} /><Body value={advantage.listLead} /><Bullets items={advantage.bullets} navigation={navigation} /><Body value={advantage.closing} /><Body value={paragraphs(advantage.after)} navigation={navigation} /></View>}</SurfaceCard>;
    })}
    {shown(doc, 'membership.advantages') && <SectionFields doc={doc} section="membership.advantages" navigation={navigation} />}
    {shown(doc, 'membership.journey') && (doc.journeyHeading || list(doc.journey).length > 0 || hasSectionFields(doc, 'membership.journey')) && <SurfaceCard><Body value={doc.journeyEyebrow} navigation={navigation} /><Heading>{doc.journeyHeading || 'Your membership journey'}</Heading><Body value={doc.journeySubtitle} navigation={navigation} />{list(doc.journey).map((step, i) => <View key={i} style={s.details}><Text style={c.title}>{step.step ? `${step.step}. ` : ''}{step.title}</Text><Body value={step.text} navigation={navigation} /></View>)}<SectionFields doc={doc} section="membership.journey" navigation={navigation} /></SurfaceCard>}
    {blurb('membership.who', doc.whoShouldJoin)}
    {shown(doc, 'membership.matters') && (doc.mattersHeading || doc.mattersSubtitle || list(doc.whyItMatters).length > 0 || hasSectionFields(doc, 'membership.matters')) && <SurfaceCard><Heading>{doc.mattersHeading}</Heading><Body value={doc.mattersSubtitle} navigation={navigation} />{list(doc.whyItMatters).map((item, i) => <View key={i}><Text style={c.title}>{item.title}</Text><Body value={item.text} navigation={navigation} /></View>)}<SectionFields doc={doc} section="membership.matters" navigation={navigation} /></SurfaceCard>}
    {shown(doc, 'membership.closing') && <SurfaceCard><Heading>{[doc.closingHeading, doc.closingHeadingHighlight].filter(Boolean).join(' ') || 'Join ACTIV'}</Heading><Body value={paragraphs(doc.closingBody)} navigation={navigation} /><Body value={doc.closingNote} navigation={navigation} />{!!doc.callHeading && <Heading>{doc.callHeading}</Heading>}<Body value={paragraphs(doc.callLines)} navigation={navigation} /><Body value={doc.statement} navigation={navigation} /><Body value={doc.invitation} navigation={navigation} /><ActionLink navigation={navigation} href={doc.ctaHref || '/register'} label={doc.ctaLabel || 'Explore membership'} />{!!doc.enquiriesHeading && <Heading>{doc.enquiriesHeading}</Heading>}{!!doc.email && <ActionLink navigation={navigation} href={`mailto:${doc.email}`} label={doc.email} />}{!!doc.website && <ActionLink navigation={navigation} href={/^(?:https?:\/\/|\/)/.test(doc.website) ? doc.website : `https://${doc.website}`} label={doc.website} />}<SectionFields doc={doc} section="membership.closing" navigation={navigation} /></SurfaceCard>}
    <ExtraFields fields={doc.extraFields} navigation={navigation} />
  </>;
}

const blank: ContactForm = { name: '', email: '', phone: '', subject: '', message: '', memberId: '' };
function EnquiryForm({ deletion = false, copy = {} }: { deletion?: boolean; copy?: any }) {
  const [form, setForm] = useState<ContactForm>({ ...blank }), [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false), [error, setError] = useState(''), [reference, setReference] = useState('');
  const inFlight = useRef(false);
  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setSending(true); setError('');
    try { const receipt = await sendPublicEnquiry(form, deletion, confirmed); setReference(String(receipt.id)); setForm({ ...blank }); setConfirmed(false); }
    catch (err: any) { setError(err?.response?.data?.message || (err?.request && !err.response ? 'We could not confirm receipt. Check your connection or contact ACTIV before retrying.' : err?.message) || 'Your message could not be sent. Please try again.'); }
    finally { inFlight.current = false; setSending(false); }
  };
  const field = (key: keyof ContactForm, label: string, options: any = {}) => <View key={key}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={form[key] || ''} placeholder={copy[`${key}Placeholder`] || undefined} onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))} editable={!sending} style={[c.input, options.multiline && s.multiline]} maxLength={key === 'name' ? 120 : key === 'phone' ? 30 : key === 'memberId' ? 80 : key === 'message' ? (deletion ? 1500 : 5000) : 200} {...options} /></View>;
  return <SurfaceCard><Heading>{deletion ? 'Request account deletion' : copy.title || 'Send us a message'}</Heading>
    {!!reference ? <View accessibilityLiveRegion="polite"><Text style={s.success}>{deletion ? 'Your deletion request was received. ACTIV will verify account ownership before taking action.' : copy.successMessage || 'Your message was received. Our team will get back to you.'}</Text><Text selectable style={c.meta}>Reference: {reference}</Text>{!deletion && <GradientButton label="Send another message" onPress={() => setReference('')} style={s.details} />}</View> : <>
      <Body value={copy.subtitle} />
      {field('name', 'Name *', { autoComplete: 'name' })}
      {field('email', 'Email *', { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' })}
      {field('phone', 'Mobile number (optional)', { keyboardType: 'phone-pad', autoComplete: 'tel' })}
      {deletion ? field('memberId', 'Membership ID (optional)', { autoCapitalize: 'characters' }) : field('subject', 'Subject (optional)')}
      {field('message', deletion ? 'Additional information (optional)' : 'Message *', { multiline: true, textAlignVertical: 'top' })}
      {deletion && <PressableScale disabled={sending} accessibilityRole="checkbox" accessibilityLabel="I confirm this is my account and request deletion" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(value => !value)} contentStyle={s.confirm}><Text style={s.check}>{confirmed ? '☑' : '☐'}</Text><Text style={[c.body, c.flex]}>I confirm this is my account and I want to request deletion.</Text></PressableScale>}
      {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      <GradientButton disabled={sending} label={sending ? 'Sending…' : deletion ? 'Submit deletion request' : copy.submitLabel || 'Send message'} onPress={submit} />
    </>}
  </SurfaceCard>;
}
function Contact({ doc, wantedState, navigation }: any) {
  const offices = useMemo(() => publicOffices(doc), [doc]);
  const [selected, setSelected] = useState(''), [mapFailed, setMapFailed] = useState(false);
  const office = offices.find(item => item.id === selected) || offices.find(item => wantedState && item.state.toLowerCase() === wantedState.toLowerCase()) || offices[0];
  const raw = list(doc.offices).find(item => String(item.id) === office?.id) || (office?.isHeadOffice ? doc : {});
  const choices = offices.map(item => ({ id: item.id, label: item.label + (item.state && !item.label.toLowerCase().includes(item.state.toLowerCase()) ? ` · ${item.state}` : '') }));
  useEffect(() => setSelected(''), [wantedState]);
  useEffect(() => setMapFailed(false), [office?.mapEmbedUrl]);
  return <>
    {shown(doc, 'contact.header') && <><Body value={doc.badgeText} navigation={navigation} /><Body value={doc.description} navigation={navigation} />{list(doc.heroMedia).map((media, i) => <ContentMedia key={i} media={media} title="Contact ACTIV" />)}<SectionFields doc={doc} section="contact.header" navigation={navigation} /></>}
    {!!offices.length && <SurfaceCard><Heading>{doc.infoCard?.title || 'ACTIV offices'}</Heading>
      {offices.length > 1 && <PremiumSelect label="Choose an office" value={choices.find(item => item.id === office?.id)?.label || ''} options={choices.map(item => item.label)} onChange={label => setSelected(choices.find(item => item.label === label)?.id || '')} />}
      <Body value={doc.infoCard?.subtitle} navigation={navigation} /><Text style={c.title}>{office?.label}</Text><Body value={office?.address} />
      {[raw.phone, raw.alternatePhone].filter(Boolean).map((phone, i) => <ActionLink key={i} navigation={navigation} href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} label={phone} />)}
      {!!raw.email && <ActionLink navigation={navigation} href={`mailto:${raw.email}`} label={raw.email} />}
      {!!raw.whatsapp && <ActionLink navigation={navigation} href={`https://wa.me/${String(raw.whatsapp).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} label="Chat on WhatsApp" />}
      <Body value={paragraphs(raw.workingHours)} /><SectionFields doc={doc} section="contact.info" navigation={navigation} />
      {!!office?.mapEmbedUrl && !mapFailed && <View style={s.map}><WebView source={{ html: contactMapHtml(office.mapEmbedUrl), baseUrl: 'https://activ.org.in/' }} incognito sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} setSupportMultipleWindows={false} onError={() => setMapFailed(true)} onShouldStartLoadWithRequest={request => !request.isTopFrame || request.url === 'about:blank' || /^https:\/\/(?:www\.)?google\.(?:com|co\.in)\//i.test(request.url)} /></View>}
      <ActionLink navigation={navigation} href={office?.directionsUrl} label="Open directions" />
    </SurfaceCard>}
    {shown(doc, 'contact.form') && <><EnquiryForm copy={doc.formCard} /><SectionFields doc={doc} section="contact.form" navigation={navigation} /></>}
    {shown(doc, 'contact.banner') && <>{doc.banner?.enabled && <SurfaceCard><Heading>{doc.banner.title}</Heading><Body value={doc.banner.subtitle} navigation={navigation} /><ActionLink navigation={navigation} href={doc.banner.ctaHref} label={doc.banner.ctaLabel || 'Learn more'} /></SurfaceCard>}<SectionFields doc={doc} section="contact.banner" navigation={navigation} /></>}
    {shown(doc, 'contact.social') && <>{Object.entries(doc.social || {}).filter(([, href]) => typeof href === 'string' && /^https?:\/\//i.test(href)).map(([platform, href]) => <ActionLink key={platform} navigation={navigation} href={String(href)} label={platform === 'x' ? 'X (Twitter)' : platform.charAt(0).toUpperCase() + platform.slice(1)} />)}<SectionFields doc={doc} section="contact.social" navigation={navigation} /></>}
    {doc.regionsBand?.enabled !== false && <ActionLink navigation={navigation} href="/zones" label={doc.regionsBand?.heading || 'Find ACTIV in your region'} />}
    <ExtraFields fields={doc.extraFields} navigation={navigation} />
  </>;
}
function Policy({ doc, navigation }: any) {
  const effectiveFrom = doc.effectiveFrom ? new Date(doc.effectiveFrom) : null;
  return <><Body value={doc.lede} navigation={navigation} />{effectiveFrom && !Number.isNaN(effectiveFrom.getTime()) && <Text style={c.meta}>Effective from {effectiveFrom.toLocaleDateString('en-IN')}</Text>}
    {list(doc.sections).map((section, i) => <SurfaceCard key={i}>{!!section.heading && <Heading>{section.heading}</Heading>}<Body value={paragraphs(section.body)} navigation={navigation} /><Bullets items={section.bullets} navigation={navigation} />{list(section.links).map((link, index) => <ActionLink key={index} navigation={navigation} href={link.href} label={link.label || link.href} />)}</SurfaceCard>)}<ExtraFields fields={doc.extraFields} navigation={navigation} /></>;
}
function Deletion({ navigation }: any) {
  return <><SurfaceCard><Heading>What happens next</Heading><Body value="Send a request using your account email. ACTIV will verify ownership, confirm the expected completion date, and notify you when the request has been processed. Submitting this form does not immediately delete your account." /><Body value="Your request covers your login, personal and membership profile, business information and associated personal documents or images. Once deletion is completed, you lose access to member services. Uninstalling the app does not delete your account." /><Body value="Payment and transaction records may need to be retained for legal obligations or dispute resolution. The team will explain any retention reason and period. Account deletion does not automatically request a refund." /><Body value="Do not include passwords, OTPs, Aadhaar or PAN numbers, or payment card details." /><ActionLink navigation={navigation} href="/privacy-policy" label="Privacy Policy" /><ActionLink navigation={navigation} href="/contact" label="Contact ACTIV" /></SurfaceCard><EnquiryForm deletion /></>;
}
export default function PublicInfoScreen({ navigation, route }: any) {
  const path = String(route?.params?.path || '/about'), page = infoPage(path);
  const resource = usePublicResource(navigation, path, signal => loadPublicInfo(path, signal));
  // Never present stale policy wording as the current published agreement after a failed refresh.
  const hidePolicy = page.kind === 'policy' && (resource.error || resource.loading || resource.refreshing);
  const visible = hidePolicy ? { ...resource, data: null, loading: resource.loading || resource.refreshing } : resource;
  const doc = visible.data?.content || {};
  const title = page.kind === 'policy' ? doc.title || route?.params?.title || 'Policy'
    : page.kind === 'membership' ? doc.title || 'Membership' : page.kind === 'delete-account' ? 'Account & privacy'
      : page.kind === 'contact' ? (shown(doc, 'contact.header') ? [doc.heading, doc.headingHighlight].filter(Boolean).join(' ') : '') || 'Contact ACTIV' : 'About ACTIV';
  return <ContentLayout navigation={navigation} title={title} subtitle={page.kind === 'membership' ? doc.tagline : undefined} art={page.kind === 'contact' ? 'contact' : 'membership'} resource={visible}>
    {page.kind === 'about' && <About doc={doc} navigation={navigation} />}
    {page.kind === 'membership' && <Membership doc={doc} navigation={navigation} />}
    {page.kind === 'contact' && <Contact doc={doc} wantedState={page.state} navigation={navigation} />}
    {page.kind === 'policy' && <Policy doc={doc} navigation={navigation} />}
    {page.kind === 'delete-account' && <Deletion navigation={navigation} />}
  </ContentLayout>;
}
const s = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flexGrow: 1, flexBasis: '43%', minWidth: 130 }, number: { color: BRAND.blue, fontSize: 27, lineHeight: 34, fontWeight: '800' },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, dot: { color: BRAND.blue, fontSize: 20, lineHeight: 26 }, advantage: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 14 }, expand: { color: BRAND.blue, fontSize: 26 },
  details: { marginTop: 14 }, label: { color: BRAND.navyDeep, fontSize: 14, fontWeight: '700', marginBottom: 7 }, multiline: { minHeight: 125, paddingTop: 12 }, confirm: { flexDirection: 'row', gap: 10, paddingVertical: 10 }, check: { color: BRAND.blue, fontSize: 25 },
  error: { color: PALETTE.dangerText, fontSize: 14, lineHeight: 21, marginBottom: 15 }, success: { color: PALETTE.successText, fontSize: 16, lineHeight: 24, marginBottom: 12 }, map: { height: 210, borderRadius: 16, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
});
