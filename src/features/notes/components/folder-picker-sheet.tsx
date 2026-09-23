import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet, Icon, Text, type IconName } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useCreateFolder, useFolders } from '../hooks';

interface FolderPickerSheetProps {
  visible: boolean;
  currentFolderId: string | null;
  onClose: () => void;
  onPick: (folderId: string | null) => void;
}

/** "Move to…": every folder, "No folder", and a new folder made on the spot. */
export function FolderPickerSheet({ visible, currentFolderId, onClose, onPick }: FolderPickerSheetProps) {
  const theme = useAppTheme();
  const { data: folders } = useFolders();
  const createFolder = useCreateFolder();
  const [name, setName] = useState('');

  const rows: { id: string | null; name: string; icon: IconName; color: string; count?: number }[] = [
    { id: null, name: 'No folder', icon: 'inbox', color: theme.colors.textSecondary },
    ...(folders ?? []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      icon: (folder.icon ?? 'folder') as IconName,
      color: folder.color,
      count: folder.noteCount,
    })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Move to folder">
      {(close) => (
        <View style={styles.stack}>
          <View style={[styles.group, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.lg }]}>
            {rows.map((row, index) => {
              const selected = row.id === currentFolderId;
              return (
                <Pressable
                  key={row.id ?? 'none'}
                  onPress={() => close(() => onPick(row.id))}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                    pressed && { backgroundColor: theme.colors.surfacePressed },
                  ]}
                >
                  <Icon name={row.icon} size={18} color={row.color} />
                  <Text variant="bodyLarge" style={styles.flex} numberOfLines={1}>
                    {row.name}
                  </Text>
                  {row.count !== undefined ? (
                    <Text variant="caption" color="textTertiary">
                      {row.count}
                    </Text>
                  ) : null}
                  {selected ? <Icon name="check" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.newRow, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.full }]}>
            <Icon name="folder-plus" size={16} color={theme.colors.primary} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New folder"
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="done"
              accessibilityLabel="New folder name"
              onSubmitEditing={() => {
                if (!name.trim()) return;
                createFolder.mutate(
                  { name, color: theme.colors.primary },
                  { onSuccess: (folder) => close(() => onPick(folder.id)) },
                );
                setName('');
              }}
              style={[styles.flex, theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flex: {
    flex: 1,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 46,
  },
});
