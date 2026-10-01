import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * ============================================================================
 * FitImage — an UPLOADED image, shown whole, in any frame
 * ============================================================================
 *
 * People upload whatever shape they have: a wide web banner, a square poster,
 * a portrait phone photo. A fixed box with `resizeMode="cover"` zooms and
 * crops every one of those that does not match it — the "banner not fitted"
 * problem. This never crops and never stretches:
 *
 *   mode="auto"   (hero banners) the frame TAKES THE IMAGE'S OWN SHAPE —
 *                 its real width:height, held between `minRatio` and
 *                 `maxRatio` so a freak upload cannot make the frame a
 *                 sliver or a tower.
 *   mode="frame"  (cards, grids, thumbnails) the frame keeps the size `style`
 *                 gives it, so a grid stays aligned.
 *
 * In both, the whole picture is drawn with `contain`, and whatever space its
 * shape leaves is filled with a soft, blurred copy of the same picture — not
 * grey bars. `fit="cover"` is the opt-out for an image the editor explicitly
 * chose to fill its frame (events carry `media.fit`).
 *
 * Avatars and logos are NOT this: a face or a mark cropped to a circle is
 * correct. Use this for content people upload to be looked at.
 */

export interface FitImageProps {
  uri?: string | null;
  mode?: 'auto' | 'frame';
  /** 'contain' (default): the whole image. 'cover': fill the frame, cropping. */
  fit?: 'contain' | 'cover';
  /** width / height bounds for mode="auto". Defaults suit a banner on a phone. */
  minRatio?: number;
  maxRatio?: number;
  /** The frame. For mode="auto" give it a width (or let it stretch); height is computed. */
  style?: StyleProp<ViewStyle>;
  /** Rounded corners etc. — applied to the clipping frame. */
  borderRadius?: number;
  accessibilityLabel?: string;
  onError?: () => void;
  /** Shown when there is no image, or it fails to load. */
  fallback?: React.ReactNode;
  /** Drawn over the image (a shade, a "Change cover" chip). Also over the fallback. */
  children?: React.ReactNode;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function FitImage({
  uri,
  mode = 'frame',
  fit = 'contain',
  minRatio = 1.2,
  maxRatio = 3.2,
  style,
  borderRadius = 0,
  accessibilityLabel,
  onError,
  fallback = null,
  children = null,
}: FitImageProps) {
  const src = typeof uri === 'string' ? uri.trim() : '';
  const [failed, setFailed] = useState(false);
  // The image's own width:height, once known. Until then a sensible banner shape.
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    setFailed(false);
    setRatio(null);
    if (!src || mode !== 'auto') return undefined;
    let alive = true;
    try {
      if (typeof Image.getSize === 'function') {
        Image.getSize(
          src,
          (w, h) => { if (alive && Number(w) > 0 && Number(h) > 0) setRatio(Number(w) / Number(h)); },
          () => { /* the <Image> below reports the failure */ },
        );
      }
    } catch (err) {
      console.warn('Image size safely caught:', err);
    }
    return () => { alive = false; };
  }, [src, mode]);

  const frameStyle: StyleProp<ViewStyle> = [
    s.frame,
    borderRadius ? { borderRadius } : null,
    mode === 'auto' ? { aspectRatio: clamp(ratio || 16 / 9, minRatio, maxRatio) } : null,
    style,
  ];

  if (!src || failed) {
    return <View style={frameStyle}>{fallback}{children}</View>;
  }

  const fail = () => { setFailed(true); onError?.(); };

  return (
    <View style={frameStyle} accessible={!!accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel}>
      {fit === 'contain' ? (
        // The fill behind: the same picture, blurred and dimmed, so the space a
        // shape leaves reads as part of the image rather than as empty bars.
        <>
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={18} accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFill, s.dim]} />
        </>
      ) : null}
      <Image
        source={{ uri: src }}
        style={StyleSheet.absoluteFill}
        resizeMode={fit === 'cover' ? 'cover' : 'contain'}
        onError={fail}
        accessibilityIgnoresInvertColors
      />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: '#0F172A' },
  dim: { backgroundColor: 'rgba(15,23,42,0.28)' },
});

export default FitImage;
