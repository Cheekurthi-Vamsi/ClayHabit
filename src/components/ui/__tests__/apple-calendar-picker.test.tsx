import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppleCalendarPicker } from '../apple-calendar-picker';
import { useSettingsStore } from '@/store/settings-store';
import { AppThemeProvider } from '@/theme';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

async function openPicker(props: Partial<React.ComponentProps<typeof AppleCalendarPicker>> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  await render(
    <AppThemeProvider>
      <AppleCalendarPicker
        visible
        mode="time"
        initialValue={new Date(2030, 0, 15, 9, 41)}
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />
    </AppThemeProvider>,
  );
  return { onConfirm, onClose };
}

// Renders a full month grid per test; give it room when the whole suite runs in parallel.
jest.setTimeout(30_000);

describe('AppleCalendarPicker', () => {
  beforeEach(() => useSettingsStore.setState({ use24HourClock: false }));

  it('sets any 12-hour time with AM/PM', async () => {
    const { onConfirm } = await openPicker();

    const hour = screen.getByLabelText('Hour, 1 to 12');
    await fireEvent.changeText(hour, '7');
    await fireEvent(hour, 'endEditing', { nativeEvent: { text: '7' } });
    const minutes = screen.getByLabelText('Minutes, 0 to 59');
    await fireEvent.changeText(minutes, '05');
    await fireEvent(minutes, 'endEditing', { nativeEvent: { text: '05' } });
    await fireEvent.press(screen.getByRole('radio', { name: 'PM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    const chosen: Date = onConfirm.mock.calls[0][0];
    expect([chosen.getHours(), chosen.getMinutes()]).toEqual([19, 5]);
  });

  it('switches to the 24-hour clock and remembers it', async () => {
    const { onConfirm } = await openPicker();

    await fireEvent.press(screen.getByRole('radio', { name: '24-hour clock' }));
    expect(useSettingsStore.getState().use24HourClock).toBe(true);
    expect(screen.queryByRole('radio', { name: 'PM' })).toBeNull();

    // Typed but not yet committed: Done still uses it.
    await fireEvent.changeText(screen.getByLabelText('Hour, 0 to 23'), '21');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect((onConfirm.mock.calls[0][0] as Date).getHours()).toBe(21);
  });

  it('refuses a time that has already passed when a minimum is set', async () => {
    const { onConfirm } = await openPicker({
      mode: 'datetime',
      initialValue: new Date(2020, 0, 1, 9, 0),
      minimum: new Date(2025, 0, 1),
    });

    expect(screen.getByText('Pick a time that’s still ahead.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
