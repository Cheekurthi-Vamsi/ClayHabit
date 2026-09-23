import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { BottomSheet, Icon, Text, type IconName } from '@/components/ui';
import type { NewNoteInput, NoteColor } from '@/domain/entities/note';
import { NOTE_TEMPLATES } from '@/domain/notes/templates';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useAppTheme } from '@/theme';
import { notePalette } from '@/theme/note-palette';

interface CreateOption {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  color: NoteColor;
  input?: NewNoteInput;
}

const OPTIONS: CreateOption[] = [
  { key: 'blank', label: 'Blank note', hint: 'Start writing', icon: 'file-text', color: 'lavender', input: {} },
  {
    key: 'checklist',
    label: 'Checklist',
    hint: 'Tick things off',
    icon: 'check-square',
    color: 'mint',
    input: { noteType: 'checklist', body: '- [ ] ' },
  },
  {
    key: 'quick',
    label: 'Quick note',
    hint: 'A thought, fast',
    icon: 'zap',
    color: 'yellow',
    input: { noteType: 'quick', color: 'yellow' },
  },
  {
    key: 'code',
    label: 'Code note',
    hint: 'Snippets & commands',
    icon: 'code',
    color: 'graphite',
    input: { noteType: 'code', color: 'graphite', body: '```\n\n```' },
  },
  { key: 'template', label: 'From template', hint: 'Journal, meeting…', icon: 'layout', color: 'blue' },
];

interface QuickNoteSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: NewNoteInput) => void;
}

/**
 * The "+" sheet: tap an option and the editor opens with the cursor ready.
 * No form in between — templates are the only second step.
 */
export function QuickNoteSheet({ visible, onClose, onCreate }: QuickNoteSheetProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [step, setStep] = useState<'type' | 'template'>('type');
  const palette = notePalette[theme.scheme === 'dark' ? 'dark' : 'light'];

  const handleClose = () => {
    setStep('type');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={step === 'type' ? 'Create' : 'Templates'}
      subtitle={step === 'type' ? 'Pick a starting point — you can change its type later.' : 'Pre-filled headings to write into.'}
    >
      {(close) =>
        step === 'type' ? (
          <View style={styles.grid}>
            {OPTIONS.map((option, index) => {
              const swatch = palette[option.color];
              return (
                <Animated.View
                  key={option.key}
                  entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).springify().damping(18)}
                  style={option.key === 'template' ? styles.full : styles.tileWrap}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (option.input) close(() => onCreate(option.input!));
                      else setStep('template');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label}. ${option.hint}`}
                    style={({ pressed }) => [
                      styles.tile,
                      {
                        backgroundColor: swatch.paper,
                        borderColor: `${swatch.accent}40`,
                        borderRadius: theme.radii.lg,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <View style={[styles.badge, { backgroundColor: swatch.accent }]}>
                      <Icon name={option.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="titleMedium">{option.label}</Text>
                      <Text variant="caption" color="textSecondary">
                        {option.hint}
                      </Text>
                    </View>
                    {option.key === 'template' ? (
                      <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} style={styles.list}>
            {NOTE_TEMPLATES.map((template) => {
              const swatch = palette[template.color];
              return (
                <Pressable
                  key={template.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const { title, body } = template.build(new Date());
                    close(() => {
                      setStep('type');
                      onCreate({ title, body, noteType: template.noteType, color: template.color });
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${template.name}. ${template.description}`}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceMuted,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <View style={[styles.badgeSmall, { backgroundColor: swatch.paper, borderColor: `${swatch.accent}55` }]}>
                    <Icon name={template.icon} size={16} color={swatch.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="titleMedium">{template.name}</Text>
                    <Text variant="caption" color="textSecondary">
                      {template.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setStep('type')} accessibilityRole="button" style={styles.back} hitSlop={8}>
              <Icon name="arrow-left" size={16} color={theme.colors.primary} />
              <Text variant="labelLarge" color="primary">
                Back
              </Text>
            </Pressable>
          </Animated.View>
        )
      }
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tileWrap: {
    width: '48.5%',
  },
  full: {
    width: '100%',
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    minHeight: 64,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
});
