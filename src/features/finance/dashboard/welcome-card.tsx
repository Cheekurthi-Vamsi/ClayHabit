import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, GradientCard, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

/** First run: nothing recorded and no starting balance yet. */
export function WelcomeCard() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <GradientCard gradient={theme.gradients.finance} orbs="glow" contentStyle={styles.content}>
      <Text variant="labelMedium" style={styles.whiteMuted}>
        FINANCIAL MANAGEMENT
      </Text>
      <Text variant="displayMedium" style={styles.white}>
        Your financial story starts here.
      </Text>
      <Text variant="bodyMedium" style={styles.whiteMuted}>
        Add your first expense or income and ClayHabit keeps the balance for you, privately, on this device.
      </Text>
      <View style={styles.actions}>
        <Button
          label="Add expense"
          icon="minus-circle"
          variant="glass"
          size="sm"
          onPress={() => router.push('/modal/transaction')}
        />
        <Button
          label="Add income"
          icon="plus-circle"
          variant="glass"
          size="sm"
          onPress={() => router.push({ pathname: '/modal/transaction', params: { type: 'income' } })}
        />
      </View>
      <Pressable
        onPress={() => router.push('/modal/starting-balance')}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.link}
      >
        <Text variant="labelLarge" style={styles.white}>
          Already have money set aside? Set a starting balance →
        </Text>
      </Pressable>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingVertical: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  link: {
    marginTop: 4,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
