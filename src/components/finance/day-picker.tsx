import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui';
import { formatDayLabel } from '@/domain/finance/month';
import { useAppTheme } from '@/theme';
import { addDaysIso, toLocalIsoDate, todayIso } from '@/utils/date';

interface DayPickerProps {
  /** Local `YYYY-MM-DD`. */
  value: string;
  onChange: (isoDate: string) => void;
}

/**
 * Today / Yesterday / any earlier day. Money is recorded when it happened,
 * so the future is not offered. Android uses the system date dialog; iOS
 * shows its compact inline picker.
 */
export function DayPicker({ value, onChange }: DayPickerProps) {
  const theme = useAppTheme();
  const today = todayIso();
  const yesterday = addDaysIso(today, -1);
  const otherDay = value !== today && value !== yesterday;

  const pickAndroid = () =>
    DateTimePickerAndroid.open({
      mode: 'date',
      value: new Date(`${value}T12:00:00`),
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toLocalIsoDate(date));
      },
    });

  return (
    <View style={styles.row}>
      <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
      <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      {Platform.OS === 'android' ? (
        <Chip
          label={otherDay ? formatDayLabel(value) : 'Pick a day'}
          icon="calendar"
          selected={otherDay}
          onPress={pickAndroid}
        />
      ) : (
        <DateTimePicker
          mode="date"
          display="compact"
          value={new Date(`${value}T12:00:00`)}
          maximumDate={new Date()}
          accentColor={theme.colors.finance}
          onChange={(_event, date) => {
            if (date) onChange(toLocalIsoDate(date));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
