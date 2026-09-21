import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Card } from './card';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type BentoSpan = 'half' | 'full';

interface BentoCardProps {
  title: string;
  icon?: IconName;
  span?: BentoSpan;
  onPress?: () => void;
  children: React.ReactNode;
  accentGradient?: readonly [string, string];
  entranceDelay?: number;
  style?: StyleProp<ViewStyle>;
}

export function BentoCard({
  title,
  icon,
  span = 'half',
  onPress,
  children,
  accentGradient,
  entranceDelay = 0,
  style,
}: BentoCardProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(entranceDelay).springify().damping(18)}
      style={[span === 'full' ? styles.full : styles.half, style]}
    >
      <Card onPress={onPress} accessibilityLabel={title} style={styles.cardFill}>
        {accentGradient ? (
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.1, borderRadius: theme.radii.lg }]}
          />
        ) : null}
        <View style={styles.header}>
          {icon ? (
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <Icon name={icon} size={16} color={theme.colors.primary} />
            </View>
          ) : null}
          <Text variant="labelMedium" color="textSecondary">
            {title.toUpperCase()}
          </Text>
        </View>
        <View style={styles.body}>{children}</View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  half: {
    width: '48%',
  },
  full: {
    width: '100%',
  },
  cardFill: {
    minHeight: 120,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
});
