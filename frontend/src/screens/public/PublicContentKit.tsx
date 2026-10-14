import React, { useEffect, useState } from 'react';
import { Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import { BRAND, PALETTE, SPACE, CardSkeletons, GlassIconButton, PressableScale, SiteArt, StateView, SurfaceCard } from '../../ui';
import { resolveMediaUrl } from '../../config/api.config';
import { openPublicAttachment, openWebsitePage } from '../../services/websiteNavigation';
import { isPublicDownloadUrl } from '../../services/publicDownload';
import { publicWebsitePath } from '../../utils/publicBrowse';

export const contentText = (value: any): string => String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/h[1-6]>/gi, '\n\n').replace(/<li[^>]*>/gi, '\n• ').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => { const code = Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; }).trim();
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const imageDocument = (url: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><style>html,body{margin:0;background:#fff}img{display:block;width:100%;height:auto}</style></head><body><img alt="Full image" src="${escape(url)}"></body></html>`;

export function ContentLayout({ navigation, title, subtitle, art = 'news', resource, children }: {
  navigation: any; title: string; subtitle?: string; art?: any;
  resource: { loading: boolean; refreshing: boolean; error: string; reload: () => any; data: any }; children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return <View style={contentStyles.screen}>
    <LinearGradient colors={[BRAND.navyDeep, BRAND.blue900]} style={[contentStyles.header, { paddingTop: insets.top + 12 }]}>
      <View style={contentStyles.topbar}><GlassIconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => navigation.canGoBack?.() === false ? navigation.navigate('PublicExplore') : navigation.goBack()} />
        <Text style={contentStyles.eyebrow}>EXPLORE ACTIV</Text><GlassIconButton icon="refresh" accessibilityLabel="Refresh content" onPress={resource.reload} /></View>
      <View style={contentStyles.heroRow}><View style={contentStyles.flex}><Text accessibilityRole="header" style={contentStyles.heroTitle}>{title}</Text>{!!subtitle && <Text style={contentStyles.heroSubtitle}>{subtitle}</Text>}</View><SiteArt kind={art} size={58} /></View>
    </LinearGradient>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[contentStyles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} colors={[BRAND.blue]} />}>
      {resource.loading && !resource.data ? <CardSkeletons rows={2} variant="media" /> : <>
        {!!resource.error && <StateView compact kind="error" title="Content unavailable" message={resource.error} onAction={resource.reload} />}
        {resource.data && children}
        {!resource.error && !resource.data && <StateView compact title="Not available" message="This content has not been published or is no longer available." />}
      </>}
    </ScrollView>
  </View>;
}
export function Heading({ children }: { children: React.ReactNode }) { return <Text accessibilityRole="header" style={contentStyles.heading}>{children}</Text>; }
export function Body({ value, navigation }: { value: any; navigation?: any }) {
  const raw = String(value ?? '');
  const links = [...raw.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  return <>{contentText(raw).split(/\n\s*\n/).filter(Boolean).map((text, i) => <Text selectable key={i} style={contentStyles.body}>{text}</Text>)}
    {!!navigation && links.map(([_, href, label], i) => <ActionLink key={i} navigation={navigation} href={contentText(href)} label={contentText(label) || 'Open link'} />)}</>;
}
export function ActionLink({ navigation, href, label, download = false }: { navigation: any; href?: string; label: string; download?: boolean }) {
  if (!href) return null;
  const file = download || isPublicDownloadUrl(href);
  if (!file && !/^(\/[^/]|https?:\/\/|mailto:|tel:)/i.test(href)) return null;
  const external = !file && /^https?:\/\//i.test(href) && !publicWebsitePath(href);
  return <PressableScale accessibilityRole="link" accessibilityLabel={label + (external ? ', opens external service' : file ? ', save to Downloads' : '')} onPress={() => file ? openPublicAttachment(href) : openWebsitePage(navigation, href, label)} contentStyle={contentStyles.link}>
    <Text style={contentStyles.linkText}>{label}{external ? ' ↗' : ' →'}</Text>
    {external && <Text style={contentStyles.linkHint}>External service</Text>}
    {file && <Text style={contentStyles.linkHint}>Save to Downloads</Text>}
  </PressableScale>;
}
export function Photo({ url, alt = 'ACTIV photo', caption }: { url?: string; alt?: string; caption?: string }) {
  const [ratio, setRatio] = useState(4 / 3), [failed, setFailed] = useState(false), [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const uri = resolveMediaUrl(url || '');
  useEffect(() => { setFailed(false); setOpen(false); setRatio(4 / 3); }, [uri]);
  if (!uri) return null;
  return <>
    <SurfaceCard padded={false} style={contentStyles.photo}>
      <PressableScale onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={'Enlarge image: ' + alt}>
        {failed ? <Text style={contentStyles.body}>Image unavailable. Tap to try the full image.</Text> : <Image source={{ uri }} accessibilityLabel={alt} resizeMode="contain" style={{ width: '100%', aspectRatio: ratio }} onError={() => setFailed(true)} onLoad={event => { const { width, height } = event.nativeEvent.source; if (width && height) setRatio(width / height); }} />}
        <Text style={contentStyles.photoCaption}>{caption || 'Tap to enlarge · pinch to zoom'}</Text>
      </PressableScale>
    </SurfaceCard>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={[contentStyles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={contentStyles.viewerBar}><Text style={contentStyles.eyebrow}>PINCH TO ZOOM</Text><GlassIconButton icon="close" accessibilityLabel="Close photo" onPress={() => setOpen(false)} /></View>
        {open && <WebView source={{ html: imageDocument(uri) }} javaScriptEnabled={false} domStorageEnabled={false} originWhitelist={['about:blank']} onShouldStartLoadWithRequest={req => req.url === 'about:blank' || req.url.startsWith('data:text/html')} style={contentStyles.flex} />}
      </View>
    </Modal>
  </>;
}
/** Uploaded videos play in the native player. Embedded media stays in an
 * isolated player with no website chrome or external page navigation. */
export function ContentMedia({ media, title }: { media: any; title: string }) {
  const [failed, setFailed] = useState(false);
  const uri = resolveMediaUrl(media?.url || '');
  if (!uri) return null;
  if (media.type !== 'video') return <Photo url={uri} alt={media.alt || title} />;
  if (failed) return <Text style={contentStyles.body}>This video could not be played. Pull down to reload.</Text>;
  const youtube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/i.exec(uri);
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(uri);
  if (youtube || vimeo) {
    const source = youtube ? `https://www.youtube.com/embed/${youtube[1]}` : `https://player.vimeo.com/video/${vimeo![1]}`;
    return <View style={contentStyles.video}><WebView source={{ uri: source }} allowsFullscreenVideo mediaPlaybackRequiresUserAction originWhitelist={['https://*']} onShouldStartLoadWithRequest={req => !req.isTopFrame || req.url === source || req.url === 'about:blank'} onError={() => setFailed(true)} /></View>;
  }
  return <Video source={{ uri }} controls resizeMode="contain" paused style={contentStyles.video} onError={() => setFailed(true)} />;
}
export function ExtraFields({ fields, navigation }: { fields: any[]; navigation: any }) {
  return <>{(Array.isArray(fields) ? fields : []).filter(field => field && field.value && !field.isHidden).map((field, i) => <SurfaceCard key={i} style={contentStyles.section}>
    {!!field.label && <Heading>{field.label}</Heading>}<Body value={field.value} navigation={navigation} />
  </SurfaceCard>)}</>;
}
export const contentStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.canvas }, flex: { flex: 1, minWidth: 0 }, header: { paddingHorizontal: SPACE.lg, paddingBottom: 25 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, eyebrow: { color: BRAND.onBrandSoft, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17 }, heroTitle: { fontSize: 27, lineHeight: 34, fontWeight: '800', color: PALETTE.white }, heroSubtitle: { color: BRAND.onBrandSoft, fontSize: 14, lineHeight: 22, marginTop: 8 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: SPACE.lg, gap: SPACE.md }, section: { marginBottom: SPACE.sm },
  heading: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 27, fontWeight: '800', marginBottom: 10 }, body: { color: PALETTE.textSoft, fontSize: 16, lineHeight: 25, marginBottom: 12 },
  meta: { color: PALETTE.textMuted, fontSize: 13, lineHeight: 20 }, title: { color: BRAND.navyDeep, fontSize: 19, lineHeight: 27, fontWeight: '800' },
  photo: { marginBottom: 12, backgroundColor: PALETTE.white }, photoCaption: { color: BRAND.blue, fontSize: 13, fontWeight: '600', textAlign: 'center', padding: 12 },
  link: { borderWidth: 1, borderColor: '#C7D9F5', borderRadius: 14, backgroundColor: PALETTE.blueSoft, minHeight: 46, padding: 12, marginVertical: 5 }, linkText: { color: BRAND.blue900, fontSize: 15, lineHeight: 22, fontWeight: '700' }, linkHint: { color: PALETTE.textMuted, fontSize: 11, marginTop: 4 },
  viewerBar: { padding: 14, backgroundColor: BRAND.navy, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#071332', marginBottom: 14 },
  input: { backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, minHeight: 48, paddingHorizontal: 14, color: PALETTE.text, fontSize: 15, marginBottom: 12 },
});
