import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * ClayHabbit is installed from GitHub Releases, not the Play Store, so nothing
 * updates it automatically. This asks GitHub's public API for the newest
 * release (at most once a day) and says whether it's newer than this build.
 * Nothing about the person or the device is sent.
 */

export const GITHUB_REPO = 'Cheekurthi-Vamsi/ClayHabit';
/** The newest APK, always: every release attaches it under this same name. */
export const LATEST_APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/ClayHabbit.apk`;
/** The download page with install steps. Kept in step with web/src/lib/config.ts. */
export const DOWNLOAD_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

const LAST_CHECK_KEY = 'clayhabit.updates.lastCheck';
const SKIPPED_KEY = 'clayhabit.updates.skipped';
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

export interface AvailableUpdate {
  version: string;
  notes: string;
  releaseUrl: string;
  apkUrl: string;
}

/** "1.2.10" > "1.2.9"; a leading "v" and anything after "-" (pre-release tags) are ignored. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (value: string) =>
    value
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]!
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(candidate);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

interface ReleaseJson {
  tag_name: string;
  body?: string | null;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
}

export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch): Promise<AvailableUpdate | null> {
  const response = await fetchImpl(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return null;
  const json = (await response.json()) as ReleaseJson;
  if (json.draft || json.prerelease) return null;
  const apk = json.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  return {
    version: json.tag_name.replace(/^v/i, ''),
    notes: (json.body ?? '').trim(),
    releaseUrl: json.html_url,
    apkUrl: apk?.browser_download_url ?? LATEST_APK_URL,
  };
}

/**
 * A newer release, or null. Automatic checks run at most once a day and stay
 * quiet about a version the person chose to skip; `force` (Settings → Check
 * for updates) always asks.
 */
export async function checkForUpdate({ force = false }: { force?: boolean } = {}): Promise<AvailableUpdate | null> {
  if (!force) {
    const last = Number((await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null)) ?? 0);
    if (Date.now() - last < CHECK_EVERY_MS) return null;
  }
  const latest = await fetchLatestRelease();
  await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => {});
  if (!latest || !isNewerVersion(latest.version, currentVersion())) return null;
  if (!force && (await AsyncStorage.getItem(SKIPPED_KEY).catch(() => null)) === latest.version) return null;
  return latest;
}

export async function skipVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(SKIPPED_KEY, version).catch(() => {});
}
