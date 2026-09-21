import { useState } from 'react';
import { useAuth } from '@clerk/expo';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Icon, Text } from '@/components/ui';
import { forgetLastUser } from '@/lib/auth/account-database';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { useAccount } from './account-context';

/** Who's signed in, and the way out. Only rendered when Clerk is configured. */
export function AccountCard() {
  const theme = useAppTheme();
  const account = useAccount();
  const { signOut } = useAuth();
  const displayName = useSettingsStore((state) => state.displayName);
  const [signingOut, setSigningOut] = useState(false);

  if (!account) return null;
  const name = account.fullName || displayName || account.email || 'Your account';

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out?',
      'Your data stays safely on this device and comes back when you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              await forgetLastUser();
            } catch {
              setSigningOut(false);
              Alert.alert("Couldn't sign out", 'Check your connection and try again.');
            }
          },
        },
      ],
    );

  return (
    <Card>
      <View style={styles.stack}>
        <View style={styles.row}>
          <Avatar name={name} imageUrl={account.imageUrl} size={52} />
          <View style={styles.text}>
            <Text variant="titleMedium" numberOfLines={1}>
              {name}
            </Text>
            {account.email && account.email !== name ? (
              <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
                {account.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.status, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <Icon
            name={account.offline ? 'wifi-off' : 'shield'}
            size={14}
            color={account.offline ? theme.colors.warning : theme.colors.success}
          />
          <Text variant="caption" color="textSecondary" style={styles.flex}>
            {account.offline
              ? "Offline — using your saved session. Everything still works on this device."
              : 'Signed in. Your data is kept separate from anyone else who uses this device.'}
          </Text>
        </View>

        <Button label="Sign out" icon="log-out" variant="outline" size="sm" loading={signingOut} onPress={confirmSignOut} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  flex: {
    flex: 1,
  },
});
