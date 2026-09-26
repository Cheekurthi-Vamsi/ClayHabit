import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import * as dataRepository from '@/data/repositories/data-repository';
import { useCloud } from '@/features/cloud/cloud-context';
import { offerUpdate } from '@/features/updates/update-prompt';
import { cancelAllReminders } from '@/lib/notifications/notification-service';
import { checkForUpdate } from '@/lib/updates/update-check';
import {
  FOCUS_LENGTHS,
  useSettingsStore,
  type NotePaper,
  type NoteTextSize,
} from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { SettingChoice, SettingDivider, SettingLink, SettingSwitch } from './setting-rows';

/** Motion and touch feedback. */
export function FeelSection() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const haptics = useSettingsStore((state) => state.hapticsEnabled);
  const setHaptics = useSettingsStore((state) => state.setHapticsEnabled);
  const use24Hour = useSettingsStore((state) => state.use24HourClock);
  const setUse24Hour = useSettingsStore((state) => state.setUse24HourClock);

  return (
    <Card>
      <SettingSwitch
        icon="wind"
        label="Reduce animations"
        hint="Skips entrance and chart animations. Your phone's own setting also turns this on."
        value={reduceMotion}
        onValueChange={setReduceMotion}
      />
      <SettingDivider />
      <SettingSwitch
        icon="smartphone"
        label="Haptic feedback"
        hint="A light tap when you check things off, switch tabs or scrub charts."
        value={haptics}
        onValueChange={setHaptics}
      />
      <SettingDivider />
      <SettingSwitch
        icon="clock"
        label="24-hour time"
        hint="Show and type times like 21:30 instead of 9:30 PM. Reminders can be set to any minute either way."
        value={use24Hour}
        onValueChange={setUse24Hour}
      />
    </Card>
  );
}

const PAPER_OPTIONS: readonly { value: NotePaper; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'lines', label: 'Lines' },
  { value: 'dots', label: 'Dots' },
  { value: 'plain', label: 'Plain' },
];

