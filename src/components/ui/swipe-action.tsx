import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme, type ColorToken } from '@/theme';

import { Icon, type IconName } from './icon';

interface SwipeActionProps {
  icon: IconName;
  color: ColorToken;
  label: string;
  onPress: () => void;
}

export function SwipeAction({ icon, color, label, onPress }: SwipeActionProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, { backgroundColor: theme.colors[color] }]}
    >
      <Icon name={icon} size={18} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
