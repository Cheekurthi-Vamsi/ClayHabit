import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, Text, type IconName } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useAppTheme } from '@/theme';

import { insertBlock, insertLink, toggleLinePrefix, toggleWrap, type EditResult, type Selection } from './editor-actions';

interface ToolAction {
  key: string;
  icon?: IconName;
  /** Shown instead of an icon when Feather has none (e.g. highlight). */
  glyph?: string;
  label: string;
  apply: (body: string, selection: Selection) => EditResult;
}

/** Always visible: what people reach for most. */
const PRIMARY: ToolAction[] = [
  { key: 'bold', icon: 'bold', label: 'Bold', apply: (b, s) => toggleWrap(b, s, '**') },
  { key: 'italic', icon: 'italic', label: 'Italic', apply: (b, s) => toggleWrap(b, s, '_') },
  { key: 'heading', glyph: 'H', label: 'Heading', apply: (b, s) => toggleLinePrefix(b, s, '## ') },
  { key: 'check', icon: 'check-square', label: 'Checklist', apply: (b, s) => toggleLinePrefix(b, s, '- [ ] ') },
  { key: 'bullet', icon: 'list', label: 'Bullet list', apply: (b, s) => toggleLinePrefix(b, s, '- ') },
];

/** Behind "More": progressive disclosure. */
const SECONDARY: ToolAction[] = [
  { key: 'underline', icon: 'underline', label: 'Underline', apply: (b, s) => toggleWrap(b, s, '++') },
  { key: 'strike', glyph: 'S̶', label: 'Strikethrough', apply: (b, s) => toggleWrap(b, s, '~~') },
  { key: 'highlight', glyph: '▌', label: 'Highlight', apply: (b, s) => toggleWrap(b, s, '==') },
  { key: 'numbered', glyph: '1.', label: 'Numbered list', apply: (b, s) => toggleLinePrefix(b, s, '1. ') },
  { key: 'quote', icon: 'message-square', label: 'Quote', apply: (b, s) => toggleLinePrefix(b, s, '> ') },
  { key: 'code', icon: 'code', label: 'Code block', apply: (b, s) => insertBlock(b, s, '```\n\n```', 4) },
  { key: 'inline-code', icon: 'terminal', label: 'Inline code', apply: (b, s) => toggleWrap(b, s, '`') },
  { key: 'divider', icon: 'minus', label: 'Divider', apply: (b, s) => insertBlock(b, s, '---') },
  { key: 'link', icon: 'link', label: 'Link', apply: insertLink },
  { key: 'h1', glyph: 'H1', label: 'Large heading', apply: (b, s) => toggleLinePrefix(b, s, '# ') },
];

interface EditorToolbarProps {
  body: string;
  selection: Selection;
  onEdit: (result: EditResult) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}

function ToolButton({ action, onPress, active }: { action: Pick<ToolAction, 'icon' | 'glyph' | 'label'>; onPress: () => void; active?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.tool,
        {
          backgroundColor: active ? theme.colors.primaryMuted : pressed ? theme.colors.surfacePressed : theme.colors.surfaceMuted,
          borderRadius: theme.radii.sm + 2,
        },
      ]}
    >
      {action.icon ? (
        <Icon name={action.icon} size={17} color={active ? theme.colors.primary : theme.colors.textPrimary} />
      ) : (
        <Text variant="labelLarge" style={{ color: active ? theme.colors.primary : theme.colors.textPrimary }}>
          {action.glyph}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * The formatting bar above the keyboard. Five everyday tools, "More" for
 * the rest, undo/redo, and Done to put the keyboard away.
 */
export function EditorToolbar({ body, selection, onEdit, canUndo, canRedo, onUndo, onRedo, onDone }: EditorToolbarProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [more, setMore] = useState(false);

  const run = (action: ToolAction) => onEdit(action.apply(body, selection));

  return (
    <View style={styles.wrap}>
      {more ? (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(160)} exiting={reduceMotion ? undefined : FadeOut.duration(120)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row}>
            {SECONDARY.map((action) => (
              <ToolButton key={action.key} action={action} onPress={() => run(action)} />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
      <View style={styles.mainRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row}>
          {PRIMARY.map((action) => (
            <ToolButton key={action.key} action={action} onPress={() => run(action)} />
          ))}
          <ToolButton
            action={{ icon: more ? 'chevron-down' : 'more-horizontal', label: more ? 'Fewer tools' : 'More tools' }}
            active={more}
            onPress={() => setMore((value) => !value)}
          />
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          <View style={{ opacity: canUndo ? 1 : 0.35 }} pointerEvents={canUndo ? 'auto' : 'none'}>
            <ToolButton action={{ icon: 'corner-up-left', label: 'Undo' }} onPress={onUndo} />
          </View>
          <View style={{ opacity: canRedo ? 1 : 0.35 }} pointerEvents={canRedo ? 'auto' : 'none'}>
            <ToolButton action={{ icon: 'corner-up-right', label: 'Redo' }} onPress={onRedo} />
          </View>
        </ScrollView>
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Done editing" hitSlop={6} style={styles.done}>
          <Text variant="labelLarge" color="primary">
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingVertical: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  tool: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 22,
    marginHorizontal: 2,
  },
  done: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
