import { memo, useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import * as Haptics from '@/lib/haptics';
import { fontFamily, useAppTheme } from '@/theme';
import { parseNoteBlocks, type InlineNode, type NoteBlock, type NoteTextColor } from '@/utils/note-format';

export interface BodyTextStyle {
  fontSize: number;
  lineHeight: number;
}

const TEXT_COLORS: Record<NoteTextColor, string> = {
  red: '#E0445E',
  orange: '#E47A22',
  yellow: '#C9900E',
  green: '#1FA985',
  blue: '#3A74E6',
  purple: '#6F57F2',
  pink: '#DC5F84',
  gray: '#7B8199',
};

function Inline({ nodes, base }: { nodes: readonly InlineNode[]; base: TextStyle }) {
  const theme = useAppTheme();
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'text':
            return node.text;
          case 'code':
            return (
              <Text
                key={index}
                style={[base, styles.inlineCode, { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.textPrimary }]}
              >
                {node.text}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                style={[base, { color: theme.colors.primary, textDecorationLine: 'underline' }]}
                onPress={() => /^https?:\/\//i.test(node.url) && Linking.openURL(node.url).catch(() => {})}
                accessibilityRole="link"
              >
                {node.text}
              </Text>
            );
          case 'bold':
            return (
              <Text key={index} style={[base, { fontFamily: fontFamily.bold }]}>
                <Inline nodes={node.children} base={{ ...base, fontFamily: fontFamily.bold }} />
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} style={[base, { fontStyle: 'italic' }]}>
                <Inline nodes={node.children} base={{ ...base, fontStyle: 'italic' }} />
              </Text>
            );
          case 'underline':
            return (
              <Text key={index} style={[base, { textDecorationLine: 'underline' }]}>
                <Inline nodes={node.children} base={base} />
              </Text>
            );
          case 'strike':
            return (
              <Text key={index} style={[base, { textDecorationLine: 'line-through' }]}>
                <Inline nodes={node.children} base={base} />
              </Text>
            );
          case 'highlight':
            return (
              <Text key={index} style={[base, { backgroundColor: theme.scheme === 'dark' ? '#5A4A12' : '#FFE9A8' }]}>
                <Inline nodes={node.children} base={base} />
              </Text>
            );
          case 'color':
            return (
              <Text key={index} style={[base, { color: TEXT_COLORS[node.color] }]}>
                <Inline nodes={node.children} base={{ ...base, color: TEXT_COLORS[node.color] }} />
              </Text>
            );
        }
      })}
    </>
  );
}

function Checkbox({ checked, color }: { checked: boolean; color: string }) {
  const theme = useAppTheme();
  const progress = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, { damping: 14, stiffness: 260 });
  }, [checked, progress]);
  const fill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));
  return (
    <View style={[styles.checkbox, { borderColor: checked ? color : theme.colors.borderStrong }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.checkFill, { backgroundColor: color }, fill]}>
        <Icon name="check" size={13} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

function ChecklistRow({
  block,
  base,
  accent,
  onToggle,
}: {
  block: Extract<NoteBlock, { type: 'checklist' }>;
  base: TextStyle;
  accent: string;
  onToggle: (line: number) => void;
}) {
  const theme = useAppTheme();
  const fade = useSharedValue(block.checked ? 1 : 0);
  useEffect(() => {
    fade.value = withTiming(block.checked ? 1 : 0, { duration: 220 });
  }, [block.checked, fade]);
  const textStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value * 0.45 }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onToggle(block.line);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: block.checked }}
      style={[styles.row, { paddingLeft: block.indent * 18 }]}
    >
      <Checkbox checked={block.checked} color={accent} />
      <Animated.View style={[styles.flex, textStyle]}>
        <Text
          style={[
            base,
            { color: theme.colors.textPrimary },
            block.checked && { textDecorationLine: 'line-through', color: theme.colors.textSecondary },
          ]}
        >
          <Inline nodes={block.inline} base={base} />
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface NoteRendererProps {
  body: string;
  text: BodyTextStyle;
  accent: string;
  onToggleChecklist: (line: number) => void;
  /** Tapping a non-interactive line switches to editing, cursor at that line. */
  onEditLine: (line: number) => void;
}

