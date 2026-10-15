import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getPublicNewsArticle } from '../../services/publicContent';
import { usePublicResource } from '../../services/usePublicResource';
import { BRAND } from '../../ui';
import { ActionLink, Body, ContentLayout, ExtraFields, Photo } from './PublicContentKit';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Only image markup is loaded here. The browser's viewport supports native pinch
// zoom on Android and iOS; document uploads never inherit a cropped card frame.
export const newsImageDocument = (url: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><style>html,body{margin:0;background:#fff}img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}</style></head><body><img alt="Full news image" src="${escape(url)}"></body></html>`;


export default function PublicNewsArticleScreen({ slug, navigation }: { slug: string; navigation: any }) {
  const resource = usePublicResource(navigation, 'news:' + slug, signal => getPublicNewsArticle(slug, signal));
  const article = resource.data;
  return <ContentLayout navigation={navigation} title={article?.title || 'ACTIV News'} subtitle={newsMetadata(article)} art="news" resource={resource}>
    {!!article && <NewsArticleContent article={article} navigation={navigation} />}
  </ContentLayout>;
}

/** The same article presentation for guest, member and legacy website routes. */
export function newsMetadata(article: any): string {
  const published = article?.publishedAt ? new Date(article.publishedAt) : null;
  return [article?.category, published && Number.isFinite(published.getTime()) ? published.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '', article?.location].filter(Boolean).join(' · ');
}
export function NewsArticleContent({ article, navigation }: { article: any; navigation: any }) {
  if (!article) return null;
  return <>
    <Photo url={article.image?.url || article.imageUrl} alt={article.image?.alt || article.title} document closeLabel="Close image" />
    {!!article.summary && <View style={s.summary}><Body value={article.summary} navigation={navigation} /></View>}
    <Body value={article.body} navigation={navigation} />
    {(Array.isArray(article.photos) ? article.photos : []).filter((photo: any) => photo?.url && !photo.isHidden).map((photo: any, i: number) => <Photo key={`${photo.url}-${i}`} url={photo.url} alt={photo.alt || article.title} caption={photo.caption} document closeLabel="Close image" />)}
    <ExtraFields fields={article.extraFields} navigation={navigation} />
    <ActionLink navigation={navigation} href={article.externalUrl} label="Read the original source" />
    <ActionLink navigation={navigation} href="/news" label="All news" />
  </>;
}
const s = StyleSheet.create({ summary: { paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: BRAND.blue } });
