import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import { AccountCard } from '@/features/auth/account-card';
import { useAccount } from '@/features/auth/account-context';
import { authEnabled } from '@/lib/auth/config';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

export function ProfileSection() {
  const theme = useAppTheme();
  const displayName = useSettingsStore((state) => state.displayName);
  const setDisplayName = useSettingsStore((state) => state.setDisplayName);
  const [draft, setDraft] = useState(displayName);
  const account = useAccount();

  return (
    <View style={styles.stack}>
      {authEnabled ? <AccountCard /> : null}
      <Card>
      <View style={styles.row}>
        {account ? null : <Avatar name={draft} size={52} />}
        <View style={styles.field}>
          <Text variant="labelMedium" color="textSecondary">
            YOUR NAME
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={() => setDisplayName(draft)}
            onSubmitEditing={() => setDisplayName(draft)}
            placeholder={account?.firstName ? `${account.firstName} (from your account)` : 'Used in your daily greeting'}
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
            autoCapitalize="words"
            maxLength={40}
            accessibilityLabel="Your name"
            style={[theme.typography.titleMedium, styles.input, { color: theme.colors.textPrimary }]}
          />
        </View>
      </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  field: {
    flex: 1,
    gap: 2,
  },
  input: {
    paddingVertical: 4,
  },
});
