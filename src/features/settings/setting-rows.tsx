import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon, SegmentedControl, Text, type IconName } from '@/components/ui';
import { useAppTheme } from '@/theme';

/** Icon, label and an optional one-line hint — the left half every settings row shares. */
function RowLabel({ icon, label, hint }: { icon: IconName; label: string; hint?: string }) {
  const theme = useAppTheme();
  return (
    <>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
        <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyLarge">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textTertiary">
            {hint}
          </Text>
        ) : null}
      </View>
    </>
  );
}

export function SettingSwitch({
  icon,
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, disabled ? styles.disabled : null]}>
      <RowLabel icon={icon} label={label} hint={hint} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
        thumbColor={theme.colors.onPrimary}
      />
    </View>
  );
}

export function SettingLink({
  icon,
  label,
  hint,
  value,
  onPress,
  destructive,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  /** Current value shown on the right, e.g. "25 min". */
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.6 } : null]}
    >
      {destructive ? (
        <>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.sm }]}>
            <Icon name={icon} size={16} color={theme.colors.error} />
          </View>
          <View style={styles.text}>
            <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
              {label}
            </Text>
            {hint ? (
              <Text variant="caption" color="textTertiary">
                {hint}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <RowLabel icon={icon} label={label} hint={hint} />
      )}
      {value ? (
        <Text variant="labelLarge" color="textSecondary">
          {value}
        </Text>
      ) : null}
      <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

export function SettingChoice<T extends string>({
  icon,
  label,
  hint,
  options,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choice}>
      <View style={styles.choiceHead}>
        <RowLabel icon={icon} label={label} hint={hint} />
      </View>
      <SegmentedControl options={options} value={value} onChange={onChange} size="sm" accessibilityLabel={label} />
    </View>
  );
}

export function SettingDivider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  choice: {
    gap: 10,
    paddingVertical: 10,
  },
  choiceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
});
