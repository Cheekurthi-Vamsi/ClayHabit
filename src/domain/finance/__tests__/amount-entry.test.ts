import { CURRENCIES } from '../currency';
import {
  amountTextToMinor,
  applyAmountKey,
  formatAmountText,
  minorToAmountText,
  type AmountKey,
} from '../amount-entry';

function type(keys: string, decimals: 0 | 2 = 2): string {
  return [...keys].reduce(
    (text, key) => applyAmountKey(text, (key === '<' ? 'back' : key) as AmountKey, decimals),
    '',
  );
}

describe('applyAmountKey', () => {
  it('builds up digits', () => {
    expect(type('450')).toBe('450');
  });

  it('drops leading zeros but keeps a single zero', () => {
    expect(type('0045')).toBe('45');
    expect(type('000')).toBe('0');
  });

  it('starts "0." when the first key is the decimal point', () => {
    expect(type('.5')).toBe('0.5');
  });

  it('allows one decimal point and at most two decimals', () => {
    expect(type('12.3.4')).toBe('12.34');
    expect(type('12.345')).toBe('12.34');
  });

  it('ignores the decimal point for zero-decimal currencies', () => {
    expect(type('12.5', 0)).toBe('125');
  });

  it('caps the whole part at nine digits', () => {
    expect(type('12345678901')).toBe('123456789');
  });

  it('backspaces, including through the decimal point', () => {
    expect(type('12.5<<')).toBe('12');
    expect(type('<<')).toBe('');
  });
});

describe('amountTextToMinor', () => {
  it('converts typed text to minor units', () => {
    expect(amountTextToMinor('450')).toBe(45_000);
    expect(amountTextToMinor('450.5')).toBe(45_050);
    expect(amountTextToMinor('450.05')).toBe(45_005);
    expect(amountTextToMinor('0.')).toBe(0);
    expect(amountTextToMinor('')).toBe(0);
  });
});

describe('minorToAmountText', () => {
  it('round-trips through the keypad text', () => {
    for (const minor of [45_000, 45_050, 45_005, 1, 0]) {
      expect(amountTextToMinor(minorToAmountText(minor, 2))).toBe(minor);
    }
    expect(minorToAmountText(45_050, 2)).toBe('450.5');
    expect(minorToAmountText(45_000, 2)).toBe('450');
  });
});

describe('formatAmountText', () => {
  it('groups while typing and keeps partial decimals', () => {
    expect(formatAmountText('', CURRENCIES.INR)).toBe('0');
    expect(formatAmountText('100000', CURRENCIES.INR)).toBe('1,00,000');
    expect(formatAmountText('12345.', CURRENCIES.USD)).toBe('12,345.');
    expect(formatAmountText('12345.5', CURRENCIES.USD)).toBe('12,345.5');
  });
});
