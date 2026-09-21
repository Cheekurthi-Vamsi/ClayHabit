import { NoteViewScreen } from '@/features/notes/note-view-screen';

export default function TrashedNotes() {
  return <NoteViewScreen view="trashed" title="Trash" emptyMessage="Trash is empty" />;
}
