import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

interface FinanceScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Top-right action, e.g. an edit button. */
  right?: React.ReactNode;
}

/** Back button, title and optional action for finance screens pushed over the tabs. */
export function FinanceScreenHeader({ title, subtitle, right }: FinanceScreenHeaderProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.back}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        {right}
      </View>
      <Text variant="displayMedium" accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" color="textSecondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    gap: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    marginLeft: -10,
  },
});
