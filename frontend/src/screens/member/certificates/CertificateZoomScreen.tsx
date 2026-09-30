import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaxCertificateView } from './CertificateViews';

/**
 * The 80G certificate, full screen — the SAME A4 page (CertificateViews'
 * `TaxCertificateView`) at up to 3x, so it can be read without printing.
 *
 * A dedicated Stack screen, not a <Modal>: the certificate is opened from
 * screens that can sit under the member tabs (CLAUDE.md Rule 2).
 *
 *   Fit / 2x / 3x   re-lays the page out wider and pans it in both directions
 *                   (vertical ScrollView around a horizontal one) — works on
 *                   both platforms with no native dependency.
 *   pinch (iOS)     the outer ScrollView also zooms natively up to 3x.
 *   tap the page    steps to the next zoom level.
 *
 * Params: { cert, stamp?, receiptColumn?, amountInWords? } — exactly the
 * props the calling screen drew the page with, so the zoom is the same page.
 */

const ZOOMS = [1, 2, 3];
const GUTTER = 12;
const BG = '#0B1330';

const CertificateZoomScreen = ({ navigation, route }: any) => {
  const params = route?.params || {};
  const cert = params?.cert || null;
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);

  const fitW = Math.max(200, Math.round(Number(winW || 0) - GUTTER * 2));
  const pageW = fitW * zoom;

  const close = () => {
    try {
      if (navigation?.canGoBack?.()) navigation.goBack();
    } catch (err) {
      console.warn('Certificate zoom close safely caught:', err);
    }
  };
  const nextZoom = () => setZoom((z) => ZOOMS[(ZOOMS.indexOf(z) + 1) % ZOOMS.length] || 1);

  return (
    <View style={[s.root, { paddingTop: Number(insets?.top || 0) }]}>
      <StatusBar barStyle="light-content" />
      <View style={s.bar}>
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={s.iconBtn}>
          <Icon name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={s.titleCol}>
          <Text style={s.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>Tax exemption certificate</Text>
          <Text style={s.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>A4 · 210 × 297 mm</Text>
        </View>
        <View style={s.zooms} accessibilityRole="radiogroup">
          {ZOOMS.map((z) => {
            const on = z === zoom;
            return (
              <Pressable
                key={z}
                onPress={() => setZoom(z)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={z === 1 ? 'Fit to screen' : `Zoom ${z} times`}
                style={[s.zoomBtn, on && s.zoomBtnOn]}
              >
                <Text style={[s.zoomText, on && s.zoomTextOn]} maxFontSizeMultiplier={1.2}>{z === 1 ? 'Fit' : `${z}×`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {cert ? (
        <ScrollView
          style={s.flex}
          contentContainerStyle={{ padding: GUTTER, paddingBottom: GUTTER + Number(insets?.bottom || 0) }}
          maximumZoomScale={Platform.OS === 'ios' ? 3 : undefined}
          minimumZoomScale={1}
          bouncesZoom
          pinchGestureEnabled
          nestedScrollEnabled
          showsVerticalScrollIndicator={zoom > 1}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            scrollEnabled={zoom > 1}
            showsHorizontalScrollIndicator={zoom > 1}
          >
            <TaxCertificateView
              cert={cert}
              stamp={String(params?.stamp || '')}
              receiptColumn={params?.receiptColumn === true}
              amountInWords={String(params?.amountInWords || '')}
              width={pageW}
              onPress={nextZoom}
            />
          </ScrollView>
          <Text style={s.help} maxFontSizeMultiplier={1.3}>
            {Platform.OS === 'ios' ? 'Pinch or tap the page to zoom · drag to move around' : 'Tap the page to zoom · drag to move around'}
          </Text>
        </ScrollView>
      ) : (
        <View style={s.empty}>
          <Icon name="description" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={s.emptyText}>This certificate is not available. Go back and open it again.</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  titleCol: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  zooms: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: 3 },
  zoomBtn: { minWidth: 40, height: 32, paddingHorizontal: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  zoomBtnOn: { backgroundColor: '#FFFFFF' },
  zoomText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  zoomTextOn: { color: BG },
  help: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textAlign: 'center', marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' },
});

export default CertificateZoomScreen;
