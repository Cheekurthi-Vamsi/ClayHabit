import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppleCalendarPicker, Chip } from '@/components/ui';
import { formatDayLabel } from '@/domain/finance/month';
import { addDaysIso, toLocalIsoDate, todayIso } from '@/utils/date';

interface DayPickerProps {
  /** Local `YYYY-MM-DD`. */
  value: string;
  onChange: (isoDate: string) => void;
}

/**
 * Today / Yesterday / any earlier day, picked on the app calendar. Money is
 * recorded when it happened, so the future is not offered.
 */
export function DayPicker({ value, onChange }: DayPickerProps) {
  const [picking, setPicking] = useState(false);
  const today = todayIso();
  const yesterday = addDaysIso(today, -1);
  const otherDay = value !== today && value !== yesterday;

  return (
    <View style={styles.row}>
      <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
      <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      <Chip
        label={otherDay ? formatDayLabel(value) : 'Pick a day'}
        icon="calendar"
        selected={otherDay}
        onPress={() => setPicking(true)}
      />
      <AppleCalendarPicker
        visible={picking}
        mode="date"
        title="When did it happen?"
        initialValue={new Date(`${value}T12:00:00`)}
        maximum={new Date(`${today}T23:59:59`)}
        onClose={() => setPicking(false)}
        onConfirm={(date) => onChange(toLocalIsoDate(date))}
      />
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
