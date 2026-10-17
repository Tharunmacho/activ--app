import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { publicShareUrl, sharePublicPage } from '../services/contentShare';

export function PublicShareButton({ path, title, label = 'Share', compact = false, style }: {
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
    <Icon name="share" size={20} color="#1955CF" />
    {!compact && <Text style={styles.label}>{busy ? 'Sharing…' : label}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#CCDDF9', borderRadius: 12, backgroundColor: '#F4F8FF' },
  compact: { paddingHorizontal: 10 }, pressed: { opacity: 0.65 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#1955CF', flexShrink: 1 },
});
