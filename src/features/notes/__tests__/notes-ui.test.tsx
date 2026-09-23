import { fireEvent, render, screen } from '@testing-library/react-native';

import type { NoteSummary } from '@/domain/entities/note';
import { AppThemeProvider } from '@/theme';

import { NoteCard } from '../components/note-card';
import { QuickNoteSheet } from '../components/quick-note-sheet';
import { EditorToolbar } from '../editor/editor-toolbar';
import { NoteRenderer } from '../editor/note-renderer';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

// Sheets render inline here: the real one needs Gesture Handler's native module.
jest.mock('@/components/ui/bottom-sheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? (typeof children === 'function' ? children((then?: () => void) => then?.()) : children) : null,
}));

function summary(overrides: Partial<NoteSummary> = {}): NoteSummary {
  return {
    id: 'n1',
    title: 'Cybersecurity plan',
    noteType: 'checklist',
    folderId: null,
    color: 'mint',
    paper: null,
    isPinned: true,
    isFavorite: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    trashedAt: null,
    reminderAt: null,
    notificationId: null,
    version: 1,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
    excerpt: 'TCP/IP DNS TLS',
    tags: [{ id: 't1', name: 'cyber', color: '#1FA985', createdAt: 'x' }],
    checklist: { done: 2, total: 3 },
    ...overrides,
  };
}

const wrap = (node: React.ReactElement) => <AppThemeProvider>{node}</AppThemeProvider>;

describe('Notes UI', () => {
  it('shows a card with preview, progress and tags, and opens it', async () => {
    const onOpen = jest.fn();
    await render(wrap(<NoteCard note={summary()} onOpen={onOpen} onMenu={jest.fn()} />));

    expect(screen.getByText('Cybersecurity plan')).toBeTruthy();
    expect(screen.getByText('TCP/IP DNS TLS')).toBeTruthy();
    expect(screen.getByText('2/3 done · 67%')).toBeTruthy();
    expect(screen.getByText('#cyber')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cybersecurity plan'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });

  it('never shows the text of a locked note, or any preview in privacy mode', async () => {
    await render(wrap(<NoteCard note={summary({ isLocked: true, excerpt: '' })} onOpen={jest.fn()} onMenu={jest.fn()} />));
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.queryByText('TCP/IP DNS TLS')).toBeNull();

    await render(wrap(<NoteCard note={summary()} hidePreview onOpen={jest.fn()} onMenu={jest.fn()} />));
    expect(screen.queryByText('TCP/IP DNS TLS')).toBeNull();
    expect(screen.getByLabelText('Preview hidden')).toBeTruthy();
  });

  it('renders formatting and ticks checklist items in read mode', async () => {
    const onToggle = jest.fn();
    await render(
      wrap(
        <NoteRenderer
          body={'## Today\n- [ ] Call **mum**\n> keep calm'}
          text={{ fontSize: 17, lineHeight: 26 }}
          accent="#1FA985"
          onToggleChecklist={onToggle}
          onEditLine={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('Today')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('keeps extra formatting tools behind More', async () => {
    const onEdit = jest.fn();
    await render(
      wrap(
        <EditorToolbar
          body="word"
          selection={{ start: 0, end: 4 }}
          onEdit={onEdit}
          canUndo={false}
          canRedo={false}
          onUndo={jest.fn()}
          onRedo={jest.fn()}
          onDone={jest.fn()}
        />,
      ),
    );
    expect(screen.queryByLabelText('Quote')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Bold'));
    expect(onEdit).toHaveBeenCalledWith({ body: '**word**', selection: { start: 2, end: 6 } });
    await fireEvent.press(screen.getByLabelText('More tools'));
    expect(screen.getByLabelText('Quote')).toBeTruthy();
  });

  it('creates a checklist straight from the + sheet', async () => {
    const onCreate = jest.fn();
    await render(wrap(<QuickNoteSheet visible onClose={jest.fn()} onCreate={onCreate} />));
    await fireEvent.press(screen.getByLabelText('Checklist. Tick things off'));
    expect(onCreate).toHaveBeenCalledWith({ noteType: 'checklist', body: '- [ ] ' });
  });
});
