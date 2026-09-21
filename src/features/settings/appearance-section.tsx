import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { useSettingsStore, type ThemePreference } from '@/store/settings-store';

const options: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'smartphone' },
];

export function AppearanceSection() {
  const theme = useAppTheme();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  return (
    <Card>
      <View style={styles.list}>
        {options.map((option) => {
          const selected = option.value === themePreference;
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemePreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={[
                styles.row,
                selected ? { backgroundColor: theme.colors.primaryMuted } : null,
                { borderRadius: theme.radii.sm },
              ]}
            >
              <View style={styles.rowLeft}>
                <Icon
                  name={option.icon}
                  size={18}
                  color={selected ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text
                  variant="bodyLarge"
                  style={{ color: selected ? theme.colors.primary : theme.colors.textPrimary }}
                >
                  {option.label}
                </Text>
              </View>
              {selected ? <Icon name="check" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
