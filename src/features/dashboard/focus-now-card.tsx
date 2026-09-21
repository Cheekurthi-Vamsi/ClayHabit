import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, GradientCard, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useTodayFocusMinutes } from '../focus/hooks';

export function FocusNowCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: minutes } = useTodayFocusMinutes();
  const focusedToday = minutes ?? 0;

  return (
    <GradientCard
      gradient={theme.gradients.secondary}
      orbs="drift"
      style={style}
      contentStyle={styles.content}
      accessibilityLabel={`Focus. ${focusedToday} minutes focused today.`}
    >
      <Text variant="labelMedium" style={styles.label}>
        ⚡ FOCUS
      </Text>
      <View>
        <Text style={styles.clock}>25:00</Text>
        <Text variant="caption" style={styles.label}>
          {focusedToday > 0 ? `${focusedToday} min today` : 'Ready to focus?'}
        </Text>
      </View>
      <Button
        label="Start"
        icon="play"
        variant="glass"
        size="sm"
        fullWidth
        accessibilityHint="Starts a 25 minute focus session"
        onPress={() => router.push({ pathname: '/focus', params: { autostart: '25' } })}
      />
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    justifyContent: 'space-between',
  },
  label: {
    color: 'rgba(255,255,255,0.92)',
  },
  clock: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
