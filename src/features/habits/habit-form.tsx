import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Icon, IconButton, Text } from '@/components/ui';
import type { NewHabitInput, WeekdayMask } from '@/domain/entities/habit';
import { describeSchedule, EVERY_DAY, isValidWeekdayMask } from '@/domain/services/habit-engine';
import { HABIT_COLORS, habitPalette, useAppTheme, type HabitColor } from '@/theme';

import { HabitGlyph } from './habit-glyph';
import { HABIT_TEMPLATES, type HabitTemplate } from './habit-templates';
import { IconPicker } from './icon-picker';
import { getHabitIcon } from './icons/lookup';

const DEFAULT_ICON = 'line:sparkles';
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
  /** Offer one-tap templates above the form (for new habits). */
  showTemplates?: boolean;
  onSubmit: (input: NewHabitInput) => void;
}

function TemplateCard({ template, onPress }: { template: HabitTemplate; onPress: () => void }) {
  const theme = useAppTheme();
  const def = getHabitIcon(template.icon);
  const meta =
    template.targetPerDay > 1 ? `${template.targetPerDay}× a day` : describeSchedule(template.daysOfWeek);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Use template: ${template.name}, ${meta}`}
      style={({ pressed }) => [
        styles.template,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <HabitGlyph icon={template.icon} emoji={def?.emoji ?? '✨'} color={template.color} size={34} />
      <Text variant="labelLarge" numberOfLines={2}>
        {template.name}
      </Text>
      <Text variant="caption" color="textTertiary" numberOfLines={1}>
        {meta}
      </Text>
    </Pressable>
  );
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

export function HabitForm({
  initial,
  submitLabel,
  submitting = false,
  showTemplates = false,
  onSubmit,
}: HabitFormProps) {
  const theme = useAppTheme();
  // Editing keeps whatever the habit had (including no icon); a new habit starts with sparkles.
  const startIcon = initial ? (initial.icon ?? null) : DEFAULT_ICON;
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState<string | null>(startIcon);
  const [emoji, setEmoji] = useState(initial?.emoji ?? getHabitIcon(startIcon)?.emoji ?? '✨');
  const [color, setColor] = useState<HabitColor>(initial?.color ?? 'purple');
  const [target, setTarget] = useState(initial?.targetPerDay ?? 1);
  const [mask, setMask] = useState<WeekdayMask>(initial?.daysOfWeek ?? EVERY_DAY);
  // Bumped when a template is applied so the picker re-opens on the template's icon.
  const [pickerKey, setPickerKey] = useState(0);

  const canSubmit = name.trim().length > 0 && isValidWeekdayMask(mask) && !submitting;

  const applyTemplate = (template: HabitTemplate) => {
    Haptics.selectionAsync();
    setName(template.name);
    setIcon(template.icon);
    setEmoji(getHabitIcon(template.icon)?.emoji ?? '✨');
    setColor(template.color);
    setTarget(template.targetPerDay);
    setMask(template.daysOfWeek);
    setPickerKey((key) => key + 1);
  };

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
      {showTemplates ? (
        <Field label="START FROM A TEMPLATE">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templates}
            keyboardShouldPersistTaps="handled"
          >
            {HABIT_TEMPLATES.map((template) => (
              <TemplateCard key={template.name} template={template} onPress={() => applyTemplate(template)} />
            ))}
          </ScrollView>
        </Field>
      ) : null}

      <Field label="NAME">
        <View style={styles.nameRow}>
          <HabitGlyph icon={icon} emoji={emoji} color={color} size={50} />
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
        </View>
      </Field>

      <Field label="ICON">
        <IconPicker
          key={pickerKey}
          icon={icon}
          emoji={emoji}
          color={color}
          onChange={(nextIcon, nextEmoji) => {
            setIcon(nextIcon);
            setEmoji(nextEmoji);
          }}
        />
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
          onSubmit({ name: name.trim(), emoji, icon, color, targetPerDay: target, daysOfWeek: mask })
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
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templates: {
    gap: 10,
    paddingRight: 4,
  },
  template: {
    width: 118,
    gap: 6,
    padding: 12,
    borderWidth: 1,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
