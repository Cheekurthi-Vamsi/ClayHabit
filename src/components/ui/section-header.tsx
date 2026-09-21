import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel = 'See all', onAction }: SectionHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Text variant="labelLarge" color="textSecondary" accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={styles.action}
        >
          <Text variant="labelLarge" color="primary">
            {actionLabel}
          </Text>
          <Icon name="arrow-right" size={14} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
