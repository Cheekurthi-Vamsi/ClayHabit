import { StyleSheet, View } from 'react-native';

import { useAppTheme, type ColorToken } from '@/theme';

import { Text } from './text';

interface BadgeProps {
  label: string;
  color?: ColorToken;
  dot?: boolean;
}

export function Badge({ label, color = 'textSecondary', dot = true }: BadgeProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.base}>
      {dot ? (
        <View style={[styles.dot, { backgroundColor: theme.colors[color] }]} />
      ) : null}
      <Text variant="labelMedium" style={{ color: theme.colors[color] }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
