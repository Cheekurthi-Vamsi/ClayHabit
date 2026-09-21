import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <Animated.View entering={FadeIn.duration(theme.motion.duration.base)} style={styles.base}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.full },
        ]}
      >
        <Icon name={icon} size={22} color={theme.colors.textTertiary} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text variant="bodyMedium" color="textSecondary" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