/**
 * Read mode: the note's light markdown rendered as real formatting —
 * headings, lists, quotes, code, dividers, links, colours — with checklist
 * items you can tick in place. Tap anywhere else to edit that spot.
 */
export const NoteRenderer = memo(function NoteRenderer({ body, text, accent, onToggleChecklist, onEditLine }: NoteRendererProps) {
  const theme = useAppTheme();
  const blocks = parseNoteBlocks(body);
  const base: TextStyle = { fontFamily: fontFamily.regular, fontSize: text.fontSize, lineHeight: text.lineHeight, color: theme.colors.textPrimary };

  return (
    <View style={styles.stack}>
      {blocks.map((block) => {
        const key = `${block.type}-${block.line}`;
        const tapToEdit = (children: React.ReactNode, extra?: object) => (
          <Pressable key={key} onPress={() => onEditLine(block.line)} accessible={false} style={extra}>
            {children}
          </Pressable>
        );

        switch (block.type) {
          case 'blank':
            return tapToEdit(<View style={{ height: text.lineHeight * 0.5 }} />);
          case 'divider':
            return tapToEdit(<View style={[styles.divider, { backgroundColor: theme.colors.border }]} />, styles.dividerWrap);
          case 'heading': {
            const size = block.level === 1 ? 26 : block.level === 2 ? 22 : 19;
            const heading: TextStyle = {
              ...base,
              fontFamily: fontFamily.serifSemiBold,
              fontSize: size,
              lineHeight: size * 1.3,
            };
            return tapToEdit(
              <Text style={heading} accessibilityRole="header">
                <Inline nodes={block.inline} base={heading} />
              </Text>,
              styles.heading,
            );
          }
          case 'checklist':
            return <ChecklistRow key={key} block={block} base={base} accent={accent} onToggle={onToggleChecklist} />;
          case 'bullet':
            return tapToEdit(
              <View style={[styles.row, { paddingLeft: block.indent * 18 }]}>
                <View style={[styles.dot, { backgroundColor: accent, marginTop: text.lineHeight / 2 - 3 }]} />
                <Text style={[base, styles.flex]}>
                  <Inline nodes={block.inline} base={base} />
                </Text>
              </View>,
            );
          case 'numbered':
            return tapToEdit(
              <View style={[styles.row, { paddingLeft: block.indent * 18 }]}>
                <Text style={[base, styles.number, { color: accent, fontFamily: fontFamily.semiBold }]}>{block.number}.</Text>
                <Text style={[base, styles.flex]}>
                  <Inline nodes={block.inline} base={base} />
                </Text>
              </View>,
            );
          case 'quote':
            return tapToEdit(
              <View style={[styles.quote, { borderLeftColor: accent }]}>
                <Text style={[base, { fontStyle: 'italic', color: theme.colors.textSecondary }]}>
                  <Inline nodes={block.inline} base={{ ...base, fontStyle: 'italic', color: theme.colors.textSecondary }} />
                </Text>
              </View>,
            );
          case 'code':
            return tapToEdit(
              <View style={[styles.code, { backgroundColor: theme.scheme === 'dark' ? '#0B0E1C' : '#1B2140' }]}>
                <Text style={styles.codeText} selectable>
                  {block.text || ' '}
                </Text>
              </View>,
            );
          case 'paragraph':
            return tapToEdit(
              <Text style={base}>
                <Inline nodes={block.inline} base={base} />
              </Text>,
            );
        }
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  stack: {
    gap: 4,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 2,
  },
  heading: {
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  checkFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  number: {
    minWidth: 20,
  },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  code: {
    borderRadius: 14,
    padding: 14,
  },
  codeText: {
    color: '#E6E8F5',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  dividerWrap: {
    paddingVertical: 10,
  },
  divider: {
    height: 1,
  },
});
