import { useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Icon, Text, type IconName } from '@/components/ui';
import { useAppTheme } from '@/theme';

interface Preset {
  label: string;
  icon: IconName;
  at: (now: Date) => Date;
}

function at(base: Date, days: number, hour: number, minute = 0): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Quick picks; "This evening" only appears while it's still ahead. */
export function reminderPresets(now: Date): Preset[] {
  const presets: Preset[] = [{ label: 'In 1 hour', icon: 'clock', at: (base) => new Date(base.getTime() + 3_600_000) }];
  if (now.getHours() < 17) presets.push({ label: 'This evening · 6 PM', icon: 'sunset', at: (base) => at(base, 0, 18) });
  presets.push({ label: 'Tomorrow · 9 AM', icon: 'sunrise', at: (base) => at(base, 1, 9) });
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  presets.push({ label: 'Next week · Mon 9 AM', icon: 'calendar', at: (base) => at(base, daysToMonday, 9) });
  return presets;
}

interface ReminderSheetProps {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onPick: (date: Date | null) => void;
}

/** "Remind me about this note" — presets, a custom date and time, or remove the reminder. */
export function ReminderSheet({ visible, current, onClose, onPick }: ReminderSheetProps) {
  const theme = useAppTheme();
  const [custom, setCustom] = useState<Date | null>(null);
  const now = new Date();

  const pickCustomAndroid = (close: (then?: () => void) => void) => {
    const start = new Date(now.getTime() + 3_600_000);
    DateTimePickerAndroid.open({
      mode: 'date',
      value: start,
      minimumDate: now,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          mode: 'time',
          value: start,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return;
            const chosen = new Date(date);
            chosen.setHours(time.getHours(), time.getMinutes(), 0, 0);
            if (chosen.getTime() > Date.now()) close(() => onPick(chosen));
          },
        });
      },
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setCustom(null);
        onClose();
      }}
      title="Remind me"
      subtitle={current ? `Set for ${new Date(current).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : undefined}
    >
      {(close) => (
        <View style={styles.stack}>
          <View style={[styles.group, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.lg }]}>
            {reminderPresets(now).map((preset, index) => (
              <Pressable
                key={preset.label}
                onPress={() => close(() => onPick(preset.at(new Date())))}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  pressed && { backgroundColor: theme.colors.surfacePressed },
                ]}
              >
                <Icon name={preset.icon} size={18} color={theme.colors.primary} />
                <Text variant="bodyLarge">{preset.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => (Platform.OS === 'android' ? pickCustomAndroid(close) : setCustom(new Date(now.getTime() + 3_600_000)))}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                pressed && { backgroundColor: theme.colors.surfacePressed },
              ]}
            >
              <Icon name="edit-2" size={18} color={theme.colors.primary} />
              <Text variant="bodyLarge">Pick date & time…</Text>
            </Pressable>
          </View>

          {custom && Platform.OS === 'ios' ? (
            <View style={styles.stack}>
              <DateTimePicker
                value={custom}
                mode="datetime"
                display="spinner"
                minimumDate={now}
                onChange={(_event, date) => date && setCustom(date)}
              />
              <Button label="Set reminder" fullWidth onPress={() => close(() => onPick(custom))} />
            </View>
          ) : null}

          {current ? (
            <Button
              label="Remove reminder"
              icon="bell-off"
              variant="outline"
              fullWidth
              onPress={() => close(() => onPick(null))}
            />
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
