import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import { BRAND, PALETTE, SPACE, CardSkeletons, GlassIconButton, PressableScale, StateView, SurfaceCard } from '../../ui';
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
  return <KeyboardAvoidingView style={contentStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} colors={[BRAND.blue]} />}>
      <LinearGradient colors={[BRAND.navyDeep, BRAND.blue900]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[contentStyles.header, { paddingTop: insets.top + 8 }]}>
        <View style={contentStyles.headerInner}>
          <View style={contentStyles.topbar}>
            <PressableScale accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.canGoBack?.() === false ? navigation.navigate('PublicExplore') : navigation.goBack()} contentStyle={contentStyles.headerButton}><Icon name="arrow-back" size={22} color="#fff" /></PressableScale>
            <Text style={contentStyles.eyebrow}>ACTIV{art === 'gallery' ? ' / GALLERY' : art === 'schemes' ? ' / OPPORTUNITIES' : art === 'zones' ? ' / COMMUNITY' : ''}</Text>
            <PressableScale accessibilityRole="button" accessibilityLabel="Refresh content" onPress={resource.reload} contentStyle={contentStyles.headerButton}><Icon name="refresh" size={22} color="#fff" /></PressableScale>
          </View>
          <Text accessibilityRole="header" style={contentStyles.heroTitle}>{title}</Text>
          {!!subtitle && <Text style={contentStyles.heroSubtitle}>{subtitle}</Text>}
          <View style={contentStyles.headerAccent} />
        </View>
      </LinearGradient>
      <View style={contentStyles.content}>
      {resource.loading && !resource.data ? <CardSkeletons rows={2} variant="media" /> : <>
        {!!resource.error && <StateView compact kind="error" title="Content unavailable" message={resource.error} onAction={resource.reload} />}
        {resource.data && children}
        {!resource.error && !resource.data && <StateView compact title="Not available" message="This content has not been published or is no longer available." />}
      </>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
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
export function Photo({ url, alt = 'ACTIV photo', caption, document = false, closeLabel = 'Close photo' }: { url?: string; alt?: string; caption?: string; document?: boolean; closeLabel?: string }) {
  const [ratio, setRatio] = useState(4 / 3), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'), [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const insets = useSafeAreaInsets();
  const uri = resolveMediaUrl(url || '');
  useEffect(() => { setStatus('loading'); setOpen(false); setRatio(4 / 3); }, [uri, attempt]);
  useEffect(() => {
    if (!uri || status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 20000);
    return () => clearTimeout(timer);
  }, [uri, attempt, status]);
  if (!uri) return null;
  return <>
    <View style={contentStyles.photo}>
      {status === 'error' ? <View style={contentStyles.imageError}>
        <Icon name="image-not-supported" size={24} color={PALETTE.textMuted} />
        <View style={contentStyles.flex}><Text style={contentStyles.errorTitle}>Image couldn’t load</Text><Text style={contentStyles.meta}>Check your connection and try again.</Text></View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Retry image" onPress={() => setAttempt(value => value + 1)} contentStyle={contentStyles.retry}><Text style={contentStyles.linkText}>Retry</Text></PressableScale>
      </View> : <PressableScale disabled={status !== 'ready'} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={'Enlarge image: ' + alt}>
        <Image key={uri + ':' + attempt} source={{ uri }} accessibilityLabel={alt} resizeMode="contain"
          style={{ width: '100%', ...(status === 'ready' ? { aspectRatio: document ? ratio : Math.max(0.65, Math.min(2.2, ratio)) } : { height: 144 }), opacity: status === 'ready' ? 1 : 0 }}
          onError={() => setStatus('error')} onLoad={event => { const source = event.nativeEvent?.source; if (source?.width && source?.height) setRatio(source.width / source.height); setStatus('ready'); }} />
        {status === 'loading' ? <View style={contentStyles.imageLoading}><ActivityIndicator color={BRAND.blue} /><Text style={contentStyles.meta}>Loading image…</Text></View>
          : <View style={contentStyles.expand}><Icon name="fullscreen" size={22} color="#fff" /></View>}
      </PressableScale>}
      {!!caption && <Text style={contentStyles.photoCaption}>{contentText(caption)}</Text>}
    </View>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={[contentStyles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={contentStyles.viewerBar}><Text style={contentStyles.eyebrow}>PINCH TO ZOOM</Text><GlassIconButton icon="close" accessibilityLabel={closeLabel} onPress={() => setOpen(false)} /></View>
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
  useEffect(() => { setFailed(false); }, [uri, media?.type]);
  if (!uri) return null;
  if (media.type !== 'video') return <Photo url={uri} alt={media.alt || title} />;
  if (failed) return <View>
    <Text accessibilityRole="alert" style={contentStyles.body}>This video could not be played. Try again.</Text>
    <PressableScale accessibilityRole="button" accessibilityLabel="Retry video" onPress={() => setFailed(false)} contentStyle={contentStyles.link}>
      <Text style={contentStyles.linkText}>Retry video</Text>
    </PressableScale>
  </View>;
  const youtube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/i.exec(uri);
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(uri);
  if (youtube || vimeo) {
    const source = youtube ? `https://www.youtube.com/embed/${youtube[1]}` : `https://player.vimeo.com/video/${vimeo?.[1] || ''}`;
    return <View style={contentStyles.video}><WebView key={uri} source={{ uri: source }} allowsFullscreenVideo mediaPlaybackRequiresUserAction originWhitelist={['https://*']} onShouldStartLoadWithRequest={req => !req.isTopFrame || req.url === source || req.url === 'about:blank'} onError={() => setFailed(true)} /></View>;
  }
  return <Video key={uri} source={{ uri }} controls resizeMode="contain" paused style={contentStyles.video} onError={() => setFailed(true)} />;
}
export function ExtraFields({ fields, navigation }: { fields: any[]; navigation: any }) {
  return <>{(Array.isArray(fields) ? fields : []).filter(field => field && field.value && !field.isHidden
    && !/^(created\s*by|updated\s*by|seed|source\s*id|internal|database|imported\s*by)/i.test(String(field.label || field.key || '').trim())
    && !/^seed[:\s-]/i.test(String(field.value).trim())).map((field, i) => <SurfaceCard key={i} style={contentStyles.section}>
    {!!field.label && <Heading>{field.label}</Heading>}<Body value={field.value} navigation={navigation} />
  </SurfaceCard>)}</>;
}
export const contentStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' }, flex: { flex: 1, minWidth: 0 }, header: { paddingHorizontal: SPACE.lg },
  headerInner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 20 },
  headerButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center' },
  headerAccent: { width: 32, height: 3, borderRadius: 2, backgroundColor: '#71B1FF', marginTop: 18 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }, eyebrow: { color: '#CEDBF5', fontSize: 12, fontWeight: '600', letterSpacing: 1.4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17 }, heroTitle: { fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.5, color: PALETTE.white }, heroSubtitle: { color: '#DAE4F7', fontSize: 15, lineHeight: 23, marginTop: 8 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: SPACE.lg, paddingTop: 22, gap: SPACE.md }, section: { marginBottom: SPACE.sm },
  heading: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 28, fontWeight: '700', marginBottom: 10 }, body: { color: PALETTE.textSoft, fontSize: 16, lineHeight: 26, marginBottom: 12 },
  meta: { color: PALETTE.textMuted, fontSize: 14, lineHeight: 21 }, title: { color: BRAND.navyDeep, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  photo: { marginBottom: 8, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E6EF', backgroundColor: '#EDF2F8' },
  photoCaption: { color: PALETTE.textSoft, fontSize: 14, lineHeight: 21, padding: 12, backgroundColor: '#fff' },
  imageLoading: { ...StyleSheet.absoluteFillObject, gap: 10, alignItems: 'center', justifyContent: 'center' },
  imageError: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0F4FA' },
  errorTitle: { fontSize: 15, lineHeight: 22, color: BRAND.navy, fontWeight: '600' }, retry: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  expand: { position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 10, backgroundColor: '#10234BBB', alignItems: 'center', justifyContent: 'center' },
  link: { borderWidth: 1, borderColor: '#D5E0F0', borderRadius: 12, backgroundColor: PALETTE.white, minHeight: 48, padding: 14, marginVertical: 4 }, linkText: { color: BRAND.blue900, fontSize: 15, lineHeight: 22, fontWeight: '600' }, linkHint: { color: PALETTE.textMuted, fontSize: 12, marginTop: 4 },
  viewerBar: { padding: 14, backgroundColor: BRAND.navy, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#071332', marginBottom: 14 },
  input: { backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, minHeight: 48, paddingHorizontal: 14, color: PALETTE.text, fontSize: 16, marginBottom: 12 },
});
