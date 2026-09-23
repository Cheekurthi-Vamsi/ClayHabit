import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Icon, Text } from '@/components/ui';
import { SettingDivider, SettingLink, SettingSwitch } from '@/features/settings/setting-rows';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { useCloud, type CloudStatus } from './cloud-context';

function relative(iso: string | null): string {
  if (!iso) return 'not yet';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_LABEL: Record<CloudStatus, string> = {
  'local-only': 'This phone only',
  syncing: 'Syncing…',
  synced: 'Up to date',
  offline: 'Offline — will sync later',
  error: "Couldn't sync",
  conflict: 'Needs your choice',
};

/** Cloud (Google Drive): connection, sync, the backup key, and how the data is protected. */
export function CloudSettingsSection() {
  const theme = useAppTheme();
  const cloud = useCloud();
  const autoSync = useSettingsStore((state) => state.cloudAutoSync);
  const setAutoSync = useSettingsStore((state) => state.setCloudAutoSync);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  if (cloud.unavailableReason === 'device-only') {
    const turnOn = async () => {
      setSwitching(true);
      try {
        await cloud.setStorageMode('cloud');
      } finally {
        setSwitching(false);
      }
    };
    return (
      <Card>
        <View style={styles.stack}>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryMuted }]}>
              <Icon name="smartphone" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="titleMedium">Saved on this phone only</Text>
              <Text variant="bodySmall" color="textSecondary">
                Nothing is uploaded. If this phone is lost or reset, your data goes with it.
              </Text>
            </View>
          </View>
          <Button
            label="Back up to Google Drive"
            icon="cloud"
            fullWidth
            loading={switching}
            onPress={() =>
              Alert.alert(
                'Back up to Google Drive?',
                "Google will ask to let ClayHabbit use its private app folder in your Drive. Your data is encrypted on this phone before it's uploaded.",
                [
                  { text: 'Not now', style: 'cancel' },
                  { text: 'Continue', onPress: () => void turnOn() },
                ],
              )
            }
          />
        </View>
      </Card>
    );
  }

  if (!cloud.enabled) {
    return (
      <Card>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: theme.colors.warningMuted }]}>
            <Icon name="cloud-off" size={18} color={theme.colors.warning} />
          </View>
          <View style={styles.flex}>
            <Text variant="titleMedium">Cloud is off in this build</Text>
            <Text variant="bodySmall" color="textSecondary">
              {cloud.unavailableReason === 'needs-dev-build'
                ? "Google Drive sign-in needs the ClayHabbit app build — Expo Go can't do it. For now your data stays on this phone."
                : "Google Drive sign-in hasn't been set up for this build yet, so your data stays on this phone."}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  const tone =
    cloud.status === 'synced'
      ? { color: theme.colors.success, muted: theme.colors.successMuted, icon: 'check-circle' as const }
      : cloud.status === 'syncing'
        ? { color: theme.colors.primary, muted: theme.colors.primaryMuted, icon: 'refresh-cw' as const }
        : cloud.status === 'offline'
          ? { color: theme.colors.warning, muted: theme.colors.warningMuted, icon: 'wifi-off' as const }
          : { color: theme.colors.error, muted: theme.colors.errorMuted, icon: 'alert-triangle' as const };

  const reveal = async () => {
    if (revealed) {
      setRevealed(null);
      return;
    }
    Alert.alert(
      'Show backup key?',
      'Anyone with this key and access to your Google Drive can read your ClayHabbit data. Keep it somewhere private, like a password manager.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Show key', onPress: async () => setRevealed(await cloud.revealBackupKey()) },
      ],
    );
  };

  const switchAccount = () =>
    Alert.alert(
      'Switch Google account?',
      "Your data stays on this phone. You'll connect a Google account again before continuing.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => void cloud.switchGoogleAccount() },
      ],
    );

  return (
    <Card>
      <View style={styles.stack}>
        <View style={styles.row}>
          {cloud.account ? (
            <Avatar name={cloud.account.name ?? cloud.account.email} imageUrl={cloud.account.photo} size={44} />
          ) : (
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryMuted }]}>
              <Icon name="cloud" size={18} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.flex}>
            <Text variant="titleMedium">Google Drive</Text>
            <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {cloud.account?.email ?? 'Reconnecting when online'}
            </Text>
          </View>
        </View>

        <View style={[styles.status, { backgroundColor: tone.muted, borderRadius: theme.radii.md }]}>
          <Icon name={tone.icon} size={16} color={tone.color} />
          <View style={styles.flex}>
            <Text variant="labelLarge">{STATUS_LABEL[cloud.status]}</Text>
            <Text variant="caption" color="textSecondary">
              {cloud.status === 'error' || cloud.status === 'offline'
                ? cloud.error
                : `Last saved ${relative(cloud.lastSyncedAt)}`}
            </Text>
          </View>
        </View>

        {cloud.status === 'conflict' ? (
          <View style={styles.stackTight}>
            <Text variant="bodySmall" color="textSecondary">
              This phone and your Cloud were both changed
              {cloud.conflict?.device ? ` (the Cloud copy came from ${cloud.conflict.device})` : ''}. Pick the version to
              keep; the other is replaced.
            </Text>
            <Button label="Use Cloud copy" icon="download-cloud" size="sm" onPress={() => void cloud.resolveConflict('remote')} />
            <Button
              label="Keep this phone's data"
              variant="outline"
              size="sm"
              onPress={() =>
                Alert.alert('Replace your Cloud copy?', "The Cloud copy is replaced with this phone's data.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Replace', style: 'destructive', onPress: () => void cloud.resolveConflict('local') },
                ])
              }
            />
          </View>
        ) : (
          <Button
            label="Sync now"
            icon="refresh-cw"
            variant="outline"
            size="sm"
            loading={cloud.status === 'syncing'}
            onPress={() => void cloud.syncNow()}
          />
        )}

        <SettingDivider />
        <SettingSwitch
          icon="zap"
          label="Sync as you go"
          hint="Saves a few seconds after each change. Off: only when you open or leave the app."
          value={autoSync}
          onValueChange={setAutoSync}
        />
        <SettingDivider />
        <SettingLink
          icon="key"
          label={revealed ? 'Hide backup key' : 'Show backup key'}
          hint="Your key is kept with your account. This copy is a spare, in case you ever need it."
          onPress={reveal}
        />
        {revealed ? (
          <View style={[styles.keyBox, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
            <Text variant="labelLarge" selectable style={styles.keyText}>
              {revealed}
            </Text>
            <Button
              label="Copy"
              icon="copy"
              variant="ghost"
              size="sm"
              onPress={async () => {
                await Clipboard.setStringAsync(revealed);
                Alert.alert('Copied', 'Paste it somewhere private, then clear your clipboard.');
              }}
            />
          </View>
        ) : null}
        <SettingDivider />
        <SettingLink icon="repeat" label="Switch Google account" onPress={switchAccount} />
        <SettingDivider />
        <SettingLink
          icon="smartphone"
          label="Stop Cloud backup"
          hint="Keeps everything on this phone and stops syncing. Your Drive copy stays until you delete it."
          onPress={() =>
            Alert.alert(
              'Keep data on this phone only?',
              "ClayHabbit saves one last time, then stops syncing and gives back its Google Drive permission. The encrypted copy already in your Drive isn't deleted.",
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Stop backup', style: 'destructive', onPress: () => void cloud.setStorageMode('device') },
              ],
            )
          }
        />

        <View style={[styles.info, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <Icon name="shield" size={14} color={theme.colors.textSecondary} />
          <Text variant="caption" color="textSecondary" style={styles.flex}>
            Encrypted on this phone with AES-256-GCM before upload, checked with SHA-256 on the way back. Stored in
            your Drive&apos;s private app folder, which only ClayHabbit can open.
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  stackTight: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  keyBox: {
    padding: 12,
    gap: 6,
  },
  keyText: {
    letterSpacing: 0.5,
  },
  info: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
