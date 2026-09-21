import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}: ErrorStateProps) {
  const theme = useAppTheme();

  return (
    <Animated.View entering={FadeIn.duration(theme.motion.duration.base)} style={styles.base}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.full },
        ]}
      >
        <Icon name="alert-triangle" size={22} color={theme.colors.error} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" color="textSecondary" style={styles.message}>
        {message}
      </Text>
      {onRetry && (
        <Button label="Try Again" variant="outline" icon="refresh-cw" onPress={onRetry} />
      )}
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
