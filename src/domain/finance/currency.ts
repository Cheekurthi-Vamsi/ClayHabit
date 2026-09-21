/**
 * Currency configuration and money formatting.
 *
 * Amounts are stored everywhere as integers in hundredths of the major unit
 * (`MINOR_PER_UNIT`), whatever the currency — paise, cents, and 1/100 of a yen
 * alike. A fixed scale means switching the display currency never
 * reinterprets stored numbers, and integer maths never drifts the way
 * floating-point rupees would. Currencies without decimals (JPY) simply never
 * produce a fractional part.
 *
 * Formatting is hand-rolled rather than `Intl.NumberFormat` so it is identical
 * on Hermes (Android/iOS) and in Jest, including Indian lakh grouping.
 */

export const MINOR_PER_UNIT = 100;

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** Decimal places people actually type and see. */
  decimals: 0 | 2;
  /** `indian` groups 12,34,567; `western` groups 1,234,567. */
  grouping: 'indian' | 'western';
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian rupee', decimals: 2, grouping: 'indian' },
  USD: { code: 'USD', symbol: '$', name: 'US dollar', decimals: 2, grouping: 'western' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, grouping: 'western' },
  GBP: { code: 'GBP', symbol: '£', name: 'British pound', decimals: 2, grouping: 'western' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese yen', decimals: 0, grouping: 'western' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

/** Upper bound on a single amount: 999,999,999.99 in major units. */
export const MAX_AMOUNT_MINOR = 99_999_999_999;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES;
}

export function currencyOf(code: string): CurrencyConfig {
  return isCurrencyCode(code) ? CURRENCIES[code] : CURRENCIES[DEFAULT_CURRENCY];
}

/** Groups the digits of a non-negative integer string: "1234567" → "12,34,567" (indian). */
export function groupDigits(digits: string, grouping: CurrencyConfig['grouping']): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const size = grouping === 'indian' ? 2 : 3;
  const groups: string[] = [];
  for (let end = rest.length; end > 0; end -= size) {
    groups.unshift(rest.slice(Math.max(0, end - size), end));
  }
  return `${groups.join(',')},${lastThree}`;
}

export type SignDisplay = 'auto' | 'always' | 'never';

export interface FormatMoneyOptions {
  /** `auto`: minus for negatives only. `always`: + or −. `never`: magnitude only. */
  sign?: SignDisplay;
  /** "₹42.5K" instead of "₹42,500". */
  compact?: boolean;
  /** Show decimals even for whole amounts (₹450.00). Default: only when there's a fraction. */
  forceDecimals?: boolean;
}

const MINUS = '−';

function signPrefix(minor: number, sign: SignDisplay): string {
  if (sign === 'never') return '';
  if (minor < 0) return MINUS;
  if (sign === 'always' && minor > 0) return '+';
  return '';
}

const COMPACT_TIERS: readonly (readonly [number, string])[] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** One decimal below 100 (42.5), whole numbers above (420). */
function roundCompact(scaled: number): number {
  return scaled < 100 ? Math.round(scaled * 10) / 10 : Math.round(scaled);
}

function formatCompactMajor(major: number): string {
  let index = COMPACT_TIERS.findIndex(([size]) => major >= size);
  if (index === -1) return String(Math.round(major));

  let rounded = roundCompact(major / COMPACT_TIERS[index][0]);
  // 999,950 rounds to "1000K"; promote it to "1M" instead.
  if (rounded >= 1000 && index > 0) {
    index -= 1;
    rounded = roundCompact(major / COMPACT_TIERS[index][0]);
  }
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${COMPACT_TIERS[index][1]}`;
}

/** Formats an amount in minor units, e.g. 4250000 → "₹42,500". */
export function formatMoney(minor: number, code: string, options: FormatMoneyOptions = {}): string {
  const { sign = 'auto', compact = false, forceDecimals = false } = options;
  const currency = currencyOf(code);
  const magnitude = Math.abs(Math.round(minor));
  const prefix = signPrefix(Math.round(minor), sign);

  if (compact && magnitude >= 1000 * MINOR_PER_UNIT) {
    return `${prefix}${currency.symbol}${formatCompactMajor(magnitude / MINOR_PER_UNIT)}`;
  }

  const whole = Math.floor(magnitude / MINOR_PER_UNIT);
  const fraction = magnitude % MINOR_PER_UNIT;
  let text = groupDigits(String(whole), currency.grouping);
  if (currency.decimals === 2 && (fraction > 0 || forceDecimals)) {
    text += `.${String(fraction).padStart(2, '0')}`;
  }
  return `${prefix}${currency.symbol}${text}`;
}

/** What privacy mode shows instead of an amount. Fixed width, so it never hints at the size. */
export function maskedMoney(code: string): string {
  return `${currencyOf(code).symbol}••,•••`;
}

/** Converts a major-unit number (e.g. 450.5) to minor units, rounding half away from zero. */
export function toMinor(major: number): number {
  // 12.345 * 100 is 1234.4999… in binary floating point; trimming the noise first rounds it to 1235.
  const scaled = Number((Math.abs(major) * MINOR_PER_UNIT).toFixed(6));
  return Math.sign(major) * Math.round(scaled);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_UNIT;
}
