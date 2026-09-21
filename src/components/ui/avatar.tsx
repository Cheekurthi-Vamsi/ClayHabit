import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Initials (or a person glyph) inside a signature-gradient ring. */
export function Avatar({ name = '', imageUrl, size = 44, onPress, accessibilityLabel }: AvatarProps) {
  const theme = useAppTheme();
  const initials = initialsOf(name);
  const ring = 2.5;

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
    >
      <LinearGradient
        colors={theme.gradients.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, padding: ring }}
      >
        <View
          style={[
            styles.inner,
            { borderRadius: (size - ring * 2) / 2, backgroundColor: theme.colors.surface },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: size - ring * 2, height: size - ring * 2, borderRadius: (size - ring * 2) / 2 }}
              contentFit="cover"
              transition={150}
              accessible={false}
            />
          ) : initials ? (
            <Text variant="titleMedium" color="primary">
              {initials}
            </Text>
          ) : (
            <Icon name="user" size={size * 0.42} color={theme.colors.primary} />
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
