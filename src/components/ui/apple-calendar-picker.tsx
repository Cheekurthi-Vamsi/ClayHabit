import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useSettingsStore } from '@/store/settings-store';
import { fontFamily, useAppTheme } from '@/theme';
import { toLocalIsoDate } from '@/utils/date';

import { Button } from './button';
import { CalendarMonth } from './calendar-month';
import { Text } from './text';

export type CalendarPickerMode = 'date' | 'datetime' | 'time';

interface AppleCalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the chosen moment when the person taps Done. */
  onConfirm: (value: Date) => void;
  /** Where the picker opens; an hour from now when omitted. */
  initialValue?: Date;
  mode?: CalendarPickerMode;
  title?: string;
  /** Nothing earlier can be confirmed (reminders must be in the future). */
  minimum?: Date;
  maximum?: Date;
  confirmLabel?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The Apple-style date & time picker (from the user's apple-calendar-picker),
 * rebuilt for React Native: a floating card with the month grid and a
 * "Time" row. Hours and minutes are typed; the clock is 12-hour with AM/PM
 * or 24-hour, switchable right here and remembered.
 */
export function AppleCalendarPicker({
  visible,
  onClose,
  onConfirm,
  initialValue,
  mode = 'datetime',
  title,
  minimum,
  maximum,
  confirmLabel = 'Done',
}: AppleCalendarPickerProps) {
  if (!visible) return null;
  return (
    <PickerCard
      onClose={onClose}
      onConfirm={onConfirm}
      initialValue={initialValue}
      mode={mode}
      title={title}
      minimum={minimum}
      maximum={maximum}
      confirmLabel={confirmLabel}
    />
  );
}

function PickerCard({
  onClose,
  onConfirm,
  initialValue,
  mode,
  title,
  minimum,
  maximum,
  confirmLabel,
}: Omit<AppleCalendarPickerProps, 'visible' | 'mode' | 'confirmLabel'> & {
  mode: CalendarPickerMode;
  confirmLabel: string;
}) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const use24Hour = useSettingsStore((state) => state.use24HourClock);
  const setUse24Hour = useSettingsStore((state) => state.setUse24HourClock);

  const [start] = useState(() => initialValue ?? new Date(Date.now() + 3_600_000));
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [date, setDate] = useState(toLocalIsoDate(start));
  const [hour24, setHour24] = useState(start.getHours());
  const [minute, setMinute] = useState(start.getMinutes());
  // What's typed, kept separately so a half-typed "1" isn't reformatted under the cursor.
  const [hourText, setHourText] = useState<string | null>(null);
  const [minuteText, setMinuteText] = useState<string | null>(null);

  const showDate = mode !== 'time';
  const showTime = mode !== 'date';
  const pm = hour24 >= 12;
  const displayHour = use24Hour ? hour24 : hour24 % 12 === 0 ? 12 : hour24 % 12;

  const parseHour = (text: string): number => {
    const value = Number.parseInt(text, 10);
    if (Number.isNaN(value)) return hour24;
    return use24Hour ? clamp(value, 0, 23) : (clamp(value, 1, 12) % 12) + (pm ? 12 : 0);
  };
  const parseMinute = (text: string): number => {
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? minute : clamp(value, 0, 59);
  };

  // Includes anything still being typed, so Done never loses a half-committed field.
  const chosen = new Date(`${date}T00:00:00`);
  chosen.setHours(
    showTime ? (hourText !== null ? parseHour(hourText) : hour24) : 12,
    showTime ? (minuteText !== null ? parseMinute(minuteText) : minute) : 0,
    0,
    0,
  );
  const tooEarly = minimum !== undefined && chosen.getTime() <= minimum.getTime();
  const tooLate = maximum !== undefined && chosen.getTime() > maximum.getTime();

  const commitHour = (text: string) => {
    setHourText(null);
    setHour24(parseHour(text));
  };
  const commitMinute = (text: string) => {
    setMinuteText(null);
    setMinute(parseMinute(text));
  };
  const setPeriod = (nextPm: boolean) => {
    if (nextPm === pm) return;
    Haptics.selectionAsync();
    setHour24((value) => (value % 12) + (nextPm ? 12 : 0));
  };

  const fieldStyle = [
    styles.timeBox,
    { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.textPrimary },
  ];
  const segment = (label: string, active: boolean, onPress: () => void, accessibilityLabel: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.segment, active && [styles.segmentActive, { backgroundColor: theme.colors.surface }]]}
    >
      <Text variant="labelMedium" style={{ color: active ? theme.colors.textPrimary : theme.colors.textTertiary }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(150)} style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View
          entering={reduceMotion ? undefined : ZoomIn.springify().damping(18)}
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          {title ? (
            <Text variant="titleMedium" color="textSecondary" style={styles.cardTitle}>
              {title}
            </Text>
          ) : null}

          {showDate ? (
            <CalendarMonth
              year={cursor.year}
              month={cursor.month}
              onChangeMonth={(year, month) => setCursor({ year, month })}
              selected={date}
              onSelect={setDate}
              minDate={minimum ? toLocalIsoDate(minimum) : undefined}
              maxDate={maximum ? toLocalIsoDate(maximum) : undefined}
              showThemeToggle
            />
          ) : null}

          {showTime ? (
            <View style={[styles.timeRow, showDate && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingTop: 14 }]}>
              <Text variant="titleMedium">Time</Text>
              <View style={styles.timeControls}>
                <View style={styles.timeInputs}>
                  <TextInput
                    value={hourText ?? String(displayHour).padStart(2, '0')}
                    onChangeText={(text) => setHourText(text.replace(/\D/g, '').slice(0, 2))}
                    onEndEditing={(event) => commitHour(event.nativeEvent.text)}
                    onBlur={() => hourText !== null && commitHour(hourText)}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    accessibilityLabel={use24Hour ? 'Hour, 0 to 23' : 'Hour, 1 to 12'}
                    style={fieldStyle}
                  />
                  <Text variant="titleMedium" color="textSecondary">
                    :
                  </Text>
                  <TextInput
                    value={minuteText ?? String(minute).padStart(2, '0')}
                    onChangeText={(text) => setMinuteText(text.replace(/\D/g, '').slice(0, 2))}
                    onEndEditing={(event) => commitMinute(event.nativeEvent.text)}
                    onBlur={() => minuteText !== null && commitMinute(minuteText)}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    accessibilityLabel="Minutes, 0 to 59"
                    style={fieldStyle}
                  />
                </View>
                {use24Hour ? null : (
                  <View accessibilityRole="radiogroup" style={[styles.segments, { backgroundColor: theme.colors.surfaceMuted }]}>
                    {segment('AM', !pm, () => setPeriod(false), 'AM')}
                    {segment('PM', pm, () => setPeriod(true), 'PM')}
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {showTime ? (
            <View style={[styles.segments, styles.clockSwitch, { backgroundColor: theme.colors.surfaceMuted }]} accessibilityRole="radiogroup">
              {segment('12-hour', !use24Hour, () => setUse24Hour(false), '12-hour clock with AM and PM')}
              {segment('24-hour', use24Hour, () => setUse24Hour(true), '24-hour clock')}
            </View>
          ) : null}

          {tooEarly || tooLate ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }} accessibilityLiveRegion="polite">
              {tooEarly ? 'Pick a time that’s still ahead.' : 'That’s later than allowed here.'}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onClose} />
            <Button
              label={confirmLabel}
              icon="check"
              disabled={tooEarly || tooLate}
              onPress={() => {
                onConfirm(chosen);
                onClose();
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },
  cardTitle: {
    marginBottom: -4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBox: {
    width: 46,
    height: 40,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 18,
    padding: 0,
  },
  segments: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  clockSwitch: {
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});
