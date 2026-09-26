import { fireEvent, render, screen } from '@testing-library/react-native';

import { FloatingDock } from '../floating-dock';
import { AppThemeProvider } from '@/theme';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

function renderDock(index: number) {
  const routes = ['index', 'tasks', 'notes', 'stats'].map((name) => ({ key: `${name}-key`, name, params: undefined }));
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const onCreate = jest.fn();
  const props = {
    state: { index, routes, key: 'tabs', routeNames: routes.map((route) => route.name), type: 'tab', stale: false, history: [] },
    navigation,
    descriptors: {},
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    onCreate,
    createOpen: false,
  } as unknown as React.ComponentProps<typeof FloatingDock>;
  return { navigation, onCreate, props };
}

describe('FloatingDock', () => {
  it('keeps every tab in place with its label and marks the active one', async () => {
    const { props } = renderDock(1);
    await render(
      <AppThemeProvider>
        <FloatingDock {...props} />
      </AppThemeProvider>,
    );

    // Icons and labels never move or disappear; only the highlight changes.
    for (const label of ['Home', 'Tasks', 'Notes', 'Stats']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByRole('tab', { name: 'Tasks' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', { name: 'Home' }).props.accessibilityState.selected).toBe(false);
  });

  it('navigates to another tab and opens create', async () => {
    const { props, navigation, onCreate } = renderDock(0);
    await render(
      <AppThemeProvider>
        <FloatingDock {...props} />
      </AppThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('tab', { name: 'Notes' }));
    expect(navigation.navigate).toHaveBeenCalledWith('notes', undefined);

    await fireEvent.press(screen.getByRole('button', { name: 'Create' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
