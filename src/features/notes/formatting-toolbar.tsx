import { ScrollView, StyleSheet } from 'react-native';

import { IconButton } from '@/components/ui';
import type { IconName } from '@/components/ui';

export interface Selection {
  start: number;
  end: number;
}

interface FormatAction {
  icon: IconName;
  label: string;
  apply: (body: string, selection: Selection) => { body: string; cursor: number };
}

function wrapSelection(marker: string): FormatAction['apply'] {
  return (body, selection) => {
    const before = body.slice(0, selection.start);
    const selected = body.slice(selection.start, selection.end);
    const after = body.slice(selection.end);
    const next = `${before}${marker}${selected}${marker}${after}`;
    const cursor = selection.start + marker.length + selected.length + marker.length;
    return { body: next, cursor };
  };
}

function prefixLine(prefix: string): FormatAction['apply'] {
  return (body, selection) => {
    const before = body.slice(0, selection.start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    return { body: next, cursor: selection.start + prefix.length };
  };
}

const actions: FormatAction[] = [
  { icon: 'bold', label: 'Bold', apply: wrapSelection('**') },
  { icon: 'italic', label: 'Italic', apply: wrapSelection('_') },
  {
    icon: 'hash',
    label: 'Heading',
    apply: prefixLine('# '),
  },
  { icon: 'list', label: 'Bullet list', apply: prefixLine('- ') },
  { icon: 'check-square', label: 'Checklist', apply: prefixLine('- [ ] ') },
  {
    icon: 'link',
    label: 'Link',
    apply: (body, selection) => {
      const before = body.slice(0, selection.start);
      const selected = body.slice(selection.start, selection.end) || 'link text';
      const after = body.slice(selection.end);
      const insertion = `[${selected}](url)`;
      const next = before + insertion + after;
      return { body: next, cursor: before.length + insertion.length };
    },
  },
];

interface FormattingToolbarProps {
  body: string;
  selection: Selection;
  onChange: (body: string, cursor: number) => void;
}

export function FormattingToolbar({ body, selection, onChange }: FormattingToolbarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {actions.map((action) => (
        <IconButton
          key={action.label}
          name={action.icon}
          variant="muted"
          size={38}
          accessibilityLabel={action.label}
          onPress={() => {
            const result = action.apply(body, selection);
            onChange(result.body, result.cursor);
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
});
