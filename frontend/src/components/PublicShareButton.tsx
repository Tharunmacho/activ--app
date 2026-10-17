import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { publicShareUrl, sharePublicPage } from '../services/contentShare';

export function PublicShareButton({ path, title, label = 'Share', compact = true, style }: {
  path: string; title: string; label?: string; compact?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true), working = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  if (!publicShareUrl(path)) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Share ${title || 'ACTIV'}`}
    accessibilityState={{ disabled: busy }} disabled={busy} hitSlop={4}
    onPress={event => {
      event?.stopPropagation?.();
      if (working.current) return;
      working.current = true; setBusy(true);
      void sharePublicPage({ path, title }).finally(() => {
        working.current = false;
        if (mounted.current) setBusy(false);
      });
    }} style={({ pressed }) => [styles.button, compact && styles.compact, (pressed || busy) && styles.pressed, style]}>
    <View style={compact && styles.iconSurface}><Icon name="share" size={18} color="#1955CF" /></View>
    {!compact && <Text style={styles.label}>{busy ? 'Sharing…' : label}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#CCDDF9', borderRadius: 12, backgroundColor: '#F4F8FF' },
  compact: { width: 44, height: 44, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: 'transparent', flexShrink: 0 },
  iconSurface: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F8FF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#1955CF', flexShrink: 1 },
});
