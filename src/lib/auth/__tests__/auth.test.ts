import { databaseNameFor } from '../account-database';
import { authErrorMessage, isValidEmail, OFFLINE_MESSAGE } from '../auth-errors';

describe('databaseNameFor', () => {
  it('uses the existing database without an account, and for the device owner', () => {
    expect(databaseNameFor(null, null)).toBe('clayhabit.db');
    expect(databaseNameFor('user_a', 'user_a')).toBe('clayhabit.db');
    expect(databaseNameFor('user_a', null)).toBe('clayhabit.db');
  });

  it('gives every other account its own file', () => {
    expect(databaseNameFor('user_b', 'user_a')).toBe('clayhabit-user_b.db');
  });

  it('keeps file names safe whatever the id contains', () => {
    expect(databaseNameFor('user/../x', 'owner')).toBe('clayhabit-user____x.db');
    expect(databaseNameFor('u'.repeat(100), 'owner')).toHaveLength('clayhabit-'.length + 64 + '.db'.length);
  });
});

describe('authErrorMessage', () => {
  it('maps known Clerk codes to friendly sentences', () => {
    expect(authErrorMessage({ errors: [{ code: 'form_password_incorrect', message: 'x' }] })).toMatch(/password/);
    expect(authErrorMessage({ code: 'form_identifier_exists' })).toMatch(/already uses that email/);
  });

  it('falls back to Clerk’s user-facing long message', () => {
    expect(authErrorMessage({ errors: [{ code: 'something_new', longMessage: 'Clerk says hi.' }] })).toBe('Clerk says hi.');
  });

  it('recognises being offline', () => {
    expect(authErrorMessage({ code: 'network_error' })).toBe(OFFLINE_MESSAGE);
    expect(authErrorMessage(new TypeError('Network request failed'))).toBe(OFFLINE_MESSAGE);
  });

  it('never shows raw developer messages', () => {
    expect(authErrorMessage(new Error('internal stack detail'))).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses and rejects obvious typos', () => {
    expect(isValidEmail(' me@example.com ')).toBe(true);
    expect(isValidEmail('me@example')).toBe(false);
    expect(isValidEmail('me example@x.io')).toBe(false);
  });
});
