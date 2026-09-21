import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Icon, IconButton, Text } from '@/components/ui';
import type { NewHabitInput, WeekdayMask } from '@/domain/entities/habit';
import { EVERY_DAY, isValidWeekdayMask } from '@/domain/services/habit-engine';
import { HABIT_COLORS, habitPalette, useAppTheme, type HabitColor } from '@/theme';

const EMOJIS = ['💧', '🏃', '📚', '🧘', '💪', '🥗', '😴', '✍️', '🎯', '💻', '🎸', '🌱', '🧠', '☀️', '🚭', '🙏'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRESETS: { label: string; mask: WeekdayMask }[] = [
  { label: 'Every day', mask: '1111111' },
  { label: 'Weekdays', mask: '1111100' },
  { label: 'Weekends', mask: '0000011' },
];

interface HabitFormProps {
  initial?: Partial<NewHabitInput>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (input: NewHabitInput) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

export function HabitForm({ initial, submitLabel, submitting = false, onSubmit }: HabitFormProps) {
  const theme = useAppTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[0]);
  const [color, setColor] = useState<HabitColor>(initial?.color ?? 'purple');
  const [target, setTarget] = useState(initial?.targetPerDay ?? 1);
  const [mask, setMask] = useState<WeekdayMask>(initial?.daysOfWeek ?? EVERY_DAY);

  const canSubmit = name.trim().length > 0 && isValidWeekdayMask(mask) && !submitting;

  const toggleDay = (index: number) => {
    const next = mask
      .split('')
      .map((bit, i) => (i === index ? (bit === '1' ? '0' : '1') : bit))
      .join('');
    // Never allow a schedule with no days — a habit you can never do.
    if (next.includes('1')) {
      Haptics.selectionAsync();
      setMask(next);
    }
  };

  return (
    <View style={styles.form}>
      <Field label="NAME">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Drink water, Read 20 pages"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={60}
          accessibilityLabel="Habit name"
          style={[
            styles.input,
            theme.typography.bodyLarge,
            { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
          ]}
        />
      </Field>

      <Field label="ICON">
        <View style={styles.wrap}>
          {EMOJIS.map((item) => {
            const selected = item === emoji;
            return (
              <Pressable
                key={item}
                onPress={() => setEmoji(item)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Icon ${item}`}
                style={[
                  styles.emojiCell,
                  {
                    borderRadius: theme.radii.md,
                    backgroundColor: selected ? `${habitPalette[color].base}24` : theme.colors.surfaceMuted,
                    borderColor: selected ? habitPalette[color].base : 'transparent',
                  },
                ]}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="COLOR">
        <View style={styles.wrap}>
          {HABIT_COLORS.map((key) => {
            const selected = key === color;
            return (
              <Pressable
                key={key}
                onPress={() => setColor(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${key} color`}
                style={[styles.swatchRing, { borderColor: selected ? habitPalette[key].base : 'transparent' }]}
              >
                <LinearGradient
                  colors={habitPalette[key].gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swatch}
                >
                  {selected ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="DAILY GOAL">
        <View style={[styles.stepper, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <IconButton
            name="minus"
            variant="ghost"
            size={40}
            accessibilityLabel="Decrease daily goal"
            disabled={target <= 1}
            onPress={() => setTarget((t) => Math.max(1, t - 1))}
          />
          <View style={styles.stepperValue}>
            <Text variant="headlineMedium">{target}</Text>
            <Text variant="caption" color="textSecondary">
              {target === 1 ? 'time a day' : 'times a day'}
            </Text>
          </View>
          <IconButton
            name="plus"
            variant="ghost"
            size={40}
            accessibilityLabel="Increase daily goal"
            disabled={target >= 99}
            onPress={() => setTarget((t) => Math.min(99, t + 1))}
          />
        </View>
      </Field>

      <Field label="REPEAT ON">
        <View style={styles.wrap}>
          {PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={mask === preset.mask}
              onPress={() => setMask(preset.mask)}
            />
          ))}
        </View>
        <View style={styles.days}>
          {WEEKDAYS.map((day, index) => {
            const on = mask[index] === '1';
            return (
              <Pressable
                key={WEEKDAY_NAMES[index]}
                onPress={() => toggleDay(index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={WEEKDAY_NAMES[index]}
                style={[
                  styles.day,
                  { backgroundColor: on ? habitPalette[color].base : theme.colors.surfaceMuted },
                ]}
              >
                <Text variant="labelLarge" style={{ color: on ? '#FFFFFF' : theme.colors.textSecondary }}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Button
        label={submitLabel}
        icon="check"
        fullWidth
        gradient={habitPalette[color].gradient}
        disabled={!canSubmit}
        loading={submitting}
        onPress={() =>
          onSubmit({ name: name.trim(), emoji, color, targetPerDay: target, daysOfWeek: mask })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 22,
  },
  field: {
    gap: 10,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emojiText: {
    fontSize: 22,
    lineHeight: 28,
  },
  swatchRing: {
    padding: 3,
    borderRadius: 24,
    borderWidth: 2,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
  },
  stepperValue: {
    alignItems: 'center',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
