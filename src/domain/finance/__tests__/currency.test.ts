import {
  currencyOf,
  formatMoney,
  groupDigits,
  maskedMoney,
  MINOR_PER_UNIT,
  toMajor,
  toMinor,
} from '../currency';

describe('groupDigits', () => {
  it('groups Indian style: last three, then pairs', () => {
    expect(groupDigits('100', 'indian')).toBe('100');
    expect(groupDigits('1000', 'indian')).toBe('1,000');
    expect(groupDigits('100000', 'indian')).toBe('1,00,000');
    expect(groupDigits('12345678', 'indian')).toBe('1,23,45,678');
  });

  it('groups western style in threes', () => {
    expect(groupDigits('1000', 'western')).toBe('1,000');
    expect(groupDigits('1234567', 'western')).toBe('1,234,567');
  });
});

describe('formatMoney', () => {
  it('formats rupees with lakh grouping and no decimals for whole amounts', () => {
    expect(formatMoney(4_250_000, 'INR')).toBe('₹42,500');
    expect(formatMoney(10_000_000, 'INR')).toBe('₹1,00,000');
    expect(formatMoney(0, 'INR')).toBe('₹0');
  });

  it('shows two decimals only when there is a fraction (or when forced)', () => {
    expect(formatMoney(45_050, 'INR')).toBe('₹450.50');
    expect(formatMoney(45_005, 'USD')).toBe('$450.05');
    expect(formatMoney(45_000, 'USD', { forceDecimals: true })).toBe('$450.00');
  });

  it('never shows decimals for yen', () => {
    expect(formatMoney(123_456_700, 'JPY')).toBe('¥1,234,567');
  });

  it('handles signs', () => {
    expect(formatMoney(-18_000, 'INR')).toBe('−₹180');
    expect(formatMoney(18_000, 'INR', { sign: 'always' })).toBe('+₹180');
    expect(formatMoney(-18_000, 'INR', { sign: 'always' })).toBe('−₹180');
    expect(formatMoney(-18_000, 'INR', { sign: 'never' })).toBe('₹180');
    expect(formatMoney(0, 'INR', { sign: 'always' })).toBe('₹0');
  });

  it('compacts large amounts to K / M / B', () => {
    expect(formatMoney(6_000_000, 'INR', { compact: true })).toBe('₹60K');
    expect(formatMoney(1_750_000, 'INR', { compact: true })).toBe('₹17.5K');
    expect(formatMoney(42_000_000, 'USD', { compact: true })).toBe('$420K');
    expect(formatMoney(250_000_000, 'EUR', { compact: true })).toBe('€2.5M');
    expect(formatMoney(-1_750_000, 'INR', { compact: true, sign: 'always' })).toBe('−₹17.5K');
  });

  it('rolls 999,950 over to 1M instead of printing 1000K', () => {
    expect(formatMoney(99_995_000, 'USD', { compact: true })).toBe('$1M');
  });

  it('leaves small amounts un-compacted', () => {
    expect(formatMoney(45_000, 'INR', { compact: true })).toBe('₹450');
    expect(formatMoney(99_900, 'INR', { compact: true })).toBe('₹999');
  });

  it('falls back to the default currency for unknown codes', () => {
    expect(currencyOf('XYZ').code).toBe('INR');
    expect(formatMoney(100, 'XYZ')).toBe('₹1');
  });
});

describe('privacy mask', () => {
  it('keeps the symbol and hides the size of the amount', () => {
    expect(maskedMoney('INR')).toBe('₹••,•••');
    expect(maskedMoney('USD')).toBe('$••,•••');
  });
});

describe('minor unit conversion', () => {
  it('uses a fixed scale of 100 and avoids float drift', () => {
    expect(MINOR_PER_UNIT).toBe(100);
    expect(toMinor(450.5)).toBe(45_050);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(-12.345)).toBe(-1_235);
    expect(toMajor(45_050)).toBe(450.5);
  });
});
