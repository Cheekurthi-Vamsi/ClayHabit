import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/finance/amount-field';
import { AppleCalendarPicker, Button, Chip, Icon, Skeleton, Text } from '@/components/ui';
import { formatMoney } from '@/domain/finance/currency';
import { PRIORITY_LABELS, type CategoryColor, type SavingsPlanWithProgress, type SavingsPriority } from '@/domain/finance/entities';
import { formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import { projectSavings } from '@/domain/finance/savings';
import { useSettingsStore } from '@/store/settings-store';
import { HABIT_COLORS, habitPalette, useAppTheme } from '@/theme';
import { toLocalIsoDate, todayIso } from '@/utils/date';

import { useCurrency, useSavingsMutations, useSavingsPlan } from '../hooks';
import { PLAN_EMOJIS, PLAN_TEMPLATES } from './templates';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

function PlanForm({ existing, templateKey }: { existing?: SavingsPlanWithProgress; templateKey?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { create, update } = useSavingsMutations();
  const template = PLAN_TEMPLATES.find((item) => item.key === templateKey);

  const [name, setName] = useState(existing?.name ?? template?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? template?.emoji ?? '🎯');
  const [color, setColor] = useState<CategoryColor>(existing?.color ?? template?.color ?? 'mint');
  const [targetMinor, setTargetMinor] = useState<number | null>(existing?.targetMinor ?? null);
  const [targetDate, setTargetDate] = useState<string | null>(existing?.targetDate ?? null);
  const [monthlyMinor, setMonthlyMinor] = useState<number | null>(existing?.monthlyContributionMinor ?? null);
  const [priority, setPriority] = useState<SavingsPriority>(existing?.priority ?? 2);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;
  const today = todayIso();

  const suggestion =
    targetMinor && targetDate
      ? projectSavings({ targetMinor, savedMinor: existing?.savedMinor ?? 0, targetDate, today }).requiredMonthlyMinor
      : null;

  const [pickingDate, setPickingDate] = useState(false);

  const applyTemplate = (key: string) => {
    const next = PLAN_TEMPLATES.find((item) => item.key === key);
    if (!next) return;
    Haptics.selectionAsync();
    setName(next.name);
    setEmoji(next.emoji);
    setColor(next.color);
  };

  const submit = () => {
    if (!targetMinor) {
      setError('Set a target amount.');
      return;
    }
    const input = {
      name,
      emoji,
      color,
      targetMinor,
      targetDate,
      monthlyContributionMinor: monthlyMinor,
      priority,
      notes,
    };
    const options = {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: (cause: unknown) =>
        setError(`Couldn't save this plan. Nothing has been lost. ${cause instanceof Error ? cause.message : ''}`),
    };
    if (existing) update.mutate({ id: existing.id, input }, options);
    else create.mutate(input, options);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: existing ? 'Edit savings plan' : 'New savings plan' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!existing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {PLAN_TEMPLATES.map((item) => (
              <Chip key={item.key} label={`${item.emoji} ${item.name}`} selected={name === item.name} onPress={() => applyTemplate(item.key)} />
            ))}
          </ScrollView>
        ) : null}

        <Field label="NAME">
          <View style={styles.nameRow}>
            <View style={[styles.emojiTile, { backgroundColor: `${habitPalette[color].base}1F`, borderRadius: theme.radii.md }]}>
              <RNText style={styles.emoji}>{emoji}</RNText>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emergency fund"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={40}
              accessibilityLabel="Plan name"
              style={[
                styles.input,
                theme.typography.bodyLarge,
                { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
              ]}
            />
          </View>
          <View style={styles.wrap}>
            {PLAN_EMOJIS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setEmoji(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: option === emoji }}
                accessibilityLabel={`Icon ${option}`}
                style={[
                  styles.emojiOption,
                  {
                    borderRadius: theme.radii.sm,
                    backgroundColor: option === emoji ? `${habitPalette[color].base}24` : theme.colors.surfaceMuted,
                  },
                ]}
              >
                <RNText style={styles.emojiSmall}>{option}</RNText>
              </Pressable>
            ))}
          </View>
        </Field>

        <AmountField
          label="TARGET"
          currency={currency}
          initialMinor={existing?.targetMinor}
          placeholder="How much do you need?"
          onChange={setTargetMinor}
        />

        <Field label="TARGET DATE (OPTIONAL)">
          <View style={styles.wrap}>
            <Chip label="No date" selected={!targetDate} onPress={() => setTargetDate(null)} />
            <Chip
              label={targetDate ? formatMonthLabel(monthKeyOf(targetDate)) : 'Pick a date'}
              icon="calendar"
              selected={Boolean(targetDate)}
              onPress={() => setPickingDate(true)}
            />
            <AppleCalendarPicker
              visible={pickingDate}
              mode="date"
              title="Reach it by"
              initialValue={targetDate ? new Date(`${targetDate}T12:00:00`) : undefined}
              minimum={new Date(`${todayIso()}T00:00:00`)}
              onClose={() => setPickingDate(false)}
              onConfirm={(date) => setTargetDate(toLocalIsoDate(date))}
            />
          </View>
        </Field>

        <AmountField
          label="MONTHLY CONTRIBUTION (OPTIONAL)"
          currency={currency}
          initialMinor={existing?.monthlyContributionMinor}
          placeholder="What you plan to add each month"
          hint={
            suggestion && !hidden
              ? `To reach it by then, about ${formatMoney(suggestion, currency)} a month. An estimate, not a promise.`
              : undefined
          }
          onChange={setMonthlyMinor}
        />

        <Field label="PRIORITY">
          <View style={styles.wrap}>
            {([1, 2, 3] as const).map((level) => (
              <Chip key={level} label={PRIORITY_LABELS[level]} selected={priority === level} onPress={() => setPriority(level)} />
            ))}
          </View>
        </Field>

        <Field label="COLOR">
          <View style={styles.wrap}>
            {HABIT_COLORS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setColor(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: key === color }}
                accessibilityLabel={`${key} color`}
                style={[styles.swatchRing, { borderColor: key === color ? habitPalette[key].base : 'transparent' }]}
              >
                <LinearGradient colors={habitPalette[key].gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch}>
                  {key === color ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="NOTES (OPTIONAL)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Why this matters, where the money is kept…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={300}
            accessibilityLabel="Notes"
            style={[
              styles.input,
              styles.notes,
              theme.typography.bodyMedium,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </Field>

        {error ? (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button
          label={existing ? 'Save changes' : 'Create plan'}
          icon="check"
          fullWidth
         
          disabled={!name.trim() || !targetMinor}
          loading={saving}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Create (`?template=`) or edit (`?id=`) a savings plan. */
export function PlanFormScreen() {
  const theme = useAppTheme();
  const { id, template } = useLocalSearchParams<{ id?: string; template?: string }>();
  const { data: existing, isLoading } = useSavingsPlan(id);

  if (id && isLoading) {
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={60} radius={theme.radii.md} />
      </View>
    );
  }
  return <PlanForm key={existing?.id ?? 'new'} existing={existing ?? undefined} templateKey={template} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  chips: {
    gap: 8,
    paddingRight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiTile: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  emojiOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSmall: {
    fontSize: 20,
    lineHeight: 26,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  swatchRing: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
