import { fetchLatestRelease, isNewerVersion, LATEST_APK_URL } from '../update-check';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe('isNewerVersion', () => {
  it('compares each part as a number', () => {
    expect(isNewerVersion('1.2.10', '1.2.9')).toBe(true);
    expect(isNewerVersion('1.10.0', '1.9.3')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.99.99')).toBe(true);
  });

  it('is false for the same or an older version', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
    expect(isNewerVersion('0.9', '1.0.0')).toBe(false);
  });

  it('ignores a leading v, missing parts and pre-release tags', () => {
    expect(isNewerVersion('v1.1.0', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.1', '1.1.0')).toBe(false);
    expect(isNewerVersion('1.1.0-beta.2', '1.0.0')).toBe(true);
  });
});

describe('fetchLatestRelease', () => {
  const respond = (status: number, body: unknown) =>
    jest.fn(async () => ({ ok: status < 400, status, json: async () => body }) as Response);

  it('reads the version, notes and the APK link', async () => {
    const fetchImpl = respond(200, {
      tag_name: 'v1.2.0',
      body: 'New dashboard',
      html_url: 'https://github.com/x/y/releases/tag/v1.2.0',
      assets: [{ name: 'ClayHabbit.apk', browser_download_url: 'https://example.com/ClayHabbit.apk' }],
    });
    await expect(fetchLatestRelease(fetchImpl)).resolves.toEqual({
      version: '1.2.0',
      notes: 'New dashboard',
      releaseUrl: 'https://github.com/x/y/releases/tag/v1.2.0',
      apkUrl: 'https://example.com/ClayHabbit.apk',
    });
  });

  it('falls back to the latest-download link when no APK is attached', async () => {
    const release = await fetchLatestRelease(respond(200, { tag_name: 'v1.2.0', html_url: 'u', assets: [] }));
    expect(release?.apkUrl).toBe(LATEST_APK_URL);
  });

  it('ignores drafts, pre-releases and errors', async () => {
    await expect(fetchLatestRelease(respond(200, { tag_name: 'v9', html_url: 'u', prerelease: true }))).resolves.toBeNull();
    await expect(fetchLatestRelease(respond(404, {}))).resolves.toBeNull();
  });
});
