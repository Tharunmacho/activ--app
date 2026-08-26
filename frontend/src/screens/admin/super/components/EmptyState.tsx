import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SUPER, ACCENTS } from '../superTheme';

interface Props {
  title: string;
  caption?: string;
  /** Main glyph inside the badge. Defaults to the clipboard. */
  icon?: string;
  /** Small glyph clipped to the badge's corner. Defaults to the magnifier. */
  accentIcon?: string;
  tone?: 'default' | 'error';
}

/**
 * The illustrated empty state: a tinted disc holding a clipboard, with a
 * magnifying glass tucked into its corner.
 *
 * Composed from vector glyphs rather than a bitmap so it stays crisp at every
 * density and adds no asset weight.
 */
const EmptyState: React.FC<Props> = ({
  title,
  caption,
  icon = 'assignment',
  accentIcon = 'search',
  tone = 'default',
}) => {
  const isError = tone === 'error';
  const discColor = isError ? ACCENTS.lightRed : ACCENTS.lightPurple;
  const glyphColor = isError ? ACCENTS.red : ACCENTS.purple;

  return (
    <View style={styles.wrapper}>
      <View style={styles.illustration}>
        <View style={[styles.disc, { backgroundColor: discColor }]}>
          <Icon name={icon} size={44} color={glyphColor} />
        </View>
        <View style={[styles.accentBubble, { borderColor: SUPER.bg }]}>
          <Icon name={accentIcon} size={18} color={glyphColor} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 32 },
  illustration: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  disc: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  accentBubble: {
    position: 'absolute', right: 2, bottom: 6,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF', borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  title: {
    marginTop: 20, fontSize: 16, fontWeight: '700',
    color: SUPER.text, textAlign: 'center',
  },
  caption: {
    marginTop: 6, fontSize: 13, color: SUPER.textMuted,
    textAlign: 'center', lineHeight: 19,
  },
});

export default EmptyState;
