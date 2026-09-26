import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet, Button, Icon, type IconName } from '@/components/ui';
import type { Folder } from '@/domain/entities/folder';
import { useAppTheme } from '@/theme';

import { useCreateFolder, useDeleteFolder, useUpdateFolder } from '../hooks';

export const FOLDER_COLORS = ['#0A4174', '#49769F', '#4E8EA2', '#6EA2B3', '#3C84B5', '#7BBDE8', '#6A8A1E', '#3A3C40'];
export const FOLDER_ICONS: IconName[] = ['folder', 'briefcase', 'book', 'code', 'shield', 'sun', 'heart', 'star', 'feather', 'coffee'];

interface FolderEditorSheetProps {
  visible: boolean;
  /** Null creates a new folder. */
  folder: Folder | null;
  onClose: () => void;
}

/** Create or edit a folder: name, colour and icon — and delete it (its notes are kept). */
export function FolderEditorSheet({ visible, folder, onClose }: FolderEditorSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={folder ? 'Edit folder' : 'New folder'}>
      {(close) => <FolderForm key={folder?.id ?? 'new'} folder={folder} close={close} />}
    </BottomSheet>
  );
}

function FolderForm({ folder, close }: { folder: Folder | null; close: (then?: () => void) => void }) {
  const theme = useAppTheme();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const [name, setName] = useState(folder?.name ?? '');
  const [color, setColor] = useState(folder?.color ?? FOLDER_COLORS[0]);
  const [icon, setIcon] = useState<string>(folder?.icon ?? 'folder');

  const save = () => {
    if (!name.trim()) return;
    if (folder) updateFolder.mutate({ id: folder.id, input: { name, color, icon } });
    else createFolder.mutate({ name, color, icon });
    close();
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.nameRow, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <View style={[styles.preview, { backgroundColor: `${color}22` }]}>
          <Icon name={icon as IconName} size={18} color={color} />
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor={theme.colors.textTertiary}
          autoFocus={!folder}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Folder name"
          style={[styles.flex, theme.typography.titleMedium, { color: theme.colors.textPrimary }]}
        />
      </View>

      <View style={styles.row}>
        {FOLDER_COLORS.map((swatch) => (
          <Pressable
            key={swatch}
            onPress={() => setColor(swatch)}
            accessibilityRole="radio"
            accessibilityState={{ selected: color === swatch }}
            accessibilityLabel={`Colour ${swatch}`}
            style={[styles.swatch, { backgroundColor: swatch, borderColor: color === swatch ? theme.colors.textPrimary : 'transparent' }]}
          />
        ))}
      </View>

      <View style={styles.row}>
        {FOLDER_ICONS.map((name) => {
          const selected = icon === name;
          return (
            <Pressable
              key={name}
              onPress={() => setIcon(name)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Icon ${name}`}
              style={[
                styles.iconChoice,
                { backgroundColor: selected ? `${color}22` : theme.colors.surfaceMuted, borderColor: selected ? color : 'transparent' },
              ]}
            >
              <Icon name={name} size={18} color={selected ? color : theme.colors.textSecondary} />
            </Pressable>
          );
        })}
      </View>

      <Button label={folder ? 'Save folder' : 'Create folder'} fullWidth disabled={!name.trim()} onPress={save} />
      {folder ? (
        <Button
          label="Delete folder"
          icon="trash-2"
          variant="ghost"
          fullWidth
          onPress={() =>
            Alert.alert(`Delete "${folder.name}"?`, 'Its notes are kept — they just won’t be in a folder any more.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => close(() => deleteFolder.mutate(folder.id)) },
            ])
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  preview: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
  iconChoice: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
