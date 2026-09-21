import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({ label, icon, selected = false, onPress }: ChipProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.95 });

  const backgroundColor = selected ? theme.colors.primaryMuted : theme.colors.surfaceMuted;
  const textColor = selected ? theme.colors.primary : theme.colors.textSecondary;

  const Wrapper = onPress ? AnimatedPressable : Animated.View;

  return (
    <Wrapper
      onPress={onPress}
      onPressIn={onPress ? onPressIn : undefined}
      onPressOut={onPress ? onPressOut : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={label}
      style={[
        styles.base,
        { backgroundColor, borderRadius: theme.radii.full },
        onPress ? animatedStyle : null,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={textColor} /> : null}
      <Text variant="labelMedium" style={{ color: textColor }}>
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
});
