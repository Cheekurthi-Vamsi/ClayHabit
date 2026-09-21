import type { ComponentProps } from 'react';

import { Text } from '@/components/ui';
import { formatMoney, maskedMoney, MINOR_PER_UNIT, type SignDisplay } from '@/domain/finance/currency';
import { useSessionCountUp } from '@/hooks/use-session-count-up';
import { useSettingsStore } from '@/store/settings-store';

interface MoneyTextProps extends Omit<ComponentProps<typeof Text>, 'children'> {
  amountMinor: number;
  currency: string;
  sign?: SignDisplay;
  compact?: boolean;
  /** Counts up from the last value shown under this key (from zero only once per session). */
  countUpKey?: string;
}

/**
 * Every money amount in the app renders through this, so privacy mode is one
 * switch: with "Hide amounts" on it shows a fixed-width mask that gives away
 * nothing about the size, to sighted and screen-reader users alike.
 */
export function MoneyText({
  amountMinor,
  currency,
  sign,
  compact,
  countUpKey,
  accessibilityLabel,
  ...rest
}: MoneyTextProps) {
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const animated = useSessionCountUp(hidden ? null : (countUpKey ?? null), amountMinor);

  // Mid-animation values are whole units only, so no flicker of changing paise.
  const shown = animated === amountMinor ? amountMinor : Math.round(animated / MINOR_PER_UNIT) * MINOR_PER_UNIT;

  return (
    <Text
      accessibilityLabel={
        accessibilityLabel ?? (hidden ? 'Amount hidden' : formatMoney(amountMinor, currency, { sign }))
      }
      {...rest}
    >
      {hidden ? maskedMoney(currency) : formatMoney(shown, currency, { sign, compact })}
    </Text>
  );
}
