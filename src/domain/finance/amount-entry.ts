import { MAX_AMOUNT_MINOR, MINOR_PER_UNIT, groupDigits, type CurrencyConfig } from './currency';

/**
 * The keypad's text state, kept as the digits the person typed ("450.5")
 * rather than a number, so "0." and "450.50" survive while typing.
 */

export type AmountKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const MAX_WHOLE_DIGITS = 9;

export function applyAmountKey(text: string, key: AmountKey, decimals: 0 | 2): string {
  if (key === 'back') return text.slice(0, -1);

  const [whole, fraction] = text.split('.');

  if (key === '.') {
    if (decimals === 0 || text.includes('.')) return text;
    return text === '' ? '0.' : `${text}.`;
  }

  if (fraction !== undefined) {
    return fraction.length >= decimals ? text : `${text}${key}`;
  }
  // No leading zeros: "0" then "5" is "5", and "0" then "0" stays "0".
  if (whole === '0') return key;
  if (whole.length >= MAX_WHOLE_DIGITS) return text;
  return `${text}${key}`;
}

/** "450.5" → 45050. Blank or partial input ("", "0.") → 0. */
export function amountTextToMinor(text: string): number {
  if (!text) return 0;
  const [whole, fraction = ''] = text.split('.');
  const minor = Number(whole || '0') * MINOR_PER_UNIT + Number(fraction.padEnd(2, '0').slice(0, 2));
  return Math.min(minor, MAX_AMOUNT_MINOR);
}

/** 45050 → "450.5", 45000 → "450": what the keypad shows when editing an existing amount. */
export function minorToAmountText(minor: number, decimals: 0 | 2): string {
  const whole = Math.floor(Math.abs(minor) / MINOR_PER_UNIT);
  const fraction = Math.abs(minor) % MINOR_PER_UNIT;
  if (decimals === 0 || fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(2, '0').replace(/0$/, '')}`;
}

/** Groups the typed digits for display, keeping a trailing "." or partial decimals: "12345.5" → "12,345.5". */
export function formatAmountText(text: string, currency: CurrencyConfig): string {
  if (!text) return '0';
  const [whole, fraction] = text.split('.');
  const grouped = groupDigits(whole || '0', currency.grouping);
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
