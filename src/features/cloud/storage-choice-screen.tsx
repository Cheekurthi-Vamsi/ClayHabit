import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from '@/lib/haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, type IconName } from '@/components/ui';
import { FloatingLogo, Rise, SoftBackdrop, useSelectionSpring } from '@/features/auth/auth-visuals';
import { useAccount } from '@/features/auth/account-context';
import type { StorageMode } from '@/lib/storage/storage-mode';
import { fontFamily, useAppTheme } from '@/theme';

interface Option {
  mode: StorageMode;
  icon: IconName;
  title: string;
  badge?: string;
  summary: string;
  points: { icon: IconName; text: string }[];
}

const OPTIONS: Option[] = [
  {
    mode: 'cloud',
    icon: 'cloud',
    title: 'Save to my Google Drive',
    badge: 'Recommended',
    summary: 'An encrypted copy follows you to every phone you sign in to.',
    points: [
      { icon: 'lock', text: 'Encrypted on this phone (AES-256) before upload' },
      { icon: 'eye-off', text: "Private app folder — ClayHabbit can't see your other files" },
      { icon: 'refresh-cw', text: 'Syncs in the background, works offline' },
    ],
  },
  {
    mode: 'device',
    icon: 'smartphone',
    title: 'Keep it on this phone',
    summary: 'Nothing leaves this device. You can turn on Cloud later in Settings.',
    points: [
      { icon: 'wifi-off', text: 'Fully offline, no Google Drive access asked' },
      { icon: 'alert-circle', text: 'Lost or reset phone means lost data' },
    ],
  },
];

function OptionCard({ option, selected, onSelect }: { option: Option; selected: boolean; onSelect: () => void }) {
  const theme = useAppTheme();
  const progress = useSelectionSpring(selected);

  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [theme.colors.border, theme.colors.primary]),
    transform: [{ scale: 0.98 + progress.value * 0.02 }],
  }));
  const check = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.title}. ${option.summary}`}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.radii.lg },
          ring,
        ]}
      >
        <View style={styles.cardHead}>
          <View
            style={[
              styles.cardIcon,
              { backgroundColor: selected ? theme.colors.primary : theme.colors.primaryMuted },
            ]}
          >
            <Icon name={option.icon} size={20} color={selected ? '#FFFFFF' : theme.colors.primary} />
          </View>
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium">{option.title}</Text>
              {option.badge ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.successMuted }]}>
                  <Text variant="caption" style={{ color: theme.colors.success, fontFamily: fontFamily.bold }}>
                    {option.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="bodySmall" color="textSecondary">
              {option.summary}
            </Text>
          </View>
          <View style={[styles.radio, { borderColor: selected ? theme.colors.primary : theme.colors.borderStrong }]}>
            <Animated.View style={[styles.radioDot, { backgroundColor: theme.colors.primary }, check]} />
          </View>
        </View>
        <View style={styles.points}>
          {option.points.map((point) => (
            <View key={point.text} style={styles.point}>
              <Icon name={point.icon} size={14} color={theme.colors.textSecondary} />
              <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                {point.text}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Shown once per account, right after the first sign-in: keep data in the
 * person's Google Drive (encrypted) or only on this phone.
 */
export function StorageChoiceScreen({ onChoose }: { onChoose: (mode: StorageMode) => Promise<void> }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const [selected, setSelected] = useState<StorageMode>('cloud');
  const [busy, setBusy] = useState(false);

  const firstName = account?.firstName ?? account?.fullName?.split(' ')[0] ?? null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onChoose(selected);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SoftBackdrop />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
      >
        <Rise order={0} style={styles.hero}>
          <FloatingLogo size={56} />
          <Text variant="titleMedium" color="primary">
            {firstName ? `Welcome, ${firstName}` : "You're in"}
          </Text>
          <Text variant="displayMedium" accessibilityRole="header">
            Where should your data live?
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            Tasks, habits, notes and money always run from this phone, so it&apos;s fast either way. This only decides
            whether there&apos;s a backup.
          </Text>
        </Rise>

        <View style={styles.sheet}>
          {OPTIONS.map((option, index) => (
            <Rise key={option.mode} order={index + 1}>
              <OptionCard
                option={option}
                selected={selected === option.mode}
                onSelect={() => setSelected(option.mode)}
              />
            </Rise>
          ))}
          <Rise order={3}>
            <Button
              label={selected === 'cloud' ? 'Connect Google Drive' : 'Keep on this phone'}
              icon={selected === 'cloud' ? 'cloud' : 'smartphone'}
              trailingIcon="arrow-right"
              size="lg"
              fullWidth
              loading={busy}
              onPress={confirm}
            />
          </Rise>
          <Text variant="caption" color="textTertiary" style={styles.centered}>
            {selected === 'cloud'
              ? 'Google will ask to let ClayHabbit use its own app folder in your Drive. Nothing else.'
              : 'You can switch to Google Drive any time in Settings → Cloud.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 20,
  },
  flex: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 8,
    gap: 8,
  },
  sheet: {
    paddingVertical: 8,
    gap: 14,
    marginTop: 'auto',
  },
  card: {
    padding: 16,
    gap: 12,
    borderWidth: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  points: {
    gap: 8,
    paddingLeft: 56,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    textAlign: 'center',
  },
});