const SIZE_OPTIONS: readonly { value: NoteTextSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export function NotesPreferencesSection() {
  const paper = useSettingsStore((state) => state.notePaper);
  const setPaper = useSettingsStore((state) => state.setNotePaper);
  const size = useSettingsStore((state) => state.noteTextSize);
  const setSize = useSettingsStore((state) => state.setNoteTextSize);
  const preview = useSettingsStore((state) => state.notesOpenInPreview);
  const setPreview = useSettingsStore((state) => state.setNotesOpenInPreview);
  const hidePreviews = useSettingsStore((state) => state.notesHidePreviews);
  const setHidePreviews = useSettingsStore((state) => state.setNotesHidePreviews);

  return (
    <Card>
      <SettingChoice
        icon="grid"
        label="Paper for new notes"
        hint="Each note can still pick its own."
        options={PAPER_OPTIONS}
        value={paper}
        onChange={setPaper}
      />
      <SettingDivider />
      <SettingChoice icon="type" label="Text size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
      <SettingDivider />
      <SettingSwitch
        icon="book-open"
        label="Open notes to read"
        hint="Shows formatting, colours and tickable checklists. Tap the text to edit."
        value={preview}
        onValueChange={setPreview}
      />
      <SettingDivider />
      <SettingSwitch
        icon="eye-off"
        label="Hide note previews"
        hint="Privacy mode: lists show only titles, with the text blurred out. Handy in public."
        value={hidePreviews}
        onValueChange={setHidePreviews}
      />
    </Card>
  );
}

const FOCUS_OPTIONS = FOCUS_LENGTHS.map((minutes) => ({ value: String(minutes), label: `${minutes}m` }));

export function FocusPreferencesSection() {
  const minutes = useSettingsStore((state) => state.defaultFocusMinutes);
  const setMinutes = useSettingsStore((state) => state.setDefaultFocusMinutes);

  return (
    <Card>
      <SettingChoice
        icon="clock"
        label="Focus session length"
        hint="Where the Focus timer starts. You can still change it before each session."
        options={FOCUS_OPTIONS}
        value={String(minutes)}
        onChange={(value) => setMinutes(Number(value))}
      />
    </Card>
  );
}

const DATA_SUMMARY_KEY = ['data-summary'] as const;

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="titleLarge">{value ?? '–'}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/** What's stored, and the way to wipe it. */
export function DataSection() {
  const theme = useAppTheme();
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const cloud = useCloud();
  const { data: summary } = useQuery({
    queryKey: DATA_SUMMARY_KEY,
    queryFn: () => dataRepository.summarize(db),
    // Always current when Settings opens.
    staleTime: 0,
  });

  const erase = useMutation({
    mutationFn: async () => {
      await dataRepository.eraseAll(db);
      await cancelAllReminders();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      if (cloud.enabled) await cloud.syncNow();
      Alert.alert('All data erased', cloud.enabled ? 'This phone and your Cloud copy are now empty.' : 'This phone is now empty.');
    },
    onError: () => Alert.alert("Couldn't erase your data", 'Nothing was deleted. Please try again.'),
  });

  const confirmErase = () =>
    Alert.alert(
      'Erase all data?',
      `Every task, note, habit, goal, event and transaction will be deleted${
        cloud.enabled ? ' — on this phone and in your Cloud' : ''
      }. Settings are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('This can’t be undone', 'Erase everything now?', [
              { text: 'Keep my data', style: 'cancel' },
              { text: 'Erase everything', style: 'destructive', onPress: () => erase.mutate() },
            ]),
        },
      ],
    );

  return (
    <Card>
      <View style={[styles.stats, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <Stat value={summary?.tasks} label="Tasks" />
        <Stat value={summary?.notes} label="Notes" />
        <Stat value={summary?.habits} label="Habits" />
        <Stat value={summary?.transactions} label="Money" />
      </View>
      <View style={styles.storage}>
        <Icon name={cloud.enabled ? 'cloud' : 'smartphone'} size={14} color={theme.colors.textSecondary} />
        <Text variant="caption" color="textSecondary" style={styles.flex}>
          {cloud.enabled
            ? 'Stored in your Cloud (Google Drive), with a working copy on this phone so everything opens instantly and works offline.'
            : 'Stored on this phone.'}
        </Text>
      </View>
      <SettingDivider />
      <SettingLink
        icon="trash-2"
        label={erase.isPending ? 'Erasing…' : 'Erase all data'}
        hint="Start again from an empty app."
        destructive
        onPress={confirmErase}
      />
    </Card>
  );
}

function environmentLabel(): string {
  switch (Constants.executionEnvironment) {
    case ExecutionEnvironment.StoreClient:
      return 'Expo Go';
    case ExecutionEnvironment.Bare:
      return 'Development build';
    default:
      return 'App build';
  }
}

export function AboutSection() {
  const theme = useAppTheme();
  const cloud = useCloud();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [checking, setChecking] = useState(false);

  const checkNow = async () => {
    setChecking(true);
    try {
      const update = await checkForUpdate({ force: true });
      if (update) offerUpdate(update);
      else Alert.alert('You’re up to date', `ClayHabbit ${version} is the newest version.`);
    } catch {
      Alert.alert('Couldn’t check for updates', 'Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  const rows: { label: string; value: string }[] = [
    { label: 'Version', value: version },
    { label: 'Build', value: environmentLabel() },
    {
      label: 'Cloud',
      value: cloud.enabled ? 'Google Drive' : cloud.storageMode === 'device' ? 'This phone only' : 'Off in this build',
    },
    { label: 'Encryption', value: 'AES-256-GCM · SHA-256' },
  ];

  return (
    <Card>
      <View style={styles.aboutHead}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radii.md }]}>
          <Icon name="check" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text variant="titleMedium">ClayHabbit</Text>
          <Text variant="caption" color="textSecondary">
            Your day and your money, in one calm place.
          </Text>
        </View>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.aboutRow}>
          <Text variant="bodyMedium" color="textSecondary">
            {row.label}
          </Text>
          <Text variant="labelLarge">{row.value}</Text>
        </View>
      ))}
      <Button
        label={checking ? 'Checking…' : 'Check for updates'}
        icon="download"
        variant="outline"
        size="sm"
        fullWidth
        loading={checking}
        onPress={() => void checkNow()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 12,
    marginBottom: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  storage: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  aboutHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
