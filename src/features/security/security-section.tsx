import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { isBiometricAvailable } from '@/lib/security/app-lock-service';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

function SettingRow({
  icon,
  label,
  value,
  onValueChange,
  disabled,
}: {
  icon: 'lock' | 'unlock' | 'shield';
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, disabled ? { opacity: 0.5 } : null]}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={18} color={theme.colors.textSecondary} />
        <Text variant="bodyLarge">{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
        thumbColor={theme.colors.onPrimary}
      />
    </View>
  );
}

export function SecuritySection() {
  const router = useRouter();
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);
  const biometricEnabled = useSettingsStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useSettingsStore((state) => state.setBiometricEnabled);

  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Turning App Lock off needs the current PIN too, so it goes through the PIN flow.
  const handleAppLockChange = (enabled: boolean) => {
    router.push(enabled ? '/security/set-pin' : { pathname: '/security/set-pin', params: { mode: 'disable' } });
  };

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <SettingRow icon="lock" label="App Lock" value={appLockEnabled} onValueChange={handleAppLockChange} />
        <SettingRow
          icon="shield"
          label="Biometric Unlock"
          value={biometricEnabled}
          onValueChange={setBiometricEnabled}
          disabled={!appLockEnabled || !biometricAvailable}
        />
        {appLockEnabled && (
          <Pressable
            onPress={() => router.push('/security/set-pin')}
            accessibilityRole="button"
            accessibilityLabel="Change PIN"
            style={styles.changePinRow}
          >
            <Text variant="bodyMedium" color="primary">
              Change PIN
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/security/change-passcode')}
          accessibilityRole="button"
          accessibilityLabel="Change data passcode"
          accessibilityHint="The passcode that encrypts your data on this phone and in the Cloud"
          style={styles.changePinRow}
        >
          <Text variant="bodyMedium" color="primary">
            Change data passcode
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changePinRow: {
    paddingVertical: 10,
  },
});
