import type { IconName } from '@/components/ui/icon';
import type { NoteColor, NoteType } from '@/domain/entities/note';

/** How each note type looks and is described across Notes. */
export const NOTE_TYPE_META: Record<NoteType, { label: string; icon: IconName }> = {
  standard: { label: 'Note', icon: 'file-text' },
  checklist: { label: 'Checklist', icon: 'check-square' },
  quick: { label: 'Quick note', icon: 'zap' },
  meeting: { label: 'Meeting', icon: 'users' },
  idea: { label: 'Idea', icon: 'sun' },
  journal: { label: 'Journal', icon: 'book-open' },
  study: { label: 'Study', icon: 'book' },
  project: { label: 'Project', icon: 'layers' },
  code: { label: 'Code', icon: 'code' },
};

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  noteType: NoteType;
  color: NoteColor;
  /** A function so dated templates are filled in when used, not when the app starts. */
  build: (now: Date) => { title: string; body: string };
}

function longDate(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Starting points offered by "New from template". Add one here and it shows up everywhere. */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'daily-journal',
    name: 'Daily journal',
    description: 'What happened, what went well, what to improve.',
    icon: 'book-open',
    noteType: 'journal',
    color: 'yellow',
    build: (now) => ({
      title: longDate(now),
      body: [
        '## What happened?',
        '',
        '',
        '## What went well?',
        '',
        '',
        '## What could improve?',
        '',
        '',
        "## Tomorrow's focus",
        '- [ ] ',
      ].join('\n'),
    }),
  },
  {
    id: 'meeting',
    name: 'Meeting notes',
    description: 'Agenda, notes, decisions and action items.',
    icon: 'users',
    noteType: 'meeting',
    color: 'blue',
    build: (now) => ({
      title: 'Meeting',
      body: [
        `**Date:** ${now.toLocaleDateString()}`,
        '**Participants:** ',
        '',
        '## Agenda',
        '- ',
        '',
        '## Notes',
        '',
        '',
        '## Decisions',
        '- ',
        '',
        '## Action items',
        '- [ ] ',
      ].join('\n'),
    }),
  },
  {
    id: 'project',
    name: 'Project plan',
    description: 'Objective, requirements, tasks and next steps.',
    icon: 'layers',
    noteType: 'project',
    color: 'lavender',
    build: () => ({
      title: 'New project',
      body: [
        '## Objective',
        '',
        '',
        '## Requirements',
        '- ',
        '',
        '## Tasks',
        '- [ ] ',
        '',
        '## Ideas',
        '- ',
        '',
        '## Next steps',
        '- [ ] ',
      ].join('\n'),
    }),
  },
  {
    id: 'study',
    name: 'Study notes',
    description: 'Key concepts, details, examples and a summary.',
    icon: 'book',
    noteType: 'study',
    color: 'mint',
    build: () => ({
      title: 'Topic',
      body: [
        '## Key concepts',
        '- ',
        '',
        '## Important details',
        '',
        '',
        '## Examples',
        '',
        '',
        '## Questions',
        '- ',
        '',
        '## Summary',
        '',
      ].join('\n'),
    }),
  },
  {
    id: 'brain-dump',
    name: 'Brain dump',
    description: 'A blank page. Just start typing.',
    icon: 'wind',
    noteType: 'idea',
    color: 'peach',
    build: () => ({ title: '', body: '' }),
  },
];

export function findTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((template) => template.id === id);
}
