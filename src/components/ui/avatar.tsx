import * as Haptics from '@/lib/haptics';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

interface AvatarProps {
  name?: string;
  /** Profile photo (e.g. from the signed-in account); initials are the fallback. */
  imageUrl?: string | null;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** The profile photo on its own — or initials / a person glyph when there isn't one. No frame. */
export function Avatar({ name = '', imageUrl, size = 44, onPress, accessibilityLabel }: AvatarProps) {
  const theme = useAppTheme();
  const initials = initialsOf(name);
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel ?? (name ? name : 'Profile')}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={circle} contentFit="cover" transition={150} accessible={false} />
      ) : (
        <View style={[styles.inner, circle, { backgroundColor: theme.colors.primaryMuted }]}>
          {initials ? (
            <Text variant="titleMedium" color="primary" style={{ fontSize: size * 0.36, lineHeight: size * 0.46 }}>
              {initials}
            </Text>
          ) : (
            <Icon name="user" size={size * 0.42} color={theme.colors.primary} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
