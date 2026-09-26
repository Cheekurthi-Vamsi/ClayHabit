import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { CloudFrame, ErrorNote, Point, SignOutLink } from '@/features/cloud/cloud-screens';
import { passcodeProblem, PASSCODE_MIN_LENGTH } from '@/lib/vault/keyring';
import { useAppTheme } from '@/theme';

function PasscodeField({
  label,
  value,
  onChangeText,
  onSubmit,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" color="textSecondary">
        {label}
      </Text>
      <View style={[styles.inputRow, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="password"
          importantForAutofill="no"
          autoFocus={autoFocus}
          maxLength={128}
          accessibilityLabel={label}
          style={[styles.input, theme.typography.bodyLarge, { color: theme.colors.textPrimary }]}
        />
        <Pressable
          onPress={() => setVisible((shown) => !shown)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide passcode' : 'Show passcode'}
          hitSlop={8}
          style={styles.eye}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

/** First run (or first time on Cloud): choose the passcode that locks this account's data. */
export function CreatePasscodeScreen({
  cloud,
  upgrading,
  busy,
  error,
  onCreate,
}: {
  cloud: boolean;
  /** Existing data from before passcodes: explain why it's being asked now. */
  upgrading: boolean;
  busy: boolean;
  error: string | null;
  onCreate: (passcode: string) => void;
}) {
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const problem = passcodeProblem(passcode);
  const mismatch = confirm.length > 0 && confirm !== passcode;

  const submit = () => {
    setTouched(true);
    if (problem || confirm !== passcode) return;
    onCreate(passcode);
  };

  return (
    <CloudFrame
      icon="key"
      title="Create your data passcode"
      subtitle={
        upgrading
          ? 'New: your data is now encrypted with a passcode only you know. Set it once and this phone remembers it.'
          : 'It encrypts everything you keep in ClayHabbit. You’ll need it when you set up a new phone.'
      }
    >
      <View style={styles.points}>
        <Point
          icon="lock"
          title={cloud ? 'Encrypts this phone and your Drive copy' : 'Encrypts the data on this phone'}
          body="AES-256 with a key only your passcode unlocks. ClayHabbit, Clerk and Google never see it."
        />
        <Point
          icon="alert-triangle"
          title="There’s no reset"
          body={
            cloud
              ? 'If you forget it, your Cloud copy can’t be opened by anyone, including us. Store it in a password manager.'
              : 'Keep it somewhere safe, like a password manager.'
          }
        />
      </View>

      <PasscodeField label="Passcode" value={passcode} onChangeText={setPasscode} autoFocus />
      <Text variant="caption" color={touched && problem ? 'error' : 'textTertiary'}>
        {touched && problem ? problem : `At least ${PASSCODE_MIN_LENGTH} characters, with letters and numbers.`}
      </Text>
      <PasscodeField label="Confirm passcode" value={confirm} onChangeText={setConfirm} onSubmit={submit} />
      {mismatch ? (
        <Text variant="caption" color="error">
          The passcodes don’t match.
        </Text>
      ) : null}

      <ErrorNote message={error} />
      <Button
        label="Encrypt my data"
        icon="lock"
        size="lg"
        fullWidth
        loading={busy}
        disabled={busy || !passcode || !confirm}
        onPress={submit}
      />
      <SignOutLink />
    </CloudFrame>
  );
}

/** A keyring already exists (a new phone, or after signing out): unlock it. */
export function UnlockPasscodeScreen({
  cloud,
  busy,
  error,
  onUnlock,
  onForgot,
}: {
  cloud: boolean;
  busy: boolean;
  error: string | null;
  onUnlock: (passcode: string) => void;
  onForgot: () => void;
}) {
  const [passcode, setPasscode] = useState('');
  const submit = () => passcode && onUnlock(passcode);

  return (
    <CloudFrame
      icon="unlock"
      title="Enter your data passcode"
      subtitle={
        cloud
          ? 'Your Cloud copy is encrypted. Enter the passcode you chose to bring it to this phone.'
          : 'Your data on this phone is encrypted. Enter your passcode to open it.'
      }
    >
      <PasscodeField label="Passcode" value={passcode} onChangeText={setPasscode} onSubmit={submit} autoFocus />
      <ErrorNote message={error} />
      <Button label="Unlock" icon="unlock" size="lg" fullWidth loading={busy} disabled={busy || !passcode} onPress={submit} />
      <Button label="Forgot passcode?" variant="ghost" size="sm" fullWidth disabled={busy} onPress={onForgot} />
      <SignOutLink />
    </CloudFrame>
  );
}

const styles = StyleSheet.create({
  points: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  eye: {
    paddingHorizontal: 14,
  },
});
