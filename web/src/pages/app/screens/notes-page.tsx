import { Lock, NotebookPen, Pin, Plus, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { NoteSummary } from '@/domain/entities/note';
import { useCreateNote, useNotes, useSearchNotes } from '@/features/notes/hooks';
import { formatRelativeTime } from '@/utils/date';
import { notePalette } from '@/theme/note-palette';

import { Button, Chip, Skeleton } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState } from '../app-components';

type Filter = 'all' | 'pinned' | 'favorites';

export function NotesPage() {
  useDocumentTitle('Notes — ClayHabbit');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data: notes, isLoading } = useNotes('active');
  const { data: found } = useSearchNotes(query.trim());
  const create = useCreateNote();

  const base: NoteSummary[] = query.trim() ? (found ?? []) : (notes ?? []);
  const visible = base
    .filter((note) => (filter === 'pinned' ? note.isPinned : filter === 'favorites' ? note.isFavorite : true))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.updatedAt < b.updatedAt ? 1 : -1));

  const newNote = async () => {
    const note = await create.mutateAsync({});
    navigate(`/app/notes/${note.id}`);
  };

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Notes</h1>
          <span className="t-body-md c-secondary num">{notes?.length ?? 0} notes</span>
        </div>
        <Button icon={<Plus size={20} strokeWidth={2.6} />} loading={create.isPending} onClick={() => void newNote()}>
          New note
        </Button>
      </div>

      <div className="row row--wrap" style={{ gap: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: 17, color: 'var(--color-text-tertiary)' }} aria-hidden />
          <input
            className="input"
            type="search"
            placeholder="Search notes"
            aria-label="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ paddingLeft: 46 }}
          />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          <Chip selected={filter === 'pinned'} onClick={() => setFilter('pinned')} icon={<Pin size={13} />}>
            Pinned
          </Chip>
          <Chip selected={filter === 'favorites'} onClick={() => setFilter('favorites')} icon={<Star size={13} />}>
            Favourites
          </Chip>
        </div>
      </div>

      {isLoading ? (
        <div className="notes-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={200} radius={26} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={query ? 'Nothing matches' : 'No notes yet'}
          body={query ? 'Try other words.' : 'Ideas, lists, journals — write them here and read them on your phone.'}
          action={query ? undefined : <Button onClick={() => void newNote()}>Write a note</Button>}
        />
      ) : (
        <div className="notes-grid">
          {visible.map((note) => (
            <NoteCard key={note.id} note={note} onOpen={() => navigate(`/app/notes/${note.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onOpen }: { note: NoteSummary; onOpen: () => void }) {
  const { theme } = useTheme();
  const swatch = notePalette[theme][note.color] ?? notePalette[theme].default;
  return (
    <button type="button" className="note-card" style={{ ['--note-bg' as string]: swatch.paper }} onClick={onOpen}>
      <div className="note-card__title">{note.isLocked ? 'Locked note' : note.title || 'Untitled'}</div>
      <div className="note-card__excerpt">
        {note.isLocked ? (
          <span className="row" style={{ gap: 8 }}>
            <Lock size={16} /> Locked notes open on your phone.
          </span>
        ) : note.checklist.total > 0 && !note.excerpt ? (
          `${note.checklist.done} of ${note.checklist.total} done`
        ) : (
          note.excerpt || 'Empty note'
        )}
      </div>
      <div className="note-card__foot">
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: swatch.accent }} aria-hidden />
        {formatRelativeTime(note.updatedAt)}
        {note.isPinned ? <Pin size={13} style={{ marginLeft: 'auto' }} /> : null}
        {note.isFavorite ? <Star size={13} style={{ marginLeft: note.isPinned ? 0 : 'auto' }} /> : null}
      </div>
    </button>
  );
}
