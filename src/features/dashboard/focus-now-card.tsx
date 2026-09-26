import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, GradientCard, Text } from '@/components/ui';
import { useSettingsStore } from '@/store/settings-store';
import { fontFamily, useAppTheme } from '@/theme';

import { useTodayFocusMinutes } from '../focus/hooks';

/** A dark card with the default focus length and a Start button that starts it straight away. */
export function FocusNowCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const router = useRouter();
  const defaultMinutes = useSettingsStore((state) => state.defaultFocusMinutes);
  const { data: minutes } = useTodayFocusMinutes();
  const focusedToday = minutes ?? 0;

  return (
    <GradientCard
      gradient={[theme.colors.panel, theme.colors.panelMuted]}
      orbs={false}
      style={style}
      contentStyle={styles.content}
      accessibilityLabel={`Focus. ${focusedToday} minutes focused today.`}
    >
      <Text variant="labelMedium" style={{ color: theme.colors.onPanelMuted }}>
        ⚡ FOCUS
      </Text>
      <View>
        <Text style={[styles.clock, { color: theme.colors.highlight }]}>
          {String(defaultMinutes).padStart(2, '0')}:00
        </Text>
        <Text variant="caption" style={{ color: theme.colors.onPanelMuted }}>
          {focusedToday > 0 ? `${focusedToday} min today` : 'Ready to focus?'}
        </Text>
      </View>
      <Button
        label="Start"
        icon="play"
        variant="glass"
        size="sm"
        fullWidth
        accessibilityHint={`Starts a ${defaultMinutes} minute focus session`}
        onPress={() => router.push({ pathname: '/focus', params: { autostart: String(defaultMinutes) } })}
      />
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    justifyContent: 'space-between',
  },
  clock: {
    fontFamily: fontFamily.extraBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
