import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text } from '@/components/ui';
import { cloudErrorMessage } from '@/lib/cloud/cloud-error';
import { passcodeProblem, PASSCODE_MIN_LENGTH } from '@/lib/vault/keyring';
import { useAppTheme } from '@/theme';

import { useVault } from './vault-context';

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (text: string) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" color="textSecondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        maxLength={128}
        accessibilityLabel={label}
        style={[
          styles.input,
          theme.typography.bodyLarge,
          { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
        ]}
      />
    </View>
  );
}

/** Settings → Security → Change data passcode. The data key stays; only its lock changes. */
export function ChangePasscodeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vault = useVault();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const problem = passcodeProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('The new passcodes don’t match.');
    if (next === current) return setError('Choose a passcode different from the current one.');
    setBusy(true);
    setError(null);
    try {
      const result = await vault.changePasscode(current, next);
      if (!result.ok) {
        setError(
          result.waitMs > 0
            ? `Too many tries. Wait ${Math.ceil(result.waitMs / 1000)} seconds and try again.`
            : 'That isn’t your current passcode.',
        );
        return;
      }
      Alert.alert(
        'Passcode changed',
        vault.storageMode === 'cloud' ? 'Use the new passcode on any new phone.' : 'Keep the new passcode somewhere safe.',
      );
      router.back();
    } catch (caught) {
      setError(caught instanceof Error && !('code' in caught) ? caught.message : cloudErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="displayMedium" accessibilityRole="header">
          Change data passcode
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          Your data stays encrypted with the same key; only the passcode that unlocks it changes
          {vault.storageMode === 'cloud' ? ', here and in your Cloud' : ''}.
        </Text>
        <Field label="Current passcode" value={current} onChangeText={setCurrent} />
        <Field label="New passcode" value={next} onChangeText={setNext} />
        <Text variant="caption" color="textTertiary">
          At least {PASSCODE_MIN_LENGTH} characters, with letters and numbers.
        </Text>
        <Field label="Confirm new passcode" value={confirm} onChangeText={setConfirm} />
        {error ? (
          <Text variant="bodySmall" color="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label="Change passcode"
          icon="key"
          fullWidth
          loading={busy}
          disabled={busy || !current || !next || !confirm}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
