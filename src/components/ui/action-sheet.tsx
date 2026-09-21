import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { BottomSheet } from './bottom-sheet';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface SheetAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
}

export function ActionSheet({ visible, onClose, title, subtitle, actions }: ActionSheetProps) {
  const theme = useAppTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {(close) => (
        <View style={[styles.group, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.lg }]}>
          {actions.map((action, index) => {
            const tint = action.destructive ? theme.colors.error : theme.colors.textPrimary;
            return (
              <Pressable
                key={action.label}
                onPress={() => close(action.onPress)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  pressed && { backgroundColor: theme.colors.surfacePressed },
                ]}
              >
                <Icon name={action.icon} size={18} color={tint} />
                <Text variant="bodyLarge" style={{ color: tint }}>
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
});
