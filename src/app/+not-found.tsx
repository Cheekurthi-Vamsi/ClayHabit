import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

export default function NotFoundScreen() {
  const theme = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge">This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyLarge" color="primary">
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  link: {
    marginTop: 8,
  },
});
