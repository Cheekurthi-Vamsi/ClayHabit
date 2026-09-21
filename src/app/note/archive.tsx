import { NoteViewScreen } from '@/features/notes/note-view-screen';

export default function ArchivedNotes() {
  return <NoteViewScreen view="archived" title="Archived" emptyMessage="No archived notes" />;
}
