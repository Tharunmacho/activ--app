import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicNewsArticle } from '../../services/publicContent';
import { openWebsitePage } from '../../services/websiteNavigation';
import { resolveMediaUrl } from '../../config/api.config';
import { GlassIconButton, PressableScale } from '../../ui';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Only image markup is loaded here. The browser's viewport supports native pinch
// zoom on Android and iOS; document uploads never inherit a cropped card frame.
export const newsImageDocument = (url: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><style>html,body{margin:0;background:#fff}img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}</style></head><body><img alt="Full news image" src="${escape(url)}"></body></html>`;

function Letter({ url, alt, onOpen }: { url: string; alt: string; onOpen: (url: string) => void }) {
  const [ratio, setRatio] = useState(0.707), [failed, setFailed] = useState(false);
  const uri = resolveMediaUrl(url);
  useEffect(() => { setFailed(false); setRatio(0.707); }, [uri]);
  return <PressableScale accessibilityRole="button" accessibilityLabel={`Enlarge image: ${alt}`} onPress={() => onOpen(uri)} style={s.letter}>
    {failed ? <Text style={s.body}>Image unavailable. Tap to retry in the viewer.</Text> : <Image source={{ uri }} accessibilityLabel={alt} resizeMode="contain" style={{ width: '100%', aspectRatio: ratio }} onError={() => setFailed(true)} onLoad={event => {
      const { width, height } = event.nativeEvent.source; if (width > 0 && height > 0) setRatio(width / height);
    }} />}
    <Text style={s.enlarge}>Tap to open · pinch to zoom</Text>
  </PressableScale>;
}
export default function PublicNewsArticleScreen({ slug, navigation }: { slug: string; navigation: any }) {
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<any>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [reload, setReload] = useState(0), [imageUrl, setImageUrl] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setImageUrl('');
    getPublicNewsArticle(slug, controller.signal).then(value => { if (!controller.signal.aborted) { setArticle(value); if (!value) setError('This article is no longer available.'); } })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load this story. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, reload]);
  const openSource = (url: string) => openWebsitePage(navigation, url, 'Original source');
  return <View style={s.screen}>
    <View style={[s.header, { paddingTop: insets.top + 12 }]}><GlassIconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => navigation.goBack()} /><Text style={s.headerTitle}>ACTIV News</Text><GlassIconButton icon="refresh" accessibilityLabel="Reload article" onPress={() => setReload(v => v + 1)} /></View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]}>
      {loading ? <Text style={s.body}>Loading story…</Text> : error && !article ? <Text accessibilityRole="alert" style={s.body}>{error}</Text> : article && <>
        <Text style={s.title}>{article.title}</Text>
        <Text style={s.meta}>{[article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN') : '', article.location].filter(Boolean).join(' · ')}</Text>
        {!!(article.image?.url || article.imageUrl) && <Letter url={article.image?.url || article.imageUrl} alt={article.image?.alt || article.title} onOpen={setImageUrl} />}
        {!!article.summary && <Text style={s.summary}>{article.summary}</Text>}
        {String(article.body || '').split(/\n{2,}/).filter(Boolean).map((paragraph, i) => <Text key={i} selectable style={s.body}>{paragraph}</Text>)}
        {(article.photos || []).map((photo: any, i: number) => <Letter key={`${photo.url}-${i}`} url={photo.url} alt={photo.alt || article.title} onOpen={setImageUrl} />)}
        {!!article.externalUrl && <PressableScale accessibilityRole="link" onPress={() => openSource(article.externalUrl)}><Text style={s.link}>Read the original source ↗</Text></PressableScale>}
        {(article.extraFields || []).filter((field: any) => typeof field.value === 'string').map((field: any, i: number) => <View key={i}><Text style={s.summary}>{field.label}</Text><Text style={s.body}>{field.value}</Text></View>)}
      </>}
    </ScrollView>
    <Modal visible={!!imageUrl} onRequestClose={() => setImageUrl('')} animationType="slide">
      <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.viewerBar}><Text style={s.headerTitle}>Pinch to zoom · drag to read</Text><GlassIconButton icon="close" accessibilityLabel="Close image" onPress={() => setImageUrl('')} /></View>
        {!!imageUrl && <WebView source={{ html: newsImageDocument(imageUrl) }} javaScriptEnabled={false} domStorageEnabled={false} originWhitelist={['about:blank']} setSupportMultipleWindows={false} onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('data:text/html')} style={s.viewer} />}
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FC' }, header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#172A65' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1 }, content: { padding: 20 }, title: { color: '#142650', fontSize: 27, fontWeight: '800', lineHeight: 35 },
  meta: { color: '#64748B', fontSize: 14, lineHeight: 22, marginVertical: 14 }, letter: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#DFE6F1' },
  enlarge: { color: '#2357C4', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: '700' }, summary: { fontSize: 18, fontWeight: '600', lineHeight: 27, color: '#243B65', marginBottom: 16 },
  body: { color: '#334155', fontSize: 17, lineHeight: 28, marginBottom: 20 }, link: { color: '#245DD6', fontSize: 17, fontWeight: '700', paddingVertical: 16 },
  viewerBar: { padding: 14, backgroundColor: '#142650', flexDirection: 'row', alignItems: 'center' }, viewer: { flex: 1, backgroundColor: '#FFF' },
});
