import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme } from './AppTheme';

/** One action showing the appearance that will be enabled when tapped. */
export function AppearanceToggle({ glass = false }: { glass?: boolean }) {
  const { isDark, setPreference, palette, storageError } = useAppTheme();
  const next = isDark ? 'light' : 'dark';
  return <View style={{ flexShrink: 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Use ${next} appearance`}
      onPress={() => setPreference(next)}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: glass ? 'rgba(255,255,255,0.25)' : palette.border,
        backgroundColor: glass ? 'rgba(255,255,255,0.12)' : palette.field, opacity: pressed ? 0.75 : 1 })}>
      <Icon name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={glass ? '#FFFFFF' : palette.primaryDark} />
    </Pressable>
    {storageError ? <Text accessibilityRole="alert" style={{ maxWidth: 200, color: glass ? '#FFFFFF' : palette.dangerText, fontSize: 11 }}>{storageError}</Text> : null}
  </View>;
}
