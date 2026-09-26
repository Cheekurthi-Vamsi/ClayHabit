import { isSuspiciousPath, redirectSystemPath } from '../+native-intent';

describe('incoming links', () => {
  it('lets ordinary links through', () => {
    expect(redirectSystemPath({ path: '/task/abc123', initial: true })).toBe('/task/abc123');
    expect(redirectSystemPath({ path: '/focus?autostart=25', initial: false })).toBe('/focus?autostart=25');
  });

  it('sends sign-in redirects home', () => {
    expect(redirectSystemPath({ path: '/sso-callback?code=x', initial: true })).toBe('/');
  });

  it('drops links crafted to stall URL decoding', () => {
    const escapes = `/note/x?q=${'%E0%A4%A'.repeat(200)}`;
    expect(isSuspiciousPath(escapes)).toBe(true);
    expect(redirectSystemPath({ path: escapes, initial: true })).toBe('/');
    expect(redirectSystemPath({ path: `/${'a'.repeat(5000)}`, initial: true })).toBe('/');
  });
});
