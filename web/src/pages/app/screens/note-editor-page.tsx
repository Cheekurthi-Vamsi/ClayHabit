import { ArrowLeft, Lock, Pin, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { NOTE_COLORS, type NoteColor } from '@/domain/entities/note';
import { useMoveNoteToTrash, useNoteWithTags, useSetNoteFlag, useUpdateNote } from '@/features/notes/hooks';
import { notePalette } from '@/theme/note-palette';
import { formatRelativeTime } from '@/utils/date';

import { Button, IconButton, Skeleton } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState } from '../app-components';
import { confirmAction } from '../confirm';

/** Saves this long after the last keystroke (and on leaving). */
const SAVE_DELAY_MS = 600;

export function NoteEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: note, isLoading } = useNoteWithTags(id);
  const update = useUpdateNote();
  const setFlag = useSetNoteFlag();
  const trash = useMoveNoteToTrash();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const loaded = useRef<string | null>(null);
  const pending = useRef<{ title: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDocumentTitle(`${title || 'Note'} — ClayHabbit`);

  useEffect(() => {
    if (!note || loaded.current === note.id) return;
    loaded.current = note.id;
    setTitle(note.title);
    setBody(note.body);
    setColor(note.color);
  }, [note]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next && note) update.mutate({ id: note.id, input: next });
  };

  // Save what's left when leaving the note.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const schedule = (next: { title: string; body: string }) => {
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  if (isLoading) {
    return (
      <div className="page">
        <Skeleton height={480} radius={26} />
      </div>
    );
  }
  if (!note) {
    return (
      <div className="page">
        <EmptyState icon={Trash2} title="This note is gone" body="It may have been deleted on another device." action={<Button onClick={() => navigate('/app/notes')}>Back to notes</Button>} />
      </div>
    );
  }
  if (note.isLocked) {
    return (
      <div className="page">
        <EmptyState
          icon={Lock}
          title="This note is locked"
          body="Locked notes need your phone’s fingerprint or PIN, so they only open in the ClayHabbit app."
          action={<Button onClick={() => navigate('/app/notes')}>Back to notes</Button>}
        />
      </div>
    );
  }

  const swatch = notePalette[theme][color] ?? notePalette[theme].default;
  const saving = update.isPending || pending.current !== null;

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="row row--between row--wrap">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={18} />}
          onClick={() => {
            flush();
            navigate('/app/notes');
          }}
        >
          Notes
        </Button>
        <div className="row" style={{ gap: 6 }}>
          <span className="t-body-sm c-tertiary" style={{ width: 150, textAlign: 'right' }} aria-live="polite">
            {saving ? 'Saving…' : `Edited ${formatRelativeTime(note.updatedAt)}`}
          </span>
          <IconButton label={note.isPinned ? 'Unpin' : 'Pin'} variant={note.isPinned ? 'lime' : 'default'} size="sm" onClick={() => setFlag.mutate({ id: note.id, flag: 'pinned', value: !note.isPinned })}>
            <Pin size={16} />
          </IconButton>
          <IconButton
            label={note.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            variant={note.isFavorite ? 'lime' : 'default'}
            size="sm"
            onClick={() => setFlag.mutate({ id: note.id, flag: 'favorite', value: !note.isFavorite })}
          >
            <Star size={16} />
          </IconButton>
          <IconButton
            label="Move to trash"
            size="sm"
            onClick={async () => {
              if (await confirmAction({ title: 'Move to trash?', body: 'You can restore it from the trash on your phone for 30 days.', confirmLabel: 'Move to trash', danger: true })) {
                pending.current = null;
                await trash.mutateAsync(note.id);
                navigate('/app/notes');
              }
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <div className="paper editor" style={{ background: swatch.paper }}>
        <input
          className="editor__title"
          placeholder="Title"
          aria-label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            schedule({ title: event.target.value, body });
          }}
        />
        <textarea
          className="editor__body"
          placeholder="Start writing… (Markdown works: # headings, - lists, - [ ] checklists)"
          aria-label="Note"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            schedule({ title, body: event.target.value });
          }}
        />
      </div>

      <div className="row row--wrap" style={{ gap: 10 }} role="group" aria-label="Note colour">
        {NOTE_COLORS.map((key) => {
          const option = notePalette[theme][key];
          return (
            <button
              key={key}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={color === key}
              onClick={() => {
                setColor(key);
                update.mutate({ id: note.id, input: { color: key } });
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: option.paper,
                border: `3px solid ${option.accent}`,
                boxShadow: color === key ? '0 0 0 3px var(--color-background), 0 0 0 5px var(--ink)' : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
