import { render, screen } from '@testing-library/react-native';

import { TodayPanel } from '../today-panel';
import { AppThemeProvider } from '@/theme';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockProgress = { done: 0, total: 0, ratio: 0, delta: null as number | null, isLoading: false };
jest.mock('../hooks', () => ({ useTodayProgress: () => mockProgress }));

async function renderPanel() {
  await render(
    <AppThemeProvider>
      <TodayPanel />
    </AppThemeProvider>,
  );
}

describe('TodayPanel', () => {
  it('says there is no target instead of drawing an empty bar', async () => {
    Object.assign(mockProgress, { done: 0, total: 0, ratio: 0 });
    await renderPanel();
    expect(screen.getByRole('button', { name: 'No target yet. Add a task for today' })).toBeTruthy();
  });

  it('labels a finished day on the track itself (the "empty lime tab" bug)', async () => {
    Object.assign(mockProgress, { done: 1, total: 1, ratio: 1 });
    await renderPanel();
    expect(screen.getByLabelText("Today's target: 1 of 1 done")).toBeTruthy();
    expect(screen.getByText('Everything done. Beautiful day.')).toBeTruthy();
  });
});
