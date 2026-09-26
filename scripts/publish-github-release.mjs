/**
 * Publishes the release that `npm run release:android` prepared, on GitHub:
 *
 *   npm run publish:android
 *
 * It creates the release `v<version from app.json>` with the notes from
 * release/RELEASE-v<version>.md and uploads release/ClayHabbit.apk. The
 * website's Download button and the in-app update check then find it by
 * themselves.
 *
 * Authentication: GITHUB_TOKEN if it's set, otherwise the credential git
 * already uses to push to github.com (`git credential fill`). The token is only
 * sent to api.github.com and never printed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const REPO = 'Cheekurthi-Vamsi/ClayHabit';
const ASSET_NAME = 'ClayHabbit.apk';
const root = path.resolve(import.meta.dirname, '..');

const version = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;
const tag = `v${version}`;
const apkPath = path.join(root, 'release', ASSET_NAME);
const notesPath = path.join(root, 'release', `RELEASE-v${version}.md`);

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

if (!existsSync(apkPath) || !existsSync(notesPath)) {
  fail(`release/${ASSET_NAME} or release/RELEASE-v${version}.md is missing. Run "npm run release:android -- patch" first.`);
}

function gitCredentialToken() {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    // Never open a login window from here: the stored credential or nothing.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
  const match = /^password=(.+)$/m.exec(result.stdout ?? '');
  return match ? match[1].trim() : null;
}

const token = process.env.GITHUB_TOKEN || gitCredentialToken();
if (!token) fail('No GitHub credential found. Set GITHUB_TOKEN (a token with "repo" scope) and run this again.');

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'clayhabbit-release-script',
};

async function github(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = body?.message ? `${body.message}${body.errors ? ` ${JSON.stringify(body.errors)}` : ''}` : text;
    throw new Error(`GitHub ${response.status}: ${detail}`);
  }
  return body;
}

// The release, created once. Running this again re-uses it and replaces the APK.
let release;
try {
  release = await github(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`);
  console.log(`Release ${tag} already exists; updating its APK.`);
} catch {
  const notes = readFileSync(notesPath, 'utf8');
  release = await github(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: 'main',
      name: `ClayHabbit ${version}`,
      body: notes,
      draft: false,
      prerelease: false,
      make_latest: 'true',
    }),
  });
  console.log(`Created release ${tag}.`);
}

const existing = (release.assets ?? []).find((asset) => asset.name === ASSET_NAME);
if (existing) await github(`https://api.github.com/repos/${REPO}/releases/assets/${existing.id}`, { method: 'DELETE' });

const size = statSync(apkPath).size;
console.log(`Uploading ${ASSET_NAME} (${(size / 1024 / 1024).toFixed(1)} MB)…`);
const uploadUrl = release.upload_url.replace(/\{.*$/, `?name=${encodeURIComponent(ASSET_NAME)}`);
const asset = await github(uploadUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': String(size) },
  body: readFileSync(apkPath),
});

console.log(`
Published ClayHabbit ${version}
  Release:   ${release.html_url}
  Download:  ${asset.browser_download_url}
  Latest:    https://github.com/${REPO}/releases/latest/download/${ASSET_NAME}
`);
